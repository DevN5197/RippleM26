# Ripple — Full Audit & Remediation Prompt

> Produced from a verified audit of the working tree on `main`.
> Every claim below was reproduced with a command or in a live browser, not inferred.

## How the audit was performed (so you can re-run it)

| Check     | Command                            | Result                                                                  |
| --------- | ---------------------------------- | ----------------------------------------------------------------------- |
| Typecheck | `npx tsc --noEmit`                 | **72 errors**, exit 2                                                   |
| Lint      | `npx eslint .`                     | **409 errors, 10 warnings** (393 are `prettier/prettier`)               |
| Tests     | `npm test`                         | 90/90 pass, 12 files — **but they do not cover the crashing component** |
| Build     | `npm run build`                    | exit 0 — **does not typecheck**                                         |
| Bundle    | `ls -S .output/public/assets/*.js` | 2.1 MB total JS, 417 KB entry chunk                                     |
| Runtime   | browser sweep of all 12 routes     | 1 crashing page, 1 placeholder page, console exception on every load    |

The single most important structural fact: **`vite build` strips types without checking them**, and there is no `typecheck` script. So 72 type errors — including one that hard-crashes a page — ship to production silently. Everything else on this list is downstream of that gap.

---

# THE PROMPT

## Mission

Take the Ripple frontend from "works on the happy path in mock mode" to "production-hardened, fully typed, verified end to end." Fix the confirmed bugs listed below, complete the one unfinished feature, close the type-safety and CI gaps that let those bugs ship, and raise the performance of the initial load. Do not restyle the UI wholesale — the visual design system is settled. This is a correctness, completeness and performance pass.

Work in the order given. Phase 0 is not optional: it is what makes the rest verifiable.

---

## Phase 0 — Build the safety net first

Nothing else can be trusted until verification exists.

1. Add a `typecheck` script to `package.json`: `"typecheck": "tsc --noEmit"`.
2. Add `"verify": "npm run typecheck && npm run lint && npm test && npm run build"`.
3. Add `"format:check": "prettier --check ."` and make `lint` fail on unformatted files (it already does — just make sure CI runs it).
4. Run `npx prettier --write .` once to clear the 393 `prettier/prettier` errors (they are almost entirely CRLF-vs-LF noise from mixed line endings). Commit that as an isolated, formatting-only commit so it never obscures a real diff.
5. Decide the lockfile story: the repo currently ships **both `bun.lock` and `package-lock.json`**. Pick one, delete the other, and document it in `PROJECT_CONTEXT.md`. (The scripts and `node_modules` here were installed with npm.)

**Acceptance:** `npm run verify` exists, runs all four checks, and reports honestly. `npx tsc --noEmit` is down to **0 errors** by the end of Phase 1–2.

---

## Phase 1 — P0: the invoice detail page is completely broken

**This is the highest-severity finding in the codebase.**

### Symptom (reproduced in a live browser)

Navigate to any invoice with an outstanding balance, e.g. `/invoices/inv_1985`:

- The route renders the error boundary: **"Could not load invoice — Button is not defined"**.
- Browser console: `ReferenceError: Button is not defined at InvoiceDetailView`, caught by the route error boundary.
- `tsc` reports it too: `invoice-detail-view.tsx(188,16): error TS2304: Cannot find name 'Button'` and `(190,17)`.

### Cause

`src/components/invoices/invoice-detail-view.tsx` renders `<Button size="sm" onClick={onRecordPayment}>Record Payment</Button>` inside the "Settlement & Payment Ledger" card header, but never imports `Button` from `@/components/ui/button`.

The button is only rendered when `invoice.outstandingPaise > 0 && invoice.status !== "void"` — which is why a fully-paid invoice may appear to work and mask the bug.

### Fix

