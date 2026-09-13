import { Group, Mesh, type BufferGeometry, type Material, type Object3D } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ForbiddenCityManifest } from '../../data/forbiddenCityTypes';

export const FORBIDDEN_CITY_CANDIDATE_BASE = '/artifacts/forbidden-city-rebuild-2026-09-09/model';
export const FORBIDDEN_CITY_PUBLIC_BASE = '/models/forbidden-city';

export interface ForbiddenCityAssetUrls {
  readonly kit: string;
  readonly site: string;
  readonly construction: string;
  readonly manifest: string;
}

export const forbiddenCityAssetUrls = (base = FORBIDDEN_CITY_CANDIDATE_BASE): ForbiddenCityAssetUrls => ({
  kit: `${base}/palace-kit.glb`, site: `${base}/site.glb`, construction: `${base}/construction.glb`, manifest: `${base}/palace.manifest.json`,
});

export interface ForbiddenCityAssetSet {
  readonly kit: Group;
  readonly site: Group;
  readonly construction: Group;
  readonly manifest: ForbiddenCityManifest;
}

async function responseBytes(url: string): Promise<ArrayBuffer> {
  try { const response = await fetch(url); if (response.ok) return response.arrayBuffer(); } catch { /* Node fallback. */ }
  if (typeof process === 'undefined' || !process.versions?.node) throw Error(`Forbidden City asset missing: ${url}`);
  const [{ readFileSync }, { resolve }] = await Promise.all([import('node:fs'), import('node:path')]);
  const relative = url.startsWith('/artifacts/') ? url.slice(1) : url.startsWith('/models/') ? `public${url}` : url;
  const bytes = readFileSync(resolve(process.cwd(), relative));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

async function responseJson<T>(url: string): Promise<T> {
  try { const response = await fetch(url); if (response.ok) return response.json() as Promise<T>; } catch { /* Node fallback. */ }
  if (typeof process === 'undefined' || !process.versions?.node) throw Error(`Forbidden City manifest missing: ${url}`);
  const [{ readFileSync }, { resolve }] = await Promise.all([import('node:fs'), import('node:path')]);
  const relative = url.startsWith('/artifacts/') ? url.slice(1) : url.startsWith('/models/') ? `public${url}` : url;
  return JSON.parse(readFileSync(resolve(process.cwd(), relative), 'utf8')) as T;
}

export function disposeForbiddenCityRoot(root: Object3D, disposeMaterials = true): void {
  const geometries = new Set<BufferGeometry>(), materials = new Set<Material>();
  root.traverse(object => {
    if (!(object instanceof Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
  });
  for (const geometry of geometries) geometry.dispose();
  if (disposeMaterials) for (const material of materials) material.dispose();
  root.clear();
}

export async function loadForbiddenCityAssetSet(
  urls: ForbiddenCityAssetUrls = forbiddenCityAssetUrls(),
  discarded: () => boolean = () => false,
): Promise<ForbiddenCityAssetSet> {
  const [kitBytes, siteBytes, constructionBytes, manifest] = await Promise.all([
    responseBytes(urls.kit), responseBytes(urls.site), responseBytes(urls.construction), responseJson<ForbiddenCityManifest>(urls.manifest),
  ]);
  if (manifest.version !== 1 || manifest.units !== 'metres' || manifest.coordinates !== 'Y up' || manifest.durationSeconds !== 180) throw Error('Unsupported Forbidden City manifest');
  const loader = new GLTFLoader();
  const [kit, site, construction] = (await Promise.all([
    loader.parseAsync(kitBytes, ''), loader.parseAsync(siteBytes, ''), loader.parseAsync(constructionBytes, ''),
  ])).map(gltf => gltf.scene);
  const result = { kit, site, construction, manifest };
  if (discarded()) {
    disposeForbiddenCityRoot(kit); disposeForbiddenCityRoot(site); disposeForbiddenCityRoot(construction);
  }
  return result;
}

/** Static source geometry is transformed once and merged only within an exact
 * imported material object. Attribute intersection prevents mixed UV/color
 * source meshes from making BufferGeometryUtils reject an otherwise safe batch. */
export function batchForbiddenCityStatic(source: Group, name: string, maxBatches = 90): Group {
  source.updateMatrixWorld(true);
  const byMaterial = new Map<Material, BufferGeometry[]>(), originals = new Set<BufferGeometry>();
  source.traverse(object => {
    if (!(object instanceof Mesh)) return;
    if (Array.isArray(object.material)) throw Error(`${name} requires one material per mesh`);
    originals.add(object.geometry);
    const list = byMaterial.get(object.material) ?? [];
    list.push(object.geometry.clone().applyMatrix4(object.matrixWorld)); byMaterial.set(object.material, list);
  });
  const group = new Group(); group.name = name;
  try {
    if (byMaterial.size > maxBatches) throw Error(`${name} exceeds ${maxBatches} material batches`);
    for (const [material, geometries] of byMaterial) {
      const common = geometries.map(geometry => new Set(Object.keys(geometry.attributes)))
        .reduce((left, right) => new Set([...left].filter(attribute => right.has(attribute))));
      const compatible = geometries.map(geometry => {
        const next = geometry.index ? geometry.toNonIndexed() : geometry.clone();
        for (const attribute of Object.keys(next.attributes)) if (!common.has(attribute)) next.deleteAttribute(attribute);
        return next;
      });
      const merged = mergeGeometries(compatible, false);
      for (const geometry of [...geometries, ...compatible]) geometry.dispose();
      if (!merged) throw Error(`${name} geometry batching failed`);
      const mesh = new Mesh(merged, material); mesh.castShadow = true; mesh.receiveShadow = true;
      group.add(mesh);
    }
    for (const geometry of originals) geometry.dispose();
    group.userData.batchCount = group.children.length;
    return group;
  } catch (error) {
    for (const geometries of byMaterial.values()) for (const geometry of geometries) geometry.dispose();
    for (const geometry of originals) geometry.dispose();
    disposeForbiddenCityRoot(group, false);
    throw error;
  }
}
