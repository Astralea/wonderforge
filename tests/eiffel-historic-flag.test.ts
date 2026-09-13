import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Box3, BufferAttribute, Mesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { describe, expect, it, vi } from 'vitest';
import manifest from '../public/models/eiffel-historic-flag/flag.manifest.json';
import kitManifest from '../public/models/eiffel-construction-kit/tower-kit.manifest.json';
import { EIFFEL_HISTORIC_FLAG_SUPPORT_PART_ID, eiffelHistoricFlagIsSupported, eiffelHistoricFlagWindOffset } from '../src/engine/eiffelHistoricFlag';
import { EiffelHistoricFlagSystem } from '../src/render/three/EiffelHistoricFlagSystem';

describe('1889 summit flag', () => {
  it('appears only after the actual final mast owner is seated', () => {
    const end = .997;
    expect(EIFFEL_HISTORIC_FLAG_SUPPORT_PART_ID).toBe('summit-crown-m072-c002');
    expect(eiffelHistoricFlagIsSupported(end - Number.EPSILON, end, [])).toBe(false);
    expect(eiffelHistoricFlagIsSupported(end, end, [])).toBe(true);
    expect(eiffelHistoricFlagIsSupported(1, end, [EIFFEL_HISTORIC_FLAG_SUPPORT_PART_ID])).toBe(false);
    expect(eiffelHistoricFlagIsSupported(1, undefined, [])).toBe(false);
  });

  it('uses a finite deterministic wave whose hoist edge is exactly fixed', () => {
    for (const seconds of [0, .01, 7.25, 91, 829.4267707038563]) {
      expect(eiffelHistoricFlagWindOffset(seconds, 0, .37)).toBe(0);
      for (const u of [.1, .5, 1]) for (const v of [0, .5, 1]) {
        const offset = eiffelHistoricFlagWindOffset(seconds, u, v);
        expect(offset).toBe(eiffelHistoricFlagWindOffset(seconds, u, v));
        expect(Number.isFinite(offset)).toBe(true);
        expect(Math.abs(offset)).toBeLessThanOrEqual(.205 * u * u + 1e-12);
      }
    }
    expect(() => eiffelHistoricFlagWindOffset(Number.NaN, .2, .3)).toThrow(/finite/);
  });

  it('loads the exact three-stripe asset, bakes its frame and reverses exactly', async () => {
    const bytes = readFileSync('public/models/eiffel-historic-flag/flag.glb');
    expect(createHash('sha256').update(bytes).digest('hex')).toBe('77dda59458e8abcadfe5807c29c386f537c486688bf3db5bfb2bb9ec6c3d7145');
    expect(manifest).toMatchObject({ version: 1, anchor: [.09, 310.9, 0], width: 8, height: 5, triangles: 720, windAxis: 'local Z', fixedHoistX: 0 });
    const system = new EiffelHistoricFlagSystem();
    await system.ready;
    expect(system.group.position.toArray()).toEqual(manifest.anchor);
    expect(system.group.children.map(child => child.name).sort()).toEqual(['tricolor-blue', 'tricolor-red', 'tricolor-white']);
    expect(Math.hypot(manifest.anchor[0], manifest.anchor[2])).toBeCloseTo(.09, 8);
    expect(system.group.children.reduce((sum, child) => {
      const geometry = (child as Mesh).geometry;
      return sum + (geometry.index?.count ?? geometry.getAttribute('position').count) / 3;
    }, 0)).toBe(manifest.triangles);
    expect(system.group.visible).toBe(false);
    const snapshot = () => system.group.children.map(child => Array.from(((child as Mesh).geometry.getAttribute('position') as BufferAttribute).array as ArrayLike<number>));
    system.update(17.5, true);
    const first = snapshot();
    system.update(88, true);
    system.update(17.5, true);
    expect(snapshot()).toEqual(first);
    let moving = 0, hoist = 0;
    for (const child of system.group.children) {
      const mesh = child as Mesh, position = mesh.geometry.getAttribute('position') as BufferAttribute, uv = mesh.geometry.getAttribute('uv') as BufferAttribute;
      system.update(0, true); const base = Array.from(position.array as ArrayLike<number>);
      system.update(4.25, true);
      for (let i = 0; i < position.count; i++) {
        const j = i * 3;
        if (uv.getX(i) === 0) {
          hoist++;
          expect(position.getX(i)).toBe(base[j]);
          expect(position.getY(i)).toBe(base[j + 1]);
          expect(position.getZ(i)).toBe(base[j + 2]);
        } else if (Math.abs(position.getZ(i) - base[j + 2]!) > 1e-6) moving++;
      }
    }
    expect(hoist).toBeGreaterThan(1);
    expect(moving).toBeGreaterThan(100);
    system.update(4.25, false);
    expect(system.group.visible).toBe(false);
    system.dispose();
  });

  it('places the complete exported hoist edge on the two actual mast faces', async () => {
    const towerBytes = readFileSync('public/models/eiffel-construction-kit/tower-kit.glb');
    const tower = (await new GLTFLoader().parseAsync(towerBytes.buffer.slice(towerBytes.byteOffset, towerBytes.byteOffset + towerBytes.byteLength), '')).scene;
    tower.updateMatrixWorld(true);
    const mastIds = ['summit-crown-m072-c001', EIFFEL_HISTORIC_FLAG_SUPPORT_PART_ID];
    const mastBounds = new Map<string, Box3>();
    tower.traverse(object => {
      if (object instanceof Mesh && mastIds.includes(String(object.userData.wf_part))) mastBounds.set(String(object.userData.wf_part), new Box3().setFromObject(object));
    });
    expect([...mastBounds.keys()].sort()).toEqual([...mastIds].sort());
    const lower = mastBounds.get(mastIds[0]!)!, upper = mastBounds.get(mastIds[1]!)!;
    expect(lower.max.y).toBeCloseTo(upper.min.y, 4);
    expect(lower.max.x).toBeCloseTo(.09, 7);
    expect(upper.max.x).toBeCloseTo(.09, 7);

    const system = new EiffelHistoricFlagSystem();
    await system.ready; system.update(31.25, true); system.group.updateMatrixWorld(true);
    const edge: Vector3[] = [];
    system.group.traverse(object => {
      if (!(object instanceof Mesh)) return;
      const position = object.geometry.getAttribute('position') as BufferAttribute;
      const uv = object.geometry.getAttribute('uv') as BufferAttribute;
      for (let i = 0; i < position.count; i++) if (uv.getX(i) === 0) edge.push(new Vector3().fromBufferAttribute(position, i).applyMatrix4(object.matrixWorld));
    });
    expect(edge.length).toBeGreaterThan(1);
    for (const point of edge) {
      expect(point.x).toBeCloseTo(lower.max.x, 7);
      expect(point.z).toBeCloseTo(0, 8);
      expect(point.y).toBeGreaterThanOrEqual(lower.min.y - 1e-5);
      expect(point.y).toBeLessThanOrEqual(upper.max.y + 1e-5);
      expect(point.y >= upper.min.y - 1e-5 || point.y <= lower.max.y + 1e-5).toBe(true);
    }
    expect(Math.min(...edge.map(point => point.y))).toBeCloseTo(305.9, 7);
    expect(Math.max(...edge.map(point => point.y))).toBeCloseTo(310.9, 7);
    const owner = kitManifest.parts.find(part => part.id === EIFFEL_HISTORIC_FLAG_SUPPORT_PART_ID)!;
    expect(owner.sourceMember).toBe('summit-crown/member-072');
    expect(owner.transportSize).toEqual(expect.arrayContaining([expect.closeTo(4.6666666667, 7)]));
    expect(owner.boundsMin[1]).toBeCloseTo(upper.min.y, 4);
    expect(owner.boundsMax[1]).toBeCloseTo(upper.max.y, 4);
    system.dispose();
    tower.traverse(object => { if (object instanceof Mesh) object.geometry.dispose(); });
  });

  it('drops decoded resources when disposed before the async load resolves', async () => {
    const glb = readFileSync('public/models/eiffel-historic-flag/flag.glb');
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    vi.stubGlobal('fetch', async (input: string | URL | Request) => {
      await gate;
      return String(input).endsWith('.json')
        ? new Response(JSON.stringify(manifest))
        : new Response(glb);
    });
    const system = new EiffelHistoricFlagSystem();
    system.dispose(); release(); await system.ready;
    expect(system.group.children).toHaveLength(0);
    expect(system.group.visible).toBe(false);
    vi.unstubAllGlobals();
  });
});
