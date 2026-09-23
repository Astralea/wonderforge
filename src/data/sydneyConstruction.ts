import {
  sydneyBuildingToWorld,
  sydneyTerrainHeightAt,
} from '../engine/sydneyTerrain';
import type { Vec3 } from './constructionTypes';
import type { SydneyConstructionPlan, SydneyPart } from './sydneyTypes';
import {
  SYDNEY_SAILS,
  SYDNEY_PODIUM_MESHES,
  SYDNEY_STRUCTURAL_DETAILS,
  sydneyBounds,
  sydneyPodiumHeightAt,
  sydneyPatchVertices,
} from './sydneyShells';
export {
  SYDNEY_SAILS,
  SYDNEY_PODIUM_DECK,
  SYDNEY_SPHERE_RADIUS,
} from './sydneyShells';
export type { SydneySailDef } from './sydneyShells';
export const SYDNEY_LENGTH = 183,
  SYDNEY_WIDTH = 120,
  SYDNEY_HEIGHT = 67;
export const SYDNEY_PODIUM_HEIGHT = 12,
  SYDNEY_TROLLEY_BED = 0.85,
  SYDNEY_MAX_ACTIVE = 18;
const routePoint = (x: number, z: number): Vec3 => {
  const p = sydneyBuildingToWorld(x, z);
  return [p.x, sydneyTerrainHeightAt(p.x, p.z), p.z];
};
export const SYDNEY_YARD: Vec3 = routePoint(-8, 151);
export const SYDNEY_FALSEWORK_SEGMENT = 6,
  SYDNEY_FALSEWORK_STATIONS = SYDNEY_SAILS.length * 4;
export const SYDNEY_CRANE_BASES: Vec3[] = [
  [56, sydneyPodiumHeightAt(56, 26)!, 26],
  [-38, sydneyPodiumHeightAt(-38, 18.2)!, 18.2],
];

/** Verified lower-before-upper projection constraints from the authored model.
 * Main/south concert junction still has a geometry crossing tracked by the
 * collision gate; its intended order is south then main, never a hidden swap. */
export const SYDNEY_SHELL_PRECEDENCE: ReadonlyArray<readonly [number, number]> =
  [
    [7, 2],
    [2, 0],
    [1, 0],
    [8, 5],
    [5, 3],
    [4, 3],
  ];
function erectionOrder(crane: 0 | 1): number[] {
  const remaining = new Set(
    SYDNEY_SAILS.filter((s) => (s.group === 'opera' ? 0 : 1) === crane).map(
      (s) => s.id,
    ),
  );
  const result: number[] = [];
  while (remaining.size) {
    const available = [...remaining]
      .filter(
        (id) =>
          !SYDNEY_SHELL_PRECEDENCE.some(
            ([lower, upper]) => upper === id && remaining.has(lower),
          ),
      )
      .sort(
        (a, b) =>
          SYDNEY_SAILS[a]!.position[2] - SYDNEY_SAILS[b]!.position[2] || a - b,
      );
    if (!available.length)
      throw new Error('Sydney shell erection constraints contain a cycle');
    const next = available[0]!;
    result.push(next);
    remaining.delete(next);
  }
  return result;
}

/** Authored-model insertion clearances, audited against every already seated
 * roof and infill triangle. Most panels use the outward 6 m approach; narrow
 * nested openings need these specific horizontal approach directions. Tests
 * raycast the actual production trajectory, so changed geometry cannot reuse
 * these coordinates silently. Frozen Blender model: d08faa0f, metre space. */
