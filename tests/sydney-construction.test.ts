import { describe, expect, it } from 'vitest';
import {
  Mesh,
  BufferGeometry,
  Float32BufferAttribute,
  MeshBasicMaterial,
  DoubleSide,
  Raycaster,
  Vector3,
} from 'three';
import {
  SydneyStoneSystem,
  sydneyPartVertices,
} from '../src/render/three/SydneyStoneSystem';
import type { MaterialLibrary } from '../src/render/three/MaterialLibrary';
import {
  SYDNEY_CONSTRUCTION as plan,
  SYDNEY_CRANE_BASES,
  SYDNEY_MAX_ACTIVE,
  SYDNEY_PODIUM_DECK,
  SYDNEY_TROLLEY_BED,
  SYDNEY_SHELL_PRECEDENCE,
  createSydneyConstructionPlan,
} from '../src/data/sydneyConstruction';
import {
  activeSydneyOperationsAt,
  sydneyPartStateAt,
  sydneyCraneRigAt,
  sydneyStagingPose,
  sydneyFalseworkAt,
  SYDNEY_CRANE_JIB_LENGTH,
  SYDNEY_CRANE_MAST_HEIGHT,
} from '../src/engine/sydneyConstruction';
import { sydneyTerrainHeightAt } from '../src/engine/sydneyTerrain';
import { sydneyPlantAt } from '../src/engine/sydneyPlant';
import {
  SYDNEY_SAILS,
  sydneyShellPoint,
  sydneyPodiumHeightAt,
} from '../src/data/sydneyShells';
import { sydneyLabourAt } from '../src/engine/sydneyCrew';
const route = plan.routes[0]!;
const shell = plan.parts.filter((p) => p.graph === 'shell');
const distance = (a: readonly number[], b: readonly number[]) =>
  Math.hypot(...a.map((v, i) => v - b[i]!));

