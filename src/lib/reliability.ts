import { differenceInCalendarDays, parseISO } from "date-fns";
import type {
  Invoice,
  Payment,
  PaymentReliabilityCategory,
  PaymentReliabilityResult,
  Customer,
  Supplier,
} from "@/types";

export interface ReliabilityScoringOptions {
  /** Penalty points per day of lateness. Defaults to 2. */
  penaltyPerDay?: number;
  /** Maximum penalty points per obligation. Defaults to 60. */
  maxPenaltyPerObligation?: number;
  /** Reference date (YYYY-MM-DD). Defaults to current ISO date. */
  asOfDate?: string;
}

export interface RatedObligation {
  invoiceId: string;
  invoiceNumber: string;
  totalAmountPaise: number;
  paidAmountPaise: number;
  dueDate: string;
  isFullyPaid: boolean;
  isOverdue: boolean;
  settlementDate?: string | undefined;
  weightedDaysLate: number;
  penalty: number;
}

export function getReliabilityCategory(score: number | null): PaymentReliabilityCategory {
  if (score === null || score === undefined || Number.isNaN(score)) {
    return "Insufficient payment history";
  }
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Fair";
  if (score >= 40) return "Poor";
  return "Very poor";
}

/**
 * Evaluates an individual payment obligation (receivable invoice).
 */
export function evaluateObligation(
  invoice: Invoice,
  invoicePayments: Payment[],
  options: ReliabilityScoringOptions = {},
): RatedObligation | null {
  // Ignore cancelled or void invoices
  if (invoice.status === "void" || invoice.status === "cancelled") {
    return null;
  }

  const penaltyPerDay = options.penaltyPerDay ?? 2;
  const maxPenalty = options.maxPenaltyPerObligation ?? 60;
  const asOfDateStr = options.asOfDate ?? new Date().toISOString().slice(0, 10);
  const asOfDate = parseISO(asOfDateStr);
  const dueDate = parseISO(invoice.dueDate);

  const completedPayments = invoicePayments.filter(
    (p) => p.status === "completed" || (p.completedDate && p.status !== "cancelled"),
  );

  const paidAmountPaise = Math.min(
    invoice.amountPaise,
    invoice.amountPaidPaise ||
      completedPayments.reduce((sum, p) => sum + (p.amountPaise || 0), 0),
  );
  const isFullyPaid = paidAmountPaise >= invoice.amountPaise;
  const isOverdue =
    !isFullyPaid && (invoice.status === "overdue" || differenceInCalendarDays(asOfDate, dueDate) > 0);

  // If neither paid nor overdue (i.e. upcoming un-matured invoice with no payments yet),
  // this obligation does not qualify as historical transaction data yet.
  if (paidAmountPaise === 0 && !isOverdue) {
    return null;
  }

  // Calculate weighted lateness across all payments and remaining balance
  let weightedDaysSum = 0;
  let latestPaymentDate: string | undefined = undefined;

  // Track payments
  for (const pay of completedPayments) {
    const payDateStr = pay.completedDate || pay.scheduledDate;
    if (!payDateStr) continue;
    if (!latestPaymentDate || payDateStr > latestPaymentDate) {
      latestPaymentDate = payDateStr;
    }
    const payDate = parseISO(payDateStr);
    const daysLate = Math.max(0, differenceInCalendarDays(payDate, dueDate));
    weightedDaysSum += daysLate * (pay.amountPaise || 0);
  }

  // If there is an unpaid balance that is currently overdue
  const remainingPaise = Math.max(0, invoice.amountPaise - paidAmountPaise);
  if (remainingPaise > 0 && isOverdue) {
    const overdueDays = Math.max(0, differenceInCalendarDays(asOfDate, dueDate));
    weightedDaysSum += overdueDays * remainingPaise;
  }

  const totalAmount = Math.max(1, invoice.amountPaise);
  const weightedDaysLate = Math.round((weightedDaysSum / totalAmount) * 10) / 10;

  // Lateness penalty calculation:
  // Starts at lateness * penaltyPerDay, capped at maxPenalty (60)
  const penalty = Math.min(maxPenalty, Math.max(0, Math.round(weightedDaysLate * penaltyPerDay)));

  return {
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    totalAmountPaise: invoice.amountPaise,
    paidAmountPaise,
    dueDate: invoice.dueDate,
    isFullyPaid,
    isOverdue,
    settlementDate: isFullyPaid ? latestPaymentDate : undefined,
    weightedDaysLate,
    penalty,
  };
}

