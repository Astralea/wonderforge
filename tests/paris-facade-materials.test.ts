import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {describe,it,expect,vi} from 'vitest';
import {PNG} from 'pngjs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Mesh,MeshStandardMaterial,BatchedMesh,Vector3,LinearMipmapLinearFilter,SRGBColorSpace,RepeatWrapping} from 'three';
import {loadEiffelParisCity} from '../src/render/three/eiffelParis';

const assetPath='public/models/paris-1889/paris-city.glb';
const digest=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
describe('Paris embedded facade material',()=>{
 it('embeds the actual generated image with UVs and repeat sampling, not a missing external link',()=>{
  const bytes=readFileSync(assetPath),jsonLength=bytes.readUInt32LE(12);
  const gltf=JSON.parse(bytes.subarray(20,20+jsonLength).toString());
  const material=gltf.materials.find((m:{name:string})=>m.name.startsWith('paris-masonry-facade'));
  const texture=gltf.textures[material.pbrMetallicRoughness.baseColorTexture.index];
  const image=gltf.images[texture.source],view=gltf.bufferViews[image.bufferView];
  expect(image.uri).toBeUndefined();expect(image.mimeType).toBe('image/png');
  const start=28+jsonLength+(view.byteOffset??0);
  const embedded=PNG.sync.read(bytes.subarray(start,start+view.byteLength));
  const original=PNG.sync.read(readFileSync('public/models/paris-1889/textures/paris-frontages-v2.png'));
  expect([embedded.width,embedded.height]).toEqual([original.width,original.height]);
  expect(digest(embedded.data)).toBe(digest(original.data));
  const sampler=gltf.samplers[texture.sampler];expect(sampler.wrapS??10497).toBe(10497);
 });

 it('preserves actual source roughness and metalness per corner through every batching merge',async()=>{
  const bytes=readFileSync(assetPath);
  const source=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;
  source.updateMatrixWorld(true);
  const expected=new Set<string>(),actual=new Set<string>(),p=new Vector3();
  const key=(x:number,y:number,z:number,r:number,m:number)=>[x,y,z,r,m].map(Math.fround).join(':');
  const roles=new Set<string>();
  source.traverse(o=>{if(!(o instanceof Mesh))return;
   const mat=o.material as MeshStandardMaterial,pos=o.geometry.attributes.position!,idx=o.geometry.index;
   for(let i=0;i<(idx?.count??pos.count);i++){const id=idx?idx.getX(i):i;p.fromBufferAttribute(pos,id).applyMatrix4(o.matrixWorld);expected.add(key(p.x,p.y,p.z,mat.roughness,mat.metalness));}
   roles.add(`${mat.roughness}:${mat.metalness}`);
  });
  const city=await loadEiffelParisCity(),batch=city.children[0] as BatchedMesh;
  const pos=batch.geometry.attributes.position!,pbr=batch.geometry.attributes.parisPbr!;
  expect(roles.size).toBeGreaterThan(5);expect(pbr.count).toBe(pos.count);
  for(let i=0;i<pos.count;i++)actual.add(key(pos.getX(i),pos.getY(i),pos.getZ(i),pbr.getX(i),pbr.getY(i)));
  // Paving clipping may add corners, but each output material pair must come
  // from the source and all source roof/facade pairs must survive merging.
  const sourcePairs=new Set([...expected].map(k=>k.split(':').slice(-2).join(':')));
  const outputPairs=new Set([...actual].map(k=>k.split(':').slice(-2).join(':')));
  expect(outputPairs).toEqual(sourcePairs);
  for(const k of actual)if(expected.has(k))expected.delete(k);
  // Only pool underbed clipping removes source paving corners.
  const remaining=[...expected];
  expect(remaining.every(k=>{const [x,,z]=k.split(':').map(Number);return Math.abs(x!)<12&&z!>195&&z!<325;})).toBe(true);
  const material=batch.material as MeshStandardMaterial;
  const shader={vertexShader:'#include <begin_vertex>',fragmentShader:'#include <map_fragment>\n#include <roughnessmap_fragment>\n#include <metalnessmap_fragment>\n#include <color_fragment>',uniforms:{}};
  material.onBeforeCompile(shader as never,{} as never);
  expect(shader.fragmentShader).toContain('roughnessFactor = vParisPbr.x');
  expect(shader.fragmentShader).toContain('metalnessFactor = vParisPbr.y');
  batch.dispose();material.dispose();
  source.traverse(o=>{if(o instanceof Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});
 },30000);

 it('preserves every mapped source corner through spatial batching and disposes the texture once',async()=>{
  const bytes=readFileSync(assetPath);
  const source=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;
  source.updateMatrixWorld(true);
  const expected=new Set<string>(),actual=new Set<string>(),p=new Vector3(),frontageStarts=new Set<number>();
  const key=(x:number,y:number,z:number,u:number,v:number)=>[Math.fround(x),Math.fround(y),Math.fround(z),u,v].join(':');
  source.traverse(o=>{if(!(o instanceof Mesh)||o.userData.wf_material!=='masonry-facade')return;
   const pos=o.geometry.attributes.position!,uv=o.geometry.attributes.uv!,idx=o.geometry.index;
   for(let i=0;i<(idx?.count??pos.count);i++){const v=idx?idx.getX(i):i;p.fromBufferAttribute(pos,v).applyMatrix4(o.matrixWorld);expected.add(key(p.x,p.y,p.z,uv.getX(v),uv.getY(v)));
    // Every exported wall corner ends at a whole frontage, not midway through
    // a doorway. Check actual GLB UVs, including negative/repeated coordinates.
    const quarter=uv.getX(v)*4;expect(quarter).toBeCloseTo(Math.round(quarter),5);
    frontageStarts.add(((Math.round(quarter)%4)+4)%4);
   }
  });
  expect([...frontageStarts].sort()).toEqual([0,1,2,3]);
  const city=await loadEiffelParisCity(),batch=city.children[0] as BatchedMesh;
  const pos=batch.geometry.attributes.position!,uv=batch.geometry.attributes.uv!,surface=batch.geometry.attributes.parisSurface!;
  let mappedCorners=0;
  for(let i=0;i<pos.count;i++)if(surface.getX(i)===2){actual.add(key(pos.getX(i),pos.getY(i),pos.getZ(i),uv.getX(i),uv.getY(i)));mappedCorners++;}
  expect(mappedCorners).toBeGreaterThan(9000);expect([...actual].sort()).toEqual([...expected].sort());
  const material=batch.material as MeshStandardMaterial,map=material.map!;
  const bitmap=map.image as ImageBitmap;
  expect(map).toBeTruthy();expect(bitmap.width).toBe(1774);expect(bitmap.height).toBe(887);
  expect(map.colorSpace).toBe(SRGBColorSpace);expect(map.minFilter).toBe(LinearMipmapLinearFilter);
  expect(map.generateMipmaps).toBe(true);expect(map.wrapS).toBe(RepeatWrapping);expect(map.anisotropy).toBe(8);
  const dispose=vi.spyOn(map,'dispose'),close=vi.spyOn(bitmap,'close');
  material.dispose();material.dispose();expect(dispose).toHaveBeenCalledTimes(1);expect(close).toHaveBeenCalledTimes(1);batch.dispose();
  source.traverse(o=>{if(o instanceof Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){if(m instanceof MeshStandardMaterial)m.map?.dispose();m.dispose();}}});
 },30000);
});
