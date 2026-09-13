import {expect,it} from 'vitest';
import {BatchedMesh,Color,InstancedMesh,Matrix4} from 'three';
import {getWonder} from '../src/data';
import {EiffelEnvironment} from '../src/render/three/EiffelEnvironment';
import {createMaterialLibrary} from '../src/render/three/MaterialLibrary';

it('preserves every actual static tree matrix/color/geometry while enabling per-tree culling and independent packed disposal',async()=>{
 const env=new EiffelEnvironment(createMaterialLibrary(getWonder('eiffel-tower')),true);await env.ready;
 const view=env as unknown as {trees:InstancedMesh;trunks:InstancedMesh;staticTreeBatches:BatchedMesh[]};
 expect(view.staticTreeBatches).toHaveLength(2);
 const a=new Matrix4(),b=new Matrix4(),ca=new Color(),cb=new Color(),packedDisposals:number[]=[];
 for(const [i,source] of [view.trees,view.trunks].entries()){
  const batch=view.staticTreeBatches[i]!;expect(source.count).toBe(60);expect(source.visible).toBe(false);
  expect(batch.instanceCount).toBe(source.count);expect(batch.material).toBe(source.material);
  expect(batch.castShadow).toBe(source.castShadow);expect(batch.receiveShadow).toBe(source.receiveShadow);
  expect(batch.frustumCulled).toBe(false);expect(batch.perObjectFrustumCulled).toBe(true);expect(batch.sortObjects).toBe(false);
  for(let j=0;j<source.count;j++){source.getMatrixAt(j,a);batch.getMatrixAt(j,b);expect(b.elements).toEqual(a.elements);if(source.instanceColor){source.getColorAt(j,ca);batch.getColorAt(j,cb);expect(cb.toArray()).toEqual(ca.toArray());}}
  for(const name of Object.keys(source.geometry.attributes)){
   const expected=source.geometry.attributes[name]!,actual=batch.geometry.attributes[name]!;
   expect(Array.from(actual.array).slice(0,expected.array.length)).toEqual(Array.from(expected.array));
  }
  if(source.geometry.index)expect(Array.from(batch.geometry.index!.array).slice(0,source.geometry.index.count)).toEqual(Array.from(source.geometry.index.array));
  packedDisposals[i]=0;batch.geometry.addEventListener('dispose',()=>packedDisposals[i]!++);
 }
 env.dispose();expect(packedDisposals).toEqual([1,1]);expect(view.staticTreeBatches).toHaveLength(0);
},30000);
