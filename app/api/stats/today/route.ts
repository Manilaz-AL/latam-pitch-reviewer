// app/api/stats/today/route.ts
import { NextResponse } from "next/server";
import { getState } from "@/lib/runtimeState";

/**
 * Deterministic, human-looking baseline that increases during the day,
 * with small time-varying jitter + real uploads added on top.
 * Zero infra cost; no external DB.
 */
function seededInt(seed: string, min: number, max: number) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const r = (h >>> 0) / 2 ** 32; // 0..1
  return Math.floor(min + r * (max - min + 1));
}

export async function GET() {
  const now = new Date();
  const yyyyMmDd = now.toISOString().slice(0, 10);
  const minutes = now.getHours() * 60 + now.getMinutes();
  const dayMinutes = 24 * 60;

  // Daily target baseline depends on the date (varies day by day)
  // Tune these numbers to fit your narrative.
  const dailyTarget = seededInt(yyyyMmDd + "T", 18, 55); // total "organic" uploads for the day

  // Progressively reveal baseline over the day (ramps up, never drops)
  const scheduled = Math.floor((dailyTarget * minutes) / dayMinutes);

  // Small jitter so the line moves in uneven steps (changes every ~7 minutes)
  const bucket = Math.floor(minutes / 7);
  const jitter = seededInt(yyyyMmDd + ":" + bucket, 0, 2);

  // Real uploads from this instance
  const real = getState().uploadsToday;

  const uploadsToday = Math.max(0, scheduled + jitter) + real;

  return NextResponse.json({ ok: true, date: yyyyMmDd, uploadsToday });
}
