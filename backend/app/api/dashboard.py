import json
from datetime import date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.deps import get_current_business
from app.models.business import Business
from app.models.invoice import Invoice
from app.models.product import Product
from app.models.inventory import InventoryItem
from app.models.cash_flow import CashFlowEvent
from app.models.supplier import Supplier
from app.models.payment import Payment
from app.models.order import PurchaseOrder, CustomerOrder
from app.models.settings import AppSettingsModel
from app.services.forecast import build_detailed_forecast
from app.services.financial import enrich_inventory_item, to_iso_date

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("/summary")
def get_dashboard_summary(
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    today = date.today()
    today_str = to_iso_date(today)

    # 1. Fetch business-isolated records
    invoices = db.query(Invoice).filter(Invoice.business_id == business.id).all()
    products = db.query(Product).filter(Product.business_id == business.id).all()
    events = db.query(CashFlowEvent).filter(CashFlowEvent.business_id == business.id).all()
    suppliers = db.query(Supplier).filter(Supplier.business_id == business.id).all()
    payments = db.query(Payment).filter(Payment.business_id == business.id).all()
    purchase_orders = db.query(PurchaseOrder).filter(PurchaseOrder.business_id == business.id).all()

    # 2. Derive Current Cash: Opening cash + actual cash inflows - actual cash outflows
    # Completed payments represent verified transactions
    completed_inflows = sum(
        p.amount_paise for p in payments if p.direction == "incoming" and p.status == "completed"
    )
    completed_outflows = sum(
        p.amount_paise for p in payments if p.direction == "outgoing" and p.status == "completed"
    )

    # Also capture non-invoice completed cash flow events (e.g. ad-hoc rent, payroll, tax)
    # avoiding double counting against payments
    handled_po_ids = {p.purchase_order_id for p in payments if p.purchase_order_id}
    handled_inv_ids = {p.invoice_id for p in payments if p.invoice_id}

    for ev in events:
        if ev.status == "completed" and not ev.is_projected and ev.date <= today_str:
            if ev.related_purchase_order_id and ev.related_purchase_order_id in handled_po_ids:
                continue
            if ev.related_invoice_id and ev.related_invoice_id in handled_inv_ids:
                continue
            if ev.direction == "incoming":
                completed_inflows += ev.amount_paise
            elif ev.direction == "outgoing":
                completed_outflows += ev.amount_paise

    opening_cash = business.opening_cash_paise if business.opening_cash_paise is not None else 0
    current_cash_paise = opening_cash + completed_inflows - completed_outflows

    # 3. Derive Receivables, Payables, Overdue Receivables, Open Invoices
    receivables = 0
    overdue_rec = 0
    open_invoices_count = 0
    payables = 0

    for inv in invoices:
        if inv.status in ("void", "cancelled"):
            continue
        rem = max(0, inv.amount_paise - inv.amount_paid_paise)
        if rem > 0:
            open_invoices_count += 1
            if inv.type == "receivable":
                receivables += rem
                if inv.due_date < today_str:
                    overdue_rec += rem
            elif inv.type == "payable":
                payables += rem

    # Include unbilled Purchase Orders in payables
    billed_po_ids = {inv.purchase_order_id for inv in invoices if inv.purchase_order_id and inv.type == "payable"}
    for po in purchase_orders:
        if po.id not in billed_po_ids and po.status in ("draft", "sent", "confirmed"):
            unbilled_amount = max(0, po.total_paise - (po.advance_paid_paise or 0))
            payables += unbilled_amount

    # 4. Inventory health and low stock
    low_stock_count = 0
    for p in products:
        enriched = enrich_inventory_item(p, db)
        if enriched["status"] in ("low_stock", "stockout_risk", "out_of_stock"):
            low_stock_count += 1

    # 5. 30-Day Cash Forecast starting from today's actual cash on hand
    safety_threshold = business.safety_threshold_paise or 500_000
    horizon_days = business.default_forecast_horizon_days or 30

    forecast_data = build_detailed_forecast(
        events=events,
        opening_cash_paise=current_cash_paise,
        days=horizon_days,
        safety_threshold_paise=safety_threshold,
    )

    # 6. Upcoming Cash Events (future events from today forward)
    upcoming_events = [
        {
            "id": e.id,
            "type": e.type,
            "label": e.label,
            "direction": e.direction,
            "amountPaise": e.amount_paise,
            "date": e.date,
            "relatedInvoiceId": e.related_invoice_id,
            "relatedPurchaseOrderId": e.related_purchase_order_id,
            "isProjected": e.is_projected,
            "counterpartyName": e.counterparty_name,
            "status": e.status,
            "riskNote": e.risk_note,
        }
        for e in sorted(events, key=lambda x: x.date)
        if e.date >= today_str
    ][:6]

    # 7. Notification Preferences & Filtered Alerts
    settings_record = db.query(AppSettingsModel).filter(AppSettingsModel.business_id == business.id).first()
    notifs = json.loads(settings_record.notification_preferences_json) if settings_record and settings_record.notification_preferences_json else {}

    alerts = []

    # A. Cash Shortfall Alert
    if notifs.get("lowCash", True) and forecast_data["daysBelowThreshold"] > 0:
        first_breach = forecast_data["breachDates"][0]
        alerts.append({
            "id": "alert_cash_shortfall",
            "severity": "critical",
            "title": f"Cash shortfall projected around {first_breach}",
            "description": f"Balance drops below safety threshold (₹{safety_threshold / 100:,.0f}). Action required.",
            "createdAt": today_str,
            "acknowledged": False,
        })

    # B. Overdue Customer Receivables Alert
    if notifs.get("overdueInvoices", True) and overdue_rec > 0:
        alerts.append({
            "id": "alert_overdue_rec",
            "severity": "warning",
            "title": f"Overdue customer receivables: ₹{overdue_rec / 100:,.0f}",
            "description": "Follow up on overdue customer collections to protect cash reserves.",
            "createdAt": today_str,
            "acknowledged": False,
        })

    # C. Supplier Delivery & Reliability Alerts
    if notifs.get("delayedDeliveries", True):
        for s in suppliers:
            if s.reliability_score is not None and s.reliability_score < 75:
                alerts.append({
                    "id": f"alert_sup_{s.id}",
                    "severity": "warning",
                    "title": f"At-risk supplier: {s.name}",
                    "description": f"Low reliability score ({s.reliability_score}%). Check order delivery tracking.",
                    "relatedEntityId": s.id,
                    "relatedEntityType": "supplier",
                    "createdAt": today_str,
                    "acknowledged": False,
                })

    # D. Low Stock Alert
    if low_stock_count > 0:
        alerts.append({
            "id": "alert_low_stock",
            "severity": "warning",
            "title": f"{low_stock_count} item{'s' if low_stock_count > 1 else ''} below reorder point",
            "description": "Replenish inventory to prevent production and sales fulfillment delays.",
            "createdAt": today_str,
            "acknowledged": False,
        })

    # 8. Dynamic Recommendations based on real conditions
    recommendations = []
    if forecast_data["daysBelowThreshold"] > 0:
        recommendations.append({
            "id": "rec_stagger_payables",
            "title": "Stagger supplier payments across pay cycles",
            "rationale": "Smoothing outgoing payables prevents dips below your safety threshold.",
            "impactPaise": 250_000,
            "priority": "high",
        })
    if overdue_rec > 0:
        recommendations.append({
            "id": "rec_early_discounts",
            "title": "Enable early payment discounts for key clients",
            "rationale": "Accelerates customer collections and reinforces working capital.",
            "impactPaise": min(overdue_rec, 500_000),
            "priority": "medium",
        })
    if low_stock_count > 0:
        recommendations.append({
            "id": "rec_reorder_stock",
            "title": "Issue purchase orders for low-stock inventory",
            "rationale": "Order replenishment stock now to avoid supply chain disruptions.",
            "impactPaise": 150_000,
            "priority": "low" if forecast_data["daysBelowThreshold"] == 0 else "medium",
        })

    return {
        "businessName": business.name,
        "currency": business.currency or "INR",
        "cashOnHandPaise": current_cash_paise,
        "receivablesPaise": receivables,
        "payablesPaise": payables,
        "overdueReceivablesPaise": overdue_rec,
        "lowStockCount": low_stock_count,
        "openInvoiceCount": open_invoices_count,
        "forecast": forecast_data["points"],
        "alerts": alerts,
        "recommendations": recommendations,
        "upcomingEvents": upcoming_events,
    }

@router.get("/recent-activity")
def get_dashboard_recent_activity(
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    """Retrieve recent transactions and business activity for the authenticated business."""
    # Combine recent invoices, payments, and orders into a unified timeline
    invoices = (
        db.query(Invoice)
        .filter(Invoice.business_id == business.id)
        .order_by(Invoice.created_at.desc())
        .limit(10)
        .all()
    )
    payments = (
        db.query(Payment)
        .filter(Payment.business_id == business.id)
        .order_by(Payment.created_at.desc())
        .limit(10)
        .all()
    )

    activities = []
    for inv in invoices:
        activities.append({
            "id": f"act_inv_{inv.id}",
            "type": "invoice",
            "title": f"Invoice {inv.invoice_number} ({inv.type})",
            "amountPaise": inv.amount_paise,
            "status": inv.status,
            "date": inv.created_at or inv.issue_date,
        })
    for p in payments:
        activities.append({
            "id": f"act_pay_{p.id}",
            "type": "payment",
            "title": f"{'Received payment' if p.direction == 'incoming' else 'Paid supplier'}",
            "amountPaise": p.amount_paise,
            "status": p.status,
            "date": p.created_at or p.completed_date or p.scheduled_date,
        })

    activities.sort(key=lambda a: a.get("date") or "", reverse=True)
    return {"activities": activities[:10]}
