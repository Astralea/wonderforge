/**
 * Tier 4 "field birds": a typed description of the black-kite flock working
 * the cultivated strip and levee thermals east of the Giza plateau, plus its
 * deterministic flight sampler. Pure serializable data and pure functions of
 * playback t — no React, DOM, or Three.js imports.
 *
 * The renderer (`src/render/three/FieldBirds.ts`) consumes this description;
 * placement semantics live here, not in renderer-side magic numbers. This
 * mirrors the river-egret pattern ("River birds" in `gizaEnvironment.ts`):
 * the egrets work the water, the kites work the fields.
 */

import { smoothstep } from '../engine/easing';
import { mulberry32 } from '../engine/random';
import { greenbeltInnerEdgeAt, type BirdState } from './gizaEnvironment';

/** Linear interpolation across a [min, max] band by a unit parameter. */
function lerp01(range: readonly [number, number], u: number): number {
  return range[0] + u * (range[1] - range[0]);
}

export interface FieldBirdFlockDescription {
  id: 'field-kite-flock';
  species: 'black-kite';
  count: number;
  /**
   * Orbit centers spread evenly along this x band (with a small per-bird
   * jitter); the orbit z tracks the sampled greenbelt inner edge, so the
   * flock follows every bend of the cultivated strip.
   */
  centerX: [number, number];
  /** Per-bird orbit radii ranges: along x and across the strip edge. */
  radiusX: [number, number];
  radiusZ: [number, number];
  /** Orbit center offset landward (+z) of the greenbelt inner edge. */
  stripOffset: [number, number];
  altitude: [number, number];
  /** Closed circuits per movie (magnitude); half the flock flies counter. */
  circuitsPerMovie: [number, number];
  /** Wing-beat cycles per movie while flapping (~1.7-2.3 Hz at 1x). */
  wingBeatsPerMovie: [number, number];
  description: string;
  historicalNote: string;
}

export const FIELD_BIRD_FLOCK: FieldBirdFlockDescription = {
  id: 'field-kite-flock',
  species: 'black-kite',
  count: 18,
  // The centers tile the strip end to end (one bird per ~10 world units)
  // inside the channel span [-118, 99]; with the widest x-radius the farthest
  // excursions still land inside that span.
  centerX: [-100, 80],
  // Radii are capped so the flock quarters the strip and the levee line only:
  // the deepest landward reach (stripOffset + radiusZ = 12) still clears the
  // nearest earthwork (Menkaure's footprint edge, ~22 units beyond) with
  // margin, and no orbit ever crosses a monument or ramp footprint.
  radiusX: [7, 12],
  radiusZ: [2.2, 4],
  stripOffset: [5, 8],
  altitude: [3.5, 8],
  circuitsPerMovie: [2, 3.5],
  wingBeatsPerMovie: [110, 150],
  description:
    'A looser, larger second flock — black kites quartering the cultivated ' +
    'strip and riding the levee thermals on closed circling paths: position, ' +
    'heading, bank, wing flap, and glide gates are pure functions of ' +
    'playback t. Orbit centers spread along the whole greenbelt so the birds ' +
    'work the fields end to end, always over the strip or the river edge ' +
    'and never above the monument and ramp footprints behind them.',
  historicalNote:
    'Black kites (Milvus migrans) were the everyday scavengers of the Old ' +
    'Kingdom floodplain, wheeling over tilled fields, levees, and settlement ' +
    'middens; they soar on midday thermals rising off warm ground in loose, ' +
    'drifting groups.',
};

/**
 * Deterministic circling flight over the cultivated strip at playback `t`.
 * Same kinematic contract as `birdStateAt`: a closed elliptical orbit glued
 * to the sampled strip edge, heading from the orbit derivative (yaw =
 * atan2(dx, dz); forward is +z rotated by yaw about +y), a constant bank
 * into the turn, and glide gates that hold a shallow dihedral.
 */
export function fieldBirdStateAt(index: number, t: number): BirdState {
  const flock = FIELD_BIRD_FLOCK;
  const random = mulberry32(`giza:field-bird:${index}`);
  const phase = random();
  const direction = index % 2 === 0 ? 1 : -1;
  // Even coverage of the strip band plus a jitter smaller than the spacing,
  // so neighboring kites share airspace without stacking on one track.
  const lane = (index + 0.5) / flock.count;
  const jitter = ((flock.centerX[1] - flock.centerX[0]) / flock.count) * 0.6;
  const centerX = lerp01(flock.centerX, lane) + (random() - 0.5) * jitter;
  const radiusX = lerp01(flock.radiusX, random());
  const radiusZ = lerp01(flock.radiusZ, random());
  const stripOffset = lerp01(flock.stripOffset, random());
  const altitude = lerp01(flock.altitude, random());
  const circuits = lerp01(flock.circuitsPerMovie, random());
  const beats = lerp01(flock.wingBeatsPerMovie, random());
  const flapPhase = random() * Math.PI * 2;
  const glidePhase = random() * Math.PI * 2;
  const bobPhase = random() * Math.PI * 2;

  const theta = Math.PI * 2 * (phase + t * circuits * direction);
  const x = centerX + radiusX * Math.cos(theta);
  const z = greenbeltInnerEdgeAt(x) + stripOffset + radiusZ * Math.sin(theta);
  const y = altitude + 1.1 * Math.sin(2 * theta + bobPhase);

  // Heading from the orbit derivative; atan2(dx, dz) matches the scene's
  // yaw convention (forward = +z rotated by yaw about +y).
  const dTheta = direction;
  const dx = -radiusX * Math.sin(theta) * dTheta;
  const dz =
    (greenbeltInnerEdgeAt(x + 0.5) - greenbeltInnerEdgeAt(x - 0.5)) * dx +
    radiusZ * Math.cos(theta) * dTheta;
  const yaw = Math.atan2(dx, dz);
  const horizontal = Math.hypot(dx, dz);
  const pitch =
    Math.atan2(2.2 * Math.cos(2 * theta + bobPhase), Math.max(horizontal, 1e-6)) * 0.35;
  // Constant bank into the circuit direction, as a circling bird does.
  const roll = -direction * 0.16;

  // Kites soar more than they flap: the glide gate opens wider than the
  // egrets', and glides hold a shallow dihedral with a hint of rocking.
  const glideSine = Math.sin(t * Math.PI * 2 * (1.1 + circuits * 0.6) + glidePhase);
  const glide = smoothstep((glideSine - 0.15) / 0.35);
  const flap = Math.sin(t * Math.PI * 2 * beats + flapPhase);
  const wingAngle = 0.16 + 0.58 * (1 - glide) * flap + glide * 0.05 * flap;

  return { x, y, z, yaw, pitch, roll, wingAngle };
}
