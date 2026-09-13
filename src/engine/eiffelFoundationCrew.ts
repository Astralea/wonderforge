import type { RigidVec3 } from './eiffelRigid';
import { eiffelTerrainHeightAt } from './eiffelTerrain';
export interface FoundationCrewInput { readonly center: RigidVec3; readonly size: RigidVec3; readonly steering: { readonly yaw: number; readonly distance: number; readonly walking: boolean } }
/** Local +X follows hauling direction; the pair pushes a rear crossbar. */
export function sampleEiffelFoundationCrew(carrier: FoundationCrewInput) {
  const { center, size, steering } = carrier, c = Math.cos(steering.yaw), s = Math.sin(steering.yaw);
  const point = (x: number, z: number, height: number): RigidVec3 => { const wx = center[0] + c * x - s * z, wz = center[2] + s * x + c * z; return [wx, eiffelTerrainHeightAt(wx, wz) + height, wz]; };
  const handX = -size[0] / 2 - .42, bodyX = handX - .34;
  const bar: readonly [RigidVec3, RigidVec3] = [point(handX, -.64, 1.05), point(handX, .64, 1.05)];
  const handle: readonly [RigidVec3, RigidVec3] = [[center[0] - c * size[0] / 2, center[1], center[2] - s * size[0] / 2], point(handX, 0, 1.05)];
  const crew = [-.42, .42].map((side, person) => {
    const feet = [-1, 1].map(sign => {
      const phase = ((steering.distance / 1.2 + (sign > 0 ? .5 : 0) + person * .08) % 1 + 1) % 1;
      const swing = Math.max(0, (phase - .6) / .4);
      const smooth = swing * swing * (3 - 2 * swing);
      const forward = steering.walking ? (phase < .6 ? .36 - phase * 1.2 : -.36 + .72 * smooth) : 0;
      const lift = steering.walking ? Math.sin(Math.PI * swing) * .16 : 0;
      return { center: point(bodyX + forward, side + sign * .13, .06 + lift), hip: point(bodyX, side + sign * .13, .85), lift };
    });
    return { torso: point(bodyX, side, 1.16), head: point(bodyX, side, 1.67), feet, arms: [-1, 1].map(sign => ({ shoulder: point(bodyX, side + sign * .2, 1.38), hand: point(handX, side + sign * .1, 1.05) })) };
  });
  return { yaw: steering.yaw, handle, bar, crew };
}
