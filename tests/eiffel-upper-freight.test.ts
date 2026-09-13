import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Mesh, Object3D, Vector3 } from 'three';
import design from '../artifacts/eiffel-upper-material-chain-2026-09-08/freight-design.json';
import { sampleEiffelSecondFloorRelayRoute } from '../src/engine/eiffelSecondFloorRelayRoute';
import { EIFFEL_UPPER_RECEIVER_BOLT_ROLES } from '../src/engine/eiffelUpperReceiver';
import {
  EIFFEL_UPPER_FREIGHT_DURATION, inspectEiffelUpperFreightStart, sampleEiffelUpperFreight, solveEiffelUpperFreightRope,
  type EiffelUpperFreightPickup, type EiffelUpperFreightStart,
} from '../src/engine/eiffelUpperFreight';
import type { RigidVec3 as V } from '../src/engine/eiffelRigid';

const rigPath = 'artifacts/eiffel-upper-material-chain-2026-09-08/model/upper-197-freight-frame.glb';
const carrierPath = 'public/models/eiffel-long-load-first-floor/carrier.glb';
const hash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
const distance = (a: readonly number[], b: readonly number[]) => Math.hypot(...a.map((x, i) => x - b[i]!));
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const prior = sampleEiffelSecondFloorRelayRoute(126);
const masterOffset = prior.masterLinkPose.position[1] - prior.carrierPose.position[1];
const payloadOffset = prior.payloadPose.position[1] - prior.carrierPose.position[1];
const identity = [0, 0, 0, 1] as const;

/** Synthetic datum-consistency witness only. This is NOT a supported cartbridge claim. */
function witness(position: V = [-2, 118.2, -1.8]): EiffelUpperFreightStart {
  const master = add(position, [0, masterOffset, 0]);
  return { partId: 'summit-access-stair-m000-c000', sourceHashes: { carrier: hash(carrierPath), support: hash(rigPath), rig: hash(rigPath), clevis: hash(rigPath) },
    carrierPose: { position, quaternion: identity }, payloadPose: { position: add(position, [0, payloadOffset, 0]), quaternion: identity }, masterLinkPose: { position: master, quaternion: identity },
    support: { role: 'unit-fixture-only-not-admitted', cartChocked: true, corners: Array.from({ length: 4 }, (_, index) => {
      const corner = add(position, [index < 2 ? -.22 : .22, 0, index % 2 === 0 ? -.22 : .22]);
      return { index, carrierPoint: corner, surfacePoint: corner, surfaceMesh: 'synthetic-unit-contact-not-a-source-proof' };
    }) },
    bolts: EIFFEL_UPPER_RECEIVER_BOLT_ROLES.map(role => ({ role, holder: 'tray', turnsReleased: 4, shaftWithdrawal: .44 })),
    connection: { role: 'upper-197-clevis', pose: { position: master, quaternion: identity }, ropeApex: add(master, [0, .325, 0]), pinWithdrawal: 0, keeperAngle: 0, tensioned: true, previousHoistReleased: true } };
}
const at = (t: number) => sampleEiffelUpperFreight(t, witness(), design);
let rig: Object3D, carrier: Object3D;
async function load(path: string) {
  const b = readFileSync(path), gltf = await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '');
  gltf.scene.updateMatrixWorld(true); return gltf.scene;
}
function role(root: Object3D, id: string) {
  const matches: Object3D[] = []; root.traverse(o => { if (o.userData.wf_role === id) matches.push(o); });
  expect(matches, id).toHaveLength(1); return matches[0]!;
}
function vertices(mesh: Mesh) {
  const p = mesh.geometry.getAttribute('position');
  return Array.from({ length: p.count }, (_, i) => new Vector3().fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld));
}

