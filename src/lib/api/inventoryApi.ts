import { DATA_MODE } from "@/lib/config";
import { httpRequest } from "@/lib/api/client";
import { db, delay, nextId } from "@/mocks/store";
import type {
  Product,
  InventoryItem,
  InventoryItemWithDetails,
  InventorySummaryMetrics,
  InventoryMovement,
  ReorderRecommendation,
  InventoryRiskAlert,
  CreateProductInput,
  UpdateProductInput,
  RecordMovementInput,
  ApiListResponse,
  StockStatus,
  Supplier,
  PurchaseOrder,
  CustomerOrder,
} from "@/types";

export type InventoryRow = InventoryItemWithDetails;

export interface InventoryListParams {
  search?: string | undefined;
  category?: string | undefined;
  status?: StockStatus | "all" | undefined;
  sortBy?: "name" | "available" | "onHand" | "cost" | "status" | undefined;
  sortDir?: "asc" | "desc" | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
}

export interface ProductDetailResponse {
  product: Product;
  inventory: InventoryItem;
  stockOnHand: number;
  reservedStock: number;
  availableStock: number;
  incomingStock: number;
  reorderThreshold: number;
  unitCostPaise: number;
  inventoryValuationPaise?: number | undefined;
  status: StockStatus;
  statusLabel: string;
  preferredSupplier?: Supplier | undefined;
  movements: InventoryMovement[];
  purchaseOrders: PurchaseOrder[];
  customerOrders: (CustomerOrder & { customerName: string })[];
  forecastDemand: number;
  projectedStockoutDate?: string | undefined;
}

function computeStatus(
  stockOnHand: number,
  availableStock: number,
  incomingStock: number,
  reorderPoint: number,
  openCustomerDemand: number,
): { status: StockStatus; label: string } {
  // If zero physical stock on hand
  if (stockOnHand <= 0 && incomingStock > 0) {
    return { status: "incoming_stock", label: "Incoming stock" };
  }
  if (stockOnHand <= 0 && incomingStock <= 0) {
    return { status: "out_of_stock", label: "Out of stock" };
  }

  // If available stock is exhausted
  if (availableStock <= 0) {
    if (incomingStock > 0) {
      return { status: "incoming_stock", label: "Incoming stock" };
    }
    return { status: "out_of_stock", label: "Out of stock" };
  }

  // Stockout risk: Total stock on hand + incoming is insufficient for confirmed demand,
  // or available stock is critically thin (<= 25% of reorder point) with zero incoming POs
  if (
    stockOnHand + incomingStock < openCustomerDemand ||
    (incomingStock === 0 && availableStock <= Math.ceil(reorderPoint * 0.25))
  ) {
    return { status: "stockout_risk", label: "Stockout risk" };
  }

  // Low stock: Available stock is below reorder point, but incoming replenishment is active or buffer exists
  if (availableStock < reorderPoint) {
    return { status: "low_stock", label: "Low stock" };
  }

  return { status: "healthy", label: "Healthy" };
}

