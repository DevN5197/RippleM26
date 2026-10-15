from datetime import date
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.deps import get_current_business
from app.models.business import Business
from app.models.supplier import Supplier
from app.models.order import PurchaseOrder, PurchaseOrderLineItem
from app.models.product import Product
from app.models.inventory import InventoryItem, InventoryMovement
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.models.cash_flow import CashFlowEvent
from app.services.financial import to_iso_date

router = APIRouter(prefix="/api/purchase-orders", tags=["purchase-orders"])

def enrich_po(po: PurchaseOrder, db: Session) -> dict:
    supplier = db.query(Supplier).filter(Supplier.id == po.supplier_id).first()
    line_items_data = []
    total_qty = 0

    for li in po.line_items:
        prod = db.query(Product).filter(Product.id == li.product_id).first()
        total_qty += li.quantity
        line_items_data.append({
            "id": li.id,
            "purchaseOrderId": li.purchase_order_id,
            "productId": li.product_id,
            "quantity": li.quantity,
            "unitPricePaise": li.unit_price_paise,
            "totalPaise": li.total_paise,
            "receivedQuantity": li.received_quantity,
            "product": {
                "id": prod.id,
                "sku": prod.sku,
                "name": prod.name,
                "unitCostPaise": prod.unit_cost_paise,
            } if prod else None,
        })

    received_units = po.received_quantity or sum(li.received_quantity for li in po.line_items)

    return {
        "id": po.id,
        "poNumber": po.po_number,
        "supplierId": po.supplier_id,
        "supplier": {
            "id": supplier.id,
            "name": supplier.name,
            "contactName": supplier.contact_name,
            "email": supplier.email,
            "paymentTermsDays": supplier.payment_terms_days,
            "reliabilityScore": supplier.reliability_score,
            "status": supplier.status,
        } if supplier else None,
        "quantity": total_qty,
        "orderedUnits": total_qty,
        "receivedUnits": received_units,
        "receivedQuantity": received_units,
        "lineItems": line_items_data,
        "lineItemsDetails": line_items_data,
        "totalPaise": po.total_paise,
        "advancePaidPaise": po.advance_paid_paise,
        "outstandingPaise": max(0, po.total_paise - po.advance_paid_paise),
        "status": po.status,
        "orderDate": po.order_date,
        "expectedDeliveryDate": po.expected_delivery_date,
        "paymentTermsDays": po.payment_terms_days,
        "paymentDueDate": po.payment_due_date,
        "notes": po.notes,
    }

