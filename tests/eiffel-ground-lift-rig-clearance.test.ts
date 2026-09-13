import {beforeAll,describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import type {EiffelKitManifest} from '../src/data/eiffelKitTypes';
import {createEiffelProductionPlan} from '../src/engine/eiffelProductionConstruction';
import {EiffelOccupancy,eiffelAxisBox,eiffelBoxBounds,eiffelBoxPenetration,eiffelSolidBox,type EiffelSolidBox} from '../src/engine/eiffelOccupancy';
import {eiffelReceiverBeamBox} from '../src/engine/eiffelUpperClearance';
import {composeRigidPoses,rotateRigidVector,transformRigidPoint,type RigidPose,type RigidQuat,type RigidVec3 as V} from '../src/engine/eiffelRigid';
import { EIFFEL_GROUND_STATIONS, rotateGroundStationPoint, rotateGroundStationPose, sampleEiffelGroundStation, groundStationQuaternion } from '../src/engine/eiffelGroundStations';
import frozen from '../artifacts/eiffel-integration-2026-09-07/guyenet-ne-station.json';
interface Primitive {id:string;role:string;kind:'beam'|'box'|'cylinder';a:V;b:V;halfWidth:number;center:V;size:V;axis:string;radius:number;length:number}
interface Role {role:string;parent:string|null;position:V;rotationX:number}
const capture=JSON.parse(readFileSync('artifacts/eiffel-integration-2026-09-07/crane-primitives.json','utf8')) as {sourceBuilderSHA256:string;description:unknown;roles:Role[];primitives:Primitive[]};
const vx=(p:readonly number[]):V=>[p[0]!,p[1]!,p[2]!];
const qx=(a:number):RigidQuat=>[Math.sin(a/2),0,0,Math.cos(a/2)],qy=(a:number):RigidQuat=>[0,Math.sin(a/2),0,Math.cos(a/2)];
const primitiveBox=(p:Primitive)=>p.kind==='beam'?eiffelReceiverBeamBox(p.a,p.b,p.halfWidth):eiffelAxisBox(p.center,p.kind==='box'?p.size:p.axis==='x'?[p.length,p.radius*2,p.radius*2]:[p.radius*2,p.length,p.radius*2]);
const primitives=capture.primitives.map(p=>({...p,box:primitiveBox(p)}));
const structureRoot:RigidPose={position:vx(frozen.station.root),quaternion:qy(-Math.PI/4)};
const localPoint=(p:readonly number[]):V=>{const [x,y,z]=frozen.station.root,k=Math.SQRT1_2;return [k*(p[0]!-x!+p[2]!-z!),p[1]!-y!,k*(-p[0]!+x!+p[2]!-z!)];};
const neStructures=frozen.proposedStructure.map(p=>{
 const local=eiffelReceiverBeamBox(localPoint(p.a),localPoint(p.b),p.halfWidth);
 const box:EiffelSolidBox={center:transformRigidPoint(structureRoot,local.center),half:local.half,axes:local.axes.map(v=>rotateRigidVector(structureRoot.quaternion,v)) as unknown as EiffelSolidBox['axes']};
 return {id:p.id,box,bounds:eiffelBoxBounds(box)};
});
const structures=EIFFEL_GROUND_STATIONS.flatMap(station=>neStructures.map(source=>{
 const box:EiffelSolidBox={...source.box,center:rotateGroundStationPoint(source.box.center,station.id),
  axes:source.box.axes.map(axis=>rotateRigidVector(groundStationQuaternion(station.id),axis)) as unknown as EiffelSolidBox['axes']};
 return {id:`${station.id}-${source.id}`,box,bounds:eiffelBoxBounds(box)};
}));
let tower:EiffelOccupancy;
let manifest:EiffelKitManifest;
function blocked(box:EiffelSolidBox):string[]{
 const bounds=eiffelBoxBounds(box),hits:string[]=[];
 for(const n of tower.nearby(box,0))if(eiffelBoxPenetration(box,n.box)>1e-5)hits.push(n.part.id);
 for(const n of structures){
  if(bounds.min.some((v,k)=>v>n.bounds.max[k]!)||bounds.max.some((v,k)=>v<n.bounds.min[k]!))continue;
  if(eiffelBoxPenetration(box,n.box)>1e-5)hits.push(n.id);
 }
 return hits;
}
describe('actual builder primitive regression for all four ground stations',()=>{
 beforeAll(()=>{
  manifest=JSON.parse(readFileSync('public/models/eiffel-construction-kit/tower-kit.manifest.json','utf8')) as EiffelKitManifest;
  const plan=createEiffelProductionPlan(manifest,{upperClearance:'skip'}),start=plan.byPart.get(frozen.part.id)!.start;
  tower=new EiffelOccupancy(manifest.parts.filter(p=>plan.byPart.get(p.id)!.end<=start).map(part=>({part,end:0})));
 },30000);
 it('binds the primitive capture to the current Blender builder',()=>{
  expect(createHash('sha256').update(readFileSync('scripts/blender_eiffel_guyenet.py')).digest('hex')).toBe(capture.sourceBuilderSHA256);
  expect(JSON.parse(readFileSync('artifacts/eiffel-ground-lift-2026-09-07/guyenet-ne.json','utf8'))).toEqual(capture.description);
 });
 it('clears actual hook, rope, jib, ties and carriage at phase boundaries and the maximum-yaw pose',()=>{
  // The exhaustive offline audit uses .02s intervals. This bounded regression
  // covers the changed static intersections and the actual-hook sector edge.
  for(const station of EIFFEL_GROUND_STATIONS)for(const seconds of [0,10,14,20,26,29,31,32,33,36,40,43,46,49,55]){
   const s=sampleEiffelGroundStation(seconds,station.id),poses=new Map<string,RigidPose>(),world=rotateGroundStationPose(structureRoot,station.id);
   for(const role of capture.roles){
    let position=role.position,quaternion=qx(role.rotationX||0);
    if(role.role==='rotor')quaternion=qy(s.crane.yaw);
    if(role.role==='jib')quaternion=qx(s.crane.boomAngle);
    if(role.role==='slider')position=[position[0],s.crane.slider,position[2]];
    if(role.role.startsWith('tie-')){position=[position[0],s.crane.slider,position[2]];quaternion=qx(s.crane.tieAngle);}
    if(role.role==='hoist-drum')quaternion=qx(-s.crane.hoistRopeLength/.26);
    poses.set(role.role,composeRigidPoses(role.parent?poses.get(role.parent)!:world,{position,quaternion}));
   }
   for(const p of primitives){
    const pose=poses.get(p.role)!,box:EiffelSolidBox={center:transformRigidPoint(pose,p.box.center),half:p.box.half,axes:p.box.axes.map(v=>rotateRigidVector(pose.quaternion,v)) as unknown as EiffelSolidBox['axes']};
    expect(blocked(box),`${station.id} ${seconds}s ${p.id}`).toEqual([]);
   }
   for(const [i,rope] of s.rigging.slings.entries())for(let j=1;j<3;j++){
    const a=rope.points[j-1]!,b=rope.points[j]!;
    if(Math.hypot(...a.map((v,k)=>v-b[k]!))>1e-7)expect(blocked(eiffelReceiverBeamBox(a,b,.015)),`${station.id} ${seconds}s sling${i}`).toEqual([]);
   }
   expect(blocked(eiffelReceiverBeamBox(s.crane.hook,s.crane.boomTip,.018)),`${station.id} ${seconds}s hoist rope`).toEqual([]);
   // Payload final-joint overlap is intentional only during its lowering/seat.
   const target=manifest.parts.find(p=>p.id===station.payloadId)!,cargo=eiffelSolidBox(target,s.payload.pose),final=eiffelSolidBox(target,target.finalPose);
   for(const n of tower.nearby(cargo,0))expect(eiffelBoxPenetration(cargo,n.box)).toBeLessThanOrEqual((seconds>=40?eiffelBoxPenetration(final,n.box):0)+1e-5);
  }
 });
});