const INFILL_APPROACHES: Readonly<Record<string, Vec3>> = {
  'infill-concert-side-infill-main-middle-east-17': [1, 0, 0],
  'infill-concert-side-infill-main-middle-east-19': [1, 0, 0],
  'infill-concert-side-infill-main-middle-east-20': [1, 0, 0],
  'infill-concert-side-infill-main-middle-east-21': [1, 0, 0],
  'infill-concert-side-infill-middle-north-west-11': [-7.878462, 0, -1.389185],
  'infill-concert-side-infill-middle-north-west-16': [-7.517541, 0, -2.736161],
  'infill-concert-side-infill-middle-north-west-17': [-7.727407, 0, -2.070552],
  'infill-concert-side-infill-middle-north-west-18': [-10.875693, 0, -5.071419],
  'infill-concert-side-infill-middle-north-west-19': [-13.856406, 0, -8],
  'infill-concert-side-infill-middle-north-west-20': [-5.908847, 0, -1.041889],
  'infill-concert-side-infill-middle-north-west-21': [-3.464102, 0, -2],
  'infill-concert-side-infill-middle-north-west-22': [-7.250462, 0, -3.380946],
  'infill-concert-side-infill-middle-north-west-23': [-5.977168, 0, -0.522934],
  'infill-concert-side-infill-middle-north-west-24': [-11.59111, 0, -3.105829],
  'infill-concert-side-infill-middle-north-west-25': [-5.908847, 0, -1.041889],
  'infill-concert-side-infill-middle-north-west-26': [-11.59111, 0, -3.105829],
  'infill-concert-side-infill-middle-north-west-27': [-14.500925, 0, -6.761892],
  'infill-concert-side-infill-middle-north-east-6': [4.588611, 0, -6.553216],
  'infill-concert-side-infill-middle-north-east-12': [10.284602, 0, -12.256711],
  'infill-concert-side-infill-middle-north-east-13': [6.882917, 0, -9.829825],
  'infill-concert-side-infill-middle-north-east-14': [4.588611, 0, -6.553216],
  'infill-concert-side-infill-middle-north-east-15': [1.389185, 0, -7.878462],
  'infill-concert-side-infill-middle-north-east-20': [1.041889, 0, -5.908847],
  'infill-concert-side-infill-middle-north-east-21': [3.380946, 0, -7.250462],
  'infill-concert-side-infill-middle-north-east-22': [2, 0, -3.464102],
  'infill-concert-side-infill-middle-north-east-23': [12, 0, 0],
  'infill-concert-side-infill-middle-north-east-24': [6, 0, 0],
  'infill-concert-side-infill-middle-north-east-25': [6.761892, 0, -14.500925],
  'infill-concert-side-infill-middle-north-east-26': [1.045869, 0, -11.954336],
  'infill-concert-side-infill-middle-north-east-27': [2.052121, 0, -5.638156],
  'infill-opera-side-infill-main-middle-west-8': [0.642788, 0, 0.766044],
  'infill-opera-side-infill-main-middle-west-9': [0.984808, 0, 0.173648],
  'infill-opera-side-infill-main-middle-west-10': [-0.34202, 0, 0.939693],
  'infill-opera-side-infill-main-middle-west-11': [1, 0, 0],
  'infill-opera-side-infill-main-middle-west-12': [-0.258819, 0, 0.965926],
  'infill-opera-side-infill-main-middle-west-13': [-0.173648, 0, 0.984808],
  'infill-opera-side-infill-middle-north-west-11': [-3, 0, -5.196152],
  'infill-opera-side-infill-middle-north-west-12': [-3.064178, 0, -2.57115],
  'infill-opera-side-infill-middle-north-west-14': [-3, 0, -5.196152],
  'infill-opera-side-infill-middle-north-east-9': [5.196152, 0, -3],
  'infill-opera-side-infill-middle-north-east-12': [5.196152, 0, -3],
  'infill-opera-side-infill-middle-north-east-14': [6, 0, 0],
};

