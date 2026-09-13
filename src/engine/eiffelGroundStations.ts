import { sampleEiffelGroundLiftPilot, type EiffelGroundLiftPilotSample } from './eiffelGroundLiftPilot';
import { composeRigidPoses, rotateRigidVector, type RigidPose, type RigidVec3, type RigidQuat } from './eiffelRigid';

export const EIFFEL_GROUND_STATIONS = [
  { id: 'ne', quarterTurns: 0, payloadId: 'lower-ne-02-m013-c003' },
  { id: 'nw', quarterTurns: 1, payloadId: 'lower-nw-02-m005-c003' },
  { id: 'sw', quarterTurns: 2, payloadId: 'lower-sw-02-m029-c003' },
  { id: 'se', quarterTurns: 3, payloadId: 'lower-se-02-m021-c003' },
] as const;
export type EiffelGroundStationId = typeof EIFFEL_GROUND_STATIONS[number]['id'];
export function groundStationQuaternion(id: EiffelGroundStationId): RigidQuat {
  const angle = EIFFEL_GROUND_STATIONS.find(station => station.id === id)!.quarterTurns * Math.PI / 2;
  return [0, Math.sin(angle / 2), 0, Math.cos(angle / 2)];
}
export function rotateGroundStationPoint(point: RigidVec3, id: EiffelGroundStationId): RigidVec3 {
  return rotateRigidVector(groundStationQuaternion(id), point);
}
export function rotateGroundStationPose(pose: RigidPose, id: EiffelGroundStationId): RigidPose {
  return composeRigidPoses({ position: [0,0,0], quaternion: groundStationQuaternion(id) }, pose);
}
/** Same supported operation at four distinct actual kit members. Relative
 * machine articulation and sling lengths remain in the original local frame.
 */
export function sampleEiffelGroundStation(seconds: number, id: EiffelGroundStationId): EiffelGroundLiftPilotSample {
  const base = sampleEiffelGroundLiftPilot(seconds);
  const station = EIFFEL_GROUND_STATIONS.find(station => station.id === id)!;
  const point = (value: RigidVec3) => rotateGroundStationPoint(value, id);
  return { ...base,
    payload: { ...base.payload, partId: station.payloadId, pose: rotateGroundStationPose(base.payload.pose, id) },
    carrier: { ...base.carrier, bedPose: rotateGroundStationPose(base.carrier.bedPose, id), wheelCenters: base.carrier.wheelCenters.map(point) },
    crane: { ...base.crane, root: point(base.crane.root), heel: point(base.crane.heel),
      rootYaw: base.crane.rootYaw + station.quarterTurns * Math.PI / 2,
      boomTip: point(base.crane.boomTip), hook: point(base.crane.hook) },
    rigging: { ...base.rigging, lugs: base.rigging.lugs.map(point) as [RigidVec3,RigidVec3],
      slings: base.rigging.slings.map(sling => ({ ...sling, points: sling.points.map(point) as [RigidVec3,RigidVec3,RigidVec3] })) },
  };
}
