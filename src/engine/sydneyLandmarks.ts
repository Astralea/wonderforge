import {
  SYDNEY_HARBOUR_CONTEXT,
  sydneyDistanceToRoute,
  type SydneyFootprint,
  type SydneyLandmark,
  type SydneyViaduct,
} from '../data/sydneyHarbourContext';
import {
  SYDNEY_BRIDGE,
  sydneyBridgeToWorld,
  sydneyTerrainHeightAt,
} from './sydneyTerrain';

/** Pure solids for the harbour landmark batch. `y` is always the bottom and
 * `h` the height; yaw is a three.js Y rotation of local X/Z. `facade` marks
 * walls that receive the shared window/night-glow shader. */
export type SydneyPrimitive =
  | {
      kind: 'box' | 'prism' | 'hull';
      x: number;
      y: number;
      z: number;
      w: number;
      h: number;
      d: number;
      yaw: number;
      color: string;
      facade?: boolean;
    }
  | {
      kind: 'cylinder' | 'dome';
      x: number;
      y: number;
      z: number;
      r: number;
      h: number;
      segments: number;
      color: string;
      facade?: boolean;
    }
  | {
      /** Deck ribbon along a 3D centreline, top at each point's y. */
      kind: 'ribbon';
      points: readonly (readonly [number, number, number])[];
      w: number;
      thickness: number;
      color: string;
    };

export interface SydneyLandmarkSupport {
  /** Highest terrain under the footprint: the ground-floor level. */
  top: number;
  /** Lowest terrain under the footprint: the foundation bottom. */
  bottom: number;
}

function toWorld(l: { x: number; z: number; yaw: number }, lx: number, lz: number) {
  const c = Math.cos(l.yaw),
    s = Math.sin(l.yaw);
  return { x: l.x + c * lx + s * lz, z: l.z - s * lx + c * lz };
}

/** Axis-aligned bounds of the rotated footprint, plus a margin. */
export function sydneyLandmarkFootprint(
  l: SydneyLandmark,
  margin = 0,
): SydneyFootprint {
  const c = Math.abs(Math.cos(l.yaw)),
    s = Math.abs(Math.sin(l.yaw));
  const hw = (l.width * c + l.depth * s) / 2 + margin,
    hd = (l.depth * c + l.width * s) / 2 + margin;
  return { minX: l.x - hw, maxX: l.x + hw, minZ: l.z - hd, maxZ: l.z + hd };
}

export function sydneyLandmarkSupport(l: SydneyLandmark): SydneyLandmarkSupport {
  const heights: number[] = [];
  for (const u of [-0.5, -0.25, 0, 0.25, 0.5])
    for (const v of [-0.5, -0.25, 0, 0.25, 0.5]) {
      const p = toWorld(l, u * l.width, v * l.depth);
      heights.push(sydneyTerrainHeightAt(p.x, p.z));
    }
  return { top: Math.max(...heights), bottom: Math.min(...heights) - 0.4 };
}

const SLATE = '#5e6367';
const IRON = '#6f6c66';
const CREAM = '#e8dcbc';

function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v * k)))
      .toString(16)
      .padStart(2, '0');
  return `#${f(n >> 16)}${f((n >> 8) & 255)}${f(n & 255)}`;
}

