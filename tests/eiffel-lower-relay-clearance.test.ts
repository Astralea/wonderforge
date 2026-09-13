import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import type {EiffelKitManifest} from '../src/data/eiffelKitTypes';
import {eiffelConvexBox,eiffelConvexPenetration,eiffelConvexSolid,eiffelConvexTranslationSweep} from '../src/engine/eiffelConvex';
import {eiffelSolidBox} from '../src/engine/eiffelOccupancy';
import type {RigidVec3 as V} from '../src/engine/eiffelRigid';

const manifest=JSON.parse(readFileSync('public/models/eiffel-construction-kit/tower-kit.manifest.json','utf8')) as EiffelKitManifest;
const bridge=JSON.parse(readFileSync('artifacts/eiffel-second-floor-supply-2026-09-08/bridge-design.json','utf8')) as {shapes:{id:string;vertices:V[]}[]};
const faces=[[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]];
const obstacles=[...manifest.parts.filter(p=>p.stage<=45).map(p=>({id:p.id,solid:eiffelConvexBox(eiffelSolidBox(p,p.finalPose))})),...bridge.shapes.map(p=>({id:`bridge:${p.id}`,solid:eiffelConvexSolid(p.vertices,faces)}))];
function hits(a:V,b:V){
 const swept=eiffelConvexTranslationSweep(eiffelConvexBox({center:a,half:[.3,.9,.3],axes:[[1,0,0],[0,1,0],[0,0,1]]}),[b[0]-a[0],b[1]-a[1],b[2]-a[2]]);
 return obstacles.filter(o=>eiffelConvexPenetration(swept,o.solid)>1e-6).map(o=>o.id);
}
// Crate-only geometric preflight. No operator, rig or historical relay admission.
describe('lower relay route must account for the current bridge',()=>{
 it('rejects the obsolete central ground lane because the new bridge closes it',()=>{
  const blockers=hits([0,.9,-1.8],[0,117.38,-1.8]);
  expect(blockers.some(id=>id.startsWith('bridge:plank-'))).toBe(true);
  expect(blockers.some(id=>id.startsWith('bridge:cross-joist-'))).toBe(true);
 });
 it('preserves a crate-clear side shaft and dogleg to the existing stock cart',()=>{
  const points:V[]=[[-8.5,.9,-4],[-8.5,118,-4],[-15,118,-4],[-15,118,-1.8],[-15,117.38,-1.8]];
  for(let i=1;i<points.length;i++)expect(hits(points[i-1]!,points[i]!),`leg ${i}`).toEqual([]);
 });
});
