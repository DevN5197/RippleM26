import { addDays, subDays } from "date-fns";
import { toISODate } from "@/lib/formatters";
import type {
  Business,
  Supplier,
  Customer,
  Product,
  InventoryItem,
  PurchaseOrder,
  CustomerOrder,
  Invoice,
  Payment,
  CashFlowEvent,
  ForecastPoint,
  RiskAlert,
  Recommendation,
} from "@/types";

/**
 * Demo dataset for "Rupi Clothing" — a single coherent fictional business.
 * Dates are relative to today so the demo always looks current.
 * All amounts are integer paise (₹1 = 100 paise).
 */

const today = new Date();
const d = (offset: number) => toISODate(addDays(today, offset));
const dp = (offset: number) => toISODate(subDays(today, offset));

export const business: Business = {
  id: "biz_1",
  name: "Rupi Clothing",
  currency: "INR",
  openingCashPaise: 1_000_000, // ₹10,000
  industry: "Apparel retail",
};

export const suppliers: Supplier[] = [
  {
    id: "sup_1",
    businessId: "biz_1",
    name: "Shree Textiles",
    contactName: "Anil Shree",
    email: "anil@shreetextiles.in",
    phone: "+91 98200 12345",
    paymentTermsDays: 30,
    outstandingPaise: 500_000, // ₹5,000 advance paid
    reliabilityScore: 86,
  },
  {
    id: "sup_2",
    businessId: "biz_1",
    name: "Mehta Fabrics",
    contactName: "Priya Mehta",
    email: "priya@mehtafabrics.in",
    paymentTermsDays: 45,
    outstandingPaise: 1_250_000,
    reliabilityScore: 92,
  },
  {
    id: "sup_3",
    businessId: "biz_1",
    name: "Khan Dye House",
    contactName: "Imran Khan",
    email: "imran@khandye.in",
    paymentTermsDays: 15,
    outstandingPaise: 320_000,
    reliabilityScore: 71,
  },
];

export const customers: Customer[] = [
  {
    id: "cus_1",
    businessId: "biz_1",
    name: "Urban Threads Boutique",
    contactName: "Riya Kapoor",
    email: "riya@urbanthreads.in",
    creditTermsDays: 15,
    outstandingPaise: 800_000, // ₹8,000 invoice
  },
  {
    id: "cus_2",
    businessId: "biz_1",
    name: "Style Mart",
    contactName: "Vikram Joshi",
    email: "vikram@stylemart.in",
    creditTermsDays: 30,
    outstandingPaise: 1_450_000,
  },
  {
    id: "cus_3",
    businessId: "biz_1",
    name: "Fashion Hub",
    contactName: "Neha Singh",
    email: "neha@fashionhub.in",
    creditTermsDays: 30,
    outstandingPaise: 0,
  },
];

export const products: Product[] = [
  {
    id: "prd_1",
    businessId: "biz_1",
    sku: "KUR-COT-001",
    name: "Cotton Kurti",
    unitCostPaise: 35_000, // ₹350
    unitPricePaise: 80_000, // ₹800
    reorderPoint: 25,
  },
  {
    id: "prd_2",
    businessId: "biz_1",
    sku: "JKT-DEN-002",
    name: "Denim Jacket",
    unitCostPaise: 90_000,
    unitPricePaise: 220_000,
    reorderPoint: 10,
  },
  {
    id: "prd_3",
    businessId: "biz_1",
    sku: "SHT-LIN-003",
    name: "Linen Shirt",
    unitCostPaise: 45_000,
    unitPricePaise: 110_000,
    reorderPoint: 20,
  },
];

export const inventory: InventoryItem[] = [
  {
    id: "inv_1",
    productId: "prd_1",
    quantityOnHand: 12,
    quantityOnOrder: 100,
    expectedRestockDate: d(4), // Day 4
    updatedAt: d(0),
  },
  {
    id: "inv_2",
    productId: "prd_2",
    quantityOnHand: 8,
    quantityOnOrder: 0,
    updatedAt: d(0),
  },
  {
    id: "inv_3",
    productId: "prd_3",
    quantityOnHand: 34,
    quantityOnOrder: 50,
    expectedRestockDate: d(11),
    updatedAt: d(0),
  },
];

