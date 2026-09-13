import {eiffelRelayRigAt} from './eiffelRelayReceiving';
import type {RigidVec3 as V} from './eiffelRigid';
export const EIFFEL_FIRST_FLOOR_SUPPLY_DURATION=128;
export const EIFFEL_FIRST_FLOOR_Y=57.94000244140625;
export const eiffelFirstFloorWorld=(v:V):V=>[v[2]-17.95,v[1]+EIFFEL_FIRST_FLOOR_Y-197,-v[0]-4];
const ease=(x:number)=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
/** Ground stock to a real first-floor landing. The next relay is still separate. */
export function sampleEiffelFirstFloorSupply(rawSeconds:number,landingOffset=0){
 if(!Number.isFinite(landingOffset)||landingOffset<0||landingOffset>.5)throw Error('Invalid receiving height');
 if(!Number.isFinite(rawSeconds))throw Error('Supply time must be finite');
 const seconds=Math.max(0,Math.min(EIFFEL_FIRST_FLOOR_SUPPLY_DURATION,rawSeconds));
 const worldY=.9+59.6*ease((seconds-6)/106)-(60.5-EIFFEL_FIRST_FLOOR_Y-.9-landingOffset)*ease((seconds-120)/4);
 const trolleyZ=-2.05-1.75*ease((seconds-112)/8);
 const cargo:V=[0,worldY+197-EIFFEL_FIRST_FLOOR_Y,trolleyZ+.25];
 const rig=eiffelRelayRigAt(cargo,trolleyZ,{sheaveY:202.06,referenceCargoY:.9+197-EIFFEL_FIRST_FLOOR_Y});
 return {...rig,seconds,worldCargo:eiffelFirstFloorWorld(cargo),worldHook:eiffelFirstFloorWorld(rig.hook),
  phase:seconds<6?'stock':seconds<112?'hoist':seconds<120?'traverse':seconds<124?'lower':'received'};
}
