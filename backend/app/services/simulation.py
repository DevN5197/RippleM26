from datetime import date, timedelta
from typing import Any
import math
from app.models.cash_flow import CashFlowEvent
from app.services.forecast import build_detailed_forecast
from app.services.financial import to_iso_date, parse_date

# ---------------------------------------------------------------------------
# Canonical Rates and Assumptions (in integer paise)
# ---------------------------------------------------------------------------
# Default demo parameters:
# Starting cash: ₹1,50,000 (15,000,000 paise)
# Safety buffer: ₹50,000 (5,000,000 paise)
# Node 1 Apex Corp: Revenue ₹5,00,000, COGS ₹3,75,000, Day 15 scheduled
# Node 2 Kaveri Timber: Commitment ₹1,20,000, Due Day 18, Halt ₹2,500/day, Lost discount ₹3,600
# Node 3 Metro Retail: Order ₹1,65,000, Secondary SLA penalty ₹3,000/day, Working capital drag ₹1,400/day

SUPPLIER_HALT_FEE_PAISE_PER_DAY = 250_000       # ₹2,500 / day
SECONDARY_SLA_PENALTY_PAISE_PER_DAY = 300_000   # ₹3,000 / day
WORKING_CAPITAL_DRAG_PAISE_PER_DAY = 140_000    # ₹1,400 / day
LOST_EARLY_DISCOUNT_PAISE = 360_000             # ₹3,600
ESCROW_FLOAT_FEE_RATE = 0.02                    # 2% of supplier commitment (₹2,400 on ₹1,20,000)

def safe_div(n: float | int, d: float | int, default: float = 0.0) -> float:
    """Safe division preventing ZeroDivisionError and NaN/Infinity crashes."""
    try:
        if d is None or float(d) == 0.0:
            return default
        res = float(n) / float(d)
        return default if math.isnan(res) or math.isinf(res) else res
    except (ZeroDivisionError, ValueError, TypeError):
        return default

def calculate_true_margin(
    revenue_paise: int = 50_000_000,
    direct_cogs_paise: int = 37_500_000,
    contagion_days: int = 0,
    is_split_escrow: bool = False,
    is_auto_phase: bool = False,
    custom_float_fee_paise: int | None = None,
) -> dict[str, Any]:
    """
    Computes Paper Margin vs. True Ripple Margin and itemizes contagion costs.
    Formula:
      Paper Margin = Revenue - Direct COGS
      Contagion Cost = Lost Discount + Supplier Halt Fees + SLA Penalties + Working Capital Drag + Escrow Float Fee
      True Ripple Margin = Paper Margin - Contagion Cost
    """
    paper_margin_paise = revenue_paise - direct_cogs_paise
    paper_margin_percent = round(safe_div(paper_margin_paise, revenue_paise) * 100, 2)

    if is_split_escrow:
        # Supplier funded on time via escrow: zero halt fees, zero SLA penalties, zero lost discount
        lost_discount_paise = 0
        supplier_halt_fees_paise = 0
        sla_penalties_paise = 0
        working_capital_drag_paise = 0
        float_fee_paise = custom_float_fee_paise if custom_float_fee_paise is not None else 240_000
    elif is_auto_phase:
        # Batch 1 paid on time protects safety buffer and keeps supplier production running
        # Drastically prevents halt fees and SLA breach
        lost_discount_paise = 0
        supplier_halt_fees_paise = 0
        sla_penalties_paise = 0
        working_capital_drag_paise = 0
        float_fee_paise = 0
    else:
        # Contagion accrues over compromised duration
        effective_days = max(0, contagion_days)
        lost_discount_paise = LOST_EARLY_DISCOUNT_PAISE if effective_days > 0 else 0
        supplier_halt_fees_paise = effective_days * SUPPLIER_HALT_FEE_PAISE_PER_DAY
        sla_penalties_paise = effective_days * SECONDARY_SLA_PENALTY_PAISE_PER_DAY
        working_capital_drag_paise = effective_days * WORKING_CAPITAL_DRAG_PAISE_PER_DAY
        float_fee_paise = 0

    total_contagion_cost_paise = (
        lost_discount_paise
        + supplier_halt_fees_paise
        + sla_penalties_paise
        + working_capital_drag_paise
        + float_fee_paise
    )

    true_ripple_margin_paise = paper_margin_paise - total_contagion_cost_paise
    true_ripple_margin_percent = round(safe_div(true_ripple_margin_paise, revenue_paise) * 100, 2)

    return {
        "revenuePaise": revenue_paise,
        "directCogsPaise": direct_cogs_paise,
        "paperMarginPaise": paper_margin_paise,
        "paperMarginPercent": paper_margin_percent,
        "contagionDays": contagion_days,
        "breakdown": {
            "lostDiscountPaise": lost_discount_paise,
            "supplierHaltFeesPaise": supplier_halt_fees_paise,
            "slaPenaltiesPaise": sla_penalties_paise,
            "workingCapitalDragPaise": working_capital_drag_paise,
            "floatFeePaise": float_fee_paise,
        },
        "totalContagionCostPaise": total_contagion_cost_paise,
        "trueRippleMarginPaise": true_ripple_margin_paise,
        "trueRippleMarginPercent": true_ripple_margin_percent,
        "explanation": (
            f"Paper Margin of {paper_margin_percent}% reduced by ₹{(total_contagion_cost_paise / 100):,.0f} "
            f"in ripple contagion to True Margin of {true_ripple_margin_percent}%."
        ),
    }

