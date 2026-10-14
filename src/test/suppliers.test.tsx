import { describe, expect, it } from "vitest";
import { supplierApi } from "@/lib/api/supplierApi";
import { db } from "@/mocks/store";
import type { CreateSupplierInput } from "@/types";

describe("Supplier API & Data Integrity", () => {
  it("1. Loads seeded suppliers and calculates summary metrics correctly", async () => {
    const metrics = await supplierApi.getSummaryMetrics();

    expect(metrics.totalSuppliers).toBeGreaterThanOrEqual(4);
    expect(metrics.activeSuppliers).toBeGreaterThanOrEqual(3);
    expect(metrics.archivedSuppliers).toBeGreaterThanOrEqual(1);
    expect(metrics.totalOutstandingPayablesPaise).toBeGreaterThan(0);
    expect(metrics.dueInSevenDaysPaise).toBeGreaterThan(0);
    expect(metrics.atRiskSuppliersCount).toBeGreaterThanOrEqual(1);
  });

  it("2. Lists suppliers with search and status filtering", async () => {
    // List all
    const all = await supplierApi.list({ status: "all" });
    expect(all.total).toBeGreaterThanOrEqual(4);

    // List active
    const active = await supplierApi.list({ status: "active" });
    expect(active.data.every((s) => s.status === "active")).toBe(true);

    // List archived
    const archived = await supplierApi.list({ status: "archived" });
    expect(archived.data.every((s) => s.status === "archived")).toBe(true);
    expect(archived.data.some((s) => s.name.includes("Heritage"))).toBe(true);

    // Search by name
    const searched = await supplierApi.list({ search: "Shree" });
    expect(searched.data.length).toBe(1);
    expect(searched.data[0]?.name).toBe("Shree Textiles");

    // Search by GSTIN
    const searchTax = await supplierApi.list({ search: "24AAACS1234F1Z8" });
    expect(searchTax.data.length).toBe(1);
    expect(searchTax.data[0]?.id).toBe("sup_1");
  });

  it("3. Enriches suppliers with accurate financial calculations and risk factors", async () => {
    const list = await supplierApi.list({ status: "all" });

    // Shree Textiles (sup_1)
    const shree = list.data.find((s) => s.id === "sup_1");
    expect(shree).toBeDefined();
    expect(shree?.openPoCount).toBeGreaterThanOrEqual(1);
    expect(shree?.outstandingPaise).toBeGreaterThan(0);
    expect(shree?.nextPaymentDate).toBeDefined();

    // Khan Dye House (sup_3) — reliability 71%, has overdue bill
    const khan = list.data.find((s) => s.id === "sup_3");
    expect(khan).toBeDefined();
    expect(khan?.isAtRisk).toBe(true);
    expect(khan?.hasOverdue).toBe(true);
    expect(khan?.overdueAmountPaise).toBeGreaterThan(0);
    expect(khan?.riskReasons.length).toBeGreaterThan(0);
  });

  it("4. Sorts suppliers accurately by different fields", async () => {
    // Sort by name asc
    const byNameAsc = await supplierApi.list({ sortBy: "name", sortDir: "asc" });
    const names = byNameAsc.data.map((s) => s.name);
    const sortedNames = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sortedNames);

    // Sort by outstanding desc
    const byOutstandingDesc = await supplierApi.list({ sortBy: "outstanding", sortDir: "desc" });
    const balances = byOutstandingDesc.data.map((s) => s.outstandingPaise);
    for (let i = 0; i < balances.length - 1; i++) {
      expect(balances[i]!).toBeGreaterThanOrEqual(balances[i + 1]!);
    }
  });

  it("5. Creates a new supplier with validation and unique name constraint", async () => {
    const newSupplierInput: CreateSupplierInput = {
      name: "Zenith Silk Mills",
      contactName: "Sunil Verma",
      email: "sunil@zenithsilk.in",
      phone: "+91 98111 22334",
      taxId: "27AAACZ9876P1Z3",
      address: "12 Industrial Hub, Bhiwandi",
      paymentTermsDays: 30,
      leadTimeDays: 10,
      notes: "Specialist in mulberry silk fabrics",
      status: "active",
    };

    const created = await supplierApi.create(newSupplierInput);
    expect(created.id).toBeDefined();
    expect(created.name).toBe("Zenith Silk Mills");
    expect(created.status).toBe("active");
    expect(created.outstandingPaise).toBe(0);

    // Duplicate submission prevention
    await expect(supplierApi.create(newSupplierInput)).rejects.toThrow(/already exists/i);
  });

  it("6. Updates an existing supplier with validation", async () => {
    const updated = await supplierApi.update("sup_1", {
      phone: "+91 98200 99999",
      notes: "Updated delivery protocol",
    });

    expect(updated.phone).toBe("+91 98200 99999");
    expect(updated.notes).toBe("Updated delivery protocol");
  });

  it("7. Preserves financial history upon archiving and unarchiving", async () => {
    const supplierId = "sup_2";
    const initialPos = db.purchaseOrders.filter((po) => po.supplierId === supplierId);
    expect(initialPos.length).toBeGreaterThan(0);

    // Archive supplier
    const archived = await supplierApi.archive(supplierId);
    expect(archived.status).toBe("archived");

    // Verify all purchase orders, bills, and payments remain intact in the database
    const posAfterArchive = db.purchaseOrders.filter((po) => po.supplierId === supplierId);
    expect(posAfterArchive.length).toBe(initialPos.length);

    // Reactivate supplier
    const unarchived = await supplierApi.unarchive(supplierId);
    expect(unarchived.status).toBe("active");
  });

  it("8. Protects suppliers with historical financial records from accidental deletion", async () => {
    // Attempting to delete sup_1 (which has POs and bills) should be rejected
    await expect(supplierApi.remove("sup_1")).rejects.toThrow(/historical records/i);

    // Verify sup_1 was not deleted
    const stillExists = db.suppliers.find((s) => s.id === "sup_1");
    expect(stillExists).toBeDefined();
  });

  it("9. Retrieves detailed supplier profile with all sub-ledgers and metrics", async () => {
    const detail = await supplierApi.getSupplierDetail("sup_1");

    expect(detail.supplier.name).toBe("Shree Textiles");
    expect(detail.metrics.totalPurchasesPaise).toBeGreaterThan(0);
    expect(detail.metrics.totalPaymentsMadePaise).toBeGreaterThan(0);
    expect(detail.metrics.outstandingPayablesPaise).toBeGreaterThan(0);
    expect(detail.purchaseOrders.length).toBeGreaterThan(0);
    expect(detail.invoices.length).toBeGreaterThan(0);
    expect(detail.upcomingPayments.length).toBeGreaterThan(0);
    expect(detail.completedPayments.length).toBeGreaterThan(0);
    expect(detail.products.length).toBeGreaterThan(0);

    // Verify upcoming payments have cash flow impact note
    expect(detail.upcomingPayments[0]?.cashFlowImpactNote).toBeDefined();
  });

  it("10. Distinguishes accounts payable from accounts receivable strictly", async () => {
    // All payable invoices must link to suppliers, not customer receivables
    const payableInvoices = db.invoices.filter((i) => i.type === "payable");
    expect(payableInvoices.length).toBeGreaterThan(0);

    for (const inv of payableInvoices) {
      expect(inv.supplierId).toBeDefined();
      expect(inv.type).toBe("payable");
    }

    // Customer invoices must have type receivable
    const receivableInvoices = db.invoices.filter((i) => i.type === "receivable");
    expect(receivableInvoices.length).toBeGreaterThan(0);

    for (const inv of receivableInvoices) {
      expect(inv.customerId).toBeDefined();
      expect(inv.type).toBe("receivable");
    }
  });
});
