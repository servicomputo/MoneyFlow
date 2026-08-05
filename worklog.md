# Worklog - FinZeni: Control de Gastos Personales con IA

## Visión General
Aplicación web FinTech para control de gastos personales con:
- Dashboard con métricas y gráficas
- Registro manual y automático (OCR + IA) de gastos
- Clasificación inteligente con IA y aprendizaje
- Presupuestos, suscripciones, cuentas, categorías
- Asistente IA con chat en lenguaje natural
- Exportación (CSV, JSON, Excel, PDF)
- Modo claro/oscuro

## Stack
- Next.js 16 + TypeScript + Tailwind 4 + shadcn/ui
- Prisma + SQLite
- Recharts para gráficos
- z-ai-web-dev-sdk (VLM para OCR, LLM para clasificación/chat)
- Zustand para estado de UI (vista activa)
- next-themes para modo claro/oscuro
- Color principal: Emerald (verde esmeralda - asociado a dinero/finanzas)

---
Task ID: 0
Agent: main
Task: Inicialización del proyecto y setup base

Work Log:
- Revisada estructura del proyecto Next.js 16 existente
- Confirmado stack: shadcn/ui completo, recharts, framer-motion, zustand, z-ai-web-dev-sdk instalados
- Definido esquema de color emerald para tema financiero
- Planificada arquitectura SPA con vista activa vía Zustand (única ruta /)

Stage Summary:
- Base lista para construir esquema Prisma y componentes

---
Task ID: 1
Agent: main
Task: Construir base del proyecto (esquema, APIs, layout, dashboard, escaneo, agregar gasto)

Work Log:
- Esquema Prisma completo: User, Category, Subcategory, Account, Merchant, MerchantHint, Expense, Budget, Subscription, Reminder, AiInsight, SavingsGoal
- Base de datos sembrada con 140 gastos, 4 cuentas, 19 categorías, 20 comercios, 7 presupuestos, 6 suscripciones, 3 metas, 4 recordatorios, 3 insights IA
- APIs REST creadas: /api/expenses (GET/POST, /[id] GET/PATCH/DELETE), /api/categories, /api/accounts, /api/merchants (con autocompletado), /api/budgets, /api/subscriptions, /api/reminders, /api/goals, /api/stats (dashboard completo), /api/export (CSV/JSON/Excel/PDF)
- Módulo IA: /api/scan (VLM glm-4.5v extrae datos de tickets), /api/classify (LLM + aprendizaje), /api/assistant (chat con contexto financiero), /api/search (búsqueda en lenguaje natural), /api/insights (resúmenes y consejos)
- Tema emerald con modo claro/oscuro configurado en globals.css
- Layout con sidebar desktop + bottom nav móvil + header con acciones
- Dashboard completo: saldo, gastos, ahorro, presupuesto, proyección, gráfica de tendencia, pie de categorías, top 5, últimos movimientos, suscripciones, recordatorios
- Modal Agregar Gasto con autocompletado de comercios, sugerencia de categoría con IA, alternativas, etiquetas, fecha, cuenta, método de pago
- Vista Escanear Ticket con VLM: subir imagen/PDF/tomar foto, extrae datos, editable, crea gasto

Stage Summary:
- Base funcional completa, todas las APIs y vistas críticas (dashboard, scan, add) listas
- Faltan vistas: movements, budgets, subscriptions, accounts, categories, stats, assistant, goals, reminders, settings
- page.tsx importa todas las vistas, deben existir para que compile

---
Task ID: 2-a
Agent: frontend-views-agent
Task: Construir vistas de Movimientos, Presupuestos y Suscripciones

Work Log:
- Creada vista Movimientos (movements.tsx): selector de mes prev/next, búsqueda instantánea (comercio/notas/etiquetas), chips de categoría con scroll horizontal, filtros por cuenta y método de pago (Select), agrupación por fecha relativa ("Hoy", "Ayer", "Hace X días"), filas con CategoryIcon + merchant + subcategoría + hora + monto en rojo + badge de método + badge "Scan" para gastos por OCR, botón eliminar (hover) con confirmación AlertDialog, summary bar (conteo + total), estado vacío y skeletons. DELETE /api/expenses/:id e invalida ["expenses"] y ["stats"].
- Creada vista Presupuestos (budgets.tsx): selector de mes, tarjeta resumen con gradiente emerald (total/gastado/restante + Progress global), grid de tarjetas por categoría con Progress bar coloreada por estatus (emerald <70%, amber 70-90%, red >=90%), badges "Cerca del límite" (>=85%) y "Excedido" (>=100%), botones Editar/Eliminar, Dialog de creación/edición con Select de categoría y monto. POST/DELETE /api/budgets e invalida ["budgets"] y ["stats"]. Empty state + skeletons.
- Creada vista Suscripciones (subscriptions.tsx): tarjeta resumen (costo mensual total normalizado por periodo, conteo activas, proyección anual, promedio diario), banner de insight con ahorro anual proyectado, grid de tarjetas ordenadas por nextDate asc (icono categoría, nombre, comercio, monto + equivalente mensual, badge de periodo coloreado, próximo pago con cuenta regresiva relativa, badges de cuenta y categoría, Switch activar/pausar, Editar/Eliminar), Dialog completo (nombre, comercio, monto, periodo, fecha próxima, categoría, cuenta). POST/PATCH/DELETE /api/subscriptions con fallback a PATCH active=false si DELETE no existe. Invalida ["subscriptions"] y ["stats"].
- Las 3 vistas usan: shadcn/ui existente, tema emerald (sin indigo/azul), responsive mobile-first, sonner para toasts, useQueryClient para invalidación, TypeScript estricto, skeleton de carga.
- Lint: 0 errores en los 3 archivos nuevos. Type-check (tsc --noEmit): 0 errores en los 3 archivos nuevos.

