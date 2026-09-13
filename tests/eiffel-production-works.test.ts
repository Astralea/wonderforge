import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { InstancedMesh, Matrix4, Vector3 } from 'three';
import type { EiffelKitManifest } from '../src/data/eiffelKitTypes';
import {
  createEiffelProductionPlan,
  sampleEiffelProductionOperation,
} from '../src/engine/eiffelProductionConstruction';
import { eiffelTerrainHeightAt } from '../src/engine/eiffelTerrain';
import { EiffelProductionWorks } from '../src/render/three/EiffelProductionWorks';
const manifest = JSON.parse(
  readFileSync(
    'public/models/eiffel-construction-kit/tower-kit.manifest.json',
    'utf8',
  ),
) as EiffelKitManifest;
const plan = createEiffelProductionPlan(manifest);
const mesh = (works: EiffelProductionWorks, name: string) =>
  works.group.getObjectByName(name) as InstancedMesh;
describe('Eiffel visible production handoffs', () => {
  it('renders a carrier under foundation haul and a supported upper receiver', () => {
    const works = new EiffelProductionWorks();
    const foundation = plan.operations.find(
      (op) => op.part.group === 'foundation',
    )!;
    const upper = plan.operations.find((op) => op.part.group === 'leg')!;
    works.update([
      sampleEiffelProductionOperation(
        foundation,
        foundation.start + (foundation.end - foundation.start) * 0.2,
      ),
    ]);
    expect(mesh(works, 'eiffel-ground-and-freight-carriers').count).toBe(1);
    expect(mesh(works, 'eiffel-receiving-decks').count).toBe(0);
    expect(mesh(works, 'eiffel-carrier-haulers').count).toBe(2);
    expect(mesh(works, 'eiffel-carrier-handles').count).toBe(2);
    expect(mesh(works, 'eiffel-carrier-crew-heads').count).toBe(2);
    const feet = mesh(works, 'eiffel-carrier-crew-feet');
    expect(feet.count).toBe(4);
    for (let i = 0; i < feet.count; i++) {
      const m = new Matrix4(); feet.getMatrixAt(i, m);
      const sole = new Vector3(0, -.5, 0).applyMatrix4(m);
      expect(Math.abs(sole.y - eiffelTerrainHeightAt(sole.x, sole.z))).toBeLessThan(.03);
    }
    expect(mesh(works, 'eiffel-carrier-ground-feet').count).toBe(4);
    works.update([
      sampleEiffelProductionOperation(
        upper,
        upper.start + (upper.end - upper.start) * 0.06,
      ),
    ]);
    expect(mesh(works, 'eiffel-ground-and-freight-carriers').count).toBe(1);
    expect(mesh(works, 'eiffel-receiving-decks').count).toBe(1);
    expect(mesh(works, 'eiffel-receiver-grillage').count).toBe(2);
    expect(mesh(works, 'eiffel-carrier-haulers').count).toBe(0);
    expect(mesh(works, 'eiffel-carrier-handles').count).toBe(0);
    for (const name of [
      'eiffel-ground-and-freight-carriers',
      'eiffel-receiving-decks',
      'eiffel-receiver-grillage',
    ])
      expect(mesh(works, name).frustumCulled).toBe(false);
    works.dispose();
  });
});
