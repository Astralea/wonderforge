import { describe, expect, it } from 'vitest';
import {
  CAMERA,
  REFERENCE_ASPECT,
  baseRadius,
  cameraStateAt,
} from '../src/engine/camera';
import type { StructureSpec } from '../src/data/types';

const fixture: StructureSpec = {
  stages: [
    {
      name: 'tower',
      parts: [
        {
          shape: 'box',
          material: 'primary',
          position: [0, 0, 0],
          scale: [4, 10, 4],
        },
      ],
    },
  ],
};

const wide: StructureSpec = {
  stages: [
    {
      name: 'wide',
      parts: [
        {
          shape: 'box',
          material: 'primary',
          position: [30, 0, 0],
          scale: [8, 4, 8],
        },
      ],
    },
  ],
};

const TAN_PITCH = Math.tan((CAMERA.pitchDeg * Math.PI) / 180);

function radiusOf(t: number, structure: StructureSpec = fixture) {
  const { position } = cameraStateAt(t, structure);
  return Math.hypot(position[0], position[1], position[2]);
}

describe('baseRadius', () => {
  it('grows with bigger structures', () => {
    expect(baseRadius(wide)).toBeGreaterThan(baseRadius(fixture));
  });

  it('is always a positive finite number', () => {
    for (const s of [fixture, wide]) {
      const r = baseRadius(s);
      expect(Number.isFinite(r)).toBe(true);
      expect(r).toBeGreaterThan(0);
    }
  });
});

describe('cameraStateAt', () => {
  it('keeps a fixed isometric pitch at all times', () => {
    for (let t = 0; t <= 1; t += 0.1) {
      const { position } = cameraStateAt(t, fixture);
      const horizontal = Math.hypot(position[0], position[2]);
      expect(position[1] / horizontal).toBeCloseTo(TAN_PITCH, 5);
    }
  });

  it('orbits 1.25 full turns (450°) over the movie', () => {
    const steps = 720;
    let swept = 0;
    let prev = Math.atan2(
      cameraStateAt(0, fixture).position[2],
      cameraStateAt(0, fixture).position[0],
    );
    for (let i = 1; i <= steps; i++) {
      const { position } = cameraStateAt(i / steps, fixture);
      const angle = Math.atan2(position[2], position[0]);
      let delta = angle - prev;
      if (delta > Math.PI) delta -= 2 * Math.PI;
      if (delta < -Math.PI) delta += 2 * Math.PI;
      swept += delta;
      prev = angle;
    }
    expect(Math.abs(swept)).toBeCloseTo(2 * Math.PI * CAMERA.turns, 2);
  });

  it('starts wide, settles to base during build, pulls out slightly for the reveal', () => {
    const base = baseRadius(fixture);
    expect(radiusOf(0)).toBeCloseTo(base * CAMERA.introRadiusFactor, 3);
    expect(radiusOf(0.5)).toBeCloseTo(base, 3);
    expect(radiusOf(1)).toBeCloseTo(base * CAMERA.revealRadiusFactor, 3);
  });

  it('aims at the structure centroid near 40% of its height', () => {
    const height = 10;
    for (let t = 0; t <= 1; t += 0.13) {
      const { target } = cameraStateAt(t, fixture);
      expect(target[0]).toBeCloseTo(0, 5);
      expect(target[2]).toBeCloseTo(0, 5);
      expect(target[1]).toBeGreaterThan(height * 0.35);
      expect(target[1]).toBeLessThan(height * 0.45);
    }
  });

  it('uses a long 35mm-equivalent fov for the isometric feel', () => {
    for (const t of [0, 0.33, 0.66, 1]) {
      expect(cameraStateAt(t, fixture).fov).toBe(35);
    }
  });

  it('widens the orbit on portrait viewports and leaves landscape alone', () => {
    const landscape = cameraStateAt(0.5, fixture, undefined, REFERENCE_ASPECT);
    const portrait = cameraStateAt(0.5, fixture, undefined, 0.75);
    const r = (p: [number, number, number]) => Math.hypot(...p);
    expect(r(portrait.position)).toBeGreaterThan(r(landscape.position) * 1.4);
    // landscape ≈ the default reference aspect
    expect(r(landscape.position)).toBeCloseTo(radiusOf(0.5), 3);
  });

  it('honors scene-authored orbit turns and framing', () => {
    const authored: StructureSpec = { ...fixture, turns: 0.75, framing: 0.9 };
    expect(baseRadius(authored)).toBeCloseTo(baseRadius(fixture) * 0.9, 5);
    const a = cameraStateAt(0, authored).position;
    const b = cameraStateAt(1, authored).position;
    const angle = (p: [number, number, number]) => Math.atan2(p[2], p[0]);
    let delta = angle(b) - angle(a);
    while (delta < 0) delta += Math.PI * 2;
    expect(delta).toBeCloseTo(Math.PI * 1.5, 5);
  });

  it('never crops on square-ish viewports either (compensation is capped)', () => {
    const square = cameraStateAt(0.5, fixture, undefined, 1);
    const base = baseRadius(fixture);
    expect(Math.hypot(...square.position)).toBeLessThan(base * 2.3);
  });
});
