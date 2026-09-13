import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Mesh,Vector3,Raycaster} from 'three';
const folder='artifacts/eiffel-face-package-2026-09-08/';
const bytes=readFileSync(folder+'model/face-package.glb');
const meta=JSON.parse(readFileSync(folder+'model/manifest.json','utf8'));
const scene=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;
scene.updateMatrixWorld(true);const meshes:Mesh[]=[];scene.traverse(o=>{if(o instanceof Mesh)meshes.push(o);});
const rows=[];let mass=0;const weighted=new Vector3();
for(const mesh of meshes){
 const p=mesh.geometry.attributes.position!,idx=mesh.geometry.index;
 const points=Array.from({length:p.count},(_,i)=>new Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld));
 const base=points[0]!,sum=new Vector3();let volume=0;
 for(let i=0;i<(idx?.count??p.count);i+=3){const a=points[idx?idx.getX(i):i]!.clone().sub(base),b=points[idx?idx.getX(i+1):i+1]!.clone().sub(base),c=points[idx?idx.getX(i+2):i+2]!.clone().sub(base),v=a.dot(b.clone().cross(c))/6;
  volume+=v;sum.add(a.add(b).add(c).multiplyScalar(v/4));
 }
 if(volume<=0)throw Error(`Non-positive oriented volume ${mesh.name}: ${volume}`);
 const centroid=sum.divideScalar(volume).add(base),density=mesh.userData.wf_material==='iron'?7800:600,kg=volume*density;
 mass+=kg;weighted.addScaledVector(centroid,kg);rows.push({name:mesh.name,partId:mesh.userData.wf_part,role:mesh.userData.wf_role,volume,massKg:kg,center:centroid.toArray()});
}
const center=weighted.divideScalar(mass),supports=[];const ray=new Raycaster();
for(const mesh of meshes.filter(o=>o.userData.wf_role==='loose-joint-part')){
 const p=mesh.geometry.attributes.position!,idx=mesh.geometry.index,others=meshes.filter(o=>o!==mesh),contacts=[];let queries=0;
 for(let i=0;i<(idx?.count??p.count);i+=3){
  const vertices=[0,1,2].map(k=>new Vector3().fromBufferAttribute(p,idx?idx.getX(i+k):i+k).applyMatrix4(mesh.matrixWorld));
  const normal=vertices[1]!.clone().sub(vertices[0]!).cross(vertices[2]!.clone().sub(vertices[0]!)).normalize();if(normal.y>=-.02)continue;
  for(let u=1;u<7;u++)for(let v=1;u+v<8;v++){
   const at=vertices[0]!.clone().multiplyScalar(1-u/8-v/8).addScaledVector(vertices[1]!,u/8).addScaledVector(vertices[2]!,v/8);
   ray.set(at.clone().add(new Vector3(0,.001,0)),new Vector3(0,-1,0));const hit=ray.intersectObjects(others,false)[0];queries++;
   if(hit&&Math.abs(at.y-hit.point.y)<2e-5)contacts.push({point:at.toArray(),support:hit.object.userData.wf_role??hit.object.name,residual:at.y-hit.point.y});
  }
 }
 supports.push({partId:mesh.userData.wf_part,queries,contacts});
}
const eyes=meta.liftingEyes as number[][];
const weights=eyes.map(lug=>(1+(lug[0]!>0?1:-1)*center.x/.244)/2*(1+(lug[2]!>0?1:-1)*center.z/.5)/2);
const result={sourceGLBSHA256:createHash('sha256').update(bytes).digest('hex'),massKg:mass,centerOfMass:center.toArray(),components:rows,supports,
 bridle:{anchorPlaneY:.276,verticalLoadFractions:weights,allPositive:weights.every(w=>w>0),sum:weights.reduce((a,b)=>a+b,0)},
 limits:['Mesh-assigned mass using 600 kg/m3 timber and 7800 kg/m3 iron; small overlapping band junction volumes are counted in their model components.','Contact rays locate support patches; they do not prove global nonpenetration, friction or strength.','Four positive vertical load fractions are a static bridle feasibility check; actual rope eyes and route need separate geometry checks.']};
writeFileSync(folder+'package-measurements.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,supports:supports.map(s=>({partId:s.partId,queries:s.queries,contacts:s.contacts.length})),components:undefined},null,2));
for(const mesh of meshes){mesh.geometry.dispose();for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material])m.dispose();}
