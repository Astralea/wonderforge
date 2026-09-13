import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from 'three';
import type { EiffelProductionSample } from '../../engine/eiffelProductionConstruction';
import type { RigidVec3 } from '../../engine/eiffelRigid';
import { eiffelTerrainHeightAt } from '../../engine/eiffelTerrain';
import { EiffelCraneRig } from './EiffelCraneRig';
import { sampleEiffelFoundationCrew } from '../../engine/eiffelFoundationCrew';

/** Four reusable short-jib rigs plus finite temporary bracket steelwork. */
export class EiffelProductionWorks {
  readonly group = new Group();
  private readonly rigs = [0, 1, 2, 3].map(() => new EiffelCraneRig());
  private readonly pole = new CylinderGeometry(1, 1, 1, 6);
  private readonly box = new BoxGeometry(1, 1, 1);
  private readonly material = new MeshStandardMaterial({
    color: '#514b42',
    roughness: 0.72,
    metalness: 0.28,
  });
  private readonly brackets = new InstancedMesh(
    this.pole,
    this.material,
    4 * 7,
  );
  private readonly saddles = new InstancedMesh(this.box, this.material, 4 * 2);
  private readonly carriers = new InstancedMesh(this.box, this.material, 4);
  private readonly receivers = new InstancedMesh(this.box, this.material, 4);
  private readonly grillage = new InstancedMesh(this.pole, this.material, 16);
  private readonly wheelGeometry = new CylinderGeometry(1, 1, 1, 12);
  private readonly carrierWheels = new InstancedMesh(this.wheelGeometry, this.material, 16);
  private readonly wheelQ = new Quaternion();
  private readonly carrierFeet = new InstancedMesh(this.box, this.material, 16);
  private readonly haulers = new InstancedMesh(this.box, this.material, 8);
  private readonly handles = new InstancedMesh(this.pole, this.material, 8);
  private readonly clothing = new MeshStandardMaterial({
    color: '#465361',
    roughness: 0.92,
  });
  private readonly skin = new MeshStandardMaterial({
    color: '#b78d6c',
    roughness: 0.88,
  });
  private readonly crewHeads = new InstancedMesh(this.box, this.skin, 8);
  private readonly crewLimbs = new InstancedMesh(this.pole, this.clothing, 32);
  private readonly crewFeet = new InstancedMesh(this.box, this.clothing, 16);
  private readonly matrix = new Matrix4();
  private readonly q = new Quaternion();
  private readonly p = new Vector3();
  private readonly scale = new Vector3();
  private readonly up = new Vector3(0, 1, 0);
  constructor() {
    this.group.name = 'eiffel-bounded-production-works';
    this.brackets.name = 'eiffel-temporary-triangulated-brackets';
    this.saddles.name = 'eiffel-bracket-saddles';
    this.carriers.name = 'eiffel-ground-and-freight-carriers';
    this.receivers.name = 'eiffel-receiving-decks';
    this.grillage.name = 'eiffel-receiver-grillage';
    this.carrierFeet.name = 'eiffel-carrier-ground-feet';
    this.carrierWheels.name = 'eiffel-carrier-wheels';
    this.haulers.name = 'eiffel-carrier-haulers';
    this.haulers.material = this.clothing;
    this.crewHeads.name = 'eiffel-carrier-crew-heads';
    this.crewLimbs.name = 'eiffel-carrier-crew-limbs';
    this.crewFeet.name = 'eiffel-carrier-crew-feet';
    this.handles.name = 'eiffel-carrier-handles';
    for (const mesh of [
      this.brackets,
      this.saddles,
      this.carriers,
      this.receivers,
      this.grillage,
      this.carrierFeet,
      this.carrierWheels,
      this.haulers,
      this.handles,
      this.crewHeads,
      this.crewLimbs,
      this.crewFeet,
    ])
      mesh.frustumCulled = false;
    this.group.add(
      this.brackets,
      this.saddles,
      this.carriers,
      this.receivers,
      this.grillage,
      this.carrierFeet,
      this.carrierWheels,
      this.haulers,
      this.handles,
      this.crewHeads,
      this.crewLimbs,
      this.crewFeet,
      ...this.rigs.map((r) => r.group),
    );
  }
  private beam(
    mesh: InstancedMesh,
    index: number,
    a: RigidVec3,
    b: RigidVec3,
    r: number,
  ) {
    this.p.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const l = this.p.length();
    this.q.setFromUnitVectors(this.up, this.p.divideScalar(l));
    this.p.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
    this.matrix.compose(this.p, this.q, this.scale.set(r, l, r));
    mesh.setMatrixAt(index, this.matrix);
  }
  update(samples: readonly EiffelProductionSample[]) {
    let bc = 0,
      sc = 0,
      rc = 0,
      cc = 0,
      dc = 0,
      gc = 0,
      fc = 0,
      wc = 0,
      hc = 0,
      mc = 0,
      headCount = 0,
      limbCount = 0,
      footCount = 0;
    for (const sample of samples) {
      if (sample.crane && rc < 4) this.rigs[rc++].update(sample.crane);
      if (sample.carrier && cc < 4) {
        const carrier = sample.carrier, yaw = carrier.steering?.yaw ?? 0;
        const c = Math.cos(yaw), s = Math.sin(yaw);
        this.matrix.compose(this.p.set(...carrier.center), this.q.setFromAxisAngle(this.up, -yaw), this.scale.set(...carrier.size));
        this.carriers.setMatrixAt(cc++, this.matrix);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
          const lx = sx * (carrier.size[0] / 2 - .18), lz = sz * (carrier.size[2] / 2 - .18);
          const x = carrier.center[0] + c * lx - s * lz, z = carrier.center[2] + s * lx + c * lz;
          const floor = carrier.motive ? eiffelTerrainHeightAt(x, z) : carrier.supportY;
          const top = carrier.center[1] - carrier.size[1] / 2;
          const support = carrier.motive ? floor + .18 : floor;
          this.matrix.compose(this.p.set(x, (top + support) / 2, z), this.q.setFromAxisAngle(this.up, -yaw), this.scale.set(.28, top - support, .28));
          this.carrierFeet.setMatrixAt(fc++, this.matrix);
          if (carrier.motive) {
            this.wheelQ.setFromAxisAngle(new Vector3(0, 0, 1), -(carrier.steering?.distance ?? 0) / .18);
            this.q.setFromAxisAngle(this.up, -yaw).multiply(this.wheelQ).multiply(this.wheelQ.setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2));
            this.matrix.compose(this.p.set(x, floor + .18, z), this.q, this.scale.set(.18, .14, .18));
            this.carrierWheels.setMatrixAt(wc++, this.matrix);
          }
        }
        if (carrier.motive && carrier.steering) {
          const pose = sampleEiffelFoundationCrew({ ...carrier, steering: carrier.steering });
          this.beam(this.handles, mc++, pose.handle[0], pose.handle[1], .055);
          this.beam(this.handles, mc++, pose.bar[0], pose.bar[1], .04);
          for (const person of pose.crew) {
            this.matrix.compose(this.p.set(...person.torso), this.q.setFromAxisAngle(this.up, -yaw), this.scale.set(.42, .64, .25));
            this.haulers.setMatrixAt(hc++, this.matrix);
            this.matrix.compose(this.p.set(...person.head), this.q.setFromAxisAngle(this.up, -yaw), this.scale.set(.29, .34, .28));
            this.crewHeads.setMatrixAt(headCount++, this.matrix);
            for (const foot of person.feet) {
              this.matrix.compose(this.p.set(...foot.center), this.q.setFromAxisAngle(this.up, -yaw), this.scale.set(.3, .12, .18));
              this.crewFeet.setMatrixAt(footCount++, this.matrix);
              this.beam(this.crewLimbs, limbCount++, foot.hip, [foot.center[0], foot.center[1] + .06, foot.center[2]], .075);
            }
            for (const arm of person.arms) this.beam(this.crewLimbs, limbCount++, arm.shoulder, arm.hand, .06);
          }
        }
      }
      if (sample.receiver && dc < 4) {
        this.matrix.compose(
          this.p.set(...sample.receiver.center),
          this.q.identity(),
          this.scale.set(...sample.receiver.size),
        );
        this.receivers.setMatrixAt(dc++, this.matrix);
        if (!sample.receiver.directDeckSupport) {
          for (const saddle of sample.receiver.saddles)
            this.beam(this.grillage, gc++, saddle, sample.receiver.center, 0.075);
        }
      }
      if (sample.bracket) {
        const [a, b] = sample.bracket.saddles,
          t = sample.bracket.tip;
        for (const s of [a, b]) {
          this.matrix.compose(
            this.p.set(...s),
            this.q.identity(),
            this.scale.set(0.42, 0.18, 0.42),
          );
          this.saddles.setMatrixAt(sc++, this.matrix);
          this.beam(this.brackets, bc++, s, t, 0.085);
        }
        this.beam(this.brackets, bc++, a, b, 0.07);
        const al: [number, number, number] = [a[0], a[1] - 0.55, a[2]],
          bl: [number, number, number] = [b[0], b[1] - 0.55, b[2]];
        this.beam(this.brackets, bc++, a, al, 0.065);
        this.beam(this.brackets, bc++, b, bl, 0.065);
        this.beam(this.brackets, bc++, al, t, 0.065);
        this.beam(this.brackets, bc++, bl, t, 0.065);
      }
    }
    for (; rc < 4; rc++) this.rigs[rc].group.visible = false;
    for (let i = 0; i < Math.min(4, samples.filter((s) => s.crane).length); i++)
      this.rigs[i].group.visible = true;
    this.brackets.count = bc;
    this.saddles.count = sc;
    this.carriers.count = cc;
    this.receivers.count = dc;
    this.grillage.count = gc;
    this.carrierFeet.count = fc;
    this.carrierWheels.count = wc;
    this.haulers.count = hc;
    this.handles.count = mc;
    this.crewHeads.count = headCount;
    this.crewLimbs.count = limbCount;
    this.crewFeet.count = footCount;
    for (const mesh of [
      this.brackets,
      this.saddles,
      this.carriers,
      this.receivers,
      this.grillage,
      this.carrierFeet,
      this.carrierWheels,
      this.haulers,
      this.handles,
      this.crewHeads,
      this.crewLimbs,
      this.crewFeet,
    ])
      mesh.instanceMatrix.needsUpdate = true;
  }
  dispose() {
    for (const rig of this.rigs) rig.dispose();
    for (const mesh of [
      this.brackets,
      this.saddles,
      this.carriers,
      this.receivers,
      this.grillage,
      this.carrierFeet,
      this.carrierWheels,
      this.haulers,
      this.handles,
      this.crewHeads,
      this.crewLimbs,
      this.crewFeet,
    ])
      mesh.dispose();
    this.pole.dispose();
    this.box.dispose();
    this.wheelGeometry.dispose();
    this.material.dispose();
    this.clothing.dispose();
    this.skin.dispose();
    this.group.clear();
  }
}
