import { BatchedMesh, Box3, Group, Matrix4, Mesh, Sphere, type BufferGeometry, type Material, type Object3D, type PerspectiveCamera } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { sampleEiffelLongLoadDrive } from '../../engine/eiffelLongLoadDrive';

/** Saved Blender steam drive and deck-supported operator for the delivery. */
export class EiffelLongLoadDriveSystem {
  readonly group = new Group();
  readonly ready: Promise<void>;
  private readonly geometries = new Set<BufferGeometry>();
  private readonly materials = new Set<Material>();
  private readonly roles = new Map<string, Object3D>();
  private readonly batches: { mesh: BatchedMesh; sources: { mesh: Mesh; id: number }[] }[] = [];
  private readonly inverse = new Matrix4();
  private readonly matrix = new Matrix4();
  private readonly shadowBounds = new Sphere();
  private seconds = 0;
  private disposed = false;
  constructor() {
    this.group.name = 'eiffel-long-load-steam-drive'; this.group.visible = false;
    this.ready = this.load().catch(error => { this.dispose(); throw error; });
  }
  private async load() {
    let bytes: ArrayBuffer;
    try {
      const response = await fetch('/models/eiffel-long-load-first-floor/steam-drive.glb');
      if (!response.ok) throw Error('Missing saved Blender steam drive');
      bytes = await response.arrayBuffer();
    } catch (error) {
      if (typeof process === 'undefined' || !process.versions?.node) throw error;
      const { readFileSync } = await import('node:fs');
      const buffer = readFileSync('public/models/eiffel-long-load-first-floor/steam-drive.glb');
      bytes = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    }
    const asset = (await new GLTFLoader().parseAsync(bytes, '')).scene;
    const cohorts = new Map<string, { material: Material; meshes: Mesh[] }>();
    asset.traverse(object => {
      if (object.userData.wf_role) this.roles.set(object.userData.wf_role, object);
      if (!(object instanceof Mesh)) return;
      this.geometries.add(object.geometry);
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach(m => this.materials.add(m));
      if (materials.length !== 1) throw Error('Drive export must use one material per mesh');
      const material = materials[0]!;
      const key = `${material.uuid}:${Object.keys(object.geometry.attributes).sort().join(',')}:${!!object.geometry.index}`;
      const cohort = cohorts.get(key) ?? { material, meshes: [] as Mesh[] };
      cohort.meshes.push(object); cohorts.set(key, cohort);
    });
    if (this.disposed) { this.release(); return; }
    for (const role of ['drive-crank', 'drive-slider', 'drive-connecting-rod']) {
      if (!this.roles.has(role)) throw Error(`Missing Blender drive node ${role}`);
    }
    this.group.add(asset);
    for (const { material, meshes } of cohorts.values()) {
      const vertices = meshes.reduce((n, m) => n + m.geometry.attributes.position!.count, 0);
      const indices = meshes.reduce((n, m) => n + (m.geometry.index?.count ?? 0), 0);
      const batch = new BatchedMesh(meshes.length, vertices, indices, material);
      batch.name = `steam-drive-batch-${this.batches.length}`;
      batch.frustumCulled = batch.sortObjects = false;
      batch.perObjectFrustumCulled = true;
      batch.castShadow = batch.receiveShadow = true;
      const sources = meshes.map(mesh => { mesh.visible = false; return { mesh, id: batch.addInstance(batch.addGeometry(mesh.geometry)) }; });
      this.group.add(batch); this.batches.push({ mesh: batch, sources });
    }
    this.update(this.seconds);
    // The .1m crank stroke stays inside this expanded saved-model bound.
    new Box3().setFromObject(asset).expandByScalar(.2).getBoundingSphere(this.shadowBounds);
  }
  setShadowCamera(camera: PerspectiveCamera, viewportHeight: number, shortFilm: boolean): void {
    const distance = camera.position.distanceTo(this.shadowBounds.center);
    const diameter = this.shadowBounds.radius * viewportHeight * camera.zoom
      / (Math.max(.01, distance - this.shadowBounds.radius) * Math.tan(camera.fov * Math.PI / 360));
    const castShadow = !shortFilm || diameter > 12;
    for (const batch of this.batches) batch.mesh.castShadow = castShadow;
  }
  update(seconds: number) {
    if (this.disposed) return;
    this.seconds = seconds;
    const s = sampleEiffelLongLoadDrive(seconds);
    const place = (role: string, position: readonly [number, number, number], angle: number) => {
      const object = this.roles.get(role);
      if (object) { object.position.set(...position); object.rotation.set(0, 0, angle); }
    };
    place('drive-crank', s.crankOrigin, s.crankAngle);
    place('drive-slider', s.sliderOrigin, 0);
    place('drive-connecting-rod', s.rodOrigin, s.rodAngle);
    this.group.updateMatrixWorld(true); this.inverse.copy(this.group.matrixWorld).invert();
    for (const batch of this.batches) for (const source of batch.sources) {
      batch.mesh.setMatrixAt(source.id, this.matrix.multiplyMatrices(this.inverse, source.mesh.matrixWorld));
    }
    this.group.userData.seconds = s.seconds;
    this.group.userData.crankAngle = s.crankAngle;
  }
  private release() {
    this.geometries.forEach(g => g.dispose()); this.geometries.clear();
    this.materials.forEach(m => m.dispose()); this.materials.clear();
    this.batches.forEach(b => b.mesh.dispose()); this.batches.length = 0;
    this.roles.clear(); this.group.clear();
  }
  dispose() { this.disposed = true; this.release(); this.group.removeFromParent(); }
}
