from datetime import datetime, date, timedelta
from typing import Any
from sqlalchemy.orm import Session
from app.models.business import Business
from app.models.supplier import Supplier
from app.models.customer import Customer
from app.models.product import Product
from app.models.inventory import InventoryItem, InventoryMovement
from app.models.order import PurchaseOrder, CustomerOrder
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.models.cash_flow import CashFlowEvent

def parse_date(date_str: str | None) -> date:
    if not date_str:
        return date.today()
    try:
        return datetime.strptime(date_str[:10], "%Y-%m-%d").date()
    except Exception:
        return date.today()

def to_iso_date(d: date) -> str:
    return d.strftime("%Y-%m-%d")

# ---------------------------------------------------------------------------
# Suppliers
# ---------------------------------------------------------------------------

def enrich_supplier(s: Supplier, db: Session, today: date | None = None) -> dict[str, Any]:
    if today is None:
        today = date.today()

    pos = db.query(PurchaseOrder).filter(PurchaseOrder.supplier_id == s.id).all()
    invoices = db.query(Invoice).filter(Invoice.supplier_id == s.id).all()

    open_pos = [p for p in pos if p.status in ("draft", "sent", "confirmed", "partially_received", "delayed")]
    payable_invoices = [inv for inv in invoices if inv.type == "payable"]

    overdue_amount_paise = 0
    has_overdue = False
    next_payment_date = None
    next_payment_amount_paise = None

    upcoming_payments = []
    for inv in payable_invoices:
        outstanding = max(0, inv.amount_paise - inv.amount_paid_paise)
        if outstanding <= 0 or inv.status in ("void", "cancelled"):
            continue
        due = parse_date(inv.due_date)
        if due < today:
            overdue_amount_paise += outstanding
            has_overdue = True
        else:
            upcoming_payments.append((due, outstanding))

    upcoming_payments.sort(key=lambda x: x[0])
    if upcoming_payments:
        next_payment_date = to_iso_date(upcoming_payments[0][0])
        next_payment_amount_paise = upcoming_payments[0][1]

    risk_reasons = []
    is_at_risk = False
    if s.reliability_score < 75:
        risk_reasons.append(f"Low reliability score ({s.reliability_score}%)")
        is_at_risk = True
    if has_overdue:
        risk_reasons.append(f"Overdue payables ({overdue_amount_paise / 100:.0f} INR)")
        is_at_risk = True

    return {
        "id": s.id,
        "businessId": s.business_id,
        "name": s.name,
        "contactName": s.contact_name,
        "email": s.email,
        "phone": s.phone,
        "address": s.address,
        "taxId": s.tax_id,
        "paymentTermsDays": s.payment_terms_days,
        "outstandingPaise": s.outstanding_paise,
        "reliabilityScore": s.reliability_score,
        "status": s.status,
        "leadTimeDays": s.lead_time_days or 7,
        "notes": s.notes,
        "createdAt": s.created_at,
        "updatedAt": s.updated_at,
        "openPoCount": len(open_pos),
        "totalPoCount": len(pos),
        "nextPaymentDate": next_payment_date,
        "nextPaymentAmountPaise": next_payment_amount_paise,
        "overdueAmountPaise": overdue_amount_paise,
        "hasOverdue": has_overdue,
        "isAtRisk": is_at_risk,
        "riskReasons": risk_reasons,
        "payableInvoicesCount": len(payable_invoices),
    }

def get_supplier_summary(business_id: str, db: Session) -> dict[str, Any]:
    suppliers = db.query(Supplier).filter(Supplier.business_id == business_id).all()
    today = date.today()
    in7days = today + timedelta(days=7)

    total = len(suppliers)
    active = sum(1 for s in suppliers if s.status == "active")
    archived = total - active

    total_outstanding = 0
    due_in_7 = 0
    overdue_paise = 0
    at_risk_count = 0

    invoices = db.query(Invoice).filter(
        Invoice.business_id == business_id,
        Invoice.type == "payable"
    ).all()

    for inv in invoices:
        outstanding = max(0, inv.amount_paise - inv.amount_paid_paise)
        if outstanding <= 0 or inv.status in ("void", "cancelled"):
            continue
        total_outstanding += outstanding
        due = parse_date(inv.due_date)
        if due < today:
            overdue_paise += outstanding
        elif due <= in7days:
            due_in_7 += outstanding

    for s in suppliers:
        if s.reliability_score < 75:
            at_risk_count += 1

    return {
        "totalSuppliers": total,
        "activeSuppliers": active,
        "archivedSuppliers": archived,
        "totalOutstandingPayablesPaise": total_outstanding,
        "dueInSevenDaysPaise": due_in_7,
        "overduePayablesPaise": overdue_paise,
        "atRiskSuppliersCount": at_risk_count,
    }