export function sydneyLandmarkPrimitives(l: SydneyLandmark): SydneyPrimitive[] {
  const out: SydneyPrimitive[] = [];
  const { top, bottom } = sydneyLandmarkSupport(l);
  const box = (
    lx: number,
    lz: number,
    y: number,
    w: number,
    h: number,
    d: number,
    color: string,
    facade = false,
    kind: 'box' | 'prism' | 'hull' = 'box',
    yawOffset = 0,
  ) => {
    const p = toWorld(l, lx, lz);
    out.push({ kind, x: p.x, y, z: p.z, w, h, d, yaw: l.yaw + yawOffset, color, facade });
  };
  const cyl = (
    lx: number,
    lz: number,
    y: number,
    r: number,
    h: number,
    color: string,
    facade = false,
    segments = 12,
    kind: 'cylinder' | 'dome' = 'cylinder',
  ) => {
    const p = toWorld(l, lx, lz);
    out.push({ kind, x: p.x, y, z: p.z, r, h, segments, color, facade });
  };
  const { width: w, depth: d, height: h, color } = l;
  // Ground buildings stand on a plinth from the lowest to the highest corner.
  const plinth = () => {
    if (top - bottom > 0.45) box(0, 0, bottom, w, top - bottom, d, shade(color, 0.78));
  };
  switch (l.form) {
    case 'castellated': {
      plinth();
      box(0, 0, top, w, h, d, color, true);
      box(0, 0, top + h, w * 0.94, 4.2, d * 0.72, SLATE, false, 'prism');
      for (const sx of [-1, 1]) box(0, sx * (d / 2 - 0.6), top + h, w, 1.3, 1.2, color);
      for (const sx of [-1, 1])
        for (const sz of [-1, 1])
          box(sx * (w / 2 - 2.5), sz * (d / 2 - 2.5), top, 5.2, h + 4.5, 5.2, color, true);
      box(-w * 0.28, d * 0.12, top, 9, h * 1.85, 9, color, true);
      break;
    }
    case 'sandstone-civic': {
      plinth();
      box(0, 0, top, w, h, d, color, true);
      box(0, 0, top + h, w + 1.6, 1.3, d + 1.6, shade(color, 0.9));
      box(0, 0, top + h + 1.3, w * 0.86, 2.6, d * 0.86, SLATE, false, 'prism');
      box(0, d / 2 + 1.8, top, w * 0.36, h * 0.86, 3.6, shade(color, 1.08));
      break;
    }
    case 'slab-tower': {
      plinth();
      const podium = Math.min(12, h * 0.12);
      box(0, 0, top, w + 12, podium, d + 14, shade(color, 0.9), true);
      box(0, 0, top + podium, w, h - podium, d, color, true);
      box(0, 0, top + h, w * 0.46, 4.2, d * 0.62, shade(color, 0.7));
      break;
    }
    case 'round-tower': {
      plinth();
      box(0, 0, top, w * 2, 9, w * 1.7, shade(color, 0.86), true);
      cyl(0, 0, top + 9, w / 2, h - 13, color, true, 22);
      cyl(0, 0, top + h - 4, w * 0.43, 4, shade(color, 0.75), false, 22);
      break;
    }
    case 'terminal': {
      box(0, 0, -1.2, w, 4.4, d, '#6f6557');
      box(0, 0, 3.2, w * 0.82, h - 3.2, d * 0.96, color, true);
      box(0, 0, h, w * 0.9, 1, d, '#9a9a94');
      break;
    }
    case 'station': {
      box(0, 0, bottom, w, 14.2 - bottom, d, color, true);
      break;
    }
    case 'pier-shed':
    case 'finger-wharf': {
      box(0, 0, -1.2, w, 5.4, d, '#6c5c47');
      box(0, 0, 4.2, w - 14, h, d - 8, color, true);
      box(0, 0, 4.2 + h, w - 12, 4.5, d - 6, IRON, false, 'prism');
      break;
    }
    case 'liner': {
      // Long axis is landmark local Z; hull primitives point along their local X.
      const len = d,
        beam = w;
      const q = -Math.PI / 2;
      box(0, 0, -3.4, len + 1, 4.2, beam + 0.6, '#6d2a24', false, 'hull', q);
      box(0, 0, -0.2, len, 11.2, beam, color, false, 'hull', q);
      box(0, len * 0.04, 11, beam * 0.8, 5, len * 0.52, color, true);
      box(0, len * 0.08, 16, beam * 0.7, 4, len * 0.36, color, true);
      box(0, len * 0.02, 20, beam * 0.52, 3.2, len * 0.16, CREAM, true);
      cyl(0, len * 0.16, 20, 4.4, 10, '#d4a03a');
      box(0, -len * 0.18, 16, 0.8, 16, 0.8, '#d8d6cf');
      box(0, len * 0.34, 16, 0.8, 12, 0.8, '#d8d6cf');
      break;
    }
    case 'ferry': {
      const len = d,
        beam = w;
      const q = -Math.PI / 2;
      box(0, 0, -1.2, len, 3.4, beam, color, false, 'hull', q);
      box(0, 0, 2.2, beam * 0.86, 3, len * 0.76, CREAM, true);
      box(0, 0, 5.2, beam * 0.6, 2.2, len * 0.2, CREAM, true);
      cyl(0, len * 0.12, 5.2, 0.9, 3.2, '#c9962e');
      break;
    }
    case 'warship': {
      box(0, 0, -3.8, w, 8.6, d, color, false, 'hull');
      box(w * 0.05, 0, 4.8, w * 0.3, 5, d * 0.72, shade(color, 1.06));
      box(w * 0.12, 0, 9.8, w * 0.1, 4, d * 0.56, shade(color, 1.1));
      cyl(-w * 0.08, 0, 9.8, 2.1, 5.5, shade(color, 0.8));
      box(w * 0.14, 0, 13.8, 0.8, 12, 0.8, shade(color, 0.7));
      box(w * 0.33, 0, 4.8, 5, 2.4, 4, shade(color, 0.9));
      box(-w * 0.34, 0, 4.8, 5, 2.4, 4, shade(color, 0.9));
      break;
    }
    case 'graving-dock': {
      box(0, 0, bottom, w, top - bottom + 0.12, d, color);
      box(0, 0, bottom, w + 6, top - bottom + 0.04, d + 6, '#8d8a82');
      break;
    }
    case 'hammerhead-crane': {
      plinth();
      box(0, 0, top, 11, h - 7, 11, color);
      box(w * 0.12, 0, top + h - 7, w, 6.5, 7, color);
      box(-w * 0.18, 0, top + h - 0.5, 14, 6, 9, shade(color, 0.85));
      break;
    }
    case 'fort': {
      box(0, 0, -2.6, w + 20, 5.2, d + 24, '#a38c69');
      box(0, 0, 2.6, w, h, d, color);
      cyl(-w / 2 + 7, 0, 2.6, 8.5, 13.5, color, false, 16);
      box(0, 0, 2.6 + h, w, 1, 1.2, shade(color, 0.85));
      break;
    }
    case 'villa': {
      plinth();
      box(0, 0, top, w, h, d, color, true);
      box(0, 0, top + h, w * 1.04, 4.6, d * 1.04, '#6e5d52', false, 'prism');
      box(0, d / 2 + 1.5, top, w * 0.8, 3.4, 3, shade(color, 0.93));
      break;
    }
    case 'luna-park': {
      plinth();
      // Face gate toward the harbour (local +Z), flanked by two towers.
      box(0, d / 2 - 3, top, 14, 13, 4, '#efe2bf');
      box(0, d / 2 - 0.8, top + 2.5, 6.2, 3.2, 0.6, '#8b2c2a');
      for (const sx of [-1, 1]) box(sx * 9.5, d / 2 - 3, top, 3, 18, 3, '#d8b85e');
      // Ferris wheel: a ring of spokes in the local X–Y plane.
      const cx = -w * 0.22,
        cz = -d * 0.05,
        cy = top + 15,
        R = 11;
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const p = toWorld(l, cx + Math.cos(a) * R, cz);
        out.push({ kind: 'box', x: p.x, y: cy + Math.sin(a) * R - 0.9, z: p.z, w: 1.8, h: 1.8, d: 1.8, yaw: l.yaw, color: i % 2 ? '#d64a3a' : '#e9e4d8' });
      }
      for (const sx of [-1, 1]) box(cx + sx * 4, cz, top, 0.9, 15, 0.9, '#cfc8b8');
      // Big Dipper frame and pavilions.
      box(w * 0.2, -d * 0.3, top, 30, 9, 3, '#e4d9c4');
      box(w * 0.28, -d * 0.1, top, 3, 12, 34, '#e4d9c4');
      box(w * 0.1, d * 0.1, top, 18, 6, 14, color, true);
      break;
    }
    case 'observatory': {
      plinth();
      box(0, 0, top, w, h, d, color, true);
      box(-w * 0.2, d * 0.3, top, 7, h + 5, 7, color, true);
      cyl(-w * 0.2, d * 0.3, top + h + 5, 4.2, 4.2, '#7f8a8a', false, 12, 'dome');
      break;
    }
  }
  return out;
}

