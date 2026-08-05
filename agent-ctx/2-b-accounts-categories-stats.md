# Task 2-b — Accounts, Categories & Stats Views

**Agent:** frontend-views-agent-b
**Task ID:** 2-b
**Scope:** Build 3 React view components for the FinZeni personal finance app (Apple-Wallet-style accounts, category management with icon/color pickers, advanced statistics dashboard with charts and exports).

## Files Created

1. `src/components/app/views/accounts.tsx` — `AccountsView`
2. `src/components/app/views/categories.tsx` — `CategoriesView`
3. `src/components/app/views/stats.tsx` — `StatsView`

## Implementation Notes

### AccountsView
- Reads `useAccounts()` (returns `Account[]` with id, name, type, balance, currency, color, bank, last4, creditLimit, dueDay, isDefault).
- Hero summary card (emerald gradient, blurred decoration circles): total balance across all accounts + active count + "cuentas vinculadas" caption.
- Grid of Apple-Wallet-style cards (`min-h-[200px]`) styled with a **dynamic linear-gradient(135deg)** generated from each account's color via a small `darken(hex, amount)` helper + `colorClasses(color).hex`. White/blurred decoration circles, type badge, edit & delete icon buttons (toast "Próximamente" since the `/api/accounts/[id]` PATCH/DELETE endpoints don't exist), Default star indicator.
- Credit-card-specific footer section: shows bank + last4, credit limit (compact), available credit, and due day. Non-credit accounts show bank + last4 only.
- "Agregar cuenta" button opens a `Dialog` with: name, type `Select` (uses `ACCOUNT_TYPES`, each item renders its Lucide icon via `renderIcon(getCategoryIcon(...))`), currency `Select` (MXN/USD/EUR), balance, color chips (loops `COLOR_NAMES`, shows a `Check` icon on the selected one), bank (optional), last4 (numeric, max 4 chars), conditional credit-only block (creditLimit + dueDay shown only when `type === "credit"`), and an `isDefault` `Switch` row with descriptive caption.
- Create flow: `POST /api/accounts` → invalidates `["accounts"]` query → success toast → dialog closed & form reset.
- Empty state + `Skeleton` loading state with 6 card placeholders.
- `renderIcon(Icon, className)` helper wraps `React.createElement(Icon, { className })` to satisfy the `react-hooks/static-components` ESLint rule (no dynamic-component JSX).

### CategoriesView
- Reads `useCategories()` (returns `Category[]` with id, name, icon, color, type, subcategories[]).
- Four summary cards: total categories, expense count (rose accent), income count (amber accent), total subcategories (violet accent). Each card has a gradient mini-icon on the right.
- Toolbar: type filter `Select` (all / expense / income) + "Agregar categoría" button.
- Grid of category cards using `Accordion` (type="multiple") with `items-start` so opened cards don't stretch neighbors. Each card shows: large `CategoryIcon`, name, edit button (toast "Próximamente"), type Badge (rose for expense / emerald for income) and subcategory-count Badge. Accordion trigger reveals subcategory list (chips with chevron) + "Agregar subcategoría" button (toast "Próximamente" since no endpoint exists).
- Reference strip of `DEFAULT_CATEGORIES` rendered as colored pill badges (uses `colorClasses.soft` + `colorClasses.text`).
- "Agregar categoría" `Dialog` with: name Input, type buttons (expense/income with arrow icons), icon picker (7-column grid of all `CATEGORY_ICONS` keys, scrollable up to 44 height), color picker (chips from `COLOR_NAMES`), live preview block showing the resulting `CategoryIcon` + name + type + icon name.
- Create flow: `POST /api/categories { name, icon, color, type }` → invalidates `["categories"]` → success toast.
- Empty state + `Skeleton` loading.

