/**
 * Typed Paris Champ-de-Mars sky for the Eiffel Tower (Spec 14). Dawn-to-night.
 */

import { lerpColor } from '../engine/daynight';
import { clamp, smoothstep } from '../engine/easing';

export interface EiffelSkyKeyframe {
  t: number;
  label: 'dawn' | 'morning' | 'midday' | 'afternoon' | 'dusk' | 'night';
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

export interface EiffelSkySample extends Omit<EiffelSkyKeyframe, 't' | 'label' | 'description'> {
  t: number;
}

export interface EiffelSkyDescription {
  id: 'paris-champ-sky';
  description: string;
  evidenceNote: string;
  domeRadius: number;
  sun: {
    dawnAzimuthDegrees: number;
    sweepDegrees: number;
    noonElevationDegrees: number;
    description: string;
  };
  keyframes: EiffelSkyKeyframe[];
}

/** Legacy mix anchors; the rebuilt dome narrows haze below the blue sky. */
export const EIFFEL_SKY_MIX = {
  horizonLo: -0.02,
  horizonHi: 0.085,
  warmFalloff: 32,
} as const;

export const EIFFEL_SKY: EiffelSkyDescription = {
  id: 'paris-champ-sky',
  description:
    'A temperate Paris skyscape over the Champ de Mars: cooler northern blue ' +
    'overhead, river mist on the Seine band, and a night reveal of lanterns on iron.',
  evidenceNote:
    'The movie plays one authored clear day at about 48.86°N. Weather is not a ' +
    'reconstruction of the 31 March 1889 opening. Night is the catalog endsAtNight contract.',
  domeRadius: 2_600,
  sun: {
    dawnAzimuthDegrees: -30,
    sweepDegrees: 184,
    noonElevationDegrees: 52,
    description:
      'An east-to-west arc rakes the Seine-facing X-bays at dawn (azimuth ~-30°) ' +
      'and holds east-dominant through BUILD so north-face flanges still model; ' +
      'opening keeps the linear dawn rake. A -58° dawn front-fills the lattice, ' +
      'and a linear sweep * t backlights BUILD.',
  },
  keyframes: [
    {
      t: 0,
      label: 'dawn',
      description: 'Cool blue zenith over neutral river mist and a warm dawn sun.',
      zenith: '#4a82b4',
      horizon: '#b8bdc0',
      sunTint: '#ffc48a',
      cloudTint: '#f0ebe4',
      cloudShadow: '#7a90a4',
      cloudOpacity: 0.48,
      haze: 0.11,
      fogStretch: 1.4,
    },
    {
      t: 0.22,
      label: 'morning',
      description: 'Clear Paris blue; mist only on the lowest Seine band.',
      zenith: '#3a78ac',
      horizon: '#aabdc8',
      sunTint: '#ffe0b0',
      cloudTint: '#f4f0ea',
      cloudShadow: '#748aa0',
      cloudOpacity: 0.62,
      haze: 0.12,
      fogStretch: 1.28,
    },
    {
      t: 0.5,
      label: 'midday',
      description: 'Hard temperate blue zenith; zinc roofs bounce cool.',
      zenith: '#326ea4',
      horizon: '#a1b6c2',
      sunTint: '#fff2d4',
      cloudTint: '#f6f3ee',
      cloudShadow: '#70889c',
      cloudOpacity: 0.64,
      haze: 0.13,
      fogStretch: 1.18,
    },
    {
      t: 0.72,
      label: 'afternoon',
      description: 'Blue remains dominant while iron picks up warm bounce.',
      zenith: '#3a648c',
      horizon: '#98a9b8',
      sunTint: '#ffd09a',
      cloudTint: '#eee2d2',
      cloudShadow: '#6a8094',
      cloudOpacity: 0.62,
      haze: 0.14,
      fogStretch: 1.24,
    },
    {
      t: 0.88,
      label: 'dusk',
      description: 'Low warm key on the finished lace under a still-blue upper dome.',
      zenith: '#2f4e72',
      horizon: '#747f91',
      sunTint: '#ffb070',
      cloudTint: '#e8d0bc',
      cloudShadow: '#586c80',
      cloudOpacity: 0.48,
      haze: 0.12,
      fogStretch: 1.34,
    },
    {
      t: 1,
      label: 'night',
      description: 'Deep blue-black zenith; lanterns read against the Champ.',
      zenith: '#28344c',
      horizon: '#363d52',
      sunTint: '#a8b0c4',
      cloudTint: '#5a6474',
      cloudShadow: '#2c3848',
      cloudOpacity: 0.14,
      haze: 0.16,
      fogStretch: 1.22,
    },
  ],
};

function mixNumber(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function sampleFromFrame(frame: EiffelSkyKeyframe, t: number): EiffelSkySample {
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

export function sampleEiffelSky(rawT: number): EiffelSkySample {
  const t = clamp(rawT);
  const frames = EIFFEL_SKY.keyframes;
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

function eiffelSunSweepProgress(t: number): number {
  const capped = Math.min(t, 0.9);
  if (capped <= 0.18) return capped;
  if (capped <= 0.62) return 0.18 + 0.04 * ((capped - 0.18) / 0.44);
  return 0.22 + 0.78 * ((capped - 0.62) / 0.28);
}

export function eiffelSunStateAt(rawT: number): { azimuth: number; elevation: number } {
  const t = clamp(rawT);
  const path = EIFFEL_SKY.sun;
  const nightDrop = smoothstep((t - 0.78) / 0.22) * 48;
  return {
    azimuth: path.dawnAzimuthDegrees + path.sweepDegrees * eiffelSunSweepProgress(t),
    elevation: Math.max(2, Math.sin(Math.PI * Math.min(t, 0.92)) * path.noonElevationDegrees - nightDrop),
  };
}
