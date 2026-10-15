from datetime import date, timedelta
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.deps import get_current_business
from app.models.business import Business
from app.models.product import Product
from app.models.inventory import InventoryItem, InventoryMovement
from app.models.supplier import Supplier
from app.models.order import PurchaseOrder, CustomerOrder
from app.models.customer import Customer
from app.services.financial import enrich_inventory_item, get_inventory_summary, to_iso_date

router = APIRouter(prefix="/api/inventory", tags=["inventory"])

@router.get("")
def list_inventory(
    search: str | None = None,
    category: str | None = None,
    status: str | None = None,
    sortBy: str | None = None,
    sortDir: str | None = "asc",
    page: int = Query(1, ge=1),
    pageSize: int = Query(50, ge=1, le=100),
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    query = db.query(Product).filter(Product.business_id == business.id)

    if category and category != "all":
        query = query.filter(Product.category == category)

    if search:
        s = f"%{search.strip().lower()}%"
        query = query.filter(
            (Product.name.ilike(s)) |
            (Product.sku.ilike(s)) |
            (Product.category.ilike(s))
        )

    products = query.all()
    rows = [enrich_inventory_item(p, db) for p in products]

    if status and status != "all":
        rows = [r for r in rows if r["status"] == status]

    reverse = (sortDir == "desc")
    if sortBy == "name":
        rows.sort(key=lambda r: r["product"]["name"].lower(), reverse=reverse)
    elif sortBy == "available":
        rows.sort(key=lambda r: r["availableStock"], reverse=reverse)
    elif sortBy == "onHand":
        rows.sort(key=lambda r: r["stockOnHand"], reverse=reverse)
    elif sortBy == "cost":
        rows.sort(key=lambda r: r["unitCostPaise"], reverse=reverse)
    elif sortBy == "status":
        rows.sort(key=lambda r: r["status"], reverse=reverse)
    else:
        rows.sort(key=lambda r: r["product"]["name"].lower())

    total = len(rows)
    start = (page - 1) * pageSize
    paged = rows[start : start + pageSize]

    return {
        "data": paged,
        "total": total,
        "page": page,
        "pageSize": pageSize,
    }

@router.get("/summary")
def inventory_summary(
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    return get_inventory_summary(business.id, db)

@router.get("/reorder-recommendations")
def reorder_recommendations(
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    products = db.query(Product).filter(Product.business_id == business.id).all()
    recommendations = []

    for product in products:
        enriched = enrich_inventory_item(product, db)
        preferred_supplier = enriched["preferredSupplier"]

        cust_orders = db.query(CustomerOrder).filter(
            CustomerOrder.product_id == product.id,
            CustomerOrder.status == "confirmed"
        ).all()

        commitments_at_risk = []
        for co in cust_orders:
            cust = db.query(Customer).filter(Customer.id == co.customer_id).first()
            commitments_at_risk.append(f"{cust.name if cust else 'Customer'} ({co.quantity} units due {co.delivery_date or 'soon'})")

        is_low = enriched["availableStock"] < product.reorder_point
        is_stockout_risk = enriched["status"] == "stockout_risk"
        is_out_of_stock = enriched["availableStock"] == 0

        if is_low or is_stockout_risk or is_out_of_stock:
            lead_days = preferred_supplier["paymentTermsDays"] if preferred_supplier else 15
            today = date.today()
            delivery_date = today + timedelta(days=lead_days)

            target_stock = max(product.reorder_point * 2, 20)
            current_deficit = target_stock - enriched["availableStock"] - enriched["incomingStock"]
            suggested_reorder_qty = max(10, current_deficit if current_deficit > 0 else 10)

            proposed_amount = suggested_reorder_qty * product.unit_cost_paise
            required_advance = round(proposed_amount * 0.15) if preferred_supplier else 0

            forecast_demand = max(5, sum(co.quantity for co in cust_orders))

            reason = ""
            if enriched["stockOnHand"] == 0 and enriched["incomingStock"] == 0:
                reason = "Zero stock on hand and no incoming purchase order."
            elif is_stockout_risk:
                reason = f"Committed orders ({sum(co.quantity for co in cust_orders)} units) exceed available stock ({enriched['availableStock']} units)."
            else:
                reason = f"Available stock ({enriched['availableStock']} units) is below reorder threshold ({product.reorder_point} units)."

            recommendations.append({
                "productId": product.id,
                "productName": product.name,
                "sku": product.sku,
                "category": product.category,
                "currentAvailableStock": enriched["availableStock"],
                "reorderPoint": product.reorder_point,
                "incomingQuantity": enriched["incomingStock"],
                "forecastDemand": forecast_demand,
                "estimatedStockoutDate": enriched["nextExpectedDelivery"],
                "suggestedReorderQuantity": suggested_reorder_qty,
                "preferredSupplierId": preferred_supplier["id"] if preferred_supplier else None,
                "preferredSupplierName": preferred_supplier["name"] if preferred_supplier else None,
                "preferredSupplierLeadDays": lead_days,
                "estimatedDeliveryDate": to_iso_date(delivery_date),
                "proposedPurchaseAmountPaise": proposed_amount,
                "requiredAdvancePaise": required_advance,
                "relatedCustomerOrderCount": len(cust_orders),
                "customerCommitmentsAtRisk": commitments_at_risk,
                "reason": reason,
                "hasSufficientData": True,
            })

    return recommendations

@router.get("/alerts")
def inventory_alerts(
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    products = db.query(Product).filter(Product.business_id == business.id).all()
    alerts = []

    for product in products:
        enriched = enrich_inventory_item(product, db)
        if enriched["status"] == "stockout_risk":
            alerts.append({
                "id": f"alert_inv_{product.id}",
                "severity": "critical",
                "category": "projected_stockout",
                "title": f"Projected stockout: {product.name} ({product.sku})",
                "explanation": f"Only {enriched['availableStock']} units available. Committed orders exceed available stock.",
                "productId": product.id,
                "productName": product.name,
                "sku": product.sku,
                "financialImpactPaise": product.unit_price_paise * max(1, product.reorder_point),
                "actionType": "simulate",
            })
        elif enriched["status"] == "out_of_stock":
            alerts.append({
                "id": f"alert_inv_{product.id}",
                "severity": "critical",
                "category": "projected_stockout",
                "title": f"Out of stock: {product.name} ({product.sku})",
                "explanation": "Zero units on hand and reorder required to maintain catalog availability.",
                "productId": product.id,
                "productName": product.name,
                "sku": product.sku,
                "financialImpactPaise": product.unit_cost_paise * 10,
                "actionType": "view_product",
            })
        elif enriched["status"] == "low_stock":
            alerts.append({
                "id": f"alert_inv_{product.id}",
                "severity": "warning",
                "category": "delayed_supplier_delivery",
                "title": f"Low stock: {product.name} ({product.sku})",
                "explanation": f"Available stock ({enriched['availableStock']} units) is below reorder point ({product.reorder_point} units).",
                "productId": product.id,
                "productName": product.name,
                "sku": product.sku,
                "financialImpactPaise": product.unit_cost_paise * product.reorder_point,
                "actionType": "view_po",
            })

    return alerts

@router.get("/{productId}")
def get_product(
    productId: str,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(
        Product.id == productId,
        Product.business_id == business.id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    enriched = enrich_inventory_item(product, db)
    movements = db.query(InventoryMovement).filter(InventoryMovement.product_id == productId).all()
    pos = db.query(PurchaseOrder).join(PurchaseOrder.line_items).filter(PurchaseOrder.line_items.any(product_id=productId)).all()
    cos = db.query(CustomerOrder).filter(CustomerOrder.product_id == productId).all()

    co_details = []
    for co in cos:
        cust = db.query(Customer).filter(Customer.id == co.customer_id).first()
        co_details.append({
            "id": co.id,
            "customerId": co.customer_id,
            "customerName": cust.name if cust else "Customer",
            "productId": co.product_id,
            "quantity": co.quantity,
            "totalPaise": co.total_paise,
            "status": co.status,
            "orderDate": co.order_date,
            "deliveryDate": co.delivery_date,
        })

    return {
        **enriched,
        "movements": [
            {
                "id": m.id,
                "businessId": m.business_id,
                "productId": m.product_id,
                "type": m.type,
                "quantity": m.quantity,
                "resultingBalance": m.resulting_balance,
                "date": m.date,
                "referenceType": m.reference_type,
                "referenceId": m.reference_id,
                "note": m.note,
                "createdAt": m.created_at,
            }
            for m in movements
        ],
        "purchaseOrders": [
            {
                "id": p.id,
                "poNumber": p.po_number,
                "supplierId": p.supplier_id,
                "totalPaise": p.total_paise,
                "status": p.status,
                "orderDate": p.order_date,
                "expectedDeliveryDate": p.expected_delivery_date,
            }
            for p in pos
        ],
        "customerOrders": co_details,
        "forecastDemand": max(10, sum(c["quantity"] for c in co_details)),
    }

@router.post("", status_code=status.HTTP_201_CREATED)
def create_product(
    payload: dict,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    sku = payload.get("sku", "").strip().upper()
    name = payload.get("name", "").strip()

    if not sku:
        raise HTTPException(status_code=400, detail="SKU is required")
    if not name:
        raise HTTPException(status_code=400, detail="Product name is required")

    existing = db.query(Product).filter(
        Product.business_id == business.id,
        Product.sku == sku
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f'SKU "{sku}" already exists.')

    prod_id = f"prod_{uuid.uuid4().hex[:12]}"
    pref_sup_id = payload.get("preferredSupplierId")
    if pref_sup_id:
        sup = db.query(Supplier).filter(Supplier.id == pref_sup_id, Supplier.business_id == business.id).first()
        if not sup:
            raise HTTPException(status_code=404, detail="Preferred supplier not found in this business.")

    try:
        product = Product(
            id=prod_id,
            business_id=business.id,
            sku=sku,
            name=name,
            category=payload.get("category", "General"),
            description=payload.get("description"),
            unit_of_measure=payload.get("unitOfMeasure", "units"),
            reorder_point=payload.get("reorderPoint", 10),
            preferred_supplier_id=pref_sup_id,
            unit_cost_paise=payload.get("unitCostPaise", 0),
            unit_price_paise=round(payload.get("unitCostPaise", 0) * 1.5),
            currency=payload.get("currency", "INR"),
            created_at=to_iso_date(date.today()),
            updated_at=to_iso_date(date.today()),
        )
        db.add(product)
        db.flush()

        init_qty = payload.get("initialStockQuantity", 0)
        inv = InventoryItem(
            id=f"inv_{uuid.uuid4().hex[:12]}",
            business_id=business.id,
            product_id=prod_id,
            quantity_on_hand=init_qty,
            quantity_reserved=0,
            quantity_on_order=0,
            updated_at=to_iso_date(date.today()),
        )
        db.add(inv)

        if init_qty > 0:
            mov = InventoryMovement(
                id=f"mov_{uuid.uuid4().hex[:12]}",
                business_id=business.id,
                product_id=prod_id,
                type="adjustment",
                quantity=init_qty,
                resulting_balance=init_qty,
                date=to_iso_date(date.today()),
                note="Initial inventory setup",
                created_at=to_iso_date(date.today()),
            )
            db.add(mov)

        db.commit()
        db.refresh(product)
        return enrich_inventory_item(product, db)
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise

@router.patch("/{productId}")
def update_product(
    productId: str,
    payload: dict,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(
        Product.id == productId,
        Product.business_id == business.id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if "sku" in payload and payload["sku"]:
        sku = payload["sku"].strip().upper()
        existing = db.query(Product).filter(
            Product.business_id == business.id,
            Product.sku == sku,
            Product.id != productId
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail=f'SKU "{sku}" is already in use.')
        product.sku = sku

    if "name" in payload and payload["name"]: product.name = payload["name"].strip()
    if "category" in payload: product.category = payload["category"].strip()
    if "description" in payload: product.description = payload["description"].strip()
    if "unitOfMeasure" in payload: product.unit_of_measure = payload["unitOfMeasure"].strip()
    if "reorderPoint" in payload and payload["reorderPoint"] is not None:
        product.reorder_point = payload["reorderPoint"]
    if "preferredSupplierId" in payload:
        pref_id = payload["preferredSupplierId"]
        if pref_id:
            sup = db.query(Supplier).filter(Supplier.id == pref_id, Supplier.business_id == business.id).first()
            if not sup:
                raise HTTPException(status_code=404, detail="Preferred supplier not found in this business.")
        product.preferred_supplier_id = pref_id
    if "unitCostPaise" in payload and payload["unitCostPaise"] is not None:
        product.unit_cost_paise = payload["unitCostPaise"]

    try:
        product.updated_at = to_iso_date(date.today())
        db.commit()
        db.refresh(product)
        return {
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
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise

@router.post("/transactions")
def record_movement(
    payload: dict,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    prod_id = payload.get("productId")
    qty = payload.get("quantity", 0)
    mov_type = payload.get("type", "adjustment")

    if not prod_id:
        raise HTTPException(status_code=400, detail="Product ID is required")
    if qty <= 0:
        raise HTTPException(status_code=400, detail="Movement quantity must be greater than zero.")

    product = db.query(Product).filter(Product.id == prod_id, Product.business_id == business.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    try:
        inv = db.query(InventoryItem).filter(InventoryItem.product_id == prod_id, InventoryItem.business_id == business.id).first()
        if not inv:
            inv = InventoryItem(
                id=f"inv_{uuid.uuid4().hex[:12]}",
                business_id=business.id,
                product_id=prod_id,
                quantity_on_hand=0,
                quantity_reserved=0,
                quantity_on_order=0,
                updated_at=to_iso_date(date.today()),
            )
            db.add(inv)
            db.flush()

        if mov_type == "receipt":
            inv.quantity_on_hand += qty
            inv.quantity_on_order = max(0, inv.quantity_on_order - qty)
        elif mov_type == "sale":
            inv.quantity_on_hand = max(0, inv.quantity_on_hand - qty)
            inv.quantity_reserved = max(0, inv.quantity_reserved - qty)
        elif mov_type == "reservation":
            inv.quantity_reserved += qty
        elif mov_type == "reservation_release":
            inv.quantity_reserved = max(0, inv.quantity_reserved - qty)
        elif mov_type == "adjustment":
            inv.quantity_on_hand += qty
        elif mov_type == "return":
            inv.quantity_on_hand += qty

        mov_date = payload.get("date") or to_iso_date(date.today())
        inv.updated_at = mov_date

        movement = InventoryMovement(
            id=f"mov_{uuid.uuid4().hex[:12]}",
            business_id=business.id,
            product_id=prod_id,
            type=mov_type,
            quantity=qty,
            resulting_balance=inv.quantity_on_hand,
            date=mov_date,
            reference_type=payload.get("referenceType"),
            reference_id=payload.get("referenceId"),
            note=payload.get("note"),
            created_at=to_iso_date(date.today()),
        )
        db.add(movement)
        db.commit()
        db.refresh(movement)

        return {
            "id": movement.id,
            "businessId": movement.business_id,
            "productId": movement.product_id,
            "type": movement.type,
            "quantity": movement.quantity,
            "resultingBalance": movement.resulting_balance,
            "date": movement.date,
            "referenceType": movement.reference_type,
            "referenceId": movement.reference_id,
            "note": movement.note,
            "createdAt": movement.created_at,
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise
