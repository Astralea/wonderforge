import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BufferGeometry, Float32BufferAttribute, Group, Mesh, PlaneGeometry, Ray, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EIFFEL_EXPO_POOL_PLANS, createEiffelExpoPoolUnderbeds, excavateEiffelExpoBasins } from '../src/render/three/EiffelEnvironment';
import { clipEiffelPoolPaving } from '../src/render/three/eiffelPoolPaving';
import { EIFFEL_TRAFFIC_ACTORS } from '../src/data/eiffelTraffic';
import { eiffelTrafficPoseAt } from '../src/engine/eiffelTraffic';
import { eiffelTerrainHeightAt } from '../src/engine/eiffelTerrain';
import { parisBasinWitness } from './helpers/paris-basin-witness';

type Tri = [Vector3, Vector3, Vector3];
function triangles(geometry: BufferGeometry): Tri[] {
 const p=geometry.getAttribute('position'),index=geometry.index;
 return Array.from({length:(index?.count??p.count)/3},(_,i)=>[0,1,2].map(k=>new Vector3().fromBufferAttribute(p,index?index.getX(i*3+k):i*3+k)) as Tri);
}
function vertical(tris:Tri[],x:number,z:number,y:number,direction:number){
 const ray=new Ray(new Vector3(x,y,z),new Vector3(0,direction,0)),point=new Vector3(),hits:number[]=[];
 for(const t of tris){if(ray.intersectTriangle(...t,false,point))hits.push(point.y);}
 return direction>0?Math.min(...hits):Math.max(...hits);
}
const source=new PlaneGeometry(1440,1440,96,96);source.rotateX(-Math.PI/2);
const sourceP=source.getAttribute('position');
for(let i=0;i<sourceP.count;i++)sourceP.setY(i,eiffelTerrainHeightAt(sourceP.getX(i),sourceP.getZ(i)));
source.computeVertexNormals();source.setAttribute('color',new Float32BufferAttribute(new Float32Array(sourceP.count*3).fill(.5),3));
const graded=excavateEiffelExpoBasins(source),beds=createEiffelExpoPoolUnderbeds();
const original=triangles(source),actualGround=triangles(graded),actualBeds=triangles(beds);
let city:Group;const actualStone:Tri[]=[];
beforeAll(async()=>{
 const bytes=readFileSync('public/models/paris-1889/paris-city.glb');city=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;city.updateMatrixWorld(true);
 city.traverse(o=>{if(!(o instanceof Mesh)||!['stone-light','stone-warm'].includes(o.userData.wf_material))return;for(const t of triangles(o.geometry)){for(const v of t)v.applyMatrix4(o.matrixWorld);if(t.every(v=>Math.abs(v.x)<12&&v.z>190&&v.z<325))actualStone.push(t);}});
});
afterAll(()=>{source.dispose();graded.dispose();beds.dispose();city.traverse(o=>{if(o instanceof Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});});
function local(tris:Tri[],pool:typeof EIFFEL_EXPO_POOL_PLANS[number]){return tris.filter(t=>Math.max(...t.map(p=>p.x))>=-pool.width/2-2&&Math.min(...t.map(p=>p.x))<=pool.width/2+2&&Math.max(...t.map(p=>p.z))>=pool.z-pool.length/2-2&&Math.min(...t.map(p=>p.z))<=pool.z+pool.length/2+2);}

describe('Actual exposition basin ground and support',()=>{
 it('matches the unchanged GLB floor, coping and pedestal levels',()=>{
  expect(actualStone).toHaveLength(368);
  for(const pool of EIFFEL_EXPO_POOL_PLANS){
   const stone=local(actualStone,pool);
   expect(vertical(stone,1,pool.z,pool.base-1,1)).toBeCloseTo(pool.floorBottom,5);
   expect(vertical(stone,1,pool.z,pool.waterY,-1)).toBeCloseTo(pool.floorTop,5);
   expect(vertical(stone,pool.width/2+.3,pool.z,pool.copingBottom-1e-3,1)).toBeCloseTo(pool.copingBottom,5);
   expect(pool.waterY-pool.floorTop).toBeCloseTo(.22,8);
  }
  for(const z of [206,254])expect(vertical(actualStone,0,z,EIFFEL_EXPO_POOL_PLANS[0]!.base+.3,1)).toBeCloseTo(EIFFEL_EXPO_POOL_PLANS[0]!.base+.4,5);
 });
 it('removes terrain above the actual floor underside throughout both basin footprints',()=>{
  for(const pool of EIFFEL_EXPO_POOL_PLANS){
   const ground=local(actualGround,pool);
   for(let x=-pool.width/2-.69;x<pool.width/2+.7;x+=.63)for(let z=pool.z-pool.length/2-.69;z<pool.z+pool.length/2+.7;z+=.71){
    expect(vertical(ground,x,z,20,-1),`ground ${x},${z}`).toBeCloseTo(pool.floorBottom,4);
   }
  }
 });
 it('retains actual original triangle heights immediately outside every coping boundary',()=>{
  for(const pool of EIFFEL_EXPO_POOL_PLANS){
   const before=local(original,pool),after=local(actualGround,pool),x=pool.width/2+.7,z=pool.length/2+.7;
   for(const gap of [.001,.05,.5,1])for(let t=-.99;t<=1;t+=.033){
    for(const [xx,zz]of [[-x-gap,pool.z+t*z],[x+gap,pool.z+t*z],[t*x,pool.z-z-gap],[t*x,pool.z+z+gap]]){
     expect(vertical(after,xx!,zz!,20,-1)).toBeCloseTo(vertical(before,xx!,zz!,20,-1),4);
    }
   }
  }
  const key=(t:Tri)=>t.map(v=>v.toArray().join(',')).join('|'),keys=new Set(actualGround.map(key));
  for(const t of original)if(EIFFEL_EXPO_POOL_PLANS.every(p=>Math.max(...t.map(v=>v.x))<=-p.width/2-.7||Math.min(...t.map(v=>v.x))>=p.width/2+.7||Math.max(...t.map(v=>v.z))<=p.z-p.length/2-.7||Math.min(...t.map(v=>v.z))>=p.z+p.length/2+.7))expect(keys.has(key(t))).toBe(true);
 });
 it('supports the complete coping underside and fountain base without entering the retained floor solid',()=>{
  for(const pool of EIFFEL_EXPO_POOL_PLANS){
   for(let x=-pool.width/2-.65;x<pool.width/2+.7;x+=.21)for(let dz=-pool.length/2-.65;dz<pool.length/2+.7;dz+=.67){
    if(Math.abs(x)<pool.width/2&&Math.abs(dz)<pool.length/2)continue;
    expect(vertical(actualBeds,x,pool.z+dz,pool.copingBottom+.001,-1)).toBeCloseTo(pool.copingBottom,4);
   }
   for(const t of actualBeds)for(const v of t)if(Math.abs(v.x)<pool.width/2+.45-1e-5&&Math.abs(v.z-pool.z)<pool.length/2+.45-1e-5)expect(v.y).toBeGreaterThanOrEqual(pool.floorTop-1e-5);
  }
  const pool=EIFFEL_EXPO_POOL_PLANS[0]!;
  for(const z of [206,254])for(const x of [-2,0,2]){
   expect(vertical(actualBeds,x,z,pool.base+.401,-1)).toBeCloseTo(pool.base+.4,5);
   expect(vertical(actualBeds,x,z,pool.base+.05,1)).toBeCloseTo(pool.floorTop,5);
  }
 });
 it('clips only the actual paving intersection and retains exterior source triangles',()=>{
  const copy=city.clone(true);copy.traverse(o=>{if(o instanceof Mesh)o.geometry=o.geometry.clone();});
  const before=new Map<string,Tri[]>(),beforeGeometry=new Map<string,BufferGeometry>();copy.traverse(o=>{if(o instanceof Mesh){before.set(o.name,triangles(o.geometry));beforeGeometry.set(o.name,o.geometry);}});
  const bytes=(g:BufferGeometry)=>Object.fromEntries([...Object.entries(g.attributes),...(g.index?[['index',g.index]as const]:[])].map(([name,a])=>[name,Buffer.from(a.array.buffer,a.array.byteOffset,a.array.byteLength).toString('hex')]));
  const cornerBits=(g:BufferGeometry)=>{
   const attrs=Object.entries(g.attributes).sort(([a],[b])=>a.localeCompare(b)).map(([name,a])=>{expect(a.array).toBeInstanceOf(Float32Array);return{name,size:a.itemSize,bits:new Uint32Array(a.array.buffer,a.array.byteOffset,a.array.length)};});
   const count=g.index?.count??g.getAttribute('position').count;
   return Array.from({length:count/3},(_,i)=>attrs.map(a=>a.name+':'+[0,1,2].flatMap(k=>{const id=g.index?g.index.getX(i*3+k):i*3+k;return Array.from({length:a.size},(_,j)=>a.bits[id*a.size+j]);}).join(',')).join('|'));
  };
  const basinWitness=parisBasinWitness(city),audits=clipEiffelPoolPaving(copy);
  expect(audits).toEqual([basinWitness]);
  const key=(t:Tri)=>t.map(v=>v.toArray().join(',')).join('|');
  copy.traverse(o=>{
   if(!(o instanceof Mesh))return;
   const old=before.get(o.name)!,current=triangles(o.geometry);
   if(o.name!==audits[0]!.sourceMesh){expect(current.map(key)).toEqual(old.map(key));expect(bytes(o.geometry)).toEqual(bytes(beforeGeometry.get(o.name)!));return;}
   const keys=new Set(current.map(key)),affected=new Set(audits[0]!.affectedTriangleOffsets);
   const oldBits=cornerBits(beforeGeometry.get(o.name)!),newBits=new Set(cornerBits(o.geometry));
   old.forEach((tri,i)=>{if(!affected.has(i*3)){expect(keys.has(key(tri))).toBe(true);expect(newBits.has(oldBits[i]!),'unchanged exterior position/normal attribute bytes').toBe(true);}});
   const pool=EIFFEL_EXPO_POOL_PLANS[1]!;
   const near=local(current,pool),beforeNear=local(old,pool);
   for(let x=-9.65;x<9.7;x+=.27)for(let z=310.01;z<319.99;z+=.27)expect(vertical(near,x,z,20,-1)).toBe(-Infinity);
   for(const x of [-9.701,9.701])for(let z=310.01;z<319.99;z+=.13)expect(vertical(near,x,z,20,-1)).toBeCloseTo(vertical(beforeNear,x,z,20,-1),4);
  });
  copy.traverse(o=>{if(o instanceof Mesh)o.geometry.dispose();});
 });
 it('keeps active traffic footprints outside the unchanged basin boundaries',()=>{
  for(let frame=0;frame<=100;frame++)for(const actor of EIFFEL_TRAFFIC_ACTORS){
   const[x,,z]=eiffelTrafficPoseAt(actor,frame*669.880208/100/60,true).position;
   for(const pool of EIFFEL_EXPO_POOL_PLANS)expect(Math.abs(x-pool.x)<pool.width/2+1.05&&Math.abs(z-pool.z)<pool.length/2+1.05).toBe(false);
  }
 });
 it('exports finite nondegenerate prepared terrain triangles with unit face-side normals',()=>{
  const normals=graded.getAttribute('normal');
  for(const t of actualGround)expect(t[1].clone().sub(t[0]).cross(t[2].clone().sub(t[0])).lengthSq()).toBeGreaterThan(1e-13);
  for(let i=0;i<normals.count;i++){const n=new Vector3().fromBufferAttribute(normals,i);expect(Number.isFinite(n.length())).toBe(true);expect(n.length()).toBeGreaterThan(.9);}
 });
});
