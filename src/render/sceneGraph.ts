import type { MaterialKey, Part, StructureSpec, Wonder } from '../data/types';
import type { SceneDoc } from '../data/sceneSchema';
import type { LightState } from '../engine/daynight';
import { boundingCylinder, expandStructure, flattenStages } from '../engine/geometry';
import { mulberry32 } from '../engine/random';
import { carveState, entranceState, partProgress, stageWindows, type EntranceState, type TimeWindow } from '../engine/timeline';
import { tessellate } from './faces';
import { scaffoldParts, scaffoldState, workerParts } from './life';
import { cameraDirection, isoProject, type IsoCamera } from './projection';
import { materialColor, outlineOf, shadeFace } from './shade';
import { dot, rotateEuler, type Vec3 } from './vec';

/** One shaded, projected polygon ready to paint. Spec 06 §Faces. */
export interface SceneFace {
  polygon: [number, number][];
  depth: number;
  fill: string;
  stroke: string;
  opacity: number;
  material: MaterialKey;
}

export interface SceneBuildInput {
  wonder: Wonder;
  /** Compiled scene structure override (Spec 07); defaults to wonder.structure. */
  structure?: StructureSpec;
  /** Foreground life spec from the scene document. */
  foreground?: SceneDoc['foreground'];
  t: number;
  camera: IsoCamera;
  light: LightState;
  /** Include deterministic site scatter (trees/rocks). Default true. */
  scatter?: boolean;
}

const scatterCache = new Map<string, { part: Part; window: TimeWindow }[]>();

/** Deterministic trees/rocks ringing the site (seeded per structure). */
export function scatterParts(
  seed: string,
  structure: StructureSpec,
  groundColor: string,
): { part: Part; window: TimeWindow }[] {
  const cacheKey = `${seed}-${structure.stages.length}-${groundColor}`;
  const hit = scatterCache.get(cacheKey);
  if (hit) return hit;

  const footprint = boundingCylinder(flattenStages(structure)).radius;
  const rand = mulberry32(`${seed}-scatter`);
  const groundRgb = parseInt(groundColor.slice(1), 16);
  const greenish = ((groundRgb >> 8) & 255) > ((groundRgb >> 16) & 255);
  const window: TimeWindow = { start: 0, end: 0.12 };
  const items: { part: Part; window: TimeWindow }[] = [];

  for (let i = 0; i < 16; i++) {
    const theta = rand() * Math.PI * 2;
    // keep scatter on the close-cropped island (island radius = footprint * 1.6)
    const r = footprint * 1.1 + rand() * footprint * 0.38;
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;
    const size = 0.6 + rand() * 0.9;
    if (greenish && rand() > 0.3) {
      items.push(
        {
          part: {
            shape: 'cylinder', material: 'accent',
            position: [x, 0, z], scale: [0.28 * size, 1.2 * size, 0.28 * size],
            entrance: 'fade',
          },
          window,
        },
        {
          part: {
            shape: 'cone', material: 'foliage',
            position: [x, 1.05 * size, z], scale: [1.7 * size, 2.6 * size, 1.7 * size],
            entrance: 'fade',
          },
          window,
        },
      );
    } else {
      items.push({
        part: {
          shape: 'box', material: 'accent',
          position: [x, 0, z],
          scale: [1.1 * size, 0.5 * size, 0.8 * size],
          rotation: [0, rand() * Math.PI, 0],
          entrance: 'fade',
        },
        window,
      });
    }
  }
  scatterCache.set(cacheKey, items);
  return items;
}

/**
 * Clip a world-space polygon against the ground plane (y >= 0) —
 * Sutherland–Hodgman. Without a z-buffer, this is what makes parts visibly
 * rise OUT of the ground instead of painting through it.
 */
export function clipPolygonAtGround(points: Vec3[]): Vec3[] {
  const out: Vec3[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    const aIn = a[1] >= -1e-6;
    const bIn = b[1] >= -1e-6;
    if (aIn) out.push(a);
    if (aIn !== bIn) {
      const k = a[1] / (a[1] - b[1]);
      out.push([a[0] + (b[0] - a[0]) * k, 0, a[2] + (b[2] - a[2]) * k]);
    }
  }
  return out;
}

