import {
  Wallet,
  ShoppingCart,
  Car,
  Coffee,
  UtensilsCrossed,
  Film,
  Home,
  HeartPulse,
  GraduationCap,
  Plane,
  Sparkles,
  Receipt,
  Smartphone,
  Zap,
  Droplet,
  Flame,
  PiggyBank,
  Briefcase,
  Gift,
  Dumbbell,
  PawPrint,
  Wrench,
  Gamepad2,
  Camera,
  Package,
  Building2,
  BookOpen,
  Cloud,
  type LucideIcon,
} from "lucide-react";

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Wallet,
  ShoppingCart,
  Car,
  Coffee,
  UtensilsCrossed,
  Film,
  Home,
  HeartPulse,
  GraduationCap,
  Plane,
  Sparkles,
  Receipt,
  Smartphone,
  Zap,
  Droplet,
  Flame,
  PiggyBank,
  Briefcase,
  Gift,
  Dumbbell,
  PawPrint,
  Wrench,
  Gamepad2,
  Camera,
  Package,
  Building2,
  BookOpen,
  Cloud,
};

export function getCategoryIcon(name: string): LucideIcon {
  return CATEGORY_ICONS[name] ?? Wallet;
}

// Mapeo de colores de categoría a clases de Tailwind
export const COLOR_CLASSES: Record<
  string,
  { bg: string; text: string; ring: string; soft: string; hex: string }
> = {
  emerald: {
    bg: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    ring: "ring-emerald-500/30",
    soft: "bg-emerald-500/10",
    hex: "#10b981",
  },
  green: {
    bg: "bg-green-500",
    text: "text-green-600 dark:text-green-400",
    ring: "ring-green-500/30",
    soft: "bg-green-500/10",
    hex: "#22c55e",
  },
  teal: {
    bg: "bg-teal-500",
    text: "text-teal-600 dark:text-teal-400",
    ring: "ring-teal-500/30",
    soft: "bg-teal-500/10",
    hex: "#14b8a6",
  },
  cyan: {
    bg: "bg-cyan-500",
    text: "text-cyan-600 dark:text-cyan-400",
    ring: "ring-cyan-500/30",
    soft: "bg-cyan-500/10",
    hex: "#06b6d4",
  },
  amber: {
    bg: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    ring: "ring-amber-500/30",
    soft: "bg-amber-500/10",
    hex: "#f59e0b",
  },
  orange: {
    bg: "bg-orange-500",
    text: "text-orange-600 dark:text-orange-400",
    ring: "ring-orange-500/30",
    soft: "bg-orange-500/10",
    hex: "#f97316",
  },
  red: {
    bg: "bg-red-500",
    text: "text-red-600 dark:text-red-400",
    ring: "ring-red-500/30",
    soft: "bg-red-500/10",
    hex: "#ef4444",
  },
  rose: {
    bg: "bg-rose-500",
    text: "text-rose-600 dark:text-rose-400",
    ring: "ring-rose-500/30",
    soft: "bg-rose-500/10",
    hex: "#f43f5e",
  },
  pink: {
    bg: "bg-pink-500",
    text: "text-pink-600 dark:text-pink-400",
    ring: "ring-pink-500/30",
    soft: "bg-pink-500/10",
    hex: "#ec4899",
  },
  purple: {
    bg: "bg-purple-500",
    text: "text-purple-600 dark:text-purple-400",
    ring: "ring-purple-500/30",
    soft: "bg-purple-500/10",
    hex: "#a855f7",
  },
  violet: {
    bg: "bg-violet-500",
    text: "text-violet-600 dark:text-violet-400",
    ring: "ring-violet-500/30",
    soft: "bg-violet-500/10",
    hex: "#8b5cf6",
  },
  yellow: {
    bg: "bg-yellow-500",
    text: "text-yellow-600 dark:text-yellow-400",
    ring: "ring-yellow-500/30",
    soft: "bg-yellow-500/10",
    hex: "#eab308",
  },
  lime: {
    bg: "bg-lime-500",
    text: "text-lime-600 dark:text-lime-400",
    ring: "ring-lime-500/30",
    soft: "bg-lime-500/10",
    hex: "#84cc16",
  },
  slate: {
    bg: "bg-slate-500",
    text: "text-slate-600 dark:text-slate-400",
    ring: "ring-slate-500/30",
    soft: "bg-slate-500/10",
    hex: "#64748b",
  },
};

