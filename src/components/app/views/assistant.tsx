"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store";
import { monthLabel, formatCurrency } from "@/lib/format";
import { isIaAvailable, getIaBaseUrl } from "@/lib/data-provider";
import { useDataModeStore } from "@/lib/data-mode";
import { useOpenAIStore } from "@/lib/openai-store";
import { useCategories, useAccounts } from "../hooks";
import { dataProvider } from "@/lib/data-provider";
import {
  askAssistantWithOpenAI,
  generateInsightsWithOpenAI,
} from "@/lib/ai/openai";
import {
  canUseMoreAi,
  recordAssistantUsage,
  getMaxAiCallsPerDay,
} from "@/lib/scan-limiter";
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
  AlertCircle,
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

const ASSISTANT_SYSTEM_PROMPT = `Eres Money Flow, un asesor financiero personal experto integrado en una app de control de gastos.
Respondes en español, de forma clara, concisa y útil.
Capacidades:
- Analizar los gastos del usuario que se te proporcionan como contexto.
- Responder preguntas en lenguaje natural sobre sus finanzas.
- Dar consejos personalizados de ahorro.
- Comparar periodos, categorías y comercios.
- Detectar patrones y gastos inusuales.
Cuando respondas con cantidades, usa formato de pesos mexicanos (MXN).
Sé breve y directo. Evita listas largas; prefiere párrafos cortos.`;

