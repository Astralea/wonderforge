import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import type {EiffelKitManifest} from '../src/data/eiffelKitTypes';
import {eiffelConvexBox,eiffelConvexPenetration,eiffelConvexSolid,eiffelConvexTranslationSweep,type EiffelConvexSolid} from '../src/engine/eiffelConvex';
import {eiffelSolidBox} from '../src/engine/eiffelOccupancy';
import type {RigidVec3 as V} from '../src/engine/eiffelRigid';

type Prism={id:string;vertices:V[]};
type Design={floorY:number;productionReady:boolean;frame:Prism[];cargoLane:[number,number];limits:string[]};
const relay='artifacts/eiffel-relay-platform-2026-09-08/';
const design=JSON.parse(readFileSync('artifacts/eiffel-relay-winch-2026-09-08/design.json','utf8')) as Design;
const platform=JSON.parse(readFileSync(relay+'platform-occupancy.json','utf8')) as Prism[];
const manifest=JSON.parse(readFileSync('public/models/eiffel-construction-kit/tower-kit.manifest.json','utf8')) as EiffelKitManifest;
const faces=[[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]] as const;
const frame=design.frame.map(prism=>({id:prism.id,kind:'frame',solid:eiffelConvexSolid(prism.vertices,faces)}));
const platformSolids=platform.map(prism=>({id:prism.id,kind:'platform',solid:eiffelConvexSolid(prism.vertices,faces)}));
const kit=manifest.parts.filter(part=>part.stage<=45).map(part=>({id:part.id,kind:'kit',solid:eiffelConvexBox(eiffelSolidBox(part,part.finalPose))}));
const overlaps=(a:EiffelConvexSolid,b:EiffelConvexSolid)=>!a.min.some((v,k)=>v>b.max[k]!||a.max[k]!<b.min[k]!);
const collisions=(moving:EiffelConvexSolid,obstacles:typeof frame)=>obstacles.flatMap(obstacle=>{if(!overlaps(moving,obstacle.solid))return[];const depth=eiffelConvexPenetration(moving,obstacle.solid);return depth>1e-7?[`${obstacle.kind}:${obstacle.id}:${depth}`]:[];});
const crate=(center:V)=>eiffelConvexBox({center,half:[.3,.9,.3],axes:[[1,0,0],[0,1,0],[0,0,1]]});
const sweep=(start:V,end:V)=>eiffelConvexTranslationSweep(crate(start),[end[0]-start[0],end[1]-start[1],end[2]-start[2]]);

describe('Eiffel 197m relay winch geometry',()=>{
 it('keeps all 22 frame prisms clear of the platform and completed stage-45 tower',()=>{
  expect(design.productionReady).toBe(false);expect(frame).toHaveLength(22);
  const failures:string[]=[];for(const member of frame)failures.push(...collisions(member.solid,[...platformSolids,...kit]));
  expect(failures).toEqual([]);
 },30_000);
 it('places both skid bottoms exactly on the 197m deck plane',()=>{
  const skids=design.frame.filter(member=>member.id.startsWith('skid-'));expect(skids).toHaveLength(2);
  for(const skid of skids){const bottom=Math.min(...skid.vertices.map(v=>v[1]));expect(bottom,skid.id).toBeCloseTo(design.floorY,10);expect(skid.vertices.filter(v=>Math.abs(v[1]-bottom)<1e-10)).toHaveLength(4);}
 });
 it('clears the crate hoist, receiver transfer, and final lowering sweeps',()=>{
  expect(design.cargoLane).toEqual([0,-1.8]);
  const obstacles=[...frame,...platformSolids,...kit],legs:[string,V,V][]=[['hoist',[0,190.9,-1.8],[0,198.1,-1.8]],['receiver-transfer',[0,198.1,-1.8],[0,198.1,-3.6]],['lower-to-deck',[0,198.1,-3.6],[0,197.9,-3.6]]];
  const failures=legs.flatMap(([leg,start,end])=>collisions(sweep(start,end),obstacles).map(hit=>`${leg}:${hit}`));
  expect(failures).toEqual([]);
 },30_000);
});
