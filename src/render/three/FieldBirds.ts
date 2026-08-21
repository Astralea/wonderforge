import {
  BoxGeometry,
  Euler,
  Group,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three';
import { FIELD_BIRD_FLOCK, fieldBirdStateAt } from '../../data/gizaFieldBirds';

/**
 * Tier 4 "field birds": the black-kite flock working the cultivated strip
 * (FIELD_BIRD_FLOCK). One instanced batch of bodies, one of wings — the same
 * rig as the river egrets in `Environment.addBirds`, at a larger, darker
 * scale. Each wing's geometry is rooted at the shoulder so the flap is a
 * rotation about the body-forward axis; the left wing mirrors the right
 * across the body plane (a rotation, determinant +1 — never a negative
 * scale, which would flip winding).
 *
 * The class owns and disposes its own geometries and material.
 */
export class FieldBirds {
  readonly group = new Group();
  private readonly bodies: InstancedMesh;
  private readonly wings: InstancedMesh;
  private readonly material: MeshStandardMaterial;
  private readonly geometries: (SphereGeometry | BoxGeometry)[] = [];

  constructor() {
    this.group.name = 'field-kite-flock';
    const bodyGeometry = new SphereGeometry(0.5, 7, 5);
    const wingGeometry = new BoxGeometry(0.46, 0.018, 0.2);
    wingGeometry.translate(0.23, 0, 0);
    this.geometries.push(bodyGeometry, wingGeometry);
    // Black kite: dark sooty brown, matte plumage against the green strip.
    this.material = new MeshStandardMaterial({ color: '#4a3a28', roughness: 0.9 });
    this.bodies = new InstancedMesh(bodyGeometry, this.material, FIELD_BIRD_FLOCK.count);
    this.wings = new InstancedMesh(wingGeometry, this.material, FIELD_BIRD_FLOCK.count * 2);
    // Fast movers: per-frame matrices, no shadow casting, no stale bounds.
    this.bodies.castShadow = false;
    this.wings.castShadow = false;
    this.bodies.frustumCulled = false;
    this.wings.frustumCulled = false;
    this.bodies.name = 'field-kite-bodies';
    this.wings.name = 'field-kite-wings';
    this.update(0);
    this.group.add(this.bodies, this.wings);
  }

  /** Circling flight, banking, and wing flap — pure functions of t (Spec 08). */
  update(t: number): void {
    const body = new Matrix4();
    const root = new Matrix4();
    const flap = new Matrix4();
    const mirror = new Matrix4().makeRotationY(Math.PI);
    const wing = new Matrix4();
    for (let i = 0; i < FIELD_BIRD_FLOCK.count; i += 1) {
      const state = fieldBirdStateAt(i, t);
      // Forward is local +z, wings span local ±x: yaw outermost, then pitch
      // about the span axis, then roll (bank) about the body-forward axis.
      const orientation = new Quaternion().setFromEuler(
        new Euler(state.pitch, state.yaw, state.roll, 'YXZ'),
      );
      body.compose(
        new Vector3(state.x, state.y, state.z),
        orientation,
        new Vector3(0.26, 0.19, 0.48),
      );
      this.bodies.setMatrixAt(i, body);
      for (const side of [-1, 1] as const) {
        root.makeTranslation(side * 0.11, 0.03, 0.02);
        flap.makeRotationZ(side * state.wingAngle);
        wing.copy(body).multiply(root).multiply(flap);
        if (side === -1) wing.multiply(mirror);
        this.wings.setMatrixAt(i * 2 + (side + 1) / 2, wing);
      }
    }
    this.bodies.instanceMatrix.needsUpdate = true;
    this.wings.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    for (const geometry of this.geometries) geometry.dispose();
    this.material.dispose();
  }
}
