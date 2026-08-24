import { getLocalDB, localId, type LocalExpense, type LocalCategory, type LocalAccount, type LocalMerchant, type LocalBudget, type LocalSubscription, type LocalReminder, type LocalSavingsGoal, type LocalMerchantHint } from "./local-db";
import { useDataModeStore } from "./data-mode";
import { monthKey as mk, daysInMonth } from "./format";
import { DEFAULT_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from "./categories";
import { getRecurringType } from "./recurring-types";

// =============================================================================
// Tipos compartidos (iguales a los que devuelven las APIs REST)
// =============================================================================

export type Category = LocalCategory;
export type Account = LocalAccount;
export interface Merchant {
  id: string;
  name: string;
  normalizedName: string;
  defaultCategoryId?: string | null;
  defaultCategory?: Category | null;
  defaultPaymentMethod?: string | null;
  defaultAccountId?: string | null;
  useCount: number;
  suggestedCategories?: Array<{ category: Category; score: number }>;
}
export interface Expense {
  id: string;
  amount: number;
  type: string; // expense | income
  currency: string;
  date: string;
  categoryId: string;
  subcategoryId?: string | null;
  merchantId?: string | null;
  merchantName?: string | null;
  paymentMethod?: string | null;
  accountId?: string | null;
  notes?: string | null;
  tags: string;
  imageUrl?: string | null;
  ticketNumber?: string | null;
  rfc?: string | null;
  subtotal?: number | null;
  tax?: number | null;
  isRecurring: boolean;
  recurringName?: string | null;
  source: string;
  rawText?: string | null;
  createdAt: string;
  updatedAt: string;
  category: Category;
  subcategory?: { id: string; name: string } | null;
  merchant?: { id: string; name: string } | null;
  account?: Account | null;
}
export interface Budget extends LocalBudget {
  category?: Category;
}
export interface Subscription extends LocalSubscription {
  category?: Category | null;
  account?: Account | null;
}
export type SavingsGoal = LocalSavingsGoal;
export type Reminder = LocalReminder;

export interface Stats {
  month: string;
  summary: {
    totalBalance: number;
    totalSpent: number;
    totalIncome: number;
    prevTotalSpent: number;
    variation: number;
    totalBudget: number;
    budgetRemaining: number;
    budgetPercentage: number;
    totalSaved: number;
    monthlyGoal: number;
    expenseCount: number;
    incomeCount: number;
    avgDaily: number;
    avgWeekly: number;
    avgMonthly: number;
    projectedMonth: number;
    subscriptionsTotal: number;
  };
  topCategories: Array<{ name: string; color: string; icon: string; total: number; count: number }>;
  byDay: Array<{ day: number; total: number }>;
  byMethod: Array<{ method: string; total: number }>;
  topMerchants: Array<{ name: string; total: number }>;
  byAccount: Array<{ name: string; total: number; color: string }>;
  budgetUsage: Array<{
    id: string;
    categoryId: string;
    categoryName: string;
    categoryColor: string;
    categoryIcon: string;
    amount: number;
    spent: number;
    remaining: number;
    percentage: number;
  }>;
  categoryComparison: Array<{
    name: string;
    color: string;
    icon: string;
    total: number;
    count: number;
    categoryId: string;
    prev: number;
    variation: number;
  }>;
  goals: SavingsGoal[];
  recentExpenses: Expense[];
}

export interface CreateExpenseInput {
  amount: number;
  type?: string; // expense | income
  currency?: string;
  date: string;
  categoryId: string;
  subcategoryId?: string | null;
  merchantName?: string | null;
  paymentMethod?: string | null;
  accountId?: string | null;
  notes?: string | null;
  tags?: string[] | string;
  imageUrl?: string | null;
  ticketNumber?: string | null;
  rfc?: string | null;
  subtotal?: number | null;
  tax?: number | null;
  isRecurring?: boolean;
  recurringName?: string | null;
  source?: string;
  rawText?: string | null;
}

// =============================================================================
// Helper: ¿estamos en modo local?
// =============================================================================

export function isLocalMode(): boolean {
  return useDataModeStore.getState().mode === "local";
}

// =============================================================================
// Server provider (usa fetch a /api/*)
// =============================================================================

const serverProvider = {
  async listCategories(): Promise<Category[]> {
    const r = await fetch("/api/categories");
    const d = await r.json();
    return d.categories;
  },
  async createCategory(data: { name: string; icon?: string; color?: string; type?: string }): Promise<Category> {
    const r = await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const d = await r.json();
    return d.category;
  },
  async updateCategory(id: string, data: { name?: string; icon?: string; color?: string; type?: string }): Promise<Category> {
    const r = await fetch(`/api/categories/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Error al actualizar");
    return d.category;
  },
  async deleteCategory(id: string): Promise<void> {
    const r = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (!r.ok) {
      const d = await r.json();
      throw new Error(d.error || "Error al eliminar");
    }
  },
  async createSubcategory(categoryId: string, name: string): Promise<{ id: string; name: string; categoryId: string }> {
    const r = await fetch(`/api/categories/${categoryId}/subcategories`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Error al crear subcategoría");
    return d.subcategory;
  },
  async updateSubcategory(id: string, name: string): Promise<{ id: string; name: string }> {
    const r = await fetch(`/api/subcategories/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Error al actualizar");
    return d.subcategory;
  },
  async deleteSubcategory(id: string): Promise<void> {
    const r = await fetch(`/api/subcategories/${id}`, { method: "DELETE" });
    if (!r.ok) {
      const d = await r.json();
      throw new Error(d.error || "Error al eliminar");
    }
  },

  async listAccounts(): Promise<Account[]> {
    const r = await fetch("/api/accounts");
    const d = await r.json();
    return d.accounts;
  },
  async createAccount(data: Record<string, unknown>): Promise<Account> {
    const r = await fetch("/api/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const d = await r.json();
    return d.account;
  },
  async updateAccount(id: string, data: Record<string, unknown>): Promise<Account> {
    const r = await fetch(`/api/accounts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Error al actualizar");
    return d.account;
  },
  async deleteAccount(id: string): Promise<void> {
    const r = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    if (!r.ok) {
      const d = await r.json();
      throw new Error(d.error || "Error al eliminar");
    }
  },

  async listMerchants(q: string): Promise<Merchant[]> {
    const r = await fetch(`/api/merchants?q=${encodeURIComponent(q)}`);
    const d = await r.json();
    return d.merchants;
  },

  async listExpenses(month: string, filters?: Record<string, string>): Promise<Expense[]> {
    const params = new URLSearchParams();
    if (month) params.set("month", month);
    if (filters) Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
    const r = await fetch(`/api/expenses?${params.toString()}`);
    const d = await r.json();
    return d.expenses;
  },
  async listExpensesRange(startISO: string, endISO: string): Promise<Expense[]> {
    const params = new URLSearchParams();
    params.set("start", startISO);
    params.set("end", endISO);
    const r = await fetch(`/api/expenses?${params.toString()}`);
    const d = await r.json();
    return d.expenses;
  },
  async createExpense(data: CreateExpenseInput): Promise<Expense> {
    const r = await fetch("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const d = await r.json();
    return d.expense;
  },
  async updateExpense(id: string, data: Record<string, unknown>): Promise<Expense> {
    const r = await fetch(`/api/expenses/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const d = await r.json();
    return d.expense;
  },
  async deleteExpense(id: string): Promise<void> {
    await fetch(`/api/expenses/${id}`, { method: "DELETE" });
  },

  async listBudgets(): Promise<Budget[]> {
    const r = await fetch("/api/budgets");
    const d = await r.json();
    return d.budgets;
  },
  async createBudget(data: { categoryId: string; amount: number; period?: string; month?: string }): Promise<Budget> {
    const r = await fetch("/api/budgets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const d = await r.json();
    return d.budget;
  },
  async deleteBudget(id: string): Promise<void> {
    await fetch(`/api/budgets?id=${id}`, { method: "DELETE" });
  },

  async listSubscriptions(): Promise<Subscription[]> {
    const r = await fetch("/api/subscriptions");
    const d = await r.json();
    return d.subscriptions;
  },
  async createSubscription(data: Record<string, unknown>): Promise<Subscription> {
    const r = await fetch("/api/subscriptions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const d = await r.json();
    return d.subscription;
  },
  async updateSubscription(id: string, data: Record<string, unknown>): Promise<Subscription> {
    const r = await fetch("/api/subscriptions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...data }) });
    const d = await r.json();
    return d.subscription;
  },
  async deleteSubscription(id: string): Promise<void> {
    await fetch(`/api/subscriptions?id=${id}`, { method: "DELETE" }).catch(() => {
      // fallback: marcar inactiva
      return this.updateSubscription(id, { active: false });
    });
  },
  async processSubscriptions(): Promise<{ charged: number; reminders: number; advanced: number; details: Array<{ name: string; action: string; amount?: number }> }> {
    const r = await fetch("/api/subscriptions/process", { method: "POST" });
    return r.json();
  },

  async listGoals(): Promise<SavingsGoal[]> {
    const r = await fetch("/api/goals");
    const d = await r.json();
    return d.goals;
  },
  async createGoal(data: Record<string, unknown>): Promise<SavingsGoal> {
    const r = await fetch("/api/goals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const d = await r.json();
    return d.goal;
  },
  async updateGoal(id: string, data: Record<string, unknown>): Promise<SavingsGoal> {
    const r = await fetch("/api/goals", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...data }) });
    const d = await r.json();
    return d.goal;
  },
  async deleteGoal(id: string): Promise<void> {
    await fetch(`/api/goals?id=${id}`, { method: "DELETE" });
  },

  async listReminders(): Promise<Reminder[]> {
    const r = await fetch("/api/reminders");
    const d = await r.json();
    return d.reminders;
  },
  async createReminder(data: Record<string, unknown>): Promise<Reminder> {
    const r = await fetch("/api/reminders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const d = await r.json();
    return d.reminder;
  },
  async updateReminder(id: string, data: Record<string, unknown>): Promise<Reminder> {
    const r = await fetch("/api/reminders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...data }) });
    const d = await r.json();
    return d.reminder;
  },
  async deleteReminder(id: string): Promise<void> {
    await fetch(`/api/reminders?id=${id}`, { method: "DELETE" });
  },

  async getStats(month: string): Promise<Stats> {
    const r = await fetch(`/api/stats?month=${month}`);
    return r.json();
  },

  async bulkImport(expenses: Array<Record<string, unknown>>): Promise<{ created: number; failed: number; total: number; merchantsCreated: number }> {
    const r = await fetch("/api/expenses/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expenses }) });
    const d = await r.json();
    return { created: d.created, failed: d.failed, total: d.total, merchantsCreated: d.merchantsCreated };
  },
};

// =============================================================================
// Local provider (usa IndexedDB vía Dexie)
// =============================================================================

async function ensureLocalSeed() {
  const db = await getLocalDB();
  const seeded = await db.meta.get("seeded");
  if (seeded) {
    // Incluso si ya está sembrado, limpiar duplicados
    await cleanDuplicateCategories(db);
    return;
  }

  // === NUEVA INSTALACIÓN: BASE DE DATOS LIMPIA ===
  // Solo categorías por defecto + cuenta de efectivo
  // NO crear gastos, suscripciones, metas, recordatorios ni presupuestos de ejemplo

  // Categorías de egreso por defecto
  const cats: LocalCategory[] = [];
  for (const c of DEFAULT_CATEGORIES) {
    cats.push({
      id: localId(),
      name: c.name,
      icon: c.icon,
      color: c.color,
      type: "expense",
      isDefault: true,
      subcategories: [],
      createdAt: new Date().toISOString(),
    });
  }
  // Asegurar "Conveniencia"
  if (!cats.find((c) => c.name === "Conveniencia")) {
    cats.push({
      id: localId(),
      name: "Conveniencia",
      icon: "ShoppingCart",
      color: "amber",
      type: "expense",
      isDefault: true,
      subcategories: [],
      createdAt: new Date().toISOString(),
    });
  }
  // Categorías de ingreso
  for (const ic of DEFAULT_INCOME_CATEGORIES) {
    if (!cats.find((c) => c.name.toLowerCase() === ic.name.toLowerCase())) {
      cats.push({
        id: localId(),
        name: ic.name,
        icon: ic.icon,
        color: ic.color,
        type: "income",
        isDefault: true,
        subcategories: [],
        createdAt: new Date().toISOString(),
      });
    }
  }
  await db.categories.bulkPut(cats);

  // Única cuenta: Efectivo con saldo $0
  await db.accounts.put({
    id: localId(),
    name: "Efectivo",
    type: "cash",
    balance: 0,
    currency: "MXN",
    color: "emerald",
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await db.meta.put({ key: "seeded", value: true });
}

// Limpiar categorías duplicadas — mantiene solo la primera de cada nombre
async function cleanDuplicateCategories(db: Awaited<ReturnType<typeof getLocalDB>>): Promise<void> {
  const allCats = await db.categories.toArray();
  const seen = new Map<string, LocalCategory>();
  const toDelete: string[] = [];

  for (const cat of allCats) {
    const key = cat.name.toLowerCase();
    if (seen.has(key)) {
      // Duplicado — eliminar el más reciente
      toDelete.push(cat.id);
    } else {
      seen.set(key, cat);
    }
  }

  if (toDelete.length > 0) {
    await db.categories.bulkDelete(toDelete);
  }
}

async function resolveExpense(e: LocalExpense): Promise<Expense> {
  const db = await getLocalDB();
  const category = (await db.categories.get(e.categoryId))!;
  const subcategory = e.subcategoryId
    ? category?.subcategories.find((s) => s.id === e.subcategoryId)
    : null;
  const merchant = e.merchantId ? await db.merchants.get(e.merchantId) : undefined;
  const account = e.accountId ? await db.accounts.get(e.accountId) : undefined;
  return {
    ...e,
    category: category || { id: e.categoryId, name: "Otros", icon: "Wallet", color: "slate", type: "expense", isDefault: false, subcategories: [], createdAt: "" },
    subcategory: subcategory ? { id: subcategory.id, name: subcategory.name } : null,
    merchant: merchant ? { id: merchant.id, name: merchant.name } : null,
    account: account || null,
  };
}

const localProvider = {
  async listCategories(): Promise<Category[]> {
    await ensureLocalSeed();
    const db = await getLocalDB();
    const cats = await db.categories.toArray();
    return cats.sort((a, b) => a.name.localeCompare(b.name));
  },
  async createCategory(data: { name: string; icon?: string; color?: string; type?: string }): Promise<Category> {
    const db = await getLocalDB();
    const cat: LocalCategory = {
      id: localId(),
      name: data.name,
      icon: data.icon || "Wallet",
      color: data.color || "emerald",
      type: data.type || "expense",
      isDefault: false,
      subcategories: [],
      createdAt: new Date().toISOString(),
    };
    await db.categories.put(cat);
    return cat;
  },
  async updateCategory(id: string, data: { name?: string; icon?: string; color?: string; type?: string }): Promise<Category> {
    const db = await getLocalDB();
    const cat = await db.categories.get(id);
    if (!cat) throw new Error("Categoría no encontrada");
    if (data.name !== undefined) cat.name = String(data.name).trim();
    if (data.icon !== undefined) cat.icon = String(data.icon);
    if (data.color !== undefined) cat.color = String(data.color);
    if (data.type !== undefined) cat.type = String(data.type);
    if (!cat.name) throw new Error("El nombre no puede estar vacío");
    await db.categories.put(cat);
    return cat;
  },
  async deleteCategory(id: string): Promise<void> {
    const db = await getLocalDB();
    const count = await db.expenses.where("categoryId").equals(id).count();
    if (count > 0) {
      throw new Error(`No se puede eliminar: hay ${count} gasto(s) asociado(s) a esta categoría.`);
    }
    await db.categories.delete(id);
  },
  async createSubcategory(categoryId: string, name: string): Promise<{ id: string; name: string; categoryId: string }> {
    const db = await getLocalDB();
    const cat = await db.categories.get(categoryId);
    if (!cat) throw new Error("Categoría no encontrada");
    const trimmed = name.trim();
    if (!trimmed) throw new Error("El nombre es obligatorio");
    if (cat.subcategories.find((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
      throw new Error("Ya existe una subcategoría con ese nombre");
    }
    const sub = { id: localId(), name: trimmed, categoryId };
    cat.subcategories.push(sub);
    await db.categories.put(cat);
    return sub;
  },
  async updateSubcategory(id: string, name: string): Promise<{ id: string; name: string }> {
    const db = await getLocalDB();
    const trimmed = name.trim();
    if (!trimmed) throw new Error("El nombre no puede estar vacío");
    const cats = await db.categories.toArray();
    for (const cat of cats) {
      const sub = cat.subcategories.find((s) => s.id === id);
      if (sub) {
        sub.name = trimmed;
        await db.categories.put(cat);
        return { id, name: trimmed };
      }
    }
    throw new Error("Subcategoría no encontrada");
  },
  async deleteSubcategory(id: string): Promise<void> {
    const db = await getLocalDB();
    const count = await db.expenses.where("subcategoryId").equals(id).count();
    if (count > 0) {
      throw new Error(`No se puede eliminar: hay ${count} gasto(s) asociado(s) a esta subcategoría.`);
    }
    const cats = await db.categories.toArray();
    for (const cat of cats) {
      const idx = cat.subcategories.findIndex((s) => s.id === id);
      if (idx !== -1) {
        cat.subcategories.splice(idx, 1);
        await db.categories.put(cat);
        return;
      }
    }
  },

  async listAccounts(): Promise<Account[]> {
    await ensureLocalSeed();
    const db = await getLocalDB();
    const accs = await db.accounts.toArray();
    return accs.sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
  },
  async createAccount(data: Record<string, unknown>): Promise<Account> {
    const db = await getLocalDB();
    const acc: LocalAccount = {
      id: localId(),
      name: String(data.name),
      type: String(data.type),
      balance: Number(data.balance || 0),
      currency: String(data.currency || "MXN"),
      color: String(data.color || "emerald"),
      bank: data.bank ? String(data.bank) : null,
      last4: data.last4 ? String(data.last4) : null,
      creditLimit: data.creditLimit ? Number(data.creditLimit) : null,
      dueDay: data.dueDay ? Number(data.dueDay) : null,
      isDefault: Boolean(data.isDefault),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.accounts.put(acc);
    return acc;
  },
  async updateAccount(id: string, data: Record<string, unknown>): Promise<Account> {
    const db = await getLocalDB();
    const acc = await db.accounts.get(id);
    if (!acc) throw new Error("Cuenta no encontrada");
    if (data.name !== undefined) acc.name = String(data.name);
    if (data.type !== undefined) acc.type = String(data.type);
    if (data.balance !== undefined) acc.balance = Number(data.balance);
    if (data.currency !== undefined) acc.currency = String(data.currency);
    if (data.color !== undefined) acc.color = String(data.color);
    if (data.bank !== undefined) acc.bank = data.bank ? String(data.bank) : null;
    if (data.last4 !== undefined) acc.last4 = data.last4 ? String(data.last4) : null;
    if (data.creditLimit !== undefined) acc.creditLimit = data.creditLimit ? Number(data.creditLimit) : null;
    if (data.dueDay !== undefined) acc.dueDay = data.dueDay ? Number(data.dueDay) : null;
    if (data.isDefault !== undefined) acc.isDefault = Boolean(data.isDefault);
    acc.updatedAt = new Date().toISOString();
    await db.accounts.put(acc);
    return acc;
  },
  async deleteAccount(id: string): Promise<void> {
    const db = await getLocalDB();
    const count = await db.expenses.where("accountId").equals(id).count();
    if (count > 0) {
      throw new Error(`No se puede eliminar: esta cuenta tiene ${count} movimiento(s) asociado(s). Elimina o reasigna esos movimientos primero.`);
    }
    await db.accounts.delete(id);
  },

  async listMerchants(q: string): Promise<Merchant[]> {
    const db = await getLocalDB();
    let merchants: LocalMerchant[];
    if (!q.trim()) {
      merchants = await db.merchantHints.toArray().then(async (hints) => {
        const ids = [...new Set(hints.map((h) => h.merchantId))];
        return db.merchants.bulkGet(ids).then((ms) => ms.filter(Boolean) as LocalMerchant[]);
      });
    } else {
      const norm = q.toLowerCase().trim();
      const all = await db.merchants.toArray();
      merchants = all.filter(
        (m) => m.normalizedName.includes(norm) || m.name.toLowerCase().includes(q.toLowerCase())
      );
    }
    merchants.sort((a, b) => b.useCount - a.useCount);
    const result: Merchant[] = [];
    for (const m of merchants.slice(0, 10)) {
      const hints = (await db.merchantHints.where("merchantId").equals(m.id).toArray()).sort((a, b) => b.score - a.score);
      const cats = (await db.categories.bulkGet(hints.map((h) => h.categoryId))).filter(Boolean) as LocalCategory[];
      const defaultCat = m.defaultCategoryId ? await db.categories.get(m.defaultCategoryId) : null;
      result.push({
        ...m,
        defaultCategory: defaultCat || null,
        suggestedCategories: hints.slice(0, 3).map((h, i) => ({
          category: cats[i],
          score: h.score,
        })).filter((s) => s.category),
      });
    }
    return result;
  },

  async listExpenses(month: string, filters?: Record<string, string>): Promise<Expense[]> {
    await ensureLocalSeed();
    const db = await getLocalDB();
    const [y, m] = month.split("-").map(Number);
    // Usar strings ISO para comparación lexicográfica (Dexie indexa el campo date como string)
    const startISO = new Date(y, m - 1, 1).toISOString();
    const endISO = new Date(y, m, 0, 23, 59, 59, 999).toISOString();
    let expenses = await db.expenses.where("date").between(startISO, endISO, true, true).toArray();
    // Filtros
    if (filters?.categoryId) expenses = expenses.filter((e) => e.categoryId === filters.categoryId);
    if (filters?.accountId) expenses = expenses.filter((e) => e.accountId === filters.accountId);
    if (filters?.merchantId) expenses = expenses.filter((e) => e.merchantId === filters.merchantId);
    if (filters?.q) {
      const q = filters.q.toLowerCase();
      expenses = expenses.filter((e) =>
        (e.merchantName || "").toLowerCase().includes(q) ||
        (e.notes || "").toLowerCase().includes(q) ||
        e.tags.toLowerCase().includes(q)
      );
    }
    expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return Promise.all(expenses.map(resolveExpense));
  },

  async listExpensesRange(startISO: string, endISO: string): Promise<Expense[]> {
    await ensureLocalSeed();
    const db = await getLocalDB();
    let expenses = await db.expenses.where("date").between(startISO, endISO, true, true).toArray();
    expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return Promise.all(expenses.map(resolveExpense));
  },

  async createExpense(data: CreateExpenseInput): Promise<Expense> {
    const db = await getLocalDB();
    await ensureLocalSeed();

    // Asegurar categoryId (necesario para guardar)
    let categoryId = data.categoryId;
    if (!categoryId) {
      // Buscar una categoría por defecto según el tipo
      const cats = await db.categories.toArray();
      const desiredType = String(data.type || "expense").toLowerCase() === "income" ? "income" : "expense";
      const fallback = cats.find((c) => c.type === desiredType) || cats.find((c) => c.isDefault) || cats[0];
      categoryId = fallback?.id || "unknown";
    }

    // Crear/actualizar comercio
    let merchantId: string | null = null;
    let merchantName = data.merchantName?.trim() || null;
    if (merchantName) {
      const normalized = merchantName.toLowerCase();
      let merchant = await db.merchants.where("normalizedName").equals(normalized).first();
      if (!merchant) {
        merchant = {
          id: localId(),
          name: merchantName,
          normalizedName: normalized,
          defaultCategoryId: categoryId,
          defaultPaymentMethod: data.paymentMethod || null,
          defaultAccountId: data.accountId || null,
          useCount: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await db.merchants.put(merchant);
      } else {
        merchant.useCount += 1;
        await db.merchants.put(merchant);
      }
      merchantId = merchant.id;

      // Actualizar hint de aprendizaje (solo si categoryId es válido)
      if (categoryId && categoryId !== "unknown") {
        try {
          const existingHint = await db.merchantHints.where("[merchantId+categoryId]").equals([merchantId, categoryId]).first();
          if (existingHint) {
            existingHint.score += 1;
            await db.merchantHints.put(existingHint);
          } else {
            const hint: LocalMerchantHint = {
              id: localId(),
              merchantId,
              categoryId,
              score: 1,
            };
            await db.merchantHints.put(hint);
          }
        } catch {
          // ignorar errores de índice si categoryId es inválido
        }
      }
    }

    const now = new Date().toISOString();
    // Aceptar expense | income | transfer (transfer se guarda como expense para no romper balances)
    const rawType = String(data.type || "expense").toLowerCase();
    const type = rawType === "income" ? "income" : "expense";
    const e: LocalExpense = {
      id: localId(),
      amount: Number(data.amount),
      type,
      currency: data.currency || "MXN",
      date: new Date(data.date).toISOString(),
      categoryId,
      subcategoryId: data.subcategoryId || null,
      merchantId,
      merchantName,
      paymentMethod: data.paymentMethod || null,
      accountId: data.accountId || null,
      notes: data.notes || null,
      tags: Array.isArray(data.tags) ? data.tags.join(",") : (data.tags as string) || "",
      imageUrl: data.imageUrl || null,
      ticketNumber: data.ticketNumber || null,
      rfc: data.rfc || null,
      subtotal: data.subtotal || null,
      tax: data.tax || null,
      isRecurring: data.isRecurring || false,
      recurringName: data.recurringName || null,
      source: data.source || "manual",
      rawText: data.rawText || null,
      createdAt: now,
      updatedAt: now,
    };
    await db.expenses.put(e);

    // Actualizar balance de cuenta: ingresos suman, egresos restan
    // (transferencias se tratan como egreso en la cuenta origen; el ingreso a destino
    // se maneja por separado en el diálogo de transferencia)
    if (data.accountId) {
      const acc = await db.accounts.get(data.accountId);
      if (acc) {
        const delta = type === "income" ? Number(data.amount) : -Number(data.amount);
        acc.balance += delta;
        acc.updatedAt = now;
        await db.accounts.put(acc);
      }
    }

    return resolveExpense(e);
  },

  async updateExpense(id: string, data: Record<string, unknown>): Promise<Expense> {
    const db = await getLocalDB();
    const e = await db.expenses.get(id);
    if (!e) throw new Error("Gasto no encontrado");
    const prevAmount = e.amount;
    const prevAccount = e.accountId;

    if (data.amount !== undefined) e.amount = Number(data.amount);
    if (data.date !== undefined) e.date = new Date(String(data.date)).toISOString();
    if (data.categoryId !== undefined) e.categoryId = String(data.categoryId);
    if (data.subcategoryId !== undefined) e.subcategoryId = data.subcategoryId ? String(data.subcategoryId) : null;
    if (data.merchantName !== undefined) e.merchantName = data.merchantName ? String(data.merchantName) : null;
    if (data.paymentMethod !== undefined) e.paymentMethod = data.paymentMethod ? String(data.paymentMethod) : null;
    if (data.accountId !== undefined) e.accountId = data.accountId ? String(data.accountId) : null;
    if (data.notes !== undefined) e.notes = data.notes ? String(data.notes) : null;
    if (data.tags !== undefined) e.tags = Array.isArray(data.tags) ? data.tags.join(",") : String(data.tags);
    e.updatedAt = new Date().toISOString();
    await db.expenses.put(e);

    // Ajustar balances
    const newAmount = e.amount;
    const newAccount = e.accountId;
    if (prevAccount === newAccount && newAmount !== prevAmount && newAccount) {
      const acc = await db.accounts.get(newAccount);
      if (acc) {
        acc.balance -= (newAmount - prevAmount);
        await db.accounts.put(acc);
      }
    } else if (prevAccount !== newAccount) {
      if (prevAccount) {
        const acc = await db.accounts.get(prevAccount);
        if (acc) { acc.balance += prevAmount; await db.accounts.put(acc); }
      }
      if (newAccount) {
        const acc = await db.accounts.get(newAccount);
        if (acc) { acc.balance -= newAmount; await db.accounts.put(acc); }
      }
    }
    return resolveExpense(e);
  },

  async deleteExpense(id: string): Promise<void> {
    const db = await getLocalDB();
    const e = await db.expenses.get(id);
    if (!e) return;
    if (e.accountId) {
      const acc = await db.accounts.get(e.accountId);
      if (acc) {
        acc.balance += e.amount;
        await db.accounts.put(acc);
      }
    }
    await db.expenses.delete(id);
  },

  async listBudgets(): Promise<Budget[]> {
    const db = await getLocalDB();
    const month = mk();
    const budgets = await db.budgets.where("month").equals(month).toArray();
    const cats = await db.categories.toArray();
    return budgets.map((b) => ({ ...b, category: cats.find((c) => c.id === b.categoryId) }));
  },
  async createBudget(data: { categoryId: string; amount: number; period?: string; month?: string }): Promise<Budget> {
    const db = await getLocalDB();
    const month = data.month || mk();
    const existing = await db.budgets.where("[categoryId+period+month]").equals([data.categoryId, data.period || "monthly", month]).first();
    if (existing) {
      existing.amount = Number(data.amount);
      existing.updatedAt = new Date().toISOString();
      await db.budgets.put(existing);
      const cat = await db.categories.get(existing.categoryId);
      return { ...existing, category: cat };
    }
    const b: LocalBudget = {
      id: localId(),
      categoryId: data.categoryId,
      amount: Number(data.amount),
      period: data.period || "monthly",
      month,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.budgets.put(b);
    const cat = await db.categories.get(b.categoryId);
    return { ...b, category: cat };
  },
  async deleteBudget(id: string): Promise<void> {
    const db = await getLocalDB();
    await db.budgets.delete(id);
  },

  async listSubscriptions(): Promise<Subscription[]> {
    const db = await getLocalDB();
    const subs = await db.subscriptions.toArray();
    const cats = await db.categories.toArray();
    const accs = await db.accounts.toArray();
    return subs.sort((a, b) => new Date(a.nextDate).getTime() - new Date(b.nextDate).getTime()).map((s) => ({
      ...s,
      category: cats.find((c) => c.id === s.categoryId) || null,
      account: accs.find((a) => a.id === s.accountId) || null,
    }));
  },
  async createSubscription(data: Record<string, unknown>): Promise<Subscription> {
    const db = await getLocalDB();
    const s: LocalSubscription = {
      id: localId(),
      name: String(data.name),
      type: String(data.type || "subscription"),
      merchantName: data.merchantName ? String(data.merchantName) : null,
      amount: Number(data.amount),
      currency: String(data.currency || "MXN"),
      period: String(data.period || "monthly"),
      nextDate: new Date(String(data.nextDate)).toISOString(),
      categoryId: data.categoryId ? String(data.categoryId) : null,
      accountId: data.accountId ? String(data.accountId) : null,
      active: data.active !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.subscriptions.put(s);
    return s;
  },
  async updateSubscription(id: string, data: Record<string, unknown>): Promise<Subscription> {
    const db = await getLocalDB();
    const s = await db.subscriptions.get(id);
    if (!s) throw new Error("Transacción recurrente no encontrada");
    if (data.name !== undefined) s.name = String(data.name);
    if (data.type !== undefined) s.type = String(data.type);
    if (data.merchantName !== undefined) {
      s.merchantName = data.merchantName ? String(data.merchantName) : null;
    }
    if (data.amount !== undefined) s.amount = Number(data.amount);
    if (data.currency !== undefined) s.currency = String(data.currency);
    if (data.period !== undefined) s.period = String(data.period);
    if (data.nextDate !== undefined) s.nextDate = new Date(String(data.nextDate)).toISOString();
    if (data.active !== undefined) s.active = Boolean(data.active);
    if (data.categoryId !== undefined) s.categoryId = data.categoryId ? String(data.categoryId) : null;
    if (data.accountId !== undefined) s.accountId = data.accountId ? String(data.accountId) : null;
    s.updatedAt = new Date().toISOString();
    await db.subscriptions.put(s);
    return s;
  },
  async deleteSubscription(id: string): Promise<void> {
    const db = await getLocalDB();
    await db.subscriptions.delete(id);
  },

  /**
   * Cobra/abona UNA recurrente específica.
   * Crea el movimiento, actualiza el balance y adelanta la fecha al siguiente periodo.
   * Solo se procesa UNA vez (el siguiente cobro será en la nueva fecha).
   */
  async chargeSubscription(id: string): Promise<{ success: boolean; error?: string }> {
    const db = await getLocalDB();
    const sub = await db.subscriptions.get(id);
    if (!sub) return { success: false, error: "Recurrente no encontrada" };
    if (!sub.active) return { success: false, error: "La recurrente está pausada" };

    const now = new Date();
    const cats = await db.categories.toArray();
    const allAccounts = await db.accounts.toArray();

    const rt = getRecurringType(sub.type || "subscription");
    const isIncome = rt.transactionType === "income";
    const isTransfer = rt.transactionType === "transfer";
    const expenseType = isIncome ? "income" : "expense";

    // Para transferencias: buscar categorías y cuenta destino
    const expenseCats = cats.filter((c) => c.type === "expense");
    const incomeCats = cats.filter((c) => c.type === "income");
    const transferExpenseCat =
      expenseCats.find((c) => c.name === "Transferencia") ||
      expenseCats.find((c) => c.name === "Otros") ||
      expenseCats[0];
    const transferIncomeCat =
      incomeCats.find((c) => c.name === "Transferencia") ||
      incomeCats.find((c) => c.name === "Otros ingresos") ||
      incomeCats.find((c) => c.name === "Otros") ||
      incomeCats[0];

    const destAccount = isTransfer && sub.merchantName
      ? allAccounts.find((a) => a.name === sub.merchantName)
      : null;

    const chargeDate = new Date(sub.nextDate);

    if (isTransfer) {
      // Transferencia: crear egreso en origen + ingreso en destino
      const concept = sub.name;
      const eOut: LocalExpense = {
        id: localId(),
        amount: sub.amount,
        type: "expense",
        currency: sub.currency,
        date: chargeDate.toISOString(),
        categoryId: transferExpenseCat?.id || sub.categoryId || cats[0]?.id || "",
        merchantName: concept,
        paymentMethod: "transfer",
        accountId: sub.accountId || null,
        notes: `Transferencia recurrente a ${destAccount?.name || "otra cuenta"}`,
        tags: "recurrente,transferencia",
        isRecurring: true,
        recurringName: sub.name,
        source: "subscription",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      await db.expenses.put(eOut);

      if (destAccount) {
        const eIn: LocalExpense = {
          id: localId(),
          amount: sub.amount,
          type: "income",
          currency: sub.currency,
          date: chargeDate.toISOString(),
          categoryId: transferIncomeCat?.id || "",
          merchantName: concept,
          paymentMethod: "transfer",
          accountId: destAccount.id,
          notes: `Transferencia recurrente desde ${allAccounts.find((a) => a.id === sub.accountId)?.name || "otra cuenta"}`,
          tags: "recurrente,transferencia",
          isRecurring: true,
          recurringName: sub.name,
          source: "subscription",
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        };
        await db.expenses.put(eIn);
      }

      // Actualizar balances
      if (sub.accountId) {
        const acc = await db.accounts.get(sub.accountId);
        if (acc) {
          acc.balance -= sub.amount;
          acc.updatedAt = now.toISOString();
          await db.accounts.put(acc);
        }
      }
      if (destAccount) {
        const acc = await db.accounts.get(destAccount.id);
        if (acc) {
          acc.balance += sub.amount;
          acc.updatedAt = now.toISOString();
          await db.accounts.put(acc);
        }
      }
    } else {
      // Gasto o ingreso normal
      const defaultCat = cats.find((c) => c.name === "Servicios") || cats.find((c) => c.name === "Otros") || cats[0];
      const e: LocalExpense = {
        id: localId(),
        amount: sub.amount,
        type: expenseType,
        currency: sub.currency,
        date: chargeDate.toISOString(),
        categoryId: sub.categoryId || defaultCat?.id || cats[0]?.id || "",
        merchantName: sub.merchantName || sub.name,
        paymentMethod: "credit",
        accountId: sub.accountId || null,
        notes: `Transacción: ${sub.name}`,
        tags: "recurrente",
        isRecurring: true,
        recurringName: sub.name,
        source: "subscription",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      await db.expenses.put(e);

      if (sub.accountId) {
        const acc = await db.accounts.get(sub.accountId);
        if (acc) {
          acc.balance += isIncome ? sub.amount : -sub.amount;
          acc.updatedAt = now.toISOString();
          await db.accounts.put(acc);
        }
      }
    }

    // Avanzar la fecha al siguiente periodo
    const nextDate = advanceDateLocal(chargeDate, sub.period);
    sub.nextDate = nextDate.toISOString();
    sub.updatedAt = now.toISOString();
    await db.subscriptions.put(sub);

    return { success: true };
  },

  async processSubscriptions(): Promise<{ charged: number; reminders: number; advanced: number; details: Array<{ name: string; action: string; amount?: number }> }> {
    const db = await getLocalDB();
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 86400000);
    const result = { charged: 0, reminders: 0, advanced: 0, details: [] as Array<{ name: string; action: string; amount?: number }> };

    const subs = (await db.subscriptions.toArray()).filter((s) => s.active);
    const cats = await db.categories.toArray();

    // Pre-cargar cuentas para resolver la cuenta destino de transferencias
    const allAccounts = await db.accounts.toArray();

    for (const sub of subs) {
      let nextDate = new Date(sub.nextDate);

      // Determinar si es ingreso, gasto o transferencia
      const rt = getRecurringType(sub.type || "subscription");
      const isIncome = rt.transactionType === "income";
      const isTransfer = rt.transactionType === "transfer";
      const expenseType = isIncome ? "income" : "expense";

      // Para transferencias: buscar categoría "Transferencia" u "Otros"
      const expenseCats = cats.filter((c) => c.type === "expense");
      const incomeCats = cats.filter((c) => c.type === "income");
      const transferExpenseCat =
        expenseCats.find((c) => c.name === "Transferencia") ||
        expenseCats.find((c) => c.name === "Otros") ||
        expenseCats[0];
      const transferIncomeCat =
        incomeCats.find((c) => c.name === "Transferencia") ||
        incomeCats.find((c) => c.name === "Otros ingresos") ||
        incomeCats.find((c) => c.name === "Otros") ||
        incomeCats[0];

      // Cuenta destino para transferencias (buscada por nombre en merchantName)
      const destAccount = isTransfer && sub.merchantName
        ? allAccounts.find((a) => a.name === sub.merchantName)
        : null;

      // 1. Procesar transacciones recurrentes vencidas
      while (nextDate.getTime() <= now.getTime()) {
        const defaultCat = cats.find((c) => c.name === "Servicios") || cats.find((c) => c.name === "Otros") || cats[0];

        if (isTransfer) {
          // Transferencia: crear egreso en origen + ingreso en destino
          const concept = sub.name;
          // Egreso desde la cuenta origen
          const eOut: LocalExpense = {
            id: localId(),
            amount: sub.amount,
            type: "expense",
            currency: sub.currency,
            date: new Date(nextDate).toISOString(),
            categoryId: transferExpenseCat?.id || sub.categoryId || defaultCat?.id || "",
            merchantName: concept,
            paymentMethod: "transfer",
            accountId: sub.accountId || null,
            notes: `Transferencia recurrente a ${destAccount?.name || "otra cuenta"}`,
            tags: "recurrente,transferencia",
            isRecurring: true,
            recurringName: sub.name,
            source: "subscription",
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
          };
          await db.expenses.put(eOut);

          // Ingreso a la cuenta destino
          if (destAccount) {
            const eIn: LocalExpense = {
              id: localId(),
              amount: sub.amount,
              type: "income",
              currency: sub.currency,
              date: new Date(nextDate).toISOString(),
              categoryId: transferIncomeCat?.id || "",
              merchantName: concept,
              paymentMethod: "transfer",
              accountId: destAccount.id,
              notes: `Transferencia recurrente desde ${allAccounts.find((a) => a.id === sub.accountId)?.name || "otra cuenta"}`,
              tags: "recurrente,transferencia",
              isRecurring: true,
              recurringName: sub.name,
              source: "subscription",
              createdAt: now.toISOString(),
              updatedAt: now.toISOString(),
            };
            await db.expenses.put(eIn);
          }

          // Actualizar balances: restar de origen, sumar a destino
          if (sub.accountId) {
            const acc = await db.accounts.get(sub.accountId);
            if (acc) {
              acc.balance -= sub.amount;
              acc.updatedAt = now.toISOString();
              await db.accounts.put(acc);
            }
          }
          if (destAccount) {
            const acc = await db.accounts.get(destAccount.id);
            if (acc) {
              acc.balance += sub.amount;
              acc.updatedAt = now.toISOString();
              await db.accounts.put(acc);
            }
          }
        } else {
          // Gasto o ingreso normal
          const e: LocalExpense = {
            id: localId(),
            amount: sub.amount,
            type: expenseType,
            currency: sub.currency,
            date: new Date(nextDate).toISOString(),
            categoryId: sub.categoryId || defaultCat?.id || "",
            merchantName: sub.merchantName || sub.name,
            paymentMethod: "credit",
            accountId: sub.accountId || null,
            notes: `Transacción: ${sub.name}`,
            tags: "recurrente",
            isRecurring: true,
            recurringName: sub.name,
            source: "subscription",
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
          };
          await db.expenses.put(e);

          // Actualizar balance: ingresos suman, gastos restan
          if (sub.accountId) {
            const acc = await db.accounts.get(sub.accountId);
            if (acc) {
              acc.balance += isIncome ? sub.amount : -sub.amount;
              acc.updatedAt = now.toISOString();
              await db.accounts.put(acc);
            }
          }
        }

        // Avanzar fecha
        nextDate = advanceDateLocal(nextDate, sub.period);
        result.charged++;
        result.advanced++;
        result.details.push({ name: sub.name, action: "charged", amount: sub.amount });
      }

      // Actualizar nextDate si avanzó
      if (nextDate.getTime() !== new Date(sub.nextDate).getTime()) {
        sub.nextDate = nextDate.toISOString();
        sub.updatedAt = now.toISOString();
        await db.subscriptions.put(sub);
      }

      // 2. Crear recordatorio si vence en 3 días
      if (nextDate.getTime() <= threeDaysFromNow.getTime() && nextDate.getTime() > now.getTime()) {
        const existing = await db.reminders.where("dueDate").between(now.toISOString(), nextDate.toISOString(), true, true).toArray();
        const alreadyExists = existing.some((r) => r.title.includes(sub.name));
        if (!alreadyExists) {
          await db.reminders.put({
            id: localId(),
            title: `Transacción recurrente por vencer: ${sub.name}`,
            type: "pay_service",
            dueDate: nextDate.toISOString(),
            done: false,
            notes: `Se cobrarán ${sub.amount} ${sub.currency} de tu transacción recurrente a ${sub.name}.`,
            createdAt: now.toISOString(),
          });
          result.reminders++;
          result.details.push({ name: sub.name, action: "reminder" });
        }
      }
    }

    return result;
  },

  async listGoals(): Promise<SavingsGoal[]> {
    const db = await getLocalDB();
    return db.goals.toArray().then((g) => g.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  },
  async createGoal(data: Record<string, unknown>): Promise<SavingsGoal> {
    const db = await getLocalDB();
    const g: LocalSavingsGoal = {
      id: localId(),
      name: String(data.name),
      target: Number(data.target),
      current: Number(data.current || 0),
      deadline: data.deadline ? new Date(String(data.deadline)).toISOString() : null,
      color: String(data.color || "emerald"),
      icon: String(data.icon || "Target"),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.goals.put(g);
    return g;
  },
  async updateGoal(id: string, data: Record<string, unknown>): Promise<SavingsGoal> {
    const db = await getLocalDB();
    const g = await db.goals.get(id);
    if (!g) throw new Error("Meta no encontrada");
    if (data.name !== undefined) g.name = String(data.name);
    if (data.target !== undefined) g.target = Number(data.target);
    if (data.current !== undefined) g.current = Number(data.current);
    if (data.deadline !== undefined) g.deadline = data.deadline ? new Date(String(data.deadline)).toISOString() : null;
    g.updatedAt = new Date().toISOString();
    await db.goals.put(g);
    return g;
  },
  async deleteGoal(id: string): Promise<void> {
    const db = await getLocalDB();
    await db.goals.delete(id);
  },

  async listReminders(): Promise<Reminder[]> {
    const db = await getLocalDB();
    return db.reminders.toArray().then((r) => r.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()));
  },
  async createReminder(data: Record<string, unknown>): Promise<Reminder> {
    const db = await getLocalDB();
    const r: LocalReminder = {
      id: localId(),
      title: String(data.title),
      type: String(data.type || "register"),
      dueDate: new Date(String(data.dueDate)).toISOString(),
      done: false,
      notes: data.notes ? String(data.notes) : null,
      createdAt: new Date().toISOString(),
    };
    await db.reminders.put(r);
    return r;
  },
  async updateReminder(id: string, data: Record<string, unknown>): Promise<Reminder> {
    const db = await getLocalDB();
    const r = await db.reminders.get(id);
    if (!r) throw new Error("Recordatorio no encontrado");
    if (data.done !== undefined) r.done = Boolean(data.done);
    if (data.title !== undefined) r.title = String(data.title);
    if (data.dueDate !== undefined) r.dueDate = new Date(String(data.dueDate)).toISOString();
    await db.reminders.put(r);
    return r;
  },
  async deleteReminder(id: string): Promise<void> {
    const db = await getLocalDB();
    await db.reminders.delete(id);
  },

  async getStats(month: string): Promise<Stats> {
    await ensureLocalSeed();
    const db = await getLocalDB();
    const [y, m] = month.split("-").map(Number);
    const startISO = new Date(y, m - 1, 1).toISOString();
    const endISO = new Date(y, m, 0, 23, 59, 59, 999).toISOString();
    const prevStartISO = new Date(y, m - 2, 1).toISOString();
    const prevEndISO = new Date(y, m - 1, 0, 23, 59, 59, 999).toISOString();

    const [expenses, prevExpenses, accounts, budgets, subscriptions, goals] = await Promise.all([
      db.expenses.where("date").between(startISO, endISO, true, true).toArray(),
      db.expenses.where("date").between(prevStartISO, prevEndISO, true, true).toArray(),
      db.accounts.toArray(),
      db.budgets.where("month").equals(month).toArray(),
      db.subscriptions.toArray().then((subs) => subs.filter((s) => s.active)),
      db.goals.toArray(),
    ]);

    const cats = await db.categories.toArray();
    const catMap = new Map(cats.map((c) => [c.id, c]));

    const expenseList = expenses.filter((e) => e.type !== "income");
    const incomeList = expenses.filter((e) => e.type === "income");

    const totalSpent = expenseList.reduce((s, e) => s + e.amount, 0);
    const totalIncome = incomeList.reduce((s, e) => s + e.amount, 0);
    const prevTotalSpent = prevExpenses.filter((e) => e.type !== "income").reduce((s, e) => s + e.amount, 0);
    const variation = prevTotalSpent > 0 ? ((totalSpent - prevTotalSpent) / prevTotalSpent) * 100 : 0;
    const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
    const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
    const budgetRemaining = totalBudget - totalSpent;
    const totalSaved = totalIncome - totalSpent;

    // Top categorías (solo egresos)
    const byCat: Record<string, { name: string; color: string; icon: string; total: number; count: number }> = {};
    for (const e of expenseList) {
      const c = catMap.get(e.categoryId);
      if (!byCat[e.categoryId]) byCat[e.categoryId] = { name: c?.name || "Otros", color: c?.color || "slate", icon: c?.icon || "Wallet", total: 0, count: 0 };
      byCat[e.categoryId].total += e.amount;
      byCat[e.categoryId].count += 1;
    }
    const topCategories = Object.values(byCat).sort((a, b) => b.total - a.total).slice(0, 5);

    // Por día (solo egresos)
    const totalDays = daysInMonth(new Date(y, m - 1, 1));
    const byDay: Array<{ day: number; total: number }> = [];
    for (let d = 1; d <= totalDays; d++) byDay.push({ day: d, total: 0 });
    for (const e of expenseList) byDay[new Date(e.date).getDate() - 1].total += e.amount;

    // Por método (solo egresos)
    const byMethod: Record<string, number> = {};
    for (const e of expenseList) {
      const method = e.paymentMethod || "cash";
      byMethod[method] = (byMethod[method] || 0) + e.amount;
    }

    // Por comercio (solo egresos)
    const byMerch: Record<string, number> = {};
    for (const e of expenseList) {
      const name = e.merchantName || "Otro";
      byMerch[name] = (byMerch[name] || 0) + e.amount;
    }
    const topMerchants = Object.entries(byMerch).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 10);

    // Por cuenta (solo egresos)
    const byAcc: Record<string, { name: string; total: number; color: string }> = {};
    for (const e of expenseList) {
      const id = e.accountId || "none";
      const acc = accounts.find((a) => a.id === e.accountId);
      const name = acc?.name || "Sin cuenta";
      const color = acc?.color || "slate";
      if (!byAcc[id]) byAcc[id] = { name, total: 0, color };
      byAcc[id].total += e.amount;
    }

    // Budget usage (solo egresos)
    const budgetUsage = budgets.map((b) => {
      const spent = expenseList.filter((e) => e.categoryId === b.categoryId).reduce((s, e) => s + e.amount, 0);
      const c = catMap.get(b.categoryId);
      return {
        id: b.id,
        categoryId: b.categoryId,
        categoryName: c?.name || "Otros",
        categoryColor: c?.color || "slate",
        categoryIcon: c?.icon || "Wallet",
        amount: b.amount,
        spent,
        remaining: b.amount - spent,
        percentage: b.amount > 0 ? (spent / b.amount) * 100 : 0,
      };
    });

    // Comparación categorías (solo egresos)
    const prevByCat: Record<string, number> = {};
    for (const e of prevExpenses.filter((e) => e.type !== "income")) prevByCat[e.categoryId] = (prevByCat[e.categoryId] || 0) + e.amount;
    const categoryComparison = Object.entries(byCat).map(([catId, c]) => ({
      ...c,
      categoryId: catId,
      prev: prevByCat[catId] || 0,
      variation: prevByCat[catId] ? ((c.total - prevByCat[catId]) / prevByCat[catId]) * 100 : 0,
    })).sort((a, b) => b.total - a.total);

    // Promedios
    const today = new Date();
    const daysElapsed = today.getMonth() === m - 1 && today.getFullYear() === y ? today.getDate() : totalDays;
    const avgDaily = daysElapsed > 0 ? totalSpent / daysElapsed : 0;
    const projectedMonth = avgDaily * totalDays;

    // Recent expenses
    const sortedExpenses = [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const recentExpenses = await Promise.all(sortedExpenses.slice(0, 6).map(resolveExpense));

    return {
      month,
      summary: {
        totalBalance,
        totalSpent,
        totalIncome,
        prevTotalSpent,
        variation,
        totalBudget,
        budgetRemaining,
        budgetPercentage: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
        totalSaved,
        monthlyGoal: 0,
        expenseCount: expenseList.length,
        incomeCount: incomeList.length,
        avgDaily,
        avgWeekly: avgDaily * 7,
        avgMonthly: totalSpent,
        projectedMonth,
        subscriptionsTotal: subscriptions.reduce((s, x) => s + x.amount, 0),
      },
      topCategories,
      byDay,
      byMethod: Object.entries(byMethod).map(([method, total]) => ({ method, total })),
      topMerchants,
      byAccount: Object.values(byAcc),
      budgetUsage,
      categoryComparison,
      goals,
      recentExpenses,
    };
  },

  async bulkImport(expenses: Array<Record<string, unknown>>): Promise<{ created: number; failed: number; total: number; merchantsCreated: number }> {
    let created = 0;
    let failed = 0;
    let merchantsCreated = 0;
    for (const input of expenses) {
      try {
        await this.createExpense(input as CreateExpenseInput);
        created++;
      } catch {
        failed++;
      }
    }
    return { created, failed, total: expenses.length, merchantsCreated };
  },
};

// =============================================================================
// Provider unificado: enruta a local o server según el modo activo
// =============================================================================

export const dataProvider = new Proxy({} as typeof serverProvider, {
  get(_target, prop) {
    const mode = useDataModeStore.getState().mode;
    const provider = mode === "local" ? localProvider : serverProvider;
    const fn = (provider as Record<string, unknown>)[prop];
    return typeof fn === "function" ? fn.bind(provider) : fn;
  },
});

// =============================================================================
// IA: en modo local, requiere un servidor IA configurado (Premium)
// =============================================================================

export function getIaBaseUrl(): string {
  const state = useDataModeStore.getState();
  if (state.mode === "server") return ""; // mismo origen
  return state.iaServerUrl || ""; // URL del servidor IA en modo local
}

export function isIaAvailable(): boolean {
  const state = useDataModeStore.getState();
  if (state.mode === "server") return true;
  return Boolean(state.iaServerUrl);
}

// Helper: avanza una fecha según el periodo de la suscripción
function advanceDateLocal(date: Date, period: string): Date {
  const d = new Date(date);
  if (period === "yearly") {
    d.setFullYear(d.getFullYear() + 1);
  } else if (period === "weekly") {
    d.setDate(d.getDate() + 7);
  } else if (period === "biweekly") {
    d.setDate(d.getDate() + 15);
  } else {
    // monthly (default)
    d.setMonth(d.getMonth() + 1);
  }
  return d;
}