Stage Summary:
- 3 vistas completas y listas para producción, integradas en page.tsx.
- Falta que agentes hermanos terminen stats, reminders, settings para que compile limpio end-to-end (esos módulos aún no existen y rompen la compilación actual de page.tsx).

---
Task ID: 2-c
Agent: frontend-views-agent
Task: Construir vistas de Asistente IA, Metas de Ahorro, Recordatorios y Configuración

Work Log:
- Creada vista Asistente IA (assistant.tsx): tarjeta de "Resumen del mes" con gradiente emerald suave, contenido del resumen + tips en grid de cards con icono Lightbulb, botón "Regenerar insights" que llama GET /api/insights?month=YYYY-MM&refresh=1 (invalidando queryKey ["insights", month] vía setQueryData), chips de preguntas sugeridas en scroll horizontal (6 sugerencias, click envía directo), card de chat con área de mensajes scrollable (max-h-[52vh]) con auto-scroll al fondo vía useRef+useEffect, burbujas user (emerald right-aligned) / assistant (muted left-aligned con avatar Bot), indicador de typing con 3 puntos animados (animate-bounce con delays), welcome message cuando vacío, input + botón Send al pie del card. POST /api/assistant con {question, month} -> {answer}. Toasts de error. Loading skeleton para insights.
- Creada vista Metas de Ahorro (goals.tsx): tarjeta resumen con gradiente emerald→teal mostrando total ahorrado, objetivo, faltante, conteo de metas activas y completadas, y anillo de progreso global (CircularProgress SVG con stroke-dasharray). Grid responsive (1/2/3 columnas) de GoalCard: anillo de progreso circular SVG coloreado por color de meta, icono+nombre, monto actual/objetivo, "Faltan $X" o Badge "¡Meta alcanzada! 🎉" (Trophy) si current>=target, deadline relativo+absoluto con Calendar, Progress bar, botones Agregar fondos (Plus), Editar (Pencil), Eliminar (Trash2). Dialog de crear/editar con nombre, objetivo, ahorrado opcional, fecha límite (date picker nativo), color picker (18 swatches de COLOR_NAMES) y icon picker (grid 9x2 de CATEGORY_ICONS). Dialog de "Agregar fondos" con input + botones rápidos $100/$500/$1000 + preview del nuevo total + toast de celebración si alcanza meta. AlertDialog de confirmación al eliminar. POST/PATCH/DELETE /api/goals con invalidación de ["goals"].
- Creada vista Recordatorios (reminders.tsx): header con conteo de pendientes y badge de vencidos (rojo). Dos secciones (Card): "Pendientes" y "Completados" (esta última solo si hay). ReminderRow: Checkbox (emerald), título con strikethrough si done, Badge de tipo con icono (pay_card=CreditCard purple, pay_service=Zap amber, register_cash=Wallet emerald, register=Plus teal), fecha relativa+absoluta en rojo si vencida (isOverdue), notas truncadas, botón eliminar. Las clases de color del badge son estáticas (no dinámicas) para compatibilidad con Tailwind JIT. Dialog crear: título, Select de tipo, fecha límite (date nativo, default +3 días), Textarea de notas. PATCH /api/reminders {id, done} y DELETE /api/reminders?id= con confirmación AlertDialog. Empty states para lista vacía. Skeletons.
- Creada vista Configuración (settings.tsx): 7 secciones en Card. (1) Perfil: avatar con inicial, inputs nombre/email, botón Guardar con toast "Próximamente: sincronización en la nube" (solo estado local). (2) Apariencia: 3 ThemeCards (Claro/Oscuro/Sistema) con useTheme de next-themes, iconos Sun/Moon/Monitor, borde emerald cuando activo. (3) Moneda: Select MXN/USD/EUR (solo UI). (4) Seguridad: 3 SecurityRow con Switch (Bloqueo PIN, Huella/Face ID, Cifrado) — al activarse muestran toast "Función premium". (5) Premium: card con gradiente amber→rose, grid de 4 features (Escaneo masivo, Detección de duplicados, Chat IA avanzado, Predicciones) + botón "Mejorar a Premium" con toast "Próximamente". (6) Datos: Exportar (link a /api/export?format=json&month=currentMonth con download), Backup en la nube (toast premium), Restablecer datos (AlertDialog de confirmación). (7) Acerca de: versión v1.0.0, links Privacidad/Términos/Soporte (toasts), footer con Sparkles.
- Las 4 vistas usan: shadcn/ui existente (Card, Button, Input, Label, Skeleton, Badge, Progress, Dialog, AlertDialog, Select, Checkbox, Switch, Separator, Textarea), tema emerald (sin indigo/azul), responsive mobile-first, sonner para toasts, useQueryClient para invalidación, TypeScript estricto, Lucide icons.
- Lint: 0 errores en los 4 archivos nuevos (verificado con `bun run lint | grep -E "(assistant|goals|reminders|settings)\.tsx"` -> "NO ISSUES IN MY FILES"). Los 2 errores restantes de ESLint están en category-icon.tsx (preexistente) y accounts.tsx (agente hermano), no son responsabilidad de este task.

Stage Summary:
- 4 vistas completas y listas para producción, integradas en page.tsx.
- Ahora solo falta que agentes hermanos terminen accounts, categories y stats para que compile limpio end-to-end (esos módulos aún generan errores de compilación/runtime en dev.log).

---
Task ID: 2-b
Agent: frontend-views-agent-b
Task: Vistas de Cuentas, Categorías y Estadísticas avanzadas