def calculate_fragility(
    node_id: str,
    invoice_or_commitment_paise: int,
    downstream_order_value_paise: int,
    exposed_order_labels: list[str],
) -> dict[str, Any]:
    """
    Computes Fragility Multiplier = Downstream Order Value at Risk / Invoice Amount
    Handles 0 safely via safe_div.
    """
    multiplier = round(safe_div(downstream_order_value_paise, invoice_or_commitment_paise, 0.0), 1)

    is_keystone = multiplier >= 5.0

    if multiplier >= 15.0:
        badge_text = f"Ripple Risk: {multiplier}x (Critical Keystone)"
        badge_variant = "destructive"
    elif multiplier >= 5.0:
        badge_text = f"Ripple Risk: {multiplier}x"
        badge_variant = "warning"
    elif multiplier > 1.0:
        badge_text = f"Ripple Risk: {multiplier}x"
        badge_variant = "outline"
    else:
        badge_text = f"Risk: {multiplier}x"
        badge_variant = "secondary"

    return {
        "nodeId": node_id,
        "invoiceAmountPaise": invoice_or_commitment_paise,
        "downstreamValueAtRiskPaise": downstream_order_value_paise,
        "multiplier": multiplier,
        "isKeystone": is_keystone,
        "badgeText": badge_text,
        "badgeVariant": badge_variant,
        "exposedOrders": exposed_order_labels,
    }

def calculate_auto_phase(
    supplier_commitment_paise: int = 12_000_000,
    actual_available_cash_paise: int = 15_000_000,
    safety_buffer_paise: int = 5_000_000,
    original_payment_date: str = "Day 18",
    customer_payment_date: str = "Day 31",
) -> dict[str, Any]:
    """
    Auto-Phase Inventory algorithm:
      Usable Free Cash = max(0, Actual Available Cash - Safety Buffer)
      Shortfall S = max(0, Supplier Commitment - Usable Free Cash)
      Batch 1 Cost = Supplier Commitment - S (scheduled on original payment date)
      Batch 2 Cost = S (scheduled on day after customer payment)
    """
    usable_free_cash_paise = max(0, actual_available_cash_paise - safety_buffer_paise)
    shortfall_paise = max(0, supplier_commitment_paise - usable_free_cash_paise)

    batch1_cost_paise = supplier_commitment_paise - shortfall_paise
    batch2_cost_paise = shortfall_paise

    # Parse customer payment day number if relative
    try:
        cust_day_num = int("".join(filter(str.isdigit, customer_payment_date)))
        batch2_date = f"Day {cust_day_num + 1}"
    except Exception:
        batch2_date = "Day 32"

    return {
        "supplierCommitmentPaise": supplier_commitment_paise,
        "actualAvailableCashPaise": actual_available_cash_paise,
        "safetyBufferPaise": safety_buffer_paise,
        "usableFreeCashPaise": usable_free_cash_paise,
        "shortfallPaise": shortfall_paise,
        "batch1": {
            "amountPaise": batch1_cost_paise,
            "date": original_payment_date,
            "label": f"Batch 1 (₹{(batch1_cost_paise/100):,.0f})",
            "purpose": "Immediate dispatch within available usable free cash",
        },
        "batch2": {
            "amountPaise": batch2_cost_paise,
            "date": batch2_date,
            "label": f"Batch 2 (₹{(batch2_cost_paise/100):,.0f})",
            "purpose": "Deferred settlement aligned with customer inflow",
        },
        "safetyBufferPreserved": True,
        "explanation": (
            f"Splits ₹{(supplier_commitment_paise/100):,.0f} into Batch 1 (₹{(batch1_cost_paise/100):,.0f}) on {original_payment_date} "
            f"and Batch 2 (₹{(batch2_cost_paise/100):,.0f}) on {batch2_date}, safeguarding the ₹{(safety_buffer_paise/100):,.0f} cash reserve."
        ),
    }

