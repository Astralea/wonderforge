import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import type { EiffelAssemblyManifest } from '../src/data/eiffelAssemblyTypes';
import { EIFFEL_CAMERA_HEIGHT_MILESTONES, eiffelCinematicShotAt } from '../src/engine/eiffelCamera';

const manifest = JSON.parse(readFileSync('public/models/eiffel/tower-rebuilt.manifest.json', 'utf8')) as EiffelAssemblyManifest;

function stageEnd(stage: number): number {
  const counts = new Map<number, number>();
  for (const part of manifest.parts) counts.set(part.stage, (counts.get(part.stage) ?? 0) + 1);
  const stages = [...counts].sort(([a], [b]) => a - b);
  const totalWaves = stages.reduce((sum, [, count]) => sum + Math.ceil(count / 16), 0);
  const elapsedWaves = stages
    .filter(([candidate]) => candidate <= stage)
    .reduce((sum, [, count]) => sum + Math.ceil(count / 16), 0);
  return 0.04 + 0.86 * elapsedWaves / totalWaves;
}

const EXPECTED_HEIGHT_MILESTONES = [
  [0, 4],
  [stageEnd(9), 57],
  [stageEnd(23), 60],
  [stageEnd(34), 116],
  [stageEnd(54), 277],
  [stageEnd(63), 312],
  [1, 312],
] as const;

function project(t: number, aspect: number, point: Vector3): Vector3 {
  const shot = eiffelCinematicShotAt(t, aspect);
  const camera = new PerspectiveCamera(shot.fov, aspect, 0.1, 4000);
  const target = new Vector3(...shot.target);
  const horizontal = shot.radius * Math.cos(shot.pitch);
  camera.position.set(
    target.x + Math.cos(shot.azimuth) * horizontal,
    target.y + Math.sin(shot.pitch) * shot.radius,
    target.z + Math.sin(shot.azimuth) * horizontal,
  );
  camera.lookAt(target);
  camera.updateMatrixWorld(true);
  return point.clone().project(camera);
}

const heightAt = (t: number): number => {
  for (let index = 1; index < EXPECTED_HEIGHT_MILESTONES.length; index += 1) {
    const from = EXPECTED_HEIGHT_MILESTONES[index - 1]!;
    const to = EXPECTED_HEIGHT_MILESTONES[index]!;
    if (t <= to[0]) return from[1] + (to[1] - from[1]) * (t - from[0]) / (to[0] - from[0]);
  }
  return 312;
};

