import { DATA_MODE } from "@/lib/config";
import { httpRequest } from "@/lib/api/client";
import { db, delay, nextId } from "@/mocks/store";
import { differenceInCalendarDays, parseISO } from "date-fns";
import type {
  Invoice,
  Payment,
  EnrichedInvoice,
  InvoiceSummaryMetrics,
  InvoiceDetailData,
  CreateInvoiceInput,
  UpdateInvoiceInput,
  RecordPaymentInput,
  AgingBucket,
  ApiListResponse,
  ListParams,
  CashFlowEvent,
} from "@/types";

export interface InvoiceListFilterParams extends ListParams {
  type?: "all" | "receivable" | "payable" | undefined;
  status?: "all" | "unpaid" | "partially_paid" | "paid" | "overdue" | "cancelled" | undefined;
  aging?: "all" | AgingBucket | undefined;
  sortBy?: "dueDate" | "amount" | "status" | "invoiceNumber" | "overdue" | undefined;
  sortDir?: "asc" | "desc" | undefined;
}

export interface OverdueReminderPayload {
  recipientName: string;
  recipientEmail: string;
  invoiceNumber: string;
  dueDate: string;
  daysOverdue: number;
  outstandingPaise: number;
  subject: string;
  body: string;
}

export function enrichInvoice(inv: Invoice): EnrichedInvoice {
  const todayStr = new Date().toISOString().slice(0, 10);
  const today = parseISO(todayStr);
  const dueDate = parseISO(inv.dueDate);

  const outstandingPaise = Math.max(0, inv.amountPaise - (inv.amountPaidPaise || 0));
  const isPaid = outstandingPaise === 0 && inv.amountPaise > 0;
  const isVoid = inv.status === "void" || inv.status === "cancelled";

  let counterpartyName = "Unknown";
  let counterpartyType: "customer" | "supplier" = "customer";

  if (inv.customerId) {
    const cust = db.customers.find((c) => c.id === inv.customerId);
    if (cust) counterpartyName = cust.name;
    counterpartyType = "customer";
  } else if (inv.supplierId) {
    const supp = db.suppliers.find((s) => s.id === inv.supplierId);
    if (supp) counterpartyName = supp.name;
    counterpartyType = "supplier";
  }

  const rawDaysOverdue = differenceInCalendarDays(today, dueDate);
  const isOverdue = !isPaid && !isVoid && (inv.status === "overdue" || rawDaysOverdue > 0);
  const daysOverdue = isOverdue ? Math.max(1, rawDaysOverdue) : 0;

  let agingBucket: AgingBucket = "current";
  if (isOverdue) {
    if (daysOverdue <= 7) agingBucket = "1_7";
    else if (daysOverdue <= 30) agingBucket = "8_30";
    else if (daysOverdue <= 60) agingBucket = "31_60";
    else agingBucket = "over_60";
  }

  // Derive normalized status
  let status = inv.status;
  if (isVoid) {
    status = "void";
  } else if (isPaid) {
    status = "paid";
  } else if (isOverdue) {
    status = "overdue";
  } else if (inv.amountPaidPaise > 0) {
    status = "partially_paid";
  }

  return {
    ...inv,
    status,
    counterpartyName,
    counterpartyType,
    daysOverdue,
    agingBucket,
    isOverdue,
    outstandingPaise,
  };
}

