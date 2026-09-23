import { describe, expect, it } from 'vitest';
import {
  Box3,
  InstancedMesh,
  Matrix4,
  Mesh,
  PerspectiveCamera,
  Vector3,
} from 'three';
import { SYDNEY_CONSTRUCTION } from '../src/data/sydneyConstruction';
import { sydneyOperaHouse } from '../src/data/wonders/sydney-opera-house';
import { sydneyLabourAt } from '../src/engine/sydneyCrew';
import {
  activeSydneyOperationsAt,
  sydneyFalseworkAt,
  sydneySourcePose,
  sydneyStagingPose,
  sydneyPartStateAt,
} from '../src/engine/sydneyConstruction';
import {
  sydneyCinematicShotAt,
  SYDNEY_YARD_SHOT,
} from '../src/engine/sydneyCamera';
import { sydneyTerrainHeightAt } from '../src/engine/sydneyTerrain';
import { SydneyEnvironment } from '../src/render/three/SydneyEnvironment';
import { createMaterialLibrary } from '../src/render/three/MaterialLibrary';
import { SYDNEY_CAMERA_NEAR } from '../src/render/three/sydneyRenderPrecision';
const cameraAt = (t: number, aspect: number) => {
  const s = sydneyCinematicShotAt(t, aspect),
    c = new PerspectiveCamera(s.fov, aspect, SYDNEY_CAMERA_NEAR, 12000);
  c.position.set(
    s.target[0] + Math.cos(s.azimuth) * Math.cos(s.pitch) * s.radius,
    s.target[1] + Math.sin(s.pitch) * s.radius,
    s.target[2] + Math.sin(s.azimuth) * Math.cos(s.pitch) * s.radius,
  );
  c.lookAt(new Vector3(...s.target));
  c.updateMatrixWorld();
  return c;
};
describe('Sydney visible work and stable harbour depth', () => {
  it('keeps the lifted hero inside both frames through the slower camera pullback', () => {
    const hero = SYDNEY_CONSTRUCTION.parts.find(
      (p) => p.id === 'rib-3--1-4-4',
    )!;
    for (const aspect of [1440 / 900, 390 / 844]) {
      for (let u = 0.58; u <= 0.9; u += 0.002) {
        const t = hero.start + hero.duration * u,
          camera = cameraAt(t, aspect);
        const state = sydneyPartStateAt(
          hero,
          SYDNEY_CONSTRUCTION.routes[0]!,
          t,
        );
        for (const x of [-0.5, 0.5])
          for (const y of [-0.5, 0.5])
            for (const z of [-0.5, 0.5]) {
              const point = new Vector3(
                state.position[0] + x * hero.dimensions[0],
                state.position[1] + y * hero.dimensions[1],
                state.position[2] + z * hero.dimensions[2],
              ).project(camera);
              expect(Math.abs(point.x)).toBeLessThan(0.94);
              expect(Math.abs(point.y)).toBeLessThan(0.94);
              expect(point.z).toBeLessThan(1);
            }
      }
      for (let i = 1; i <= 3600; i++)
        expect(
          cameraAt(i / 3600, aspect).position.distanceTo(
            cameraAt((i - 1) / 3600, aspect).position,
          ),
        ).toBeLessThan(5);
    }
  });
  it('restores workers to existing safe scaffold decks and keeps their footprints inside those decks', () => {
    for (const t of [0.32, 0.58, 0.75]) {
      const bays = sydneyFalseworkAt(t),
        crews = sydneyLabourAt([], t).crews.filter((c) =>
          c.id.startsWith('deck-'),
        );
      expect(crews.length).toBeGreaterThanOrEqual(12);
      for (const c of crews) {
        const station = Number(c.id.split('-')[1]),
          b = bays.find((b) => b.station === station)!;
        expect(b).toBeTruthy();
        const dx = c.position[0] - b.position[0],
          dz = c.position[2] - b.position[2];
        const x = dx * Math.cos(b.yaw) - dz * Math.sin(b.yaw),
          z = dx * Math.sin(b.yaw) + dz * Math.cos(b.yaw);
        expect(Math.abs(x) + 0.5).toBeLessThan(2.3);
        expect(Math.abs(z) + 0.5).toBeLessThan(1.6);
        expect(c.position[1]).toBeCloseTo(b.deckY + 0.38, 8);
      }
    }
  });
  it('keeps persistent yard walkers moving on land and faces haulers along their actual trolley route', () => {
    const a = sydneyLabourAt([], 0.4).crews.filter((c) =>
        c.id.startsWith('yard-route-'),
      ),
      b = sydneyLabourAt([], 0.4 + 1 / 60).crews;
    expect(a).toHaveLength(8);
    const distances = a
      .map((c) =>
        new Vector3(...c.position).distanceTo(
          new Vector3(...b.find((d) => d.id === c.id)!.position),
        ),
      )
      .sort((a, b) => a - b);
    expect(distances[4]).toBeGreaterThan(1);
    for (let i = 8; i < 82; i++)
      for (const c of sydneyLabourAt([], i / 100).crews.filter((c) =>
        c.id.startsWith('yard-'),
      )) {
        expect(c.position[1]).toBeCloseTo(
          sydneyTerrainHeightAt(c.position[0], c.position[2]),
          8,
        );
        for (const dx of [-0.5, 0.5])
          for (const dz of [-0.5, 0.5])
            expect(
              sydneyTerrainHeightAt(c.position[0] + dx, c.position[2] + dz),
            ).toBeGreaterThan(1);
      }
    const hero = SYDNEY_CONSTRUCTION.parts.find(
        (p) => p.id === 'rib-3--1-4-4',
      )!,
      t = hero.start + hero.duration * 0.3,
      ops = activeSydneyOperationsAt(SYDNEY_CONSTRUCTION, t),
      from = sydneySourcePose(hero),
      to = sydneyStagingPose(hero);
    const direction = new Vector3(
      to[0] - from[0],
      0,
      to[2] - from[2],
    ).normalize();
    const haulers = sydneyLabourAt(ops, t).crews.filter((c) =>
      c.id.startsWith(hero.id + '-hauler'),
    );
    expect(haulers).toHaveLength(3);
    for (const c of haulers)
      expect(
        new Vector3(Math.sin(c.yaw), 0, Math.cos(c.yaw)).dot(direction),
      ).toBeGreaterThan(0.85);
  });
  it('gives normal-size workers a readable yard shot in both viewport shapes, with continuous reversible camera motion', () => {
    const t = (SYDNEY_YARD_SHOT.closeFrom + SYDNEY_YARD_SHOT.closeUntil) / 2;
    for (const [w, h] of [
      [1440, 900],
      [390, 844],
    ]) {
      const c = cameraAt(t, w! / h!),
        crews = sydneyLabourAt(
          activeSydneyOperationsAt(SYDNEY_CONSTRUCTION, t),
          t,
        ).crews;
      const visible = crews
        .map((p) => {
          const foot = new Vector3(...p.position).project(c),
            head = new Vector3(
              p.position[0],
              p.position[1] + 1.88,
              p.position[2],
            ).project(c);
          return { foot, pixels: (Math.abs(head.y - foot.y) * h!) / 2 };
        })
        .filter(
          (p) =>
            Math.abs(p.foot.x) < 0.94 &&
            Math.abs(p.foot.y) < 0.94 &&
            p.foot.z < 1 &&
            p.pixels >= 9,
        );
      expect(visible.length).toBeGreaterThanOrEqual(6);
      for (const b of Object.values(SYDNEY_YARD_SHOT)) {
        const a = cameraAt(b - 1e-8, w! / h!).position,
          d = cameraAt(b + 1e-8, w! / h!).position;
        expect(a.distanceTo(d)).toBeLessThan(0.01);
        expect(sydneyCinematicShotAt(b, w! / h!)).toEqual(
          sydneyCinematicShotAt(b, w! / h!),
        );
      }
    }
  });
  it('separates 25mm facades at 1.5km and leaves the near frustum clear of real environment bounds', async () => {
    const depth = (z: number, near: number) =>
      12000 / (12000 - near) - (12000 * near) / ((12000 - near) * z);
    const levels = (near: number) =>
      Math.abs(depth(1500, near) - depth(1500.025, near)) * 2 ** 24;
    expect(levels(0.5)).toBeLessThan(1);
    expect(levels(SYDNEY_CAMERA_NEAR)).toBeGreaterThan(3);
    const env = new SydneyEnvironment(createMaterialLibrary(sydneyOperaHouse));
    await env.ready;
    env.group.updateMatrixWorld(true);
    const boxes: Box3[] = [],
      m = new Matrix4();
    env.group.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      o.geometry.computeBoundingBox();
      if (o instanceof InstancedMesh) {
        for (let i = 0; i < o.count; i++) {
          o.getMatrixAt(i, m);
          boxes.push(
            o.geometry
              .boundingBox!.clone()
              .applyMatrix4(m)
              .applyMatrix4(o.matrixWorld),
          );
        }
      } else if (
        o.geometry.boundingBox!.getSize(new Vector3()).length() > 500
      ) {
        // City-sized batches (terrain, roads, landmarks): test their actual
        // triangles, not a bounding box that spans hills kilometres away.
        const p = o.geometry.getAttribute('position'),
          index = o.geometry.index,
          n = index ? index.count : p.count;
        for (let i = 0; i < n; i += 3) {
          const b = new Box3();
          for (let k = 0; k < 3; k++)
            b.expandByPoint(
              new Vector3().fromBufferAttribute(p, index ? index.getX(i + k) : i + k),
            );
          boxes.push(b.applyMatrix4(o.matrixWorld));
        }
      } else
        boxes.push(o.geometry.boundingBox!.clone().applyMatrix4(o.matrixWorld));
    });
    for (const aspect of [1440 / 900, 390 / 844])
      for (let i = 0; i <= 100; i++) {
        const c = cameraAt(i / 100, aspect),
          r =
            SYDNEY_CAMERA_NEAR *
            Math.sqrt(
              1 + Math.tan((c.fov * Math.PI) / 360) ** 2 * (1 + aspect ** 2),
            );
        let nearest = Infinity;
        for (const b of boxes)
          nearest = Math.min(nearest, b.distanceToPoint(c.position));
        expect(nearest, `camera t=${i / 100}`).toBeGreaterThan(r);
      }
    env.dispose();
  });
});
