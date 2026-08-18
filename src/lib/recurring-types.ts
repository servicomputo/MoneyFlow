import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  type LucideIcon,
} from "lucide-react";

export type TransactionType = "expense" | "income" | "transfer";

export interface RecurringType {
  value: TransactionType;
  label: string;
  icon: string;
  lucideIcon: LucideIcon;
  color: string;
  description: string;
  transactionType: TransactionType;
}

/**
 * 3 tipos principales de transacciones recurrentes.
 * Mismo flujo que el módulo de Movimientos (Agregar → Gasto / Ingreso / Transferencia).
 */
export const RECURRING_TYPES: RecurringType[] = [
  {
    value: "expense",
    label: "Gasto",
    icon: "ArrowDownLeft",
    lucideIcon: ArrowDownLeft,
    color: "red",
    description: "Egreso recurrente: renta, suscripciones, servicios, etc.",
    transactionType: "expense",
  },
  {
    value: "income",
    label: "Ingreso",
    icon: "ArrowUpRight",
    lucideIcon: ArrowUpRight,
    color: "emerald",
    description: "Ingreso recurrente: salario, freelance, etc.",
    transactionType: "income",
  },
  {
    value: "transfer",
    label: "Transferencia",
    icon: "ArrowLeftRight",
    lucideIcon: ArrowLeftRight,
    color: "violet",
    description: "Mover dinero entre cuentas de forma recurrente",
    transactionType: "transfer",
  },
];

/**
 * Mapa de valores legacy → tipo principal.
 * Compatible con datos sembrados previamente (subscription, rent, services, etc.).
 */
const LEGACY_TYPE_MAP: Record<string, TransactionType> = {
  // Gastos
  subscription: "expense",
  rent: "expense",
  services: "expense",
  loan: "expense",
  expense_other: "expense",
  other: "expense",
  payroll: "expense",
  // Ingresos
  salary: "income",
  freelance: "income",
  income_other: "income",
  // Transferencias
  transfer: "transfer",
};

export function normalizeType(value: string | null | undefined): TransactionType {
  if (!value) return "expense";
  if (value === "expense" || value === "income" || value === "transfer") {
    return value;
  }
  return LEGACY_TYPE_MAP[value] || "expense";
}

const RECURRING_TYPE_MAP: Record<TransactionType, RecurringType> = RECURRING_TYPES.reduce(
  (acc, t) => {
    acc[t.value] = t;
    return acc;
  },
  {} as Record<TransactionType, RecurringType>
);

export function getRecurringType(value: string | null | undefined): RecurringType {
  return RECURRING_TYPE_MAP[normalizeType(value)] || RECURRING_TYPES[0];
}

export function getRecurringTypesByTransactionType(type: TransactionType): RecurringType[] {
  return RECURRING_TYPES.filter((t) => t.transactionType === type);
}
