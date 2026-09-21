export const ARRIVAL_MIN_MS = 600;
export const ARRIVAL_COMPLETE_HOLD_MS = 100;

/** Presentation may trail preparation, but never claims unready assets. */
export function arrivalProgress(elapsedMs: number, measured: number, ready: boolean): number {
  const available = ready ? 100 : Math.min(99, Math.floor(Math.max(0, measured) * 100));
  return Math.min(available, Math.floor(Math.max(0, elapsedMs) / ARRIVAL_MIN_MS * 100), 100);
}
