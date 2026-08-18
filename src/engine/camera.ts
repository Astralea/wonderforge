import type { StructureSpec } from '../data/types';
import { clamp, easeInOutQuad } from './easing';
import { boundingCylinder, flattenStages } from './geometry';
import { DEFAULT_PHASES, type PhaseBounds } from './timeline';

/** Spec 02 §Camera. */
export const CAMERA = {
  pitchDeg: 30,
  fov: 35,
  /** Full turns of azimuth across the movie. */
  turns: 1.25,
  introRadiusFactor: 1.25,
  revealRadiusFactor: 1.08,
  targetHeightFactor: 0.4,
  /** Vertical drift amplitude as a fraction of structure height. */
  targetDrift: 0.02,
} as const;

export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

/** Orbit distance for the BUILD phase, derived from the bounding cylinder. */
export function baseRadius(structure: StructureSpec): number {
  const { radius, height } = boundingCylinder(flattenStages(structure));
  return Math.max(8, 2.6 * Math.max(radius, 0.5 * height) * (structure.framing ?? 1));
}

function radiusAt(t: number, base: number, bounds: PhaseBounds): number {
  if (t < bounds.intro) {
    const k = easeInOutQuad(t / bounds.intro);
    return base * (CAMERA.introRadiusFactor + (1 - CAMERA.introRadiusFactor) * k);
  }
  if (t > bounds.buildEnd) {
    const k = easeInOutQuad((t - bounds.buildEnd) / (1 - bounds.buildEnd));
    return base * (1 + (CAMERA.revealRadiusFactor - 1) * k);
  }
  return base;
}

/** Reference aspect where no compensation applies (16:9). */
export const REFERENCE_ASPECT = 1.78;

/**
 * Narrow viewports shrink the horizontal FOV; widen the orbit so the
 * silhouette keeps breathing room (Spec 02 §Camera).
 */
export function aspectCompensation(aspect: number): number {
  return Math.pow(clamp(REFERENCE_ASPECT / Math.max(aspect, 0.3), 1, 2.2), 0.45);
}

/** Raw orbit parameters — used by cameraStateAt and by the 2D renderer. */
export interface OrbitState {
  /** Radians. Camera sits at (cos θ, sin θ) × radius. */
  azimuth: number;
  pitchDeg: number;
  radius: number;
  targetY: number;
}

export function orbitState(
  rawT: number,
  structure: StructureSpec,
  bounds: PhaseBounds = DEFAULT_PHASES,
  aspect: number = REFERENCE_ASPECT,
): OrbitState {
  const t = clamp(rawT);
  const base = baseRadius(structure) * aspectCompensation(aspect);
  const { height } = boundingCylinder(flattenStages(structure));
  return {
    azimuth:
      (structure.startAzimuth ?? 0) +
      2 * Math.PI * (structure.turns ?? CAMERA.turns) * t,
    pitchDeg: CAMERA.pitchDeg,
    radius: radiusAt(t, base, bounds),
    targetY:
      height * CAMERA.targetHeightFactor +
      height * CAMERA.targetDrift * Math.sin(2 * Math.PI * t),
  };
}

export function cameraStateAt(
  rawT: number,
  structure: StructureSpec,
  bounds: PhaseBounds = DEFAULT_PHASES,
  aspect: number = REFERENCE_ASPECT,
): CameraState {
  const o = orbitState(rawT, structure, bounds, aspect);
  const pitch = (o.pitchDeg * Math.PI) / 180;
  const horizontal = o.radius * Math.cos(pitch);
  return {
    position: [
      Math.cos(o.azimuth) * horizontal,
      o.radius * Math.sin(pitch),
      Math.sin(o.azimuth) * horizontal,
    ],
    target: [0, o.targetY, 0],
    fov: CAMERA.fov,
  };
}
