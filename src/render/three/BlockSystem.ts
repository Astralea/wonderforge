import {
  BoxGeometry,
  Color,
  Group,
  InstancedMesh,
  Matrix4,
  Quaternion,
  Vector3,
} from 'three';
import type {
  BlockMaterial,
  ConstructionBlock,
  CoreFillCell,
  GizaConstructionPlan,
} from '../../data/constructionTypes';
import { activeConstructionStatesAt, type ActiveConstructionState } from '../../engine/construction';
import type { MaterialLibrary } from './MaterialLibrary';

interface SettledBatch {
  blocks: ConstructionBlock[];
  mesh: InstancedMesh;
}

interface CoreBatch {
  monument: 'khufu' | 'khafre' | 'menkaure';
  cells: CoreFillCell[];
  mesh: InstancedMesh;
}

function upperBound(blocks: ConstructionBlock[], t: number): number {
  let low = 0;
  let high = blocks.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    const block = blocks[middle]!;
    if (block.start + block.duration <= t) low = middle + 1;
    else high = middle;
  }
  return low;
}

/**
 * Settled order: ascending seat time. The settled set at any `t` is then a
 * true prefix, whatever the schedule does. Plan order is NOT good enough:
 * starts ascend, but durations vary per course (heavy courses move stones
 * more deliberately), so `start + duration` zigzags at course boundaries —
 * and a binary search over that once dropped whole wedges of finished
 * masonry near the end of the movie.
 */
function bySeatTime(a: ConstructionBlock, b: ConstructionBlock): number {
  return a.start + a.duration - (b.start + b.duration);
}

export class BlockSystem {
  readonly group = new Group();
  private readonly geometry = new BoxGeometry(1, 1, 1, 1, 1, 1);
  private readonly settled: SettledBatch[] = [];
  private readonly activeBatches = new Map<BlockMaterial, InstancedMesh>();
  private readonly coreBatches: CoreBatch[] = [];

  constructor(
    private readonly plan: GizaConstructionPlan,
    materials: MaterialLibrary,
  ) {
    this.group.name = 'physical-masonry-block-system';
    const materialKeys: BlockMaterial[] = ['core-limestone', 'casing-limestone', 'granite'];
    const matrix = new Matrix4();
    const rotation = new Quaternion();
    const color = new Color();

    for (const materialKey of materialKeys) {
      const blocks = plan.blocks
        .filter((block) => block.material === materialKey)
        .sort(bySeatTime);
      const batch = new InstancedMesh(this.geometry, materials.block[materialKey], blocks.length);
      batch.name = `settled-${materialKey}-stones`;
      batch.castShadow = true;
      batch.receiveShadow = true;
      batch.count = 0;
      for (let index = 0; index < blocks.length; index += 1) {
        const block = blocks[index]!;
        rotation.setFromAxisAngle(new Vector3(0, 1, 0), block.finalYaw);
        matrix.compose(
          new Vector3(...block.finalPosition),
          rotation,
          new Vector3(...block.dimensions),
        );
        batch.setMatrixAt(index, matrix);
        const brightness = 1 + block.colorVariation * 0.055;
        color.setRGB(brightness, brightness, brightness);
        batch.setColorAt(index, color);
      }
      batch.instanceMatrix.needsUpdate = true;
      if (batch.instanceColor) batch.instanceColor.needsUpdate = true;
      // InstancedMesh caches its bounding sphere on FIRST render. The movie's
      // first frame renders these with count 0, so the cached bounds are
      // degenerate at the world origin — and when the late-movie camera
      // excludes the origin, the whole batch is culled from the camera pass
      // while the sun's wider shadow frustum still draws it: finished
      // pyramids vanished leaving only their shadows. These batches span the
      // scene and mutate every frame; culling them is never a win.
      batch.frustumCulled = false;
      this.settled.push({ blocks, mesh: batch });
      this.group.add(batch);
    }

    for (const materialKey of materialKeys) {
      const active = new InstancedMesh(this.geometry, materials.block[materialKey], 24);
      active.name = `active-${materialKey}-construction-stones`;
      active.castShadow = true;
      active.receiveShadow = true;
      active.count = 0;
      active.frustumCulled = false; // per-frame instances; see settled note
      this.activeBatches.set(materialKey, active);
      this.group.add(active);
    }

    for (const monument of ['khufu', 'khafre', 'menkaure'] as const) {
      const cells = plan.coreCells.filter((cell) => cell.monument === monument);
      const core = new InstancedMesh(this.geometry, materials.block['core-limestone'], cells.length);
      core.name = `${monument}-supported-stacked-core-fill`;
      core.castShadow = true;
      core.receiveShadow = true;
      core.count = 0;
      core.frustumCulled = false; // per-frame instances; see settled note
      this.coreBatches.push({ monument, cells, mesh: core });
      this.group.add(core);
    }
  }

  private updateCoreFill(t: number): void {
    const matrix = new Matrix4();
    const rotation = new Quaternion();
    const color = new Color();
    const axis = new Vector3(0, 1, 0);
    for (const batch of this.coreBatches) {
      let activeCourse = -1;
      for (const block of this.plan.blocks) {
        if (block.monument === batch.monument && block.start <= t) {
          activeCourse = Math.max(activeCourse, block.course);
        }
      }
      if (activeCourse < 0) {
        batch.mesh.count = 0;
        continue;
      }
      // Retain the active working deck plus three complete supporting courses.
      // Deeper cells remain in the pure construction plan but are culled once
      // permanently occluded by exterior masonry.
      const minimumVisibleCourse = Math.max(0, activeCourse - 3);
      let cursor = 0;
      for (const cell of batch.cells) {
        if (
          cell.course < minimumVisibleCourse
          || cell.course > activeCourse
          || cell.readyAt > t
        ) continue;
        rotation.setFromAxisAngle(axis, cell.colorVariation * 0.035);
        matrix.compose(
          new Vector3(...cell.finalPosition),
          rotation,
          new Vector3(...cell.dimensions),
        );
        batch.mesh.setMatrixAt(cursor, matrix);
        const brightness = 0.91 + cell.colorVariation * 0.045;
        color.setRGB(brightness, brightness * 0.985, brightness * 0.94);
        batch.mesh.setColorAt(cursor, color);
        cursor += 1;
      }
      batch.mesh.count = cursor;
      batch.mesh.instanceMatrix.needsUpdate = true;
      if (batch.mesh.instanceColor) batch.mesh.instanceColor.needsUpdate = true;
    }
  }

  update(t: number): ActiveConstructionState[] {
    for (const batch of this.settled) batch.mesh.count = upperBound(batch.blocks, t);
    this.updateCoreFill(t);
    const active = activeConstructionStatesAt(this.plan, t);
    const cursors = new Map<BlockMaterial, number>();
    const matrix = new Matrix4();
    const rotation = new Quaternion();
    for (const operation of active) {
      const material = operation.block.material;
      const batch = this.activeBatches.get(material)!;
      const cursor = cursors.get(material) ?? 0;
      rotation.setFromAxisAngle(new Vector3(0, 1, 0), operation.state.yaw);
      matrix.compose(
        new Vector3(...operation.state.position),
        rotation,
        new Vector3(...operation.block.dimensions),
      );
      batch.setMatrixAt(cursor, matrix);
      cursors.set(material, cursor + 1);
    }
    for (const [material, batch] of this.activeBatches) {
      batch.count = cursors.get(material) ?? 0;
      batch.instanceMatrix.needsUpdate = true;
    }
    return active;
  }

  dispose(): void {
    this.geometry.dispose();
  }
}