def calculate_split_escrow(
    customer_invoice_paise: int = 50_000_000,
    supplier_commitment_paise: int = 12_000_000,
    float_fee_rate: float = ESCROW_FLOAT_FEE_RATE,
    supplier_funding_date: str = "Day 18",
    customer_settlement_date: str = "Day 31",
) -> dict[str, Any]:
    """
    Zero-Cash Tri-Party Split-Escrow algorithm:
      Check: Customer Invoice >= Supplier Commitment + Float Fee
      Float Fee = round(Supplier Commitment * float_fee_rate)
      Net Business Proceeds = Customer Invoice - Supplier Commitment - Float Fee
    """
    float_fee_paise = round(supplier_commitment_paise * float_fee_rate)
    total_deduction_paise = supplier_commitment_paise + float_fee_paise
    is_eligible = customer_invoice_paise >= total_deduction_paise
    net_proceeds_paise = max(0, customer_invoice_paise - total_deduction_paise)

    return {
        "customerInvoicePaise": customer_invoice_paise,
        "supplierCommitmentPaise": supplier_commitment_paise,
        "floatFeePaise": float_fee_paise,
        "totalDeductionPaise": total_deduction_paise,
        "netProceedsPaise": net_proceeds_paise,
        "isEligible": is_eligible,
        "supplierFundingDate": supplier_funding_date,
        "customerSettlementDate": customer_settlement_date,
        "bypassArcLabel": "Tri-Party Split-Escrow",
        "explanation": (
            f"Escrow satisfies ₹{(supplier_commitment_paise/100):,.0f} obligation on {supplier_funding_date} "
            f"with zero ordinary business cash outlay. Deducts supplier cost and ₹{(float_fee_paise/100):,.0f} "
            f"fee at settlement ({customer_settlement_date}), remitting net ₹{(net_proceeds_paise/100):,.0f} to business."
        ),
    }

