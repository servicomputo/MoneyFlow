"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useSecurityStore } from "@/lib/security-store";
import { Wallet, Delete, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Pantalla de bloqueo con PIN.
 * Se muestra al abrir la app si el PIN está activado.
 * El usuario ingresa 4 dígitos para desbloquear.
 */
export function PinLockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { pin, verifyPin, clearPin, setPinEnabled } = useSecurityStore();
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [showForgot, setShowForgot] = useState(false);

  function handleDigit(d: string) {
    if (input.length >= 4) return;
    const newInput = input + d;
    setInput(newInput);
    setError(false);

    if (newInput.length === 4) {
      // Verificar después de un breve delay para que se vea el 4to punto
      setTimeout(() => {
        if (verifyPin(newInput)) {
          onUnlock();
        } else {
          setError(true);
          setAttempts((a) => a + 1);
          setInput("");
        }
      }, 150);
    }
  }

  function handleDelete() {
    setInput((prev) => prev.slice(0, -1));
    setError(false);
  }

  function handleForgotPin() {
    setShowForgot(true);
  }

  function confirmForgotPin() {
    // Borrar el PIN y desactivar el bloqueo
    // NO llamar a onUnlock — la app debe recargar para mostrar el dashboard
    // sin PIN activado
    clearPin();
    setPinEnabled(false);
    // Recargar la página para que el shell detecte que ya no hay PIN
    window.location.reload();
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="h-16 w-16 rounded-2xl flex items-center justify-center shadow-lg mb-6" style={{ background: "linear-gradient(135deg, #0A0A0A, #1a1a1a)" }}>
        <Wallet className="h-8 w-8" style={{ color: "#D4AF37" }} />
      </div>

      {/* Título */}
      <h1 className="text-xl font-bold mb-1">Money Flow</h1>
      <p className="text-sm text-muted-foreground mb-8 flex items-center gap-1.5">
        <Lock className="h-3.5 w-3.5" />
        Ingresa tu PIN para continuar
      </p>

      {/* Dots del PIN */}
      <div className="flex gap-4 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "h-4 w-4 rounded-full transition-all",
              error
                ? "bg-red-500 animate-pulse"
                : input.length > i
                ? "bg-primary scale-110"
                : "bg-muted border-2 border-border"
            )}
          />
        ))}
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 mb-4">
          PIN incorrecto{attempts >= 3 ? `. Intento ${attempts + 1}` : ""}
        </p>
      )}

      {/* Teclado numérico */}
      <div className="grid grid-cols-3 gap-3 max-w-xs w-full">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => handleDigit(d)}
            className="h-16 rounded-2xl bg-muted/50 hover:bg-muted transition-colors text-2xl font-semibold active:scale-95"
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          onClick={handleForgotPin}
          className="h-16 rounded-2xl text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          Olvidé mi PIN
        </button>
        <button
          type="button"
          onClick={() => handleDigit("0")}
          className="h-16 rounded-2xl bg-muted/50 hover:bg-muted transition-colors text-2xl font-semibold active:scale-95"
        >
          0
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="h-16 rounded-2xl bg-muted/50 hover:bg-muted transition-colors flex items-center justify-center active:scale-95"
        >
          <Delete className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      {/* Diálogo: Olvidé mi PIN */}
      {showForgot && (
        <div
          className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setShowForgot(false)}
        >
          <div
            className="bg-background rounded-2xl max-w-sm w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-base font-semibold">¿Olvidaste tu PIN?</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Si continúas, se desactivará el bloqueo con PIN y podrás entrar a la app sin PIN.
              Podrás volver a activarlo desde Configuración → Seguridad.
            </p>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowForgot(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={confirmForgotPin}
              >
                Desactivar PIN
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Diálogo para crear un PIN nuevo.
 * Pide 4 dígitos dos veces para confirmar.
 */
export function PinSetupDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { setPin, setPinEnabled } = useSecurityStore();
  const [step, setStep] = useState<"create" | "confirm">("create");
  const [firstPin, setFirstPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStep("create");
     
    setFirstPin("");
     
    setConfirmPin("");
     
    setError("");
  }, [open]);

  if (!open) return null;

  const currentPin = step === "create" ? firstPin : confirmPin;
  const title = step === "create" ? "Crea tu PIN" : "Confirma tu PIN";
  const subtitle = step === "create" ? "Ingresa 4 dígitos" : "Repite los 4 dígitos";

  function handleDigit(d: string) {
    setError("");
    if (step === "create") {
      if (firstPin.length >= 4) return;
      const newPin = firstPin + d;
      setFirstPin(newPin);
      if (newPin.length === 4) {
        setTimeout(() => setStep("confirm"), 200);
      }
    } else {
      if (confirmPin.length >= 4) return;
      const newPin = confirmPin + d;
      setConfirmPin(newPin);
      if (newPin.length === 4) {
        setTimeout(() => {
          if (newPin === firstPin) {
            setPin(newPin);
            setPinEnabled(true);
            onSuccess();
          } else {
            setError("Los PINs no coinciden");
            setConfirmPin("");
          }
        }, 200);
      }
    }
  }

  function handleDelete() {
    setError("");
    if (step === "create") {
      setFirstPin((prev) => prev.slice(0, -1));
    } else {
      setConfirmPin((prev) => prev.slice(0, -1));
    }
  }

  function handleCancel() {
    onOpenChange(false);
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg mb-5" style={{ background: "linear-gradient(135deg, #0A0A0A, #1a1a1a)" }}>
        <Lock className="h-7 w-7" style={{ color: "#D4AF37" }} />
      </div>

      <h1 className="text-xl font-bold mb-1">{title}</h1>
      <p className="text-sm text-muted-foreground mb-6">{subtitle}</p>

      {/* Dots */}
      <div className="flex gap-4 mb-6">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "h-4 w-4 rounded-full transition-all",
              error
                ? "bg-red-500"
                : currentPin.length > i
                ? "bg-primary scale-110"
                : "bg-muted border-2 border-border"
            )}
          />
        ))}
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

      {/* Teclado */}
      <div className="grid grid-cols-3 gap-3 max-w-xs w-full">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => handleDigit(d)}
            className="h-14 rounded-2xl bg-muted/50 hover:bg-muted transition-colors text-xl font-semibold active:scale-95"
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          onClick={handleCancel}
          className="h-14 rounded-2xl text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => handleDigit("0")}
          className="h-14 rounded-2xl bg-muted/50 hover:bg-muted transition-colors text-xl font-semibold active:scale-95"
        >
          0
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="h-14 rounded-2xl bg-muted/50 hover:bg-muted transition-colors flex items-center justify-center active:scale-95"
        >
          <Delete className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
