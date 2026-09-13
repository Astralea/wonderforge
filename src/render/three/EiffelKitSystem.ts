import { BatchedMesh, Box3, Group, Matrix4, Mesh, MeshStandardMaterial, Quaternion, Vector3, type BufferGeometry } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { EiffelKitManifest, EiffelKitPart } from '../../data/eiffelKitTypes';
import type { RigidPose } from '../../engine/eiffelRigid';
import { injectMaterialRecipe } from './proceduralDetail';

export const EIFFEL_KIT_ASSET = '/models/eiffel-construction-kit/tower-kit.glb';
export const EIFFEL_KIT_SEATED_ASSET = '/models/eiffel-construction-kit/tower-kit-seated.glb';
export const EIFFEL_KIT_MANIFEST = '/models/eiffel-construction-kit/tower-kit.manifest.json';
export type EiffelKitState = { readonly phase: 'queued' } | { readonly phase: 'seated' } | { readonly phase: 'moving'; readonly pose: RigidPose };
export type EiffelKitSampler = (part: EiffelKitPart, t: number) => EiffelKitState;
const SEATED: EiffelKitState = { phase: 'seated' };
const UNIT_SCALE = new Vector3(1, 1, 1);
const COLORS: Record<string, string> = { iron: '#b78362', 'dark-iron': '#825641', deck: '#867157', masonry: '#c4b39a', gold: '#bc9560', roof: '#524f4b', window: '#66818b' };
interface DrawMember { readonly matrix: Matrix4; readonly part: number; readonly source: number; instance?: number }
interface Batch { readonly mesh: BatchedMesh; readonly role: string; readonly shadowLod: 'major' | 'fine'; readonly compact: DrawMember[]; readonly pieces: DrawMember[]; readonly triangles: number }

/**
 * Renders the validated Blender kit with rigid poses supplied by the engine.
 * A seated source member replaces its subdivisions only when ALL children are
 * seated. This is topology compaction of the same solid, not construction
 * completion. The default sampler is a complete-model inspection pose.
 * This class intentionally does not invent routes, crane supports or timing.
 */
export class EiffelKitSystem {
  readonly group = new Group();
  readonly ready: Promise<void>;
  manifest: EiffelKitManifest | null = null;
  private readonly batches: Batch[] = [];
  private readonly geometry = new Set<BufferGeometry>();
  private readonly materials = new Set<MeshStandardMaterial>();
  private readonly finalInverses: Matrix4[] = [];
  private readonly sourceChildren: number[][] = [];
  private readonly matrix = new Matrix4();
  private readonly poseMatrix = new Matrix4();
  private readonly point = new Vector3();
  private readonly rotation = new Quaternion();
  private readonly shadowCenter = new Vector3(0, 156, 0);
  private disposed = false;
  private lastT = 1;

  /** At overview distance fine lattice shadows submit the whole tower to the
   * broad sun frustum. Use the existing major-iron tier for short-film views
   * as well as mobile. Keep
   * exact visible geometry and all deck, masonry, roof and secondary-iron
   * shadows; restore the primary iron shadow for construction/detail views. */
  setShadowCamera(cameraPosition: Vector3, mobile: boolean, shortFilm = false): void {
    const detailed = !(mobile || shortFilm) || cameraPosition.distanceToSquared(this.shadowCenter) < 400 ** 2;
    for (const batch of this.batches) batch.mesh.castShadow = batch.role !== 'gold' && (batch.role !== 'iron' || batch.shadowLod === 'major' || detailed);
    this.group.userData.shadowDetail = detailed ? 'source' : 'major-iron';
  }

  constructor(private readonly sample: EiffelKitSampler = () => SEATED) {
    this.group.name = 'eiffel-bounded-construction-kit';
    this.ready = this.load().catch(error => { this.dispose(); throw error; });
  }

