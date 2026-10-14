import { DATA_MODE } from "@/lib/config";
import { httpRequest } from "@/lib/api/client";
import { db, delay, nextId } from "@/mocks/store";
import type { Invoice, Payment, ApiListResponse, ListParams } from "@/types";

export const invoiceApi = {
  async list(params: ListParams = {}): Promise<ApiListResponse<Invoice>> {
    if (DATA_MODE === "mock") {
      await delay();
      const search = params.search?.toLowerCase();
      const filtered = search
        ? db.invoices.filter((i) => i.invoiceNumber.toLowerCase().includes(search))
        : db.invoices;
      return { data: filtered, total: filtered.length, page: 1, pageSize: filtered.length };
    }
    return httpRequest<ApiListResponse<Invoice>>("/api/invoices", {
      query: { page: params.page, pageSize: params.pageSize, search: params.search },
    });
  },

  async getById(id: string): Promise<Invoice> {
    if (DATA_MODE === "mock") {
      await delay();
      const found = db.invoices.find((i) => i.id === id);
      if (!found) throw new Error(`Invoice ${id} not found`);
      return found;
    }
    return httpRequest<Invoice>(`/api/invoices/${id}`);
  },

  async create(input: Omit<Invoice, "id">): Promise<Invoice> {
    if (DATA_MODE === "mock") {
      await delay();
      const invoice: Invoice = { ...input, id: nextId("inv") };
      db.invoices.push(invoice);
      return invoice;
    }
    return httpRequest<Invoice>("/api/invoices", { method: "POST", body: input });
  },

  async update(id: string, patch: Partial<Invoice>): Promise<Invoice> {
    if (DATA_MODE === "mock") {
      await delay();
      const existing = db.invoices.find((i) => i.id === id);
      if (!existing) throw new Error(`Invoice ${id} not found`);
      const updated: Invoice = { ...existing, ...patch, id };
      db.invoices = db.invoices.map((i) => (i.id === id ? updated : i));
      return updated;
    }
    return httpRequest<Invoice>(`/api/invoices/${id}`, { method: "PATCH", body: patch });
  },

  async recordPayment(invoiceId: string, payment: Omit<Payment, "id" | "invoiceId">): Promise<Payment> {
    if (DATA_MODE === "mock") {
      await delay();
      const record: Payment = { ...payment, id: nextId("pay"), invoiceId };
      db.payments.push(record);
      const invoice = db.invoices.find((i) => i.id === invoiceId);
      if (invoice) {
        invoice.amountPaidPaise += payment.amountPaise;
        invoice.status = invoice.amountPaidPaise >= invoice.amountPaise ? "paid" : "partially_paid";
      }
      return record;
    }
    return httpRequest<Payment>(`/api/invoices/${invoiceId}/payments`, {
      method: "POST",
      body: payment,
    });
  },
};