### StatsView
- Reads `useStats(month)` and exposes a local `month` state with prev/next navigation buttons + "Hoy" shortcut when not on current month.
- Header `Tabs` (Month / Week / Year); Week & Year show a "Próximamente" note inside their `TabsContent` while Month is the active view.
- Sticky-feeling toolbar: month navigation + export buttons block (`<a download target="_blank">` anchors for CSV / JSON / Excel / PDF hitting `/api/export?format=...&month=YYYY-MM`).
- Six-card summary row: total spent (rose), avg daily, avg weekly, projected month (emerald primary), movement count, variation % (rose if positive, emerald if negative, mute if zero) with appropriate `TrendingUp`/`TrendingDown`/`Minus` icon.
- Charts grid (5 cards on `lg:grid-cols-5`):
  - `SpendingTrendChart` (lg:col-span-3) with month Badge.
  - `CategoryPieChart` (lg:col-span-2) + top-5 legend using `colorClasses(c.color).hex`.
  - `MerchantBarChart` (lg:col-span-3).
  - `MethodPieChart` (lg:col-span-2) + compact 2-column legend mapping method codes to Spanish labels.
  - `CategoryBarChart` (lg:col-span-5) fed by `categoryComparison` mapped to `{name, total, color}`.
- Comparison `Table` (responsive, hidden trend column on mobile): category with `CategoryIcon`, this-month total, prev-month total, variation Badge (color-coded green/red/gray with up/down/minus icon), and a mini "sparkline" composed of two stacked progress bars (current vs previous, current uses solid `colorClasses.hex`, previous uses 40% opacity) — a lightweight visual indicator without pulling in another chart library.
- Budget-usage mini-cards row (top 6 from `stats.budgetUsage`): each card shows `CategoryIcon`, name, spent/amount compact, percentage Badge (emerald soft when under, rose when over), progress bar (emerald hex when under, solid `#ef4444` when over), and contextual "restante"/"Excedido por" caption.
- `Skeleton` loading state with a representative skeleton layout.
- All dynamic Lucide icons rendered through a module-level `renderIcon(Icon, className)` helper that uses `React.createElement` to comply with the `react-hooks/static-components` ESLint rule.

## Cross-Cutting Concerns
- All files are `"use client"` TypeScript strict.
- Emerald theme throughout (hero gradients `from-emerald-500 via-emerald-600 to-teal-700`); status colors (rose/red for expense/overspend, amber for warnings, emerald for income/success). No indigo/blue.
- Mobile-first responsive layouts (1 column → 2 → 3 / 5 / 6 depending on view).
- `sonner` toasts for feedback (success, error, info "Próximamente").
- `useQueryClient` for cache invalidation after mutations.
- Only shadcn/ui components from `src/components/ui/` are used (Card, Button, Badge, Input, Label, Switch, Select, Dialog, Tabs, Table, Accordion, Skeleton, Progress implicitly via charts).
- Loading skeletons on every async view.
- `formatCurrency`, `monthLabel`, `monthKey` from `@/lib/format`; `colorClasses`, `COLOR_NAMES`, `ACCOUNT_TYPES`, `CATEGORY_ICONS`, `DEFAULT_CATEGORIES`, `getCategoryIcon` from `@/lib/categories`; `CategoryIcon` from `../category-icon`; all 5 charts from `@/components/charts`.

## Lint Result
- `bun run lint` → **zero errors** in the three new files.
- The only remaining lint error is in `src/components/app/category-icon.tsx` (pre-existing, owned by Task 1's agent) which trips the same `react-hooks/static-components` rule; my files were written to avoid that pattern via the `renderIcon` helper.
- A pre-existing runtime 500 on `/api/subscriptions` (Prisma `include.category` not available on the Subscription model — schema mismatch in another agent's API route) is unrelated to these views and not modified.

## Stage Summary
- All 3 views are production-ready and wired into `page.tsx` (already imported by Task 1).
- Combined with sibling Task 2-a (movements/budgets/subscriptions), the only remaining views referenced by `page.tsx` are `assistant`, `goals`, `reminders`, `settings` (owned by other agents).
