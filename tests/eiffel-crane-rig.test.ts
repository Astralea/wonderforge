import { describe, expect, it } from 'vitest';
import { InstancedMesh, Matrix4 } from 'three';
import { sampleEiffelCrane } from '../src/engine/eiffelCrane';
import type { RigidPose } from '../src/engine/eiffelRigid';
import { EiffelCraneRig } from '../src/render/three/EiffelCraneRig';

function batch(rig: EiffelCraneRig, name: string): InstancedMesh {
  const mesh = rig.group.getObjectByName(`eiffel-crane-${name}`);
  if (!(mesh instanceof InstancedMesh)) throw new Error(`Missing Eiffel crane ${name} batch`);
  return mesh;
}

function axisLength(matrix: Matrix4, column: 0 | 1 | 2): number {
  const offset = column * 4;
  return Math.hypot(matrix.elements[offset]!, matrix.elements[offset + 1]!, matrix.elements[offset + 2]!);
}

function instanceMatrix(mesh: InstancedMesh, index: number): Matrix4 {
  const matrix = new Matrix4();
  mesh.getMatrixAt(index, matrix);
  return matrix;
}

describe('Eiffel supported crane renderer geometry', () => {
  it('keeps the rendered mast, jib chords and truss diagonals fixed through dense luff and slew', () => {
    const rig = new EiffelCraneRig();
    const station = { base: [2, 4, -3] as const, mastHeight: 20, boomLength: 8 };
    const diagonalLength = Math.hypot(station.boomLength / 4, 0.44);
    for (let index = 0; index <= 360; index += 1) {
      const phase = index / 360;
      const reach = 0.2 + 7.2 * (0.5 - 0.5 * Math.cos(phase * Math.PI * 2));
      const angle = phase * Math.PI * 4;
      const pose: RigidPose = {
        position: [station.base[0] + Math.cos(angle) * reach, 6 + phase * 2, station.base[2] + Math.sin(angle) * reach],
        quaternion: [0, Math.sin(angle / 2), 0, Math.cos(angle / 2)],
      };
      const sample = sampleEiffelCrane(station, pose, [[-1, 0.5, 0], [1, 0.5, 0]]);
      rig.update(sample);
      const iron = batch(rig, 'iron');
      expect(iron.count).toBe(18);
      expect(Math.abs(axisLength(instanceMatrix(iron, 0), 1) - station.mastHeight)).toBeLessThan(1e-5);
      for (const chord of [3, 4]) {
        expect(Math.abs(axisLength(instanceMatrix(iron, chord), 1) - station.boomLength), `jib chord ${chord} at ${phase}`).toBeLessThan(1e-5);
      }
      for (let diagonal = 5; diagonal <= 12; diagonal += 1) {
        expect(Math.abs(axisLength(instanceMatrix(iron, diagonal), 1) - diagonalLength), `truss ${diagonal} at ${phase}`).toBeLessThan(1e-5);
      }
      const guyLength = Math.hypot(station.mastHeight - .3, 1.45, 1.15);
      for (let guy = 14; guy <= 17; guy += 1) expect(Math.abs(axisLength(instanceMatrix(iron, guy), 1) - guyLength)).toBeLessThan(1e-5);
    }
    rig.dispose();
  });

  it('places both operator boot bottoms exactly on the base deck top', () => {
    const rig = new EiffelCraneRig();
    const sample = sampleEiffelCrane(
      { base: [-8, 11.25, 6], mastHeight: 12, boomLength: 8.4 },
      { position: [-4, 14, 7], quaternion: [0, 0, 0, 1] },
      [[-0.8, 0.4, 0], [0.8, 0.4, 0]],
    );
    rig.update(sample);
    const wood = batch(rig, 'wood');
    const clothes = batch(rig, 'clothes');
    const deck = instanceMatrix(wood, 0);
    const deckTop = deck.elements[13]! + axisLength(deck, 1) / 2;
    expect(clothes.count).toBe(3);
    for (const boot of [1, 2]) {
      const matrix = instanceMatrix(clothes, boot);
      const bootBottom = matrix.elements[13]! - axisLength(matrix, 1) / 2;
      expect(Math.abs(bootBottom - deckTop)).toBeLessThan(1e-6);
    }
    rig.dispose();
  });
});
