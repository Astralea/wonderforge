import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import type {EiffelKitManifest} from '../src/data/eiffelKitTypes';
import {eiffelConvexBox,eiffelConvexPenetration,eiffelConvexSolid,eiffelConvexTranslationSweep,type EiffelConvexSolid} from '../src/engine/eiffelConvex';
import {eiffelSolidBox} from '../src/engine/eiffelOccupancy';
import type {RigidPose,RigidVec3 as V} from '../src/engine/eiffelRigid';

type Result={partId:string;order:number;rackId:string;shelfIndex:0|1;boundingSphereRadius:number;clear:boolean;failures:string[];poses:{flatHigh:RigidPose;aboveRack:RigidPose;outsideShelf:RigidPose;intermediateShelf:RigidPose;stock:RigidPose};dogleg:{used:boolean;longitudinalOffset:number;requires:string}};
type Audit={summary:{total:number;clear:number;rejected:number;productionReady:boolean;envelopeOnly:boolean;reasonCounts:Record<string,number>};results:Result[]};
type Prism={id:string;rackId:string;role:string;vertices:V[]};
const folder='artifacts/eiffel-summit-stock-2026-09-08/';
const audit=JSON.parse(readFileSync(folder+'handoff-audit.json','utf8')) as Audit;
const before=JSON.parse(readFileSync(folder+'handoff-before-dogleg.json','utf8')) as Audit;
// The dated handoff remains evidence for the preserved pre-revision 247-piece summit.
const manifest=JSON.parse(readFileSync('artifacts/eiffel-summit-revision-2026-09-08/before-kit/tower-kit.manifest.json','utf8')) as EiffelKitManifest;
const prisms=JSON.parse(readFileSync(folder+'rack-occupancy.json','utf8')) as Prism[];
const faces=[[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]] as const;
const distance=(a:readonly number[],b:readonly number[])=>Math.hypot(a[0]!-b[0]!,a[1]!-b[1]!,a[2]!-b[2]!);

describe('archived pre-revision summit stock handoff audit',()=>{
 it('preserves the rejected straight-route baseline and records all 247 routes',()=>{
  expect(before.summary).toMatchObject({total:247,clear:237,rejected:10});
  expect(audit.summary).toMatchObject({total:247,clear:247,rejected:0,productionReady:false,envelopeOnly:true,reasonCounts:{}});
  expect(new Set(audit.results.map(r=>r.partId)).size).toBe(247);
 });
 it('uses only bounded doglegs and ends every route at its exact stock pose',()=>{
  const doglegs=audit.results.filter(r=>r.dogleg.used);
  expect(doglegs).toHaveLength(10);
  for(const route of audit.results){
   expect(Math.abs(route.dogleg.longitudinalOffset)).toBeLessThanOrEqual(1.0000001);
   expect(Math.abs(route.dogleg.longitudinalOffset)*5).toBeCloseTo(Math.round(Math.abs(route.dogleg.longitudinalOffset)*5),10);
   expect(distance(route.poses.outsideShelf.position,route.poses.intermediateShelf.position)).toBeGreaterThan(0);
   expect(distance(route.poses.intermediateShelf.position,route.poses.stock.position)).toBeCloseTo(Math.abs(route.dogleg.longitudinalOffset),9);
   if(route.dogleg.used)expect(route.dogleg.requires).toContain('rollers');
  }
 });
 it('records the deterministic collision-avoiding loading order',()=>{
  expect(audit.results.map(r=>r.order)).toEqual([...Array(247).keys()]);
  const byId=new Map(audit.results.map(r=>[r.partId,r.order]));
  expect(byId.get('beacon-window-08-m002-c000')).toBeLessThan(byId.get('beacon-window-07-m002-c000')!);
  expect(byId.get('beacon-window-12-m002-c000')).toBeLessThan(byId.get('beacon-window-11-m002-c000')!);
 });
 it('independently replays every exact translation sweep against tower, racks, and preceding stock',()=>{
  const parts=new Map(manifest.parts.map(part=>[part.id,part]));
  const fixed=manifest.parts.filter(part=>part.stage<=56).map(part=>({id:part.id,kind:'tower' as const,solid:eiffelConvexBox(eiffelSolidBox(part,part.finalPose))}));
  const racks=prisms.map(prism=>({id:prism.id,kind:'rack' as const,prism,solid:eiffelConvexSolid(prism.vertices,faces)}));
  const stored:{id:string;kind:'stored';solid:EiffelConvexSolid}[]=[];
  for(const route of audit.results){
   const part=parts.get(route.partId);expect(part,route.partId).toBeDefined();
   const corners=[-1,1].flatMap(x=>[-1,1].flatMap(y=>[-1,1].map((z):V=>[x<0?part!.localBounds.min[0]:part!.localBounds.max[0],y<0?part!.localBounds.min[1]:part!.localBounds.max[1],z<0?part!.localBounds.min[2]:part!.localBounds.max[2]])));
   const requiredRadius=Math.max(...corners.map(v=>Math.hypot(...v)));
   expect(route.boundingSphereRadius,`${route.partId}: recorded rotation radius`).toBeGreaterThanOrEqual(requiredRadius-1e-12);
   const context=[...fixed,...racks,...stored];
   const legs:[string,RigidPose,RigidPose][]=[['lateral-high',route.poses.flatHigh,route.poses.aboveRack],['descent-outside',route.poses.aboveRack,route.poses.outsideShelf],['shelf-insertion',route.poses.outsideShelf,route.poses.intermediateShelf],['lengthwise-slide',route.poses.intermediateShelf,route.poses.stock]];
   for(const [leg,start,end] of legs){
    const delta=end.position.map((v,k)=>v-start.position[k]!) as unknown as V;
    const swept=eiffelConvexTranslationSweep(eiffelConvexBox(eiffelSolidBox(part!,start)),delta);
    for(const obstacle of context){
     if(swept.min.some((value,k)=>value>obstacle.solid.max[k]!||swept.max[k]!<obstacle.solid.min[k]!))continue;
     const penetration=eiffelConvexPenetration(swept,obstacle.solid);
     const assignedShelf=obstacle.kind==='rack'&&obstacle.prism.rackId===route.rackId&&obstacle.prism.role==='shelf'&&obstacle.prism.id.endsWith(`shelf-${route.shelfIndex}`);
     const permittedBearing=(leg==='shelf-insertion'||leg==='lengthwise-slide')&&assignedShelf&&penetration<=1e-4;
     expect(penetration<=1e-5||permittedBearing,`${route.partId} ${leg} intersects ${obstacle.kind} ${obstacle.id} by ${penetration}`).toBe(true);
    }
   }
   stored.push({id:route.partId,kind:'stored',solid:eiffelConvexBox(eiffelSolidBox(part!,route.poses.stock))});
  }
 },30000);
});