export const purchaseOrders: PurchaseOrder[] = [
  {
    id: "po_1",
    supplierId: "sup_1",
    productId: "prd_1",
    quantity: 100,
    totalPaise: 3_500_000, // ₹35,000
    advancePaidPaise: 500_000, // ₹5,000 advance
    status: "confirmed",
    orderDate: dp(2),
    expectedDeliveryDate: d(4),
  },
  {
    id: "po_2",
    supplierId: "sup_2",
    productId: "prd_3",
    quantity: 50,
    totalPaise: 2_250_000,
    advancePaidPaise: 0,
    status: "sent",
    orderDate: d(0),
    expectedDeliveryDate: d(11),
  },
];

export const customerOrders: CustomerOrder[] = [
  {
    id: "co_1",
    customerId: "cus_1",
    productId: "prd_1",
    quantity: 10,
    totalPaise: 800_000, // ₹8,000
    status: "confirmed",
    orderDate: d(6), // sale on Day 6
    deliveryDate: d(6),
  },
  {
    id: "co_2",
    customerId: "cus_2",
    productId: "prd_2",
    quantity: 6,
    totalPaise: 1_320_000,
    status: "confirmed",
    orderDate: d(2),
    deliveryDate: d(9),
  },
];

export const invoices: Invoice[] = [
  {
    id: "inv_2001",
    invoiceNumber: "INV-2001",
    customerId: "cus_1",
    customerOrderId: "co_1",
    amountPaise: 800_000, // ₹8,000
    amountPaidPaise: 0,
    status: "sent",
    issueDate: d(6),
    dueDate: d(21), // expected payment Day 21
  },
  {
    id: "inv_2002",
    invoiceNumber: "INV-2002",
    customerId: "cus_2",
    customerOrderId: "co_2",
    amountPaise: 1_320_000,
    amountPaidPaise: 0,
    status: "sent",
    issueDate: d(9),
    dueDate: d(39),
  },
  {
    id: "inv_1998",
    invoiceNumber: "INV-1998",
    customerId: "cus_3",
    amountPaise: 560_000,
    amountPaidPaise: 560_000,
    status: "paid",
    issueDate: dp(20),
    dueDate: dp(5),
  },
  {
    id: "inv_1999",
    invoiceNumber: "INV-1999",
    customerId: "cus_2",
    amountPaise: 130_000,
    amountPaidPaise: 0,
    status: "overdue",
    issueDate: dp(35),
    dueDate: dp(5),
  },
];

export const payments: Payment[] = [
  {
    id: "pay_1",
    direction: "outgoing",
    purchaseOrderId: "po_1",
    amountPaise: 500_000,
    status: "completed",
    scheduledDate: dp(2),
    completedDate: dp(2),
    method: "UPI",
  },
  {
    id: "pay_2",
    direction: "incoming",
    invoiceId: "inv_2001",
    amountPaise: 800_000,
    status: "scheduled",
    scheduledDate: d(21),
  },
  {
    id: "pay_3",
    direction: "outgoing",
    purchaseOrderId: "po_1",
    amountPaise: 3_000_000, // balance on delivery
    status: "scheduled",
    scheduledDate: d(4),
  },
  {
    id: "pay_4",
    direction: "incoming",
    invoiceId: "inv_1999",
    amountPaise: 130_000,
    status: "scheduled",
    scheduledDate: dp(5),
  },
];

export const cashFlowEvents: CashFlowEvent[] = [
  {
    id: "cfe_1",
    type: "supplier_payment",
    label: "Advance to Shree Textiles",
    direction: "outgoing",
    amountPaise: 500_000,
    date: dp(2),
    relatedPurchaseOrderId: "po_1",
    isProjected: false,
  },
  {
    id: "cfe_2",
    type: "supplier_payment",
    label: "Balance to Shree Textiles (PO-1 delivery)",
    direction: "outgoing",
    amountPaise: 3_000_000,
    date: d(4),
    relatedPurchaseOrderId: "po_1",
    isProjected: true,
  },
  {
    id: "cfe_3",
    type: "customer_payment",
    label: "Urban Threads — INV-2001",
    direction: "incoming",
    amountPaise: 800_000,
    date: d(21),
    relatedInvoiceId: "inv_2001",
    isProjected: true,
  },
  {
    id: "cfe_4",
    type: "rent",
    label: "Shop rent",
    direction: "outgoing",
    amountPaise: 1_200_000,
    date: d(5),
    isProjected: true,
  },
  {
    id: "cfe_5",
    type: "customer_payment",
    label: "Style Mart — INV-1999 (overdue)",
    direction: "incoming",
    amountPaise: 130_000,
    date: dp(5),
    relatedInvoiceId: "inv_1999",
    isProjected: true,
  },
  {
    id: "cfe_6",
    type: "customer_payment",
    label: "Style Mart — INV-2002",
    direction: "incoming",
    amountPaise: 1_320_000,
    date: d(39),
    relatedInvoiceId: "inv_2002",
    isProjected: true,
  },
  {
    id: "cfe_7",
    type: "supplier_payment",
    label: "Mehta Fabrics — PO-2",
    direction: "outgoing",
    amountPaise: 2_250_000,
    date: d(11),
    relatedPurchaseOrderId: "po_2",
    isProjected: true,
  },
];