export function AssistantView() {
  const month = useAppStore((s) => s.selectedMonth);
  const dataMode = useDataModeStore((s) => s.mode);
  const openaiApiKey = useOpenAIStore((s) => s.apiKey);
  const qc = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [usageRemaining, setUsageRemaining] = useState<number | null>(null);
  const maxPerDay = getMaxAiCallsPerDay();

  const iaAvailable = isIaAvailable();
  // En modo local con API key de OpenAI, también está disponible
  const openaiAvailable = Boolean(openaiApiKey);
  const canUseAssistant = iaAvailable || openaiAvailable;

  // Cargar contador de uso al montar y después de cada consulta
  const refreshUsage = useCallback(async () => {
    const { remaining } = await canUseMoreAi();
    setUsageRemaining(remaining);
  }, []);

  useEffect(() => {
    refreshUsage();
  }, [refreshUsage]);

  const { data: insights, isLoading: insightsLoading } = useQuery({
    queryKey: ["insights", month, dataMode, iaAvailable, openaiAvailable],
    queryFn: async () => {
      // Si hay API key de OpenAI, generar insights con OpenAI directamente
      if (openaiAvailable && !iaAvailable) {
        const contextText = await buildLocalContext(month);
        if (!contextText) return { summary: "", tips: [] } as InsightsData;
        return generateInsightsWithOpenAI(contextText, openaiApiKey);
      }
      // Si hay servidor IA, usar la API
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
    enabled: canUseAssistant,
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

  async function buildLocalContext(m: string): Promise<string> {
    try {
      const [y, mo] = m.split("-").map(Number);
      const start = new Date(y, mo - 1, 1);
      const end = new Date(y, mo, 0, 23, 59, 59, 999);
      const prevStart = new Date(y, mo - 2, 1);
      const prevEnd = new Date(y, mo - 1, 0, 23, 59, 59, 999);

      const [expenses, prevExpenses, budgets, subscriptions] = await Promise.all([
        dataProvider.listExpensesRange(start.toISOString(), end.toISOString()),
        dataProvider.listExpensesRange(prevStart.toISOString(), prevEnd.toISOString()),
        dataProvider.listBudgets(),
        dataProvider.listSubscriptions(),
      ]);

      const totalSpent = expenses.filter((e) => e.type !== "income").reduce((s, e) => s + e.amount, 0);
      const prevTotalSpent = prevExpenses.filter((e) => e.type !== "income").reduce((s, e) => s + e.amount, 0);
      const expenseCount = expenses.filter((e) => e.type !== "income").length;

      const byCategory: Record<string, { name: string; total: number }> = {};
      for (const e of expenses) {
        if (e.type === "income") continue;
        const name = e.category?.name || "Otro";
        if (!byCategory[name]) byCategory[name] = { name, total: 0 };
        byCategory[name].total += e.amount;
      }
      const topCategories = Object.values(byCategory).sort((a, b) => b.total - a.total).slice(0, 8);

      const byMerchant: Record<string, number> = {};
      for (const e of expenses) {
        if (e.type === "income") continue;
        const name = e.merchantName || e.category?.name || "Otro";
        byMerchant[name] = (byMerchant[name] || 0) + e.amount;
      }

      const activeSubs = subscriptions.filter((s) => s.active);
      const subsTotal = activeSubs.reduce((s, sub) => s + sub.amount, 0);

      const daysElapsed = new Date().getMonth() === mo - 1 && new Date().getFullYear() === y
        ? new Date().getDate()
        : 30;
      const avgDaily = daysElapsed > 0 ? totalSpent / daysElapsed : 0;
      const projectedMonth = avgDaily * 30;

      return `Contexto financiero del mes ${m}:
- Total gastado: $${totalSpent.toFixed(2)} MXN
- Mes anterior: $${prevTotalSpent.toFixed(2)} MXN
- Número de movimientos: ${expenseCount}
- Promedio diario: $${avgDaily.toFixed(2)} MXN
- Proyección de cierre de mes: $${projectedMonth.toFixed(2)} MXN

Top categorías:
${topCategories.map((c) => `- ${c.name}: $${c.total.toFixed(2)}`).join("\n")}

Top comercios:
${Object.entries(byMerchant).slice(0, 8).map(([name, total]) => `- ${name}: $${total.toFixed(2)}`).join("\n")}

Suscripciones activas (${activeSubs.length}, total $${subsTotal.toFixed(2)}):
${activeSubs.slice(0, 10).map((s) => `- ${s.name}: $${s.amount.toFixed(2)}`).join("\n")}

Movimientos recientes:
${expenses.slice(0, 10).map((e) => `- ${e.date.slice(0, 10)} | ${e.merchantName || e.category?.name || "N/A"} | ${e.category?.name || "Otro"} | $${e.amount.toFixed(2)}`).join("\n")}
`;
    } catch (e) {
      console.error("Error building context:", e);
      return "";
    }
  }

  async function send(q?: string) {
    const question = (q ?? input).trim();
    if (!question || isAsking) return;
    if (!canUseAssistant) {
      toast.error("Configura tu API key de OpenAI en Configuración", {
        description: "El asistente IA necesita una API key para funcionar.",
      });
      return;
    }
    // Verificar límite diario de IA (compartido con escáner)
    const { canUse, remaining, limit } = await canUseMoreAi();
    if (!canUse) {
      toast.error(`Límite diario alcanzado (${limit} consultas)`, {
        description: "Se reinicia a medianoche. Incluye escaneos y consultas al asistente.",
      });
      return;
    }
    setInput("");
    setMessages((m) => [...m, { role: "user", content: question }]);
    setIsAsking(true);
    try {
      let answer: string;

      if (openaiAvailable && !iaAvailable) {
        // Modo local (APK): usar OpenAI directamente con la API key
        const contextText = await buildLocalContext(month);
        answer = await askAssistantWithOpenAI(question, contextText, openaiApiKey);
      } else {
        // Modo servidor: usar la API del backend
        const iaBase = getIaBaseUrl();
        const url = iaBase ? `${iaBase}/api/assistant` : "/api/assistant";
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, month }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Error al consultar el asistente");
        answer = d.answer as string;
      }

      setMessages((m) => [
        ...m,
        { role: "assistant", content: answer },
      ]);
      // Registrar uso en el contador diario (compartido con escáner)
      await recordAssistantUsage(question);
      await refreshUsage();
      // Avisar cuando queden pocas consultas
      if (remaining <= 5) {
        toast.info(`Te quedan ${remaining - 1} consultas hoy`, {
          description: `Límite diario: ${limit} (escaneos + asistente)`,
        });
      }
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
    if (!canUseAssistant) {
      toast.error("Configura tu API key de OpenAI en Configuración");
      return;
    }
    // Verificar límite diario
    const { canUse, limit } = await canUseMoreAi();
    if (!canUse) {
      toast.error(`Límite diario alcanzado (${limit} consultas)`, {
        description: "Se reinicia a medianoche. Incluye escaneos y consultas al asistente.",
      });
      return;
    }
    setRefreshing(true);
    try {
      let result: InsightsData;

      if (openaiAvailable && !iaAvailable) {
        // Modo local: usar OpenAI
        const contextText = await buildLocalContext(month);
        if (!contextText) {
          toast.error("No hay datos suficientes para generar insights");
          return;
        }
        result = await generateInsightsWithOpenAI(contextText, openaiApiKey);
      } else {
        // Modo servidor: usar API
        const iaBase = getIaBaseUrl();
        const url = iaBase ? `${iaBase}/api/insights?month=${month}&refresh=1` : `/api/insights?month=${month}&refresh=1`;
        const r = await fetch(url);
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Error");
        result = {
          summary: d.summary as string,
          tips: (d.tips as string[]) || [],
        };
      }

      qc.setQueryData(["insights", month, dataMode, iaAvailable, openaiAvailable], result);
      // Registrar uso
      await recordAssistantUsage("Regenerar insights");
      await refreshUsage();
      toast.success("Insights regenerados correctamente");
    } catch {
      toast.error("No se pudieron regenerar los insights");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Aviso modo local sin IA y sin API key */}
      {!canUseAssistant && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Asistente IA no configurado</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Para usar el asistente, configura tu API key de OpenAI en{" "}
                <strong>Configuración → IA</strong>. El escáner de tickets también la usa.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Aviso modo local con API key (funciona con OpenAI) */}
      {openaiAvailable && !iaAvailable && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-3 flex items-start gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium">Asistente con OpenAI GPT-4o mini</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Funciona offline en el APK usando tu API key de OpenAI.
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
        <div className="flex items-center gap-2 shrink-0">
          {canUseAssistant && usageRemaining !== null && (
            <Badge
              variant="outline"
              className={cn(
                "text-xs h-7 px-2 gap-1",
                usageRemaining <= 5
                  ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30"
                  : usageRemaining <= 15
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
              )}
              title={`Límite diario: ${maxPerDay} consultas (escaneos + asistente). Se reinicia a medianoche.`}
            >
              <Sparkles className="h-3 w-3" />
              {usageRemaining}/{maxPerDay}
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={regenerate}
            disabled={refreshing || !canUseAssistant}
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
      </div>

      {/* Insights summary card */}
      {insightsLoading ? (
        canUseAssistant ? <Skeleton className="h-40 rounded-2xl" /> : null
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
              disabled={isAsking || !canUseAssistant}
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
            <WelcomeMessage canUseAssistant={canUseAssistant} />
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
              placeholder={canUseAssistant ? "Escribe tu pregunta..." : "Configura tu API key de OpenAI para empezar..."}
              disabled={isAsking || !canUseAssistant}
              className="flex-1"
              autoFocus
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isAsking || !canUseAssistant}
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

function WelcomeMessage({ canUseAssistant }: { canUseAssistant: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4">
      <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
        <Bot className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
      </div>
      <h3 className="text-base font-semibold">Hola, soy tu asistente financiero</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
        {canUseAssistant
          ? "Puedo ayudarte a entender tus gastos, presupuestos y hábitos de consumo. Elige una sugerencia o escribe tu propia pregunta."
          : "Configura tu API key de OpenAI en Configuración → IA para empezar a usar el asistente."}
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
