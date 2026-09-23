import { describe, expect, it } from 'vitest';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { SYDNEY_HARBOUR_CONTEXT } from '../src/data/sydneyHarbourContext';
import { createSydneyHarbourLots } from '../src/engine/sydneyHarbourLots';
import {
  sydneyGroundKindAt,
  sydneyTerrainHeightAt,
} from '../src/engine/sydneyTerrain';
import {
  flattenSydneyRoles,
  loadSydneyHarbourKit,
} from '../src/render/three/sydneyKit';

type Point = readonly [number, number];
const plan = SYDNEY_HARBOUR_CONTEXT.gardenComposition;
const allLots = createSydneyHarbourLots();
const garden = allLots.filter((l) => l.district === 'garden');
// Independent clipping oracle: clip the authored polygon against a rectangular
// lot and integrate its remaining area, rather than reuse placement predicates.
function clippedArea(
  polygon: readonly Point[],
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
): number {
  let points: Point[] = [...polygon];
  for (const [axis, edge, sign] of [
    [0, bounds.minX, 1],
    [0, bounds.maxX, -1],
    [1, bounds.minZ, 1],
    [1, bounds.maxZ, -1],
  ] as const) {
    const next: Point[] = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i]!,
        b = points[(i + 1) % points.length]!;
      const insideA = (a[axis] - edge) * sign >= 0,
        insideB = (b[axis] - edge) * sign >= 0;
      if (insideA) next.push(a);
      if (insideA !== insideB) {
        const u = (edge - a[axis]) / (b[axis] - a[axis]);
        next.push([a[0] + u * (b[0] - a[0]), a[1] + u * (b[1] - a[1])]);
      }
    }
    points = next;
  }
  return (
    Math.abs(
      points.reduce((sum, a, i) => {
        const b = points[(i + 1) % points.length]!;
        return sum + a[0] * b[1] - b[0] * a[1];
      }, 0),
    ) / 2
  );
}
function area(polygon: readonly Point[]): number {
  return (
    Math.abs(
      polygon.reduce((sum, a, i) => {
        const b = polygon[(i + 1) % polygon.length]!;
        return sum + a[0] * b[1] - b[0] * a[1];
      }, 0),
    ) / 2
  );
}

