import { addDays, subDays } from "date-fns";
import { toISODate } from "@/lib/formatters";
import type {
  Business,
  Supplier,
  Customer,
  Product,
  InventoryItem,
  InventoryMovement,
  PurchaseOrder,
  PurchaseOrderLineItem,
  CustomerOrder,
  Invoice,
  Payment,
  CashFlowEvent,
  ForecastPoint,
  DailyLedgerEntry,
  ForecastResponse,
  SimulationScenario,
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
  safetyThresholdPaise: 500_000, // ₹5,000 safety threshold
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
    address: "Plot 42, GIDC Textile Park, Surat, Gujarat 395023",
    taxId: "24AAACS1234F1Z8",
    paymentTermsDays: 30,
    outstandingPaise: 3_000_000, // ₹30,000 balance owed on PO-1
    reliabilityScore: 86,
    status: "active",
    leadTimeDays: 4,
    notes:
      "Primary cotton yarn and greige fabric mill. High fabric consistency, requires advance before cutting.",
    createdAt: dp(90),
    updatedAt: dp(2),
  },
  {
    id: "sup_2",
    businessId: "biz_1",
    name: "Mehta Fabrics",
    contactName: "Priya Mehta",
    email: "priya@mehtafabrics.in",
    phone: "+91 98200 67890",
    address: "Survey No. 118, Bhiwandi Textile Hub, Thane, Maharashtra 421302",
    taxId: "27AABCM5678G2ZC",
    paymentTermsDays: 45,
    outstandingPaise: 2_250_000, // ₹22,500 on PO-2
    reliabilityScore: 92,
    status: "active",
    leadTimeDays: 11,
    notes:
      "Supplies premium European linen and rugged denim. Very dependable on-time delivery track record.",
    createdAt: dp(120),
    updatedAt: d(0),
  },
  {
    id: "sup_3",
    businessId: "biz_1",
    name: "Khan Dye House",
    contactName: "Imran Khan",
    email: "imran@khandye.in",
    phone: "+91 98200 54321",
    address: "Gala 14, Dharavi Dyeing Compound, Mumbai, Maharashtra 400017",
    taxId: "27AAECK9012H1ZQ",
    paymentTermsDays: 15,
    outstandingPaise: 720_000, // ₹6,000 on PO-3 + ₹1,200 overdue bill
    reliabilityScore: 71,
    status: "active",
    leadTimeDays: 7,
    notes:
      "Artisanal natural vat dyeing and silk embroidery. Delays occur frequently in peak monsoon season.",
    createdAt: dp(60),
    updatedAt: dp(3),
  },
  {
    id: "sup_4",
    businessId: "biz_1",
    name: "Heritage Weaves",
    contactName: "Kavita Rao",
    email: "kavita@heritageweaves.in",
    phone: "+91 98200 99887",
    address: "Sector 5, Weavers Colony, Maheshwar, MP 451224",
    taxId: "23AABCH8877J1ZV",
    paymentTermsDays: 30,
    outstandingPaise: 0,
    reliabilityScore: 95,
    status: "archived",
    leadTimeDays: 14,
    notes:
      "Former handloom Maheshwari silk partner. Transitioned to local cooperative in late 2025.",
    createdAt: dp(365),
    updatedAt: dp(40),
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
    category: "Kurtis & Tunics",
    description:
      "Breathable 100% handspun cotton kurti with traditional block print and side slits.",
    unitOfMeasure: "pieces",
    preferredSupplierId: "sup_1",
    currency: "INR",
    unitCostPaise: 35_000, // ₹350
    unitPricePaise: 80_000, // ₹800
    reorderPoint: 25,
  },
  {
    id: "prd_2",
    businessId: "biz_1",
    sku: "JKT-DEN-002",
    name: "Denim Jacket",
    category: "Outerwear",
    description:
      "Tailored rugged denim jacket with antiqued brass buttons and reinforced stitching.",
    unitOfMeasure: "pieces",
    preferredSupplierId: "sup_2",
    currency: "INR",
    unitCostPaise: 90_000, // ₹900
    unitPricePaise: 220_000, // ₹2,200
    reorderPoint: 10,
  },
  {
    id: "prd_3",
    businessId: "biz_1",
    sku: "SHT-LIN-003",
    name: "Linen Shirt",
    category: "Linen & Casual",
    description: "Pre-washed breathable European linen button-down with mandarin collar.",
    unitOfMeasure: "pieces",
    preferredSupplierId: "sup_2",
    currency: "INR",
    unitCostPaise: 45_000, // ₹450
    unitPricePaise: 110_000, // ₹1,100
    reorderPoint: 20,
  },
  {
    id: "prd_4",
    businessId: "biz_1",
    sku: "ACC-SLK-004",
    name: "Silk Embroidered Dupatta",
    category: "Accessories & Dupattas",
    description: "Pure Chanderi silk dupatta with delicate golden zari border and floral motifs.",
    unitOfMeasure: "pieces",
    preferredSupplierId: "sup_3",
    currency: "INR",
    unitCostPaise: 20_000, // ₹200
    unitPricePaise: 55_000, // ₹550
    reorderPoint: 15,
  },
  {
    id: "prd_5",
    businessId: "biz_1",
    sku: "TRS-KHA-005",
    name: "Handloom Khadi Trousers",
    category: "Handlooms & Trousers",
    description: "Organic khadi pleated relaxed fit trousers with elasticated back waist.",
    unitOfMeasure: "pieces",
    preferredSupplierId: "sup_1",
    currency: "INR",
    unitCostPaise: 50_000, // ₹500
    unitPricePaise: 130_000, // ₹1,300
    reorderPoint: 12,
  },
];

