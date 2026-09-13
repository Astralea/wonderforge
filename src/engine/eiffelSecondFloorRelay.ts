import type { RigidPose, RigidVec3 } from './eiffelRigid';

export const EIFFEL_SECOND_FLOOR_RELAY_PART_ID = 'summit-access-stair-m000-c000' as const;
export interface EiffelSecondFloorRelayRolePose { readonly role:string; readonly position?:RigidVec3; readonly quaternion?:readonly[number,number,number,number]; }
export interface EiffelSecondFloorRelaySample {
  readonly seconds:number;
  readonly phase:string;
  readonly partId:typeof EIFFEL_SECOND_FLOOR_RELAY_PART_ID;
  readonly ownsPayload:true;
  readonly seated:false;
  readonly carrierPose:RigidPose;
  /** Must equal carrierPose composed with the preserved payload-local pose. */
  readonly payloadPose:RigidPose;
  readonly masterLinkPose:RigidPose;
  /** Frozen first-floor hoist line; retained until an explicit dismantling action. */
  readonly retainedFirstHoistRope:readonly RigidVec3[];
  readonly secondHoist:{readonly worldRope:readonly RigidVec3[];readonly attached:boolean;readonly driveAdmitted:boolean};
  readonly hardwareRoles:readonly EiffelSecondFloorRelayRolePose[];
  readonly carrierSupport:'cart'|'tackle'|'upper-receiver';
  readonly slingSupport:'carrier-saddle'|'tackle';
  readonly cartPose:RigidPose|null;
  readonly cartSupport:'first-floor'|'bridge'|'second-floor'|null;
  readonly cartAttached:boolean;
  readonly fastening:{readonly installed:number;readonly required:number;readonly released:boolean};
}

export function assertEiffelSecondFloorRelaySample(sample:EiffelSecondFloorRelaySample):void {
  if(sample.partId!==EIFFEL_SECOND_FLOOR_RELAY_PART_ID||sample.ownsPayload!==true||sample.seated!==false)throw Error('Second-floor relay must retain the unseated stair identity');
  if(!Number.isFinite(sample.seconds)||![...sample.carrierPose.position,...sample.carrierPose.quaternion,...sample.payloadPose.position,...sample.payloadPose.quaternion,...sample.masterLinkPose.position,...sample.masterLinkPose.quaternion,...sample.retainedFirstHoistRope.flat(),...sample.secondHoist.worldRope.flat()].every(Number.isFinite))throw Error('Second-floor relay pose data must be finite');
  if(sample.retainedFirstHoistRope.length<2||sample.secondHoist.worldRope.length<2)throw Error('Second-floor relay must expose retained and active rope paths');
  if(sample.fastening.installed<0||sample.fastening.installed>sample.fastening.required)throw Error('Second-floor relay fastening count is invalid');
}
