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
  safetyThresholdPaise?: number;
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
  category?: string | undefined;
  description?: string | undefined;
  unitOfMeasure?: string | undefined;
  preferredSupplierId?: string | undefined;
  currency?: CurrencyCode | undefined;
}

export interface InventoryItem {
  id: string;
  productId: string;
  quantityOnHand: number;
  quantityReserved?: number | undefined;
  quantityOnOrder: number;
  expectedRestockDate?: string | undefined;
  updatedAt: string;
}

export type PurchaseOrderStatus =
  | "draft"
  | "sent"
  | "confirmed"
  | "partially_received"
  | "received"
  | "delayed"
  | "cancelled";

export interface PurchaseOrderLineItem {
  id: string;
  purchaseOrderId: string;
  productId: string;
  quantity: number;
  unitPricePaise: number;
  totalPaise: number;
  receivedQuantity?: number | undefined;
}

export interface PurchaseOrder {
  id: string;
  poNumber?: string | undefined;
  supplierId: string;
  productId?: string | undefined;
  quantity?: number | undefined;
  lineItems?: PurchaseOrderLineItem[] | undefined;
  totalPaise: number;
  advancePaidPaise: number;
  status: PurchaseOrderStatus;
  orderDate: string;
  expectedDeliveryDate: string;
  paymentTermsDays?: number | undefined;
  paymentDueDate?: string | undefined;
  notes?: string | undefined;
  receivedQuantity?: number | undefined;
}

export type InventoryMovementType =
  | "receipt"
  | "sale"
  | "reservation"
  | "reservation_release"
  | "adjustment"
  | "return";

export interface InventoryMovement {
  id: string;
  businessId: string;
  productId: string;
  type: InventoryMovementType;
  quantity: number;
  resultingBalance: number;
  date: string;
  referenceType?: "purchase_order" | "customer_order" | "adjustment" | "manual" | "return" | undefined;
  referenceId?: string | undefined;
  note?: string | undefined;
  createdAt: string;
}

export type StockStatus =
  | "healthy"
  | "low_stock"
  | "stockout_risk"
  | "out_of_stock"
  | "incoming_stock";

export interface InventoryItemWithDetails {
  product: Product;
  inventory: InventoryItem;
  stockOnHand: number;
  reservedStock: number;
  availableStock: number;
  incomingStock: number;
  reorderThreshold: number;
  nextExpectedDelivery?: string | undefined;
  nextDeliveryPoId?: string | undefined;
  unitCostPaise: number;
  inventoryValuationPaise?: number | undefined;
  status: StockStatus;
  statusLabel: string;
  preferredSupplier?: Supplier | undefined;
}

export interface InventorySummaryMetrics {
  totalProducts: number;
  totalAvailableUnits: number;
  lowStockCount: number;
  stockoutRiskCount: number;
  incomingUnits: number;
  estimatedValuationPaise?: number | undefined;
}

export interface ReorderRecommendation {
  productId: string;
  productName: string;
  sku: string;
  category?: string | undefined;
  currentAvailableStock: number;
  reorderPoint: number;
  incomingQuantity: number;
  forecastDemand: number;
  estimatedStockoutDate?: string | undefined;
  suggestedReorderQuantity: number;
  preferredSupplierId?: string | undefined;
  preferredSupplierName?: string | undefined;
  preferredSupplierLeadDays?: number | undefined;
  estimatedDeliveryDate?: string | undefined;
  proposedPurchaseAmountPaise?: number | undefined;
  requiredAdvancePaise?: number | undefined;
  relatedCustomerOrderCount: number;
  customerCommitmentsAtRisk: string[];
  reason: string;
  hasSufficientData: boolean;
  missingDataReason?: string | undefined;
}

export type InventoryRiskSeverity = "info" | "warning" | "critical";

export interface InventoryRiskAlert {
  id: string;
  severity: InventoryRiskSeverity;
  category:
    | "projected_stockout"
    | "delayed_supplier_delivery"
    | "insufficient_stock_for_customer_order"
    | "lead_time_expiring"
    | "advance_before_customer_receipt"
    | "incoming_insufficient";
  title: string;
  explanation: string;
  productId?: string | undefined;
  productName?: string | undefined;
  sku?: string | undefined;
  purchaseOrderId?: string | undefined;
  supplierId?: string | undefined;
  supplierName?: string | undefined;
  customerOrderId?: string | undefined;
  customerName?: string | undefined;
  relevantDate?: string | undefined;
  financialImpactPaise?: number | undefined;
  actionType: "view_product" | "view_po" | "view_supplier" | "inspect_cash_flow" | "simulate";
}

