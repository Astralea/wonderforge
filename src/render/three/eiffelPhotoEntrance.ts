import { Group, Mesh, type BufferGeometry, type Material } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const EIFFEL_PHOTO_ENTRANCE_GLB = '/models/paris-1889/photo-entrance.glb';

async function bytes(): Promise<ArrayBuffer> {
  try { const response = await fetch(EIFFEL_PHOTO_ENTRANCE_GLB); if (response.ok) return response.arrayBuffer(); } catch { /* Node fallback below. */ }
  if (typeof process === 'undefined' || !process.versions?.node) throw Error('Paris photo entrance GLB missing');
  const [{ readFileSync }, { resolve }] = await Promise.all([import('node:fs'), import('node:path')]);
  const buffer = readFileSync(resolve(process.cwd(), `public${EIFFEL_PHOTO_ENTRANCE_GLB}`));
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

/** Loads the world-baked PH76865-inspired entrance and merges its static
 * meshes by authored material. The callback prevents a disposed environment
 * from retaining decoded GLTF resources after an asynchronous load. */
export async function loadEiffelPhotoEntrance(discarded: () => boolean = () => false): Promise<Group> {
  const source = (await new GLTFLoader().parseAsync(await bytes(), '')).scene;
  const originals = new Set<BufferGeometry>(), materials = new Set<Material>();
  source.updateMatrixWorld(true);
  const byMaterial = new Map<Material, BufferGeometry[]>();
  source.traverse(object => {
    if (!(object instanceof Mesh)) return;
    if (Array.isArray(object.material)) throw Error('Photo entrance requires one material per mesh');
    originals.add(object.geometry); materials.add(object.material);
    const pieces = byMaterial.get(object.material) ?? [];
    pieces.push(object.geometry.clone().applyMatrix4(object.matrixWorld));
    byMaterial.set(object.material, pieces);
  });
  const root = new Group(); root.name = 'eiffel-photo-entrance';
  try {
    if (byMaterial.size > 10) throw Error(`Photo entrance exceeds 10 material batches: ${byMaterial.size}`);
    for (const [material, sourcePieces] of byMaterial) {
      const common = sourcePieces.map(piece => new Set(Object.keys(piece.attributes)))
        .reduce((a, b) => new Set([...a].filter(attribute => b.has(attribute))));
      const pieces = sourcePieces.map(piece => {
        const compatible = piece.index ? piece.toNonIndexed() : piece.clone();
        for (const attribute of Object.keys(compatible.attributes)) if (!common.has(attribute)) compatible.deleteAttribute(attribute);
        return compatible;
      });
      const geometry = mergeGeometries(pieces, false);
      for (const piece of [...sourcePieces, ...pieces]) piece.dispose();
      if (!geometry) throw Error('Photo entrance geometry batching failed');
      const mesh = new Mesh(geometry, material); mesh.castShadow = true; mesh.receiveShadow = true;
      root.add(mesh);
    }
    for (const geometry of originals) geometry.dispose();
    if (discarded()) {
      root.traverse(object => { if (object instanceof Mesh) object.geometry.dispose(); });
      for (const material of materials) material.dispose();
      root.clear();
    }
    root.userData.reference = 'Paris Musees PH76865';
    root.userData.worldBaked = true;
    return root;
  } catch (error) {
    for (const pieces of byMaterial.values()) for (const piece of pieces) piece.dispose();
    for (const geometry of originals) geometry.dispose();
    for (const material of materials) material.dispose();
    throw error;
  }
}
