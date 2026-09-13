/** Full-manifest ground-feed envelope search. Never a production admission. */
import type { EiffelKitPart } from '../data/eiffelKitTypes';
import type { EiffelProductionOperation } from './eiffelProductionConstruction';
import { EiffelOccupancy, eiffelAxisBox, eiffelSolidBox, eiffelBoxBounds, type EiffelSolidBox } from './eiffelOccupancy';
import { eiffelConvexBox, eiffelConvexTranslationSweep, eiffelConvexPenetration } from './eiffelConvex';
import { eiffelReceiverBeamBox } from './eiffelUpperClearance';
import { sampleEiffelCrane } from './eiffelCrane';
import { eiffelTerrainHeightAt } from './eiffelTerrain';
import { interpolateRigidPose, type RigidPose, type RigidVec3 } from './eiffelRigid';

export interface EiffelGroundFeedRoute {
  readonly ground: RigidPose;
  readonly raised: RigidPose;
  readonly overReceiver: RigidPose;
  readonly received: RigidPose;
  readonly productionReady: false;
}
export interface EiffelGroundFeedProbe {
  readonly partId: string;
  readonly directBlocker: string | null;
  readonly directIronBlocker: string | null;
  readonly route: EiffelGroundFeedRoute | null;
  readonly attempts: number;
  readonly rejectionCounts: Readonly<Record<string,number>>;
}
const EPS=1e-5;
function shift(p:RigidPose,x:number,y:number,z:number):RigidPose {
  return {position:[x,y,z],quaternion:p.quaternion};
}
export function eiffelGroundPickup(part:EiffelKitPart,pose:RigidPose):RigidPose {
  const zero=shift(pose,pose.position[0],0,pose.position[2]);
  const bounds=eiffelBoxBounds(eiffelSolidBox(part,zero));
  const bed=Math.max(...[bounds.min[0],bounds.max[0]].flatMap(x=>[bounds.min[2],bounds.max[2]].map(z=>eiffelTerrainHeightAt(x,z))))+.6;
  return shift(pose,pose.position[0],bed-bounds.min[1],pose.position[2]);
}
/** Exact translation sweep of the rectangular kit occupancy; curved cupola
 * parts use a conservative box envelope and are labeled as such by the audit. */