  private async load(): Promise<void> {
    const responses = await Promise.all([EIFFEL_KIT_ASSET, EIFFEL_KIT_SEATED_ASSET, EIFFEL_KIT_MANIFEST].map(url => fetch(url)));
    if (responses.some(response => !response.ok)) throw new Error('Eiffel construction kit assets could not be loaded');
    const [pieceBytes, compactBytes, manifest] = await Promise.all([
      responses[0]!.arrayBuffer(), responses[1]!.arrayBuffer(), responses[2]!.json() as Promise<EiffelKitManifest>,
    ]);
    if (manifest.schemaVersion !== 2) throw new Error('Unsupported Eiffel construction kit');
    const loader = new GLTFLoader();
    const gltfs = await Promise.all([loader.parseAsync(pieceBytes, ''), loader.parseAsync(compactBytes, '')]);
    const importedMaterials = new Set<MeshStandardMaterial>();
    for (const gltf of gltfs) gltf.scene.traverse(object => {
      if (!(object instanceof Mesh)) return;
      this.geometry.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) importedMaterials.add(material);
    });
    // The kit uses procedural untextured materials; source GLTF materials are
    // never attached to production drawables and can be released immediately.
    for (const material of importedMaterials) material.dispose();
    if (this.disposed) {
      for (const geometry of this.geometry) geometry.dispose();
      this.geometry.clear();
      return;
    }
    this.manifest = manifest;
    const partIndices = new Map<string, number>();
    const sourceIndices = new Map<string, number>();
    const majorShadowSources = new Set<string>();
    manifest.parts.forEach((part, index) => {
      if (partIndices.has(part.id)) throw new Error(`Duplicate kit part ${part.id}`);
      partIndices.set(part.id, index);
      if (!sourceIndices.has(part.sourceMember)) {
        sourceIndices.set(part.sourceMember, this.sourceChildren.length);
        this.sourceChildren.push([]);
        const dimensions = [...part.transportSize].sort((a, b) => a - b);
        if (part.material === 'iron' && dimensions[0]! * dimensions[1]! >= .08) majorShadowSources.add(part.sourceMember);
      }
      this.sourceChildren[sourceIndices.get(part.sourceMember)!]!.push(index);
      this.finalInverses.push(new Matrix4().compose(
        new Vector3(...part.finalPose.position), new Quaternion(...part.finalPose.quaternion), UNIT_SCALE,
      ).invert());
    });
    const records = new Map<string, { geometry: BufferGeometry; role: string; shadowLod: 'major' | 'fine'; pieces: DrawMember[]; compact: DrawMember[] }>();
    const seenParts = new Set<string>();
    const seenSources = new Set<string>();
    const unitBounds = new Box3(new Vector3(-.5, -.5, -.5), new Vector3(.5, .5, .5));
    gltfs.forEach((gltf, assetIndex) => {
      gltf.scene.updateMatrixWorld(true);
      gltf.scene.traverse(object => {
        if (!(object instanceof Mesh)) return;
        const isCompact = assetIndex === 1;
        const partId = String(object.userData.wf_part);
        const sourceId = String(object.userData.wf_source);
        const part = isCompact ? -1 : partIndices.get(partId);
        const source = sourceIndices.get(sourceId);
        if (part === undefined || source === undefined) throw new Error(`Unmapped kit mesh ${object.name}`);
        const seen = isCompact ? seenSources : seenParts;
        const id = isCompact ? sourceId : partId;
        if (seen.has(id)) throw new Error(`Duplicate kit mesh ${id}`);
        seen.add(id);
        const role = String(object.userData.wf_material);
        const shadowLod = majorShadowSources.has(sourceId) ? 'major' : 'fine';
        const geometry = object.geometry;
        geometry.computeBoundingBox();
        const isUnitBox = geometry.boundingBox!.min.distanceTo(unitBounds.min) < 1e-8 && geometry.boundingBox!.max.distanceTo(unitBounds.max) < 1e-8;
        const key = `${role}:${shadowLod}:${isUnitBox ? 'shared-unit-box' : geometry.uuid}`;
        if (!records.has(key)) records.set(key, { geometry, role, shadowLod, pieces: [], compact: [] });
        records.get(key)![isCompact ? 'compact' : 'pieces'].push({ matrix: object.matrixWorld.clone(), part, source });
      });
    });
    if (seenParts.size !== partIndices.size || seenSources.size !== sourceIndices.size) throw new Error('Incomplete Eiffel kit source/piece mapping');
    const roleMaterials = new Map<string, MeshStandardMaterial>();
    for (const record of records.values()) {
      if (!roleMaterials.has(record.role)) {
        const material = new MeshStandardMaterial({ color: COLORS[record.role] ?? COLORS.iron, roughness: record.role === 'masonry' ? .92 : .57, metalness: record.role === 'masonry' ? 0 : .18 });
        if (!['masonry', 'window', 'roof'].includes(record.role)) injectMaterialRecipe(material, 'puddled-iron');
        roleMaterials.set(record.role, material); this.materials.add(material);
      }
      const capacity = record.pieces.length + record.compact.length;
      const mesh = new BatchedMesh(capacity, record.geometry.getAttribute('position').count, record.geometry.index?.count ?? 0, roleMaterials.get(record.role)!);
      const geometryId = mesh.addGeometry(record.geometry);
      for (const member of [...record.compact, ...record.pieces]) {
        member.instance = mesh.addInstance(geometryId); mesh.setVisibleAt(member.instance, false);
      }
      mesh.name = `eiffel-kit-${record.role}-${this.batches.length}`;
      mesh.castShadow = record.role !== 'gold'; mesh.receiveShadow = true; mesh.frustumCulled = false;
      mesh.perObjectFrustumCulled = true; mesh.sortObjects = false;
      const triangles = (record.geometry.index?.count ?? record.geometry.getAttribute('position').count) / 3;
      this.batches.push({ mesh, role: record.role, shadowLod: record.shadowLod, pieces: record.pieces, compact: record.compact, triangles });
      this.group.add(mesh);
    }
    this.group.userData.sourceMembers = sourceIndices.size;
    this.group.userData.majorShadowSources = majorShadowSources.size;
    this.group.userData.kitPieces = partIndices.size;
    this.group.userData.ready = true;
    this.update(this.lastT);
  }

  update(t: number): void {
    this.lastT = t;
    if (!this.manifest || this.disposed) return;
    const states = this.manifest.parts.map(part => this.sample(part, t));
    const complete = this.sourceChildren.map(children => children.every(index => states[index]!.phase === 'seated'));
    let visiblePieces = 0;
    let triangles = 0;
    for (const batch of this.batches) {
      let count = 0;
      for (const member of batch.compact) {
        const visible = complete[member.source]; batch.mesh.setVisibleAt(member.instance!, visible);
        if (visible) { batch.mesh.setMatrixAt(member.instance!, member.matrix); count++; }
      }
      for (const member of batch.pieces) {
        if (complete[member.source]) { batch.mesh.setVisibleAt(member.instance!, false); continue; }
        const state = states[member.part]!;
        if (state.phase === 'queued') { batch.mesh.setVisibleAt(member.instance!, false); continue; }
        if (state.phase === 'seated') this.matrix.copy(member.matrix);
        else {
          this.point.set(...state.pose.position); this.rotation.set(...state.pose.quaternion).normalize();
          this.poseMatrix.compose(this.point, this.rotation, UNIT_SCALE);
          this.matrix.copy(this.poseMatrix).multiply(this.finalInverses[member.part]!).multiply(member.matrix);
        }
        batch.mesh.setMatrixAt(member.instance!, this.matrix); batch.mesh.setVisibleAt(member.instance!, true); count++; visiblePieces++;
      }
      triangles += count * batch.triangles;
    }
    this.group.userData.visiblePieces = visiblePieces;
    this.group.userData.seatedSources = complete.filter(Boolean).length;
    this.group.userData.triangles = triangles;
  }

  dispose(): void {
    this.disposed = true;
    for (const batch of this.batches) batch.mesh.dispose();
    for (const geometry of this.geometry) geometry.dispose();
    for (const material of this.materials) material.dispose();
    this.geometry.clear(); this.materials.clear(); this.group.clear();
  }
}
