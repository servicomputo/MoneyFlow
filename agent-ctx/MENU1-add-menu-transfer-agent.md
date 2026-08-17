# Task MENU1 — Money Flow: Menú Agregar (3 opciones) + Transferencia

**Agent:** main
**Task ID:** MENU1
**Date:** 2026-08

## Scope
Refactor del botón "+" para que abra un popover con 3 opciones (Gasto / Ingreso / Transferencia) en lugar del dialog con toggle Egreso/Ingreso. Se añade:
- Componente `AddMenuPopover` (popover menu global controlado por `addOpen`).
- Componente `TransferDialog` (formulario de transferencia entre cuentas).
- Switch "¿Es recurrente?" + Periodicidad en los formularios de Gasto e Ingreso.
- Estado nuevo `addType` en el store Zustand para controlar qué diálogo está abierto.

## Files Modified
1. `src/lib/store.ts` — añadido `AddType` type, estado `addType: AddType` y setter `setAddType`. Se mantuvo `addOpen`/`setAddOpen` para el popover menu.
2. `src/components/app/add-menu.tsx` (NUEVO) — popover menu global con 3 opciones. Usa `Popover` + `PopoverAnchor` apuntando a un sentinel `position:fixed bottom-24 right-4 lg:bottom-10 lg:right-10`. Cada opción cierra el popover (`setAddOpen(false)`) y abre el diálogo correspondiente (`setAddType(...)` con `requestAnimationFrame` para evitar parpadeo).
3. `src/components/app/add-expense-dialog.tsx` (REFACTORIZADO) — eliminado el toggle Egreso/Ingreso. El dialog ahora se controla con `addType` (open cuando es "expense" o "income"). `type` se deriva de `addType`. Título, ícono y color del botón Guardar dependen del tipo. Añadido bloque "¿Es recurrente?" con `Switch` + `Select` Periodicidad (Semanal/Mensual/Anual) y preview de próximo cobro. En `handleSave`, si `recurrente` es ON, crea un `Subscription` con `type="subscription"` (gasto) o `"other"` (ingreso), `nextDate` = fecha + 1 periodo, y `name` = merchant o categoría.
4. `src/components/app/transfer-dialog.tsx` (NUEVO) — formulario de transferencia con: Monto (purple accent), De cuenta + A cuenta (con botón swap), Fecha, Concepto, Switch "¿Es recurrente?" + Periodicidad. Resumen visual "Sale de → Entra a" al final. En `handleSave`: crea 2 movimientos (egreso de cuenta origen con `source="transfer"`, `paymentMethod="transfer"`, tags=["transferencia"] e ingreso a cuenta destino con mismo monto). Busca categoría "Transferencia" → fallback "Otros" / "Otros ingresos" → primer categoría del tipo. Si `recurrente` ON, crea `Subscription` con `type="transfer"`, `accountId=source`, `name`="Transferencia: A → B". Invalida queries: expenses, stats, accounts, subscriptions.
5. `src/app/page.tsx` — añadidos imports y renderiza `<TransferDialog />` y `<AddMenuPopover />` junto al `<AddExpenseDialog />` existente.
6. `src/components/app/shell.tsx` — label del botón header cambiado de "Agregar gasto" a "Agregar" (ahora abre menú, no solo gasto).
7. `src/components/app/views/dashboard.tsx` — label del CTA cambiado de "Agregar gasto" a "Agregar movimiento" con sublabel "Gasto, ingreso o transferencia".

## Implementation Notes

### Store (store.ts)
- Se añadió `export type AddType = "expense" | "income" | "transfer" | null` al principio del archivo.
- Estado `addType: AddType` con default `null`.
- Setter `setAddType: (addType: AddType) => void`.
- `partialize` (persist) sigue solo guardando `sidebarCollapsed` — `addType` es efímero (no se persiste).

### AddMenuPopover (add-menu.tsx)
- Renderiza un `Popover` controlado por `addOpen` (store).
- El `PopoverAnchor` es un `<span>` invisible `position:fixed` con `pointer-events-none` ubicado en bottom-right del viewport (96px desde abajo en mobile, 40px en desktop). Esto ancla el popover a una posición predecible sin importar qué botón "+" lo activó.
- `PopoverContent` con `side="top" align="end" sideOffset={8}` — aparece arriba del anchor, alineado a la derecha.
- `onOpenAutoFocus={(e) => e.preventDefault()}` evita que el popover robe el foco (mantener UX natural).
- Cada opción (`AddMenuItem`) tiene: ícono en chip de color, dot del mismo color, label, descripción.
  - 🟢 Ingreso (emerald, ArrowUpRight) — "Entrada de dinero"
  - 🟣 Transferencia (purple, ArrowLeftRight) — "Entre tus cuentas"
  - 🔴 Gasto (red, ArrowDownLeft) — "Egreso de dinero"
- Función `pick(type)` cierra el popover y, en `requestAnimationFrame`, setea `addType`. Esto evita parpadeo entre animaciones (close popover + open dialog).

