import { simulatorStore, type SharedSimulatorState } from "./simulatorStore";
import { formatMoney } from "@/lib/formatters";
import { getStoredBusiness } from "@/lib/api/authApi";

export interface LiveBusinessOverviewState {
  businessName: string;
  availableCashOnHandPaise: number;
  availableCashOnHandFormatted: string;
  cashStatus: string;
  safetyReservePaise: number;
  safetyReserveFormatted: string;
  incomingReceivablesPaise: number;
  incomingReceivablesFormatted: string;
  openInvoiceCount: number;
  committedPayablesPaise: number;
  committedPayablesFormatted: string;
  primaryCashRiskAlert: string;
  projectedDipDate: string;
  projectedDipAmountFormatted: string;
  upcomingTransactions: Array<{
    date: string;
    label: string;
    amountFormatted: string;
    direction: "incoming" | "outgoing";
  }>;
}

export interface LiveSimulatorState {
  activePreset: string;
  customerPaymentDelayDays: number;
  supplierDeliveryDelayDays: number;
  customerPaymentAmountFormatted: string;
  supplierPaymentAmountFormatted: string;
  simulatedClosingFormatted: string;
  minCashBalanceFormatted: string;
  changeVsBaselineFormatted: string;
  affectedEventsCount: number;
  paperMarginPercent: string;
  paperMarginFormatted: string;
  revenueFormatted: string;
  cogsFormatted: string;
  rippleContagionDragFormatted: string;
  lostSupplierEarlyDiscountFormatted: string;
  supplierHaltFeesFormatted: string;
  secondarySlaPenaltiesFormatted: string;
  workingCapitalFloatDragFormatted: string;
  trueRippleMarginPercent: string;
  trueRippleMarginFormatted: string;
  marginStatusNote: string;
  dependencyNodes: Array<{
    name: string;
    dayLabel: string;
    amountFormatted: string;
    riskMultiplier: string;
    role: string;
    notes?: string | undefined;
  }>;
  activeRescues: {
    autoPhaseApplied: boolean;
    autoPhaseDetails?: string | undefined;
    splitEscrowLocked: boolean;
    splitEscrowDetails?: string | undefined;
  };
}

export interface FullCrossPageState {
  overview: LiveBusinessOverviewState;
  simulator: LiveSimulatorState;
  systemPromptString: string;
}

