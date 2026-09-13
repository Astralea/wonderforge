import {readFileSync} from 'node:fs';
import {Box3,Mesh,Object3D,Raycaster,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {describe,expect,it} from 'vitest';
import type {EiffelKitManifest} from '../src/data/eiffelKitTypes';
import {eiffelConvexBox,eiffelConvexPenetration,eiffelConvexSolid,eiffelConvexTranslationSweep,type EiffelConvexSolid} from '../src/engine/eiffelConvex';
import {eiffelSolidBox} from '../src/engine/eiffelOccupancy';
import type {RigidVec3 as V} from '../src/engine/eiffelRigid';

type Prism={id:string;vertices:V[]};
type Design={productionReady:boolean;frame:Prism[];canonicalFrame:Prism[];worldFloorY:number;transform:{translation:V;rotationY:number}};
const design=JSON.parse(readFileSync('artifacts/eiffel-first-floor-winch-2026-09-08/design.json','utf8')) as Design;
const manifest=JSON.parse(readFileSync('public/models/eiffel-construction-kit/tower-kit.manifest.json','utf8')) as EiffelKitManifest;
const faces=[[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]] as const;
const frame=design.frame.map(prism=>({id:prism.id,solid:eiffelConvexSolid(prism.vertices,faces)}));
const kit=(stage:number)=>manifest.parts.filter(part=>part.stage<=stage).map(part=>({id:part.id,solid:eiffelConvexBox(eiffelSolidBox(part,part.finalPose))}));
const overlaps=(a:EiffelConvexSolid,b:EiffelConvexSolid)=>!a.min.some((v,k)=>v>b.max[k]!||a.max[k]!<b.min[k]!);
const collisions=(moving:EiffelConvexSolid,obstacles:{id:string;solid:EiffelConvexSolid}[])=>obstacles.flatMap(obstacle=>{if(!overlaps(moving,obstacle.solid))return[];const depth=eiffelConvexPenetration(moving,obstacle.solid);return depth>1e-6?[`${obstacle.id}:${depth}`]:[];});
const crate=(center:V)=>eiffelConvexBox({center,half:[.3,.9,.3],axes:[[1,0,0],[0,1,0],[0,0,1]]});
const sweep=(start:V,end:V)=>eiffelConvexTranslationSweep(crate(start),[end[0]-start[0],end[1]-start[1],end[2]-start[2]]);
const dispose=(root:Object3D)=>root.traverse(o=>{if(o instanceof Mesh)o.geometry.dispose();});

describe('Eiffel first-floor relay winch geometry',()=>{
 it('keeps every transformed frame prism clear of the completed stage-45 tower',()=>{
  expect(design.productionReady).toBe(false);expect(design.frame).toHaveLength(22);expect(design.canonicalFrame).toHaveLength(22);
  const failures=frame.flatMap(member=>collisions(member.solid,kit(45)).map(hit=>`${member.id}:${hit}`));
  expect(failures).toEqual([]);
 },30_000);

 it('seats the exported skid meshes on actual first-floor tower triangles',async()=>{
  const towerBytes=readFileSync('public/models/eiffel-construction-kit/tower-kit.glb'),rigBytes=readFileSync('artifacts/eiffel-first-floor-winch-2026-09-08/model/first-floor-winch.glb');
  const [scene,rig]=await Promise.all([new GLTFLoader().parseAsync(towerBytes.buffer.slice(towerBytes.byteOffset,towerBytes.byteOffset+towerBytes.byteLength),''),new GLTFLoader().parseAsync(rigBytes.buffer.slice(rigBytes.byteOffset,rigBytes.byteOffset+rigBytes.byteLength),'')]).then(items=>items.map(item=>item.scene));
  try{
   const stages=new Map(manifest.parts.map(part=>[part.id,part.stage])),supports:Mesh[]=[];scene.updateMatrixWorld(true);
   scene.traverse(o=>{if(o instanceof Mesh&&(stages.get(String(o.userData.wf_part))??99)<=23)supports.push(o);});
   rig.updateMatrixWorld(true);const skids:Mesh[]=[];rig.traverse(o=>{if(o instanceof Mesh&&String(o.userData.wf_source_id).startsWith('skid-'))skids.push(o);});expect(skids).toHaveLength(2);
   const ray=new Raycaster(),failures:string[]=[];
   for(const skid of skids){const bounds=new Box3().setFromObject(skid),bottom=bounds.min.y,corners=[[bounds.min.x,bottom,bounds.min.z],[bounds.min.x,bottom,bounds.max.z],[bounds.max.x,bottom,bounds.min.z],[bounds.max.x,bottom,bounds.max.z]] as V[];
    for(const [index,corner]of corners.entries()){ray.set(new Vector3(corner[0],bottom+.2,corner[2]),new Vector3(0,-1,0));const hit=ray.intersectObjects(supports,false).find(candidate=>candidate.point.y<=bottom+1e-5);if(!hit||Math.abs(hit.point.y-bottom)>2e-5)failures.push(`${skid.name}:${index}:${hit?.point.y??'miss'}`);}}
   expect(failures).toEqual([]);
  }finally{dispose(scene);dispose(rig);}
 },30_000);

 it('sweeps every exported trolley mesh through its transformed travel without entering frame or tower',async()=>{
  const bytes=readFileSync('artifacts/eiffel-first-floor-winch-2026-09-08/model/first-floor-winch.glb'),rig=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;
  try{rig.updateMatrixWorld(true);const trolley:Mesh[]=[];rig.traverse(o=>{if(o.userData.wf_role==='trolley')o.traverse(child=>{if(child instanceof Mesh)trolley.push(child);});});expect(trolley.length).toBeGreaterThan(0);
   const failures:string[]=[],rollingDepths:number[]=[];for(const mesh of trolley){const bounds=new Box3().setFromObject(mesh),min=bounds.min.clone();min.x-=1.8;const max=bounds.max,center=min.clone().add(max).multiplyScalar(.5),half=max.clone().sub(min).multiplyScalar(.5),moving=eiffelConvexBox({center:[center.x,center.y,center.z],half:[half.x,half.y,half.z],axes:[[1,0,0],[0,1,0],[0,0,1]]});for(const obstacle of [...frame,...kit(45)]){if(!overlaps(moving,obstacle.solid))continue;const depth=eiffelConvexPenetration(moving,obstacle.solid),rolling=mesh.name.startsWith('trolley-wheel')&&obstacle.id.startsWith('trolley-rail-');if(rolling){if(depth>2e-5)failures.push(`${mesh.name}:${obstacle.id}:${depth}`);if(depth>1e-6)rollingDepths.push(depth);}else if(depth>1e-6)failures.push(`${mesh.name}:${obstacle.id}:${depth}`);}
    if(mesh.name.startsWith('trolley-wheel')){const rail=frame.filter(item=>item.id.startsWith('trolley-rail-')).sort((a,b)=>Math.abs((a.solid.min[2]+a.solid.max[2])/2-center.z)-Math.abs((b.solid.min[2]+b.solid.max[2])/2-center.z))[0]!;expect(Math.abs(bounds.min.y-rail.solid.max[1]),mesh.name).toBeLessThan(2e-5);}}
   expect(trolley.filter(mesh=>mesh.name.startsWith('trolley-wheel'))).toHaveLength(4);for(const depth of rollingDepths)expect(depth).toBeLessThan(2e-5);expect(failures).toEqual([]);
  }finally{dispose(rig);}
 },30_000);

 it('clears the whole crate from ground through the completed stage-45 tower to the first-floor landing',()=>{
  const legs:[string,V,V][]=[
   ['ground-hoist',[-19.75,.9,-4],[-19.75,60.5,-4]],
   ['trolley-transfer',[-19.75,60.5,-4],[-21.5,60.5,-4]],
   ['landing-lower',[-21.5,60.5,-4],[-21.5,58.84000244140625,-4]],
  ];
  const obstacles=[...frame,...kit(45)],failures=legs.flatMap(([name,start,end])=>collisions(sweep(start,end),obstacles).map(hit=>`${name}:${hit}`));
  expect(failures).toEqual([]);
 },30_000);
});