export const inventory: InventoryItem[] = [
  {
    id: "inv_1",
    productId: "prd_1",
    quantityOnHand: 12,
    quantityReserved: 10, // 10 units reserved for customer order co_1
    quantityOnOrder: 100, // 100 units coming via po_1
    expectedRestockDate: d(4), // Day 4
    updatedAt: d(0),
  },
  {
    id: "inv_2",
    productId: "prd_2",
    quantityOnHand: 8,
    quantityReserved: 6, // 6 units reserved for customer order co_2
    quantityOnOrder: 0, // No PO placed yet!
    updatedAt: d(0),
  },
  {
    id: "inv_3",
    productId: "prd_3",
    quantityOnHand: 34,
    quantityReserved: 0,
    quantityOnOrder: 50,
    expectedRestockDate: d(11),
    updatedAt: d(0),
  },
  {
    id: "inv_4",
    productId: "prd_4",
    quantityOnHand: 0,
    quantityReserved: 0,
    quantityOnOrder: 40,
    expectedRestockDate: d(3),
    updatedAt: d(0),
  },
  {
    id: "inv_5",
    productId: "prd_5",
    quantityOnHand: 0,
    quantityReserved: 0,
    quantityOnOrder: 0,
    updatedAt: d(0),
  },
];

export const purchaseOrders: PurchaseOrder[] = [
  {
    id: "po_1",
    poNumber: "PO-2026-001",
    supplierId: "sup_1",
    productId: "prd_1",
    quantity: 100,
    lineItems: [
      {
        id: "poli_1",
        purchaseOrderId: "po_1",
        productId: "prd_1",
        quantity: 100,
        unitPricePaise: 35_000,
        totalPaise: 3_500_000,
        receivedQuantity: 0,
      },
    ],
    totalPaise: 3_500_000, // ₹35,000
    advancePaidPaise: 500_000, // ₹5,000 advance
    status: "confirmed",
    orderDate: dp(2),
    expectedDeliveryDate: d(4),
    paymentTermsDays: 30,
    paymentDueDate: d(34),
    notes: "100% fine cotton yarn dyed kurtis with standard pre-shrink wash.",
    receivedQuantity: 0,
  },
  {
    id: "po_2",
    poNumber: "PO-2026-002",
    supplierId: "sup_2",
    productId: "prd_3",
    quantity: 50,
    lineItems: [
      {
        id: "poli_2",
        purchaseOrderId: "po_2",
        productId: "prd_3",
        quantity: 50,
        unitPricePaise: 45_000,
        totalPaise: 2_250_000,
        receivedQuantity: 0,
      },
    ],
    totalPaise: 2_250_000,
    advancePaidPaise: 0,
    status: "sent",
    orderDate: d(0),
    expectedDeliveryDate: d(11),
    paymentTermsDays: 45,
    paymentDueDate: d(56),
    notes: "Pure linen premium shirts with pearl buttons.",
    receivedQuantity: 0,
  },
  {
    id: "po_3",
    poNumber: "PO-2026-003",
    supplierId: "sup_3",
    productId: "prd_4",
    quantity: 40,
    lineItems: [
      {
        id: "poli_3",
        purchaseOrderId: "po_3",
        productId: "prd_4",
        quantity: 40,
        unitPricePaise: 20_000,
        totalPaise: 800_000,
        receivedQuantity: 0,
      },
    ],
    totalPaise: 800_000,
    advancePaidPaise: 200_000,
    status: "confirmed",
    orderDate: dp(3),
    expectedDeliveryDate: d(3),
    paymentTermsDays: 15,
    paymentDueDate: d(18),
    notes: "Silk embroidered collection with zari borders.",
    receivedQuantity: 0,
  },
];

