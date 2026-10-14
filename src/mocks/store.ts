import * as seed from "./data";

/**
 * In-memory mock store. Mutations persist for the session (shared across
 * pages) and reset on reload — no backend required.
 */

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export const db = {
  business: clone(seed.business),
  notifications: clone(seed.notificationPreferences),
  app: clone(seed.appPreferences),
  suppliers: clone(seed.suppliers),
  customers: clone(seed.customers),
  products: clone(seed.products),
  inventory: clone(seed.inventory),
  inventoryMovements: clone(seed.inventoryMovements),
  purchaseOrders: clone(seed.purchaseOrders),
  customerOrders: clone(seed.customerOrders),
  invoices: clone(seed.invoices),
  payments: clone(seed.payments),
  cashFlowEvents: clone(seed.cashFlowEvents),
  simulationScenarios: clone(seed.simulationScenarios),
  riskAlerts: clone(seed.riskAlerts),
  recommendations: clone(seed.recommendations),
};

export function resetDbToSeed(): void {
  db.business = clone(seed.business);
  db.notifications = clone(seed.notificationPreferences);
  db.app = clone(seed.appPreferences);
  db.suppliers = clone(seed.suppliers);
  db.customers = clone(seed.customers);
  db.products = clone(seed.products);
  db.inventory = clone(seed.inventory);
  db.inventoryMovements = clone(seed.inventoryMovements);
  db.purchaseOrders = clone(seed.purchaseOrders);
  db.customerOrders = clone(seed.customerOrders);
  db.invoices = clone(seed.invoices);
  db.payments = clone(seed.payments);
  db.cashFlowEvents = clone(seed.cashFlowEvents);
  db.simulationScenarios = clone(seed.simulationScenarios);
  db.riskAlerts = clone(seed.riskAlerts);
  db.recommendations = clone(seed.recommendations);
}

/** Simulate realistic network latency. */
export function delay(ms = 350): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let counter = 1000;
export function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}_${counter}`;
}
