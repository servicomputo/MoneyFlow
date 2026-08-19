"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store";

/**
 * Hook que registra un handler para el botón "+" contextual.
 * Cuando el usuario está en una vista y presiona "+", se ejecuta este handler
 * en lugar del comportamiento por defecto (abrir diálogo de agregar movimiento).
 *
 * Uso:
 *   useViewAddHandler(() => {
 *     // Abrir diálogo de crear recurrente, presupuesto, etc.
 *     setDialogOpen(true);
 *   });
 *
 * El handler se limpia automáticamente al desmontar el componente.
 */
export function useViewAddHandler(handler: (() => void) | null) {
  const setViewAddHandler = useAppStore((s) => s.setViewAddHandler);
  // Guardar el handler en un ref para evitar re-renders infinitos.
  // El ref se actualiza en un efecto (no durante el render) y NO
  // dispara re-renders porque no es estado.
  const handlerRef = useRef(handler);

  // Actualizar el ref cuando cambia el handler
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  // Registrar el handler estable una sola vez
  useEffect(() => {
    const stableHandler = () => {
      handlerRef.current?.();
    };
    setViewAddHandler(stableHandler);
    return () => {
      setViewAddHandler(null);
    };
  }, [setViewAddHandler]);
}
