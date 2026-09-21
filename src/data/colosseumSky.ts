/** Typed Roman-valley sky; astronomical positions and artistic atmosphere are separate. */
import { lerpColor } from '../engine/daynight';
import { clamp, smoothstep } from '../engine/easing';
import { colosseumAstronomyAtJulianDay, type ColosseumAstronomySample } from '../engine/colosseumAstronomy';
import { celestialClockAt } from '../engine/colosseumCelestialClock';
import { COLOSSEUM_EPHEMERIS } from './colosseumEphemeris';

export interface ColosseumSkyPalette {
  zenith: string;
  horizon: string;
  sunTint: string;
  cloudTint: string;
  cloudShadow: string;
  cloudOpacity: number;
  haze: number;
  fogStretch: number;
  fogNeutralizer: string;
}

export interface ColosseumSkyKeyframe extends ColosseumSkyPalette {
  sunElevationDegrees: number;
  label: 'night' | 'nautical-twilight' | 'civil-twilight' | 'horizon' | 'low-sun' | 'daylight' | 'midday';
  description: string;
}

export interface ColosseumSkySample extends ColosseumSkyPalette {
  t: number;
  astronomy: ColosseumAstronomySample;
  daylight: number;
  twilight: number;
  night: number;
}

export interface ColosseumSkyDescription {
  id: 'colosseum-valley-sky';
  description: string;
  evidenceNote: string;
  domeRadius: number;
  sun: {
    ephemerisId: string;
    /** Initialization-only nominal radius. Runtime uses the changing apparent radius. */
    discAngularRadiusDegrees: number;
    description: string;
  };
  keyframes: ColosseumSkyKeyframe[];
}

/** Both bodies receive the SAME modest presentation scale; ephemeris sizes remain physical. */
export const COLOSSEUM_CELESTIAL_ANGULAR_SCALE = 2.4;
/** Daylight fallback for callers before the first astronomy sample. */
export const COLOSSEUM_FOG_NEUTRALIZER = '#bcc5d0';

export const COLOSSEUM_SKY: ColosseumSkyDescription = {
  id: 'colosseum-valley-sky',
  description:
    'A Roman valley under a continuous astronomical day: pale dawn, high Mediterranean blue, ' +
    'warm dusk and a nearly full Moon rising over the eastern hills.',
  evidenceNote:
    'JPL Horizons DE441 apparent AIRLESS Sun and Moon positions at the amphitheatre, ' +
    'Julian AD80-Jun21, 04:00–20:09 UT1. The representative date and weather are authored, ' +
    'not a dedication-date claim. Ancient Earth rotation is estimated. The 2.4× common ' +
    'angular enlargement improves legibility without moving either body or changing lunar phase.',
  domeRadius: 2_200,
  sun: {
    ephemerisId: COLOSSEUM_EPHEMERIS.id,
    discAngularRadiusDegrees: COLOSSEUM_EPHEMERIS.rows[0][3] * COLOSSEUM_CELESTIAL_ANGULAR_SCALE,
    description: 'Ephemeris-driven direction and changing apparent radius; no held elevation or authored azimuth sweep.',
  },
  // Stops use actual solar altitude, so dawn/dusk agree at the same altitude
  // and palette transitions cannot drift from the shared astronomical clock.
  keyframes: [
    {
      sunElevationDegrees: -18, label: 'night',
      description: 'Readable slate-blue night; no daylight beige survives in the fog.',
      zenith: '#13213a', horizon: '#303f58', sunTint: '#b78a76',
      cloudTint: '#52617a', cloudShadow: '#25364f', cloudOpacity: 0.22,
      haze: 0.035, fogStretch: 1.42, fogNeutralizer: '#33445d',
    },
    {
      sunElevationDegrees: -12, label: 'nautical-twilight',
      description: 'Deep upper blue with a dim lavender western horizon.',
      zenith: '#1c3157', horizon: '#495472', sunTint: '#d69b79',
      cloudTint: '#6d7794', cloudShadow: '#344660', cloudOpacity: 0.24,
      haze: 0.05, fogStretch: 1.42, fogNeutralizer: '#4b5971',
    },
    {
      sunElevationDegrees: -6, label: 'civil-twilight',
      description: 'A cool valley beneath a restrained rose horizon after the direct sun has gone.',
      zenith: '#2a4a75', horizon: '#8e8194', sunTint: '#ffc294',
      cloudTint: '#b3a1af', cloudShadow: '#52647e', cloudOpacity: 0.28,
      haze: 0.075, fogStretch: 1.42, fogNeutralizer: '#748199',
    },
    {
      sunElevationDegrees: -1, label: 'horizon',
      description: 'A thin warm horizon under blue air, tied to the true setting/rising Sun.',
      zenith: '#3b5d87', horizon: '#b59caa', sunTint: '#ffbd82',
      cloudTint: '#ddbac1', cloudShadow: '#6b7d97', cloudOpacity: 0.30,
      haze: 0.10, fogStretch: 1.40, fogNeutralizer: '#a3aebe',
    },
    {
      sunElevationDegrees: 6, label: 'low-sun',
      description: 'Warm stone edges and pearl distance beneath a clearly blue dome.',
      zenith: '#476f9e', horizon: '#c4bcc2', sunTint: '#ffcf99',
      cloudTint: '#eddbce', cloudShadow: '#788da3', cloudOpacity: 0.28,
      haze: 0.11, fogStretch: 1.36, fogNeutralizer: COLOSSEUM_FOG_NEUTRALIZER,
    },
    {
      sunElevationDegrees: 22, label: 'daylight',
      description: 'Dry blue air with thin fair-weather cloud and separated urban hills.',
      zenith: '#397bb2', horizon: '#bfccd0', sunTint: '#ffe4bc',
      cloudTint: '#f3ece2', cloudShadow: '#7e96aa', cloudOpacity: 0.24,
      haze: 0.12, fogStretch: 1.30, fogNeutralizer: COLOSSEUM_FOG_NEUTRALIZER,
    },
    {
      sunElevationDegrees: 60, label: 'midday',
      description: 'High Mediterranean blue and pale distance around the sunlit amphitheatre.',
      zenith: '#2f74b0', horizon: '#b3c6d0', sunTint: '#fff3d6',
      cloudTint: '#f7f3ec', cloudShadow: '#8098a8', cloudOpacity: 0.22,
      haze: 0.13, fogStretch: 1.20, fogNeutralizer: COLOSSEUM_FOG_NEUTRALIZER,
    },
  ],
};

