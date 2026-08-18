import { describe, expect, it } from 'vitest';
import { getCompiledScene } from '../src/data/scenes';
import { getWonder } from '../src/data';
import { stageWindows } from '../src/engine/timeline';
import { cloudAlphaAt, cloudSpecs, cloudXAt } from '../src/render/atmosphere';
import { scaffoldState, workerParts } from '../src/render/life';

const scene = getCompiledScene('pyramids-of-giza')!;
const road = scene.foreground.roads![0]!;

describe('road workers (Spec 08)', () => {
  const specs = [{ count: 6, path: 'road' as const, carry: true }];

  it('positions are deterministic', () => {
    const a = workerParts('pyramids-of-giza', scene.structure, specs, 0.4, road);
    const b = workerParts('pyramids-of-giza', scene.structure, specs, 0.4, road);
    expect(a).toEqual(b);
  });

  it('workers stay on the route corridor', () => {
    const [x0] = road.from;
    const [x1] = road.to;
    const minX = Math.min(x0, x1) - 0.01;
    const maxX = Math.max(x0, x1) + 0.01;
    for (const t of [0.2, 0.35, 0.5, 0.65, 0.8]) {
      for (const dp of workerParts('pyramids-of-giza', scene.structure, specs, t, road)) {
        expect(dp.part.position[0]).toBeGreaterThanOrEqual(minX);
        expect(dp.part.position[0]).toBeLessThanOrEqual(maxX);
      }
    }
  });

  it('ping-pong: travel direction reverses over time', () => {
    // one worker, dense sampling — its x must move both up and down the route
    const one = [{ count: 1, path: 'road' as const, carry: false }];
    const xs: number[] = [];
    for (let t = 0.1; t < 0.9; t += 0.02) {
      const parts = workerParts('pyramids-of-giza', scene.structure, one, t, road);
      if (parts.length) xs.push(parts[0]!.part.position[0]);
    }
    let up = false;
    let down = false;
    for (let i = 1; i < xs.length; i++) {
      const d = xs[i]! - xs[i - 1]!;
      if (d > 0.01) up = true;
      if (d < -0.01) down = true;
    }
    expect(up && down).toBe(true);
  });

  it('carriers haul a block only while outbound', () => {
    // one worker: 2 parts while returning empty, 4 while hauling outbound
    const one = [{ count: 1, path: 'road' as const, carry: true }];
    let sawLoaded = false;
    let sawEmpty = false;
    for (let t = 0.1; t < 0.9; t += 0.005) {
      const n = workerParts('pyramids-of-giza', scene.structure, one, t, road).length;
      if (n === 4) sawLoaded = true;
      if (n === 2) sawEmpty = true;
      if (sawLoaded && sawEmpty) break;
    }
    expect(sawLoaded && sawEmpty).toBe(true);
  });
});

describe('construction ramp (Spec 08)', () => {
  it('the Khufu ramp is one wedge and exists only during its stage lifecycle', () => {
    const khufuIdx = scene.structure.stages.findIndex((s) => s.name === 'Khufu foundation');
    const window = stageWindows(scene.structure.stages)[khufuIdx]!;
    const ramp = scene.structure.stages[khufuIdx]!.parts.find(
      (p) => p.entrance === 'scaffold',
    )!;
    expect(ramp).toBeDefined();
    expect(ramp.shape).toBe('ramp');
    expect(scaffoldState(ramp, 0, window).visible).toBe(false);
    expect(
      scaffoldState(ramp, (window.start + window.end) / 2, window).visible,
    ).toBe(true);
    expect(scaffoldState(ramp, 1, window).visible).toBe(false);
  });

  it('ramp crews climb in world Y, haul outbound, and leave with their stage', () => {
    const route = scene.foreground.ramps![0]!;
    const idx = scene.structure.stages.findIndex((s) => s.name === route.stage);
    const window = stageWindows(scene.structure.stages)[idx]!;
    const specs = [{ count: 1, path: 'ramp' as const, carry: true }];
    let sawClimb = false;
    let sawLoaded = false;
    let sawEmpty = false;
    for (let i = 1; i < 60; i++) {
      const t = window.start + (i / 60) * (window.end - window.start);
      const parts = workerParts('pyramids-of-giza', scene.structure, specs, t, road, route);
      if (!parts.length) continue;
      if (parts[0]!.part.position[1] > 0.2) sawClimb = true;
      if (parts.length === 4) sawLoaded = true;
      if (parts.length === 2) sawEmpty = true;
    }
    expect(sawClimb && sawLoaded && sawEmpty).toBe(true);
    expect(
      workerParts('pyramids-of-giza', scene.structure, specs, window.end + 0.08, road, route),
    ).toHaveLength(0);
  });
});

