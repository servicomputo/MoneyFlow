import {
  Film,
  Home,
  Zap,
  Briefcase,
  GraduationCap,
  Package,
  type LucideIcon,
} from "lucide-react";

export interface RecurringType {
  value: string;
  label: string;
  icon: string; // nombre del icono para getCategoryIcon
  lucideIcon: LucideIcon;
  color: string;
  description: string;
}

export const RECURRING_TYPES: RecurringType[] = [
  {
    value: "subscription",
    label: "Suscripción",
    icon: "Film",
    lucideIcon: Film,
    color: "purple",
    description: "Servicios digitales (Netflix, Spotify, iCloud)",
  },
  {
    value: "rent",
    label: "Renta",
    icon: "Home",
    lucideIcon: Home,
    color: "emerald",
    description: "Renta, hipoteca o vivienda",
  },
  {
    value: "services",
    label: "Servicios",
    icon: "Zap",
    lucideIcon: Zap,
    color: "amber",
    description: "Luz, agua, gas, internet",
  },
  {
    value: "payroll",
    label: "Nómina",
    icon: "Briefcase",
    lucideIcon: Briefcase,
    color: "teal",
    description: "Pago de empleados o ayudantes",
  },
  {
    value: "loan",
    label: "Préstamo",
    icon: "GraduationCap",
    lucideIcon: GraduationCap,
    color: "rose",
    description: "Colegiatura, préstamo de auto, crédito",
  },
  {
    value: "other",
    label: "Otros",
    icon: "Package",
    lucideIcon: Package,
    color: "slate",
    description: "Seguros, ahorro programado, etc.",
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