export function eiffelGroundFeedBlocker(
  part:EiffelKitPart,from:RigidPose,to:RigidPose,t:number,occupancy:EiffelOccupancy,
  equipment:readonly {id:string;box:EiffelSolidBox}[]=[],
):string|null {
  if(from.quaternion.some((v,i)=>Math.abs(v-to.quaternion[i]!)>1e-10))throw Error('Ground feed sweep requires fixed orientation');
  const shape=eiffelConvexTranslationSweep(eiffelConvexBox(eiffelSolidBox(part,from)),
    to.position.map((v,i)=>v-from.position[i]!) as unknown as RigidVec3);
  for(const fixed of equipment)if(eiffelConvexPenetration(shape,eiffelConvexBox(fixed.box))>EPS)return fixed.id;
  const center=shape.min.map((v,i)=>(v+shape.max[i]!)/2) as unknown as RigidVec3;
  const size=shape.min.map((v,i)=>shape.max[i]!-v) as unknown as RigidVec3;
  for(const fixed of occupancy.nearby(eiffelAxisBox(center,size),t)){
    if(fixed.part.id===part.id)continue;
    if(eiffelConvexPenetration(shape,eiffelConvexBox(fixed.box))>EPS)return fixed.part.id;
  }
  return null;
}
function receivingEquipment(op:EiffelProductionOperation):{id:string;box:EiffelSolidBox}[]{
  const receiver=op.receiver!,base=op.station!.base;
  const result=[
    {id:'receiver-deck',box:eiffelAxisBox(receiver.center,receiver.size)},
    ...receiver.saddles.map((s,i)=>({id:`receiver-support-${i}`,box:eiffelReceiverBeamBox(s,receiver.center,.075)})),
    {id:'crane-mast-envelope',box:eiffelAxisBox([base[0],base[1]+op.station!.mastHeight/2,base[2]],[.34,op.station!.mastHeight,.34])},
  ];
  // The production staged stock rests on a small carrier table above the deck.
  // Keep that table present for reception and include its four real supports.
  const bottom=eiffelBoxBounds(eiffelSolidBox(op.part,op.pickup)).min[1];
  const w=op.part.transportSize[0]+.6,d=op.part.transportSize[2]+.6;
  const top=bottom-.24,floor=receiver.center[1]+receiver.size[1]/2;
  result.push({id:'receiver-stock-bed',box:eiffelAxisBox([op.pickup.position[0],bottom-.12,op.pickup.position[2]],[w,.24,d])});
  for(const x of [-1,1])for(const z of [-1,1])if(top>floor)
    result.push({id:`receiver-stock-foot-${x}-${z}`,box:eiffelAxisBox([op.pickup.position[0]+x*(w/2-.18),(top+floor)/2,op.pickup.position[2]+z*(d/2-.18)],[.28,top-floor,.28])});
  if(op.bracket){
    const [a,b]=op.bracket.saddles,t=op.bracket.tip;
    const al:RigidVec3=[a[0],a[1]-.55,a[2]],bl:RigidVec3=[b[0],b[1]-.55,b[2]];
    for(const [i,[from,to,r]]of ([[a,t,.085],[b,t,.085],[a,b,.07],[a,al,.065],[b,bl,.065],[al,t,.065],[bl,t,.065]] as const).entries())
      result.push({id:`crane-bracket-${i}`,box:eiffelReceiverBeamBox(from,to,r)});
    for(const [i,s]of [a,b].entries())result.push({id:`crane-saddle-${i}`,box:eiffelAxisBox(s,[.42,.18,.42])});
  }
  return result;
}
export function probeEiffelGroundFeed(op:EiffelProductionOperation,occupancy:EiffelOccupancy):EiffelGroundFeedProbe {
  if(!op.station||!op.receiver||op.part.group==='foundation')throw Error('Ground feed needs an upper receiving station');
  const equipment=receivingEquipment(op),directGround=eiffelGroundPickup(op.part,op.pickup);
  const directBlocker=eiffelGroundFeedBlocker(op.part,directGround,op.pickup,op.start,occupancy,equipment);
  const directIronBlocker=eiffelGroundFeedBlocker(op.part,directGround,op.pickup,op.start,occupancy);
  const rejectionCounts:Record<string,number>={};let attempts=0;
  const reject=(s:string)=>{rejectionCounts[s]=(rejectionCounts[s]??0)+1;};
  // Cargo stays in its real transport orientation until received. Raising its
  // bottom above the existing pickup's top leaves room for lateral handoff.
  const pickupBox=eiffelBoxBounds(eiffelSolidBox(op.part,op.pickup));
  const zeroBox=eiffelBoxBounds(eiffelSolidBox(op.part,shift(op.pickup,0,0,0)));
  const height=pickupBox.max[1]+.5-zeroBox.min[1];
  const overReceiver=shift(op.pickup,op.pickup.position[0],height,op.pickup.position[2]);
  const station=op.station,angle=Math.atan2(station.base[2],station.base[0]);
  let route:EiffelGroundFeedRoute|null=null;
  // Bounded envelope search around the existing finite-reach station. A clear
  // proposal does not claim a feasible complete crane, cart or rope system.
  outer:for(const radius of [7.2,5.4,3.6])candidate:for(let k=0;k<16;k++){
    attempts++;
    const a=angle+k*Math.PI/8,x=station.base[0]+Math.cos(a)*radius,z=station.base[2]+Math.sin(a)*radius;
    const raised=shift(op.pickup,x,height,z),ground=eiffelGroundPickup(op.part,raised);
    if(ground.position[1]>=height){reject('no-positive-lift');continue;}
    try{for(const p of [ground,raised,overReceiver,op.pickup])sampleEiffelCrane(station,p,op.part.pickupLugs);}
    catch{reject('finite-hook-reach');continue;}
    for(const [name,from,to] of [['ascent',ground,raised],['handoff',raised,overReceiver],['descent',overReceiver,op.pickup]] as const){
      const blocker=eiffelGroundFeedBlocker(op.part,from,to,op.start,occupancy,equipment);
      if(blocker){reject(`${name}:${blocker.startsWith('receiver-')||blocker.startsWith('crane-')?blocker:'completed-iron'}`);continue candidate;}
    }
    route={ground,raised,overReceiver,received:op.pickup,productionReady:false};break outer;
  }
  return {partId:op.part.id,directBlocker,directIronBlocker,route,attempts,rejectionCounts};
}
export function sampleEiffelGroundFeed(route:EiffelGroundFeedRoute,raw:number):RigidPose {
  if(!Number.isFinite(raw))throw Error('Ground feed time must be finite');
  const p=Math.max(0,Math.min(1,raw));
  const smooth=(v:number)=>v*v*(3-2*v);
  if(p<.65)return interpolateRigidPose(route.ground,route.raised,smooth(p/.65));
  if(p<.85)return interpolateRigidPose(route.raised,route.overReceiver,smooth((p-.65)/.2));
  return interpolateRigidPose(route.overReceiver,route.received,smooth((p-.85)/.15));
}
