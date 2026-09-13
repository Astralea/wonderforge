import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Box3, Mesh } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { sampleEiffelSummitCargo } from '../src/engine/eiffelSummitCargo';
import { sampleEiffelSummitGinPoleClimb } from '../src/engine/eiffelSummitGinPoleClimb';
import { EIFFEL_SUMMIT_CARGO_BRIDLE_LENGTH, sampleEiffelCargoRopeSegment, solveEiffelSummitCargoRope, type EiffelCargoRopeSegment } from '../src/engine/eiffelSummitCargoRope';
import { invertRigidPose, transformRigidPoint, type RigidVec3 as V } from '../src/engine/eiffelRigid';

const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const length = (v: V) => Math.hypot(...v);
const unit = (v: V): V => { const d = length(v); return [v[0] / d, v[1] / d, v[2] / d]; };
function tangent(segment: EiffelCargoRopeSegment, end: boolean): V {
  if (segment.kind === 'line') return unit(sub(segment.end, segment.start));
  const a = end ? segment.sweep : 0;
  return segment.startRadial.map((r, i) => -r * Math.sin(a) + segment.startTangent[i]! * Math.cos(a)) as unknown as V;
}
// Exact minimum squared distance: between box-face crossings each active
// coordinate contributes a quadratic. Include its constrained stationary point.
function boxDistance(a: V, b: V, minimum: V, maximum: V) {
  const d = sub(b, a), cuts = [0, 1];
  for (let i = 0; i < 3; i++) if (Math.abs(d[i]!) > 1e-12) for (const face of [minimum[i]!, maximum[i]!]) {
    const t = (face - a[i]!) / d[i]!;
    if (t > 0 && t < 1) cuts.push(t);
  }
  cuts.sort((x, y) => x - y);
  const candidates = [...cuts];
  for (let j = 1; j < cuts.length; j++) {
    const lo = cuts[j - 1]!, hi = cuts[j]!, middle = (lo + hi) / 2;
    let numerator = 0, denominator = 0;
    for (let i = 0; i < 3; i++) {
      const value = a[i]! + middle * d[i]!, boundary = Math.max(minimum[i]!, Math.min(maximum[i]!, value));
      if (value !== boundary) { numerator += d[i]! * (boundary - a[i]!); denominator += d[i]! ** 2; }
    }
    if (denominator > 0) candidates.push(Math.max(lo, Math.min(hi, numerator / denominator)));
  }
  return Math.sqrt(Math.min(...candidates.map(t => minimum.reduce((sum, lo, i) => sum + Math.max(lo - a[i]! - t * d[i]!, a[i]! + t * d[i]! - maximum[i]!, 0) ** 2, 0))));
}
const mastDistance = (a: V, b: V) => boxDistance(a, b, [-.09, -.09, -7 / 3], [.09, .09, 7 / 3]);
function pointSegmentDistance(point: V, a: V, b: V) {
  const d = sub(b, a), amount = Math.max(0, Math.min(1, dot(sub(point, a), d) / dot(d, d)));
  return length(sub(point, [a[0] + d[0] * amount, a[1] + d[1] * amount, a[2] + d[2] * amount]));
}
function segmentDistance(a: V, b: V, c: V, d: V) {
  const u = sub(b, a), v = sub(d, c), w = sub(a, c), aa = dot(u, u), bb = dot(u, v), cc = dot(v, v), dd = dot(u, w), ee = dot(v, w);
  const denominator = aa * cc - bb * bb;
  const candidates = [pointSegmentDistance(a, c, d), pointSegmentDistance(b, c, d), pointSegmentDistance(c, a, b), pointSegmentDistance(d, a, b)];
  if (denominator > 1e-15) {
    const s = (bb * ee - cc * dd) / denominator, t = (aa * ee - bb * dd) / denominator;
    if (s >= 0 && s <= 1 && t >= 0 && t <= 1) candidates.push(length([w[0] + s * u[0] - t * v[0], w[1] + s * u[1] - t * v[1], w[2] + s * u[2] - t * v[2]]));
  }
  return Math.min(...candidates);
}
const ladder: { name: string; min: V; max: V }[] = [];
beforeAll(async () => {
  // Archived V6 is retained byte-for-byte. The ladder is unchanged by this
  // operation layout; source admission of new guide brackets belongs elsewhere.
  const bytes = readFileSync('artifacts/eiffel-summit-cargo-2026-09-08/model/summit-cargo-rig.glb');
  expect(createHash('sha256').update(bytes).digest('hex')).toBe('17db309645e75584789db5757e4ac0e75abb8135df93c32ef30164548c2e8d46');
  const root = (await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')).scene;
  root.updateMatrixWorld(true);
  root.traverse(object => {
    if (!(object instanceof Mesh)) return;
    if (/ladder-(stile|rung)/.test(object.name)) {
      const bounds = new Box3().setFromObject(object);
      ladder.push({ name: object.name, min: bounds.min.toArray() as unknown as V, max: bounds.max.toArray() as unknown as V });
    }
    object.geometry.dispose();
  });
});

describe('summit cargo tangent rope and fixed bridle candidate', () => {
  it('joins every straight and circular part tangentially across both complete routes', () => {
    for (const assembly of [1, 2] as const) for (let i = 0; i <= 224; i++) {
      const rope = sampleEiffelSummitCargo(i / 2, assembly).cable.rope;
      expect(rope.segments).toHaveLength(19);
      for (let j = 1; j < rope.segments.length; j++) {
        const a = rope.segments[j - 1]!, b = rope.segments[j]!;
        expect(length(sub(a.end, b.start)), `${assembly}/${i}: ${a.id}->${b.id} gap`).toBeLessThan(1e-8);
        expect(dot(tangent(a, true), tangent(b, false)), `${assembly}/${i}: ${a.id}->${b.id} tangent`).toBeGreaterThan(1 - 1e-8);
      }
      expect(rope.deployedLength).toBeCloseTo(rope.segments.reduce((sum, segment) => sum + segment.length, 0), 10);
      expect(rope.deployedLength).toBeCloseTo(rope.fixedLength + rope.freeLength, 10);
      expect(rope.deployedLength).toBeGreaterThan(0);
      expect(rope.deployedLength).toBeLessThan(120);
      expect(rope.sourceClearanceVerified).toBe(false);
      expect(rope.inventory.referenceWoundLength + rope.deployedLength).toBeCloseTo(120, 10);
      expect(rope.inventory.visualWindingAdmitted).toBe(false);
      expect(rope.inventory.drumExitUsesReferenceCore).toBe(false);
      expect(rope.inventory.geometricWindingSolved).toBe(true);
      expect(Math.abs(rope.inventory.residual)).toBeLessThan(1e-8);
    }
  });

  it('keeps the changing ring arc on one continuous branch, including Euler wrapping and phase boundaries', () => {
    for (const assembly of [1, 2] as const) {
      let previous = sampleEiffelSummitCargo(0, assembly).cable.rope;
      for (let i = 1; i <= 2240; i++) {
        const rope = sampleEiffelSummitCargo(i / 20, assembly).cable.rope;
        expect(Math.abs(rope.continuousWrapAngle - previous.continuousWrapAngle)).toBeLessThan(.1);
        expect(Math.abs(rope.deployedLength - previous.deployedLength)).toBeLessThan(.25);
        expect(rope.continuousWrapAngle).toBeGreaterThan(.1);
        expect(rope.continuousWrapAngle).toBeLessThan(Math.PI * 2 - .1);
        previous = rope;
      }
      for (const seconds of [8, 36, 40, 44, 50, 76, 88, 94, 98, 103, 111]) {
        const a = sampleEiffelSummitCargo(seconds - 1e-5, assembly).cable.rope;
        const b = sampleEiffelSummitCargo(seconds + 1e-5, assembly).cable.rope;
        expect(Math.abs(a.deployedLength - b.deployedLength)).toBeLessThan(1e-6);
        expect(sampleEiffelSummitCargo(seconds, assembly).cable.rope).toEqual(sampleEiffelSummitCargo(seconds, assembly).cable.rope);
      }
    }
  });

  it('keeps the drum and lower guides on m073 when the head climbs', () => {
    const first = sampleEiffelSummitCargo(0, 1).cable.rope, second = sampleEiffelSummitCargo(0, 2).cable.rope;
    expect(first.guidePoses.slice(1, 5)).toEqual(second.guidePoses.slice(1, 5));
    expect(first.winding.baseCenter).toEqual([.25, 303.01, .12]);
    expect(second.winding.baseCenter).toEqual(first.winding.baseCenter);
    for (const rope of [first, second]) {
      expect(Math.abs(rope.winding.drumCenter[0] - .25)).toBeLessThanOrEqual(.0732);
      expect(rope.winding.drumCenter.slice(1)).toEqual([303.01, .12]);
    }
    const riser1 = first.segments.find(s => s.id === 'western-riser')!;
    const riser2 = second.segments.find(s => s.id === 'western-riser')!;
    expect(riser2.length - riser1.length).toBeCloseTo(4.666667, 8);
    expect(second.fixedDriveOffsetY).toBe(0);
    for (const assembly of [1, 2] as const) for (const seconds of [0, 36, 76, 94, 101, 112]) {
      const sample = sampleEiffelSummitCargo(seconds, assembly), rope = sample.cable.rope;
      const e: V = [Math.cos(sample.jib.yaw), 0, Math.sin(sample.jib.yaw)];
      const tip = rope.guidePoses.find(p => p.id === 'cargo-tip')!.center;
      expect(dot(sub(tip, sample.jib.head), e)).toBeCloseTo(.30 + 5.70 * Math.cos(sample.jib.pitch), 9);
      expect(tip[1] - sample.jib.head[1]).toBeCloseTo(5.70 * Math.sin(sample.jib.pitch), 9);
      expect(dot(sub(rope.tipBecket, sample.jib.head), e)).toBeCloseTo(.30 + 5.60 * Math.cos(sample.jib.pitch) + .13 * Math.sin(sample.jib.pitch), 9);
    }
  });

  it('clears the actual unchanged ladder and the separate climbing rope with the complete lower route', () => {
    expect(ladder.length).toBeGreaterThanOrEqual(20);
    const climbLines = [0, 35, 70].flatMap(seconds => {
      const points = sampleEiffelSummitGinPoleClimb(seconds).drive.rope.points;
      return points.slice(1).map((point, i) => [points[i]!, point] as const);
    });
    for (const assembly of [1, 2] as const) {
      const rope = sampleEiffelSummitCargo(0, assembly).cable.rope;
      for (const segment of rope.segments.slice(0, 10)) {
        const steps = segment.kind === 'line' ? 1 : 24;
        const sagitta = segment.kind === 'line' ? 0 : segment.radius * (1 - Math.cos(segment.sweep / steps / 2));
        for (let i = 0; i < steps; i++) {
          const a = sampleEiffelCargoRopeSegment(segment, i / steps), b = sampleEiffelCargoRopeSegment(segment, (i + 1) / steps);
          for (const obstacle of ladder) expect(boxDistance(a, b, obstacle.min, obstacle.max) - .006 - sagitta, `${segment.id}/${obstacle.name}`).toBeGreaterThan(.01);
          for (const [c, d] of climbLines) expect(segmentDistance(a, b, c, d) - .012 - sagitta, `${segment.id}/climb`).toBeGreaterThan(.02);
        }
      }
      const bypass = rope.segments.find(segment => segment.id === 'western-return')!;
      expect(bypass.start[0]).toBeCloseTo(-1.26, 12);
      expect(bypass.end[0]).toBeCloseTo(-1.26, 12);
    }
  });

  it('uses circular arc lengths rather than rendering chords, and pays two falls for an isolated block rise', () => {
    const sample = sampleEiffelSummitCargo(60, 1), base = sample.cable.rope;
    const moved = solveEiffelSummitCargoRope({ heel: sample.jib.head, boomYaw: sample.jib.yaw, boomPitch: sample.jib.pitch,
      lowerBlockCenter: [sample.jib.hookPoint[0], sample.jib.hookPoint[1] + .1, sample.jib.hookPoint[2]] });
    // The coupled drum can cross a layer reversal here, changing its first
    // tangent too. Isolate the two falls and travelling sheave for the 2:1
    // tackle assertion; the full path is accounted for by conserved inventory.
    const tackleLength = (rope: typeof base) => rope.segments.slice(-3).reduce((sum, part) => sum + part.length, 0);
    expect(tackleLength(base) - tackleLength(moved)).toBeCloseTo(.2, 4);
    expect(moved.inventory.woundLength - base.inventory.woundLength).toBeCloseTo(base.deployedLength - moved.deployedLength, 9);
    const chordLength = base.points.slice(1).reduce((sum, p, i) => sum + length(sub(p, base.points[i]!)), 0);
    expect(base.deployedLength).toBeGreaterThan(chordLength);
    expect(base.deployedLength - chordLength).toBeLessThan(.005);
    for (const segment of base.segments) if (segment.kind === 'arc') {
      for (let i = 0; i <= 12; i++) expect(length(sub(sampleEiffelCargoRopeSegment(segment, i / 12), segment.center))).toBeCloseTo(segment.radius, 9);
    }
  });

  it('preserves both bridle lengths and keeps their complete segments outside the mast throughout the hinge and yaw', () => {
    for (const assembly of [1, 2] as const) for (let i = 0; i <= 224; i++) {
      const sample = sampleEiffelSummitCargo(i / 2, assembly), inverse = invertRigidPose(sample.parentPose);
      expect(sample.cable.rope.bridle).toHaveLength(2);
      for (const leg of sample.cable.rope.bridle) {
        // The final source quaternion is Float32; retain a one-micrometre bound.
        expect(Math.abs(leg.length - EIFFEL_SUMMIT_CARGO_BRIDLE_LENGTH)).toBeLessThan(1e-6);
        expect(mastDistance(transformRigidPoint(inverse, leg.start), transformRigidPoint(inverse, leg.end))).toBeGreaterThan(.022);
      }
    }
  });

  it('rejects invented side offsets, nonplanar blocks, absent headroom, and the rejected short bridle', () => {
    const sample = sampleEiffelSummitCargo(112, 1);
    const input = { heel: sample.jib.head, boomYaw: sample.jib.yaw, boomPitch: sample.jib.pitch, lowerBlockCenter: sample.jib.hookPoint };
    expect(() => solveEiffelSummitCargoRope({ ...input, tipSideOffset: .2 })).toThrow(/side offset/);
    expect(() => solveEiffelSummitCargoRope({ ...input, lowerBlockCenter: [1, 305, 1] })).toThrow(/plane/);
    expect(() => solveEiffelSummitCargoRope({ ...input, lowerBlockCenter: [sample.jib.hookPoint[0], 350, sample.jib.hookPoint[2]] })).toThrow(/headroom/);
    expect(() => solveEiffelSummitCargoRope({ ...input, lowerBlockCenter: [sample.upperCollarWorld[0], sample.upperCollarWorld[1] + .35, sample.upperCollarWorld[2]], bridleAnchors: sample.bridle.slingEars })).toThrow(/bridle/);
  });
});
