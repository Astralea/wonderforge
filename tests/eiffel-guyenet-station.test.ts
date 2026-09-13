import {beforeAll,describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import type {EiffelKitManifest} from '../src/data/eiffelKitTypes';
import {createEiffelProductionPlan} from '../src/engine/eiffelProductionConstruction';
import {EiffelOccupancy,eiffelAxisBox,eiffelBoxPenetration,eiffelSolidBox,type EiffelSolidBox} from '../src/engine/eiffelOccupancy';
import {eiffelReceiverBeamBox} from '../src/engine/eiffelUpperClearance';
import {invertRigidPose,rotateRigidVector,transformRigidPoint,interpolateRigidPose,transformedRigidBounds,type RigidPose,type RigidVec3 as V} from '../src/engine/eiffelRigid';
import {eiffelTerrainHeightAt} from '../src/engine/eiffelTerrain';
import frozen from '../artifacts/eiffel-integration-2026-09-07/guyenet-ne-station.json';
const d=frozen,asV=(p:readonly number[])=>p as V,asPose=(p:{position:number[];quaternion:number[]})=>p as unknown as RigidPose;
let occupancy:EiffelOccupancy,staticBoxes:EiffelSolidBox[];
const rt=Math.SQRT1_2,heel=d.station.heel;
const polar=(p:V)=>{const dx=p[0]-heel[0]!,dz=p[2]-heel[2]!;return {r:Math.hypot(dx,dz),a:Math.atan2((dx+dz)*rt,(-dx+dz)*rt)}};
const planPoint=(r:number,a:number,y:number):V=>[heel[0]!+rt*r*(Math.sin(a)-Math.cos(a)),y,heel[2]!+rt*r*(Math.sin(a)+Math.cos(a))];
const clear=(box:EiffelSolidBox)=>occupancy.nearby(box,0).every(s=>eiffelBoxPenetration(box,s.box)<1e-5);
const part=d.part as unknown as EiffelKitManifest['parts'][number];
describe('bounded supported Guyenet NE pilot contract',()=>{
 beforeAll(()=>{
  const manifest=JSON.parse(readFileSync('public/models/eiffel-construction-kit/tower-kit.manifest.json','utf8')) as EiffelKitManifest;
  const plan=createEiffelProductionPlan(manifest,{upperClearance:'skip'}),start=plan.byPart.get(d.part.id)!.start;
  expect(manifest.parts.find(p=>p.id===d.part.id)).toEqual(d.part);
  const completed=manifest.parts.filter(p=>plan.byPart.get(p.id)!.end<=start);
  expect(start).toBeCloseTo(d.originalStart,12);
  // No leg filter: includes every completed foundation and remote pylon.
  occupancy=new EiffelOccupancy(completed.map(part=>({part,end:0})));
  const rootPose:RigidPose={position:asV(d.station.root),quaternion:[0,Math.sin(-Math.PI/8),0,Math.cos(-Math.PI/8)]};
  const into=(p:number[])=>transformRigidPoint(invertRigidPose(rootPose),asV(p));
  staticBoxes=d.proposedStructure.map(b=>{
   const local=eiffelReceiverBeamBox(into(b.a),into(b.b),b.halfWidth);
   return {center:transformRigidPoint(rootPose,local.center),half:local.half,axes:local.axes.map(v=>rotateRigidVector(rootPose.quaternion,v)) as unknown as EiffelSolidBox['axes']};
  });
  expect(completed.length).toBeGreaterThan(1800);
 },30000);
 it('places bounded braced falsework and guide members clear of every completed tower solid',()=>{
  for(const [i,box] of staticBoxes.entries())expect(clear(box),d.proposedStructure[i]!.id).toBe(true);
  for(const beam of d.proposedStructure)expect(Math.hypot(...beam.a.map((v,i)=>v-beam.b[i]!))).toBeLessThanOrEqual(5.80001);
  for(const [i,id] of ['lower-ne-02-m013-c002','lower-ne-02-m016-c000'].entries()){
   const support=occupancy.byPart.get(id)!.part;
   const point=transformRigidPoint(invertRigidPose(support.finalPose),transformRigidPoint(part.finalPose,part.connectionAnchors[i]!));
   for(let axis=0;axis<3;axis++){
    expect(point[axis]!).toBeGreaterThanOrEqual(support.localBounds.min[axis]!-2e-5);
    expect(point[axis]!).toBeLessThanOrEqual(support.localBounds.max[axis]!+2e-5);
   }
   expect(Math.min(...point.flatMap((v,k)=>[Math.abs(v-support.localBounds.min[k]!),Math.abs(v-support.localBounds.max[k]!) ]))).toBeLessThan(2e-5);
  }
  for(const foot of d.groundFalsework.feet)expect(eiffelTerrainHeightAt(foot[0]!,foot[2]!)).toBeCloseTo(foot[1]!,10);
 });
 it('provides a real pickup floor and a clear north-to-south carrier corridor',()=>{
  const pickup=d.route.pickup.position,deck=d.pickupSupport.find(b=>b.id==='pickup-deck')!;
  expect(deck.center[1]!+deck.size[1]!/2).toBeCloseTo(pickup[1]!-part.transportSize[1]/2,10);
  for(const b of d.pickupSupport)expect(clear(eiffelAxisBox(asV(b.center),asV(b.size))),b.id).toBe(true);
  const startZ=d.haulCorridor.from[2]!,endZ=d.haulCorridor.to[2]!;
  const haulSweep=eiffelAxisBox([pickup[0]!,.57,(startZ+endZ)/2],[1.8,1.14,5.1+Math.abs(endZ-startZ)]);
  expect(clear(haulSweep),'continuous ground carrier corridor').toBe(true);
  expect(staticBoxes.every(b=>eiffelBoxPenetration(haulSweep,b)<1e-5)).toBe(true);
  for(let i=0;i<=100;i++){
   const z=d.haulCorridor.from[2]!+(d.haulCorridor.to[2]!-d.haulCorridor.from[2]!)*i/100;
   const box=eiffelAxisBox([pickup[0]!,.57,z],[1.8,1.14,5.1]);
   expect(clear(box)).toBe(true);
   expect(staticBoxes.every(b=>eiffelBoxPenetration(box,b)<1e-5)).toBe(true);
  }
 });
 it('keeps the rigid payload, working jib and pivot clear along the complete pilot route',()=>{
  const high=asPose(d.route.high),rotated=asPose(d.route.rotated),approach=asPose(d.route.approach),final=part.finalPose;
  // Horizontal payload + vertical translation produces this exact convex
  // swept prism, so a thin completed tie cannot fall between hoist samples.
  const pickupBox=eiffelSolidBox(part,asPose(d.route.pickup));
  const swept:EiffelSolidBox={...pickupBox,center:[pickupBox.center[0],(d.route.pickup.position[1]!+high.position[1])/2,pickupBox.center[2]],half:[pickupBox.half[0],pickupBox.half[1]+(high.position[1]-d.route.pickup.position[1]!)/2,pickupBox.half[2]]};
  expect(clear(swept),'continuous hoist tower clearance').toBe(true);
  expect(staticBoxes.every(b=>eiffelBoxPenetration(swept,b)<1e-5),'continuous hoist falsework clearance').toBe(true);
  for(const [phase,from,to] of [['hoist',asPose(d.route.pickup),high],['rotate',high,rotated],['slew',rotated,approach],['lower',approach,final]] as const){
   for(let i=0;i<=800;i++){
    let pose=interpolateRigidPose(from,to,i/800);
    if(phase==='slew'){
     const a=polar(from.position),b=polar(to.position),t=i/800;
     pose={...pose,position:planPoint(a.r+(b.r-a.r)*t,a.a+(b.a-a.a)*t,from.position[1])};
    }
    const {r,a}=polar(pose.position),box=eiffelSolidBox(part,pose),finalBox=eiffelSolidBox(part,final);
    expect(r).toBeGreaterThanOrEqual(5.5);expect(r).toBeLessThanOrEqual(12);
    expect(a*180/Math.PI).toBeGreaterThanOrEqual(60-1e-8);expect(a*180/Math.PI).toBeLessThanOrEqual(120+1e-8);
    const top=transformedRigidBounds(pose,part.localBounds.min,part.localBounds.max).max[1];
    expect(heel[1]!+Math.sqrt(180-r*r)-top-1.2).toBeGreaterThan(.35);
    for(const neighbor of occupancy.nearby(box,0)){
     const allowed=phase==='lower'?eiffelBoxPenetration(finalBox,neighbor.box):0;
     expect(eiffelBoxPenetration(box,neighbor.box),`${phase}:${i}:${neighbor.part.id}`).toBeLessThanOrEqual(allowed+1e-5);
    }
    expect(staticBoxes.every(b=>eiffelBoxPenetration(box,b)<1e-5),`${phase}:${i}:payload falsework`).toBe(true);
    const yaw=a-Math.PI/4,s=r/Math.sqrt(180),c=Math.sqrt(1-s*s),sa=Math.sin(yaw),ca=Math.cos(yaw),length=Math.sqrt(180);
    const axes:readonly [V,V,V]=[[ca,0,-sa],[sa*s,c,ca*s],[sa*c,-s,ca*c]];
    const boom:EiffelSolidBox={center:asV(heel.map((v,k)=>v+axes[1][k]!*length/2)),half:[.313,length/2+.033,.213],axes};
    expect(clear(boom),`${phase}:${i}:jib tower`).toBe(true);
    expect(staticBoxes.every(b=>eiffelBoxPenetration(boom,b)<1e-5),`${phase}:${i}:jib falsework`).toBe(true);
    expect(clear(eiffelAxisBox([heel[0]!,16.15,heel[2]!],[.43,9.3,.43]))).toBe(true);
   }
  }
 });
});
