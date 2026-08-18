import type { BackdropLayer } from '../data/sceneSchema';
import type { LightState } from '../engine/daynight';
import { lerpColor } from '../engine/daynight';
import { mulberry32 } from '../engine/random';

/** Spec 07 §Background layers — horizon silhouettes behind the island. */

export interface Silhouette {
  /** Closed polygon in screen px (top edge = the silhouette, base = horizonY). */
  points: [number, number][];
  fill: string;
}

/** Atmospheric fade: farther layers melt into the sky. */
export function backdropColor(layer: BackdropLayer, light: LightState): string {
  const fade = 0.35 + (layer.distance / 6) * 0.5;
  return lerpColor(layer.tint, light.sky, Math.min(fade, 0.85));
}

/**
 * Deterministic horizon strip for a layer. `phase` shifts with the camera
 * azimuth (far layers shift less — parallax).
 */
export function backdropSilhouette(
  layer: BackdropLayer,
  width: number,
  horizonY: number,
  heightPx: number,
  phasePx: number,
  seed: string,
): Silhouette {
  const rand = mulberry32(`${seed}-${layer.kind}`);
  const pts: [number, number][] = [];
  const N = 96;
  const span = width * 1.4;
  const x0 = -width * 0.2;

  // per-kind waveform assembled from a few seeded harmonics/blocks
  const humpCount = layer.kind === 'mountains' ? 12 : 7;
  const humps = Array.from({ length: humpCount }, () => ({
    at: rand(),
    size: 0.4 + rand() * 0.6,
    lift: 0.3 + rand() * 0.7,
  }));
  const blocks = Array.from(
    { length: 64 },
    () => (rand() > 0.28 ? 0.18 + rand() * 0.52 : 0),
  );

  const h = (u: number): number => {
    switch (layer.kind) {
      case 'dunes':
      case 'hills': {
        const k = layer.kind === 'dunes' ? 1 : 1.6;
        let v = 0.35;
        for (const hm of humps) {
          const d = Math.abs(((u - hm.at + 0.5) % 1) - 0.5) * 2;
          v += Math.exp(-d * d * 18 * k) * hm.lift * 0.42;
        }
        return v;
      }
      case 'mountains': {
        let v = 0.12;
        for (const hm of humps) {
          const d = Math.abs(((u - hm.at + 0.5) % 1) - 0.5) * 2;
          v += Math.max(0, 1 - d * 2.6) * hm.lift * 0.42; // a range, not a spike
        }
        return v;
      }
      case 'cliffs': {
        const step = Math.floor(u * 9) % 3;
        let v = 0.45 + step * 0.16;
        v += Math.sin(u * 34) * 0.03; // strata noise
        return v;
      }
      case 'city': {
        // sparse towers with gaps, varied heights
        const b = blocks[Math.floor(u * 64) % 64] ?? 0;
        return 0.1 + b * 0.78;
      }
      case 'jungle': {
        let v = 0.3;
        for (const hm of humps) {
          const d = Math.abs(((u - hm.at + 0.5) % 1) - 0.5) * 2;
          v += Math.max(0, 1 - d * 5) * hm.lift * 0.35; // dense canopy bumps
        }
        return v;
      }
      case 'harbor':
        return 0.08 + (blocks[Math.floor(u * 26) % 26] ?? 0) * 0.5;
    }
  };

  if (layer.kind === 'city') {
    const cells = 64;
    let previousY = horizonY - h(0) * heightPx;
    pts.push([x0 - phasePx, previousY]);
    for (let i = 1; i <= cells; i++) {
      const u = i / cells;
      const x = x0 + u * span - phasePx;
      const y = horizonY - h(Math.min(0.9999, u)) * heightPx;
      // Flat roof to the cell edge, then a true vertical facade step.
      pts.push([x, previousY]);
      pts.push([x, y]);
      previousY = y;
    }
    pts.push([x0 + span - phasePx, horizonY + 4]);
    pts.push([x0 - phasePx, horizonY + 4]);
    return { points: pts, fill: '#000' };
  }

  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const x = x0 + u * span - phasePx;
    pts.push([x, horizonY - h(u) * heightPx]);
  }
  // close along the horizon line
  pts.push([x0 + span - phasePx, horizonY + 4]);
  pts.push([x0 - phasePx, horizonY + 4]);
  return { points: pts, fill: '#000' };
}

/** Parallax shift in px for a layer at a camera azimuth. */
export function backdropPhase(azimuth: number, distance: number, width: number): number {
  return Math.sin(azimuth) * width * 0.06 * (1 / distance);
}

/** Spec 08 §Background: detail dressing a layer's foot — palms or a river. */
export interface LayerDetails {
  palms: { x: number; y: number; s: number }[];
  river: { y: number; h: number; color: string } | null;
}

export function layerDetails(
  layer: BackdropLayer,
  width: number,
  horizonY: number,
  phasePx: number,
  seed: string,
  light: LightState,
): LayerDetails {
  const out: LayerDetails = { palms: [], river: null };
  if (!layer.details?.length) return out;
  const rand = mulberry32(`${seed}-${layer.kind}-details`);
  for (const d of layer.details) {
    if (d === 'palms') {
      for (let i = 0; i < 14; i++) {
        out.palms.push({
          x: rand() * width * 1.3 - width * 0.15 - phasePx,
          y: horizonY - 2 - rand() * 4,
          s: 0.7 + rand() * 0.8,
        });
      }
    } else if (d === 'river') {
      out.river = {
        y: horizonY - 7 - rand() * 3,
        h: 4.5 + rand() * 2,
        color: lerpColor('#3d6e8f', light.sky, 0.35),
      };
    }
  }
  return out;
}
