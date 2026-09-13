import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {sampleEiffelSupplyPusher} from '../src/engine/eiffelSupplyPusher';
import {sampleEiffelSecondFloorSupply} from '../src/engine/eiffelSecondFloorSupply';
import {rotateRigidVector,type RigidVec3 as V} from '../src/engine/eiffelRigid';
import {eiffelConvexBox,eiffelConvexSolid,eiffelConvexPenetration} from '../src/engine/eiffelConvex';
import {eiffelSolidBox} from '../src/engine/eiffelOccupancy';
import type {EiffelKitManifest} from '../src/data/eiffelKitTypes';
const manifest=JSON.parse(readFileSync('public/models/eiffel-construction-kit/tower-kit.manifest.json','utf8')) as EiffelKitManifest;
const bridge=JSON.parse(readFileSync('artifacts/eiffel-second-floor-supply-2026-09-08/bridge-design.json','utf8')) as {shapes:{id:string;vertices:V[]}[]};
const faces=[[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]];
const fixed=[...bridge.shapes.map(p=>({id:p.id,solid:eiffelConvexSolid(p.vertices,faces)})),...manifest.parts.filter(p=>p.stage<=45).map(p=>({id:p.id,solid:eiffelConvexBox(eiffelSolidBox(p,p.finalPose))}))].filter(o=>o.solid.max[0]>=-17&&o.solid.min[0]<=0&&o.solid.max[1]>=116.1399&&o.solid.min[1]<118&&o.solid.max[2]>-2.4&&o.solid.min[2]<-1.2);
describe('stock cart pushing worker',()=>{
 it('keeps fixed bone lengths, planted feet and real hand contact during pushing',()=>{
  for(let t=0;t<=24;t+=.05){const s=sampleEiffelSupplyPusher(t);expect(s.feet.some(f=>f.planted)).toBe(true);
   for(const f of s.feet)if(f.planted)expect(f.center[1]-.06).toBeCloseTo(116.14,10);
   for(const p of s.parts)if(p.a&&p.b)expect(Math.hypot(...p.a.map((v,k)=>v-p.b![k]!))).toBeCloseTo(p.size[1],9);
   for(const h of s.hands)if(h.active){expect(h.center[0]+.035).toBeCloseTo(h.surface[0],10);expect(h.center[1]).toBeCloseTo(h.surface[1],10);}
  }
 });
 it('plants stance feet in world space and keeps the worker present after cargo departs',()=>{
  for(let t=.1;t<19.9;t+=.1){const a=sampleEiffelSupplyPusher(t),b=sampleEiffelSupplyPusher(t+.001);a.feet.forEach((f,i)=>{if(f.planted&&b.feet[i]!.planted)expect(b.feet[i]!.center[0]).toBeCloseTo(f.center[0],8);});}
  expect(sampleEiffelSupplyPusher(182).parts).toEqual(sampleEiffelSupplyPusher(23).parts);
 });
 it('keeps conservative body volumes out of bridge, tower and loaded crate',()=>{
  const failures:string[]=[];
  for(let t=0;t<=23;t+=.1){const s=sampleEiffelSupplyPusher(t),load=sampleEiffelSecondFloorSupply(t);const cargo={id:'cargo',solid:eiffelConvexBox({center:load.cargo,half:[.3,.9,.3],axes:[[1,0,0],[0,1,0],[0,0,1]]})};
   for(const p of s.parts){const body=eiffelConvexBox({center:p.center,half:[p.size[0]/2,p.size[1]/2,p.size[2]/2],axes:[[1,0,0],[0,1,0],[0,0,1]].map(v=>rotateRigidVector(p.quaternion,[v[0]!,v[1]!,v[2]!])) as [V,V,V]});for(const o of [...fixed,cargo]){const depth=eiffelConvexPenetration(body,o.solid);if(depth>2e-5)failures.push(`${t.toFixed(1)}:${p.id}:${o.id}:${depth}`);}}
  }
  expect(failures.slice(0,15)).toEqual([]);
 });
});
