import {expect,it}from'vitest';
import{BatchedMesh,Box3,BufferGeometry,DoubleSide,Mesh,MeshStandardMaterial,Raycaster,Vector3}from'three';
import{EiffelEnvironment}from'../src/render/three/EiffelEnvironment';
function records(g:BufferGeometry){const names=Object.keys(g.attributes).sort(),index=g.index,n=index?.count??g.getAttribute('position').count,result=new Map<string,number>();for(let i=0;i<n;i+=3){const values=[];for(let j=0;j<3;j++){const v=index?index.getX(i+j):i+j;for(const name of names){const a=g.attributes[name]!;for(let k=0;k<a.itemSize;k++)values.push(a.array[v*a.itemSize+k]);}}const key=values.join(',');result.set(key,(result.get(key)??0)+1);}return result;}
it('preserves every complete excavated terrain triangle/attribute, exact bounds and support rays in64 individually culled cells',()=>{
 const material=new MeshStandardMaterial({side:DoubleSide});
 const holder=Object.create(EiffelEnvironment.prototype)as any;Object.assign(holder,{rebuiltTower:true,geometries:[],terrainBatch:null});
 const batch=holder.createTerrain(material)as BatchedMesh,source=holder.geometries[0]as BufferGeometry;
 expect(batch).toBeInstanceOf(BatchedMesh);expect(batch.userData.terrainCells.length).toBeLessThanOrEqual(64);expect(batch.instanceCount).toBe(batch.userData.terrainCells.length);
 expect(batch.perObjectFrustumCulled).toBe(true);expect(batch.frustumCulled).toBe(false);expect(batch.sortObjects).toBe(false);expect(batch.material).toBe(material);expect(batch.receiveShadow).toBe(true);
 expect(Object.keys(batch.geometry.attributes).sort()).toEqual(Object.keys(source.attributes).sort());
 const expected=records(source),actual=records(batch.geometry);expect(actual.size).toBe(expected.size);for(const[k,count]of expected)expect(actual.get(k)).toBe(count);
 source.computeBoundingBox();const bounds=new Box3();for(const c of batch.userData.terrainCells){const box=batch.getBoundingBoxAt(c.geometryId,new Box3())!;expect(box.isEmpty()).toBe(false);bounds.union(box);}expect(bounds.min.toArray()).toEqual(source.boundingBox!.min.toArray());expect(bounds.max.toArray()).toEqual(source.boundingBox!.max.toArray());
 const original=new Mesh(source,material),ray=new Raycaster();original.updateMatrixWorld(true);batch.updateMatrixWorld(true);
 for(const x of[-420,-210,-35,0,35,210,420])for(const z of[-240,-100,0,60,130,220]){ray.set(new Vector3(x,100,z),new Vector3(0,-1,0));const a=ray.intersectObject(original)[0],b=ray.intersectObject(batch)[0];expect(!!b).toBe(!!a);if(a&&b)expect(b.point.distanceTo(a.point)).toBeLessThan(1e-9);}
 let originalDisposed=0,packedDisposed=0;source.addEventListener('dispose',()=>originalDisposed++);batch.geometry.addEventListener('dispose',()=>packedDisposed++);batch.dispose();expect(packedDisposed).toBe(1);expect(originalDisposed).toBe(0);source.dispose();expect(originalDisposed).toBe(1);material.dispose();
});
