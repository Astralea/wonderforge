import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { EiffelAssemblyManifest } from '../src/data/eiffelAssemblyTypes';
import { createEiffelAssemblyPlan, sampleEiffelAssemblyPart, EIFFEL_ASSEMBLY_MAX_ACTIVE, eiffelAssemblyGroundSupport } from '../src/engine/eiffelAssembly';
import { eiffelGltfPartBounds } from '../src/render/three/EiffelBlenderSystem';

const manifest = JSON.parse(readFileSync('public/models/eiffel/tower-rebuilt.manifest.json', 'utf8')) as EiffelAssemblyManifest;
const plan = createEiffelAssemblyPlan(manifest);

describe('Blender Eiffel assembly contract', () => {
  it('round-trips real exported vertices into the manifest world bounds', async () => {
    const bytes = readFileSync('public/models/eiffel/tower-rebuilt.glb');
    const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    const actual = eiffelGltfPartBounds(gltf.scene);
    expect(actual.size).toBe(manifest.parts.length);
    for (const part of manifest.parts) {
      const box = actual.get(part.id)!;
      for (let axis = 0; axis < 3; axis++) {
        expect(Math.abs(box.min.getComponent(axis) - part.boundsMin[axis]), part.id).toBeLessThan(0.001);
        expect(Math.abs(box.max.getComponent(axis) - part.boundsMax[axis]), part.id).toBeLessThan(0.001);
      }
    }
    expect(manifest.height).toBe(312);
    expect(manifest.base).toBe(125);
    expect(actual.has('summit-crown')).toBe(true);
  });

  it('reproduces the plan and keeps all seated assemblies exactly at their authored centers', () => {
    expect(createEiffelAssemblyPlan(manifest)).toEqual(plan);
    for (const part of plan.parts) {
      const final = sampleEiffelAssemblyPart(part, 1);
      expect(final.position).toEqual(part.center);
      expect(final.scale).toEqual([1, 1, 1]);
      expect(final.phase).toBe('seated');
      expect(sampleEiffelAssemblyPart(part, part.start - 1e-6).visible).toBe(false);
      expect(sampleEiffelAssemblyPart(part, part.start).position).not.toEqual(part.center);
    }
  });

  it('keeps each cargo continuous across all phase boundaries and backwards seeks', () => {
    for (const part of plan.parts) {
      for (const f of [0, .08, .42, .5, .74, .9, 1]) {
        const t = part.start + (part.end - part.start) * f;
        const a = sampleEiffelAssemblyPart(part, t - 1e-9);
        const b = sampleEiffelAssemblyPart(part, t + 1e-9);
        expect(Math.hypot(...a.position.map((x, i) => x - b.position[i]))).toBeLessThan(.001);
        expect(a.scale).toEqual(b.scale);
      }
      const mid = part.start + (part.end - part.start) * .62;
      const before = sampleEiffelAssemblyPart(part, mid);
      sampleEiffelAssemblyPart(part, 1);
      expect(sampleEiffelAssemblyPart(part, mid)).toEqual(before);
      expect(before.boomTip[1]).toBeGreaterThan(before.hook[1]);
    }
  });

  it('uses independent exported envelope bottoms to meet the wagon surface', () => {
    for (const part of plan.parts) {
      for (const f of [.1, .23, .41]) {
        const state = sampleEiffelAssemblyPart(part, part.start + (part.end - part.start) * f);
        const transformedBottom = part.boundsMin[1] + state.position[1] - part.center[1];
        expect(Math.abs(transformedBottom - state.wagon.bedY)).toBeLessThan(.00001);
        expect(Math.abs(state.wagon.bedY - eiffelAssemblyGroundSupport(part, state.position[0], state.position[2]) - .85)).toBeLessThan(.00001);
      }
    }
  });

  it('seats every preceding stage before the next stage starts and caps active cargo', () => {
    for (let i = 1; i < plan.stages.length; i++) expect(plan.stages[i]!.start).toBeGreaterThanOrEqual(plan.stages[i - 1]!.end - 1e-12);
    for (let i = 0; i <= 2000; i++) {
      const t = i / 2000;
      const active = plan.parts.filter(p => t >= p.start && t < p.end);
      expect(active.length).toBeLessThanOrEqual(EIFFEL_ASSEMBLY_MAX_ACTIVE);
    }
  });
});
