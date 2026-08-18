/**
 * Structured sky, sun, and atmosphere description for the Giza reference
 * scene (Spec 08 §Era and place grounding). Pure serializable data plus pure
 * samplers — no React, DOM, or Three.js imports.
 *
 * Everything here is authored for Giza, c. 2560 BCE (Fourth Dynasty, reign of
 * Khufu), latitude ~29.98°N. The movie plays one dawn-to-dusk day; the engine
 * holds the daylight sample at t = 0.9 for the reveal, so every sampler here
 * clamps to the same daylit window.
 */

import { lerpColor } from '../engine/daynight';
import { clamp } from '../engine/easing';

/** The engine holds daylit wonders at this movie time during the reveal. */
export const DAYLIGHT_HOLD_T = 0.9;

export interface SkyKeyframe {
  /** Movie time on the daylit axis; the reveal holds the final keyframe. */
  t: number;
  label: 'dawn' | 'morning' | 'midday' | 'afternoon' | 'golden-hour' | 'dusk';
  /** What this moment should read as, and why it fits the place. */
  description: string;
  /** Sky color at the zenith (dome top). */
  zenith: string;
  /** Sky color at the horizon line; fog is matched to this. */
  horizon: string;
  /** Tint of the sun disc and its halo inside the dome. */
  sunTint: string;
  /** Desert dust haze band strength hugging the horizon, 0..1. */
  haze: number;
  /**
   * Multiplier on the scene fog near/far distances. Haze paints the dome;
   * this opens or closes how far GEOMETRY reads. Dawn runs long (>1) so the
   * camp and greenbelt hold their forms inside the morning mist instead of
   * merging into one milky plane; midday is the 1.0 reference.
   */
  fogStretch: number;
  /** Cloud tint and peak opacity at this moment. */
  cloudTint: string;
  cloudOpacity: number;
}

export interface SunPathDescription {
  /** World-space azimuth at dawn; -90° points due east (over the Nile). */
  dawnAzimuthDegrees: number;
  /** Total westward sweep across the day; 200° sets the sun west-northwest. */
  sweepDegrees: number;
  /** Culmination height; near-summer noon sun at ~30°N. */
  noonElevationDegrees: number;
  description: string;
  historicalNote: string;
}

export interface SunDiscDescription {
  /** Stylized angular radius; the real sun is ~0.265°, enlarged for legibility. */
  angularRadiusDegrees: number;
  /** Core brightness of the disc. */
  intensity: number;
  /** Tight forward-scatter glow strength around the disc. */
  haloStrength: number;
  /** Wide atmospheric glow strength at noon; rises toward dawn/dusk. */
  wideHaloStrength: number;
  description: string;
}

export interface SkyDomeDescription {
  /** World-space dome radius; far beyond every camera orbit, inside far plane. */
  radius: number;
  /** Gradient curve: higher values pull the zenith color lower. */
  zenithExponent: number;
  /** Vertical falloff of the dust haze band around the horizon. */
  hazeFalloff: number;
  /** Below-horizon color so the dome never shows void under the terrain. */
  groundHaze: string;
  description: string;
}

export interface CloudLayerDescription {
  id: 'cirrus' | 'cumulus-humilis';
  description: string;
  historicalNote: string;
  groups: number;
  membersPerGroup: number;
  /** World-space distance from the site center; outside the widest orbit. */
  radius: { min: number; step: number };
  /** World-space height band. */
  altitude: { min: number; range: number };
  /** Per-member ellipsoid scale ranges (half-extents). */
  scale: {
    width: [number, number];
    height: [number, number];
    depth: [number, number];
  };
  baseOpacity: number;
  drift: {
    /** Prevailing Egyptian wind is northerly, so clouds travel south. */
    compassToward: 'south';
    worldDirection: [number, number, number];
    unitsPerMovie: number;
  };
}

export interface GizaSkyDescription {
  id: 'giza-desert-sky';
  description: string;
  sunPath: SunPathDescription;
  sunDisc: SunDiscDescription;
  dome: SkyDomeDescription;
  keyframes: SkyKeyframe[];
  cloudLayers: CloudLayerDescription[];
}