export const COLOR_NAMES = Object.keys(COLOR_CLASSES);

export function colorClasses(color: string) {
  return COLOR_CLASSES[color] ?? COLOR_CLASSES.emerald;
}

// Categorías por defecto
export const DEFAULT_CATEGORIES: Array<{
  name: string;
  icon: string;
  color: string;
}> = [
  { name: "Despensa", icon: "ShoppingCart", color: "emerald" },
  { name: "Restaurantes", icon: "UtensilsCrossed", color: "orange" },
  { name: "Café", icon: "Coffee", color: "amber" },
  { name: "Transporte", icon: "Car", color: "teal" },
  { name: "Gasolina", icon: "Car", color: "rose" },
  { name: "Streaming", icon: "Film", color: "purple" },
  { name: "Compras Online", icon: "Package", color: "pink" },
  { name: "Hogar", icon: "Home", color: "cyan" },
  { name: "Salud", icon: "HeartPulse", color: "red" },
  { name: "Educación", icon: "GraduationCap", color: "violet" },
  { name: "Viajes", icon: "Plane", color: "sky" as "cyan" },
  { name: "Servicios", icon: "Zap", color: "yellow" },
  { name: "Entretenimiento", icon: "Sparkles", color: "rose" },
  { name: "Oficina", icon: "Briefcase", color: "slate" },
  { name: "Mascotas", icon: "PawPrint", color: "lime" },
  { name: "Fitness", icon: "Dumbbell", color: "green" },
  { name: "Tecnología", icon: "Smartphone", color: "slate" },
  { name: "Otros", icon: "Wallet", color: "slate" },
];

// Categorías de ingreso por defecto
export const DEFAULT_INCOME_CATEGORIES: Array<{
  name: string;
  icon: string;
  color: string;
}> = [
  { name: "Salario", icon: "Briefcase", color: "emerald" },
  { name: "Freelance", icon: "Sparkles", color: "teal" },
  { name: "Negocio", icon: "Building2", color: "cyan" },
  { name: "Ventas", icon: "ShoppingCart", color: "green" },
  { name: "Inversiones", icon: "PiggyBank", color: "violet" },
  { name: "Renta recibida", icon: "Home", color: "purple" },
  { name: "Regalos", icon: "Gift", color: "pink" },
  { name: "Reembolsos", icon: "Receipt", color: "amber" },
  { name: "Jubilación", icon: "PiggyBank", color: "lime" },
  { name: "Otros ingresos", icon: "Wallet", color: "slate" },
];

// Métodos de pago
export const PAYMENT_METHODS = [
  { value: "cash", label: "Efectivo", icon: "Wallet" },
  { value: "credit", label: "Tarjeta de crédito", icon: "CreditCard" },
  { value: "debit", label: "Tarjeta de débito", icon: "CreditCard" },
  { value: "transfer", label: "Transferencia", icon: "Building2" },
  { value: "wallet", label: "Billetera digital", icon: "Smartphone" },
] as const;

export const ACCOUNT_TYPES = [
  { value: "cash", label: "Efectivo", icon: "Wallet", color: "emerald" },
  { value: "credit", label: "Tarjeta de crédito", icon: "CreditCard", color: "purple" },
  { value: "debit", label: "Tarjeta de débito", icon: "CreditCard", color: "teal" },
  { value: "bank", label: "Cuenta bancaria", icon: "Building2", color: "cyan" },
  { value: "wallet", label: "Billetera digital", icon: "Smartphone", color: "orange" },
  { value: "savings", label: "Caja de ahorro", icon: "PiggyBank", color: "amber" },
] as const;