export interface CreateProductInput {
  name: string;
  sku: string;
  category: string;
  description?: string | undefined;
  unitOfMeasure?: string | undefined;
  initialStockQuantity?: number | undefined;
  reorderPoint: number;
  preferredSupplierId?: string | undefined;
  unitCostPaise?: number | undefined;
  currency?: CurrencyCode | undefined;
}

export interface UpdateProductInput {
  name?: string | undefined;
  sku?: string | undefined;
  category?: string | undefined;
  description?: string | undefined;
  unitOfMeasure?: string | undefined;
  reorderPoint?: number | undefined;
  preferredSupplierId?: string | undefined;
  unitCostPaise?: number | undefined;
}

export interface RecordMovementInput {
  productId: string;
  type: InventoryMovementType;
  quantity: number;
  date?: string | undefined;
  referenceType?: "purchase_order" | "customer_order" | "adjustment" | "manual" | "return" | undefined;
  referenceId?: string | undefined;
  note?: string | undefined;
}

export interface CreatePurchaseOrderInput {
  supplierId: string;
  orderDate: string;
  expectedDeliveryDate: string;
  paymentTermsDays?: number | undefined;
  advanceAmountPaise?: number | undefined;
  notes?: string | undefined;
  lineItems: {
    productId: string;
    quantity: number;
    unitPricePaise: number;
  }[];
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
  counterpartyName?: string;
  status?: "completed" | "scheduled" | "overdue" | "projected";
  riskNote?: string;
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
  netMovementPaise?: number;
  openingBalancePaise?: number;
  isHistorical?: boolean;
  scenarioBalancePaise?: number;
  shortfallPaise?: number;
}

export interface DailyLedgerEntry {
  date: string;
  openingBalancePaise: number;
  expectedIncomingPaise: number;
  otherInflowsPaise: number;
  totalInflowsPaise: number;
  supplierPaymentsPaise: number;
  operatingExpensesPaise: number;
  otherOutflowsPaise: number;
  totalOutflowsPaise: number;
  netMovementPaise: number;
  closingBalancePaise: number;
  status: "healthy" | "warning" | "shortfall";
  shortfallPaise: number;
  isHistorical: boolean;
  events: CashFlowEvent[];
}

export interface ForecastConfidenceMetadata {
  confidenceScore: number;
  reconciliationStatus: "verified" | "provisional";
  lastReconciledAt: string;
  actualsThroughDate: string;
  invoicedCoveragePercent: number;
  isDemo: boolean;
}

export interface ForecastScenarioComparison {
  scenarioId: string;
  scenarioName: string;
  description: string;
  assumptions: string;
  targetEventId: string;
  baselineMinBalancePaise: number;
  baselineMinBalanceDate: string;
  scenarioMinBalancePaise: number;
  scenarioMinBalanceDate: string;
  minBalanceDifferencePaise: number;
  baselineBreachDates: string[];
  scenarioBreachDates: string[];
  scenarioPoints: ForecastPoint[];
}

export interface ForecastResponsePayload {
  periodDays: number;
  period: string;
  currency: CurrencyCode;
  openingBalancePaise: number;
  closingBalancePaise: number;
  totalInflowsPaise: number;
  totalOutflowsPaise: number;
  netMovementPaise: number;
  minBalancePaise: number;
  minBalanceDate: string;
  safetyThresholdPaise: number;
  breachDates: string[];
  daysBelowThreshold: number;
  points: ForecastPoint[];
  dailyLedger: DailyLedgerEntry[];
  events: CashFlowEvent[];
  confidenceMetadata: ForecastConfidenceMetadata;
  scenario?: ForecastScenarioComparison;
}

export type ForecastResponse = ForecastPoint[] & ForecastResponsePayload;

export interface GetForecastParams {
  days?: number;
  businessId?: string;
  scenarioId?: string;
  safetyThresholdPaise?: number;
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
