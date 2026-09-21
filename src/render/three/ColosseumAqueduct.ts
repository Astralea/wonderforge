import { BufferGeometry, Color, Float32BufferAttribute, Group, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, PerspectiveCamera, type Camera } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { COLOSSEUM_AQUEDUCT as A } from '../../data/colosseumAqueduct';
import { AQUEDUCT_LENGTH, AQUEDUCT_PITCH, aqueductPierAt, aqueductPointAt } from '../../engine/colosseumAqueduct';
import { createAqueductMaterial } from './aqueductMaterial';
import { ColosseumAqueductContinuation } from './ColosseumAqueductContinuation';

type AqueductKit = Record<'pier' | 'impost' | 'arch' | 'archPortrait' | 'channel', BufferGeometry>;
type Point = [number, number, number];
const BRICK = new Color('#a67156');
const ARCH_BRICK = new Color('#bd8967');
const CAP = new Color('#b79b7d');

/** Same modest silhouette as the authored kit, available if the file fails. */
function fallbackGeometry(kind: keyof AqueductKit): BufferGeometry {
  const positions: number[] = [], colors: number[] = [];
  const face = (points: Point[], color: Color) => {
    for (let i = 1; i < points.length - 1; i++) for (const p of [points[0]!, points[i]!, points[i + 1]!]) {
      positions.push(...p); colors.push(color.r, color.g, color.b);
    }
  };
  const box = (width: number, bottom: number, height: number, depth: number, color: Color, offsetX = 0) => {
    const x = width / 2, z = depth / 2, top = bottom + height;
    const p: Point[] = [[-x,bottom,z],[x,bottom,z],[x,top,z],[-x,top,z],[-x,bottom,-z],[x,bottom,-z],[x,top,-z],[-x,top,-z]];
    for (const point of p) point[0] += offsetX;
    for (const indices of [[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[3,2,6,7],[4,5,1,0]]) face(indices.map(i => p[i]!), color);
  };
  if (kind === 'pier') box(A.pierWidth, 0, 1, A.depth, BRICK);
  else if (kind === 'impost') box(A.pierWidth + .2, -.2, .2, A.depth + .2, ARCH_BRICK);
  else if (kind === 'channel') {
    box(AQUEDUCT_LENGTH + A.pierWidth, 0, A.channelHeight, A.depth, BRICK);
    box(AQUEDUCT_LENGTH + A.pierWidth, A.channelHeight, A.capHeight, A.capDepth, CAP);
    for (const sign of [-1, 1]) box(A.pierWidth / 2, -A.spandrelTop, A.spandrelTop, A.depth, BRICK, sign * (AQUEDUCT_LENGTH / 2 + A.pierWidth / 4));
  } else {
    const segments = kind === 'arch' ? A.desktopSegments : A.portraitSegments;
    const r = A.archRise, half = AQUEDUCT_PITCH / 2, d = A.depth / 2;
    const bottom = [[-half, 0], ...Array.from({length: segments + 1}, (_, i) => {
      const angle = Math.PI * (1 - i / segments);
      return [Math.cos(angle) * r, Math.sin(angle) * r];
    }), [half, 0]];
    for (let i = 0; i < bottom.length - 1; i++) {
      const [x0,y0] = bottom[i]!, [x1,y1] = bottom[i + 1]!;
      face([[x0!,y0!,d],[x1!,y1!,d],[x1!,A.spandrelTop,d],[x0!,A.spandrelTop,d]], BRICK);
      face([[x1!,y1!,-d],[x0!,y0!,-d],[x0!,A.spandrelTop,-d],[x1!,A.spandrelTop,-d]], BRICK);
      face([[x0!,y0!,d],[x0!,y0!,-d],[x1!,y1!,-d],[x1!,y1!,d]], ARCH_BRICK);
    }
    face([[-half,A.spandrelTop,d],[half,A.spandrelTop,d],[half,A.spandrelTop,-d],[-half,A.spandrelTop,-d]], BRICK);
    face([[-half,0,d],[-half,A.spandrelTop,d],[-half,A.spandrelTop,-d],[-half,0,-d]], BRICK);
    face([[half,0,-d],[half,A.spandrelTop,-d],[half,A.spandrelTop,d],[half,0,d]], BRICK);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export async function loadAqueductKit(): Promise<AqueductKit> {
  let buffer: ArrayBuffer | undefined;
  try {
    const response = await fetch(A.glb);
    if (response.ok) buffer = await response.arrayBuffer();
  } catch { /* Node tests use the exact shipped GLB from disk below. */ }
  if (!buffer && typeof process !== 'undefined' && process.versions?.node) {
    const { readFile } = await import('node:fs/promises');
    const data = await readFile(`${process.cwd()}/public${A.glb}`);
    buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  }
  if (!buffer) throw new Error('Neronian aqueduct kit unavailable');
  const { scene } = await new GLTFLoader().parseAsync(buffer, '');
  scene.updateMatrixWorld(true);
  const kit = {} as AqueductKit;
  const parts: Array<keyof AqueductKit> = ['pier', 'impost', 'arch', 'archPortrait', 'channel'];
  try {
    for (const key of parts) {
      const node = scene.getObjectByName(`aqueduct-${key}`);
      if (!node) throw new Error(`Aqueduct kit is missing ${key}`);
      const pieces: BufferGeometry[] = [];
      node.traverse(object => {
        if (!(object instanceof Mesh)) return;
        const copy = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
        copy.applyMatrix4(object.matrixWorld);
        for (const attribute of Object.keys(copy.attributes)) {
          if (!['position','normal','color'].includes(attribute)) copy.deleteAttribute(attribute);
        }
        // glTF COLOR_0 may be RGBA; normalize to the shared RGB buffer format.
        const color = copy.getAttribute('color');
        if (color?.itemSize === 4) {
          const rgb = new Float32Array(color.count * 3);
          for (let i = 0; i < color.count; i++) rgb.set([color.getX(i), color.getY(i), color.getZ(i)], i * 3);
          copy.setAttribute('color', new Float32BufferAttribute(rgb, 3));
        }
        pieces.push(copy);
      });
      const merged = mergeGeometries(pieces);
      pieces.forEach(piece => piece.dispose());
      if (!merged) throw new Error(`Aqueduct kit has incompatible ${key} geometry`);
      kit[key] = merged;
    }
    return kit;
  } catch (error) {
    Object.values(kit).forEach(geometry => geometry.dispose());
    throw error;
  } finally {
    const geometries = new Set<BufferGeometry>(), materials = new Set<MeshStandardMaterial>();
    scene.traverse(object => {
      if (!(object instanceof Mesh)) return;
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
  }
}

/** A watercourse basis: local X along the run, Y upright, Z across it. */
function placement(distance: number, y: number, height = 1): Matrix4 {
  const p = aqueductPointAt(distance), [dx,dz] = A.direction;
  return new Matrix4().set(dx,0,-dz,p.x, A.grade,height,0,y, dz,0,dx,p.z, 0,0,0,1);
}

export class ColosseumAqueduct {
  readonly group = new Group();
  readonly ready: Promise<void>;
  private disposed = false;
  private portrait = false;
  private kit: AqueductKit;
  private readonly material = createAqueductMaterial();
  private readonly piers: InstancedMesh;
  private readonly imposts: InstancedMesh;
  private readonly arches: InstancedMesh;
  private readonly channel: Mesh;
  private readonly continuation = new ColosseumAqueductContinuation();

  constructor() {
    this.group.name = 'colosseum-neronian-aqueduct';
    this.group.userData.asset = 'fallback';
    this.group.add(this.continuation.group);
    this.kit = Object.fromEntries(['pier','impost','arch','archPortrait','channel'].map(key => [key, fallbackGeometry(key as keyof AqueductKit)])) as AqueductKit;
    this.piers = new InstancedMesh(this.kit.pier, this.material, A.pierCount);
    this.imposts = new InstancedMesh(this.kit.impost, this.material, A.pierCount);
    this.arches = new InstancedMesh(this.kit.arch, this.material, A.pierCount - 1);
    this.channel = new Mesh(this.kit.channel, this.material);
    for (const [mesh, name] of [[this.piers,'piers'],[this.imposts,'imposts'],[this.arches,'arches'],[this.channel,'channel']] as const) {
      mesh.name = `colosseum-aqueduct-${name}`;
      mesh.castShadow = false; mesh.receiveShadow = true;
      this.group.add(mesh);
    }
    for (let i = 0; i < A.pierCount; i++) {
      const p = aqueductPierAt(i);
      this.piers.setMatrixAt(i, placement(p.distance, p.ground, p.springing - p.ground));
      this.imposts.setMatrixAt(i, placement(p.distance, p.springing));
      if (i < A.pierCount - 1) {
        const middle = p.distance + AQUEDUCT_PITCH / 2;
        this.arches.setMatrixAt(i, placement(middle, aqueductPointAt(middle).springing));
      }
    }
    for (const mesh of [this.piers, this.imposts, this.arches]) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
    this.channel.matrix.copy(placement(AQUEDUCT_LENGTH / 2, aqueductPointAt(AQUEDUCT_LENGTH / 2).springing + A.spandrelTop));
    this.channel.matrixAutoUpdate = false;
    this.ready = this.load();
  }

  private async load(): Promise<void> {
    try {
      const kit = await loadAqueductKit();
      if (this.disposed) { Object.values(kit).forEach(geometry => geometry.dispose()); return; }
      Object.values(this.kit).forEach(geometry => geometry.dispose());
      this.kit = kit;
      this.piers.geometry = kit.pier;
      this.imposts.geometry = kit.impost;
      this.arches.geometry = this.portrait ? kit.archPortrait : kit.arch;
      this.channel.geometry = kit.channel;
      for (const mesh of [this.piers, this.imposts, this.arches]) mesh.computeBoundingSphere();
      this.group.userData.asset = 'blender';
    } catch { /* Keep the equivalent, grounded fallback if delivery fails. */ }
  }

  update(camera?: Camera): void {
    const portrait = camera instanceof PerspectiveCamera && camera.aspect < .72;
    if (portrait === this.portrait) return;
    this.portrait = portrait;
    this.arches.geometry = portrait ? this.kit.archPortrait : this.kit.arch;
    this.arches.computeBoundingSphere();
  }

  dispose(): void {
    this.disposed = true;
    Object.values(this.kit).forEach(geometry => geometry.dispose());
    this.material.dispose();
    this.piers.dispose(); this.imposts.dispose(); this.arches.dispose();
    this.continuation.dispose();
  }
}
