# Task 2-a — Movements, Budgets & Subscriptions Views

**Agent:** frontend-views-agent
**Task ID:** 2-a
**Scope:** Build 3 React view components for the FinZeni personal finance app.

## Files Created

1. `src/components/app/views/movements.tsx` — `MovementsView`
2. `src/components/app/views/budgets.tsx` — `BudgetsView`
3. `src/components/app/views/subscriptions.tsx` — `SubscriptionsView`

## Implementation Notes

### MovementsView
- Month selector (prev/next) bound to `useAppStore.selectedMonth`.
- Instant client-side search by merchant name / notes / tags / category.
- Filters: category chips (horizontal scroll, with `CategoryIcon` + color), account `Select`, payment-method `Select`, and a "Limpiar" reset button.
- Expenses grouped by relative date label ("Hoy", "Ayer", "Hace X días") using `formatDate(date, "relative")`.
- Each row: `CategoryIcon`, merchant (or category), subcategory, time, red amount, payment-method badge colored by category, "Scan" badge for OCR-captured expenses.
- Summary bar (count + total) on an emerald-tinted card.
- Trash button on hover opens an `AlertDialog` confirmation; on confirm, `DELETE /api/expenses/:id` and invalidate `["expenses"]` + `["stats"]`.
- Empty state + `Skeleton` loading state.

### BudgetsView
- Reads `budgetUsage` from `useStats(selectedMonth)` and `useCategories()` for the create dialog.
- Hero summary card (emerald gradient) with total budget / spent / remaining + overall Progress bar.
- Grid of budget cards: `CategoryIcon`, name, spent/amount, Progress bar colored by status (emerald <70%, amber 70–90%, red ≥90%), warning Badge "Cerca del límite" (≥85%) or "Excedido" (≥100%), Edit + Delete buttons.
- Create / Edit `Dialog` with category Select (only shows unused categories when creating) and amount Input.
- `POST /api/budgets` to create/edit, `DELETE /api/budgets?id=` to remove. Both invalidate `["budgets"]` + `["stats"]`.
- Empty state + `Skeleton` loading.

### SubscriptionsView
- Uses `useSubscriptions()`, `useCategories()`, `useAccounts()`.
- Hero summary card: total monthly cost (normalized via period factor), active count, annual projection, daily average.
- Insight banner (amber) suggesting annual savings if unused subs are cancelled.
- Grid of subscription cards sorted by `nextDate` ascending: icon, name, merchant, amount, monthly-equivalent, period Badge (color-coded), next-payment date + relative countdown, account & category badges, `Switch` toggle for active/paused, Edit + Delete.
- Create / Edit `Dialog` with: name, merchant, amount, period Select (weekly/monthly/yearly), next payment date input, category Select, account Select.
- `POST /api/subscriptions` (create), `PATCH /api/subscriptions` (toggle / update), `DELETE /api/subscriptions?id=` (delete with PATCH-to-inactive fallback if DELETE endpoint is missing).
- All mutations invalidate `["subscriptions"]` + `["stats"]`.
- Empty state + `Skeleton` loading.

## Cross-Cutting Concerns
- All files are `"use client"` TypeScript strict.
- Emerald color theme; no indigo / blue.
- Mobile-first responsive (single column on mobile, 2–3 columns on `sm`/`lg`).
- Toasts via `sonner`; query invalidation via `useQueryClient`.
- Only shadcn/ui components from `src/components/ui/` are used.
- All three files pass ESLint with **zero** errors and **zero** TypeScript errors (`bunx tsc --noEmit`).

## Lint / Type-Check Result
- `bun run lint` → no errors in any of the three new files (remaining lint errors are in pre-existing `category-icon.tsx` and another agent's `accounts.tsx`).
- `bunx tsc --noEmit` → no errors in the three new files (only pre-existing backend Prisma typing issues in `api/subscriptions/route.ts` and missing-view imports in `page.tsx` for views owned by other agents).

## Stage Summary
- All 3 views are production-ready and wired into `page.tsx`.
- Once sibling agents finish `stats`, `reminders`, `settings` views the dev server will compile cleanly end-to-end.
