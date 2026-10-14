# Ripple — Project Context & Quick Reference

## Tech Stack
- **Framework & SSR**: TanStack Start (Nitro + Vite 8.1, React 19, TypeScript 5.8)
- **Routing**: TanStack Router (file-based routing with route tree generated in `src/routeTree.gen.ts`)
- **State & Data Fetching**: TanStack Query v5 (`queryOptions`, `useSuspenseQuery`, `ensureQueryData`)
- **Data Layer Architecture**: Typed API modules (`src/lib/api/*Api.ts`) branching on `DATA_MODE` (`src/lib/config.ts`):
  - `DATA_MODE="mock"` (default): reads/mutates in-memory store in `src/mocks/store.ts` seeded from `src/mocks/data.ts`
  - `DATA_MODE="api"`: calls backend via `src/lib/api/client.ts` using `VITE_API_BASE_URL`
- **Styling**: Tailwind CSS v4 with OKLCH design tokens in `src/styles.css` (primary indigo, navy text, warm off-white background, success/warning/destructive status tokens)
- **UI Components**: Radix UI primitives, Lucide icons, Sonner toasts
- **Testing & Tooling**: Vitest, React Testing Library, ESLint, Prettier

---

## Core Domain Rules
1. **Money**: All monetary amounts are integers in minor units (**paise** for INR, e.g. ₹1.00 = `100` paise). No floating-point math. Format using `formatMoney` from `src/lib/formatters.ts`.
2. **Dates**: ISO 8601 strings in data/API payloads (`YYYY-MM-DD`). Display formatting via `src/lib/formatters.ts` (`formatDate`, `DateLabel` with `iso` prop).
3. **Counterparty Invoices**:
   - Accounts Receivable (AR): customer invoices (`type: "receivable"`, `customerId`, `customerOrderId`).
   - Accounts Payable (AP): vendor bills (`type: "payable"`, `supplierId`, `purchaseOrderId`).
4. **Decoupled Fulfillment & Payments**: Goods receipt/delivery status is completely decoupled from payment settlement status.
5. **Data Preservation**: Archiving counterparties preserves all historical purchase orders, invoices, stock movements, and payment records.

---

## Key Files & Directory Structure

```
├── AGENTS.md                          # Persistent agent rules (auto-loaded by Antigravity)
├── PROJECT_CONTEXT.md                 # Fast reference (this file)
├── src/
│   ├── types/index.ts                 # Single source of truth for TypeScript domain types
│   ├── lib/
│   │   ├── config.ts                  # DATA_MODE ("mock" | "api"), API_BASE_URL, IS_DEMO
│   │   ├── formatters.ts              # formatMoney, formatMoneyCompact, formatDate, toISODate
│   │   └── api/                       # Service modules (client.ts, supplierApi.ts, inventoryApi.ts, etc.)
│   ├── mocks/
│   │   ├── store.ts                   # In-memory reactive db object & delay/ID generators
│   │   └── data.ts                    # Seed dataset for "Rupi Clothing" (biz_1)
│   ├── components/
│   │   ├── shared/                    # Reusable UI (page-header, metric-card, status-badge, date-label, money-amount, empty-state)
│   │   ├── layout/                    # app-sidebar.tsx, app-header.tsx
│   │   ├── suppliers/                 # Suppliers components (directory table, detail tabs, modals)
│   │   ├── inventory/                 # Inventory components
│   │   └── cash-flow/                 # Cash flow components
│   └── routes/
│       ├── __root.tsx                 # App root shell with providers
│       ├── _app.tsx                   # Pathless layout shell (sidebar + header + <Outlet />)
│       ├── _app.dashboard.tsx         # Overview (/dashboard)
│       ├── _app.cash-flow.tsx         # Cash Flow (/cash-flow)
│       ├── _app.relationships.tsx     # Dependency Graph (/relationships)
│       ├── _app.simulator.tsx         # What-if Simulator (/simulator)
│       ├── _app.inventory.tsx         # Inventory (/inventory)
│       ├── _app.suppliers.tsx         # Suppliers layout route (<Outlet />)
│       ├── _app.suppliers.index.tsx   # Suppliers List (/suppliers)
│       ├── _app.suppliers.$supplierId.tsx # Supplier Detail (/suppliers/:supplierId)
│       ├── _app.customers.tsx         # Customers layout route (<Outlet />)
│       ├── _app.customers.index.tsx   # Customers List (/customers)
│       ├── _app.customers.$customerId.tsx # Customer Detail (/customers/:customerId)
│       ├── _app.invoices.tsx          # Invoices layout route (<Outlet />)
│       ├── _app.invoices.index.tsx    # Invoices & Payments List (/invoices)
│       ├── _app.invoices.$invoiceId.tsx # Invoice Detail (/invoices/:invoiceId)
│       └── _app.settings.tsx          # Settings (/settings)
```

---

## Development & Test Commands
```bash
npm test              # Run Vitest test suite
npm run build         # Verify production compilation (TanStack Start + Nitro + Vite)
npm run lint          # Run ESLint checks
npm run format        # Prettier formatting
npm run dev           # Start Vite local development server
```

---

## Targeted Task Workflow (Do NOT re-audit the codebase)
When implementing or modifying a specific feature:
1. **Types**: Check relevant interfaces in `src/types/index.ts`.
2. **API Layer**: Read/update only the relevant service in `src/lib/api/<feature>Api.ts` and its seed data in `src/mocks/data.ts`.
3. **Route**: Work directly in the route file (`src/routes/_app.<feature>.tsx`).
4. **Components**: Build or update components in `src/components/<feature>/` reusing `src/components/shared/` primitives.
5. **Verify**: Run `npm test` and `npm run build` to confirm correctness without touching unaffected modules.
