import { DATA_MODE } from "@/lib/config";
import { httpRequest } from "@/lib/api/client";
import { db, delay, nextId } from "@/mocks/store";
import { calculateCustomerPaymentReliability } from "@/lib/reliability";
import type {
  Customer,
  CreateCustomerInput,
  UpdateCustomerInput,
  EnrichedCustomer,
  CustomerSummaryMetrics,
  CustomerDetailData,
  ApiListResponse,
  ListParams,
} from "@/types";

export interface CustomerListFilterParams extends ListParams {
  status?: "all" | "active" | "archived" | undefined;
  overdueStatus?: "all" | "has_overdue" | "healthy" | undefined;
  sortBy?: "name" | "outstanding" | "reliability" | undefined;
  sortDir?: "asc" | "desc" | undefined;
}

export function enrichCustomer(c: Customer): EnrichedCustomer {
  const todayStr = new Date().toISOString().slice(0, 10);

  // Customer Orders
  const orders = db.customerOrders.filter((co) => co.customerId === c.id);

  // Customer Invoices (receivable)
  const invoices = db.invoices.filter(
    (i) => i.customerId === c.id && (i.type === "receivable" || !i.type),
  );

  const openInvoices = invoices.filter(
    (i) => i.status !== "paid" && i.status !== "void" && i.status !== "cancelled",
  );

  // Overdue Invoices
  const overdueInvoices = openInvoices.filter(
    (i) =>
      i.status === "overdue" ||
      (i.dueDate < todayStr && Math.max(0, i.amountPaise - i.amountPaidPaise) > 0),
  );

  const overdueAmountPaise = overdueInvoices.reduce(
    (sum, i) => sum + Math.max(0, i.amountPaise - i.amountPaidPaise),
    0,
  );

  // Total invoiced and paid
  const totalInvoicedPaise = invoices.reduce((sum, i) => sum + i.amountPaise, 0);
  const totalPaidPaise = invoices.reduce((sum, i) => sum + i.amountPaidPaise, 0);

  // Outstanding calculation
  let calculatedOutstandingPaise = openInvoices.reduce(
    (sum, i) => sum + Math.max(0, i.amountPaise - i.amountPaidPaise),
    0,
  );
  if (calculatedOutstandingPaise === 0 && c.outstandingPaise > 0 && invoices.length === 0) {
    calculatedOutstandingPaise = c.outstandingPaise;
  }

  // Linked payments
  const payments = db.payments.filter(
    (p) => p.customerId === c.id || invoices.some((inv) => inv.id === p.invoiceId),
  );

  // Reliability rating
  const reliability = calculateCustomerPaymentReliability(c, invoices, payments);

  return {
    ...c,
    status: c.status ?? "active",
    calculatedOutstandingPaise,
    overdueInvoicesCount: overdueInvoices.length,
    overdueAmountPaise,
    totalInvoicedPaise,
    totalPaidPaise,
    orderCount: orders.length,
    invoiceCount: invoices.length,
    paymentCount: payments.length,
    reliability,
  };
}

