import { DATA_MODE } from "@/lib/config";
import { httpRequest } from "@/lib/api/client";
import { db, delay, nextId } from "@/mocks/store";
import type {
  Supplier,
  CreateSupplierInput,
  UpdateSupplierInput,
  EnrichedSupplier,
  SupplierSummaryMetrics,
  SupplierDetailData,
  SupplierPaymentCommitment,
  ApiListResponse,
  ListParams,
  PurchaseOrder,
  PurchaseOrderLineItem,
  Invoice,
  Payment,
  Product,
} from "@/types";

export interface SupplierListFilterParams extends ListParams {
  status?: "all" | "active" | "archived" | undefined;
  riskStatus?: "all" | "at_risk" | "healthy" | undefined;
  sortBy?: "name" | "outstanding" | "nextPayment" | "reliability" | undefined;
  sortDir?: "asc" | "desc" | undefined;
}

function enrichSupplier(s: Supplier): EnrichedSupplier {
  const todayStr = new Date().toISOString().slice(0, 10);

  // Linked Purchase Orders
  const pos = db.purchaseOrders.filter((po) => po.supplierId === s.id);
  const openPos = pos.filter((po) => po.status !== "received" && po.status !== "cancelled");

  // Linked Payable Invoices
  const invoices = db.invoices.filter(
    (i) => (!i.type || i.type === "payable") && i.supplierId === s.id,
  );
  const openInvoices = invoices.filter((i) => i.status !== "paid" && i.status !== "void");

  // Scheduled Outgoing Payments
  const payments = db.payments.filter(
    (p) =>
      p.direction === "outgoing" &&
      p.status === "scheduled" &&
      (p.supplierId === s.id ||
        pos.some((po) => po.id === p.purchaseOrderId) ||
        invoices.some((inv) => inv.id === p.invoiceId)),
  );

  payments.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  const nextPayment = payments[0];

  // Overdue calculation
  const overdueInvoices = invoices.filter(
    (i) =>
      i.status === "overdue" ||
      (i.dueDate < todayStr && i.status !== "paid" && i.status !== "void"),
  );
  const overdueAmountPaise = overdueInvoices.reduce(
    (sum, i) => sum + Math.max(0, i.amountPaise - i.amountPaidPaise),
    0,
  );

  // Dynamic outstanding calculation
  let calculatedOutstandingPaise = s.outstandingPaise;
  if (invoices.length > 0) {
    const invoiceOutstanding = openInvoices.reduce(
      (sum, i) => sum + Math.max(0, i.amountPaise - i.amountPaidPaise),
      0,
    );
    calculatedOutstandingPaise = Math.max(s.outstandingPaise, invoiceOutstanding);
  } else if (openPos.length > 0) {
    const poOutstanding = openPos.reduce(
      (sum, po) => sum + Math.max(0, po.totalPaise - po.advancePaidPaise),
      0,
    );
    calculatedOutstandingPaise = Math.max(s.outstandingPaise, poOutstanding);
  }

  const hasOverdue = overdueAmountPaise > 0;
  const riskReasons: string[] = [];

  if (s.reliabilityScore < 80) {
    riskReasons.push(`Reliability score is ${s.reliabilityScore}% (below 80% threshold)`);
  }
  if (hasOverdue) {
    riskReasons.push(`Overdue balance of ₹${(overdueAmountPaise / 100).toLocaleString("en-IN")}`);
  }
  const delayedPo = openPos.find((po) => po.status === "delayed");
  if (delayedPo) {
    riskReasons.push(`Purchase order ${delayedPo.poNumber ?? delayedPo.id} is delayed`);
  }

  const isAtRisk = riskReasons.length > 0;

  return {
    ...s,
    status: s.status ?? "active",
    outstandingPaise: calculatedOutstandingPaise,
    openPoCount: openPos.length,
    totalPoCount: pos.length,
    nextPaymentDate: nextPayment?.scheduledDate,
    nextPaymentAmountPaise: nextPayment?.amountPaise,
    overdueAmountPaise,
    hasOverdue,
    isAtRisk,
    riskReasons,
    payableInvoicesCount: openInvoices.length,
  };
}