describe('isolated actual-source197m freight trajectory and tangent rope', () => {
  beforeAll(async () => { [rig, carrier] = await Promise.all([load(rigPath), load(carrierPath)]); });

  it('matches actual exported guide centres, axle planes, groove radii and barrel takeoff', () => {
    const rope = solveEiffelUpperFreightRope([-2, 118.2, design.bridgeZ], design);
    for (const guide of rope.guidePoses) {
      const root = role(rig, guide.role), centre = root.getWorldPosition(new Vector3());
      expect(distance(centre.toArray(), guide.centre), guide.role).toBeLessThan(5e-5);
      const groove = root.children.find(o => o instanceof Mesh && o.name.includes('groove')) as Mesh;
      expect(groove).toBeDefined();
      const points = vertices(groove), axis = new Vector3(...guide.axis);
      const offsets = points.map(p => p.sub(centre));
      const radii = offsets.map(p => p.clone().addScaledVector(axis, -p.dot(axis)).length());
      expect(Math.max(...radii), guide.role).toBeCloseTo(.242, 4);
      expect(Math.max(...offsets.map(p => Math.abs(p.dot(axis)))), guide.role).toBeCloseTo(.045, 4);
    }
    const drum = role(rig, 'upper-197-drum'), core = drum.children.find(o => o instanceof Mesh && o.name.startsWith('drum-core')) as Mesh;
    const p = vertices(core), c = design.reeving.drumCentre;
    expect(Math.max(...p.map(v => Math.hypot(v.x - c[0]!, v.y - c[1]!)))).toBeCloseTo(.292, 4);
    expect(Math.hypot(design.reeving.drumTakeoff[0]! - c[0]!, design.reeving.drumTakeoff[1]! - c[1]!)).toBeCloseTo(.292 + design.reeving.ropeRadius, 10);
    expect(design.reeving.drumTakeoff[2]).toBeGreaterThan(Math.min(...p.map(v => v.z)));
    expect(design.reeving.drumTakeoff[2]).toBeLessThan(Math.max(...p.map(v => v.z)));
    expect(role(rig, 'upper-197-clevis').parent).toBe(rig);
    expect(role(rig, 'upper-197-clevis-pin').parent).toBe(role(rig, 'upper-197-clevis'));
    const shoe = role(carrier, 'bottom-shoe') as Mesh;
    const corners = vertices(shoe);
    for (const x of [-.22, .22]) for (const z of [-.22, .22]) expect(Math.min(...corners.map(p => distance(p.toArray(), [x, 0, z])))).toBeLessThan(1e-6);
  });

  it('uses tangent circular arcs at every guide and keeps all free spans positive over both lane ranges', () => {
    for (let z = -3.6; z <= -.6 + 1e-8; z += .025) {
      for (const y of [118.2, 198, 197.34]) {
        const r = solveEiffelUpperFreightRope([-2, y, z], design);
        expect(r.segments).toHaveLength(9);
        for (const [i, s] of r.segments.entries()) {
          expect(s.length).toBeGreaterThan(0);
          if (i > 0) {
            expect(distance(s.start, r.segments[i - 1]!.end)).toBeLessThan(1e-12);
            expect(distance(s.startTangent, r.segments[i - 1]!.endTangent)).toBeLessThan(1e-12);
          }
          if (s.kind === 'arc') for (const point of s.points) expect(distance(point, s.centre)).toBeCloseTo(.25, 11);
        }
        expect(r.bridgeFeedSpan).toBeCloseTo(z + 3.9, 11);
        expect(r.headroom).toBeGreaterThan(1.36);
        expect(r.points.at(-1)).toEqual(r.termination);
      }
    }
  });

  it('uses analytic arc length and includes the bridge take-up in the drum angle', () => {
    const initial = at(0), raised = at(106), across = at(122), end = at(130);
    for (const s of [initial, raised, across, end]) {
      const r = s.thirdHoist.rope;
      expect(r.deployedLength).toBeCloseTo(219.3032960216191 + s.bridgeZ - s.carrierPose.position[1], 8);
      const chords = r.points.slice(1).reduce((sum, p, i) => sum + distance(p, r.points[i]!), 0);
      expect(r.deployedLength).toBeGreaterThan(chords);
      expect(r.deployedLength - chords).toBeLessThan(.0002);
      expect(s.kinematics.drumAngle * .3).toBeCloseTo(r.deployedLength - initial.thirdHoist.rope.deployedLength, 10);
    }
    expect(across.thirdHoist.rope.deployedLength - raised.thirdHoist.rope.deployedLength).toBeCloseTo(-1.8, 10);
    expect(across.kinematics.headAngle).toBe(raised.kinematics.headAngle);
    expect(across.kinematics.bridgeWheelAngle * .145).toBeCloseTo(-1.8, 10);
    expect(end.thirdHoist.rope.deployedLength - across.thirdHoist.rope.deployedLength).toBeCloseTo(.66, 10);
  });

  it('keeps one rigid stair/carrier/master identity through lift, traverse, landing and hold', () => {
    const before = JSON.stringify(prior);
    for (let t = 0; t <= EIFFEL_UPPER_FREIGHT_DURATION; t += .5) {
      const s = at(t);
      expect(s.partId).toBe('summit-access-stair-m000-c000');
      expect(s.carrierPose.quaternion).toEqual(identity);
      expect(s.payloadPose.position).toEqual(add(s.carrierPose.position, [0, payloadOffset, 0]));
      expect(s.masterLinkPose.position).toEqual(add(s.carrierPose.position, [0, masterOffset, 0]));
      expect(s.seated).toBe(false); expect(s.hookReleased).toBe(false); expect(s.geometryAdmitted).toBe(false);
      expect(s.thirdHoist.attached).toBe(true); expect(s.thirdHoist.role).toBe('upper-197-clevis');
      expect(s.hardwareRoles.some(r => r.role === 'relay-clevis')).toBe(false);
    }
    expect(at(126).carrierPose.position).toEqual([-2, 197.34, -3.6]);
    expect(at(126).carrierSupport).toBe('upper-197-receiver-cart');
    expect(at(130).carrierPose).toEqual(at(126).carrierPose);
    expect(at(999)).toEqual(at(130));
    expect(JSON.stringify(sampleEiffelSecondFloorRelayRoute(126))).toBe(before);
  });

  it('accepts an explicit alternate supported pickup lane and clears the supplied guard height before traversing', () => {
    const start = witness([-2, 118.2, -.6]);
    // Deliberately synthetic clearance input: no geometry admission is inferred.
    const pickup: EiffelUpperFreightPickup = { clearCarrierY: 121, liftLaneZ: -1.8, liftSeconds: 8, traverseSeconds: 6, clearanceEvidence: 'unit-fixture-only' };
    const sample = (t: number) => sampleEiffelUpperFreight(t, start, design, pickup);
    expect(sample(0).carrierPose).toEqual(start.carrierPose);
    expect(sample(8).carrierPose.position).toEqual([-2, 121, -.6]);
    expect(sample(14).carrierPose.position).toEqual([-2, 121, -1.8]);
    expect(sample(120).carrierPose.position).toEqual([-2, 198, -1.8]);
    expect(sample(144).carrierPose.position).toEqual([-2, 197.34, -3.6]);
    expect(sample(144).duration).toBe(144);
    for (const t of [0, 8, 14, 120, 136, 140, 144]) {
      const a = sample(t - 1e-6), b = sample(t + 1e-6);
      expect(distance(a.carrierPose.position, b.carrierPose.position)).toBeLessThan(3e-6);
      expect(Math.abs(a.thirdHoist.rope.deployedLength - b.thirdHoist.rope.deployedLength)).toBeLessThan(3e-6);
    }
    const snapshots = Array.from({ length: 25 }, (_, i) => sample(i * 6));
    for (let i = snapshots.length - 1; i >= 0; i--) expect(sample(i * 6)).toEqual(snapshots[i]);
    expect(() => sampleEiffelUpperFreight(0, start, design, { ...pickup, clearanceEvidence: '' })).toThrow(/witnessed/);
  });

  it('rejects missing support corners, embedded bolts, old fitting aliases and nonmatching rope contacts', () => {
    const good = witness(); expect(inspectEiffelUpperFreightStart(good, design).geometryAdmitted).toBe(false);
    expect(() => inspectEiffelUpperFreightStart({ ...good, support: { ...good.support, corners: good.support.corners.slice(0, 3) } }, design)).toThrow(/four shoe/);
    expect(() => inspectEiffelUpperFreightStart({ ...good, support: { ...good.support, corners: good.support.corners.map((c, i) => i === 0 ? { ...c, surfacePoint: add(c.surfacePoint, [0, -.01, 0]) } : c) } }, design)).toThrow(/coincide/);
    expect(() => inspectEiffelUpperFreightStart({ ...good, bolts: good.bolts.map((b, i) => i === 0 ? { ...b, shaftWithdrawal: .1 } : b) }, design)).toThrow(/stow/);
    expect(() => inspectEiffelUpperFreightStart({ ...good, connection: { ...good.connection, role: 'relay-clevis' as 'upper-197-clevis' } }, design)).toThrow(/distinct/);
    expect(() => inspectEiffelUpperFreightStart({ ...good, connection: { ...good.connection, previousHoistReleased: false } }, design)).toThrow(/old hoist/);
    expect(() => inspectEiffelUpperFreightStart({ ...good, connection: { ...good.connection, ropeApex: add(good.connection.ropeApex, [0, .01, 0]) } }, design)).toThrow(/apex/);
    expect(() => inspectEiffelUpperFreightStart({ ...good, masterLinkPose: { ...good.masterLinkPose, position: add(good.masterLinkPose.position, [0, .01, 0]) } }, design)).toThrow(/master offset/);
    expect(() => at(NaN)).toThrow(/finite/);
  });

  it('rejects the old inverted guide lane and a hook above the source head', () => {
    const old = { ...design, reeving: { ...design.reeving, drumTakeoff: [4.7, 197.8, -4.01], fixedVerticalGuide: [4.45, 206.57, -4.01], fixedHorizontalGuide: [1.12, 206.82, -3.76] } };
    expect(() => solveEiffelUpperFreightRope([-2, 198, -3.6], old)).toThrow(/tangent/);
    expect(() => solveEiffelUpperFreightRope([-2, 200, -1.8], design)).toThrow(/tangent|below/);
    expect(() => solveEiffelUpperFreightRope([-2.1, 198, -1.8], design)).toThrow(/align/);
    expect(() => solveEiffelUpperFreightRope([-2, 198, -1.8], { ...design, reeving: { ...design.reeving, ropeRadius: .01 } })).toThrow(/groove/);
  });
});
