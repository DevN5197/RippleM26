import { DATA_MODE } from "@/lib/config";
import { httpRequest } from "@/lib/api/client";
import { db, delay, nextId } from "@/mocks/store";
import type {
  PurchaseOrder,
  PurchaseOrderLineItem,
  PurchaseOrderStatus,
  CreatePurchaseOrderInput,
  ApiListResponse,
  Supplier,
  Product,
  InventoryMovement,
  Payment,
  CashFlowEvent,
} from "@/types";

export interface EnrichedPurchaseOrder extends PurchaseOrder {
  supplier?: Supplier | undefined;
  lineItemsDetails?: (PurchaseOrderLineItem & { product?: Product | undefined })[] | undefined;
  orderedUnits: number;
  receivedUnits: number;
  outstandingPaise: number;
}

export interface PurchaseOrderListParams {
  supplierId?: string | undefined;
  status?: PurchaseOrderStatus | "all" | undefined;
  search?: string | undefined;
}

function enrichPurchaseOrder(po: PurchaseOrder): EnrichedPurchaseOrder {
  const supplier = db.suppliers.find((s) => s.id === po.supplierId);

  // Line items
  const lineItems = po.lineItems ?? [
    {
      id: nextId("poli"),
      purchaseOrderId: po.id,
      productId: po.productId ?? "",
      quantity: po.quantity ?? 0,
      unitPricePaise: Math.round(po.totalPaise / Math.max(1, po.quantity ?? 1)),
      totalPaise: po.totalPaise,
      receivedQuantity: po.receivedQuantity ?? 0,
    },
  ];

  const lineItemsDetails = lineItems.map((li) => {
    const product = db.products.find((p) => p.id === li.productId);
    return {
      ...li,
      product,
    };
  });

  const orderedUnits = lineItems.reduce((s, li) => s + li.quantity, 0);
  const receivedUnits =
    po.receivedQuantity ?? lineItems.reduce((s, li) => s + (li.receivedQuantity ?? 0), 0);
  const outstandingPaise = Math.max(0, po.totalPaise - po.advancePaidPaise);

  return {
    ...po,
    supplier,
    lineItemsDetails,
    orderedUnits,
    receivedUnits,
    outstandingPaise,
  };
}

