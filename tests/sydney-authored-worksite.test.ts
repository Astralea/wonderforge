import { afterAll, describe, expect, it } from 'vitest';
import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Raycaster,
  Vector3,
} from 'three';
import {
  SYDNEY_CONSTRUCTION,
  SYDNEY_CRANE_BASES,
  SYDNEY_TROLLEY_BED,
} from '../src/data/sydneyConstruction';
import {
  SYDNEY_SAILS,
  SYDNEY_PODIUM_MESHES,
  sydneyPatchVertices,
} from '../src/data/sydneyShells';
import {
  activeSydneyOperationsAt,
  sydneyCraneStateAt,
  sydneyFalseworkAt,
  sydneyRoofUndersideAt,
  sydneyPartStateAt,
  SYDNEY_CRANE_JIB_LENGTH,
} from '../src/engine/sydneyConstruction';
import { sydneyLabourAt } from '../src/engine/sydneyCrew';
import { sydneyPlantAt } from '../src/engine/sydneyPlant';
import { sydneyTerrainHeightAt } from '../src/engine/sydneyTerrain';
import { SydneyWorkSystem } from '../src/render/three/SydneyWorkSystem';
import { createMaterialLibrary } from '../src/render/three/MaterialLibrary';
import type { Wonder } from '../src/data/types';
import type { SydneyPart } from '../src/data/sydneyTypes';

const surfaceMaterial = new MeshBasicMaterial({ side: DoubleSide });
function mesh(vertices: number[]): Mesh {
  const geometry = new BufferGeometry().setAttribute(
    'position',
    new Float32BufferAttribute(vertices, 3),
  );
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return new Mesh(geometry, surfaceMaterial);
}
const partVertices = (part: SydneyPart): number[] =>
  part.authoredVertices ??
  sydneyPatchVertices(SYDNEY_SAILS[part.sail]!, part.surface!);
const roofs = SYDNEY_CONSTRUCTION.parts
  .filter((p) => p.graph === 'shell')
  .map((p) => mesh(partVertices(p)));

const podium = SYDNEY_PODIUM_MESHES.map((p) => mesh(p.vertices));
const ray = new Raycaster();
function hit(
  x: number,
  z: number,
  originY: number,
  objects: Mesh[],
  upward: boolean,
): number | undefined {
  ray.set(new Vector3(x, originY, z), new Vector3(0, upward ? 1 : -1, 0));
  return ray.intersectObjects(objects, false)[0]?.point.y;
}
afterAll(() => {
  for (const m of [...roofs, ...podium]) m.geometry.dispose();
  surfaceMaterial.dispose();
});

