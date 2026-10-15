from datetime import date
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.deps import get_current_business
from app.models.business import Business
from app.models.invoice import Invoice
from app.models.customer import Customer
from app.models.supplier import Supplier
from app.models.order import CustomerOrder, PurchaseOrder
from app.models.payment import Payment
from app.models.cash_flow import CashFlowEvent
from app.services.financial import enrich_invoice, get_invoice_summary, to_iso_date

router = APIRouter(prefix="/api/invoices", tags=["invoices"])

@router.get("")
def list_invoices(
    search: str | None = None,
    type: str | None = None,
    status: str | None = None,
    page: int = Query(1, ge=1),
    pageSize: int = Query(50, ge=1, le=100),
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    query = db.query(Invoice).filter(Invoice.business_id == business.id)

    if type and type != "all":
        query = query.filter(Invoice.type == type)

    today = date.today()
    invoices = query.all()
    enriched = [enrich_invoice(inv, db, today) for inv in invoices]

    if status and status != "all":
        if status == "unpaid":
            enriched = [i for i in enriched if i["status"] in ("sent", "draft") and i["amountPaidPaise"] == 0 and not i["isOverdue"]]
        elif status == "partially_paid":
            enriched = [i for i in enriched if i["status"] == "partially_paid"]
        elif status == "paid":
            enriched = [i for i in enriched if i["status"] == "paid"]
        elif status == "overdue":
            enriched = [i for i in enriched if i["isOverdue"]]
        else:
            enriched = [i for i in enriched if i["status"] == status]

    if search:
        s = search.strip().lower()
        enriched = [
            i for i in enriched
            if s in i["invoiceNumber"].lower()
            or s in i["counterpartyName"].lower()
            or (i["notes"] and s in i["notes"].lower())
        ]

    # Sort default by dueDate descending
    enriched.sort(key=lambda x: x["dueDate"], reverse=True)

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
def invoice_summary(
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    return get_invoice_summary(business.id, db)

@router.get("/{id}")
def get_invoice(
    id: str,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    inv = db.query(Invoice).filter(
        Invoice.id == id,
        Invoice.business_id == business.id
    ).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    today = date.today()
    enriched = enrich_invoice(inv, db, today)
    customer = db.query(Customer).filter(Customer.id == inv.customer_id).first() if inv.customer_id else None
    supplier = db.query(Supplier).filter(Supplier.id == inv.supplier_id).first() if inv.supplier_id else None
    customer_order = db.query(CustomerOrder).filter(CustomerOrder.id == inv.customer_order_id).first() if inv.customer_order_id else None
    purchase_order = db.query(PurchaseOrder).filter(PurchaseOrder.id == inv.purchase_order_id).first() if inv.purchase_order_id else None
    payments = db.query(Payment).filter(Payment.invoice_id == id).all()

    return {
        "invoice": enriched,
        "customer": {
            "id": customer.id,
            "name": customer.name,
            "email": customer.email,
            "phone": customer.phone,
            "outstandingPaise": customer.outstanding_paise,
        } if customer else None,
        "supplier": {
            "id": supplier.id,
            "name": supplier.name,
            "email": supplier.email,
            "phone": supplier.phone,
            "outstandingPaise": supplier.outstanding_paise,
        } if supplier else None,
        "customerOrder": {
            "id": customer_order.id,
            "quantity": customer_order.quantity,
            "totalPaise": customer_order.total_paise,
            "status": customer_order.status,
        } if customer_order else None,
        "purchaseOrder": {
            "id": purchase_order.id,
            "poNumber": purchase_order.po_number,
            "totalPaise": purchase_order.total_paise,
            "status": purchase_order.status,
        } if purchase_order else None,
        "payments": [
            {
                "id": p.id,
                "direction": p.direction,
                "invoiceId": p.invoice_id,
                "amountPaise": p.amount_paise,
                "status": p.status,
                "scheduledDate": p.scheduled_date,
                "completedDate": p.completed_date,
                "method": p.method,
            }
            for p in payments
        ],
    }

@router.post("", status_code=status.HTTP_201_CREATED)
def create_invoice(
    payload: dict,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    inv_type = payload.get("type", "receivable")
    try:
        amount = int(round(float(payload.get("amountPaise", 0))))
    except (ValueError, TypeError):
        amount = 0

    customer_id = payload.get("customerId")
    supplier_id = payload.get("supplierId")

    if amount <= 0:
        raise HTTPException(status_code=400, detail="Invoice amount must be greater than zero.")
    if inv_type == "receivable" and not customer_id:
        raise HTTPException(status_code=400, detail="A customer must be selected for accounts receivable invoices.")
    if inv_type == "payable" and not supplier_id:
        raise HTTPException(status_code=400, detail="A supplier must be selected for accounts payable vendor bills.")

    inv_id = f"invc_{uuid.uuid4().hex[:12]}"
    inv_number = payload.get("invoiceNumber") or (
        f"INV-2026-{uuid.uuid4().hex[:4].upper()}" if inv_type == "receivable"
        else f"BILL-2026-{uuid.uuid4().hex[:4].upper()}"
    )

    issue_date = payload.get("issueDate") or to_iso_date(date.today())
    due_date = payload.get("dueDate") or issue_date

    invoice = Invoice(
        id=inv_id,
        business_id=business.id,
        invoice_number=inv_number,
        type=inv_type,
        customer_id=customer_id if inv_type == "receivable" else None,
        customer_order_id=payload.get("customerOrderId"),
        supplier_id=supplier_id if inv_type == "payable" else None,
        purchase_order_id=payload.get("purchaseOrderId"),
        amount_paise=amount,
        amount_paid_paise=0,
        status=payload.get("status", "sent"),
        issue_date=issue_date,
        due_date=due_date,
        notes=payload.get("notes"),
        created_at=to_iso_date(date.today()),
        updated_at=to_iso_date(date.today()),
    )
    db.add(invoice)

    counterparty_name = "Counterparty"
    # Update counterparty balance & fetch name
    if inv_type == "receivable" and customer_id:
        cust = db.query(Customer).filter(Customer.id == customer_id).first()
        if cust:
            counterparty_name = cust.name
            cust.outstanding_paise = (cust.outstanding_paise or 0) + amount
    elif inv_type == "payable" and supplier_id:
        supp = db.query(Supplier).filter(Supplier.id == supplier_id).first()
        if supp:
            counterparty_name = supp.name
            supp.outstanding_paise = (supp.outstanding_paise or 0) + amount

    # Record projected CashFlowEvent for real-time forecast calculations
    if invoice.status not in ("void", "cancelled"):
        cfe = CashFlowEvent(
            id=f"cfe_{uuid.uuid4().hex[:12]}",
            business_id=business.id,
            type="customer_payment" if inv_type == "receivable" else "supplier_payment",
            label=f"{'Expected Customer Receipt' if inv_type == 'receivable' else 'Scheduled Supplier Bill'} - {counterparty_name} ({inv_number})",
            direction="incoming" if inv_type == "receivable" else "outgoing",
            amount_paise=amount,
            date=due_date,
            related_invoice_id=invoice.id,
            is_projected=True,
            counterparty_name=counterparty_name,
            status="projected" if inv_type == "receivable" else "scheduled",
            created_at=to_iso_date(date.today()),
        )
        db.add(cfe)

    db.commit()
    db.refresh(invoice)
    return enrich_invoice(invoice, db)

@router.patch("/{id}")
def update_invoice(
    id: str,
    payload: dict,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    inv = db.query(Invoice).filter(Invoice.id == id, Invoice.business_id == business.id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if "notes" in payload: inv.notes = payload["notes"]
    if "dueDate" in payload:
        inv.due_date = payload["dueDate"]
        # Sync projected CashFlowEvent date
        proj_events = db.query(CashFlowEvent).filter(
            CashFlowEvent.related_invoice_id == inv.id,
            CashFlowEvent.is_projected == True,
        ).all()
        for pe in proj_events:
            pe.date = payload["dueDate"]
    if "status" in payload: inv.status = payload["status"]

    inv.updated_at = to_iso_date(date.today())
    db.commit()
    db.refresh(inv)
    return enrich_invoice(inv, db)

@router.post("/{id}/payments")
def record_invoice_payment(
    id: str,
    payload: dict,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    inv = db.query(Invoice).filter(Invoice.id == id, Invoice.business_id == business.id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if inv.status in ("void", "cancelled"):
        raise HTTPException(status_code=400, detail="Cannot record payment for a cancelled or void invoice.")

    try:
        amount = int(round(float(payload.get("amountPaise", 0))))
    except (ValueError, TypeError):
        amount = 0

    if amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be greater than zero.")

    remaining = max(0, inv.amount_paise - inv.amount_paid_paise)
    if amount > remaining:
        raise HTTPException(
            status_code=400,
            detail=f"Payment amount (₹{amount / 100:.2f}) exceeds remaining invoice balance (₹{remaining / 100:.2f})."
        )

    pay_date = payload.get("paymentDate") or to_iso_date(date.today())
    is_rec = (inv.type == "receivable")

    payment = Payment(
        id=f"pay_{uuid.uuid4().hex[:12]}",
        business_id=business.id,
        direction="incoming" if is_rec else "outgoing",
        invoice_id=inv.id,
        customer_id=inv.customer_id,
        supplier_id=inv.supplier_id,
        amount_paise=amount,
        status="completed",
        scheduled_date=pay_date,
        completed_date=pay_date,
        method=payload.get("method", "Bank Transfer"),
        created_at=to_iso_date(date.today()),
    )
    db.add(payment)

    inv.amount_paid_paise += amount
    if inv.amount_paid_paise >= inv.amount_paise:
        inv.status = "paid"
    else:
        inv.status = "partially_paid"
    inv.updated_at = to_iso_date(date.today())

    # Update counterparty outstanding balance
    if is_rec and inv.customer_id:
        cust = db.query(Customer).filter(Customer.id == inv.customer_id).first()
        if cust:
            cust.outstanding_paise = max(0, (cust.outstanding_paise or 0) - amount)
    elif not is_rec and inv.supplier_id:
        supp = db.query(Supplier).filter(Supplier.id == inv.supplier_id).first()
        if supp:
            supp.outstanding_paise = max(0, (supp.outstanding_paise or 0) - amount)

    # Cash movement: only recorded payments create real cash movement!
    cf_event = CashFlowEvent(
        id=f"evt_{uuid.uuid4().hex[:12]}",
        business_id=business.id,
        type="customer_payment" if is_rec else "supplier_payment",
        label=f"{'Receipt' if is_rec else 'Payment'} - {inv.invoice_number}",
        direction="incoming" if is_rec else "outgoing",
        amount_paise=amount,
        date=pay_date,
        related_invoice_id=inv.id,
        is_projected=False,
        status="completed",
        created_at=to_iso_date(date.today()),
    )
    db.add(cf_event)

    # Reduce or remove projected CashFlowEvent so forecast never double counts
    proj_events = db.query(CashFlowEvent).filter(
        CashFlowEvent.related_invoice_id == inv.id,
        CashFlowEvent.is_projected == True,
    ).all()
    for pe in proj_events:
        if inv.amount_paid_paise >= inv.amount_paise:
            db.delete(pe)
        else:
            new_amount = max(0, pe.amount_paise - amount)
            if new_amount == 0:
                db.delete(pe)
            else:
                pe.amount_paise = new_amount

    db.commit()
    db.refresh(payment)

    return {
        "id": payment.id,
        "direction": payment.direction,
        "invoiceId": payment.invoice_id,
        "customerId": payment.customer_id,
        "supplierId": payment.supplier_id,
        "amountPaise": payment.amount_paise,
        "status": payment.status,
        "scheduledDate": payment.scheduled_date,
        "completedDate": payment.completed_date,
        "method": payment.method,
    }

@router.post("/{id}/cancel")
def cancel_invoice(
    id: str,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    inv = db.query(Invoice).filter(Invoice.id == id, Invoice.business_id == business.id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if inv.amount_paid_paise >= inv.amount_paise and inv.amount_paise > 0:
        raise HTTPException(status_code=400, detail="Cannot cancel a fully settled invoice.")

    remaining = max(0, inv.amount_paise - inv.amount_paid_paise)
    inv.status = "void"
    inv.updated_at = to_iso_date(date.today())

    # Decrement counterparty outstanding
    if inv.type == "receivable" and inv.customer_id:
        cust = db.query(Customer).filter(Customer.id == inv.customer_id).first()
        if cust:
            cust.outstanding_paise = max(0, (cust.outstanding_paise or 0) - remaining)
    elif inv.type == "payable" and inv.supplier_id:
        supp = db.query(Supplier).filter(Supplier.id == inv.supplier_id).first()
        if supp:
            supp.outstanding_paise = max(0, (supp.outstanding_paise or 0) - remaining)

    # Delete any projected CashFlowEvent
    proj_events = db.query(CashFlowEvent).filter(
        CashFlowEvent.related_invoice_id == inv.id,
        CashFlowEvent.is_projected == True,
    ).all()
    for pe in proj_events:
        db.delete(pe)

    db.commit()
    db.refresh(inv)
    return enrich_invoice(inv, db)