export const invoiceApi = {
  async list(params: InvoiceListFilterParams = {}): Promise<ApiListResponse<EnrichedInvoice>> {
    if (DATA_MODE === "mock") {
      await delay();

      let invoices = db.invoices.map(enrichInvoice);

      // Type filter
      if (params.type && params.type !== "all") {
        invoices = invoices.filter((i) => i.type === params.type);
      }

      // Status filter
      if (params.status && params.status !== "all") {
        if (params.status === "unpaid") {
          invoices = invoices.filter(
            (i) =>
              (i.amountPaidPaise === 0 || !i.amountPaidPaise) &&
              !i.isOverdue &&
              i.status !== "void",
          );
        } else if (params.status === "partially_paid") {
          invoices = invoices.filter(
            (i) => i.amountPaidPaise > 0 && i.outstandingPaise > 0 && i.status !== "void",
          );
        } else if (params.status === "paid") {
          invoices = invoices.filter((i) => i.status === "paid");
        } else if (params.status === "overdue") {
          invoices = invoices.filter((i) => i.isOverdue);
        } else if (params.status === "cancelled") {
          invoices = invoices.filter((i) => i.status === "void" || i.status === "cancelled");
        }
      }

      // Aging filter
      if (params.aging && params.aging !== "all") {
        invoices = invoices.filter((i) => i.agingBucket === params.aging);
      }

      // Search filter
      if (params.search && params.search.trim() !== "") {
        const q = params.search.toLowerCase().trim();
        invoices = invoices.filter(
          (i) =>
            i.invoiceNumber.toLowerCase().includes(q) ||
            i.counterpartyName.toLowerCase().includes(q) ||
            i.notes?.toLowerCase().includes(q),
        );
      }

      // Sorting
      const dir = params.sortDir === "desc" ? -1 : 1;
      if (params.sortBy === "amount") {
        invoices.sort((a, b) => (a.amountPaise - b.amountPaise) * dir);
      } else if (params.sortBy === "overdue") {
        invoices.sort((a, b) => (a.daysOverdue - b.daysOverdue) * dir);
      } else if (params.sortBy === "invoiceNumber") {
        invoices.sort((a, b) => a.invoiceNumber.localeCompare(b.invoiceNumber) * dir);
      } else if (params.sortBy === "status") {
        invoices.sort((a, b) => a.status.localeCompare(b.status) * dir);
      } else {
        // default by dueDate
        invoices.sort((a, b) => a.dueDate.localeCompare(b.dueDate) * dir);
      }

      return {
        data: invoices,
        total: invoices.length,
        page: 1,
        pageSize: invoices.length,
      };
    }

    return httpRequest<ApiListResponse<EnrichedInvoice>>("/api/invoices", {
      query: {
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
        type: params.type,
        status: params.status,
      },
    });
  },

  async getSummaryMetrics(): Promise<InvoiceSummaryMetrics> {
    if (DATA_MODE === "mock") {
      await delay();
      const enriched = db.invoices.map(enrichInvoice);

      const receivables = enriched.filter((i) => i.type === "receivable" || !i.type);
      const payables = enriched.filter((i) => i.type === "payable");

      const totalReceivablesPaise = receivables.reduce((sum, i) => sum + i.amountPaise, 0);
      const totalPayablesPaise = payables.reduce((sum, i) => sum + i.amountPaise, 0);

      const outstandingReceivablesPaise = receivables
        .filter((i) => i.status !== "void")
        .reduce((sum, i) => sum + i.outstandingPaise, 0);

      const outstandingPayablesPaise = payables
        .filter((i) => i.status !== "void")
        .reduce((sum, i) => sum + i.outstandingPaise, 0);

      const overdueReceivablesPaise = receivables
        .filter((i) => i.isOverdue)
        .reduce((sum, i) => sum + i.outstandingPaise, 0);

      const overduePayablesPaise = payables
        .filter((i) => i.isOverdue)
        .reduce((sum, i) => sum + i.outstandingPaise, 0);

      const overdueInvoicesCount = enriched.filter((i) => i.isOverdue).length;
      const paidPaise = enriched.reduce((sum, i) => sum + (i.amountPaidPaise || 0), 0);

      // Overdue aging breakdown
      const overdueList = enriched.filter((i) => i.isOverdue);
      const b1 = overdueList.filter((i) => i.agingBucket === "1_7");
      const b2 = overdueList.filter((i) => i.agingBucket === "8_30");
      const b3 = overdueList.filter((i) => i.agingBucket === "31_60");
      const b4 = overdueList.filter((i) => i.agingBucket === "over_60");

      return {
        totalInvoices: enriched.length,
        totalReceivablesPaise,
        totalPayablesPaise,
        outstandingReceivablesPaise,
        outstandingPayablesPaise,
        overdueReceivablesPaise,
        overduePayablesPaise,
        overdueInvoicesCount,
        paidPaise,
        aging: {
          bucket1to7Paise: b1.reduce((sum, i) => sum + i.outstandingPaise, 0),
          bucket1to7Count: b1.length,
          bucket8to30Paise: b2.reduce((sum, i) => sum + i.outstandingPaise, 0),
          bucket8to30Count: b2.length,
          bucket31to60Paise: b3.reduce((sum, i) => sum + i.outstandingPaise, 0),
          bucket31to60Count: b3.length,
          bucketOver60Paise: b4.reduce((sum, i) => sum + i.outstandingPaise, 0),
          bucketOver60Count: b4.length,
        },
      };
    }

    return httpRequest<InvoiceSummaryMetrics>("/api/invoices/summary");
  },

  async getById(id: string): Promise<InvoiceDetailData> {
    if (DATA_MODE === "mock") {
      await delay();
      const raw = db.invoices.find((i) => i.id === id);
      if (!raw) throw new Error(`Invoice ${id} not found`);

      const enriched = enrichInvoice(raw);
      const payments = db.payments.filter((p) => p.invoiceId === id);

      const customer = raw.customerId
        ? db.customers.find((c) => c.id === raw.customerId)
        : undefined;
      const supplier = raw.supplierId
        ? db.suppliers.find((s) => s.id === raw.supplierId)
        : undefined;
      const customerOrder = raw.customerOrderId
        ? db.customerOrders.find((co) => co.id === raw.customerOrderId)
        : undefined;
      const purchaseOrder = raw.purchaseOrderId
        ? db.purchaseOrders.find((po) => po.id === raw.purchaseOrderId)
        : undefined;

      return {
        invoice: enriched,
        customer,
        supplier,
        customerOrder,
        purchaseOrder,
        payments,
      };
    }

    return httpRequest<InvoiceDetailData>(`/api/invoices/${id}`);
  },

  async create(input: CreateInvoiceInput): Promise<Invoice> {
    const amountPaise = Math.round(Number(input.amountPaise) || 0);
    const cleanInput: CreateInvoiceInput = {
      ...input,
      amountPaise,
      customerId: input.type === "receivable" ? input.customerId : undefined,
      supplierId: input.type === "payable" ? input.supplierId : undefined,
    };

    if (DATA_MODE === "mock") {
      await delay();
      if (!amountPaise || amountPaise <= 0) {
        throw new Error("Invoice amount must be greater than zero.");
      }

      if (cleanInput.type === "receivable" && !cleanInput.customerId) {
        throw new Error("A customer must be selected for accounts receivable invoices.");
      }

      if (cleanInput.type === "payable" && !cleanInput.supplierId) {
        throw new Error("A supplier must be selected for accounts payable vendor bills.");
      }

      const id = nextId("inv");
      const defaultNumber =
        cleanInput.invoiceNumber?.trim() ||
        (cleanInput.type === "receivable"
          ? `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`
          : `BILL-2026-${Math.floor(100 + Math.random() * 900)}`);

      const invoice: Invoice = {
        id,
        invoiceNumber: defaultNumber,
        type: cleanInput.type,
        customerId: cleanInput.customerId,
        customerOrderId: cleanInput.customerOrderId,
        supplierId: cleanInput.supplierId,
        purchaseOrderId: cleanInput.purchaseOrderId,
        amountPaise,
        amountPaidPaise: 0,
        status: cleanInput.status ?? "sent",
        issueDate: cleanInput.issueDate,
        dueDate: cleanInput.dueDate,
        notes: cleanInput.notes?.trim() || undefined,
        createdAt: new Date().toISOString().slice(0, 10),
      };

      db.invoices.unshift(invoice);

      // Update counterparty balance
      let counterpartyName = "Counterparty";
      if (cleanInput.type === "receivable" && cleanInput.customerId) {
        const cust = db.customers.find((c) => c.id === cleanInput.customerId);
        if (cust) {
          counterpartyName = cust.name;
          cust.outstandingPaise = (cust.outstandingPaise || 0) + amountPaise;
        }
      } else if (cleanInput.type === "payable" && cleanInput.supplierId) {
        const supp = db.suppliers.find((s) => s.id === cleanInput.supplierId);
        if (supp) {
          counterpartyName = supp.name;
          supp.outstandingPaise = (supp.outstandingPaise || 0) + amountPaise;
        }
      }

      const isReceivable = cleanInput.type === "receivable";
      const event: CashFlowEvent = {
        id: nextId("evt"),
        type: isReceivable ? "customer_payment" : "supplier_payment",
        label: `${isReceivable ? "Expected Customer Receipt" : "Scheduled Supplier Bill"} - ${counterpartyName} (${invoice.invoiceNumber})`,
        direction: isReceivable ? "incoming" : "outgoing",
        amountPaise,
        date: cleanInput.dueDate,
        relatedInvoiceId: invoice.id,
        isProjected: true,
        status: isReceivable ? "projected" : "scheduled",
        counterpartyName,
      };
      db.cashFlowEvents.push(event);

      return invoice;
    }

    return httpRequest<Invoice>("/api/invoices", { method: "POST", body: cleanInput });
  },

  async update(id: string, patch: UpdateInvoiceInput): Promise<Invoice> {
    if (DATA_MODE === "mock") {
      await delay();
      const existing = db.invoices.find((i) => i.id === id);
      if (!existing) throw new Error(`Invoice ${id} not found`);

      const updated: Invoice = {
        ...existing,
        ...patch,
        id,
        invoiceNumber: patch.invoiceNumber ?? existing.invoiceNumber,
        status: patch.status ?? existing.status,
      };
      db.invoices = db.invoices.map((i) => (i.id === id ? updated : i));

      if (patch.dueDate) {
        const projEvent = db.cashFlowEvents.find(
          (e) => e.relatedInvoiceId === id && e.isProjected === true,
        );
        if (projEvent) projEvent.date = patch.dueDate;
      }

      return updated;
    }
    return httpRequest<Invoice>(`/api/invoices/${id}`, { method: "PATCH", body: patch });
  },

  async recordPayment(invoiceId: string, input: RecordPaymentInput): Promise<Payment> {
    const payAmountPaise = Math.round(Number(input.amountPaise) || 0);

    if (DATA_MODE === "mock") {
      await delay();
      const invoice = db.invoices.find((i) => i.id === invoiceId);
      if (!invoice) throw new Error(`Invoice ${invoiceId} not found`);

      if (invoice.status === "void" || invoice.status === "cancelled") {
        throw new Error("Cannot record payment for a cancelled or void invoice.");
      }

      if (!payAmountPaise || payAmountPaise <= 0) {
        throw new Error("Payment amount must be greater than zero.");
      }

      const remainingPaise = Math.max(0, invoice.amountPaise - invoice.amountPaidPaise);
      if (payAmountPaise > remainingPaise) {
        throw new Error(
          `Payment amount (₹${(payAmountPaise / 100).toLocaleString("en-IN")}) exceeds remaining invoice balance (₹${(remainingPaise / 100).toLocaleString("en-IN")}).`,
        );
      }

      const payDate = input.paymentDate || new Date().toISOString().slice(0, 10);
      const isReceivable = invoice.type === "receivable" || !invoice.type;

      const record: Payment = {
        id: nextId("pay"),
        direction: isReceivable ? "incoming" : "outgoing",
        invoiceId,
        customerId: invoice.customerId,
        supplierId: invoice.supplierId,
        amountPaise: payAmountPaise,
        status: "completed",
        scheduledDate: payDate,
        completedDate: payDate,
        method: input.method || "Bank Transfer",
      };

      db.payments.push(record);

      // Update invoice balances
      invoice.amountPaidPaise += payAmountPaise;
      if (invoice.amountPaidPaise >= invoice.amountPaise) {
        invoice.status = "paid";
      } else {
        invoice.status = "partially_paid";
      }

      // Update counterparty balance
      if (isReceivable && invoice.customerId) {
        const cust = db.customers.find((c) => c.id === invoice.customerId);
        if (cust) {
          cust.outstandingPaise = Math.max(0, (cust.outstandingPaise || 0) - payAmountPaise);
        }
      } else if (!isReceivable && invoice.supplierId) {
        const supp = db.suppliers.find((s) => s.id === invoice.supplierId);
        if (supp) {
          supp.outstandingPaise = Math.max(0, (supp.outstandingPaise || 0) - payAmountPaise);
        }
      }

      // Record cash flow event
      const event: CashFlowEvent = {
        id: nextId("evt"),
        type: isReceivable ? "customer_payment" : "supplier_payment",
        label: `${isReceivable ? "Receipt" : "Payment"} - ${invoice.invoiceNumber}`,
        direction: record.direction,
        amountPaise: payAmountPaise,
        date: payDate,
        relatedInvoiceId: invoice.id,
        isProjected: false,
        status: "completed",
        counterpartyName: isReceivable
          ? db.customers.find((c) => c.id === invoice.customerId)?.name
          : db.suppliers.find((s) => s.id === invoice.supplierId)?.name,
      };
      db.cashFlowEvents.push(event);

      // Reduce or delete projected CashFlowEvent so forecast never double counts
      const projEvents = db.cashFlowEvents.filter(
        (e) => e.relatedInvoiceId === invoice.id && e.isProjected === true,
      );
      for (const pe of projEvents) {
        if (invoice.amountPaidPaise >= invoice.amountPaise) {
          db.cashFlowEvents = db.cashFlowEvents.filter((e) => e.id !== pe.id);
        } else {
          const newAmount = Math.max(0, pe.amountPaise - payAmountPaise);
          if (newAmount === 0) {
            db.cashFlowEvents = db.cashFlowEvents.filter((e) => e.id !== pe.id);
          } else {
            pe.amountPaise = newAmount;
          }
        }
      }

      return record;
    }

    return httpRequest<Payment>(`/api/invoices/${invoiceId}/payments`, {
      method: "POST",
      body: { ...input, amountPaise: payAmountPaise },
    });
  },

  async cancel(invoiceId: string): Promise<Invoice> {
    if (DATA_MODE === "mock") {
      await delay();
      const invoice = db.invoices.find((i) => i.id === invoiceId);
      if (!invoice) throw new Error(`Invoice ${invoiceId} not found`);

      if (invoice.amountPaidPaise >= invoice.amountPaise && invoice.amountPaise > 0) {
        throw new Error("Cannot cancel a fully settled invoice.");
      }

      invoice.status = "void";

      // Decrement counterparty outstanding
      const remainingPaise = Math.max(0, invoice.amountPaise - invoice.amountPaidPaise);
      if (invoice.customerId) {
        const cust = db.customers.find((c) => c.id === invoice.customerId);
        if (cust) {
          cust.outstandingPaise = Math.max(0, (cust.outstandingPaise || 0) - remainingPaise);
        }
      } else if (invoice.supplierId) {
        const supp = db.suppliers.find((s) => s.id === invoice.supplierId);
        if (supp) {
          supp.outstandingPaise = Math.max(0, (supp.outstandingPaise || 0) - remainingPaise);
        }
      }

      // Delete any projected CashFlowEvent
      db.cashFlowEvents = db.cashFlowEvents.filter(
        (e) => !(e.relatedInvoiceId === invoice.id && e.isProjected === true),
      );

      return { ...invoice };
    }

    return httpRequest<Invoice>(`/api/invoices/${invoiceId}/cancel`, { method: "POST" });
  },

  generateOverdueReminder(invoiceOrId: string | Invoice | EnrichedInvoice): OverdueReminderPayload {
    let invoice: Invoice;
    let enriched: EnrichedInvoice;

    if (typeof invoiceOrId === "object" && invoiceOrId !== null) {
      invoice = invoiceOrId;
      enriched =
        "counterpartyName" in invoiceOrId && invoiceOrId.counterpartyName
          ? (invoiceOrId as EnrichedInvoice)
          : enrichInvoice(invoiceOrId);
    } else {
      const found = db.invoices.find((i) => i.id === invoiceOrId);
      if (!found) throw new Error(`Invoice ${invoiceOrId} not found`);
      invoice = found;
      enriched = enrichInvoice(found);
    }

    let recipientName = enriched.counterpartyName || "Accounts Team";
    let recipientEmail = "accounts@customer.com";

    if (invoice.customerId) {
      const cust = db.customers.find((c) => c.id === invoice.customerId);
      if (cust) {
        recipientName = cust.contactName || cust.name;
        recipientEmail = cust.email || "accounts@customer.com";
      }
    } else if (invoice.supplierId) {
      const supp = db.suppliers.find((s) => s.id === invoice.supplierId);
      if (supp) {
        recipientName = supp.contactName || supp.name;
        recipientEmail = supp.email || "accounts@vendor.com";
      }
    }

    const amountFormatted = `₹${(enriched.outstandingPaise / 100).toLocaleString("en-IN")}`;
    const subject = `Urgent Reminder: Overdue Invoice ${invoice.invoiceNumber} (${amountFormatted})`;

    const body = `Dear ${recipientName},

I hope this email finds you well.

This is a courtesy reminder regarding Invoice ${invoice.invoiceNumber}, which was due on ${invoice.dueDate}. According to our records, an outstanding balance of ${amountFormatted} is currently ${enriched.daysOverdue} days overdue.

Details:
• Invoice Number: ${invoice.invoiceNumber}
• Original Amount: ₹${(invoice.amountPaise / 100).toLocaleString("en-IN")}
• Amount Already Settled: ₹${(invoice.amountPaidPaise / 100).toLocaleString("en-IN")}
• Outstanding Due: ${amountFormatted}
• Due Date: ${invoice.dueDate} (${enriched.daysOverdue} days overdue)

Payment Details:
• Account Name: Rupi Clothing Pvt Ltd
• Bank: HDFC Bank, Indiranagar Branch
• Account Number: 50200088991122
• IFSC: HDFC0000128
• UPI ID: rupiclothing@hdfcbank

Please arrange settlement at your earliest convenience, or let us know if you have already initiated this transaction. If there are any discrepancies, please reply to this email immediately.

Warm regards,
Finance & Accounts
Rupi Clothing Pvt Ltd
accounts@rupiclothing.in
+91 80 4123 4567`;

    return {
      recipientName,
      recipientEmail,
      invoiceNumber: invoice.invoiceNumber,
      dueDate: invoice.dueDate,
      daysOverdue: enriched.daysOverdue,
      outstandingPaise: enriched.outstandingPaise,
      subject,
      body,
    };
  },

  createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
    return this.create(input);
  },
};
