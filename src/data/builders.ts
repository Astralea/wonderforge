/**
 * Shared recipe builders for common architectural patterns.
 * Pure functions — determinism lives here (Spec 01 §Structural recipes).
 */
import type { Entrance, MaterialKey, Part, ShapeKind } from './types';

export function part(p: Partial<Part> & Pick<Part, 'shape' | 'position' | 'scale'>): Part {
  return { material: 'primary', ...p };
}

/** Courses of a stepped pyramid, stacking bottom-up. */
export function steppedPyramid(opts: {
  center?: [number, number];
  base: number;
  levels: number;
  levelHeight: number;
  material?: MaterialKey;
}): Part[] {
  const { center = [0, 0], base, levels, levelHeight, material = 'primary' } = opts;
  const parts: Part[] = [];
  for (let i = 0; i < levels; i++) {
    const size = base * (1 - i / levels);
    parts.push({
      shape: 'box',
      material,
      position: [center[0], i * levelHeight, center[1]],
      scale: [size, levelHeight, size],
      entrance: 'stack',
      order: i,
    });
  }
  return parts;
}

/**
 * Thin, optionally sliced pyramid courses. Splitting one monument across
 * components lets a scene give its lower masonry and crown separate beats.
 */
export function masonryPyramid(opts: {
  center?: [number, number];
  base: number;
  courses: number;
  courseHeight: number;
  startCourse?: number;
  endCourse?: number;
  y?: number;
  material?: MaterialKey;
}): Part[] {
  const {
    center = [0, 0],
    base,
    courses,
    courseHeight,
    startCourse = 0,
    endCourse = courses,
    y = 0,
    material = 'primary',
  } = opts;
  const first = Math.max(0, Math.floor(startCourse));
  const last = Math.min(courses, Math.ceil(endCourse));
  const parts: Part[] = [];
  for (let i = first; i < last; i++) {
    const size = base * (1 - i / courses);
    parts.push({
      shape: 'box',
      material,
      position: [center[0], y + i * courseHeight, center[1]],
      scale: [size, courseHeight, size],
      entrance: 'stack',
      order: i - first,
    });
  }
  return parts;
}

/** Parts placed evenly on a circle (or arc), yaw-rotated to face the center. */
export function ring(opts: {
  center?: [number, number];
  radius: number;
  count: number;
  shape?: ShapeKind;
  partScale: [number, number, number];
  y?: number;
  material?: MaterialKey;
  entrance?: Entrance;
  order?: number;
  jitter?: number;
  /** Radians [start, end); defaults to a full circle. */
  arc?: [number, number];
  /** Extra yaw (radians) added to the face-center rotation. */
  yawOffset?: number;
}): Part[] {
  const {
    center = [0, 0],
    radius,
    count,
    shape = 'box',
    partScale,
    y = 0,
    material = 'primary',
    entrance = 'place',
    order,
    jitter,
    arc,
    yawOffset = 0,
  } = opts;
  const [a0, a1] = arc ?? [0, Math.PI * 2];
  const parts: Part[] = [];
  for (let i = 0; i < count; i++) {
    const theta = a0 + ((a1 - a0) * i) / count;
    parts.push({
      shape,
      material,
      position: [
        center[0] + Math.cos(theta) * radius,
        y,
        center[1] + Math.sin(theta) * radius,
      ],
      scale: [...partScale],
      rotation: [0, -theta + yawOffset, 0],
      entrance,
      order,
      jitter,
    });
  }
  return parts;
}

/** A low-poly tree: trunk + foliage cone. */
export function tree(x: number, z: number, size = 1, jitter = 0): Part[] {
  return [
    {
      shape: 'cylinder',
      material: 'accent',
      position: [x, 0, z],
      scale: [0.3 * size, 1.2 * size, 0.3 * size],
      jitter,
    },
    {
      shape: 'cone',
      material: 'foliage',
      position: [x, 1.1 * size, z],
      scale: [1.6 * size, 2.4 * size, 1.6 * size],
      jitter,
    },
  ];
}

/** A small house: walls + pitched roof. */
export function house(
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  yaw = 0,
): Part[] {
  return [
    { shape: 'box', material: 'primary', position: [x, y, z], scale: [w, h, d], rotation: [0, yaw, 0] },
    { shape: 'prism', material: 'accent', position: [x, y + h, z], scale: [w * 1.15, h * 0.55, d * 1.15], rotation: [0, yaw, 0] },
  ];
}
