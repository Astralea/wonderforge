import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Euler,
  Group,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
  type BufferGeometry,
} from 'three';
import type { PetraConstructionPlan, PetraMemberKind, PetraRockMember } from '../../data/petraTypes';
import {
  activePetraOperationsAt,
  petraMemberStateAt,
  petraSpoilStateAt,
  type ActivePetraOperation,
} from '../../engine/petraConstruction';
import type { MaterialLibrary } from './MaterialLibrary';
import { injectMaterialRecipe } from './proceduralDetail';

function setTransform(
  mesh: InstancedMesh,
  index: number,
  position: readonly [number, number, number],
  rotation: readonly [number, number, number],
  dimensions: readonly [number, number, number],
  matrix: Matrix4,
  quaternion: Quaternion,
): void {
  quaternion.setFromEuler(new Euler(rotation[0], rotation[1], rotation[2], 'YXZ'));
  matrix.compose(new Vector3(...position), quaternion, new Vector3(...dimensions));
  mesh.setMatrixAt(index, matrix);
}

function sandstoneColor(variation: number, target: Color, dumped = false): Color {
  target.set(dumped ? '#b8885c' : '#c77b4f');
  target.offsetHSL(variation * 0.012, variation * 0.02, variation * 0.04);
  return target;
}

export function createPetraMemberGeometry(kind: PetraMemberKind): BufferGeometry {
  if (kind === 'column') return new CylinderGeometry(0.42, 0.5, 1, 8);
  if (kind === 'cone') return new ConeGeometry(0.52, 1, 8);
  if (kind === 'capital') return new BoxGeometry(1, 1, 1, 2, 1, 2);
  return new BoxGeometry(1, 1, 1, 2, 2, 2);
}

export class PetraStoneSystem {
  readonly group = new Group();
  private readonly geometries: BufferGeometry[] = [];
  private readonly localMaterials: MeshStandardMaterial[] = [];
  private readonly memberBatches: Array<{ members: PetraRockMember[]; mesh: InstancedMesh }> = [];
  private readonly envelope: InstancedMesh;
  private readonly dump: InstancedMesh;
  private readonly activeSpoil: InstancedMesh;
  private readonly spoilGeometry: BufferGeometry;

  constructor(
    private readonly plan: PetraConstructionPlan,
    _materials: MaterialLibrary,
  ) {
    this.group.name = 'petra-physical-stone-system';
    const dressed = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.94, metalness: 0 });
    const cut = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.98, metalness: 0 });
    injectMaterialRecipe(dressed, 'disi-sandstone');
    injectMaterialRecipe(cut, 'disi-sandstone');
    this.localMaterials.push(dressed, cut);

    const matrix = new Matrix4();
    const quaternion = new Quaternion();
    const color = new Color();
    const kinds: PetraMemberKind[] = ['block', 'column', 'capital', 'cone'];
    for (const kind of kinds) {
      const members = plan.members.filter((member) => member.kind === kind);
      const geometry = createPetraMemberGeometry(kind);
      this.geometries.push(geometry);
      const mesh = new InstancedMesh(geometry, dressed, Math.max(1, members.length));
      mesh.name = `petra-members-${kind}`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      mesh.count = 0;
      members.forEach((member, index) => {
        setTransform(mesh, index, member.finalPosition, member.finalRotation, member.dimensions, matrix, quaternion);
        mesh.setColorAt(index, sandstoneColor(member.colorVariation, color));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      this.memberBatches.push({ members, mesh });
      this.group.add(mesh);
    }

    this.spoilGeometry = new BoxGeometry(1, 1, 1, 2, 2, 2);
    this.geometries.push(this.spoilGeometry);
    this.envelope = new InstancedMesh(this.spoilGeometry, cut, plan.cells.length);
    this.dump = new InstancedMesh(this.spoilGeometry, cut, plan.cells.length);
    this.activeSpoil = new InstancedMesh(this.spoilGeometry, cut, 12);
    this.envelope.name = 'petra-envelope-spoil';
    this.dump.name = 'petra-dumped-spoil';
    this.activeSpoil.name = 'petra-active-spoil';
    for (const mesh of [this.envelope, this.dump, this.activeSpoil]) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      mesh.count = 0;
      this.group.add(mesh);
    }
  }

  update(t: number): ActivePetraOperation[] {
    const matrix = new Matrix4();
    const quaternion = new Quaternion();
    const color = new Color();
    for (const batch of this.memberBatches) {
      let cursor = 0;
      for (const member of batch.members) {
        if (!petraMemberStateAt(member, this.plan, t).visible) continue;
        setTransform(batch.mesh, cursor, member.finalPosition, member.finalRotation, member.dimensions, matrix, quaternion);
        batch.mesh.setColorAt(cursor, sandstoneColor(member.colorVariation, color));
        cursor += 1;
      }
      batch.mesh.count = cursor;
      batch.mesh.instanceMatrix.needsUpdate = true;
      if (batch.mesh.instanceColor) batch.mesh.instanceColor.needsUpdate = true;
    }

    const route = this.plan.routes[0]!;
    let envelopeCursor = 0;
    let dumpCursor = 0;
    for (const cell of this.plan.cells) {
      const state = petraSpoilStateAt(cell, route, t);
      if (t < cell.start) {
        setTransform(this.envelope, envelopeCursor, state.position, state.rotation, cell.dimensions, matrix, quaternion);
        this.envelope.setColorAt(envelopeCursor, sandstoneColor(cell.colorVariation, color));
        envelopeCursor += 1;
      } else if (t >= cell.start + cell.duration) {
        setTransform(this.dump, dumpCursor, state.position, state.rotation, cell.dimensions, matrix, quaternion);
        this.dump.setColorAt(dumpCursor, sandstoneColor(cell.colorVariation, color, true));
        dumpCursor += 1;
      }
    }
    this.envelope.count = envelopeCursor;
    this.dump.count = dumpCursor;
    this.envelope.instanceMatrix.needsUpdate = true;
    this.dump.instanceMatrix.needsUpdate = true;
    if (this.envelope.instanceColor) this.envelope.instanceColor.needsUpdate = true;
    if (this.dump.instanceColor) this.dump.instanceColor.needsUpdate = true;

    const operations = activePetraOperationsAt(this.plan, t);
    operations.forEach((operation, index) => {
      setTransform(
        this.activeSpoil,
        index,
        operation.state.position,
        operation.state.rotation,
        operation.cell.dimensions,
        matrix,
        quaternion,
      );
      this.activeSpoil.setColorAt(index, sandstoneColor(operation.cell.colorVariation, color));
    });
    this.activeSpoil.count = operations.length;
    this.activeSpoil.instanceMatrix.needsUpdate = true;
    if (this.activeSpoil.instanceColor) this.activeSpoil.instanceColor.needsUpdate = true;
    return operations;
  }

  dispose(): void {
    for (const geometry of this.geometries) geometry.dispose();
    for (const batch of this.memberBatches) batch.mesh.dispose();
    this.envelope.dispose();
    this.dump.dispose();
    this.activeSpoil.dispose();
    for (const material of this.localMaterials) material.dispose();
  }
}