function enrichInventoryRow(product: Product): InventoryItemWithDetails {
  let inv = db.inventory.find((i) => i.productId === product.id);
  if (!inv) {
    inv = {
      id: nextId("inv"),
      productId: product.id,
      quantityOnHand: 0,
      quantityReserved: 0,
      quantityOnOrder: 0,
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    db.inventory.push(inv);
  }

  const stockOnHand = inv.quantityOnHand;
  const reservedStock = inv.quantityReserved ?? 0;
  const availableStock = Math.max(0, stockOnHand - reservedStock);
  const incomingStock = inv.quantityOnOrder;
  const reorderThreshold = product.reorderPoint;
  const unitCostPaise = product.unitCostPaise;
  const inventoryValuationPaise = stockOnHand * unitCostPaise;

  // Find incoming PO
  const relatedPo = db.purchaseOrders
    .filter(
      (po) =>
        (po.productId === product.id ||
          po.lineItems?.some((li) => li.productId === product.id)) &&
        (po.status === "confirmed" || po.status === "sent" || po.status === "partially_received"),
    )
    .sort((a, b) => a.expectedDeliveryDate.localeCompare(b.expectedDeliveryDate))[0];

  const nextExpectedDelivery = relatedPo?.expectedDeliveryDate ?? inv.expectedRestockDate;
  const nextDeliveryPoId = relatedPo?.id;

  // Calculate open customer demand
  const openCustomerDemand = db.customerOrders
    .filter((co) => co.productId === product.id && co.status === "confirmed")
    .reduce((sum, co) => sum + co.quantity, 0);

  const { status, label: statusLabel } = computeStatus(
    stockOnHand,
    availableStock,
    incomingStock,
    reorderThreshold,
    openCustomerDemand,
  );

  const preferredSupplier = product.preferredSupplierId
    ? db.suppliers.find((s) => s.id === product.preferredSupplierId)
    : undefined;

  return {
    product,
    inventory: inv,
    stockOnHand,
    reservedStock,
    availableStock,
    incomingStock,
    reorderThreshold,
    nextExpectedDelivery,
    nextDeliveryPoId,
    unitCostPaise,
    inventoryValuationPaise,
    status,
    statusLabel,
    preferredSupplier,
  };
}

export const inventoryApi = {
  async list(params: InventoryListParams = {}): Promise<ApiListResponse<InventoryItemWithDetails>> {
    if (DATA_MODE === "mock") {
      await delay();
      let rows = db.products.map(enrichInventoryRow);

      // Search filter
      if (params.search && params.search.trim() !== "") {
        const q = params.search.toLowerCase().trim();
        rows = rows.filter(
          (r) =>
            r.product.name.toLowerCase().includes(q) ||
            r.product.sku.toLowerCase().includes(q) ||
            (r.product.category && r.product.category.toLowerCase().includes(q)),
        );
      }

      // Category filter
      if (params.category && params.category !== "all") {
        rows = rows.filter((r) => r.product.category === params.category);
      }

      // Status filter
      if (params.status && params.status !== "all") {
        rows = rows.filter((r) => r.status === params.status);
      }

      // Sorting
      const sortBy = params.sortBy ?? "name";
      const sortDir = params.sortDir ?? "asc";
      rows.sort((a, b) => {
        let cmp = 0;
        if (sortBy === "name") {
          cmp = a.product.name.localeCompare(b.product.name);
        } else if (sortBy === "available") {
          cmp = a.availableStock - b.availableStock;
        } else if (sortBy === "onHand") {
          cmp = a.stockOnHand - b.stockOnHand;
        } else if (sortBy === "cost") {
          cmp = a.unitCostPaise - b.unitCostPaise;
        } else if (sortBy === "status") {
          cmp = a.status.localeCompare(b.status);
        }
        return sortDir === "desc" ? -cmp : cmp;
      });

      const page = params.page ?? 1;
      const pageSize = params.pageSize ?? 50;
      const start = (page - 1) * pageSize;
      const paginated = rows.slice(start, start + pageSize);

      return {
        data: paginated,
        total: rows.length,
        page,
        pageSize,
      };
    }

    return httpRequest<ApiListResponse<InventoryItemWithDetails>>("/api/inventory", {
      query: {
        search: params.search,
        category: params.category,
        status: params.status,
        sortBy: params.sortBy,
        sortDir: params.sortDir,
        page: params.page,
        pageSize: params.pageSize,
      },
    });
  },

  async getSummary(): Promise<InventorySummaryMetrics> {
    if (DATA_MODE === "mock") {
      await delay(150);
      const rows = db.products.map(enrichInventoryRow);

      const totalProducts = rows.length;
      const totalAvailableUnits = rows.reduce((s, r) => s + r.availableStock, 0);
      const lowStockCount = rows.filter((r) => r.status === "low_stock").length;
      const stockoutRiskCount = rows.filter((r) => r.status === "stockout_risk").length;
      const incomingUnits = rows.reduce((s, r) => s + r.incomingStock, 0);
      const estimatedValuationPaise = rows.reduce(
        (s, r) => s + (r.inventoryValuationPaise ?? 0),
        0,
      );

      return {
        totalProducts,
        totalAvailableUnits,
        lowStockCount,
        stockoutRiskCount,
        incomingUnits,
        estimatedValuationPaise,
      };
    }

    return httpRequest<InventorySummaryMetrics>("/api/inventory/summary");
  },

  async getById(productId: string): Promise<ProductDetailResponse> {
    if (DATA_MODE === "mock") {
      await delay();
      const product = db.products.find((p) => p.id === productId);
      if (!product) throw new Error(`Product ${productId} not found`);

      const enriched = enrichInventoryRow(product);

      const movements = db.inventoryMovements
        .filter((m) => m.productId === productId)
        .sort((a, b) => b.date.localeCompare(a.date));

      const purchaseOrders = db.purchaseOrders.filter(
        (po) =>
          po.productId === productId ||
          po.lineItems?.some((li) => li.productId === productId),
      );

      const customerOrders = db.customerOrders
        .filter((co) => co.productId === productId)
        .map((co) => {
          const customer = db.customers.find((c) => c.id === co.customerId);
          return {
            ...co,
            customerName: customer?.name ?? "Customer",
          };
        });

      // Calculate forecast demand: default 5 units/week or open order volume
      const totalCustomerQty = customerOrders.reduce((s, o) => s + o.quantity, 0);
      const forecastDemand = Math.max(5, Math.ceil(totalCustomerQty / 2));

      // Calculate projected stockout date
      let projectedStockoutDate: string | undefined = undefined;
      if (forecastDemand > 0) {
        const daysLeft = Math.floor((enriched.availableStock / forecastDemand) * 7);
        const today = new Date();
        const stockout = new Date(today);
        stockout.setDate(today.getDate() + daysLeft);
        projectedStockoutDate = stockout.toISOString().slice(0, 10);
      }

      return {
        product: enriched.product,
        inventory: enriched.inventory,
        stockOnHand: enriched.stockOnHand,
        reservedStock: enriched.reservedStock,
        availableStock: enriched.availableStock,
        incomingStock: enriched.incomingStock,
        reorderThreshold: enriched.reorderThreshold,
        unitCostPaise: enriched.unitCostPaise,
        inventoryValuationPaise: enriched.inventoryValuationPaise,
        status: enriched.status,
        statusLabel: enriched.statusLabel,
        preferredSupplier: enriched.preferredSupplier,
        movements,
        purchaseOrders,
        customerOrders,
        forecastDemand,
        projectedStockoutDate,
      };
    }

    return httpRequest<ProductDetailResponse>(`/api/inventory/${productId}`);
  },

  async create(input: CreateProductInput): Promise<InventoryItemWithDetails> {
    if (DATA_MODE === "mock") {
      await delay();

      // Check SKU uniqueness
      const skuExists = db.products.some(
        (p) => p.sku.toLowerCase() === input.sku.toLowerCase().trim(),
      );
      if (skuExists) {
        throw new Error(`SKU "${input.sku}" is already in use.`);
      }

      const product: Product = {
        id: nextId("prd"),
        businessId: db.business.id,
        sku: input.sku.trim().toUpperCase(),
        name: input.name.trim(),
        category: input.category.trim(),
        description: input.description?.trim(),
        unitOfMeasure: input.unitOfMeasure?.trim() || "pieces",
        preferredSupplierId: input.preferredSupplierId,
        currency: input.currency ?? "INR",
        unitCostPaise: input.unitCostPaise ?? 0,
        unitPricePaise: Math.round((input.unitCostPaise ?? 0) * 1.6),
        reorderPoint: input.reorderPoint,
      };

      db.products.push(product);

      const initialQty = Math.max(0, input.initialStockQuantity ?? 0);
      const inv: InventoryItem = {
        id: nextId("inv"),
        productId: product.id,
        quantityOnHand: initialQty,
        quantityReserved: 0,
        quantityOnOrder: 0,
        updatedAt: new Date().toISOString().slice(0, 10),
      };
      db.inventory.push(inv);

      if (initialQty > 0) {
        const movement: InventoryMovement = {
          id: nextId("mov"),
          businessId: db.business.id,
          productId: product.id,
          type: "receipt",
          quantity: initialQty,
          resultingBalance: initialQty,
          date: new Date().toISOString().slice(0, 10),
          referenceType: "manual",
          note: "Initial opening stock recorded on product creation",
          createdAt: new Date().toISOString().slice(0, 10),
        };
        db.inventoryMovements.push(movement);
      }

      return enrichInventoryRow(product);
    }

    return httpRequest<InventoryItemWithDetails>("/api/inventory", {
      method: "POST",
      body: input,
    });
  },

  async update(productId: string, patch: UpdateProductInput): Promise<Product> {
    if (DATA_MODE === "mock") {
      await delay();
      const product = db.products.find((p) => p.id === productId);
      if (!product) throw new Error(`Product ${productId} not found`);

      if (patch.sku && patch.sku !== product.sku) {
        const skuExists = db.products.some(
          (p) => p.id !== productId && p.sku.toLowerCase() === patch.sku?.toLowerCase().trim(),
        );
        if (skuExists) {
          throw new Error(`SKU "${patch.sku}" is already in use.`);
        }
        product.sku = patch.sku.trim().toUpperCase();
      }

      if (patch.name !== undefined) product.name = patch.name.trim();
      if (patch.category !== undefined) product.category = patch.category.trim();
      if (patch.description !== undefined) product.description = patch.description.trim();
      if (patch.unitOfMeasure !== undefined) product.unitOfMeasure = patch.unitOfMeasure.trim();
      if (patch.reorderPoint !== undefined) product.reorderPoint = patch.reorderPoint;
      if (patch.preferredSupplierId !== undefined) product.preferredSupplierId = patch.preferredSupplierId;
      if (patch.unitCostPaise !== undefined) product.unitCostPaise = patch.unitCostPaise;

      return product;
    }

    return httpRequest<Product>(`/api/inventory/${productId}`, {
      method: "PATCH",
      body: patch,
    });
  },

  async recordMovement(input: RecordMovementInput): Promise<InventoryMovement> {
    if (DATA_MODE === "mock") {
      await delay();
      if (input.quantity <= 0) {
        throw new Error("Movement quantity must be greater than zero.");
      }

      const product = db.products.find((p) => p.id === input.productId);
      if (!product) throw new Error(`Product ${input.productId} not found`);

      let inv = db.inventory.find((i) => i.productId === input.productId);
      if (!inv) {
        inv = {
          id: nextId("inv"),
          productId: input.productId,
          quantityOnHand: 0,
          quantityReserved: 0,
          quantityOnOrder: 0,
          updatedAt: new Date().toISOString().slice(0, 10),
        };
        db.inventory.push(inv);
      }

      const movementDate = input.date ?? new Date().toISOString().slice(0, 10);

      switch (input.type) {
        case "receipt": {
          inv.quantityOnHand += input.quantity;
          if (input.referenceType === "purchase_order" && input.referenceId) {
            // Check if PO exists and update received units
            const po = db.purchaseOrders.find(
              (p) => p.id === input.referenceId || p.poNumber === input.referenceId,
            );
            if (po) {
              inv.quantityOnOrder = Math.max(0, inv.quantityOnOrder - input.quantity);
              po.receivedQuantity = (po.receivedQuantity ?? 0) + input.quantity;
              const totalPoQty = po.quantity ?? po.lineItems?.reduce((s, li) => s + li.quantity, 0) ?? 0;
              if (po.receivedQuantity >= totalPoQty) {
                po.status = "received";
              } else {
                po.status = "partially_received";
              }
            }
          }
          break;
        }

        case "sale": {
          if (inv.quantityOnHand < input.quantity) {
            throw new Error(`Insufficient stock on hand (${inv.quantityOnHand} units) to fulfill sale.`);
          }
          inv.quantityOnHand -= input.quantity;
          if ((inv.quantityReserved ?? 0) > 0) {
            inv.quantityReserved = Math.max(0, (inv.quantityReserved ?? 0) - input.quantity);
          }
          break;
        }

        case "reservation": {
          const available = inv.quantityOnHand - (inv.quantityReserved ?? 0);
          if (available < input.quantity) {
            throw new Error(`Insufficient available stock (${available} units) to reserve ${input.quantity} units.`);
          }
          inv.quantityReserved = (inv.quantityReserved ?? 0) + input.quantity;
          break;
        }

        case "reservation_release": {
          inv.quantityReserved = Math.max(0, (inv.quantityReserved ?? 0) - input.quantity);
          break;
        }

        case "adjustment": {
          if (!input.note || input.note.trim() === "") {
            throw new Error("A reason note is required for stock adjustments.");
          }
          // Adjustment quantity delta can increase or decrease stock
          inv.quantityOnHand = Math.max(0, inv.quantityOnHand + input.quantity);
          break;
        }

        case "return": {
          inv.quantityOnHand += input.quantity;
          break;
        }
      }

      inv.updatedAt = new Date().toISOString().slice(0, 10);

      const movement: InventoryMovement = {
        id: nextId("mov"),
        businessId: db.business.id,
        productId: input.productId,
        type: input.type,
        quantity: input.quantity,
        resultingBalance: inv.quantityOnHand,
        date: movementDate,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        note: input.note,
        createdAt: new Date().toISOString().slice(0, 10),
      };

      db.inventoryMovements.push(movement);
      return movement;
    }

    return httpRequest<InventoryMovement>("/api/inventory/transactions", {
      method: "POST",
      body: input,
    });
  },

  async getReorderRecommendations(): Promise<ReorderRecommendation[]> {
    if (DATA_MODE === "mock") {
      await delay(200);
      const recommendations: ReorderRecommendation[] = [];

      for (const product of db.products) {
        const enriched = enrichInventoryRow(product);
        const preferredSupplier = enriched.preferredSupplier;

        // Find customer orders commitments
        const customerOrders = db.customerOrders.filter(
          (co) => co.productId === product.id && co.status === "confirmed",
        );
        const customerCommitmentsAtRisk = customerOrders.map((co) => {
          const cust = db.customers.find((c) => c.id === co.customerId);
          return `${cust?.name ?? "Customer"} (${co.quantity} units due ${co.deliveryDate ?? "soon"})`;
        });

        const isLow = enriched.availableStock < product.reorderPoint;
        const isStockoutRisk = enriched.status === "stockout_risk";
        const isOutOfStock = enriched.availableStock === 0;

        if (isLow || isStockoutRisk || isOutOfStock) {
          const leadDays = preferredSupplier?.paymentTermsDays ?? 15;
          const today = new Date();
          const deliveryDate = new Date(today);
          deliveryDate.setDate(today.getDate() + leadDays);
          const estimatedDeliveryDate = deliveryDate.toISOString().slice(0, 10);

          // Calculate suggested reorder: bring stock to 2x reorder point or minimum economic quantity
          const targetStock = Math.max(product.reorderPoint * 2, 20);
          const currentDeficit = targetStock - enriched.availableStock - enriched.incomingStock;
          const suggestedReorderQuantity = Math.max(10, currentDeficit > 0 ? currentDeficit : 10);

          const proposedPurchaseAmountPaise = suggestedReorderQuantity * product.unitCostPaise;
          const requiredAdvancePaise = preferredSupplier
            ? Math.round(proposedPurchaseAmountPaise * 0.15) // standard 15% advance for apparel mills
            : 0;

          const forecastDemand = Math.max(5, customerOrders.reduce((s, o) => s + o.quantity, 0));

          let reason = "";
          if (enriched.stockOnHand === 0 && enriched.incomingStock === 0) {
            reason = "Zero stock on hand and no incoming purchase order.";
          } else if (isStockoutRisk) {
            reason = `Committed orders (${customerOrders.reduce((s, o) => s + o.quantity, 0)} units) exceed available stock (${enriched.availableStock} units).`;
          } else {
            reason = `Available stock (${enriched.availableStock} units) is below reorder threshold (${product.reorderPoint} units).`;
          }

          recommendations.push({
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            category: product.category,
            currentAvailableStock: enriched.availableStock,
            reorderPoint: product.reorderPoint,
            incomingQuantity: enriched.incomingStock,
            forecastDemand,
            estimatedStockoutDate: enriched.nextExpectedDelivery,
            suggestedReorderQuantity,
            preferredSupplierId: preferredSupplier?.id,
            preferredSupplierName: preferredSupplier?.name,
            preferredSupplierLeadDays: leadDays,
            estimatedDeliveryDate,
            proposedPurchaseAmountPaise,
            requiredAdvancePaise,
            relatedCustomerOrderCount: customerOrders.length,
            customerCommitmentsAtRisk,
            reason,
            hasSufficientData: true,
          });
        }
      }

      return recommendations;
    }

    return httpRequest<ReorderRecommendation[]>("/api/inventory/reorder-recommendations");
  },

  async getRiskAlerts(): Promise<InventoryRiskAlert[]> {
    if (DATA_MODE === "mock") {
      await delay(150);
      const alerts: InventoryRiskAlert[] = [];

      // Alert 1: Denim Jacket stockout risk
      const denim = db.products.find((p) => p.sku === "JKT-DEN-002");
      if (denim) {
        alerts.push({
          id: "alert_inv_1",
          severity: "critical",
          category: "projected_stockout",
          title: "Projected stockout: Denim Jacket (JKT-DEN-002)",
          explanation:
            "Only 2 units available with 6 units reserved for Style Mart on Day 9. Zero incoming purchase orders placed.",
          productId: denim.id,
          productName: denim.name,
          sku: denim.sku,
          supplierId: "sup_2",
          supplierName: "Mehta Fabrics",
          customerOrderId: "co_2",
          customerName: "Style Mart",
          relevantDate: "Day 9",
          financialImpactPaise: 1_320_000, // ₹13,200
          actionType: "simulate",
        });
      }

      // Alert 2: Cotton Kurti PO-1 delivery window
      const kurti = db.products.find((p) => p.sku === "KUR-COT-001");
      if (kurti) {
        alerts.push({
          id: "alert_inv_2",
          severity: "warning",
          category: "delayed_supplier_delivery",
          title: "Tight delivery lead time: Cotton Kurti (PO-2026-001)",
          explanation:
            "Replenishment arrival on Day 4 is required to fulfill the 10-unit Urban Threads order scheduled for Day 6. Any delivery delay will cause fulfillment failure.",
          productId: kurti.id,
          productName: kurti.name,
          sku: kurti.sku,
          purchaseOrderId: "po_1",
          supplierId: "sup_1",
          supplierName: "Shree Textiles",
          customerOrderId: "co_1",
          customerName: "Urban Threads Boutique",
          relevantDate: "Day 4",
          financialImpactPaise: 800_000, // ₹8,000
          actionType: "view_po",
        });
      }

      // Alert 3: Khadi Trousers out of stock
      const khadi = db.products.find((p) => p.sku === "TRS-KHA-005");
      if (khadi) {
        alerts.push({
          id: "alert_inv_3",
          severity: "critical",
          category: "projected_stockout",
          title: "Out of stock: Handloom Khadi Trousers (TRS-KHA-005)",
          explanation:
            "Zero units on hand and no incoming purchase order. Reorder required to maintain catalog availability.",
          productId: khadi.id,
          productName: khadi.name,
          sku: khadi.sku,
          supplierId: "sup_1",
          supplierName: "Shree Textiles",
          relevantDate: "Today",
          financialImpactPaise: 600_000,
          actionType: "view_product",
        });
      }

      // Alert 4: Advance paid prior to invoice receipt
      alerts.push({
        id: "alert_inv_4",
        severity: "info",
        category: "advance_before_customer_receipt",
        title: "Liquidity gap: PO advance paid before customer collection",
        explanation:
          "PO-2026-001 requires ₹5,000 advance payment today, whereas customer invoice INV-2001 collection is scheduled on Day 21.",
        purchaseOrderId: "po_1",
        supplierId: "sup_1",
        supplierName: "Shree Textiles",
        relevantDate: "Day 21",
        financialImpactPaise: 500_000,
        actionType: "inspect_cash_flow",
      });

      return alerts;
    }

    return httpRequest<InventoryRiskAlert[]>("/api/inventory/alerts");
  },
};
