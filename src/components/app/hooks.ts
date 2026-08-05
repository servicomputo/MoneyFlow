"use client";

import { useQuery } from "@tanstack/react-query";

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: string;
  subcategories: Array<{ id: string; name: string }>;
}

export interface Account {
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
}

export interface Merchant {
  id: string;
  name: string;
  normalizedName: string;
  defaultCategoryId?: string | null;
  defaultCategory?: Category | null;
  defaultPaymentMethod?: string | null;
  defaultAccountId?: string | null;
  useCount: number;
  suggestedCategories?: Array<{
    category: { id: string; name: string; color: string; icon: string };
    score: number;
  }>;
}

export interface Expense {
  id: string;
  amount: number;
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
  category: Category;
  subcategory?: { id: string; name: string } | null;
  merchant?: { id: string; name: string } | null;
  account?: Account | null;
}

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  period: string;
  month?: string | null;
  category: Category;
}

export interface Subscription {
  id: string;
  name: string;
  merchantName?: string | null;
  amount: number;
  currency: string;
  period: string;
  nextDate: string;
  active: boolean;
  category?: Category | null;
  account?: Account | null;
}

export interface SavingsGoal {
  id: string;
  name: string;
  target: number;
  current: number;
  deadline?: string | null;
  color: string;
  icon: string;
}

export interface Reminder {
  id: string;
  title: string;
  type: string;
  dueDate: string;
  done: boolean;
  notes?: string | null;
}

export interface Stats {
  month: string;
  summary: {
    totalBalance: number;
    totalSpent: number;
    prevTotalSpent: number;
    variation: number;
    totalBudget: number;
    budgetRemaining: number;
    budgetPercentage: number;
    totalSaved: number;
    monthlyGoal: number;
    expenseCount: number;
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

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const r = await fetch("/api/categories");
      const d = await r.json();
      return d.categories as Category[];
    },
  });
}

export function useAccounts() {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const r = await fetch("/api/accounts");
      const d = await r.json();
      return d.accounts as Account[];
    },
  });
}

export function useExpenses(month?: string, filters?: Record<string, string>) {
  const params = new URLSearchParams();
  if (month) params.set("month", month);
  if (filters) Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
  return useQuery({
    queryKey: ["expenses", month, filters],
    queryFn: async () => {
      const r = await fetch(`/api/expenses?${params.toString()}`);
      const d = await r.json();
      return d.expenses as Expense[];
    },
  });
}

export function useBudgets() {
  return useQuery({
    queryKey: ["budgets"],
    queryFn: async () => {
      const r = await fetch("/api/budgets");
      const d = await r.json();
      return d.budgets as Budget[];
    },
  });
}

export function useSubscriptions() {
  return useQuery({
    queryKey: ["subscriptions"],
    queryFn: async () => {
      const r = await fetch("/api/subscriptions");
      const d = await r.json();
      return d.subscriptions as Subscription[];
    },
  });
}

export function useGoals() {
  return useQuery({
    queryKey: ["goals"],
    queryFn: async () => {
      const r = await fetch("/api/goals");
      const d = await r.json();
      return d.goals as SavingsGoal[];
    },
  });
}

export function useReminders() {
  return useQuery({
    queryKey: ["reminders"],
    queryFn: async () => {
      const r = await fetch("/api/reminders");
      const d = await r.json();
      return d.reminders as Reminder[];
    },
  });
}

export function useStats(month?: string) {
  const m = month || new Date().toISOString().slice(0, 7);
  return useQuery({
    queryKey: ["stats", m],
    queryFn: async () => {
      const r = await fetch(`/api/stats?month=${m}`);
      const d = await r.json();
      return d as Stats;
    },
  });
}