export const purchaseOrderApi = {
  async list(
    params: PurchaseOrderListParams = {},
  ): Promise<ApiListResponse<EnrichedPurchaseOrder>> {
    if (DATA_MODE === "mock") {
      await delay();
      let pos = db.purchaseOrders.map(enrichPurchaseOrder);

      if (params.supplierId && params.supplierId !== "all") {
        pos = pos.filter((po) => po.supplierId === params.supplierId);
      }

      if (params.status && params.status !== "all") {
        pos = pos.filter((po) => po.status === params.status);
      }

      if (params.search && params.search.trim() !== "") {
        const q = params.search.toLowerCase().trim();
        pos = pos.filter(
          (po) =>
            po.poNumber?.toLowerCase().includes(q) ||
            po.supplier?.name.toLowerCase().includes(q) ||
            po.lineItemsDetails?.some((li) => li.product?.name.toLowerCase().includes(q)),
        );
      }

      pos.sort((a, b) => b.orderDate.localeCompare(a.orderDate));

      return {
        data: pos,
        total: pos.length,
        page: 1,
        pageSize: pos.length,
      };
    }

    return httpRequest<ApiListResponse<EnrichedPurchaseOrder>>("/api/purchase-orders", {
      query: {
        supplierId: params.supplierId,
        status: params.status,
        search: params.search,
      },
    });
  },

  async getById(id: string): Promise<EnrichedPurchaseOrder> {
    if (DATA_MODE === "mock") {
      await delay();
      const po = db.purchaseOrders.find((p) => p.id === id || p.poNumber === id);
      if (!po) throw new Error(`Purchase order ${id} not found`);
      return enrichPurchaseOrder(po);
    }

    return httpRequest<EnrichedPurchaseOrder>(`/api/purchase-orders/${id}`);
  },

  async create(input: CreatePurchaseOrderInput): Promise<EnrichedPurchaseOrder> {
    if (DATA_MODE === "mock") {
      await delay();

      if (!input.supplierId) {
        throw new Error("Please select a supplier for this purchase order.");
      }
      if (!input.lineItems || input.lineItems.length === 0) {
        throw new Error("Purchase order must have at least one product line item.");
      }

      const supplier = db.suppliers.find((s) => s.id === input.supplierId);
      if (!supplier) throw new Error(`Supplier ${input.supplierId} not found`);

      const poId = nextId("po");
      const poCount = db.purchaseOrders.length + 1;
      const poNumber = `PO-2026-${String(poCount).padStart(3, "0")}`;

      const lineItems: PurchaseOrderLineItem[] = input.lineItems.map((item, idx) => ({
        id: `poli_${poId}_${idx + 1}`,
        purchaseOrderId: poId,
        productId: item.productId,
        quantity: item.quantity,
        unitPricePaise: item.unitPricePaise,
        totalPaise: item.quantity * item.unitPricePaise,
        receivedQuantity: 0,
      }));

      const totalPaise = lineItems.reduce((s, li) => s + li.totalPaise, 0);
      const advancePaidPaise = Math.min(totalPaise, Math.max(0, input.advanceAmountPaise ?? 0));
      const paymentTermsDays = input.paymentTermsDays ?? supplier.paymentTermsDays ?? 30;

      // Delivery date
      const deliveryDate = new Date(input.expectedDeliveryDate);
      const paymentDueDateObj = new Date(deliveryDate);
      paymentDueDateObj.setDate(deliveryDate.getDate() + paymentTermsDays);
      const paymentDueDate = paymentDueDateObj.toISOString().slice(0, 10);

      const status: PurchaseOrderStatus = advancePaidPaise > 0 ? "confirmed" : "sent";

      const primaryLineItem = lineItems[0];
      const purchaseOrder: PurchaseOrder = {
        id: poId,
        poNumber,
        supplierId: input.supplierId,
        productId: primaryLineItem?.productId,
        quantity: lineItems.reduce((s, li) => s + li.quantity, 0),
        lineItems,
        totalPaise,
        advancePaidPaise,
        status,
        orderDate: input.orderDate,
        expectedDeliveryDate: input.expectedDeliveryDate,
        paymentTermsDays,
        paymentDueDate,
        notes: input.notes,
        receivedQuantity: 0,
      };

      db.purchaseOrders.push(purchaseOrder);

      // Financial Integration: Schedule advance payment if specified
      if (advancePaidPaise > 0) {
        const advPayment: Payment = {
          id: nextId("pay"),
          direction: "outgoing",
          purchaseOrderId: poId,
          amountPaise: advancePaidPaise,
          status: "scheduled",
          scheduledDate: input.orderDate,
          method: "Bank Transfer",
        };
        db.payments.push(advPayment);

        const advCfe: CashFlowEvent = {
          id: nextId("cfe"),
          type: "supplier_payment",
          label: `Advance payment for ${poNumber} (${supplier.name})`,
          counterpartyName: supplier.name,
          direction: "outgoing",
          amountPaise: advancePaidPaise,
          date: input.orderDate,
          relatedPurchaseOrderId: poId,
          isProjected: true,
          status: "scheduled",
        };
        db.cashFlowEvents.push(advCfe);
      }

      // Schedule balance payment on delivery
      const balancePaise = totalPaise - advancePaidPaise;
      if (balancePaise > 0) {
        const balPayment: Payment = {
          id: nextId("pay"),
          direction: "outgoing",
          purchaseOrderId: poId,
          amountPaise: balancePaise,
          status: "scheduled",
          scheduledDate: paymentDueDate,
          method: "Bank Transfer",
        };
        db.payments.push(balPayment);

        const balCfe: CashFlowEvent = {
          id: nextId("cfe"),
          type: "supplier_payment",
          label: `Balance payment for ${poNumber} (${supplier.name})`,
          counterpartyName: supplier.name,
          direction: "outgoing",
          amountPaise: balancePaise,
          date: paymentDueDate,
          relatedPurchaseOrderId: poId,
          isProjected: true,
          status: "scheduled",
        };
        db.cashFlowEvents.push(balCfe);
      }

      // Inventory Integration: Update quantityOnOrder for ordered products
      for (const li of lineItems) {
        let inv = db.inventory.find((i) => i.productId === li.productId);
        if (!inv) {
          inv = {
            id: nextId("inv"),
            productId: li.productId,
            quantityOnHand: 0,
            quantityReserved: 0,
            quantityOnOrder: li.quantity,
            expectedRestockDate: input.expectedDeliveryDate,
            updatedAt: new Date().toISOString().slice(0, 10),
          };
          db.inventory.push(inv);
        } else {
          inv.quantityOnOrder += li.quantity;
          if (!inv.expectedRestockDate || input.expectedDeliveryDate < inv.expectedRestockDate) {
            inv.expectedRestockDate = input.expectedDeliveryDate;
          }
          inv.updatedAt = new Date().toISOString().slice(0, 10);
        }
      }

      return enrichPurchaseOrder(purchaseOrder);
    }

    return httpRequest<EnrichedPurchaseOrder>("/api/purchase-orders", {
      method: "POST",
      body: input,
    });
  },

  async updateStatus(id: string, status: PurchaseOrderStatus): Promise<PurchaseOrder> {
    if (DATA_MODE === "mock") {
      await delay();
      const po = db.purchaseOrders.find((p) => p.id === id);
      if (!po) throw new Error(`Purchase order ${id} not found`);
      po.status = status;
      return po;
    }

    return httpRequest<PurchaseOrder>(`/api/purchase-orders/${id}/status`, {
      method: "PATCH",
      body: { status },
    });
  },

  async recordReceipt(
    poId: string,
    receipts: { productId: string; quantity: number }[],
    notes?: string,
  ): Promise<EnrichedPurchaseOrder> {
    if (DATA_MODE === "mock") {
      await delay();
      const po = db.purchaseOrders.find((p) => p.id === poId);
      if (!po) throw new Error(`Purchase order ${poId} not found`);

      const receiptDate = new Date().toISOString().slice(0, 10);
      let totalReceivedThisBatch = 0;

      for (const rec of receipts) {
        if (rec.quantity <= 0) continue;

        let inv = db.inventory.find((i) => i.productId === rec.productId);
        if (!inv) {
          inv = {
            id: nextId("inv"),
            productId: rec.productId,
            quantityOnHand: rec.quantity,
            quantityReserved: 0,
            quantityOnOrder: 0,
            updatedAt: receiptDate,
          };
          db.inventory.push(inv);
        } else {
          inv.quantityOnHand += rec.quantity;
          inv.quantityOnOrder = Math.max(0, inv.quantityOnOrder - rec.quantity);
          inv.updatedAt = receiptDate;
        }

        // Update line item receivedQuantity
        const lineItem = po.lineItems?.find((li) => li.productId === rec.productId);
        if (lineItem) {
          lineItem.receivedQuantity = (lineItem.receivedQuantity ?? 0) + rec.quantity;
        }

        totalReceivedThisBatch += rec.quantity;

        // Record stock movement
        const movement: InventoryMovement = {
          id: nextId("mov"),
          businessId: db.business.id,
          productId: rec.productId,
          type: "receipt",
          quantity: rec.quantity,
          resultingBalance: inv.quantityOnHand,
          date: receiptDate,
          referenceType: "purchase_order",
          referenceId: po.poNumber ?? po.id,
          note: notes || `Receipt against ${po.poNumber ?? po.id}`,
          createdAt: receiptDate,
        };
        db.inventoryMovements.push(movement);
      }

      po.receivedQuantity = (po.receivedQuantity ?? 0) + totalReceivedThisBatch;
      const totalOrdered = po.quantity ?? po.lineItems?.reduce((s, li) => s + li.quantity, 0) ?? 0;
      if (po.receivedQuantity >= totalOrdered) {
        po.status = "received";
      } else {
        po.status = "partially_received";
      }

      return enrichPurchaseOrder(po);
    }

    return httpRequest<EnrichedPurchaseOrder>(`/api/purchase-orders/${poId}/receive`, {
      method: "POST",
      body: { receipts, notes },
    });
  },
};
