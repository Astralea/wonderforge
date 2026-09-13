import {readFileSync} from 'node:fs';
import {BufferAttribute,Mesh,Object3D,Raycaster,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {describe,expect,it} from 'vitest';
import type {EiffelKitManifest} from '../src/data/eiffelKitTypes';
import {eiffelConvexBox,eiffelConvexPenetration,eiffelConvexSolid,eiffelConvexTranslationSweep,type EiffelConvexSolid} from '../src/engine/eiffelConvex';
import {eiffelSolidBox} from '../src/engine/eiffelOccupancy';
import type {RigidVec3 as V} from '../src/engine/eiffelRigid';

type Prism={id:string;vertices:V[]};
const folder='artifacts/eiffel-diagonal-receiver-2026-09-08/';
const design=JSON.parse(readFileSync(folder+'design.json','utf8')) as {productionReady:boolean;shapes:Prism[];pickup:V;peak:V;overCart:V;received:V};
const report=JSON.parse(readFileSync(folder+'audit.json','utf8')) as {geometryClear:boolean};
const manifest=JSON.parse(readFileSync('public/models/eiffel-construction-kit/tower-kit.manifest.json','utf8')) as EiffelKitManifest;
const first=JSON.parse(readFileSync('artifacts/eiffel-first-floor-transfer-2026-09-08/bridge-design.json','utf8')) as {shapes:Prism[]};
const second=JSON.parse(readFileSync('artifacts/eiffel-second-floor-supply-2026-09-08/bridge-design.json','utf8')) as {shapes:Prism[]};
const faces=[[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]] as const;
const source=design.shapes.map(prism=>({id:prism.id,solid:eiffelConvexSolid(prism.vertices,faces)}));
const fixed=[...manifest.parts.filter(p=>p.stage<=45).map(p=>({id:p.id,solid:eiffelConvexBox(eiffelSolidBox(p,p.finalPose))})),...first.shapes.map(p=>({id:`first:${p.id}`,solid:eiffelConvexSolid(p.vertices,faces)})),...second.shapes.map(p=>({id:`second:${p.id}`,solid:eiffelConvexSolid(p.vertices,faces)}))];
const overlaps=(a:EiffelConvexSolid,b:EiffelConvexSolid)=>!a.min.some((v,k)=>v>b.max[k]!||a.max[k]!<b.min[k]!);
const hits=(moving:EiffelConvexSolid,obstacles:{id:string;solid:EiffelConvexSolid}[])=>obstacles.flatMap(o=>{if(!overlaps(moving,o.solid))return[];const depth=eiffelConvexPenetration(moving,o.solid);return depth>1e-6?[`${o.id}:${depth}`]:[];});
const crate=(center:V)=>eiffelConvexBox({center,half:[.3,.9,.3],axes:[[1,0,0],[0,1,0],[0,0,1]]});
const load=async(path:string)=>{const bytes=readFileSync(path);return(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;};
const dispose=(root:Object3D)=>root.traverse(o=>{if(o instanceof Mesh)o.geometry.dispose();});

describe('Eiffel diagonal second-floor receiver candidate',()=>{
 it('independently replays source environment and crate-route clearance',()=>{expect(report.geometryClear).toBe(true);expect(design.productionReady).toBe(false);expect(source).toHaveLength(17);const failures=source.flatMap(s=>hits(s.solid,fixed).map(hit=>`${s.id}:${hit}`)),points=[design.pickup,design.peak,design.overCart,design.received];for(let i=1;i<points.length;i++){const a=points[i-1]!,b=points[i]!,sweep=eiffelConvexTranslationSweep(crate(a),[b[0]-a[0],b[1]-a[1],b[2]-a[2]]);failures.push(...hits(sweep,[...fixed,...source]).map(hit=>`leg-${i}:${hit}`));}expect(failures).toEqual([]);},30_000);

 it('matches every exported member to all eight authored world corners',async()=>{const asset=await load(folder+'model/diagonal-receiver-frame.glb');try{asset.updateMatrixWorld(true);const meshes=new Map<string,Mesh>();asset.traverse(o=>{if(o instanceof Mesh&&o.userData.wf_source_id)meshes.set(String(o.userData.wf_source_id),o);});expect(meshes.size).toBe(17);const failures:string[]=[];for(const prism of design.shapes){const mesh=meshes.get(prism.id);if(!mesh){failures.push(`${prism.id}:missing`);continue;}const attr=mesh.geometry.getAttribute('position') as BufferAttribute,points:V[]=[];for(let i=0;i<attr.count;i++){const p=new Vector3(attr.getX(i),attr.getY(i),attr.getZ(i)).applyMatrix4(mesh.matrixWorld),v:[number,number,number]=[p.x,p.y,p.z];if(!points.some(q=>Math.hypot(q[0]-v[0],q[1]-v[1],q[2]-v[2])<1e-6))points.push(v);}if(points.length!==8)failures.push(`${prism.id}:vertices:${points.length}`);for(const expected of prism.vertices){const nearest=Math.min(...points.map(p=>Math.hypot(p[0]-expected[0],p[1]-expected[1],p[2]-expected[2])));if(nearest>2e-5)failures.push(`${prism.id}:corner:${nearest}`);}}expect(failures).toEqual([]);}finally{dispose(asset);}},30_000);

 it('seats every exported foot bottom corner on actual stage-34 floor triangles',async()=>{const [asset,tower]=await Promise.all([load(folder+'model/diagonal-receiver-frame.glb'),load('public/models/eiffel-construction-kit/tower-kit.glb')]);try{asset.updateMatrixWorld(true);tower.updateMatrixWorld(true);const stages=new Map(manifest.parts.map(p=>[p.id,p.stage])),floors:Mesh[]=[],feet:Mesh[]=[];tower.traverse(o=>{if(o instanceof Mesh&&(stages.get(String(o.userData.wf_part))??99)<=34)floors.push(o);});asset.traverse(o=>{if(o instanceof Mesh&&String(o.userData.wf_source_id).startsWith('foot-'))feet.push(o);});expect(feet).toHaveLength(4);const ray=new Raycaster(),failures:string[]=[];for(const foot of feet){const attr=foot.geometry.getAttribute('position') as BufferAttribute,world:Vector3[]=[];for(let i=0;i<attr.count;i++)world.push(new Vector3(attr.getX(i),attr.getY(i),attr.getZ(i)).applyMatrix4(foot.matrixWorld));const bottom=Math.min(...world.map(v=>v.y)),corners=world.filter(v=>Math.abs(v.y-bottom)<1e-6).filter((v,i,a)=>a.findIndex(q=>q.distanceTo(v)<1e-6)===i);expect(corners,foot.name).toHaveLength(4);for(const [i,p]of corners.entries()){ray.set(new Vector3(p.x,p.y+.2,p.z),new Vector3(0,-1,0));const hit=ray.intersectObjects(floors,false).find(h=>h.point.y<=p.y+1e-5);if(!hit||Math.abs(hit.point.y-p.y)>2e-5)failures.push(`${foot.name}:${i}:${hit?.point.y??'miss'}`);}}expect(failures).toEqual([]);}finally{dispose(asset);dispose(tower);}},30_000);
});
