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
  ownerName?: string;
  ownerEmail?: string;
  phone?: string;
  address?: string;
  taxRatePercent?: number; // default tax rate e.g. 18 for GST
  defaultSupplierPaymentTermsDays?: number;
  defaultCustomerPaymentTermsDays?: number;
  defaultForecastHorizonDays?: 7 | 14 | 30;
}

export interface NotificationPreferences {
  overduePayments: boolean;
  upcomingSupplierPayments: boolean;
  overdueInvoices: boolean;
  lowCash: boolean;
  delayedDeliveries: boolean;
  highRippleImpact: boolean;
}

export interface AppPreferences {
  theme: "light" | "dark" | "system";
  compactTables: boolean;
  version?: string;
}

export interface AppSettings {
  business: Business;
  notifications: NotificationPreferences;
  app: AppPreferences;
  dataMode: "mock" | "api";
}

export type UpdateSettingsInput = {
  business?: Partial<Business>;
  notifications?: Partial<NotificationPreferences>;
  app?: Partial<AppPreferences>;
};

export type SupplierStatus = "active" | "archived";

export interface Supplier {
  id: string;
  businessId: string;
  name: string;
  contactName?: string | undefined;
  email?: string | undefined;
  phone?: string | undefined;
  address?: string | undefined;
  taxId?: string | undefined; // GSTIN / Tax Identification Number
  paymentTermsDays: number;
  outstandingPaise: number;
  reliabilityScore: number; // 0-100
  status?: SupplierStatus | undefined;
  notes?: string | undefined;
  leadTimeDays?: number | undefined;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
}

export interface CreateSupplierInput {
  name: string;
  contactName?: string | undefined;
  email?: string | undefined;
  phone?: string | undefined;
  address?: string | undefined;
  taxId?: string | undefined;
  paymentTermsDays: number;
  notes?: string | undefined;
  status?: SupplierStatus | undefined;
  leadTimeDays?: number | undefined;
  reliabilityScore?: number | undefined;
}

export type UpdateSupplierInput = Partial<CreateSupplierInput>;

export interface EnrichedSupplier extends Supplier {
  openPoCount: number;
  totalPoCount: number;
  nextPaymentDate?: string | undefined;
  nextPaymentAmountPaise?: number | undefined;
  overdueAmountPaise: number;
  hasOverdue: boolean;
  isAtRisk: boolean;
  riskReasons: string[];
  payableInvoicesCount: number;
}

export interface SupplierSummaryMetrics {
  totalSuppliers: number;
  activeSuppliers: number;
  archivedSuppliers: number;
  totalOutstandingPayablesPaise: number;
  dueInSevenDaysPaise: number;
  overduePayablesPaise: number;
  atRiskSuppliersCount: number;
}

export interface SupplierPaymentCommitment extends Payment {
  linkedReference?: string | undefined;
  linkedPoNumber?: string | undefined;
  linkedInvoiceNumber?: string | undefined;
  cashFlowImpactNote?: string | undefined;
  dueDate: string;
}

export interface SupplierDetailData {
  supplier: Supplier;
  metrics: {
    totalPurchasesPaise: number;
    totalPaymentsMadePaise: number;
    outstandingPayablesPaise: number;
    overdueBalancePaise: number;
    openPoCount: number;
    totalPoCount: number;
    onTimeDeliveryRate: number; // 0-100 percentage
    reliabilityScore: number;
    riskLevel: "low" | "medium" | "high";
    riskFactors: string[];
  };
  purchaseOrders: (PurchaseOrder & {
    lineItemsDetails?: (PurchaseOrderLineItem & { product?: Product | undefined })[] | undefined;
    orderedUnits: number;
    receivedUnits: number;
    outstandingPaise: number;
  })[];
  invoices: Invoice[]; // payable invoices
  payments: Payment[]; // all payments
  upcomingPayments: SupplierPaymentCommitment[];
  completedPayments: Payment[];
  products: Product[];
}

export type CustomerStatus = "active" | "archived";

export interface Customer {
  id: string;
  businessId: string;
  name: string;
  contactName?: string | undefined;
  email?: string | undefined;
  phone?: string | undefined;
  address?: string | undefined;
  taxId?: string | undefined; // GSTIN / Tax ID
  creditTermsDays: number;
  outstandingPaise: number;
  status?: CustomerStatus | undefined;
  notes?: string | undefined;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
}

export type PaymentReliabilityCategory =
  "Excellent" | "Good" | "Fair" | "Poor" | "Very poor" | "Insufficient payment history";

