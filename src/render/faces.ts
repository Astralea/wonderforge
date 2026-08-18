import type { ShapeKind } from '../data/types';
import { faceNormal, type Vec3 } from './vec';

/**
 * Shape tessellation — Spec 06 §Faces.
 * Unit space: footprint x,z ∈ [-0.5, 0.5], base at y=0, top at y=1,
 * EXCEPT torus which is centered at the origin (used for arches).
 * Winding is CCW seen from outside (Newell normal points outward).
 */
export interface Face {
  points: Vec3[];
  normal: Vec3;
}

const quad = (a: Vec3, b: Vec3, c: Vec3, d: Vec3): Face => {
  const points: Vec3[] = [a, b, c, d];
  return { points, normal: faceNormal(points) };
};
const tri = (a: Vec3, b: Vec3, c: Vec3): Face => {
  const points: Vec3[] = [a, b, c];
  return { points, normal: faceNormal(points) };
};
const ngon = (points: Vec3[]): Face => ({ points, normal: faceNormal(points) });

/** Re-fit faces into unit space (footprint [-0.5,0.5]², base y=0). */
function normalizeFaces(faces: Face[], centered = false): Face[] {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (const f of faces) {
    for (const p of f.points) {
      minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
      minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
      minZ = Math.min(minZ, p[2]); maxZ = Math.max(maxZ, p[2]);
    }
  }
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const cy = centered ? (minY + maxY) / 2 : minY;
  const s = 1 / Math.max(maxX - minX, maxY - minY, maxZ - minZ);
  return faces.map((f) => {
    const points = f.points.map(
      (p): Vec3 => [(p[0] - cx) * s, (p[1] - cy) * s, (p[2] - cz) * s],
    );
    return { points, normal: faceNormal(points) };
  });
}

function boxFaces(): Face[] {
  return [
    // top / bottom
    quad([-0.5, 1, -0.5], [-0.5, 1, 0.5], [0.5, 1, 0.5], [0.5, 1, -0.5]),
    quad([-0.5, 0, -0.5], [0.5, 0, -0.5], [0.5, 0, 0.5], [-0.5, 0, 0.5]),
    // ±x
    quad([0.5, 0, -0.5], [0.5, 1, -0.5], [0.5, 1, 0.5], [0.5, 0, 0.5]),
    quad([-0.5, 0, -0.5], [-0.5, 0, 0.5], [-0.5, 1, 0.5], [-0.5, 1, -0.5]),
    // ±z
    quad([-0.5, 0, 0.5], [0.5, 0, 0.5], [0.5, 1, 0.5], [-0.5, 1, 0.5]),
    quad([-0.5, 0, -0.5], [-0.5, 1, -0.5], [0.5, 1, -0.5], [0.5, 0, -0.5]),
  ];
}

const SIDES = 12;

function cylinderFaces(): Face[] {
  const faces: Face[] = [];
  for (let i = 0; i < SIDES; i++) {
    const a0 = (i / SIDES) * Math.PI * 2;
    const a1 = ((i + 1) / SIDES) * Math.PI * 2;
    const b0: Vec3 = [Math.cos(a0) * 0.5, 0, Math.sin(a0) * 0.5];
    const b1: Vec3 = [Math.cos(a1) * 0.5, 0, Math.sin(a1) * 0.5];
    const t0: Vec3 = [b0[0], 1, b0[2]];
    const t1: Vec3 = [b1[0], 1, b1[2]];
    faces.push(quad(b0, t0, t1, b1));
  }
  faces.push(
    ngon(Array.from({ length: SIDES }, (_, i) => {
      const a = (i / SIDES) * Math.PI * 2;
      return [Math.cos(a) * 0.5, 1, Math.sin(a) * 0.5] as Vec3;
    })),
    ngon(Array.from({ length: SIDES }, (_, i) => {
      const a = (i / SIDES) * Math.PI * 2;
      return [Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5] as Vec3;
    }).reverse()),
  );
  return faces;
}

function coneFaces(sides: number, radius: number, angleOffset = 0): Face[] {
  const faces: Face[] = [];
  const apex: Vec3 = [0, 1, 0];
  for (let i = 0; i < sides; i++) {
    const a0 = angleOffset + (i / sides) * Math.PI * 2;
    const a1 = angleOffset + ((i + 1) / sides) * Math.PI * 2;
    const b0: Vec3 = [Math.cos(a0) * radius, 0, Math.sin(a0) * radius];
    const b1: Vec3 = [Math.cos(a1) * radius, 0, Math.sin(a1) * radius];
    faces.push(tri(b0, apex, b1));
  }
  faces.push(
    ngon(Array.from({ length: sides }, (_, i) => {
      const a = angleOffset + (i / sides) * Math.PI * 2;
      return [Math.cos(a) * radius, 0, Math.sin(a) * radius] as Vec3;
    }).reverse()),
  );
  return faces;
}

function prismFaces(): Face[] {
  // Triangular cross-section in x-y (gable roof), length along z.
  return [
    tri([-0.5, 0, 0.5], [0.5, 0, 0.5], [0, 1, 0.5]),
    tri([-0.5, 0, -0.5], [0, 1, -0.5], [0.5, 0, -0.5]),
    quad([0.5, 0, -0.5], [0, 1, -0.5], [0, 1, 0.5], [0.5, 0, 0.5]),
    quad([-0.5, 0, -0.5], [-0.5, 0, 0.5], [0, 1, 0.5], [0, 1, -0.5]),
    quad([-0.5, 0, -0.5], [0.5, 0, -0.5], [0.5, 0, 0.5], [-0.5, 0, 0.5]),
  ];
}

