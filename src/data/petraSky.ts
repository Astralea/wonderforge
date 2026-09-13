/**
 * Typed dry rift-margin sky for Petra / Wadi Musa (Spec 11).
 *
 * Pure data and samplers only. The renderer consumes this after the generic
 * daylight sampler so canyon shade cannot wash the dome into brown fog.
 */

import { lerpColor } from '../engine/daynight';
import { clamp, smoothstep } from '../engine/easing';

export interface PetraSkyKeyframe {
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

export interface PetraSkySample extends Omit<PetraSkyKeyframe, 't' | 'label' | 'description'> {
  t: number;
}

export interface PetraSkyDescription {
  id: 'petra-rift-sky';
  description: string;
  evidenceNote: string;
  domeRadius: number;
  sun: {
    dawnAzimuthDegrees: number;
    sweepDegrees: number;
    noonElevationDegrees: number;
    description: string;
  };
  keyframes: PetraSkyKeyframe[];
}

export const PETRA_SKY: PetraSkyDescription = {
  id: 'petra-rift-sky',
  description:
    'A dry rift-margin skyscape over Wadi Musa: deep weather-blue overhead, a ' +
    'warm sandstone-bounce horizon, thin high cloud, and raking sun into the Siq mouth.',
  evidenceNote:
    'The movie plays one authored clear day at about 30°N. Weather is not a ' +
    'reconstruction of a Nabataean calendar date. Horizon warmth is bounced ' +
    'sandstone light, not a dust storm.',
  domeRadius: 1_600,
  sun: {
    dawnAzimuthDegrees: -70,
    sweepDegrees: 195,
    noonElevationDegrees: 62,
    description:
      'An east-to-west arc keeps a readable shaft into the west-facing Treasury ' +
      'while the reveal holds a low warm key on the facade.',
  },
  keyframes: [
    {
      t: 0,
      label: 'dawn',
      description: 'Cool blue zenith over a thin apricot Siq-mouth band; shade stays in the gorge, not over the sky.',
      zenith: '#4a88c4',
      horizon: '#d7b394',
      sunTint: '#ffc089',
      cloudTint: '#f3e6d4',
      cloudShadow: '#8aa0b0',
      cloudOpacity: 0.22,
      haze: 0.11,
      fogStretch: 1.46,
    },
    {
      t: 0.22,
      label: 'morning',
      description: 'Dry high blue with thin cirrus; rose cliff bounce on the lowest horizon only.',
      zenith: '#2f74b0',
      horizon: '#cbb39a',
      sunTint: '#ffe1b0',
      cloudTint: '#f4eee6',
      cloudShadow: '#7e96a6',
      cloudOpacity: 0.26,
      haze: 0.13,
      fogStretch: 1.34,
    },
    {
      t: 0.5,
      label: 'midday',
      description: 'Hard desert blue zenith; horizon stays paler and warmer than the dome.',
      zenith: '#2a6eaa',
      horizon: '#c3b09a',
      sunTint: '#fff3d6',
      cloudTint: '#f6f2ea',
      cloudShadow: '#8098a8',
      cloudOpacity: 0.24,
      haze: 0.14,
      fogStretch: 1.22,
    },
    {
      t: 0.72,
      label: 'afternoon',
      description: 'Blue remains dominant while the massif bounce warms.',
      zenith: '#356898',
      horizon: '#c9a888',
      sunTint: '#ffd09a',
      cloudTint: '#efe4d4',
      cloudShadow: '#748a9c',
      cloudOpacity: 0.26,
      haze: 0.16,
      fogStretch: 1.28,
    },
    {
      t: 0.9,
      label: 'reveal',
      description: 'Low warm key on the finished facade under a still-blue upper dome.',
      zenith: '#355a86',
      horizon: '#c9a07a',
      sunTint: '#ffb070',
      cloudTint: '#ecd4c0',
      cloudShadow: '#5e7388',
      cloudOpacity: 0.22,
      haze: 0.13,
      fogStretch: 1.38,
    },
  ],
};

function mixNumber(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function sampleFromFrame(frame: PetraSkyKeyframe, t: number): PetraSkySample {
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

export function samplePetraSky(rawT: number): PetraSkySample {
  const t = Math.min(clamp(rawT), 0.9);
  const frames = PETRA_SKY.keyframes;
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

export function petraSunStateAt(rawT: number): { azimuth: number; elevation: number } {
  const t = Math.min(clamp(rawT), 0.9);
  const path = PETRA_SKY.sun;
  const revealDrop = smoothstep((t - 0.62) / 0.28) * 10;
  return {
    azimuth: path.dawnAzimuthDegrees + path.sweepDegrees * t,
    elevation: Math.max(6, Math.sin(Math.PI * t) * path.noonElevationDegrees - revealDrop),
  };
}