export const supplierApi = {
  async list(params: SupplierListFilterParams = {}): Promise<ApiListResponse<EnrichedSupplier>> {
    if (DATA_MODE === "mock") {
      await delay();

      let suppliers = db.suppliers.map(enrichSupplier);

      // Status filter
      if (params.status && params.status !== "all") {
        suppliers = suppliers.filter((s) => s.status === params.status);
      }

      // Risk status filter
      if (params.riskStatus === "at_risk") {
        suppliers = suppliers.filter((s) => s.isAtRisk);
      } else if (params.riskStatus === "healthy") {
        suppliers = suppliers.filter((s) => !s.isAtRisk);
      }

      // Search filter
      if (params.search && params.search.trim() !== "") {
        const q = params.search.toLowerCase().trim();
        suppliers = suppliers.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.contactName?.toLowerCase().includes(q) ||
            s.email?.toLowerCase().includes(q) ||
            s.phone?.toLowerCase().includes(q) ||
            s.taxId?.toLowerCase().includes(q) ||
            s.address?.toLowerCase().includes(q),
        );
      }

      // Sorting
      const dir = params.sortDir === "desc" ? -1 : 1;
      if (params.sortBy === "name") {
        suppliers.sort((a, b) => a.name.localeCompare(b.name) * dir);
      } else if (params.sortBy === "outstanding") {
        suppliers.sort((a, b) => (a.outstandingPaise - b.outstandingPaise) * dir);
      } else if (params.sortBy === "nextPayment") {
        suppliers.sort((a, b) => {
          if (!a.nextPaymentDate && !b.nextPaymentDate) return 0;
          if (!a.nextPaymentDate) return 1;
          if (!b.nextPaymentDate) return -1;
          return a.nextPaymentDate.localeCompare(b.nextPaymentDate) * dir;
        });
      } else if (params.sortBy === "reliability") {
        suppliers.sort((a, b) => (a.reliabilityScore - b.reliabilityScore) * dir);
      } else {
        // Default sort: Active first, then by name
        suppliers.sort((a, b) => {
          if (a.status !== b.status) {
            return a.status === "active" ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });
      }

      const total = suppliers.length;
      const page = params.page ?? 1;
      const pageSize = params.pageSize ?? 50;
      const startIndex = (page - 1) * pageSize;
      const paginated = suppliers.slice(startIndex, startIndex + pageSize);

      return {
        data: paginated,
        total,
        page,
        pageSize,
      };
    }

    return httpRequest<ApiListResponse<EnrichedSupplier>>("/api/suppliers", {
      query: {
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
        status: params.status,
        riskStatus: params.riskStatus,
        sortBy: params.sortBy,
        sortDir: params.sortDir,
      },
    });
  },

  async getSummaryMetrics(): Promise<SupplierSummaryMetrics> {
    if (DATA_MODE === "mock") {
      await delay();
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);
      const sevenDaysLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);

      const enriched = db.suppliers.map(enrichSupplier);
      const active = enriched.filter((s) => s.status === "active");
      const archived = enriched.filter((s) => s.status === "archived");

      const totalOutstandingPayablesPaise = active.reduce((sum, s) => sum + s.outstandingPaise, 0);

      const overduePayablesPaise = active.reduce((sum, s) => sum + s.overdueAmountPaise, 0);

      // Scheduled outgoing payments to active suppliers due within 7 days
      const dueInSevenDaysPaise = db.payments
        .filter((p) => {
          if (p.direction !== "outgoing" || p.status !== "scheduled") return false;
          if (p.scheduledDate < todayStr || p.scheduledDate > sevenDaysLater) return false;
          // check if linked to active supplier
          if (p.supplierId) {
            const sup = db.suppliers.find((s) => s.id === p.supplierId);
            return sup?.status !== "archived";
          }
          if (p.purchaseOrderId) {
            const po = db.purchaseOrders.find((o) => o.id === p.purchaseOrderId);
            const sup = db.suppliers.find((s) => s.id === po?.supplierId);
            return sup?.status !== "archived";
          }
          return true;
        })
        .reduce((sum, p) => sum + p.amountPaise, 0);

      const atRiskSuppliersCount = active.filter((s) => s.isAtRisk).length;

      return {
        totalSuppliers: db.suppliers.length,
        activeSuppliers: active.length,
        archivedSuppliers: archived.length,
        totalOutstandingPayablesPaise,
        dueInSevenDaysPaise,
        overduePayablesPaise,
        atRiskSuppliersCount,
      };
    }

    return httpRequest<SupplierSummaryMetrics>("/api/suppliers/summary");
  },

  async getById(id: string): Promise<Supplier> {
    if (DATA_MODE === "mock") {
      await delay();
      const found = db.suppliers.find((s) => s.id === id);
      if (!found) throw new Error(`Supplier "${id}" not found`);
      return found;
    }
    return httpRequest<Supplier>(`/api/suppliers/${id}`);
  },

  async getSupplierDetail(id: string): Promise<SupplierDetailData> {
    if (DATA_MODE === "mock") {
      await delay();
      const supplier = db.suppliers.find((s) => s.id === id);
      if (!supplier) throw new Error(`Supplier "${id}" not found`);

      const todayStr = new Date().toISOString().slice(0, 10);

      // Linked Purchase Orders with line items and product details
      const rawPos = db.purchaseOrders.filter((po) => po.supplierId === id);
      const purchaseOrders = rawPos.map((po) => {
        const lineItems = po.lineItems ?? [];
        const lineItemsDetails = lineItems.map((li) => ({
          ...li,
          product: db.products.find((p) => p.id === li.productId),
        }));
        const orderedUnits = lineItems.reduce((s, li) => s + li.quantity, 0) || po.quantity || 0;
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
      });

      // Linked Payable Invoices
      const invoices = db.invoices.filter(
        (i) => (!i.type || i.type === "payable") && i.supplierId === id,
      );

      // Linked Payments (both by supplierId directly or via linked PO or invoice)
      const allSupplierPayments = db.payments.filter(
        (p) =>
          p.direction === "outgoing" &&
          (p.supplierId === id ||
            rawPos.some((po) => po.id === p.purchaseOrderId) ||
            invoices.some((inv) => inv.id === p.invoiceId)),
      );

      const completedPayments = allSupplierPayments.filter((p) => p.status === "completed");

      const upcomingPayments: SupplierPaymentCommitment[] = allSupplierPayments
        .filter((p) => p.status === "scheduled")
        .map((p) => {
          const linkedPo = rawPos.find((po) => po.id === p.purchaseOrderId);
          const linkedInv = invoices.find((inv) => inv.id === p.invoiceId);
          const dueDate = p.scheduledDate;

          let cashFlowImpactNote = "Scheduled disbursement";
          if (dueDate <= todayStr) {
            cashFlowImpactNote = "Payment due today / pending settlement";
          } else {
            const diffDays = Math.ceil(
              (new Date(dueDate).getTime() - new Date(todayStr).getTime()) / (1000 * 3600 * 24),
            );
            cashFlowImpactNote = `Scheduled outflow in ${diffDays} day${diffDays === 1 ? "" : "s"}`;
          }

          return {
            ...p,
            dueDate,
            linkedPoNumber: linkedPo?.poNumber ?? linkedPo?.id,
            linkedInvoiceNumber: linkedInv?.invoiceNumber ?? linkedInv?.id,
            linkedReference: linkedPo?.poNumber ?? linkedInv?.invoiceNumber ?? p.purchaseOrderId,
            cashFlowImpactNote,
          };
        });

      // Products supplied
      const products = db.products.filter((p) => p.preferredSupplierId === id);

      // Financial computations
      const totalPoPaise = purchaseOrders.reduce((sum, po) => sum + po.totalPaise, 0);
      const totalInvoicePaise = invoices.reduce((sum, inv) => sum + inv.amountPaise, 0);
      const totalPurchasesPaise = Math.max(totalPoPaise, totalInvoicePaise);

      const totalPaymentsMadePaise = completedPayments.reduce((sum, p) => sum + p.amountPaise, 0);

      const overdueInvoices = invoices.filter(
        (i) =>
          i.status === "overdue" ||
          (i.dueDate < todayStr && i.status !== "paid" && i.status !== "void"),
      );
      const overdueBalancePaise = overdueInvoices.reduce(
        (sum, i) => sum + Math.max(0, i.amountPaise - i.amountPaidPaise),
        0,
      );

      const openPos = purchaseOrders.filter(
        (po) => po.status !== "received" && po.status !== "cancelled",
      );
      const poOutstanding = openPos.reduce((sum, po) => sum + po.outstandingPaise, 0);
      const openInvoices = invoices.filter((i) => i.status !== "paid" && i.status !== "void");
      const invOutstanding = openInvoices.reduce(
        (sum, i) => sum + Math.max(0, i.amountPaise - i.amountPaidPaise),
        0,
      );
      const outstandingPayablesPaise = Math.max(
        supplier.outstandingPaise,
        Math.max(poOutstanding, invOutstanding),
      );

      // Reliability and risk
      const riskFactors: string[] = [];
      if (supplier.reliabilityScore < 80) {
        riskFactors.push(`Reliability rating is ${supplier.reliabilityScore}% (sub-optimal)`);
      }
      if (overdueBalancePaise > 0) {
        riskFactors.push(
          `Overdue payments of ₹${(overdueBalancePaise / 100).toLocaleString("en-IN")}`,
        );
      }
      const delayed = purchaseOrders.filter((po) => po.status === "delayed");
      if (delayed.length > 0) {
        riskFactors.push(`${delayed.length} purchase order(s) delayed`);
      }
      if (riskFactors.length === 0) {
        riskFactors.push("All payments and delivery terms in good standing");
      }

      const riskLevel: "low" | "medium" | "high" =
        supplier.reliabilityScore < 75 || overdueBalancePaise > 0
          ? "high"
          : supplier.reliabilityScore < 85
            ? "medium"
            : "low";

      // On-time delivery rate
      const deliveredPos = purchaseOrders.filter(
        (po) => po.status === "received" || po.status === "partially_received",
      );
      const onTimeDeliveryRate =
        deliveredPos.length > 0
          ? Math.round(
              (deliveredPos.filter((po) => po.status !== "delayed").length / deliveredPos.length) *
                100,
            )
          : supplier.reliabilityScore;

      return {
        supplier: {
          ...supplier,
          status: supplier.status ?? "active",
        },
        metrics: {
          totalPurchasesPaise,
          totalPaymentsMadePaise,
          outstandingPayablesPaise,
          overdueBalancePaise,
          openPoCount: openPos.length,
          totalPoCount: purchaseOrders.length,
          onTimeDeliveryRate,
          reliabilityScore: supplier.reliabilityScore,
          riskLevel,
          riskFactors,
        },
        purchaseOrders,
        invoices,
        payments: allSupplierPayments,
        upcomingPayments,
        completedPayments,
        products,
      };
    }

    return httpRequest<SupplierDetailData>(`/api/suppliers/${id}/details`);
  },

  async create(input: CreateSupplierInput): Promise<Supplier> {
    if (DATA_MODE === "mock") {
      await delay();

      const nameTrimmed = input.name.trim();
      if (!nameTrimmed || nameTrimmed.length < 2) {
        throw new Error("Supplier name must be at least 2 characters.");
      }

      const duplicate = db.suppliers.find(
        (s) => s.name.toLowerCase() === nameTrimmed.toLowerCase(),
      );
      if (duplicate) {
        throw new Error(`A supplier named "${nameTrimmed}" already exists.`);
      }

      if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
        throw new Error("Please enter a valid email address.");
      }

      const todayStr = new Date().toISOString().slice(0, 10);
      const supplier: Supplier = {
        id: nextId("sup"),
        businessId: db.business.id,
        name: nameTrimmed,
        contactName: input.contactName?.trim() || undefined,
        email: input.email?.trim() || undefined,
        phone: input.phone?.trim() || undefined,
        address: input.address?.trim() || undefined,
        taxId: input.taxId?.trim() || undefined,
        paymentTermsDays: input.paymentTermsDays ?? 30,
        outstandingPaise: 0,
        reliabilityScore: input.reliabilityScore ?? 90,
        status: input.status ?? "active",
        notes: input.notes?.trim() || undefined,
        leadTimeDays: input.leadTimeDays ?? 7,
        createdAt: todayStr,
        updatedAt: todayStr,
      };

      db.suppliers.push(supplier);
      return supplier;
    }

    return httpRequest<Supplier>("/api/suppliers", { method: "POST", body: input });
  },

  async update(id: string, patch: UpdateSupplierInput): Promise<Supplier> {
    if (DATA_MODE === "mock") {
      await delay();
      const existing = db.suppliers.find((s) => s.id === id);
      if (!existing) throw new Error(`Supplier "${id}" not found`);

      if (patch.name) {
        const nameTrimmed = patch.name.trim();
        if (nameTrimmed.length < 2) {
          throw new Error("Supplier name must be at least 2 characters.");
        }
        const duplicate = db.suppliers.find(
          (s) => s.id !== id && s.name.toLowerCase() === nameTrimmed.toLowerCase(),
        );
        if (duplicate) {
          throw new Error(`A supplier named "${nameTrimmed}" already exists.`);
        }
      }

      if (patch.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patch.email)) {
        throw new Error("Please enter a valid email address.");
      }

      const todayStr = new Date().toISOString().slice(0, 10);
      const updated: Supplier = {
        ...existing,
        ...patch,
        id,
        name: patch.name ? patch.name.trim() : existing.name,
        contactName:
          patch.contactName !== undefined
            ? patch.contactName.trim() || undefined
            : existing.contactName,
        email: patch.email !== undefined ? patch.email.trim() || undefined : existing.email,
        phone: patch.phone !== undefined ? patch.phone.trim() || undefined : existing.phone,
        address: patch.address !== undefined ? patch.address.trim() || undefined : existing.address,
        taxId: patch.taxId !== undefined ? patch.taxId.trim() || undefined : existing.taxId,
        notes: patch.notes !== undefined ? patch.notes.trim() || undefined : existing.notes,
        reliabilityScore: patch.reliabilityScore ?? existing.reliabilityScore,
        updatedAt: todayStr,
      };

      db.suppliers = db.suppliers.map((s) => (s.id === id ? updated : s));
      return updated;
    }

    return httpRequest<Supplier>(`/api/suppliers/${id}`, { method: "PATCH", body: patch });
  },

  async archive(id: string): Promise<Supplier> {
    return this.update(id, { status: "archived" });
  },

  async unarchive(id: string): Promise<Supplier> {
    return this.update(id, { status: "active" });
  },

  async remove(id: string, options: { force?: boolean } = {}): Promise<void> {
    if (DATA_MODE === "mock") {
      await delay();
      const supplier = db.suppliers.find((s) => s.id === id);
      if (!supplier) throw new Error(`Supplier "${id}" not found`);

      // Check linked financial records to protect historical audit trails
      const hasPos = db.purchaseOrders.some((po) => po.supplierId === id);
      const hasInvoices = db.invoices.some(
        (inv) => (!inv.type || inv.type === "payable") && inv.supplierId === id,
      );
      const hasPayments = db.payments.some((p) => p.supplierId === id);

      if ((hasPos || hasInvoices || hasPayments) && !options.force) {
        throw new Error(
          `Cannot permanently delete supplier "${supplier.name}" because historical records (${[
            hasPos ? "purchase orders" : null,
            hasInvoices ? "payable invoices" : null,
            hasPayments ? "payments" : null,
          ]
            .filter(Boolean)
            .join(", ")}) exist. Archive the supplier instead to preserve financial history.`,
        );
      }

      db.suppliers = db.suppliers.filter((s) => s.id !== id);
      return;
    }

    return httpRequest<void>(`/api/suppliers/${id}`, {
      method: "DELETE",
      query: options.force !== undefined ? { force: options.force ? 1 : 0 } : undefined,
    });
  },
};
