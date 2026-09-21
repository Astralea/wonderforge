/**
 * Mean-nearside albedo orientation for the authored AD 80 Jun 21 moonrise.
 * This does not change the astronomical direction, phase or surface lighting.
 */
import { COLOSSEUM_EPHEMERIS } from '../data/colosseumEphemeris';
import type { CelestialDirection } from './colosseumAstronomy';

export type MoonSurfaceRendererDirection = readonly [east: number, up: number, south: number];

/**
 * Horizons quantity 17: counterclockwise from true-of-date celestial north.
 * A fixed -3.85° differs by at most 0.123° from the six independent samples
 * at 19:00–20:15 UT1, covering the visible closing moonrise (film ends 20:09).
 * It is a closing-window approximation, not an all-day pole/libration model.
 * Evidence: artifacts/colosseum-moon-surface-2026-09-21/research/.
 */
export const COLOSSEUM_MOON_SURFACE_POSITION_ANGLE_DEGREES = -3.85;

const latitude = COLOSSEUM_EPHEMERIS.observer.latitudeDegrees * Math.PI / 180;
// True celestial north expressed in the observer's local renderer frame.
// No J2000 RA/Dec is mixed into Horizons' true-of-date position angle.
const celestialPole: MoonSurfaceRendererDirection = [0, Math.sin(latitude), -Math.cos(latitude)];
const positionAngle = COLOSSEUM_MOON_SURFACE_POSITION_ANGLE_DEGREES * Math.PI / 180;

function dot(a: MoonSurfaceRendererDirection, b: MoonSurfaceRendererDirection): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a: MoonSurfaceRendererDirection, b: MoonSurfaceRendererDirection): MoonSurfaceRendererDirection {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function normalize(v: MoonSurfaceRendererDirection): MoonSurfaceRendererDirection {
  const length = Math.hypot(...v);
  if (!Number.isFinite(length) || length < 1e-12) {
    throw new RangeError('A finite nonzero Moon direction away from the celestial poles is required.');
  }
  return [v[0] / length, v[1] / length, v[2] / length];
}

/**
 * Input uses the astronomy API's east/up/NORTH frame. Output uses the renderer's
 * east/up/SOUTH frame, already reflected once at this explicit boundary.
 *
 * `up` points toward the projected lunar north pole; `right` points toward
 * increasing lunar east longitude on a mean-nearside disc. right × up points
 * toward the observer (-renderedMoonDirection), preserving an unmirrored map.
 *
 * For albedo projection only: the sphere normal and Moon-to-Sun vector stay in
 * their existing renderer frame. The texture remains centred on 0° longitude,
 * 0° latitude; subobserver latitude/longitude and physical libration are omitted.
 */
export function colosseumMoonSurfaceBasisAt(moonDirection: CelestialDirection): {
  right: MoonSurfaceRendererDirection;
  up: MoonSurfaceRendererDirection;
} {
  const direction = normalize([moonDirection[0], moonDirection[1], -moonDirection[2]]);
  const poleAlongSightline = dot(celestialPole, direction);
  const north = normalize([
    celestialPole[0] - direction[0] * poleAlongSightline,
    celestialPole[1] - direction[1] * poleAlongSightline,
    celestialPole[2] - direction[2] * poleAlongSightline,
  ]);
  const east = cross(north, direction);
  const cosine = Math.cos(positionAngle), sine = Math.sin(positionAngle);
  const up = normalize([
    cosine * north[0] + sine * east[0],
    cosine * north[1] + sine * east[1],
    cosine * north[2] + sine * east[2],
  ]);
  return { right: normalize(cross(direction, up)), up };
}
