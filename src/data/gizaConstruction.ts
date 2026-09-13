import { mulberry32 } from '../engine/random';
import type {
  BlockMaterial,
  ConstructionBlock,
  ConstructionRoute,
  CoreFillCell,
  GizaConstructionPlan,
  MonumentPlan,
  RampPlan,
  SceneLayer,
  Vec3,
} from './constructionTypes';

const BUILD_START = 0.03;
const BUILD_END = 0.905;
const ACTIVE_LANES = 24;
const ACTIVE_SPAN_IN_SLOTS = 20;

/** Core-fill grid pitch; shared by the schedule and the cell layout. */
const CORE_SPACING = 1.55;

/**
 * Screen time per course follows the material it places (Spec 08 §Physical
 * plausibility: a course cannot be laid faster than its stones can arrive).
 *
 * A course's perimeter grows with its width but its core grows with its area,
 * so counting only the exterior ring — as this once did — bought the 549-unit
 * base slab the same screen time as a 20-unit course near the apex, and the
 * foundation snapped into existence in about a second. Weighting adds a
 * further bias toward the lowest courses, where levelling, the largest
 * stones, and the finest bedding genuinely consumed a disproportionate share
 * of the work.
 */
const FOUNDATION_EMPHASIS = 3.2;
const FOUNDATION_FALLOFF = 3;

// Monument spacing is compressed from true geography so the ensemble fits one
// camera orbit, but footprints keep clear air — bases never touch (Spec 08).
const monuments: GizaConstructionPlan['monuments'] = {
  khufu: {
    id: 'khufu',
    center: [7, -1],
    baseWidth: 34,
    height: 24,
    groundY: 0,
    courses: 42,
  },
  khafre: {
    id: 'khafre',
    center: [-38, -33],
    baseWidth: 30,
    height: 22,
    groundY: 1.35,
    courses: 39,
  },
  menkaure: {
    id: 'menkaure',
    center: [-63, -60],
    baseWidth: 15,
    height: 12,
    groundY: 0.9,
    courses: 22,
  },
};

const layers: SceneLayer[] = [
  { id: 'foreground-quarry', depth: 0, quality: 'essential' },
  { id: 'construction-site', depth: 1, quality: 'essential' },
  { id: 'greenbelt-nile', depth: 2, quality: 'essential' },
  { id: 'worker-settlement', depth: 3, quality: 'high' },
  { id: 'distant-city', depth: 4, quality: 'high' },
  { id: 'desert-cliffs', depth: 5, quality: 'essential' },
  { id: 'atmosphere-sky', depth: 6, quality: 'essential' },
];

function route(
  id: string,
  quarry: Vec3,
  dressing: Vec3,
  roadQueue: Vec3,
  rampFoot: Vec3,
  rampCrest: Vec3,
  alignment: Vec3,
): ConstructionRoute {
  return {
    id,
    waypoints: { quarry, dressing, roadQueue, rampFoot, rampCrest, alignment },
    // Face-aware crest (Spec 08): the climb always tops out at THIS route's
    // earthwork platform — the fixed high end where the ramp meets the face —
    // at the block's own course height. It was previously anchored to the
    // block's seat (+z offset), which sent far-face blocks on straight
    // diagonals through their own monument and off the earthwork entirely;
    // the crest-to-seat traverse now happens on the working deck during the
    // aligned phase (rollers/cribbing), which is the attested method.
    rampCrestFor: (block) => [
      rampCrest[0],
      // Support-surface height, not the block origin or top. Construction
      // adds the stone half-height and carrier exactly once.
      block.finalPosition[1] - block.dimensions[1] * 0.5,
      rampCrest[2],
    ],
  };
}

