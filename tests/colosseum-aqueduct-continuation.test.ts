import { describe, expect, it, vi } from 'vitest';
import { DoubleSide, Mesh, MeshStandardMaterial, Raycaster, Vector3 } from 'three';
import { COLOSSEUM_AQUEDUCT as A } from '../src/data/colosseumAqueduct';
import { AQUEDUCT_LENGTH, AQUEDUCT_PITCH, aqueductPierAt, aqueductPointAt } from '../src/engine/colosseumAqueduct';
import { ColosseumAqueductContinuation } from '../src/render/three/ColosseumAqueductContinuation';

function hits(mesh: Mesh, distance: number, height: number): number {
  const p = aqueductPointAt(distance), normal = new Vector3(-A.direction[1],0,A.direction[0]);
  const origin = new Vector3(p.x,p.springing + height,p.z).addScaledVector(normal, 8);
  return new Raycaster(origin, normal.negate()).intersectObject(mesh).length;
}

describe('upstream aqueduct continuation', () => {
  it('contains real three-chord arch openings and solid spandrels at the join, middle and far end', () => {
    const continuation = new ColosseumAqueductContinuation();
    try {
      const mesh = continuation.group.children[0] as Mesh;
      mesh.updateMatrixWorld();
      for (const bay of [0, Math.floor(A.continuationBays / 2), A.continuationBays - 1]) {
        const start = AQUEDUCT_LENGTH + bay * AQUEDUCT_PITCH;
        expect(hits(mesh, start + AQUEDUCT_PITCH / 2, 1)).toBe(0);
        expect(hits(mesh, start + AQUEDUCT_PITCH / 2, 3)).toBe(0);
        expect(hits(mesh, start + AQUEDUCT_PITCH / 2, A.archRise + .3)).toBeGreaterThan(0);
        expect(hits(mesh, start + A.pierWidth / 2 + .1, 1.5)).toBeGreaterThan(0);
        expect(hits(mesh, start + AQUEDUCT_PITCH, -.5)).toBeGreaterThan(0);
      }
    } finally { continuation.dispose(); }
  });

  it('joins the Blender channel at the same position and grade and reaches beyond the film fog envelope', () => {
    const continuation = new ColosseumAqueductContinuation();
    try {
      const mesh = continuation.group.children[0] as Mesh, p = mesh.geometry.attributes.position!;
      const points = Array.from({ length: p.count }, (_, i) => new Vector3().fromBufferAttribute(p, i));
      const distance = (v: Vector3) => (v.x - A.start[0]) * A.direction[0] + (v.z - A.start[1]) * A.direction[1];
      const join = points.filter(v => Math.abs(distance(v) - AQUEDUCT_LENGTH) < .0001);
      const farDistance = AQUEDUCT_LENGTH + A.continuationBays * AQUEDUCT_PITCH + A.pierWidth / 2;
      const end = points.filter(v => Math.abs(distance(v) - farDistance) < .0002);
      expect(join.length).toBeGreaterThan(6);
      expect(end.length).toBeGreaterThan(6);
      expect(Math.min(...points.map(distance))).toBeCloseTo(AQUEDUCT_LENGTH, 4);
      expect(farDistance - AQUEDUCT_LENGTH).toBeGreaterThan(1800);
      const top = A.spandrelTop + A.channelHeight + A.capHeight;
      expect(Math.max(...join.map(v => v.y))).toBeCloseTo(aqueductPointAt(AQUEDUCT_LENGTH).springing + top, 4);
      expect(Math.max(...end.map(v => v.y))).toBeCloseTo(aqueductPointAt(farDistance).springing + top, 4);
      for (const v of points) expect(Math.abs((v.x - A.start[0]) * -A.direction[1] + (v.z - A.start[1]) * A.direction[0])).toBeLessThan(.0001);
    } finally { continuation.dispose(); }
  });

  it('grounds every new pier from the production four-corner sampler without duplicating the shared near pier', () => {
    const continuation = new ColosseumAqueductContinuation();
    try {
      const mesh = continuation.group.children[0] as Mesh, p = mesh.geometry.attributes.position!;
      const verticesPerArch = (A.continuationSegments + 2) * 6;
      for (let bay = 0; bay < A.continuationBays; bay++) {
        const first = bay * (verticesPerArch + 6) + verticesPerArch;
        const pier = aqueductPierAt(A.pierCount + bay);
        const left = new Vector3().fromBufferAttribute(p, first), right = new Vector3().fromBufferAttribute(p, first + 1);
        expect(left.y).toBeCloseTo(pier.ground, 5);
        expect(right.y).toBeCloseTo(pier.ground, 5);
        expect((left.x + right.x) / 2).toBeCloseTo(pier.x, 3);
        expect((left.z + right.z) / 2).toBeCloseTo(pier.z, 3);
        if (bay === 0) expect(pier.distance).toBeCloseTo(AQUEDUCT_LENGTH + AQUEDUCT_PITCH, 5);
      }
    } finally { continuation.dispose(); }
  });

  it('uses one two-sided opaque batch below 3000 triangles, no shadow pass, and idempotent disposal', () => {
    const continuation = new ColosseumAqueductContinuation();
    expect(continuation.group.children).toHaveLength(1);
    const mesh = continuation.group.children[0] as Mesh;
    const material = mesh.material as MeshStandardMaterial;
    expect(mesh.geometry.attributes.position!.count / 3).toBeLessThanOrEqual(3000);
    expect(mesh.castShadow).toBe(false);
    expect(material.side).toBe(DoubleSide);
    expect(material.transparent).toBe(false);
    const geometryDisposal = vi.spyOn(mesh.geometry, 'dispose'), materialDisposal = vi.spyOn(material, 'dispose');
    continuation.dispose();
    continuation.dispose();
    expect(geometryDisposal).toHaveBeenCalledOnce();
    expect(materialDisposal).toHaveBeenCalledOnce();
  });
});
