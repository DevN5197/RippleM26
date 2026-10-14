import { describe, it, expect } from "vitest";
import {
  calculatePaymentReliability,
  calculateCustomerPaymentReliability,
  calculateSupplierPaymentReliability,
  getReliabilityCategory,
  evaluateObligation,
} from "@/lib/reliability";
import type { Invoice, Payment, Customer, Supplier } from "@/types";

describe("Payment Reliability Rating Engine", () => {
  const mockCustomer: Customer = {
    id: "cus_test",
    businessId: "biz_1",
    name: "Acme Retail",
    creditTermsDays: 15,
    outstandingPaise: 0,
  };

  const mockSupplier: Supplier = {
    id: "sup_test",
    businessId: "biz_1",
    name: "TexCo Mills",
    paymentTermsDays: 30,
    outstandingPaise: 0,
    reliabilityScore: 85,
  };

  it("classifies scores into correct categories", () => {
    expect(getReliabilityCategory(100)).toBe("Excellent");
    expect(getReliabilityCategory(90)).toBe("Excellent");
    expect(getReliabilityCategory(89)).toBe("Good");
    expect(getReliabilityCategory(75)).toBe("Good");
    expect(getReliabilityCategory(74)).toBe("Fair");
    expect(getReliabilityCategory(60)).toBe("Fair");
    expect(getReliabilityCategory(59)).toBe("Poor");
    expect(getReliabilityCategory(40)).toBe("Poor");
    expect(getReliabilityCategory(39)).toBe("Very poor");
    expect(getReliabilityCategory(0)).toBe("Very poor");
    expect(getReliabilityCategory(null)).toBe("Insufficient payment history");
  });

  it("returns Insufficient payment history when no transactions exist", () => {
    const result = calculateCustomerPaymentReliability(mockCustomer, [], []);
    expect(result.hasSufficientHistory).toBe(false);
    expect(result.score).toBeNull();
    expect(result.category).toBe("Insufficient payment history");
    expect(result.transactionCount).toBe(0);
  });

  it("returns 100 (Excellent) when all obligations were paid on or before due date", () => {
    const invoice: Invoice = {
      id: "inv_1",
      invoiceNumber: "INV-001",
      type: "receivable",
      customerId: "cus_test",
      amountPaise: 100_000,
      amountPaidPaise: 100_000,
      status: "paid",
      issueDate: "2026-01-01",
      dueDate: "2026-01-15",
    };
    const payment: Payment = {
      id: "pay_1",
      direction: "incoming",
      invoiceId: "inv_1",
      amountPaise: 100_000,
      status: "completed",
      scheduledDate: "2026-01-10",
      completedDate: "2026-01-10",
    };

    const result = calculateCustomerPaymentReliability(mockCustomer, [invoice], [payment]);
    expect(result.hasSufficientHistory).toBe(true);
    expect(result.score).toBe(100);
    expect(result.category).toBe("Excellent");
    expect(result.transactionCount).toBe(1);
    expect(result.onTimeCount).toBe(1);
    expect(result.lateCount).toBe(0);
  });

  it("applies lateness penalties and caps them at 60 points per obligation", () => {
    // 40 days late: with penalty 2 pts/day, raw penalty is 80, but must be capped at 60
    const invoice: Invoice = {
      id: "inv_late",
      invoiceNumber: "INV-LATE",
      type: "receivable",
      customerId: "cus_test",
      amountPaise: 100_000,
      amountPaidPaise: 100_000,
      status: "paid",
      issueDate: "2026-01-01",
      dueDate: "2026-01-15",
    };
    const payment: Payment = {
      id: "pay_late",
      direction: "incoming",
      invoiceId: "inv_late",
      amountPaise: 100_000,
      status: "completed",
      scheduledDate: "2026-02-24", // 40 days after Jan 15
      completedDate: "2026-02-24",
    };

    const result = calculateCustomerPaymentReliability(mockCustomer, [invoice], [payment]);
    expect(result.obligations[0]?.penalty).toBe(60); // Capped at 60
    expect(result.score).toBe(40); // 100 - 60 = 40
    expect(result.category).toBe("Poor");
  });

  it("handles partial payments and settlement dates accurately", () => {
    // Invoice 200,000 paise due 2026-01-10.
    // Half paid on time (2026-01-10, 0 days late).
    // Half paid 10 days late (2026-01-20).
    // Weighted days late: (100k*0 + 100k*10) / 200k = 5 days.
    // Penalty: 5 * 2 = 10 pts. Score: 100 - 10 = 90 (Excellent).
    // Settlement date must be the final payment date: 2026-01-20.
    const invoice: Invoice = {
      id: "inv_part",
      invoiceNumber: "INV-PART",
      type: "receivable",
      customerId: "cus_test",
      amountPaise: 200_000,
      amountPaidPaise: 200_000,
      status: "paid",
      issueDate: "2026-01-01",
      dueDate: "2026-01-10",
    };
    const pay1: Payment = {
      id: "pay_p1",
      direction: "incoming",
      invoiceId: "inv_part",
      amountPaise: 100_000,
      status: "completed",
      completedDate: "2026-01-10",
      scheduledDate: "2026-01-10",
    };
    const pay2: Payment = {
      id: "pay_p2",
      direction: "incoming",
      invoiceId: "inv_part",
      amountPaise: 100_000,
      status: "completed",
      completedDate: "2026-01-20",
      scheduledDate: "2026-01-20",
    };

    const result = calculateCustomerPaymentReliability(mockCustomer, [invoice], [pay1, pay2]);
    expect(result.score).toBe(90);
    expect(result.category).toBe("Excellent");
    expect(result.obligations[0]?.settlementDate).toBe("2026-01-20");
    expect(result.obligations[0]?.weightedDaysLate).toBe(5);
  });

  it("applies lateness for active overdue unpaid balance", () => {
    const invoice: Invoice = {
      id: "inv_overdue",
      invoiceNumber: "INV-OD",
      type: "receivable",
      customerId: "cus_test",
      amountPaise: 100_000,
      amountPaidPaise: 0,
      status: "overdue",
      issueDate: "2026-01-01",
      dueDate: "2026-01-10",
    };

    // Evaluated as of 2026-01-20 (10 days overdue)
    const result = calculateCustomerPaymentReliability(mockCustomer, [invoice], [], {
      asOfDate: "2026-01-20",
    });
    expect(result.score).toBe(80); // 100 - (10 * 2) = 80
    expect(result.category).toBe("Good");
    expect(result.obligations[0]?.isOverdue).toBe(true);
  });

  it("only rates qualifying amounts owed by suppliers to Ripple, never Ripple's outgoing payments", () => {
    // Payable bills where Ripple pays the supplier
    const payableBill: Invoice = {
      id: "inv_bill",
      invoiceNumber: "BILL-001",
      type: "payable",
      supplierId: "sup_test",
      amountPaise: 500_000,
      amountPaidPaise: 500_000,
      status: "paid",
      issueDate: "2026-01-01",
      dueDate: "2026-01-15",
    };
    const outgoingPayment: Payment = {
      id: "pay_out",
      direction: "outgoing",
      invoiceId: "inv_bill",
      supplierId: "sup_test",
      amountPaise: 500_000,
      status: "completed",
      completedDate: "2026-02-01", // Late outgoing payment made by Ripple
      scheduledDate: "2026-02-01",
    };

    // calculateSupplierPaymentReliability should ignore payable bills and outgoing payments
    const supplierResult = calculateSupplierPaymentReliability(
      mockSupplier,
      [payableBill],
      [outgoingPayment],
    );
    expect(supplierResult.hasSufficientHistory).toBe(false);
    expect(supplierResult.score).toBeNull();
    expect(supplierResult.category).toBe("Insufficient payment history");

    // But if supplier has a qualifying receivable invoice (e.g. refund/credit owed to Ripple)
    const supplierReceivable: Invoice = {
      id: "inv_sup_rec",
      invoiceNumber: "REC-SUP-01",
      type: "receivable",
      supplierId: "sup_test",
      amountPaise: 50_000,
      amountPaidPaise: 50_000,
      status: "paid",
      issueDate: "2026-01-01",
      dueDate: "2026-01-10",
    };
    const incomingRefund: Payment = {
      id: "pay_in",
      direction: "incoming",
      invoiceId: "inv_sup_rec",
      supplierId: "sup_test",
      amountPaise: 50_000,
      status: "completed",
      completedDate: "2026-01-09",
      scheduledDate: "2026-01-09",
    };

    const qualifyingResult = calculateSupplierPaymentReliability(
      mockSupplier,
      [payableBill, supplierReceivable],
      [outgoingPayment, incomingRefund],
    );
    expect(qualifyingResult.hasSufficientHistory).toBe(true);
    expect(qualifyingResult.score).toBe(100);
    expect(qualifyingResult.category).toBe("Excellent");
    expect(qualifyingResult.transactionCount).toBe(1);
  });
});
