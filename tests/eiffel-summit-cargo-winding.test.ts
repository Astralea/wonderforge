import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { sampleEiffelSummitCargo } from '../src/engine/eiffelSummitCargo';
import { sampleEiffelSummitOperation } from '../src/engine/eiffelSummitOperation';
import { eiffelCargoWindingCrossSection, eiffelCargoWindingLength, sampleEiffelCargoWindingPoint, sampleEiffelCargoWindingTangent } from '../src/engine/eiffelSummitCargoRope';
import type { RigidVec3 as V } from '../src/engine/eiffelRigid';

const TAU = Math.PI * 2;
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (v: V) => Math.hypot(...v);
const rotateX = (v: V, a: number): V => [v[0], v[1] * Math.cos(a) - v[2] * Math.sin(a), v[1] * Math.sin(a) + v[2] * Math.cos(a)];
const unit = (v: V): V => { const d = norm(v); return [v[0] / d, v[1] / d, v[2] / d]; };
function chordLength(q: number, samplesPerTurn: number) {
  const n = Math.ceil(q * samplesPerTurn);
  let previous = sampleEiffelCargoWindingPoint(0, q), sum = 0;
  for (let i = 1; i <= n; i++) {
    const point = sampleEiffelCargoWindingPoint(q * i / n, q);
    sum += norm(sub(point, previous)); previous = point;
  }
  return sum;
}
function pointDistance(p: V, a: V, b: V) {
  const d = sub(b, a), t = Math.max(0, Math.min(1, dot(sub(p, a), d) / dot(d, d)));
  return norm([p[0] - a[0] - t * d[0], p[1] - a[1] - t * d[1], p[2] - a[2] - t * d[2]]);
}
function segmentDistance(a: V, b: V, c: V, d: V) {
  const u = sub(b, a), v = sub(d, c), w = sub(a, c), aa = dot(u, u), bb = dot(u, v), cc = dot(v, v), dd = dot(u, w), ee = dot(v, w);
  const denominator = aa * cc - bb * bb;
  let minimum = Math.min(pointDistance(a, c, d), pointDistance(b, c, d), pointDistance(c, a, b), pointDistance(d, a, b));
  if (denominator > 1e-15) {
    const s = (bb * ee - cc * dd) / denominator, t = (aa * ee - bb * dd) / denominator;
    if (s >= 0 && s <= 1 && t >= 0 && t <= 1) minimum = Math.min(minimum, norm([w[0] + s * u[0] - t * v[0], w[1] + s * u[1] - t * v[1], w[2] + s * u[2] - t * v[2]]));
  }
  return minimum;
}
// Independent spatial hash plus exact segment/segment distances. This gate
// concerns the sampled drawing, not an elastic rope or source mesh certificate.
function minimumNonlocalDistance(q: number) {
  const n = Math.ceil(q * 96), points = Array.from({ length: n + 1 }, (_, i) => sampleEiffelCargoWindingPoint(q * i / n, q));
  const grid = new Map<string, number[]>(), cell = .018, accumulated = [0];
  for (let i = 1; i <= n; i++) accumulated.push(accumulated[i - 1]! + norm(sub(points[i]!, points[i - 1]!)));
  let minimum = Infinity;
  for (let i = 0; i < n; i++) {
    const a = points[i]!, b = points[i + 1]!, seen = new Set<number>();
    const low = a.map((v, j) => Math.floor((Math.min(v, b[j]!) - .0123) / cell));
    const high = a.map((v, j) => Math.floor((Math.max(v, b[j]!) + .0123) / cell));
    for (let x = low[0]!; x <= high[0]!; x++) for (let y = low[1]!; y <= high[1]!; y++) for (let z = low[2]!; z <= high[2]!; z++) {
      for (const j of grid.get(`${x},${y},${z}`) ?? []) {
        if (seen.has(j) || accumulated[i]! - accumulated[j + 1]! < .04) continue;
        seen.add(j); minimum = Math.min(minimum, segmentDistance(a, b, points[j]!, points[j + 1]!));
      }
    }
    const lo = a.map((v, j) => Math.floor(Math.min(v, b[j]!) / cell)), hi = a.map((v, j) => Math.floor(Math.max(v, b[j]!) / cell));
    for (let x = lo[0]!; x <= hi[0]!; x++) for (let y = lo[1]!; y <= hi[1]!; y++) for (let z = lo[2]!; z <= hi[2]!; z++) {
      const key = `${x},${y},${z}`, entries = grid.get(key) ?? []; entries.push(i); grid.set(key, entries);
    }
  }
  return minimum;
}

