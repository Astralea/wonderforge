import {sampleEiffelFirstFloorTransfer} from './eiffelFirstFloorTransfer';
import {EIFFEL_FIRST_FLOOR_Y as firstFloor} from './eiffelFirstFloorSupply';
import {eiffelRelayRigAt} from './eiffelRelayReceiving';
import {eiffelSupplyPusherAt} from './eiffelSupplyPusher';
import type {RigidVec3 as V} from './eiffelRigid';
export const EIFFEL_TWO_FLOOR_SUPPLY_DURATION=290;
const ease=(x:number)=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
export const eiffelSecondReceiverWorld=(v:V):V=>[v[2]-6.7,v[1]+116.14-197,-v[0]-4];
/** Same rigid cargo, two separate winches and two persistent carts. */
export function sampleEiffelTwoFloorSupply(rawSeconds:number){
 if(!Number.isFinite(rawSeconds))throw Error('Supply time must be finite');
 const seconds=Math.max(0,Math.min(290,rawSeconds));
 const lower=sampleEiffelFirstFloorTransfer(Math.min(seconds,166));
 const pickupY=firstFloor+1.24;
 const y=pickupY+(118.7-pickupY)*ease((seconds-166)/106)-(118.7-117.38)*ease((seconds-280)/4);
 const trolleyZ=-2.05-1.75*ease((seconds-272)/8);
 const referenceCargo:V=[0,y+197-116.14,trolleyZ+.25];
 const rig=eiffelRelayRigAt(referenceCargo,trolleyZ,{sheaveY:202.06,referenceCargoY:pickupY+197-116.14});
 const attach=ease((seconds-163)/3);
 const slings=rig.slings.map((s,i)=>{const free:V=[rig.hook[0],rig.hook[1]-.5,rig.hook[2]+(i===0?-.08:.08)];return [s[0]!,free.map((v,k)=>v+(s[1]![k]!-v)*attach) as unknown as V];});
 const secondCart:V=[-10.25,116.14,-4];
 const worldCargo=seconds<166?lower.worldCargo:eiffelSecondReceiverWorld(referenceCargo);
 return{seconds,lower,secondRig:{...rig,slings},worldCargo,secondCart,secondWorker:eiffelSupplyPusherAt(secondCart,0,3,0),
  phase:seconds<160?lower.phase:seconds<163?'first-cart-parked':seconds<166?'second-rigging':seconds<272?'second-hoist':seconds<280?'second-traverse':seconds<284?'second-lower':'second-received'};
}
