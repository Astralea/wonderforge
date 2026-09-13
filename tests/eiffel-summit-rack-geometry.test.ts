import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {Box3,Group,Mesh,Raycaster,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import type {EiffelKitManifest} from '../src/data/eiffelKitTypes';
import type {RigidVec3 as V} from '../src/engine/eiffelRigid';
import {eiffelConvexBox,eiffelConvexPenetration,eiffelConvexSolid} from '../src/engine/eiffelConvex';
import {eiffelSolidBox} from '../src/engine/eiffelOccupancy';
import {planEiffelSummitStock} from '../src/engine/eiffelSummitStock';

const folder='artifacts/eiffel-summit-stock-2026-09-08/',manifest=JSON.parse(readFileSync('artifacts/eiffel-summit-revision-2026-09-08/before-kit/tower-kit.manifest.json','utf8')) as EiffelKitManifest;
type Prism={id:string;rackId:string;role:string;vertices:V[]};
const prisms=JSON.parse(readFileSync(folder+'rack-occupancy.json','utf8')) as Prism[];
async function load(path:string){const bytes=readFileSync(path);const scene=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;scene.updateMatrixWorld(true);return scene;}
function dispose(scene:Group){scene.traverse(o=>{if(o instanceof Mesh){o.geometry.dispose();for(const material of Array.isArray(o.material)?o.material:[o.material])material.dispose();}});}
const faces=[[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]] as const;

describe('archived pre-revision Eiffel summit stock-rack geometry',()=>{
 it('puts all 32 authored bearing-foot bottom corners on the preserved actual stage-56 deck',async()=>{const tower=await load('artifacts/eiffel-summit-revision-2026-09-08/before-kit/tower-kit.glb'),stage=new Map(manifest.parts.map(p=>[p.id,p.stage])),meshes:Mesh[]=[];tower.traverse(o=>{if(o instanceof Mesh&&stage.get(String(o.userData.wf_part))===56)meshes.push(o);});
  try{const feet=prisms.filter(p=>p.role==='bearing-foot');expect(feet).toHaveLength(32);expect(meshes.length).toBeGreaterThan(0);const ray=new Raycaster(),misses:string[]=[];for(const foot of feet){const bottom=Math.min(...foot.vertices.map(v=>v[1])),corners=foot.vertices.filter(v=>Math.abs(v[1]-bottom)<1e-9);expect(corners).toHaveLength(4);for(const [index,corner] of corners.entries()){ray.set(new Vector3(corner[0],bottom+.5,corner[2]),new Vector3(0,-1,0));const hit=ray.intersectObjects(meshes,false)[0];if(!hit||Math.abs(hit.point.y-bottom)>1e-4)misses.push(`${foot.id}:corner${index}:expected=${bottom.toFixed(6)}:hit=${hit?.point.y.toFixed(6)??'none'}`);}}expect(misses).toEqual([]);}
  finally{dispose(tower);}
 },30_000);

 it('keeps every authored source prism outside every final stage-54+ kit envelope',()=>{const fixed=manifest.parts.filter(p=>p.stage>=54).map(part=>({id:part.id,shape:eiffelConvexBox(eiffelSolidBox(part,part.finalPose)),conservative:part.shape!=='box'})),collisions:{rack:string;member:string;depth:number;conservativeNonboxEnvelope:boolean}[]=[];expect(prisms).toHaveLength(176);
  for(const prism of prisms){const shape=eiffelConvexSolid(prism.vertices,faces);for(const member of fixed){const depth=eiffelConvexPenetration(shape,member.shape);if(depth>1e-5)collisions.push({rack:prism.id,member:member.id,depth,conservativeNonboxEnvelope:member.conservative});}}
  expect(collisions).toEqual([]);
 },30_000);

 it('keeps all 247 stock envelopes clear of posts and braces with shelf contact only',()=>{const plan=planEiffelSummitStock(manifest),rackSolids=prisms.map(prism=>({prism,shape:eiffelConvexSolid(prism.vertices,faces)})),collisions:{partId:string;prismId:string;depth:number}[]=[];
  for(const placement of plan.placements){const part=manifest.parts.find(p=>p.id===placement.partId)!,cargo=eiffelConvexBox(eiffelSolidBox(part,placement.pose));for(const {prism,shape} of rackSolids){const depth=eiffelConvexPenetration(cargo,shape);if(depth<=1e-5)continue;const intended=prism.rackId===placement.rackId&&prism.role==='shelf'&&prism.id.endsWith(`shelf-${placement.shelfIndex}`)&&depth<=1e-4;if(!intended)collisions.push({partId:part.id,prismId:prism.id,depth});}}
  expect(collisions).toEqual([]);
 },30_000);

 it('loads eight joined rack meshes whose bounds contain every audited source prism',async()=>{const racks=await load(folder+'model/summit-stock-racks.glb');try{const meshes=new Map<string,Mesh>();racks.traverse(o=>{if(o instanceof Mesh&&o.userData.wf_role==='rack')meshes.set(String(o.userData.wf_rack),o);});expect(meshes.size).toBe(8);for(const prism of prisms){const mesh=meshes.get(prism.rackId)!;expect(mesh).toBeTruthy();const bounds=new Box3().setFromObject(mesh);for(const vertex of prism.vertices)expect(bounds.distanceToPoint(new Vector3(...vertex)),`${prism.id}:${vertex.join(',')}`).toBeLessThan(2e-5);}}finally{dispose(racks);}},30_000);
 it('retains actual exported bearing undersides and complete shelf surfaces after Boolean cleanup',async()=>{
  const racks=await load(folder+'model/summit-stock-racks.glb'),ray=new Raycaster();
  try{
   for(const foot of prisms.filter(p=>p.role==='bearing-foot')){
    const bottom=Math.min(...foot.vertices.map(v=>v[1]));
    const center=[0,1,2].map(k=>foot.vertices.reduce((sum,v)=>sum+v[k]!,0)/8);
    // Inset from exact triangle edges while checking every corner region.
    for(const v of foot.vertices.filter(v=>Math.abs(v[1]-bottom)<1e-9)){
     ray.set(new Vector3(v[0]*.99+center[0]!*.01,bottom-.2,v[2]*.99+center[2]!*.01),new Vector3(0,1,0));
     expect(ray.intersectObject(racks,true)[0]?.point.y).toBeCloseTo(bottom,4);
    }
   }
   for(const rack of planEiffelSummitStock(manifest).racks)for(const y of rack.shelfTops){
    for(const a of [-.45,-.25,0,.25,.45])for(const b of [-.4,0,.4]){
     const x=rack.center[0]+(rack.axis==='x'?a*rack.length:b*rack.depth),z=rack.center[1]+(rack.axis==='x'?b*rack.depth:a*rack.length);
     ray.set(new Vector3(x,y+.05,z),new Vector3(0,-1,0));
     expect(ray.intersectObject(racks,true)[0]?.point.y).toBeCloseTo(y,4);
    }
   }
  }finally{dispose(racks);}
 },30_000);

});