describe('Botanic Garden canopy composition', () => {
  it('keeps a clear shoreline sector on the mapped garden', () => {
    expect(garden.length).toBeGreaterThan(50);
    for (const adjustment of plan.frontageRelocations) {
      expect(
        garden.some(
          (l) =>
            l.x === adjustment.to[0] &&
            l.z === adjustment.to[1] &&
            l.canopyGroup === adjustment.group,
        ),
      ).toBe(true);
      expect(
        garden.some(
          (l) =>
            Math.hypot(l.x - adjustment.from[0], l.z - adjustment.from[1]) <
            0.01,
        ),
      ).toBe(false);
    }
    for (const tree of garden)
      expect(clippedArea(plan.openShoreSector, tree.footprint)).toBeLessThan(
        1e-7,
      );
  });

  it('is deterministic and stays within canopy budgets', () => {
    expect(createSydneyHarbourLots()).toEqual(allLots);
    // Explicit measured pre-pass ceilings, not a minimum decoration quota.
    expect(garden.length).toBeLessThanOrEqual(plan.maxInstances);
    expect(allLots.filter((l) => l.kind === 'fig').length).toBeLessThanOrEqual(
      170,
    );
  });
  it('forms three irregular groups with size/yaw variation on mapped land', () => {
    expect(new Set(garden.map((l) => l.canopyGroup))).toEqual(
      new Set(plan.canopyGroups.map((g) => g.id)),
    );
    for (const group of plan.canopyGroups) {
      const members = garden.filter((l) => l.canopyGroup === group.id);
      for (const tree of members) {
        const f = tree.footprint;
        expect(clippedArea(group.polygon, f)).toBeCloseTo(
          (f.maxX - f.minX) * (f.maxZ - f.minZ),
          6,
        );
      }
      expect(
        Math.max(...members.map((l) => l.scale)) -
          Math.min(...members.map((l) => l.scale)),
      ).toBeGreaterThan(0.1);
      expect(
        Math.max(...members.map((l) => l.yaw)) -
          Math.min(...members.map((l) => l.yaw)),
      ).toBeGreaterThan(Math.PI / 3);
    }
    for (const tree of garden)
      expect(sydneyGroundKindAt(tree.x, tree.z)).toBe('garden');
  });
  it('keeps the actual transformed fig vertices inside each clearance footprint and roots on the sampler', async () => {
    const kit = await loadSydneyHarbourKit();
    const geometry = flattenSydneyRoles(kit.fig, ['foliage', 'timber'])!;
    const positions = geometry.getAttribute('position'),
      p = new Vector3();
    for (const tree of garden) {
      const transform = new Matrix4().compose(
        new Vector3(tree.x, tree.supportY, tree.z),
        new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), tree.yaw),
        new Vector3(1.7 * tree.scale, 0.68 * tree.scale, 1.7 * tree.scale),
      );
      let lowest = Infinity;
      for (let i = 0; i < positions.count; i++) {
        p.fromBufferAttribute(positions, i).applyMatrix4(transform);
        lowest = Math.min(lowest, p.y);
        expect(p.x).toBeGreaterThanOrEqual(tree.footprint.minX);
        expect(p.x).toBeLessThanOrEqual(tree.footprint.maxX);
        expect(p.z).toBeGreaterThanOrEqual(tree.footprint.minZ);
        expect(p.z).toBeLessThanOrEqual(tree.footprint.maxZ);
      }
      expect(lowest).toBeCloseTo(sydneyTerrainHeightAt(tree.x, tree.z), 8);
      for (const x of [tree.footprint.minX, tree.footprint.maxX])
        for (const z of [tree.footprint.minZ, tree.footprint.maxZ])
          expect(sydneyTerrainHeightAt(x, z)).toBeGreaterThanOrEqual(1);
    }
    geometry.dispose();
  });
  it('allows touching garden crowns while clearing trunks, worksite and access lanes', () => {
    const overlap = (
      a: { minX: number; maxX: number; minZ: number; maxZ: number },
      b: typeof a,
    ) =>
      Math.min(a.maxX, b.maxX) > Math.max(a.minX, b.minX) &&
      Math.min(a.maxZ, b.maxZ) > Math.max(a.minZ, b.minZ);
    for (const tree of garden) {
      for (const other of allLots)
        if (other !== tree) {
          if (other.kind === 'fig' && other.district === 'garden') {
            expect(
              Math.hypot(tree.x - other.x, tree.z - other.z),
            ).toBeGreaterThanOrEqual(6);
            const f = tree.footprint;
            expect(
              overlap(
                {
                  minX: f.minX + 3,
                  maxX: f.maxX - 3,
                  minZ: f.minZ + 3,
                  maxZ: f.maxZ - 3,
                },
                other.footprint,
              ),
            ).toBe(false);
          } else expect(overlap(tree.footprint, other.footprint)).toBe(false);
        }
      for (const site of SYDNEY_HARBOUR_CONTEXT.protectedFootprints)
        expect(overlap(tree.footprint, site)).toBe(false);
      for (const route of SYDNEY_HARBOUR_CONTEXT.routes)
        for (let i = 1; i < route.points.length; i++) {
          const a = route.points[i - 1]!,
            b = route.points[i]!,
            dx = b[0] - a[0],
            dz = b[1] - a[1];
          const u = Math.max(
            0,
            Math.min(
              1,
              ((tree.x - a[0]) * dx + (tree.z - a[1]) * dz) /
                (dx * dx + dz * dz),
            ),
          );
          const distance = Math.hypot(
            tree.x - a[0] - u * dx,
            tree.z - a[1] - u * dz,
          );
          const radius =
            Math.hypot(
              tree.footprint.maxX - tree.footprint.minX,
              tree.footprint.maxZ - tree.footprint.minZ,
            ) / 2;
          expect(distance - radius).toBeGreaterThan(route.width / 2);
        }
    }
  });
  it('preserves a contiguous lawn on land opening toward the existing Farm Cove water', () => {
    for (const lot of allLots)
      expect(
        clippedArea(plan.lawn.polygon, lot.footprint),
        `${lot.district} ${lot.x},${lot.z}`,
      ).toBeLessThan(1e-7);
    // Small cells fully within the lawn may not be fictional fill over water.
    for (let x = -60; x < 190; x += 2)
      for (let z = 260; z < 400; z += 2) {
        const cell = { minX: x, maxX: x + 1, minZ: z, maxZ: z + 1 };
        if (clippedArea(plan.lawn.polygon, cell) > 0.999)
          expect(sydneyTerrainHeightAt(x + 0.5, z + 0.5)).toBeGreaterThan(0.2);
      }
    expect(area(plan.lawn.polygon)).toBeGreaterThan(
      plan.canopyEnvelope.width * plan.canopyEnvelope.depth * 3,
    );
    const [a, b] = plan.lawn.shoreMouth;
    expect(Math.hypot(b[0] - a[0], b[1] - a[1])).toBeGreaterThan(
      plan.canopyEnvelope.width,
    );
    for (let i = 0; i <= 12; i++) {
      const u = i / 12,
        x = a[0] + u * (b[0] - a[0]),
        z = a[1] + u * (b[1] - a[1]);
      expect(sydneyTerrainHeightAt(x, z)).toBeGreaterThan(1);
      expect(
        sydneyTerrainHeightAt(
          x + plan.lawn.facing[0] * 50,
          z + plan.lawn.facing[1] * 50,
        ),
      ).toBe(0);
    }
  });
});
