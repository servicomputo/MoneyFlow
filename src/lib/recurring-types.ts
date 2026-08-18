import {
  Film,
  Home,
  Zap,
  Briefcase,
  GraduationCap,
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  type LucideIcon,
} from "lucide-react";

export interface RecurringType {
  value: string;
  label: string;
  icon: string;
  lucideIcon: LucideIcon;
  color: string;
  description: string;
  transactionType: "expense" | "income" | "transfer";
}

export const RECURRING_TYPES: RecurringType[] = [
  // === GASTOS RECURRENTES ===
  {
    value: "subscription",
    label: "Suscripción",
    icon: "Film",
    lucideIcon: Film,
    color: "purple",
    description: "Netflix, Spotify, iCloud",
    transactionType: "expense",
  },
  {
    value: "rent",
    label: "Renta",
    icon: "Home",
    lucideIcon: Home,
    color: "emerald",
    description: "Renta, hipoteca o vivienda",
    transactionType: "expense",
  },
  {
    value: "services",
    label: "Servicios",
    icon: "Zap",
    lucideIcon: Zap,
    color: "amber",
    description: "Luz, agua, gas, internet",
    transactionType: "expense",
  },
  {
    value: "loan",
    label: "Préstamo",
    icon: "GraduationCap",
    lucideIcon: GraduationCap,
    color: "rose",
    description: "Colegiatura, auto, crédito",
    transactionType: "expense",
  },
  {
    value: "expense_other",
    label: "Otro gasto",
    icon: "Package",
    lucideIcon: Package,
    color: "slate",
    description: "Seguros, ahorro programado, etc.",
    transactionType: "expense",
  },
  // === INGRESOS RECURRENTES ===
  {
    value: "salary",
    label: "Salario",
    icon: "Briefcase",
    lucideIcon: Briefcase,
    color: "teal",
    description: "Sueldo, pago mensual",
    transactionType: "income",
  },
  {
    value: "freelance",
    label: "Freelance",
    icon: "Briefcase",
    lucideIcon: Briefcase,
    color: "cyan",
    description: "Ingresos por proyectos",
    transactionType: "income",
  },
  {
    value: "income_other",
    label: "Otro ingreso",
    icon: "ArrowUpRight",
    lucideIcon: ArrowUpRight,
    color: "green",
    description: "Inversiones, regalos, etc.",
    transactionType: "income",
  },
  // === TRANSFERENCIAS RECURRENTES ===
  {
    value: "transfer",
    label: "Transferencia",
    icon: "ArrowLeftRight",
    lucideIcon: ArrowLeftRight,
    color: "violet",
    description: "Mover dinero entre cuentas",
    transactionType: "transfer",
  },
];

export const RECURRING_TYPE_MAP: Record<string, RecurringType> = RECURRING_TYPES.reduce(
  (acc, t) => {
    acc[t.value] = t;
    return acc;
  },
  {} as Record<string, RecurringType>
);

export function getRecurringType(value: string): RecurringType {
  return RECURRING_TYPE_MAP[value] || RECURRING_TYPES[0];
}

export function getRecurringTypesByTransactionType(type: "expense" | "income" | "transfer"): RecurringType[] {
  return RECURRING_TYPES.filter((t) => t.transactionType === type);
}