export const GIZA_SKY: GizaSkyDescription = {
  id: 'giza-desert-sky',
  description:
    'Subtropical desert sky over the Giza plateau: a deep blue midday dome, a ' +
    'dusty pale horizon from Sahara aerosols, and warm dawn/dusk bands that ' +
    'rise over the Nile in the east and sink over the Libyan desert in the west.',
  sunPath: {
    dawnAzimuthDegrees: -90,
    sweepDegrees: 200,
    noonElevationDegrees: 78,
    description:
      'The sun rises due east over the Nile valley, culminates in the south ' +
      'at 78° (the movie midpoint sits just past solar noon), and sets ' +
      'west-northwest over the Western Desert.',
    historicalNote:
      'At 29.98°N in near-summer the sun rises slightly north of east and ' +
      'sets north of west; the sweep is simplified to a due-east rise and a ' +
      'west-northwest set. A southern culmination matches the northern ' +
      'tropics. The westward sunset matters thematically: the west bank of ' +
      'the Nile was the Egyptian realm of the dead, which is why the ' +
      'pyramids stand there. Honest compression: the era block declares ' +
      'peret (the winter growing season, kept so the fields read green), ' +
      'whose noon sun at this latitude tops out near 37–57°; the 78° ' +
      'near-summer arc is retained deliberately for steeper masonry ' +
      'shadows and a higher, more legible sun. One movie-day compresses ' +
      'both season and sun for the camera, and owns it here.',
  },
  sunDisc: {
    angularRadiusDegrees: 1.15,
    intensity: 1.5,
    haloStrength: 0.5,
    wideHaloStrength: 0.16,
    description:
      'A legible stylized sun disc with a tight glare lobe and a wide ' +
      'forward-scatter glow that strengthens when the sun is low.',
  },
  dome: {
    radius: 2_000,
    zenithExponent: 0.55,
    hazeFalloff: 8.5,
    groundHaze: '#b89a6e',
    description:
      'Analytical gradient dome: horizon-to-zenith gradient, dust haze band, ' +
      'and sun disc/halo computed per fragment from the world-space sun ' +
      'direction. Fixed in world space; it never follows or counter-rotates ' +
      'with the camera.',
  },
  keyframes: [
    {
      t: 0,
      label: 'dawn',
      description:
        'Sunrise over the Nile in the east: a gold horizon band under a soft ' +
        'blue-grey dome, with river mist and dust thickening the haze.',
      zenith: '#7f9fc4',
      horizon: '#ffc98f',
      sunTint: '#ffb27d',
      haze: 0.55,
      fogStretch: 1.5,
      cloudTint: '#ffd9b0',
      cloudOpacity: 0.34,
    },
    {
      t: 0.18,
      label: 'morning',
      description:
        'Mid-morning: the dome turns clear Egyptian blue while the horizon ' +
        'keeps a pale dusty cast from the desert floor.',
      zenith: '#4f83c4',
      horizon: '#d8d9c2',
      sunTint: '#ffd9a8',
      haze: 0.4,
      fogStretch: 1.18,
      cloudTint: '#fff2df',
      cloudOpacity: 0.3,
    },
    {
      t: 0.45,
      label: 'midday',
      description:
        'Noon: the deep rainless blue of a subtropical desert zenith; haze ' +
        'drops to its daily minimum and shadows are shortest.',
      zenith: '#2f6cb8',
      horizon: '#c9cfbe',
      sunTint: '#fff4e0',
      haze: 0.32,
      fogStretch: 1.0,
      cloudTint: '#ffffff',
      cloudOpacity: 0.3,
    },
    {
      t: 0.65,
      label: 'afternoon',
      description:
        'Afternoon: the blue softens and the western horizon warms as dust ' +
        'rises from the plateau work and the Libyan desert.',
      zenith: '#3a74bc',
      horizon: '#d8c9a4',
      sunTint: '#ffe8c0',
      haze: 0.38,
      fogStretch: 1.06,
      cloudTint: '#fff6e2',
      cloudOpacity: 0.3,
    },
    {
      t: 0.8,
      label: 'golden-hour',
      description:
        'Golden hour: long warm light across the casing stones; the horizon ' +
        'over the western dunes turns amber.',
      zenith: '#5a6fa8',
      horizon: '#f0a95e',
      sunTint: '#ffc27a',
      haze: 0.5,
      fogStretch: 1.12,
      cloudTint: '#ffdcb4',
      cloudOpacity: 0.36,
    },
    {
      t: 0.9,
      label: 'dusk',
      description:
        'Dusk over the realm of the dead: a violet-grey dome with a ' +
        'burnt-orange western band; the reveal holds this light.',
      zenith: '#4a4f86',
      horizon: '#ff8f52',
      sunTint: '#ff7e47',
      haze: 0.58,
      fogStretch: 1.22,
      cloudTint: '#ffc9a0',
      cloudOpacity: 0.4,
    },
  ],
  cloudLayers: [
    {
      id: 'cirrus',
      description:
        'High ice-crystal cirrus streaks, thin and elongated, sliding slowly ' +
        'across the upper dome.',
      historicalNote:
        'Cirrus is the most common cloud over the Egyptian desert; towering ' +
        'cumulus and rain clouds are rare outside winter storms.',
      groups: 8,
      membersPerGroup: 1,
      radius: { min: 340, step: 9 },
      altitude: { min: 212, range: 26 },
      scale: {
        width: [24, 44],
        height: [0.5, 0.9],
        depth: [2.6, 4.6],
      },
      baseOpacity: 0.16,
      drift: {
        compassToward: 'south',
        worldDirection: [-1, 0, 0],
        unitsPerMovie: 1.2,
      },
    },
    {
      id: 'cumulus-humilis',
      description:
        'Small fair-weather cumulus with flat bases, grouped in loose banks ' +
        'well outside the camera orbit.',
      historicalNote:
        'Fair-weather cumulus appear over the Nile valley when moist river ' +
        'air meets the desert; they stay small in the dry season.',
      groups: 4,
      membersPerGroup: 5,
      radius: { min: 315, step: 12 },
      altitude: { min: 132, range: 18 },
      scale: {
        width: [7, 15],
        height: [1.5, 2.8],
        depth: [4, 7.5],
      },
      baseOpacity: 0.3,
      drift: {
        compassToward: 'south',
        worldDirection: [-1, 0, 0],
        unitsPerMovie: 2.5,
      },
    },
  ],
};

