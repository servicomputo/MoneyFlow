"use client";

import { AppShell } from "@/components/app/shell";
import { AddExpenseDialog } from "@/components/app/add-expense-dialog";
import { useAppStore } from "@/lib/store";
import { DashboardView } from "@/components/app/views/dashboard";
import { ScanView } from "@/components/app/views/scan";
import { MovementsView } from "@/components/app/views/movements";
import { BudgetsView } from "@/components/app/views/budgets";
import { SubscriptionsView } from "@/components/app/views/subscriptions";
import { AccountsView } from "@/components/app/views/accounts";
import { CategoriesView } from "@/components/app/views/categories";
import { StatsView } from "@/components/app/views/stats";
import { AssistantView } from "@/components/app/views/assistant";
import { GoalsView } from "@/components/app/views/goals";
import { RemindersView } from "@/components/app/views/reminders";
import { SettingsView } from "@/components/app/views/settings";

export default function Home() {
  const { view } = useAppStore();

  return (
    <AppShell>
      {view === "dashboard" && <DashboardView />}
      {view === "movements" && <MovementsView />}
      {view === "scan" && <ScanView />}
      {view === "budgets" && <BudgetsView />}
      {view === "subscriptions" && <SubscriptionsView />}
      {view === "accounts" && <AccountsView />}
      {view === "categories" && <CategoriesView />}
      {view === "stats" && <StatsView />}
      {view === "assistant" && <AssistantView />}
      {view === "goals" && <GoalsView />}
      {view === "reminders" && <RemindersView />}
      {view === "settings" && <SettingsView />}
      {view === "add" && <ScanView />}

      <AddExpenseDialog />
    </AppShell>
  );
}