export const inventoryMovements: InventoryMovement[] = [
  {
    id: "mov_1",
    businessId: "biz_1",
    productId: "prd_1",
    type: "receipt",
    quantity: 25,
    resultingBalance: 25,
    date: dp(14),
    referenceType: "purchase_order",
    referenceId: "PO-2026-000",
    note: "Initial season batch receipt from Shree Textiles",
    createdAt: dp(14),
  },
  {
    id: "mov_2",
    businessId: "biz_1",
    productId: "prd_1",
    type: "sale",
    quantity: 13,
    resultingBalance: 12,
    date: dp(7),
    referenceType: "customer_order",
    referenceId: "CO-2026-098",
    note: "Fulfillment for retail storefront weekend clearance",
    createdAt: dp(7),
  },
  {
    id: "mov_3",
    businessId: "biz_1",
    productId: "prd_1",
    type: "reservation",
    quantity: 10,
    resultingBalance: 12,
    date: d(0),
    referenceType: "customer_order",
    referenceId: "co_1",
    note: "Allocated to Urban Threads Boutique order (due Day 6)",
    createdAt: d(0),
  },
  {
    id: "mov_4",
    businessId: "biz_1",
    productId: "prd_2",
    type: "receipt",
    quantity: 15,
    resultingBalance: 15,
    date: dp(20),
    referenceType: "purchase_order",
    referenceId: "PO-2026-DEN",
    note: "Pre-monsoon jacket stock receipt",
    createdAt: dp(20),
  },
  {
    id: "mov_5",
    businessId: "biz_1",
    productId: "prd_2",
    type: "sale",
    quantity: 7,
    resultingBalance: 8,
    date: dp(10),
    referenceType: "customer_order",
    referenceId: "CO-2026-092",
    note: "Direct retail sales dispatched",
    createdAt: dp(10),
  },
  {
    id: "mov_6",
    businessId: "biz_1",
    productId: "prd_2",
    type: "reservation",
    quantity: 6,
    resultingBalance: 8,
    date: d(0),
    referenceType: "customer_order",
    referenceId: "co_2",
    note: "Reserved for Style Mart bulk order due Day 9",
    createdAt: d(0),
  },
  {
    id: "mov_7",
    businessId: "biz_1",
    productId: "prd_3",
    type: "receipt",
    quantity: 34,
    resultingBalance: 34,
    date: dp(5),
    referenceType: "purchase_order",
    referenceId: "PO-2026-LIN-1",
    note: "Summer line batch delivery from Mehta Fabrics",
    createdAt: dp(5),
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
  // --- Accounts Receivable (Customer Invoices) ---
  {
    id: "inv_2001",
    invoiceNumber: "INV-2001",
    type: "receivable",
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
    type: "receivable",
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
    type: "receivable",
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
    type: "receivable",
    customerId: "cus_2",
    amountPaise: 130_000,
    amountPaidPaise: 0,
    status: "overdue",
    issueDate: dp(35),
    dueDate: dp(5),
  },
  // --- Accounts Payable (Supplier Invoices / Bills) ---
  {
    id: "inv_bill_101",
    invoiceNumber: "BILL-2026-001",
    type: "payable",
    supplierId: "sup_1",
    purchaseOrderId: "po_1",
    amountPaise: 3_500_000, // ₹35,000 for 100x Cotton Kurti
    amountPaidPaise: 500_000, // ₹5,000 advance paid
    status: "partially_paid",
    issueDate: dp(2),
    dueDate: d(34),
    notes: "Cotton Kurti bulk fabric lot. Advance settled; balance net-30 upon delivery.",
  },
  {
    id: "inv_bill_102",
    invoiceNumber: "BILL-2026-002",
    type: "payable",
    supplierId: "sup_2",
    purchaseOrderId: "po_2",
    amountPaise: 2_250_000, // ₹22,500 for 50x Linen Shirt
    amountPaidPaise: 0,
    status: "sent",
    issueDate: d(0),
    dueDate: d(56),
    notes: "Linen shirt lot. Net 45 payment terms.",
  },
  {
    id: "inv_bill_103",
    invoiceNumber: "BILL-2026-003",
    type: "payable",
    supplierId: "sup_3",
    purchaseOrderId: "po_3",
    amountPaise: 800_000, // ₹8,000 for 40x Silk Dupatta
    amountPaidPaise: 200_000, // ₹2,000 advance paid
    status: "partially_paid",
    issueDate: dp(3),
    dueDate: d(18),
    notes: "Silk embroidered collection. Net 15 terms.",
  },
  {
    id: "inv_bill_104",
    invoiceNumber: "BILL-2026-099",
    type: "payable",
    supplierId: "sup_3",
    amountPaise: 120_000, // ₹1,200 overdue dye chemicals bill
    amountPaidPaise: 0,
    status: "overdue",
    issueDate: dp(25),
    dueDate: dp(5),
    notes: "Sample dyeing run for festival palette. Overdue by 5 days.",
  },
  {
    id: "inv_bill_100",
    invoiceNumber: "BILL-2026-000",
    type: "payable",
    supplierId: "sup_1",
    amountPaise: 875_000, // ₹8,750 historical
    amountPaidPaise: 875_000,
    status: "paid",
    issueDate: dp(30),
    dueDate: dp(5),
    notes: "Initial pre-season fabric sample batch. Fully settled.",
  },
];

export const payments: Payment[] = [
  {
    id: "pay_1",
    direction: "outgoing",
    supplierId: "sup_1",
    purchaseOrderId: "po_1",
    invoiceId: "inv_bill_101",
    amountPaise: 500_000,
    status: "completed",
    scheduledDate: dp(2),
    completedDate: dp(2),
    method: "UPI",
  },
  {
    id: "pay_2",
    direction: "incoming",
    customerId: "cus_1",
    invoiceId: "inv_2001",
    amountPaise: 800_000,
    status: "scheduled",
    scheduledDate: d(21),
  },
  {
    id: "pay_3",
    direction: "outgoing",
    supplierId: "sup_1",
    purchaseOrderId: "po_1",
    invoiceId: "inv_bill_101",
    amountPaise: 3_000_000, // balance on delivery
    status: "scheduled",
    scheduledDate: d(4),
    method: "Bank Transfer",
  },
  {
    id: "pay_4",
    direction: "incoming",
    customerId: "cus_2",
    invoiceId: "inv_1999",
    amountPaise: 130_000,
    status: "scheduled",
    scheduledDate: dp(5),
  },
  {
    id: "pay_5",
    direction: "outgoing",
    supplierId: "sup_3",
    purchaseOrderId: "po_3",
    invoiceId: "inv_bill_103",
    amountPaise: 200_000,
    status: "completed",
    scheduledDate: dp(3),
    completedDate: dp(3),
    method: "NEFT",
  },
  {
    id: "pay_6",
    direction: "outgoing",
    supplierId: "sup_3",
    purchaseOrderId: "po_3",
    invoiceId: "inv_bill_103",
    amountPaise: 600_000,
    status: "scheduled",
    scheduledDate: d(18),
    method: "NEFT",
  },
  {
    id: "pay_7",
    direction: "outgoing",
    supplierId: "sup_1",
    invoiceId: "inv_bill_100",
    amountPaise: 875_000,
    status: "completed",
    scheduledDate: dp(5),
    completedDate: dp(5),
    method: "Bank Transfer",
  },
  {
    id: "pay_8",
    direction: "outgoing",
    supplierId: "sup_2",
    purchaseOrderId: "po_2",
    invoiceId: "inv_bill_102",
    amountPaise: 2_250_000,
    status: "scheduled",
    scheduledDate: d(56),
    method: "Bank Transfer",
  },
];

export const cashFlowEvents: CashFlowEvent[] = [
  // Historical / Actual past events (reconciled bank records)
  {
    id: "cfe_past_1",
    type: "other",
    label: "In-store cash deposit",
    counterpartyName: "Retail counter",
    direction: "incoming",
    amountPaise: 450_000,
    date: dp(7),
    isProjected: false,
    status: "completed",
  },
  {
    id: "cfe_past_2",
    type: "other",
    label: "Electricity & Fiber Internet",
    counterpartyName: "Tata Power",
    direction: "outgoing",
    amountPaise: 350_000,
    date: dp(5),
    isProjected: false,
    status: "completed",
  },
  {
    id: "cfe_1",
    type: "supplier_payment",
    label: "Advance to Shree Textiles (PO-1)",
    counterpartyName: "Shree Textiles",
    direction: "outgoing",
    amountPaise: 500_000,
    date: dp(2),
    relatedPurchaseOrderId: "po_1",
    isProjected: false,
    status: "completed",
  },
  {
    id: "cfe_today",
    type: "customer_payment",
    label: "Counter retail sales — UPI settlement",
    counterpartyName: "Walk-in customers",
    direction: "incoming",
    amountPaise: 250_000,
    date: d(0),
    isProjected: false,
    status: "completed",
  },

  // Forward commitments (Days 1 - 90)
  {
    id: "cfe_2",
    type: "supplier_payment",
    label: "Balance to Shree Textiles (PO-1 delivery)",
    counterpartyName: "Shree Textiles",
    direction: "outgoing",
    amountPaise: 3_000_000,
    date: d(4),
    relatedPurchaseOrderId: "po_1",
    isProjected: true,
    status: "scheduled",
    riskNote: "Critical outflow triggering cash deficit",
  },
  {
    id: "cfe_4",
    type: "rent",
    label: "Retail showroom rent",
    counterpartyName: "Metro Commercial Properties",
    direction: "outgoing",
    amountPaise: 1_200_000,
    date: d(5),
    isProjected: true,
    status: "scheduled",
    riskNote: "Fixed non-negotiable monthly commitment",
  },
  {
    id: "cfe_5",
    type: "customer_payment",
    label: "Style Mart — INV-1999 (overdue recovery)",
    counterpartyName: "Style Mart",
    direction: "incoming",
    amountPaise: 130_000,
    date: d(6),
    relatedInvoiceId: "inv_1999",
    isProjected: true,
    status: "overdue",
    riskNote: "5 days overdue, follow-up payment promised",
  },
  {
    id: "cfe_7",
    type: "supplier_payment",
    label: "Mehta Fabrics — PO-2 fabric batch",
    counterpartyName: "Mehta Fabrics",
    direction: "outgoing",
    amountPaise: 2_250_000,
    date: d(11),
    relatedPurchaseOrderId: "po_2",
    isProjected: true,
    status: "scheduled",
  },
  {
    id: "cfe_8",
    type: "customer_payment",
    label: "Fashion Hub — Wholesale Order",
    counterpartyName: "Fashion Hub",
    direction: "incoming",
    amountPaise: 1_800_000,
    date: d(15),
    isProjected: true,
    status: "scheduled",
  },
  {
    id: "cfe_9",
    type: "supplier_payment",
    label: "Khan Dye House — Batch dye run",
    counterpartyName: "Khan Dye House",
    direction: "outgoing",
    amountPaise: 320_000,
    date: d(18),
    isProjected: true,
    status: "scheduled",
    riskNote: "Supplier reliability score: 71",
  },
  {
    id: "cfe_10",
    type: "tax",
    label: "GST Monthly Return Filing",
    counterpartyName: "Goods & Services Tax Network",
    direction: "outgoing",
    amountPaise: 650_000,
    date: d(20),
    isProjected: true,
    status: "scheduled",
  },
  {
    id: "cfe_3",
    type: "customer_payment",
    label: "Urban Threads — INV-2001",
    counterpartyName: "Urban Threads Boutique",
    direction: "incoming",
    amountPaise: 800_000,
    date: d(21),
    relatedInvoiceId: "inv_2001",
    isProjected: true,
    status: "scheduled",
  },
  {
    id: "cfe_11",
    type: "other",
    label: "Logistics & packaging supplies",
    counterpartyName: "BlueDart Express",
    direction: "outgoing",
    amountPaise: 180_000,
    date: d(25),
    isProjected: true,
    status: "scheduled",
  },
  {
    id: "cfe_12",
    type: "customer_payment",
    label: "Urban Threads — Festive reorder",
    counterpartyName: "Urban Threads Boutique",
    direction: "incoming",
    amountPaise: 2_500_000,
    date: d(28),
    isProjected: true,
    status: "projected",
  },
  {
    id: "cfe_13",
    type: "payroll",
    label: "Staff payroll (Month 1)",
    counterpartyName: "Rupi Staff Payroll",
    direction: "outgoing",
    amountPaise: 1_500_000,
    date: d(30),
    isProjected: true,
    status: "scheduled",
  },
  {
    id: "cfe_4_m2",
    type: "rent",
    label: "Retail showroom rent (Month 2)",
    counterpartyName: "Metro Commercial Properties",
    direction: "outgoing",
    amountPaise: 1_200_000,
    date: d(35),
    isProjected: true,
    status: "scheduled",
  },
  {
    id: "cfe_6",
    type: "customer_payment",
    label: "Style Mart — INV-2002",
    counterpartyName: "Style Mart",
    direction: "incoming",
    amountPaise: 1_320_000,
    date: d(39),
    relatedInvoiceId: "inv_2002",
    isProjected: true,
    status: "scheduled",
  },
  {
    id: "cfe_14",
    type: "supplier_payment",
    label: "Mehta Fabrics — Organic cotton yarn",
    counterpartyName: "Mehta Fabrics",
    direction: "outgoing",
    amountPaise: 1_850_000,
    date: d(42),
    isProjected: true,
    status: "scheduled",
  },
  {
    id: "cfe_15",
    type: "customer_payment",
    label: "Style Mart — Summer linen batch",
    counterpartyName: "Style Mart",
    direction: "incoming",
    amountPaise: 3_200_000,
    date: d(45),
    isProjected: true,
    status: "projected",
  },
  {
    id: "cfe_16",
    type: "tax",
    label: "Quarterly Advance Income Tax",
    counterpartyName: "Income Tax Department",
    direction: "outgoing",
    amountPaise: 850_000,
    date: d(50),
    isProjected: true,
    status: "scheduled",
  },
  {
    id: "cfe_17",
    type: "supplier_payment",
    label: "Autumn collection fabric pre-order",
    counterpartyName: "Shree Textiles",
    direction: "outgoing",
    amountPaise: 1_500_000,
    date: d(55),
    isProjected: true,
    status: "scheduled",
  },
  {
    id: "cfe_18",
    type: "payroll",
    label: "Staff payroll (Month 2)",
    counterpartyName: "Rupi Staff Payroll",
    direction: "outgoing",
    amountPaise: 1_500_000,
    date: d(60),
    isProjected: true,
    status: "scheduled",
  },
  {
    id: "cfe_4_m3",
    type: "rent",
    label: "Retail showroom rent (Month 3)",
    counterpartyName: "Metro Commercial Properties",
    direction: "outgoing",
    amountPaise: 1_200_000,
    date: d(65),
    isProjected: true,
    status: "scheduled",
  },
  {
    id: "cfe_19",
    type: "customer_payment",
    label: "Fashion Hub — Autumn catalogue contract",
    counterpartyName: "Fashion Hub",
    direction: "incoming",
    amountPaise: 3_500_000,
    date: d(70),
    isProjected: true,
    status: "projected",
  },
  {
    id: "cfe_20",
    type: "customer_payment",
    label: "E-commerce wholesale fulfillment",
    counterpartyName: "Urban Threads Boutique",
    direction: "incoming",
    amountPaise: 2_800_000,
    date: d(75),
    isProjected: true,
    status: "projected",
  },
  {
    id: "cfe_21",
    type: "supplier_payment",
    label: "Winter outerwear raw materials",
    counterpartyName: "Mehta Fabrics",
    direction: "outgoing",
    amountPaise: 2_000_000,
    date: d(80),
    isProjected: true,
    status: "scheduled",
  },
  {
    id: "cfe_22",
    type: "payroll",
    label: "Staff payroll (Month 3)",
    counterpartyName: "Rupi Staff Payroll",
    direction: "outgoing",
    amountPaise: 1_500_000,
    date: d(90),
    isProjected: true,
    status: "scheduled",
  },
];

export const simulationScenarios: SimulationScenario[] = [
  {
    id: "sim_shree_delay",
    name: "Extend Shree Textiles PO-1 by 7 Days",
    description: "Move the ₹30,000 balance payment from Day 4 to Day 11 on net-7 terms.",
    targetEventId: "cfe_2",
    changeType: "delay_payment",
    changeMagnitude: 7,
    createdAt: dp(1),
  },
  {
    id: "sim_urban_discount",
    name: "Accelerate Urban Threads Collection (-11 Days)",
    description:
      "Offer 2% prompt-payment discount on INV-2001 (₹8,000) to collect on Day 10 instead of Day 21.",
    targetEventId: "cfe_3",
    changeType: "advance_payment",
    changeMagnitude: -11,
    createdAt: dp(1),
  },
  {
    id: "sim_stylemart_delay",
    name: "Style Mart Delayed Payment (+30 Days)",
    description:
      "Stress test scenario where Style Mart defers INV-2002 (₹13,200) by an additional 30 days.",
    targetEventId: "cfe_6",
    changeType: "delay_payment",
    changeMagnitude: 30,
    createdAt: dp(1),
  },
];

/** Deterministic forecast built from opening cash + events. */
export function buildForecast(
  events: CashFlowEvent[] = cashFlowEvents,
  openingCashPaise: number = business.openingCashPaise,
  days = 30,
): ForecastPoint[] {
  const points: ForecastPoint[] = [];
  let balance = openingCashPaise;
  for (let i = 0; i < days; i++) {
    const date = d(i);
    const dayEvents = events.filter((e) => e.date === date);
    const inflows = dayEvents
      .filter((e) => e.direction === "incoming")
      .reduce((s, e) => s + e.amountPaise, 0);
    const outflows = dayEvents
      .filter((e) => e.direction === "outgoing")
      .reduce((s, e) => s + e.amountPaise, 0);
    const net = inflows - outflows;
    const dayOpening = balance;
    balance += net;
    points.push({
      date,
      projectedBalancePaise: balance,
      inflowsPaise: inflows,
      outflowsPaise: outflows,
      isShortfall: balance < 0,
      netMovementPaise: net,
      openingBalancePaise: dayOpening,
    });
  }
  return points;
}

export function buildDetailedForecast(
  events: CashFlowEvent[] = cashFlowEvents,
  openingCashPaise: number = business.openingCashPaise,
  days = 30,
  safetyThresholdPaise: number = business.safetyThresholdPaise ?? 500_000,
  scenarioId?: string,
): ForecastResponse {
  let runningBalance = openingCashPaise;
  const points: ForecastPoint[] = [];
  const dailyLedger: DailyLedgerEntry[] = [];
  const breachDates: string[] = [];

  let totalInflows = 0;
  let totalOutflows = 0;

  for (let i = 0; i < days; i++) {
    const date = d(i);
    const dayEvents = events.filter((e) => e.date === date);

    const expectedIncoming = dayEvents
      .filter((e) => e.direction === "incoming" && e.type === "customer_payment")
      .reduce((s, e) => s + e.amountPaise, 0);

    const otherInflows = dayEvents
      .filter((e) => e.direction === "incoming" && e.type !== "customer_payment")
      .reduce((s, e) => s + e.amountPaise, 0);

    const dayInflows = expectedIncoming + otherInflows;

    const supplierPayments = dayEvents
      .filter((e) => e.direction === "outgoing" && e.type === "supplier_payment")
      .reduce((s, e) => s + e.amountPaise, 0);

    const operatingExpenses = dayEvents
      .filter((e) => e.direction === "outgoing" && (e.type === "rent" || e.type === "payroll"))
      .reduce((s, e) => s + e.amountPaise, 0);

    const otherOutflows = dayEvents
      .filter(
        (e) =>
          e.direction === "outgoing" &&
          e.type !== "supplier_payment" &&
          e.type !== "rent" &&
          e.type !== "payroll",
      )
      .reduce((s, e) => s + e.amountPaise, 0);

    const dayOutflows = supplierPayments + operatingExpenses + otherOutflows;
    const netMovement = dayInflows - dayOutflows;
    const dayOpening = runningBalance;
    runningBalance += netMovement;
    const closingBalance = runningBalance;

    totalInflows += dayInflows;
    totalOutflows += dayOutflows;

    const isBelowThreshold = closingBalance < safetyThresholdPaise;
    const isDeficit = closingBalance < 0;
    if (isBelowThreshold) {
      breachDates.push(date);
    }

    const shortfallPaise = isBelowThreshold ? safetyThresholdPaise - closingBalance : 0;
    const status: "healthy" | "warning" | "shortfall" = isDeficit
      ? "shortfall"
      : isBelowThreshold
        ? "warning"
        : "healthy";

    const point: ForecastPoint = {
      date,
      projectedBalancePaise: closingBalance,
      inflowsPaise: dayInflows,
      outflowsPaise: dayOutflows,
      isShortfall: isDeficit,
      netMovementPaise: netMovement,
      openingBalancePaise: dayOpening,
      shortfallPaise,
    };
    points.push(point);

    dailyLedger.push({
      date,
      openingBalancePaise: dayOpening,
      expectedIncomingPaise: expectedIncoming,
      otherInflowsPaise: otherInflows,
      totalInflowsPaise: dayInflows,
      supplierPaymentsPaise: supplierPayments,
      operatingExpensesPaise: operatingExpenses,
      otherOutflowsPaise: otherOutflows,
      totalOutflowsPaise: dayOutflows,
      netMovementPaise: netMovement,
      closingBalancePaise: closingBalance,
      status,
      shortfallPaise,
      isHistorical: false,
      events: dayEvents,
    });
  }

  const minPoint =
    points.length > 0
      ? points.reduce((min, p) => (p.projectedBalancePaise < min.projectedBalancePaise ? p : min))
      : { projectedBalancePaise: openingCashPaise, date: d(0) };

  let scenarioData = undefined;
  if (scenarioId) {
    const scenario = simulationScenarios.find((s) => s.id === scenarioId);
    if (scenario) {
      const modifiedEvents = events.map((e) => {
        if (e.id === scenario.targetEventId) {
          if (scenario.id === "sim_shree_delay") {
            return { ...e, date: d(11), riskNote: "Scenario: Shifted to Day 11 (+7 days)" };
          }
          if (scenario.id === "sim_urban_discount") {
            return {
              ...e,
              date: d(10),
              amountPaise: 784_000,
              riskNote: "Scenario: Collected Day 10 (2% settlement discount)",
            };
          }
          if (scenario.id === "sim_stylemart_delay") {
            return { ...e, date: d(69), riskNote: "Scenario: Delayed to Day 69 (+30 days)" };
          }
        }
        return e;
      });

      const scenarioForecast = buildForecast(modifiedEvents, openingCashPaise, days);
      const scenarioMinPoint = scenarioForecast.reduce(
        (min, p) => (p.projectedBalancePaise < min.projectedBalancePaise ? p : min),
        scenarioForecast[0] ?? { projectedBalancePaise: openingCashPaise, date: d(0) },
      );
      const scenarioBreachDates = scenarioForecast
        .filter((p) => p.projectedBalancePaise < safetyThresholdPaise)
        .map((p) => p.date);

      scenarioForecast.forEach((sp, idx) => {
        if (points[idx]) {
          points[idx].scenarioBalancePaise = sp.projectedBalancePaise;
        }
      });

      let assumptionsText = "";
      if (scenario.id === "sim_shree_delay") {
        assumptionsText =
          "Shree Textiles approves a 7-day payment delay on PO-1 delivery balance. Eliminates immediate Day 5 cash deficit.";
      } else if (scenario.id === "sim_urban_discount") {
        assumptionsText =
          "Urban Threads accepts a 2% early-settlement incentive (₹160 discount), accelerating ₹7,840 net inflow to Day 10.";
      } else if (scenario.id === "sim_stylemart_delay") {
        assumptionsText =
          "Stress test simulating extended buyer delay: Style Mart defers INV-2002 payment by 30 days.";
      }

      scenarioData = {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        description: scenario.description ?? "",
        assumptions: assumptionsText,
        targetEventId: scenario.targetEventId,
        baselineMinBalancePaise: minPoint.projectedBalancePaise,
        baselineMinBalanceDate: minPoint.date,
        scenarioMinBalancePaise: scenarioMinPoint.projectedBalancePaise,
        scenarioMinBalanceDate: scenarioMinPoint.date,
        minBalanceDifferencePaise:
          scenarioMinPoint.projectedBalancePaise - minPoint.projectedBalancePaise,
        baselineBreachDates: breachDates,
        scenarioBreachDates,
        scenarioPoints: scenarioForecast,
      };
    }
  }

  const confidenceMetadata = {
    confidenceScore: 94,
    reconciliationStatus: "verified" as const,
    lastReconciledAt: new Date().toISOString(),
    actualsThroughDate: d(0),
    invoicedCoveragePercent: 89,
    isDemo: true,
  };

  const relevantEvents = events.filter((e) => e.date >= d(0) && e.date <= d(days - 1));

  const result = Object.assign(points, {
    periodDays: days,
    period: `${days} days`,
    currency: "INR" as const,
    openingBalancePaise: openingCashPaise,
    closingBalancePaise: runningBalance,
    totalInflowsPaise: totalInflows,
    totalOutflowsPaise: totalOutflows,
    netMovementPaise: totalInflows - totalOutflows,
    minBalancePaise: minPoint.projectedBalancePaise,
    minBalanceDate: minPoint.date,
    safetyThresholdPaise,
    breachDates,
    daysBelowThreshold: breachDates.length,
    points,
    dailyLedger,
    events: relevantEvents,
    confidenceMetadata,
    scenario: scenarioData,
  }) as ForecastResponse;

  return result;
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
    rationale:
      "INV-1999 (₹1,300) is 5 days overdue. Early reminders typically halve late-payment duration.",
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