describe('Sydney segmented construction and crane mechanics', () => {
  it('is deterministic, uses immutable rigid parts, and completes labour before the reveal', () => {
    expect(createSydneyConstructionPlan()).toEqual(plan);
    expect(new Set(plan.parts.map((p) => p.id)).size).toBe(plan.parts.length);
    expect(shell.length).toBeGreaterThan(100);
    for (const p of plan.parts) {
      expect(p.scale).toEqual([1, 1, 1]);
      expect(p.dimensions.every((v) => Number.isFinite(v) && v > 0)).toBe(true);
      expect(p.start + p.duration).toBeLessThanOrEqual(
        p.graph === 'shell' ? 0.821 : 0.241,
      );
      expect(sydneyPartStateAt(p, route, 1).position).toEqual(p.finalPosition);
      if (p.graph === 'shell') {
        expect(p.start).toBeGreaterThanOrEqual(0.25);
        expect(Math.max(...p.dimensions)).toBeLessThanOrEqual(15);
      }
    }
  });
  it('hands the actual draw buffer from active to seated exactly once, including the boundary', () => {
    for (const kind of ['rib', 'sail'] as const) {
      const part = plan.parts.find((p) => p.kind === kind)!;
      const renderer = new SydneyStoneSystem(
        { ...plan, parts: [part] },
        {} as MaterialLibrary,
      );
      const active = renderer.group.getObjectByName(
        `sydney-${kind}-active`,
      ) as Mesh;
      const seated = renderer.group.getObjectByName(
        `sydney-parts-${kind}`,
      ) as Mesh;
      renderer.update(1);
      const vertices = seated.geometry.drawRange.count;
      for (const u of [0.899999, 0.9, 0.900001, 0.95, 0.999999, 1]) {
        renderer.update(part.start + part.duration * u);
        expect(
          active.geometry.drawRange.count + seated.geometry.drawRange.count,
        ).toBe(vertices);
      }
      renderer.dispose();
    }
  });
  it('casts podium units in place and does not transport structural concrete masses', () => {
    for (const p of plan.parts.filter((p) => p.graph === 'podium')) {
      expect(sydneyPartStateAt(p, route, p.start - 1e-7).visible).toBe(false);
      for (const u of [0, 0.3, 0.8, 1]) {
        const state = sydneyPartStateAt(p, route, p.start + p.duration * u);
        expect(state.position).toEqual(p.finalPosition);
        expect(state.mechanism).toBe('none');
      }
    }
  });
  it('keeps full hauled bottom extents on ground plus trolley height throughout the route', () => {
    for (const p of shell) {
      const stage = sydneyStagingPose(p);
      expect(stage[2]).toBeGreaterThanOrEqual(100);
      expect(stage[1] - p.dimensions[1] / 2).toBeCloseTo(
        sydneyTerrainHeightAt(stage[0], stage[2]) + SYDNEY_TROLLEY_BED,
        6,
      );
      for (const u of [0.15, 0.2, 0.3, 0.4, 0.47]) {
        const s = sydneyPartStateAt(p, route, p.start + p.duration * u);
        expect(s.phase).toBe('hauled');
        expect(s.position[1] - p.dimensions[1] / 2 - s.trolleyLift).toBeCloseTo(
          sydneyTerrainHeightAt(s.position[0], s.position[2]),
          6,
        );
        expect(s.rotation).toEqual([0, 0, 0]);
      }
    }
  });
  it('has continuous positions and orientations across every transport phase boundary', () => {
    for (const p of shell)
      for (const u of [0.14, 0.48, 0.58, 0.9]) {
        const t = p.start + p.duration * u;
        const a = sydneyPartStateAt(p, route, t - 1e-10),
          b = sydneyPartStateAt(p, route, t + 1e-10);
        expect(distance(a.position, b.position)).toBeLessThan(0.001);
        expect(a.rotation).toEqual(b.rotation);
      }
  });
  it('clears the complete house during slew and preserves the rigid crane jib length', () => {
    const highest = Math.max(
      ...shell.map((p) => p.finalPosition[1] + p.dimensions[1] / 2),
    );
    for (const p of shell)
      for (const hoistLocal of [0.01, 0.31, 0.5, 0.71, 0.99]) {
        const t = p.start + p.duration * (0.58 + 0.32 * hoistLocal);
        const s = sydneyPartStateAt(p, route, t);
        const rig = sydneyCraneRigAt(p, s)!;
        expect(rig).not.toBeNull();
        expect(distance(rig.mastTop, rig.jibTip)).toBeCloseTo(
          SYDNEY_CRANE_JIB_LENGTH,
          5,
        );
        expect(rig.mastTop[1] - rig.base[1]).toBe(SYDNEY_CRANE_MAST_HEIGHT);
        expect(rig.jibTip[1]).toBeGreaterThan(rig.hook[1]);
        expect(rig.hook[1] - s.position[1] - p.dimensions[1] / 2).toBeCloseTo(
          1.2,
          6,
        );
        expect(rig.jibTip[0]).toBeCloseTo(rig.hook[0], 6);
        expect(rig.jibTip[2]).toBeCloseTo(rig.hook[2], 6);
        expect(
          sydneyPlantAt(t).some(
            (plant) => plant.id === `tower-crane-${p.crane}`,
          ),
        ).toBe(true);
        if (hoistLocal > 0.3 && hoistLocal < 0.72)
          expect(s.position[1] - p.dimensions[1] / 2).toBeGreaterThan(
            highest + 3.9,
          );
      }
  });
  it('matches actual surface vertices to the transported support plane and seats dependencies first', () => {
    const byId = new Map(plan.parts.map((p) => [p.id, p]));
    for (const part of shell) {
      const vertices = sydneyPartVertices(part);
      let minY = Infinity,
        maxY = -Infinity;
      for (let i = 1; i < vertices.length; i += 3) {
        minY = Math.min(minY, vertices[i]!);
        maxY = Math.max(maxY, vertices[i]!);
      }
      expect((minY + maxY) / 2).toBeCloseTo(part.finalPosition[1], 6);
      const staged = sydneyStagingPose(part);
      expect(minY - part.finalPosition[1] + staged[1]).toBeCloseTo(
        sydneyTerrainHeightAt(staged[0], staged[2]) + SYDNEY_TROLLEY_BED,
        5,
      );
      for (const dependency of part.dependsOn ?? []) {
        const prior = byId.get(dependency)!;
        const arrival = part.start + part.duration * 0.58;
        expect(sydneyPartStateAt(prior, route, arrival).phase).toBe('seated');
      }
    }
  });
  it('completes each lower group before the overlying group ribs arrive', () => {
    for (const [lower, upper] of SYDNEY_SHELL_PRECEDENCE) {
      const lowerParts = shell.filter((p) => p.sail === lower);
      const upperParts = shell.filter((p) => p.sail === upper);
      expect(
        Math.max(...lowerParts.map((p) => p.start + p.duration * 0.9)),
      ).toBeLessThan(Math.min(...upperParts.map((p) => p.start)));
    }
  });
  it('keeps actual load vertices clear of already seated neighbouring ribs and lids during descent', () => {
    const material = new MeshBasicMaterial({ side: DoubleSide });
    const roofs = shell.map((part) => {
      const geometry = new BufferGeometry();
      geometry.setAttribute(
        'position',
        new Float32BufferAttribute(sydneyPartVertices(part), 3),
      );
      geometry.computeBoundingBox();
      const mesh = new Mesh(geometry, material);
      mesh.updateMatrixWorld();
      return { mesh, part };
    });
    const ray = new Raycaster(new Vector3(), new Vector3(0, -1, 0));
    const collisions: Array<{
      part: string;
      prior: string;
      penetration: number;
    }> = [];
    // Raycast production triangles, including depth and ribs. Only geometry
    // already seated at descent start can obstruct this load; an unbuilt future
    // upper shell is not a collision. Reverse-clock state remains pure.
    for (const part of shell) {
      const allVertices = sydneyPartVertices(part);
      // Nonindexed triangles repeat shared vertices; testing each distinct
      // world point once preserves coverage while keeping the full audit fast.
      const distinct = new Map<string, number[]>();
      for (let i = 0; i < allVertices.length; i += 3) {
        const point = allVertices.slice(i, i + 3);
        distinct.set(point.join(','), point);
      }
      const vertices = [...distinct.values()].flat();
      const descentStart = part.start + part.duration * (0.58 + 0.32 * 0.72);
      const waypoint = part.seatApproach
        ? sydneyPartStateAt(
            part,
            route,
            part.start + part.duration * (0.58 + 0.32 * 0.9),
          ).position
        : part.finalPosition;
      const translation = waypoint.map(
        (p, i) => p - part.finalPosition[i]!,
      ) as [number, number, number];
      const insertLength = Math.hypot(...translation);
      for (const { mesh: roof, part: prior } of roofs) {
        if (
          prior.id === part.id ||
          prior.start + prior.duration * 0.9 > descentStart
        )
          continue;
        if (
          prior.sail === part.sail &&
          !part.authoredVertices &&
          !prior.authoredVertices
        )
          continue;
        for (let i = 0; i < vertices.length; i += 3) {
          const point = new Vector3(
            vertices[i]!,
            vertices[i + 1]!,
            vertices[i + 2]!,
          );
          const approach = point.clone().add(new Vector3(...translation));
          const paths = [
            {
              origin: new Vector3(approach.x, 120, approach.z),
              direction: new Vector3(0, -1, 0),
              length: 120 - approach.y - 0.25,
              phase: 'lower',
            },
          ];
          if (insertLength > 0.001)
            paths.push({
              origin: approach,
              direction: new Vector3(...translation).multiplyScalar(
                -1 / insertLength,
              ),
              length: insertLength - 0.25,
              phase: 'insert',
            });
          let collided = false;
          for (const path of paths) {
            ray.set(path.origin, path.direction);
            ray.far = path.length;
            if (!ray.ray.intersectsBox(roof.geometry.boundingBox!)) continue;
            const hit = ray.intersectObject(roof, false)[0];
            if (hit) {
              collisions.push({
                part: part.id,
                prior: prior.id,
                penetration: path.length + 0.25 - hit.distance,
              });
              collided = true;
              break;
            }
          }
          if (collided) break;
        }
      }
    }

    for (const roof of roofs) roof.mesh.geometry.dispose();
    material.dispose();
    expect(
      collisions.length,
      JSON.stringify(collisions.slice(0, 12), null, 2),
    ).toBe(0);
  });
  it('supports each authored shell single pedestal on actual seated podium triangles', () => {
    for (const sail of SYDNEY_SAILS)
      for (const side of [-1, 1] as const)
        for (let i = 0; i <= 32; i++) {
          const point = sydneyShellPoint(sail, 0, i / 32, side);
          expect(point[1]).toBeCloseTo(SYDNEY_PODIUM_DECK, 4);
          expect(
            sydneyPodiumHeightAt(point[0], point[2]),
            `shell ${sail.id} bearing ${point}`,
          ).toBeCloseTo(point[1], 3);
        }
  });
  it('gives each crane a substantial unscaled hero rib and tile operation', () => {
    const area = (p: (typeof shell)[number]) => {
      const axes = [...p.dimensions].sort((a, b) => b - a);
      return axes[0]! * axes[1]!;
    };
    for (const crane of [0, 1])
      for (const kind of ['rib', 'sail'] as const) {
        const lane = shell.filter((p) => p.crane === crane && p.kind === kind);
        const heroes = lane.filter((p) => p.duration > 0.03);
        expect(heroes).toHaveLength(1);
        const hero = heroes[0]!;
        expect(hero.duration).toBe(kind === 'rib' ? 0.07 : 0.05);
        expect(area(hero)).toBeGreaterThan(5);
        expect(hero.scale).toEqual([1, 1, 1]);
        expect(hero.duration * 0.32 * 60).toBeGreaterThanOrEqual(0.95);
      }
  });
  it('never double-books crane hoist intervals or exceeds active slots', () => {
    for (const crane of [0, 1]) {
      const jobs = shell
        .filter((p) => p.crane === crane)
        .map((p) => [p.start + p.duration * 0.58, p.start + p.duration * 0.9])
        .sort((a, b) => a[0]! - b[0]!);
      for (let i = 1; i < jobs.length; i++)
        expect(jobs[i]![0]).toBeGreaterThanOrEqual(jobs[i - 1]![1]! - 1e-10);
    }
    const events = plan.parts.flatMap((p) => [
      p.start + 1e-9,
      p.start + p.duration * 0.5,
    ]);
    for (const t of events)
      expect(activeSydneyOperationsAt(plan, t).length).toBeLessThanOrEqual(
        SYDNEY_MAX_ACTIVE,
      );
  });
  it('roots falsework on completed podium and retains it until shell completion', () => {
    expect(sydneyFalseworkAt(0.22)).toHaveLength(0);
    const held = sydneyFalseworkAt(0.5);
    expect(held.length).toBeGreaterThan(0);
    for (const bay of held) {
      expect(bay.footY).toBeCloseTo(SYDNEY_PODIUM_DECK, 6);
      expect(bay.height).toBe(bay.segmentCount * bay.segmentLength);
      expect(bay.deckY + bay.capHeight + 0.38).toBeCloseTo(bay.supportY, 5);
    }
    expect(sydneyFalseworkAt(0.82)).toEqual(held);
    expect(sydneyFalseworkAt(0.91)).toHaveLength(0);
    expect(sydneyPlantAt(0.92).some((p) => p.kind === 'tower-crane')).toBe(
      false,
    );
    expect(sydneyLabourAt([], 1).crews).toHaveLength(0);
    for (const base of SYDNEY_CRANE_BASES)
      expect(base[1]).toBeCloseTo(
        sydneyPodiumHeightAt(base[0], base[2]) ??
          sydneyTerrainHeightAt(base[0], base[2]),
        4,
      );
  });
});
