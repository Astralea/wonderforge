import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BatchedMesh, Matrix4, Vector3 } from 'three';
import { EiffelKitSystem, type EiffelKitState } from '../src/render/three/EiffelKitSystem';
import type { EiffelKitManifest } from '../src/data/eiffelKitTypes';

const manifest = JSON.parse(readFileSync('public/models/eiffel-construction-kit/tower-kit.manifest.json', 'utf8')) as EiffelKitManifest;
const fixture = new Map([
  ['/models/eiffel-construction-kit/tower-kit.glb', readFileSync('public/models/eiffel-construction-kit/tower-kit.glb')],
  ['/models/eiffel-construction-kit/tower-kit-seated.glb', readFileSync('public/models/eiffel-construction-kit/tower-kit-seated.glb')],
  ['/models/eiffel-construction-kit/tower-kit.runtime.json', readFileSync('public/models/eiffel-construction-kit/tower-kit.runtime.json')],
]);
function installFetch() {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const bytes = fixture.get(url);
    if (!bytes) return new Response('', { status: 404 });
    return new Response(new Uint8Array(bytes));
  }));
}
afterEach(() => vi.unstubAllGlobals());
function matrices(system: EiffelKitSystem): number[] {
  const result: number[] = [];
  system.group.traverse(object => {
    if (!(object instanceof BatchedMesh)) return;
    const matrix = new Matrix4(); result.push(object.instanceCount);
    for (let i = 0; i < object.instanceCount; i++) {
      result.push(Number(object.getVisibleAt(i)), ...object.getMatrixAt(i, matrix).toArray());
    }
  });
  return result;
}

describe('rigid Eiffel kit renderer', () => {
  it('compacts only fully seated source members and reproduces rigid reverse seeks', async () => {
    installFetch();
    const sourceCounts = new Map<string, number>();
    for (const p of manifest.parts) sourceCounts.set(p.sourceMember, (sourceCounts.get(p.sourceMember) ?? 0) + 1);
    const splitSource = [...sourceCounts].find(([source, count]) => source.startsWith('shaft-00/') && count > 3)![0];
    const children = manifest.parts.filter(p => p.sourceMember === splitSource);
    const moving = children[0]!;
    const system = new EiffelKitSystem((part, t): EiffelKitState => {
      if (t === 1 || part.sourceMember !== splitSource) return { phase: 'seated' };
      if (part.id !== moving.id) return { phase: 'seated' };
      if (t === 0) return { phase: 'queued' };
      return { phase: 'moving', pose: { position: [90, .85 + part.transportSize[1] / 2, 70], quaternion: [0, 0, 0, 1] } };
    });
    await system.ready;
    expect(system.group.userData.seatedSources).toBe(sourceCounts.size);
    expect(system.group.userData.majorShadowSources).toBe(368);
    expect(system.group.userData.visiblePieces).toBe(0);
    expect(system.group.userData.triangles).toBe(manifest.metadata.seatedTriangles);
    expect(system.group.userData.triangles).toBeLessThan(90_000);
    const sourceGeometry = system.group.children.map(object => {
      const mesh = object as BatchedMesh;
      const position = mesh.geometry.getAttribute('position');
      return [position.count, mesh.geometry.index?.count ?? 0, ...Array.from(position.array).slice(0, 24)];
    });
    const sourceMatrices = matrices(system);
    system.setShadowCamera(new Vector3(600, 300, 400), true);
    expect(system.group.userData.shadowDetail).toBe('major-iron');
    let majorIronCasters = 0;
    let fineIronNonCasters = 0;
    system.group.traverse(object => {
      if (!(object instanceof BatchedMesh)) return;
      if (object.name.includes('-iron-') && !object.name.includes('-dark-iron-')) {
        if (object.castShadow) majorIronCasters++;
        else fineIronNonCasters++;
      }
      else if (object.name.includes('-gold-')) expect(object.castShadow).toBe(false);
      else expect(object.castShadow).toBe(true);
    });
    expect(majorIronCasters).toBeGreaterThan(0);
    expect(fineIronNonCasters).toBeGreaterThan(0);
    expect(matrices(system)).toEqual(sourceMatrices);
    expect(system.group.children.map(object => {
      const mesh = object as BatchedMesh;
      const position = mesh.geometry.getAttribute('position');
      return [position.count, mesh.geometry.index?.count ?? 0, ...Array.from(position.array).slice(0, 24)];
    })).toEqual(sourceGeometry);
    system.setShadowCamera(new Vector3(20, 180, 30), true);
    expect(system.group.userData.shadowDetail).toBe('source');
    system.group.traverse(object => {
      if (object instanceof BatchedMesh) expect(object.castShadow).toBe(!object.name.includes('-gold-'));
    });
    system.setShadowCamera(new Vector3(600, 300, 400), false);
    system.group.traverse(object => {
      if (object instanceof BatchedMesh) expect(object.castShadow).toBe(!object.name.includes('-gold-'));
    });
    expect(matrices(system)).toEqual(sourceMatrices);
    system.setShadowCamera(new Vector3(600, 300, 400), false, true);
    expect(system.group.userData.shadowDetail).toBe('major-iron');
    expect(matrices(system)).toEqual(sourceMatrices);
    system.setShadowCamera(new Vector3(20, 180, 30), false, true);
    expect(system.group.userData.shadowDetail).toBe('source');
    expect(matrices(system)).toEqual(sourceMatrices);
    system.update(0);
    expect(system.group.userData.seatedSources).toBe(sourceCounts.size - 1);
    expect(system.group.userData.visiblePieces).toBe(children.length - 1);
    system.update(.5);
    expect(system.group.userData.visiblePieces).toBe(children.length);
    const forward = matrices(system);
    // Independently inspect transformed draw vertices around the horizontal
    // transported member; no matching source copy may remain at the seat.
    const point = new Vector3(); const matrix = new Matrix4();
    let carriedMin = Infinity; let carriedMax = -Infinity; let vertices = 0;
    system.group.traverse(object => {
      if (!(object instanceof BatchedMesh)) return;
      const positions = object.geometry.getAttribute('position');
      for (let i = 0; i < object.instanceCount; i++) {
        if (!object.getVisibleAt(i)) continue;
        object.getMatrixAt(i, matrix);
        if (Math.abs(matrix.elements[12]! - 90) > .01 || Math.abs(matrix.elements[14]! - 70) > .01) continue;
        for (let v = 0; v < positions.count; v++) {
          point.fromBufferAttribute(positions, v).applyMatrix4(matrix);
          carriedMin = Math.min(carriedMin, point.y); carriedMax = Math.max(carriedMax, point.y); vertices++;
        }
      }
    });
    expect(vertices).toBeGreaterThan(0);
    expect(carriedMin).toBeCloseTo(.85, 4);
    expect(carriedMax - carriedMin).toBeCloseTo(moving.transportSize[1], 4);
    system.update(1); system.update(.5);
    expect(matrices(system)).toEqual(forward);
    system.dispose();
    expect(system.group.children).toHaveLength(0);
  }, 30_000);

  it('does not attach a late asset completion after disposal', async () => {
    let release!: () => void;
    const pause = new Promise<void>(resolve => { release = resolve; });
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      await pause;
      return new Response(new Uint8Array(fixture.get(url)!));
    }));
    const system = new EiffelKitSystem();
    system.dispose(); release(); await system.ready;
    expect(system.manifest).toBeNull();
    expect(system.group.children).toHaveLength(0);
  }, 30_000);
});
