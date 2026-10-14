import uuid
import json
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.deps import get_current_business
from app.models.business import Business
from app.models.cash_flow import CashFlowEvent
from app.models.simulation import SimulationScenario, DependencyEdge
from app.services.forecast import build_detailed_forecast
from app.services.simulation import run_simulation
from app.services.financial import to_iso_date

router = APIRouter(tags=["cash-flow"])

@router.get("/api/forecast")
@router.get("/api/cash-flow/forecast")
def get_forecast(
    days: int = Query(30, ge=7, le=180),
    scenario_id: str | None = None,
    safety_threshold: int | None = None,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    events = db.query(CashFlowEvent).filter(CashFlowEvent.business_id == business.id).all()
    threshold = safety_threshold or business.safety_threshold_paise or 500_000
    opening_cash = business.opening_cash_paise or 1_000_000

    forecast = build_detailed_forecast(
        events=events,
        opening_cash_paise=opening_cash,
        days=days,
        safety_threshold_paise=threshold,
        scenario_id=scenario_id,
    )
    return forecast

@router.patch("/api/business/safety-threshold")
def update_safety_threshold(
    payload: dict,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    threshold = payload.get("safetyThresholdPaise")
    if threshold is None or threshold < 0:
        raise HTTPException(status_code=400, detail="Invalid safety threshold amount")

    business.safety_threshold_paise = threshold
    db.commit()
    return {"success": True, "safetyThresholdPaise": threshold}

@router.get("/api/dependencies")
def get_dependencies(
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    deps = db.query(DependencyEdge).filter(DependencyEdge.business_id == business.id).all()
    return [
        {
            "id": d.id,
            "sourceId": d.source_id,
            "sourceType": d.source_type,
            "targetId": d.target_id,
            "targetType": d.target_type,
            "label": d.label,
            "lagDays": d.lag_days,
        }
        for d in deps
    ]

@router.post("/api/simulate")
def simulate(
    controls: dict,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    events = db.query(CashFlowEvent).filter(CashFlowEvent.business_id == business.id).all()
    opening_cash = business.opening_cash_paise or 1_000_000
    result = run_simulation(events, opening_cash, controls)
    return result

@router.post("/api/scenarios")
def save_scenario(
    payload: dict,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    name = payload.get("name", "New Scenario")
    controls = payload.get("controls", {})
    result = payload.get("result", {})

    scenario_id = f"scn_{uuid.uuid4().hex[:12]}"
    scenario = SimulationScenario(
        id=scenario_id,
        business_id=business.id,
        name=name,
        controls_json=json.dumps(controls),
        result_json=json.dumps(result),
        created_at=to_iso_date(date.today()),
    )
    db.add(scenario)
    db.commit()
    db.refresh(scenario)

    return {
        "id": scenario.id,
        "name": scenario.name,
        "controls": controls,
        "result": result,
        "createdAt": scenario.created_at,
    }

@router.get("/api/scenarios")
def list_scenarios(
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    scenarios = db.query(SimulationScenario).filter(SimulationScenario.business_id == business.id).all()
    result = []
    for s in scenarios:
        controls = json.loads(s.controls_json) if s.controls_json else {}
        res = json.loads(s.result_json) if s.result_json else {}
        result.append({
            "id": s.id,
            "name": s.name,
            "controls": controls,
            "result": res,
            "createdAt": s.created_at,
        })
    return result

@router.post("/api/simulations")
def run_simulation_legacy(
    payload: dict,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    scenario_id = f"sim_{uuid.uuid4().hex[:12]}"
    events = db.query(CashFlowEvent).filter(CashFlowEvent.business_id == business.id).all()
    opening_cash = business.opening_cash_paise or 1_000_000
    forecast = build_detailed_forecast(events, opening_cash, days=30)
    min_p = forecast["points"][0] if forecast["points"] else {"projectedBalancePaise": opening_cash, "date": to_iso_date(date.today())}

    return {
        "scenarioId": scenario_id,
        "baselineForecast": forecast["points"],
        "scenarioForecast": forecast["points"],
        "impactedEventIds": [payload.get("targetEventId", "")],
        "minBalancePaise": min_p["projectedBalancePaise"],
        "minBalanceDate": min_p["date"],
        "summary": f'Scenario "{payload.get("name", "")}" applied.',
    }

@router.get("/api/simulations/scenarios")
def list_simulations_scenarios(
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    scenarios = db.query(SimulationScenario).filter(SimulationScenario.business_id == business.id).all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "description": s.description,
            "targetEventId": s.target_event_id or "evt_1",
            "changeType": s.change_type or "delay_payment",
            "changeMagnitude": s.change_magnitude or 7,
            "createdAt": s.created_at or to_iso_date(date.today()),
        }
        for s in scenarios
    ]
