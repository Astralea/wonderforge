import { EIFFEL_RELAY_HANDOFF_SEQUENCE_DURATION as HANDOFF_SECONDS, sampleEiffelRelayHandoffSequence } from './eiffelRelayHandoffSequence';
import { EIFFEL_SECOND_FLOOR_RELAY_ROUTE_DURATION as ROUTE_SECONDS, sampleEiffelSecondFloorRelayRoute } from './eiffelSecondFloorRelayRoute';

export const EIFFEL_SECOND_FLOOR_RELAY_SEQUENCE_DURATION=HANDOFF_SECONDS+ROUTE_SECONDS;
const yq=(a:number)=>[0,Math.sin(a/2),0,Math.cos(a/2)] as const;

/** Complete candidate after the existing 280-second first-floor endpoint. */
export function sampleEiffelSecondFloorRelaySequence(rawSeconds:number){
 const seconds=Math.max(0,Math.min(EIFFEL_SECOND_FLOOR_RELAY_SEQUENCE_DURATION,rawSeconds)),routeStart=sampleEiffelSecondFloorRelayRoute(0),end=sampleEiffelRelayHandoffSequence(HANDOFF_SECONDS,routeStart.secondHoist.worldRope);
 if(seconds<HANDOFF_SECONDS){const h=sampleEiffelRelayHandoffSequence(seconds,routeStart.secondHoist.worldRope);return{...h,hardwareRoles:[...routeStart.hardwareRoles,...h.hardwareRoles,{role:'relay-clevis',position:h.masterLinkPose.position},{role:'relay-clevis-pin',position:[0,.104,h.connector.pinOffset]as const},{role:'relay-clevis-keeper',position:[.028,.104,.058]as const,quaternion:yq(h.connector.keeperAngle)},{role:h.wrench.role,position:h.wrench.position,quaternion:h.wrench.quaternion}]};}
 const route=sampleEiffelSecondFloorRelayRoute(seconds-HANDOFF_SECONDS);
 return{...route,handoff:null,hardwareRoles:[...end.hardwareRoles,{role:end.wrench.role,position:end.wrench.position,quaternion:end.wrench.quaternion},...route.hardwareRoles,{role:'relay-clevis',position:route.masterLinkPose.position},{role:'relay-clevis-pin',position:[0,.104,0]as const},{role:'relay-clevis-keeper',position:[.028,.104,.058]as const,quaternion:yq(0)}]};
}
