export type RigidVec3 = readonly [number, number, number];
export type RigidQuat = readonly [number, number, number, number];

export interface RigidPose {
  readonly position: RigidVec3;
  readonly quaternion: RigidQuat;
}

const EPSILON = 1e-12;

function finiteVec3(value: RigidVec3): void {
  if (!value.every(Number.isFinite)) throw new Error('Rigid vector must be finite');
}

function normalizedQuaternion(value: RigidQuat): RigidQuat {
  if (!value.every(Number.isFinite)) throw new Error('Rigid quaternion must be finite');
  const length = Math.hypot(value[0], value[1], value[2], value[3]);
  if (length < EPSILON) throw new Error('Rigid quaternion must have non-zero length');
  return [value[0] / length, value[1] / length, value[2] / length, value[3] / length];
}

function normalizedPose(pose: RigidPose): RigidPose {
  finiteVec3(pose.position);
  return { position: [...pose.position], quaternion: normalizedQuaternion(pose.quaternion) };
}

export function rotateRigidVector(quaternion: RigidQuat, vector: RigidVec3): RigidVec3 {
  finiteVec3(vector);
  const [qx, qy, qz, qw] = normalizedQuaternion(quaternion);
  const [x, y, z] = vector;
  const tx = 2 * (qy * z - qz * y);
  const ty = 2 * (qz * x - qx * z);
  const tz = 2 * (qx * y - qy * x);
  return [
    x + qw * tx + qy * tz - qz * ty,
    y + qw * ty + qz * tx - qx * tz,
    z + qw * tz + qx * ty - qy * tx,
  ];
}

export function transformRigidPoint(pose: RigidPose, point: RigidVec3): RigidVec3 {
  const normalized = normalizedPose(pose);
  const rotated = rotateRigidVector(normalized.quaternion, point);
  return [
    normalized.position[0] + rotated[0],
    normalized.position[1] + rotated[1],
    normalized.position[2] + rotated[2],
  ];
}

/** Compose poses so the returned pose applies `inner` first, then `outer`. */
export function composeRigidPoses(outer: RigidPose, inner: RigidPose): RigidPose {
  const a = normalizedPose(outer);
  const b = normalizedPose(inner);
  const [ax, ay, az, aw] = a.quaternion;
  const [bx, by, bz, bw] = b.quaternion;
  const offset = rotateRigidVector(a.quaternion, b.position);
  return {
    position: [a.position[0] + offset[0], a.position[1] + offset[1], a.position[2] + offset[2]],
    quaternion: normalizedQuaternion([
      aw * bx + ax * bw + ay * bz - az * by,
      aw * by - ax * bz + ay * bw + az * bx,
      aw * bz + ax * by - ay * bx + az * bw,
      aw * bw - ax * bx - ay * by - az * bz,
    ]),
  };
}

export function invertRigidPose(pose: RigidPose): RigidPose {
  const normalized = normalizedPose(pose);
  const [x, y, z, w] = normalized.quaternion;
  const inverseQuaternion: RigidQuat = [-x, -y, -z, w];
  const inversePosition = rotateRigidVector(inverseQuaternion, [
    -normalized.position[0],
    -normalized.position[1],
    -normalized.position[2],
  ]);
  return { position: inversePosition, quaternion: inverseQuaternion };
}

export function interpolateRigidPose(from: RigidPose, to: RigidPose, rawT: number): RigidPose {
  if (!Number.isFinite(rawT)) throw new Error('Rigid interpolation time must be finite');
  const a = normalizedPose(from);
  const b = normalizedPose(to);
  const t = Math.max(0, Math.min(1, rawT));
  let [bx, by, bz, bw] = b.quaternion;
  const [ax, ay, az, aw] = a.quaternion;
  let dot = ax * bx + ay * by + az * bz + aw * bw;
  if (dot < 0) {
    dot = -dot;
    bx = -bx;
    by = -by;
    bz = -bz;
    bw = -bw;
  }

  let quaternion: RigidQuat;
  if (dot > 0.9995) {
    quaternion = normalizedQuaternion([
      ax + (bx - ax) * t,
      ay + (by - ay) * t,
      az + (bz - az) * t,
      aw + (bw - aw) * t,
    ]);
  } else {
    const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
    const sinAngle = Math.sin(angle);
    const fromWeight = Math.sin((1 - t) * angle) / sinAngle;
    const toWeight = Math.sin(t * angle) / sinAngle;
    quaternion = normalizedQuaternion([
      ax * fromWeight + bx * toWeight,
      ay * fromWeight + by * toWeight,
      az * fromWeight + bz * toWeight,
      aw * fromWeight + bw * toWeight,
    ]);
  }

  return {
    position: [
      a.position[0] + (b.position[0] - a.position[0]) * t,
      a.position[1] + (b.position[1] - a.position[1]) * t,
      a.position[2] + (b.position[2] - a.position[2]) * t,
    ],
    quaternion,
  };
}

export function transformedRigidBounds(
  pose: RigidPose,
  min: RigidVec3,
  max: RigidVec3,
): { min: RigidVec3; max: RigidVec3 } {
  finiteVec3(min);
  finiteVec3(max);
  if (min.some((value, axis) => value > max[axis]!)) throw new Error('Rigid bounds are inverted');
  const outMin = [Infinity, Infinity, Infinity];
  const outMax = [-Infinity, -Infinity, -Infinity];
  for (const x of [min[0], max[0]]) {
    for (const y of [min[1], max[1]]) {
      for (const z of [min[2], max[2]]) {
        const point = transformRigidPoint(pose, [x, y, z]);
        for (let axis = 0; axis < 3; axis += 1) {
          outMin[axis] = Math.min(outMin[axis]!, point[axis]);
          outMax[axis] = Math.max(outMax[axis]!, point[axis]);
        }
      }
    }
  }
  return {
    min: [outMin[0]!, outMin[1]!, outMin[2]!],
    max: [outMax[0]!, outMax[1]!, outMax[2]!],
  };
}
