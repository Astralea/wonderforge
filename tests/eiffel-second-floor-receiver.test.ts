import {readFileSync} from 'node:fs';
import {Box3,Mesh,Object3D,Raycaster,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {describe,expect,it} from 'vitest';
import type {EiffelKitManifest} from '../src/data/eiffelKitTypes';
import {eiffelConvexBox,eiffelConvexPenetration,eiffelConvexSolid,eiffelConvexTranslationSweep,type EiffelConvexSolid} from '../src/engine/eiffelConvex';
import {eiffelSolidBox} from '../src/engine/eiffelOccupancy';
import {rotateRigidVector,type RigidVec3 as V} from '../src/engine/eiffelRigid';
import {sampleEiffelTwoFloorSupply} from '../src/engine/eiffelTwoFloorSupply';

type Prism={id:string;vertices:V[]};
const folder='artifacts/eiffel-second-floor-receiver-2026-09-08/';
const design=JSON.parse(readFileSync(folder+'design.json','utf8')) as {frame:Prism[];worldFloorY:number;cart:V;productionReady:boolean};
const firstBridge=JSON.parse(readFileSync('artifacts/eiffel-first-floor-transfer-2026-09-08/bridge-design.json','utf8')) as {shapes:Prism[]};
const secondBridge=JSON.parse(readFileSync('artifacts/eiffel-second-floor-supply-2026-09-08/bridge-design.json','utf8')) as {shapes:Prism[]};
const manifest=JSON.parse(readFileSync('public/models/eiffel-construction-kit/tower-kit.manifest.json','utf8')) as EiffelKitManifest;
const faces=[[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]] as const;
const solids=(items:Prism[])=>items.map(prism=>({id:prism.id,solid:eiffelConvexSolid(prism.vertices,faces)}));
const frame=solids(design.frame),bridges=[...solids(firstBridge.shapes).map(x=>({...x,id:`first:${x.id}`})),...solids(secondBridge.shapes).map(x=>({...x,id:`second:${x.id}`}))];
const kit=manifest.parts.filter(part=>part.stage<=45).map(part=>({id:part.id,solid:eiffelConvexBox(eiffelSolidBox(part,part.finalPose))}));
const overlaps=(a:EiffelConvexSolid,b:EiffelConvexSolid)=>!a.min.some((v,k)=>v>b.max[k]!||a.max[k]!<b.min[k]!);
const hits=(moving:EiffelConvexSolid,obstacles:{id:string;solid:EiffelConvexSolid}[])=>obstacles.flatMap(obstacle=>{if(!overlaps(moving,obstacle.solid))return[];const depth=eiffelConvexPenetration(moving,obstacle.solid);return depth>1e-6?[`${obstacle.id}:${depth}`]:[];});
const crate=(center:V)=>eiffelConvexBox({center,half:[.3,.9,.3],axes:[[1,0,0],[0,1,0],[0,0,1]]});
const sweep=(a:V,b:V)=>eiffelConvexTranslationSweep(crate(a),[b[0]-a[0],b[1]-a[1],b[2]-a[2]]);
const load=async(path:string)=>{const bytes=readFileSync(path);return(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;};
const dispose=(root:Object3D)=>root.traverse(o=>{if(o instanceof Mesh)o.geometry.dispose();});
const aabbSolid=(bounds:Box3)=>{const c=bounds.getCenter(new Vector3()),h=bounds.getSize(new Vector3()).multiplyScalar(.5);return eiffelConvexBox({center:[c.x,c.y,c.z],half:[h.x,h.y,h.z],axes:[[1,0,0],[0,1,0],[0,0,1]]});};

describe('Eiffel second-floor receiving frame',()=>{
 it('keeps all 21 source frame prisms clear of stage-45 tower and both transfer bridges',()=>{
  expect(design.productionReady).toBe(false);expect(design.frame).toHaveLength(21);const failures=frame.flatMap(member=>hits(member.solid,[...kit,...bridges]).map(hit=>`${member.id}:${hit}`));expect(failures).toEqual([]);
 },30_000);

 it('clears the entire crate relay from first-floor pickup to the second-floor cart',()=>{
  const points:V[]=[[-8.5,59.18000244140625,-4],[-8.5,118.7,-4],[-10.25,118.7,-4],[-10.25,117.38,-4]],obstacles=[...kit,...bridges,...frame],failures:string[]=[];
  for(let i=1;i<points.length;i++)for(const hit of hits(sweep(points[i-1]!,points[i]!),obstacles))failures.push(`${i-1}->${i}:${hit}`);expect(failures).toEqual([]);
 },30_000);

 it('puts the received crate bottom on this receiver export’s own cart bed',async()=>{
  const asset=await load(folder+'model/second-floor-receiver.glb');try{let root:Object3D|undefined,bed:Mesh|undefined;asset.traverse(o=>{if(o.userData.wf_role==='second-floor-cart')root=o;if(o instanceof Mesh&&o.name.replace(/\d+$/,'')==='cart-bed')bed=o;});expect(root).toBeDefined();expect(bed).toBeDefined();asset.updateMatrixWorld(true);const bounds=new Box3().setFromObject(bed!);expect(bounds.max.y).toBeCloseTo(117.38-.9,5);expect(bounds.min.x).toBeLessThan(-10.25);expect(bounds.max.x).toBeGreaterThan(-10.25);
  }finally{dispose(asset);}
 },30_000);

 it('seats every exported skid bottom corner on actual stage-34 floor triangles',async()=>{
  const [tower,receiver]=await Promise.all([load('public/models/eiffel-construction-kit/tower-kit.glb'),load(folder+'model/second-floor-receiver.glb')]);
  try{const stages=new Map(manifest.parts.map(part=>[part.id,part.stage])),supports:Mesh[]=[],skids:Mesh[]=[];tower.updateMatrixWorld(true);tower.traverse(o=>{if(o instanceof Mesh&&(stages.get(String(o.userData.wf_part))??99)<=34)supports.push(o);});receiver.updateMatrixWorld(true);receiver.traverse(o=>{if(o instanceof Mesh&&String(o.userData.wf_source_id).startsWith('skid-'))skids.push(o);});expect(skids).toHaveLength(2);const ray=new Raycaster(),failures:string[]=[];
   for(const skid of skids){const b=new Box3().setFromObject(skid),corners=[[b.min.x,b.min.y,b.min.z],[b.min.x,b.min.y,b.max.z],[b.max.x,b.min.y,b.min.z],[b.max.x,b.min.y,b.max.z]] as V[];for(const [i,p]of corners.entries()){ray.set(new Vector3(p[0],p[1]+.2,p[2]),new Vector3(0,-1,0));const hit=ray.intersectObjects(supports,false).find(h=>h.point.y<=p[1]+1e-5);if(!hit||Math.abs(hit.point.y-p[1])>2e-5)failures.push(`${skid.name}:${i}:${hit?.point.y??'miss'}`);}}expect(failures).toEqual([]);
  }finally{dispose(tower);dispose(receiver);}
 },30_000);

 it('grounds all four actual cart wheels and keeps the waiting worker outside cart and rig meshes',async()=>{
  const [tower,receiver]=await Promise.all([load('public/models/eiffel-construction-kit/tower-kit.glb'),load(folder+'model/second-floor-receiver.glb')]);try{const stages=new Map(manifest.parts.map(part=>[part.id,part.stage])),floors:Mesh[]=[],wheels:Mesh[]=[],cartMeshes:Mesh[]=[],rigMeshes:Mesh[]=[];tower.updateMatrixWorld(true);tower.traverse(o=>{if(o instanceof Mesh&&(stages.get(String(o.userData.wf_part))??99)<=34)floors.push(o);});receiver.updateMatrixWorld(true);receiver.traverse(o=>{if(o.userData.wf_role==='second-floor-cart')o.traverse(c=>{if(c instanceof Mesh){cartMeshes.push(c);if(c.userData.wf_role==='cart-wheel')wheels.push(c);}});if(['frame','drum','sheave','trolley'].includes(String(o.userData.wf_role)))o.traverse(c=>{if(c instanceof Mesh)rigMeshes.push(c);});});expect(wheels).toHaveLength(4);const ray=new Raycaster(),groundFailures:string[]=[];for(const wheel of wheels){const b=new Box3().setFromObject(wheel),x=(b.min.x+b.max.x)/2,z=(b.min.z+b.max.z)/2;ray.set(new Vector3(x,b.min.y+.1,z),new Vector3(0,-1,0));const hit=ray.intersectObjects(floors,false).find(h=>h.point.y<=b.min.y+1e-5);if(!hit||Math.abs(hit.point.y-b.min.y)>2e-5)groundFailures.push(`${wheel.name}:${hit?.point.y??'miss'}:${b.min.y}`);}expect(groundFailures).toEqual([]);
   const obstacles=[...new Set([...cartMeshes,...rigMeshes])].map(mesh=>({id:mesh.name,solid:aabbSolid(new Box3().setFromObject(mesh))})),worker=sampleEiffelTwoFloorSupply(290).secondWorker,clearanceFailures:string[]=[];for(const part of worker.parts){const body=eiffelConvexBox({center:part.center,half:[part.size[0]/2,part.size[1]/2,part.size[2]/2],axes:[rotateRigidVector(part.quaternion,[1,0,0]),rotateRigidVector(part.quaternion,[0,1,0]),rotateRigidVector(part.quaternion,[0,0,1])]});for(const hit of hits(body,obstacles))clearanceFailures.push(`${part.id}:${hit}`);}expect(clearanceFailures).toEqual([]);
  }finally{dispose(tower);dispose(receiver);}
 },30_000);

 it('sweeps every actual trolley mesh west with only named rolling contact on its rail',async()=>{
  const receiver=await load(folder+'model/second-floor-receiver.glb');try{receiver.updateMatrixWorld(true);const trolley:Mesh[]=[];receiver.traverse(o=>{if(o.userData.wf_role==='trolley')o.traverse(c=>{if(c instanceof Mesh)trolley.push(c);});});expect(trolley.length).toBeGreaterThan(0);const fixed=[...kit,...bridges,...frame],failures:string[]=[],contacts:string[]=[];
   for(const mesh of trolley){const b=new Box3().setFromObject(mesh),min=b.min.clone();min.x-=1.75;const swept=aabbSolid(new Box3(min,b.max));for(const obstacle of fixed){if(!overlaps(swept,obstacle.solid))continue;const depth=eiffelConvexPenetration(swept,obstacle.solid),rolling=mesh.name.startsWith('trolley-wheel')&&obstacle.id.startsWith('trolley-rail-');if(rolling){if(depth>2e-5)failures.push(`${mesh.name}:${obstacle.id}:${depth}`);if(depth>1e-6)contacts.push(`${mesh.name}:${obstacle.id}`);}else if(depth>1e-6)failures.push(`${mesh.name}:${obstacle.id}:${depth}`);}
    if(mesh.name.startsWith('trolley-wheel')){const centerZ=(b.min.z+b.max.z)/2,rail=frame.filter(item=>item.id.startsWith('trolley-rail-')).sort((a,c)=>Math.abs((a.solid.min[2]+a.solid.max[2])/2-centerZ)-Math.abs((c.solid.min[2]+c.solid.max[2])/2-centerZ))[0]!;expect(Math.abs(b.min.y-rail.solid.max[1]),mesh.name).toBeLessThan(2e-5);}}
   expect(contacts).toHaveLength(4);expect(failures).toEqual([]);
  }finally{dispose(receiver);}
 },30_000);
});
