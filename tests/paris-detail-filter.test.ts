import {readFileSync} from 'node:fs';
import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {BatchedMesh,Mesh,MeshStandardMaterial,Vector3,type Group} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {analyzeParisDetail,configureParisDetail,parisBandCoverage} from '../src/render/three/eiffelParisDetail';
import {loadEiffelParisCity} from '../src/render/three/eiffelParis';
import {clipEiffelPoolPaving} from '../src/render/three/eiffelPoolPaving';
import {parisBasinWitness} from './helpers/paris-basin-witness';
let source:Group;
beforeAll(async()=>{const b=readFileSync('public/models/paris-1889/paris-city.glb');source=(await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;source.updateMatrixWorld(true);},30000);
afterAll(()=>source.traverse(o=>{if(o instanceof Mesh){o.geometry.dispose();for(const material of Array.isArray(o.material)?o.material:[o.material])material.dispose();}}));
describe('Actual exported Paris detail filtering',()=>{
 it('captures only independent palette values for later shader compilation',()=>{
  const analysis=analyzeParisDetail(source),palette=analysis.colors,material=new MeshStandardMaterial();
  configureParisDetail(material,analysis);
  // Compiling must not dereference the analysis that holds imported meshes.
  Object.defineProperty(analysis,'colors',{get(){throw Error('Retained full source analysis');}});
  const shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <emissivemap_fragment>'} as Parameters<MeshStandardMaterial['onBeforeCompile']>[0];
  material.onBeforeCompile(shader,null as unknown as Parameters<MeshStandardMaterial['onBeforeCompile']>[1]);
  for(const[name,color]of Object.entries(palette)){
   const uniform=shader.uniforms[`uParisDetail${name[0]!.toUpperCase()+name.slice(1)}`]!;
   expect(uniform.value).not.toBe(color);expect(uniform.value).toEqual(color);
  }
  material.dispose();
 });
 it('recognizes each bar/pane and roof support while retaining both outer rib silhouettes',()=>{
  const a=analyzeParisDetail(source);expect(a.enabled,a.reason).toBe(true);
  expect(a.counts).toEqual({panes:84,horizontalBars:84,verticalBars:84,roofTriangles:36,ribSegments:378,retainedEndSegments:36});
  const counts=new Map<number,number>();
  for(const[mesh,records]of a.triangles)for(const[offset,d]of records){
   counts.set(d.info[0],(counts.get(d.info[0])??0)+1);
   expect(d.normal.every(Number.isFinite)).toBe(true);expect(Math.hypot(...d.normal)).toBeCloseTo(1,6);
   if(d.info[0]===5){const p=mesh.geometry.attributes.position!,idx=mesh.geometry.index;for(let i=0;i<3;i++)expect(Math.abs(new Vector3().fromBufferAttribute(p,idx?idx.getX(offset+i):offset+i).applyMatrix4(mesh.matrixWorld).x)).toBeLessThan(149);}
  }
  expect(Object.fromEntries(counts)).toEqual({1:588,2:168,3:168,4:36,5:4104});
 });
 it('falls back to unchanged rendering when an actual bar no longer matches the admitted geometry',()=>{
  const a=analyzeParisDetail(source),entry=[...a.triangles].find(([mesh])=>mesh.userData.wf_material==='iron')!;
  const mesh=entry[0],offset=entry[1].keys().next().value!,attribute=mesh.geometry.attributes.position!,index=mesh.geometry.index,index0=index?index.getX(offset):offset,old=attribute.getX(index0);
  try{attribute.setX(index0,old+.05);const invalid=analyzeParisDetail(source);expect(invalid.enabled).toBe(false);expect(invalid.triangles.size).toBe(0);}finally{attribute.setX(index0,old);}
 });
 it('carries exact feature metadata through every spatial split without removing or moving source corners',async()=>{
  // Spec25 exception is limited to the basin's thirty audited paving inputs;
  // all architectural corners and filtering metadata remain exact.
  const prepared=source.clone(true);prepared.traverse(o=>{if(o instanceof Mesh)o.geometry=o.geometry.clone();});
  const basin=parisBasinWitness(source);
  let sourceTriangles=0;source.traverse(o=>{if(o instanceof Mesh)sourceTriangles+=(o.geometry.index?.count??o.geometry.attributes.position!.count)/3;});
  const clipping=clipEiffelPoolPaving(prepared);
  expect(clipping).toEqual([basin]);
  const a=analyzeParisDetail(prepared),expected=new Map<string,number>(),p=new Vector3();
  const key=(point:number[],meta:number[])=>[...point.map(Math.fround),...meta.map(Math.fround)].join(':');
  prepared.traverse(o=>{if(!(o instanceof Mesh))return;const pos=o.geometry.attributes.position!,idx=o.geometry.index;
   for(let offset=0;offset<(idx?.count??pos.count);offset+=3)for(let j=0;j<3;j++){
    p.fromBufferAttribute(pos,idx?idx.getX(offset+j):offset+j).applyMatrix4(o.matrixWorld);
    const d=a.triangles.get(o)?.get(offset),k=key(p.toArray(),d?[...d.info,...d.dimensions,...d.normal]:Array(11).fill(0));expected.set(k,(expected.get(k)??0)+1);
   }
  });
  const city=await loadEiffelParisCity(),batch=city.children[0] as BatchedMesh,actual=new Map<string,number>();
  const geometry=batch.geometry,pos=geometry.attributes.position!,info=geometry.attributes.parisDetailInfo!,dimensions=geometry.attributes.parisDetailDimensions!,normal=geometry.attributes.parisDetailNormal!;
  for(let i=0;i<pos.count;i++){
   const k=key([pos.getX(i),pos.getY(i),pos.getZ(i)],[info.getX(i),info.getY(i),info.getZ(i),info.getW(i),dimensions.getX(i),dimensions.getY(i),dimensions.getZ(i),dimensions.getW(i),normal.getX(i),normal.getY(i),normal.getZ(i)]);actual.set(k,(actual.get(k)??0)+1);
  }
  expect(pos.count).toBe((sourceTriangles-12)*3);expect(actual.size).toBe(expected.size);
  for(const[k,n]of expected)if(actual.get(k)!==n)throw Error('Source corner/metadata count differs: '+k);
  expect(city.userData.detailFilter.enabled).toBe(true);expect(city.children).toHaveLength(1);expect(batch.perObjectFrustumCulled).toBe(true);
  prepared.traverse(o=>{if(o instanceof Mesh)o.geometry.dispose();});
  batch.dispose();for(const material of Array.isArray(batch.material)?batch.material:[batch.material])material.dispose();
 },30000);
 it('preserves integrated band area and continuously reduces contrast below a pixel',()=>{
  for(const width of[.14,.22,.32])for(const span of[.01,.14,.7,2]){
   const limit=(width+span)/2+.01,n=4000,dx=2*limit/n;let area=0;
   for(let i=0;i<n;i++){const x=-limit+(i+.5)*dx,v=parisBandCoverage(x,width,span);expect(v).toBeGreaterThanOrEqual(0);expect(v).toBeLessThanOrEqual(1);area+=v*dx;}
   expect(area).toBeCloseTo(width,5);
   expect(parisBandCoverage(0,width,span)).toBeCloseTo(Math.min(1,width/span),9);
   const edge=(width+span)/2;expect(Math.abs(parisBandCoverage(edge-1e-7,width,span)-parisBandCoverage(edge+1e-7,width,span))).toBeLessThan(1e-4);
  }
 });
});
