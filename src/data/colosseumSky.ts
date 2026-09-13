/**
 * Typed Roman-valley sky for the Flavian amphitheatre (Spec 12).
 */

import { lerpColor } from '../engine/daynight';
import { clamp, smoothstep } from '../engine/easing';

export interface ColosseumSkyKeyframe {
  t: number;
  label: 'dawn' | 'morning' | 'midday' | 'afternoon' | 'reveal';
  description: string;
  zenith: string;
  horizon: string;
  sunTint: string;
  cloudTint: string;
  cloudShadow: string;
  cloudOpacity: number;
  haze: number;
  fogStretch: number;
}

export interface ColosseumSkySample extends Omit<ColosseumSkyKeyframe, 't' | 'label' | 'description'> {
  t: number;
}

export interface ColosseumSkyDescription {
  id: 'colosseum-valley-sky';
  description: string;
  evidenceNote: string;
  domeRadius: number;
  sun: {
    dawnAzimuthDegrees: number;
    sweepDegrees: number;
    noonElevationDegrees: number;
    description: string;
  };
  keyframes: ColosseumSkyKeyframe[];
}

export const COLOSSEUM_SKY: ColosseumSkyDescription = {
  id: 'colosseum-valley-sky',
  description:
    'A Mediterranean valley skyscape over Flavian Rome: Tyrrhenian blue overhead, ' +
    'a warm dusty horizon between Palatine and Caelian, and thin fair-weather cloud.',
  evidenceNote:
    'The movie plays one authored clear day at about 41.9°N. Weather is not a ' +
    'reconstruction of a dedication-day calendar. Horizon warmth is valley dust, not smog.',
  domeRadius: 2_200,
  sun: {
    dawnAzimuthDegrees: -62,
    sweepDegrees: 188,
    noonElevationDegrees: 58,
    description:
      'An east-to-west arc keeps a readable shaft on the south arcade while the ' +
      'reveal holds a low warm key on the complete ellipse.',
  },
  keyframes: [
    {
      t: 0,
      label: 'dawn',
      description: 'Cool blue zenith over a thin apricot valley band; hills stay readable.',
      zenith: '#4d8ec8',
      horizon: '#e0c3a0',
      sunTint: '#ffc48a',
      cloudTint: '#f3eadc',
      cloudShadow: '#8aa0b4',
      cloudOpacity: 0.2,
      haze: 0.1,
      fogStretch: 1.42,
    },
    {
      t: 0.22,
      label: 'morning',
      description: 'Dry high blue with thin fair-weather cloud; dust only on the lowest band.',
      zenith: '#3a7eb8',
      horizon: '#d4b898',
      sunTint: '#ffe0b0',
      cloudTint: '#f6f1e8',
      cloudShadow: '#7e96aa',
      cloudOpacity: 0.24,
      haze: 0.12,
      fogStretch: 1.3,
    },
    {
      t: 0.5,
      label: 'midday',
      description: 'Hard Tyrrhenian blue zenith; horizon paler and warmer than the dome.',
      zenith: '#2f74b0',
      horizon: '#cbb49a',
      sunTint: '#fff3d6',
      cloudTint: '#f7f3ec',
      cloudShadow: '#8098a8',
      cloudOpacity: 0.22,
      haze: 0.13,
      fogStretch: 1.2,
    },
    {
      t: 0.72,
      label: 'afternoon',
      description: 'Blue remains dominant while brick and travertine bounce warm.',
      zenith: '#3a6c9c',
      horizon: '#d0a888',
      sunTint: '#ffd09a',
      cloudTint: '#f0e2d0',
      cloudShadow: '#748a9c',
      cloudOpacity: 0.24,
      haze: 0.15,
      fogStretch: 1.26,
    },
    {
      t: 0.9,
      label: 'reveal',
      description: 'Low warm key on the finished ellipse under a still-blue upper dome.',
      zenith: '#355a86',
      horizon: '#c9a07a',
      sunTint: '#ffb070',
      cloudTint: '#ecd4c0',
      cloudShadow: '#5e7388',
      cloudOpacity: 0.2,
      haze: 0.12,
      fogStretch: 1.36,
    },
  ],
};

function mixNumber(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function sampleFromFrame(frame: ColosseumSkyKeyframe, t: number): ColosseumSkySample {
  return {
    t,
    zenith: frame.zenith,
    horizon: frame.horizon,
    sunTint: frame.sunTint,
    cloudTint: frame.cloudTint,
    cloudShadow: frame.cloudShadow,
    cloudOpacity: frame.cloudOpacity,
    haze: frame.haze,
    fogStretch: frame.fogStretch,
  };
}

export function sampleColosseumSky(rawT: number): ColosseumSkySample {
  const t = Math.min(clamp(rawT), 0.9);
  const frames = COLOSSEUM_SKY.keyframes;
  const upperIndex = frames.findIndex((frame) => frame.t >= t);
  if (upperIndex <= 0) return sampleFromFrame(frames[0]!, t);
  if (upperIndex < 0) return sampleFromFrame(frames.at(-1)!, t);
  const before = frames[upperIndex - 1]!;
  const after = frames[upperIndex]!;
  const p = smoothstep((t - before.t) / Math.max(0.001, after.t - before.t));
  return {
    t,
    zenith: lerpColor(before.zenith, after.zenith, p),
    horizon: lerpColor(before.horizon, after.horizon, p),
    sunTint: lerpColor(before.sunTint, after.sunTint, p),
    cloudTint: lerpColor(before.cloudTint, after.cloudTint, p),
    cloudShadow: lerpColor(before.cloudShadow, after.cloudShadow, p),
    cloudOpacity: mixNumber(before.cloudOpacity, after.cloudOpacity, p),
    haze: mixNumber(before.haze, after.haze, p),
    fogStretch: mixNumber(before.fogStretch, after.fogStretch, p),
  };
}

export function colosseumSunStateAt(rawT: number): { azimuth: number; elevation: number } {
  const t = Math.min(clamp(rawT), 0.9);
  const path = COLOSSEUM_SKY.sun;
  const revealDrop = smoothstep((t - 0.62) / 0.28) * 10;
  return {
    azimuth: path.dawnAzimuthDegrees + path.sweepDegrees * t,
    elevation: Math.max(6, Math.sin(Math.PI * t) * path.noonElevationDegrees - revealDrop),
  };
}
