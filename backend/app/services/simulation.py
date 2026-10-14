from datetime import date, timedelta
from typing import Any
from app.models.cash_flow import CashFlowEvent
from app.services.forecast import build_detailed_forecast
from app.services.financial import to_iso_date, parse_date

def run_simulation(
    events: list[CashFlowEvent],
    opening_cash_paise: int,
    controls: dict[str, Any],
) -> dict[str, Any]:
    horizon = controls.get("horizonDays", 30)
    sup_delay = controls.get("supplierDeliveryDelayDays", 0)
    cust_delay = controls.get("customerPaymentDelayDays", 0)
    cust_amt = controls.get("customerPaymentAmountPaise")
    sup_amt = controls.get("supplierPaymentAmountPaise")
    order_mult = controls.get("orderQuantityMultiplier", 1.0)

    # 1. Baseline forecast
    baseline = build_detailed_forecast(events, opening_cash_paise, days=horizon)

    # 2. Shift events for simulation
    simulated_events: list[CashFlowEvent] = []
    affected_dependencies = []

    for ev in events:
        # Clone attributes
        ev_date = parse_date(ev.date)
        amt = ev.amount_paise
        shifted_days = 0

        if ev.type == "supplier_payment":
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
                    "impactDescription": f"Delayed customer receipt by {shifted_days} days to {to_iso_date(ev_date)}.",
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

    # 3. Scenario forecast
    scenario = build_detailed_forecast(simulated_events, opening_cash_paise, days=horizon)

    shortfall = max(0, -scenario["minBalancePaise"]) if scenario["minBalancePaise"] < 0 else 0

    # 4. Ripple score calculation
    cash_shortfall_factor = min(40, round((shortfall / 500_000) * 40)) if shortfall > 0 else 0
    delay_mag = abs(sup_delay) + abs(cust_delay)
    delay_factor = min(25, round((delay_mag / 20) * 25))
    downstream_factor = min(20, len(affected_dependencies) * 5)
    gap = abs(baseline["closingBalancePaise"] - scenario["closingBalancePaise"])
    liquidity_gap_factor = min(15, round((gap / 1_000_000) * 15))

    total_score = min(100, cash_shortfall_factor + delay_factor + downstream_factor + liquidity_gap_factor)

    recommendations = []
    if shortfall > 0:
        recommendations.append({
            "id": "rec_shortfall",
            "title": "Negotiate supplier payment terms or seek working capital buffer",
            "rationale": f"Simulated changes create a liquidity shortfall of {(shortfall / 100):,.0f} INR.",
            "impactPaise": shortfall,
            "priority": "high",
        })
    if cust_delay > 7:
        recommendations.append({
            "id": "rec_cust_delay",
            "title": "Enforce customer milestone deposits",
            "rationale": f"Customer delay of {cust_delay} days severely stresses working capital.",
            "priority": "medium",
        })

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
    }