export function createSydneyConstructionPlan(): SydneyConstructionPlan {
  const parts: SydneyPart[] = [];
  const add = (p: Omit<SydneyPart, 'scale' | 'routeId' | 'colorVariation'>) => {
    parts.push({
      ...p,
      scale: [1, 1, 1],
      routeId: 'point-yard',
      colorVariation: Math.sin(parts.length * 7.31) * 0.6,
    });
  };
  // Authored rigid additive pours, ordered by their lowest elevation so the
  // physical podium and the finished monument use exactly the same geometry.
  const blocks = [...SYDNEY_PODIUM_MESHES].sort(
    (a, b) =>
      a.position[1] -
        a.dimensions[1] / 2 -
        (b.position[1] - b.dimensions[1] / 2) ||
      a.position[1] - b.position[1] ||
      a.id.localeCompare(b.id),
  );
  blocks.forEach((block, i) =>
    add({
      id: `podium-${block.id}`,
      group: 'podium',
      kind: 'block',
      graph: 'podium',
      sail: -1,
      bay: i,
      crane: 0,
      dimensions: block.dimensions,
      finalPosition: block.position,
      finalRotation: [0, 0, 0],
      authoredVertices: block.vertices,
      material: 'granite',
      lane: 0,
      start: 0.015 + (i / blocks.length) * 0.213,
      duration: 0.001,
    }),
  );
  const pending: SydneyPart[] = [];
  for (const sail of SYDNEY_SAILS) {
    const ribs: string[] = [];
    for (const side of [-1, 1] as const)
      for (let rib = 0; rib < 5; rib++)
        for (let seg = 0; seg < 8; seg++) {
          const v = (rib + 1) / 5;
          const surface = {
            u0: seg / 8,
            u1: (seg + 1) / 8,
            v0: Math.max(0, v - 0.018),
            v1: Math.min(1, v + 0.018),
            side,
            depth: 0.72,
          };
          const bounds = sydneyBounds(sydneyPatchVertices(sail, surface));
          const id = `rib-${sail.id}-${side}-${rib}-${seg}`;
          ribs.push(id);
          add({
            id,
            group: sail.group,
            kind: 'rib',
            graph: 'shell',
            sail: sail.id,
            bay: seg,
            crane: sail.group === 'opera' ? 0 : 1,
            dimensions: bounds.dimensions,
            finalPosition: bounds.position,
            finalRotation: [0, 0, 0],
            surface,
            material: 'concrete',
            lane: 0,
            start: 0,
            duration: 0,
            dependsOn: seg ? [`rib-${sail.id}-${side}-${rib}-${seg - 1}`] : [],
          });
        }
    for (const side of [-1, 1] as const)
      for (let seg = 0; seg < 8; seg++)
        for (let tile = 0; tile < 5; tile++) {
          const surface = {
            u0: seg / 8 + 0.0005,
            u1: (seg + 1) / 8 - 0.0005,
            v0: tile / 5 + 0.001,
            v1: (tile + 1) / 5 - 0.001,
            side,
            depth: 0.18,
            offset: 0.22,
          };
          const bounds = sydneyBounds(sydneyPatchVertices(sail, surface));
          const id = `tile-${sail.id}-${side}-${seg}-${tile}`;
          pending.push({
            id,
            group: sail.group,
            kind: 'sail',
            graph: 'shell',
            sail: sail.id,
            bay: seg,
            crane: sail.group === 'opera' ? 0 : 1,
            dimensions: bounds.dimensions,
            finalPosition: bounds.position,
            finalRotation: [0, 0, 0],
            surface,
            material: 'tile',
            lane: 0,
            start: 0,
            duration: 0,
            dependsOn: ribs,
            routeId: 'point-yard',
            scale: [1, 1, 1],
            colorVariation: Math.sin(seg * 4 + tile * 7 + sail.id) * 0.4,
          });
        }
  }
  // The authored leading arch spans a longer parameter interval than the old
  // vault chart. Subdivide an oversized lid without changing its surface or
  // enlarging a crane load. Retain the first piece's stable operation ID.
  for (const panel of pending) {
    const queue = [panel];
    let serial = 0;
    while (queue.length) {
      const part = queue.shift()!;
      if (Math.max(...part.dimensions) <= 15) {
        parts.push(part);
        continue;
      }
      const surface = part.surface!;
      const middle = (surface.v0 + surface.v1) / 2;
      for (const [index, range] of [
        [surface.v0, middle],
        [middle, surface.v1],
      ].entries()) {
        const patch = { ...surface, v0: range[0]!, v1: range[1]! };
        const bounds = sydneyBounds(
          sydneyPatchVertices(SYDNEY_SAILS[part.sail]!, patch),
        );
        queue.push({
          ...part,
          id: index === 0 ? part.id : `${panel.id}-split${++serial}`,
          surface: patch,
          dimensions: bounds.dimensions,
          finalPosition: bounds.position,
        });
      }
      if (serial > 16)
        throw new Error(
          `Authored Sydney panel cannot fit crane load: ${panel.id}`,
        );
    }
  }
  // Preserve every authored infill triangle exactly, partitioned into rigid
  // loads. Spatial subdivision changes handling units, never the final shape.
  const structuralBeforeInfill = [...parts];
  for (const detail of SYDNEY_STRUCTURAL_DETAILS) {
    const sail = SYDNEY_SAILS[detail.shellId!]!;
    if (!sail) throw new Error(`Authored infill has no shell: ${detail.name}`);
    const triangles: number[][] = [];
    for (let i = 0; i < detail.vertices.length; i += 9)
      triangles.push(detail.vertices.slice(i, i + 9));
    const panels: number[][] = [];
    const partition = (triangles: number[][]): void => {
      const vertices = triangles.flat(),
        bounds = sydneyBounds(vertices);
      if (Math.max(...bounds.dimensions) <= 8 || triangles.length === 1) {
        panels.push(vertices);
        return;
      }
      const axis = bounds.dimensions.indexOf(Math.max(...bounds.dimensions));
      triangles.sort(
        (a, b) =>
          a[axis]! +
          a[axis + 3]! +
          a[axis + 6]! -
          (b[axis]! + b[axis + 3]! + b[axis + 6]!),
      );
      const mid = Math.floor(triangles.length / 2);
      partition(triangles.slice(0, mid));
      partition(triangles.slice(mid));
    };
    partition(triangles);
    const dependsOn = structuralBeforeInfill
      .filter(
        (p) =>
          p.graph === 'shell' &&
          (p.sail === sail.id || p.sail === detail.neighbourShellId),
      )
      .map((p) => p.id);
    panels.forEach((vertices, index) => {
      const bounds = sydneyBounds(vertices);
      add({
        id: `infill-${detail.name}-${index}`,
        group: sail.group,
        kind: 'sail',
        graph: 'shell',
        sail: sail.id,
        bay: index,
        crane: sail.group === 'opera' ? 0 : 1,
        dimensions: bounds.dimensions,
        finalPosition: bounds.position,
        finalRotation: [0, 0, 0],
        authoredVertices: vertices,
        seatApproach: INFILL_APPROACHES[`infill-${detail.name}-${index}`] ?? [
          (detail.name.endsWith('-west') ? -1 : 1) * Math.cos(sail.yaw) * 6,
          0,
          -(detail.name.endsWith('-west') ? -1 : 1) * Math.sin(sail.yaw) * 6,
        ],
        material: 'tile',
        lane: 0,
        start: 0,
        duration: 0,
        dependsOn,
      });
    });
  }
  // Each lower/northern group is completed, including its lids, before the
  // overlying group's ribs arrive. Within a group every lid retains its rib
  // dependencies. The two crane lanes run independently over the film window.
  for (const crane of [0, 1] as const) {
    const order = erectionOrder(crane);
    const chunks = order.flatMap((sail) =>
      (['rib', 'sail'] as const).map((kind) =>
        parts.filter(
          (p) => p.crane === crane && p.sail === sail && p.kind === kind,
        ),
      ),
    );
    const heroIds = new Set([
      `rib-${crane === 0 ? 3 : 0}--1-4-4`,
      crane === 0 ? 'tile-3--1-5-4' : 'tile-0--1-7-0',
    ]);
    const count = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const beforeHero = 0.008,
      afterHero = 0.014;
    // Every chunk gets three empty slots, enough for its final rigid part to
    // seat before the next rib/lid chunk starts. Reserve representative jobs
    // and their unloaded return/acquisition windows in real film time.
    const slot =
      (0.82 - 0.25 - 0.12 - 2 * (beforeHero + afterHero + 0.002) - 0.004) /
      (count - 2 + chunks.length * 3 + 2 * 2.8);
    let cursor = 0.25,
      sequence = 0;
    let previousGroupLast: SydneyPart | undefined;
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex]!;
      for (const part of chunk) {
        part.lane = sequence++ % 3;
        if (part.kind === 'rib' && part.bay === 0 && previousGroupLast)
          part.dependsOn = [...(part.dependsOn ?? []), previousGroupLast.id];
        if (heroIds.has(part.id)) {
          cursor += 2.8 * slot + beforeHero;
          part.start = cursor;
          part.duration = part.kind === 'rib' ? 0.07 : 0.05;
          cursor += part.duration + afterHero + 0.002;
        } else {
          part.start = cursor;
          part.duration = slot * 2.8;
          cursor += slot;
        }
      }
      cursor += 3 * slot;
      if (chunkIndex % 2 === 1) previousGroupLast = chunk[chunk.length - 1];
    }
  }
  return {
    seed: 'sydney-blender-reference-v3',
    length: SYDNEY_LENGTH,
    width: SYDNEY_WIDTH,
    height: SYDNEY_HEIGHT,
    podiumHeight: 12,
    trolleyBedHeight: 0.85,
    maxActive: SYDNEY_MAX_ACTIVE,
    parts,
    routes: [
      {
        id: 'point-yard',
        yard: SYDNEY_YARD,
        road: routePoint(-8, 139),
        staging: routePoint(-8, 125),
        laneWidth: 4.4,
      },
    ],
    layers: [
      'harbour-sky',
      'harbour-water',
      'bennelong-point',
      'shells',
      'work-systems',
      'foreground-yard',
    ].map((id, depth) => ({
      id: id as SydneyConstructionPlan['layers'][number]['id'],
      depth,
      motion:
        depth === 1 || depth === 2 || depth === 5
          ? 'static-world-space'
          : 'playback-time',
    })),
    keepOuts: [
      { id: 'shell-volume', minX: -60, maxX: 60, minZ: -100, maxZ: 90 },
      { id: 'south-yard', minX: -44, maxX: 44, minZ: 90, maxZ: 138 },
    ],
  };
}
export const SYDNEY_CONSTRUCTION = createSydneyConstructionPlan();
