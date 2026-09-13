import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { DirectionalLight, Vector3 } from 'three';
import type { Vec3 } from '../src/data/constructionTypes';
import { eiffelSunStateAt } from '../src/data/eiffelSky';
import { eiffelCinematicShotAt, type EiffelCameraShot } from '../src/engine/eiffelCamera';
import { eiffelShadowEnvelope, fitEiffelShadow } from '../src/engine/eiffelShadow';
import { applyEiffelShadowFrame, restoreEiffelShadowFrame } from '../src/render/three/eiffelShadow';
import type { EiffelKitManifest } from '../src/data/eiffelKitTypes';

function directionAt(t: number): Vec3 {
  const sun = eiffelSunStateAt(t), a = sun.azimuth * Math.PI / 180, e = sun.elevation * Math.PI / 180;
  return [Math.cos(e) * Math.cos(a), Math.sin(e), Math.cos(e) * Math.sin(a)];
}
function update(sun: DirectionalLight) {
  sun.target.updateMatrixWorld(); sun.updateMatrixWorld(); sun.shadow.updateMatrices(sun);
}
function expectCovered(sun: DirectionalLight, points: readonly Vec3[]) {
  update(sun);
  let maximum = 0;
  const p = new Vector3();
  for (const point of points) {
    p.set(...point).project(sun.shadow.camera);
    maximum = Math.max(maximum, Math.abs(p.x), Math.abs(p.y), Math.abs(p.z));
  }
  expect(maximum).toBeLessThan(1);
}

