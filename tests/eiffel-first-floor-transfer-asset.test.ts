import {readFileSync} from 'node:fs';
import {Mesh,Box3,Object3D,Raycaster,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {describe,it,expect} from 'vitest';
import {EIFFEL_FIRST_FLOOR_Y as floor} from '../src/engine/eiffelFirstFloorSupply';
async function load(){const b=readFileSync('artifacts/eiffel-first-floor-transfer-2026-09-08/model/first-floor-bridge.glb');return(await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;}
const dispose=(root:Object3D)=>root.traverse(o=>{if(o instanceof Mesh)o.geometry.dispose();});
describe('actual first-floor hatch and hinge export',()=>{
 it('leaves the ground lane open, then supplies a real floor surface when closed',async()=>{
  const scene=await load();try{let hatch:Object3D;const surfaces:Mesh[]=[];
   scene.traverse(o=>{if(o.userData.wf_role==='freight-hatch')hatch=o;if(o instanceof Mesh&&o.parent?.userData.wf_role!=='stock-cart')surfaces.push(o);});
   const ray=new Raycaster();hatch!.rotation.x=Math.PI/2;scene.updateMatrixWorld(true);
   for(const x of [-20.05,-19.75,-19.45])for(const z of [-4.3,-4,-3.7]){ray.set(new Vector3(x,floor-2,z),new Vector3(0,1,0));expect(ray.intersectObjects(surfaces,false).filter(h=>h.distance<5)).toHaveLength(0);}
   hatch!.rotation.x=0;scene.updateMatrixWorld(true);
   for(const x of [-20.05,-19.75,-19.45])for(const z of [-4.38,-3.62]){ray.set(new Vector3(x,floor+.3,z),new Vector3(0,-1,0));const hit=ray.intersectObjects(surfaces,false)[0];expect(hit).toBeDefined();expect(hit!.point.y).toBeCloseTo(floor,4);}
  }finally{dispose(scene);}
 });
 it('has real clear hinge bores around pins throughout panel rotation',async()=>{
  const scene=await load();try{const knuckles:Mesh[]=[],pins:Mesh[]=[];let hatch:Object3D;
   scene.traverse(o=>{if(o.userData.wf_role==='freight-hatch')hatch=o;if(o instanceof Mesh&&o.userData.wf_role==='hatch-knuckle')knuckles.push(o);if(o instanceof Mesh&&o.userData.wf_role==='hatch-hinge-pin')pins.push(o);});
   expect(knuckles).toHaveLength(6);expect(pins).toHaveLength(2);const ray=new Raycaster();
   for(const angle of [0,Math.PI/4,Math.PI/2]){hatch!.rotation.x=angle;scene.updateMatrixWorld(true);
    for(const ring of knuckles){const c=new Box3().setFromObject(ring).getCenter(new Vector3());ray.set(c.clone().add(new Vector3(-.3,0,0)),new Vector3(1,0,0));expect(ray.intersectObject(ring,false),ring.name).toHaveLength(0);ray.set(c.clone().add(new Vector3(-.3,.031,0)),new Vector3(1,0,0));expect(ray.intersectObject(ring,false).length,ring.name).toBeGreaterThan(0);}
    for(const pin of pins){const c=new Box3().setFromObject(pin).getCenter(new Vector3());ray.set(c.clone().add(new Vector3(-.3,0,0)),new Vector3(1,0,0));expect(ray.intersectObject(pin,false).length).toBeGreaterThan(0);}
   }
  }finally{dispose(scene);}
 });
});