// Spec 08: every ramp rises toward its monument — rampFoot stands at the far,
// low end of the earthwork (matching the ramp spans in Environment.ts), and
// rampCrest meets the working face. Blocks climb as they approach the pyramid.
const routes: ConstructionRoute[] = [
  // Queued approaches stay outside every monument footprint (contract-tested):
  // khufu-south swings south of the earthwork and mounts the foot end-on;
  // khufu-east rounds the south-east corner wide before turning to its foot.
  route('khufu-south', [-55, 0.35, 35], [-45, 0.35, 29], [-29, 0.3, 41], [7, 0.35, 37], [7, 8, 12], [7, 12, 7]),
  route('khufu-east', [-52, 0.35, 39], [-41, 0.35, 31], [28, 0.3, 47], [43, 0.35, -1], [18, 8, -1], [13, 12, -1]),
  route('khafre-south', [-59, 0.35, 29], [-50, 0.35, 22], [-42, 0.4, 8], [-38, 1.7, -3], [-38, 9, -22], [-38, 13, -27]),
  route('khafre-west', [-62, 0.35, 24], [-53, 0.35, 16], [-48, 0.5, 1], [-70, 1.7, -33], [-48, 9, -33], [-43, 13, -33]),
  route('menkaure-south', [-64, 0.35, 17], [-58, 0.35, 8], [-55, 0.45, -8], [-63, 1.2, -38.5], [-63, 6, -54], [-63, 8, -57]),
  route('temple-causeway', [-49, 0.35, 42], [-38, 0.35, 35], [-20, 0.25, 27], [1, 0.3, 18], [1, 3.5, 11], [1, 4.5, 7]),
];

// Terraced working earthworks. Each rises toward its monument (local +z is the
// high end, which every yaw maps to the face side). Kept as data so the
// renderer and the site-clearance rules share one footprint.
const ramps: RampPlan[] = [
  { id: 'khufu-south', monument: 'khufu', center: [7, 27], footprint: [30, 22], baseY: 0, yaw: Math.PI },
  { id: 'khufu-east', monument: 'khufu', center: [31, -1], footprint: [12, 26], baseY: 0, yaw: -Math.PI / 2 },
  { id: 'khafre-south', monument: 'khafre', center: [-38, -12], footprint: [26, 20], baseY: 1.35, yaw: Math.PI },
  { id: 'khafre-west', monument: 'khafre', center: [-60, -33], footprint: [10, 22], baseY: 1.35, yaw: Math.PI / 2 },
  { id: 'menkaure-south', monument: 'menkaure', center: [-63, -46], footprint: [13, 17], baseY: 0.9, yaw: Math.PI },
];

const routeIdsByMonument: Record<MonumentPlan['id'], [string, string]> = {
  khufu: ['khufu-south', 'khufu-east'],
  khafre: ['khafre-south', 'khafre-west'],
  // Menkaure has exactly one earthwork, so every side hauls up the same ramp.
  // (The temple causeway starts near Khufu; routing Menkaure stones over it
  // sent them on an unsupported flight through the finished Khafre pyramid.)
  menkaure: ['menkaure-south', 'menkaure-south'],
};

function materialFor(monument: MonumentPlan, course: number): BlockMaterial {
  if (monument.id === 'khafre' && course >= Math.floor(monument.courses * 0.72)) {
    return 'casing-limestone';
  }
  if (monument.id === 'menkaure' && course < 4) return 'granite';
  return 'core-limestone';
}