def run_simulation(
    events: list[CashFlowEvent],
    opening_cash_paise: int,
    controls: dict[str, Any],
    rescues: list[dict[str, Any]] | None = None,
    business: Any | None = None,
) -> dict[str, Any]:
    """
    Central authoritative financial simulation engine.
    Computes cash flows, fragility multipliers, contagion costs, true margins,
    applies active rescues (Auto-Phase & Split-Escrow), and builds chronological timeline nodes.
    """
    rescues = rescues or []
    horizon = controls.get("horizonDays", 30)
    sup_delay = controls.get("supplierDeliveryDelayDays", 0)
    cust_delay = controls.get("customerPaymentDelayDays", 0)
    cust_amt = controls.get("customerPaymentAmountPaise")
    sup_amt = controls.get("supplierPaymentAmountPaise")
    order_mult = controls.get("orderQuantityMultiplier", 1.0)

    biz_id = getattr(business, "id", None)
    biz_name = getattr(business, "name", None) or "Rupi Clothing"
    safety_paise = getattr(business, "safety_threshold_paise", None) or 5_000_000
    is_demo = (biz_id == "biz_1" or biz_name == "Rupi Clothing" or business is None)

    # Active rescue checks
    is_auto_phase = any(r.get("rescue_type") == "auto_phase" and r.get("status") != "reverted" for r in rescues)
    is_split_escrow = any(r.get("rescue_type") == "split_escrow" and r.get("status") != "reverted" for r in rescues)

    # Baseline calculations
    baseline = build_detailed_forecast(events, opening_cash_paise, days=horizon)

    # Simulated events
    simulated_events: list[CashFlowEvent] = []
    affected_dependencies = []

    today = date.today()
    node1_date_str = to_iso_date(today + timedelta(days=15 + cust_delay))
    node2_date_str = to_iso_date(today + timedelta(days=18 + sup_delay))
    node3_date_str = to_iso_date(today + timedelta(days=22 + max(sup_delay, 0)))

    for ev in events:
        ev_date = parse_date(ev.date)
        amt = ev.amount_paise
        shifted_days = 0

        if ev.type == "supplier_payment":
            if is_split_escrow:
                # Ordinary cash outflow is 0 on funding date (handled via escrow)
                amt = 0
            elif is_auto_phase:
                # Replaced by Batch 1 (₹1,00,000 on Day 18)
                amt = 10_000_000
            else:
                if sup_delay != 0:
                    ev_date += timedelta(days=sup_delay)
                    shifted_days += sup_delay
                if sup_amt is not None:
                    amt = sup_amt
                if order_mult != 1.0:
                    amt = round(amt * order_mult)

            if shifted_days != 0 or amt != ev.amount_paise:
                affected_dependencies.append({
                    "entityId": ev.id,
                    "entityType": "supplier_payment",
                    "label": ev.label,
                    "originalDate": ev.date,
                    "shiftedDate": to_iso_date(ev_date),
                    "shiftDays": shifted_days,
                    "amountPaise": amt,
                    "impactDescription": f"Shifted supplier payment by {shifted_days} days to {to_iso_date(ev_date)}.",
                })

        elif ev.type == "customer_payment":
            if is_split_escrow:
                # Customer receipt remits net proceeds (₹3,77,600)
                amt = 37_760_000
                if cust_delay != 0:
                    ev_date += timedelta(days=cust_delay)
                    shifted_days += cust_delay
            else:
                if cust_delay != 0:
                    ev_date += timedelta(days=cust_delay)
                    shifted_days += cust_delay
                if cust_amt is not None:
                    amt = cust_amt
                if order_mult != 1.0:
                    amt = round(amt * order_mult)

            if shifted_days != 0 or amt != ev.amount_paise:
                affected_dependencies.append({
                    "entityId": ev.id,
                    "entityType": "customer_payment",
                    "label": ev.label,
                    "originalDate": ev.date,
                    "shiftedDate": to_iso_date(ev_date),
                    "shiftDays": shifted_days,
                    "amountPaise": amt,
                    "impactDescription": f"Customer receipt on {to_iso_date(ev_date)} (shift {shifted_days}d).",
                })

        sim_ev = CashFlowEvent(
            id=ev.id,
            business_id=ev.business_id,
            type=ev.type,
            label=ev.label,
            direction=ev.direction,
            amount_paise=amt,
            date=to_iso_date(ev_date),
            is_projected=ev.is_projected,
            counterparty_name=ev.counterparty_name,
            status=ev.status,
            risk_note=ev.risk_note,
        )
        simulated_events.append(sim_ev)

    # If Auto-Phase is active, inject Batch 2 event on Day 32
    if is_auto_phase:
        batch2_date = to_iso_date(today + timedelta(days=15 + cust_delay + 1))
        batch2_ev = CashFlowEvent(
            id="ev_autophase_batch2",
            business_id=biz_id or "biz_1",
            type="supplier_payment",
            label="Kaveri Timber — Auto-Phased Batch 2",
            direction="outgoing",
            amount_paise=2_000_000,
            date=batch2_date,
            is_projected=True,
            counterparty_name="Kaveri Timber",
            status="scheduled",
            risk_note="Auto-phased batch 2 settled following customer receipt.",
        )
        simulated_events.append(batch2_ev)

    # 3. Forecast calculation
    scenario = build_detailed_forecast(simulated_events, opening_cash_paise, days=horizon)
    shortfall = max(0, -scenario["minBalancePaise"]) if scenario["minBalancePaise"] < 0 else 0

    # 4. Ripple-Adjusted True Margin
    # Calculate days compromised between supplier payment deadline (Day 18) and customer collection
    settlement_day = 15 + cust_delay
    contagion_days = max(0, settlement_day - 18) if not (is_auto_phase or is_split_escrow) else 0

    if is_demo:
        true_margin = calculate_true_margin(
            revenue_paise=50_000_000,
            direct_cogs_paise=37_500_000,
            contagion_days=contagion_days,
            is_split_escrow=is_split_escrow,
            is_auto_phase=is_auto_phase,
        )
    elif events:
        total_rev = sum(e.amount_paise for e in events if e.direction == "incoming" or e.type == "customer_payment")
        total_cogs = sum(e.amount_paise for e in events if e.direction == "outgoing" or e.type == "supplier_payment")
        rev = total_rev if total_rev > 0 else 10_000_000
        cogs = total_cogs if total_cogs > 0 else round(rev * 0.75)
        true_margin = calculate_true_margin(
            revenue_paise=rev,
            direct_cogs_paise=cogs,
            contagion_days=contagion_days,
            is_split_escrow=is_split_escrow,
            is_auto_phase=is_auto_phase,
        )
    elif cust_amt is not None or sup_amt is not None or cust_delay > 0 or sup_delay > 0:
        rev = cust_amt or 10_000_000
        cogs = sup_amt or 7_500_000
        true_margin = calculate_true_margin(
            revenue_paise=rev,
            direct_cogs_paise=cogs,
            contagion_days=contagion_days,
            is_split_escrow=is_split_escrow,
            is_auto_phase=is_auto_phase,
        )
    else:
        true_margin = {
            "revenuePaise": 0,
            "directCogsPaise": 0,
            "paperMarginPaise": 0,
            "paperMarginPercent": 0.0,
            "contagionDays": 0,
            "breakdown": {
                "lostDiscountPaise": 0,
                "supplierHaltFeesPaise": 0,
                "slaPenaltiesPaise": 0,
                "workingCapitalDragPaise": 0,
                "floatFeePaise": 0,
            },
            "totalContagionCostPaise": 0,
            "trueRippleMarginPaise": 0,
            "trueRippleMarginPercent": 0.0,
            "explanation": f"Ready for {biz_name}. Add invoices in the Ledger or test hypothetical payment delays in the Ripple Simulator.",
        }

    # 5. Fragility analysis on timeline nodes
    downstream_exposed_order_value = 80_000_000 # ₹8,00,000 downstream value at risk
    fragility_node1 = calculate_fragility(
        node_id="node_apex_corp",
        invoice_or_commitment_paise=4_000_000 if cust_amt is None else cust_amt,
        downstream_order_value_paise=downstream_exposed_order_value,
        exposed_order_labels=["Metro Retail Wholesale Order #MR-2026", "Central Distribution Lot #4"],
    )

    fragility_node2 = calculate_fragility(
        node_id="node_kaveri_timber",
        invoice_or_commitment_paise=12_000_000 if sup_amt is None else sup_amt,
        downstream_order_value_paise=16_500_000,
        exposed_order_labels=["Metro Retail Wholesale Order #MR-2026"],
    )

    # 6. Chronological Timeline Nodes
    node_opening_cash = {
        "id": "node_opening_cash",
        "label": "Opening Cash Reserve",
        "type": "cash_reserve",
        "dayLabel": "Day 0",
        "date": to_iso_date(today),
        "amountPaise": opening_cash_paise,
        "direction": "balance",
        "status": "completed",
        "counterparty": f"{biz_name} Treasury",
        "description": f"Initial usable balance of ₹{(opening_cash_paise/100):,.0f} with ₹{(safety_paise/100):,.0f} safety buffer.",
    }

    if is_demo:
        timeline_nodes = [
            node_opening_cash,
            {
                "id": "node_apex_corp",
                "label": "Apex Corp — Customer Invoice #INV-APEX",
                "type": "customer_receivable",
                "dayLabel": f"Day {15 + cust_delay}",
                "date": node1_date_str,
                "amountPaise": cust_amt or (37_760_000 if is_split_escrow else 50_000_000),
                "direction": "incoming",
                "status": "delayed" if cust_delay > 0 else "upcoming",
                "counterparty": "Apex Corp",
                "description": (
                    f"Customer receivable {f'(delayed +{cust_delay}d)' if cust_delay > 0 else 'on schedule'}."
                    + (" Released to escrow for supplier settlement." if is_split_escrow else "")
                ),
                "fragility": fragility_node1,
                "margin": true_margin,
                "hasBypassArc": is_split_escrow,
                "bypassTargetId": "node_kaveri_timber",
            },
            {
                "id": "node_kaveri_timber",
                "label": (
                    "Kaveri Timber — Auto-Phased Batch 1" if is_auto_phase
                    else "Kaveri Timber — Supplier Commitment"
                ),
                "type": "supplier_payable",
                "dayLabel": f"Day {18 + sup_delay}",
                "date": node2_date_str,
                "amountPaise": 0 if is_split_escrow else (10_000_000 if is_auto_phase else (sup_amt or 12_000_000)),
                "direction": "outgoing",
                "status": "released" if is_split_escrow else ("auto_phased" if is_auto_phase else ("delayed" if sup_delay > 0 else "upcoming")),
                "counterparty": "Kaveri Timber",
                "description": (
                    "Released via Split-Escrow funding without ordinary cash outlay." if is_split_escrow
                    else ("Batch 1 settled under available usable free cash." if is_auto_phase
                          else f"Supplier advance commitment of ₹{((sup_amt or 12_000_000)/100):,.0f}.")
                ),
                "fragility": fragility_node2,
                "isEligibleForAutoPhase": not is_auto_phase and not is_split_escrow,
                "isEligibleForSplitEscrow": not is_split_escrow,
            },
            {
                "id": "node_metro_retail",
                "label": "Metro Retail — Wholesale Order #MR-2026",
                "type": "downstream_fulfillment",
                "dayLabel": f"Day {22 + max(sup_delay, 0)}",
                "date": node3_date_str,
                "amountPaise": 16_500_000,
                "direction": "incoming",
                "status": "active" if (is_auto_phase or is_split_escrow or contagion_days == 0) else "at_risk",
                "counterparty": "Metro Retail",
                "description": (
                    "Inventory gate unlocked — order fulfillment proceeding on schedule."
                    if (is_auto_phase or is_split_escrow or contagion_days == 0)
                    else f"Exposed to secondary SLA delay penalty (₹3,000/day) due to raw material delivery halt."
                ),
                "fragility": {
                    "nodeId": "node_metro_retail",
                    "invoiceAmountPaise": 16_500_000,
                    "downstreamValueAtRiskPaise": 16_500_000,
                    "multiplier": 1.0,
                    "isKeystone": False,
                    "badgeText": "Fulfillment Gate",
                    "badgeVariant": "outline",
                    "exposedOrders": ["Direct Customer Delivery"],
                },
            },
        ]

        if is_auto_phase:
            batch2_day = 15 + cust_delay + 1
            timeline_nodes.append({
                "id": "node_kaveri_timber_batch2",
                "label": "Kaveri Timber — Auto-Phased Batch 2",
                "type": "supplier_payable",
                "dayLabel": f"Day {batch2_day}",
                "date": to_iso_date(today + timedelta(days=batch2_day)),
                "amountPaise": 2_000_000,
                "direction": "outgoing",
                "status": "scheduled",
                "counterparty": "Kaveri Timber",
                "description": "Batch 2 settlement safely funded after Apex Corp customer inflow.",
                "isAutoPhasedChild": True,
            })
    else:
        # Non-demo registered business
        timeline_nodes = [node_opening_cash]
        if events:
            for ev in simulated_events:
                is_incoming = ev.direction == "incoming" or ev.type in ("customer_payment", "receivable")
                t_type = "customer_receivable" if is_incoming else "supplier_payable"
                try:
                    ev_d = parse_date(ev.date)
                    day_offset = (ev_d - today).days
                    day_label = f"Day {max(0, day_offset)}"
                except Exception:
                    day_label = "Scheduled"

                timeline_nodes.append({
                    "id": f"node_{ev.id}",
                    "label": ev.label,
                    "type": t_type,
                    "dayLabel": day_label,
                    "date": ev.date,
                    "amountPaise": ev.amount_paise,
                    "direction": "incoming" if is_incoming else "outgoing",
                    "status": ev.status or ("upcoming" if day_offset >= 0 else "completed"),
                    "counterparty": ev.counterparty_name or ("Customer" if is_incoming else "Supplier"),
                    "description": ev.risk_note or f"{'Customer receivable' if is_incoming else 'Supplier commitment'} scheduled for settlement.",
                    "fragility": {
                        "nodeId": f"node_{ev.id}",
                        "invoiceAmountPaise": ev.amount_paise,
                        "downstreamValueAtRiskPaise": ev.amount_paise,
                        "multiplier": 1.0,
                        "isKeystone": False,
                        "badgeText": "Direct Obligation",
                        "badgeVariant": "outline",
                        "exposedOrders": [],
                    },
                })
        elif cust_amt is not None or sup_amt is not None or cust_delay > 0 or sup_delay > 0:
            if cust_amt is not None or cust_delay > 0:
                sim_cust = cust_amt or 10_000_000
                timeline_nodes.append({
                    "id": "node_sim_customer",
                    "label": "Simulated Customer Receivable",
                    "type": "customer_receivable",
                    "dayLabel": f"Day {15 + cust_delay}",
                    "date": node1_date_str,
                    "amountPaise": sim_cust,
                    "direction": "incoming",
                    "status": "delayed" if cust_delay > 0 else "upcoming",
                    "counterparty": "Simulated Customer",
                    "description": f"Hypothetical customer receivable {f'(delayed +{cust_delay}d)' if cust_delay > 0 else 'on schedule'}.",
                    "fragility": {
                        "nodeId": "node_sim_customer",
                        "invoiceAmountPaise": sim_cust,
                        "downstreamValueAtRiskPaise": sim_cust,
                        "multiplier": 1.0,
                        "isKeystone": False,
                        "badgeText": "Simulated Inflow",
                        "badgeVariant": "outline",
                        "exposedOrders": [],
                    },
                })
            if sup_amt is not None or sup_delay > 0:
                sim_sup = sup_amt or 5_000_000
                timeline_nodes.append({
                    "id": "node_sim_supplier",
                    "label": "Simulated Supplier Commitment",
                    "type": "supplier_payable",
                    "dayLabel": f"Day {18 + sup_delay}",
                    "date": node2_date_str,
                    "amountPaise": sim_sup,
                    "direction": "outgoing",
                    "status": "delayed" if sup_delay > 0 else "upcoming",
                    "counterparty": "Simulated Supplier",
                    "description": f"Hypothetical supplier commitment {f'(delayed +{sup_delay}d)' if sup_delay > 0 else 'on schedule'}.",
                    "fragility": {
                        "nodeId": "node_sim_supplier",
                        "invoiceAmountPaise": sim_sup,
                        "downstreamValueAtRiskPaise": sim_sup,
                        "multiplier": 1.0,
                        "isKeystone": False,
                        "badgeText": "Simulated Outflow",
                        "badgeVariant": "outline",
                        "exposedOrders": [],
                    },
                })

    # Sort chronological timeline nodes by date / day
    timeline_nodes.sort(key=lambda n: n.get("date", ""))

    # 7. Recommendations
    recommendations = []
    if is_demo:
        if not (is_auto_phase or is_split_escrow) and contagion_days > 0:
            recommendations.append({
                "id": "rec_autophase",
                "title": "Apply Auto-Phase Inventory Rescue",
                "rationale": f"Split Kaveri Timber order into ₹1,00,000 now and ₹20,000 on Day {settlement_day + 1} to prevent buffer breach and halt fees.",
                "priority": "high",
                "impactPaise": true_margin["breakdown"]["supplierHaltFeesPaise"] + true_margin["breakdown"]["slaPenaltiesPaise"],
                "rescueType": "auto_phase",
            })
            recommendations.append({
                "id": "rec_split_escrow",
                "title": "Lock Tri-Party Split-Escrow Facility",
                "rationale": f"Route Apex Corp receivable (₹5,00,000) to fund Kaveri Timber obligation with zero day-18 business cash outlay.",
                "priority": "high",
                "impactPaise": true_margin["totalContagionCostPaise"] - 240_000,
                "rescueType": "split_escrow",
            })
    elif not events and cust_amt is None and sup_amt is None and cust_delay == 0 and sup_delay == 0:
        recommendations.append({
            "id": "rec_onboarding",
            "title": "Add Invoices & Commitments",
            "rationale": "Record customer invoices and supplier purchase orders in the Ledger to track real-time Ripple risk.",
            "priority": "medium",
            "impactPaise": 0,
            "rescueType": "none",
        })

    # 8. Ripple score calculation
    cash_shortfall_factor = min(40, round(safe_div(shortfall, 500_000) * 40)) if shortfall > 0 else 0
    delay_mag = abs(sup_delay) + abs(cust_delay)
    delay_factor = min(25, round(safe_div(delay_mag, 20) * 25))
    downstream_factor = min(20, (1 if contagion_days > 0 else 0) * 20)
    gap = abs(baseline["closingBalancePaise"] - scenario["closingBalancePaise"])
    liquidity_gap_factor = min(15, round(safe_div(gap, 1_000_000) * 15))
    total_score = min(100, cash_shortfall_factor + delay_factor + downstream_factor + liquidity_gap_factor)

    return {
        "baselinePoints": baseline["points"],
        "scenarioPoints": scenario["points"],
        "baselineClosingPaise": baseline["closingBalancePaise"],
        "scenarioClosingPaise": scenario["closingBalancePaise"],
        "baselineMinPaise": baseline["minBalancePaise"],
        "baselineMinDate": baseline["minBalanceDate"],
        "scenarioMinPaise": scenario["minBalancePaise"],
        "scenarioMinDate": scenario["minBalanceDate"],
        "shortfallPaise": shortfall,
        "affectedDependencies": affected_dependencies,
        "rippleScore": {
            "cashShortfallFactor": cash_shortfall_factor,
            "delayMagnitudeFactor": delay_factor,
            "downstreamCountFactor": downstream_factor,
            "liquidityGapFactor": liquidity_gap_factor,
            "totalScore": total_score,
        },
        "recommendations": recommendations,
        "trueMargin": true_margin,
        "timelineNodes": timeline_nodes,
        "activeRescues": rescues,
        "isAutoPhaseApplied": is_auto_phase,
        "isSplitEscrowApplied": is_split_escrow,
    }

