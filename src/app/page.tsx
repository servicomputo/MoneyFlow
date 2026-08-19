"use client";

import { AppShell } from "@/components/app/shell";
import { AddExpenseDialog } from "@/components/app/add-expense-dialog";
import { TransferDialog } from "@/components/app/transfer-dialog";
import { AddMenuPopover } from "@/components/app/add-menu";
import { useAppStore } from "@/lib/store";
import { DashboardView } from "@/components/app/views/dashboard";
import { ScanView } from "@/components/app/views/scan";
import { ImportView } from "@/components/app/views/import";
import { MovementsView } from "@/components/app/views/movements";
import { BudgetsView } from "@/components/app/views/budgets";
import { SubscriptionsView } from "@/components/app/views/subscriptions";
import { AccountsView } from "@/components/app/views/accounts";
import { CategoriesView } from "@/components/app/views/categories";
import { StatsView } from "@/components/app/views/stats";
import { AssistantView } from "@/components/app/views/assistant";
import { GoalsView } from "@/components/app/views/goals";
import { RemindersView } from "@/components/app/views/reminders";
import { CalendarView } from "@/components/app/views/calendar";
import { SettingsView } from "@/components/app/views/settings";

export default function Home() {
  const { view } = useAppStore();

  return (
    <AppShell>
      {view === "dashboard" && <DashboardView />}
      {view === "movements" && <MovementsView />}
      {view === "scan" && <ScanView />}
      {view === "import" && <ImportView />}
      {view === "budgets" && <BudgetsView />}
      {view === "subscriptions" && <SubscriptionsView />}
      {view === "accounts" && <AccountsView />}
      {view === "categories" && <CategoriesView />}
      {view === "stats" && <StatsView />}
      {view === "assistant" && <AssistantView />}
      {view === "goals" && <GoalsView />}
      {view === "reminders" && <RemindersView />}
      {view === "calendar" && <CalendarView />}
      {view === "settings" && <SettingsView />}

      <AddExpenseDialog />
      <TransferDialog />
      <AddMenuPopover />
    </AppShell>
  );
}
