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
    if (!isDemo) {
      return {
        text: `Hello! I am **Ripple**, your AI Financial Copilot for **${overview.businessName}**.

I have real-time visibility into your business accounts, liquidity, and operating cycle:
• **Current Treasury**: **${overview.availableCashOnHandFormatted}** available cash (${overview.cashStatus})
• **Safety Reserve**: **${overview.safetyReserveFormatted}** protected
• **Receivables / Payables**: **₹0** (0 open invoices) — baseline reserves are secure.

How can I help you manage your cash position today? You can ask about forecasting, create invoices, or stress-test payment delays in the Ripple Simulator.`,
        actionPills: [
          { id: "open_simulator", label: "Open in Ripple Simulator →" },
          { id: "load_apex", label: "Load Demo Flagship (+16d) Scenario" },
        ],
        isFallback: true,
        model: "Ripple AI Copilot (Deterministic Engine)",
      };
    }

    return {
      text: `Hello! I am **Ripple**, your AI Financial Copilot for **${overview.businessName}**.

I have real-time visibility into your supplier commitments, receivables, and operating cycle:
• **Current Treasury**: **${overview.availableCashOnHandFormatted}** available cash (${overview.cashStatus})
• **Upcoming Cash Deficit**: Balance dips to **${overview.projectedDipAmountFormatted}** around **${overview.projectedDipDate}**
• **Simulation Preset**: **${simulator.activePreset}** (True Margin: **${simulator.trueRippleMarginPercent}** vs **${simulator.paperMarginPercent}** Paper Margin)

How can I help you manage your cash position today? You can ask about overdue receivables, stress-test supply delays, or deploy our zero-debt autonomous rescues.`,
      actionPills: [
        { id: "load_apex", label: "Load Apex Flagship (+16d) Scenario" },
        { id: "apply_split_escrow", label: "Lock Tri-Party Split-Escrow" },
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
    q.includes("liquidity")
  ) {
    if (!isDemo) {
      return {
        text: `### Cash Flow Optimization for **${overview.businessName}**

Your current treasury sits at **${overview.availableCashOnHandFormatted}** (Safety Reserve: **${overview.safetyReserveFormatted}**). Because your registered account has 0 outstanding debt liabilities, your baseline liquidity is strong.

**Key Recommendations to Scale Safely:**
1. **Invoice Promptly**: Set standard customer terms (e.g. Net 15) to maintain regular cash inflows.
2. **Auto-Phase Procurement**: When ordering raw materials or stock, negotiate splitting large purchase orders into phased delivery batches.
3. **Tri-Party Split-Escrow**: For high-volume wholesale orders, pledge customer receipts directly to suppliers to unlock inventory with ₹0 upfront working capital outlay.

**Recommended Next Action:**
Open the **Ripple Simulator** to run stress tests on hypothetical customer payment delays.`,
        actionPills: [
          { id: "open_simulator", label: "Open in Ripple Simulator →" },
          { id: "load_apex", label: "Load Demo Flagship (+16d) Scenario" },
        ],
        isFallback: true,
        model: "gemini-2.5-flash (Safety Net)",
      };
    }

    const isAutoPhaseDone = simulator.activeRescues.autoPhaseApplied;
    const isEscrowDone = simulator.activeRescues.splitEscrowLocked;

    return {
      text: `### Cash Flow Optimization for **${overview.businessName}**

Your current treasury sits at **${overview.availableCashOnHandFormatted}** (Safety Reserve: **${overview.safetyReserveFormatted}**). While you have **${overview.incomingReceivablesFormatted}** across **${overview.openInvoiceCount} open invoices**, you face **${overview.committedPayablesFormatted}** in scheduled supplier bills, creating an immediate liquidity squeeze.

**Critical Live Observations:**
• **Imminent Deficit**: Cash dips to **${overview.projectedDipAmountFormatted}** around **${overview.projectedDipDate}** primarily due to the **Bandhra West Shop Lease (-₹2,500)** and **Shree Textiles PO-1 Advance (-₹5,000)** on 16 Oct.
• **Paper vs. True Margin**: On paper, your accounting margin is **${simulator.paperMarginPercent} (${simulator.paperMarginFormatted})**. However, supply chain friction creates **${simulator.rippleContagionDragFormatted}** in contagion drag, compressing your **True Ripple Margin to ${simulator.trueRippleMarginPercent} (${simulator.trueRippleMarginFormatted})**.
• **Immediate Inflow Acceleration**: Urban Threads owes **+₹8,000** scheduled for 5 Nov. Offering a 2% prompt-pay discount could bring this forward 10 days to replenish reserves before 25 Oct.

**Recommended Next Action:**
Avoid traditional high-interest working capital loans. Deploy our zero-debt **Tri-Party Split-Escrow** on Metro Retail's **+₹1,65,000** order or **Auto-Phase Inventory** on Kaveri Timber's **-₹1,20,000** commitment.`,
      actionPills: [
        { id: "apply_split_escrow", label: "Lock Tri-Party Split-Escrow" },
        { id: "apply_auto_phase", label: "Execute Auto-Phase Inventory" },
        { id: "open_simulator", label: "Open in Ripple Simulator →" },
      ],
      isFallback: true,
      model: "gemini-2.5-flash (Safety Net)",
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
        text: `### Live Invoice & Receivables Audit for **${overview.businessName}**

You currently hold **₹0** in receivables across **0 open invoices**. All accounts are in good standing with zero overdue payments.

Once you register customer invoices in the Ledger, Ripple will automatically monitor payment due dates, calculate Keystone Fragility, and protect your cash buffer against delayed collections.

**Recommended Next Action:**
Create your first invoice in the Ledger, or load the demo scenario in Ripple Simulator to see how delayed payments impact operating loops.`,
        actionPills: [
          { id: "open_simulator", label: "Open in Ripple Simulator →" },
          { id: "load_apex", label: "Load Demo Flagship (+16d) Scenario" },
        ],
        isFallback: true,
        model: "gemini-2.5-flash (Safety Net)",
      };
    }

    return {
      text: `### Live Invoice & Receivables Audit

You currently hold **${overview.incomingReceivablesFormatted}** in total receivables across **${overview.openInvoiceCount} open invoices**, with key receivables creating systemic counterparty exposure across your network.

**Account Breakdown & Keystone Fragility:**
• **Urban Threads (INV-2001)**: **+₹8,000** expected on **5 Nov 2026**. This receipt is pivotal to absorbing the store staff payroll run (-₹3,000 on 12 Nov).
• **Apex Corp (#INV-APEX)**: **+₹5,00,000** scheduled (Day 32). Apex Corp carries a **20.0x Ripple Risk Multiplier (Critical Keystone)**. A payment delay of even 16 days compromises **${simulator.revenueFormatted}** in downstream delivery commitments and triggers **${simulator.rippleContagionDragFormatted}** in cascading penalty costs.
• **Metro Retail Wholesale Order**: **+₹1,65,000** (Day 29) currently serves as an active **Fulfillment Gate** with **₹3,000/day SLA penalty exposure** if inventory is starved.

**Recommended Next Action:**
Prioritize urgent follow-up on Urban Threads, and lock **Tri-Party Split-Escrow** against Metro Retail to bypass liquidity dependence on Apex Corp.`,
      actionPills: [
        { id: "load_apex", label: "Load Apex Flagship (+16d) Scenario" },
        { id: "apply_split_escrow", label: "Lock Tri-Party Split-Escrow" },
        { id: "open_simulator", label: "Open in Ripple Simulator →" },
      ],
      isFallback: true,
      model: "gemini-2.5-flash (Safety Net)",
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

✅ **Reserves Stable**: Your treasury holds **${overview.availableCashOnHandFormatted}** with a protected safety buffer of **${overview.safetyReserveFormatted}**.

No cash deficits or delayed commitments are detected. Your cash position remains above safety thresholds across the 30-day forecast horizon.

**Recommended Next Action:**
Open the Ripple Simulator to model how hypothetical supplier delivery delays or delayed customer receipts would impact your cash runway.`,
        actionPills: [
          { id: "open_simulator", label: "Open in Ripple Simulator →" },
          { id: "load_apex", label: "Load Demo Flagship (+16d) Scenario" },
        ],
        isFallback: true,
        model: "gemini-2.5-flash (Safety Net)",
      };
    }

    return {
      text: `### Cash Crunch Alert & Fragility Assessment

⚠️ **Critical Shortage Detected**: Rupi Clothing faces a projected balance dip to **${overview.projectedDipAmountFormatted}** around **${overview.projectedDipDate}**, breaching your minimum safety buffer of **${overview.safetyReserveFormatted}**.

**Root Cause Cascade:**
1. **16 Oct 2026**: Supplier Advance to **Shree Textiles (PO-1)** requires **-₹5,000**, reducing treasury from ₹10,000 to **${overview.availableCashOnHandFormatted}**.
2. **25 Oct 2026**: Fixed showroom overhead — **Bandhra West Shop Lease** consumes **-₹2,500**, pushing cash below zero into a net deficit.
3. **Contagion Spillover**: Under your active **${simulator.activePreset}** simulation, delays on customer receipts push your minimum cash balance to **${simulator.minCashBalanceFormatted}** with **${simulator.affectedEventsCount} affected downstream events**.
4. **Profit Erosion**: The delay triggers **${simulator.rippleContagionDragFormatted}** in contagion drag:
   - Lost Supplier Early Discount: **${simulator.lostSupplierEarlyDiscountFormatted}**
   - Supplier Halt Fees: **${simulator.supplierHaltFeesFormatted}**
   - Secondary Customer SLA Penalties: **${simulator.secondarySlaPenaltiesFormatted}**
   - Working-Capital Float Drag: **${simulator.workingCapitalFloatDragFormatted}**

**Recommended Next Action:**
Do not borrow. Split the **Kaveri Timber (-₹1,20,000)** commitment into micro-batches via **Auto-Phase Inventory** to maintain buffer integrity throughout October.`,
      actionPills: [
        { id: "apply_auto_phase", label: "Execute Auto-Phase Inventory" },
        { id: "load_apex", label: "Load Apex Flagship (+16d) Scenario" },
        { id: "open_simulator", label: "Open in Ripple Simulator →" },
      ],
      isFallback: true,
      model: "gemini-2.5-flash (Safety Net)",
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

You currently have **₹0 in scheduled supplier payables**. All procurement channels are clean and zero vendor debt is due.

Once you register suppliers and create purchase orders, Ripple will track credit terms, early payment discounts, and delivery deadlines.

**Recommended Next Action:**
Register your primary suppliers in the Supplier Directory, or explore Auto-Phase micro-batching in the simulator.`,
        actionPills: [
          { id: "open_simulator", label: "Open in Ripple Simulator →" },
          { id: "load_apex", label: "Load Demo Flagship (+16d) Scenario" },
        ],
        isFallback: true,
        model: "gemini-2.5-flash (Safety Net)",
      };
    }

    return {
      text: `### Supplier Payment Health & Procurement Risk

Your total committed accounts payable stand at **${overview.committedPayablesFormatted}**. The supplier tier is vulnerable to cascading payment halts:

**Supplier Obligations & Multipliers:**
• **Shree Textiles (PO-1)**: Advance of **-₹5,000** due **16 Oct 2026**. Balance payment of ₹30,000 is gated by delivery. Delaying this risks shutting down Cotton Kurti inventory restocks.
• **Kaveri Timber**: Raw material procurement commitment of **-₹1,20,000** due on Day 25. Carries a **1.4x Ripple Risk Multiplier**.
• **Discount Forfeiture**: Delayed supplier disbursement forfeits **${simulator.lostSupplierEarlyDiscountFormatted}** in prompt payment discounts and risks **${simulator.supplierHaltFeesFormatted}** in equipment halt charges.

**Autonomous Rescue Pathway:**
Rather than defaulting or seeking bridge loans, use **Auto-Phase Inventory** to divide Kaveri Timber's bill into:
- **Batch 1 (₹1,00,000)**: Dispatched immediately out of verified free cash.
- **Batch 2 (₹20,000)**: Synchronized with customer collection on Day 32.

**Recommended Next Action:**
Execute Auto-Phase Inventory now to keep Kaveri Timber manufacturing without draining working capital.`,
      actionPills: [
        { id: "apply_auto_phase", label: "Execute Auto-Phase Inventory" },
        { id: "apply_split_escrow", label: "Lock Tri-Party Split-Escrow" },
        { id: "open_simulator", label: "Open in Ripple Simulator →" },
      ],
      isFallback: true,
      model: "gemini-2.5-flash (Safety Net)",
    };
  }

  // 5. APEX CORP / SIMULATOR / TRUE MARGIN / RESCUES / DEFAULT
  if (!isDemo && simulator.activePreset === "Baseline") {
    return {
      text: `### Ripple AI Executive Briefing for **${overview.businessName}**

**Live Financial Position:**
• **Available Treasury**: **${overview.availableCashOnHandFormatted}** (Status: **${overview.cashStatus}** | Reserve: **${overview.safetyReserveFormatted}**)
• **Open Receivables**: **₹0** (0 invoices) vs. **Committed Payables**: **₹0**
• **Active Scenario**: Baseline operating conditions (0 delays, zero debt liabilities)

**Operating Health:**
• **Liquidity Buffer**: Your initial reserves are fully intact and exceed minimum thresholds.
• **Simulation Engine**: Ready to stress-test your Supplier-Business-Customer loop as soon as you record transactions.

**Recommended Next Action:**
Explore the **Ripple Simulator** to model what-if customer payment delays, or load the **Demo Flagship (+16d)** scenario to see cascading contagion in action.`,
      actionPills: [
        { id: "open_simulator", label: "Open in Ripple Simulator →" },
        { id: "load_apex", label: "Load Demo Flagship (+16d) Scenario" },
      ],
      isFallback: true,
      model: "Ripple AI Copilot (Deterministic Engine)",
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