# ---------------------------------------------------------------------------
# Customers
# ---------------------------------------------------------------------------

def calculate_payment_reliability(payments: list[Payment], invoices: list[Invoice]) -> dict[str, Any]:
    if not payments:
        return {
            "score": None,
            "category": "Insufficient payment history",
            "transactionCount": 0,
            "onTimeCount": 0,
            "lateCount": 0,
            "averageLatenessDays": 0,
            "hasSufficientHistory": False,
            "notes": "No recorded payment transactions.",
        }

    invoice_map = {inv.id: inv for inv in invoices}
    on_time = 0
    late = 0
    total_lateness = 0

    for p in payments:
        inv = invoice_map.get(p.invoice_id)
        if inv and p.completed_date:
            c_date = parse_date(p.completed_date)
            d_date = parse_date(inv.due_date)
            diff = (c_date - d_date).days
            if diff <= 0:
                on_time += 1
            else:
                late += 1
                total_lateness += diff
        else:
            on_time += 1

    total = on_time + late
    if total < 2:
        return {
            "score": None,
            "category": "Insufficient payment history",
            "transactionCount": total,
            "onTimeCount": on_time,
            "lateCount": late,
            "averageLatenessDays": round(total_lateness / max(1, late), 1),
            "hasSufficientHistory": False,
            "notes": "Fewer than 2 completed transactions.",
        }

    score = round((on_time / total) * 100)
    category = "Fair"
    if score >= 90:
        category = "Excellent"
    elif score >= 75:
        category = "Good"
    elif score >= 50:
        category = "Fair"
    elif score >= 30:
        category = "Poor"
    else:
        category = "Very poor"

    return {
        "score": score,
        "category": category,
        "transactionCount": total,
        "onTimeCount": on_time,
        "lateCount": late,
        "averageLatenessDays": round(total_lateness / max(1, late), 1),
        "hasSufficientHistory": True,
        "notes": f"{on_time} on-time out of {total} payments.",
    }

def enrich_customer(c: Customer, db: Session, today: date | None = None) -> dict[str, Any]:
    if today is None:
        today = date.today()

    orders = db.query(CustomerOrder).filter(CustomerOrder.customer_id == c.id).all()
    invoices = db.query(Invoice).filter(Invoice.customer_id == c.id).all()
    payments = db.query(Payment).filter(Payment.customer_id == c.id).all()

    calc_outstanding = 0
    overdue_count = 0
    overdue_paise = 0
    total_invoiced = 0
    total_paid = 0

    for inv in invoices:
        total_invoiced += inv.amount_paise
        total_paid += inv.amount_paid_paise
        outstanding = max(0, inv.amount_paise - inv.amount_paid_paise)
        if outstanding > 0 and inv.status not in ("void", "cancelled"):
            calc_outstanding += outstanding
            due = parse_date(inv.due_date)
            if due < today:
                overdue_count += 1
                overdue_paise += outstanding

    reliability = calculate_payment_reliability(payments, invoices)

    return {
        "id": c.id,
        "businessId": c.business_id,
        "name": c.name,
        "contactName": c.contact_name,
        "email": c.email,
        "phone": c.phone,
        "address": c.address,
        "taxId": c.tax_id,
        "creditTermsDays": c.credit_terms_days,
        "outstandingPaise": calc_outstanding,
        "status": c.status,
        "notes": c.notes,
        "createdAt": c.created_at,
        "updatedAt": c.updated_at,
        "calculatedOutstandingPaise": calc_outstanding,
        "overdueInvoicesCount": overdue_count,
        "overdueAmountPaise": overdue_paise,
        "totalInvoicedPaise": total_invoiced,
        "totalPaidPaise": total_paid,
        "orderCount": len(orders),
        "invoiceCount": len(invoices),
        "paymentCount": len(payments),
        "reliability": reliability,
    }

