from datetime import datetime
from sqlalchemy.orm import Session
from app.models.supplier import Supplier
from app.models.customer import Customer
from app.models.product import Product
from app.models.order import PurchaseOrder, CustomerOrder
from app.models.invoice import Invoice
from app.models.payment import Payment

def get_relationships_graph(business_id: str, db: Session, search: str | None = None, risk_only: bool = False, partner_id: str | None = None) -> dict:
    suppliers = db.query(Supplier).filter(Supplier.business_id == business_id).all()
    customers = db.query(Customer).filter(Customer.business_id == business_id).all()
    products = db.query(Product).filter(Product.business_id == business_id).all()
    purchase_orders = db.query(PurchaseOrder).filter(PurchaseOrder.business_id == business_id).all()
    customer_orders = db.query(CustomerOrder).filter(CustomerOrder.business_id == business_id).all()
    invoices = db.query(Invoice).filter(Invoice.business_id == business_id).all()
    payments = db.query(Payment).filter(Payment.business_id == business_id).all()

    nodes = []
    edges = []

    # Supplier nodes
    for s in suppliers:
        status = "at_risk" if s.reliability_score < 75 else "active"
        nodes.append({
            "id": f"node_{s.id}",
            "type": "supplier",
            "label": s.name,
            "status": status,
            "amountPaise": s.outstanding_paise,
            "currency": "INR",
            "entityId": s.id,
            "metadata": {
                "entityType": "supplier",
                "partnerName": s.name,
                "partnerType": "supplier",
                "workflowSignificance": f"Reliability {s.reliability_score}% · {s.lead_time_days}d lead time",
                "riskSeverity": "critical" if s.reliability_score < 75 else None,
                "cashImpactPaise": s.outstanding_paise,
                "cashDirection": "outgoing",
            }
        })

    # Customer nodes
    for c in customers:
        nodes.append({
            "id": f"node_{c.id}",
            "type": "customer",
            "label": c.name,
            "status": "active",
            "amountPaise": c.outstanding_paise,
            "currency": "INR",
            "entityId": c.id,
            "metadata": {
                "entityType": "customer",
                "partnerName": c.name,
                "partnerType": "customer",
                "workflowSignificance": f"Credit terms {c.credit_terms_days} days",
                "cashImpactPaise": c.outstanding_paise,
                "cashDirection": "incoming",
            }
        })

    # Product / Inventory nodes
    for p in products:
        nodes.append({
            "id": f"node_{p.id}",
            "type": "inventory_stock",
            "label": p.name,
            "status": "active",
            "amountPaise": p.unit_cost_paise,
            "currency": "INR",
            "entityId": p.id,
            "metadata": {
                "entityType": "product",
                "sku": p.sku,
                "productName": p.name,
                "workflowSignificance": f"SKU {p.sku} · Reorder at {p.reorder_point}",
            }
        })
        if p.preferred_supplier_id:
            edges.append({
                "id": f"edge_sup_prod_{p.id}",
                "source": f"node_{p.preferred_supplier_id}",
                "target": f"node_{p.id}",
                "type": "supplies_stock",
                "label": "Supplies stock",
                "lagDays": 7,
            })

    # Purchase Order nodes & edges
    for po in purchase_orders:
        po_status = "delayed" if po.status == "delayed" else "completed" if po.status == "received" else "upcoming"
        nodes.append({
            "id": f"node_{po.id}",
            "type": "purchase_order",
            "label": po.po_number or po.id,
            "status": po_status,
            "date": po.expected_delivery_date,
            "amountPaise": po.total_paise,
            "currency": "INR",
            "entityId": po.id,
            "metadata": {
                "entityType": "purchase_order",
                "referenceNumber": po.po_number or po.id,
                "expectedDate": po.expected_delivery_date,
                "workflowSignificance": f"Delivery scheduled {po.expected_delivery_date}",
                "cashImpactPaise": po.total_paise,
                "cashDirection": "outgoing",
            }
        })
        edges.append({
            "id": f"edge_sup_po_{po.id}",
            "source": f"node_{po.supplier_id}",
            "target": f"node_{po.id}",
            "type": "triggers",
            "label": "Places PO",
            "lagDays": 0,
        })

    # Invoices & Payments edges
    for inv in invoices:
        inv_status = "delayed" if inv.status == "overdue" else "completed" if inv.status == "paid" else "upcoming"
        nodes.append({
            "id": f"node_{inv.id}",
            "type": "customer_invoice" if inv.type == "receivable" else "supplier_payment",
            "label": inv.invoice_number,
            "status": inv_status,
            "date": inv.due_date,
            "amountPaise": inv.amount_paise,
            "currency": "INR",
            "entityId": inv.id,
            "metadata": {
                "entityType": "invoice",
                "referenceNumber": inv.invoice_number,
                "expectedDate": inv.due_date,
                "workflowSignificance": f"Due on {inv.due_date}",
                "cashImpactPaise": inv.amount_paise,
                "cashDirection": "incoming" if inv.type == "receivable" else "outgoing",
            }
        })
        if inv.type == "receivable" and inv.customer_id:
            edges.append({
                "id": f"edge_cust_inv_{inv.id}",
                "source": f"node_{inv.customer_id}",
                "target": f"node_{inv.id}",
                "type": "billed_as",
                "label": "Billed to",
                "lagDays": 0,
            })
        elif inv.type == "payable" and inv.supplier_id:
            edges.append({
                "id": f"edge_supp_inv_{inv.id}",
                "source": f"node_{inv.supplier_id}",
                "target": f"node_{inv.id}",
                "type": "billed_as",
                "label": "Bill from",
                "lagDays": 0,
            })

    # Filter by search or risk_only or partner_id
    filtered_nodes = nodes
    if search:
        s = search.lower()
        filtered_nodes = [n for n in filtered_nodes if s in n["label"].lower()]
    if risk_only:
        filtered_nodes = [n for n in filtered_nodes if n["status"] in ("at_risk", "delayed")]
    if partner_id:
        filtered_nodes = [n for n in filtered_nodes if n.get("entityId") == partner_id or n["id"] == f"node_{partner_id}"]

    node_ids = {n["id"] for n in filtered_nodes}
    filtered_edges = [e for e in edges if e["source"] in node_ids and e["target"] in node_ids]

    summary = {
        "totalNodes": len(filtered_nodes),
        "totalEdges": len(filtered_edges),
        "suppliersCount": sum(1 for n in filtered_nodes if n["type"] == "supplier"),
        "customersCount": sum(1 for n in filtered_nodes if n["type"] == "customer"),
        "posCount": sum(1 for n in filtered_nodes if n["type"] == "purchase_order"),
        "invoicesCount": sum(1 for n in filtered_nodes if n["type"] in ("customer_invoice", "supplier_payment")),
        "atRiskCount": sum(1 for n in filtered_nodes if n["status"] in ("at_risk", "delayed")),
        "delayedCount": sum(1 for n in filtered_nodes if n["status"] == "delayed"),
    }

    return {
        "nodes": filtered_nodes,
        "edges": filtered_edges,
        "summary": summary,
        "updatedAt": datetime.utcnow().isoformat(),
    }
