import { describe, expect, it } from 'vitest';
import {
  SYDNEY_SAILS,
  SYDNEY_SPHERE_RADIUS,
  sydneyShellPoint,
  sydneyPatchVertices,
} from '../src/data/sydneyShells';
import { SYDNEY_CONSTRUCTION } from '../src/data/sydneyConstruction';
import {
  SydneyStoneSystem,
  sydneyPartVertices,
} from '../src/render/three/SydneyStoneSystem';
import { Mesh, Vector3 } from 'three';
import type { MaterialLibrary } from '../src/render/three/MaterialLibrary';

describe('Sydney authored spherical roof geometry', () => {
  it('winds outer faces away from the sphere centre and inner faces toward it', () => {
    for (const sail of SYDNEY_SAILS)
      for (const side of [-1, 1] as const) {
        const center = new Vector3(...sail.sphereCenters[side === -1 ? 0 : 1]);
        const vertices = sydneyPatchVertices(sail, {
          u0: 0.2,
          u1: 0.8,
          v0: 0.1,
          v1: 0.9,
          side,
          depth: 0.2,
        });
        for (let i = 0; i < 48; i += 3) {
          const a = new Vector3().fromArray(vertices, i * 3);
          const b = new Vector3().fromArray(vertices, (i + 1) * 3);
          const c = new Vector3().fromArray(vertices, (i + 2) * 3);
          const normal = b.sub(a).cross(c.sub(a)).normalize();
          const radial = a.sub(center).normalize();
          expect(normal.dot(radial) * (i < 24 ? 1 : -1)).toBeGreaterThan(0.9);
        }
      }
  });
  it('places distinct concert/opera/restaurant groups on the documented sides', () => {
    expect(
      SYDNEY_SAILS.filter((s) => s.group === 'concert').every(
        (s) => s.position[0] < 0,
      ),
    ).toBe(true);
    expect(
      SYDNEY_SAILS.filter((s) => s.group === 'opera').every(
        (s) => s.position[0] > 0,
      ),
    ).toBe(true);
    expect(
      SYDNEY_SAILS.filter((s) => s.group === 'restaurant').every(
        (s) => s.position[0] < 0 && s.position[2] > 30,
      ),
    ).toBe(true);
    expect(
      Math.max(
        ...SYDNEY_SAILS.filter((s) => s.group === 'concert').map(
          (s) => s.height,
        ),
      ),
    ).toBeGreaterThan(
      Math.max(
        ...SYDNEY_SAILS.filter((s) => s.group === 'opera').map((s) => s.height),
      ),
    );
  });
  it('samples authored radius75 grids with matching u1 ridges and a single u0 pedestal', () => {
    for (const s of SYDNEY_SAILS)
      for (const side of [-1, 1] as const) {
        const centre = s.sphereCenters[side === -1 ? 0 : 1];
        for (let row = 0; row < s.rows; row += 8)
          for (let col = 0; col < s.cols; col += 4) {
            const p = sydneyShellPoint(
              s,
              row / (s.rows - 1),
              col / (s.cols - 1),
              side,
            );
            const index =
              (((side === -1 ? 0 : 1) * s.rows + row) * s.cols + col) * 3;
            expect(p).toEqual(s.points.slice(index, index + 3));
            expect(Math.hypot(...p.map((n, i) => n - centre[i]!))).toBeCloseTo(
              SYDNEY_SPHERE_RADIUS,
              3,
            );
          }
        const pedestal = sydneyShellPoint(s, 0, 0, side);
        expect(pedestal[1]).toBeCloseTo(14.2, 4);
        for (const v of [0, 0.125, 0.5, 0.75, 1]) {
          expect(sydneyShellPoint(s, 0, v, side)).toEqual(pedestal);
          const left = sydneyShellPoint(s, 1, v, -1),
            right = sydneyShellPoint(s, 1, v, 1);
          left.forEach((n, i) => expect(n).toBeCloseTo(right[i]!, 4));
        }
      }
  });
  it('uses actual transformed vertex bounds, leaves no artificial half-height transport gap', () => {
    for (const p of SYDNEY_CONSTRUCTION.parts.filter((p) => p.surface)) {
      const vertices = sydneyPartVertices(p);
      const min = [Infinity, Infinity, Infinity],
        max = [-Infinity, -Infinity, -Infinity];
      vertices.forEach((v, i) => {
        const a = i % 3;
        min[a] = Math.min(min[a]!, v);
        max[a] = Math.max(max[a]!, v);
      });
      for (let a = 0; a < 3; a++) {
        expect((min[a]! + max[a]!) / 2).toBeCloseTo(p.finalPosition[a]!, 8);
        expect(max[a]! - min[a]!).toBeCloseTo(p.dimensions[a]!, 8);
      }
      expect(p.finalRotation).toEqual([0, 0, 0]);
    }
  });
  it('separates tiles radially from concrete without changing spherical curvature', () => {
    for (const s of SYDNEY_SAILS) {
      const inner = sydneyShellPoint(s, 0.6, 0.7, 1, 0),
        outer = sydneyShellPoint(s, 0.6, 0.7, 1, 0.22);
      expect(Math.hypot(...outer.map((n, i) => n - inner[i]!))).toBeCloseTo(
        0.22,
        7,
      );
      expect(
        sydneyPatchVertices(s, {
          u0: 0.1,
          u1: 0.2,
          v0: 0.1,
          v1: 0.2,
          side: 1,
          depth: 0.2,
        }).every(Number.isFinite),
      ).toBe(true);
    }
  });
  it('reverse seeking restores exact seated ranges and bounds GPU batches', () => {
    const system = new SydneyStoneSystem(
      SYDNEY_CONSTRUCTION,
      {} as MaterialLibrary,
    );
    const ranges = () =>
      system.group.children
        .filter((n) => n.name.startsWith('sydney-parts-'))
        .map((n) => (n as Mesh).geometry.drawRange.count);
    system.update(0.58);
    const middle = ranges();
    system.update(1);
    system.update(0.1);
    system.update(0.58);
    expect(ranges()).toEqual(middle);
    system.update(1);
    expect(ranges().every((n) => n > 0)).toBe(true);
    expect(system.group.children.length).toBeLessThan(10);
    system.dispose();
  });
});
