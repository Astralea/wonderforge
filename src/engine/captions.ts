/**
 * Caption envelope engine (Spec 05 §Caption layer): which caption shows at
 * playback t, and how faded. A pure function of t — scrubbing and pausing
 * freeze a caption exactly mid-fade; determinism identical to the renderer.
 */

import { smoothstep } from './easing';
import type { CaptionBeat } from '../data/captions';

export interface CaptionState {
  id: string;
  kicker: string;
  text: string;
  place: CaptionBeat['place'];
  from: number;
  until: number;
  /** 0 outside the window; smoothstep fade edges at both ends. */
  opacity: number;
}

export type CaptionBeatProgress = 'upcoming' | 'current' | 'past';

/** Where t sits relative to one authored window. Pure; used by the beat index. */
export function captionBeatProgressAt(beat: CaptionBeat, t: number): CaptionBeatProgress {
  if (t < beat.from) return 'upcoming';
  if (t < beat.until) return 'current';
  return 'past';
}

/**
 * The active caption at t, if any. Windows are disjoint by construction;
 * fade spans scale with the window (never shorter than 0.012 of t, never
 * more than 18% of the window), so a caption always holds a plateau at full
 * opacity — long enough to read — between its fades.
 */
export function captionStateAt(beats: readonly CaptionBeat[], t: number): CaptionState | null {
  for (const beat of beats) {
    if (t >= beat.from && t < beat.until) {
      const fade = Math.min(0.012, (beat.until - beat.from) * 0.18);
      const opacity = smoothstep((t - beat.from) / fade) * smoothstep((beat.until - t) / fade);
      return {
        id: beat.id,
        kicker: beat.kicker,
        text: beat.text,
        place: beat.place,
        from: beat.from,
        until: beat.until,
        opacity,
      };
    }
  }
  return null;
}
