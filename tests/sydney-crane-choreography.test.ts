import { describe, expect, it } from 'vitest';
import { InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three';
import { SYDNEY_CONSTRUCTION as plan } from '../src/data/sydneyConstruction';
import {
  activeSydneyOperationsAt,
  sydneyCraneStateAt,
  sydneyCraneRigAt,
  sydneyPartStateAt,
  SYDNEY_CRANE_JIB_LENGTH,
} from '../src/engine/sydneyConstruction';
import { SydneyWorkSystem } from '../src/render/three/SydneyWorkSystem';
import { createMaterialLibrary } from '../src/render/three/MaterialLibrary';
import type { Wonder } from '../src/data/types';

const distance = (a: readonly number[], b: readonly number[]) =>
  Math.hypot(...a.map((v, i) => v - b[i]!));
const jobs = (crane: 0 | 1) =>
  plan.parts
    .filter((p) => p.graph === 'shell' && p.crane === crane)
    .map((part) => ({
      part,
      from: part.start + part.duration * 0.58,
      until: part.start + part.duration * 0.9,
    }))
    .sort((a, b) => a.from - b.from);
const heroIds = [
  'rib-0--1-4-4',
  'rib-3--1-4-4',
  'tile-0--1-7-0',
  'tile-3--1-5-4',
];

function transitionBoundaries(crane: 0 | 1): number[] {
  const lane = jobs(crane),
    times: number[] = [];
  for (let i = 0; i <= lane.length; i++) {
    const from = i ? lane[i - 1]!.until : 0.24,
      to = lane[i]?.from ?? 0.89;
    for (const u of [0, 0.12, 0.32, 0.7, 0.9, 1])
      times.push(from + (to - from) * u);
  }
  return times;
}

describe('Sydney complete crane choreography', () => {
  it('reserves visible acquisition and return around the same four physical hero loads', () => {
    expect(
      plan.parts
        .filter((p) => p.graph === 'shell' && p.duration > 0.03)
        .map((p) => p.id)
        .sort(),
    ).toEqual([...heroIds].sort());
    for (const crane of [0, 1] as const) {
      const lane = jobs(crane);
      lane.forEach((job, i) => {
        if (job.part.duration <= 0.03) return;
        const previous = lane[i - 1]!,
          next = lane[i + 1]!;
        expect((job.from - previous.until) * 60).toBeGreaterThan(2);
        expect((next.from - job.until) * 60).toBeGreaterThan(1.2);
        const attach = sydneyCraneStateAt(
          crane,
          job.from - (job.from - previous.until) * 0.05,
        );
        expect(attach.phase).toBe('attach');
        expect(attach.partId).toBe(job.part.id);
        expect(attach.loaded).toBe(false);
        const release = sydneyCraneStateAt(
          crane,
          job.until + (next.from - job.until) * 0.05,
        );
        expect(release.phase).toBe('release');
        expect(release.partId).toBe(job.part.id);
        expect(release.loaded).toBe(false);
      });
    }
  });
  it('is continuous at every attachment, release and return subphase, preserving one rigid jib', () => {
    for (const crane of [0, 1] as const)
      for (const t of transitionBoundaries(crane)) {
        const a = sydneyCraneStateAt(crane, t - 1e-11),
          b = sydneyCraneStateAt(crane, t + 1e-11);
        expect(
          distance(a.hook, b.hook),
          `hook crane${crane} at${t}`,
        ).toBeLessThan(0.001);
        expect(
          distance(a.jibTip, b.jibTip),
          `jib crane${crane} at${t}`,
        ).toBeLessThan(0.001);
        for (const state of [a, b]) {
          expect(distance(state.mastTop, state.jibTip)).toBeCloseTo(
            SYDNEY_CRANE_JIB_LENGTH,
            6,
          );
          expect(state.jibTip[1]).toBeGreaterThan(state.hook[1] + 1.2);
        }
      }
  });
  it('shares the actual load hook throughout each hoist without double-booking the rig', () => {
    for (const crane of [0, 1] as const)
      for (const job of jobs(crane)) {
        for (const local of [0.01, 0.3, 0.5, 0.72, 0.99]) {
          const t = job.from + (job.until - job.from) * local;
          const state = sydneyCraneStateAt(crane, t);
          expect(state.phase).toBe('hoist');
          expect(state.loaded).toBe(true);
          expect(state.partId).toBe(job.part.id);
          const attached = sydneyCraneRigAt(
            job.part,
            sydneyPartStateAt(job.part, plan.routes[0]!, t),
          )!;
          expect(state.hook).toEqual(attached.hook);
          expect(state.jibTip).toEqual(attached.jibTip);
          expect(
            jobs(crane).filter((j) => t >= j.from && t < j.until),
          ).toHaveLength(1);
        }
      }
  });
  it('keeps each hero acquisition and release visible across film frames', () => {
    // This measures presentation at 60 fps, not real-world crane velocity.
    // Bulk jobs remain time-lapse and are intentionally outside this bound.
    for (const crane of [0, 1] as const) {
      const lane = jobs(crane);
      lane.forEach((job, i) => {
        if (job.part.duration <= 0.03) return;
        const from = lane[i - 1]!.until,
          until = lane[i + 1]!.from;
        const phases = new Map<string, number>();
        let previous = sydneyCraneStateAt(crane, from),
          maxTipStep = 0;
        for (let t = from + 1 / 3600; t < until; t += 1 / 3600) {
          const state = sydneyCraneStateAt(crane, t);
          phases.set(state.phase, (phases.get(state.phase) ?? 0) + 1);
          maxTipStep = Math.max(
            maxTipStep,
            distance(previous.jibTip, state.jibTip),
          );
          previous = state;
        }
        expect(phases.get('attach')).toBeGreaterThanOrEqual(10);
        expect(phases.get('release')).toBeGreaterThanOrEqual(8);
        for (const phase of [
          'return-lift',
          'return-slew',
          'return-lower',
          'hoist',
        ])
          expect(phases.get(phase)).toBeGreaterThan(5);
        // Previously the real rendered tip jumped 111–145 m on release.
        expect(maxTipStep).toBeLessThan(25);
      });
    }
  });
  it('returns identically after forward playback, reverse seeking and unrelated sample order', () => {
    const times = [
      0.24, 0.29, 0.318, 0.337, 0.4, 0.65, 0.68, 0.704, 0.72, 0.82, 0.86, 0.89,
    ];
    for (const crane of [0, 1] as const) {
      const expected = new Map(
        times.map((t) => [t, sydneyCraneStateAt(crane, t)]),
      );
      for (const t of [...times].reverse())
        expect(sydneyCraneStateAt(crane, t)).toEqual(expected.get(t));
      for (const t of [times[4]!, times[0]!, times[8]!, times[2]!])
        expect(sydneyCraneStateAt(crane, t)).toEqual(expected.get(t));
    }
  });
  it('renders persistent cables and the continuous rig at hero boundaries, including reverse seek', () => {
    const library = createMaterialLibrary({
      palette: { primary: '#ffffff', accent: '#ffffff' },
    } as Wonder);
    const work = new SydneyWorkSystem(library, plan);
    const members = work.group.getObjectByName(
      'sydney-crane-and-plant-members',
    ) as InstancedMesh;
    const cables = work.group.getObjectByName(
      'sydney-crane-cables',
    ) as InstancedMesh;
    const matrix = new Matrix4(),
      position = new Vector3(),
      quaternion = new Quaternion(),
      scale = new Vector3();
    const read = (t: number) => {
      work.update(activeSydneyOperationsAt(plan, t), t);
      expect(cables.count).toBe(4);
      const tips: number[][] = [];
      for (let i = 0; i < members.count; i++) {
        members.getMatrixAt(i, matrix);
        matrix.decompose(position, quaternion, scale);
        if (
          Math.abs(scale.y - SYDNEY_CRANE_JIB_LENGTH) < 0.001 &&
          Math.abs(scale.x - 1.9) < 0.001
        ) {
          tips.push([
            position.x + matrix.elements[4]! / 2,
            position.y + matrix.elements[5]! / 2,
            position.z + matrix.elements[6]! / 2,
          ]);
        }
      }
      expect(tips).toHaveLength(2);
      for (const crane of [0, 1] as const) {
        const state = sydneyCraneStateAt(crane, t);
        expect(distance(tips[crane]!, state.jibTip)).toBeLessThan(0.0001);
        cables.getMatrixAt(crane * 2, matrix);
        const centre = new Vector3().setFromMatrixPosition(matrix);
        const endA = [
          centre.x + matrix.elements[4]! / 2,
          centre.y + matrix.elements[5]! / 2,
          centre.z + matrix.elements[6]! / 2,
        ];
        const endB = [
          centre.x - matrix.elements[4]! / 2,
          centre.y - matrix.elements[5]! / 2,
          centre.z - matrix.elements[6]! / 2,
        ];
        expect(
          Math.min(distance(endA, state.hook), distance(endB, state.hook)),
        ).toBeLessThan(0.0001);
        expect(
          Math.min(distance(endA, state.jibTip), distance(endB, state.jibTip)),
        ).toBeLessThan(0.0001);
      }
      return tips;
    };
    for (const crane of [0, 1] as const)
      for (const job of jobs(crane).filter((j) => j.part.duration > 0.03)) {
        for (const t of [job.from, job.until]) {
          const a = read(t - 1e-9),
            b = read(t + 1e-9);
          expect(distance(a[crane]!, b[crane]!)).toBeLessThan(0.001);
          expect(read(t - 1e-9)).toEqual(a);
        }
      }
    work.dispose();
    library.all.forEach((m) => m.dispose());
  });
});
