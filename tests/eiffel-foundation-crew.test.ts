import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { InstancedMesh, Matrix4, Vector3 } from 'three';
import { EiffelProductionWorks } from '../src/render/three/EiffelProductionWorks';
import type { EiffelKitManifest } from '../src/data/eiffelKitTypes';
import { createEiffelFoundationRouter, eiffelFoundationFootprints, eiffelFoundationCarrierSize, sampleEiffelFoundationRoute, eiffelFoundationRouteMotion } from '../src/engine/eiffelFoundationRoute';
import { sampleEiffelFoundationCrew } from '../src/engine/eiffelFoundationCrew';
import { eiffelTerrainHeightAt } from '../src/engine/eiffelTerrain';
const parts=(JSON.parse(readFileSync('public/models/eiffel-construction-kit/tower-kit.manifest.json','utf8')) as EiffelKitManifest).parts;
const foundations=parts.filter(p=>p.group==='foundation').sort((a,b)=>a.stage-b.stage||a.boundsMin[1]-b.boundsMin[1]||a.id.localeCompare(b.id));
const routeFor=createEiffelFoundationRouter(parts), obstacles=eiffelFoundationFootprints(parts);
const entries=foundations.map((part,index)=>{const x=82+(index%2)*4,z=72+(index%4)*3,r=Math.hypot(part.center[0],part.center[2]),sx=part.center[0]+part.center[0]/r*7,sz=part.center[2]+part.center[2]/r*7;const pose=(x:number,z:number)=>({position:[x,eiffelTerrainHeightAt(x,z)+.6-part.localBounds.min[1],z] as const,quaternion:[0,0,0,1] as const});return {part,route:routeFor(part,pose(x,z),pose(sx,sz))}});
function overlaps(x:number,z:number,hx:number,hz:number,yaw:number,o:typeof obstacles[number]) {const c=Math.cos(yaw),s=Math.sin(yaw),cx=(o.min[0]+o.max[0])/2,cz=(o.min[1]+o.max[1])/2,ox=(o.max[0]-o.min[0])/2,oz=(o.max[1]-o.min[1])/2,dx=x-cx,dz=z-cz;return Math.abs(dx)<ox+Math.abs(c)*hx+Math.abs(s)*hz&&Math.abs(dz)<oz+Math.abs(s)*hx+Math.abs(c)*hz&&Math.abs(c*dx+s*dz)<hx+Math.abs(c)*ox+Math.abs(s)*oz&&Math.abs(-s*dx+c*dz)<hz+Math.abs(s)*ox+Math.abs(c)*oz;}
describe('foundation crew steering and gait',()=>{
 it('grounds stance feet and steers the whole team around every bearing',()=>{let hits=0,first='';for(const {part,route} of entries){const count=Math.ceil(route.length/.1);for(let i=0;i<=count;i++){const t=i/count,pose=sampleEiffelFoundationRoute(route,t,part),steering={...eiffelFoundationRouteMotion(route,t),walking:t<1},size=eiffelFoundationCarrierSize(part),center=[pose.position[0],pose.position[1]+part.localBounds.min[1]-.12,pose.position[2]] as const;const team=sampleEiffelFoundationCrew({center,size,steering});for(const person of team.crew){for(const foot of person.feet){if(Math.abs(foot.center[1]-.06-foot.lift-eiffelTerrainHeightAt(foot.center[0],foot.center[2]))>1e-8)throw Error('foot contact');}
for(const o of obstacles){if(Math.max(o.min[0]-center[0],center[0]-o.max[0],o.min[1]-center[2],center[2]-o.max[1])>4)continue;const boxes=[{p:person.torso,hx:.21,hz:.125},{p:person.head,hx:.145,hz:.14},...person.feet.map(f=>({p:f.center,hx:.15,hz:.09}))];const beams=[...person.arms.map(a=>({a:a.shoulder,b:a.hand,r:.06})),...person.feet.map(f=>({a:f.hip,b:f.center,r:.075})),{a:team.handle[0],b:team.handle[1],r:.055},{a:team.bar[0],b:team.bar[1],r:.04}]; for(const beam of beams){const dx=beam.b[0]-beam.a[0],dz=beam.b[2]-beam.a[2];if(overlaps((beam.a[0]+beam.b[0])/2,(beam.a[2]+beam.b[2])/2,Math.hypot(dx,dz)/2+beam.r,beam.r,Math.atan2(dz,dx),o)){hits++;first ||= `beam ${part.id}@${t} vs ${o.id}`;}} for(const box of boxes)if(overlaps(box.p[0],box.p[2],box.hx,box.hz,steering.yaw,o)){hits++;first ||= `${part.id}@${t} vs ${o.id}`;}}}}}expect(hits,first).toBe(0);},15_000);
 it('renders grounded wheel bottoms, articulated feet and a turning support beneath fixed cargo',()=>{
   const works = new EiffelProductionWorks();
   try {
     const {part,route}=entries.find(e=>e.route.points.length>3)!;
     for(const t of [.03,.17,.42,.69,.91,1]) {
       const pose=sampleEiffelFoundationRoute(route,t,part), steering={...eiffelFoundationRouteMotion(route,t),walking:t<1};
       const center=[pose.position[0],pose.position[1]+part.localBounds.min[1]-.12,pose.position[2]] as const;
       const carrier={center,size:eiffelFoundationCarrierSize(part),supportY:eiffelTerrainHeightAt(center[0],center[2]),motive:true,steering};
       works.update([{phase:t<1?'haul':'staged',pose,carrier,crane:null,bracket:null,receiver:null}]);
       const mesh=(name:string)=>works.group.getObjectByName(name) as InstancedMesh;
       const wheels=mesh('eiffel-carrier-wheels'), feet=mesh('eiffel-carrier-crew-feet');
       expect(wheels.count).toBe(4);expect(feet.count).toBe(4);
       const matrix=new Matrix4(), vertex=new Vector3(), origin=new Vector3();
       for(let i=0;i<wheels.count;i++) {
         wheels.getMatrixAt(i,matrix);origin.setFromMatrixPosition(matrix);
         let bottom=Infinity;const pos=wheels.geometry.getAttribute('position');
         for(let j=0;j<pos.count;j++) {vertex.fromBufferAttribute(pos,j).applyMatrix4(matrix);bottom=Math.min(bottom,vertex.y);}
         expect(bottom-eiffelTerrainHeightAt(origin.x,origin.z)).toBeGreaterThanOrEqual(-1e-5);
         expect(bottom-eiffelTerrainHeightAt(origin.x,origin.z)).toBeLessThan(.007);
       }
       const expected=sampleEiffelFoundationCrew({center,size:carrier.size,steering}).crew.flatMap(p=>p.feet);
       for(let i=0;i<feet.count;i++) {feet.getMatrixAt(i,matrix);origin.setFromMatrixPosition(matrix);expect(origin.y-.06-eiffelTerrainHeightAt(origin.x,origin.z)).toBeCloseTo(expected[i]!.lift,5);}
       const deck=mesh('eiffel-ground-and-freight-carriers');deck.getMatrixAt(0,matrix);
       const inverse=matrix.clone().invert();
       for(const x of [part.localBounds.min[0],part.localBounds.max[0]])for(const z of [part.localBounds.min[2],part.localBounds.max[2]]) {
         vertex.set(pose.position[0]+x,pose.position[1]+part.localBounds.min[1],pose.position[2]+z).applyMatrix4(inverse);
         expect(Math.abs(vertex.x)).toBeLessThan(.5);expect(Math.abs(vertex.z)).toBeLessThan(.5);expect(vertex.y).toBeCloseTo(.5,5);
       }
     }
   }finally{works.dispose();expect(works.group.children).toHaveLength(0);}
 });

});