export function buildScene(input: SceneBuildInput): SceneFace[] {
  const { wonder, t, camera, light } = input;
  const structure = input.structure ?? wonder.structure;
  const scatter = input.scatter ?? true;
  const windows = stageWindows(structure.stages);

  // resolve every part to its current entrance state
  const items: { part: Part; state: EntranceState }[] = [];
  for (const { part, stageIndex } of expandStructure(structure, wonder.id)) {
    const window = windows[stageIndex]!;
    const state =
      part.entrance === 'scaffold'
        ? scaffoldState(part, t, window)
        : part.entrance === 'carve'
          ? carveState(part, t, window)
          : entranceState(part, partProgress(t, window));
    items.push({ part, state });
  }
  if (scatter) {
    for (const { part, window } of scatterParts(
      wonder.id,
      structure,
      wonder.palette.ground,
    )) {
      items.push({ part, state: entranceState(part, partProgress(t, window)) });
    }
  }
  const fg = input.foreground;
  if (fg?.scaffolding) {
    for (const { part, stageIndex } of scaffoldParts(
      structure,
      fg.scaffolding.aroundStages,
    )) {
      items.push({
        part,
        state: scaffoldState(part, t, windows[stageIndex]!),
      });
    }
  }
  if (fg?.workers) {
    const specs = (Array.isArray(fg.workers) ? fg.workers : [fg.workers]).map(
      (s) => ({ count: s.count, path: s.path, carry: s.carry ?? false }),
    );
    const road = fg.roads?.[0]
      ? { from: fg.roads[0].from, to: fg.roads[0].to }
      : undefined;
    const ramp = fg.ramps?.[0]
      ? {
          from: fg.ramps[0].from,
          to: fg.ramps[0].to,
          height: fg.ramps[0].height,
          stage: fg.ramps[0].stage,
        }
      : undefined;
    for (const dp of workerParts(wonder.id, structure, specs, t, road, ramp)) {
      items.push({ part: dp.part, state: dp.state });
    }
  }

  const viewDir = cameraDirection(camera);
  const faces: SceneFace[] = [];

  for (const { part, state } of items) {
    if (!state.visible) continue;

    const rotation = part.rotation ?? [0, 0, 0];
    const e = state.scale;
    const [sx, sy, sz] = part.scale;
    const [px, py, pz] = part.position;
    const baseColor = materialColor(wonder, part.material);
    const opacity =
      state.opacity * (part.material === 'water' ? 0.82 : 1);

    for (const face of tessellate(part.shape)) {
      const normal = rotateEuler(face.normal, rotation);
      if (dot(normal, viewDir) <= 0) continue;

      const world = face.points.map((v): Vec3 => {
        const rotated = rotateEuler(
          [v[0] * sx * e, v[1] * sy * e, v[2] * sz * e],
          rotation,
        );
        return [
          rotated[0] + px,
          rotated[1] + py + state.yOffset,
          rotated[2] + pz,
        ];
      });
      const clipped = clipPolygonAtGround(world);
      if (clipped.length < 3) continue;

      const projected = clipped.map((v) => isoProject(v, camera));
      const depth =
        projected.reduce((sum, p) => sum + p.depth, 0) / projected.length;

      const fill = shadeFace(baseColor, normal, light, part.material);
      faces.push({
        polygon: projected.map((p) => [p.x, p.y]),
        depth,
        fill,
        stroke: outlineOf(fill),
        opacity,
        material: part.material,
      });
    }
  }

  faces.sort((a, b) => a.depth - b.depth);
  return faces;
}

/** Structure footprint radius (drives the blob shadow size). */
export function structureFootprint(structure: StructureSpec): number {
  return boundingCylinder(flattenStages(structure)).radius;
}

/**
 * Soft contact-shadow offset in world units: falls opposite the sun, longer
 * at low sun. Spec 06 §Atmosphere.
 */
export function blobShadowOffset(
  light: LightState,
  footprintRadius: number,
): [number, number] {
  const az = (light.sun.azimuth * Math.PI) / 180;
  const el = (light.sun.elevation * Math.PI) / 180;
  const length = footprintRadius * 0.28 * (1.35 - Math.sin(el));
  return [-Math.cos(az) * length, -Math.sin(az) * length];
}