function pyramidBlocks(monument: MonumentPlan, seed: string): ConstructionBlock[] {
  const random = mulberry32(seed);
  const blocks: ConstructionBlock[] = [];
  const courseHeight = monument.height / monument.courses;
  const topWidth = Math.max(3.2, monument.baseWidth * 0.13);
  const insetPerCourse = (monument.baseWidth - topWidth) / (2 * monument.courses);
  const [centerX, centerZ] = monument.center;
  const routeIds = routeIdsByMonument[monument.id];

  for (let course = 0; course < monument.courses; course += 1) {
    const sideLength = monument.baseWidth - insetPerCourse * course * 2;
    const half = sideLength / 2;
    const segments = Math.max(3, Math.floor(sideLength / 1.22));
    const segmentLength = sideLength / segments;
    const blockHeight = courseHeight * (0.94 + random() * 0.045);
    const depth = 0.88 + random() * 0.24;
    const y = monument.groundY + course * courseHeight + blockHeight / 2;
    const jointOffset = course % 2 === 0 ? 0 : segmentLength * 0.04;

    for (let side = 0; side < 4; side += 1) {
      for (let index = 0; index < segments; index += 1) {
        const along = -half + segmentLength * (index + 0.5) + jointOffset;
        const alongClamped = Math.max(-half + segmentLength * 0.48, Math.min(half - segmentLength * 0.48, along));
        const tangentVariation = (random() - 0.5) * 0.035;
        let x = centerX;
        let z = centerZ;
        let dimensions: Vec3;
        let yaw = 0;

        if (side === 0 || side === 2) {
          x += alongClamped + tangentVariation;
          z += side === 0 ? half : -half;
          dimensions = [segmentLength * 0.965, blockHeight, depth];
        } else {
          x += side === 1 ? half : -half;
          z += alongClamped + tangentVariation;
          dimensions = [depth, blockHeight, segmentLength * 0.965];
          yaw = Math.PI / 2;
        }

        blocks.push({
          id: `${monument.id}-c${course.toString().padStart(2, '0')}-s${side}-b${index.toString().padStart(2, '0')}`,
          monument: monument.id,
          course,
          dimensions,
          finalPosition: [x, y, z],
          finalYaw: yaw,
          scale: [1, 1, 1],
          material: materialFor(monument, course),
          routeId: routeIds[side % routeIds.length]!,
          lane: 0,
          start: 0,
          duration: 0,
          colorVariation: random() * 2 - 1,
        });
      }
    }
  }
  return blocks;
}

/** Half-width of a course's interior core grid, in cells. Pure geometry. */
function coreGridRadius(monument: MonumentPlan, course: number): number {
  const topWidth = Math.max(3.2, monument.baseWidth * 0.13);
  const insetPerCourse = (monument.baseWidth - topWidth) / (2 * monument.courses);
  const sideLength = monument.baseWidth - insetPerCourse * course * 2;
  const interiorHalf = Math.max(0, sideLength * 0.5 - 1.15);
  return Math.floor(interiorHalf / CORE_SPACING);
}

function coreCellCount(monument: MonumentPlan, course: number): number {
  const radius = coreGridRadius(monument, course);
  return (radius * 2 + 1) ** 2;
}

/**
 * Total placed units for a course, biased toward the foundation. Exterior
 * stones and interior core cells both count — they are all material that has
 * to be quarried, hauled, and set.
 */
function courseWorkload(
  monument: MonumentPlan,
  course: number,
  exteriorBlocks: number,
): number {
  const units = exteriorBlocks + coreCellCount(monument, course);
  const depthFromTop = 1 - course / monument.courses;
  return units * (1 + FOUNDATION_EMPHASIS * depthFromTop ** FOUNDATION_FALLOFF);
}

/**
 * Hand every course a share of the build window proportional to its workload,
 * then space its blocks evenly inside that share.
 *
 * Block duration stays a fixed multiple of the *local* slot, so a heavy course
 * also moves its individual stones more deliberately. That keeps the number of
 * simultaneously active operations constant across the movie, which the worker
 * and render budgets depend on.
 */
function scheduleBlocks(
  blocks: ConstructionBlock[],
  monumentsById: Record<MonumentPlan['id'], MonumentPlan>,
): ConstructionBlock[] {
  // Blocks arrive grouped by monument and ordered bottom-up, so equal
  // (monument, course) keys are contiguous runs.
  const runs: Array<{ from: number; to: number; weight: number }> = [];
  let index = 0;
  while (index < blocks.length) {
    const { monument, course } = blocks[index]!;
    let end = index;
    while (
      end < blocks.length &&
      blocks[end]!.monument === monument &&
      blocks[end]!.course === course
    ) {
      end += 1;
    }
    const plan = monumentsById[monument as MonumentPlan['id']]!;
    runs.push({ from: index, to: end, weight: courseWorkload(plan, course, end - index) });
    index = end;
  }

  const totalWeight = runs.reduce((sum, run) => sum + run.weight, 0);
  const span = BUILD_END - BUILD_START;
  const scheduled = blocks.slice();
  let cursor = BUILD_START;

  for (const run of runs) {
    const runSpan = (span * run.weight) / totalWeight;
    const count = run.to - run.from;
    const slot = runSpan / count;
    const duration = slot * ACTIVE_SPAN_IN_SLOTS;
    for (let i = run.from; i < run.to; i += 1) {
      scheduled[i] = {
        ...blocks[i]!,
        lane: i % ACTIVE_LANES,
        start: cursor + (i - run.from) * slot,
        duration,
      };
    }
    cursor += runSpan;
  }
  return scheduled;
}