### AddExpenseDialog refactor
- `addOpen`/`setAddOpen` → `addType`/`setAddType`.
- `const open = addType === "expense" || addType === "income"` — solo abierto cuando es gasto o ingreso.
- `const type: "expense" | "income" = addType === "income" ? "income" : "expense"` — type derivado.
- Eliminado el toggle Egreso/Ingreso (grid-cols-2 con botones).
- Eliminado el `useState<"expense" | "income">("expense")` para `type`.
- Title dinámico: "Agregar gasto" / "Agregar ingreso".
- Botón Guardar con color condicional (red para gasto, emerald para ingreso).
- Reset en useEffect ahora depende de `[open, accounts, addType]` (en lugar de `[addOpen, accounts]`).
- Nuevo bloque "¿Es recurrente?": `border bg-muted/30 p-3` con:
  - Icon Repeat en chip coloreado.
  - Switch a la derecha.
  - Cuando está ON: `Select` Periodicidad + preview "Próximo cobro: {fecha+1periodo}".
- En `handleSave`, si `recurrente`:
  - `isRecurring: true`, `recurringName: merchantName || category.name`
  - `await mutations.createSubscription({...})` con:
    - `name: merchantName || category.name || "Gasto recurrente" / "Ingreso recurrente"`
    - `type: type === "income" ? "other" : "subscription"`
    - `period: periodicidad`
    - `nextDate: advanceDate(date, periodicidad).toISOString()`
    - `categoryId, accountId` iguales al gasto.

### TransferDialog (transfer-dialog.tsx)
- Dialog controlado por `addType === "transfer"`.
- Estado: `amount`, `fromAccountId`, `toAccountId`, `date`, `concept`, `recurrente`, `periodicidad`, `saving`.
- Reset en `useEffect([open, accounts])`: `fromAccountId = default account`, `toAccountId = primer no-default o primer account`.
- Layout grid `sm:grid-cols-[1fr_auto_1fr]` con botón swap circular en el medio para intercambiar origen/destino.
- Cada Select de cuenta muestra nombre + saldo compact (`formatCurrency(balance, "MXN", { compact: true })`).
- Validación inline si `fromAccountId === toAccountId` ("Las cuentas de origen y destino deben ser diferentes").
- Bloque "¿Es recurrente?" igual que en `add-expense-dialog.tsx`.
- Resumen visual al final (bg-card border): "Sale de {from.name} → Entra a {to.name}" + importe purple.
- `handleSave`:
  1. Busca `transferCat` (Transferencia → Otros → primer expense category) y `incomeTransferCat` (Transferencia → Otros ingresos → Otros → primer income category). Si no hay categorías, toast error y return.
  2. Crea egreso: `type=expense, source=transfer, paymentMethod=transfer, accountId=fromAccountId, tags=["transferencia"], merchantName=concepto, notes="Transferencia a {to.name}"`.
  3. Crea ingreso: `type=income, source=transfer, paymentMethod=transfer, accountId=toAccountId, tags=["transferencia"], merchantName=concepto, notes="Transferencia desde {from.name}"`.
  4. Si `recurrente`: crea `Subscription` con `type="transfer", accountId=fromAccountId, name="Transferencia: {from.name} → {to.name}", merchantName=concepto`.
  5. Toast success y invalida: expenses, stats, accounts, subscriptions.
  6. `setAddType(null)` cierra el dialog.

### Helper functions (compartidos)
- `advanceDate(date, period)` — avanza una fecha según el periodo (yearly → +1 año, weekly → +7 días, monthly → +1 mes). Duplicado en ambos archivos porque son pequeños y mantienen los componentes autónomos.
- `PERIODS` array con `{ value: "weekly", label: "Semanal" }, { value: "monthly", label: "Mensual" }, { value: "yearly", label: "Anual" }`.

## Verification
- `bun run lint` — pasa sin errores ni warnings.
- Dev server compila sin errores (dev.log muestra `✓ Compiled in 141ms`, `GET / 200`, GET a /api/categories, /api/accounts, /api/stats, /api/subscriptions, /api/reminders todos 200).
- No se rompió funcionalidad existente: el sidebar nav "add" item, el botón header, el mobile menu y el mobile bottom nav siguen llamando `setAddOpen(true)` y ahora abren el popover de 3 opciones en lugar del dialog directo.

## Architecture Notes
- El popover menu está desacoplado de los botones "+": se controla por el store global. Cualquier botón que llame `setAddOpen(true)` abrirá el popover.
- Los diálogos (gasto/ingreso/transferencia) están desacoplados del popover: cada uno se controla por `addType`. El popover solo setea `addType` y se cierra; el diálogo correspondiente se abre automáticamente al detectar el cambio.
- `addOpen` y `addType` son ortogonales: `addOpen` para el popover menu, `addType` para los diálogos. Esto permite que el popover y los diálogos no compitan por el mismo estado.
- Se eliminaron imports no usados en `add-expense-dialog.tsx`: `colorClasses`, `monthKey` (ya no se usaban tras eliminar el toggle).
