import type { Wonder } from '../data/types';
import { clamp } from './easing';

/** Spec 02 §Day/night cycle. */
export interface LightState {
  sun: {
    /** Degrees, east → west sweep. */
    azimuth: number;
    /** Degrees above the horizon; sine arc peaking at t=0.5. */
    elevation: number;
    color: string;
    intensity: number;
    /** Optional light-source visibility during an authored below-horizon transition. */
    visibility?: number;
  };
  ambient: { skyColor: string; groundColor: string; intensity: number };
  /** Horizon color. */
  sky: string;
  fog: string;
  /** 0..1 — window/floodlight ramp for wonders that end at night. */
  emissive: number;
}

const DAWN_KEY = '#ffb27d';
const NOON_KEY = '#fff4e0';
const DUSK_KEY = '#ff7e47';
const MOON_KEY = '#9db4ff';
const MOON_INTENSITY = 0.5;
const MOON_ELEVATION = 42; // degrees — the moon rides higher than the set sun

const DAWN_SKY = '#ffd9a0';
const AFTERNOON_SKY = '#75b3d6';
const TWILIGHT_SKY = '#b8899a';
const DUSK_SKY = '#ff9a5c';
const NIGHT_SKY = '#0b1026';

/** Night crossfade begins here for endsAtNight wonders. */
const NIGHT_START = 0.8;

/** sRGB hex lerp: `#rrggbb`. */
export function lerpColor(a: string, b: string, p: number): string {
  const k = clamp(p);
  const ca = parseInt(a.slice(1), 16);
  const cb = parseInt(b.slice(1), 16);
  const mix = (shift: number) => {
    const x = (ca >> shift) & 255;
    const y = (cb >> shift) & 255;
    return Math.round(x + (y - x) * k)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${mix(16)}${mix(8)}${mix(0)}`;
}

export function lightStateAt(rawT: number, wonder: Wonder): LightState {
  const normalizedT = clamp(rawT);
  // Daylit reveals hold the sun above the horizon instead of fading the hero
  // masonry into a literal zero-elevation sunset. Night-ending wonders keep
  // advancing so their moon/emissive transition remains intact.
  const t = wonder.endsAtNight ? normalizedT : Math.min(normalizedT, 0.9);

  let elevation = Math.sin(Math.PI * t) * 75;
  const azimuth = -80 + 250 * t;

  const sunColor =
    t < 0.5
      ? lerpColor(DAWN_KEY, NOON_KEY, t * 2)
      : lerpColor(NOON_KEY, DUSK_KEY, (t - 0.5) * 2);
  const daylight =
    t < 0.5 ? 0.4 + 1.2 * (t * 2) : 1.6 - 1.25 * ((t - 0.5) * 2);

  const daySky =
    t < 0.5
      ? lerpColor(DAWN_SKY, wonder.palette.sky, t * 2)
      : t < 0.72
        ? lerpColor(wonder.palette.sky, AFTERNOON_SKY, (t - 0.5) / 0.22)
        : t < 0.86
          ? lerpColor(AFTERNOON_SKY, TWILIGHT_SKY, (t - 0.72) / 0.14)
          : lerpColor(TWILIGHT_SKY, DUSK_SKY, (t - 0.86) / 0.14);

  let color = sunColor;
  let intensity = daylight;
  let sky = daySky;
  let emissive = 0;

  if (wonder.endsAtNight && t > NIGHT_START) {
    const n = (t - NIGHT_START) / (1 - NIGHT_START);
    color = lerpColor(sunColor, MOON_KEY, n);
    intensity = daylight + (MOON_INTENSITY - daylight) * n;
    elevation = elevation + (MOON_ELEVATION - elevation) * n;
    sky = lerpColor(daySky, NIGHT_SKY, n);
    emissive = n;
  }

  const ambientIntensity = Math.max(
    0.18,
    (0.25 + 0.45 * Math.sin(Math.PI * t)) * (1 - 0.45 * emissive),
  );

  return {
    sun: { azimuth, elevation, color, intensity },
    ambient: {
      skyColor: sky,
      groundColor: wonder.palette.ground,
      intensity: ambientIntensity,
    },
    sky,
    fog: sky,
    emissive,
  };
}
