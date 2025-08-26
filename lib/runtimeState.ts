// lib/runtimeState.ts
// Ephemeral, zero-cost state shared across API routes (persists per instance)
type State = { uploadsToday: number; dayStamp: string };

const g = globalThis as any;
if (!g.__LATAM_STATE__) {
  g.__LATAM_STATE__ = {
    uploadsToday: 0,
    dayStamp: new Date().toISOString().slice(0, 10),
  } as State;
}

export function getState(): State {
  const s: State = g.__LATAM_STATE__;
  const today = new Date().toISOString().slice(0, 10);
  if (s.dayStamp !== today) {
    s.dayStamp = today;
    s.uploadsToday = 0; // reset daily
  }
  return s;
}
