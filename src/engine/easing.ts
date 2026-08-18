export function clamp(v: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, v));
}

/**
 * Clamped smoothstep: 0 below the window, 1 above it, with zero slope at both
 * ends so a quantity that grows through it starts and stops without a visible
 * kink.
 */
export function smoothstep(t: number): number {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
}

export function easeOutCubic(t: number): number {
  const k = clamp(t);
  return 1 - Math.pow(1 - k, 3);
}

export function easeInOutQuad(t: number): number {
  const k = clamp(t);
  return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
}

/** easeOutBack: rises past 1 and settles — the "thunk" of a block landing. */
export function overshoot(t: number): number {
  const k = clamp(t);
  if (k <= 0) return 0;
  if (k >= 1) return 1;
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
}
