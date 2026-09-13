import {readFileSync} from 'node:fs';
import {afterAll,beforeAll,expect,it} from 'vitest';
import {Mesh,Vector3,Raycaster,DoubleSide,type Group,type MeshStandardMaterial} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const candidate=process.env.PARIS_ROOF_MODEL_DIR??'public/models/paris-1889';
const before='artifacts/eiffel-modeling-2026-09-12/before-assets';
let source:Group,output:Group;
const manifest=JSON.parse(readFileSync(`${candidate}/paris.manifest.json`,'utf8'));
async function load(folder:string){const b=readFileSync(`${folder}/paris-city.glb`);const s=(await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;s.updateMatrixWorld(true);return s;}
beforeAll(async()=>{[source,output]=await Promise.all([load(before),load(candidate)]);});
afterAll(()=>{for(const s of[source,output])s?.traverse(o=>{if(o instanceof Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){(m as MeshStandardMaterial).map?.dispose();m.dispose();}}});});
function triangles(scene:Group,detail:boolean){
 const result:string[]=[];const point=new Vector3();
 scene.traverse(o=>{if(!(o instanceof Mesh)||!!o.userData.wf_roof_detail!==detail)return;
  const pos=o.geometry.attributes.position!,idx=o.geometry.index,uv=o.geometry.attributes.uv;
  for(let i=0;i<(idx?.count??pos.count);i+=3){const corners=[];
   for(let k=0;k<3;k++){const id=idx?idx.getX(i+k):i+k;point.fromBufferAttribute(pos,id).applyMatrix4(o.matrixWorld);
    corners.push([...point.toArray(),...(uv?[uv.getX(id),uv.getY(id)]:[])].map(v=>Math.round(v*1e5)/1e5).join(','));}
   result.push(`${o.userData.wf_material}:${corners.sort().join(';')}`);
  }
 });return result.sort();
}
it('retains every existing city triangle and UV while adding a bounded authored roof kit',()=>{
 expect(triangles(output,false)).toEqual(triangles(source,false));
 const added=triangles(output,true);expect(added.length).toBe(manifest.roofDetail.triangles);
 expect(added.length).toBeGreaterThan(1000);expect(added.length).toBeLessThan(4000);
 expect(manifest.cityTriangles).toBe(triangles(source,false).length+added.length);
});
it('anchors each dormer and gallery rooflight to an existing roof rather than adding floating or ground-level detail',()=>{
 const roofMeshes:Mesh[]=[];source.traverse(o=>{if(o instanceof Mesh&&['slate','zinc'].includes(o.userData.wf_material)){(o.material as MeshStandardMaterial).side=DoubleSide;roofMeshes.push(o);}});
 const ray=new Raycaster(),down=new Vector3(0,-1,0);
 const features=manifest.roofDetail.features as {kind:string,center:[number,number],baseY?:number,topY?:number,bounds?:[number,number,number][]}[];
 expect(features.filter(f=>f.kind==='mansard-dormer').length).toBeGreaterThan(16);
 expect(features.filter(f=>f.kind==='gallery-rooflight')).toHaveLength(20);
 for(const f of features){
  if(f.kind==='chimney-pots')continue;
  const [x,z]=f.center;ray.set(new Vector3(x,150,z),down);
  const hit=ray.intersectObjects(roofMeshes,false)[0];expect(hit,`${f.kind} ${x},${z}`).toBeTruthy();
  if(f.kind==='mansard-dormer'){
   expect(hit!.point.y).toBeGreaterThan(f.baseY!);
   expect(hit!.point.y).toBeLessThan(f.topY!);
  }else{
   const panelY=f.bounds!.reduce((n,v)=>n+v[1],0)/4;
   expect(panelY-hit!.point.y).toBeCloseTo(.11,3);
  }
 }
});