describe('Blender Eiffel camera composition', () => {
  it('tracks the current manifest stage-wave timing', () => {
    expect(manifest.parts.length).toBeGreaterThan(350);
    expect(EIFFEL_CAMERA_HEIGHT_MILESTONES).toEqual(EXPECTED_HEIGHT_MILESTONES);
  });

  it.each([1440 / 900, 390 / 844, 320 / 844])('contains the built tower and crane clearance throughout the orbit at aspect %s', aspect => {
    for (let sample = 0; sample <= 100; sample += 1) {
      const t = sample / 100;
      for (const x of [-62.5, 0, 62.5]) {
        for (const y of [0, heightAt(t) + 14]) {
          for (const z of [-62.5, 0, 62.5]) {
            const p = project(t, aspect, new Vector3(x, y, z));
            expect(Math.abs(p.x), `x at ${t.toFixed(2)} for ${x},${y},${z}`).toBeLessThanOrEqual(0.91);
            expect(Math.abs(p.y), `y at ${t.toFixed(2)} for ${x},${y},${z}`).toBeLessThanOrEqual(0.87);
            expect(p.z).toBeGreaterThan(-1);
            expect(p.z).toBeLessThan(1);
          }
        }
      }
    }
  });

  it('keeps the opening close enough for the 125m work footprint to read', () => {
    const t = 0;
    const aspect = 1440 / 900;
    const shot = eiffelCinematicShotAt(t, aspect);
    const corners = [-62.5, 62.5].flatMap(x => [-62.5, 62.5].map(z => project(t, aspect, new Vector3(x, 0, z)).x));
    expect(shot.radius).toBeGreaterThanOrEqual(250);
    expect(shot.radius).toBeLessThan(340);
    expect(Math.max(...corners) - Math.min(...corners)).toBeGreaterThan(0.65);
  });

  it('contains the complete tower once the reveal begins', () => {
    for (const aspect of [1440 / 900, 390 / 844, 320 / 844]) {
      for (let sample = 0; sample <= 20; sample += 1) {
        const t = 0.9 + sample / 200;
        for (const x of [-62.5, 62.5]) for (const z of [-62.5, 62.5]) for (const y of [0, 312]) {
          const p = project(t, aspect, new Vector3(x, y, z));
          expect(Math.abs(p.x), `x at reveal t=${t.toFixed(3)}`).toBeLessThanOrEqual(0.91);
          expect(Math.abs(p.y), `y at reveal t=${t.toFixed(3)}`).toBeLessThanOrEqual(0.87);
        }
      }
    }
  });

  it('frames first-floor, second-floor and upper-shaft working edges with crane clearance', () => {
    for (const aspect of [1440 / 900, 390 / 844]) {
      for (const [t, height] of [[stageEnd(9), 57], [stageEnd(34), 116], [stageEnd(54), 277]] as const) {
        for (const x of [-62.5, 62.5]) {
          for (const z of [-62.5, 62.5]) {
            const p = project(t, aspect, new Vector3(x, height + 12, z));
            expect(Math.abs(p.x)).toBeLessThan(0.91);
            expect(Math.abs(p.y)).toBeLessThan(0.87);
          }
        }
      }
    }
  });

  it('makes a smooth substantial orbit with immediate motion and no reversals', () => {
    const samples = Array.from({ length: 1001 }, (_, index) => eiffelCinematicShotAt(index / 1000).azimuth);
    const deltas = samples.slice(1).map((azimuth, index) => azimuth - samples[index]!);
    expect(deltas[0]).toBeGreaterThan(0);
    expect(deltas.every(delta => delta > 0)).toBe(true);
    expect((samples.at(-1)! - samples[0]!) * 180 / Math.PI).toBeGreaterThanOrEqual(100);
    expect((samples.at(-1)! - samples[0]!) * 180 / Math.PI).toBeCloseTo(125, 8);
    for (let index = 1; index < deltas.length; index += 1) {
      expect(Math.abs(deltas[index]! - deltas[index - 1]!)).toBeLessThan(1e-10);
    }
  });

  it('keeps the completed tower visually legible at the reveal', () => {
    for (const aspect of [1440 / 900, 390 / 844, 320 / 844]) {
      const base = project(1, aspect, new Vector3(0, 0, 0));
      const tip = project(1, aspect, new Vector3(0, 312, 0));
      expect(tip.y - base.y).toBeGreaterThan(0.65);
    }
  });

  it('is deterministic under backward seeking, clamps endpoints and resizes continuously', () => {
    const expected = eiffelCinematicShotAt(0.58, 390 / 844);
    eiffelCinematicShotAt(1, 1440 / 900);
    expect(eiffelCinematicShotAt(0.58, 390 / 844)).toEqual(expected);
    expect(eiffelCinematicShotAt(-1)).toEqual(eiffelCinematicShotAt(0));
    expect(eiffelCinematicShotAt(2)).toEqual(eiffelCinematicShotAt(1));
    const left = eiffelCinematicShotAt(0.58, 0.72 - 1e-6);
    const right = eiffelCinematicShotAt(0.58, 0.72 + 1e-6);
    expect(Math.abs(left.radius - right.radius)).toBeLessThan(0.01);
    expect(Math.abs(left.fov - right.fov)).toBeLessThan(0.001);
  });
});
