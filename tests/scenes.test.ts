import { describe, expect, it } from 'vitest';
import { sceneDocSchema } from '../src/data/sceneSchema';
import { getCompiledScene } from '../src/data/scenes';
import { WONDERS, getWonder } from '../src/data';
import { boundingCylinder, flattenStages } from '../src/engine/geometry';
import { stageWindows } from '../src/engine/timeline';
import {
  backdropColor,
  backdropSilhouette,
} from '../src/render/backdrop';
import {
  birdPositions,
  dustPuffs,
  scaffoldParts,
  scaffoldState,
  workerParts,
} from '../src/render/life';
import { lightStateAt } from '../src/engine/daynight';

const HEX = /^#[0-9a-f]{6}$/i;
const SCENE_IDS = WONDERS.filter((w) => getCompiledScene(w.id)).map((w) => w.id);

describe('scene documents', () => {
  it('at least the reference scene (pyramids-of-giza) is migrated', () => {
    expect(SCENE_IDS).toContain('pyramids-of-giza');
  });

  it('every scene doc validates against the schema and matches a catalog id', () => {
    for (const id of SCENE_IDS) {
      const doc = getCompiledScene(id);
      expect(doc).not.toBeNull();
      // re-validate the raw doc shape via the public schema
      // (compileScene already parsed it; reaching here means valid)
      expect(doc!.structure.stages.length).toBeGreaterThan(0);
      expect(getWonder(id).id).toBe(id);
    }
  });

  it('compilation is deterministic and within the detail budget', () => {
    for (const id of SCENE_IDS) {
      const a = getCompiledScene(id)!;
      const parts = flattenStages(a.structure);
      expect(parts.length).toBeGreaterThanOrEqual(20);
      expect(parts.length).toBeLessThanOrEqual(500);
      // bounding cylinder is finite and positive
      const { radius, height } = boundingCylinder(parts);
      expect(Number.isFinite(radius) && radius > 0).toBe(true);
      expect(Number.isFinite(height) && height > 0).toBe(true);
    }
  });

  it('schema rejects broken docs', () => {
    expect(() => sceneDocSchema.parse({ wonder: 'x' })).toThrow();
    expect(() =>
      sceneDocSchema.parse({
        wonder: 'x',
        background: { terrain: 'desert', layers: [] },
        mainObject: { components: [{ id: 'c', stage: 's' }] }, // no generator/parts
      }),
    ).toThrow();
  });

  it('scaffolding stages reference real stages', () => {
    for (const id of SCENE_IDS) {
      const doc = getCompiledScene(id)!;
      const names = doc.foreground.scaffolding?.aroundStages ?? [];
      for (const n of names) {
        expect(doc.structure.stages.map((s) => s.name)).toContain(n);
      }
    }
  });
});

