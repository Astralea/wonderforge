import { readFileSync } from 'node:fs';
import { Box3, Mesh } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import model from '../artifacts/eiffel-upper-material-chain-2026-09-08/entrance/model.json';
import { eiffelTerrainHeightAt } from '../src/engine/eiffelTerrain';
import { EIFFEL_PHOTO_ENTRANCE_GLB, loadEiffelPhotoEntrance } from '../src/render/three/eiffelPhotoEntrance';

describe('PH76865-inspired Paris entrance asset', () => {
  it('keeps the authored world footprint and every declared terrain contact', async () => {
    expect(model.worldBaked).toBe(true);
    expect(model.center).toEqual([-118, -0.20556048223558532, 14]);
    expect(model.yaw).toBeCloseTo(Math.PI / 2, 15);
    for (const [x, y, z] of model.groundContacts) {
      expect(Math.abs(y - eiffelTerrainHeightAt(x, z)), `terrain contact ${x},${z}`).toBeLessThan(2e-4);
    }
    const source = readFileSync(`public${EIFFEL_PHOTO_ENTRANCE_GLB}`);
    const gltf = await new GLTFLoader().parseAsync(source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength), '');
    gltf.scene.updateMatrixWorld(true);
    const box = new Box3().setFromObject(gltf.scene);
    expect(box.min.toArray()).toEqual(expect.arrayContaining([
      expect.closeTo(-120.25, 4), expect.closeTo(-.2107404, 4), expect.closeTo(6.895, 4),
    ]));
    expect(box.max.toArray()).toEqual(expect.arrayContaining([
      expect.closeTo(-115.92, 4), expect.closeTo(3.1815593, 4), expect.closeTo(21.105, 4),
    ]));
    expect(box.max.x).toBeLessThan(-115.5);
    expect(box.max.z).toBeLessThan(21.2);
  });

  it('merges 145 source objects into no more than ten shadow-casting material batches', async () => {
    const entrance = await loadEiffelPhotoEntrance();
    expect(entrance.name).toBe('eiffel-photo-entrance');
    expect(entrance.userData.worldBaked).toBe(true);
    expect(entrance.children.length).toBeGreaterThan(0);
    expect(entrance.children.length).toBeLessThanOrEqual(10);
    entrance.traverse(object => {
      if (!(object instanceof Mesh)) return;
      expect(object.castShadow).toBe(true);
      expect(object.receiveShadow).toBe(true);
      expect(object.geometry.getAttribute('position').count).toBeGreaterThan(0);
    });
  });

  it('drops decoded geometry when its owner was disposed during loading', async () => {
    const entrance = await loadEiffelPhotoEntrance(() => true);
    expect(entrance.children).toHaveLength(0);
  });
});
