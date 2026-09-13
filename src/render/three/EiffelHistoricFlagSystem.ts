import { BufferAttribute, DoubleSide, Group, Mesh, type BufferGeometry, type Material } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { eiffelHistoricFlagWindOffset } from '../../engine/eiffelHistoricFlag';

export const EIFFEL_HISTORIC_FLAG_ASSET = '/models/eiffel-historic-flag/flag.glb';
export const EIFFEL_HISTORIC_FLAG_MANIFEST = '/models/eiffel-historic-flag/flag.manifest.json';

export interface EiffelHistoricFlagManifest {
  readonly version: 1;
  readonly asset: 'flag.glb';
  readonly coordinates: string;
  readonly anchor: readonly [number, number, number];
  readonly width: number;
  readonly height: number;
  readonly triangles: number;
  readonly stripes: readonly ['blue', 'white', 'red'];
  readonly windAxis: 'local Z';
  readonly fixedHoistX: 0;
  readonly interpretation: string;
  readonly source: string;
}

interface Cloth {
  readonly mesh: Mesh;
  readonly geometry: BufferGeometry;
  readonly base: Float32Array;
  readonly position: BufferAttribute;
  readonly uv: BufferAttribute;
}

async function assetBytes(url: string): Promise<ArrayBuffer> {
  try { const response = await fetch(url); if (response.ok) return response.arrayBuffer(); } catch { /* Node fallback. */ }
  if (typeof process === 'undefined' || !process.versions?.node) throw Error(`Historic flag asset missing: ${url}`);
  const [{ readFileSync }, { resolve }] = await Promise.all([import('node:fs'), import('node:path')]);
  const buffer = readFileSync(resolve(process.cwd(), `public${url}`));
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

async function manifestJson(): Promise<EiffelHistoricFlagManifest> {
  try { const response = await fetch(EIFFEL_HISTORIC_FLAG_MANIFEST); if (response.ok) return response.json() as Promise<EiffelHistoricFlagManifest>; } catch { /* Node fallback. */ }
  if (typeof process === 'undefined' || !process.versions?.node) throw Error('Historic flag manifest missing');
  const [{ readFileSync }, { resolve }] = await Promise.all([import('node:fs'), import('node:path')]);
  return JSON.parse(readFileSync(resolve(process.cwd(), `public${EIFFEL_HISTORIC_FLAG_MANIFEST}`), 'utf8')) as EiffelHistoricFlagManifest;
}

/** Final-state furnishing attached to the existing mast. The source matrices
 * are baked before local-Z deformation so GLTF axis wrappers cannot rotate the
 * authored wind frame. */
export class EiffelHistoricFlagSystem {
  readonly group = new Group();
  readonly ready: Promise<void>;
  manifest: EiffelHistoricFlagManifest | null = null;
  private readonly cloth: Cloth[] = [];
  private readonly materials = new Set<Material>();
  private disposed = false;
  private seconds = 0;
  private supported = false;

  constructor() {
    this.group.name = 'eiffel-historic-flag';
    this.group.visible = false;
    this.ready = this.load().catch(error => { this.dispose(); throw error; });
  }

  private async load(): Promise<void> {
    const [bytes, manifest] = await Promise.all([assetBytes(EIFFEL_HISTORIC_FLAG_ASSET), manifestJson()]);
    if (manifest.version !== 1 || manifest.windAxis !== 'local Z' || manifest.fixedHoistX !== 0) throw Error('Unsupported historic flag manifest');
    const source = (await new GLTFLoader().parseAsync(bytes, '')).scene;
    source.updateMatrixWorld(true);
    const decodedGeometry = new Set<BufferGeometry>();
    source.traverse(object => {
      if (!(object instanceof Mesh)) return;
      decodedGeometry.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) this.materials.add(material);
      if (object.userData.wf_flag_cloth !== true) return;
      if (Array.isArray(object.material)) throw Error('Historic flag cloth requires one material per stripe');
      const geometry = object.geometry.clone().applyMatrix4(object.matrixWorld);
      const position = geometry.getAttribute('position');
      const uv = geometry.getAttribute('uv');
      if (!(position instanceof BufferAttribute) || !(uv instanceof BufferAttribute) || uv.count !== position.count) throw Error(`Historic flag cloth ${object.name} requires matched position and UV attributes`);
      const mesh = new Mesh(geometry, object.material);
      mesh.name = object.name;
      mesh.castShadow = true;
      mesh.material.side = DoubleSide;
      this.cloth.push({ mesh, geometry, base: new Float32Array(position.array as ArrayLike<number>), position, uv });
    });
    for (const geometry of decodedGeometry) geometry.dispose();
    if (this.cloth.length !== 3) throw Error(`Historic flag requires three cloth stripes; found ${this.cloth.length}`);
    if (this.disposed) {
      for (const cloth of this.cloth) cloth.geometry.dispose();
      for (const material of this.materials) material.dispose();
      this.cloth.length = 0;
      return;
    }
    this.manifest = manifest;
    this.group.position.set(...manifest.anchor);
    for (const cloth of this.cloth) this.group.add(cloth.mesh);
    this.group.userData.authoredDimensions = [manifest.width, manifest.height];
    this.group.userData.interpretation = manifest.interpretation;
    this.group.userData.ready = true;
    this.update(this.seconds, this.supported);
  }

  update(seconds: number, supported: boolean): void {
    if (!Number.isFinite(seconds)) throw Error('Historic flag time must be finite');
    this.seconds = seconds;
    this.supported = supported;
    this.group.visible = supported && this.manifest !== null && !this.disposed;
    for (const cloth of this.cloth) {
      for (let i = 0; i < cloth.position.count; i++) {
        const j = i * 3;
        cloth.position.setXYZ(i, cloth.base[j]!, cloth.base[j + 1]!, cloth.base[j + 2]! + eiffelHistoricFlagWindOffset(seconds, cloth.uv.getX(i), cloth.uv.getY(i)));
      }
      cloth.position.needsUpdate = true;
      cloth.geometry.computeVertexNormals();
      cloth.geometry.computeBoundingSphere();
    }
    this.group.userData.supported = supported;
    this.group.userData.seconds = seconds;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const cloth of this.cloth) cloth.geometry.dispose();
    for (const material of this.materials) material.dispose();
    this.cloth.length = 0;
    this.group.clear();
    this.group.visible = false;
  }
}
