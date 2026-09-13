import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import type {EiffelKitManifest} from '../src/data/eiffelKitTypes';
import {eiffelConvexBox,eiffelConvexPenetration,eiffelConvexSolid,type EiffelConvexSolid} from '../src/engine/eiffelConvex';
import {eiffelSolidBox} from '../src/engine/eiffelOccupancy';
import type {RigidVec3 as V} from '../src/engine/eiffelRigid';

type Prism={id:string;role:string;owner:string|null;vertices:V[]};
type Unit={id:string;kind:string;prisms:Prism[]};
type Plate={id:string;center:V;size:V};
type Joint={id:string;unitIds:[string,string];axis:0|2;plates:Plate[];bolts:{center:V;axis:number}[]};
const folder='artifacts/eiffel-relay-platform-2026-09-08/';
const source=JSON.parse(readFileSync(folder+'platform-occupancy.json','utf8')) as Prism[];
const unitsDoc=JSON.parse(readFileSync(folder+'platform-units.json','utf8')) as {units:Unit[]};
const splices=JSON.parse(readFileSync(folder+'platform-splices.json','utf8')) as {joints:Joint[];productionReady:boolean;limits:string[]};
const manifest=JSON.parse(readFileSync('public/models/eiffel-construction-kit/tower-kit.manifest.json','utf8')) as EiffelKitManifest;
const faces=[[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]] as const;
const overlaps=(a:EiffelConvexSolid,b:EiffelConvexSolid)=>!a.min.some((v,k)=>v>b.max[k]!||a.max[k]!<b.min[k]!);
const plateSolid=(plate:Plate)=>eiffelConvexBox({center:plate.center,half:[plate.size[0]/2,plate.size[1]/2,plate.size[2]/2],axes:[[1,0,0],[0,1,0],[0,0,1]]});

describe('Eiffel relay platform girder splices',()=>{
 it('defines the frozen joint, plate, and bolt inventory without claiming readiness',()=>{
  expect(splices.productionReady).toBe(false);
  expect(splices.joints).toHaveLength(14);
  expect(splices.joints.flatMap(j=>j.plates)).toHaveLength(28);
  expect(splices.joints.flatMap(j=>j.bolts)).toHaveLength(56);
  expect(new Set(splices.joints.flatMap(j=>j.plates.map(p=>p.id))).size).toBe(28);
 });

 it('keeps every splice plate out of all 144 original platform prisms, including its contacted web',()=>{
  expect(source).toHaveLength(144);
  const solids=source.map(prism=>({prism,solid:eiffelConvexSolid(prism.vertices,faces)}));
  const failures:string[]=[];
  for(const joint of splices.joints)for(const plate of joint.plates){const moving=plateSolid(plate);for(const target of solids){if(!overlaps(moving,target.solid))continue;const depth=eiffelConvexPenetration(moving,target.solid);if(depth>1e-8)failures.push(`${plate.id}:${target.prism.id}:${depth}`);}}
  expect(failures).toEqual([]);
 });

 it('keeps every splice plate clear of every completed kit envelope through stage 45',()=>{
  const kit=manifest.parts.filter(part=>part.stage<=45).map(part=>({part,solid:eiffelConvexBox(eiffelSolidBox(part,part.finalPose))}));
  const failures:string[]=[];
  for(const joint of splices.joints)for(const plate of joint.plates){const moving=plateSolid(plate);for(const target of kit){if(!overlaps(moving,target.solid))continue;const depth=eiffelConvexPenetration(moving,target.solid);if(depth>1e-8)failures.push(`${plate.id}:${target.part.id}:${depth}`);}}
  expect(failures).toEqual([]);
 },30_000);

 it('places both plates across the exact shared boundary of both adjacent girder segments',()=>{
  const units=new Map(unitsDoc.units.map(unit=>[unit.id,unit]));
  for(const joint of splices.joints){
   const [left,right]=joint.unitIds.map(id=>units.get(id));expect(left,`${joint.id}: first unit`).toBeDefined();expect(right,`${joint.id}: second unit`).toBeDefined();
   expect(left!.kind).toBe('girder');expect(right!.kind).toBe('girder');
   const leftWeb=left!.prisms.find(p=>p.id.endsWith('-web'))!,rightWeb=right!.prisms.find(p=>p.id.endsWith('-web'))!;expect(leftWeb).toBeDefined();expect(rightWeb).toBeDefined();
   const leftMax=Math.max(...leftWeb.vertices.map(v=>v[joint.axis])),rightMin=Math.min(...rightWeb.vertices.map(v=>v[joint.axis]));expect(leftMax,`${joint.id}: common seam`).toBeCloseTo(rightMin,10);
   for(const plate of joint.plates){const min=plate.center[joint.axis]-plate.size[joint.axis]/2,max=plate.center[joint.axis]+plate.size[joint.axis]/2;expect(min,`${plate.id}: spans first segment`).toBeLessThan(leftMax);expect(max,`${plate.id}: spans second segment`).toBeGreaterThan(rightMin);expect(plate.center[joint.axis],`${plate.id}: centered at seam`).toBeCloseTo(leftMax,10);}
  }
 });
});