Work Log:
- Creadas 3 vistas React ("use client") en src/components/app/views/:
  - accounts.tsx — AccountsView: tarjetas estilo Apple Wallet con gradiente dinámico por color de cuenta, badge Default, íconos de editar/eliminar (toast "Próximamente"), resumen de saldo total, diálogo de creación con Select de tipo, moneda, color chips, campos condicionales para tarjetas de crédito (límite + día de pago) y Switch de cuenta predeterminada. POST /api/accounts + invalidateQueries(["accounts"]).
  - categories.tsx — CategoriesView: 4 tarjetas resumen (categorías/gastos/ingresos/subcategorías), filtro por tipo, grid de tarjetas con Accordion (type="multiple", items-start) que muestra subcategorías y botón "Próximamente", selector de ícono (grid 7 columnas con todos los CATEGORY_ICONS), selector de color con chips, vista previa en vivo, POST /api/categories + invalidateQueries(["categories"]). Strip de referencia con DEFAULT_CATEGORIES.
  - stats.tsx — StatsView: Tabs (Mes/Semana/Año — semana/año muestran "Próximamente"), navegación prev/next de mes, 6 tarjetas resumen (total, prom diario, prom semanal, proyección, movimientos, variación %), grid de 5 gráficas (SpendingTrendChart, CategoryPieChart + leyenda, MerchantBarChart, MethodPieChart + leyenda, CategoryBarChart con categoryComparison), tabla comparativa con mes anterior (categoría, este mes, mes anterior, Badge de variación color-coded, sparkline de 2 barras), tarjetas mini de uso de presupuesto (top 6), botones de exportación CSV/JSON/Excel/PDF vía <a download target="_blank"> a /api/export.
- Patrón `renderIcon(Icon, className)` con React.createElement para evitar el error ESLint `react-hooks/static-components` en los 3 archivos.
- Tema emerald consistente (gradientes from-emerald-500 via-emerald-600 to-teal-700), colores de estado (rose/red para gastos y excedidos, amber para advertencias, emerald para ingresos/éxito). Cero indigo/azul.
- Mobile-first responsive, skeletons de carga, sonner toasts, useQueryClient para invalidación, solo componentes shadcn/ui de src/components/ui/.

Stage Summary:
- 3 vistas listas y cableadas en page.tsx (ya importadas por Task 1).
- `bun run lint` → 0 errores en los 3 archivos nuevos. Único error remanente es preexistente en `src/components/app/category-icon.tsx` (regla react-hooks/static-components, propiedad de Task 1).
- Registro detallado en /home/z/my-project/agent-ctx/2-b-accounts-categories-stats.md

---
Task ID: 3
Agent: main
Task: Verificación final con Agent Browser y correcciones

Work Log:
- Corregido error de lint en category-icon.tsx (createElement en lugar de JSX directo para evitar react-hooks/static-components)
- Añadidas relaciones faltantes en schema Prisma: Subscription.category, Subscription.account, Category.subscriptions, Account.subscriptions
- Regenerado cliente Prisma y reiniciado dev server
- Verificación con Agent Browser:
  - Dashboard renderiza: saldo $14,450.25, gastado $3.5k, ahorrado $4.5k, presupuesto $16.7k, proyección $21,643.70
  - Navegación entre las 13 vistas funcional (dashboard, movements, scan, budgets, subscriptions, accounts, categories, stats, assistant, goals, reminders, settings)
  - Modal "Agregar gasto" se abre, campo de importe funcional
  - Modo oscuro funcionando (class="dark" en html)
  - Vista móvil (390x844) con bottom nav funcional
  - Footer sticky al fondo en página corta, empujado naturalmente en página larga
  - Escaneo de ticket con VLM: subida de imagen → extracción de datos (subtotal, IVA, folio, productos) → formulario editable → botón crear gasto
  - Asistente IA: pregunta "¿Cuánto gasté en gasolina este mes?" → respuesta contextual "Este mes gastaste $1,343.00 MXN en gasolina, principalmente en Pemex..."
  - Todas las APIs responden 200 (expenses, stats, categories, accounts, budgets, goals, reminders, subscriptions)
  - Sin errores de runtime ni en consola

Stage Summary:
- Aplicación completa y funcional verificada end-to-end
- 13 vistas SPA, 11 APIs REST, módulo de IA (VLM + LLM) operativo
- Datos sembrados realistas (140 gastos, 4 cuentas, 19 categorías, 20 comercios, 7 presupuestos, 6 suscripciones, 3 metas, 4 recordatorios)
- Lint limpio, sin errores de runtime

---
Task ID: 4
Agent: main
Task: Cambiar paleta de colores + módulo de importación masiva desde Excel

Work Log:
- Sistema de paletas: 6 paletas (Esmeralda, Rosa, Violeta, Ámbar, Océano, Pizarra) con CSS variables dinámicas
- Store Zustand con persistencia en localStorage (finzeni-palette)
- Componente PaletteApplier que aplica variables CSS al DOM según paleta + tema
- Selector de paleta en Configuración con swatches visuales y toast de confirmación
- Gradientes de marca (dashboard hero, shell logo, settings avatar, budgets/subscriptions/accounts/goals heroes) actualizados para usar var(--primary) con color-mix
- Librería xlsx (SheetJS) instalada para parsear Excel/CSV
- API /api/expenses/bulk: inserción masiva con resolución de categorías/cuentas/comercios por nombre, creación de comercios nuevos, hints de aprendizaje, actualización de balances
- Vista Importar: drag&drop, parseo automático, auto-mapeo de columnas por nombre, mapeo editable, categoría/cuenta por defecto, tabla de preview con validación, importación masiva, pantalla de resultados
- Botón "Importar" añadido al dashboard y sidebar
- Plantilla descargable generada client-side con XLSX.writeFile

Verificación con Agent Browser:
- Cambio de paleta a Rosa: --primary cambió a oklch(0.7 0.21 12), hero gradient actualizado
- Cambio a Violeta: oklch(0.66 0.2 285)
- Persistencia tras recarga: la paleta se mantiene
- Importación de Excel de prueba (8 filas): 7 gastos creados con source="import", verificados vía API
- Auto-mapeo funcionó: Importe→Importe, Fecha→Fecha, Comercio→Comercio, etc.
- Lint limpio, sin errores de runtime

