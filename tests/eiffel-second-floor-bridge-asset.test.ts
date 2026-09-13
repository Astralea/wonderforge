import {readFileSync} from 'node:fs';
import {Box3,Mesh,Object3D,Vector3,Raycaster,DoubleSide} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {describe,it,expect} from 'vitest';
import {eiffelConvexBox,eiffelConvexPenetration,eiffelConvexSolid,eiffelConvexTranslationSweep} from '../src/engine/eiffelConvex';
import {eiffelSolidBox} from '../src/engine/eiffelOccupancy';
import type {EiffelKitManifest} from '../src/data/eiffelKitTypes';
import type {RigidVec3 as V} from '../src/engine/eiffelRigid';
const folder='artifacts/eiffel-second-floor-supply-2026-09-08/';
const design=JSON.parse(readFileSync(folder+'bridge-design.json','utf8')) as {shapes:{id:string;vertices:V[]}[]};
const faces=[[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]];
describe('actual second-floor Blender bridge and stock cart',()=>{
 it('seats actual wheel bottoms on exported decking and preserves real bearing undersides',async()=>{
  const b=readFileSync(folder+'model/second-floor-bridge.glb');const scene=(await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;scene.updateMatrixWorld(true);
  const tb=readFileSync('public/models/eiffel-construction-kit/tower-kit-seated.glb');const tower=(await new GLTFLoader().parseAsync(tb.buffer.slice(tb.byteOffset,tb.byteOffset+tb.byteLength),'')).scene;tower.updateMatrixWorld(true);const floorMeshes:Mesh[]=[];tower.traverse(o=>{if(o instanceof Mesh)floorMeshes.push(o);});
  const meshes:Mesh[]=[];scene.traverse(o=>{if(o instanceof Mesh){meshes.push(o);for(const m of Array.isArray(o.material)?o.material:[o.material])m.side=DoubleSide;}});
  try{
   const deck=meshes.find(m=>m.userData.wf_role==='bridge-timber')!,iron=meshes.find(m=>m.userData.wf_role==='bridge-iron')!;
   const wheels=meshes.filter(m=>m.userData.wf_role==='cart-wheel');expect(wheels).toHaveLength(4);
   for(const wheel of wheels){const bounds=new Box3().setFromObject(wheel),c=bounds.getCenter(new Vector3());const hits=new Raycaster(new Vector3(c.x,116.16,c.z),new Vector3(0,-1,0),0,.1).intersectObjects([deck,...floorMeshes],false);expect(hits.length).toBeGreaterThan(0);expect(bounds.min.y).toBeCloseTo(hits[0]!.point.y,4);}
   for(const p of design.shapes.filter(s=>s.id.startsWith('bearing-'))){const y=Math.min(...p.vertices.map(v=>v[1]));for(const v of p.vertices.filter(v=>Math.abs(v[1]-y)<1e-8)){const center=p.vertices.reduce((a,v)=>a.add(new Vector3(...v)),new Vector3()).multiplyScalar(1/8);const origin=new Vector3(v[0],116.10,v[2]).lerp(new Vector3(center.x,116.10,center.z),.01);const hits=new Raycaster(origin,new Vector3(0,1,0),0,.1).intersectObject(iron,false);expect(hits.length).toBeGreaterThan(0);expect(hits[0]!.point.y).toBeCloseTo(116.14,4);}}
   let cart:Object3D|undefined;scene.traverse(o=>{if(o.userData.wf_role==='stock-cart')cart=o;});expect(cart).toBeDefined();const bounds=new Box3().setFromObject(cart!),c=bounds.getCenter(new Vector3()),h=bounds.getSize(new Vector3()).multiplyScalar(.5);
   const moving=eiffelConvexTranslationSweep(eiffelConvexBox({center:[c.x,c.y,c.z],half:[h.x,h.y,h.z],axes:[[1,0,0],[0,1,0],[0,0,1]]}),[15,0,0]);
   const manifest=JSON.parse(readFileSync('public/models/eiffel-construction-kit/tower-kit.manifest.json','utf8')) as EiffelKitManifest;
   const obstacles=[...design.shapes.map(p=>({id:p.id,solid:eiffelConvexSolid(p.vertices,faces)})),...manifest.parts.filter(p=>p.stage<=45).map(p=>({id:p.id,solid:eiffelConvexBox(eiffelSolidBox(p,p.finalPose))}))];
   expect(obstacles.filter(p=>eiffelConvexPenetration(moving,p.solid)>2e-5).map(p=>p.id)).toEqual([]);
  }finally{for(const m of [...meshes,...floorMeshes]){m.geometry.dispose();for(const material of Array.isArray(m.material)?m.material:[m.material])material.dispose();}}
 });
});
