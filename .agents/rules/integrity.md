---
trigger: always_on
---

## RIPPLE SIMULATION INTEGRITY RULE

For all Ripple Simulator and supply-chain risk features:

- The existing timeline and dependency graph are the canonical scenario representation. Extend them; never create a competing simulator.
- All cash-flow, fragility, contagion-cost, margin, and rescue calculations must use one consistent financial engine.
- Clearly distinguish actual transactions, forecast events, simulated events, and hypothetical stress-test results.
- Never treat an expected customer receipt as actual available cash.
- Never mutate real invoices, payments, inventory, or financial records merely by previewing or applying a simulation action.
- Preview every financial rescue before confirmation. Persist scenario actions separately from actual financial transactions.
- Model split-escrow as a simulated funding and settlement arrangement unless a real, authorized provider integration exists.
- Prevent duplicate supplier payments, duplicated dependency exposure, repeated receivable allocations, and double-counted penalties.
- Derive results from scenario inputs, event dates, configured rates, and dependency relationships. Never hardcode desired financial outcomes.
- Recalculate affected results after scenario edits, stress tests, rescues, reversals, and backend data changes.
- Every applied rescue must have a clear status, audit trail, validation rules, and safe reversal behavior.
- Verify both the financial calculations and the complete frontend-to-backend workflow before declaring a feature complete.