export interface PaymentReliabilityResult {
  score: number | null; // 0-100 or null if insufficient history
  category: PaymentReliabilityCategory;
  transactionCount: number;
  onTimeCount: number;
  lateCount: number;
  averageLatenessDays: number;
  hasSufficientHistory: boolean;
  notes?: string | undefined;
}

export interface CreateCustomerInput {
  name: string;
  contactName?: string | undefined;
  email?: string | undefined;
  phone?: string | undefined;
  address?: string | undefined;
  taxId?: string | undefined;
  creditTermsDays: number;
  notes?: string | undefined;
  status?: CustomerStatus | undefined;
}

export type UpdateCustomerInput = Partial<CreateCustomerInput>;

export interface EnrichedCustomer extends Customer {
  status: CustomerStatus;
  calculatedOutstandingPaise: number;
  overdueInvoicesCount: number;
  overdueAmountPaise: number;
  totalInvoicedPaise: number;
  totalPaidPaise: number;
  orderCount: number;
  invoiceCount: number;
  paymentCount: number;
  reliability: PaymentReliabilityResult;
}

export interface CustomerSummaryMetrics {
  totalCustomers: number;
  activeCustomers: number;
  archivedCustomers: number;
  totalOutstandingPaise: number;
  totalOverduePaise: number;
  overdueCustomersCount: number;
  averageReliabilityScore: number | null;
}

