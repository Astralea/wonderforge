import type { MaterialKey, Wonder } from '../data/types';
import { lerpColor, type LightState } from '../engine/daynight';
import { clamp } from '../engine/easing';
import { dot, type Vec3 } from './vec';

/** Base (unlit) color per material key — Spec 06 §Shading. */
export function materialColor(wonder: Wonder, key: MaterialKey): string {
  switch (key) {
    case 'primary':
      return wonder.palette.primary;
    case 'accent':
      return wonder.palette.accent;
    case 'ground':
      return wonder.palette.ground;
    case 'foliage':
      return '#4d7a3a';
    case 'water':
      return '#3d6e8f';
    case 'light':
      return '#2e2a24';
    case 'shadow':
      return '#241a12';
    case 'casing':
      return lerpColor(wonder.palette.primary, '#fff4dc', 0.42);
  }
}

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: [number, number, number]): string {
  const ch = (v: number) =>
    Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0');
  return `#${ch(r)}${ch(g)}${ch(b)}`;
}

/** Direction from the surface toward the sun/moon. */
export function sunDirection(light: LightState): Vec3 {
  const az = (light.sun.azimuth * Math.PI) / 180;
  const el = (light.sun.elevation * Math.PI) / 180;
  return [
    Math.cos(az) * Math.cos(el),
    Math.sin(el),
    Math.sin(az) * Math.cos(el),
  ];
}

const EMISSIVE_WARM = '#ffc873';

/**
 * Flat-shade one face: material color modulated by
 * ambient + sun·(n̂·sûn), tinted by the sun color. At night, floodlights add
 * a warm term to every face; 'light' parts glow with the emissive ramp
 * regardless of their normal (Spec 06 §Shading).
 */
export function shadeFace(
  baseHex: string,
  normal: Vec3,
  light: LightState,
  material: MaterialKey,
): string {
  const sun = sunDirection(light);
  const diffuse = Math.max(0, dot(normal, sun));
  const goldenFill =
    (1 - Math.min(1, Math.max(0, light.sun.elevation) / 45)) *
    (1 - light.emissive) *
    0.28;
  const materialGain =
    material === 'casing'
      ? 1.32
      : material === 'primary'
        ? 1.18
        : material === 'ground'
          ? 0.88
          : material === 'shadow'
            ? 0.76
            : 1;
  const brightness =
    (0.28 +
      light.ambient.intensity * 0.72 +
      light.sun.intensity * 0.42 * diffuse +
      light.emissive * 0.12 +
      goldenFill) * materialGain;

  const [tr, tg, tb] = hexToRgb(light.sun.color);
  const base = hexToRgb(baseHex);
  // soft highlight compression so lit faces don't blow out
  const soft = (v: number) => (v > 235 ? 235 + (v - 235) * 0.3 : v);
  const keyed = clamp(
    0.08 +
      0.18 * (1 - Math.min(1, light.sun.intensity / 1.6)) +
      diffuse * 0.06,
    0.08,
    0.3,
  );
  const lit: [number, number, number] = [
    soft(base[0] * brightness),
    soft(base[1] * brightness),
    soft(base[2] * brightness),
  ];
  const rgb: [number, number, number] = [
    lit[0] + (tr - lit[0]) * keyed,
    lit[1] + (tg - lit[1]) * keyed,
    lit[2] + (tb - lit[2]) * keyed,
  ];
  // Preserve a legible warm/cool separation even when the sun key is a pale
  // noon cream. Without this small chroma term, highlight compression can make
  // the directly lit face less golden than the ambient face.
  const directWarmth =
    diffuse * light.sun.intensity * (1 - light.emissive) * 36;
  rgb[0] += directWarmth;
  rgb[2] -= directWarmth * 0.7;

  let hex = rgbToHex(rgb);
  if (material === 'light' && light.emissive > 0) {
    hex = lerpColor(hex, EMISSIVE_WARM, light.emissive * 0.92);
  }
  // floodlit wonders glow warmly through their deep recesses at night
  if (material === 'shadow' && light.emissive > 0) {
    hex = lerpColor(hex, '#c96f2e', light.emissive * 0.55);
  }
  return hex;
}

/** Darker outline for the illustrated look. */
export function outlineOf(fillHex: string): string {
  return lerpColor(fillHex, '#120c06', 0.28);
}
