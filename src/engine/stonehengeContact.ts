import type { Vec3 } from '../data/constructionTypes';
import { clamp } from './easing';

export type StonehengeContactKind = 'none' | 'runners' | 'heel' | 'crib';

export interface StonehengeContactState {
  packingFill: number;
  contactKind: StonehengeContactKind;
  contactDustAmount: number;
}

/**
 * Mid-span droop in metres. High tension stays almost taut; slack lines hang.
 * Span is the straight chord between the two lashings.
 */
export function ropeSagMeters(tension: number, span: number): number {
  const slack = clamp(1 - tension);
  return Math.max(0, span) * (0.012 + slack * 0.1);
}

/** Parabolic sag: the midpoint drops `sag` metres below the chord. */
export function sampleParabolicRope(
  from: Vec3,
  to: Vec3,
  sag: number,
  segments: number,
): Vec3[] {
  const count = Math.max(1, Math.floor(segments));
  const points: Vec3[] = [];
  for (let index = 0; index <= count; index += 1) {
    const u = index / count;
    const drop = sag * 4 * u * (1 - u);
    points.push([
      from[0] + (to[0] - from[0]) * u,
      from[1] + (to[1] - from[1]) * u - drop,
      from[2] + (to[2] - from[2]) * u,
    ]);
  }
  return points;
}

export function packingFillAt(phase: string, phaseProgress: number): number {
  if (phase === 'seated') return 1;
  if (phase === 'packed') return clamp(phaseProgress);
  return 0;
}

export function contactStateAt(phase: string, phaseProgress: number): StonehengeContactState {
  const packingFill = packingFillAt(phase, phaseProgress);
  if (phase === 'hauled') {
    return {
      packingFill,
      contactKind: 'runners',
      contactDustAmount: 0.28 + 0.5 * Math.sin(Math.PI * clamp(phaseProgress)),
    };
  }
  if (phase === 'tilted' || phase === 'raised') {
    return {
      packingFill,
      contactKind: 'heel',
      contactDustAmount: phase === 'tilted' ? 0.38 : 0.22,
    };
  }
  if (phase === 'packed') {
    return {
      packingFill,
      contactKind: 'heel',
      contactDustAmount: 0.58 * (1 - phaseProgress * 0.45),
    };
  }
  if (phase === 'cribbed' || phase === 'hoisted') {
    return {
      packingFill,
      contactKind: 'crib',
      contactDustAmount: 0.32,
    };
  }
  return { packingFill, contactKind: 'none', contactDustAmount: 0 };
}
