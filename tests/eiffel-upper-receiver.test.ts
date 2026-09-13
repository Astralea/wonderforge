import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import sourceDatums from '../artifacts/eiffel-upper-material-chain-2026-09-08/source-datums.json';
import {
  EIFFEL_UPPER_RECEIVER_BOLT_ROLES, EIFFEL_UPPER_RECEIVER_FASTENING_DURATION,
  EIFFEL_UPPER_RECEIVER_HOLE_CENTERS, EIFFEL_UPPER_RECEIVER_WRENCH_GRIP, eiffelUpperReceiverDesignAtYaw,
  inspectEiffelUpperReceiverRelease, sampleEiffelUpperReceiver,
  sampleEiffelUpperReceiverReferenceWorker, transformEiffelUpperReceiverPoint,
  type EiffelUpperReceiverReleaseWitness,
} from '../src/engine/eiffelUpperReceiver';
import { sampleEiffelSecondFloorRelaySequence } from '../src/engine/eiffelSecondFloorRelaySequence';
import { sampleEiffelSecondFloorRelayRoute } from '../src/engine/eiffelSecondFloorRelayRoute';
import type { RigidVec3 as V } from '../src/engine/eiffelRigid';

const distance = (a: readonly number[], b: readonly number[]) => Math.hypot(...a.map((v, i) => v - b[i]!));
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const design = eiffelUpperReceiverDesignAtYaw(0);
const at = (t: number) => sampleEiffelUpperReceiver(t, design);
const sourceSha = createHash('sha256').update(readFileSync('public/models/eiffel-second-floor-relay/relay.glb')).digest('hex');
function release(): EiffelUpperReceiverReleaseWitness {
  const receiver = at(110), master = receiver.masterLinkPose.position, position = add(master, [0, -.002, 0]);
  return {
    receiver, sourceAssetSha256: sourceSha, upperCartChocked: true,
    masterSaddleContact: add(master, [0, -.148, 0]), masterUndersideContact: add(master, [0, -.148, 0]),
    clevisPose: { position, quaternion: [0, 0, 0, 1] },
    rope: receiver.secondHoist.worldRope.map((p, i, all) => i === all.length - 1 ? add(position, [0, .325, 0]) : p),
    unloadDrop: .002, keeperAngle: Math.PI / 2, pinWithdrawal: .084,
    keeperHandContact: null, pinHandContact: add(position, [0, .104, .048 + .084]),
  };
}

