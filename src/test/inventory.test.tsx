import { describe, expect, it } from "vitest";
import { inventoryApi } from "@/lib/api/inventoryApi";
import { purchaseOrderApi } from "@/lib/api/purchaseOrderApi";
import { dashboardApi } from "@/lib/api/dashboardApi";
import { buildRelationshipGraph } from "@/lib/api/relationshipsApi";
import { db } from "@/mocks/store";

describe("Feature 5: Inventory & Procurement Lifecycle", () => {
  it("1. Loads seeded products and calculates available stock and valuation", async () => {
    const listRes = await inventoryApi.list();
    expect(listRes.total).toBeGreaterThanOrEqual(3);

    const kurti = listRes.data.find((item) => item.product.sku === "KUR-COT-001");
    expect(kurti).toBeDefined();
    if (!kurti) return;

    // Available stock = on-hand - reserved
    expect(kurti.stockOnHand).toBe(12);
    expect(kurti.reservedStock).toBe(10);
    expect(kurti.availableStock).toBe(2);
    expect(kurti.incomingStock).toBe(100);
    expect(kurti.reorderThreshold).toBe(25);
    expect(kurti.status).toBe("low_stock");
    expect(kurti.inventoryValuationPaise).toBe(12 * 35_000); // 420,000 paise (₹4,200)
  });

  it("2. Returns accurate summary metrics without fabricating values", async () => {
    const metrics = await inventoryApi.getSummary();
    expect(metrics.totalProducts).toBeGreaterThanOrEqual(3);
    expect(metrics.totalAvailableUnits).toBeGreaterThanOrEqual(0);
    expect(metrics.lowStockCount).toBeGreaterThanOrEqual(1);
    expect(metrics.incomingUnits).toBeGreaterThanOrEqual(100);
    expect(typeof metrics.estimatedValuationPaise).toBe("number");
  });

  it("3. Creates a new product with unique SKU and zero or initial stock", async () => {
    const newSku = `TEST-TSHIRT-${Date.now().toString().slice(-4)}`;
    const created = await inventoryApi.create({
      name: "Organic Bamboo Tee",
      sku: newSku,
      category: "Linen & Casual",
      description: "Super soft eco-friendly bamboo knit tee.",
      unitOfMeasure: "pieces",
      initialStockQuantity: 15,
      reorderPoint: 10,
      preferredSupplierId: "sup_1",
      unitCostPaise: 25_000, // ₹250
      currency: "INR",
    });

    expect(created.product.name).toBe("Organic Bamboo Tee");
    expect(created.product.sku).toBe(newSku);
    expect(created.stockOnHand).toBe(15);
    expect(created.availableStock).toBe(15);
    expect(created.status).toBe("healthy");

    // Prevents duplicate SKU
    await expect(
      inventoryApi.create({
        name: "Duplicate Tee",
        sku: newSku,
        category: "Linen & Casual",
        unitOfMeasure: "pieces",
        reorderPoint: 5,
      }),
    ).rejects.toThrow(/already in use/i);
  });

  it("4. Records stock receipt and updates available quantity and balance", async () => {
    const kurti = db.products.find((p) => p.sku === "KUR-COT-001");
    expect(kurti).toBeDefined();
    if (!kurti) return;

    const initialInv = db.inventory.find((i) => i.productId === kurti.id);
    const prevOnHand = initialInv?.quantityOnHand ?? 0;

    const movement = await inventoryApi.recordMovement({
      productId: kurti.id,
      type: "receipt",
      quantity: 8,
      referenceType: "manual",
      note: "Batch replenishment delivery",
    });

    expect(movement.type).toBe("receipt");
    expect(movement.quantity).toBe(8);
    expect(movement.resultingBalance).toBe(prevOnHand + 8);

    const updatedDetail = await inventoryApi.getById(kurti.id);
    expect(updatedDetail.stockOnHand).toBe(prevOnHand + 8);
    expect(updatedDetail.availableStock).toBe(prevOnHand + 8 - updatedDetail.reservedStock);
  });

  it("5. Triggers low-stock and stockout-risk statuses deterministically", async () => {
    const denim = db.products.find((p) => p.sku === "JKT-DEN-002");
    expect(denim).toBeDefined();
    if (!denim) return;

    const detail = await inventoryApi.getById(denim.id);
    // On hand 8, reserved 6, available 2, reorder point 10
    expect(detail.availableStock).toBe(2);
    expect(detail.status).toBe("stockout_risk");
    expect(detail.statusLabel).toBe("Stockout risk");
  });

  it("6. Generates reorder recommendations with suggested quantities and supplier lead times", async () => {
    const recommendations = await inventoryApi.getReorderRecommendations();
    expect(recommendations.length).toBeGreaterThanOrEqual(1);

    const denimRec = recommendations.find((r) => r.sku === "JKT-DEN-002");
    expect(denimRec).toBeDefined();
    if (!denimRec) return;

    expect(denimRec.currentAvailableStock).toBeLessThan(denimRec.reorderPoint);
    expect(denimRec.suggestedReorderQuantity).toBeGreaterThan(0);
    expect(denimRec.preferredSupplierName).toBe("Mehta Fabrics");
    expect(denimRec.customerCommitmentsAtRisk.length).toBeGreaterThan(0);
    expect(denimRec.proposedPurchaseAmountPaise).toBeGreaterThan(0);
  });

  it("7. Creates purchase order linked to a supplier with line items and financial terms", async () => {
    const supplier = db.suppliers[0];
    const product = db.products[0];
    expect(supplier).toBeDefined();
    expect(product).toBeDefined();
    if (!supplier || !product) return;

    const initialOnOrder =
      db.inventory.find((i) => i.productId === product.id)?.quantityOnOrder ?? 0;

    const po = await purchaseOrderApi.create({
      supplierId: supplier.id,
      orderDate: "2026-10-15",
      expectedDeliveryDate: "2026-10-22",
      paymentTermsDays: 30,
      advanceAmountPaise: 100_000, // ₹1,000
      notes: "Urgent festival season delivery",
      lineItems: [
        {
          productId: product.id,
          quantity: 25,
          unitPricePaise: product.unitCostPaise,
        },
      ],
    });

    expect(po.supplierId).toBe(supplier.id);
    expect(po.status).toBe("confirmed"); // Confirmed due to advance
    expect(po.advancePaidPaise).toBe(100_000);
    expect(po.totalPaise).toBe(25 * product.unitCostPaise);
    expect(po.lineItems?.length).toBe(1);

    // Quantity on order updated
    const updatedInv = db.inventory.find((i) => i.productId === product.id);
    expect(updatedInv?.quantityOnOrder).toBe(initialOnOrder + 25);

    // Scheduled payment recorded in mock store
    const scheduledPay = db.payments.find((p) => p.purchaseOrderId === po.id);
    expect(scheduledPay).toBeDefined();
    expect(scheduledPay?.direction).toBe("outgoing");
  });

  it("8. Records stock receipt against a purchase order and updates order status", async () => {
    const supplier = db.suppliers[1];
    const product = db.products[1];
    if (!supplier || !product) return;

    const po = await purchaseOrderApi.create({
      supplierId: supplier.id,
      orderDate: "2026-10-15",
      expectedDeliveryDate: "2026-10-20",
      lineItems: [
        {
          productId: product.id,
          quantity: 10,
          unitPricePaise: product.unitCostPaise,
        },
      ],
    });

    // Receive partial batch (4 units)
    const partialUpdated = await purchaseOrderApi.recordReceipt(
      po.id,
      [{ productId: product.id, quantity: 4 }],
      "Received first shipment carton",
    );
    expect(partialUpdated.receivedUnits).toBe(4);
    expect(partialUpdated.status).toBe("partially_received");

    // Receive remaining 6 units
    const fullyReceived = await purchaseOrderApi.recordReceipt(
      po.id,
      [{ productId: product.id, quantity: 6 }],
      "Received second shipment carton",
    );
    expect(fullyReceived.receivedUnits).toBe(10);
    expect(fullyReceived.status).toBe("received");
  });

  it("9. Reflects updated records across the dashboard and relationship graph", async () => {
    const summary = await dashboardApi.getSummary();
    expect(summary.lowStockCount).toBeGreaterThanOrEqual(1);

    const graph = buildRelationshipGraph();
    expect(graph.nodes.length).toBeGreaterThan(0);
    expect(graph.edges.length).toBeGreaterThan(0);

    // Verify PO nodes exist in graph
    const poNode = graph.nodes.find((n) => n.type === "purchase_order");
    expect(poNode).toBeDefined();

    // Verify delivery nodes exist
    const deliveryNode = graph.nodes.find((n) => n.type === "inventory_delivery");
    expect(deliveryNode).toBeDefined();
  });

  it("10. Generates deterministic risk alerts with financial exposure", async () => {
    const alerts = await inventoryApi.getRiskAlerts();
    expect(alerts.length).toBeGreaterThanOrEqual(2);

    const stockoutAlert = alerts.find((a) => a.category === "projected_stockout");
    expect(stockoutAlert).toBeDefined();
    expect(stockoutAlert?.severity).toBe("critical");
    expect(stockoutAlert?.financialImpactPaise).toBeGreaterThan(0);
  });
});