def get_customer_summary(business_id: str, db: Session) -> dict[str, Any]:
    customers = db.query(Customer).filter(Customer.business_id == business_id).all()
    today = date.today()

    total = len(customers)
    active = sum(1 for c in customers if c.status == "active")
    archived = total - active

    total_outstanding = 0
    total_overdue = 0
    overdue_custs = set()
    scores = []

    for c in customers:
        enriched = enrich_customer(c, db, today)
        total_outstanding += enriched["calculatedOutstandingPaise"]
        total_overdue += enriched["overdueAmountPaise"]
        if enriched["overdueInvoicesCount"] > 0:
            overdue_custs.add(c.id)
        if enriched["reliability"]["score"] is not None:
            scores.append(enriched["reliability"]["score"])

    avg_score = round(sum(scores) / len(scores)) if scores else None

    return {
        "totalCustomers": total,
        "activeCustomers": active,
        "archivedCustomers": archived,
        "totalOutstandingPaise": total_outstanding,
        "totalOverduePaise": total_overdue,
        "overdueCustomersCount": len(overdue_custs),
        "averageReliabilityScore": avg_score,
    }

# ---------------------------------------------------------------------------
# Inventory & Products
# ---------------------------------------------------------------------------

def enrich_inventory_item(product: Product, db: Session) -> dict[str, Any]:
    inv = db.query(InventoryItem).filter(InventoryItem.product_id == product.id).first()
    supplier = db.query(Supplier).filter(Supplier.id == product.preferred_supplier_id).first() if product.preferred_supplier_id else None

    stock_on_hand = inv.quantity_on_hand if inv else 0
    reserved = inv.quantity_reserved if inv else 0
    incoming = inv.quantity_on_order if inv else 0
    available = max(0, stock_on_hand - reserved)
    reorder = product.reorder_point

    if stock_on_hand == 0 and incoming > 0:
        status_val = "incoming_stock"
        status_label = "Incoming Stock"
    elif available == 0:
        status_val = "out_of_stock"
        status_label = "Out of Stock"
    elif available < (reorder / 2):
        status_val = "stockout_risk"
        status_label = "Stockout Risk"
    elif available < reorder:
        status_val = "low_stock"
        status_label = "Low Stock"
    else:
        status_val = "healthy"
        status_label = "Healthy"

    valuation = stock_on_hand * product.unit_cost_paise

    return {
        "product": {
            "id": product.id,
            "businessId": product.business_id,
            "sku": product.sku,
            "name": product.name,
            "unitCostPaise": product.unit_cost_paise,
            "unitPricePaise": product.unit_price_paise,
            "reorderPoint": product.reorder_point,
            "category": product.category,
            "description": product.description,
            "unitOfMeasure": product.unit_of_measure,
            "preferredSupplierId": product.preferred_supplier_id,
            "currency": product.currency,
        },
        "inventory": {
            "id": inv.id if inv else f"inv_{product.id}",
            "productId": product.id,
            "quantityOnHand": stock_on_hand,
            "quantityReserved": reserved,
            "quantityOnOrder": incoming,
            "expectedRestockDate": inv.expected_restock_date if inv else None,
            "updatedAt": inv.updated_at if inv else to_iso_date(date.today()),
        },
        "stockOnHand": stock_on_hand,
        "reservedStock": reserved,
        "availableStock": available,
        "incomingStock": incoming,
        "reorderThreshold": reorder,
        "nextExpectedDelivery": inv.expected_restock_date if inv else None,
        "unitCostPaise": product.unit_cost_paise,
        "inventoryValuationPaise": valuation,
        "status": status_val,
        "statusLabel": status_label,
        "preferredSupplier": {
            "id": supplier.id,
            "businessId": supplier.business_id,
            "name": supplier.name,
            "paymentTermsDays": supplier.payment_terms_days,
            "outstandingPaise": supplier.outstanding_paise,
            "reliabilityScore": supplier.reliability_score,
            "status": supplier.status,
        } if supplier else None,
    }

def get_inventory_summary(business_id: str, db: Session) -> dict[str, Any]:
    products = db.query(Product).filter(Product.business_id == business_id).all()
    rows = [enrich_inventory_item(p, db) for p in products]

    total_products = len(rows)
    total_available = sum(r["availableStock"] for r in rows)
    low_stock = sum(1 for r in rows if r["status"] == "low_stock")
    stockout_risk = sum(1 for r in rows if r["status"] == "stockout_risk")
    incoming_units = sum(r["incomingStock"] for r in rows)
    valuation = sum(r["inventoryValuationPaise"] for r in rows)

    return {
        "totalProducts": total_products,
        "totalAvailableUnits": total_available,
        "lowStockCount": low_stock,
        "stockoutRiskCount": stockout_risk,
        "incomingUnits": incoming_units,
        "estimatedValuationPaise": valuation,
    }

# ---------------------------------------------------------------------------
# Invoices
# ---------------------------------------------------------------------------

