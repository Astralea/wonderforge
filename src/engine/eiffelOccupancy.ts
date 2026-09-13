import type { EiffelKitPart } from '../data/eiffelKitTypes';
import {
  rotateRigidVector,
  transformRigidPoint,
  type RigidPose,
  type RigidVec3,
} from './eiffelRigid';
export interface EiffelSolidBox {
  readonly center: RigidVec3;
  readonly half: RigidVec3;
  readonly axes: readonly [RigidVec3, RigidVec3, RigidVec3];
}
const dot = (a: RigidVec3, b: RigidVec3) =>
  a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: RigidVec3, b: RigidVec3): RigidVec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const sub = (a: RigidVec3, b: RigidVec3): RigidVec3 => [
  a[0] - b[0],
  a[1] - b[1],
  a[2] - b[2],
];
export function eiffelSolidBox(
  part: Pick<EiffelKitPart, 'localBounds'>,
  pose: RigidPose,
): EiffelSolidBox {
  const { min, max } = part.localBounds;
  return {
    center: transformRigidPoint(pose, [
      (min[0] + max[0]) / 2,
      (min[1] + max[1]) / 2,
      (min[2] + max[2]) / 2,
    ]),
    half: [(max[0] - min[0]) / 2, (max[1] - min[1]) / 2, (max[2] - min[2]) / 2],
    axes: (
      [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ] as const
    ).map((a) =>
      rotateRigidVector(pose.quaternion, a),
    ) as unknown as EiffelSolidBox['axes'],
  };
}
export function eiffelAxisBox(
  center: RigidVec3,
  size: RigidVec3,
): EiffelSolidBox {
  return {
    center,
    half: [size[0] / 2, size[1] / 2, size[2] / 2],
    axes: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
  };
}
/** Exact convex-box SAT. Positive result is minimum separating translation. */
export function eiffelBoxPenetration(
  a: EiffelSolidBox,
  b: EiffelSolidBox,
): number {
  const delta = sub(a.center, b.center);
  let minimum = Infinity;
  const project = (o: EiffelSolidBox, n: RigidVec3) =>
    o.half[0] * Math.abs(dot(o.axes[0], n)) +
    o.half[1] * Math.abs(dot(o.axes[1], n)) +
    o.half[2] * Math.abs(dot(o.axes[2], n));
  for (const raw of [
    ...a.axes,
    ...b.axes,
    ...a.axes.flatMap((x) => b.axes.map((y) => cross(x, y))),
  ]) {
    const length = Math.hypot(...raw);
    if (length < 1e-9) continue;
    const n: RigidVec3 = [raw[0] / length, raw[1] / length, raw[2] / length];
    const overlap = project(a, n) + project(b, n) - Math.abs(dot(delta, n));
    if (overlap <= 0) return 0;
    minimum = Math.min(minimum, overlap);
  }
  return minimum;
}
export function eiffelBoxBounds(box: EiffelSolidBox): {
  min: RigidVec3;
  max: RigidVec3;
} {
  const r = [0, 1, 2].map((i) =>
    box.axes.reduce((s, a, j) => s + Math.abs(a[i]!) * box.half[j]!, 0),
  );
  return {
    min: [box.center[0] - r[0]!, box.center[1] - r[1]!, box.center[2] - r[2]!],
    max: [box.center[0] + r[0]!, box.center[1] + r[1]!, box.center[2] + r[2]!],
  };
}
export interface EiffelSeatedSolid {
  readonly part: EiffelKitPart;
  readonly end: number;
  readonly box: EiffelSolidBox;
}
/** All cells touched by each actual solid, including long rotated members. */
export class EiffelOccupancy {
  readonly byPart = new Map<string, EiffelSeatedSolid>();
  private readonly grid = new Map<string, EiffelSeatedSolid[]>();
  constructor(parts: readonly { part: EiffelKitPart; end: number }[]) {
    for (const entry of parts) {
      if (entry.part.shape !== 'box') continue;
      const solid = {
        ...entry,
        box: eiffelSolidBox(entry.part, entry.part.finalPose),
      };
      this.byPart.set(entry.part.id, solid);
      for (const key of this.keys(eiffelBoxBounds(solid.box))) {
        const items = this.grid.get(key) ?? [];
        items.push(solid);
        this.grid.set(key, items);
      }
    }
  }
  private keys(bounds: { min: RigidVec3; max: RigidVec3 }) {
    const out: string[] = [];
    for (
      let x = Math.floor(bounds.min[0] / 8);
      x <= Math.floor(bounds.max[0] / 8);
      x++
    )
      for (
        let y = Math.floor(bounds.min[1] / 8);
        y <= Math.floor(bounds.max[1] / 8);
        y++
      )
        for (
          let z = Math.floor(bounds.min[2] / 8);
          z <= Math.floor(bounds.max[2] / 8);
          z++
        )
          out.push(`${x},${y},${z}`);
    return out;
  }
  nearby(box: EiffelSolidBox, t: number): EiffelSeatedSolid[] {
    return [
      ...new Set(
        this.keys(eiffelBoxBounds(box)).flatMap((k) => this.grid.get(k) ?? []),
      ),
    ].filter((s) => s.end <= t);
  }
  penetration(box: EiffelSolidBox, t: number, ignore?: string): number {
    let depth = 0;
    for (const s of this.nearby(box, t)) {
      if (s.part.id === ignore) continue;
      depth = Math.max(depth, eiffelBoxPenetration(box, s.box));
    }
    return depth;
  }
}
