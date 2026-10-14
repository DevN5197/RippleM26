import { DATA_MODE } from "@/lib/config";
import { httpRequest } from "@/lib/api/client";
import { db, delay } from "@/mocks/store";
import type { InventoryItem, Product, ApiListResponse } from "@/types";

export interface InventoryRow {
  item: InventoryItem;
  product: Product;
  isLowStock: boolean;
}

export const inventoryApi = {
  async list(): Promise<ApiListResponse<InventoryRow>> {
    if (DATA_MODE === "mock") {
      await delay();
      const rows: InventoryRow[] = db.inventory.flatMap((item) => {
        const product = db.products.find((p) => p.id === item.productId);
        if (!product) return [];
        return [{ item, product, isLowStock: item.quantityOnHand < product.reorderPoint }];
      });
      return { data: rows, total: rows.length, page: 1, pageSize: rows.length };
    }
    return httpRequest<ApiListResponse<InventoryRow>>("/api/inventory");
  },

  async adjust(itemId: string, quantityDelta: number): Promise<InventoryItem> {
    if (DATA_MODE === "mock") {
      await delay();
      const item = db.inventory.find((i) => i.id === itemId);
      if (!item) throw new Error(`Inventory item ${itemId} not found`);
      item.quantityOnHand = Math.max(0, item.quantityOnHand + quantityDelta);
      item.updatedAt = new Date().toISOString().slice(0, 10);
      return item;
    }
    return httpRequest<InventoryItem>(`/api/inventory/${itemId}/adjust`, {
      method: "POST",
      body: { quantityDelta },
    });
  },
};
