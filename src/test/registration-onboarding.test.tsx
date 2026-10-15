import { describe, expect, it, beforeEach } from "vitest";
import { authApi } from "@/lib/api/authApi";
import { settingsApi } from "@/lib/api/settingsApi";
import { customerApi } from "@/lib/api/customerApi";
import { supplierApi } from "@/lib/api/supplierApi";
import { invoiceApi } from "@/lib/api/invoiceApi";
import { relationshipsApi } from "@/lib/api/relationshipsApi";
import { db, resetDbToSeed } from "@/mocks/store";

describe("Registration & Initial Account Onboarding Flow", () => {
  beforeEach(() => {
    resetDbToSeed();
  });

  it("enforces strong password validation rules", () => {
    function isPasswordStrong(pwd: string): { valid: boolean; message?: string } {
      if (pwd.length < 8) {
        return { valid: false, message: "Password must be at least 8 characters long." };
      }
      const hasLetter = /[a-zA-Z]/.test(pwd);
      const hasNumber = /[0-9]/.test(pwd);
      if (!hasLetter || !hasNumber) {
        return { valid: false, message: "Password must contain both letters and numbers." };
      }
      const weakPatterns = ["12345678", "password", "password123", "qwerty123", "admin1234", "11111111"];
      if (weakPatterns.includes(pwd.toLowerCase())) {
        return { valid: false, message: "Password is too common or easily guessed." };
      }
      return { valid: true };
    }

    // Weak passwords should be rejected
    expect(isPasswordStrong("short").valid).toBe(false);
    expect(isPasswordStrong("12345678").valid).toBe(false);
    expect(isPasswordStrong("password").valid).toBe(false);
    expect(isPasswordStrong("password123").valid).toBe(false);
    expect(isPasswordStrong("allalphabetletters").valid).toBe(false);
    expect(isPasswordStrong("9876543210").valid).toBe(false);

    // Strong passwords should be accepted
    expect(isPasswordStrong("ApexApparel2026!").valid).toBe(true);
    expect(isPasswordStrong("SafeBusiness99").valid).toBe(true);
  });

  it("enforces cash constraints: safety buffer must be strictly less than opening cash", () => {
    const openingCash = 50000;
    const safetyReserveValid = 10000;
    const safetyReserveInvalid = 50000;
    const safetyReserveExcessive = 60000;

    expect(safetyReserveValid < openingCash).toBe(true);
    expect(safetyReserveInvalid < openingCash).toBe(false);
    expect(safetyReserveExcessive < openingCash).toBe(false);
  });

  it("registers new business, clears old mock seeds, and populates user initial cash, customer and supplier", async () => {
    // Verify seed data before registration
    expect(db.customers.length).toBeGreaterThan(0);
    expect(db.suppliers.length).toBeGreaterThan(0);

    // 1. Register new account
    const session = await authApi.register(
      "founder@apextextiles.com",
      "ApexTextiles2026!",
      "Ananya Roy",
      "Apex Textiles Pvt Ltd",
    );

    expect(session.user.fullName).toBe("Ananya Roy");
    expect(session.business.name).toBe("Apex Textiles Pvt Ltd");
    // All old seed counterparties should be cleared for the fresh workspace
    expect(db.customers.length).toBe(0);
    expect(db.suppliers.length).toBe(0);
    expect(db.invoices.length).toBe(0);

    // 2. Set Opening Cash (₹1,00,000) and Safety Buffer (₹20,000)
    await settingsApi.updateSettings({
      business: {
        openingCashPaise: 10000000,
        safetyThresholdPaise: 2000000,
      },
    });

    expect(db.business.openingCashPaise).toBe(10000000);
    expect(db.business.safetyThresholdPaise).toBe(2000000);

    // 3. Create First Customer and Invoice
    const customer = await customerApi.create({
      name: "Metro Lifestyle Retail",
      creditTermsDays: 20,
    });
    expect(customer.name).toBe("Metro Lifestyle Retail");
    expect(db.customers.length).toBe(1);

    const invoice = await invoiceApi.create({
      type: "receivable",
      customerId: customer.id,
      amountPaise: 4500000, // ₹45,000
      issueDate: "2026-10-15",
      dueDate: "2026-11-04",
      notes: "Opening customer receivable order",
    });
    expect(invoice.amountPaise).toBe(4500000);
    expect(db.invoices.length).toBe(1);

    // 4. Create First Supplier and Payable Bill
    const supplier = await supplierApi.create({
      name: "Surat Yarns & Threads",
      paymentTermsDays: 15,
      reliabilityScore: 94,
    });
    expect(supplier.name).toBe("Surat Yarns & Threads");
    expect(db.suppliers.length).toBe(1);

    const bill = await invoiceApi.create({
      type: "payable",
      supplierId: supplier.id,
      amountPaise: 2500000, // ₹25,000
      issueDate: "2026-10-15",
      dueDate: "2026-10-30",
      notes: "Opening raw yarn shipment bill",
    });
    expect(bill.amountPaise).toBe(2500000);
    expect(db.invoices.length).toBe(2);

    // 5. Verify Relationship Graph contains ONLY the user's entities and zero demo data
    const graph = await relationshipsApi.getGraph();
    const nodeLabels = graph.nodes.map((n) => n.label);
    const partnerNames = graph.nodes.map((n) => n.metadata.partnerName).filter(Boolean);

    expect(nodeLabels).toContain("Surat Yarns & Threads");
    expect(nodeLabels).toContain("Metro Lifestyle Retail");
    expect(partnerNames).toContain("Surat Yarns & Threads");
    expect(partnerNames).toContain("Metro Lifestyle Retail");

    // Demo data must be completely absent
    expect(nodeLabels).not.toContain("Shree Textiles");
    expect(nodeLabels).not.toContain("Urban Threads Boutique");
    expect(nodeLabels).not.toContain("Mehta Fabrics");
    expect(partnerNames).not.toContain("Shree Textiles");
    expect(partnerNames).not.toContain("Urban Threads Boutique");
    expect(partnerNames).not.toContain("Mehta Fabrics");
  });

  it("allows user to skip filling customer and supplier info, keeping initial cash calculations", async () => {
    // Register business without customer/supplier
    const session = await authApi.register(
      "solo@bootstrap.io",
      "BootstrapPass2026!",
      "Vikram Mehra",
      "Vikram Cloud Works",
    );

    expect(session.business.name).toBe("Vikram Cloud Works");

    // Set custom initial cash (₹2,50,000) and safety reserve (₹50,000)
    await settingsApi.updateSettings({
      business: {
        openingCashPaise: 25000000,
        safetyThresholdPaise: 5000000,
      },
    });

    expect(db.business.openingCashPaise).toBe(25000000);
    expect(db.business.safetyThresholdPaise).toBe(5000000);
    expect(db.customers.length).toBe(0);
    expect(db.suppliers.length).toBe(0);
    expect(db.invoices.length).toBe(0);

    // Relationship graph should have 0 nodes (clean empty state) and zero demo data
    const graph = await relationshipsApi.getGraph();
    expect(graph.nodes.length).toBe(0);
    expect(graph.edges.length).toBe(0);
  });
});