describe('isolated upper receiving candidate', () => {
  it('keeps the actual landed stair/carrier and gives the upper crew and bolts separate identities', () => {
    const terminal = sampleEiffelSecondFloorRelaySequence(348), before = JSON.stringify(terminal);
    const initial = at(0), end = at(110);
    for (const s of [initial, at(55), end]) {
      expect(s.partId).toBe('summit-access-stair-m000-c000');
      expect(s.seated).toBe(false);
      expect(s.carrierPose).toEqual(terminal.carrierPose);
      expect(s.payloadPose).toEqual(terminal.payloadPose);
      expect(s.masterLinkPose).toEqual(terminal.masterLinkPose);
      expect(distance(s.upperCartPose.position, sourceDatums.roles['relay-upper-cart'].origin)).toBeLessThan(5e-5);
      expect(s.hardwareRoles.every(r => r.role.startsWith('upper-'))).toBe(true);
      expect(new Set(s.hardwareRoles.map(r => r.role)).size).toBe(s.hardwareRoles.length);
      expect(s.geometryAdmitted).toBe(false);
    }
    expect(initial.bolts.map(b => b.role)).toEqual(EIFFEL_UPPER_RECEIVER_BOLT_ROLES);
    expect(initial.bolts.every(b => b.holder === 'tray' && b.turnsTightened === 0)).toBe(true);
    expect(end.bolts.every(b => b.holder === 'cart-nut' && b.secured)).toBe(true);
    expect(JSON.stringify(sampleEiffelSecondFloorRelaySequence(348))).toBe(before);
  });

  it('exposes a true rigid isometry of all source body parts for independent geometry audits', () => {
    for (const yaw of [0, Math.PI / 2, Math.PI, -.7]) {
      const d = eiffelUpperReceiverDesignAtYaw(yaw);
      for (const t of [112, 116, 117, 118, 121, 122, 128, 148, 190, 222]) {
        const raw = sampleEiffelUpperReceiverReferenceWorker(t, design), actual = sampleEiffelUpperReceiverReferenceWorker(t, d);
        expect(actual.roles).toHaveLength(18);
        raw.roles.forEach((r, i) => {
          const reference = r.position.map((v, k) => v - design.translation[k]!) as unknown as V;
          expect(distance(actual.roles[i]!.position, transformEiffelUpperReceiverPoint(reference, d))).toBeLessThan(1e-10);
          expect(Math.hypot(...actual.roles[i]!.quaternion)).toBeCloseTo(1, 10);
        });
        expect(distance(actual.hands[0]!, actual.feet[1]!)).toBeCloseTo(distance(raw.hands[0]!, raw.feet[1]!), 10);
      }
    }
    const quarter = sampleEiffelUpperReceiver(110, eiffelUpperReceiverDesignAtYaw(Math.PI / 2));
    expect(quarter.bolts.every(b => EIFFEL_UPPER_RECEIVER_HOLE_CENTERS.some(h => distance(h, b.position) < 5e-5))).toBe(true);
  });

  it('keeps the carried shaft in a real hand, the stored shaft on its holder, and a foot planted', () => {
    for (let t = 0; t <= 110; t += .5) {
      const s = at(t);
      expect(s.worker.feet.some(f => Math.abs(f[1] - s.upperCartPose.position[1]) < 1e-7)).toBe(true);
      for (const b of s.bolts) {
        if (b.holder === 'worker') expect(Math.min(...s.worker.hands.map(h => distance(h, b.holderContact!)))).toBeLessThan(1e-7);
        if (b.holder === 'tray') expect(b.holderContact![1]).toBeCloseTo(s.upperCartPose.position[1] + .31, 8);
        if (b.shaftWithdrawal < .24 && b.holder !== 'tray') {
          expect(Math.hypot(b.position[0] - b.seatedPosition[0], b.position[2] - b.seatedPosition[2])).toBeLessThan(1e-8);
          expect(b.position[1] - b.seatedPosition[1]).toBeCloseTo(b.shaftWithdrawal, 8);
        }
      }
      if (!s.bolts.every(b => b.secured)) expect(s.cartSecured).toBe(false);
    }
  });

  it('performs four full visible tightening turns after each shaft has seated', () => {
    for (let index = 0; index < 4; index++) {
      let previous = at(96 - index * 24).bolts[index]!, total = 0;
      for (let step = 1; step <= 80; step++) {
        const bolt = at(96 - index * 24 + step / 20).bolts[index]!;
        const dot = Math.min(1, Math.abs(bolt.quaternion.reduce((s, q, i) => s + q * previous.quaternion[i]!, 0)));
        total += 2 * Math.acos(dot);
        expect(bolt.turnsTightened).toBeGreaterThanOrEqual(previous.turnsTightened);
        expect(distance(bolt.position, bolt.seatedPosition)).toBeLessThan(1e-8);
        previous = bolt;
      }
      expect(total).toBeCloseTo(8 * Math.PI, 8);
      expect(previous.secured).toBe(true);
    }
  });

  it('is continuous at every fastening/carry/tool join and exact under reverse seeking', () => {
    const walks = [[117, 121], ...Array.from({ length: 4 }, (_, i) => [130 + i * 24, 136 + i * 24]), ...Array.from({ length: 3 }, (_, i) => [140 + i * 24, 145 + i * 24])];
    const joins = [0, 4, 100, 106, 108, 109, 110, ...walks.flatMap(([a, b]) => Array.from({ length: 13 }, (_, i) => 222 - (a! + (b! - a!) * i / 12))), ...Array.from({ length: 4 }, (_, i) => [0, 4, 6, 8, 14, 17, 18, 23, 24].map(local => 222 - (122 + i * 24 + local))).flat()].filter(t => t > 0 && t < 110);
    for (const t of joins) {
      const a = at(t - 1e-7), b = at(t + 1e-7);
      for (const role of a.hardwareRoles) {
        const after = b.hardwareRoles.find(r => r.role === role.role)!;
        expect(distance(role.position, after.position), `${t}:${role.role}`).toBeLessThan(1e-5);
        expect(Math.abs(role.quaternion.reduce((sum, q, i) => sum + q * after.quaternion[i]!, 0))).toBeGreaterThan(1 - 1e-6);
      }
    }
    const frames = Array.from({ length: 23 }, (_, i) => at(i * 5));
    for (let i = frames.length - 1; i >= 0; i--) expect(at(i * 5)).toEqual(frames[i]);
  });

  it('takes alternating planted steps around the measured frame-foot corridor and keeps the wrench in hand', () => {
    const turned = eiffelUpperReceiverDesignAtYaw(Math.PI);
    const rotateByQuaternion = (point: V, q: readonly number[]): V => {
      const u: V = [q[0]!, q[1]!, q[2]!], cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
      const uv = cross(u, point), uuv = cross(u, uv);
      return point.map((v, i) => v + 2 * (q[3]! * uv[i]! + uuv[i]!)) as unknown as V;
    };
    for (let t = 101; t <= 105; t += 1 / 60) {
      const s = sampleEiffelUpperReceiver(t, turned), next = sampleEiffelUpperReceiver(t + 1e-5, turned);
      expect(s.worker.roles).toHaveLength(18); // All are rebuilt by the rejecting fixed-length IK solver.
      expect(s.worker.feet.some((foot, i) => Math.abs(foot[1] - s.upperCartPose.position[1]) < 1e-8 && distance(foot, next.worker.feet[i]!) < 1e-7)).toBe(true);
      expect(distance(add(s.wrench.position, rotateByQuaternion(EIFFEL_UPPER_RECEIVER_WRENCH_GRIP, s.wrench.quaternion)), s.worker.hands[0]!)).toBeLessThan(1e-8);
      for (const foot of s.worker.feet) {
        // Named measured frame shoe has X[-13.9829,-13.1129], Z[-1.74089,-1.15289].
        // The new route crosses its Z band on the west side; actual mesh/body
        // clearance and all sole support rays remain the separate source audit.
        if (foot[2] > -1.8 && foot[2] < -1.1) expect(foot[0]).toBeLessThan(-14.05);
      }
    }
    const middle = sampleEiffelUpperReceiver(103, turned);
    expect(Math.max(...middle.worker.feet.map(f => f[0]))).toBeLessThan(-14.05);
    for (const t of [0, 110]) {
      const current = sampleEiffelUpperReceiver(t, turned).worker;
      expect((current.feet[0]![0] + current.feet[1]![0]) / 2).toBeCloseTo(-14.2, 10);
      expect((current.feet[0]![2] + current.feet[1]![2]) / 2).toBeCloseTo(-2.405, 10);
      if (t === 110) expect(Math.min(...current.feet.map(f => f[2] - .115))).toBeGreaterThan(-2.66843);
    }
    for (let t = 108; t < 110; t += .025) {
      const s = sampleEiffelUpperReceiver(t, turned), next = sampleEiffelUpperReceiver(t + 1e-6, turned);
      expect(s.worker.feet.some((f, i) => f[1] === s.upperCartPose.position[1] && distance(f, next.worker.feet[i]!) < 1e-8)).toBe(true);
    }
    expect(sampleEiffelUpperReceiver(110, turned).worker.feet).toEqual(sampleEiffelUpperReceiver(105, turned).worker.feet);
  });

  it('holds secured with its hoist connected until authored access/release datums exist', () => {
    const a = at(EIFFEL_UPPER_RECEIVER_FASTENING_DURATION), b = at(999);
    expect(b).toEqual(a);
    expect(b.phase).toBe('secured-awaiting-access');
    expect(b.secondHoist.attached).toBe(true);
    expect(b.secondHoist.unloadDrop).toBe(0);
    expect(b.secondHoist.worldRope).toEqual(sampleEiffelSecondFloorRelayRoute(126).secondHoist.worldRope);
    expect(() => at(Number.NaN)).toThrow(/finite/);
    expect(() => sampleEiffelUpperReceiverReferenceWorker(111, design)).toThrow(/access must be authored/);
    expect(() => sampleEiffelUpperReceiver(0, { yaw: 0, translation: [0, 0, 0] })).toThrow(/station/);
  });

  it('rejects false security flags, premature keeper/pin release and an unmoved rope endpoint', () => {
    const good = release();
    expect(inspectEiffelUpperReceiverRelease(good)).toEqual({ cartSecured: true, slingSupport: 'carrier-saddle', released: true, geometryAdmitted: false });
    expect(() => inspectEiffelUpperReceiverRelease({ ...good, receiver: { ...at(10), cartSecured: true } })).toThrow(/four upper bolts/);
    expect(() => inspectEiffelUpperReceiverRelease({ ...good, upperCartChocked: false })).toThrow(/chock/);
    expect(() => inspectEiffelUpperReceiverRelease({ ...good, unloadDrop: 0, clevisPose: { ...good.clevisPose, position: good.receiver.masterLinkPose.position }, rope: good.receiver.secondHoist.worldRope })).toThrow(/Unload/);
    expect(() => inspectEiffelUpperReceiverRelease({ ...good, keeperAngle: 0 })).toThrow(/keeper/);
    expect(() => inspectEiffelUpperReceiverRelease({ ...good, rope: good.receiver.secondHoist.worldRope })).toThrow(/rope/);
    expect(() => inspectEiffelUpperReceiverRelease({ ...good, pinHandContact: [NaN, 0, 0] })).toThrow(/finite/);
    expect(() => inspectEiffelUpperReceiverRelease({ ...good, masterSaddleContact: add(good.masterSaddleContact, [0, -.01, 0]) })).toThrow(/saddle/);
    expect(() => inspectEiffelUpperReceiverRelease({ ...good, receiver: sampleEiffelUpperReceiver(110, eiffelUpperReceiverDesignAtYaw(.2)) })).toThrow(/holes/);
  });
});
