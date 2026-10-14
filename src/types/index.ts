/**
 * Ripple domain models.
 *
 * Conventions:
 * - Every persistent entity has an `id`. Relationships are modeled through IDs,
 *   never display names.
 * - Monetary amounts are integers in minor units (paise for INR) to avoid
 *   floating-point arithmetic on financial values.
 * - Dates are ISO 8601 strings in API payloads; format for display only.
 */

export type CurrencyCode = "INR" | "USD" | "EUR";

export interface Business {
  id: string;
  name: string;
  currency: CurrencyCode;
  openingCashPaise: number;
  industry?: string;
}

export interface Supplier {
  id: string;
  businessId: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  paymentTermsDays: number;
  outstandingPaise: number;
  reliabilityScore: number; // 0-100
}

export interface Customer {
  id: string;
  businessId: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  creditTermsDays: number;
  outstandingPaise: number;
}

export interface Product {
  id: string;
  businessId: string;
  sku: string;
  name: string;
  unitCostPaise: number;
  unitPricePaise: number;
  reorderPoint: number;
}

export interface InventoryItem {
  id: string;
  productId: string;
  quantityOnHand: number;
  quantityOnOrder: number;
  expectedRestockDate?: string;
  updatedAt: string;
}

export type PurchaseOrderStatus = "draft" | "sent" | "confirmed" | "received" | "cancelled";

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  productId: string;
  quantity: number;
  totalPaise: number;
  advancePaidPaise: number;
  status: PurchaseOrderStatus;
  orderDate: string;
  expectedDeliveryDate: string;
}

export type CustomerOrderStatus = "quote" | "confirmed" | "fulfilled" | "cancelled";

export interface CustomerOrder {
  id: string;
  customerId: string;
  productId: string;
  quantity: number;
  totalPaise: number;
  status: CustomerOrderStatus;
  orderDate: string;
  deliveryDate?: string;
}

export type InvoiceStatus = "draft" | "sent" | "partially_paid" | "paid" | "overdue" | "void";

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerOrderId?: string;
  amountPaise: number;
  amountPaidPaise: number;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
}

export type PaymentDirection = "incoming" | "outgoing";
export type PaymentStatus = "scheduled" | "completed" | "failed" | "cancelled";

export interface Payment {
  id: string;
  direction: PaymentDirection;
  invoiceId?: string;
  purchaseOrderId?: string;
  amountPaise: number;
  status: PaymentStatus;
  scheduledDate: string;
  completedDate?: string;
  method?: string;
}

export type CashFlowEventType =
  "supplier_payment" | "customer_payment" | "payroll" | "rent" | "tax" | "other";

export interface CashFlowEvent {
  id: string;
  type: CashFlowEventType;
  label: string;
  direction: PaymentDirection;
  amountPaise: number;
  date: string;
  relatedInvoiceId?: string;
  relatedPurchaseOrderId?: string;
  isProjected: boolean;
}

/** An edge in the dependency graph: `sourceId` affects `targetId`. */
export interface DependencyEdge {
  id: string;
  sourceId: string;
  sourceType:
    "supplier" | "purchase_order" | "inventory" | "customer_order" | "invoice" | "payment";
  targetId: string;
  targetType:
    "supplier" | "purchase_order" | "inventory" | "customer_order" | "invoice" | "payment";
  label: string;
  lagDays: number;
}

export interface ForecastPoint {
  date: string;
  projectedBalancePaise: number;
  inflowsPaise: number;
  outflowsPaise: number;
  isShortfall: boolean;
}

export type RiskSeverity = "info" | "warning" | "critical";

export interface RiskAlert {
  id: string;
  severity: RiskSeverity;
  title: string;
  description: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
  createdAt: string;
  acknowledged: boolean;
}

export interface SimulationScenario {
  id: string;
  name: string;
  description?: string;
  /** Event ID being changed, e.g. an invoice payment date. */
  targetEventId: string;
  changeType: "delay_payment" | "advance_payment" | "cancel_order" | "price_change";
  changeMagnitude: number; // days for delays, percent for price changes
  createdAt: string;
}

export interface SimulationResult {
  scenarioId: string;
  baselineForecast: ForecastPoint[];
  scenarioForecast: ForecastPoint[];
  impactedEventIds: string[];
  minBalancePaise: number;
  minBalanceDate: string;
  summary: string;
}

export interface Recommendation {
  id: string;
  title: string;
  rationale: string;
  impactPaise?: number;
  priority: "low" | "medium" | "high";
  relatedEntityId?: string;
}

/** Standard API envelope returned by the backend. */
export interface ApiListResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
  };
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export * from "./relationships";