function coreFillCells(
  monument: MonumentPlan,
  blocks: ConstructionBlock[],
  seed: string,
): CoreFillCell[] {
  const random = mulberry32(seed);
  const cells: CoreFillCell[] = [];
  const courseHeight = monument.height / monument.courses;
  const spacing = CORE_SPACING;
  const cellWidth = spacing * 0.94;
  const cellHeight = courseHeight * 0.88;
  const [centerX, centerZ] = monument.center;
  const courseStarts = Array.from({ length: monument.courses }, (_, course) =>
    Math.min(...blocks
      .filter((block) => block.monument === monument.id && block.course === course)
      .map((block) => block.start)),
  );

  for (let course = 0; course < monument.courses; course += 1) {
    // Same geometry the schedule weighs, so cell counts can never drift.
    const gridRadius = coreGridRadius(monument, course);
    const courseCellCount = coreCellCount(monument, course);
    const courseStart = courseStarts[course]!;
    const nextCourseStart = courseStarts[course + 1]
      ?? Math.max(...blocks
        .filter((block) => block.monument === monument.id)
        .map((block) => block.start + block.duration));
    let index = 0;

    for (let gridZ = -gridRadius; gridZ <= gridRadius; gridZ += 1) {
      for (let gridX = -gridRadius; gridX <= gridRadius; gridX += 1) {
        const progress = (index + 1) / courseCellCount;
        cells.push({
          id: `${monument.id}-core-c${course.toString().padStart(2, '0')}-x${(gridX + gridRadius).toString().padStart(2, '0')}-z${(gridZ + gridRadius).toString().padStart(2, '0')}`,
          monument: monument.id,
          course,
          dimensions: [cellWidth, cellHeight, cellWidth],
          finalPosition: [
            centerX + gridX * spacing,
            monument.groundY + course * courseHeight + courseHeight * 0.5,
            centerZ + gridZ * spacing,
          ],
          readyAt: courseStart + (nextCourseStart - courseStart) * progress * 0.94,
          colorVariation: random() * 2 - 1,
        });
        index += 1;
      }
    }
  }
  return cells;
}

export function createGizaConstructionPlan(): GizaConstructionPlan {
  const unscheduled = [
    ...pyramidBlocks(monuments.khufu, 'giza:khufu'),
    ...pyramidBlocks(monuments.khafre, 'giza:khafre'),
    ...pyramidBlocks(monuments.menkaure, 'giza:menkaure'),
  ];

  const blocks = scheduleBlocks(unscheduled, monuments);

  return {
    seed: 'wonderforge:giza:v2',
    blocks,
    coreCells: [
      ...coreFillCells(monuments.khufu, blocks, 'giza:khufu:core'),
      ...coreFillCells(monuments.khafre, blocks, 'giza:khafre:core'),
      ...coreFillCells(monuments.menkaure, blocks, 'giza:menkaure:core'),
    ],
    routes: routes.map((item) => ({
      ...item,
      waypoints: { ...item.waypoints },
    })),
    ramps: ramps.map((ramp) => ({ ...ramp })),
    layers: layers.map((layer) => ({ ...layer })),
    monuments: {
      khufu: { ...monuments.khufu },
      khafre: { ...monuments.khafre },
      menkaure: { ...monuments.menkaure },
    },
  };
}

export const GIZA_CONSTRUCTION = createGizaConstructionPlan();
