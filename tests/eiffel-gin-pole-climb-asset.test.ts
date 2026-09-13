import { readFileSync } from 'node:fs';
import {
  Box3,
  DoubleSide,
  Mesh,
  Object3D,
  Raycaster,
  Vector3,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import manifest from '../artifacts/eiffel-gin-pole-climb-2026-09-08/model/rig-manifest.json';
import kitManifest from '../public/models/eiffel-construction-kit/tower-kit.manifest.json';
import {
  eiffelSummitGinPoleRoleTransforms,
  sampleEiffelSummitGinPoleClimb,
} from '../src/engine/eiffelSummitGinPoleClimb';
import {
  eiffelConvexPenetration,
  eiffelConvexSolid,
} from '../src/engine/eiffelConvex';
import type { RigidVec3 } from '../src/engine/eiffelRigid';

const folder = 'artifacts/eiffel-gin-pole-climb-2026-09-08/';
let rig: Object3D;
let tower: Object3D;
const role = (root: Object3D, id: string) => {
  let result: Object3D | undefined;
  root.traverse((object) => {
    if (object.userData.wf_role === id) result = object;
  });
  if (!result) throw new Error(`Missing actual role ${id}`);
  return result;
};
const meshes = (root: Object3D) => {
  const result: Mesh[] = [];
  root.traverse((object) => {
    if (object instanceof Mesh) result.push(object);
  });
  return result;
};
const ownedMeshes = (root: Object3D, roleId: string) =>
  meshes(root).filter((mesh) => {
    let cursor: Object3D | null = mesh;
    while (cursor && !cursor.userData.wf_role) cursor = cursor.parent;
    return cursor?.userData.wf_role === roleId;
  });
const ownedRole = (mesh: Mesh) => {
  let cursor: Object3D | null = mesh;
  while (cursor && !cursor.userData.wf_role) cursor = cursor.parent;
  return String(cursor?.userData.wf_role ?? '');
};
const solid = (mesh: Mesh) => {
  const attribute = mesh.geometry.attributes.position!;
  const vertices: RigidVec3[] = [];
  for (let index = 0; index < attribute.count; index++) {
    const point = new Vector3().fromBufferAttribute(attribute, index).applyMatrix4(mesh.matrixWorld);
    vertices.push([point.x, point.y, point.z]);
  }
  const source = mesh.geometry.index;
  const faces: number[][] = [];
  for (let index = 0; index < (source?.count ?? attribute.count); index += 3) {
    const face = [0, 1, 2].map((offset) => source?.getX(index + offset) ?? index + offset);
    const [a, b, c] = face.map((item) => new Vector3(...vertices[item]!));
    if (b.sub(a).cross(c.sub(a)).lengthSq() > 1e-20) faces.push(face);
  }
  return eiffelConvexSolid(vertices, faces);
};
const parse = async (path: string) => {
  const bytes = readFileSync(path);
  const scene = (
    await new GLTFLoader().parseAsync(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      '',
    )
  ).scene;
  scene.updateMatrixWorld(true);
  for (const mesh of meshes(scene))
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material])
      material.side = DoubleSide;
  return scene;
};
const dispose = (root: Object3D) =>
  root.traverse((object) => {
    if (object instanceof Mesh) object.geometry.dispose();
  });

beforeAll(async () => {
  [rig, tower] = await Promise.all([
    parse(`${folder}model/summit-gin-pole-climb.glb`),
    parse('public/models/eiffel-construction-kit/tower-kit.glb'),
  ]);
}, 30_000);
afterAll(() => {
  dispose(rig);
  dispose(tower);
});

function applySample(seconds: number) {
  const sample = sampleEiffelSummitGinPoleClimb(seconds);
  for (const transform of eiffelSummitGinPoleRoleTransforms(sample)) {
    const object = role(rig, transform.role);
    if (transform.position) object.position.set(...transform.position);
    if (transform.quaternion) object.quaternion.set(...transform.quaternion);
  }
  rig.updateMatrixWorld(true);
  return sample;
}

