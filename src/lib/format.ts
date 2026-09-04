export function formatCurrency(
  amount: number,
  currency = "MXN",
  opts?: { compact?: boolean; showSign?: boolean }
): string {
  const showSign = opts?.showSign ?? false;
  const sign = amount < 0 ? "-" : showSign ? "+" : "";
  const abs = Math.abs(amount);
  if (opts?.compact && abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  }
  if (opts?.compact && abs >= 1_000) {
    return `${sign}$${(abs / 1_000).toFixed(1)}k`;
  }
  // Usar formato mexicano con separador de miles
  const formatted = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(abs);
  return `${sign}${formatted}`;
}

export function formatNumber(amount: number, decimals = 2): string {
  return new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: true,
  }).format(amount);
}

export function formatDate(date: Date | string, format: "short" | "long" | "relative" = "short"): string {
  let d: Date;
  if (typeof date === "string") {
    // Extraer YYYY-MM-DD del string sin interpretar como UTC
    const datePart = date.slice(0, 10);
    const [y, m, day] = datePart.split("-").map(Number);
    d = new Date(y, m - 1, day, 12, 0, 0, 0);
  } else {
    d = date;
  }
  if (format === "relative") {
    const diff = Date.now() - d.getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Hoy";
    if (days === 1) return "Ayer";
    if (days < 7) return `Hace ${days} días`;
    if (days < 30) return `Hace ${Math.floor(days / 7)} sem`;
  }
  return new Intl.DateTimeFormat("es-MX", {
    day: format === "long" ? "numeric" : "2-digit",
    month: format === "long" ? "long" : "short",
    year: "numeric",
  }).format(d);
}

export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function monthKey(date: Date | string = new Date()): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" }).format(d);
}

export function startOfMonth(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function startOfWeek(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function daysInMonth(date: Date = new Date()): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function dayOfMonth(date: Date = new Date()): number {
  return date.getDate();
}
