# Task CF2 — Money Flow Features (Resumen Anual + Auto-categorización IA)

**Agent:** moneyflow-features-agent (main)
**Task ID:** CF2
**Date:** 2026-08

## Scope
Add two features to the Money Flow personal finance app (Next.js 16 + TS + Tailwind 4 + shadcn/ui):
- **Feature 3**: "Resumen Anual" comparative section in the Stats view (visible only when period === "year").
- **Feature 4**: Auto-categorize expenses with OpenAI during Excel import (button in the import preview).

## Files Modified
1. `src/lib/ai/openai.ts` — added `classifyWithOpenAI(merchantName, categories, apiKey)` + `OpenAIClassificationResult` interface (the function did NOT exist before; only `classifyExpense` in `classify.ts` using z-ai-web-dev-sdk local).
2. `src/components/app/views/stats.tsx` — added Lucide imports (`PiggyBank`, `Crown`, `Leaf`, `Award`, `History`), imported `type Stats` from `../hooks`, added `AnnualSummary` + `AnnualMetricCard` components, rendered conditionally between summary cards and charts grid.
3. `src/components/app/views/import.tsx` — added `useOpenAIStore`, `classifyWithOpenAI`, icons (`Wand2`, `Info`, `Eraser`). Added `aiCategorizing`, `aiProgress`, `aiCategorizations` state. Modified `buildMappedExpenses` to accept AI overrides (priority IA > default). Added `CategoryCell` helper for preview rendering. Added new Card between mapping and preview table with the Categorizar button + Progress bar + Limpiar IA. Reset clears AI state.

## Implementation Notes

### Feature 3 (Annual Summary)
- Inserted after the 7-card summary row, before the charts grid, only when `period === "year"`.
- Uses ONLY existing fields from `stats`: `summary.totalSpent/totalIncome/prevTotalSpent/variation`, `topCategories`, `byDay` (in year mode returns 12 entries where `day=1..12` = month and `total` = that month's spending).
- Layout:
  - Big metrics grid (lg:4): Total gastado (rose ArrowDownLeft), Ingresos (emerald ArrowUpRight), Balance (conditional TrendingUp/Down, green/red), Tasa de ahorro (PiggyBank, color thresholds >=10% emerald, 0-10% amber, <0% rose).
  - Comparative grid (lg:3): Mes más caro (Crown amber, computed from byDay max), Mes más barato (Leaf emerald, byDay min), Comparativa vs {year-1} (History if no prevTotalSpent, else TrendingUp/Down/Minus).
  - Top 3 categorías del año: bg-muted/30 block with rank chips (1=amber, 2=slate, 3=orange) + name + progress bar (colorClasses hex, relative to top1) + count.
- Edge cases: no income (Tasa = "—"), no spending in any month (Mes más caro/barato = "—"), no prev year (Comparativa = "Sin datos"), no topCategories (shows "No hay datos suficientes" message).

### Feature 4 (Auto-categorize with OpenAI)
- API key read via `useOpenAIStore((s) => s.apiKey)` (selective subscription, no re-renders on other state changes).
- `MappedExpense` interface extended with `categoryId?: string` (was missing despite being returned) and `aiCategorized?: boolean`.
- `buildMappedExpenses` now takes `aiCategorizations?: Record<number, string>` (rowIndex → categoryId). Priority: AI > default.
- `handleAICategorize` batches requests in groups of 5 using `Promise.all`. Progress is updated between batches via `setAiProgress({ current, total })` and partial results via `setAiCategorizations({...})` so the user sees rows fill in progressively.
- Filter for "to categorize": valid expenses (`_valid`) without `categoryName` from file AND without prior AI override. The default-category fallback is overridden by AI (AI is smarter than a blanket default).
- UI states:
  - No API key → muted Card + Info note "Configura tu API key de OpenAI en Configuración → IA para categorizar automáticamente".
  - Has key + pending → "Categorizar con IA" button (Wand2).
  - Running → disabled button with Loader2 + Progress bar with `current/total*100` + tabular label "X/Y".
  - Done → Badge "X asignadas" + "Limpiar IA" button to reset.
- Preview table: extracted `CategoryCell` component. Renders file's categoryName if present, else resolved name from `categories` lookup when `categoryId` is set. If `aiCategorized`, shows Sparkles icon + primary-colored text. Rows with AI categorization have subtle `bg-primary/[0.03]` background.
- Manual flow preserved: user can still set default category in mapping; AI categorizes only uncategorized rows. Final `handleImport` payload includes the resolved `categoryId` (AI or default).

## Verification
- `bun run lint` — passes (0 errors, 0 warnings). Note: initial run flagged 2 unused `eslint-disable-next-line no-await-in-loop` directives in the batching loop; removed them since `Promise.all` handles concurrency properly without needing the disable.
- `tail dev.log` — compiles successfully, GET / 200.
- Existing functionality not broken: only new imports and new JSX blocks added; rest of stats.tsx and import.tsx untouched.

## Cross-Cutting Concerns
- All files remain `"use client"` TypeScript strict.
- Emerald theme (no indigo/blue). Status colors: rose for spending/negative, emerald for income/positive, amber for warnings, primary for AI/highlights.
- Mobile-first responsive (1 → 2 → 3/4 cols depending on metric row).
- `sonner` toasts for feedback.
- Only shadcn/ui components (Card, CardHeader, CardTitle, CardContent, Button, Badge, Progress).
- `cn` from `@/lib/utils` for conditional classes.
- Lucide icons throughout.

## Files Touched
- `src/lib/ai/openai.ts` (lines 174-279 added: `classifyWithOpenAI` + `OpenAIClassificationResult` + `CLASSIFY_OPENAI_PROMPT`).
- `src/components/app/views/stats.tsx` (imports extended; new section after summary cards; new components `AnnualSummary` + `AnnualMetricCard` at end of file).
- `src/components/app/views/import.tsx` (imports extended; `MappedExpense` interface extended; new state for AI; `buildMappedExpenses` signature + body updated; new `CategoryCell` component; new "Categorización IA" Card in layout; preview table row className updated; reset clears AI state).
- `/home/z/my-project/worklog.md` (CF2 entry appended).