function clampDaylit(rawT: number): number {
  return Math.min(clamp(rawT), DAYLIGHT_HOLD_T);
}

/**
 * Interpolated sky state at movie time `t`. Pure and deterministic; the
 * reveal window (t > 0.9) holds the dusk keyframe, matching the engine's
 * daylit clamp in `lightStateAt`.
 */
export function sampleGizaSky(rawT: number): SkyKeyframe {
  const t = clampDaylit(rawT);
  const keyframes = GIZA_SKY.keyframes;
  let upper = keyframes.length - 1;
  for (let i = 0; i < keyframes.length; i += 1) {
    if (keyframes[i]!.t >= t) {
      upper = i;
      break;
    }
  }
  const to = keyframes[upper]!;
  const from = keyframes[Math.max(0, upper - 1)]!;
  const span = Math.max(1e-6, to.t - from.t);
  const p = clamp((t - from.t) / span);
  const nearer = p < 0.5 ? from : to;
  const lerp = (a: number, b: number) => a + (b - a) * p;
  return {
    t,
    label: nearer.label,
    description: nearer.description,
    zenith: lerpColor(from.zenith, to.zenith, p),
    horizon: lerpColor(from.horizon, to.horizon, p),
    sunTint: lerpColor(from.sunTint, to.sunTint, p),
    haze: lerp(from.haze, to.haze),
    fogStretch: lerp(from.fogStretch, to.fogStretch),
    cloudTint: lerpColor(from.cloudTint, to.cloudTint, p),
    cloudOpacity: lerp(from.cloudOpacity, to.cloudOpacity),
  };
}

/**
 * Sun azimuth/elevation (degrees) on the same daylit axis. Azimuth sweeps
 * from due east (over the Nile) through south to west-northwest (over the
 * Libyan desert); elevation follows a sine arc culminating south at
 * `noonElevationDegrees`.
 */
export function gizaSunStateAt(rawT: number): { azimuth: number; elevation: number } {
  const t = clampDaylit(rawT);
  const { dawnAzimuthDegrees, sweepDegrees, noonElevationDegrees } = GIZA_SKY.sunPath;
  return {
    azimuth: dawnAzimuthDegrees - sweepDegrees * t,
    elevation: Math.sin(Math.PI * t) * noonElevationDegrees,
  };
}
