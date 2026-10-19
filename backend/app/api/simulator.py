import json
import uuid
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.deps import get_current_business
from app.models.business import Business
from app.models.cash_flow import CashFlowEvent
from app.models.simulation import SimulationScenario, ScenarioRescue, ScenarioStressTest
from app.services.financial import to_iso_date
from app.services.simulation import (
    run_simulation,
    run_chaos_stress_test,
    calculate_auto_phase,
    calculate_split_escrow,
    calculate_true_margin,
)

router = APIRouter(tags=["simulator"])

def _validate_controls(controls: dict) -> None:
    horizon = controls.get("horizonDays", 30)
    if not isinstance(horizon, int) or isinstance(horizon, bool) or not 10 <= horizon <= 90:
        raise HTTPException(status_code=422, detail="horizonDays must be a whole number from 10 to 90.")
    
    # Validate customer delay if present (accepts customerDelayDays or customerPaymentDelayDays)
    cust_delays = controls.get("customerDelayDays") if "customerDelayDays" in controls else controls.get("customerPaymentDelayDays", {})
    if isinstance(cust_delays, dict):
        for k, v in cust_delays.items():
            if not isinstance(v, (int, float)) or v < 0 or v > 365:
                raise HTTPException(status_code=422, detail=f"Invalid customer delay for {k}: must be between 0 and 365 days.")
    elif isinstance(cust_delays, (int, float)):
        if cust_delays < 0 or cust_delays > 365:
            raise HTTPException(status_code=422, detail="customerDelayDays must be between 0 and 365.")

    # Validate supplier delay if present (accepts supplierDelayDays or supplierDeliveryDelayDays)
    sup_delays = controls.get("supplierDelayDays") if "supplierDelayDays" in controls else controls.get("supplierDeliveryDelayDays", {})
    if isinstance(sup_delays, dict):
        for k, v in sup_delays.items():
            if not isinstance(v, (int, float)) or v < 0 or v > 365:
                raise HTTPException(status_code=422, detail=f"Invalid supplier delay for {k}: must be between 0 and 365 days.")
    elif isinstance(sup_delays, (int, float)):
        if sup_delays < 0 or sup_delays > 365:
            raise HTTPException(status_code=422, detail="supplierDelayDays must be between 0 and 365.")

def _get_active_rescues(business_id: str, db: Session) -> list[dict]:
    records = db.query(ScenarioRescue).filter(
        ScenarioRescue.business_id == business_id,
        ScenarioRescue.status == "active",
    ).all()
    return [
        {
            "id": r.id,
            "rescue_type": r.rescue_type,
            "status": r.status,
            "target_supplier_id": r.target_supplier_id,
            "target_customer_id": r.target_customer_id,
            "parent_order_id": r.parent_order_id,
            "batch1_amount_paise": r.batch1_amount_paise,
            "batch1_date": r.batch1_date,
            "batch2_amount_paise": r.batch2_amount_paise,
            "batch2_date": r.batch2_date,
            "float_fee_paise": r.float_fee_paise,
            "net_proceeds_paise": r.net_proceeds_paise,
        }
        for r in records
    ]

