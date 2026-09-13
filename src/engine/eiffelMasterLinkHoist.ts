import link from '../../artifacts/eiffel-master-link-2026-09-08/design.json';
import carrier from '../../artifacts/eiffel-long-load-carrier-2026-09-08/carrier-design.json';
import {sampleEiffelLongLoadHoist} from './eiffelLongLoadHoist';
import {EIFFEL_FIRST_FLOOR_Y,eiffelFirstFloorWorld} from './eiffelFirstFloorSupply';
import {eiffelRelayRigAt} from './eiffelRelayReceiving';
import type {RigidVec3 as V} from './eiffelRigid';

export interface EiffelMasterLinkGeometry {
 readonly hoistEnd:readonly number[];
 readonly strands:readonly {readonly line:readonly (readonly number[])[]}[];
}

/** Carrier trajectory is unchanged; the rope ends at the real upper eye apex. */
export function sampleEiffelMasterLinkHoist(seconds:number, geometry:EiffelMasterLinkGeometry=link){
 const base=sampleEiffelLongLoadHoist(seconds),masterOrigin=base.worldHook;
 const referenceCargoY=carrier.hookY+geometry.hoistEnd[1]!+197-EIFFEL_FIRST_FLOOR_Y-1.45;
 const rig=eiffelRelayRigAt([0,base.carrierOrigin[1]+referenceCargoY,base.trolleyZ+.25],base.trolleyZ,{sheaveY:205.06,referenceCargoY});
 const world=(p:readonly number[])=>p.map((v,i)=>v+masterOrigin[i]!) as unknown as V;
 return {...base,...rig,masterOrigin,worldHook:eiffelFirstFloorWorld(rig.hook),worldRope:rig.rope.map(eiffelFirstFloorWorld),
  worldSlings:geometry.strands.map(s=>s.line.map(world)),hoistTermination:world(geometry.hoistEnd)};
}
