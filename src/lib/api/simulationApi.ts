import { DATA_MODE } from "@/lib/config";
import { httpRequest } from "@/lib/api/client";
import { db, delay, nextId } from "@/mocks/store";
import { buildForecast, cashFlowEvents as seedEvents } from "@/mocks/data";
import { toISODate } from "@/lib/formatters";
import { addDays } from "date-fns";
import { getStoredBusiness } from "@/lib/api/authApi";
import type {
  SimulationScenario,
  SimulationResult,
  SimulatorResult,
  SimulatorControls,
  SimulatorRecommendation,
  DependencyImpact,
  RippleScoreBreakdown,
  ActiveRescue,
  ForecastPoint,
  CashFlowEvent,
  DependencyEdge,
  TrueMarginData,
  SimulatorTimelineNode,
  AutoPhasePreview,
  SplitEscrowPreview,
  ChaosStressTestResult,
} from "@/types";

// ---------------------------------------------------------------------------
// Simulator domain types now live in `@/types` — a shared type could not
// reference an API-module type, which is what forced `activeRescues` and
// `ChaosStressTestResult.stressedResult` to be `any`. Re-exported here so all
// existing imports from this module keep working.
// ---------------------------------------------------------------------------

export type {
  SimulatorResult,
  SimulatorControls,
  SimulatorRecommendation,
  DependencyImpact,
  RippleScoreBreakdown,
  ActiveRescue,
} from "@/types";

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

  const effectiveContagionDays = Math.max(0, controls.customerPaymentDelayDays);
  const lostDiscount = effectiveContagionDays > 0 ? 360_000 : 0;
  const haltFees = effectiveContagionDays * 250_000;
  const slaPenalties = effectiveContagionDays * 300_000;
  const floatDrag = effectiveContagionDays * 140_000;
  const totalContagion = lostDiscount + haltFees + slaPenalties + floatDrag;

  const currentBiz = typeof window !== "undefined" ? getStoredBusiness() : null;
  const isDemo = !currentBiz || currentBiz.name === "Rupi Clothing" || currentBiz.id === "biz_1";
  const bizName = currentBiz?.name || "Rupi Clothing";
  const openingCashPaise = currentBiz?.openingCashPaise ?? 15_000_000;
  const safetyBufferPaise = currentBiz?.safetyThresholdPaise ?? 5_000_000;

  const mockTrueMargin = isDemo
    ? {
        revenuePaise: 50_000_000,
        directCogsPaise: 37_500_000,
        paperMarginPaise: 12_500_000,
        paperMarginPercent: 25.0,
        contagionDays: effectiveContagionDays,
        breakdown: {
          lostDiscountPaise: lostDiscount,
          supplierHaltFeesPaise: haltFees,
          slaPenaltiesPaise: slaPenalties,
          workingCapitalDragPaise: floatDrag,
          floatFeePaise: 0,
        },
        totalContagionCostPaise: totalContagion,
        trueRippleMarginPaise: 12_500_000 - totalContagion,
        trueRippleMarginPercent: Math.round(((12_500_000 - totalContagion) / 50_000_000) * 10000) / 100,
        explanation: `Paper Margin of 25% reduced by ₹${(totalContagion / 100).toLocaleString()} in ripple contagion to True Margin of ${Math.round(((12_500_000 - totalContagion) / 50_000_000) * 10000) / 100}%.`,
      }
    : (controls.customerPaymentDelayDays > 0 || controls.customerPaymentAmountPaise || controls.supplierDeliveryDelayDays > 0 || controls.supplierPaymentAmountPaise)
      ? {
          revenuePaise: controls.customerPaymentAmountPaise ?? 10_000_000,
          directCogsPaise: controls.supplierPaymentAmountPaise ?? 7_500_000,
          paperMarginPaise: (controls.customerPaymentAmountPaise ?? 10_000_000) - (controls.supplierPaymentAmountPaise ?? 7_500_000),
          paperMarginPercent: 25.0,
          contagionDays: effectiveContagionDays,
          breakdown: {
            lostDiscountPaise: lostDiscount,
            supplierHaltFeesPaise: haltFees,
            slaPenaltiesPaise: slaPenalties,
            workingCapitalDragPaise: floatDrag,
            floatFeePaise: 0,
          },
          totalContagionCostPaise: totalContagion,
          trueRippleMarginPaise: Math.max(0, ((controls.customerPaymentAmountPaise ?? 10_000_000) - (controls.supplierPaymentAmountPaise ?? 7_500_000)) - totalContagion),
          trueRippleMarginPercent: Math.max(0, 25.0 - (effectiveContagionDays * 1.5)),
          explanation: `Simulated scenario evaluated with contagion impact of ₹${(totalContagion / 100).toLocaleString()}.`,
        }
      : {
          revenuePaise: 0,
          directCogsPaise: 0,
          paperMarginPaise: 0,
          paperMarginPercent: 0.0,
          contagionDays: 0,
          breakdown: {
            lostDiscountPaise: 0,
            supplierHaltFeesPaise: 0,
            slaPenaltiesPaise: 0,
            workingCapitalDragPaise: 0,
            floatFeePaise: 0,
          },
          totalContagionCostPaise: 0,
          trueRippleMarginPaise: 0,
          trueRippleMarginPercent: 0.0,
          explanation: `Ready for ${bizName}. Add invoices in the Ledger or test hypothetical payment delays in the Ripple Simulator.`,
        };

  const openingNode: SimulatorTimelineNode = {
    id: "node_opening_cash",
    label: "Opening Cash Reserve",
    type: "cash_reserve",
    dayLabel: "Day 0",
    date: new Date().toISOString().slice(0, 10),
    amountPaise: openingCashPaise,
    direction: "balance",
    status: "completed",
    counterparty: `${bizName} Treasury`,
    description: `Initial usable balance with ₹${Math.round(safetyBufferPaise / 100).toLocaleString("en-IN")} protected safety buffer.`,
  };

  let mockTimelineNodes: SimulatorTimelineNode[];

  if (isDemo) {
    mockTimelineNodes = [
      openingNode,
      {
        id: "node_apex_corp",
        label: "Apex Corp — Customer Invoice #INV-APEX",
        type: "customer_receivable",
        dayLabel: `Day ${15 + controls.customerPaymentDelayDays}`,
        date: new Date(Date.now() + (15 + controls.customerPaymentDelayDays) * 86400000)
          .toISOString()
          .slice(0, 10),
        amountPaise: controls.customerPaymentAmountPaise ?? 50_000_000,
        direction: "incoming",
        status: controls.customerPaymentDelayDays > 0 ? "delayed" : "upcoming",
        counterparty: "Apex Corp",
        description: "Customer receivable protecting downstream supply chain fulfillment.",
        fragility: {
          nodeId: "node_apex_corp",
          invoiceAmountPaise: 4_000_000,
          downstreamValueAtRiskPaise: 80_000_000,
          multiplier: 20.0,
          isKeystone: true,
          badgeText: "Ripple Risk: 20.0x (Critical Keystone)",
          badgeVariant: "destructive",
          exposedOrders: ["Metro Retail Wholesale Order #MR-2026", "Central Distribution Lot #4"],
        },
        margin: mockTrueMargin,
      },
      {
        id: "node_kaveri_timber",
        label: "Kaveri Timber — Supplier Commitment",
        type: "supplier_payable",
        dayLabel: `Day ${18 + controls.supplierDeliveryDelayDays}`,
        date: new Date(Date.now() + (18 + controls.supplierDeliveryDelayDays) * 86400000)
          .toISOString()
          .slice(0, 10),
        amountPaise: controls.supplierPaymentAmountPaise ?? 12_000_000,
        direction: "outgoing",
        status: controls.supplierDeliveryDelayDays > 0 ? "delayed" : "upcoming",
        counterparty: "Kaveri Timber",
        description: "Supplier procurement commitment of ₹1,20,000 for raw materials.",
        fragility: {
          nodeId: "node_kaveri_timber",
          invoiceAmountPaise: 12_000_000,
          downstreamValueAtRiskPaise: 16_500_000,
          multiplier: 1.4,
          isKeystone: false,
          badgeText: "Ripple Risk: 1.4x",
          badgeVariant: "outline",
          exposedOrders: ["Metro Retail Wholesale Order #MR-2026"],
        },
        isEligibleForAutoPhase: true,
        isEligibleForSplitEscrow: true,
      },
      {
        id: "node_metro_retail",
        label: "Metro Retail — Wholesale Order #MR-2026",
        type: "downstream_fulfillment",
        dayLabel: `Day ${22 + controls.supplierDeliveryDelayDays}`,
        date: new Date(Date.now() + (22 + controls.supplierDeliveryDelayDays) * 86400000)
          .toISOString()
          .slice(0, 10),
        amountPaise: 16_500_000,
        direction: "incoming",
        status: effectiveContagionDays > 0 ? "at_risk" : "active",
        counterparty: "Metro Retail",
        description:
          effectiveContagionDays > 0
            ? "Exposed to secondary SLA delay penalty."
            : "Inventory gate unlocked.",
        fragility: {
          nodeId: "node_metro_retail",
          invoiceAmountPaise: 16_500_000,
          downstreamValueAtRiskPaise: 16_500_000,
          multiplier: 1.0,
          isKeystone: false,
          badgeText: "Fulfillment Gate",
          badgeVariant: "outline",
          exposedOrders: ["Direct Customer Delivery"],
        },
      },
    ];
  } else {
    // Non-demo registered account
    mockTimelineNodes = [openingNode];
    if (controls.customerPaymentAmountPaise || controls.customerPaymentDelayDays > 0) {
      const simAmt = controls.customerPaymentAmountPaise ?? 10_000_000;
      mockTimelineNodes.push({
        id: "node_sim_customer",
        label: "Simulated Customer Receivable",
        type: "customer_receivable",
        dayLabel: `Day ${15 + controls.customerPaymentDelayDays}`,
        date: new Date(Date.now() + (15 + controls.customerPaymentDelayDays) * 86400000)
          .toISOString()
          .slice(0, 10),
        amountPaise: simAmt,
        direction: "incoming",
        status: controls.customerPaymentDelayDays > 0 ? "delayed" : "upcoming",
        counterparty: "Simulated Customer",
        description: `Hypothetical customer receivable ${controls.customerPaymentDelayDays > 0 ? `(delayed +${controls.customerPaymentDelayDays}d)` : "on schedule"}.`,
        fragility: {
          nodeId: "node_sim_customer",
          invoiceAmountPaise: simAmt,
          downstreamValueAtRiskPaise: simAmt,
          multiplier: 1.0,
          isKeystone: false,
          badgeText: "Simulated Inflow",
          badgeVariant: "outline",
          exposedOrders: [],
        },
      });
    }
    if (controls.supplierPaymentAmountPaise || controls.supplierDeliveryDelayDays > 0) {
      const simAmt = controls.supplierPaymentAmountPaise ?? 5_000_000;
      mockTimelineNodes.push({
        id: "node_sim_supplier",
        label: "Simulated Supplier Commitment",
        type: "supplier_payable",
        dayLabel: `Day ${18 + controls.supplierDeliveryDelayDays}`,
        date: new Date(Date.now() + (18 + controls.supplierDeliveryDelayDays) * 86400000)
          .toISOString()
          .slice(0, 10),
        amountPaise: simAmt,
        direction: "outgoing",
        status: controls.supplierDeliveryDelayDays > 0 ? "delayed" : "upcoming",
        counterparty: "Simulated Supplier",
        description: `Hypothetical supplier commitment ${controls.supplierDeliveryDelayDays > 0 ? `(delayed +${controls.supplierDeliveryDelayDays}d)` : "on schedule"}.`,
        fragility: {
          nodeId: "node_sim_supplier",
          invoiceAmountPaise: simAmt,
          downstreamValueAtRiskPaise: simAmt,
          multiplier: 1.0,
          isKeystone: false,
          badgeText: "Simulated Outflow",
          badgeVariant: "outline",
          exposedOrders: [],
        },
      });
    }
  }

  const finalRecommendations = isDemo
    ? recommendations
    : (controls.customerPaymentDelayDays === 0 && controls.supplierDeliveryDelayDays === 0 && !controls.customerPaymentAmountPaise && !controls.supplierPaymentAmountPaise)
      ? [
          {
            id: "rec_onboarding",
            title: "Add Invoices & Commitments",
            rationale: "Record customer invoices and supplier purchase orders in the Ledger to track real-time Ripple risk.",
            priority: "medium" as const,
            impactPaise: 0,
            rescueType: "none" as const,
          },
        ]
      : recommendations;

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
    recommendations: finalRecommendations,
    trueMargin: mockTrueMargin,
    timelineNodes: mockTimelineNodes,
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
   * API mode: delegates to POST /api/simulator/simulate.
   */
  async simulate(controls: SimulatorControls): Promise<SimulatorResult> {
    if (DATA_MODE === "mock") {
      await delay(700);
      return runMockSimulation(controls);
    }
    return httpRequest<SimulatorResult>("/api/simulator/simulate", {
      method: "POST",
      body: controls,
    });
  },

  /**
   * Run isolated Chaos Stress-Test (+5-day shock)
   */
  async runChaosStressTest(controls: SimulatorControls): Promise<ChaosStressTestResult> {
    if (DATA_MODE === "mock") {
      await delay(500);
      const baseline = await runMockSimulation(controls);
      const stressedControls = {
        ...controls,
        customerPaymentDelayDays: controls.customerPaymentDelayDays + 5,
        supplierDeliveryDelayDays: controls.supplierDeliveryDelayDays + 5,
      };
      const stressedResult = await runMockSimulation(stressedControls);
      return {
        isStressTestActive: true,
        baselineMinCashPaise: baseline.scenarioMinPaise,
        stressedMinCashPaise: stressedResult.scenarioMinPaise,
        additionalShortfallPaise: Math.max(
          0,
          baseline.scenarioMinPaise - stressedResult.scenarioMinPaise,
        ),
        newlyAffectedNodesCount: 1,
        newlyEndangeredOrderValuePaise: 16_500_000,
        mostFragileNodeBefore: "node_apex_corp",
        mostFragileNodeAfter: "node_apex_corp",
        mostFragileNodeLabel: "Apex Corp — Customer Invoice #INV-APEX",
        mostFragileMultiplier: 20.0,
        baselineTrueMargin: baseline.trueMargin || {
          revenuePaise: 50_000_000,
          directCogsPaise: 37_500_000,
          paperMarginPaise: 12_500_000,
          paperMarginPercent: 25.0,
          contagionDays: 13,
          breakdown: {
            lostDiscountPaise: 360_000,
            supplierHaltFeesPaise: 3_250_000,
            slaPenaltiesPaise: 3_900_000,
            workingCapitalDragPaise: 1_820_000,
            floatFeePaise: 0,
          },
          totalContagionCostPaise: 9_330_000,
          trueRippleMarginPaise: 3_170_000,
          trueRippleMarginPercent: 6.34,
          explanation:
            "Paper Margin of 25% reduced by ₹93,300 in ripple contagion to True Margin of 6.34%.",
        },
        stressedTrueMargin: stressedResult.trueMargin || {
          revenuePaise: 50_000_000,
          directCogsPaise: 37_500_000,
          paperMarginPaise: 12_500_000,
          paperMarginPercent: 25.0,
          contagionDays: 18,
          breakdown: {
            lostDiscountPaise: 360_000,
            supplierHaltFeesPaise: 4_500_000,
            slaPenaltiesPaise: 5_400_000,
            workingCapitalDragPaise: 2_520_000,
            floatFeePaise: 0,
          },
          totalContagionCostPaise: 12_780_000,
          trueRippleMarginPaise: -280_000,
          trueRippleMarginPercent: -0.56,
          explanation: "+5-day stress creates negative True Margin.",
        },
        stressedResult,
        summary:
          "+5-day Chaos Stress Test reduced minimum liquidity. Most fragile node: Apex Corp (20.0x multiplier).",
      };
    }
    return httpRequest<ChaosStressTestResult>("/api/simulator/chaos-test", {
      method: "POST",
      body: controls,
    });
  },

  /**
   * Auto-Phase Inventory preview
   */
  async previewAutoPhase(params: {
    supplierCommitmentPaise?: number;
    actualAvailableCashPaise?: number;
    safetyBufferPaise?: number;
    originalPaymentDate?: string;
    customerPaymentDate?: string;
  }): Promise<AutoPhasePreview> {
    if (DATA_MODE === "mock") {
      await delay(200);
      const commitment = params.supplierCommitmentPaise ?? 12_000_000;
      const cash = params.actualAvailableCashPaise ?? 15_000_000;
      const buffer = params.safetyBufferPaise ?? 5_000_000;
      const usable = Math.max(0, cash - buffer);
      const shortfall = Math.max(0, commitment - usable);
      return {
        supplierCommitmentPaise: commitment,
        actualAvailableCashPaise: cash,
        safetyBufferPaise: buffer,
        usableFreeCashPaise: usable,
        shortfallPaise: shortfall,
        batch1: {
          amountPaise: commitment - shortfall,
          date: params.originalPaymentDate || "Day 18",
          label: `Batch 1 (₹${((commitment - shortfall) / 100).toLocaleString()})`,
          purpose: "Immediate dispatch within available usable free cash",
        },
        batch2: {
          amountPaise: shortfall,
          date: "Day 32",
          label: `Batch 2 (₹${(shortfall / 100).toLocaleString()})`,
          purpose: "Deferred settlement aligned with customer inflow",
        },
        safetyBufferPreserved: true,
        explanation: `Splits ₹${(commitment / 100).toLocaleString()} into Batch 1 (₹${((commitment - shortfall) / 100).toLocaleString()}) on Day 18 and Batch 2 (₹${(shortfall / 100).toLocaleString()}) on Day 32, safeguarding the safety buffer.`,
      };
    }
    return httpRequest<AutoPhasePreview>("/api/simulator/rescues/auto-phase/preview", {
      method: "POST",
      body: params,
    });
  },

  /**
   * Apply Auto-Phase Inventory rescue
   */
  async applyAutoPhase(params: {
    supplierCommitmentPaise?: number;
    actualAvailableCashPaise?: number;
    safetyBufferPaise?: number;
    originalPaymentDate?: string;
    customerPaymentDate?: string;
  }): Promise<{ success: boolean; rescueId: string; rescue: AutoPhasePreview; message: string }> {
    if (DATA_MODE === "mock") {
      await delay(300);
      const preview = await this.previewAutoPhase(params);
      return {
        success: true,
        rescueId: nextId("res_ap"),
        rescue: preview,
        message:
          "Auto-Phase Inventory applied. Batch 1 and Batch 2 scheduled with safety buffer intact.",
      };
    }
    return httpRequest("/api/simulator/rescues/auto-phase/apply", {
      method: "POST",
      body: params,
    });
  },

  /**
   * Tri-Party Split-Escrow preview
   */
  async previewSplitEscrow(params: {
    customerInvoicePaise?: number;
    supplierCommitmentPaise?: number;
    supplierFundingDate?: string;
    customerSettlementDate?: string;
  }): Promise<SplitEscrowPreview> {
    if (DATA_MODE === "mock") {
      await delay(200);
      const invoice = params.customerInvoicePaise ?? 50_000_000;
      const supplier = params.supplierCommitmentPaise ?? 12_000_000;
      const fee = Math.round(supplier * 0.02);
      const net = Math.max(0, invoice - supplier - fee);
      return {
        customerInvoicePaise: invoice,
        supplierCommitmentPaise: supplier,
        floatFeePaise: fee,
        totalDeductionPaise: supplier + fee,
        netProceedsPaise: net,
        isEligible: invoice >= supplier + fee,
        supplierFundingDate: params.supplierFundingDate || "Day 18",
        customerSettlementDate: params.customerSettlementDate || "Day 31",
        bypassArcLabel: "Tri-Party Split-Escrow",
        explanation: `Escrow satisfies ₹${(supplier / 100).toLocaleString()} obligation with zero ordinary cash outlay. Deducts supplier cost and ₹${(fee / 100).toLocaleString()} fee at settlement, remitting net ₹${(net / 100).toLocaleString()} to business.`,
      };
    }
    return httpRequest<SplitEscrowPreview>("/api/simulator/rescues/split-escrow/preview", {
      method: "POST",
      body: params,
    });
  },

  /**
   * Apply Tri-Party Split-Escrow arrangement
   */
  async applySplitEscrow(params: {
    customerInvoicePaise?: number;
    supplierCommitmentPaise?: number;
    supplierFundingDate?: string;
    customerSettlementDate?: string;
  }): Promise<{ success: boolean; rescueId: string; rescue: SplitEscrowPreview; message: string }> {
    if (DATA_MODE === "mock") {
      await delay(300);
      const preview = await this.previewSplitEscrow(params);
      return {
        success: true,
        rescueId: nextId("res_esc"),
        rescue: preview,
        message:
          "Tri-Party Split-Escrow arrangement locked. Supplier obligation funded with zero ordinary cash outlay.",
      };
    }
    return httpRequest("/api/simulator/rescues/split-escrow/apply", {
      method: "POST",
      body: params,
    });
  },

  /**
   * Revert a specific rescue
   */
  async revertRescue(rescueId: string): Promise<{ success: boolean; message: string }> {
    if (DATA_MODE === "mock") {
      await delay(200);
      return { success: true, message: "Rescue reverted." };
    }
    return httpRequest(`/api/simulator/rescues/${rescueId}/revert`, { method: "POST" });
  },

  /**
   * Revert all rescues
   */
  async revertAllRescues(): Promise<{ success: boolean; revertedCount: number; message: string }> {
    if (DATA_MODE === "mock") {
      await delay(200);
      return { success: true, revertedCount: 1, message: "All rescues reverted." };
    }
    return httpRequest("/api/simulator/rescues/revert-all", { method: "POST" });
  },

  /**
   * Get active rescues
   */
  async getRescues(): Promise<ActiveRescue[]> {
    if (DATA_MODE === "mock") {
      await delay(100);
      return [];
    }
    return httpRequest<ActiveRescue[]>("/api/simulator/rescues");
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
