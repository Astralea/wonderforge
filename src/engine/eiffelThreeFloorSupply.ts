import {sampleEiffelDiagonalSupply} from './eiffelDiagonalSupply';
import {sampleEiffelSecondFloorSupply} from './eiffelSecondFloorSupply';
import {eiffelSupplyPusherAt,sampleEiffelSupplyPusher} from './eiffelSupplyPusher';
import type {RigidVec3 as V} from './eiffelRigid';
export const EIFFEL_THREE_FLOOR_SUPPLY_DURATION=488;
const ease=(x:number)=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
/** One cargo through three receiving levels; power/erection still outside study. */
export function sampleEiffelThreeFloorSupply(rawSeconds:number){
 if(!Number.isFinite(rawSeconds))throw Error('Supply time must be finite');
 const seconds=Math.max(0,Math.min(488,rawSeconds)),lower=sampleEiffelDiagonalSupply(Math.min(seconds,302));
 const upperSeconds=Math.max(0,seconds-306),upper=sampleEiffelSecondFloorSupply(upperSeconds),attach=ease((upperSeconds-20)/6);
 const slings=[-.22,.22].map((v,i)=>{const free:V=[upper.hook[0],upper.hook[1]-.5,upper.hook[2]+(i===0?-.08:.08)],target:V=[upper.cargo[0],upper.cargo[1]+.9,upper.cargo[2]+v];return [upper.hook,free.map((f,k)=>f+(target[k]!-f)*attach) as unknown as V];});
 const secondWorker=seconds<302?lower.secondWorker:seconds<306?eiffelSupplyPusherAt(lower.secondCart,0,3*(1-ease((seconds-302)/4)),0):sampleEiffelSupplyPusher(upperSeconds);
 return{...lower,seconds,worldCargo:seconds<306?lower.worldCargo:upper.cargo,secondCart:upper.cart,secondWorker,upperRig:{...upper,slings},
 phase:seconds<302?lower.phase:seconds<306?'upper-cart-grip' as const:`upper-${upper.phase}` as const};
}