describe('Giza fidelity pipeline', () => {
  it('uses thin masonry courses and a deliberate story order', () => {
    const names = scene.structure.stages.map((s) => s.name);
    expect(names[0]).toBe('Site preparation');
    expect(names.at(-1)).toBe('Final casing');
    const courseStages = new Set([
      'Khufu foundation',
      'Khufu crown',
      'Khafre masonry',
      'Menkaure & queens',
      'Final casing',
    ]);
    const masonryCourses = scene.structure.stages
      .filter((stage) => courseStages.has(stage.name))
      .flatMap((stage) => stage.parts)
      .filter((p) =>
        p.shape === 'box' &&
        (p.material === 'primary' || p.material === 'casing') &&
        p.scale[1] <= 0.8,
      );
    expect(masonryCourses.length).toBeGreaterThanOrEqual(70);
  });

  it('compiles the authored framing controls', () => {
    expect(scene.structure.turns).toBe(1.25);
    expect(scene.structure.framing).toBeCloseTo(0.92, 5);
  });
});

describe('clouds (Spec 08)', () => {
  it('are deterministic per wonder and drift with the day', () => {
    expect(cloudSpecs('pyramids-of-giza')).toEqual(cloudSpecs('pyramids-of-giza'));
    expect(cloudSpecs('pyramids-of-giza')).not.toEqual(cloudSpecs('petra'));
    const [c] = cloudSpecs('pyramids-of-giza');
    expect(cloudXAt(c!, 0.3, 0, 1200)).not.toBeCloseTo(cloudXAt(c!, 0.8, 0, 1200), 3);
  });

  it('hide at night and at the day edges', () => {
    expect(cloudAlphaAt(0.5, 0)).toBeGreaterThan(0.3);
    expect(cloudAlphaAt(0.5, 1)).toBeLessThan(0.1);
    expect(cloudAlphaAt(0, 0)).toBe(0);
    expect(cloudAlphaAt(1, 0)).toBe(0);
  });
});

describe('scene doc realism wiring', () => {
  it('pyramids has a road, road workers, and a detailed horizon', () => {
    expect(scene.foreground.roads).toHaveLength(1);
    const workers = Array.isArray(scene.foreground.workers)
      ? scene.foreground.workers
      : [scene.foreground.workers];
    expect(workers!.some((w) => w!.path === 'road' && w!.carry)).toBe(true);
    expect(
      scene.backdrop.some((l) => l.details?.includes('palms')),
    ).toBe(true);
    expect(scene.backdrop.some((l) => l.details?.includes('river'))).toBe(true);
  });

  it('giza is on the catalog and the road stays on the island', () => {
    const w = getWonder('pyramids-of-giza');
    expect(w.name).toBe('Pyramids of Giza');
    const [fx, fz] = scene.foreground.roads![0]!.from;
    const [tx, tz] = scene.foreground.roads![0]!.to;
    expect(Math.hypot(fx, fz)).toBeLessThan(60);
    expect(Math.hypot(tx, tz)).toBeLessThan(60);
  });
});