function paletteAtSolarElevation(elevation: number): ColosseumSkyPalette {
  const frames = COLOSSEUM_SKY.keyframes;
  let upper = frames.findIndex(frame => frame.sunElevationDegrees >= elevation);
  if (upper < 0) upper = frames.length - 1;
  const before = frames[Math.max(0, upper - 1)], after = frames[upper];
  const p = smoothstep((elevation - before.sunElevationDegrees) /
    Math.max(0.001, after.sunElevationDegrees - before.sunElevationDegrees));
  const number = (a: number, b: number) => a + (b - a) * p;
  return {
    zenith: lerpColor(before.zenith, after.zenith, p),
    horizon: lerpColor(before.horizon, after.horizon, p),
    sunTint: lerpColor(before.sunTint, after.sunTint, p),
    cloudTint: lerpColor(before.cloudTint, after.cloudTint, p),
    cloudShadow: lerpColor(before.cloudShadow, after.cloudShadow, p),
    fogNeutralizer: lerpColor(before.fogNeutralizer, after.fogNeutralizer, p),
    cloudOpacity: number(before.cloudOpacity, after.cloudOpacity),
    haze: number(before.haze, after.haze),
    fogStretch: number(before.fogStretch, after.fogStretch),
  };
}

export function sampleColosseumSky(rawT: number): ColosseumSkySample {
  const clock = celestialClockAt(rawT);
  const astronomy = colosseumAstronomyAtJulianDay(clock.julianDayUt1);
  const altitude = astronomy.sun.elevationDegrees;
  const daylight = smoothstep((altitude + 1) / 10);
  const night = 1 - smoothstep((altitude + 18) / 12);
  return {
    ...paletteAtSolarElevation(altitude),
    t: clock.t,
    astronomy,
    daylight,
    night,
    twilight: clamp(1 - daylight - night),
  };
}

export function colosseumSunStateAt(rawT: number): { azimuth: number; elevation: number } {
  const clock = celestialClockAt(rawT);
  const { sun } = colosseumAstronomyAtJulianDay(clock.julianDayUt1);
  // The renderer reflects authored +Z-north at its world boundary. Its light
  // polar angle must therefore be compass−90; the pure ephemeris is unchanged.
  return { azimuth: sun.azimuthDegrees - 90, elevation: sun.elevationDegrees };
}
