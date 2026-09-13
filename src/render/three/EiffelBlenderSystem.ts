import { Box3, Group, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Vector3, type BufferGeometry } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { EiffelAssemblyManifest, EiffelAssemblyPlan, EiffelAssemblySample } from '../../data/eiffelAssemblyTypes';
import { createEiffelAssemblyPlan, sampleEiffelAssemblyPart } from '../../engine/eiffelAssembly';
import { injectMaterialRecipe } from './proceduralDetail';

export const EIFFEL_TOWER_ASSET = '/models/eiffel/tower-rebuilt.glb';
export const EIFFEL_TOWER_MANIFEST = '/models/eiffel/tower-rebuilt.manifest.json';

interface Member { matrix: Matrix4; partIndex: number }
interface Batch { mesh: InstancedMesh; members: Member[] }
export interface EiffelAssemblyOperation { part: EiffelAssemblyPlan['parts'][number]; state: EiffelAssemblySample }

/** The .blend/GLB owns geometry; the pure construction graph only translates it. */
export class EiffelBlenderSystem {
  readonly group = new Group();
  readonly ready: Promise<void>;
  plan: EiffelAssemblyPlan | null = null;
  private readonly batches: Batch[] = [];
  private readonly geometries = new Set<BufferGeometry>();
  private readonly materials: MeshStandardMaterial[] = [];
  private readonly matrix = new Matrix4();
  private disposed = false;
  private lastT = 0;

  constructor() {
    this.group.name = 'eiffel-blender-construction';
    this.group.userData.source = EIFFEL_TOWER_ASSET;
    this.ready = this.load();
  }

  private async load(): Promise<void> {
    const [assetResponse, manifestResponse] = await Promise.all([fetch(EIFFEL_TOWER_ASSET), fetch(EIFFEL_TOWER_MANIFEST)]);
    if (!assetResponse.ok || !manifestResponse.ok) throw new Error('Eiffel Blender construction assets could not be loaded');
    const [buffer, manifest] = await Promise.all([assetResponse.arrayBuffer(), manifestResponse.json() as Promise<EiffelAssemblyManifest>]);
    const gltf = await new GLTFLoader().parseAsync(buffer, '');
    const sourceMaterials = new Set<MeshStandardMaterial>();
    gltf.scene.traverse((object) => {
      if (object instanceof Mesh) {
        this.geometries.add(object.geometry);
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) sourceMaterials.add(material);
      }
    });
    if (this.disposed) {
      for (const geometry of this.geometries) geometry.dispose();
      this.geometries.clear();
      for (const material of sourceMaterials) material.dispose();
      return;
    }
    this.plan = createEiffelAssemblyPlan(manifest);
    const roleColors: Record<string, string> = { iron: '#b78362', 'dark-iron': '#825641', deck: '#867157', masonry: '#c4b39a', gold: '#bc9560', roof: '#524f4b', window: '#66818b' };
    const roleMaterials = new Map<string, MeshStandardMaterial>();
    const partIndices = new Map(this.plan.parts.map((part, index) => [part.id, index]));
    const groups = new Map<string, { geometry: BufferGeometry; role: string; members: Member[] }>();
    const foundParts = new Set<string>();
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const id = String(object.userData.wf_part ?? '');
      const partIndex = partIndices.get(id);
      if (partIndex === undefined) throw new Error(`Unmapped Blender member: ${object.name} (${id})`);
      foundParts.add(id);
      const role = String(object.userData.wf_material ?? 'iron');
      const key = `${object.geometry.uuid}:${role}`;
      if (!groups.has(key)) groups.set(key, { geometry: object.geometry, role, members: [] });
      groups.get(key)!.members.push({ matrix: object.matrixWorld.clone(), partIndex });
    });
    if (foundParts.size !== this.plan.parts.length) throw new Error('Eiffel manifest contains assemblies absent from the GLB');
    for (const { geometry, role, members } of groups.values()) {
      if (!roleMaterials.has(role)) {
        const material = new MeshStandardMaterial({ color: roleColors[role] ?? roleColors.iron, roughness: role === 'masonry' ? 0.92 : 0.57, metalness: role === 'masonry' ? 0 : 0.18 });
        if (!['masonry', 'window', 'roof'].includes(role)) injectMaterialRecipe(material, 'puddled-iron');
        roleMaterials.set(role, material);
        this.materials.push(material);
      }
      const mesh = new InstancedMesh(geometry, roleMaterials.get(role)!, members.length);
      mesh.name = `eiffel-blender-${role}-${this.batches.length}`;
      mesh.castShadow = role !== 'gold';
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      mesh.count = 0;
      this.batches.push({ mesh, members });
      this.group.add(mesh);
    }
    for (const material of sourceMaterials) material.dispose();
    this.group.userData.assemblies = this.plan.parts.length;
    this.group.userData.batches = this.batches.length;
    this.group.userData.ready = true;
    this.update(this.lastT);
  }

  update(t: number): EiffelAssemblyOperation[] {
    this.lastT = t;
    if (!this.plan || this.disposed) return [];
    const states = this.plan.parts.map((part) => sampleEiffelAssemblyPart(part, t));
    const active: EiffelAssemblyOperation[] = [];
    states.forEach((state, i) => {
      if (state.visible && state.phase !== 'seated') active.push({ part: this.plan!.parts[i]!, state });
    });
    for (const { mesh, members } of this.batches) {
      let cursor = 0;
      for (const member of members) {
        const state = states[member.partIndex]!;
        if (!state.visible) continue;
        const part = this.plan.parts[member.partIndex]!;
        this.matrix.copy(member.matrix);
        this.matrix.elements[12]! += state.position[0] - part.center[0];
        this.matrix.elements[13]! += state.position[1] - part.center[1];
        this.matrix.elements[14]! += state.position[2] - part.center[2];
        mesh.setMatrixAt(cursor++, this.matrix);
      }
      mesh.count = cursor;
      mesh.instanceMatrix.needsUpdate = true;
    }
    return active;
  }

  dispose(): void {
    this.disposed = true;
    for (const { mesh } of this.batches) mesh.dispose();
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    this.geometries.clear();
    this.group.clear();
  }
}

/** Independent asset-envelope oracle, also used by export round-trip tests. */
export function eiffelGltfPartBounds(root: Group): Map<string, Box3> {
  const bounds = new Map<string, Box3>();
  const point = new Vector3();
  root.updateMatrixWorld(true);
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const id = String(object.userData.wf_part ?? '');
    if (!bounds.has(id)) bounds.set(id, new Box3());
    const positions = object.geometry.getAttribute('position');
    for (let i = 0; i < positions.count; i++) {
      point.fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld);
      bounds.get(id)!.expandByPoint(point);
    }
  });
  return bounds;
}
