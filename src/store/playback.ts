import { create } from 'zustand';
import { WONDERS } from '../data';
import { clamp } from '../engine/easing';
import { prefersReducedMotion } from '../ui/a11y';

/** Spec 03 §State model. */
export type PlaybackStatus = 'idle' | 'playing' | 'paused' | 'complete';

/** Spec 02: wall-clock speed multipliers; `t` stays the source of truth. */
export const PLAYBACK_SPEEDS = [1, 2, 4] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

export interface PlaybackState {
  wonderId: string;
  status: PlaybackStatus;
  /** Normalized movie time, 0..1. */
  t: number;
  durationMs: number;
  /** Wall-clock speed multiplier (1×/2×/4×). */
  speed: PlaybackSpeed;
  select: (id: string) => void;
  play: () => void;
  pause: () => void;
  seek: (t: number) => void;
  setSpeed: (speed: PlaybackSpeed) => void;
  tick: (deltaMs: number) => void;
  replay: () => void;
}

export function createInitialState(): Pick<
  PlaybackState,
  'wonderId' | 'status' | 't' | 'durationMs' | 'speed'
> {
  return {
    wonderId: WONDERS[0]!.id,
    status: 'idle',
    t: 0,
    durationMs: 60_000,
    speed: 1,
  };
}

export const usePlaybackStore = create<PlaybackState>((set, get) => ({
  ...createInitialState(),

  select: (id) => {
    if (!WONDERS.some((w) => w.id === id)) {
      throw new Error(`Unknown wonder id: ${id}`);
    }
    set({ wonderId: id, status: 'idle', t: 0 });
  },

  play: () => {
    const { status } = get();
    if (status !== 'idle' && status !== 'paused') return;
    // Reduced motion: the renderer suppresses tick(), so 'playing' would be
    // a dead state. Show the completed still instead (matches openWonder).
    if (prefersReducedMotion()) {
      set({ t: 1, status: 'complete' });
      return;
    }
    set({ status: 'playing' });
  },

  pause: () => {
    if (get().status === 'playing') set({ status: 'paused' });
  },

  seek: (t) => {
    const { status } = get();
    set({ t: clamp(t), status: status === 'complete' ? 'paused' : status });
  },

  setSpeed: (speed) => {
    if (!PLAYBACK_SPEEDS.includes(speed)) {
      throw new Error(`Unsupported playback speed: ${speed}`);
    }
    set({ speed });
  },

  tick: (deltaMs) => {
    const s = get();
    if (s.status !== 'playing') return;
    const t = clamp(s.t + (deltaMs * s.speed) / s.durationMs);
    set(t >= 1 ? { t: 1, status: 'complete' } : { t });
  },

  replay: () => {
    // Reduced motion: jump straight to the completed still, consistent with
    // openWonder's reduced-motion behavior (completed frame, scrubbable).
    if (prefersReducedMotion()) {
      set({ t: 1, status: 'complete' });
      return;
    }
    set({ t: 0, status: 'playing' });
  },
}));
