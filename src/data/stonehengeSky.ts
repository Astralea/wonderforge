/**
 * Typed late-Neolithic downland sky for Stonehenge (Spec 10).
 *
 * Pure data and pure samplers only. The renderer consumes this state after the
 * generic daylight sampler so humid haze cannot wash the target sky back into
 * the global palette.
 */

import { lerpColor } from '../engine/daynight';
import { clamp, smoothstep } from '../engine/easing';
import { STONEHENGE_AXIS } from './stonehengeConstruction';

/** Movie time where the reveal holds the daylit sample. */
export const STONEHENGE_DAYLIGHT_HOLD_T = 0.9;
/** Caption `stonehenge-axis` begins here; the sun is already on the SW axis. */
export const STONEHENGE_SOLSTICE_CAPTION_T = 0.771;

export const STONEHENGE_SOLSTICE_AXIS_DEGREES = (STONEHENGE_AXIS * 180) / Math.PI;

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

export interface StonehengeSunDiscDescription {
  angularRadiusDegrees: number;
  intensity: number;
  haloStrength: number;
  wideHaloStrength: number;
  description: string;
}

export interface StonehengeSkyDescription {
  id: 'stonehenge-downland-sky';
  description: string;
  evidenceNote: string;
  domeRadius: number;
  sun: {
    /** NE avenue; midsummer sunrise on the Heel Stone axis. */
    dawnAzimuthDegrees: number;
    /** Culmination due south of the henge. */
    noonAzimuthDegrees: number;
    /** SW horizon; midwinter sunset on the same axis. */
    duskAzimuthDegrees: number;
    noonElevationDegrees: number;
    /** Held elevation from the solstice caption through the reveal. */
    solsticeElevationDegrees: number;
    duskTailStart: number;
    duskTailEnd: number;
    description: string;
  };
  sunDisc: StonehengeSunDiscDescription;
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
    dawnAzimuthDegrees: STONEHENGE_SOLSTICE_AXIS_DEGREES,
    noonAzimuthDegrees: -90,
    duskAzimuthDegrees: STONEHENGE_SOLSTICE_AXIS_DEGREES - 180,
    noonElevationDegrees: 58,
    solsticeElevationDegrees: 5.4,
    duskTailStart: 0.62,
    duskTailEnd: STONEHENGE_SOLSTICE_CAPTION_T,
    description:
      'An authored solstitial day, not one calendar date: the sun rises on the ' +
      'NE Heel Stone axis (midsummer sunrise), culminates south, and holds low ' +
      'on the SW axis (midwinter sunset) from the alignment caption through the reveal.',
  },
  sunDisc: {
    angularRadiusDegrees: 1.55,
    intensity: 2.45,
    haloStrength: 0.62,
    wideHaloStrength: 0.22,
    description:
      'A legible downland sun disc with a tight glare and a wide humid scatter ' +
      'lobe that strengthens on the horizon so the axis beat reads as a light, not a tint.',
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
  const t = Math.min(clamp(rawT), STONEHENGE_DAYLIGHT_HOLD_T);
  const path = STONEHENGE_SKY.sun;
  const azimuth = t <= 0.5
    ? mixNumber(path.dawnAzimuthDegrees, path.noonAzimuthDegrees, smoothstep(t / 0.5))
    : mixNumber(
      path.noonAzimuthDegrees,
      path.duskAzimuthDegrees,
      smoothstep((t - 0.5) / Math.max(0.001, path.duskTailEnd - 0.5)),
    );
  const sineElevation = Math.sin(Math.PI * t) * path.noonElevationDegrees;
  const tail = smoothstep((t - path.duskTailStart) / Math.max(0.001, path.duskTailEnd - path.duskTailStart));
  const duskElevation = mixNumber(
    Math.sin(Math.PI * path.duskTailStart) * path.noonElevationDegrees,
    path.solsticeElevationDegrees,
    tail,
  );
  return {
    azimuth,
    elevation: Math.max(
      path.solsticeElevationDegrees,
      t < path.duskTailStart ? sineElevation : duskElevation,
    ),
  };
}

/** World-space direction toward the sun; matches the renderer's azimuth/elevation basis. */
export function stonehengeSunDirectionAt(rawT: number): readonly [number, number, number] {
  const { azimuth, elevation } = stonehengeSunStateAt(rawT);
  const az = (azimuth * Math.PI) / 180;
  const el = (elevation * Math.PI) / 180;
  return [
    Math.cos(el) * Math.cos(az),
    Math.sin(el),
    Math.cos(el) * Math.sin(az),
  ];
}

/**
 * Horizontal throw of a vertical stone's shadow. At the NE sunrise and SW
 * sunset holds this vector lies on the monument axis.
 */
export function stonehengeShadowGroundDirection(rawT: number): { x: number; z: number } {
  const [sx, , sz] = stonehengeSunDirectionAt(rawT);
  const length = Math.hypot(sx, sz) || 1;
  return { x: -sx / length, z: -sz / length };
}
