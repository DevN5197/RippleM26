import { describe, expect, it } from "vitest";
import { customerApi } from "@/lib/api/customerApi";
import { db } from "@/mocks/store";
import type { CreateCustomerInput } from "@/types";

describe("Customer API & Data Integrity", () => {
  it("1. Loads seeded customers and calculates summary metrics correctly", async () => {
    const metrics = await customerApi.getSummaryMetrics();

    expect(metrics.totalCustomers).toBeGreaterThanOrEqual(4);
    expect(metrics.activeCustomers).toBeGreaterThanOrEqual(3);
    expect(metrics.archivedCustomers).toBeGreaterThanOrEqual(1);
    expect(metrics.totalOutstandingPaise).toBeGreaterThan(0);
  });

  it("2. Lists customers with search, status filtering and sorting", async () => {
    // List all
    const all = await customerApi.list({ status: "all" });
    expect(all.total).toBeGreaterThanOrEqual(4);

    // List active
    const active = await customerApi.list({ status: "active" });
    expect(active.data.every((c) => c.status === "active")).toBe(true);

    // List archived
    const archived = await customerApi.list({ status: "archived" });
    expect(archived.data.every((c) => c.status === "archived")).toBe(true);
    expect(archived.data.some((c) => c.name.includes("Aarav"))).toBe(true);

    // Search by name
    const searchName = await customerApi.list({ search: "Urban Threads" });
    expect(searchName.data.length).toBe(1);
    expect(searchName.data[0]?.name).toBe("Urban Threads Boutique");

    // Search by GSTIN / Tax ID
    const searchTax = await customerApi.list({ search: "29AABCU9603R1Z7" });
    expect(searchTax.data.length).toBe(1);
    expect(searchTax.data[0]?.id).toBe("cus_1");

    // Sort by name
    const sorted = await customerApi.list({ sortBy: "name", sortDir: "asc" });
    const names = sorted.data.map((c) => c.name);
    const expected = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(expected);
  });

  it("3. Enriches customers with dynamic outstanding, overdue amount, and payment reliability ratings", async () => {
    const list = await customerApi.list({ status: "all" });

    // Urban Threads (cus_1) — has open invoices and overdue amount
    const cus1 = list.data.find((c) => c.id === "cus_1");
    expect(cus1).toBeDefined();
    expect(cus1?.calculatedOutstandingPaise).toBeGreaterThan(0);
    expect(cus1?.reliability).toBeDefined();

    // Style Mart (cus_2) — has overdue invoice
    const cus2 = list.data.find((c) => c.id === "cus_2");
    expect(cus2).toBeDefined();
    expect(cus2?.overdueInvoicesCount).toBeGreaterThanOrEqual(1);
    expect(cus2?.overdueAmountPaise).toBeGreaterThan(0);

    // Kala Niketan Emporium (cus_4) — 2 on-time settled invoices
    const cus4 = list.data.find((c) => c.id === "cus_4");
    expect(cus4).toBeDefined();
    expect(cus4?.reliability.hasSufficientHistory).toBe(true);
    expect(cus4?.reliability.score).toBe(100);
    expect(cus4?.reliability.category).toBe("Excellent");
    expect(cus4?.reliability.transactionCount).toBe(2);
  });

  it("4. Creates a new customer with validation and credit terms", async () => {
    const input: CreateCustomerInput = {
      name: "Chic Avenue Delhi",
      contactName: "Pooja Malhotra",
      email: "pooja@chicavenue.in",
      phone: "+91 99112 88776",
      creditTermsDays: 25,
      taxId: "07AABCC9988D1Z4",
      address: "South Extension Part II, New Delhi",
    };

    const created = await customerApi.create(input);
    expect(created.id).toBeDefined();
    expect(created.name).toBe(input.name);
    expect(created.creditTermsDays).toBe(25);
    expect(created.status).toBe("active");

    // Duplicate name prevention
    await expect(customerApi.create(input)).rejects.toThrow(/already exists/i);
  });

  it("5. Updates an existing customer with validation", async () => {
    const target = db.customers.find((c) => c.name === "Chic Avenue Delhi");
    expect(target).toBeDefined();

    const updated = await customerApi.update(target!.id, {
      creditTermsDays: 45,
      contactName: "Pooja M. Malhotra",
    });

    expect(updated.creditTermsDays).toBe(45);
    expect(updated.contactName).toBe("Pooja M. Malhotra");
  });

  it("6. Preserves historical records upon archiving and unarchiving", async () => {
    const cus1 = db.customers.find((c) => c.id === "cus_1");
    expect(cus1).toBeDefined();

    // Count existing related records
    const ordersBefore = db.customerOrders.filter((co) => co.customerId === "cus_1").length;
    const invoicesBefore = db.invoices.filter((i) => i.customerId === "cus_1").length;
    expect(ordersBefore).toBeGreaterThan(0);
    expect(invoicesBefore).toBeGreaterThan(0);

    // Archive customer
    const archived = await customerApi.archive("cus_1");
    expect(archived.status).toBe("archived");

    // Historical records must be preserved
    const ordersAfter = db.customerOrders.filter((co) => co.customerId === "cus_1").length;
    const invoicesAfter = db.invoices.filter((i) => i.customerId === "cus_1").length;
    expect(ordersAfter).toBe(ordersBefore);
    expect(invoicesAfter).toBe(invoicesBefore);

    // Unarchive customer
    const unarchived = await customerApi.unarchive("cus_1");
    expect(unarchived.status).toBe("active");
  });

  it("7. Protects customers with historical financial records from deletion", async () => {
    // cus_1 has invoices and orders
    await expect(customerApi.remove("cus_1")).rejects.toThrow(/Cannot permanently delete/i);
  });

  it("8. Retrieves detailed customer profile with all sub-ledgers and metrics", async () => {
    const details = await customerApi.getDetails("cus_1");

    expect(details.customer.id).toBe("cus_1");
    expect(details.metrics.outstandingPaise).toBeGreaterThan(0);
    expect(details.orders.length).toBeGreaterThan(0);
    expect(details.invoices.length).toBeGreaterThan(0);
    expect(details.metrics.reliability).toBeDefined();
  });
});