/** Deck profile: meets grade over each ramp, fully elevated in between. */
export function sydneyViaductCentreline(v: SydneyViaduct): [number, number, number][] {
  const lengths = [0];
  for (let i = 1; i < v.points.length; i++) {
    const a = v.points[i - 1]!,
      b = v.points[i]!;
    lengths.push(lengths[i - 1]! + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const total = lengths.at(-1)!;
  const out: [number, number, number][] = [];
  const smooth = (u: number) => u * u * (3 - 2 * u);
  for (let i = 1; i < v.points.length; i++) {
    const a = v.points[i - 1]!,
      b = v.points[i]!,
      len = lengths[i]! - lengths[i - 1]!,
      steps = Math.max(1, Math.ceil(len / 12));
    for (let j = i === 1 ? 0 : 1; j <= steps; j++) {
      const u = j / steps,
        x = a[0] + (b[0] - a[0]) * u,
        z = a[1] + (b[1] - a[1]) * u,
        s = lengths[i - 1]! + len * u;
      const grade = sydneyTerrainHeightAt(x, z) + 0.35;
      const up = Math.min(
        smooth(Math.min(1, s / v.rampIn)),
        smooth(Math.min(1, (total - s) / v.rampOut)),
      );
      out.push([x, Math.max(grade, grade + (v.deckY - grade) * up), z]);
    }
  }
  return out;
}

export function sydneyViaductPrimitives(v: SydneyViaduct): SydneyPrimitive[] {
  const line = sydneyViaductCentreline(v);
  const out: SydneyPrimitive[] = [
    { kind: 'ribbon', points: line, w: v.width, thickness: 1.8, color: '#a7a298' },
  ];
  const groundRoutes = SYDNEY_HARBOUR_CONTEXT.routes.filter((r) => r.mode === 'ground');
  for (let i = 2; i < line.length - 1; i += 2) {
    const [x, y, z] = line[i]!;
    const floor = sydneyTerrainHeightAt(x, z);
    if (y - 1.8 - floor < 3) continue;
    // Columns never stand in a street carriageway.
    if (groundRoutes.some((r) => sydneyDistanceToRoute(x, z, r) < r.width / 2 + 2.5)) continue;
    out.push({ kind: 'box', x, y: floor - 0.3, z, w: 3.2, h: y - 1.8 - floor + 0.3, d: 3.2, yaw: 0, color: '#9d988e' });
  }
  return out;
}

export function sydneyContextPrimitives(): SydneyPrimitive[] {
  return [
    ...SYDNEY_HARBOUR_CONTEXT.landmarks.flatMap(sydneyLandmarkPrimitives),
    ...SYDNEY_HARBOUR_CONTEXT.viaducts.flatMap(sydneyViaductPrimitives),
  ];
}

/** Night lamps: street lights, the bridge deck and the expressway. Positions
 * only; the renderer draws fixed-pixel glows. */
export function sydneyLampPositions(): [number, number, number][] {
  const lamps: [number, number, number][] = [];
  for (const route of SYDNEY_HARBOUR_CONTEXT.routes.filter((r) => r.mode === 'ground')) {
    let side = 1;
    for (let i = 1; i < route.points.length; i++) {
      const a = route.points[i - 1]!,
        b = route.points[i]!,
        len = Math.hypot(b[0] - a[0], b[1] - a[1]),
        nx = -(b[1] - a[1]) / len,
        nz = (b[0] - a[0]) / len;
      for (let s = 14; s < len; s += 34) {
        const off = (route.width / 2 + 1.2) * side;
        const x = a[0] + ((b[0] - a[0]) * s) / len + nx * off,
          z = a[1] + ((b[1] - a[1]) * s) / len + nz * off;
        const y = sydneyTerrainHeightAt(x, z);
        if (y > 0.5) lamps.push([x, y + 6.5, z]);
        side = -side;
      }
    }
  }
  // Harbour Bridge deck: a lamp row each side across the whole crossing.
  const deckHalf = SYDNEY_BRIDGE.pylonZ + 60;
  for (let z = -deckHalf; z <= deckHalf; z += 24)
    for (const x of [-23, 23]) {
      const p = sydneyBridgeToWorld(x, z);
      lamps.push([p.x, SYDNEY_BRIDGE.deckY + 7.5, p.z]);
    }
  for (const v of SYDNEY_HARBOUR_CONTEXT.viaducts) {
    const line = sydneyViaductCentreline(v);
    for (let i = 1; i < line.length; i += 3) {
      const [x, y, z] = line[i]!,
        [px, , pz] = line[i - 1]!,
        len = Math.hypot(x - px, z - pz) || 1;
      const side = i % 2 ? 1 : -1;
      lamps.push([
        x - ((z - pz) / len) * (v.width / 2) * side,
        y + 7,
        z + ((x - px) / len) * (v.width / 2) * side,
      ]);
    }
  }
  return lamps;
}
