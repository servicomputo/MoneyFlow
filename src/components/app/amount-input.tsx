"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Input de cantidad con separación automática de miles (formato es-MX).
 * - Muestra "1,234,567.89" mientras el usuario escribe
 * - El valor expuesto al padre es un string numérico plano: "1234567.89"
 * - Compatible con parseFloat(): el padre lo consume igual que un <Input type="number">
 * - Si `allowNegative` es true, permite un signo "-" al inicio (para retiros)
 *
 * Props:
 * - value: string numérico plano (ej. "1234567.89" o "")
 * - onValueChange: recibe el string numérico plano
 * - allowNegative?: boolean (default false)
 * - Todas las demás props de <Input> (className, placeholder, autoFocus, etc.)
 */
export interface AmountInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "inputMode"> {
  value: string;
  onValueChange: (numericValue: string) => void;
  allowNegative?: boolean;
}

/**
 * Convierte un string numérico plano ("-1234567.89" o "") a formato es-MX ("-1,234,567.89").
 * Conserva los decimales parciales mientras se escribe (ej. "1234." → "1,234.").
 * Conserva un signo "-" inicial si allowNegative es true.
 */
function formatAmount(plain: string, allowNegative = false): string {
  if (!plain) return "";
  let sign = "";
  let rest = plain;
  if (allowNegative && plain.startsWith("-")) {
    sign = "-";
    rest = plain.slice(1);
  }
  // Separar parte entera y decimal (solo un punto)
  const [intPart, ...decParts] = rest.split(".");
  const decPart = decParts.length ? "." + decParts.join("") : "";

  // Limpiar no-dígitos de la parte entera
  const cleanInt = intPart.replace(/\D/g, "");
  // Formatear con separador de miles
  const formattedInt = cleanInt.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  // Si la parte entera estaba vacía pero había decimales, dejarlo así
  if (!cleanInt && decPart) return sign + decPart;
  if (!cleanInt && !decPart) return sign;

  return sign + formattedInt + decPart;
}

/**
 * Convierte el string formateado de vuelta a numérico plano (quita comas).
 * Conserva un solo punto decimal y un signo "-" inicial si allowNegative es true.
 */
function parseAmount(formatted: string, allowNegative = false): string {
  if (!formatted) return "";
  // Detectar signo negativo al inicio
  let sign = "";
  let s = formatted;
  if (allowNegative && /^-/.test(s)) {
    sign = "-";
    s = s.replace(/^-/, "");
  }
  // Quitar todo excepto dígitos, coma y punto
  let cleaned = s.replace(/[^\d.,]/g, "");
  // Si hay múltiples puntos, conservar solo el primero
  const parts = cleaned.split(".");
  if (parts.length > 2) {
    cleaned = parts[0] + "." + parts.slice(1).join("");
  }
  // Quitar comas (separador de miles)
  cleaned = cleaned.replace(/,/g, "");
  return sign + cleaned;
}

export function AmountInput({ value, onValueChange, allowNegative = false, className, ...rest }: AmountInputProps) {
  // Estado interno con el valor formateado (con comas)
  const [display, setDisplay] = useState(() => formatAmount(value, allowNegative));
  const inputRef = useRef<HTMLInputElement>(null);

  // Sincronizar cuando el padre cambia el valor externamente (ej. reset al abrir)
  useEffect(() => {
    setDisplay(formatAmount(value, allowNegative));
  }, [value, allowNegative]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const parsed = parseAmount(raw, allowNegative);
    const formatted = formatAmount(parsed, allowNegative);

    // Guardar posición del cursor relativa al final (para que al escribir no salte)
    // Usamos el valor del input real (no el estado display) para evitar problemas
    // de estado stale cuando se escribe rápido (varios keystrokes antes de re-render).
    const input = inputRef.current;
    const cursorPos = input ? input.selectionStart : null;
    const oldDisplayLen = input ? input.value.length : display.length;
    const newLen = formatted.length;

    setDisplay(formatted);
    onValueChange(parsed);

    // Restaurar posición del cursor
    if (input && cursorPos !== null) {
      // Diferencia en longitud para mantener el cursor en el mismo carácter lógico
      const diff = newLen - oldDisplayLen;
      const newPos = Math.max(0, Math.min(newLen, cursorPos + diff));
      requestAnimationFrame(() => {
        try {
          input.setSelectionRange(newPos, newPos);
        } catch {
          // ignore
        }
      });
    }
  }

  return (
    <Input
      ref={inputRef}
      type="text"
      inputMode={allowNegative ? "text" : "decimal"}
      value={display}
      onChange={handleChange}
      className={cn(className)}
      {...rest}
    />
  );
}