describe('actual Blender summit gin-pole climb candidate', () => {
  it('exports the exact role hierarchy and applies motion only to authored moving roots', () => {
    expect(manifest.objects).toBeGreaterThanOrEqual(300);
    expect(manifest.meshes).toBeGreaterThanOrEqual(270);
    expect(Object.keys(manifest.roles)).toHaveLength(36);
    for (const id of Object.keys(manifest.roles)) expect(role(rig, id)).toBeDefined();
    const fixedBefore = [0, 1, 2, 3].map((index) =>
      role(rig, `guide-${index}-fixed`).position.clone(),
    );
    const start = applySample(0);
    expect(role(rig, 'moving-pole').position.toArray()).toEqual([...start.polePose.position]);
    const end = applySample(70);
    expect(role(rig, 'moving-pole').position.toArray()).toEqual([...end.polePose.position]);
    for (let index = 0; index < 4; index++)
      expect(role(rig, `guide-${index}-fixed`).position).toEqual(fixedBefore[index]);
    expect(role(rig, 'gin-pole-system').position.toArray()).toEqual([0, 0, 0]);
    const pitch = role(rig, 'jib-pitch').quaternion;
    expect(2 * Math.acos(Math.abs(pitch.w))).toBeCloseTo((78 * Math.PI) / 180, 10);
  });

  it('sweeps every actual half-guide clear of the complete moving pole assembly', () => {
    const failures: { guide: number; degrees: number; leaf: string; pole: string; depth: number }[] = [];
    const poleRoot = role(rig, 'moving-pole');
    const cases = [
      { guide: 0, bottomY: 300.9 },
      { guide: 1, bottomY: 302 },
      { guide: 2, bottomY: 300.9 },
      { guide: 2, bottomY: 305.566667 },
      { guide: 3, bottomY: 301.3 },
    ];
    for (const item of cases) {
      poleRoot.position.set(-0.9, item.bottomY, 0);
      for (let quarterDegree = 0; quarterDegree <= 360; quarterDegree++) {
        const degrees = quarterDegree / 4;
        for (const [side, sign] of [
          ['north', 1],
          ['south', -1],
        ] as const)
          role(rig, `guide-${item.guide}-${side}-leaf`).quaternion.setFromAxisAngle(
            new Vector3(0, 1, 0),
            (sign * degrees * Math.PI) / 180,
          );
        rig.updateMatrixWorld(true);
        const leafMeshes = ['north', 'south'].flatMap((side) =>
          ownedMeshes(rig, `guide-${item.guide}-${side}-leaf`),
        );
        const poleMeshes = ownedMeshes(rig, 'moving-pole');
        for (const leaf of leafMeshes) {
          const leafBox = new Box3().setFromObject(leaf);
          for (const pole of poleMeshes) {
            if (!leafBox.intersectsBox(new Box3().setFromObject(pole))) continue;
            const depth = eiffelConvexPenetration(solid(leaf), solid(pole));
            if (depth > 1e-6)
              failures.push({ guide: item.guide, degrees, leaf: leaf.name, pole: pole.name, depth });
          }
        }
      }
    }
    expect(failures.slice(0, 20)).toEqual([]);
  }, 30_000);

  it('keeps each actual axial pin inside its drilled pole bore only when locked', () => {
    const failures: string[] = [];
    const pole = ownedMeshes(rig, 'moving-pole').find((mesh) =>
      mesh.name.startsWith('timber-six-metre-pole'),
    )!;
    expect(pole.userData.wf_axial_bore_local_y).toBe(1.4);
    for (const [seconds, guideIndex] of [
      [0, 1],
      [63, 3],
    ] as const) {
      const sample = applySample(seconds);
      const center = new Vector3(-0.9, sample.poleBottomY + 1.4, 0);
      const ray = new Raycaster(center.clone().add(new Vector3(0, 0, -0.2)), new Vector3(0, 0, 1));
      if (ray.intersectObject(pole, false).some((hit) => Math.abs(hit.point.z) < 0.0105))
        failures.push(`pole bore blocked at ${seconds}s`);
      const pinRoot = role(rig, `guide-${guideIndex}-axial-pin`);
      const pin = ownedMeshes(rig, `guide-${guideIndex}-axial-pin`).find((mesh) =>
        mesh.name.startsWith('pole-axial-lock-pin'),
      )!;
      const box = new Box3().setFromObject(pin);
      expect(box.min.z).toBeLessThan(-0.135);
      expect(box.max.z).toBeGreaterThan(0.145);
      expect(box.getSize(new Vector3()).x).toBeCloseTo(0.02, 4);
      expect(pinRoot.position.z).toBeCloseTo(0, 6);
    }
    applySample(30);
    for (const index of [1, 3])
      expect(role(rig, `guide-${index}-axial-pin`).position.z).toBeCloseTo(0.24, 6);
    expect(failures).toEqual([]);
  });

  it('seats actual drive shoes and ladder feet on named tower triangles', () => {
    applySample(0);
    const stages = new Map(kitManifest.parts.map((part) => [part.id, part.stage]));
    const surfaces = meshes(tower).filter((mesh) => (stages.get(String(mesh.userData.wf_part)) ?? 99) <= 63);
    const contacts = [
      ...meshes(rig).filter((mesh) => mesh.name.startsWith('drive-crossbar-bearing-shoe')),
      ...meshes(rig).filter((mesh) => mesh.name.startsWith('ladder-floor-shoe')),
    ];
    expect(contacts).toHaveLength(4);
    const failures: string[] = [];
    for (const contact of contacts) {
      const position = contact.geometry.attributes.position!;
      const points: Vector3[] = [];
      for (let index = 0; index < position.count; index++) {
        const point = new Vector3().fromBufferAttribute(position, index).applyMatrix4(contact.matrixWorld);
        if (!points.some((other) => other.distanceToSquared(point) < 1e-12)) points.push(point);
      }
      const bottom = Math.min(...points.map((point) => point.y));
      for (const point of points.filter((point) => Math.abs(point.y - bottom) < 2e-5)) {
          const ray = new Raycaster(new Vector3(point.x, bottom + 0.05, point.z), new Vector3(0, -1, 0), 0, 0.1);
          const hit = ray.intersectObjects(surfaces, false).find((item) => item.point.y <= bottom + 2e-5);
          if (!hit || Math.abs(hit.point.y - bottom) > 2e-5)
            failures.push(`${contact.name}:${point.x},${point.z}:${bottom}:${hit?.point.y ?? 'miss'}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('exports real fairlead and drum axles through their paired bearing geometry', () => {
    applySample(0);
    for (const [id, axis] of [
      ['climb-west-fairlead', 'z'],
      ['climb-east-fairlead', 'x'],
      ['climb-east-upper-fairlead', 'z'],
    ] as const) {
      const axle = ownedMeshes(rig, id).find((mesh) => mesh.name.includes('axle'))!;
      const sheave = ownedMeshes(rig, id).find((mesh) => mesh.name.includes('sheave'))!;
      expect(axle).toBeDefined();
      expect(sheave).toBeDefined();
      const axleBox = new Box3().setFromObject(axle);
      const sheaveBox = new Box3().setFromObject(sheave);
      expect(axleBox.min[axis]).toBeLessThan(sheaveBox.min[axis]);
      expect(axleBox.max[axis]).toBeGreaterThan(sheaveBox.max[axis]);
      const axleCenter = axleBox.getCenter(new Vector3());
      const sheaveCenter = sheaveBox.getCenter(new Vector3());
      axleCenter[axis] = sheaveCenter[axis];
      expect(axleCenter.distanceTo(sheaveCenter)).toBeLessThan(2e-5);
    }
    const drum = role(rig, 'climb-winch-drum');
    expect(ownedMeshes(rig, 'climb-winch-drum').some((mesh) => mesh.name.includes('core'))).toBe(true);
    expect(drum.position.toArray()).toEqual(expect.arrayContaining([expect.closeTo(0.25, 5), expect.closeTo(306.91, 5)]));
  });

  it('keeps the complete moving vertical rope outside every actual guide leaf sweep', () => {
    const failures: { seconds: number; guide: number; degrees: number; mesh: string; depth: number }[] = [];
    const boxSolid = (min: RigidVec3, max: RigidVec3) => eiffelConvexSolid(
      [
        [min[0], min[1], min[2]], [max[0], min[1], min[2]],
        [max[0], max[1], min[2]], [min[0], max[1], min[2]],
        [min[0], min[1], max[2]], [max[0], min[1], max[2]],
        [max[0], max[1], max[2]], [min[0], max[1], max[2]],
      ],
      [[0,1,2,3],[4,7,6,5],[0,4,5,1],[1,5,6,2],[2,6,7,3],[3,7,4,0]],
    );
    for (const seconds of [0, 14, 27, 46, 60, 70]) {
      const sample = applySample(seconds);
      const lug = sample.drive.movingLug;
      const rope = boxSolid(
        [lug[0] - 0.006, lug[1], lug[2] - 0.006],
        [lug[0] + 0.006, sample.drive.fairlead[1], lug[2] + 0.006],
      );
      for (let guide = 0; guide < 4; guide++)
        for (let degrees = 0; degrees <= 90; degrees += 1) {
          for (const [side, sign] of [['north', 1], ['south', -1]] as const)
            role(rig, `guide-${guide}-${side}-leaf`).quaternion.setFromAxisAngle(
              new Vector3(0, 1, 0), sign * degrees * Math.PI / 180,
            );
          rig.updateMatrixWorld(true);
          for (const leaf of ['north', 'south'].flatMap((side) => ownedMeshes(rig, `guide-${guide}-${side}-leaf`))) {
            const depth = eiffelConvexPenetration(rope, solid(leaf));
            if (depth > 1e-6) failures.push({ seconds, guide, degrees, mesh: leaf.name, depth });
          }
        }
    }
    expect(failures.slice(0, 20)).toEqual([]);
  }, 30_000);

  it('moves only the timeline-active guides clear of every seated tower and fixed-rig solid', () => {
    const dynamicRoles = new Set<string>();
    for (let guide = 0; guide < 4; guide++)
      for (const side of ['north', 'south']) {
        dynamicRoles.add(`guide-${guide}-${side}-leaf`);
        dynamicRoles.add(`guide-${guide}-${side}-latch`);
      }
    dynamicRoles.add('guide-1-axial-pin');
    dynamicRoles.add('guide-3-axial-pin');
    const stages = new Map(kitManifest.parts.map((part) => [part.id, part.stage]));
    const future = new Set(['summit-crown-m072-c002', 'summit-crown-m076-c000']);
    const towerObstacles = meshes(tower).filter((mesh) => {
      const id = String(mesh.userData.wf_part);
      const box = new Box3().setFromObject(mesh);
      return !future.has(id) && (stages.get(id) ?? 99) <= 63 &&
        box.max.x >= -1.2 && box.min.x <= 0.2 && box.max.z >= -0.5 && box.min.z <= 0.5 &&
        box.max.y >= 300.8 && box.min.y <= 307.4 && box.max.z >= -0.8 && box.min.z <= 0.8;
    });
    const fixedRigObstacles = meshes(rig).filter((mesh) => {
      let cursor: Object3D | null = mesh;
      while (cursor && !cursor.userData.wf_role) cursor = cursor.parent;
      const id = String(cursor?.userData.wf_role ?? '');
      return !dynamicRoles.has(id) && !['moving-pole', 'jib-yaw', 'jib-pitch'].includes(id);
    });
    const obstacles = [
      ...towerObstacles.map((mesh) => ({ mesh, kind: 'tower' as const, id: String(mesh.userData.wf_part) })),
      ...fixedRigObstacles.map((mesh) => ({ mesh, kind: 'fixed-rig' as const, id: `${ownedRole(mesh)}/${mesh.name}` })),
    ].map((entry) => ({ ...entry, box: new Box3().setFromObject(entry.mesh), solid: solid(entry.mesh) }));
    const failures: { seconds: number; moving: string; obstacle: string; kind: string; depth: number }[] = [];
    for (let tenth = 50; tenth <= 630; tenth += 2) {
      const seconds = tenth / 10;
      const active = seconds < 9 ? [0] : seconds >= 14 && seconds < 20 ? [3] : seconds >= 27 && seconds < 32 ? [1] : [];
      const axial = seconds >= 5 && seconds < 7 ? [1] : seconds >= 60 && seconds <= 63 ? [3] : [];
      if (active.length === 0 && axial.length === 0) continue;
      const sample = applySample(seconds);
      const roles = new Set<string>();
      for (const guide of active)
        for (const side of ['north', 'south']) {
          roles.add(`guide-${guide}-${side}-leaf`);
          roles.add(`guide-${guide}-${side}-latch`);
        }
      for (const guide of active)
        if (guide === 1 || guide === 3) roles.add(`guide-${guide}-axial-pin`);
      for (const guide of axial) roles.add(`guide-${guide}-axial-pin`);
      const moving = meshes(rig).filter((mesh) => roles.has(ownedRole(mesh)));
      for (const part of moving) {
        const partBox = new Box3().setFromObject(part);
        const partSolid = solid(part);
        for (const obstacle of obstacles) {
          if (!partBox.intersectsBox(obstacle.box)) continue;
          const partOwner = ownedRole(part);
          const guideId = partOwner.match(/^guide-(\d+)/)?.[1];
          const sameGuide = obstacle.id.startsWith(`guide-${guideId}-fixed/`);
          const angle = guideId === undefined ? 0 : sample.guides[Number(guideId)]!.angle;
          const intendedHinge = sameGuide &&
            (part.name.includes('leaf-hinge-knuckle') || part.name.includes('fork-root-dogleg')) &&
            obstacle.mesh.name.includes('guide-fixed-hinge-pin');
          const intendedKeeperBore = sameGuide && angle < 1e-12 && part.name.includes('hinge-keeper-pin') && obstacle.mesh.name.includes('hinge-stop-ear');
          if (intendedHinge || intendedKeeperBore) continue;
          const depth = eiffelConvexPenetration(partSolid, obstacle.solid);
          if (depth > 1e-6) failures.push({ seconds, moving: `${partOwner}/${part.name}`, obstacle: obstacle.id, kind: obstacle.kind, depth });
        }
      }
    }
    expect(failures.slice(0, 30)).toEqual([]);
  }, 30_000);

  it('exports open coaxial bores at every fork-to-fixed-hinge joint', () => {
    applySample(0);
    for (let guide = 0; guide < 4; guide++)
      for (const side of ['north', 'south']) {
        const dogleg = ownedMeshes(rig, `guide-${guide}-${side}-leaf`).find((mesh) => mesh.name.includes('fork-root-dogleg'))!;
        const hinge = role(rig, `guide-${guide}-${side}-leaf`).getWorldPosition(new Vector3());
        const ray = new Raycaster(hinge.clone().add(new Vector3(0, -0.09, 0)), new Vector3(0, 1, 0), 0, 0.18);
        expect(ray.intersectObject(dogleg, false).filter((hit) => Math.abs(hit.point.y - hinge.y) < 0.075)).toEqual([]);
      }
  });

  it('exports real keeper clearance bores through both fixed stop ears', () => {
    applySample(0);
    for (let guide = 0; guide < 4; guide++) {
      const centerY = sampleEiffelSummitGinPoleClimb(0).guides[guide]!.centerY;
      const stops = ownedMeshes(rig, `guide-${guide}-fixed`).filter((mesh) => mesh.name.includes('hinge-stop-ear'));
      expect(stops).toHaveLength(4);
      for (const side of [-1, 1])
        for (const dy of [-0.1, 0.1]) {
          const ear = stops.find((mesh) => new Box3().setFromObject(mesh).containsPoint(new Vector3(-0.48, centerY + dy, side * 0.13)))!;
          expect(ear).toBeDefined();
          for (let spoke = 0; spoke < 8; spoke++) {
            const angle = spoke * Math.PI / 4;
            const x = -0.48 + Math.cos(angle) * 0.0075;
            const z = side * 0.13 + Math.sin(angle) * 0.0075;
            const ray = new Raycaster(new Vector3(x, centerY + dy - 0.03, z), new Vector3(0, 1, 0), 0, 0.06);
            expect(ray.intersectObject(ear, false)).toEqual([]);
          }
        }
    }
  });
});
