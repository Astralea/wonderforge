import { BoxGeometry, CylinderGeometry, Group, InstancedMesh, Matrix4, MeshStandardMaterial, Quaternion, SphereGeometry, Vector3 } from 'three';
import type { EiffelCraneSample } from '../../engine/eiffelCrane';
import type { RigidVec3 } from '../../engine/eiffelRigid';

/** Fixed-size mast and trussed luffing jib. Station support belongs to the plan. */
export class EiffelCraneRig {
  readonly group = new Group();
  private readonly box = new BoxGeometry(1, 1, 1);
  private readonly pole = new CylinderGeometry(1, 1, 1, 6);
  private readonly sphere = new SphereGeometry(1, 7, 5);
  private readonly materials = [
    new MeshStandardMaterial({ color: '#4b4842', roughness: .75, metalness: .25 }),
    new MeshStandardMaterial({ color: '#a2855d', roughness: .85 }),
    new MeshStandardMaterial({ color: '#625749', roughness: .9 }),
    new MeshStandardMaterial({ color: '#4e6376', roughness: .92 }),
    new MeshStandardMaterial({ color: '#be916f', roughness: .85 }),
  ];
  private readonly batches = {
    iron: new InstancedMesh(this.pole, this.materials[0], 40),
    wood: new InstancedMesh(this.box, this.materials[1], 16),
    rope: new InstancedMesh(this.pole, this.materials[2], 12),
    clothes: new InstancedMesh(this.box, this.materials[3], 4),
    limbs: new InstancedMesh(this.pole, this.materials[3], 16),
    heads: new InstancedMesh(this.sphere, this.materials[4], 4),
  };
  private counts: Partial<Record<keyof EiffelCraneRig['batches'], number>> = {};
  private readonly matrix = new Matrix4();
  private readonly rotation = new Quaternion();
  private readonly point = new Vector3();
  private readonly scale = new Vector3();
  private readonly up = new Vector3(0, 1, 0);
  constructor() {
    this.group.name = 'eiffel-supported-small-crane';
    for (const [name, mesh] of Object.entries(this.batches)) {
      mesh.name = `eiffel-crane-${name}`; mesh.frustumCulled = false; mesh.castShadow = name !== 'rope'; mesh.count = 0; this.group.add(mesh);
    }
  }
  private solid(key: keyof EiffelCraneRig['batches'], p: RigidVec3, size: RigidVec3) {
    this.matrix.compose(this.point.set(...p), this.rotation.identity(), this.scale.set(...size));
    const i = this.counts[key] ?? 0; this.batches[key].setMatrixAt(i, this.matrix); this.counts[key] = i + 1;
  }
  private beam(key: keyof EiffelCraneRig['batches'], a: RigidVec3, b: RigidVec3, radius: number) {
    this.point.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const length = this.point.length(); if (length < 1e-8) return;
    this.rotation.setFromUnitVectors(this.up, this.point.divideScalar(length));
    this.point.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
    this.matrix.compose(this.point, this.rotation, this.scale.set(radius, length, radius));
    const i = this.counts[key] ?? 0; this.batches[key].setMatrixAt(i, this.matrix); this.counts[key] = i + 1;
  }
  update(sample: EiffelCraneSample): void {
    this.counts = {};
    const [x, y, z] = sample.base;
    const pad = sample.supportPadSize ?? [3.4, .3, 2.8] as const;
    this.solid('wood', [x, y + pad[1] / 2, z], pad);
    this.beam('iron', sample.base, sample.pivot, .17);
    for (const dx of [-1.3, 1.3]) this.beam('iron', [x + dx, y + .3, z], [x, y + 3, z], .085);
    const d = sample.boomTip.map((v, k) => v - sample.pivot[k]) as [number, number, number];
    const radius = Math.hypot(d[0], d[2]);
    const hx = radius > 1e-8 ? d[0] / radius : 1; const hz = radius > 1e-8 ? d[2] / radius : 0;
    const n: RigidVec3 = [-hx * d[1] / sample.boomLength, radius / sample.boomLength, -hz * d[1] / sample.boomLength];
    const b = (u: number, offset: number): RigidVec3 => [sample.pivot[0] + d[0] * u + n[0] * offset, sample.pivot[1] + d[1] * u + n[1] * offset, sample.pivot[2] + d[2] * u + n[2] * offset];
    // Perpendicular section offsets keep every truss member a fixed length
    // while the whole jib luffs; world-Y offsets would deform the webbing.
    for (const side of [-1, 1]) this.beam('iron', b(0, side * .22), b(1, side * .22), .09);
    for (let i = 0; i < 4; i++) {
      this.beam('iron', b(i / 4, -.22), b((i + 1) / 4, .22), .045);
      this.beam('iron', b(i / 4, .22), b((i + 1) / 4, -.22), .045);
    }
    this.beam('rope', sample.boomTip, sample.hook, .027);
    this.solid('wood', [sample.hook[0], sample.hook[1], sample.hook[2]], [.4, .3, .3]);
    // Separate adjustable tackles control the two lift points during turning.
    for (const lug of sample.lugs) this.beam('rope', sample.hook, lug, .022);
    this.solid('wood', [x - .75, y + .85, z + .6], [1.1, 1.1, 1]);
    this.beam('iron', [x - 1.4, y + 1, z + .6], [x - .1, y + 1, z + .6], .25);
    // Four supported guys make the variable-height mast read as a stayed
    // derrick instead of an unsupported needle. Their feet remain on deck.
    const guyX = pad[0] / 2 - .25, guyZ = pad[2] / 2 - .15;
    // The legacy 2.8m pad retains its previous 1.15m guy offsets. The
    // authored narrow terrace pad keeps its feet inside the real bearing area.
    const guyDepth = sample.supportPadSize ? guyZ : 1.15;
    for (const dx of [-guyX, guyX]) for (const dz of [-guyDepth, guyDepth]) {
      this.beam('iron', [x + dx, y + .3, z + dz], sample.pivot, .045);
    }
    const wx = x + .85; const wz = z + .7; const floor = y + .3;
    this.solid('clothes', [wx, floor + 1.16, wz], [.45, .65, .27]);
    this.solid('heads', [wx, floor + 1.69, wz], [.17, .19, .17]);
    for (const sign of [-1, 1]) {
      this.solid('clothes', [wx + sign * .13, floor + .06, wz + .06], [.19, .12, .32]);
      this.beam('limbs', [wx + sign * .12, floor + .86, wz], [wx + sign * .13, floor + .08, wz], .08);
      this.beam('limbs', [wx + sign * .25, floor + 1.39, wz], [wx - .4, floor + 1.02, wz + sign * .16], .07);
    }
    for (const [key, mesh] of Object.entries(this.batches)) { mesh.count = this.counts[key as keyof typeof this.batches] ?? 0; mesh.instanceMatrix.needsUpdate = true; }
  }
  dispose(): void {
    for (const mesh of Object.values(this.batches)) mesh.dispose();
    for (const geometry of [this.box, this.pole, this.sphere]) geometry.dispose();
    for (const material of this.materials) material.dispose();
    this.group.clear();
  }
}