describe('short Eiffel film directional-shadow fit', () => {
  it('retains every current structural bound and ground support margin in the narrower wide footprint', () => {
    const manifest = JSON.parse(readFileSync('public/models/eiffel-construction-kit/tower-kit.manifest.json', 'utf8')) as EiffelKitManifest;
    const points: Vec3[] = [];
    let footprint = 0;
    for (const part of manifest.parts) {
      for (const axis of [0, 2]) {
        footprint = Math.max(footprint, Math.abs(part.boundsMin[axis]!), Math.abs(part.boundsMax[axis]!));
      }
      for (const x of [part.boundsMin[0], part.boundsMax[0]]) for (const y of [part.boundsMin[1], part.boundsMax[1]]) for (const z of [part.boundsMin[2], part.boundsMax[2]]) points.push([x, y, z]);
    }
    expect(footprint).toBeLessThanOrEqual(62.5);
    points.push([-68, -5, -68], [68, -5, 68]);
    // Full built envelope under the problem frame's sun as well as the final
    // low sun: covering all members here is stronger than seated-only bounds.
    for (const t of [.8054955483449447, .9, 1]) for (const mapSize of [1024, 2048]) {
      const sun = new DirectionalLight();
      applyEiffelShadowFrame(sun, fitEiffelShadow(eiffelShadowEnvelope(1, eiffelCinematicShotAt(1)), directionAt(t), mapSize));
      expectCovered(sun, points);
    }
  });
  it('covers erected wide tower and ground corners at multiple actual sun angles and map sizes', () => {
    for (const mapSize of [1024, 2048]) for (const t of [0, .15, .43, .6477333333, .9, 1]) {
      const sun = new DirectionalLight(), direction = directionAt(t);
      const points = eiffelShadowEnvelope(t, eiffelCinematicShotAt(t));
      sun.shadow.mapSize.set(mapSize, mapSize);
      applyEiffelShadowFrame(sun, fitEiffelShadow(points, direction, mapSize));
      expectCovered(sun, points);
      expect(sun.shadow.mapSize.toArray()).toEqual([mapSize, mapSize]);
    }
  });

  it('restores the previously clipped upper iron to both lateral and depth coverage', () => {
    for (const [t, y] of [[.6477333333, 277], [.9, 300]] as const) {
      const sun = new DirectionalLight(), direction = directionAt(t), point: Vec3 = [0, y, 0];
      restoreEiffelShadowFrame(sun, direction); update(sun);
      const old = new Vector3(...point).project(sun.shadow.camera);
      expect(Math.max(...old.toArray().map(Math.abs))).toBeGreaterThan(1);
      applyEiffelShadowFrame(sun, fitEiffelShadow(eiffelShadowEnvelope(t, eiffelCinematicShotAt(t)), direction, 2048));
      expectCovered(sun, [point]);
    }
  });

  it('concentrates close views on work and supporting context with a smaller map footprint', () => {
    const cases: { t: number; target: Vec3; support: Vec3 }[] = [
      { t: .15, target: [70, 24, 55], support: [70, 0, 55] },
      { t: .43, target: [20, 60, 20], support: [20, 30, 20] },
      { t: .9, target: [0, 294, 0], support: [0, 264, 0] },
    ];
    for (const { t, target, support } of cases) for (const mapSize of [1024, 2048]) {
      const shot: EiffelCameraShot = { target, radius: 70, azimuth: 0, pitch: .3, fov: 42 };
      const points = eiffelShadowEnvelope(t, shot), direction = directionAt(t);
      const frame = fitEiffelShadow(points, direction, mapSize), sun = new DirectionalLight();
      applyEiffelShadowFrame(sun, frame); expectCovered(sun, [...points, target, support]);
      const wide = fitEiffelShadow(eiffelShadowEnvelope(t, { ...shot, radius: 624 }), direction, mapSize);
      expect(frame.right * frame.top).toBeLessThan(wide.right * wide.top);
    }
  });

  it('snaps the light-space target to texels and is deterministic without history', () => {
    const points = eiffelShadowEnvelope(.9, eiffelCinematicShotAt(.9)), direction = directionAt(.9);
    for (const mapSize of [1024, 2048]) {
      const frame = fitEiffelShadow(points, direction, mapSize);
      expect(fitEiffelShadow(points, direction, mapSize)).toEqual(frame);
      const d = new Vector3(...direction).normalize();
      const right = new Vector3().crossVectors(new Vector3(0, 1, 0), d).normalize();
      const up = new Vector3().crossVectors(d, right);
      const target = new Vector3(...frame.target);
      for (const [axis, halfExtent] of [[right, frame.right], [up, frame.top]] as const) {
        const texels = target.dot(axis) / (2 * halfExtent / mapSize);
        expect(texels).toBeCloseTo(Math.round(texels), 8);
      }
    }
  });

  it('retains quantitative lateral and depth padding after texel snapping', () => {
    for (const t of [0, .43, .8054955483449447, .9, 1]) for (const mapSize of [1024, 2048]) {
      const points = eiffelShadowEnvelope(t, eiffelCinematicShotAt(t));
      const frame = fitEiffelShadow(points, directionAt(t), mapSize), sun = new DirectionalLight();
      applyEiffelShadowFrame(sun, frame); update(sun);
      let lateral = Infinity, depth = Infinity;
      for (const point of points) {
        const p = new Vector3(...point).applyMatrix4(sun.shadow.camera.matrixWorldInverse);
        lateral = Math.min(lateral, frame.right - Math.abs(p.x), frame.top - Math.abs(p.y));
        depth = Math.min(depth, -p.z - frame.near, frame.far + p.z);
      }
      // A half-texel offset is the only allowed loss from the4m lateral pad;
      // the1m near plane consumes exactly1m of the16m near-side depth pad.
      expect(lateral).toBeGreaterThanOrEqual(4 - Math.max(frame.right, frame.top) / mapSize - 1e-8);
      expect(depth).toBeGreaterThanOrEqual(15 - 1e-8);
    }
  });

  it('restores the original light and projection without modifying map size or bias', () => {
    const sun = new DirectionalLight(), d = directionAt(.9);
    sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -.00035; sun.shadow.normalBias = .035;
    applyEiffelShadowFrame(sun, fitEiffelShadow(eiffelShadowEnvelope(.9, eiffelCinematicShotAt(.9)), d, 1024));
    restoreEiffelShadowFrame(sun, d);
    expect(sun.target.position.toArray()).toEqual([-15, 7, -17]);
    expect(sun.position.distanceTo(sun.target.position)).toBeCloseTo(145, 10);
    const c = sun.shadow.camera;
    expect([c.left, c.right, c.bottom, c.top, c.near, c.far]).toEqual([-82, 82, -70, 70, 2, 300]);
    expect(sun.shadow.mapSize.toArray()).toEqual([1024, 1024]);
    expect([sun.shadow.bias, sun.shadow.normalBias]).toEqual([-.00035, .035]);
  });

  it('rejects an empty envelope and non-finite directions', () => {
    expect(() => fitEiffelShadow([], [1, 1, 0], 1024)).toThrow();
    expect(() => fitEiffelShadow([[0, 0, 0]], [NaN, 1, 0], 1024)).toThrow();
  });
});
