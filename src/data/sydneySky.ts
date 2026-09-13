/**
 * Typed Sydney Harbour sky for the Opera House (Spec 13). Dawn-to-night:
 * the catalog wonder ends at night, and the typed dome owns that transition.
 */

import { lerpColor } from '../engine/daynight';
import { clamp, smoothstep } from '../engine/easing';

export interface SydneySkyKeyframe {
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

export interface SydneySkySample extends Omit<SydneySkyKeyframe, 't' | 'label' | 'description'> {
  t: number;
}

export interface SydneySkyDescription {
  id: 'sydney-harbour-sky';
  description: string;
  evidenceNote: string;
  domeRadius: number;
  sun: {
    dawnAzimuthDegrees: number;
    sweepDegrees: number;
    noonElevationDegrees: number;
    description: string;
  };
  keyframes: SydneySkyKeyframe[];
}

export const SYDNEY_SKY: SydneySkyDescription = {
  id: 'sydney-harbour-sky',
  description:
    'A southern-hemisphere harbour skyscape over Bennelong Point: bright ' +
    'Sydney blue overhead, a maritime haze on the lowest band, and a night ' +
    'reveal of a lit house on dark water.',
  evidenceNote:
    'The movie plays one authored clear day at about 33.9°S. Weather is not a ' +
    'reconstruction of the 1973 opening-night calendar. Night is the catalog ' +
    'endsAtNight contract, not a fireworks postcard.',
  domeRadius: 2_400,
  sun: {
    dawnAzimuthDegrees: -72,
    sweepDegrees: 196,
    noonElevationDegrees: 62,
    description:
      'An east-to-west arc over Farm Cove keeps a readable shaft on the sails ' +
      'while night holds a high cool key on the finished house.',
  },
  keyframes: [
    {
      t: 0,
      label: 'dawn',
      description: 'Cool harbour blue zenith over a thin apricot water band.',
      zenith: '#4a96d4',
      horizon: '#f0c8a0',
      sunTint: '#ffc48a',
      cloudTint: '#f4eee6',
      cloudShadow: '#7a9ab4',
      cloudOpacity: 0.18,
      haze: 0.09,
      fogStretch: 1.38,
    },
    {
      t: 0.22,
      label: 'morning',
      description: 'Hard Sydney blue with thin fair-weather cloud; haze only on water.',
      zenith: '#2f86c8',
      horizon: '#d8c4a8',
      sunTint: '#ffe4b4',
      cloudTint: '#f7f3ec',
      cloudShadow: '#6e92ac',
      cloudOpacity: 0.2,
      haze: 0.1,
      fogStretch: 1.22,
    },
    {
      t: 0.5,
      label: 'midday',
      description: 'Bright harbour blue zenith; horizon paler than the dome.',
      zenith: '#2480c4',
      horizon: '#c8bba8',
      sunTint: '#fff6de',
      cloudTint: '#f8f5ef',
      cloudShadow: '#6a8ea6',
      cloudOpacity: 0.16,
      haze: 0.1,
      fogStretch: 1.12,
    },
    {
      t: 0.72,
      label: 'afternoon',
      description: 'Blue remains dominant while granite and cream tile bounce warm.',
      zenith: '#3a78b4',
      horizon: '#d4b090',
      sunTint: '#ffd09a',
      cloudTint: '#f0e4d4',
      cloudShadow: '#6a8498',
      cloudOpacity: 0.2,
      haze: 0.12,
      fogStretch: 1.2,
    },
    {
      t: 0.86,
      label: 'dusk',
      description: 'Warm low key on the sails before the harbour goes dark.',
      zenith: '#2a4a78',
      horizon: '#c8886a',
      sunTint: '#ff9a62',
      cloudTint: '#e8c8b0',
      cloudShadow: '#4a6078',
      cloudOpacity: 0.16,
      haze: 0.14,
      fogStretch: 1.32,
    },
    {
      t: 1,
      label: 'night',
      description: 'Lit house on dark water under a deep harbour zenith.',
      zenith: '#0c1834',
      horizon: '#1a2848',
      sunTint: '#c8d4f0',
      cloudTint: '#8a9ab8',
      cloudShadow: '#243048',
      cloudOpacity: 0.08,
      haze: 0.08,
      fogStretch: 1.46,
    },
  ],
};

function mixNumber(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function sampleFromFrame(frame: SydneySkyKeyframe, t: number): SydneySkySample {
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

export function sampleSydneySky(rawT: number): SydneySkySample {
  const t = clamp(rawT);
  const frames = SYDNEY_SKY.keyframes;
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

export function sydneySunStateAt(rawT: number): { azimuth: number; elevation: number } {
  const t = clamp(rawT);
  const path = SYDNEY_SKY.sun;
  const duskDrop = t > 0.72 ? smoothstep((t - 0.72) / 0.18) * 18 : 0;
  const nightLift = t > 0.88 ? smoothstep((t - 0.88) / 0.12) * 36 : 0;
  return {
    azimuth: path.dawnAzimuthDegrees + path.sweepDegrees * Math.min(t, 0.88),
    elevation: Math.max(4, Math.sin(Math.PI * Math.min(t, 0.88)) * path.noonElevationDegrees - duskDrop + nightLift),
  };
}
