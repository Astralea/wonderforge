import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {Mesh,Raycaster,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import type {EiffelKitManifest} from '../src/data/eiffelKitTypes';
import {eiffelConvexBox,eiffelConvexPenetration,eiffelConvexSolid,eiffelConvexTranslationSweep,type EiffelConvexSolid} from '../src/engine/eiffelConvex';
import {eiffelSolidBox} from '../src/engine/eiffelOccupancy';
import {rotateRigidVector,type RigidPose,type RigidVec3 as V} from '../src/engine/eiffelRigid';

type Prism={id:string;role:string;owner:string|null;vertices:V[]};
type Design={floorY:number;stage:number;attachments:{partId:string;faceCenter:V;localNormal:V;collarHeight:number}[];centralOpening:[number,number,number,number];deckOpening:[number,number,number,number];stairExclusion:[number,number,number,number];productionReady:boolean};
const folder='artifacts/eiffel-relay-platform-2026-09-08/';
const prisms=JSON.parse(readFileSync(folder+'platform-occupancy.json','utf8')) as Prism[];
const design=JSON.parse(readFileSync(folder+'platform-design.json','utf8')) as Design;
const manifest=JSON.parse(readFileSync('public/models/eiffel-construction-kit/tower-kit.manifest.json','utf8')) as EiffelKitManifest;
const faces=[[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]] as const;
const overlaps=(a:EiffelConvexSolid,b:EiffelConvexSolid)=>!a.min.some((v,k)=>v>b.max[k]!||a.max[k]!<b.min[k]!);
const pointPlaneDistance=(point:V,origin:V,normal:V)=>(point[0]-origin[0])*normal[0]+(point[1]-origin[1])*normal[1]+(point[2]-origin[2])*normal[2];
async function loadPlatform(){const bytes=readFileSync(folder+'model/platform.glb');const scene=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;scene.updateMatrixWorld(true);return scene;}

describe('Eiffel 197m relay platform geometry',()=>{
 it('has exact convex clearance from every completed kit envelope through stage 45, including owner columns',()=>{
  expect(prisms).toHaveLength(144);
  const platform=prisms.map(prism=>({prism,solid:eiffelConvexSolid(prism.vertices,faces)}));
  const kit=manifest.parts.filter(part=>part.stage<=45).map(part=>({part,solid:eiffelConvexBox(eiffelSolidBox(part,part.finalPose))}));
  const collisions:string[]=[];
  for(const item of platform)for(const target of kit){if(!overlaps(item.solid,target.solid))continue;const depth=eiffelConvexPenetration(item.solid,target.solid);if(depth>1e-5)collisions.push(`${item.prism.id}:${target.part.id}:${depth}`);}
  expect(collisions).toEqual([]);
 },30_000);

 it('places all four authored collar contact corners on each owner column inward-face plane',()=>{
  const parts=new Map(manifest.parts.map(part=>[part.id,part]));
  for(const attachment of design.attachments){
   const owner=parts.get(attachment.partId)!;expect(owner).toBeDefined();
   const normal=rotateRigidVector(owner.finalPose.quaternion,attachment.localNormal);
   const collarVertices=prisms.filter(p=>p.role==='collar'&&p.owner===attachment.partId).flatMap(p=>p.vertices);
   const contacts=collarVertices.filter(v=>Math.abs(pointPlaneDistance(v,attachment.faceCenter,normal))<=1e-7);
   const unique=[...new Map(contacts.map(v=>[v.map(x=>x.toFixed(7)).join(','),v])).values()];
   expect(unique,attachment.partId).toHaveLength(4);
   for(const corner of unique){
    expect(Math.abs(pointPlaneDistance(corner,attachment.faceCenter,normal)),`${attachment.partId}:${corner}`).toBeLessThanOrEqual(1e-7);
    const q=owner.finalPose.quaternion,delta=corner.map((v,k)=>v-owner.finalPose.position[k]!) as unknown as V;
    const local=rotateRigidVector([-q[0],-q[1],-q[2],q[3]],delta);
    expect(local[1]).toBeCloseTo(owner.localBounds.min[1],6);
    for(const axis of [0,2]){expect(local[axis]!).toBeGreaterThanOrEqual(owner.localBounds.min[axis]!-1e-6);expect(local[axis]!).toBeLessThanOrEqual(owner.localBounds.max[axis]!+1e-6);}
   }
  }
 });

 it('exports a 197m deck with actual 196.92m girder and joist bearing tops',async()=>{
  const scene=await loadPlatform();
  try{
   const meshes:Mesh[]=[];scene.traverse(o=>{if(o instanceof Mesh)meshes.push(o);});expect(new Set(meshes.map(mesh=>mesh.userData.wf_role))).toEqual(new Set(['relay-deck','relay-structure']));expect(meshes).toHaveLength(2);
   const ray=new Raycaster();
   const downward=(x:number,z:number,y:number)=>{ray.set(new Vector3(x,y,z),new Vector3(0,-1,0));return ray.intersectObjects(meshes,false)[0]?.point.y;};
   for(const [x,z] of [[0,-4.5],[-4.5,0],[0,4.5],[4.5,0]])expect(downward(x,z,198),`deck ${x},${z}`).toBeCloseTo(197,4);
   const structure=meshes.filter(m=>m.userData.wf_role==='relay-structure'),deck=meshes.filter(m=>m.userData.wf_role==='relay-deck');
   // Replay every authored joist and top flange against the frame mesh alone.
   for(const source of prisms.filter(p=>p.id.startsWith('joist-')||p.id.endsWith('-flange-1'))){
    const min=[0,1,2].map(k=>Math.min(...source.vertices.map(v=>v[k]!))),max=[0,1,2].map(k=>Math.max(...source.vertices.map(v=>v[k]!)));
    for(const fraction of [.1,.5,.9]){
     const axis=max[0]!-min[0]!>max[2]!-min[2]!?0:2,c=min.map((v,k)=>(v+max[k]!)/2);c[axis]=min[axis]!+fraction*(max[axis]!-min[axis]!);
     ray.set(new Vector3(c[0],197,c[2]),new Vector3(0,-1,0));
     expect(ray.intersectObjects(structure,false)[0]?.point.y,source.id).toBeCloseTo(196.92,4);
    }
   }
   // Exported collar inner faces must meet actual owner face patches.
   for(const attachment of design.attachments){
    const owner=manifest.parts.find(p=>p.id===attachment.partId)!,q=owner.finalPose.quaternion;
    const n=new Vector3(...rotateRigidVector(q,[0,-1,0])),x=new Vector3(...rotateRigidVector(q,[1,0,0])),z=new Vector3(...rotateRigidVector(q,[0,0,1]));
    for(const a of [-.1,.1])for(const b of [-.2,.2]){
     const p=new Vector3(...attachment.faceCenter).addScaledVector(x,a).addScaledVector(z,b);
     ray.set(p.clone().addScaledVector(n,-.02),n);const hit=ray.intersectObjects(structure,false)[0];
     expect(hit,attachment.partId).toBeDefined();expect(hit!.point.distanceTo(p),attachment.partId).toBeLessThan(3e-5);
    }
   }

   for(const [x,z] of [[4.8,4.5],[-4.8,4.5],[4.8,-4.5],[-4.8,-4.5],[4.5,3.1],[-4.5,-3.1],[6.15,0],[-6.15,0]]){
    ray.set(new Vector3(x,196.95,z),new Vector3(0,-1,0));const bearing=ray.intersectObjects(structure,false)[0]?.point.y;
    expect(bearing,`isolated frame top ${x},${z}`).toBeCloseTo(196.92,4);
    ray.set(new Vector3(x,196.9,z),new Vector3(0,1,0));const underside=ray.intersectObjects(deck,false)[0]?.point.y;
    expect(underside,`isolated deck bottom ${x},${z}`).toBeCloseTo(bearing!,4);
   }
  }finally{scene.traverse(o=>{if(o instanceof Mesh){o.geometry.dispose();const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(m=>m.dispose());}});}
 },30_000);

 it('keeps the declared central opening clear while recognizing the existing stair exclusion',()=>{
  const opening=eiffelConvexBox({center:[0,196.75,0],half:[2.99,.35,2.99],axes:[[1,0,0],[0,1,0],[0,0,1]]});
  const intrusions=prisms.filter(prism=>eiffelConvexPenetration(eiffelConvexSolid(prism.vertices,faces),opening)>1e-5).map(p=>p.id);
  expect(intrusions).toEqual([]);
  expect(design.stairExclusion).toEqual([-1.15,1.15,-.9,.9]);
  const stairIds=['shaft-10-m032-c000','shaft-10-m033-c000','shaft-10-m035-c000','shaft-10-m036-c000'];
  const stairBox=eiffelConvexBox({center:[0,197.25,0],half:[1.15,2.25,.9],axes:[[1,0,0],[0,1,0],[0,0,1]]});
  for(const id of stairIds){const part=manifest.parts.find(p=>p.id===id)!;expect(eiffelConvexPenetration(eiffelConvexBox(eiffelSolidBox(part,part.finalPose)),stairBox),id).toBeGreaterThan(0);}
 });
 it('preserves the existing 247 expanded shaft-envelope routes through this new platform',()=>{
  const shaft=JSON.parse(readFileSync('artifacts/eiffel-summit-rigging-2026-09-08/shaft-margin-0.04.json','utf8')) as {margin:number;results:{partId:string;route:{ground:RigidPose;high:RigidPose}}[]};
  const historicalManifest=JSON.parse(readFileSync('artifacts/eiffel-summit-revision-2026-09-08/before-kit/tower-kit.manifest.json','utf8')) as EiffelKitManifest;
  expect(shaft.results).toHaveLength(247);expect(shaft.margin).toBe(.04);
  const solid=prisms.map(p=>({id:p.id,shape:eiffelConvexSolid(p.vertices,faces)}));
  for(const route of shaft.results){
   const part=historicalManifest.parts.find(p=>p.id===route.partId)!;
   const expanded={localBounds:{min:part.localBounds.min.map(v=>v-.04) as unknown as V,max:part.localBounds.max.map(v=>v+.04) as unknown as V}};
   const delta=route.route.high.position.map((v,k)=>v-route.route.ground.position[k]!) as unknown as V;
   const swept=eiffelConvexTranslationSweep(eiffelConvexBox(eiffelSolidBox(expanded,route.route.ground)),delta);
   for(const item of solid)expect(eiffelConvexPenetration(swept,item.shape),`${route.partId}:${item.id}`).toBeLessThanOrEqual(1e-5);
  }
 });

});
