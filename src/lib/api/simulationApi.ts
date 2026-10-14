import { DATA_MODE } from "@/lib/config";
import { httpRequest } from "@/lib/api/client";
import { db, delay, nextId } from "@/mocks/store";
import { buildForecast, cashFlowEvents as seedEvents } from "@/mocks/data";
import { toISODate } from "@/lib/formatters";
import { addDays } from "date-fns";
import type {
  SimulationScenario,
  SimulationResult,
  ForecastPoint,
  CashFlowEvent,
  DependencyEdge,
} from "@/types";

// ---------------------------------------------------------------------------
// Extended simulator types (kept local — not in shared types to stay minimal)
// ---------------------------------------------------------------------------

export interface SimulatorControls {
  supplierDeliveryDelayDays: number;
  customerPaymentDelayDays: number;
  customerPaymentAmountPaise: number | null; // null = unchanged
  supplierPaymentAmountPaise: number | null; // null = unchanged
  orderQuantityMultiplier: number; // 1.0 = unchanged
  horizonDays: 7 | 14 | 30;
}

export interface DependencyImpact {
  entityId: string;
  entityType: string;
  label: string;
  originalDate?: string;
  shiftedDate?: string;
  shiftDays: number;
  amountPaise?: number;
  impactDescription: string;
}

export interface RippleScoreBreakdown {
  cashShortfallFactor: number;     // 0–40 pts: is there a shortfall, how deep?
  delayMagnitudeFactor: number;    // 0–25 pts: combined delay days
  downstreamCountFactor: number;   // 0–20 pts: # affected dependencies
  liquidityGapFactor: number;      // 0–15 pts: baseline vs simulated delta
  totalScore: number;              // 0–100
}

export interface SimulatorResult {
  baselinePoints: ForecastPoint[];
  scenarioPoints: ForecastPoint[];
  baselineClosingPaise: number;
  scenarioClosingPaise: number;
  baselineMinPaise: number;
  baselineMinDate: string;
  scenarioMinPaise: number;
  scenarioMinDate: string;
  shortfallPaise: number; // > 0 means scenario went negative
  affectedDependencies: DependencyImpact[];
  rippleScore: RippleScoreBreakdown;
  recommendations: SimulatorRecommendation[];
  savedScenarioId?: string;
}

export interface SimulatorRecommendation {
  id: string;
  title: string;
  rationale: string;
  priority: "high" | "medium" | "low";
  impactPaise?: number;
}

