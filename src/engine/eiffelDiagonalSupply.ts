import {sampleEiffelFirstFloorTransfer} from './eiffelFirstFloorTransfer';
import {eiffelDiagonalRigAt,EIFFEL_DIAGONAL_LENGTH as L} from './eiffelDiagonalRig';
import {eiffelSupplyPusherAt} from './eiffelSupplyPusher';
import type {RigidVec3 as V} from './eiffelRigid';
export const EIFFEL_DIAGONAL_SUPPLY_DURATION=302;
const ease=(x:number)=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
/** Same cargo from ground to the original upper-relay stock cart. Unpowered fit. */
export function sampleEiffelDiagonalSupply(rawSeconds:number){
 if(!Number.isFinite(rawSeconds))throw Error('Supply time must be finite');
 const seconds=Math.max(0,Math.min(302,rawSeconds)),lower=sampleEiffelFirstFloorTransfer(Math.min(seconds,166));
 const pickupY=59.18000244140625,y=pickupY+(118.7-pickupY)*ease((seconds-166)/106)-(118.7-117.38)*ease((seconds-288)/4),u=L*ease((seconds-272)/16);
 const cargoRig=eiffelDiagonalRigAt(u,y),emptyRise=.6*ease((seconds-296)/2),rig=eiffelDiagonalRigAt(u,y+emptyRise);
 const attached=ease((seconds-163)/3)*(1-ease((seconds-292)/4));
 const slings=[-.22,.22].map(v=>{const target:V=[cargoRig.cargo[0],cargoRig.cargo[1]+.9,cargoRig.cargo[2]+v],free:V=[rig.hook[0],rig.hook[1]-.5,rig.hook[2]+v*.3];return [rig.hook,free.map((f,k)=>f+(target[k]!-f)*attached) as unknown as V];});
 const worldCargo=seconds<166?lower.worldCargo:cargoRig.cargo,secondCart:V=[-15,116.14,-1.8];
 return{seconds,lower,secondRig:{...rig,slings},worldCargo,secondCart,secondWorker:eiffelSupplyPusherAt(secondCart,0,3,0),
 phase:seconds<160?lower.phase:seconds<163?'first-cart-parked':seconds<166?'second-rigging':seconds<272?'second-hoist':seconds<288?'second-traverse':seconds<292?'second-lower':seconds<296?'second-unrigging':seconds<298?'second-hook-retract':'second-received'};
}
