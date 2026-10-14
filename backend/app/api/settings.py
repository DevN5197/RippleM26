import json
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.deps import get_current_business
from app.models.business import Business
from app.models.settings import AppSettingsModel
from app.services.financial import to_iso_date

router = APIRouter(tags=["settings"])

def _get_or_create_settings(business: Business, db: Session) -> AppSettingsModel:
    record = db.query(AppSettingsModel).filter(AppSettingsModel.business_id == business.id).first()
    if not record:
        record = AppSettingsModel(
            business_id=business.id,
            notification_preferences_json=json.dumps({
                "overduePayments": True,
                "upcomingSupplierPayments": True,
                "overdueInvoices": True,
                "lowCash": True,
                "delayedDeliveries": True,
                "highRippleImpact": True,
            }),
            app_preferences_json=json.dumps({
                "theme": "system",
                "compactTables": False,
                "version": "1.0.0",
            }),
            updated_at=to_iso_date(date.today()),
        )
        db.add(record)
        db.commit()
        db.refresh(record)
    return record

def _build_settings_response(business: Business, record: AppSettingsModel) -> dict:
    notifs = json.loads(record.notification_preferences_json) if record.notification_preferences_json else {}
    app_prefs = json.loads(record.app_preferences_json) if record.app_preferences_json else {}

    return {
        "business": {
            "id": business.id,
            "name": business.name,
            "currency": business.currency,
            "openingCashPaise": business.opening_cash_paise,
            "safetyThresholdPaise": business.safety_threshold_paise,
            "industry": business.industry,
            "ownerName": business.owner_name,
            "ownerEmail": business.owner_email,
            "phone": business.phone,
            "address": business.address,
            "taxRatePercent": business.tax_rate_percent,
            "defaultSupplierPaymentTermsDays": business.default_supplier_payment_terms_days,
            "defaultCustomerPaymentTermsDays": business.default_customer_payment_terms_days,
            "defaultForecastHorizonDays": business.default_forecast_horizon_days,
        },
        "notifications": notifs,
        "app": app_prefs,
        "dataMode": "api",
    }

@router.get("/settings")
@router.get("/api/settings")
def get_settings(
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    record = _get_or_create_settings(business, db)
    return _build_settings_response(business, record)

@router.patch("/settings")
@router.patch("/api/settings")
def update_settings(
    payload: dict,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    record = _get_or_create_settings(business, db)

    biz_patch = payload.get("business", {})
    if "name" in biz_patch: business.name = biz_patch["name"]
    if "openingCashPaise" in biz_patch: business.opening_cash_paise = biz_patch["openingCashPaise"]
    if "safetyThresholdPaise" in biz_patch: business.safety_threshold_paise = biz_patch["safetyThresholdPaise"]
    if "industry" in biz_patch: business.industry = biz_patch["industry"]
    if "ownerName" in biz_patch: business.owner_name = biz_patch["ownerName"]
    if "ownerEmail" in biz_patch: business.owner_email = biz_patch["ownerEmail"]
    if "phone" in biz_patch: business.phone = biz_patch["phone"]
    if "address" in biz_patch: business.address = biz_patch["address"]
    if "taxRatePercent" in biz_patch: business.tax_rate_percent = biz_patch["taxRatePercent"]
    if "defaultSupplierPaymentTermsDays" in biz_patch:
        business.default_supplier_payment_terms_days = biz_patch["defaultSupplierPaymentTermsDays"]
    if "defaultCustomerPaymentTermsDays" in biz_patch:
        business.default_customer_payment_terms_days = biz_patch["defaultCustomerPaymentTermsDays"]
    if "defaultForecastHorizonDays" in biz_patch:
        business.default_forecast_horizon_days = biz_patch["defaultForecastHorizonDays"]

    if "notifications" in payload:
        current_notifs = json.loads(record.notification_preferences_json) if record.notification_preferences_json else {}
        current_notifs.update(payload["notifications"])
        record.notification_preferences_json = json.dumps(current_notifs)

    if "app" in payload:
        current_app = json.loads(record.app_preferences_json) if record.app_preferences_json else {}
        current_app.update(payload["app"])
        record.app_preferences_json = json.dumps(current_app)

    record.updated_at = to_iso_date(date.today())
    db.commit()
    db.refresh(business)
    db.refresh(record)

    return _build_settings_response(business, record)

@router.post("/settings/reset-demo-data")
@router.post("/api/settings/reset-demo-data")
def reset_demo_data(
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    if business.id != "biz_1":
        raise HTTPException(
            status_code=403,
            detail="Resetting demo data is only permitted for the default demo business account.",
        )
    from app.seed import seed_rupi_clothing
    seed_rupi_clothing(db, overwrite=True)
    return {"success": True, "message": "Demo data has been reset to its initial state."}
