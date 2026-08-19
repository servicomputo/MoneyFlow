"use client";

import { getLocalDB, localId } from "./local-db";

// Límite diario unificado: 50 consultas de IA por día (escaneos + asistente)
const MAX_AI_CALLS_PER_DAY = 50;

interface UsageRecord {
  id: string;
  date: string;
  timestamp: string;
  type: "scan" | "assistant";
  merchant?: string;
  amount?: number;
  question?: string;
  deviceId: string;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Cuenta cuántas consultas de IA (escaneos + asistente) se han hecho hoy.
 */
export async function getTodayUsageCount(): Promise<number> {
  const db = await getLocalDB();
  const today = todayKey();
  const records = await db.meta.get(`ai-usage-${today}`);
  if (!records) return 0;
  return (records.value as { count: number })?.count || 0;
}

/**
 * Alias para compatibilidad con el código existente del escáner.
 */
export async function getTodayScanCount(): Promise<number> {
  return getTodayUsageCount();
}

export function getMaxTicketsPerDay(): number {
  return MAX_AI_CALLS_PER_DAY;
}

/**
 * Alias para compatibilidad.
 */
export function getMaxAiCallsPerDay(): number {
  return MAX_AI_CALLS_PER_DAY;
}

/**
 * Verifica si se pueden hacer más consultas de IA hoy.
 */
export async function canUseMoreAi(): Promise<{ canUse: boolean; used: number; limit: number; remaining: number }> {
  const used = await getTodayUsageCount();
  return {
    canUse: used < MAX_AI_CALLS_PER_DAY,
    used,
    limit: MAX_AI_CALLS_PER_DAY,
    remaining: Math.max(0, MAX_AI_CALLS_PER_DAY - used),
  };
}

/**
 * Alias para compatibilidad con el escáner.
 */
export async function canScanMore(): Promise<{ canScan: boolean; used: number; limit: number }> {
  const { canUse, used, limit } = await canUseMoreAi();
  return {
    canScan: canUse,
    used,
    limit,
  };
}

/**
 * Registra una consulta de IA (escaneo o asistente) en el contador diario.
 */
export async function recordUsage(type: "scan" | "assistant", metadata?: { merchant?: string; amount?: number; question?: string }): Promise<void> {
  const db = await getLocalDB();
  const today = todayKey();
  const key = `ai-usage-${today}`;
  const existing = await db.meta.get(key);
  const currentCount = (existing?.value as { count: number })?.count || 0;
  await db.meta.put({ key, value: { count: currentCount + 1 } });

  // Guardar registro detallado para auditoría
  const record: UsageRecord = {
    id: localId(),
    date: today,
    timestamp: new Date().toISOString(),
    type,
    merchant: metadata?.merchant,
    amount: metadata?.amount,
    question: metadata?.question?.slice(0, 200), // solo primeros 200 caracteres
    deviceId: "local",
  };
  await db.meta.put({ key: `usage-record-${record.id}`, value: record });
}

/**
 * Alias para compatibilidad con el código existente del escáner.
 */
export async function recordScan(merchant?: string, amount?: number): Promise<void> {
  await recordUsage("scan", { merchant, amount });
}

/**
 * Registra una consulta al asistente financiero.
 */
export async function recordAssistantUsage(question: string): Promise<void> {
  await recordUsage("assistant", { question });
}