- Add the missing import to `invoice-detail-view.tsx`.
- Then audit the **whole component** for other missing imports — this file has clearly drifted. Check every JSX identifier resolves.
- Sweep the rest of the codebase for the same class of defect. A reliable method: `npx tsc --noEmit` and grep the output for `TS2304`/`TS2305` (undefined names / missing exports). Two are known: this `Button`, and `EnrichedPurchaseOrder` (Phase 2).
- Add a regression test that renders `InvoiceDetailView` with a seeded outstanding invoice and asserts the "Record Payment" button exists and fires `onRecordPayment`. **No test currently renders this component at all**, which is exactly why it shipped.

**Acceptance:** `/invoices/:id` renders for receivable invoices, payable bills, overdue, partially paid, fully paid and void; the error boundary never appears. A test covers the outstanding-balance path.

---

## Phase 2 — P1: shared-primitive contracts are lying

Four separate bugs share one root cause: components pass props that the primitive silently ignores, because `tsc` never runs.

### 2a. `MetricCard` silently drops `subtext` and `intent`

`MetricCardProps` in `src/components/shared/metric-card.tsx` is `{ label, value: string, icon, hint, trend }`. But 16 call sites pass `subtext` and/or `intent`, which are simply discarded (React drops unknown props on custom components):

- `src/components/invoices/invoice-detail-view.tsx` — lines 51, 58, 66, 80
- `src/components/invoices/invoice-summary-cards.tsx` — lines 27, 35, 42, 54
- `src/components/customers/customer-summary-cards.tsx` — lines 23, 29, 36, 43
- `src/components/customers/customer-detail-metrics.tsx` — lines 23, 31, 57

**Confirmed visually:** on `/customers/cus_5` the four metric cards show a bare value with **no sub-label at all** — "OUTSTANDING BALANCE ₹1,500" with no "1 open invoice(s)", "TOTAL SETTLED ₹0" with no "Out of ₹X invoiced". Compare `/suppliers/sup_1`, which works, because it happens to use the supported `hint` prop instead.

**Two divergent APIs have grown for the same idea (`hint` vs `subtext`). Unify them.**

Fix `MetricCardProps` to:

- `value: React.ReactNode` — `customer-detail-metrics.tsx:38` passes a **`<div>` wrapping a `PaymentReliabilityBadge`**, which is currently typed as `string` (`error TS2322: Type 'Element' is not assignable to type 'string'`). Rendering a badge as the value is intentional; support it properly.
- `subtext?: string` — accept it, and treat `subtext` and `hint` as aliases (render whichever is present; `subtext` wins).
- `intent?: "default" | "success" | "warning" | "danger" | "info"` — drive the icon-chip colour and the value colour from it, using existing design tokens only (`text-success`, `bg-destructive/10`, …). Never hardcode colours.
- Keep `trend` working as-is.

Then render the subtext in the existing card and verify `/customers/:id`, `/customers`, `/invoices`, `/invoices/:id` all show their sub-labels.

### 2b. `ErrorState` retry is wired to the wrong prop name

`ErrorStateProps` is `{ title, message, onRetry }`. Two call sites pass `retry` instead, so the callback is dropped and **the "Try again" button never renders** — those tables are unrecoverable after a load error without a full page reload:

- `src/components/inventory/inventory-table.tsx:112` — `retry: (() => void) | undefined`
- `src/components/inventory/purchase-order-list.tsx:63` — same

Fix the call sites to `onRetry`, and add a test that forces an error and asserts the retry control appears and invokes the handler.

### 2c. `EnrichedPurchaseOrder` imported from the wrong module

`src/components/inventory/purchase-order-list.tsx:25` does:
`import type { EnrichedPurchaseOrder, Supplier, PurchaseOrderStatus } from "@/types";`
→ `error TS2305: Module '"@/types"' has no exported member 'EnrichedPurchaseOrder'.`

The interface is actually declared in **`src/lib/api/purchaseOrderApi.ts:17`**, and `purchase-order-detail-sheet.tsx:27` already imports it from there correctly. Fix the import.

### 2d. Unguarded optional access that can throw at runtime

These are `TS2532` / `TS18048` — genuine crash risks on edge data, not style complaints. Tighten each with an explicit guard or a narrowed type:

- `src/components/cash-flow/cash-flow-chart-view.tsx:55`
- `src/components/cash-flow/cash-flow-timeline-view.tsx:55, 137, 140, 191` — `'dayEvents' is possibly 'undefined'`
- `src/components/cash-flow/cash-flow-summary-cards.tsx:245`
- `src/components/simulator/simulator-results.tsx:124`

**Acceptance for Phase 2:** all 16 `MetricCard` errors, both `ErrorState` errors, the `TS2305`, and all `TS2532`/`TS18048` errors are gone; the sub-labels are visible in the browser on customer and invoice screens.

---

## Phase 3 — P1: finish the `/insights` feature

`src/routes/_app.insights.tsx` renders `<FeaturePlaceholder>` with a badge reading **"Coming in the next phase"** — but it is linked from the main sidebar under **"Intelligence"**, presented as a finished product area. That is the most visible incomplete feature in the app.

The placeholder already declares the intended scope. Implement it:

1. **Ranked recommendation feed with quantified cash impact.** Derive recommendations from data the app already has — `dashboardApi.getSummary()`, `forecastApi`, `relationshipsApi`, `invoiceApi`, `inventoryApi`. Rank by rupee impact (paise, integer). Concrete recommendation types that follow directly from existing signals: overdue receivable collections, a supplier commitment that pushes the balance below the safety threshold on a specific date, inventory items below reorder point, an invoice whose delay cascades (reuse `src/lib/reliability.ts`).
2. **Natural-language explanations of forecast changes.** One or two sentences per recommendation naming the counterparty, the date and the rupee amount. Keep it deterministic and derived from real numbers — do not invent a fake LLM.
3. **One-click "simulate this" handoff into the Ripple Simulator.** Deep-link into `/_app/simulator` pre-loading the relevant scenario (customer payment delay, or the specific rescue action). The simulator already supports scenario presets and a `runMutation`; wire it through search params or a shared query cache so the handoff actually lands with state applied.
4. **Acknowledge / dismiss / track acted-on advice.** Persist state through the existing data layer — add an `insightsApi` in `src/lib/api/insightsApi.ts` following the established `DATA_MODE` branching pattern (mock: mutate `src/mocks/store.ts`; api: `httpRequest` via `client.ts`). Never fetch from the component.
5. Add an `/api/insights` endpoint to the FastAPI backend for parity, with the dual-path alias convention the other routers use, so API mode does not 404.

Also remove `FeaturePlaceholder` usage for `/insights`, and delete `src/components/shared/feature-placeholder.tsx` if nothing else references it (grep first).

**Acceptance:** `/insights` shows real, ranked, rupee-quantified recommendations derived from seed data; each row can be simulated, acknowledged and dismissed with state that survives a route change; works in both `mock` and `api` modes; covered by a test.

---

## Phase 4 — P2: the uncaught exception on every page load (root-caused)

**Symptom:** every full page load logs an uncaught exception in the console.

**Root cause (captured from the live console):**

```
Error: This library called use() to suspend in a previous render but did not call use()
when it finished. This indicates an incorrect use of use().
    at trackUsedThenable (react-dom_client.js)
    at useThenable (react-dom_client.js)
    at Object.use (react-dom_client.js)
    at exports.use (react.js)
    at Lazy (node_modules/@tanstack/react-router/dist/esm/lazyRouteComponent.js:47:28)
```

TanStack Router's generated route code-splitting wraps each route in a `Lazy` component that calls React 19's `use()` to suspend on the route module promise. React 19.2 throws when a component calls `use()` in one render and not the next — which is what `Lazy` does once the lazy module resolves. This is a library-level incompatibility between `@tanstack/react-router@1.170.41` and `react@19.2.x`, triggered by the `preload="intent"` + `?tsr-split` lazy loading.

**Approach, in order:**