@router.post("/api/simulator/simulate")
@router.post("/api/simulate")
def simulate(
    controls: dict,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    """
    Authoritative simulation endpoint evaluating controls and active rescues.
    """
    _validate_controls(controls)

    events = db.query(CashFlowEvent).filter(CashFlowEvent.business_id == business.id).all()
    opening_cash = business.opening_cash_paise or 15_000_000 # default ₹1,50,000 for scenario
    rescues = _get_active_rescues(business.id, db)
    return run_simulation(events, opening_cash, controls, rescues=rescues, business=business)

@router.post("/api/simulator/chaos-test")
def chaos_stress_test(
    controls: dict,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    """
    Chaos Stress-Test: Applies isolated +5-day delay to evaluate resilience,
    identifying the most fragile single point of failure under stress.
    """
    _validate_controls(controls)
    events = db.query(CashFlowEvent).filter(CashFlowEvent.business_id == business.id).all()
    opening_cash = business.opening_cash_paise or 15_000_000
    rescues = _get_active_rescues(business.id, db)
    stress_result = run_chaos_stress_test(events, opening_cash, controls, rescues=rescues, business=business)

    try:
        stress_record = ScenarioStressTest(
            id=f"stress_{uuid.uuid4().hex[:12]}",
            business_id=business.id,
            baseline_min_paise=stress_result["baselineMinCashPaise"],
            stressed_min_paise=stress_result["stressedMinCashPaise"],
            additional_shortfall_paise=stress_result["additionalShortfallPaise"],
            most_fragile_node_id=stress_result["mostFragileNodeAfter"],
            most_fragile_multiplier=stress_result["mostFragileMultiplier"],
            created_at=to_iso_date(date.today()),
        )
        db.add(stress_record)
        db.commit()
    except Exception:
        db.rollback()
        raise

    return stress_result

@router.post("/api/simulator/rescues/auto-phase/preview")
def preview_auto_phase(
    payload: dict,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    supplier_commitment = payload.get("supplierCommitmentPaise", 12_000_000)
    actual_available_cash = payload.get("actualAvailableCashPaise", 15_000_000)
    safety_buffer = payload.get("safetyBufferPaise") or 5_000_000
    customer_payment_date = payload.get("customerPaymentDate", "Day 31")

    if supplier_commitment < 0 or actual_available_cash < 0 or safety_buffer < 0:
        raise HTTPException(status_code=422, detail="Financial amounts must be non-negative.")

    return calculate_auto_phase(
        supplier_commitment_paise=supplier_commitment,
        actual_available_cash_paise=actual_available_cash,
        safety_buffer_paise=safety_buffer,
        original_payment_date=payload.get("originalPaymentDate", "Day 18"),
        customer_payment_date=customer_payment_date,
    )

@router.post("/api/simulator/rescues/auto-phase/apply")
def apply_auto_phase(
    payload: dict,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    preview = preview_auto_phase(payload, business, db)
    target_supplier = payload.get("supplierId", "sup_kaveri")

    try:
        # Idempotency: deactivate any prior active auto_phase rescues for this supplier
        prior_active = db.query(ScenarioRescue).filter(
            ScenarioRescue.business_id == business.id,
            ScenarioRescue.rescue_type == "auto_phase",
            ScenarioRescue.target_supplier_id == target_supplier,
            ScenarioRescue.status == "active",
        ).all()
        for par in prior_active:
            par.status = "reverted"

        rescue_id = f"res_ap_{uuid.uuid4().hex[:10]}"
        rescue = ScenarioRescue(
            id=rescue_id,
            business_id=business.id,
            scenario_id=payload.get("scenarioId"),
            rescue_type="auto_phase",
            status="active",
            target_supplier_id=target_supplier,
            batch1_amount_paise=preview["batch1"]["amountPaise"],
            batch1_date=preview["batch1"]["date"],
            batch2_amount_paise=preview["batch2"]["amountPaise"],
            batch2_date=preview["batch2"]["date"],
            metadata_json=json.dumps(preview),
            created_at=to_iso_date(date.today()),
        )
        db.add(rescue)
        db.commit()
        db.refresh(rescue)

        return {
            "success": True,
            "rescueId": rescue.id,
            "rescue": preview,
            "message": "Auto-Phase Inventory applied. Batch 1 and Batch 2 scheduled with safety buffer intact.",
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise

@router.post("/api/simulator/rescues/split-escrow/preview")
def preview_split_escrow(
    payload: dict,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    customer_invoice_paise = payload.get("customerInvoicePaise", 50_000_000)
    supplier_commitment_paise = payload.get("supplierCommitmentPaise", 12_000_000)

    preview = calculate_split_escrow(
        customer_invoice_paise=customer_invoice_paise,
        supplier_commitment_paise=supplier_commitment_paise,
        supplier_funding_date=payload.get("supplierFundingDate", "Day 18"),
        customer_settlement_date=payload.get("customerSettlementDate", "Day 31"),
    )

    if not preview["isEligible"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Receivable amount (₹{customer_invoice_paise/100:,.0f}) is insufficient to cover supplier obligation and float fee (₹{preview['totalDeductionPaise']/100:,.0f}).",
        )

    return preview

@router.post("/api/simulator/rescues/split-escrow/apply")
def apply_split_escrow(
    payload: dict,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    preview = preview_split_escrow(payload, business, db)
    rescue_id = f"res_esc_{uuid.uuid4().hex[:10]}"

    rescue = ScenarioRescue(
        id=rescue_id,
        business_id=business.id,
        scenario_id=payload.get("scenarioId"),
        rescue_type="split_escrow",
        status="active",
        target_customer_id=payload.get("customerId", "cust_apex"),
        target_supplier_id=payload.get("supplierId", "sup_kaveri"),
        float_fee_paise=preview["floatFeePaise"],
        net_proceeds_paise=preview["netProceedsPaise"],
        metadata_json=json.dumps(preview),
        created_at=to_iso_date(date.today()),
    )
    db.add(rescue)
    db.commit()
    db.refresh(rescue)

    return {
        "success": True,
        "rescueId": rescue.id,
        "rescue": preview,
        "message": "Tri-Party Split-Escrow arrangement locked. Supplier obligation funded with zero ordinary cash outlay.",
    }

@router.post("/api/simulator/rescue")
def apply_rescue_generic(
    payload: dict,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    rescue_type = payload.get("rescueType") or payload.get("rescue_type") or payload.get("type", "auto_phase")
    action = payload.get("action", "apply")
    if action == "revert":
        return revert_all_rescues(business, db)
    if rescue_type == "split_escrow":
        return apply_split_escrow(payload, business, db)
    return apply_auto_phase(payload, business, db)

@router.post("/api/simulator/rescues/{rescue_id}/revert")
def revert_rescue(
    rescue_id: str,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    rescue = db.query(ScenarioRescue).filter(
        ScenarioRescue.id == rescue_id,
        ScenarioRescue.business_id == business.id,
    ).first()

    if not rescue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scenario rescue not found.")

    rescue.status = "reverted"
    db.commit()

    return {
        "success": True,
        "rescueId": rescue_id,
        "message": "Scenario rescue successfully reverted.",
    }

@router.post("/api/simulator/rescues/revert-all")
def revert_all_rescues(
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    rescues = db.query(ScenarioRescue).filter(
        ScenarioRescue.business_id == business.id,
        ScenarioRescue.status == "active",
    ).all()

    for r in rescues:
        r.status = "reverted"

    db.commit()
    return {"success": True, "revertedCount": len(rescues), "message": "All scenario rescues reverted."}

@router.get("/api/simulator/rescues")
def get_rescues(
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    return _get_active_rescues(business.id, db)