export interface CustomerDetailData {
  customer: Customer;
  metrics: {
    totalOrdersPaise: number;
    totalInvoicedPaise: number;
    totalPaidPaise: number;
    outstandingPaise: number;
    overdueBalancePaise: number;
    openInvoicesCount: number;
    overdueInvoicesCount: number;
    totalOrdersCount: number;
    reliability: PaymentReliabilityResult;
  };
  orders: CustomerOrder[];
  invoices: Invoice[];
  payments: Payment[];
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
  "draft" | "sent" | "confirmed" | "partially_received" | "received" | "delayed" | "cancelled";

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
  "receipt" | "sale" | "reservation" | "reservation_release" | "adjustment" | "return";

export interface InventoryMovement {
  id: string;
  businessId: string;
  productId: string;
  type: InventoryMovementType;
  quantity: number;
  resultingBalance: number;
  date: string;
  referenceType?:
    "purchase_order" | "customer_order" | "adjustment" | "manual" | "return" | undefined;
  referenceId?: string | undefined;
  note?: string | undefined;
  createdAt: string;
}

export type StockStatus =
  "healthy" | "low_stock" | "stockout_risk" | "out_of_stock" | "incoming_stock";

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
  referenceType?:
    "purchase_order" | "customer_order" | "adjustment" | "manual" | "return" | undefined;
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

export type InvoiceType = "receivable" | "payable";
export type InvoiceStatus =
  "draft" | "sent" | "partially_paid" | "paid" | "overdue" | "void" | "cancelled";

export type AgingBucket = "current" | "1_7" | "8_30" | "31_60" | "over_60";

export interface Invoice {
  id: string;
  invoiceNumber: string;
  type?: InvoiceType | undefined;
  customerId?: string | undefined;
  customerOrderId?: string | undefined;
  supplierId?: string | undefined;
  purchaseOrderId?: string | undefined;
  amountPaise: number;
  amountPaidPaise: number;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  notes?: string | undefined;
  createdAt?: string | undefined;
}

export interface EnrichedInvoice extends Invoice {
  counterpartyName: string;
  counterpartyType: "customer" | "supplier";
  daysOverdue: number;
  agingBucket: AgingBucket;
  isOverdue: boolean;
  outstandingPaise: number;
}

export interface AgingBucketSummary {
  bucket1to7Paise: number;
  bucket1to7Count: number;
  bucket8to30Paise: number;
  bucket8to30Count: number;
  bucket31to60Paise: number;
  bucket31to60Count: number;
  bucketOver60Paise: number;
  bucketOver60Count: number;
}

export interface InvoiceSummaryMetrics {
  totalInvoices: number;
  totalReceivablesPaise: number;
  totalPayablesPaise: number;
  overdueReceivablesPaise: number;
  overduePayablesPaise: number;
  overdueInvoicesCount: number;
  paidPaise: number;
  outstandingReceivablesPaise: number;
  outstandingPayablesPaise: number;
  aging: AgingBucketSummary;
}

export interface CreateInvoiceInput {
  invoiceNumber?: string | undefined;
  type: InvoiceType;
  customerId?: string | undefined;
  customerOrderId?: string | undefined;
  supplierId?: string | undefined;
  purchaseOrderId?: string | undefined;
  amountPaise: number;
  issueDate: string;
  dueDate: string;
  notes?: string | undefined;
  status?: InvoiceStatus | undefined;
}

export type UpdateInvoiceInput = Partial<CreateInvoiceInput>;

export interface RecordPaymentInput {
  amountPaise: number;
  paymentDate?: string | undefined;
  method?: string | undefined;
  note?: string | undefined;
}

export interface InvoiceDetailData {
  invoice: EnrichedInvoice;
  customer?: Customer | undefined;
  supplier?: Supplier | undefined;
  customerOrder?: CustomerOrder | undefined;
  purchaseOrder?: PurchaseOrder | undefined;
  payments: Payment[];
}

export type PaymentDirection = "incoming" | "outgoing";
export type PaymentStatus = "scheduled" | "completed" | "failed" | "cancelled";

export interface Payment {
  id: string;
  direction: PaymentDirection;
  invoiceId?: string | undefined;
  purchaseOrderId?: string | undefined;
  supplierId?: string | undefined;
  customerId?: string | undefined;
  amountPaise: number;
  status: PaymentStatus;
  scheduledDate: string;
  completedDate?: string | undefined;
  method?: string | undefined;
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
  relatedInvoiceId?: string | undefined;
  relatedPurchaseOrderId?: string | undefined;
  isProjected: boolean;
  counterpartyName?: string | undefined;
  status?: "completed" | "scheduled" | "overdue" | "projected" | undefined;
  riskNote?: string | undefined;
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
  netMovementPaise?: number | undefined;
  openingBalancePaise?: number | undefined;
  isHistorical?: boolean | undefined;
  scenarioBalancePaise?: number | undefined;
  shortfallPaise?: number | undefined;
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
  days?: number | undefined;
  businessId?: string | undefined;
  scenarioId?: string | undefined;
  safetyThresholdPaise?: number | undefined;
}

export type RiskSeverity = "info" | "warning" | "critical";

export interface RiskAlert {
  id: string;
  severity: RiskSeverity;
  title: string;
  description: string;
  relatedEntityId?: string | undefined;
  relatedEntityType?: string | undefined;
  createdAt: string;
  acknowledged: boolean;
}

export interface SimulationScenario {
  id: string;
  name: string;
  description?: string | undefined;
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
  impactPaise?: number | undefined;
  priority: "low" | "medium" | "high";
  relatedEntityId?: string | undefined;
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
  /**
   * FastAPI's native error envelope. The backend returns `{ detail: "..." }`
   * alongside (or instead of) the Ripple `error` object, so it has to be part of
   * the declared shape — otherwise the message is silently dropped.
   */
  detail?: string | undefined;
}

export interface ListParams {
  page?: number | undefined;
  pageSize?: number | undefined;
  limit?: number | undefined;
  search?: string | undefined;
  sortBy?: string | undefined;
  sortDir?: "asc" | "desc" | undefined;
}

export * from "./relationships";

// ─── Flagship Simulator Intelligence Types ───────────────────────────────────

export interface FragilityData {
  nodeId: string;
  invoiceAmountPaise: number;
  downstreamValueAtRiskPaise: number;
  multiplier: number;
  isKeystone: boolean;
  badgeText: string;
  badgeVariant: "destructive" | "warning" | "outline" | "secondary";
  exposedOrders: string[];
}

export interface TrueMarginBreakdown {
  lostDiscountPaise: number;
  supplierHaltFeesPaise: number;
  slaPenaltiesPaise: number;
  workingCapitalDragPaise: number;
  floatFeePaise: number;
}

export interface TrueMarginData {
  revenuePaise: number;
  directCogsPaise: number;
  paperMarginPaise: number;
  paperMarginPercent: number;
  contagionDays: number;
  breakdown: TrueMarginBreakdown;
  totalContagionCostPaise: number;
  trueRippleMarginPaise: number;
  trueRippleMarginPercent: number;
  explanation: string;
}

export interface SimulatorTimelineNode {
  id: string;
  label: string;
  type: "cash_reserve" | "customer_receivable" | "supplier_payable" | "downstream_fulfillment";
  dayLabel: string;
  date: string;
  amountPaise: number;
  direction: "balance" | "incoming" | "outgoing";
  status: string;
  counterparty: string;
  description: string;
  fragility?: FragilityData | undefined;
  margin?: TrueMarginData | undefined;
  hasBypassArc?: boolean | undefined;
  bypassTargetId?: string | undefined;
  isMostFragileUnderStress?: boolean | undefined;
  stressHighlightColor?: string | undefined;
  stressBadge?: string | undefined;
  isEligibleForAutoPhase?: boolean | undefined;
  isEligibleForSplitEscrow?: boolean | undefined;
  isAutoPhasedChild?: boolean | undefined;
}

export interface AutoPhaseBatch {
  amountPaise: number;
  date: string;
  label: string;
  purpose: string;
}

export interface AutoPhasePreview {
  supplierCommitmentPaise: number;
  actualAvailableCashPaise: number;
  safetyBufferPaise: number;
  usableFreeCashPaise: number;
  shortfallPaise: number;
  batch1: AutoPhaseBatch;
  batch2: AutoPhaseBatch;
  safetyBufferPreserved: boolean;
  explanation: string;
}

export interface SplitEscrowPreview {
  customerInvoicePaise: number;
  supplierCommitmentPaise: number;
  floatFeePaise: number;
  totalDeductionPaise: number;
  netProceedsPaise: number;
  isEligible: boolean;
  supplierFundingDate: string;
  customerSettlementDate: string;
  bypassArcLabel: string;
  explanation: string;
}

/*
 * Simulator domain types.
 *
 * These previously lived in `src/lib/api/simulationApi.ts`, which forced
 * `ChaosStressTestResult.stressedResult` to be `any` (a shared type cannot
 * reference an API-module type without inverting the layering) and made UI
 * components import their types from an API module. They live here now;
 * `simulationApi.ts` re-exports them so existing imports keep working.
 */

export interface SimulatorControls {
  supplierDeliveryDelayDays: number;
  customerPaymentDelayDays: number;
  customerPaymentAmountPaise: number | null; // null = unchanged
  supplierPaymentAmountPaise: number | null; // null = unchanged
  orderQuantityMultiplier: number; // 1.0 = unchanged
  /** Forecast duration, inclusive of 10–90 days. */
  horizonDays: number;
}

export interface DependencyImpact {
  entityId: string;
  entityType: string;
  label: string;
  originalDate?: string;
  shiftedDate?: string;
  shiftDays: number;
  amountPaise?: number;
  impactDescription: string;
}

export interface RippleScoreBreakdown {
  cashShortfallFactor: number; // 0–40 pts: is there a shortfall, how deep?
  delayMagnitudeFactor: number; // 0–25 pts: combined delay days
  downstreamCountFactor: number; // 0–20 pts: # affected dependencies
  liquidityGapFactor: number; // 0–15 pts: baseline vs simulated delta
  totalScore: number; // 0–100
}

export interface SimulatorRecommendation {
  id: string;
  title: string;
  rationale: string;
  priority: "high" | "medium" | "low";
  impactPaise?: number | undefined;
}

export interface SimulatorResult {
  baselinePoints: ForecastPoint[];
  scenarioPoints: ForecastPoint[];
  baselineClosingPaise: number;
  scenarioClosingPaise: number;
  baselineMinPaise: number;
  baselineMinDate: string;
  scenarioMinPaise: number;
  scenarioMinDate: string;
  shortfallPaise: number; // > 0 means scenario went negative
  affectedDependencies: DependencyImpact[];
  rippleScore: RippleScoreBreakdown;
  recommendations: SimulatorRecommendation[];
  savedScenarioId?: string;
  trueMargin?: TrueMarginData | undefined;
  timelineNodes?: SimulatorTimelineNode[] | undefined;
  /** Rescue actions currently applied to the simulated scenario. */
  activeRescues?: ActiveRescue[] | undefined;
  isAutoPhaseApplied?: boolean | undefined;
  isSplitEscrowApplied?: boolean | undefined;
  hasAutoPhaseRescue?: boolean | undefined;
  hasSplitEscrowRescue?: boolean | undefined;
}

/** A mitigation currently applied to a scenario (auto-phase inventory or split escrow). */
export interface ActiveRescue {
  id: string;
  type: "auto_phase" | "split_escrow";
  label?: string | undefined;
  appliedAt?: string | undefined;
}

export interface ChaosStressTestResult {
  isStressTestActive: boolean;
  baselineMinCashPaise: number;
  stressedMinCashPaise: number;
  additionalShortfallPaise: number;
  newlyAffectedNodesCount: number;
  newlyEndangeredOrderValuePaise: number;
  mostFragileNodeBefore: string;
  mostFragileNodeAfter: string;
  mostFragileNodeLabel: string;
  mostFragileMultiplier: number;
  baselineTrueMargin: TrueMarginData;
  stressedTrueMargin: TrueMarginData;
  /** Full simulator result produced by the stressed run; drives the results panel. */
  stressedResult?: SimulatorResult | undefined;
  summary: string;
}