1. Reproduce it in isolation (a bare route navigation) so you have a reliable signal.
2. Search the TanStack Router changelog/issues for this `use()` conditional-suspense fix and upgrade the router (and `@tanstack/react-start` / `@tanstack/router-plugin`) to the first version that contains it. Pin exact versions and re-run `npm run verify`.
3. If no upstream fix exists for the React 19.2 combination, evaluate pinning `react`/`react-dom` to the last version pair known good with this router.
4. If neither works, disable route-level code splitting for the affected routes or set `defaultPreload: false` / drop `preload="intent"` from the sidebar and list links, and confirm the exception is gone. Trade the preload optimisation for a clean console and document the tradeoff.

Do not suppress it by swallowing the error or filtering the console. Fix the cause.

**Acceptance:** a hard reload of every route produces a **clean console** — zero uncaught exceptions.

---

## Phase 5 — P2: SSR/client `DATA_MODE` disagreement kicks users out

`src/lib/config.ts` resolves `DATA_MODE` from `localStorage` when `window` exists, otherwise from `import.meta.env["VITE_DATA_MODE"]`. `.env` ships `VITE_DATA_MODE=api`.

`src/routes/_app.tsx` then does:

```ts
beforeLoad: () => {
  if (DATA_MODE === "api" && !isUserAuthenticated()) throw redirect({ to: "/login" });
};
```

`beforeLoad` runs **during SSR**, where `DATA_MODE` is always `"api"` from env. So the server always redirects app routes to `/login`.

**Verified behaviour:** a user who has explicitly switched to Offline Demo Mode and is happily working in the app gets **thrown back to `/login` on every page refresh or deep link**. I hit this repeatedly while auditing.

Fix by making mode resolution consistent and server-safe:

- Treat the resolved mode as a single source of truth available to both server and client. If the user's choice lives in `localStorage`, the server cannot see it — so either:
  - (preferred) persist the mode in a **cookie** and read it in `beforeLoad` from the request on the server and `document.cookie` on the client, or
  - gate the redirect behind `typeof window !== "undefined"` and let the client-side guard handle auth, so SSR always renders and the client decides.
- Also make the default first-run experience sane: with no backend running, `api` mode shows "Live API Mode · http://127.0.0.1:8000" and then fails every request. Consider defaulting to `mock` unless an explicit backend URL is configured, and make the login screen's mode switch persist properly.

**Acceptance:** switching to Demo Mode and then refreshing any app route keeps you in the app on that route. Switching to Live API mode with no backend produces a clear, actionable error — not a silent wall of failures.

---

## Phase 6 — P2: money and date discipline

`PROJECT_CONTEXT.md` and `AGENTS.md` both mandate **integer paise everywhere, no floating-point financial math**. Several paths violate this:

- `src/components/inventory/product-dialog.tsx:110` — `product.unitCostPaise / 100` feeds a form value that is multiplied back, so a cost that is not a whole rupee round-trips through a float.
- `src/components/inventory/purchase-order-wizard.tsx:114, 133, 136, 142, 148, 150, 166` — worst offender: `Math.round(((subtotalPaise / 100) * pct) / 100)` is a paise → rupees → percent → rupees → paise round-trip. Line 150 then reverse-engineers a percentage for display.
- `src/components/cash-flow/cash-flow-safety-dialog.tsx:48–50` — `parseFloat` then `Math.round(x * 100)`.
- `src/components/charts/cash-flow-chart.tsx:60` and `src/components/cash-flow/cash-flow-chart-view.tsx:142–176` — paise→rupee division for _display only_, which is acceptable, but only if nothing computes from the result.

**Rule to enforce:** rupees exist only at the UI boundary. Parse user rupee input to paise once with an exact decimal parser; compute the advance, subtotal and percentage entirely in integers (percentages as basis points); convert to rupees once for rendering via `formatMoney`/`formatMoneyCompact`.

Add unit tests with adversarial values — amounts like ₹0.01, ₹1,234.56, and a 33.333% split — asserting the paise total is exact and never drifts by a paise.

---

## Phase 7 — P2/P3: remaining type and correctness debt

### 7a. Form ↔ schema drift (`exactOptionalPropertyTypes`)

