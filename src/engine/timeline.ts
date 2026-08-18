import type { Part } from '../data/types';
import { clamp, easeOutCubic } from './easing';

/** Spec 02 §Normalized time. */
export interface PhaseBounds {
  /** t below this is INTRO. */
  intro: number;
  /** t at/above this is REVEAL. */
  buildEnd: number;
}

export const DEFAULT_PHASES: PhaseBounds = { intro: 0.08, buildEnd: 0.92 };

export type Phase = 'intro' | 'build' | 'reveal';

export function phaseAt(t: number, bounds: PhaseBounds = DEFAULT_PHASES): Phase {
  if (t < bounds.intro) return 'intro';
  if (t < bounds.buildEnd) return 'build';
  return 'reveal';
}

/** Fraction of a stage's duration that the next stage overlaps. */
export const STAGE_OVERLAP = 0.35;

export interface TimeWindow {
  start: number;
  end: number;
}

/**
 * All stage windows for a structure, honoring per-stage rhythm weights
 * (Spec 02 §Construction timeline): heavier stages linger, repetitive ones
 * are brisk. Overlap pattern and BUILD bounds are preserved.
 */
export function stageWindows(
  stages: readonly { weight?: number }[],
  bounds: PhaseBounds = DEFAULT_PHASES,
): TimeWindow[] {
  const n = stages.length;
  const w = stages.map((s) => s.weight ?? 1);
  const span = bounds.buildEnd - bounds.intro;
  const tailWeight = w[n - 1] ?? 1;
  const restWeight = w.slice(0, -1).reduce((a, b) => a + b, 0);
  const unit = span / ((1 - STAGE_OVERLAP) * restWeight + tailWeight);
  const out: TimeWindow[] = [];
  let start = bounds.intro;
  for (let i = 0; i < n; i++) {
    const duration = w[i]! * unit;
    out.push({ start, end: start + duration });
    start += duration * (1 - STAGE_OVERLAP);
  }
  return out;
}

export function stageWindow(
  index: number,
  count: number,
  bounds: PhaseBounds = DEFAULT_PHASES,
  weights?: number[],
): TimeWindow {
  const ws = weights ?? Array<number>(count).fill(1);
  return stageWindows(ws.map((weight) => ({ weight })), bounds)[index]!;
}

/** Raw 0..1 progress of a part's own window at time t. */
export function partProgress(t: number, window: TimeWindow): number {
  return clamp((t - window.start) / (window.end - window.start));
}

/** Delay applied per unit of stack order; later courses start later. */
export const STACK_STAGGER = 0.12;

export function staggeredProgress(p: number, order: number): number {
  if (order <= 0) return clamp(p);
  const lag = order * STACK_STAGGER;
  return clamp(clamp(p) * (1 + lag) - lag);
}

export interface EntranceState {
  visible: boolean;
  /** Added to the part's authored y. */
  yOffset: number;
  /** Uniform scale multiplier — ALWAYS 1 for visible parts (no scaling stones). */
  scale: number;
  opacity: number;
}

const HIDDEN: EntranceState = { visible: false, yOffset: 0, scale: 0, opacity: 0 };
/** Present and at rest. */
export const SETTLED: EntranceState = { visible: true, yOffset: 0, scale: 1, opacity: 1 };

/** Parts settle within the first 18% of their own staggered placement beat. */
export const PLACEMENT_SPAN = 0.18;
/** Local progress where the stone first touches its seat and dust lands. */
export const PLACEMENT_CONTACT = PLACEMENT_SPAN * 0.72;

/**
 * Additive entrances (Spec 02 §Construction truth). A timelapse frame skips
 * the placing motion: the part APPEARS at full size a hair above its seat
 * (≤ 8% of its height, ≤ 1 world unit) and settles down with a small dip.
 * Never scaled, never traveling.
 */
export function entranceState(part: Part, rawProgress: number): EntranceState {
  const entrance = part.entrance ?? 'place';
  // 'none' is the raw site; carve/scaffold are lifecycle-timed elsewhere.
  if (entrance === 'none' || entrance === 'scaffold' || entrance === 'carve') {
    return SETTLED;
  }
  const p =
    entrance === 'stack'
      ? staggeredProgress(rawProgress, part.order ?? 0)
      : clamp(rawProgress);

  if (p <= 0) return HIDDEN;

  if (entrance === 'fade') {
    // non-solids only: pure opacity ramp
    return { visible: true, yOffset: 0, scale: 1, opacity: easeOutCubic(p) };
  }

  const height = part.scale[1];
  const drop = Math.min(height * 0.08, 1);
  const k = clamp(p / PLACEMENT_SPAN);
  const descent = clamp(k / 0.72);
  let yOffset = drop * (1 - easeOutCubic(descent));
  // brief contact compression after landing, then exact rest
  const contact = clamp((k - 0.72) / 0.28);
  if (contact > 0) {
    yOffset -= Math.sin(contact * Math.PI) * 0.035 * Math.min(height, 3);
  }
  return { visible: true, yOffset, scale: 1, opacity: 1 };
}

/**
 * Subtractive entrance (Spec 02): the chunk is present from the start and is
 * carved away top-down during its stage window — accelerating drop, late
 * fade. `carveState` needs absolute time, so it takes (t, window).
 */
export function carveState(part: Part, t: number, window: TimeWindow): EntranceState {
  if (t < window.start) return SETTLED; // raw rock, awaiting the chisel
  const p = partProgress(t, window);
  const ep = staggeredProgress(p, part.order ?? 0);
  const d = clamp((ep - 0.55) / 0.45); // exit motion within the window
  if (d <= 0) return SETTLED;
  if (d >= 1 - 1e-9) return HIDDEN; // float-safe: the exit completes exactly
  const height = part.scale[1];
  return {
    visible: true,
    // gravity-true: accelerates, and drops at most its own height
    yOffset: -(d * d) * (height * 0.9 + 0.5),
    scale: 1,
    opacity: Math.pow(1 - d, 1.5),
  };
}
