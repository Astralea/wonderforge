/**
 * Pure, reversible sampling of the Rome Horizons table. No wall-clock, JS Date,
 * runtime network, astronomical library or renderer dependency is involved.
 */
import { COLOSSEUM_EPHEMERIS } from '../data/colosseumEphemeris';

export type CelestialDirection = readonly [east: number, up: number, north: number];

export interface ColosseumCelestialBody {
  direction: CelestialDirection;
  /** Compass bearing, clockwise from north. */
  azimuthDegrees: number;
  /** Polar angle in authored east/up/north coordinates, before the renderer Z reflection. */
  authoringAzimuthDegrees: number;
  elevationDegrees: number;
  distanceKm: number;
  /** Physical apparent radius. Any cinematic enlargement belongs in presentation. */
  angularRadiusDegrees: number;
  /** Body centre relative to the local astronomical, airless horizon. */
  aboveHorizon: boolean;
  upperLimbAboveHorizon: boolean;
  /** Visible fraction of the circular disc above a flat airless horizon. */
  horizonVisibility: number;
}

export interface ColosseumMoonState extends ColosseumCelestialBody {
  /** Moon-to-Sun vector, in the SAME east/up/north frame as the sky direction. */
  lightDirection: CelestialDirection;
  /** Fraction implied by lightDirection; this keeps the drawn terminator consistent. */
  illuminatedFraction: number;
  referenceIlluminatedFraction: number;
  phaseAngleDegrees: number;
  referencePhaseAngleDegrees: number;
  elongationDegrees: number;
  waxing: boolean;
}

export interface ColosseumAstronomySample {
  /** Clamped to the explicitly supported offline interval. */
  julianDayUt1: number;
  clamped: boolean;
  deltaTSeconds: number;
  sun: ColosseumCelestialBody;
  moon: ColosseumMoonState;
}

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
const clamp = (n: number, low: number, high: number) => Math.min(high, Math.max(low, n));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const dot = (a: CelestialDirection, b: CelestialDirection) =>
  a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function normalize(x: number, y: number, z: number): CelestialDirection {
  const length = Math.hypot(x, y, z);
  return [x / length, y / length, z / length];
}

export function horizontalDirection(azimuthDegrees: number, elevationDegrees: number): CelestialDirection {
  const az = azimuthDegrees * DEG;
  const el = elevationDegrees * DEG;
  const horizontal = Math.cos(el);
  return [Math.sin(az) * horizontal, Math.sin(el), Math.cos(az) * horizontal];
}

/** Interpolate vectors, never wrapped azimuth values; normalize before use. */
function interpolateDirection(aAz: number, aEl: number, bAz: number, bEl: number, t: number): CelestialDirection {
  const a = horizontalDirection(aAz, aEl);
  const b = horizontalDirection(bAz, bEl);
  return normalize(lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t));
}

function discFractionAboveHorizon(elevation: number, radius: number): number {
  const h = clamp(elevation / radius, -1, 1);
  return 0.5 + (Math.asin(h) + h * Math.sqrt(Math.max(0, 1 - h * h))) / Math.PI;
}

function body(direction: CelestialDirection, distanceKm: number, angularRadiusDegrees: number): ColosseumCelestialBody {
  const azimuthDegrees = (Math.atan2(direction[0], direction[2]) * RAD + 360) % 360;
  const elevationDegrees = Math.asin(clamp(direction[1], -1, 1)) * RAD;
  return {
    direction,
    azimuthDegrees,
    authoringAzimuthDegrees: 90 - azimuthDegrees,
    elevationDegrees,
    distanceKm,
    angularRadiusDegrees,
    aboveHorizon: elevationDegrees > 0,
    upperLimbAboveHorizon: elevationDegrees + angularRadiusDegrees > 0,
    horizonVisibility: discFractionAboveHorizon(elevationDegrees, angularRadiusDegrees),
  };
}

export function colosseumAstronomyAtJulianDay(requestedJulianDayUt1: number): ColosseumAstronomySample {
  if (!Number.isFinite(requestedJulianDayUt1)) throw new RangeError('A finite Julian day in UT1 is required.');
  const { startJulianDay, endJulianDay, stepMinutes, rows } = COLOSSEUM_EPHEMERIS;
  const julianDayUt1 = clamp(requestedJulianDayUt1, startJulianDay, endJulianDay);
  const position = (julianDayUt1 - startJulianDay) * 1440 / stepMinutes;
  const index = Math.min(rows.length - 2, Math.floor(position));
  const t = clamp(position - index, 0, 1);
  const a = rows[index];
  const b = rows[index + 1];
  const sun = body(
    interpolateDirection(a[0], a[1], b[0], b[1], t),
    lerp(a[2], b[2], t),
    lerp(a[3], b[3], t),
  );
  const moonBody = body(
    interpolateDirection(a[4], a[5], b[4], b[5], t),
    lerp(a[6], b[6], t),
    lerp(a[7], b[7], t),
  );
  // The Sun is not the Moon's antipode. Its actual range and relative direction
  // determine the terminator orientation and how much of the near hemisphere is lit.
  const lightDirection = normalize(
    sun.direction[0] * sun.distanceKm - moonBody.direction[0] * moonBody.distanceKm,
    sun.direction[1] * sun.distanceKm - moonBody.direction[1] * moonBody.distanceKm,
    sun.direction[2] * sun.distanceKm - moonBody.direction[2] * moonBody.distanceKm,
  );
  const phaseCosine = clamp(-dot(lightDirection, moonBody.direction), -1, 1);
  return {
    julianDayUt1,
    clamped: julianDayUt1 !== requestedJulianDayUt1,
    deltaTSeconds: lerp(a[12], b[12], t),
    sun,
    moon: {
      ...moonBody,
      lightDirection,
      illuminatedFraction: (1 + phaseCosine) / 2,
      referenceIlluminatedFraction: lerp(a[8], b[8], t),
      phaseAngleDegrees: Math.acos(phaseCosine) * RAD,
      referencePhaseAngleDegrees: lerp(a[9], b[9], t),
      elongationDegrees: Math.acos(clamp(dot(sun.direction, moonBody.direction), -1, 1)) * RAD,
      waxing: (t < 0.5 ? a[11] : b[11]) === 1,
    },
  };
}

/** Proleptic Julian calendar AD years only; intentionally does not use Date.UTC. */
export function julianCalendarToJulianDay(
  year: number, month: number, day: number, hour = 0, minute = 0, second = 0,
): number {
  const monthDays = [31, year % 4 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (!Number.isInteger(year) || year < 1 || !Number.isInteger(month) || month < 1 || month > 12 ||
      !Number.isInteger(day) || day < 1 || day > monthDays[month - 1] ||
      !Number.isInteger(hour) || hour < 0 || hour >= 24 ||
      !Number.isInteger(minute) || minute < 0 || minute >= 60 || !Number.isFinite(second) || second < 0 || second >= 60) {
    throw new RangeError('Invalid AD Julian-calendar date or UT1 time.');
  }
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  const noonJdn = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
  return noonJdn - 0.5 + (hour * 3600 + minute * 60 + second) / 86400;
}
