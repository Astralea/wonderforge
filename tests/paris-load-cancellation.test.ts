import {afterEach, expect, it, vi} from 'vitest';
import {gzipSync} from 'node:zlib';
import {BoxGeometry, Group, Mesh, MeshStandardMaterial, Texture} from 'three';
import {GLTFLoader, type GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {loadEiffelParisCity} from '../src/render/three/eiffelParis';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('releases a cancelled decoded city before batching, including shared textures and bitmaps', async () => {
  const close = vi.fn();
  const texture = new Texture({close} as unknown as HTMLImageElement);
  const material = new MeshStandardMaterial({map: texture, roughnessMap: texture});
  const geometry = new BoxGeometry(1, 1, 1);
  const source = new Group();
  source.add(new Mesh(geometry, material), new Mesh(geometry, material));
  const geometryDispose = vi.spyOn(geometry, 'dispose');
  const materialDispose = vi.spyOn(material, 'dispose');
  const textureDispose = vi.spyOn(texture, 'dispose');
  vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array(gzipSync(new Uint8Array())))));
  vi.spyOn(GLTFLoader.prototype, 'parseAsync').mockResolvedValue({scene: source} as GLTF);
  const owner = {disposed: false};
  const pending = loadEiffelParisCity(() => owner.disposed);
  owner.disposed = true;
  const result = await pending;
  expect(result.children).toHaveLength(0);
  expect(result.getObjectByName('eiffel-paris-1889-city')).toBeUndefined();
  expect(geometryDispose).toHaveBeenCalledOnce();
  expect(materialDispose).toHaveBeenCalledOnce();
  expect(textureDispose).toHaveBeenCalledOnce();
  expect(close).toHaveBeenCalledOnce();
});
