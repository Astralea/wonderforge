import {readFileSync} from 'node:fs';
import {Box3,Mesh,Object3D,Raycaster,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {describe,expect,it} from 'vitest';
import type {EiffelKitManifest} from '../src/data/eiffelKitTypes';
import {eiffelConvexBox,eiffelConvexPenetration,eiffelConvexSolid,eiffelConvexTranslationSweep,type EiffelConvexSolid} from '../src/engine/eiffelConvex';
import {eiffelSolidBox} from '../src/engine/eiffelOccupancy';
import {rotateRigidVector,type RigidVec3 as V} from '../src/engine/eiffelRigid';
import {sampleEiffelFirstFloorTransfer} from '../src/engine/eiffelFirstFloorTransfer';

type Prism={id:string;role:string;vertices:V[];hatch?:boolean};
const bridge=JSON.parse(readFileSync('artifacts/eiffel-first-floor-transfer-2026-09-08/bridge-design.json','utf8')) as {floorY:number;shapes:Prism[];hatchPivot:V;productionReady:boolean};
const winch=JSON.parse(readFileSync('artifacts/eiffel-first-floor-transfer-2026-09-08/design.json','utf8')) as {frame:Prism[];productionReady:boolean};
const manifest=JSON.parse(readFileSync('public/models/eiffel-construction-kit/tower-kit.manifest.json','utf8')) as EiffelKitManifest;
const faces=[[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]] as const;
const solids=(items:Prism[])=>items.map(prism=>({id:prism.id,prism,solid:eiffelConvexSolid(prism.vertices,faces)}));
const bridgeSolids=solids(bridge.shapes),frameSolids=solids(winch.frame);
const kit=manifest.parts.filter(part=>part.stage<=45).map(part=>({id:part.id,solid:eiffelConvexBox(eiffelSolidBox(part,part.finalPose))}));
const overlaps=(a:EiffelConvexSolid,b:EiffelConvexSolid)=>!a.min.some((v,k)=>v>b.max[k]!||a.max[k]!<b.min[k]!);
const hits=(moving:EiffelConvexSolid,obstacles:{id:string;solid:EiffelConvexSolid}[])=>obstacles.flatMap(obstacle=>{if(!overlaps(moving,obstacle.solid))return[];const depth=eiffelConvexPenetration(moving,obstacle.solid);return depth>1e-6?[`${obstacle.id}:${depth}`]:[];});
const crate=(center:V)=>eiffelConvexBox({center,half:[.3,.9,.3],axes:[[1,0,0],[0,1,0],[0,0,1]]});
const sweep=(start:V,end:V)=>eiffelConvexTranslationSweep(crate(start),[end[0]-start[0],end[1]-start[1],end[2]-start[2]]);
const rotateHatch=(prism:Prism,angle:number)=>{const [,py,pz]=bridge.hatchPivot,c=Math.cos(angle),s=Math.sin(angle);return eiffelConvexSolid(prism.vertices.map(([x,y,z])=>[x,py+(y-py)*c-(z-pz)*s,pz+(y-py)*s+(z-pz)*c] as V),faces);};
const dispose=(root:Object3D)=>root.traverse(o=>{if(o instanceof Mesh)o.geometry.dispose();});
const aabbSolid=(bounds:{min:Vector3;max:Vector3})=>{const center=bounds.min.clone().add(bounds.max).multiplyScalar(.5),half=bounds.max.clone().sub(bounds.min).multiplyScalar(.5);return eiffelConvexBox({center:[center.x,center.y,center.z],half:[half.x,half.y,half.z],axes:[[1,0,0],[0,1,0],[0,0,1]]});};

describe('Eiffel first-floor relay transfer geometry',()=>{
 it('keeps the 449-prism bridge and variant winch mutually clear and outside the stage-45 tower',()=>{
  expect(bridge.productionReady).toBe(false);expect(winch.productionReady).toBe(false);expect(bridge.shapes).toHaveLength(449);expect(winch.frame).toHaveLength(21);
  const failures=[...bridgeSolids.flatMap(item=>hits(item.solid,kit).map(hit=>`bridge:${item.id}:${hit}`)),...frameSolids.flatMap(item=>hits(item.solid,kit).map(hit=>`frame:${item.id}:${hit}`)),...frameSolids.flatMap(item=>hits(item.solid,bridgeSolids).map(hit=>`mutual:${item.id}:${hit}`))];
  expect(failures).toEqual([]);
 },30_000);

 it('keeps the complete crate clear through the open hatch and first-floor landing',()=>{
  const fixedBridge=bridgeSolids.filter(item=>!item.prism.hatch),openHatch=bridge.shapes.filter(item=>item.hatch).map(item=>({id:item.id,solid:rotateHatch(item,Math.PI/2)}));
  const legs:[V,V][]=[[[-19.75,.9,-4],[-19.75,60.5,-4]],[[-19.75,60.5,-4],[-21.5,60.5,-4]],[[-21.5,60.5,-4],[-21.5,58.84000244140625,-4]]];
  const failures=legs.flatMap(([a,b],index)=>hits(sweep(a,b),[...kit,...frameSolids,...fixedBridge,...openHatch]).map(hit=>`${index}:${hit}`));expect(failures).toEqual([]);
 },30_000);

 it('supports every cart wheel contact from the landing to the second-hoist lane',async()=>{
  const bytes=readFileSync('public/models/eiffel-construction-kit/tower-kit.glb'),tower=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;
  try{const stages=new Map(manifest.parts.map(part=>[part.id,part.stage])),floorMeshes:Mesh[]=[];tower.updateMatrixWorld(true);tower.traverse(o=>{if(o instanceof Mesh&&(stages.get(String(o.userData.wf_part))??99)<=23)floorMeshes.push(o);});
   const deck=bridge.shapes.filter(prism=>prism.role==='timber'&&Math.abs(Math.max(...prism.vertices.map(v=>v[1]))-bridge.floorY)<1e-8),ray=new Raycaster(),misses:string[]=[];
   for(let x=-21.5;x<=-8.5+1e-9;x+=.1)for(const dx of[-.25,.25])for(const dz of[-.38,.38]){const wx=x+dx,wz=-4+dz,onBridge=deck.some(prism=>wx>=Math.min(...prism.vertices.map(v=>v[0]))-1e-8&&wx<=Math.max(...prism.vertices.map(v=>v[0]))+1e-8&&wz>=Math.min(...prism.vertices.map(v=>v[2]))-1e-8&&wz<=Math.max(...prism.vertices.map(v=>v[2]))+1e-8);if(onBridge)continue;ray.set(new Vector3(wx,bridge.floorY+.2,wz),new Vector3(0,-1,0));const hit=ray.intersectObjects(floorMeshes,false).find(candidate=>Math.abs(candidate.point.y-bridge.floorY)<2e-5);if(!hit)misses.push(`${x.toFixed(2)}:${wx},${wz}`);}
   expect(misses).toEqual([]);
  }finally{dispose(tower);}
 },30_000);

 it('closes every hatch plank continuously at 122..126 after the crate clears the opening',()=>{
  const hatch=bridge.shapes.filter(prism=>prism.hatch);expect(hatch).toHaveLength(5);const parked=crate([-21.5,58.84000244140625,-4]),failures:string[]=[];
  for(let step=0;step<=80;step++){const seconds=122+step/20,angle=Math.PI/2*(1-(seconds-122)/4);for(const plank of hatch){const depth=eiffelConvexPenetration(rotateHatch(plank,angle),parked);if(depth>1e-6)failures.push(`${seconds}:${plank.id}:${depth}`);}}
  expect(failures).toEqual([]);
 });

 it('keeps the cart and its pusher outside the variant winch during the full crossing',()=>{
  const failures:string[]=[];for(let seconds=134;seconds<=166;seconds+=.1){const sample=sampleEiffelFirstFloorTransfer(seconds),cart=eiffelConvexBox({center:[sample.cart[0]-.2075,bridge.floorY+.4825,-4],half:[.6075,.4825,.42],axes:[[1,0,0],[0,1,0],[0,0,1]]});for(const hit of hits(cart,frameSolids))failures.push(`${seconds.toFixed(1)}:cart:${hit}`);
   for(const part of sample.worker.parts){const body=eiffelConvexBox({center:part.center,half:[part.size[0]/2,part.size[1]/2,part.size[2]/2],axes:[rotateRigidVector(part.quaternion,[1,0,0]),rotateRigidVector(part.quaternion,[0,1,0]),rotateRigidVector(part.quaternion,[0,0,1])]});for(const hit of hits(body,frameSolids))failures.push(`${seconds.toFixed(1)}:${part.id}:${hit}`);}}
  expect(failures).toEqual([]);
 },30_000);

 it('keeps the actual exported cart and sampled worker outside every final winch mesh',async()=>{
  const load=async(path:string)=>{const bytes=readFileSync(path);return(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;};
  const [bridgeAsset,winchAsset]=await Promise.all([load('artifacts/eiffel-first-floor-transfer-2026-09-08/model/first-floor-bridge.glb'),load('artifacts/eiffel-first-floor-transfer-2026-09-08/model/first-floor-winch.glb')]);
  try{let cartRoot:Object3D|undefined;bridgeAsset.traverse(o=>{if(o.userData.wf_role==='stock-cart')cartRoot=o;});expect(cartRoot).toBeDefined();const cartMeshes:Mesh[]=[],winchMeshes:Mesh[]=[];cartRoot!.traverse(o=>{if(o instanceof Mesh)cartMeshes.push(o);});winchAsset.traverse(o=>{if(o instanceof Mesh&&o.userData.wf_role!=='cargo')winchMeshes.push(o);});expect(cartMeshes.length).toBeGreaterThan(0);expect(winchMeshes.length).toBeGreaterThan(0);winchAsset.updateMatrixWorld(true);const obstacles=winchMeshes.map(mesh=>({id:mesh.name,solid:aabbSolid(new Box3().setFromObject(mesh))})),failures:string[]=[];
   for(let seconds=134;seconds<=166;seconds+=.1){const sample=sampleEiffelFirstFloorTransfer(seconds);cartRoot!.position.set(...sample.cart);cartRoot!.updateMatrixWorld(true);for(const mesh of cartMeshes)for(const hit of hits(aabbSolid(new Box3().setFromObject(mesh)),obstacles))failures.push(`${seconds.toFixed(1)}:cart:${mesh.name}:${hit}`);
    for(const part of sample.worker.parts){const body=eiffelConvexBox({center:part.center,half:[part.size[0]/2,part.size[1]/2,part.size[2]/2],axes:[rotateRigidVector(part.quaternion,[1,0,0]),rotateRigidVector(part.quaternion,[0,1,0]),rotateRigidVector(part.quaternion,[0,0,1])]});for(const hit of hits(body,obstacles))failures.push(`${seconds.toFixed(1)}:${part.id}:${hit}`);}}
   expect(failures).toEqual([]);
  }finally{dispose(bridgeAsset);dispose(winchAsset);}
 },30_000);
});
