from datetime import date
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.deps import get_current_business
from app.models.business import Business
from app.models.supplier import Supplier
from app.models.order import PurchaseOrder
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.models.product import Product
from app.services.financial import enrich_supplier, get_supplier_summary, to_iso_date

router = APIRouter(prefix="/api/suppliers", tags=["suppliers"])

@router.get("")
def list_suppliers(
    search: str | None = None,
    status: str | None = None,
    sortBy: str | None = None,
    sortDir: str | None = "asc",
    page: int = Query(1, ge=1),
    pageSize: int = Query(50, ge=1, le=100),
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    query = db.query(Supplier).filter(Supplier.business_id == business.id)

    if status and status != "all":
        query = query.filter(Supplier.status == status)

    if search:
        s = f"%{search.strip().lower()}%"
        query = query.filter(
            (Supplier.name.ilike(s)) |
            (Supplier.contact_name.ilike(s)) |
            (Supplier.email.ilike(s))
        )

    all_suppliers = query.all()
    today = date.today()
    enriched = [enrich_supplier(s, db, today) for s in all_suppliers]

    reverse = (sortDir == "desc")
    if sortBy == "name":
        enriched.sort(key=lambda x: x["name"].lower(), reverse=reverse)
    elif sortBy == "outstanding":
        enriched.sort(key=lambda x: x["outstandingPaise"], reverse=reverse)
    elif sortBy == "reliability":
        enriched.sort(key=lambda x: x["reliabilityScore"], reverse=reverse)
    elif sortBy == "terms":
        enriched.sort(key=lambda x: x["paymentTermsDays"], reverse=reverse)
    elif sortBy == "overdue":
        enriched.sort(key=lambda x: x["overdueAmountPaise"], reverse=reverse)
    else:
        enriched.sort(key=lambda x: x["name"].lower())

    total = len(enriched)
    start = (page - 1) * pageSize
    paged = enriched[start : start + pageSize]

    return {
        "data": paged,
        "total": total,
        "page": page,
        "pageSize": pageSize,
    }

@router.get("/summary")
def supplier_summary(
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    return get_supplier_summary(business.id, db)

@router.get("/{id}")
def get_supplier(
    id: str,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    supplier = db.query(Supplier).filter(
        Supplier.id == id,
        Supplier.business_id == business.id
    ).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return enrich_supplier(supplier, db)

@router.get("/{id}/details")
def get_supplier_details(
    id: str,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    supplier = db.query(Supplier).filter(
        Supplier.id == id,
        Supplier.business_id == business.id
    ).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    today = date.today()
    pos = db.query(PurchaseOrder).filter(PurchaseOrder.supplier_id == id).all()
    invoices = db.query(Invoice).filter(Invoice.supplier_id == id, Invoice.type == "payable").all()
    payments = db.query(Payment).filter(Payment.supplier_id == id).all()
    products = db.query(Product).filter(Product.preferred_supplier_id == id).all()

    total_purchases = sum(p.total_paise for p in pos)
    total_payments = sum(p.amount_paise for p in payments if p.status == "completed")
    outstanding = sum(max(0, inv.amount_paise - inv.amount_paid_paise) for inv in invoices if inv.status not in ("void", "cancelled"))
    overdue = sum(max(0, inv.amount_paise - inv.amount_paid_paise) for inv in invoices if inv.due_date < to_iso_date(today) and inv.status not in ("void", "cancelled"))
    open_pos = [p for p in pos if p.status in ("draft", "sent", "confirmed", "partially_received", "delayed")]

    upcoming_commitments = []
    for inv in invoices:
        rem = max(0, inv.amount_paise - inv.amount_paid_paise)
        if rem > 0 and inv.status not in ("void", "cancelled"):
            upcoming_commitments.append({
                "id": f"comm_{inv.id}",
                "direction": "outgoing",
                "invoiceId": inv.id,
                "amountPaise": rem,
                "status": "scheduled",
                "scheduledDate": inv.due_date,
                "dueDate": inv.due_date,
                "linkedInvoiceNumber": inv.invoice_number,
                "method": "Bank Transfer",
            })

    return {
        "supplier": enrich_supplier(supplier, db, today),
        "metrics": {
            "totalPurchasesPaise": total_purchases,
            "totalPaymentsMadePaise": total_payments,
            "outstandingPayablesPaise": outstanding,
            "overdueBalancePaise": overdue,
            "openPoCount": len(open_pos),
            "totalPoCount": len(pos),
            "onTimeDeliveryRate": supplier.reliability_score,
            "reliabilityScore": supplier.reliability_score,
            "riskLevel": "high" if supplier.reliability_score < 75 or overdue > 0 else "low",
            "riskFactors": [f"Reliability {supplier.reliability_score}%"] if supplier.reliability_score < 75 else [],
        },
        "purchaseOrders": [
            {
                "id": p.id,
                "poNumber": p.po_number,
                "supplierId": p.supplier_id,
                "totalPaise": p.total_paise,
                "advancePaidPaise": p.advance_paid_paise,
                "status": p.status,
                "orderDate": p.order_date,
                "expectedDeliveryDate": p.expected_delivery_date,
                "paymentTermsDays": p.payment_terms_days,
                "notes": p.notes,
                "orderedUnits": p.quantity or 0,
                "receivedUnits": p.received_quantity,
                "outstandingPaise": max(0, p.total_paise - p.advance_paid_paise),
            }
            for p in pos
        ],
        "invoices": [
            {
                "id": inv.id,
                "invoiceNumber": inv.invoice_number,
                "type": inv.type,
                "supplierId": inv.supplier_id,
                "amountPaise": inv.amount_paise,
                "amountPaidPaise": inv.amount_paid_paise,
                "status": inv.status,
                "issueDate": inv.issue_date,
                "dueDate": inv.due_date,
                "notes": inv.notes,
            }
            for inv in invoices
        ],
        "payments": [
            {
                "id": pay.id,
                "direction": pay.direction,
                "invoiceId": pay.invoice_id,
                "supplierId": pay.supplier_id,
                "amountPaise": pay.amount_paise,
                "status": pay.status,
                "scheduledDate": pay.scheduled_date,
                "completedDate": pay.completed_date,
                "method": pay.method,
            }
            for pay in payments
        ],
        "upcomingPayments": upcoming_commitments,
        "completedPayments": [p for p in payments if p.status == "completed"],
        "products": [
            {
                "id": pr.id,
                "sku": pr.sku,
                "name": pr.name,
                "unitCostPaise": pr.unit_cost_paise,
                "unitPricePaise": pr.unit_price_paise,
                "reorderPoint": pr.reorder_point,
            }
            for pr in products
        ],
    }

@router.post("", status_code=status.HTTP_201_CREATED)
def create_supplier(
    payload: dict,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    name = payload.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Supplier name is required")

    existing = db.query(Supplier).filter(
        Supplier.business_id == business.id,
        Supplier.name.ilike(name)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f'A supplier named "{name}" already exists.')

    supplier = Supplier(
        id=f"sup_{uuid.uuid4().hex[:12]}",
        business_id=business.id,
        name=name,
        contact_name=payload.get("contactName"),
        email=payload.get("email"),
        phone=payload.get("phone"),
        address=payload.get("address"),
        tax_id=payload.get("taxId"),
        payment_terms_days=payload.get("paymentTermsDays", 30),
        outstanding_paise=0,
        reliability_score=payload.get("reliabilityScore", 80),
        status=payload.get("status", "active"),
        lead_time_days=payload.get("leadTimeDays", 7),
        notes=payload.get("notes"),
        created_at=to_iso_date(date.today()),
        updated_at=to_iso_date(date.today()),
    )
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return enrich_supplier(supplier, db)

@router.patch("/{id}")
def update_supplier(
    id: str,
    payload: dict,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    supplier = db.query(Supplier).filter(
        Supplier.id == id,
        Supplier.business_id == business.id
    ).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    if "name" in payload and payload["name"]:
        name = payload["name"].strip()
        existing = db.query(Supplier).filter(
            Supplier.business_id == business.id,
            Supplier.name.ilike(name),
            Supplier.id != id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail=f'A supplier named "{name}" already exists.')
        supplier.name = name

    if "contactName" in payload: supplier.contact_name = payload["contactName"]
    if "email" in payload: supplier.email = payload["email"]
    if "phone" in payload: supplier.phone = payload["phone"]
    if "address" in payload: supplier.address = payload["address"]
    if "taxId" in payload: supplier.tax_id = payload["taxId"]
    if "paymentTermsDays" in payload and payload["paymentTermsDays"] is not None:
        supplier.payment_terms_days = payload["paymentTermsDays"]
    if "reliabilityScore" in payload and payload["reliabilityScore"] is not None:
        supplier.reliability_score = payload["reliabilityScore"]
    if "leadTimeDays" in payload and payload["leadTimeDays"] is not None:
        supplier.lead_time_days = payload["leadTimeDays"]
    if "notes" in payload: supplier.notes = payload["notes"]
    if "status" in payload: supplier.status = payload["status"]

    supplier.updated_at = to_iso_date(date.today())
    db.commit()
    db.refresh(supplier)
    return enrich_supplier(supplier, db)

@router.post("/{id}/archive")
def archive_supplier(
    id: str,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    supplier = db.query(Supplier).filter(
        Supplier.id == id,
        Supplier.business_id == business.id
    ).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    supplier.status = "archived"
    supplier.updated_at = to_iso_date(date.today())
    db.commit()
    db.refresh(supplier)
    return enrich_supplier(supplier, db)

@router.post("/{id}/unarchive")
def unarchive_supplier(
    id: str,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    supplier = db.query(Supplier).filter(
        Supplier.id == id,
        Supplier.business_id == business.id
    ).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    supplier.status = "active"
    supplier.updated_at = to_iso_date(date.today())
    db.commit()
    db.refresh(supplier)
    return enrich_supplier(supplier, db)

@router.delete("/{id}")
def delete_supplier(
    id: str,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    supplier = db.query(Supplier).filter(
        Supplier.id == id,
        Supplier.business_id == business.id
    ).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    # Protection against deleting suppliers with historical financial records
    has_pos = db.query(PurchaseOrder).filter(PurchaseOrder.supplier_id == id).first()
    has_invoices = db.query(Invoice).filter(Invoice.supplier_id == id).first()
    if has_pos or has_invoices or supplier.outstanding_paise > 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete supplier with historical financial records or outstanding balances. Archive instead."
        )

    db.delete(supplier)
    db.commit()
    return {"success": True}