export function getLiveCrossPageState(): FullCrossPageState {
  const sim = simulatorStore.getState();

  const storedBiz = typeof window !== "undefined" ? getStoredBusiness() : null;
  const isDemo = !storedBiz || storedBiz.name === "Rupi Clothing" || storedBiz.id === "biz_1";

  // 1. Live Business Overview state
  let overview: LiveBusinessOverviewState;

  if (isDemo) {
    overview = {
      businessName: "Rupi Clothing",
      availableCashOnHandPaise: 500_000,
      availableCashOnHandFormatted: "₹5,000",
      cashStatus: "Near Minimum Reserve",
      safetyReservePaise: 500_000,
      safetyReserveFormatted: "₹5,000",
      incomingReceivablesPaise: 2_250_000,
      incomingReceivablesFormatted: "+₹22,500",
      openInvoiceCount: 6,
      committedPayablesPaise: 5_370_000,
      committedPayablesFormatted: "-₹53,700",
      primaryCashRiskAlert:
        "Cash shortage risk around 2026-10-25 (Projected balance dips to -₹2,500 around 2026-10-25)",
      projectedDipDate: "2026-10-25",
      projectedDipAmountFormatted: "-₹2,500",
      upcomingTransactions: [
        {
          date: "16 Oct 2026",
          label: "Supplier Advance - Shree Textiles (PO-1)",
          amountFormatted: "-₹5,000",
          direction: "outgoing",
        },
        {
          date: "25 Oct 2026",
          label: "Bandhra West Shop Lease",
          amountFormatted: "-₹2,500",
          direction: "outgoing",
        },
        {
          date: "5 Nov 2026",
          label: "Expected Customer Receipt - Urban Threads (INV)",
          amountFormatted: "+₹8,000",
          direction: "incoming",
        },
        {
          date: "12 Nov 2026",
          label: "Store Staff Salary Run",
          amountFormatted: "-₹3,000",
          direction: "outgoing",
        },
      ],
    };
  } else {
    const bizName = storedBiz?.name || "My Business";
    const cashPaise = storedBiz?.openingCashPaise ?? 1_000_000;
    const safetyPaise = storedBiz?.safetyThresholdPaise ?? 500_000;
    const cashStatus =
      cashPaise >= safetyPaise * 1.5
        ? "Healthy Reserve"
        : cashPaise >= safetyPaise
          ? "Sufficient Reserve"
          : "Near Minimum Reserve";

    overview = {
      businessName: bizName,
      availableCashOnHandPaise: cashPaise,
      availableCashOnHandFormatted: formatMoney(cashPaise),
      cashStatus,
      safetyReservePaise: safetyPaise,
      safetyReserveFormatted: formatMoney(safetyPaise),
      incomingReceivablesPaise: 0,
      incomingReceivablesFormatted: "₹0",
      openInvoiceCount: 0,
      committedPayablesPaise: 0,
      committedPayablesFormatted: "₹0",
      primaryCashRiskAlert: "No immediate cash deficits detected. Account baseline initialized.",
      projectedDipDate: "None projected",
      projectedDipAmountFormatted: "₹0",
      upcomingTransactions: [],
    };
  }

  // 2. Live Simulator state dynamically derived from shared store
  const custDelay = sim.controls.customerPaymentDelayDays;
  const suppDelay = sim.controls.supplierDeliveryDelayDays;
  const custAmountPaise = sim.controls.customerPaymentAmountPaise ?? 50_000_000;
  const suppAmountPaise = sim.controls.supplierPaymentAmountPaise ?? 12_000_000;

  // Contagion calculations based on scenario
  let dragFormatted = "-₹93,300";
  let lostDiscountFormatted = "₹3,600";
  let haltFeesFormatted = "₹32,500";
  let slaPenaltiesFormatted = "₹39,000";
  let floatDragFormatted = "₹18,200";
  let trueMarginPct = "6.34%";
  let trueMarginAmtFormatted = "₹31,700";
  let marginNote = "Compression risk (compromised supply chain)";
  let simulatedClosingFormatted = "₹28,500";
  let minCashBalanceFormatted = "-₹32,000";
  let changeVsBaselineFormatted = "-₹48,200";
  let affectedEvents = 4;

  if (sim.preset === "chaos" || (sim.chaosResult && sim.chaosResult.isStressTestActive)) {
    dragFormatted = "-₹1,34,700";
    lostDiscountFormatted = "₹3,600";
    haltFeesFormatted = "₹48,500";
    slaPenaltiesFormatted = "₹54,000";
    floatDragFormatted = "₹28,600";
    trueMarginPct = "-1.94%";
    trueMarginAmtFormatted = "-₹9,700";
    marginNote = "Negative Margin Risk under Chaos Stress (+5d shock)";
    simulatedClosingFormatted = "₹12,200";
    minCashBalanceFormatted = "-₹68,500";
    changeVsBaselineFormatted = "-₹84,300";
    affectedEvents = 6;
  } else if (sim.preset === "custom_17d" || custDelay === 17) {
    dragFormatted = "-₹1,00,200";
    lostDiscountFormatted = "₹3,600";
    haltFeesFormatted = "₹35,000";
    slaPenaltiesFormatted = "₹42,000";
    floatDragFormatted = "₹19,600";
    trueMarginPct = "4.96%";
    trueMarginAmtFormatted = "₹24,800";
    marginNote = "Severe Margin Compression (14d+ compromised)";
    simulatedClosingFormatted = "₹24,800";
    minCashBalanceFormatted = "-₹36,400";
    changeVsBaselineFormatted = "-₹52,000";
    affectedEvents = 5;
  } else if (sim.preset === "baseline" || (custDelay === 0 && suppDelay === 0)) {
    dragFormatted = "₹0";
    lostDiscountFormatted = "₹0";
    haltFeesFormatted = "₹0";
    slaPenaltiesFormatted = "₹0";
    floatDragFormatted = "₹0";
    trueMarginPct = isDemo ? "25.0%" : "0.0%";
    trueMarginAmtFormatted = isDemo ? "₹1,25,000" : "₹0";
    marginNote = isDemo ? "Nominal Paper Accounting Margin realized" : "Baseline operating state without payment delays";
    simulatedClosingFormatted = isDemo ? "₹76,700" : overview.availableCashOnHandFormatted;
    minCashBalanceFormatted = isDemo ? "-₹2,500" : overview.availableCashOnHandFormatted;
    changeVsBaselineFormatted = "₹0";
    affectedEvents = 0;
  }

  // Adjust if rescues are active
  if (sim.rescues.splitEscrowLocked) {
    marginNote += " [Tri-Party Split-Escrow Active: Zero Cash Outflow at Day 18]";
  }
  if (sim.rescues.autoPhaseApplied) {
    marginNote += " [Auto-Phase Inventory Active: Phased Batches Protected Safety Buffer]";
  }

  // Build dependency nodes
  let dependencyNodes: LiveSimulatorState["dependencyNodes"];

  if (!isDemo && sim.preset === "baseline") {
    dependencyNodes = [
      {
        name: `${overview.businessName} Treasury`,
        dayLabel: "Day 0",
        amountFormatted: `${overview.availableCashOnHandFormatted} usable balance`,
        riskMultiplier: "1.0x",
        role: `Safety buffer: ${overview.safetyReserveFormatted}`,
        notes: "Initial usable liquid cash reserve.",
      },
    ];
  } else {
    dependencyNodes = [
      {
        name: isDemo ? "Rupi Clothing Treasury" : `${overview.businessName} Treasury`,
        dayLabel: "Day 0",
        amountFormatted: isDemo ? "₹10,000 usable balance" : `${overview.availableCashOnHandFormatted} usable balance`,
        riskMultiplier: "1.0x",
        role: `Safety buffer: ${isDemo ? "₹50,000" : overview.safetyReserveFormatted}`,
      },
      {
        name: "Kaveri Timber",
        dayLabel: "Day 25",
        amountFormatted: "-₹1,20,000 Outgoing",
        riskMultiplier: "1.4x Ripple Risk",
        role: "Raw Material Supplier",
        notes: "Eligible for Auto-Phase & Split-Escrow rescues",
      },
      {
        name: "Metro Retail",
        dayLabel: "Day 29",
        amountFormatted: "+₹1,65,000 Incoming",
        riskMultiplier: "Fulfillment Gate",
        role: "₹3,000/day SLA penalty exposure",
      },
      {
        name: "Apex Corp (#INV-APEX)",
        dayLabel: "Day 32",
        amountFormatted: "+₹5,00,000 Incoming",
        riskMultiplier: "20.0x - Critical Keystone",
        role: "Wholesale Anchor Account",
        notes: "Primary delay driver transmitting contagion across the network",
      },
    ];
  }

  const simulator: LiveSimulatorState = {
    activePreset: sim.presetLabel || (isDemo ? "Apex Flagship (+16d)" : "Baseline"),
    customerPaymentDelayDays: custDelay,
    supplierDeliveryDelayDays: suppDelay,
    customerPaymentAmountFormatted: `₹${(custAmountPaise / 100).toLocaleString("en-IN")}`,
    supplierPaymentAmountFormatted: `₹${(suppAmountPaise / 100).toLocaleString("en-IN")}`,
    simulatedClosingFormatted,
    minCashBalanceFormatted,
    changeVsBaselineFormatted,
    affectedEventsCount: affectedEvents,
    paperMarginPercent: isDemo || sim.preset !== "baseline" ? "25%" : "0%",
    paperMarginFormatted: isDemo || sim.preset !== "baseline" ? "₹1,25,000" : "₹0",
    revenueFormatted: isDemo || sim.preset !== "baseline" ? "₹5,00,000" : "₹0",
    cogsFormatted: isDemo || sim.preset !== "baseline" ? "₹3,75,000" : "₹0",
    rippleContagionDragFormatted: dragFormatted,
    lostSupplierEarlyDiscountFormatted: lostDiscountFormatted,
    supplierHaltFeesFormatted: haltFeesFormatted,
    secondarySlaPenaltiesFormatted: slaPenaltiesFormatted,
    workingCapitalFloatDragFormatted: floatDragFormatted,
    trueRippleMarginPercent: trueMarginPct,
    trueRippleMarginFormatted: trueMarginAmtFormatted,
    marginStatusNote: marginNote,
    dependencyNodes,
    activeRescues: {
      autoPhaseApplied: sim.rescues.autoPhaseApplied,
      autoPhaseDetails: sim.rescues.autoPhaseApplied
        ? "Batch 1 (₹1,00,000 Day 18) and Batch 2 (₹20,000 Day 32) safely split"
        : undefined,
      splitEscrowLocked: sim.rescues.splitEscrowLocked,
      splitEscrowDetails: sim.rescues.splitEscrowLocked
        ? "Metro Retail ₹1,65,000 invoice pledged directly to Kaveri Timber (₹0 upfront cash)"
        : undefined,
    },
  };

  // Format upcoming transactions
  const upcomingTxText =
    overview.upcomingTransactions.length > 0
      ? overview.upcomingTransactions
          .map((tx) => `  - ${tx.date}: ${tx.label} -> ${tx.amountFormatted}`)
          .join("\n")
      : "  - No upcoming transactions recorded (Fresh account baseline).";

  // Format dependency nodes
  const dependencyNodesText = simulator.dependencyNodes
    .map((n) => `  - ${n.name} (${n.dayLabel}: ${n.amountFormatted}, ${n.riskMultiplier})`)
    .join("\n");

  const isFlagshipActive =
    isDemo || sim.preset === "flagship" || sim.preset === "chaos" || sim.preset === "custom_17d";

  // Build the strict System Instruction string for Gemini
  const systemPromptString = `
You are the Ripple AI Financial Copilot for ${overview.businessName}. You have full real-time visibility into the Supplier-Business-Customer Loop, the 30-day Cash Flow Forecast, and the Ripple Simulator.

=== LIVE REAL-TIME CROSS-PAGE APP STATE ===

[1. BUSINESS OVERVIEW PAGE]
• Business Name: ${overview.businessName}
• Available Cash on Hand: ${overview.availableCashOnHandFormatted} (Status: ${overview.cashStatus}, Safety Reserve: ${overview.safetyReserveFormatted})
• Incoming Receivables: ${overview.incomingReceivablesFormatted} across ${overview.openInvoiceCount} open invoices
• Committed Payables: ${overview.committedPayablesFormatted} in scheduled supplier bills
• Primary Cash Risk Alert: ${overview.primaryCashRiskAlert}
• Key Upcoming Transactions:
${upcomingTxText}

[2. RIPPLE SIMULATOR PAGE (LIVE ACTIVE SCENARIO)]
• Active Preset: ${simulator.activePreset}
• Customer Payment Delay: +${simulator.customerPaymentDelayDays} days (Amount: ${simulator.customerPaymentAmountFormatted})
• Supplier Delivery Delay: +${simulator.supplierDeliveryDelayDays} days (Amount: ${simulator.supplierPaymentAmountFormatted})
• Live KPI Cards:
  - Simulated Closing Cash: ${simulator.simulatedClosingFormatted}
  - Min Cash Balance: ${simulator.minCashBalanceFormatted}
  - Change vs Baseline: ${simulator.changeVsBaselineFormatted}
  - Affected Events: ${simulator.affectedEventsCount}
• Live Ripple-Adjusted True Margin (RATM) Breakdown:
  - Paper Margin (Accounting): ${simulator.paperMarginPercent} (${simulator.paperMarginFormatted}) on ${simulator.revenueFormatted} Revenue / ${simulator.cogsFormatted} COGS
  - Ripple Contagion Drag: ${simulator.rippleContagionDragFormatted} (${simulator.customerPaymentDelayDays}d delay)
  - 4-Part Contagion Cost Breakdown:
    * Lost Supplier Early Discount: ${simulator.lostSupplierEarlyDiscountFormatted}
    * Supplier Late Penalties / Halt Fees: ${simulator.supplierHaltFeesFormatted}
    * Secondary Customer SLA Penalties: ${simulator.secondarySlaPenaltiesFormatted}
    * Working-Capital Float Drag: ${simulator.workingCapitalFloatDragFormatted}
  - True Ripple Margin: ${simulator.trueRippleMarginPercent} (${simulator.trueRippleMarginFormatted}) — ${simulator.marginStatusNote}
• Dependency Graph Nodes & Fragility Multipliers:
${dependencyNodesText}
• Active Rescue Status:
  - Auto-Phase Inventory: ${simulator.activeRescues.autoPhaseApplied ? "ACTIVE (" + simulator.activeRescues.autoPhaseDetails + ")" : "NOT ACTIVE"}
  - Lock Tri-Party Split-Escrow: ${simulator.activeRescues.splitEscrowLocked ? "LOCKED (" + simulator.activeRescues.splitEscrowDetails + ")" : "NOT LOCKED"}

=== STRICT CUSTOMIZATION & OPERATIONAL RULES ===
• RULE 1 (ALWAYS GROUNDED IN LIVE NUMBERS): Never give generic textbook advice. Every single answer MUST cite the exact numbers, entities, ₹ amounts and dates from the live app state above. Current treasury: ${overview.availableCashOnHandFormatted}.
${
  isFlagshipActive
    ? `• RULE 2 (EXPOSE THE PAPER VS. TRUE MARGIN ILLUSION): Whenever discussing profitability, delays, or customer health, explicitly contrast Paper Margin (${simulator.paperMarginPercent} / ${simulator.paperMarginFormatted}) with the live Ripple-Adjusted True Margin (${simulator.trueRippleMarginPercent} / ${simulator.trueRippleMarginFormatted}) and explain the 4 contagion cost drivers.
• RULE 3 (HIGHLIGHT KEYSTONE FRAGILITY): Point out that Apex Corp (#INV-APEX) carries a 20.0x Ripple Risk Multiplier (Critical Keystone), whereas Kaveri Timber carries a 1.4x Ripple Risk.
• RULE 4 (ZERO-DEBT AUTONOMOUS RESCUES FIRST): Never tell the business owner to "just take a bank loan." Always recommend our two Loop-Native rescues first:
  1. Auto-Phase Inventory (Micro-Batching): Splitting Kaveri Timber's -₹1,20,000 raw material commitment into smaller phased batches synced to incoming cash.
  2. Lock Tri-Party Split-Escrow (Zero-Cash Redirect): Pledging Metro Retail's verified +₹1,65,000 incoming wholesale order directly to Kaveri Timber so ₹1,20,000 routes to the supplier at settlement and raw materials unlock today with ₹0 upfront cash.`
    : `• RULE 2 (FRESH BUSINESS ONBOARDING): Recognize that ${overview.businessName} is newly registered with 0 open invoices and ₹0 in debt commitments. Guide the user on registering counterparties and issuing invoices.
• RULE 3 (PREDICTIVE SIMULATION CAPABILITY): Explain that Ripple Simulator can stress-test hypothetical customer payment delays before they happen. Invite them to test what-if scenarios or load the Apex Flagship demo scenario.
• RULE 4 (ZERO-DEBT AUTONOMOUS RESCUES): Explain our two Loop-Native rescues: Auto-Phase Inventory (Micro-Batching) and Tri-Party Split-Escrow (Zero-Cash Redirect) that protect cash buffers without incurring bank debt.`
}
• RULE 5 (CLEAN EXECUTIVE FORMATTING & PLAIN ENGLISH EXPLANATIONS): Talk like a sharp, friendly financial advisor for a small business owner. Avoid dense academic jargon. Explain concepts in clear, simple terms (e.g. explain that 'Paper Margin' is what the ledger says on paper, but 'True Ripple Margin' is what actually lands in your pocket after delay penalties). Keep responses concise, punchy, structured with bold numbers, short bullet points, and a single, clear **Recommended Next Action** at the end.
`.trim();

  return {
    overview,
    simulator,
    systemPromptString,
  };
}