`product-dialog.tsx` (12 errors), `customer-dialog.tsx` (9), `invoice-dialog.tsx` (15 `TS4111`). The zod schema and the TypeScript form type disagree about optionality — e.g. the schema has `currency` optional and `initialStockQuantity` optional while the type requires them, so the resolver's inferred type does not match what the submit handler expects.

Fix by making the **zod schema the single source of truth**: `type ProductFormValues = z.infer<typeof schema>` and stop hand-writing the parallel interface. Remove `.default()` where it creates the optional/required mismatch, or move defaults into `defaultValues` on the form. The `TS4111` "index signature" errors in `invoice-dialog.tsx` come from indexing form values with dot notation where the type has an index signature — give the form values a real type so `values.amount` is a known property.

### 7b. A test asserts a field that does not exist

`src/test/simulator-flagship.test.tsx:35` builds `TrueMarginData` with `orderRevenuePaise`, but the type has `revenuePaise` (`error TS2561`). The test passes at runtime because it only reads other fields — meaning **the flagship "true margin" assertion is not validating what it claims to**. Correct the field name and confirm the assertions actually exercise revenue.

### 7c. `react-hooks/exhaustive-deps`

- `src/routes/_app.inventory.tsx:154, 156` — `items` and `purchaseOrders` are derived inline, so they are new arrays on every render and the `useMemo`s at lines 190, 199 and 219 are invalidated every render. The memoization does nothing. Wrap the derivations in their own `useMemo` (or `useQuery` `select`).
- `src/routes/_app.simulator.tsx:289` — `useEffect` is missing `runMutation`. Add it or restructure to avoid the stale closure.

### 7d. React Flow typing

`relationship-edge.tsx:30, 53, 57` and `relationship-graph-view.tsx:277` — `EdgeProps<CustomEdgeData>` is used incorrectly: `CustomEdgeData` does not satisfy the `Edge` constraint, `data` arrives as `unknown`, and a spread is attempted on a non-object. The relationship graph's edge labels and metrics depend on this data, so this is a live correctness risk, not just a type complaint. Type the edge data properly and give `edgeTypes` a correct `EdgeTypes` shape.

### 7e. `no-explicit-any` (16 sites)

`graph-adapter.ts:184`, `supplier-dialog.tsx:84`, `lib/api/client.ts:177`, `dashboardApi.ts:103, 117`, `forecastApi.ts:32`, `simulationApi.ts:68, 873, 878`, `__root.tsx:49`, `login.tsx:40, 62`, `register.tsx:46`, `types/index.ts:862`, plus two in tests. Replace with `unknown` + narrowing for caught errors, and real generics for the API client.

### 7f. `simulator-chart.tsx:158`

Recharts tooltip props conflict with `exactOptionalPropertyTypes` (`active?: boolean` vs required). Widen the local tooltip prop type to match what Recharts passes.

---

## Phase 8 — Performance

Measured client bundle: **2.1 MB of JS**, with these largest chunks:

| Size   | Chunk                                      |
| ------ | ------------------------------------------ |
| 417 KB | `index-*.js` (entry)                       |
| 360 KB | `generateCategoricalChart-*.js` (recharts) |
| 208 KB | `_app.relationships-*.js`                  |
| 99 KB  | `_app.inventory-*.js`                      |
| 97 KB  | `alert-*.js`                               |
| 90 KB  | `_app.simulator-*.js`                      |

Actions:

1. **Find out why the entry chunk is 417 KB.** That is enormous for a shell. Inspect the route tree / `index.tsx` / `__root.tsx` for something heavy pulled into the entry graph and move it behind a lazy boundary.
2. **Lazy-load the heavy, rarely-first visualisations.** `recharts` is only needed by cash-flow, dashboard and simulator; `@xyflow/react` only by `/relationships`. Make sure neither is in the entry chunk or on the login route. A 360 KB charting library must not be a first-paint cost.
3. **Route-level code splitting** is already partly in place via `?tsr-split` — verify it actually holds after the Phase 4 fix (fixing the `use()` bug must not be done by disabling splitting globally if it can be avoided).
4. **Remove the redundant `vite-tsconfig-paths` dependency.** Vite 8 resolves tsconfig paths natively via `resolve.tsconfigPaths`, and Vite prints a warning about this on every dev start.
5. Audit the recharts usage for chart types that drag in the largest shared module; prefer the tree-shakeable imports already used in `src/components/ui/chart.tsx`.
6. Set a budget and measure: record the entry-chunk size and total JS **before and after** with
   `npm run build && du -ch .output/public/assets/*.js | tail -1`.
   Report the real numbers. Do not claim an improvement without a before/after measurement on the same command.

