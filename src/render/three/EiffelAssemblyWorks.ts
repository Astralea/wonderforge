import { BoxGeometry, Color, CylinderGeometry, Group, InstancedMesh, Matrix4, MeshStandardMaterial, Quaternion, SphereGeometry, Vector3, type BufferGeometry } from 'three';
import type { EiffelAssemblyOperation } from './EiffelBlenderSystem';
import type { EiffelAssemblyVec3 } from '../../data/eiffelAssemblyTypes';

const UP = new Vector3(0, 1, 0);
const COLORS = ['#b25d36', '#d6c6a6', '#4a6170', '#8b7445'];

/** Pooled labour and industrial rigging, driven exclusively by the cargo event. */
export class EiffelAssemblyWorks {
  readonly group = new Group();
  private readonly batches: Record<string, InstancedMesh> = {};
  private readonly geometries: BufferGeometry[] = [];
  private readonly materials: MeshStandardMaterial[] = [];
  private readonly matrix = new Matrix4();
  private readonly rotation = new Quaternion();
  private readonly point = new Vector3();
  private readonly scale = new Vector3();
  private readonly color = new Color();
  private counts: Record<string, number> = {};

  constructor() {
    this.group.name = 'eiffel-assembly-labour-and-rigs';
    const box = new BoxGeometry(1, 1, 1);
    const pole = new CylinderGeometry(1, 1, 1, 6);
    const head = new SphereGeometry(1, 7, 5);
    const wheel = new CylinderGeometry(1, 1, .18, 10);
    wheel.rotateZ(Math.PI / 2);
    this.geometries.push(box, pole, head, wheel);
    const mat = (color: string, metalness = 0) => {
      const material = new MeshStandardMaterial({ color, roughness: .78, metalness });
      this.materials.push(material);
      return material;
    };
    const wood = mat('#826344');
    const iron = mat('#5a5147', .3);
    const rope = mat('#514637');
    const skin = mat('#bc8b62');
    const cloth = mat('#ffffff');
    const batch = (key: string, geometry: BufferGeometry, material: MeshStandardMaterial, count: number) => {
      const mesh = new InstancedMesh(geometry, material, count);
      mesh.name = `eiffel-${key}`;
      mesh.frustumCulled = false;
      mesh.castShadow = key !== 'ropes';
      mesh.receiveShadow = true;
      mesh.count = 0;
      this.group.add(mesh);
      this.batches[key] = mesh;
    };
    batch('wagons', box, wood, 32);
    batch('wheels', wheel, iron, 64);
    batch('rigging', pole, iron, 160);
    batch('ropes', pole, rope, 80);
    batch('working-decks', box, wood, 32);
    batch('bodies', box, cloth, 96);
    batch('heads', head, skin, 96);
    batch('limbs', pole, cloth, 384);
    batch('caps', box, iron, 96);
  }

  private solid(key: string, p: EiffelAssemblyVec3, size: EiffelAssemblyVec3, tint?: string): void {
    const index = this.counts[key] ?? 0;
    const mesh = this.batches[key]!;
    if (index >= mesh.instanceMatrix.count) return;
    this.rotation.identity();
    this.matrix.compose(this.point.set(...p), this.rotation, this.scale.set(...size));
    mesh.setMatrixAt(index, this.matrix);
    if (tint) mesh.setColorAt(index, this.color.set(tint));
    this.counts[key] = index + 1;
  }

  private beam(key: string, a: EiffelAssemblyVec3, b: EiffelAssemblyVec3, radius: number, tint?: string): void {
    const index = this.counts[key] ?? 0;
    const mesh = this.batches[key]!;
    if (index >= mesh.instanceMatrix.count) return;
    this.point.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const length = this.point.length();
    if (length < 1e-5) return;
    this.rotation.setFromUnitVectors(UP, this.point.multiplyScalar(1 / length));
    this.point.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
    this.matrix.compose(this.point, this.rotation, this.scale.set(radius, length, radius));
    mesh.setMatrixAt(index, this.matrix);
    if (tint) mesh.setColorAt(index, this.color.set(tint));
    this.counts[key] = index + 1;
  }

  private worker(x: number, y: number, z: number, seed: number, t: number, working: boolean): void {
    const tint = COLORS[seed % COLORS.length]!;
    const stride = Math.sin(t * (79 + seed % 13) + seed * 1.27) * (working ? .10 : .38);
    const hammer = Math.sin(t * (106 + seed % 17) + seed * .81) * .5;
    this.solid('bodies', [x, y + 1.85, z], [.85, 1.1, .56], tint);
    this.solid('heads', [x, y + 2.68, z], [.33, .37, .33]);
    this.solid('caps', [x, y + 2.98, z + .05], [.76, .15, .65]);
    for (const sign of [-1, 1]) {
      this.beam('limbs', [x + sign * .23, y + 1.30, z], [x + sign * .25, y + .1, z + sign * stride], .12, '#4b5050');
      this.beam('limbs', [x + sign * .48, y + 2.12, z], [x + sign * .65, y + 1.65 + (working ? hammer : 0), z + .58], .11, tint);
    }
  }

  update(operations: readonly EiffelAssemblyOperation[], t: number): void {
    this.counts = {};
    for (let i = 0; i < operations.length; i++) {
      const { part, state } = operations[i]!;
      const width = part.boundsMax[0] - part.boundsMin[0];
      const depth = part.boundsMax[2] - part.boundsMin[2];
      if (state.wagon.visible) {
        const [x, y, z] = state.wagon.position;
        this.solid('wagons', [x, state.wagon.bedY - .16, z], [Math.max(3, width + .4), .32, Math.max(3, depth + .4)]);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
          this.solid('wheels', [x + sx * Math.max(1.15, width * .4), y + .38, z + sz * Math.max(1.2, depth * .35)], [.8, .8, .8]);
        }
        this.worker(x + width / 2 + 1.3, y, z, i * 3, t, false);
        this.worker(x + width / 2 + 1.5, y, z - 2.1, i * 3 + 1, t, false);
      }
      if (state.ropeAttached) {
        const [x, y, z] = state.craneBase;
        const mast: EiffelAssemblyVec3 = [x, part.jibY, z];
        this.beam('rigging', [x, y, z], mast, .20);
        this.beam('rigging', mast, state.boomTip, .18);
        this.beam('rigging', [x, Math.max(y, part.jibY - 3), z], state.boomTip, .10);
        this.beam('ropes', state.boomTip, state.hook, .047);
        this.beam('ropes', state.hook, [state.position[0], state.hook[1] - 1.5, state.position[2]], .05);
        this.solid('working-decks', [x, y + .1, z], [5.2, .2, 4.8]);
        this.solid('wagons', [x - 1.1, y + 1, z], [1.7, 1.6, 1.6]);
        this.worker(x + 1.2, y + .2, z + .8, i * 3 + 2, t, true);
        this.worker(x - 1.2, y + .2, z - 1.5, i * 3 + 3, t, true);
      }
    }
    for (const [key, mesh] of Object.entries(this.batches)) {
      mesh.count = this.counts[key] ?? 0;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }

  dispose(): void {
    for (const mesh of Object.values(this.batches)) mesh.dispose();
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    this.group.clear();
  }
}
