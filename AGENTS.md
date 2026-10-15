<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

# Ripple — Architecture Rules

- Routing: TanStack Router file-based routes. App pages live under the pathless layout `src/routes/_app.tsx` (sidebar + header shell); leaf pages are `src/routes/_app.<name>.tsx`. `/` redirects to `/login`.
- Data layer: all data goes through typed modules in `src/lib/api/*Api.ts`. Each module branches on `DATA_MODE` (from `src/lib/config.ts`): mock mode reads/mutates the in-memory store in `src/mocks/store.ts`; api mode calls the FastAPI backend via `src/lib/api/client.ts` using `VITE_API_BASE_URL`. Never fetch directly from components.
- Money: integer paise everywhere (`*Paise` fields); format with `src/lib/formatters.ts` (`formatMoney`, INR, en-IN grouping). No floating-point financial math in the frontend.
- Dates: ISO 8601 strings in data; format only at display time with date-fns helpers in `src/lib/formatters.ts`.
- Mock data: single coherent business "Rupi Clothing" seeded in `src/mocks/data.ts` with cross-referenced IDs; dates are relative to today so the demo stays current. UI must only depend on the TypeScript interfaces in `src/types/index.ts`, never on mock shapes.
- Styling: Tailwind v4 tokens in `src/styles.css` only (oklch). Deep indigo primary, navy text, warm off-white background; status colors success/warning/destructive. No hardcoded color utilities in components.
- Shared UI lives in `src/components/shared/` and `src/components/layout/`; reuse PageHeader, MetricCard, StatusBadge, MoneyAmount, DateLabel, EmptyState, ErrorState, skeletons before creating new primitives.
- Data fetching in routes: loader `ensureQueryData` + `useSuspenseQuery` with shared `queryOptions` (see `_app.dashboard.tsx`).

## Efficiency & Inspection Rules (No Full-Codebase Re-Audits)

- **Do NOT perform full-codebase audits, recursive directory walks, or mass file scans** before implementing features.
- Consult `PROJECT_CONTEXT.md` for architecture, file locations, conventions, and test commands.
- Inspect **ONLY** the files directly relevant to the current task:
  1. The specific route file (e.g., `src/routes/_app.<feature>.tsx`)
  2. The relevant API service (e.g., `src/lib/api/<feature>Api.ts`)
  3. The domain types in `src/types/index.ts`
  4. Specific components under `src/components/<feature>/`
- Verify changes with targeted test runs (`npm test` or `npx vitest run src/test/<feature>.test.tsx`) and `npm run build`.
