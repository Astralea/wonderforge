import {eiffelRelayRigAt} from './eiffelRelayReceiving';
import type {RigidVec3} from './eiffelRigid';
export const EIFFEL_SECOND_FLOOR_SUPPLY_DURATION=182;
const smooth=(x:number)=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
/** Same cargo: west stock cart, bridge pickup, 80m lift, upper receiving trolley.
 * Ground/first-floor delivery and human rigging remain outside this study. */
export function sampleEiffelSecondFloorSupply(rawSeconds:number){
 if(!Number.isFinite(rawSeconds))throw Error('Supply time must be finite');
 const seconds=Math.max(0,Math.min(182,rawSeconds));
 const cartX=-15+15*smooth(seconds/20);
 const y=117.38+(198.1-117.38)*smooth((seconds-26)/140)-.2*smooth((seconds-178)/4);
 const trolleyZ=-2.05-1.8*smooth((seconds-170)/8);
 const cargo:RigidVec3=[seconds<26?cartX:0,y,trolleyZ+.25];
 const rig=eiffelRelayRigAt(cargo,trolleyZ);
 // Before attachment, slings hang at the pickup, not from the moving crate.
 const attached=seconds>=26;
 const rigging=smooth((seconds-20)/6);
 const slings=rig.slings.map((s,i)=>{const free:RigidVec3=[0,rig.hook[1]-.5,rig.hook[2]+(i===0?-.08:.08)];return [s[0]!,free.map((v,k)=>v+(s[1]![k]!-v)*rigging) as unknown as RigidVec3];});
 return {...rig,slings,seconds,attached,cart:[cartX,116.14,-1.8] as RigidVec3,cartWheelAngle:-(cartX+15)/.12,
  phase:seconds<20?'cart':seconds<26?'rigging':seconds<166?'hoist':seconds<170?'hold':seconds<178?'transfer':seconds<182?'lower':'received'};
}
