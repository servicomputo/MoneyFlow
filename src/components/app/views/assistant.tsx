"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store";
import { monthLabel } from "@/lib/format";
import { isIaAvailable, getIaBaseUrl } from "@/lib/data-provider";
import { useDataModeStore } from "@/lib/data-mode";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Bot,
  User,
  Send,
  Loader2,
  Sparkles,
  RefreshCw,
  Lightbulb,
  Wand2,
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface InsightsData {
  summary: string;
  tips: string[];
}

const SUGGESTED_QUESTIONS = [
  "¿Cuánto gasté en gasolina?",
  "¿Cuánto gasté este mes?",
  "¿Cuánto pagué en Starbucks?",
  "Muéstrame compras mayores a $1,000",
  "¿Cómo van mis presupuestos?",
  "Dame consejos de ahorro",
];

export function AssistantView() {
  const month = useAppStore((s) => s.selectedMonth);
  const dataMode = useDataModeStore((s) => s.mode);
  const qc = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const iaAvailable = isIaAvailable();

  const { data: insights, isLoading: insightsLoading } = useQuery({
    queryKey: ["insights", month, dataMode, iaAvailable],
    queryFn: async () => {
      if (!iaAvailable) {
        return { summary: "", tips: [] } as InsightsData;
      }
      const iaBase = getIaBaseUrl();
      const url = iaBase ? `${iaBase}/api/insights?month=${month}` : `/api/insights?month=${month}`;
      const r = await fetch(url);
      const d = await r.json();
      return {
        summary: (d.summary as string) || "",
        tips: (d.tips as string[]) || [],
      } as InsightsData;
    },
    enabled: iaAvailable,
  });

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAsking, scrollToBottom]);

  async function send(q?: string) {
    const question = (q ?? input).trim();
    if (!question || isAsking) return;
    if (!iaAvailable) {
      toast.error("El asistente IA requiere conexión a un servidor", {
        description: "Configúralo en Configuración → Modo de datos.",
      });
      return;
    }
    setInput("");
    setMessages((m) => [...m, { role: "user", content: question }]);
    setIsAsking(true);
    try {
      const iaBase = getIaBaseUrl();
      const url = iaBase ? `${iaBase}/api/assistant` : "/api/assistant";
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, month }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Error al consultar el asistente");
      setMessages((m) => [
        ...m,
        { role: "assistant", content: d.answer as string },
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      toast.error(msg);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "Lo siento, no pude procesar tu consulta en este momento. Intenta de nuevo en unos segundos.",
        },
      ]);
    } finally {
      setIsAsking(false);
    }
  }

  async function regenerate() {
    if (!iaAvailable) {
      toast.error("Los insights IA requieren conexión a un servidor");
      return;
    }
    setRefreshing(true);
    try {
      const iaBase = getIaBaseUrl();
      const url = iaBase ? `${iaBase}/api/insights?month=${month}&refresh=1` : `/api/insights?month=${month}&refresh=1`;
      const r = await fetch(url);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Error");
      qc.setQueryData(["insights", month, dataMode, iaAvailable], {
        summary: d.summary as string,
        tips: (d.tips as string[]) || [],
      });
      toast.success("Insights regenerados correctamente");
    } catch {
      toast.error("No se pudieron regenerar los insights");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Aviso modo local sin IA */}
      {!iaAvailable && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Asistente IA no disponible en modo local</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                El asistente conversacional y los insights automáticos requieren un servidor con IA.
                Cambia a modo servidor o configura un servidor IA en Configuración → Modo de datos.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Asistente Financiero
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pregunta lo que quieras sobre tus finanzas · {monthLabel(month)}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={regenerate}
          disabled={refreshing}
          className="shrink-0"
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">Regenerar insights</span>
        </Button>
      </div>

      {/* Insights summary card */}
      {insightsLoading ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : insights && (insights.summary || insights.tips.length > 0) ? (
        <Card className="border-0 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-teal-500/10 border-emerald-500/20">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold">Resumen del mes</h3>
                  <Badge
                    variant="outline"
                    className="text-[10px] h-5 px-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  >
                    IA
                  </Badge>
                </div>
                {insights.summary ? (
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {insights.summary}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No hay resumen disponible todavía.
                  </p>
                )}
                {insights.tips.length > 0 && (
                  <div className="grid sm:grid-cols-2 gap-2 mt-3">
                    {insights.tips.map((tip, i) => (
                      <div
                        key={i}
                        className="flex gap-2 rounded-lg bg-background/60 backdrop-blur p-2.5 border border-emerald-500/10"
                      >
                        <Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs leading-relaxed">{tip}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Suggested questions chips */}
      <div className="relative">
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              disabled={isAsking}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Wand2 className="h-3 w-3" />
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Chat card */}
      <Card className="flex flex-col overflow-hidden">
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[52vh] min-h-[280px] scrollbar-thin"
        >
          {messages.length === 0 && !isAsking ? (
            <WelcomeMessage />
          ) : (
            messages.map((m, i) => <ChatBubble key={i} message={m} />)
          )}
          {isAsking && <TypingIndicator />}
        </div>

        {/* Input row */}
        <div className="border-t bg-muted/30 p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-center gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu pregunta..."
              disabled={isAsking}
              className="flex-1"
              autoFocus
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isAsking}
              className="h-10 w-10 shrink-0"
            >
              {isAsking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}

function WelcomeMessage() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4">
      <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
        <Bot className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
      </div>
      <h3 className="text-base font-semibold">Hola, soy tu asistente financiero</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
        Puedo ayudarte a entender tus gastos, presupuestos y hábitos de consumo.
        Elige una sugerencia o escribe tu propia pregunta.
      </p>
    </div>
  );
}

function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div
      className={cn(
        "flex items-end gap-2",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
          <Bot className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line",
          isUser
            ? "bg-emerald-600 text-white rounded-br-sm"
            : "bg-muted rounded-bl-sm"
        )}
      >
        {message.content}
      </div>
      {isUser && (
        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
        <Bot className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
        <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.3s]" />
        <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.15s]" />
        <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" />
      </div>
    </div>
  );
}
