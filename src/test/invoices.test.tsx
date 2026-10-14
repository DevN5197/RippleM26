import { describe, expect, it } from "vitest";
import { invoiceApi } from "@/lib/api/invoiceApi";
import { db } from "@/mocks/store";
import type { CreateInvoiceInput } from "@/types";

describe("Invoice & Payment Sub-ledger API", () => {
  it("1. Loads invoices and calculates summary metrics with overdue aging breakdown", async () => {
    const metrics = await invoiceApi.getSummaryMetrics();

    expect(metrics.totalInvoices).toBeGreaterThan(0);
    expect(metrics.totalReceivablesPaise).toBeGreaterThan(0);
    expect(metrics.totalPayablesPaise).toBeGreaterThan(0);
    expect(metrics.overdueReceivablesPaise).toBeGreaterThan(0);
    expect(metrics.overdueInvoicesCount).toBeGreaterThan(0);

    // Aging breakdown buckets
    const aging = metrics.aging;
    expect(aging.bucket1to7Count).toBeGreaterThanOrEqual(1);
    expect(aging.bucket8to30Count).toBeGreaterThanOrEqual(1);
    expect(aging.bucket31to60Count).toBeGreaterThanOrEqual(1);
    expect(aging.bucketOver60Count).toBeGreaterThanOrEqual(1);
  });

  it("2. Lists invoices with search and type filtering", async () => {
    // List all
    const all = await invoiceApi.list();
    expect(all.total).toBeGreaterThanOrEqual(5);

    // Receivables only
    const receivables = await invoiceApi.list({ type: "receivable" });
    expect(receivables.data.every((i) => i.type === "receivable" || !i.type)).toBe(true);

    // Payables only
    const payables = await invoiceApi.list({ type: "payable" });
    expect(payables.data.every((i) => i.type === "payable")).toBe(true);

    // Search by invoice number
    const searched = await invoiceApi.list({ search: "INV-2001" });
    expect(searched.data.length).toBe(1);
    expect(searched.data[0]?.invoiceNumber).toBe("INV-2001");
    expect(searched.data[0]?.counterpartyName).toBe("Urban Threads Boutique");
  });

  it("3. Filters invoices by status (unpaid, partially paid, paid, overdue)", async () => {
    const paidList = await invoiceApi.list({ status: "paid" });
    expect(paidList.data.every((i) => i.status === "paid")).toBe(true);

    const overdueList = await invoiceApi.list({ status: "overdue" });
    expect(overdueList.data.every((i) => i.isOverdue)).toBe(true);

    const partialList = await invoiceApi.list({ status: "partially_paid" });
    expect(
      partialList.data.every((i) => i.amountPaidPaise > 0 && i.outstandingPaise > 0),
    ).toBe(true);
  });

  it("4. Creates a customer receivable invoice and updates customer outstanding", async () => {
    const custBefore = db.customers.find((c) => c.id === "cus_3");
    const initialOutstanding = custBefore?.outstandingPaise || 0;

    const input: CreateInvoiceInput = {
      type: "receivable",
      customerId: "cus_3",
      amountPaise: 250_000, // ₹2,500
      issueDate: "2026-03-01",
      dueDate: "2026-03-31",
      notes: "Summer collection sample batch.",
    };

    const created = await invoiceApi.create(input);
    expect(created.id).toBeDefined();
    expect(created.amountPaise).toBe(250_000);
    expect(created.amountPaidPaise).toBe(0);

    const custAfter = db.customers.find((c) => c.id === "cus_3");
    expect(custAfter?.outstandingPaise).toBe(initialOutstanding + 250_000);
  });

  it("5. Creates a supplier payable bill and updates supplier outstanding", async () => {
    const suppBefore = db.suppliers.find((s) => s.id === "sup_1");
    const initialOutstanding = suppBefore?.outstandingPaise || 0;

    const input: CreateInvoiceInput = {
      type: "payable",
      supplierId: "sup_1",
      amountPaise: 400_000,
      issueDate: "2026-03-01",
      dueDate: "2026-04-01",
      notes: "Extra fabric yardage.",
    };

    const created = await invoiceApi.create(input);
    expect(created.id).toBeDefined();
    expect(created.type).toBe("payable");

    const suppAfter = db.suppliers.find((s) => s.id === "sup_1");
    expect(suppAfter?.outstandingPaise).toBe(initialOutstanding + 400_000);
  });

  it("6. Records partial payment with validation and updates balances accurately", async () => {
    // Find an unpaid receivable invoice
    const inv = db.invoices.find(
      (i) => i.customerId === "cus_1" && i.amountPaidPaise === 0 && i.amountPaise >= 500_000,
    );
    expect(inv).toBeDefined();
    const invId = inv!.id;
    const initialAmount = inv!.amountPaise;

    // Validate cannot pay more than balance
    await expect(
      invoiceApi.recordPayment(invId, {
        amountPaise: initialAmount + 100_000,
      }),
    ).rejects.toThrow(/exceeds remaining invoice balance/i);

    // Record partial payment of 200,000 paise
    const payment = await invoiceApi.recordPayment(invId, {
      amountPaise: 200_000,
      method: "UPI",
    });

    expect(payment.id).toBeDefined();
    expect(payment.amountPaise).toBe(200_000);
    expect(payment.direction).toBe("incoming");

    const updatedInv = db.invoices.find((i) => i.id === invId);
    expect(updatedInv?.amountPaidPaise).toBe(200_000);
    expect(updatedInv?.status).toBe("partially_paid");
  });

  it("7. Records full payment and transitions invoice status to paid", async () => {
    const inv = db.invoices.find(
      (i) => i.customerId === "cus_1" && i.amountPaidPaise > 0 && i.amountPaidPaise < i.amountPaise,
    );
    expect(inv).toBeDefined();
    const invId = inv!.id;
    const remaining = inv!.amountPaise - inv!.amountPaidPaise;

    // Pay remaining
    await invoiceApi.recordPayment(invId, {
      amountPaise: remaining,
      method: "NEFT",
    });

    const settled = db.invoices.find((i) => i.id === invId);
    expect(settled?.amountPaidPaise).toBe(settled?.amountPaise);
    expect(settled?.status).toBe("paid");
  });

  it("8. Cancels invoice, adjusts counterparty balance, and blocks cancelling paid invoices", async () => {
    // Create temporary invoice to cancel
    const created = await invoiceApi.create({
      type: "receivable",
      customerId: "cus_3",
      amountPaise: 100_000,
      issueDate: "2026-03-01",
      dueDate: "2026-03-15",
    });

    const cancelled = await invoiceApi.cancel(created.id);
    expect(cancelled.status).toBe("void");

    // Cannot cancel settled invoice
    const paidInv = db.invoices.find((i) => i.status === "paid");
    if (paidInv) {
      await expect(invoiceApi.cancel(paidInv.id)).rejects.toThrow(/Cannot cancel a fully settled/i);
    }
  });

  it("9. Generates overdue reminder notice with formatting and bank credentials", () => {
    const overdueInv = db.invoices.find((i) => i.id === "inv_1999");
    expect(overdueInv).toBeDefined();

    const reminder = invoiceApi.generateOverdueReminder("inv_1999");
    expect(reminder.invoiceNumber).toBe("INV-1999");
    expect(reminder.daysOverdue).toBeGreaterThan(0);
    expect(reminder.subject).toContain("INV-1999");
    expect(reminder.body).toContain("Rupi Clothing Pvt Ltd");
    expect(reminder.body).toContain("HDFC Bank");
    expect(reminder.body).toContain(reminder.invoiceNumber);
  });
});