export interface SavedSimulatorScenario {
  id: string;
  name: string;
  controls: SimulatorControls;
  result: SimulatorResult;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// In-memory store for saved simulator scenarios (session-scoped)
// ---------------------------------------------------------------------------
const savedScenarios: SavedSimulatorScenario[] = [];

// ---------------------------------------------------------------------------
// Core simulation engine (mock)
// ---------------------------------------------------------------------------

/**
 * Build a deterministic dependency graph from the Rupi Clothing mock data.
 * Returns edges that represent "if X is delayed, Y shifts by lagDays".
 */
function buildDependencyEdges(): DependencyEdge[] {
  return [
    // po_1 delivery -> customer order co_1 fulfillment
    {
      id: "dep_po1_co1",
      sourceId: "po_1",
      sourceType: "purchase_order",
      targetId: "co_1",
      targetType: "customer_order",
      label: "PO-1 delivery enables CO-1 fulfillment",
      lagDays: 2,
    },
    // co_1 fulfillment -> invoice INV-2001 issue
    {
      id: "dep_co1_inv2001",
      sourceId: "co_1",
      sourceType: "customer_order",
      targetId: "inv_2001",
      targetType: "invoice",
      label: "CO-1 fulfillment generates INV-2001",
      lagDays: 0,
    },
    // inv_2001 issue -> payment pay_2
    {
      id: "dep_inv2001_pay2",
      sourceId: "inv_2001",
      sourceType: "invoice",
      targetId: "pay_2",
      targetType: "payment",
      label: "INV-2001 due triggers pay_2 collection",
      lagDays: 15,
    },
    // pay_2 expected -> cash event cfe_3
    {
      id: "dep_pay2_cfe3",
      sourceId: "pay_2",
      sourceType: "payment",
      targetId: "cfe_3",
      targetType: "payment",
      label: "Customer receipt cfe_3 depends on pay_2",
      lagDays: 0,
    },
  ];
}

/**
 * Propagate a supplier delivery delay through the dependency graph.
 * Returns the set of cash-flow event IDs whose dates should shift, and by how many days.
 */
function propagateDeliveryDelay(
  deliveryDelayDays: number,
  events: CashFlowEvent[],
): Map<string, number> {
  // Event IDs that depend on po_1 delivery (Day 4) in the seed data
  const shiftMap = new Map<string, number>();
  if (deliveryDelayDays === 0) return shiftMap;

  // The balance payment for po_1 (cfe_2) happens on delivery → shift by delivery delay
  shiftMap.set("cfe_2", deliveryDelayDays);

  // co_1 delivery triggers invoice on Day 6 (cfe_3 is receipt, shifts too)
  // cfe_3 is the Urban Threads receipt which depends on co_1 being fulfilled
  // co_1 delivery needs po_1 stock → shifts by delivery delay
  shiftMap.set("cfe_3", deliveryDelayDays);

  return shiftMap;
}

/**
 * Propagate a customer payment delay through the graph.
 * Only shifts the customer receipt event(s).
 */
function propagatePaymentDelay(
  paymentDelayDays: number,
  events: CashFlowEvent[],
): Map<string, number> {
  const shiftMap = new Map<string, number>();
  if (paymentDelayDays === 0) return shiftMap;

  // cfe_3 = Urban Threads INV-2001 receipt
  shiftMap.set("cfe_3", paymentDelayDays);

  return shiftMap;
}

/**
 * Apply all scenario controls to the event list and return modified events.
 */
function applyControls(
  events: CashFlowEvent[],
  controls: SimulatorControls,
  horizon: number,
): CashFlowEvent[] {
  const today = new Date();
  const d = (offset: number) => toISODate(addDays(today, offset));

  // Build shift maps
  const delivShifts = propagateDeliveryDelay(controls.supplierDeliveryDelayDays, events);
  const payShifts = propagatePaymentDelay(controls.customerPaymentDelayDays, events);

  // Merge: take the max shift for each event (conservative)
  const allShifts = new Map<string, number>();
  for (const [id, days] of delivShifts) {
    allShifts.set(id, Math.max(allShifts.get(id) ?? 0, days));
  }
  for (const [id, days] of payShifts) {
    allShifts.set(id, Math.max(allShifts.get(id) ?? 0, days));
  }

  return events.map((event): CashFlowEvent => {
    let modified = { ...event };

    // Apply date shifts from dependency propagation
    const shiftDays = allShifts.get(event.id) ?? 0;
    if (shiftDays > 0) {
      const originalDate = new Date(event.date);
      modified = {
        ...modified,
        date: toISODate(addDays(originalDate, shiftDays)),
        riskNote: `Scenario: shifted +${shiftDays} days from ${event.date}`,
      };
    }

    // Customer payment amount override (applies to incoming customer_payment events)
    if (
      controls.customerPaymentAmountPaise !== null &&
      event.direction === "incoming" &&
      event.type === "customer_payment" &&
      event.id === "cfe_3"
    ) {
      modified = { ...modified, amountPaise: controls.customerPaymentAmountPaise };
    }

    // Supplier payment amount override (applies to outgoing supplier_payment events)
    if (
      controls.supplierPaymentAmountPaise !== null &&
      event.direction === "outgoing" &&
      event.type === "supplier_payment" &&
      (event.id === "cfe_2" || event.id === "cfe_1")
    ) {
      // Scale: adjust by ratio of new vs original amount
      const original = seedEvents.find((e) => e.id === event.id)?.amountPaise ?? event.amountPaise;
      if (original > 0) {
        const ratio = controls.supplierPaymentAmountPaise / original;
        modified = { ...modified, amountPaise: Math.round(event.amountPaise * ratio) };
      }
    }

    // Order quantity multiplier: scale co_1 related inflows/outflows
    if (controls.orderQuantityMultiplier !== 1.0 && event.id === "cfe_3") {
      modified = {
        ...modified,
        amountPaise: Math.round(modified.amountPaise * controls.orderQuantityMultiplier),
      };
    }

    return modified;
  });
}

/**
 * Run the full simulation: baseline + scenario forecasts.
 */
function runMockSimulation(controls: SimulatorControls): SimulatorResult {
  const horizon = controls.horizonDays;
  const openingCash = db.business.openingCashPaise;
  const baselineEvents = db.cashFlowEvents;
  const scenarioEvents = applyControls([...baselineEvents], controls, horizon);

  const baselinePoints = buildForecast(baselineEvents, openingCash, horizon);
  const scenarioPoints = buildForecast(scenarioEvents, openingCash, horizon);

  // Closing balances
  const baselineClosingPaise =
    baselinePoints.length > 0
      ? baselinePoints[baselinePoints.length - 1]!.projectedBalancePaise
      : openingCash;
  const scenarioClosingPaise =
    scenarioPoints.length > 0
      ? scenarioPoints[scenarioPoints.length - 1]!.projectedBalancePaise
      : openingCash;

  // Min balance points
  const baselineMin =
    baselinePoints.length > 0
      ? baselinePoints.reduce((a, b) =>
          a.projectedBalancePaise <= b.projectedBalancePaise ? a : b,
        )
      : { projectedBalancePaise: openingCash, date: toISODate(new Date()) };

  const scenarioMin =
    scenarioPoints.length > 0
      ? scenarioPoints.reduce((a, b) =>
          a.projectedBalancePaise <= b.projectedBalancePaise ? a : b,
        )
      : { projectedBalancePaise: openingCash, date: toISODate(new Date()) };

  const shortfallPaise = Math.min(scenarioMin.projectedBalancePaise, 0);

  // Build affected dependencies
  const affectedDeps = buildAffectedDependencies(controls, baselineEvents, scenarioEvents);

  // Ripple score
  const rippleScore = computeRippleScore(
    controls,
    scenarioMin.projectedBalancePaise,
    baselineMin.projectedBalancePaise,
    affectedDeps.length,
    shortfallPaise,
  );

  // Recommendations
  const recommendations = buildRecommendations(
    controls,
    shortfallPaise,
    scenarioMin.projectedBalancePaise,
    baselineClosingPaise,
    scenarioClosingPaise,
    affectedDeps,
  );

  return {
    baselinePoints,
    scenarioPoints,
    baselineClosingPaise,
    scenarioClosingPaise,
    baselineMinPaise: baselineMin.projectedBalancePaise,
    baselineMinDate: baselineMin.date,
    scenarioMinPaise: scenarioMin.projectedBalancePaise,
    scenarioMinDate: scenarioMin.date,
    shortfallPaise,
    affectedDependencies: affectedDeps,
    rippleScore,
    recommendations,
  };
}

function buildAffectedDependencies(
  controls: SimulatorControls,
  baseline: CashFlowEvent[],
  scenario: CashFlowEvent[],
): DependencyImpact[] {
  const impacts: DependencyImpact[] = [];

  // Compare event dates/amounts between baseline and scenario
  for (const scenarioEvent of scenario) {
    const baseEvent = baseline.find((e) => e.id === scenarioEvent.id);
    if (!baseEvent) continue;

    const dateDiff =
      scenarioEvent.date !== baseEvent.date
        ? Math.round(
            (new Date(scenarioEvent.date).getTime() - new Date(baseEvent.date).getTime()) /
              86400000,
          )
        : 0;
    const amountDiff = scenarioEvent.amountPaise - baseEvent.amountPaise;

    if (dateDiff !== 0 || amountDiff !== 0) {
      impacts.push({
        entityId: scenarioEvent.id,
        entityType: scenarioEvent.type,
        label: scenarioEvent.label,
        originalDate: baseEvent.date,
        shiftedDate: scenarioEvent.date,
        shiftDays: dateDiff,
        amountPaise: scenarioEvent.amountPaise,
        impactDescription:
          dateDiff !== 0
            ? `Date shifted by +${dateDiff} day${dateDiff !== 1 ? "s" : ""}`
            : `Amount changed by ${amountDiff > 0 ? "+" : ""}${(amountDiff / 100).toFixed(0)}`,
      });
    }
  }

  // If supplier delivery was delayed, show inventory + order impact
  if (controls.supplierDeliveryDelayDays > 0) {
    impacts.push({
      entityId: "inv_1",
      entityType: "inventory",
      label: "Cotton Kurti inventory arrival",
      shiftDays: controls.supplierDeliveryDelayDays,
      impactDescription: `Delayed by ${controls.supplierDeliveryDelayDays} days — stock unavailable until restocked`,
    });
    impacts.push({
      entityId: "co_1",
      entityType: "customer_order",
      label: "Urban Threads order CO-1 (10x Cotton Kurti)",
      shiftDays: controls.supplierDeliveryDelayDays,
      impactDescription: `Fulfillment delayed: stock arrives ${controls.supplierDeliveryDelayDays}d late`,
    });
  }

  return impacts;
}

function computeRippleScore(
  controls: SimulatorControls,
  scenarioMinPaise: number,
  baselineMinPaise: number,
  affectedCount: number,
  shortfallPaise: number,
): RippleScoreBreakdown {
  // Cash shortfall factor: 0–40 pts
  let cashShortfallFactor = 0;
  if (shortfallPaise < 0) {
    // Negative balance — severity based on depth
    const depthK = Math.abs(shortfallPaise) / 100_000; // in units of ₹1000
    cashShortfallFactor = Math.min(40, 15 + depthK * 2);
  } else if (scenarioMinPaise < 500_000) {
    // Below safety threshold
    cashShortfallFactor = Math.min(30, 5 + ((500_000 - scenarioMinPaise) / 100_000) * 2);
  }

  // Delay magnitude factor: 0–25 pts
  const totalDelayDays = controls.supplierDeliveryDelayDays + controls.customerPaymentDelayDays;
  const delayMagnitudeFactor = Math.min(25, totalDelayDays * 0.83);

  // Downstream count factor: 0–20 pts
  const downstreamCountFactor = Math.min(20, affectedCount * 3);

  // Liquidity gap factor: 0–15 pts
  const liquidityGapPaise = baselineMinPaise - scenarioMinPaise;
  const liquidityGapFactor = Math.min(15, Math.max(0, liquidityGapPaise / 100_000));

  const totalScore = Math.round(
    cashShortfallFactor + delayMagnitudeFactor + downstreamCountFactor + liquidityGapFactor,
  );

  return {
    cashShortfallFactor: Math.round(cashShortfallFactor),
    delayMagnitudeFactor: Math.round(delayMagnitudeFactor),
    downstreamCountFactor: Math.round(downstreamCountFactor),
    liquidityGapFactor: Math.round(liquidityGapFactor),
    totalScore: Math.min(100, totalScore),
  };
}

function buildRecommendations(
  controls: SimulatorControls,
  shortfallPaise: number,
  scenarioMinPaise: number,
  baselineClosingPaise: number,
  scenarioClosingPaise: number,
  affectedDeps: DependencyImpact[],
): SimulatorRecommendation[] {
  const recs: SimulatorRecommendation[] = [];

  // Shortfall recommendations
  if (shortfallPaise < 0) {
    recs.push({
      id: "rec_shortfall_1",
      title: "Request a payment extension from Shree Textiles",
      rationale: `The simulated scenario results in a cash shortfall of ${Math.abs(shortfallPaise / 100).toFixed(0)} rupees. Deferring the ₹30,000 PO-1 balance payment by 7 days would eliminate the shortfall.`,
      priority: "high",
      impactPaise: 3_000_000,
    });
  }

  if (controls.customerPaymentDelayDays > 7) {
    recs.push({
      id: "rec_cust_delay",
      title: "Offer a 2% early-payment discount to Urban Threads",
      rationale: `A ${controls.customerPaymentDelayDays}-day delay in customer receipt significantly tightens working capital. Offering a small incentive to collect sooner can prevent a liquidity gap.`,
      priority: controls.customerPaymentDelayDays > 14 ? "high" : "medium",
      impactPaise: 800_000,
    });
  }

  if (controls.supplierDeliveryDelayDays > 3) {
    recs.push({
      id: "rec_sup_delay",
      title: "Activate backup inventory from existing stock",
      rationale: `A ${controls.supplierDeliveryDelayDays}-day supplier delivery delay risks the Day 6 customer order. With only 12 units on hand, consider partially fulfilling CO-1 from available stock.`,
      priority: "medium",
      impactPaise: undefined,
    });
  }

  if (scenarioClosingPaise < baselineClosingPaise - 1_000_000) {
    recs.push({
      id: "rec_liquidity",
      title: "Consider a short-term working capital credit line",
      rationale:
        "The simulated cash position is significantly below baseline. A revolving credit facility can bridge timing gaps between outflows and inflows.",
      priority: "low",
      impactPaise: undefined,
    });
  }

  if (scenarioMinPaise < 500_000 && shortfallPaise >= 0) {
    recs.push({
      id: "rec_threshold",
      title: "Cash falls below safety threshold — follow up on receivables",
      rationale:
        "The scenario pushes minimum cash below the ₹5,000 safety threshold. Send payment reminders for overdue invoices to bolster the buffer.",
      priority: "medium",
      impactPaise: 130_000,
    });
  }

  if (recs.length === 0) {
    recs.push({
      id: "rec_all_good",
      title: "Cash position remains healthy under this scenario",
      rationale:
        "No significant liquidity risk was detected. Continue monitoring supplier delivery timelines and customer payment dates.",
      priority: "low",
    });
  }

  return recs;
}

// ---------------------------------------------------------------------------
// Public API module
// ---------------------------------------------------------------------------

export const simulatorApi = {
  /**
   * Run a what-if simulation with the given controls.
   * Mock mode: fully deterministic local engine.
   * API mode: delegates to POST /api/simulate.
   */
  async simulate(controls: SimulatorControls): Promise<SimulatorResult> {
    if (DATA_MODE === "mock") {
      await delay(700);
      return runMockSimulation(controls);
    }
    return httpRequest<SimulatorResult>("/api/simulate", { method: "POST", body: controls });
  },

  /**
   * Save a scenario for later retrieval.
   */
  async saveScenario(
    name: string,
    controls: SimulatorControls,
    result: SimulatorResult,
  ): Promise<SavedSimulatorScenario> {
    if (DATA_MODE === "mock") {
      await delay(300);
      const scenario: SavedSimulatorScenario = {
        id: nextId("scn"),
        name,
        controls,
        result,
        createdAt: new Date().toISOString(),
      };
      savedScenarios.unshift(scenario);
      return scenario;
    }
    return httpRequest<SavedSimulatorScenario>("/api/scenarios", {
      method: "POST",
      body: { name, controls, result },
    });
  },

  /**
   * List saved scenarios.
   */
  async getScenarios(): Promise<SavedSimulatorScenario[]> {
    if (DATA_MODE === "mock") {
      await delay(200);
      return [...savedScenarios];
    }
    return httpRequest<SavedSimulatorScenario[]>("/api/scenarios");
  },

  /**
   * Fetch the dependency graph edges.
   */
  async getDependencies(): Promise<DependencyEdge[]> {
    if (DATA_MODE === "mock") {
      await delay(100);
      return buildDependencyEdges();
    }
    return httpRequest<DependencyEdge[]>("/api/dependencies");
  },

  /**
   * Baseline forecast (re-exports forecastApi.getForecast for convenience).
   */
  async getForecast(days: number): Promise<ForecastPoint[]> {
    if (DATA_MODE === "mock") {
      await delay(300);
      return buildForecast(db.cashFlowEvents, db.business.openingCashPaise, days);
    }
    return httpRequest<ForecastPoint[]>("/api/forecast", { query: { days } });
  },
};

// Re-export old simulationApi for backward compat with existing code
export const simulationApi = {
  async runScenario(
    input: Omit<SimulationScenario, "id" | "createdAt">,
  ): Promise<SimulationResult> {
    if (DATA_MODE === "mock") {
      await delay(600);
      const scenario: SimulationScenario = {
        ...input,
        id: nextId("sim"),
        createdAt: new Date().toISOString(),
      };
      const baseline = buildForecast(db.cashFlowEvents, db.business.openingCashPaise);
      const min =
        baseline.length > 0
          ? baseline.reduce((a, b) => (a.projectedBalancePaise <= b.projectedBalancePaise ? a : b))
          : { projectedBalancePaise: 0, date: new Date().toISOString().slice(0, 10) };
      return {
        scenarioId: scenario.id,
        baselineForecast: baseline,
        scenarioForecast: baseline,
        impactedEventIds: [scenario.targetEventId],
        minBalancePaise: min.projectedBalancePaise,
        minBalanceDate: min.date,
        summary: `Scenario "${scenario.name}" applied to event ${scenario.targetEventId}.`,
      };
    }
    return httpRequest<SimulationResult>("/api/simulations", { method: "POST", body: input });
  },

  async getScenarios(): Promise<SimulationScenario[]> {
    if (DATA_MODE === "mock") {
      await delay(150);
      return db.simulationScenarios;
    }
    return httpRequest<SimulationScenario[]>("/api/simulations/scenarios");
  },
};
