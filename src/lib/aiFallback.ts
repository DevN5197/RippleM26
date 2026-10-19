import { getLiveCrossPageState, type FullCrossPageState } from "./crossPageState";

export interface ActionPill {
  id: "open_simulator" | "load_apex" | "apply_auto_phase" | "apply_split_escrow";
  label: string;
  icon?: string;
  description?: string;
}

export interface AiBotReply {
  text: string;
  actionPills?: ActionPill[];
  isFallback: boolean;
  model: string;
}

/**
 * Smart, context-aware local response generator that reads the exact live state of the app.
 * Follows Rules 1–5 strictly:
 * - Always grounded in live numbers (exact entities, ₹ amounts, dates)
 * - Exposes Paper vs. True Margin illusion (25% vs 4.96%/6.34%/-1.94%)
 * - Highlights keystone fragility (Apex Corp 20.0x vs Kaveri Timber 1.4x)
 * - Zero-debt loop-native rescues first (Auto-Phase Inventory & Tri-Party Split-Escrow)
 * - Executive formatting with clear Recommended Next Action
 */
export function generateSmartLocalResponse(
  input: string,
  state?: FullCrossPageState,
): AiBotReply {
  const liveState = state || getLiveCrossPageState();
  const { overview, simulator } = liveState;
  const isDemo = overview.businessName === "Rupi Clothing" || overview.openInvoiceCount > 0;
  const q = input.toLowerCase().trim();

  // 0. CONVERSATIONAL GREETINGS (hello, hi, hey, who are you)
  if (
    q === "hello" ||
    q === "hi" ||
    q === "hey" ||
    q === "greetings" ||
    q === "good morning" ||
    q === "good afternoon" ||
    q === "good evening" ||
    q.startsWith("hello") ||
    q.startsWith("hi ") ||
    q.startsWith("hey ") ||
    q.includes("who are you") ||
    q.includes("what can you do")
  ) {
    return {
      text: `Hello! I am **Ask Ripple**, your AI financial copilot for **${overview.businessName}**.

• **Current Cash**: **${overview.availableCashOnHandFormatted}** (${overview.cashStatus})
• **Safety Reserve**: **${overview.safetyReserveFormatted}** protected

Ask me any specific question about your cash balance, receivables, margins, or supplier commitments.`,
      actionPills: [
        { id: "open_simulator", label: "Open in Ripple Simulator →" },
      ],
      isFallback: true,
      model: "Ripple AI Copilot (Deterministic Engine)",
    };
  }

  // 1. IMPROVE CASH FLOW
  if (
    q.includes("improve") ||
    (q.includes("cash") && q.includes("flow")) ||
    q.includes("boost") ||
    q.includes("liquidity") ||
    q.includes("balance")
  ) {
    if (!isDemo) {
      return {
        text: `### Cash Flow Summary for **${overview.businessName}**

• **Available Cash**: **${overview.availableCashOnHandFormatted}**
• **Safety Buffer**: **${overview.safetyReserveFormatted}**
• **Outstanding Invoices**: ₹0 (0 open)

**Direct Advice**: Keep customer payment terms to 15 days or less to sustain steady cash inflows before taking on inventory commitments.`,
        actionPills: [
          { id: "open_simulator", label: "Open in Ripple Simulator →" },
        ],
        isFallback: true,
        model: "Ripple AI Copilot",
      };
    }

    return {
      text: `### Cash Flow Breakdown for **${overview.businessName}**

• **Available Cash**: **${overview.availableCashOnHandFormatted}** (Safety Reserve: **${overview.safetyReserveFormatted}**)
• **Incoming Receivables**: **${overview.incomingReceivablesFormatted}** (${overview.openInvoiceCount} open invoices)
• **Scheduled Payables**: **${overview.committedPayablesFormatted}**
• **Cash Trajectory**: Balance dips to **${overview.projectedDipAmountFormatted}** around **${overview.projectedDipDate}**

**Action Required**: Accelerate Urban Threads collection (+₹8,00,000) or deploy **Auto-Phase Inventory** or **Tri-Party Split-Escrow** on Kaveri Timber to avoid buffer deficit.`,
      actionPills: [
        { id: "apply_split_escrow", label: "Lock Tri-Party Split-Escrow" },
        { id: "apply_auto_phase", label: "Execute Auto-Phase Inventory" },
        { id: "open_simulator", label: "Open in Ripple Simulator →" },
      ],
      isFallback: true,
      model: "Ripple AI Copilot",
    };
  }

  // 2. OVERDUE INVOICES & RECEIVABLES
  if (
    q.includes("overdue") ||
    q.includes("invoice") ||
    q.includes("receivable") ||
    q.includes("unpaid") ||
    q.includes("urban threads") ||
    q.includes("collection")
  ) {
    if (!isDemo) {
      return {
        text: `### Receivables Status for **${overview.businessName}**

• **Total Outstanding**: ₹0
• **Overdue Invoices**: 0
• **Status**: All customer accounts in good standing.

Create invoices in the Invoices tab to monitor future receivables.`,
        actionPills: [
          { id: "open_simulator", label: "Open in Ripple Simulator →" },
        ],
        isFallback: true,
        model: "Ripple AI Copilot",
      };
    }

    return {
      text: `### Live Receivables Breakdown

• **Total Receivables**: **${overview.incomingReceivablesFormatted}** (${overview.openInvoiceCount} open invoices)
• **Urban Threads (INV-2001)**: **+₹8,000** due 5 Nov 2026 (Priority collection)
• **Apex Corp (#INV-APEX)**: **+₹5,00,000** (Day 32, 20.0x Ripple Risk Multiplier (Critical Keystone))
• **Metro Retail**: **+₹1,65,000** (Day 29)

**Action**: Follow up with Urban Threads to lock in incoming liquidity ahead of monthly lease payouts.`,
      actionPills: [
        { id: "load_apex", label: "Load Apex Flagship (+16d) Scenario" },
        { id: "apply_split_escrow", label: "Lock Tri-Party Split-Escrow" },
        { id: "open_simulator", label: "Open in Ripple Simulator →" },
      ],
      isFallback: true,
      model: "Ripple AI Copilot",
    };
  }

  // 3. CASH CRUNCH & RISK ASSESSMENT
  if (
    q.includes("risk") ||
    q.includes("crunch") ||
    q.includes("shortage") ||
    q.includes("deficit") ||
    q.includes("bandhra")
  ) {
    if (!isDemo) {
      return {
        text: `### Cash Risk Assessment for **${overview.businessName}**

• **Current Cash**: **${overview.availableCashOnHandFormatted}**
• **Safety Buffer**: **${overview.safetyReserveFormatted}**
• **Risk Level**: **Low (Zero Deficit Projected)**

Your cash balance remains safely above threshold over the 30-day horizon.`,
        actionPills: [
          { id: "open_simulator", label: "Open in Ripple Simulator →" },
        ],
        isFallback: true,
        model: "Ripple AI Copilot",
      };
    }

    return {
      text: `### Cash Risk Assessment

• **Projected Deficit**: Dips to **${overview.projectedDipAmountFormatted}** around **${overview.projectedDipDate}**
• **Breach Cause**: **Bandhra West Shop Lease** (**-₹2,500**) and **Shree Textiles (PO-1)** (**-₹5,000**) drain initial cash
• **Contagion Drag**: Lost Supplier Early Discount, halt fees & SLA penalty costs

**Solution**: Execute **Auto-Phase Inventory** to split Kaveri Timber's commitment across two batches.`,
      actionPills: [
        { id: "apply_auto_phase", label: "Execute Auto-Phase Inventory" },
        { id: "open_simulator", label: "Open in Ripple Simulator →" },
      ],
      isFallback: true,
      model: "Ripple AI Copilot",
    };
  }

  // 4. SUPPLIER PAYMENT HEALTH
  if (
    q.includes("supplier") ||
    q.includes("shree") ||
    q.includes("kaveri") ||
    q.includes("payable") ||
    q.includes("health") ||
    q.includes("vendor")
  ) {
    if (!isDemo) {
      return {
        text: `### Supplier Payment Health for **${overview.businessName}**

• **Total Payables**: ₹0
• **Overdue Vendor Bills**: 0
• **Status**: Zero supplier liabilities.

Add purchase orders or bills in the Suppliers tab to track credit terms.`,
        actionPills: [
          { id: "open_simulator", label: "Open in Ripple Simulator →" },
        ],
        isFallback: true,
        model: "Ripple AI Copilot",
      };
    }

    return {
      text: `### Supplier Payment Health

• **Scheduled Payables**: **${overview.committedPayablesFormatted}**
• **Shree Textiles (PO-1)**: -₹5,000 advance due 16 Oct (Restocks Cotton Kurti)
• **Kaveri Timber**: **-₹1,20,000** due Day 25 (**1.4x Ripple Risk Multiplier**)

**Recommendation**: Deploy **Auto-Phase** to pay Kaveri Timber in two stages:
• **Batch 1 (₹1,00,000)** from cash
• **Batch 2 (₹20,000)** from receivables.`,
      actionPills: [
        { id: "apply_auto_phase", label: "Execute Auto-Phase Inventory" },
        { id: "apply_split_escrow", label: "Lock Tri-Party Split-Escrow" },
        { id: "open_simulator", label: "Open in Ripple Simulator →" },
      ],
      isFallback: true,
      model: "Ripple AI Copilot",
    };
  }

  // 5. APEX CORP / SIMULATOR / TRUE MARGIN / RESCUES / DEFAULT
  if (!isDemo && simulator.activePreset === "Baseline") {
    return {
      text: `### Summary for **${overview.businessName}**

• **Available Cash**: **${overview.availableCashOnHandFormatted}** (Reserve: **${overview.safetyReserveFormatted}**)
• **Open Invoices**: 0 | **Active Bills**: 0
• **Status**: Reserves fully intact with zero debt.

Ask a question about your cash flow or test what-if scenarios in the Ripple Simulator.`,
      actionPills: [
        { id: "open_simulator", label: "Open in Ripple Simulator →" },
      ],
      isFallback: true,
      model: "Ripple AI Copilot",
    };
  }

  return {
    text: `### Ripple AI Executive Briefing for **${overview.businessName}**

**Live Financial Position:**
• **Available Treasury**: **${overview.availableCashOnHandFormatted}** (Status: **${overview.cashStatus}** | Reserve: **${overview.safetyReserveFormatted}**)
• **Open Receivables**: **${overview.incomingReceivablesFormatted}** (${overview.openInvoiceCount} invoices) vs. **Committed Payables**: **${overview.committedPayablesFormatted}**
• **Active Scenario**: **${simulator.activePreset}** (Customer Delay: **+${simulator.customerPaymentDelayDays}d**, Supplier Delay: **+${simulator.supplierDeliveryDelayDays}d**)

**The Paper vs. True Margin Illusion:**
• **Nominal Paper Margin**: **${simulator.paperMarginPercent} (${simulator.paperMarginFormatted})** on ${simulator.revenueFormatted} Revenue.
• **Ripple Contagion Drag**: **${simulator.rippleContagionDragFormatted}** consisting of:
  - Lost Supplier Early Discount: **${simulator.lostSupplierEarlyDiscountFormatted}**
  - Supplier Late Penalties / Halt Fees: **${simulator.supplierHaltFeesFormatted}**
  - Secondary Customer SLA Penalties: **${simulator.secondarySlaPenaltiesFormatted}**
  - Working-Capital Float Drag: **${simulator.workingCapitalFloatDragFormatted}**
• **True Ripple Margin**: **${simulator.trueRippleMarginPercent} (${simulator.trueRippleMarginFormatted})** (${simulator.marginStatusNote}).

**Keystone Network Fragility:**
• **Apex Corp (#INV-APEX)**: **20.0x Ripple Risk Multiplier (Critical Keystone)** — holding **+₹5,00,000**.
• **Kaveri Timber**: **1.4x Ripple Risk Multiplier** — requiring **-₹1,20,000**.
• **Metro Retail**: Wholesale order of **+₹1,65,000** subject to **₹3,000/day** SLA delay penalty.

**Recommended Next Action:**
Activate our two Loop-Native autonomous rescues: Lock **Tri-Party Split-Escrow** to fund Kaveri Timber with **₹0 upfront cash**, or open the **Ripple Simulator** to model custom shocks.`,
    actionPills: [
      { id: "load_apex", label: "Load Apex Flagship (+16d) Scenario" },
      { id: "apply_split_escrow", label: "Lock Tri-Party Split-Escrow" },
      { id: "apply_auto_phase", label: "Execute Auto-Phase Inventory" },
      { id: "open_simulator", label: "Open in Ripple Simulator →" },
    ],
    isFallback: true,
    model: "Ripple AI Copilot (Deterministic Engine)",
  };
}