describe('Authored Sydney worksite physical contracts', () => {
  it('roots complete scaffold footprints on actual flat podium triangles and leaves crew headroom below the real roof', () => {
    const bays = sydneyFalseworkAt(0.58);
    expect(new Set(bays.map((b) => b.group))).toContain('concert');
    expect(new Set(bays.map((b) => b.group))).toContain('opera');
    for (const bay of bays) {
      for (const dx of [-2.1, 2.1])
        for (const dz of [-1.4, 1.4]) {
          const x =
              bay.position[0] + dx * Math.cos(bay.yaw) + dz * Math.sin(bay.yaw),
            z =
              bay.position[2] - dx * Math.sin(bay.yaw) + dz * Math.cos(bay.yaw);
          expect(
            hit(x, z, 100, podium, false),
            `station${bay.station} foot`,
          ).toBeCloseTo(bay.footY, 3);
          const roof = hit(x, z, bay.footY + 0.1, roofs, true);
          if (roof !== undefined)
            expect(bay.deckY + 0.38 + 2.2).toBeLessThan(roof);
        }
      let closestHead = Infinity;
      for (let k = -1; k < 6; k++) {
        const angle = (k * Math.PI) / 3 + bay.yaw,
          radius = k < 0 ? 0 : 0.2;
        const roof = hit(
          bay.position[0] + Math.sin(angle) * radius,
          bay.position[2] + Math.cos(angle) * radius,
          bay.footY + 0.1,
          roofs,
          true,
        );
        if (roof !== undefined) closestHead = Math.min(closestHead, roof);
      }
      expect(bay.deckY + 0.38 + bay.capHeight).toBeCloseTo(closestHead, 3);
    }
  });

  it('keeps original hero identities, rigid sizes and continuous grounded trolley support throughout the new forecourt routes', () => {
    const heroes = [
      'rib-0--1-4-4',
      'rib-3--1-4-4',
      'tile-0--1-7-0',
      'tile-3--1-5-4',
    ];
    expect(
      SYDNEY_CONSTRUCTION.parts
        .filter((p) => p.duration > 0.03 && p.graph === 'shell')
        .map((p) => p.id)
        .sort(),
    ).toEqual(heroes.sort());
    for (const part of SYDNEY_CONSTRUCTION.parts.filter(
      (p) => p.graph === 'shell',
    )) {
      for (const phase of [0, 0.14, 0.2, 0.35, 0.48, 0.57]) {
        const state = sydneyPartStateAt(
          part,
          SYDNEY_CONSTRUCTION.routes[0]!,
          part.start + part.duration * phase,
        );
        expect(state.scale).toEqual([1, 1, 1]);
        const [x, y, z] = state.position;
        expect(y - part.dimensions[1] / 2).toBeCloseTo(
          sydneyTerrainHeightAt(x, z) + SYDNEY_TROLLEY_BED,
          6,
        );
        for (const dx of [
          -part.dimensions[0] / 2 - 1,
          0,
          part.dimensions[0] / 2 + 1,
        ])
          for (const dz of [
            -part.dimensions[2] / 2 - 1,
            0,
            part.dimensions[2] / 2 + 1,
          ]) {
            const ground = sydneyTerrainHeightAt(x + dx, z + dz);
            expect(ground, `${part.id} route footprint`).toBeGreaterThan(1);
            const top = hit(x + dx, z + dz, 100, podium, false);
            expect(
              top ?? ground,
              `${part.id} podium exclusion`,
            ).toBeLessThanOrEqual(ground + 0.1);
          }
      }
      for (const phase of [0.14, 0.48, 0.58, 0.9]) {
        const t = part.start + part.duration * phase;
        const a = sydneyPartStateAt(
            part,
            SYDNEY_CONSTRUCTION.routes[0]!,
            t - 1e-10,
          ),
          b = sydneyPartStateAt(
            part,
            SYDNEY_CONSTRUCTION.routes[0]!,
            t + 1e-10,
          );
        expect(
          new Vector3(...a.position).distanceTo(new Vector3(...b.position)),
        ).toBeLessThan(0.001);
      }
    }
  });

  it('lowers authored infill beside the seated roof then inserts rigidly, with continuous hook motion at every handoff', () => {
    const infills = SYDNEY_CONSTRUCTION.parts.filter(
      (p) => p.authoredVertices && p.graph === 'shell',
    );
    expect(infills.length).toBeGreaterThan(0);
    for (const part of infills) {
      expect(part.seatApproach).toBeDefined();
      const sample = (u: number) =>
        sydneyPartStateAt(
          part,
          SYDNEY_CONSTRUCTION.routes[0]!,
          part.start + part.duration * (0.58 + 0.32 * u),
        );
      const outside = sample(0.9),
        midway = sample(0.95);
      expect(outside.position[1]).toBeCloseTo(part.finalPosition[1], 6);
      expect(midway.position[1]).toBeCloseTo(part.finalPosition[1], 6);
      expect(outside.position[0] - part.finalPosition[0]).toBeCloseTo(
        part.seatApproach![0],
        6,
      );
      expect(outside.position[2] - part.finalPosition[2]).toBeCloseTo(
        part.seatApproach![2],
        6,
      );
      expect(midway.scale).toEqual([1, 1, 1]);
      for (const u of [0.3, 0.72, 0.9, 1]) {
        const a = sample(u - 1e-8),
          b = sample(u + 1e-8);
        expect(
          new Vector3(...a.position).distanceTo(new Vector3(...b.position)),
        ).toBeLessThan(0.0001);
      }
      for (const u of [0.1, 0.72, 0.85, 0.95]) {
        const state = sample(u),
          rig = sydneyCraneStateAt(
            part.crane,
            part.start + part.duration * (0.58 + 0.32 * u),
          );
        const vertices = partVertices(part);
        let top = 0;
        for (let i = 3; i < vertices.length; i += 3)
          if (vertices[i + 1]! > vertices[top + 1]!) top = i;
        const loadTop = new Vector3(
          vertices[top]!,
          vertices[top + 1]! + 1.2,
          vertices[top + 2]!,
        )
          .sub(new Vector3(...part.finalPosition))
          .add(new Vector3(...state.position));
        expect(new Vector3(...rig.hook).distanceTo(loadTop)).toBeLessThan(
          0.0001,
        );
        expect(
          new Vector3(...rig.jibTip).distanceTo(new Vector3(...rig.mastTop)),
        ).toBeCloseTo(SYDNEY_CRANE_JIB_LENGTH, 5);
        expect(rig.jibTip[1]).toBeGreaterThan(rig.hook[1]);
      }
    }
  });

  it('seats crane bases on the actual forecourt or completed podium and every hook within a rigid jib with positive cable length', () => {
    for (const base of SYDNEY_CRANE_BASES)
      for (const dx of [-1.6, 1.6])
        for (const dz of [-1.6, 1.6]) {
          const ground = sydneyTerrainHeightAt(base[0] + dx, base[2] + dz);
          const podiumTop = hit(base[0] + dx, base[2] + dz, 100, podium, false);
          expect(podiumTop ?? ground).toBeCloseTo(base[1], 4);
          expect(
            hit(base[0] + dx, base[2] + dz, base[1] + 0.1, roofs, true),
            'a supported mast must also clear every authored shell above it',
          ).toBeUndefined();
          expect(
            hit(base[0] + dx, base[2] + dz, 100, podium, false) ?? ground,
          ).toBeLessThanOrEqual(base[1] + 0.1);
        }
    for (const crane of [0, 1] as const)
      for (let i = 0; i <= 900; i++) {
        const rig = sydneyCraneStateAt(crane, 0.24 + (i / 900) * 0.65);
        expect(
          new Vector3(...rig.jibTip).distanceTo(new Vector3(...rig.mastTop)),
        ).toBeCloseTo(SYDNEY_CRANE_JIB_LENGTH, 5);
        expect(rig.jibTip[1] - rig.hook[1]).toBeGreaterThan(0);
      }
  });

  it('places real curved-load vertices on the rendered bearing deck instead of between two trestles', () => {
    const library = createMaterialLibrary({
      palette: { primary: '#fff', accent: '#fff', ground: '#aaa' },
    } as Wonder);
    const work = new SydneyWorkSystem(library, SYDNEY_CONSTRUCTION);
    try {
      for (const part of SYDNEY_CONSTRUCTION.parts.filter(
        (p) => p.graph === 'shell' && p.duration > 0.03,
      )) {
        for (const phase of [0.05, 0.52]) {
          const t = part.start + part.duration * phase;
          const state = sydneyPartStateAt(
            part,
            SYDNEY_CONSTRUCTION.routes[0]!,
            t,
          );
          work.update([{ part, state }], t);
          const deck = (work as unknown as { plantDark: InstancedMesh })
            .plantDark;
          deck.computeBoundingSphere();
          const vertices = partVertices(part);
          let bottom = 0;
          for (let i = 3; i < vertices.length; i += 3)
            if (vertices[i + 1]! < vertices[bottom + 1]!) bottom = i;
          const p = new Vector3(
            vertices[bottom]!,
            vertices[bottom + 1]!,
            vertices[bottom + 2]!,
          )
            .sub(new Vector3(...part.finalPosition))
            .add(new Vector3(...state.position));
          ray.set(
            p.clone().add(new Vector3(0, 0.02, 0)),
            new Vector3(0, -1, 0),
          );
          const contact = ray.intersectObject(deck, false)[0];
          expect(contact?.point.y).toBeCloseTo(p.y, 4);
        }
      }
    } finally {
      work.dispose();
      for (const m of library.all) m.dispose();
    }
  });

  it('checks the actual transformed plant and scaffold geometry against ground and roof surfaces', () => {
    const library = createMaterialLibrary({
      palette: { primary: '#fff', accent: '#fff', ground: '#aaa' },
    } as Wonder);
    const work = new SydneyWorkSystem(library, SYDNEY_CONSTRUCTION);
    try {
      for (const t of [0.08, 0.12, 0.18, 0.22, 0.58]) {
        work.update([], t);
        const names =
          t < 0.24
            ? ['plantYellow', 'plantDark', 'plantCyls']
            : ['falseworkPoles', 'falseworkDecks'];
        let worstGround = 0,
          worstRoof = 0,
          contacts = 0;
        for (const name of names) {
          const m = (work as unknown as Record<string, InstancedMesh>)[name]!;
          const vertices = m.geometry.getAttribute('position');
          for (let i = 0; i < m.count; i++) {
            const matrix = new Matrix4();
            m.getMatrixAt(i, matrix);
            for (let j = 0; j < vertices.count; j++) {
              const p = new Vector3()
                .fromBufferAttribute(vertices, j)
                .applyMatrix4(matrix);
              const ground = sydneyTerrainHeightAt(p.x, p.z);
              worstGround = Math.max(worstGround, ground - p.y);
              if (Math.abs(p.y - ground) < 0.00001) contacts++;
              if (t > 0.24) {
                const roof = sydneyRoofUndersideAt(p.x, p.z);
                if (roof !== undefined)
                  worstRoof = Math.max(worstRoof, p.y - roof);
              }
            }
          }
        }
        expect(worstGround).toBeLessThan(0.00001);
        expect(worstRoof).toBeLessThan(0.0001);
        if (t < 0.24) expect(contacts).toBeGreaterThan(0);
      }
    } finally {
      work.dispose();
      for (const m of library.all) m.dispose();
    }
  });

  it('keeps persistent ground crews and plant on land and out of authored walls, with figures and scaffold feet at rendered support heights', () => {
    const library = createMaterialLibrary({
      palette: { primary: '#fff', accent: '#fff', ground: '#aaa' },
    } as Wonder);
    const work = new SydneyWorkSystem(library, SYDNEY_CONSTRUCTION);
    try {
      for (const t of [0.12, 0.24, 0.32, 0.58, 0.78]) {
        const operations = activeSydneyOperationsAt(SYDNEY_CONSTRUCTION, t),
          labour = sydneyLabourAt(operations, t);
        const persistent = labour.crews.filter((c) => c.id.startsWith('yard-'));
        expect(persistent).toHaveLength(12);
        for (const crew of persistent) {
          const [x, y, z] = crew.position;
          expect(y).toBeCloseTo(sydneyTerrainHeightAt(x, z), 6);
          expect(hit(x, z, 100, podium, false) ?? y).toBeLessThanOrEqual(
            y + 0.1,
          );
        }
        for (const plant of sydneyPlantAt(t).filter(
          (p) => p.kind !== 'tower-crane',
        )) {
          const [x, y, z] = plant.position;
          expect(y).toBeCloseTo(sydneyTerrainHeightAt(x, z), 6);
          expect(hit(x, z, 100, podium, false) ?? y).toBeLessThanOrEqual(
            y + 0.1,
          );
        }
        work.update(operations, t);
        const legs = work.group.getObjectByName(
          'sydney-worker-legs',
        ) as InstancedMesh;
        expect(legs.count).toBe(labour.crews.length * 2);
        for (let i = 0; i < labour.crews.length; i++) {
          const matrix = new Matrix4();
          legs.getMatrixAt(i * 2, matrix);
          legs.geometry.computeBoundingBox();
          expect(
            legs.geometry.boundingBox!.clone().applyMatrix4(matrix).min.y,
          ).toBeCloseTo(labour.crews[i]!.position[1], 4);
        }
        for (const object of work.group.children)
          if (object instanceof InstancedMesh)
            expect(object.frustumCulled).toBe(false);
      }
    } finally {
      work.dispose();
      for (const m of library.all) m.dispose();
    }
  });
});
