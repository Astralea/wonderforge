import {
  BoxGeometry,
  Color,
  Euler,
  ExtrudeGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Path,
  Quaternion,
  Shape,
  Vector3,
  type BufferGeometry,
} from 'three';
import type { ColosseumConstructionPlan, ColosseumPart, ColosseumPartKind } from '../../data/colosseumTypes';
import {
  activeColosseumOperationsAt,
  colosseumPartStateAt,
  type ActiveColosseumOperation,
} from '../../engine/colosseumConstruction';
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

function stoneColor(material: ColosseumPart['material'], variation: number, target: Color): Color {
  if (material === 'tuff') target.set('#a8895c');
  else if (material === 'pozzolana') target.set('#8a7a68');
  else target.set('#d8c4a0');
  target.offsetHSL(variation * 0.01, variation * 0.018, variation * 0.035);
  return target;
}

export function createColosseumPartGeometry(kind: ColosseumPartKind): BufferGeometry {
  if (kind !== 'arch') return new BoxGeometry(1, 1, 1, 2, 2, 2);
  const shape = new Shape();
  shape.moveTo(-0.5, -0.5);
  shape.lineTo(0.5, -0.5);
  shape.lineTo(0.5, 0.5);
  shape.lineTo(-0.5, 0.5);
  shape.closePath();
  const hole = new Path();
  hole.moveTo(-0.32, -0.5);
  hole.lineTo(-0.32, -0.04);
  hole.absellipse(0, -0.04, 0.32, 0.38, Math.PI, 0, true);
  hole.lineTo(0.32, -0.5);
  hole.closePath();
  shape.holes.push(hole);
  const geometry = new ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, steps: 1, curveSegments: 10 });
  geometry.translate(0, 0, -0.5);
  geometry.computeVertexNormals();
  return geometry;
}

export class ColosseumStoneSystem {
  readonly group = new Group();
  private readonly geometries: BufferGeometry[] = [];
  private readonly localMaterials: MeshStandardMaterial[] = [];
  private readonly batches: Array<{ parts: ColosseumPart[]; mesh: InstancedMesh }>;
  private readonly activeMeshes: Record<ColosseumPartKind, InstancedMesh>;

  constructor(
    private readonly plan: ColosseumConstructionPlan,
    _materials: MaterialLibrary,
  ) {
    this.group.name = 'colosseum-physical-stone-system';
    const travertine = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, metalness: 0 });
    injectMaterialRecipe(travertine, 'travertine');
    this.localMaterials.push(travertine);

    const matrix = new Matrix4();
    const quaternion = new Quaternion();
    const color = new Color();
    const kinds: ColosseumPartKind[] = ['block', 'arch', 'wedge'];
    this.batches = kinds.map((kind) => {
      const parts = plan.parts.filter((part) => part.kind === kind);
      const geometry = createColosseumPartGeometry(kind);
      this.geometries.push(geometry);
      const mesh = new InstancedMesh(geometry, travertine, Math.max(1, parts.length));
      mesh.name = `colosseum-parts-${kind}`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      mesh.count = 0;
      parts.forEach((part, index) => {
        setTransform(mesh, index, part.finalPosition, part.finalRotation, part.dimensions, matrix, quaternion);
        mesh.setColorAt(index, stoneColor(part.material, part.colorVariation, color));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      this.group.add(mesh);
      return { parts, mesh };
    });

    this.activeMeshes = {
      block: this.createActiveMesh('block', travertine),
      arch: this.createActiveMesh('arch', travertine),
      wedge: this.createActiveMesh('wedge', travertine),
    };
  }

  private createActiveMesh(kind: ColosseumPartKind, material: MeshStandardMaterial): InstancedMesh {
    const geometry = createColosseumPartGeometry(kind);
    this.geometries.push(geometry);
    const mesh = new InstancedMesh(geometry, material, this.plan.maxActive);
    mesh.name = `colosseum-active-${kind}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.count = 0;
    this.group.add(mesh);
    return mesh;
  }

  update(t: number): ActiveColosseumOperation[] {
    const matrix = new Matrix4();
    const quaternion = new Quaternion();
    const color = new Color();
    const route = this.plan.routes[0]!;
    for (const batch of this.batches) {
      let cursor = 0;
      for (const part of batch.parts) {
        const state = colosseumPartStateAt(part, route, t);
        if (!state.visible || state.phase !== 'seated') continue;
        setTransform(batch.mesh, cursor, state.position, state.rotation, part.dimensions, matrix, quaternion);
        batch.mesh.setColorAt(cursor, stoneColor(part.material, part.colorVariation, color));
        cursor += 1;
      }
      batch.mesh.count = cursor;
      batch.mesh.instanceMatrix.needsUpdate = true;
      if (batch.mesh.instanceColor) batch.mesh.instanceColor.needsUpdate = true;
    }

    const operations = activeColosseumOperationsAt(this.plan, t);
    const cursors: Record<ColosseumPartKind, number> = { block: 0, arch: 0, wedge: 0 };
    for (const operation of operations) {
      const kind = operation.part.kind;
      const mesh = this.activeMeshes[kind];
      const index = cursors[kind];
      setTransform(
        mesh,
        index,
        operation.state.position,
        operation.state.rotation,
        operation.part.dimensions,
        matrix,
        quaternion,
      );
      mesh.setColorAt(index, stoneColor(operation.part.material, operation.part.colorVariation, color));
      cursors[kind] += 1;
    }
    for (const kind of ['block', 'arch', 'wedge'] as const) {
      const mesh = this.activeMeshes[kind];
      mesh.count = cursors[kind];
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    return operations;
  }

  dispose(): void {
    for (const geometry of this.geometries) geometry.dispose();
    for (const batch of this.batches) batch.mesh.dispose();
    for (const mesh of Object.values(this.activeMeshes)) mesh.dispose();
    for (const material of this.localMaterials) material.dispose();
  }
}