---

## Phase 9 — Runtime polish

- **Copy bug:** `/suppliers` header reads "Vendor directory, payment terms, outstanding balances, and delivery reliability · **4 counterpoints**". "Counterpoints" is wrong — it should read "counterparties" (or "suppliers"). Grep for other instances of copy that leaked from an internal term.
- **Stuck tooltip:** with the sidebar collapsed, a floating "Suppliers" tooltip is left rendered over the content area after hover (reproduced on `/customers/cus_5`, overlapping the page near the left edge). Fix the tooltip dismissal on the collapsed sidebar nav.
- **Route/title mismatch:** the browser tab title briefly reported the wrong route while navigating (e.g. title said "Cash Flow" while on `/simulator`). Verify `head()` meta per route resolves correctly, especially with lazy route splitting.
- Check the backend's duplicated route aliases (`/settings` **and** `/api/settings`, `/api/simulate` **and** `/api/simulator/simulate`, `/api/relationships` **and** `/api/v1/relationships`). Consolidate or clearly deprecate — the frontend calls a mix of both, which makes rotating an endpoint risky.

---

## Phase 10 — Test coverage for the gaps that let these bugs ship

Current suite: 12 files, 90 tests — solid on API/store logic, **blind on the UI paths that actually broke**.

Add, at minimum:

- `InvoiceDetailView` — outstanding invoice renders and the Record Payment button works (would have caught the P0).
- A metric-card contract test asserting `subtext` and `intent` render (would have caught 2a).
- An `ErrorState` test asserting the retry control renders and fires (would have caught 2b).
- A route smoke test that mounts every route under `/_app` with seeded data and asserts **no error boundary and no console error** — this is the single highest-value test in this list, because it catches the entire class of "page crashes" bugs.
- Money edge-case tests from Phase 6.
- A regression test for the mode persistence in Phase 5.
- Insights behaviour once Phase 3 lands.

Make the smoke test fail the build on any `console.error`, and wire `npm run verify` into CI.

---

## Definition of done

Ship only when **all** of these hold, each verified by a command, not by inspection:

1. `npx tsc --noEmit` → **0 errors**.
2. `npx eslint .` → **0 errors** (warnings for the six `react-refresh/only-export-components` shadcn primitives are acceptable, or fix them properly).
3. `npm test` → all tests pass, including the new ones, and the route smoke test reports no console errors.
4. `npm run build` → exit 0.
5. Every route under `/_app` plus `/login` and `/register` loads with a **clean console** — no uncaught exceptions.
6. `/invoices/:id` renders correctly for receivable, payable, overdue, partially-paid, paid and void invoices.
7. `/insights` is a real, working feature — not a placeholder — in both mock and api modes.
8. Demo-mode selection survives a page refresh; deep links work.
9. Entry-chunk and total-JS sizes are reported before and after, with the measured improvement.
10. A short `docs/` note records what was fixed, what was deliberately deferred, and anything still failing. Report failed or unrunnable checks as limitations — never as passes.

## Constraints

- Keep the existing design system: OKLCH tokens in `src/styles.css` only, no hardcoded colour utilities in components. Reuse the shared primitives rather than inventing new ones.
- Honour the architecture rules in `AGENTS.md` and `PROJECT_CONTEXT.md`: all data through `src/lib/api/*Api.ts` with `DATA_MODE` branching, integer paise, ISO dates formatted only at display time, UI depending only on `src/types/index.ts`.
- Do not rewrite published git history (this repo syncs to Lovable).
- Commit the prettier-only sweep separately from behavioural changes.
