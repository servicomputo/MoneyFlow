"use client";

import { getLocalDB, localId } from "./local-db";

const MAX_TICKETS_PER_DAY = 50;

interface ScanRecord {
  id: string;
  date: string;
  timestamp: string;
  merchant?: string;
  amount?: number;
  deviceId: string;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getTodayScanCount(): Promise<number> {
  const db = await getLocalDB();
  const today = todayKey();
  const records = await db.meta.get(`scans-${today}`);
  if (!records) return 0;
  return (records.value as { count: number })?.count || 0;
}

export function getMaxTicketsPerDay(): number {
  return MAX_TICKETS_PER_DAY;
}

export async function canScanMore(): Promise<{ canScan: boolean; used: number; limit: number }> {
  const used = await getTodayScanCount();
  return {
    canScan: used < MAX_TICKETS_PER_DAY,
    used,
    limit: MAX_TICKETS_PER_DAY,
  };
}

export async function recordScan(merchant?: string, amount?: number): Promise<void> {
  const db = await getLocalDB();
  const today = todayKey();
  const key = `scans-${today}`;
  const existing = await db.meta.get(key);
  const currentCount = (existing?.value as { count: number })?.count || 0;
  await db.meta.put({ key, value: { count: currentCount + 1 } });
  const record: ScanRecord = {
    id: localId(),
    date: today,
    timestamp: new Date().toISOString(),
    merchant,
    amount,
    deviceId: "local",
  };
  await db.meta.put({ key: `scan-record-${record.id}`, value: record });
}