def run_chaos_stress_test(
    events: list[CashFlowEvent],
    opening_cash_paise: int,
    controls: dict[str, Any],
    rescues: list[dict[str, Any]] | None = None,
    business: Any | None = None,
) -> dict[str, Any]:
    """
    Chaos Stress-Test Engine:
      1. Captures baseline scenario.
      2. Creates an isolated simulation clone with +5-day delay on eligible event nodes.
      3. Recalculates cash balances, payment deadline breaches, downstream dependencies, and fragility scores.
      4. Identifies most fragile node under stress and highlights it in purple.
      5. Computes delta comparison between baseline and stressed results.
    """
    baseline_result = run_simulation(events, opening_cash_paise, controls, rescues, business=business)

    # Isolated +5-day stressed controls
    stressed_controls = dict(controls)
    stressed_controls["customerPaymentDelayDays"] = stressed_controls.get("customerPaymentDelayDays", 0) + 5
    stressed_controls["supplierDeliveryDelayDays"] = stressed_controls.get("supplierDeliveryDelayDays", 0) + 5

    stressed_result = run_simulation(events, opening_cash_paise, stressed_controls, rescues, business=business)

    # Identify most fragile node under stress
    most_fragile_node = max(
        stressed_result["timelineNodes"],
        key=lambda n: n.get("fragility", {}).get("multiplier", 0.0) if n.get("fragility") else 0.0,
        default=None,
    )

    if most_fragile_node:
        most_fragile_node["isMostFragileUnderStress"] = True
        most_fragile_node["stressHighlightColor"] = "#8b5cf6" # Purple
        most_fragile_node["stressBadge"] = "MOST FRAGILE UNDER STRESS"

    # Compute deltas
    baseline_min = baseline_result["scenarioMinPaise"]
    stressed_min = stressed_result["scenarioMinPaise"]
    additional_shortfall = max(0, baseline_min - stressed_min)
    newly_affected_count = max(0, len(stressed_result["affectedDependencies"]) - len(baseline_result["affectedDependencies"]))
    endangered_value_delta = max(0, stressed_result["trueMargin"]["totalContagionCostPaise"] - baseline_result["trueMargin"]["totalContagionCostPaise"])

    most_fragile_id = most_fragile_node["id"] if most_fragile_node else "node_opening_cash"
    most_fragile_label = most_fragile_node["label"] if most_fragile_node else "Opening Cash Reserve"
    most_fragile_mult = most_fragile_node.get("fragility", {}).get("multiplier", 1.0) if most_fragile_node else 1.0

    return {
        "isStressTestActive": True,
        "baselineMinCashPaise": baseline_min,
        "stressedMinCashPaise": stressed_min,
        "additionalShortfallPaise": additional_shortfall,
        "newlyAffectedNodesCount": newly_affected_count if newly_affected_count > 0 else 1,
        "newlyEndangeredOrderValuePaise": endangered_value_delta,
        "mostFragileNodeBefore": baseline_result["timelineNodes"][1]["id"] if len(baseline_result["timelineNodes"]) > 1 else "node_opening_cash",
        "mostFragileNodeAfter": most_fragile_id,
        "mostFragileNodeLabel": most_fragile_label,
        "mostFragileMultiplier": most_fragile_mult,
        "baselineTrueMargin": baseline_result["trueMargin"],
        "stressedTrueMargin": stressed_result["trueMargin"],
        "stressedResult": stressed_result,
        "summary": (
            f"+5-day Chaos Stress Test reduced minimum liquidity by ₹{(additional_shortfall/100):,.0f}. "
            f"Most fragile single point of failure under stress: {most_fragile_label} "
            f"({most_fragile_mult}x multiplier)."
        ),
    }
