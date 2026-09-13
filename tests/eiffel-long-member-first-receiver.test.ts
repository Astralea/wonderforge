import {readFileSync} from 'node:fs';
import {BufferAttribute,Mesh,Raycaster,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {describe,expect,it} from 'vitest';
import type {EiffelKitManifest} from '../src/data/eiffelKitTypes';
import {eiffelConvexBox,eiffelConvexPenetration,eiffelConvexSolid} from '../src/engine/eiffelConvex';
import {eiffelSolidBox} from '../src/engine/eiffelOccupancy';
import type {RigidVec3 as V} from '../src/engine/eiffelRigid';

type Prism={id:string;vertices:V[]};
const folder='artifacts/eiffel-real-payload-route-2026-09-08/';
const design=JSON.parse(readFileSync(folder+'design.json','utf8')) as {frame:Prism[];worldFloorY:number;productionReady:boolean};
const manifest=JSON.parse(readFileSync('public/models/eiffel-construction-kit/tower-kit.manifest.json','utf8')) as EiffelKitManifest;
const bridge=JSON.parse(readFileSync('artifacts/eiffel-first-floor-transfer-2026-09-08/bridge-design.json','utf8')) as {shapes:Prism[]};
const faces=[[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]] as const;
const load=async(path:string)=>{const b=readFileSync(path);return(await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;};

describe('actual long-member first-floor receiver',()=>{
 it('retains clear recomputed frame geometry on the original deck bearings',()=>{
  const obstacles=[...manifest.parts.filter(p=>p.stage<=45).map(p=>({id:p.id,solid:eiffelConvexBox(eiffelSolidBox(p,p.finalPose))})),...bridge.shapes.map(p=>({id:p.id,solid:eiffelConvexSolid(p.vertices,faces)}))];
  const failures:string[]=[];
  for(const part of design.frame){const solid=eiffelConvexSolid(part.vertices,faces);for(const other of obstacles){if(solid.min.some((v,i)=>v>other.solid.max[i]!||solid.max[i]!<other.solid.min[i]!))continue;if(eiffelConvexPenetration(solid,other.solid)>1e-6)failures.push(`${part.id}:${other.id}`);}}
  expect(design.frame).toHaveLength(21);expect(failures).toEqual([]);expect(design.productionReady).toBe(false);
  const original=JSON.parse(readFileSync('artifacts/eiffel-first-floor-transfer-2026-09-08/design.json','utf8')) as {frame:Prism[]};
  for(const skid of design.frame.filter(p=>p.id.startsWith('skid-')))expect(skid).toEqual(original.frame.find(p=>p.id===skid.id));
 });

 it('exports real frame corners and keeps all eight skid-bottom corners on actual deck triangles',async()=>{
  const [asset,tower]=await Promise.all([load(folder+'model/long-member-first-receiver.glb'),load('public/models/eiffel-construction-kit/tower-kit.glb')]);
  try{
   asset.updateMatrixWorld(true);tower.updateMatrixWorld(true);
   const sources=new Map<string,Mesh>();asset.traverse(o=>{if(o instanceof Mesh&&o.userData.wf_source_id)sources.set(String(o.userData.wf_source_id),o);});
   expect(sources.size).toBe(21);
   for(const part of design.frame){const mesh=sources.get(part.id)!;expect(mesh).toBeDefined();const a=mesh.geometry.getAttribute('position') as BufferAttribute,points=Array.from({length:a.count},(_,i)=>new Vector3(a.getX(i),a.getY(i),a.getZ(i)).applyMatrix4(mesh.matrixWorld));for(const vertex of part.vertices)expect(Math.min(...points.map(p=>p.distanceTo(new Vector3(...vertex))))).toBeLessThan(2e-5);}
   const stages=new Map(manifest.parts.map(p=>[p.id,p.stage])),floors:Mesh[]=[];tower.traverse(o=>{if(o instanceof Mesh&&(stages.get(String(o.userData.wf_part))??99)<=34)floors.push(o);});
   const ray=new Raycaster();let count=0;
   for(const skid of design.frame.filter(p=>p.id.startsWith('skid-'))){const bottom=Math.min(...skid.vertices.map(v=>v[1]));for(const p of skid.vertices.filter(v=>Math.abs(v[1]-bottom)<1e-7)){count++;ray.set(new Vector3(p[0],p[1]+.2,p[2]),new Vector3(0,-1,0));const hit=ray.intersectObjects(floors,false).find(h=>h.point.y<=p[1]+1e-5);expect(hit).toBeDefined();expect(Math.abs(hit!.point.y-p[1])).toBeLessThan(2e-5);}}
   expect(count).toBe(8);
  }finally{for(const root of [asset,tower])root.traverse(o=>{if(o instanceof Mesh)o.geometry.dispose();});}
 },30_000);
});
