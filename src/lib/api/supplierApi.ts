import { DATA_MODE } from "@/lib/config";
import { httpRequest } from "@/lib/api/client";
import { db, delay, nextId } from "@/mocks/store";
import type { Supplier, ApiListResponse, ListParams } from "@/types";

export const supplierApi = {
  async list(params: ListParams = {}): Promise<ApiListResponse<Supplier>> {
    if (DATA_MODE === "mock") {
      await delay();
      const search = params.search?.toLowerCase();
      const filtered = search
        ? db.suppliers.filter((s) => s.name.toLowerCase().includes(search))
        : db.suppliers;
      return { data: filtered, total: filtered.length, page: 1, pageSize: filtered.length };
    }
    return httpRequest<ApiListResponse<Supplier>>("/api/suppliers", {
      query: { page: params.page, pageSize: params.pageSize, search: params.search },
    });
  },

  async getById(id: string): Promise<Supplier> {
    if (DATA_MODE === "mock") {
      await delay();
      const found = db.suppliers.find((s) => s.id === id);
      if (!found) throw new Error(`Supplier ${id} not found`);
      return found;
    }
    return httpRequest<Supplier>(`/api/suppliers/${id}`);
  },

  async create(input: Omit<Supplier, "id" | "businessId">): Promise<Supplier> {
    if (DATA_MODE === "mock") {
      await delay();
      const supplier: Supplier = { ...input, id: nextId("sup"), businessId: db.business.id };
      db.suppliers.push(supplier);
      return supplier;
    }
    return httpRequest<Supplier>("/api/suppliers", { method: "POST", body: input });
  },

  async update(id: string, patch: Partial<Supplier>): Promise<Supplier> {
    if (DATA_MODE === "mock") {
      await delay();
      const existing = db.suppliers.find((s) => s.id === id);
      if (!existing) throw new Error(`Supplier ${id} not found`);
      const updated: Supplier = { ...existing, ...patch, id };
      db.suppliers = db.suppliers.map((s) => (s.id === id ? updated : s));
      return updated;
    }
    return httpRequest<Supplier>(`/api/suppliers/${id}`, { method: "PATCH", body: patch });
  },

  async remove(id: string): Promise<void> {
    if (DATA_MODE === "mock") {
      await delay();
      db.suppliers = db.suppliers.filter((s) => s.id !== id);
      return;
    }
    return httpRequest<void>(`/api/suppliers/${id}`, { method: "DELETE" });
  },
};
