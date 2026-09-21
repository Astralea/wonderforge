import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Mesh,
  type Object3D,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const SYDNEY_HARBOUR_KIT_GLB = '/models/sydney/harbour-kit.glb';
export const SYDNEY_SAIL_GLB = (id: number) => `/models/sydney/sail-${id}.glb`;

export type SydneyKitRole = 'tile' | 'granite' | 'stone' | 'void' | 'timber' | 'foliage' | 'roof';

export const SYDNEY_ROLE_COLOR: Record<SydneyKitRole, Color> = {
  tile: new Color('#f4eee4'),
  granite: new Color('#a88878'),
  stone: new Color('#c4b49a'),
  void: new Color('#1a2833'),
  timber: new Color('#6a4a32'),
  foliage: new Color('#3a5a34'),
  roof: new Color('#6e4636'),
};

export interface SydneyHarbourKit {
  podium: Object3D;
  office: Object3D;
  shed: Object3D;
  fig: Object3D;
}

async function readPublicBuffer(url: string): Promise<ArrayBuffer> {
  try {
    const response = await fetch(url);
    if (response.ok) return await response.arrayBuffer();
  } catch {
    /* Vitest may expose fetch without a preview server. */
  }
  if (typeof process === 'undefined' || !process.versions?.node) {
    throw new Error(`Sydney kit missing: ${url}`);
  }
  const { readFileSync } = await import('node:fs');
  const { resolve } = await import('node:path');
  const file = resolve(process.cwd(), `public${url}`);
  const buffer = readFileSync(file);
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

function findNamed(root: Object3D, name: string): Object3D {
  const found = root.getObjectByName(name);
  if (found) return found;
  throw new Error(`Sydney harbour prototype missing: ${name}`);
}

export function paintSydneyRole(name: string): SydneyKitRole {
  const n = name.toLowerCase();
  if (n.includes('tile') && !n.includes('roof')) return 'tile';
  if (n.includes('roof')) return 'roof';
  if (n.includes('window') || n.includes('void')) return 'void';
  if (n.includes('foliage') || n.includes('fig-crown')) return 'foliage';
  if (n.includes('trunk') || n.includes('timber') || n.includes('hall')) return 'timber';
  if (n.includes('granite') || n.includes('step') || n.includes('podium') || n.includes('plinth')) {
    return 'granite';
  }
  return 'stone';
}

function asNonIndexed(geometry: BufferGeometry): BufferGeometry {
  if (!geometry.index) return geometry;
  const next = geometry.toNonIndexed();
  geometry.dispose();
  return next;
}

function prepareGeometry(geometry: BufferGeometry): BufferGeometry {
  for (const name of Object.keys(geometry.attributes)) {
    if (name !== 'position' && name !== 'normal' && name !== 'uv' && name !== 'color') {
      geometry.deleteAttribute(name);
    }
  }
  return asNonIndexed(geometry);
}

function colorGeometry(geometry: BufferGeometry, color: Color): BufferGeometry {
  const count = geometry.getAttribute('position')?.count ?? 0;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  return geometry;
}

export function flattenSydneyRole(root: Object3D, role: SydneyKitRole): BufferGeometry | null {
  const pieces: BufferGeometry[] = [];
  root.updateWorldMatrix(true, true);
  const inverse = root.matrixWorld.clone().invert();
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    if (paintSydneyRole(object.name) !== role) return;
    const geometry = object.geometry.clone();
    geometry.applyMatrix4(inverse.clone().multiply(object.matrixWorld));
    colorGeometry(geometry, SYDNEY_ROLE_COLOR[role]);
    pieces.push(prepareGeometry(geometry));
  });
  if (pieces.length === 0) return null;
  const merged = mergeGeometries(pieces, false);
  for (const piece of pieces) piece.dispose();
  if (!merged) return null;
  merged.computeVertexNormals();
  return merged;
}

export function flattenSydneyRoles(root: Object3D, roles: readonly SydneyKitRole[]): BufferGeometry | null {
  const pieces: BufferGeometry[] = [];
  for (const role of roles) {
    const part = flattenSydneyRole(root, role);
    if (part) pieces.push(part);
  }
  if (pieces.length === 0) return null;
  if (pieces.length === 1) return pieces[0]!;
  const merged = mergeGeometries(pieces, false);
  for (const piece of pieces) piece.dispose();
  merged?.computeVertexNormals();
  return merged;
}

function meshGeometryAtOrigin(root: Object3D): BufferGeometry {
  const mesh = root instanceof Mesh ? root : (root.getObjectByProperty('type', 'Mesh') as Mesh | undefined);
  if (!mesh) throw new Error('Sydney sail GLB has no mesh');
  mesh.updateWorldMatrix(true, true);
  const geometry = prepareGeometry(mesh.geometry.clone());
  geometry.applyMatrix4(mesh.matrixWorld);
  geometry.computeVertexNormals();
  return geometry;
}

export async function loadSydneyHarbourKit(): Promise<SydneyHarbourKit> {
  const gltf = await new GLTFLoader().parseAsync(await readPublicBuffer(SYDNEY_HARBOUR_KIT_GLB), '');
  const root = gltf.scene;
  return {
    podium: findNamed(root, 'podium'),
    office: findNamed(root, 'office-tower'),
    shed: findNamed(root, 'quay-shed'),
    fig: findNamed(root, 'moreton-bay-fig'),
  };
}

export async function loadSydneySailGeometry(id: number): Promise<BufferGeometry> {
  const gltf = await new GLTFLoader().parseAsync(await readPublicBuffer(SYDNEY_SAIL_GLB(id)), '');
  return meshGeometryAtOrigin(gltf.scene);
}

export async function loadSydneySailGeometries(): Promise<BufferGeometry[]> {
  return Promise.all(Array.from({ length: 9 }, (_, id) => loadSydneySailGeometry(id)));
}
