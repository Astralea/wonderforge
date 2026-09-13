import {sampleEiffelFirstFloorSupply,EIFFEL_FIRST_FLOOR_Y as floor,eiffelFirstFloorWorld} from './eiffelFirstFloorSupply';
import {eiffelRelayRigAt} from './eiffelRelayReceiving';
import {eiffelSupplyPusherAt} from './eiffelSupplyPusher';
import type {RigidVec3 as V} from './eiffelRigid';
export const EIFFEL_FIRST_FLOOR_TRANSFER_DURATION=166;
const ease=(x:number)=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
/** One cargo from ground onto a waiting cart and across the first-floor aperture. */
export function sampleEiffelFirstFloorTransfer(rawSeconds:number){
 if(!Number.isFinite(rawSeconds))throw Error('Transfer time must be finite');
 const seconds=Math.max(0,Math.min(166,rawSeconds));
 const first=sampleEiffelFirstFloorSupply(Math.min(seconds,128),.34);
 const hookReference:V=[first.cargo[0],first.cargo[1]+.8*ease((seconds-132)/2),first.cargo[2]];
 const rig=eiffelRelayRigAt(hookReference,first.trolleyZ,{sheaveY:202.06,referenceCargoY:.9+197-floor});
 const detach=ease((seconds-128)/4);
 const slings=rig.slings.map((s,i)=>{const free:V=[rig.hook[0],rig.hook[1]-.5,rig.hook[2]+(i===0?-.08:.08)];return [s[0]!,s[1]!.map((v,k)=>v+(free[k]!-v)*detach) as unknown as V];});
 const distance=13*ease((seconds-134)/26),cart:V=[-21.5+distance,floor,-4];
 const worldCargo:V=seconds<134?first.worldCargo:[cart[0],floor+1.24,cart[2]];
 const cargo:V=[-worldCargo[2]-4,worldCargo[1]+197-floor,worldCargo[0]+17.95];
 return {...rig,slings,cargo,worldCargo,worldHook:eiffelFirstFloorWorld(rig.hook),seconds,cart,cartWheelAngle:-distance/.12,
  worker:eiffelSupplyPusherAt(cart,distance,Math.max(0,seconds-134),26),hatchAngle:Math.PI/2*(1-ease((seconds-122)/4)),
  phase:seconds<128?first.phase:seconds<134?'unrigging':seconds<160?'cart':'awaiting-second-hoist'};
}