/**
 * Calculates the centralized 0-100 payment reliability rating for a set of obligations.
 */
export function calculatePaymentReliability(
  qualifyingInvoices: Invoice[],
  allPayments: Payment[],
  options: ReliabilityScoringOptions = {},
): PaymentReliabilityResult & { obligations: RatedObligation[] } {
  const obligations: RatedObligation[] = [];

  for (const inv of qualifyingInvoices) {
    const invPayments = allPayments.filter((p) => p.invoiceId === inv.id);
    const evaluated = evaluateObligation(inv, invPayments, options);
    if (evaluated) {
      obligations.push(evaluated);
    }
  }

  // Check for insufficient payment history
  if (obligations.length === 0) {
    return {
      score: null,
      category: "Insufficient payment history",
      transactionCount: 0,
      onTimeCount: 0,
      lateCount: 0,
      averageLatenessDays: 0,
      hasSufficientHistory: false,
      obligations: [],
      notes: "No qualifying settlement or overdue transaction history found.",
    };
  }

  let totalPenalty = 0;
  let totalLatenessDays = 0;
  let onTimeCount = 0;
  let lateCount = 0;

  for (const ob of obligations) {
    totalPenalty += ob.penalty;
    totalLatenessDays += ob.weightedDaysLate;
    if (ob.penalty === 0) {
      onTimeCount += 1;
    } else {
      lateCount += 1;
    }
  }

  const averagePenalty = totalPenalty / obligations.length;
  // Starting score is 100, deducting average penalty, clamped to 0–100
  const score = Math.max(0, Math.min(100, Math.round(100 - averagePenalty)));
  const category = getReliabilityCategory(score);
  const averageLatenessDays = Math.round((totalLatenessDays / obligations.length) * 10) / 10;

  return {
    score,
    category,
    transactionCount: obligations.length,
    onTimeCount,
    lateCount,
    averageLatenessDays,
    hasSufficientHistory: true,
    obligations,
  };
}

/**
 * Computes customer payment reliability from customer receivable invoices.
 */
export function calculateCustomerPaymentReliability(
  customer: Customer,
  allInvoices: Invoice[],
  allPayments: Payment[],
  options: ReliabilityScoringOptions = {},
): PaymentReliabilityResult & { obligations: RatedObligation[] } {
  // Only customer receivable invoices where money is owed to Ripple
  const customerInvoices = allInvoices.filter(
    (i) => i.customerId === customer.id && (i.type === "receivable" || !i.type),
  );

  return calculatePaymentReliability(customerInvoices, allPayments, options);
}

/**
 * Computes supplier payment reliability.
 * Rule: Only rate qualifying amounts owed by suppliers to Ripple (receivables / refunds).
 * NEVER rate Ripple's outgoing payments!
 */
export function calculateSupplierPaymentReliability(
  supplier: Supplier,
  allInvoices: Invoice[],
  allPayments: Payment[],
  options: ReliabilityScoringOptions = {},
): PaymentReliabilityResult & { obligations: RatedObligation[] } {
  // Only qualifying amounts owed by suppliers to Ripple
  const supplierReceivableInvoices = allInvoices.filter(
    (i) => i.supplierId === supplier.id && i.type === "receivable",
  );

  return calculatePaymentReliability(supplierReceivableInvoices, allPayments, options);
}
