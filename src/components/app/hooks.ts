"use client";

import { useQuery } from "@tanstack/react-query";
import { dataProvider, type Category, type Account, type Merchant, type Expense, type Budget, type Subscription, type SavingsGoal, type Reminder, type Stats, type CreateExpenseInput } from "@/lib/data-provider";
import { useDataModeStore } from "@/lib/data-mode";

// Re-exportar tipos para compatibilidad con vistas existentes
export type { Category, Account, Merchant, Expense, Budget, Subscription, SavingsGoal, Reminder, Stats };

// Hook para refrescar queries cuando cambia el modo de datos
function useModeKey() {
  const mode = useDataModeStore((s) => s.mode);
  const iaServerUrl = useDataModeStore((s) => s.iaServerUrl);
  return { mode, iaServerUrl };
}

export function useCategories() {
  const { mode } = useModeKey();
  return useQuery({
    queryKey: ["categories", mode],
    queryFn: () => dataProvider.listCategories(),
  });
}

export function useAccounts() {
  const { mode } = useModeKey();
  return useQuery({
    queryKey: ["accounts", mode],
    queryFn: () => dataProvider.listAccounts(),
  });
}

export function useExpenses(month?: string, filters?: Record<string, string>) {
  const { mode } = useModeKey();
  const m = month || new Date().toISOString().slice(0, 7);
  return useQuery({
    queryKey: ["expenses", m, filters, mode],
    queryFn: () => dataProvider.listExpenses(m, filters),
  });
}

export function useBudgets() {
  const { mode } = useModeKey();
  return useQuery({
    queryKey: ["budgets", mode],
    queryFn: () => dataProvider.listBudgets(),
  });
}

export function useSubscriptions() {
  const { mode } = useModeKey();
  return useQuery({
    queryKey: ["subscriptions", mode],
    queryFn: () => dataProvider.listSubscriptions(),
  });
}

export function useGoals() {
  const { mode } = useModeKey();
  return useQuery({
    queryKey: ["goals", mode],
    queryFn: () => dataProvider.listGoals(),
  });
}

export function useReminders() {
  const { mode } = useModeKey();
  return useQuery({
    queryKey: ["reminders", mode],
    queryFn: () => dataProvider.listReminders(),
  });
}

export function useStats(month?: string) {
  const { mode } = useModeKey();
  const m = month || new Date().toISOString().slice(0, 7);
  return useQuery({
    queryKey: ["stats", m, mode],
    queryFn: () => dataProvider.getStats(m),
  });
}

// Hook para estadísticas de cualquier periodo (semana, mes, año)
export function useStatsForPeriod(period: "month" | "week" | "year", refDate: Date) {
  const { mode } = useModeKey();
  return useQuery({
    queryKey: ["stats-period", period, refDate.toISOString(), mode],
    queryFn: async () => {
      const { getPeriodRange, getPrevPeriodRange, computeStatsFromExpenses, formatPeriodLabel } = await import("@/lib/stats-utils");
      const { start, end } = getPeriodRange(period, refDate);
      const { start: prevStart, end: prevEnd } = getPrevPeriodRange(period, refDate);

      const [expenses, prevExpenses, accounts, budgets, subscriptions, goals] = await Promise.all([
        dataProvider.listExpensesRange(start.toISOString(), end.toISOString()),
        dataProvider.listExpensesRange(prevStart.toISOString(), prevEnd.toISOString()),
        dataProvider.listAccounts(),
        dataProvider.listBudgets(),
        dataProvider.listSubscriptions(),
        dataProvider.listGoals(),
      ]);

      const trendMode = period === "month" ? "day" : period === "week" ? "week" : "month";
      return computeStatsFromExpenses(
        expenses,
        prevExpenses,
        accounts,
        budgets,
        subscriptions,
        goals,
        formatPeriodLabel(period, refDate),
        trendMode,
        refDate
      );
    },
  });
}

// Mutaciones helper (usan el dataProvider)
export const mutations = {
  createExpense: (data: CreateExpenseInput) => dataProvider.createExpense(data),
  updateExpense: (id: string, data: Record<string, unknown>) => dataProvider.updateExpense(id, data),
  deleteExpense: (id: string) => dataProvider.deleteExpense(id),
  createCategory: (data: { name: string; icon?: string; color?: string; type?: string }) => dataProvider.createCategory(data),
  updateCategory: (id: string, data: { name?: string; icon?: string; color?: string; type?: string }) => dataProvider.updateCategory(id, data),
  deleteCategory: (id: string) => dataProvider.deleteCategory(id),
  createSubcategory: (categoryId: string, name: string) => dataProvider.createSubcategory(categoryId, name),
  updateSubcategory: (id: string, name: string) => dataProvider.updateSubcategory(id, name),
  deleteSubcategory: (id: string) => dataProvider.deleteSubcategory(id),
  createAccount: (data: Record<string, unknown>) => dataProvider.createAccount(data),
  createBudget: (data: { categoryId: string; amount: number; period?: string; month?: string }) => dataProvider.createBudget(data),
  deleteBudget: (id: string) => dataProvider.deleteBudget(id),
  createSubscription: (data: Record<string, unknown>) => dataProvider.createSubscription(data),
  updateSubscription: (id: string, data: Record<string, unknown>) => dataProvider.updateSubscription(id, data),
  deleteSubscription: (id: string) => dataProvider.deleteSubscription(id),
  createGoal: (data: Record<string, unknown>) => dataProvider.createGoal(data),
  updateGoal: (id: string, data: Record<string, unknown>) => dataProvider.updateGoal(id, data),
  deleteGoal: (id: string) => dataProvider.deleteGoal(id),
  createReminder: (data: Record<string, unknown>) => dataProvider.createReminder(data),
  updateReminder: (id: string, data: Record<string, unknown>) => dataProvider.updateReminder(id, data),
  deleteReminder: (id: string) => dataProvider.deleteReminder(id),
  bulkImport: (expenses: Array<Record<string, unknown>>) => dataProvider.bulkImport(expenses),
};