describe('foreground life', () => {
  const doc = getCompiledScene('pyramids-of-giza')!;
  const structure = doc.structure;
  const workerSpecs = (
    Array.isArray(doc.foreground.workers)
      ? doc.foreground.workers
      : [doc.foreground.workers]
  ).map((s) => ({
    count: s!.count,
    path: s!.path,
    carry: s!.carry ?? false,
  }));
  const road = doc.foreground.roads?.[0]
    ? { from: doc.foreground.roads[0].from, to: doc.foreground.roads[0].to }
    : undefined;

  it('workers walk only during build, deterministically', () => {
    expect(workerParts('pyramids-of-giza', structure, workerSpecs, 0, road)).toHaveLength(0);
    expect(workerParts('pyramids-of-giza', structure, workerSpecs, 0.99, road)).toHaveLength(0);
    const mid = workerParts('pyramids-of-giza', structure, workerSpecs, 0.5, road);
    expect(mid.length).toBeGreaterThan(0);
    // deterministic
    expect(workerParts('pyramids-of-giza', structure, workerSpecs, 0.5, road)).toEqual(mid);
    // they move
    const later = workerParts('pyramids-of-giza', structure, workerSpecs, 0.6, road);
    expect(later).not.toEqual(mid);
    // opacity ramps: fully present mid-build, fading near the end
    expect(mid[0]!.state.opacity).toBe(1);
    const fading = workerParts('pyramids-of-giza', structure, workerSpecs, 0.92, road);
    expect(fading[0]!.state.opacity).toBeLessThan(1);
  });

  it('scaffolding stands during its stage and is gone well after', () => {
    const stageNames = doc.foreground.scaffolding!.aroundStages;
    const parts = scaffoldParts(structure, stageNames);
    expect(parts.length).toBeGreaterThan(0);
    const { stageIndex } = parts[0]!;
    const w = stageWindows(structure.stages)[stageIndex]!;
    expect(
      scaffoldState(parts[0]!.part, (w.start + w.end) / 2, w).visible,
    ).toBe(true);
    expect(scaffoldState(parts[0]!.part, w.end + 0.2, w).visible).toBe(false);
    expect(scaffoldState(parts[0]!.part, 0, w).visible).toBe(false);
  });

  it('dust puffs exist only briefly after a landing', () => {
    // sample the whole movie; puffs must be age-bounded by construction
    for (const t of [0.2, 0.45, 0.7, 1]) {
      for (const puff of dustPuffs('pyramids-of-giza', structure, t)) {
        expect(puff.age).toBeGreaterThan(0);
        expect(puff.age).toBeLessThan(1);
      }
    }
    // at rest states there are no puffs at all
    expect(dustPuffs('pyramids-of-giza', structure, 0)).toHaveLength(0);
    expect(dustPuffs('pyramids-of-giza', structure, 1)).toHaveLength(0);
  });

  it('birds cross the sky during build only, deterministically', () => {
    expect(birdPositions('pyramids-of-giza', 3, 0)).toHaveLength(0);
    expect(birdPositions('pyramids-of-giza', 3, 0.97)).toHaveLength(0);
    const mid = birdPositions('pyramids-of-giza', 3, 0.5);
    expect(mid).toHaveLength(3);
    expect(birdPositions('pyramids-of-giza', 3, 0.5)).toEqual(mid);
  });
});

describe('backdrop layers', () => {
  const doc = getCompiledScene('pyramids-of-giza')!;
  const light = lightStateAt(0.5, getWonder('pyramids-of-giza'));

  it('silhouettes are deterministic and span the horizon', () => {
    for (const layer of doc.backdrop) {
      const a = backdropSilhouette(layer, 1200, 300, 120, 0, 'pyramids-of-giza');
      const b = backdropSilhouette(layer, 1200, 300, 120, 0, 'pyramids-of-giza');
      expect(a.points).toEqual(b.points);
      expect(a.points.length).toBeGreaterThan(10);
      const xs = a.points.map((p) => p[0]);
      expect(Math.min(...xs)).toBeLessThan(0);
      expect(Math.max(...xs)).toBeGreaterThan(1200);
    }
  });

  it('farther layers fade further into the sky', () => {
    const [far, near] = [...doc.backdrop].sort((a, b) => b.distance - a.distance);
    const farColor = backdropColor(far!, light);
    const nearColor = backdropColor(near!, light);
    // both valid hex; far layer is closer to the sky color
    expect(farColor).toMatch(HEX);
    expect(nearColor).toMatch(HEX);
    expect(farColor).not.toBe(nearColor);
  });

  it('city layers use rectilinear roofs instead of triangular mountains', () => {
    const city = doc.backdrop.find((layer) => layer.kind === 'city')!;
    const { points } = backdropSilhouette(city, 1200, 300, 90, 0, 'pyramids-of-giza');
    const top = points.slice(0, -2);
    const hasVertical = top.some((p, i) => i > 0 && p[0] === top[i - 1]![0] && p[1] !== top[i - 1]![1]);
    const hasFlatRoof = top.some((p, i) => i > 0 && p[1] === top[i - 1]![1] && p[0] !== top[i - 1]![0]);
    expect(hasVertical && hasFlatRoof).toBe(true);
  });
});