/** Deterministic 30-day forecast built from opening cash + events. */
export function buildForecast(): ForecastPoint[] {
  const points: ForecastPoint[] = [];
  let balance = business.openingCashPaise;
  for (let i = 0; i < 30; i++) {
    const date = d(i);
    const dayEvents = cashFlowEvents.filter((e) => e.date === date);
    const inflows = dayEvents
      .filter((e) => e.direction === "incoming")
      .reduce((s, e) => s + e.amountPaise, 0);
    const outflows = dayEvents
      .filter((e) => e.direction === "outgoing")
      .reduce((s, e) => s + e.amountPaise, 0);
    balance += inflows - outflows;
    points.push({
      date,
      projectedBalancePaise: balance,
      inflowsPaise: inflows,
      outflowsPaise: outflows,
      isShortfall: balance < 0,
    });
  }
  return points;
}

export const riskAlerts: RiskAlert[] = [
  {
    id: "risk_1",
    severity: "critical",
    title: "Cash shortfall around Day 5",
    description:
      "Paying the ₹30,000 balance to Shree Textiles on delivery (Day 4) plus shop rent (Day 5) pushes projected cash below zero before INV-2001 is paid on Day 21.",
    relatedEntityId: "po_1",
    relatedEntityType: "purchase_order",
    createdAt: d(0),
    acknowledged: false,
  },
  {
    id: "risk_2",
    severity: "warning",
    title: "INV-1999 is 5 days overdue",
    description:
      "Style Mart owes ₹1,300 that was due 5 days ago. A follow-up reminder is recommended.",
    relatedEntityId: "inv_1999",
    relatedEntityType: "invoice",
    createdAt: d(0),
    acknowledged: false,
  },
  {
    id: "risk_3",
    severity: "warning",
    title: "Cotton Kurti below reorder point",
    description:
      "Only 12 units on hand against a reorder point of 25. The 100-unit replenishment arrives Day 4 — a delivery delay would risk stockouts for the Day 6 sale.",
    relatedEntityId: "prd_1",
    relatedEntityType: "product",
    createdAt: d(0),
    acknowledged: false,
  },
  {
    id: "risk_4",
    severity: "info",
    title: "Khan Dye House reliability dipping",
    description:
      "Reliability score of 71 is the lowest among your suppliers. Consider confirming lead times before the next dye order.",
    relatedEntityId: "sup_3",
    relatedEntityType: "supplier",
    createdAt: d(0),
    acknowledged: true,
  },
];

export const recommendations: Recommendation[] = [
  {
    id: "rec_1",
    title: "Request a 7-day extension on the Shree Textiles balance",
    rationale:
      "Moving the ₹30,000 payment from Day 4 to Day 11 keeps projected cash positive until INV-2001 lands on Day 21.",
    impactPaise: 3_000_000,
    priority: "high",
    relatedEntityId: "po_1",
  },
  {
    id: "rec_2",
    title: "Send a payment reminder to Style Mart",
    rationale: "INV-1999 (₹1,300) is 5 days overdue. Early reminders typically halve late-payment duration.",
    impactPaise: 130_000,
    priority: "medium",
    relatedEntityId: "inv_1999",
  },
  {
    id: "rec_3",
    title: "Offer Urban Threads a 2% early-payment discount",
    rationale:
      "Collecting INV-2001 on Day 10 instead of Day 21 would fully cover the Day 4–5 outflows and remove the shortfall.",
    impactPaise: 800_000,
    priority: "high",
    relatedEntityId: "inv_2001",
  },
];