@router.get("")
def list_purchase_orders(
    supplierId: str | None = None,
    status: str | None = None,
    search: str | None = None,
    page: int = Query(1, ge=1),
    pageSize: int = Query(50, ge=1, le=100),
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    query = db.query(PurchaseOrder).filter(PurchaseOrder.business_id == business.id)

    if supplierId:
        query = query.filter(PurchaseOrder.supplier_id == supplierId)
    if status and status != "all":
        query = query.filter(PurchaseOrder.status == status)
    if search:
        s = f"%{search.strip().lower()}%"
        query = query.filter(PurchaseOrder.po_number.ilike(s))

    pos = query.order_by(PurchaseOrder.order_date.desc()).all()
    enriched = [enrich_po(p, db) for p in pos]

    total = len(enriched)
    start = (page - 1) * pageSize
    paged = enriched[start : start + pageSize]

    return {
        "data": paged,
        "total": total,
        "page": page,
        "pageSize": pageSize,
    }

@router.get("/{id}")
def get_purchase_order(
    id: str,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    po = db.query(PurchaseOrder).filter(
        (PurchaseOrder.id == id) | (PurchaseOrder.po_number == id),
        PurchaseOrder.business_id == business.id
    ).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return enrich_po(po, db)

@router.post("", status_code=status.HTTP_201_CREATED)
def create_purchase_order(
    payload: dict,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    supplier_id = payload.get("supplierId")
    line_items = payload.get("lineItems", [])

    if not supplier_id:
        raise HTTPException(status_code=400, detail="Supplier is required")
    if not line_items:
        raise HTTPException(status_code=400, detail="At least one line item is required")

    supplier = db.query(Supplier).filter(Supplier.id == supplier_id, Supplier.business_id == business.id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    for li in line_items:
        prod_id = li.get("productId")
        prod = db.query(Product).filter(Product.id == prod_id, Product.business_id == business.id).first()
        if not prod:
            raise HTTPException(status_code=404, detail=f"Product {prod_id} not found in this business.")

    po_id = f"po_{uuid.uuid4().hex[:12]}"
    po_number = f"PO-2026-{uuid.uuid4().hex[:4].upper()}"

    total_paise = sum(li.get("quantity", 0) * li.get("unitPricePaise", 0) for li in line_items)
    advance_amt = payload.get("advanceAmountPaise", 0)

    try:
        po = PurchaseOrder(
            id=po_id,
            business_id=business.id,
            po_number=po_number,
            supplier_id=supplier_id,
            total_paise=total_paise,
            advance_paid_paise=advance_amt,
            status="sent" if advance_amt > 0 else "draft",
            order_date=payload.get("orderDate") or to_iso_date(date.today()),
            expected_delivery_date=payload.get("expectedDeliveryDate"),
            payment_terms_days=payload.get("paymentTermsDays") or supplier.payment_terms_days,
            notes=payload.get("notes"),
            received_quantity=0,
            created_at=to_iso_date(date.today()),
            updated_at=to_iso_date(date.today()),
        )
        db.add(po)
        db.flush()

        for li in line_items:
            prod_id = li.get("productId")
            qty = li.get("quantity", 0)
            price = li.get("unitPricePaise", 0)
            tot = qty * price

            poli = PurchaseOrderLineItem(
                id=f"poli_{uuid.uuid4().hex[:12]}",
                purchase_order_id=po_id,
                product_id=prod_id,
                quantity=qty,
                unit_price_paise=price,
                total_paise=tot,
                received_quantity=0,
            )
            db.add(poli)

            # Update inventory quantityOnOrder
            inv = db.query(InventoryItem).filter(InventoryItem.product_id == prod_id, InventoryItem.business_id == business.id).first()
            if inv:
                inv.quantity_on_order += qty
                inv.updated_at = to_iso_date(date.today())

        # If advance is recorded, update supplier balance, record payment and cash flow event
        if advance_amt > 0:
            pay_id = f"pay_{uuid.uuid4().hex[:12]}"
            payment = Payment(
                id=pay_id,
                business_id=business.id,
                direction="outgoing",
                purchase_order_id=po_id,
                supplier_id=supplier_id,
                amount_paise=advance_amt,
                status="completed",
                scheduled_date=po.order_date,
                completed_date=po.order_date,
                method="Advance Transfer",
                created_at=to_iso_date(date.today()),
            )
            db.add(payment)

            cf_event = CashFlowEvent(
                id=f"evt_{uuid.uuid4().hex[:12]}",
                business_id=business.id,
                type="supplier_payment",
                label=f"Advance - {po_number}",
                direction="outgoing",
                amount_paise=advance_amt,
                date=po.order_date,
                related_purchase_order_id=po_id,
                is_projected=False,
                counterparty_name=supplier.name,
                status="completed",
                created_at=to_iso_date(date.today()),
            )
            db.add(cf_event)

        db.commit()
        db.refresh(po)
        return enrich_po(po, db)
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise

@router.patch("/{id}/status")
def update_po_status(
    id: str,
    payload: dict,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == id, PurchaseOrder.business_id == business.id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    new_status = payload.get("status")
    if new_status:
        try:
            po.status = new_status
            po.updated_at = to_iso_date(date.today())
            db.commit()
            db.refresh(po)
        except Exception:
            db.rollback()
            raise

    return po

@router.post("/{id}/receive")
def record_po_receipt(
    id: str,
    payload: dict,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == id, PurchaseOrder.business_id == business.id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    receipts = payload.get("receipts", [])
    notes = payload.get("notes")
    receipt_date = to_iso_date(date.today())

    try:
        total_received_now = 0
        for rec in receipts:
            prod_id = rec.get("productId")
            qty = rec.get("quantity", 0)
            if qty <= 0:
                continue

            prod = db.query(Product).filter(Product.id == prod_id, Product.business_id == business.id).first()
            if not prod:
                raise HTTPException(status_code=404, detail=f"Product {prod_id} not found in this business.")

            inv = db.query(InventoryItem).filter(InventoryItem.product_id == prod_id, InventoryItem.business_id == business.id).first()
            if not inv:
                inv = InventoryItem(
                    id=f"inv_{uuid.uuid4().hex[:12]}",
                    business_id=business.id,
                    product_id=prod_id,
                    quantity_on_hand=qty,
                    quantity_reserved=0,
                    quantity_on_order=0,
                    updated_at=receipt_date,
                )
                db.add(inv)
            else:
                inv.quantity_on_hand += qty
                inv.quantity_on_order = max(0, inv.quantity_on_order - qty)
                inv.updated_at = receipt_date

            line_item = next((li for li in po.line_items if li.product_id == prod_id), None)
            if line_item:
                line_item.received_quantity += qty

            total_received_now += qty

            mov = InventoryMovement(
                id=f"mov_{uuid.uuid4().hex[:12]}",
                business_id=business.id,
                product_id=prod_id,
                type="receipt",
                quantity=qty,
                resulting_balance=inv.quantity_on_hand,
                date=receipt_date,
                reference_type="purchase_order",
                reference_id=po.po_number or po.id,
                note=notes or f"Receipt against {po.po_number or po.id}",
                created_at=receipt_date,
            )
            db.add(mov)

        po.received_quantity = (po.received_quantity or 0) + total_received_now
        total_ordered = sum(li.quantity for li in po.line_items) if po.line_items else (po.quantity or 0)
        if po.received_quantity >= total_ordered:
            po.status = "received"
        else:
            po.status = "partially_received"

        po.updated_at = receipt_date
        db.commit()
        db.refresh(po)
        return enrich_po(po, db)
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise
