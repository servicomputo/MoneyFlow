import type { Table } from "dexie";

// =============================================================================
// Tipos de la base de datos local (IndexedDB vía Dexie)
// =============================================================================

export interface LocalCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: string;
  isDefault: boolean;
  subcategories: LocalSubcategory[];
  createdAt: string;
}

export interface LocalSubcategory {
  id: string;
  name: string;
  categoryId: string;
}

export interface LocalAccount {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
  color: string;
  bank?: string | null;
  last4?: string | null;
  creditLimit?: number | null;
  dueDay?: number | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LocalMerchant {
  id: string;
  name: string;
  normalizedName: string;
  rfc?: string | null;
  defaultCategoryId?: string | null;
  defaultPaymentMethod?: string | null;
  defaultAccountId?: string | null;
  useCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface LocalMerchantHint {
  id: string;
  merchantId: string;
  categoryId: string;
  score: number;
}

export interface LocalExpense {
  id: string;
  amount: number;
  type: string;
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
}

export interface LocalBudget {
  id: string;
  categoryId: string;
  amount: number;
  period: string;
  month?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LocalSubscription {
  id: string;
  name: string;
  type: string;
  merchantName?: string | null;
  amount: number;
  currency: string;
  period: string;
  nextDate: string;
  categoryId?: string | null;
  accountId?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LocalReminder {
  id: string;
  title: string;
  type: string;
  dueDate: string;
  done: boolean;
  notes?: string | null;
  createdAt: string;
}

export interface LocalSavingsGoal {
  id: string;
  name: string;
  target: number;
  current: number;
  deadline?: string | null;
  color: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocalAiInsight {
  id: string;
  type: string;
  title: string;
  content: string;
  period?: string | null;
  createdAt: string;
}

interface MoneyFlowDBInstance {
  categories: Table<LocalCategory, string>;
  accounts: Table<LocalAccount, string>;
  merchants: Table<LocalMerchant, string>;
  merchantHints: Table<LocalMerchantHint, string>;
  expenses: Table<LocalExpense, string>;
  budgets: Table<LocalBudget, string>;
  subscriptions: Table<LocalSubscription, string>;
  reminders: Table<LocalReminder, string>;
  goals: Table<LocalSavingsGoal, string>;
  insights: Table<LocalAiInsight, string>;
  meta: Table<{ key: string; value: unknown }, string>;
}

let _db: MoneyFlowDBInstance | null = null;

export async function getLocalDB(): Promise<MoneyFlowDBInstance> {
  if (typeof window === "undefined") {
    throw new Error("LocalDB solo está disponible en el navegador");
  }
  if (!_db) {
    const Dexie = (await import("dexie")).default;
    class MoneyFlowDB extends Dexie {
      categories!: Table<LocalCategory, string>;
      accounts!: Table<LocalAccount, string>;
      merchants!: Table<LocalMerchant, string>;
      merchantHints!: Table<LocalMerchantHint, string>;
      expenses!: Table<LocalExpense, string>;
      budgets!: Table<LocalBudget, string>;
      subscriptions!: Table<LocalSubscription, string>;
      reminders!: Table<LocalReminder, string>;
      goals!: Table<LocalSavingsGoal, string>;
      insights!: Table<LocalAiInsight, string>;
      meta!: Table<{ key: string; value: unknown }, string>;

      constructor() {
        super("moneyflow");
        this.version(2).stores({
          categories: "id, name, type",
          accounts: "id, type, isDefault",
          merchants: "id, normalizedName, defaultCategoryId",
          merchantHints: "id, merchantId, categoryId, [merchantId+categoryId]",
          expenses: "id, date, categoryId, merchantId, accountId, subcategoryId, source, type",
          budgets: "id, categoryId, period, month, [categoryId+period+month]",
          subscriptions: "id, active, nextDate",
          reminders: "id, done, dueDate",
          goals: "id",
          insights: "id, period, type",
          meta: "key",
        });
      }
    }
    _db = new MoneyFlowDB() as unknown as MoneyFlowDBInstance;
  }
  return _db;
}

export function localId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}