describe('summit cargo traversing drum geometry', () => {
  it('joins rounded layer reversals in position and velocity within the authored flange envelope', () => {
    for (let layer = 0; layer < 9; layer++) for (const q of [layer * 12 + 11, layer * 12 + 12]) {
      const a = eiffelCargoWindingCrossSection(q - 1e-6), b = eiffelCargoWindingCrossSection(q + 1e-6);
      expect(Math.hypot(a.x - b.x, a.radius - b.radius)).toBeLessThan(4e-8);
      expect(Math.hypot(a.dx - b.dx, a.dr - b.dr)).toBeLessThan(1e-7);
    }
    for (let i = 0; i <= 119 * 32; i++) {
      const q = i / 32, section = eiffelCargoWindingCrossSection(q);
      expect(Math.abs(section.x) + .006).toBeLessThanOrEqual(.0792 + 1e-12);
      expect(section.radius + .006).toBeLessThan(.24);
      expect(section.radius - .006).toBeGreaterThanOrEqual(.10 - 1e-12);
      for (const t of [Math.max(0, q - .25), Math.max(0, q - .125), q]) {
        const p = sampleEiffelCargoWindingPoint(t, q);
        expect(Math.abs(p[0]) + .006).toBeLessThan(.08);
        expect(Math.hypot(p[1], p[2]) + .006).toBeLessThan(.24);
      }
    }
    expect(eiffelCargoWindingLength(119)).toBeGreaterThan(120);
    expect(() => eiffelCargoWindingLength(119.01)).toThrow(/capacity/);
  });

  it('uses one shaft turn per drum turn and a matching closed 24-turn cam groove', () => {
    const design = JSON.parse(readFileSync('artifacts/eiffel-summit-operation-2026-09-08/rope/traverse-cam.json', 'utf8'));
    expect(design.spindleTurnsPerCamRevolution).toBe(1);
    expect(design.grooveTurnsPerClosedPeriod).toBe(24);
    expect(design.points).toHaveLength(2305);
    for (let i = 0; i < design.points.length; i++) {
      const q = i / 96, point = design.points[i] as V, expected = eiffelCargoWindingCrossSection(q);
      const rotated = rotateX(point, -TAU * q);
      expect(norm(sub(rotated, [-expected.x, .035, 0]))).toBeLessThan(1e-10);
      expect(eiffelCargoWindingCrossSection(q + 24).x).toBeCloseTo(expected.x, 12);
    }
    expect(norm(sub(design.points[0], design.points.at(-1)))).toBeLessThan(1e-10);
  });

  it('matches the complete rotated winding endpoint and tangent to the current-radius free rope throughout both lifts and head climb', () => {
    const ropes = [1, 2].flatMap(assembly => Array.from({ length: 113 }, (_, seconds) => sampleEiffelSummitCargo(seconds, assembly as 1 | 2).cable.rope));
    for (let seconds = 112; seconds < 182; seconds++) {
      const parked = sampleEiffelSummitOperation(seconds).parkedCargo;
      if (parked) ropes.push(parked.rope);
    }
    for (const rope of ropes) {
      const winding = rope.winding, q = winding.spindleTurns, last = winding.localPoints.at(-1)!;
      const rotated = rotateX(last, winding.drumRotation);
      const world: V = [rotated[0] + winding.drumCenter[0], rotated[1] + winding.drumCenter[1], rotated[2] + winding.drumCenter[2]];
      expect(norm(sub(world, rope.segments[0]!.start))).toBeLessThan(1e-10);
      const tangent = rotateX(sampleEiffelCargoWindingTangent(q, q), winding.drumRotation);
      expect(dot(tangent, unit(sub(rope.segments[0]!.end, rope.segments[0]!.start)))).toBeGreaterThan(1 - 1e-10);
      const before = sampleEiffelCargoWindingPoint(q - 1e-6, q), finiteTangent = unit(sub(last, before));
      expect(dot(finiteTangent, winding.terminalLocalTangent)).toBeGreaterThan(1 - 1e-9);
      expect(winding.camRotation).toBe(winding.drumRotation);
      expect(winding.drumCenter[0] - .25).toBeCloseTo(winding.followerX, 12);
      expect(Math.abs(winding.length + rope.deployedLength - 120)).toBeLessThan(1e-8);
      expect(rope.inventory.visualWindingAdmitted).toBe(false);
      expect(rope.sourceClearanceVerified).toBe(false);
    }
  });

  it('agrees with an independent refined chord integration including partial peel and crossover sections', () => {
    for (const q of [11.125, 11.5, 12, 23.999, 71.99, 119]) {
      const coarse = chordLength(q, 512), fine = chordLength(q, 1024), extrapolated = (4 * fine - coarse) / 3;
      expect(Math.abs(eiffelCargoWindingLength(q) - extrapolated)).toBeLessThan(2e-7);
      expect(fine).toBeLessThan(eiffelCargoWindingLength(q));
    }
  });

  it('keeps nonadjacent 12 mm rope tubes separate in the sampled crossover and full-capacity drawing', () => {
    for (const q of [11.5, 12, 23.5, 119]) expect(minimumNonlocalDistance(q), `turns ${q}`).toBeGreaterThan(.012);
  });
});
