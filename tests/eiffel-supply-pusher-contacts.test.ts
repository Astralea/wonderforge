import {readFileSync} from 'node:fs';
import {Box3,Mesh,Object3D,Raycaster,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {describe,expect,it} from 'vitest';
import type {EiffelKitManifest} from '../src/data/eiffelKitTypes';
import {eiffelConvexBox,eiffelConvexPenetration} from '../src/engine/eiffelConvex';
import {rotateRigidVector,transformRigidPoint} from '../src/engine/eiffelRigid';
import {sampleEiffelSecondFloorSupply} from '../src/engine/eiffelSecondFloorSupply';
import {sampleEiffelSupplyPusher,type SupplyWorkerPart} from '../src/engine/eiffelSupplyPusher';

const manifest=JSON.parse(readFileSync('public/models/eiffel-construction-kit/tower-kit.manifest.json','utf8')) as EiffelKitManifest;
const samples=[0,.7,4,8,12,16,19,20,23] as const;
const loadGlb=async(path:string)=>{const bytes=readFileSync(path);return(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;};
const dispose=(root:Object3D)=>root.traverse(o=>{if(o instanceof Mesh)o.geometry.dispose();});
const partSolid=(part:SupplyWorkerPart)=>eiffelConvexBox({center:part.center,half:[part.size[0]/2,part.size[1]/2,part.size[2]/2],axes:[rotateRigidVector(part.quaternion,[1,0,0]),rotateRigidVector(part.quaternion,[0,1,0]),rotateRigidVector(part.quaternion,[0,0,1])]});
const aabbSolid=(bounds:Box3)=>{const center=bounds.getCenter(new Vector3()),half=bounds.getSize(new Vector3()).multiplyScalar(.5);return eiffelConvexBox({center:[center.x,center.y,center.z],half:[half.x,half.y,half.z],axes:[[1,0,0],[0,1,0],[0,0,1]]});};

describe('Eiffel second-floor supply pusher contacts',()=>{
 it('keeps every rendered body box outside the actual moving cart meshes while hands meet only the handle face',async()=>{
  const bridge=await loadGlb('artifacts/eiffel-second-floor-supply-2026-09-08/model/second-floor-bridge.glb');
  try{
   let cart:Object3D|undefined;bridge.traverse(o=>{if(o.userData.wf_role==='stock-cart')cart=o;});expect(cart).toBeDefined();
   const meshes:Mesh[]=[];cart!.traverse(o=>{if(o instanceof Mesh)meshes.push(o);});expect(meshes.length).toBeGreaterThan(0);
   const handle=meshes.find(mesh=>mesh.name.replace(/\d+$/,'')==='push-handle-bar');expect(handle).toBeDefined();
   const failures:string[]=[];
   for(let step=0;step<=460;step++){
    const t=step/20,s=sampleEiffelSupplyPusher(t),supply=sampleEiffelSecondFloorSupply(t);
    cart!.position.set(...supply.cart);cart!.updateMatrixWorld(true);
    const actual=meshes.map(mesh=>({mesh,box:new Box3().setFromObject(mesh)}));
    for(const part of s.parts)for(const obstacle of actual){
     const depth=eiffelConvexPenetration(partSolid(part),aabbSolid(obstacle.box));
     if(depth>2e-6)failures.push(`${t.toFixed(2)}:${part.id}:${obstacle.mesh.name}:${depth}`);
    }
    for(const [index,hand] of s.hands.entries())if(hand.active){
     const box=new Box3().setFromObject(handle!);
     if(Math.abs(box.min.x-hand.surface[0])>2e-6||Math.abs(hand.center[0]+.035-box.min.x)>2e-6||hand.center[1]<box.min.y||hand.center[1]>box.max.y||hand.center[2]<box.min.z||hand.center[2]>box.max.z)failures.push(`${t.toFixed(2)}:hand-${index}:miss:${hand.center.join(',')}:${box.min.toArray().join(',')}:${box.max.toArray().join(',')}`);
    }
   }
   expect(failures).toEqual([]);
  }finally{dispose(bridge);}
 },30_000);

 it('grounds every planted sole corner on actual stage-34 floor or bridge timber triangles',async()=>{
  const [tower,bridge]=await Promise.all([loadGlb('public/models/eiffel-construction-kit/tower-kit.glb'),loadGlb('artifacts/eiffel-second-floor-supply-2026-09-08/model/second-floor-bridge.glb')]);
  try{
   const stage=new Map(manifest.parts.map(part=>[part.id,part.stage])),supports:Mesh[]=[];
   tower.updateMatrixWorld(true);tower.traverse(o=>{if(o instanceof Mesh&&stage.get(String(o.userData.wf_part))===34)supports.push(o);});
   bridge.updateMatrixWorld(true);bridge.traverse(o=>{if(o instanceof Mesh&&o.userData.wf_role==='bridge-timber')supports.push(o);});
   expect(supports.length).toBeGreaterThan(1);
   const ray=new Raycaster(),failures:string[]=[];
   for(const t of samples){
    const s=sampleEiffelSupplyPusher(t);
    for(const [index,foot]of s.feet.entries()){
     if(!foot.planted)continue;
     const part=s.parts.find(item=>item.id===`foot-${index}`)!;
     for(const sx of[-1,1])for(const sz of[-1,1]){
      const corner=transformRigidPoint({position:part.center,quaternion:part.quaternion},[sx*part.size[0]/2,-part.size[1]/2,sz*part.size[2]/2]);
      ray.set(new Vector3(corner[0],corner[1]+.1,corner[2]),new Vector3(0,-1,0));
      const hit=ray.intersectObjects(supports,false).find(candidate=>candidate.point.y<=corner[1]+1e-5);
      if(!hit||Math.abs(hit.point.y-corner[1])>2e-5)failures.push(`${t}:foot-${index}:${sx},${sz}:${corner.join(',')}:${hit?.point.y??'miss'}`);
     }
    }
   }
   expect(failures).toEqual([]);
  }finally{dispose(tower);dispose(bridge);}
 },30_000);
});