def enrich_invoice(inv: Invoice, db: Session, today: date | None = None) -> dict[str, Any]:
    if today is None:
        today = date.today()

    due = parse_date(inv.due_date)
    outstanding = max(0, inv.amount_paise - inv.amount_paid_paise)
    days_overdue = max(0, (today - due).days) if outstanding > 0 and inv.status not in ("void", "cancelled") else 0
    is_overdue = days_overdue > 0

    if days_overdue <= 0:
        bucket = "current"
    elif days_overdue <= 7:
        bucket = "1_7"
    elif days_overdue <= 30:
        bucket = "8_30"
    elif days_overdue <= 60:
        bucket = "31_60"
    else:
        bucket = "over_60"

    counterparty_name = "Unknown"
    counterparty_type = "customer" if inv.type == "receivable" else "supplier"

    if inv.type == "receivable" and inv.customer_id:
        cust = db.query(Customer).filter(Customer.id == inv.customer_id).first()
        if cust:
            counterparty_name = cust.name
    elif inv.type == "payable" and inv.supplier_id:
        supp = db.query(Supplier).filter(Supplier.id == inv.supplier_id).first()
        if supp:
            counterparty_name = supp.name

    return {
        "id": inv.id,
        "invoiceNumber": inv.invoice_number,
        "type": inv.type,
        "customerId": inv.customer_id,
        "customerOrderId": inv.customer_order_id,
        "supplierId": inv.supplier_id,
        "purchaseOrderId": inv.purchase_order_id,
        "amountPaise": inv.amount_paise,
        "amountPaidPaise": inv.amount_paid_paise,
        "status": inv.status,
        "issueDate": inv.issue_date,
        "dueDate": inv.due_date,
        "notes": inv.notes,
        "createdAt": inv.created_at,
        "counterpartyName": counterparty_name,
        "counterpartyType": counterparty_type,
        "daysOverdue": days_overdue,
        "agingBucket": bucket,
        "isOverdue": is_overdue,
        "outstandingPaise": outstanding,
    }

def get_invoice_summary(business_id: str, db: Session) -> dict[str, Any]:
    invoices = db.query(Invoice).filter(Invoice.business_id == business_id).all()
    today = date.today()
    enriched = [enrich_invoice(i, db, today) for i in invoices]

    receivables = [i for i in enriched if i["type"] == "receivable"]
    payables = [i for i in enriched if i["type"] == "payable"]

    total_receivables = sum(i["amountPaise"] for i in receivables)
    total_payables = sum(i["amountPaise"] for i in payables)
    paid_paise = sum(i["amountPaidPaise"] for i in enriched)

    outstanding_rec = sum(i["outstandingPaise"] for i in receivables if i["status"] not in ("void", "cancelled"))
    outstanding_pay = sum(i["outstandingPaise"] for i in payables if i["status"] not in ("void", "cancelled"))

    overdue_rec = sum(i["outstandingPaise"] for i in receivables if i["isOverdue"])
    overdue_pay = sum(i["outstandingPaise"] for i in payables if i["isOverdue"])
    overdue_count = sum(1 for i in enriched if i["isOverdue"])

    # Aging breakdown across overdue unpaid invoices
    b1_7_paise, b1_7_count = 0, 0
    b8_30_paise, b8_30_count = 0, 0
    b31_60_paise, b31_60_count = 0, 0
    bover_paise, bover_count = 0, 0

    for i in enriched:
        if i["isOverdue"] and i["outstandingPaise"] > 0:
            b = i["agingBucket"]
            amt = i["outstandingPaise"]
            if b == "1_7":
                b1_7_paise += amt
                b1_7_count += 1
            elif b == "8_30":
                b8_30_paise += amt
                b8_30_count += 1
            elif b == "31_60":
                b31_60_paise += amt
                b31_60_count += 1
            elif b == "over_60":
                bover_paise += amt
                bover_count += 1

    return {
        "totalInvoices": len(invoices),
        "totalReceivablesPaise": total_receivables,
        "totalPayablesPaise": total_payables,
        "overdueReceivablesPaise": overdue_rec,
        "overduePayablesPaise": overdue_pay,
        "overdueInvoicesCount": overdue_count,
        "paidPaise": paid_paise,
        "outstandingReceivablesPaise": outstanding_rec,
        "outstandingPayablesPaise": outstanding_pay,
        "aging": {
            "bucket1to7Paise": b1_7_paise,
            "bucket1to7Count": b1_7_count,
            "bucket8to30Paise": b8_30_paise,
            "bucket8to30Count": b8_30_count,
            "bucket31to60Paise": b31_60_paise,
            "bucket31to60Count": b31_60_count,
            "bucketOver60Paise": bover_paise,
            "bucketOver60Count": bover_count,
        },
    }