/** Earthen construction wedge: low edge at +z, full-height edge at -z. */
function rampFaces(): Face[] {
  return [
    // sloped working surface
    quad([-0.5, 0, 0.5], [0.5, 0, 0.5], [0.5, 1, -0.5], [-0.5, 1, -0.5]),
    // bottom and high back
    quad([-0.5, 0, -0.5], [-0.5, 0, 0.5], [0.5, 0, 0.5], [0.5, 0, -0.5]),
    quad([0.5, 0, -0.5], [-0.5, 0, -0.5], [-0.5, 1, -0.5], [0.5, 1, -0.5]),
    // triangular sides
    tri([-0.5, 0, 0.5], [-0.5, 1, -0.5], [-0.5, 0, -0.5]),
    tri([0.5, 0, 0.5], [0.5, 0, -0.5], [0.5, 1, -0.5]),
  ];
}

function sphereFaces(): Face[] {
  const RINGS = 5;
  const SEGMENTS = 10;
  const faces: Face[] = [];
  const pt = (j: number, i: number): Vec3 => {
    const phi = -Math.PI / 2 + (j / RINGS) * Math.PI;
    const theta = (i / SEGMENTS) * Math.PI * 2;
    return [
      0.5 * Math.cos(phi) * Math.cos(theta),
      0.5 + 0.5 * Math.sin(phi),
      0.5 * Math.cos(phi) * Math.sin(theta),
    ];
  };
  const south: Vec3 = [0, 0, 0];
  const north: Vec3 = [0, 1, 0];
  for (let i = 0; i < SEGMENTS; i++) {
    faces.push(tri(south, pt(1, i), pt(1, i + 1)));
  }
  for (let j = 1; j < RINGS - 1; j++) {
    for (let i = 0; i < SEGMENTS; i++) {
      faces.push(quad(pt(j, i), pt(j + 1, i), pt(j + 1, i + 1), pt(j, i + 1)));
    }
  }
  for (let i = 0; i < SEGMENTS; i++) {
    faces.push(tri(north, pt(RINGS - 1, i + 1), pt(RINGS - 1, i)));
  }
  return faces;
}

function torusFaces(): Face[] {
  const MAJOR = 0.42;
  const MINOR = 0.09;
  const U = 16;
  const V = 8;
  const pt = (ui: number, vi: number): Vec3 => {
    const u = (ui / U) * Math.PI * 2;
    const v = (vi / V) * Math.PI * 2;
    const r = MAJOR + MINOR * Math.cos(v);
    // ring in the x-y plane (vertical), thickness along z
    return [r * Math.cos(u), r * Math.sin(u), MINOR * Math.sin(v)];
  };
  const faces: Face[] = [];
  for (let i = 0; i < U; i++) {
    for (let j = 0; j < V; j++) {
      faces.push(quad(pt(i, j), pt(i, j + 1), pt(i + 1, j + 1), pt(i + 1, j)));
    }
  }
  return normalizeFaces(faces, true);
}

/**
 * Sail — a wedge of a sphere cut by two planes through the vertical diameter
 * (Utzon's actual geometry for the Opera House shells). The pointed poles dig
 * into / rise from the podium; the spherical arc forms the curved back.
 * Unit space: y ∈ [0, 1] after normalization; thin in x, deep in z.
 */
function sailFaces(): Face[] {
  const PHI = 10; // steps pole to pole
  const THE = 4; // steps across the wedge
  const BETA = 0.45; // half-angle of the wedge (radians)
  const pt = (fi: number, ti: number): Vec3 => {
    const phi = (fi / PHI) * Math.PI;
    const theta = -BETA + (ti / THE) * 2 * BETA;
    return [
      Math.sin(phi) * Math.sin(theta),
      Math.cos(phi),
      Math.sin(phi) * Math.cos(theta),
    ];
  };
  const faces: Face[] = [];
  // curved orange-peel surface
  for (let i = 0; i < PHI; i++) {
    for (let j = 0; j < THE; j++) {
      faces.push(quad(pt(i, j), pt(i + 1, j), pt(i + 1, j + 1), pt(i, j + 1)));
    }
  }
  // flat cut faces (half-discs) at θ = ±BETA
  for (const side of [1, -1] as const) {
    const ti = side === 1 ? THE : 0;
    const arc: Vec3[] = [];
    for (let i = 0; i <= PHI; i++) arc.push(pt(i, ti));
    const poly: Vec3[] = [[0, 1, 0], ...arc, [0, -1, 0]];
    faces.push(side === 1 ? ngon(poly) : ngon([...poly].reverse()));
  }
  return normalizeFaces(faces);
}

const cache = new Map<ShapeKind, Face[]>();

export function tessellate(shape: ShapeKind): Face[] {
  const hit = cache.get(shape);
  if (hit) return hit;
  let faces: Face[];
  switch (shape) {
    case 'box':
      faces = boxFaces();
      break;
    case 'cylinder':
      faces = cylinderFaces();
      break;
    case 'cone':
      faces = coneFaces(SIDES, 0.5);
      break;
    case 'pyramid':
      faces = coneFaces(4, Math.SQRT1_2, Math.PI / 4);
      break;
    case 'prism':
      faces = prismFaces();
      break;
    case 'ramp':
      faces = rampFaces();
      break;
    case 'sphere':
      faces = sphereFaces();
      break;
    case 'torus':
      faces = torusFaces();
      break;
    case 'sail':
      faces = sailFaces();
      break;
  }
  cache.set(shape, faces);
  return faces;
}
