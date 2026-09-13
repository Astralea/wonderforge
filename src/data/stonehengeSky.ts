/**
 * Typed late-Neolithic downland sky for Stonehenge (Spec 10).
 *
 * Pure data and pure samplers only. The renderer consumes this state after the
 * generic daylight sampler so humid haze cannot wash the target sky back into
 * the global palette.
 */

import { lerpColor } from '../engine/daynight';
import { clamp, smoothstep } from '../engine/easing';

export interface StonehengeSkyKeyframe {
  t: number;
  label: 'dawn' | 'morning' | 'midday' | 'afternoon' | 'reveal';
  description: string;
  zenith: string;
  horizon: string;
  sunTint: string;
  cloudTint: string;
  cloudShadow: string;
  cloudOpacity: number;
  /** Local aerial perspective strength, 0..1. */
  haze: number;
  /** Extends geometric fog so the open plain and blue dome stay legible. */
  fogStretch: number;
}

export interface StonehengeSkySample extends Omit<StonehengeSkyKeyframe, 't' | 'label' | 'description'> {
  t: number;
}

export interface StonehengeSkyDescription {
  id: 'stonehenge-downland-sky';
  description: string;
  evidenceNote: string;
  domeRadius: number;
  sun: {
    dawnAzimuthDegrees: number;
    sweepDegrees: number;
    noonElevationDegrees: number;
    description: string;
  };
  keyframes: StonehengeSkyKeyframe[];
}

export const STONEHENGE_SKY: StonehengeSkyDescription = {
  id: 'stonehenge-downland-sky',
  description:
    'An exposed Salisbury Plain skyscape: cool weather-blue overhead, a pale ' +
    'humid horizon, broken low cumulus, and warm raking sun over open chalk grassland.',
  evidenceNote:
    'English Heritage describes the Stonehenge chalk downland as an unusually ' +
    'open Neolithic landscape and treats the sky/solar alignment as part of the monument experience. Weather is authored, not claimed as a reconstruction of one day.',
  domeRadius: 1_800,
  sun: {
    dawnAzimuthDegrees: -48,
    sweepDegrees: 188,
    noonElevationDegrees: 58,
    description:
      'A compressed summer-like east-northeast to west-northwest arc keeps the ' +
      'solstitial axis readable while ending with a low reveal key.',
  },
  keyframes: [
    {
      t: 0,
      label: 'dawn',
      description: 'Cool blue upper sky over a thin peach sunrise band; humidity stays at the downs, not over the crews.',
      zenith: '#3e7cc4',
      horizon: '#c5c8bc',
      sunTint: '#ffc38d',
      cloudTint: '#eee0ce',
      cloudShadow: '#8fa2ad',
      cloudOpacity: 0.3,
      haze: 0.13,
      fogStretch: 1.52,
    },
    {
      t: 0.22,
      label: 'morning',
      description: 'Fresh weather blue with bright broken cloud over pale chalk haze.',
      zenith: '#347ab6',
      horizon: '#c4d0cf',
      sunTint: '#ffe3b8',
      cloudTint: '#f0eee6',
      cloudShadow: '#8095a3',
      cloudOpacity: 0.36,
      haze: 0.16,
      fogStretch: 1.42,
    },
    {
      t: 0.5,
      label: 'midday',
      description: 'Clear British blue zenith and high-key cumulus over an open horizon.',
      zenith: '#2d72aa',
      horizon: '#bdcfd2',
      sunTint: '#fff4dc',
      cloudTint: '#f2f2ed',
      cloudShadow: '#8298a8',
      cloudOpacity: 0.38,
      haze: 0.17,
      fogStretch: 1.32,
    },
    {
      t: 0.72,
      label: 'afternoon',
      description: 'Blue remains dominant while cloud undersides cool and deepen.',
      zenith: '#386f9f',
      horizon: '#c4ced0',
      sunTint: '#ffd5a2',
      cloudTint: '#e9e8e1',
      cloudShadow: '#788c9d',
      cloudOpacity: 0.36,
      haze: 0.2,
      fogStretch: 1.36,
    },
    {
      t: 0.9,
      label: 'reveal',
      description: 'A low warm sun under a still-blue upper dome; turf, timber and sarsen keep separate values.',
      zenith: '#355a88',
      horizon: '#c3b4a6',
      sunTint: '#ffb07a',
      cloudTint: '#ecd8ca',
      cloudShadow: '#5f7388',
      cloudOpacity: 0.3,
      haze: 0.16,
      fogStretch: 1.48,
    },
  ],
};

function mixNumber(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function sampleFromFrame(frame: StonehengeSkyKeyframe, t: number): StonehengeSkySample {
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

export function sampleStonehengeSky(rawT: number): StonehengeSkySample {
  const t = Math.min(clamp(rawT), 0.9);
  const frames = STONEHENGE_SKY.keyframes;
  const upperIndex = frames.findIndex((frame) => frame.t >= t);
  if (upperIndex <= 0) {
    return sampleFromFrame(frames[0]!, t);
  }
  if (upperIndex < 0) {
    return sampleFromFrame(frames.at(-1)!, t);
  }
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

export function stonehengeSunStateAt(rawT: number): { azimuth: number; elevation: number } {
  const t = Math.min(clamp(rawT), 0.9);
  const path = STONEHENGE_SKY.sun;
  const revealDrop = smoothstep((t - 0.62) / 0.28) * 8;
  return {
    azimuth: path.dawnAzimuthDegrees + path.sweepDegrees * t,
    elevation: Math.max(4.5, Math.sin(Math.PI * t) * path.noonElevationDegrees - revealDrop),
  };
}
