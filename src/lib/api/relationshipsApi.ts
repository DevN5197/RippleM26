import { DATA_MODE } from "@/lib/config";
import { httpRequest } from "@/lib/api/client";
import { db, delay } from "@/mocks/store";
import type {
  RelationshipGraphData,
  RelationshipGraphNode,
  RelationshipGraphEdge,
  RelationshipFilterParams,
  RippleImpactPreview,
  RippleMilestone,
} from "@/types";

/**
 * Builds the canonical business relationship graph from the active store.
 * Reflects Rupi Clothing's operating cycle with stable, deterministic entity linkage.
 */
export function buildRelationshipGraph(): RelationshipGraphData {
  const nodes: RelationshipGraphNode[] = [
    // --- Chain 1: Primary Operating Cycle (Cotton Kurti) ---
    {
      id: "node_sup_1",
      type: "supplier",
      label: "Shree Textiles",
      status: "active",
      currency: "INR",
      entityId: "sup_1",
      metadata: {
        entityType: "supplier",
        referenceNumber: "SUP-001",
        partnerName: "Shree Textiles",
        partnerType: "supplier",
        expectedDate: db.suppliers[0]?.paymentTermsDays
          ? `${db.suppliers[0].paymentTermsDays}d terms`
          : "30d terms",
        workflowSignificance:
          "Key fabric mill supplying raw cotton fabric for kurti manufacturing. Reliability score 86%.",
        nextMilestone: "PO-1 replenishment delivery on Day 4",
      },
    },
    {
      id: "node_pay_1",
      type: "recorded_payment",
      label: "Advance Paid (₹5,000)",
      status: "completed",
      date:
        db.payments.find((p) => p.id === "pay_1")?.completedDate || db.purchaseOrders[0]?.orderDate,
      amountPaise: 500_000,
      currency: "INR",
      entityId: "pay_1",
      metadata: {
        entityType: "payment",
        referenceNumber: "PAY-ADV-001",
        partnerName: "Shree Textiles",
        cashDirection: "outgoing",
        cashImpactPaise: -500_000,
        actualDate: db.payments.find((p) => p.id === "pay_1")?.completedDate,
        workflowSignificance:
          "Upfront 14% deposit required by Shree Textiles before batch dyeing and cutting initiates.",
        nextMilestone: "Order fulfillment and delivery to central warehouse",
      },
    },
    {
      id: "node_po_1",
      type: "purchase_order",
      label: "PO-1: 100x Cotton Kurti",
      status: "completed",
      date: db.purchaseOrders[0]?.orderDate,
      amountPaise: db.purchaseOrders[0]?.totalPaise ?? 3_500_000,
      currency: "INR",
      entityId: "po_1",
      metadata: {
        entityType: "purchase_order",
        referenceNumber: "PO-2026-001",
        partnerName: "Shree Textiles",
        quantity: 100,
        productName: "Cotton Kurti",
        sku: "KUR-COT-001",
        expectedDate: db.purchaseOrders[0]?.expectedDeliveryDate,
        actualDate: db.purchaseOrders[0]?.orderDate,
        workflowSignificance:
          "Procurement order for 100 units to restock depleting warehouse inventory before weekend wholesale demand.",
        nextMilestone: "Physical delivery at Mumbai warehouse on Day 4",
      },
    },
    {
      id: "node_delivery_1",
      type: "inventory_delivery",
      label: "Inventory Delivery: Day 4",
      status: "upcoming",
      date: db.inventory[0]?.expectedRestockDate,
      currency: "INR",
      entityId: "inv_1",
      metadata: {
        entityType: "inventory_item",
        referenceNumber: "DELIV-1001",
        productName: "Cotton Kurti",
        sku: "KUR-COT-001",
        quantity: 100,
        expectedDate: db.inventory[0]?.expectedRestockDate,
        workflowSignificance:
          "Arrival of 100 Cotton Kurtis. A delivery delay halts fulfillment of the Day 6 customer order.",
        nextMilestone: "Stock added to available inventory for picking",
      },
    },
    {
      id: "node_stock_1",
      type: "inventory_stock",
      label: "Stock: 12 Units (Low)",
      status: "at_risk",
      currency: "INR",
      entityId: "prd_1",
      metadata: {
        entityType: "product",
        referenceNumber: "SKU-KUR-01",
        productName: "Cotton Kurti",
        sku: "KUR-COT-001",
        quantity: db.inventory[0]?.quantityOnHand ?? 12,
        riskSeverity: "warning",
        riskDescription:
          "Currently 12 units on hand, below the 25-unit safety threshold. Replenishment needed to support Day 6 sales.",
        workflowSignificance:
          "Warehouse inventory level. Stock buffer is critically thin until Day 4 delivery is logged.",
        nextMilestone: "Day 6 dispatch of 10 units to Urban Threads",
      },
    },
    {
      id: "node_pay_3",
      type: "supplier_payment",
      label: "PO Balance Payment (₹30,000)",
      status: "upcoming",
      date: db.payments.find((p) => p.id === "pay_3")?.scheduledDate,
      amountPaise: 3_000_000,
      currency: "INR",
      entityId: "pay_3",
      metadata: {
        entityType: "payment",
        referenceNumber: "PAY-BAL-001",
        partnerName: "Shree Textiles",
        expectedDate: db.payments.find((p) => p.id === "pay_3")?.scheduledDate,
        cashDirection: "outgoing",
        cashImpactPaise: -3_000_000,
        riskSeverity: "critical",
        workflowSignificance:
          "Balance payment due upon delivery on Day 4. Combined with Day 5 rent, triggers negative cash balance.",
        nextMilestone: "Cash shortfall risk around Day 5",
      },
    },
    {
      id: "node_cus_1",
      type: "customer",
      label: "Urban Threads Boutique",
      status: "active",
      currency: "INR",
      entityId: "cus_1",
      metadata: {
        entityType: "customer",
        referenceNumber: "CUS-001",
        partnerName: "Urban Threads Boutique",
        partnerType: "customer",
        expectedDate: "15d payment terms",
        workflowSignificance:
          "Boutique apparel stockist in Bandra, Mumbai. High-value repeat client with 15-day credit terms.",
        nextMilestone: "Delivery and billing of Order #CO-1 on Day 6",
      },
    },
    {
      id: "node_co_1",
      type: "sale",
      label: "Sale #CO-1: 10x Kurtis",
      status: "upcoming",
      date: db.customerOrders[0]?.orderDate,
      amountPaise: db.customerOrders[0]?.totalPaise ?? 800_000,
      currency: "INR",
      entityId: "co_1",
      metadata: {
        entityType: "customer_order",
        referenceNumber: "CO-101",
        partnerName: "Urban Threads Boutique",
        productName: "Cotton Kurti",
        sku: "KUR-COT-001",
        quantity: 10,
        expectedDate: db.customerOrders[0]?.deliveryDate,
        workflowSignificance:
          "Confirmed wholesale order. Requires available stock from Day 4 delivery before packing.",
        nextMilestone: "Issuance of Invoice INV-2001 on Day 6",
      },
    },
    {
      id: "node_inv_2001",
      type: "customer_invoice",
      label: "Invoice INV-2001",
      status: "upcoming",
      date: db.invoices[0]?.issueDate,
      amountPaise: db.invoices[0]?.amountPaise ?? 800_000,
      currency: "INR",
      entityId: "inv_2001",
      metadata: {
        entityType: "invoice",
        referenceNumber: "INV-2001",
        partnerName: "Urban Threads Boutique",
        expectedDate: db.invoices[0]?.dueDate,
        actualDate: db.invoices[0]?.issueDate,
        lagDays: 15,
        workflowSignificance: "Net 15-day receivable invoice issued on shipment. Due date Day 21.",
        nextMilestone: "Expected bank collection of ₹8,000 on Day 21",
      },
    },
    {
      id: "node_rec_2001",
      type: "expected_receipt",
      label: "Customer Receipt (₹8,000)",
      status: "upcoming",
      date: db.payments.find((p) => p.id === "pay_2")?.scheduledDate,
      amountPaise: 800_000,
      currency: "INR",
      entityId: "pay_2",
      metadata: {
        entityType: "payment",
        referenceNumber: "REC-2001",
        partnerName: "Urban Threads Boutique",
        expectedDate: db.payments.find((p) => p.id === "pay_2")?.scheduledDate,
        cashDirection: "incoming",
        cashImpactPaise: 800_000,
        workflowSignificance:
          "Inflow closing the Kurti operating cycle. The 17-day lag between Day 4 outflow and Day 21 inflow causes the shortfall.",
        nextMilestone: "Working capital restored",
      },
    },
    {
      id: "node_risk_1",
      type: "cash_flow_risk",
      label: "Cash Shortfall (Day 5)",
      status: "at_risk",
      date: db.riskAlerts[0]?.createdAt,
      amountPaise: 3_000_000,
      currency: "INR",
      entityId: "risk_1",
      metadata: {
        entityType: "risk_alert",
        referenceNumber: "ALERT-SHORTFALL-01",
        riskSeverity: "critical",
        riskDescription:
          "Paying ₹30,000 balance to Shree Textiles on Day 4 plus ₹12,000 shop rent on Day 5 pushes cash below zero before INV-2001 is collected on Day 21.",
        cashDirection: "outgoing",
        cashImpactPaise: -3_000_000,
        workflowSignificance:
          "Critical cash-flow risk: Outflow on Day 4 happens 17 days before matching receipt on Day 21.",
        nextMilestone: "Request 7-day payment extension on PO-1 balance",
      },
    },

    // --- Chain 2: Secondary Cycle (Mehta Fabrics -> Linen Shirt) ---
    {
      id: "node_sup_2",
      type: "supplier",
      label: "Mehta Fabrics",
      status: "active",
      currency: "INR",
      entityId: "sup_2",
      metadata: {
        entityType: "supplier",
        referenceNumber: "SUP-002",
        partnerName: "Mehta Fabrics",
        partnerType: "supplier",
        expectedDate: "45d terms",
        workflowSignificance:
          "Reliable linen and blended textiles supplier. 45-day credit terms, reliability 92%.",
        nextMilestone: "PO-2 delivery on Day 11",
      },
    },
    {
      id: "node_po_2",
      type: "purchase_order",
      label: "PO-2: 50x Linen Shirts",
      status: "upcoming",
      date: db.purchaseOrders[1]?.orderDate,
      amountPaise: db.purchaseOrders[1]?.totalPaise ?? 2_250_000,
      currency: "INR",
      entityId: "po_2",
      metadata: {
        entityType: "purchase_order",
        referenceNumber: "PO-2026-002",
        partnerName: "Mehta Fabrics",
        quantity: 50,
        productName: "Linen Shirt",
        sku: "SHT-LIN-003",
        expectedDate: db.purchaseOrders[1]?.expectedDeliveryDate,
        workflowSignificance:
          "Wholesale purchase order for seasonal linen stock. Delivery due Day 11.",
        nextMilestone: "Delivery and inspection Day 11",
      },
    },
    {
      id: "node_delivery_2",
      type: "inventory_delivery",
      label: "Delivery: Linen Shirt (Day 11)",
      status: "upcoming",
      date: db.inventory[2]?.expectedRestockDate,
      currency: "INR",
      entityId: "inv_3",
      metadata: {
        entityType: "inventory_item",
        referenceNumber: "DELIV-1002",
        productName: "Linen Shirt",
        sku: "SHT-LIN-003",
        quantity: 50,
        expectedDate: db.inventory[2]?.expectedRestockDate,
        workflowSignificance: "Restock shipment of 50 units arriving Day 11.",
        nextMilestone: "Stock replenishment",
      },
    },
    {
      id: "node_pay_po2",
      type: "supplier_payment",
      label: "PO-2 Payment (₹22,500)",
      status: "upcoming",
      date: db.cashFlowEvents.find((e) => e.id === "cfe_7")?.date,
      amountPaise: 2_250_000,
      currency: "INR",
      entityId: "cfe_7",
      metadata: {
        entityType: "payment",
        referenceNumber: "PAY-MEHTA-002",
        partnerName: "Mehta Fabrics",
        expectedDate: db.cashFlowEvents.find((e) => e.id === "cfe_7")?.date,
        cashDirection: "outgoing",
        cashImpactPaise: -2_250_000,
        workflowSignificance: "Payment scheduled upon Day 11 delivery under Mehta's terms.",
        nextMilestone: "Reconciliation",
      },
    },

    // --- Chain 3: Customer Receivables & Overdue Risk (Style Mart) ---
    {
      id: "node_cus_2",
      type: "customer",
      label: "Style Mart",
      status: "at_risk",
      currency: "INR",
      entityId: "cus_2",
      metadata: {
        entityType: "customer",
        referenceNumber: "CUS-002",
        partnerName: "Style Mart",
        partnerType: "customer",
        riskSeverity: "warning",
        riskDescription: "Outstanding overdue invoice INV-1999 (₹1,300) 5 days late.",
        workflowSignificance:
          "Regional chain store customer. Currently delayed on past invoice while placing new orders.",
        nextMilestone: "Overdue debt collection",
      },
    },
    {
      id: "node_inv_1999",
      type: "customer_invoice",
      label: "INV-1999 (Overdue ₹1,300)",
      status: "delayed",
      date: db.invoices.find((i) => i.id === "inv_1999")?.issueDate,
      amountPaise: 130_000,
      currency: "INR",
      entityId: "inv_1999",
      metadata: {
        entityType: "invoice",
        referenceNumber: "INV-1999",
        partnerName: "Style Mart",
        expectedDate: db.invoices.find((i) => i.id === "inv_1999")?.dueDate,
        riskSeverity: "warning",
        riskDescription: "5 days past due date.",
        workflowSignificance:
          "Overdue invoice impeding collection flow. Urgent reminder recommended.",
        nextMilestone: "Payment reminder dispatch",
      },
    },
    {
      id: "node_co_2",
      type: "sale",
      label: "Order #CO-2: 6x Denim",
      status: "upcoming",
      date: db.customerOrders[1]?.orderDate,
      amountPaise: db.customerOrders[1]?.totalPaise ?? 1_320_000,
      currency: "INR",
      entityId: "co_2",
      metadata: {
        entityType: "customer_order",
        referenceNumber: "CO-102",
        partnerName: "Style Mart",
        productName: "Denim Jacket",
        sku: "JKT-DEN-002",
        quantity: 6,
        expectedDate: db.customerOrders[1]?.deliveryDate,
        workflowSignificance: "Confirmed order for 6 Denim Jackets delivering Day 9.",
        nextMilestone: "Issuance of INV-2002 on Day 9",
      },
    },
    {
      id: "node_inv_2002",
      type: "customer_invoice",
      label: "Invoice INV-2002",
      status: "upcoming",
      date: db.invoices.find((i) => i.id === "inv_2002")?.issueDate,
      amountPaise: db.invoices.find((i) => i.id === "inv_2002")?.amountPaise ?? 1_320_000,
      currency: "INR",
      entityId: "inv_2002",
      metadata: {
        entityType: "invoice",
        referenceNumber: "INV-2002",
        partnerName: "Style Mart",
        expectedDate: db.invoices.find((i) => i.id === "inv_2002")?.dueDate,
        actualDate: db.invoices.find((i) => i.id === "inv_2002")?.issueDate,
        workflowSignificance: "30-day credit term invoice for Denim Jackets delivery.",
        nextMilestone: "Collection on Day 39",
      },
    },
    {
      id: "node_rec_2002",
      type: "expected_receipt",
      label: "Customer Receipt (₹13,200)",
      status: "upcoming",
      date: db.invoices.find((i) => i.id === "inv_2002")?.dueDate,
      amountPaise: 1_320_000,
      currency: "INR",
      entityId: "rec_2002",
      metadata: {
        entityType: "payment",
        referenceNumber: "REC-2002",
        partnerName: "Style Mart",
        cashDirection: "incoming",
        cashImpactPaise: 1_320_000,
        expectedDate: db.invoices.find((i) => i.id === "inv_2002")?.dueDate,
        workflowSignificance: "Receivable due on Day 39 based on 30-day terms.",
        nextMilestone: "Inflow reconciliation",
      },
    },
  ];

  const edges: RelationshipGraphEdge[] = [
    // Primary cycle
    {
      id: "edge_sup_to_adv",
      source: "node_sup_1",
      target: "node_pay_1",
      relationship: "triggers",
      status: "completed",
      description: "Requires advance deposit",
      lagDays: 0,
    },
    {
      id: "edge_adv_to_po",
      source: "node_pay_1",
      target: "node_po_1",
      relationship: "fulfills",
      status: "completed",
      description: "Unlocks fabrication batch",
      lagDays: 0,
    },
    {
      id: "edge_po_to_deliv",
      source: "node_po_1",
      target: "node_delivery_1",
      relationship: "delivers_to",
      status: "active",
      description: "Dispatched to warehouse (Day 4)",
      lagDays: 6,
    },
    {
      id: "edge_po_to_balpay",
      source: "node_po_1",
      target: "node_pay_3",
      relationship: "triggers",
      status: "active",
      description: "Balance due on delivery (Day 4)",
      lagDays: 6,
    },
    {
      id: "edge_deliv_to_stock",
      source: "node_delivery_1",
      target: "node_stock_1",
      relationship: "supplies_stock",
      status: "active",
      description: "Restocks 100 units into inventory",
      lagDays: 0,
    },
    {
      id: "edge_stock_to_co",
      source: "node_stock_1",
      target: "node_co_1",
      relationship: "fulfills",
      status: "active",
      description: "Allocates 10 units for customer order",
      lagDays: 2,
    },
    {
      id: "edge_cus_to_co",
      source: "node_cus_1",
      target: "node_co_1",
      relationship: "sold_to",
      status: "completed",
      description: "Order placed by Urban Threads",
      lagDays: 0,
    },
    {
      id: "edge_co_to_inv",
      source: "node_co_1",
      target: "node_inv_2001",
      relationship: "billed_as",
      status: "active",
      description: "Shipment generates Invoice INV-2001",
      lagDays: 0,
    },
    {
      id: "edge_inv_to_rec",
      source: "node_inv_2001",
      target: "node_rec_2001",
      relationship: "settled_by",
      status: "active",
      description: "15-day credit terms (Day 21 receipt)",
      lagDays: 15,
    },
    {
      id: "edge_pay3_to_risk",
      source: "node_pay_3",
      target: "node_risk_1",
      relationship: "threatens",
      status: "at_risk",
      description: "₹30,000 outflow triggers Day 5 shortfall",
      lagDays: 1,
    },
    {
      id: "edge_deliv_to_risk",
      source: "node_delivery_1",
      target: "node_risk_1",
      relationship: "threatens",
      status: "at_risk",
      description: "Delivery delay shifts subsequent receipts",
      lagDays: 1,
    },

    // Secondary cycle (Mehta Fabrics)
    {
      id: "edge_sup2_to_po2",
      source: "node_sup_2",
      target: "node_po_2",
      relationship: "triggers",
      status: "completed",
      description: "Wholesale PO issued to Mehta Fabrics",
      lagDays: 0,
    },
    {
      id: "edge_po2_to_deliv2",
      source: "node_po_2",
      target: "node_delivery_2",
      relationship: "delivers_to",
      status: "active",
      description: "Expected delivery Day 11",
      lagDays: 11,
    },
    {
      id: "edge_po2_to_pay",
      source: "node_po_2",
      target: "node_pay_po2",
      relationship: "triggers",
      status: "active",
      description: "Scheduled net-45 payment",
      lagDays: 11,
    },

    // Customer Receivables (Style Mart)
    {
      id: "edge_cus2_to_inv1999",
      source: "node_cus_2",
      target: "node_inv_1999",
      relationship: "billed_as",
      status: "delayed",
      description: "Unpaid overdue balance",
      lagDays: 0,
    },
    {
      id: "edge_cus2_to_co2",
      source: "node_cus_2",
      target: "node_co_2",
      relationship: "sold_to",
      status: "completed",
      description: "Style Mart confirmed Denim order",
      lagDays: 0,
    },
    {
      id: "edge_co2_to_inv2002",
      source: "node_co_2",
      target: "node_inv_2002",
      relationship: "billed_as",
      status: "active",
      description: "Invoice issued on Day 9",
      lagDays: 7,
    },
    {
      id: "edge_inv2002_to_rec2002",
      source: "node_inv_2002",
      target: "node_rec_2002",
      relationship: "settled_by",
      status: "active",
      description: "30-day payment term (Day 39)",
      lagDays: 30,
    },
  ];

  // Dynamically attach any additional purchase orders from db.purchaseOrders (e.g. po_3 or newly created POs)
  for (const po of db.purchaseOrders) {
    const existingNode = nodes.find((n) => n.entityId === po.id || n.id === `node_${po.id}`);
    if (!existingNode) {
      const supplier = db.suppliers.find((s) => s.id === po.supplierId);
      const supplierNode = nodes.find((n) => n.entityId === po.supplierId);
      const primaryLineItem = po.lineItems?.[0];
      const prodId = po.productId || primaryLineItem?.productId;
      const product = db.products.find((p) => p.id === prodId);
      const productNode = nodes.find((n) => n.entityId === prodId);

      const poNodeId = `node_${po.id}`;
      const delivNodeId = `node_deliv_${po.id}`;

      nodes.push({
        id: poNodeId,
        type: "purchase_order",
        label: `${po.poNumber || po.id}: ${po.quantity || 1}x ${product?.name || "Goods"}`,
        status: po.status === "received" ? "completed" : "active",
        date: po.orderDate,
        amountPaise: po.totalPaise,
        currency: "INR",
        entityId: po.id,
        metadata: {
          entityType: "purchase_order",
          referenceNumber: po.poNumber || po.id,
          partnerName: supplier?.name || "Supplier",
          quantity: po.quantity || 1,
          productName: product?.name,
          sku: product?.sku,
          expectedDate: po.expectedDeliveryDate,
          actualDate: po.orderDate,
          workflowSignificance: `Procurement order for ${product?.name || "goods"} placed with ${supplier?.name || "supplier"}.`,
          nextMilestone: `Expected delivery on ${po.expectedDeliveryDate}`,
        },
      });

      nodes.push({
        id: delivNodeId,
        type: "inventory_delivery",
        label: `Delivery: ${po.poNumber || po.id}`,
        status: po.status === "received" ? "completed" : "upcoming",
        date: po.expectedDeliveryDate,
        currency: "INR",
        entityId: po.id,
        metadata: {
          entityType: "inventory_item",
          referenceNumber: `DELIV-${po.id}`,
          productName: product?.name,
          sku: product?.sku,
          quantity: po.quantity,
          expectedDate: po.expectedDeliveryDate,
          workflowSignificance: `Arrival of ${po.quantity || 0} units from ${supplier?.name || "supplier"}.`,
          nextMilestone: "Stock added to available warehouse inventory",
        },
      });

      if (supplierNode) {
        edges.push({
          id: `edge_${supplierNode.id}_to_${poNodeId}`,
          source: supplierNode.id,
          target: poNodeId,
          relationship: "triggers",
          status: "active",
          description: "Procurement purchase order",
          lagDays: 0,
        });
      }

      edges.push({
        id: `edge_${poNodeId}_to_${delivNodeId}`,
        source: poNodeId,
        target: delivNodeId,
        relationship: "delivers_to",
        status: "active",
        description: `Dispatched to warehouse (${po.expectedDeliveryDate})`,
        lagDays: 5,
      });

      if (productNode) {
        edges.push({
          id: `edge_${delivNodeId}_to_${productNode.id}`,
          source: delivNodeId,
          target: productNode.id,
          relationship: "supplies_stock",
          status: "active",
          description: "Replenishes on-hand inventory",
          lagDays: 1,
        });
      }
    }
  }

  const atRiskCount = nodes.filter((n) => n.status === "at_risk" || n.status === "delayed").length;
  const upcomingCount = nodes.filter((n) => n.status === "upcoming").length;
  const totalCashAtRiskPaise = nodes
    .filter((n) => n.status === "at_risk" || n.status === "delayed")
    .reduce((sum, n) => sum + (n.amountPaise ?? 0), 0);

  return {
    nodes,
    edges,
    summary: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      atRiskCount,
      upcomingCount,
      totalCashAtRiskPaise,
      dateWindowDays: 30,
    },
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Calculates causal ripple chain and business impact when an event changes or is delayed.
 */
export function calculateRippleImpact(
  nodeId: string,
  graph: RelationshipGraphData,
): RippleImpactPreview {
  const selected = graph.nodes.find((n) => n.id === nodeId);
  if (!selected) {
    return {
      selectedNodeId: nodeId,
      selectedLabel: "Unknown Event",
      primaryMilestone: "No downstream milestone found.",
      cashFlowRisk: { hasRisk: false },
      chain: [],
      businessImpactSummary: "Select a node in the graph to preview its ripple effect.",
    };
  }

  // BFS to build downstream chain
  const chain: RippleMilestone[] = [];
  const visited = new Set<string>();
  const queue: { id: string; depth: number }[] = [{ id: nodeId, depth: 0 }];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current.id)) continue;
    visited.add(current.id);

    const outgoing = graph.edges.filter((e) => e.source === current.id);
    for (const edge of outgoing) {
      if (!visited.has(edge.target)) {
        const targetNode = graph.nodes.find((n) => n.id === edge.target);
        if (targetNode) {
          queue.push({ id: targetNode.id, depth: current.depth + 1 });
          if (!chain.some((m) => m.nodeId === targetNode.id)) {
            chain.push({
              nodeId: targetNode.id,
              label: targetNode.label,
              type: targetNode.type,
              date: targetNode.date,
              daysFromSelected: (current.depth + 1) * 2, // approximated delta
              status: targetNode.status,
              amountPaise: targetNode.amountPaise,
              consequence: edge.description,
            });
          }
        }
      }
    }
  }

  // Specific causal summaries based on business logic
  let businessImpactSummary = "";
  const hasRisk = chain.some((m) => m.type === "cash_flow_risk") || selected.status === "at_risk";

  if (nodeId === "node_delivery_1") {
    businessImpactSummary =
      "If inventory delivery slips past Day 4: Cotton Kurti stock remains at 12 units (below 25 safety threshold), customer order #CO-1 cannot be fulfilled on Day 6, invoice INV-2001 is delayed, and the expected ₹8,000 receipt shifts past Day 21 — widening the Day 5 cash shortfall.";
  } else if (nodeId === "node_pay_3") {
    businessImpactSummary =
      "Executing this ₹30,000 balance payment on Day 4 creates an immediate ₹30,000 liquidity outflow that, paired with Day 5 rent, depletes reserves before customer collections arrive on Day 21.";
  } else if (nodeId === "node_inv_2001" || nodeId === "node_rec_2001") {
    businessImpactSummary =
      "This ₹8,000 inflow closes the operating cycle. Accelerating payment (e.g., offering a 2% early discount) from Day 21 to Day 10 helps offset Day 4–5 outflows.";
  } else if (nodeId === "node_inv_1999") {
    businessImpactSummary =
      "INV-1999 is already 5 days overdue from Style Mart. Every week of delay directly ties up ₹1,300 of working capital.";
  } else if (chain.length > 0) {
    businessImpactSummary = `A delay here ripples to ${chain.length} downstream business event${
      chain.length > 1 ? "s" : ""
    }, shifting projected execution dates and potentially deferring cash receipts.`;
  } else {
    businessImpactSummary =
      "This is a terminal node in the current operating cycle. It does not cascade further into other active events.";
  }

  return {
    selectedNodeId: nodeId,
    selectedLabel: selected.label,
    primaryMilestone: selected.metadata.nextMilestone || "Next operating milestone",
    cashFlowRisk: {
      hasRisk,
      description: selected.metadata.riskDescription,
      severity: selected.metadata.riskSeverity,
      shortfallPaise: hasRisk ? 3_000_000 : undefined,
    },
    chain,
    businessImpactSummary,
  };
}