Stage Summary:
- 2 features completadas: paletas dinámicas + importación masiva
- 6 paletas disponibles, persistentes, adaptadas a claro/oscuro
- Importación Excel/CSV end-to-end funcional con preview y validación

---
Task ID: 5
Agent: main
Task: Renombrar a Money Flow + crear infraestructura de despliegue

Work Log:
- Renombrado FinZeni → Money Flow en 7 archivos (layout, palettes, assistant, palette-store, shell, import, settings) + seed.ts
- Emails actualizados: hola@moneyflow.app, soporte@moneyflow.app
- localStorage key: moneyflow-palette
- Archivo plantilla Excel: plantilla-gastos-moneyflow.xlsx
- Manifest PWA creado (public/manifest.webmanifest): standalone, shortcuts (Agregar/Escanear/Inicio), theme_color emerald
- metadata de Next.js ampliada: applicationName, appleWebApp.capable, manifest, userScalable false (UX nativa móvil)
- Dockerfile multi-stage (deps → builder → runner) con node:20-alpine, usuario no-root, healthcheck, volumen /app/data, prisma db push en CMD
- docker-compose.yml: servicio app + servicio caddy comentado (SSL auto con Let's Encrypt), volumen persistente moneyflow-data
- .dockerignore optimizado (excluye node_modules, .next, .git, logs)
- Caddyfile.prod.example con cabeceras de seguridad (HSTS, X-Frame-Options, etc.)
- .env.example con todas las variables (DATABASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET, ZAI_API_KEY)
- DEPLOYMENT.md completo: arquitectura, Docker rápido, VPS, PWA móvil, variables, backups, troubleshooting

Verificación con Agent Browser:
- Título pestaña: "Money Flow — Control de Gastos con IA"
- Sidebar brand: "Money Flow"
- Mobile header: "Money Flow"
- Footer: "Money Flow · Tu contador y asesor financiero personal con IA"
- Settings: "Personaliza Money Flow a tu medida", "Usuario Money Flow", "hola@moneyflow.app", "Money Flow Premium"
- Manifest accesible en /manifest.webmanifest
- Asistente IA responde: "Soy Money Flow, tu asesor financiero personal"
- Lint limpio, sin errores

Stage Summary:
- App renombrada completamente a Money Flow
- Infraestructura Docker lista para producción (multi-stage, SSL auto, backups)
- PWA instalable en celular (iOS Safari "Añadir a pantalla de inicio", Android Chrome "Instalar app")
- Documentación de despliegue completa en DEPLOYMENT.md

---
Task ID: 6-a
Agent: view-mutations-migration-agent
Task: Migrar fetch calls directos a mutations helper en 7 vistas (modo local/server compatible)

Work Log:
- Leído `/home/z/my-project/src/components/app/hooks.ts` para confirmar la API del objeto `mutations` (createExpense, updateExpense, deleteExpense, createCategory, createAccount, createBudget, deleteBudget, createSubscription, updateSubscription, deleteSubscription, createGoal, updateGoal, deleteGoal, createReminder, updateReminder, deleteReminder, bulkImport). Las mutaciones lanzan excepción en error (no devuelven Response).
- Migradas 7 vistas en `src/components/app/views/` reemplazando `fetch("/api/...")` por `mutations.*`:

  1. **movements.tsx**
     - Import añadido: `mutations` a la línea de `../hooks`.
     - DELETE `/api/expenses/${toDelete.id}` → `await mutations.deleteExpense(toDelete.id)`.
     - Eliminado `if (!r.ok) throw`. Se conservan try/catch, toast, `qc.invalidateQueries(["expenses"])` y `["stats"]`.

  2. **budgets.tsx**
     - Import añadido: `mutations`.
     - POST `/api/budgets` (creación Y edición, ya que el endpoint hace upsert) → `await mutations.createBudget({ categoryId: formCat, amount, month: selectedMonth })`. El flag `editing` solo controla el mensaje de toast.
     - DELETE `/api/budgets?id=${toDelete.id}` → `await mutations.deleteBudget(toDelete.id)`.
     - Se conservan try/catch, toast, invalidación de `["budgets"]` y `["stats"]`.

  3. **subscriptions.tsx**
     - Import añadido: `mutations`.
     - PATCH `/api/subscriptions` con `{id: editing.id, ...payload}` → `await mutations.updateSubscription(editing.id, payload)`.
     - POST `/api/subscriptions` con `payload` → `await mutations.createSubscription(payload)`.
     - PATCH `/api/subscriptions` con `{id: s.id, active: value}` (toggle pausa/activa) → `await mutations.updateSubscription(s.id, { active: value })`.
     - DELETE `/api/subscriptions?id=${toDelete.id}` → `await mutations.deleteSubscription(toDelete.id)`.
     - Fallback del catch: PATCH `/api/subscriptions` con `{id: toDelete.id, active: false}` → `await mutations.updateSubscription(toDelete.id, { active: false })`. Se mantiene el patrón original de fallback a "marcar inactiva" si el delete falla.
     - Se conservan try/catch anidado, toast, invalidación de `["subscriptions"]` y `["stats"]`.

  4. **accounts.tsx**
     - Import añadido: `mutations`.
     - POST `/api/accounts` con `payload` → `await mutations.createAccount(payload)`.
     - Botones de editar/eliminar de cuentas ya mostraban toast "Próximamente" (no había endpoint PATCH/DELETE), se dejaron intactos según las instrucciones.
     - Se conserva try/catch, toast, `queryClient.invalidateQueries(["accounts"])`.

  5. **categories.tsx**
     - Import añadido: `mutations`.
     - POST `/api/categories` con `{name, icon, color, type}` → `await mutations.createCategory(payload)`.
     - Botón de editar categoría ya mostraba toast "Próximamente", se dejó intacto.
     - Se conserva try/catch, toast, `queryClient.invalidateQueries(["categories"])`.

  6. **goals.tsx**
     - Import añadido: `mutations`.
     - DELETE `/api/goals?id=${deleteGoal.id}` (en onClick inline del AlertDialog) → `await mutations.deleteGoal(deleteGoal.id)`.
     - POST/PATCH `/api/goals` unificado en `GoalDialog.handleSubmit` → se separó en rama `if (editing)` → `mutations.updateGoal(editing.id, payload)` y `else` → `mutations.createGoal(payload)`. Se eliminó la lectura de `r.json()` para extraer mensaje de error (la mutación lanza `Error` con el mensaje directo, capturado por `catch (e)` y mostrado con `e.message`).
     - PATCH `/api/goals` con `{id: goal.id, current: newCurrent}` (agregar fondos) → `await mutations.updateGoal(goal.id, { current: newCurrent })`.
     - Se conservan try/catch, toasts (incluido el de celebración al alcanzar meta), invalidación de `["goals"]`.

  7. **reminders.tsx**
     - Import añadido: `mutations`.
     - PATCH `/api/reminders` con `{id: r.id, done}` (toggle checkbox) → `await mutations.updateReminder(r.id, { done })`.
     - DELETE `/api/reminders?id=${r.id}` → `await mutations.deleteReminder(r.id)`.
     - POST `/api/reminders` con `{title, type, dueDate, notes}` → `await mutations.createReminder({ title: title.trim(), type, dueDate, notes: notes.trim() || null })`.
     - Se conservan try/catch, toasts, reset de formulario, invalidación de `["reminders"]`.

- Verificación: tras la migración, ya NO quedan llamadas `fetch("/api/...")` en ninguno de los 7 archivos. Los únicos `fetch` restantes en `views/` están en `scan.tsx` (upload a VLM) y `assistant.tsx` (GET a /api/insights, /api/assistant, /api/search — endpoints de IA fuera del alcance del data provider de mutaciones CRUD), no tocados por este task.
- Lint: `bun run lint 2>&1 | tail -30` reporta 0 errores en los 7 archivos modificados. Los 4 errores remanentes están todos en `src/lib/data-provider.ts` (interfaces vacías `@typescript-eslint/no-empty-object-type`), archivo NO tocado por este task.
- TypeScript: `npx tsc --noEmit` no reporta errores nuevos en los 7 archivos modificados. El único error TS en `accounts.tsx(107,87)` (Card local no acepta prop `style`) es PRE-EXISTENTE — verificado con `git stash`: existía antes de mis cambios en la línea 112. No fue introducido por este task y queda fuera de su alcance.
- No se tocaron: UI, estilos, estructura de componentes, toasts, invalidaciones de queries, ni el link de export en settings (`/api/export?format=...`).

Stage Summary:
- 7 vistas migradas al patrón `mutations.*` (16 llamadas fetch reemplazadas en total).
- Las mutaciones ahora fluyen a través de `dataProvider`, que enruta a IndexedDB (modo local) o a las APIs REST (modo server) según `useDataModeStore`.
- Lint limpio en los 7 archivos modificados.
- Sin cambios en comportamiento visible para el usuario final; solo cambia la capa de acceso a datos.

---
Task ID: 7
Agent: main
Task: Implementar modo local (sin servidor) + modelo freemium

Work Log:
- Instalado Dexie 4.4.4 (wrapper de IndexedDB)
- Creada base de datos local (src/lib/local-db.ts) con 11 tablas: categories, accounts, merchants, merchantHints, expenses, budgets, subscriptions, reminders, goals, insights, meta
- Store de modo de datos (src/lib/data-mode.ts) con persistencia: mode (local|server), serverUrl, iaServerUrl
- Data provider unificado (src/lib/data-provider.ts, ~940 líneas):
  - serverProvider: usa fetch a /api/* (comportamiento original)
  - localProvider: usa IndexedDB vía Dexie, con CRUD completo para todas las entidades
  - Proxy que enruta automáticamente según el modo activo
  - ensureLocalSeed(): siembra categorías por defecto + cuenta Efectivo al primer uso del modo local
  - getStats() local: replica el cálculo del dashboard client-side
  - bulkImport() local: inserción masiva en IndexedDB
  - Helpers isIaAvailable() y getIaBaseUrl() para enrutar llamadas de IA
- Hooks actualizados para usar dataProvider (las queries incluyen `mode` en la queryKey para refrescar al cambiar modo)
- Objeto `mutations` exportado con todas las operaciones CRUD
- Subagente 6-a actualizó 7 vistas (movements, budgets, subscriptions, accounts, categories, goals, reminders) para usar mutations en lugar de fetch directo
- Actualizados manualmente: add-expense-dialog (merchants + classify + save), scan (IA endpoint + save), import (bulkImport), assistant (IA endpoint + aviso modo local)
- Bug fix: consultas Dexie between() usaban timestamps numéricos pero el campo date es string ISO → cambiado a comparación de strings ISO lexicográfica
- Bug fix: subscriptions.where("active").equals(1) no funciona con booleanos → cambiado a toArray().filter()
- Sección "Modo de datos" en Configuración:
  - Dos ModeCards: "Solo este dispositivo" (GRATIS) vs "Sincronizar con servidor" (PREMIUM)
  - Cada una con icono, features, badge
  - Campo opcional de URL del servidor IA para modo local (Premium)
  - Indicador de estado (conectado/sin servidor IA)
  - Info de almacenamiento según modo

Verificación con Agent Browser:
- Modo servidor: dashboard muestra $11,415.75 (datos del servidor)
- Cambio a modo local: toast "Modo local activado"
- Dashboard modo local: $0.00 (base local nueva y vacía)
- Agregar gasto en modo local: importe $150, categoría Café → guardado correctamente, toast "Gasto registrado"
- Dashboard tras fix: Gastado $150.00, Saldo -$150.00 (cuenta descontada)
- Movimientos: 1 gasto, Total -$150.00
- Asistente IA: muestra aviso "Asistente IA no disponible en modo local" con instrucciones
- Vuelta a modo servidor: dashboard muestra datos del servidor ($11,415.75) — datos separados y ambos modos funcionando
- Lint limpio, sin errores de runtime

Stage Summary:
- Modelo freemium implementado: Gratis (local sin servidor) + Premium (servidor con sync + IA)
- Arquitectura local-first con IndexedDB (Dexie)
- IA degradada elegantemente en modo local: clasificación por aprendizaje local funciona, escaneo/asistente requieren servidor
- Cambio de modo instantáneo con persistencia

---
Task ID: 8-a
Agent: frontend-views-income-expense-agent
Task: Actualizar vistas Movements y Stats para distinguir ingresos vs egresos (color verde/rojo, signo +/-, filtro por tipo, totales separados)

Work Log:
- Leído contexto de worklog.md (Tasks 0-7) y los 2 archivos objetivo (movements.tsx, stats.tsx). Confirmado en src/lib/data-provider.ts que `Expense.type: string` ("expense"|"income") y que `Stats.summary` ya incluye `totalIncome`, `incomeCount`, `expenseCount`, `totalSaved`.
- **movements.tsx** (src/components/app/views/movements.tsx):
  - Import añadido: `cn` de `@/lib/utils`, `ArrowDownLeft` y `ArrowUpRight` de lucide-react, `type ReactNode` de react.
  - Estado nuevo: `const [typeFilter, setTypeFilter] = useState<"all" | "expense" | "income">("all");`
  - Filtro aplicado al final del `useMemo` existente: `if (typeFilter !== "all") result = result.filter((e) => e.type === typeFilter);` (variable renombrada de `expenses.filter(...)` a `let result = ...` para poder reasignar).
  - Reemplazado el cálculo de `total` único por dos totales: `totalEgresos` (e.type !== "income") y `totalIngresos` (e.type === "income").
  - Summary bar del header: ahora muestra 3 bloques separados por divisores — Movimientos (count), Egresos (-X en rojo `text-red-600 dark:text-red-400`), Ingresos (+X en verde `text-emerald-600 dark:text-emerald-400`).
  - Añadido toggle segmentado "Todos / Egresos / Ingresos" (`grid grid-cols-3 gap-1 rounded-lg bg-muted p-1`) entre el input de búsqueda y los filtros Select existentes. Componente nuevo `TypeFilterButton` con estado activo (bg-background + shadow) vs inactivo (muted), iconos ArrowDownLeft para Egresos y ArrowUpRight para Ingresos. Botón "Limpiar" ahora resetea también `typeFilter` a "all".
  - `ExpenseRow`: el monto ahora usa `cn(...)` para aplicar clase condicional según `expense.type === "income"` → esmeralda + prefijo `+`, en caso contrario rojo + prefijo `-` (como antes).
- **stats.tsx** (src/components/app/views/stats.tsx):
  - Import añadido: `ArrowUpRight`, `ArrowDownLeft` de lucide-react.
  - Eliminado `const variation = s.variation;` (ya no se usa tras reemplazar la tarjeta de Variación por Balance).
  - Grid de tarjetas resumen ampliado de 6 a 7 columnas (`xl:grid-cols-6` → `xl:grid-cols-7`).
  - Tarjeta "Total gastado": icono cambiado a `ArrowDownLeft`, mantiene accent rose.
  - Tarjeta nueva "Ingresos": muestra `formatCurrency(s.totalIncome)` con icono `ArrowUpRight` y accent `text-emerald-600 dark:text-emerald-400`.
  - Tarjeta "Movimientos" actualizada: value ahora es `String(s.expenseCount + s.incomeCount)` y se añadió prop opcional `subline` al componente `SummaryStat` para mostrar "{expenseCount} egresos · {incomeCount} ingresos" con cada conteo en su color (rose / emerald).
  - Tarjeta "Variación" reemplazada por "Balance": muestra `totalIncome - totalSpent` con prefijo +/- según signo, icono TrendingUp/TrendingDown según signo, accent emerald si >=0 o rose si <0. Esto satisface el requerimiento "Update the variation card or add context that compares income vs expense".
  - Componente `SummaryStat` extendido con prop opcional `subline?: React.ReactNode` renderizada bajo el valor principal en `text-[11px] text-muted-foreground`.
- Verificación:
  - `bun run lint` → exit 0, sin errores.
  - `npx tsc --noEmit | grep -E "(movements|stats)\.tsx"` → vacío (sin errores TS en los archivos modificados).
  - `Minus` sigue usándose en la tabla comparativa de categorías (no quedó huérfano).
- No se tocaron: lógica de delete, invalidaciones de queries, íconos de categoría, agrupación por fecha, charts, tabla comparativa, tarjetas mini de presupuesto, exportación.
- Nota: se observó en dev.log un error runtime `ReferenceError: monthlyGoal is not defined` en `/api/stats/route.ts:174` (backend). No es responsabilidad de este task (solo vistas); los campos `totalIncome`/`incomeCount`/`expenseCount`/`totalSaved` ya existen en el tipo `Stats` de data-provider.ts y son los que consume la vista. El backend (presumiblemente Task 8-b) debe corregir la referencia `monthlyGoal` para que la API responda 200 y la vista renderice datos reales.

Stage Summary:
- 2 vistas actualizadas para soportar ingresos vs egresos: Movements (filtro + colores + totales) y Stats (tarjeta Ingresos + Balance + conteo desglosado).
- Lint y type-check limpios en ambos archivos.
- Cambios mínimos y consistentes con el estilo existente (shadcn/ui, tema emerald/rose, mobile-first).

---
Task ID: 8
Agent: main + subagent 8-a
Task: Arreglar menú "Agregar" + añadir registro de ingresos

Work Log:
- Bug 1 fix: "Agregar gasto" en sidebar/mobile nav ahora abre el modal (setAddOpen(true)) en vez de setView("add") que mapeaba incorrectamente a ScanView
- Item de menú renombrado: "Agregar gasto" → "Agregar movimiento"
- Eliminado el mapeo `{view === "add" && <ScanView />}` de page.tsx
- Schema Prisma: añadido campo `type String @default("expense")` al modelo Expense
- Categorías de ingreso creadas: Salario, Freelance, Negocio, Ventas, Inversiones, Renta recibida, Regalos, Reembolsos, Jubilación, Otros ingresos
- Seed actualizado: 3 ingresos mensuales (Salario $28k, Freelance, Inversiones) por 3 meses
- API /api/expenses POST: acepta campo `type`, balance suma para ingresos / resta para egresos
- API /api/stats: separa expenseList/incomeList, devuelve totalIncome, incomeCount, expenseCount, totalSaved = totalIncome - totalSpent
- Data provider local: mismo soporte para type (createExpense guarda type, getStats separa, balance ajusta según tipo, ensureLocalSeed crea categorías de ingreso)
- Modal "Agregar movimiento": 
  - Toggle Egreso/Ingreso (rojo/esmeralda) con iconos ArrowDownLeft/ArrowUpRight
  - Importe grande cambia de color según tipo (rojo egreso, verde ingreso)
  - Label dinámico "GASTO" / "INGRESO"
  - Categorías se filtran según tipo seleccionado
  - Toast: "Ingreso registrado" / "Gasto registrado"
- Dashboard: métricas ahora son Ingresos / Gastado / Ahorrado (antes era Gastado/Ahorrado/Presupuesto)
- Movimientos recientes: ingresos en verde con +, egresos en rojo con -
- Subagente 8-a: vista Movements con toggle Todos/Egresos/Ingresos, summary con egresos+ingresos, amount con color según tipo; vista Stats con card de Ingresos y Balance (income-expense)
- Bug fix: monthlyGoal se había perdido al refactorizar stats API, repuesto

Verificación con Agent Browser:
- Dashboard: Ingresos $34.3k, Gastado $10.1k, Ahorrado $24.2k
- Modal: toggle Egreso/Ingreso funciona, categorías se filtran correctamente (Salario, Freelance, etc.)
- Registro de ingreso: $5,000 Salario → toast "Ingreso registrado $5,000.00 · Salario"
- Movimientos: muestra 18 movimientos, Egresos -$10,149.80 (rojo), Ingresos +$39,322.82 (verde)
- Filtro Ingresos: muestra solo ingresos con + verde (Salario +$5,000, Freelance +$5,281)
- Lint limpio, sin errores de runtime

Stage Summary:
- Menú lateral arreglado: "Agregar movimiento" abre el formulario
- Ingresos completamente integrados: registro, categorías separadas, balance correcto, dashboard, movimientos, stats
- Color coding: verde para ingresos, rojo para egresos

---
Task ID: 9
Agent: main
Task: Arreglar creación de subcategorías y edición de categorías

Work Log:
- APIs nuevas:
  - PATCH /api/categories/[id]: actualiza name, icon, color, type
  - DELETE /api/categories/[id]: elimina categoría (valida que no tenga gastos asociados)
  - POST /api/categories/[id]/subcategories: crea subcategoría (valida duplicados)
  - PATCH /api/subcategories/[id]: renombra subcategoría
  - DELETE /api/subcategories/[id]: elimina subcategoría (valida gastos asociados)
- Data provider (server + local): añadidos updateCategory, deleteCategory, createSubcategory, updateSubcategory, deleteSubcategory
- Mutations en hooks.ts: añadidas las 5 nuevas mutaciones
- Schema Dexie bump v1→v2: añadido índice subcategoryId en expenses para consultas
- Vista Categorías reescrita:
  - CategoryCard ahora recibe handlers: onUpdate, onDelete, onAddSubcategory, onDeleteSubcategory, onRenameSubcategory
  - Botón editar (lápiz) abre EditCategoryDialog con datos precargados
  - Botón eliminar (trash) abre AlertDialog de confirmación
  - Input + botón "Agregar" para crear subcategorías inline (Enter o click)
  - Cada subcategoría tiene botones de renombrar (lápiz, edita inline) y eliminar (trash)
  - Validación: no permite eliminar categorías/subcategorías con gastos asociados
  - EditCategoryDialog: reutiliza CategoryFormFields (compartido con AddCategoryDialog)
  - Vista previa en tiempo real en ambos diálogos

Verificación con Agent Browser:
- Agregar subcategoría "Test Subcat" a Conveniencia → toast "Subcategoría 'Test Subcat' agregada", contador cambió de 0 sub a 1 sub
- Editar categoría "Café" → renombrada a "Cafeterías" → toast "Categoría actualizada"
- Eliminar subcategoría "Test Subcat" → toast "Subcategoría 'Test Subcat' eliminada", contador volvió a 0 sub
- Lint limpio, sin errores de runtime

Stage Summary:
- Subcategorías: crear, renombrar y eliminar funcionales
- Categorías: editar (nombre, icono, color, tipo) y eliminar funcionales
- Validaciones de integridad: no permite eliminar si hay gastos asociados
- UI inline para subcategorías (sin modales), diálogos para categorías

---
Task ID: 10
Agent: main
Task: Arreglar campo Comercio no editable en formulario de agregar gasto

Work Log:
- Causa raíz: el Input del campo Comercio estaba envuelto en `<PopoverTrigger asChild>`, lo que hace que Radix UI intercepte los eventos de pointer/focus del input (le asigna role="button" y captura clicks para toggle del popover), impidiendo escribir normalmente.
- Solución: reemplazado el Popover por un dropdown con posicionamiento absoluto (relative/absolute), patrón estándar para autocompletado:
  - Input dentro de un div.relative
  - Dropdown condicional renderizado con `absolute z-50 top-full` cuando hay sugerencias
  - onFocus abre el dropdown si hay resultados
  - onBlur cierra con delay de 150ms (para permitir click en sugerencias)
  - Sugerencias usan onMouseDown con preventDefault (evita que el blur cierre antes del click)
  - autoComplete="off" para evitar interferencia del autocompletado del navegador
- El Popover import se mantiene (se sigue usando para el calendario de fecha)

Verificación con Agent Browser:
- Campo Comercio ahora es editable: escribió "Starbucks" → value = "Starbucks" ✅
- Autocompletado aparece: sugerencia "Starbucks, Cafeterías · 3x usado" ✅
- Selección de sugerencia rellena: Comercio + Categoría (Cafeterías) + Método de pago (Tarjeta de crédito) ✅
- Texto libre funciona: escribió "Tienda nueva sin registrar" → value correcto ✅
- Lint limpio

Stage Summary:
- Campo Comercio ahora es completamente editable con autocompletado funcional
- Patrón de dropdown absoluto más robusto que Popover para inputs autocomplete

---
Task ID: 11
Agent: main
Task: Implementar vistas Semana y Año en Estadísticas

Work Log:
- Creado módulo stats-utils.ts con:
  - computeStatsFromExpenses(): calcula estadísticas completas a partir de un arreglo de gastos para cualquier rango
  - getPeriodRange(): calcula start/end según periodo (week/month/year)
  - getPrevPeriodRange(): calcula el rango del periodo anterior para comparación
  - shiftPeriod(): navega adelante/atrás según el periodo
  - formatPeriodLabel(): etiqueta legible ("3 Ago - 9 Ago", "2026", "agosto de 2026")
  - computeTrend(): genera datos de tendencia por día (mes), día de semana (semana), o mes (año)
- Data provider: añadido listExpensesRange(startISO, endISO) en server y local provider
- API /api/expenses GET: acepta parámetros start/end además de month (limit aumentado a 2000)
- Hook useStatsForPeriod(period, refDate): obtiene gastos del rango + rango anterior, calcula stats con computeStatsFromExpenses
- Vista Stats reescrita:
  - State: period (month/week/year) + refDate (Date)
  - Tabs controlados (value=period, onValueChange cambia periodo y resetea refDate)
  - Navegación prev/next usa shiftPeriod (7 días para semana, 1 mes para mes, 1 año para año)
  - Botón "Hoy" aparece si no estás en el periodo actual
  - Labels dinámicos: "Agosto De 2026" / "3 Ago - 9 Ago" / "2026"
  - Summary cards adaptativas: "Prom. semanal" → "Prom. mensual" en año, "Proyección mes" → "Proyección semana/año"
  - Gráfica de tendencia: AreaChart para mes (días 1-31), BarChart con labels para semana (Lun-Dom) y año (Ene-Dic)
  - Tabla de comparación: "vs {periodo anterior}" con label correcto
  - Eliminados los TabsContent con "próximamente"

Verificación con Agent Browser:
- Mes: "Agosto De 2026", 20 movimientos, $11.6k gastado ✅
- Semana: "3 Ago - 9 Ago", 15 movimientos, $8.0k gastado ✅ (gráfica muestra Lun-Dom)
- Año: "2026", 142 movimientos, $80.4k gastado ✅ (gráfica muestra Ene-Dic)
- Navegación: año anterior (2025) muestra "Sin movimientos", botón "Hoy" regresa al actual ✅
- Cambio entre pestañas: datos se recalculan correctamente para cada periodo ✅
- Lint limpio, sin errores

Stage Summary:
- Las tres vistas (Mes/Semana/Año) funcionan completamente con datos reales
- Navegación prev/next adaptativa según periodo
- Gráficas con labels apropiados (días del mes, días de la semana, meses del año)
- Comparación vs periodo anterior funciona para los tres rangos

---
Task ID: 12
Agent: main
Task: Añadir vistas Semana/Mes/Año al módulo de Movimientos

Work Log:
- Vista Movimientos reescrita con sistema de periodos (igual que Estadísticas):
  - State: period (month/week/year) + refDate (Date) + expenses local state
  - Tabs controlados: Mes / Semana / Año
  - Navegación prev/next adaptativa (7 días para semana, 1 mes para mes, 1 año para año)
  - Botón "Hoy" aparece cuando no estás en el periodo actual
  - Labels dinámicos: "Agosto De 2026" / "3 Ago - 9 Ago" / "2026"
- Carga de datos: useEffect que llama a dataProvider.listExpensesRange(start, end) según periodo
- Agrupación adaptativa según periodo:
  - Semana: agrupa por día de la semana ("MIÉRCOLES 5 AGO")
  - Mes: agrupa por día con formato relativo ("Hoy", "Ayer", "Hace X días", o fecha)
  - Año: agrupa por mes ("AGOSTO DE 2026")
- getGroupInfo() devuelve label + sortKey (timestamp) para ordenar grupos cronológicamente inverso
- Filtros preservados: búsqueda, tipo (Todos/Egresos/Ingresos), categoría, cuenta, método
- Summary card muestra totales del periodo seleccionado (egresos + ingresos)
- Eliminación de movimiento recarga la lista del periodo actual tras confirmar

Verificación con Agent Browser:
- Mes: "Agosto De 2026", 20 movimientos, agrupados por día (Hoy, Ayer, etc.) ✅
- Semana: "3 Ago - 9 Ago", 15 movimientos, agrupados por día de semana ("MIÉRCOLES 5 AGO" 7 movs) ✅
- Año: "2026", 142 movimientos, agrupados por mes ("AGOSTO DE 2026" 20 movs) ✅
- Navegación: año anterior (2025) → "0 movimientos" + botón "Hoy" ✅
- Botón "Hoy": regresa al periodo actual ✅
- Cambio entre pestañas: datos se recalculan correctamente ✅
- Lint limpio, sin errores

Stage Summary:
- Movimientos ahora soporta las tres vistas temporales como Estadísticas
- Agrupación inteligente según periodo (día relativo / día de semana / mes)
- Navegación y filtros consistentes con el resto de la app