export const customerApi = {
  async list(params: CustomerListFilterParams = {}): Promise<ApiListResponse<EnrichedCustomer>> {
    if (DATA_MODE === "mock") {
      await delay();

      let customers = db.customers.map(enrichCustomer);

      // Status filter
      if (params.status && params.status !== "all") {
        customers = customers.filter((c) => c.status === params.status);
      }

      // Overdue status filter
      if (params.overdueStatus === "has_overdue") {
        customers = customers.filter((c) => c.overdueAmountPaise > 0);
      } else if (params.overdueStatus === "healthy") {
        customers = customers.filter((c) => c.overdueAmountPaise === 0);
      }

      // Search filter
      if (params.search && params.search.trim() !== "") {
        const q = params.search.toLowerCase().trim();
        customers = customers.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.contactName?.toLowerCase().includes(q) ||
            c.email?.toLowerCase().includes(q) ||
            c.phone?.toLowerCase().includes(q) ||
            c.taxId?.toLowerCase().includes(q) ||
            c.address?.toLowerCase().includes(q),
        );
      }

      // Sorting
      const dir = params.sortDir === "desc" ? -1 : 1;
      if (params.sortBy === "name") {
        customers.sort((a, b) => a.name.localeCompare(b.name) * dir);
      } else if (params.sortBy === "outstanding") {
        customers.sort(
          (a, b) => (a.calculatedOutstandingPaise - b.calculatedOutstandingPaise) * dir,
        );
      } else if (params.sortBy === "reliability") {
        customers.sort((a, b) => {
          const scoreA = a.reliability.score ?? -1;
          const scoreB = b.reliability.score ?? -1;
          return (scoreA - scoreB) * dir;
        });
      }

      return {
        data: customers,
        total: customers.length,
        page: 1,
        pageSize: customers.length,
      };
    }

    return httpRequest<ApiListResponse<EnrichedCustomer>>("/api/customers", {
      query: {
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
        status: params.status,
      },
    });
  },

  async getSummaryMetrics(): Promise<CustomerSummaryMetrics> {
    if (DATA_MODE === "mock") {
      await delay();
      const enriched = db.customers.map(enrichCustomer);

      const active = enriched.filter((c) => c.status === "active");
      const archived = enriched.filter((c) => c.status === "archived");

      const totalOutstandingPaise = enriched.reduce(
        (sum, c) => sum + c.calculatedOutstandingPaise,
        0,
      );
      const totalOverduePaise = enriched.reduce((sum, c) => sum + c.overdueAmountPaise, 0);
      const overdueCustomersCount = enriched.filter((c) => c.overdueAmountPaise > 0).length;

      const scoredCustomers = enriched.filter((c) => c.reliability.score !== null);
      const averageReliabilityScore =
        scoredCustomers.length > 0
          ? Math.round(
              scoredCustomers.reduce((sum, c) => sum + (c.reliability.score ?? 0), 0) /
                scoredCustomers.length,
            )
          : null;

      return {
        totalCustomers: enriched.length,
        activeCustomers: active.length,
        archivedCustomers: archived.length,
        totalOutstandingPaise,
        totalOverduePaise,
        overdueCustomersCount,
        averageReliabilityScore,
      };
    }

    return httpRequest<CustomerSummaryMetrics>("/api/customers/summary");
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

  async getDetails(id: string): Promise<CustomerDetailData> {
    if (DATA_MODE === "mock") {
      await delay();
      const customer = db.customers.find((c) => c.id === id);
      if (!customer) throw new Error(`Customer ${id} not found`);

      const enriched = enrichCustomer(customer);
      const orders = db.customerOrders.filter((co) => co.customerId === id);
      const invoices = db.invoices.filter((i) => i.customerId === id);
      const payments = db.payments.filter(
        (p) => p.customerId === id || invoices.some((inv) => inv.id === p.invoiceId),
      );

      const totalOrdersPaise = orders.reduce((sum, o) => sum + o.totalPaise, 0);

      return {
        customer: {
          ...customer,
          status: customer.status ?? "active",
        },
        metrics: {
          totalOrdersPaise,
          totalInvoicedPaise: enriched.totalInvoicedPaise,
          totalPaidPaise: enriched.totalPaidPaise,
          outstandingPaise: enriched.calculatedOutstandingPaise,
          overdueBalancePaise: enriched.overdueAmountPaise,
          openInvoicesCount: invoices.filter(
            (i) => i.status !== "paid" && i.status !== "void" && i.status !== "cancelled",
          ).length,
          overdueInvoicesCount: enriched.overdueInvoicesCount,
          totalOrdersCount: orders.length,
          reliability: enriched.reliability,
        },
        orders,
        invoices,
        payments,
      };
    }

    return httpRequest<CustomerDetailData>(`/api/customers/${id}/details`);
  },

  async create(input: CreateCustomerInput): Promise<Customer> {
    if (DATA_MODE === "mock") {
      await delay();
      const name = input.name.trim();
      if (!name || name.length < 2) {
        throw new Error("Customer name must be at least 2 characters.");
      }

      const duplicate = db.customers.find(
        (c) => c.name.toLowerCase() === name.toLowerCase() && c.status !== "archived",
      );
      if (duplicate) {
        throw new Error(`An active customer named "${name}" already exists.`);
      }

      const customer: Customer = {
        id: nextId("cus"),
        businessId: db.business.id,
        name,
        contactName: input.contactName?.trim() || undefined,
        email: input.email?.trim() || undefined,
        phone: input.phone?.trim() || undefined,
        address: input.address?.trim() || undefined,
        taxId: input.taxId?.trim() || undefined,
        creditTermsDays: Math.max(0, input.creditTermsDays ?? 15),
        outstandingPaise: 0,
        status: input.status ?? "active",
        notes: input.notes?.trim() || undefined,
        createdAt: new Date().toISOString().slice(0, 10),
      };

      db.customers.push(customer);
      return customer;
    }

    return httpRequest<Customer>("/api/customers", { method: "POST", body: input });
  },

  async update(id: string, patch: UpdateCustomerInput): Promise<Customer> {
    if (DATA_MODE === "mock") {
      await delay();
      const existing = db.customers.find((c) => c.id === id);
      if (!existing) throw new Error(`Customer ${id} not found`);

      if (patch.name !== undefined) {
        const nameTrimmed = patch.name.trim();
        if (nameTrimmed.length < 2) {
          throw new Error("Customer name must be at least 2 characters.");
        }
        const duplicate = db.customers.find(
          (c) =>
            c.id !== id &&
            c.name.toLowerCase() === nameTrimmed.toLowerCase() &&
            c.status !== "archived",
        );
        if (duplicate) {
          throw new Error(`An active customer named "${nameTrimmed}" already exists.`);
        }
      }

      const updated: Customer = {
        ...existing,
        ...patch,
        id,
        updatedAt: new Date().toISOString().slice(0, 10),
      };

      db.customers = db.customers.map((c) => (c.id === id ? updated : c));
      return updated;
    }

    return httpRequest<Customer>(`/api/customers/${id}`, { method: "PATCH", body: patch });
  },

  async archive(id: string): Promise<Customer> {
    if (DATA_MODE === "mock") {
      await delay();
      const customer = db.customers.find((c) => c.id === id);
      if (!customer) throw new Error(`Customer ${id} not found`);

      customer.status = "archived";
      customer.updatedAt = new Date().toISOString().slice(0, 10);
      return { ...customer };
    }
    return httpRequest<Customer>(`/api/customers/${id}/archive`, { method: "POST" });
  },

  async unarchive(id: string): Promise<Customer> {
    if (DATA_MODE === "mock") {
      await delay();
      const customer = db.customers.find((c) => c.id === id);
      if (!customer) throw new Error(`Customer ${id} not found`);

      customer.status = "active";
      customer.updatedAt = new Date().toISOString().slice(0, 10);
      return { ...customer };
    }
    return httpRequest<Customer>(`/api/customers/${id}/unarchive`, { method: "POST" });
  },

  async remove(id: string): Promise<void> {
    if (DATA_MODE === "mock") {
      await delay();
      const hasOrders = db.customerOrders.some((co) => co.customerId === id);
      const hasInvoices = db.invoices.some((inv) => inv.customerId === id);
      const hasPayments = db.payments.some((p) => p.customerId === id);

      if (hasOrders || hasInvoices || hasPayments) {
        throw new Error(
          "Cannot permanently delete a customer with historical orders, invoices, or payments. Please archive the customer to preserve records.",
        );
      }

      db.customers = db.customers.filter((c) => c.id !== id);
      return;
    }
    return httpRequest<void>(`/api/customers/${id}`, { method: "DELETE" });
  },
};