export const relationshipsApi = {
  async getGraph(params: RelationshipFilterParams = {}): Promise<RelationshipGraphData> {
    if (DATA_MODE === "mock") {
      await delay(250);
      const graph = buildRelationshipGraph();

      let filteredNodes = graph.nodes;
      let filteredEdges = graph.edges;

      // Apply search filter
      if (params.search?.trim()) {
        const query = params.search.toLowerCase().trim();
        filteredNodes = filteredNodes.filter(
          (n) =>
            n.label.toLowerCase().includes(query) ||
            n.type.toLowerCase().includes(query) ||
            n.metadata.referenceNumber?.toLowerCase().includes(query) ||
            n.metadata.partnerName?.toLowerCase().includes(query) ||
            n.metadata.productName?.toLowerCase().includes(query) ||
            n.metadata.sku?.toLowerCase().includes(query),
        );
      }

      // Apply node type filter
      if (params.nodeTypes && params.nodeTypes.length > 0) {
        filteredNodes = filteredNodes.filter((n) => params.nodeTypes!.includes(n.type));
      }

      // Apply status filter
      if (params.statuses && params.statuses.length > 0) {
        filteredNodes = filteredNodes.filter((n) => params.statuses!.includes(n.status));
      }

      // Apply partner filter
      if (params.partnerId) {
        filteredNodes = filteredNodes.filter(
          (n) =>
            n.entityId === params.partnerId ||
            n.metadata.partnerName?.toLowerCase().includes(params.partnerId!.toLowerCase()),
        );
      }

      // Apply risk only filter
      if (params.riskOnly) {
        filteredNodes = filteredNodes.filter(
          (n) => n.status === "at_risk" || n.status === "delayed" || n.type === "cash_flow_risk",
        );
      }

      // Retain only edges connecting retained nodes
      const nodeIds = new Set(filteredNodes.map((n) => n.id));
      filteredEdges = filteredEdges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));

      return {
        nodes: filteredNodes,
        edges: filteredEdges,
        summary: graph.summary,
        updatedAt: graph.updatedAt,
      };
    }

    return httpRequest<RelationshipGraphData>("/api/v1/relationships", {
      query: {
        search: params.search,
        riskOnly: params.riskOnly ? "true" : undefined,
        partnerId: params.partnerId,
      },
    });
  },

  async getNodeDetails(id: string): Promise<RelationshipGraphNode | undefined> {
    const graph = await this.getGraph();
    return graph.nodes.find((n) => n.id === id);
  },

  async getRipplePreview(nodeId: string): Promise<RippleImpactPreview> {
    const graph = await this.getGraph();
    return calculateRippleImpact(nodeId, graph);
  },
};
