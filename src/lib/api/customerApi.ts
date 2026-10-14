import { DATA_MODE } from "@/lib/config";
import { httpRequest } from "@/lib/api/client";
import { db, delay, nextId } from "@/mocks/store";
import type { Customer, ApiListResponse, ListParams } from "@/types";

export const customerApi = {
  async list(params: ListParams = {}): Promise<ApiListResponse<Customer>> {
    if (DATA_MODE === "mock") {
      await delay();
      const search = params.search?.toLowerCase();
      const filtered = search
        ? db.customers.filter((c) => c.name.toLowerCase().includes(search))
        : db.customers;
      return { data: filtered, total: filtered.length, page: 1, pageSize: filtered.length };
    }
    return httpRequest<ApiListResponse<Customer>>("/api/customers", {
      query: { page: params.page, pageSize: params.pageSize, search: params.search },
    });
  },

  async getById(id: string): Promise<Customer> {
    if (DATA_MODE === "mock") {
      await delay();
      const found = db.customers.find((c) => c.id === id);
      if (!found) throw new Error(`Customer ${id} not found`);
      return found;
    }
    return httpRequest<Customer>(`/api/customers/${id}`);
  },

  async create(input: Omit<Customer, "id" | "businessId">): Promise<Customer> {
    if (DATA_MODE === "mock") {
      await delay();
      const customer: Customer = { ...input, id: nextId("cus"), businessId: db.business.id };
      db.customers.push(customer);
      return customer;
    }
    return httpRequest<Customer>("/api/customers", { method: "POST", body: input });
  },

  async update(id: string, patch: Partial<Customer>): Promise<Customer> {
    if (DATA_MODE === "mock") {
      await delay();
      const existing = db.customers.find((c) => c.id === id);
      if (!existing) throw new Error(`Customer ${id} not found`);
      const updated: Customer = { ...existing, ...patch, id };
      db.customers = db.customers.map((c) => (c.id === id ? updated : c));
      return updated;
    }
    return httpRequest<Customer>(`/api/customers/${id}`, { method: "PATCH", body: patch });
  },

  async remove(id: string): Promise<void> {
    if (DATA_MODE === "mock") {
      await delay();
      db.customers = db.customers.filter((c) => c.id !== id);
      return;
    }
    return httpRequest<void>(`/api/customers/${id}`, { method: "DELETE" });
  },
};
