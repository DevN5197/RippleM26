from datetime import date
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.deps import get_current_business
from app.models.business import Business
from app.models.customer import Customer
from app.models.order import CustomerOrder
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.services.financial import enrich_customer, get_customer_summary, to_iso_date

router = APIRouter(prefix="/api/customers", tags=["customers"])

@router.get("")
def list_customers(
    search: str | None = None,
    status: str | None = None,
    sortBy: str | None = None,
    sortDir: str | None = "asc",
    page: int = Query(1, ge=1),
    pageSize: int = Query(50, ge=1, le=100),
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    query = db.query(Customer).filter(Customer.business_id == business.id)

    if status and status != "all":
        query = query.filter(Customer.status == status)

    if search:
        s = f"%{search.strip().lower()}%"
        query = query.filter(
            (Customer.name.ilike(s)) |
            (Customer.contact_name.ilike(s)) |
            (Customer.email.ilike(s))
        )

    all_customers = query.all()
    today = date.today()
    enriched = [enrich_customer(c, db, today) for c in all_customers]

    reverse = (sortDir == "desc")
    if sortBy == "name":
        enriched.sort(key=lambda x: x["name"].lower(), reverse=reverse)
    elif sortBy == "outstanding":
        enriched.sort(key=lambda x: x["calculatedOutstandingPaise"], reverse=reverse)
    elif sortBy == "overdue":
        enriched.sort(key=lambda x: x["overdueAmountPaise"], reverse=reverse)
    elif sortBy == "terms":
        enriched.sort(key=lambda x: x["creditTermsDays"], reverse=reverse)
    elif sortBy == "orders":
        enriched.sort(key=lambda x: x["orderCount"], reverse=reverse)
    elif sortBy == "reliability":
        enriched.sort(key=lambda x: (x["reliability"]["score"] or 0), reverse=reverse)
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
def customer_summary(
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    return get_customer_summary(business.id, db)

@router.get("/{id}")
def get_customer(
    id: str,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    customer = db.query(Customer).filter(
        Customer.id == id,
        Customer.business_id == business.id
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return enrich_customer(customer, db)

@router.get("/{id}/details")
def get_customer_details(
    id: str,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    customer = db.query(Customer).filter(
        Customer.id == id,
        Customer.business_id == business.id
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    today = date.today()
    enriched_c = enrich_customer(customer, db, today)

    orders = db.query(CustomerOrder).filter(CustomerOrder.customer_id == id).all()
    invoices = db.query(Invoice).filter(Invoice.customer_id == id, Invoice.type == "receivable").all()
    payments = db.query(Payment).filter(Payment.customer_id == id).all()

    total_orders_paise = sum(o.total_paise for o in orders)
    open_invoices_count = sum(1 for inv in invoices if inv.amount_paid_paise < inv.amount_paise and inv.status not in ("void", "cancelled"))

    return {
        "customer": enriched_c,
        "metrics": {
            "totalOrdersPaise": total_orders_paise,
            "totalInvoicedPaise": enriched_c["totalInvoicedPaise"],
            "totalPaidPaise": enriched_c["totalPaidPaise"],
            "outstandingPaise": enriched_c["calculatedOutstandingPaise"],
            "overdueBalancePaise": enriched_c["overdueAmountPaise"],
            "openInvoicesCount": open_invoices_count,
            "overdueInvoicesCount": enriched_c["overdueInvoicesCount"],
            "totalOrdersCount": len(orders),
            "reliability": enriched_c["reliability"],
        },
        "orders": [
            {
                "id": o.id,
                "customerId": o.customer_id,
                "productId": o.product_id,
                "quantity": o.quantity,
                "totalPaise": o.total_paise,
                "status": o.status,
                "orderDate": o.order_date,
                "deliveryDate": o.delivery_date,
            }
            for o in orders
        ],
        "invoices": [
            {
                "id": inv.id,
                "invoiceNumber": inv.invoice_number,
                "type": inv.type,
                "customerId": inv.customer_id,
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
                "customerId": pay.customer_id,
                "amountPaise": pay.amount_paise,
                "status": pay.status,
                "scheduledDate": pay.scheduled_date,
                "completedDate": pay.completed_date,
                "method": pay.method,
            }
            for pay in payments
        ],
    }

@router.post("", status_code=status.HTTP_201_CREATED)
def create_customer(
    payload: dict,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    name = payload.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Customer name is required")

    customer = Customer(
        id=f"cus_{uuid.uuid4().hex[:12]}",
        business_id=business.id,
        name=name,
        contact_name=payload.get("contactName"),
        email=payload.get("email"),
        phone=payload.get("phone"),
        address=payload.get("address"),
        tax_id=payload.get("taxId"),
        credit_terms_days=payload.get("creditTermsDays", 15),
        outstanding_paise=0,
        status=payload.get("status", "active"),
        notes=payload.get("notes"),
        created_at=to_iso_date(date.today()),
        updated_at=to_iso_date(date.today()),
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return enrich_customer(customer, db)

@router.patch("/{id}")
def update_customer(
    id: str,
    payload: dict,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    customer = db.query(Customer).filter(
        Customer.id == id,
        Customer.business_id == business.id
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    if "name" in payload and payload["name"]: customer.name = payload["name"].strip()
    if "contactName" in payload: customer.contact_name = payload["contactName"]
    if "email" in payload: customer.email = payload["email"]
    if "phone" in payload: customer.phone = payload["phone"]
    if "address" in payload: customer.address = payload["address"]
    if "taxId" in payload: customer.tax_id = payload["taxId"]
    if "creditTermsDays" in payload and payload["creditTermsDays"] is not None:
        customer.credit_terms_days = payload["creditTermsDays"]
    if "notes" in payload: customer.notes = payload["notes"]
    if "status" in payload: customer.status = payload["status"]

    customer.updated_at = to_iso_date(date.today())
    db.commit()
    db.refresh(customer)
    return enrich_customer(customer, db)

@router.post("/{id}/archive")
def archive_customer(
    id: str,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    customer = db.query(Customer).filter(
        Customer.id == id,
        Customer.business_id == business.id
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    customer.status = "archived"
    customer.updated_at = to_iso_date(date.today())
    db.commit()
    db.refresh(customer)
    return enrich_customer(customer, db)

@router.post("/{id}/unarchive")
def unarchive_customer(
    id: str,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    customer = db.query(Customer).filter(
        Customer.id == id,
        Customer.business_id == business.id
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    customer.status = "active"
    customer.updated_at = to_iso_date(date.today())
    db.commit()
    db.refresh(customer)
    return enrich_customer(customer, db)

@router.delete("/{id}")
def delete_customer(
    id: str,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    customer = db.query(Customer).filter(
        Customer.id == id,
        Customer.business_id == business.id
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    has_orders = db.query(CustomerOrder).filter(CustomerOrder.customer_id == id).first()
    has_invoices = db.query(Invoice).filter(Invoice.customer_id == id).first()
    enriched = enrich_customer(customer, db)

    if has_orders or has_invoices or enriched["calculatedOutstandingPaise"] > 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete customer with historical orders or open invoices. Archive instead."
        )

    db.delete(customer)
    db.commit()
    return {"success": True}
