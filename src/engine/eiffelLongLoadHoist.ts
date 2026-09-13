import carrier from '../../artifacts/eiffel-long-load-carrier-2026-09-08/carrier-design.json';
import {EIFFEL_FIRST_FLOOR_Y,eiffelFirstFloorWorld} from './eiffelFirstFloorSupply';
import {eiffelRelayRigAt} from './eiffelRelayReceiving';
import type {RigidVec3 as V} from './eiffelRigid';

export const EIFFEL_LONG_LOAD_HOIST_DURATION=128;
const ease=(value:number)=>{const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);};
/** Actual member in a retained carrier. Hook remains attached after landing;
 * cart anchoring, release and onward transfer are deliberately not implied. */
export function sampleEiffelLongLoadHoist(rawSeconds:number){
 if(!Number.isFinite(rawSeconds))throw Error('Hoist time must be finite');
 const seconds=Math.max(0,Math.min(EIFFEL_LONG_LOAD_HOIST_DURATION,rawSeconds));
 const bottom=(EIFFEL_FIRST_FLOOR_Y+.54)*ease((seconds-6)/106)-.2*ease((seconds-120)/4);
 const trolleyZ=-2.05-1.75*ease((seconds-112)/8);
 const referenceCargoY=carrier.hookY+197-EIFFEL_FIRST_FLOOR_Y-1.45;
 const rig=eiffelRelayRigAt([0,bottom+referenceCargoY,trolleyZ+.25],trolleyZ,{sheaveY:205.06,referenceCargoY});
 const origin:V=[trolleyZ+.25-17.95,bottom,-4],hook=eiffelFirstFloorWorld(rig.hook);
 const slings=carrier.eyeCenters.map(c=>{
  const center:V=[origin[0]+c[0]!,origin[1]+c[1]!,origin[2]+c[2]!];
  const delta=hook.map((v,i)=>v-center[i]!) as unknown as V,length=Math.hypot(...delta);
  const bearing=carrier.eyeInnerRadius-carrier.slingRadius;
  const contact=center.map((v,i)=>v+delta[i]!/length*bearing) as unknown as V;
  return [contact,hook] as const;
 });
 return {...rig,seconds,partId:carrier.partId,carrierOrigin:origin,worldHook:hook,
  worldRope:rig.rope.map(eiffelFirstFloorWorld),worldSlings:slings,
  phase:seconds<6?'prepared':seconds<112?'hoist':seconds<120?'transfer':seconds<124?'lower':'landed-attached',
  released:false as const,productionReady:false as const};
}
