import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Group, InstancedMesh } from 'three';
import { EiffelEnvironment } from '../src/render/three/EiffelEnvironment';
import { createMaterialLibrary } from '../src/render/three/MaterialLibrary';
import type { Wonder } from '../src/data/types';
import * as ParisAssets from '../src/render/three/eiffelParis';

vi.mock('../src/render/three/eiffelPalais', () => ({ loadEiffelPalaisGlb: vi.fn(async () => new Group()) }));
vi.mock('../src/render/three/eiffelPhotoEntrance', () => ({ loadEiffelPhotoEntrance: vi.fn(async () => new Group()) }));
// Preserve the real city reader for the fetch-rejection test below.
vi.mock('../src/render/three/eiffelParis', async importOriginal => ({
  ...await importOriginal<typeof import('../src/render/three/eiffelParis')>(),
  loadEiffelParisCity: vi.fn(), loadEiffelParisLife: vi.fn(),
}));

// Captured before this lazy-allocation change: full capacity matrices/colors,
// not regenerated expectations from the implementation under test.
const baseline = JSON.parse(readFileSync(new URL('./helpers/eiffel-scatter-before.json', import.meta.url), 'utf8'));
const wonder = { palette: { ground: '#7a6a55', primary: '#c9b18a', accent: '#8a6f4d', sky: '#87b5d6' } } as Wonder;
const environments: EiffelEnvironment[] = [];
function make(rebuilt = true) {
  const environment = new EiffelEnvironment(createMaterialLibrary(wonder), rebuilt);
  environments.push(environment); return environment;
}
const pending = <T>() => {
  let resolve!: (value: T) => void, reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
function deferredAssets() {
  const city = pending<Group>();
  const life = pending<Awaited<ReturnType<typeof ParisAssets.loadEiffelParisLife>>>();
  vi.mocked(ParisAssets.loadEiffelParisCity).mockReturnValueOnce(city.promise);
  vi.mocked(ParisAssets.loadEiffelParisLife).mockReturnValueOnce(life.promise);
  return { city, life };
}
function scatter(environment: EiffelEnvironment, key: string): InstancedMesh | undefined {
  return (environment as unknown as Record<string, InstancedMesh>)[key];
}
function snapshot(mesh: InstancedMesh) {
  const hash = createHash('sha256').update(Buffer.from(mesh.instanceMatrix.array.buffer));
  if (mesh.instanceColor) hash.update(Buffer.from(mesh.instanceColor.array.buffer));
  return { count: mesh.count, hash: hash.digest('hex') };
}
function checkOriginal(environment: EiffelEnvironment, rebuilt: boolean, keys = Object.keys(baseline[String(rebuilt)].scatter)) {
  for (const key of keys) expect(snapshot(scatter(environment, key)!), key).toEqual(baseline[String(rebuilt)].scatter[key]);
}
function resources(environment: EiffelEnvironment) {
  const internals = environment as unknown as { geometries: unknown[]; materials: unknown[] };
  return { geometries: internals.geometries.length, materials: internals.materials.length };
}
const lifeAsset = () => ({ root: new Group(), prototypes: new Map() });
afterEach(() => { environments.splice(0).forEach(environment => environment.dispose()); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Eiffel deferred environment fallback', () => {
  it('does no eager fallback mesh or matrix preparation and preserves every actual quay tree', async () => {
    const { city, life } = deferredAssets();
    const writes = vi.spyOn(InstancedMesh.prototype, 'setMatrixAt');
    const environment = make();
    const eager = writes.mock.calls.length;
    checkOriginal(environment, true, ['trees', 'trunks']);
    for (const key of Object.keys(baseline.true.scatter).filter(key => key !== 'trees' && key !== 'trunks')) {
      expect(scatter(environment, key), key).toBeUndefined();
    }
    expect(environment.group.getObjectByName('eiffel-ecole-militaire')).toBeUndefined();
    expect(environment.group.getObjectByName('eiffel-champ-allees')).toBeUndefined();
    expect(resources(environment)).toEqual({ geometries: 11, materials: 17 });
    city.reject(new Error('city unavailable')); life.reject(new Error('life unavailable'));
    await environment.ready;
    const recovery = writes.mock.calls.length - eager;
    // Includes InstancedMesh identity initialization plus authored placement.
    expect(recovery).toBe(19748);
    checkOriginal(environment, true);
    expect(scatter(environment, 'falsework')!.visible).toBe(false);
    expect(environment.group.getObjectByName('eiffel-ecole-militaire')!.visible).toBe(true);
    expect(environment.group.getObjectByName('eiffel-champ-allees')!.visible).toBe(true);
  });

  it('never constructs hidden fallbacks on successful city and life preparation', async () => {
    const { city, life } = deferredAssets(); const environment = make();
    city.resolve(new Group()); life.resolve(lifeAsset()); await environment.ready;
    expect(environment.parisSource).toBe('blender'); expect(environment.lifeSource).toBe('blender');
    expect(scatter(environment, 'houses')).toBeUndefined(); expect(scatter(environment, 'barges')).toBeUndefined();
    expect(environment.group.getObjectByName('eiffel-ecole-militaire')).toBeUndefined();
    checkOriginal(environment, true, ['trees', 'trunks']);
  });

  for (const failed of ['city', 'life'] as const) for (const failureFirst of [false, true]) {
    it(`shows only ${failed} fallback when failure completes ${failureFirst ? 'first' : 'last'}`, async () => {
      const { city, life } = deferredAssets(); const environment = make();
      const fail = async () => { (failed === 'city' ? city : life).reject(new Error('unavailable')); await Promise.resolve(); };
      const succeed = async () => { if (failed === 'city') life.resolve(lifeAsset()); else city.resolve(new Group()); await Promise.resolve(); };
      if (failureFirst) { await fail(); await succeed(); } else { await succeed(); await fail(); }
      await environment.ready; checkOriginal(environment, true);
      expect(scatter(environment, 'houses')!.visible).toBe(failed === 'city');
      expect(scatter(environment, 'stocks')!.visible).toBe(failed === 'city');
      expect(scatter(environment, 'forges')!.visible).toBe(failed === 'city');
      expect(scatter(environment, 'barges')!.visible).toBe(failed === 'life');
      expect(!!environment.group.getObjectByName('eiffel-ecole-militaire')).toBe(failed === 'city');
    });
  }

  it('recovers from a rejected actual city fetch in the browser path', async () => {
    const actual = await vi.importActual<typeof ParisAssets>('../src/render/three/eiffelParis');
    vi.mocked(ParisAssets.loadEiffelParisCity).mockImplementationOnce(actual.loadEiffelParisCity);
    vi.mocked(ParisAssets.loadEiffelParisLife).mockResolvedValueOnce(lifeAsset());
    const fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetch);
    // Browser readers cannot silently recover from the workstation's public/ directory.
    vi.stubGlobal('process', { ...process, versions: { ...process.versions, node: undefined } });
    const environment = make(); await environment.ready;
    expect(fetch).toHaveBeenCalledWith('/models/paris-1889/paris-city.glb');
    expect(environment.parisSource).toBe('procedural'); expect(environment.lifeSource).toBe('blender');
    expect(scatter(environment, 'houses')!.visible).toBe(true);
    expect(scatter(environment, 'barges')!.visible).toBe(false);
    checkOriginal(environment, true);
  });

  it('allocates nothing if a disposed owner receives late failures', async () => {
    const { city, life } = deferredAssets(); const environment = make();
    environment.dispose(); const before = resources(environment), children = environment.group.children.length;
    const writes = vi.spyOn(InstancedMesh.prototype, 'setMatrixAt');
    city.reject(new Error('late city failure')); life.reject(new Error('late life failure')); await environment.ready;
    expect(resources(environment)).toEqual(before); expect(environment.group.children).toHaveLength(children);
    expect(writes).not.toHaveBeenCalled(); expect(scatter(environment, 'houses')).toBeUndefined();
    environments.splice(environments.indexOf(environment), 1);
  });

  it('advances city load fraction while streets are still pending', async () => {
    const { city, life } = deferredAssets();
    const environment = make();
    expect(environment.loadFraction).toBe(0);
    await vi.waitFor(() => {
      expect(environment.loadFraction).toBeGreaterThan(0);
    });
    expect(environment.loadFraction).toBeLessThan(1);
    city.resolve(new Group());
    life.resolve(lifeAsset());
    await environment.ready;
    expect(environment.loadFraction).toBe(1);
  });

  it('preserves the eager legacy environment and all its matrices and colors', async () => {
    const environment = make(false); checkOriginal(environment, false); await environment.ready;
    expect(environment.group.getObjectByName('eiffel-ecole-militaire')!.visible).toBe(true);
    expect(environment.group.getObjectByName('eiffel-champ-allees')!.visible).toBe(true);
  });
});
