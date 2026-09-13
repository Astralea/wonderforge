import { readFileSync } from 'node:fs';
import { BatchedMesh, BufferGeometry, Matrix4, Mesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import { EiffelJointCampaignSystem } from '../src/render/three/EiffelJointCampaignSystem';

type SourceRange = { rank:number; id:string; minY:number; end:number };
function supports(system:EiffelJointCampaignSystem){
  return system.group.children.filter((object):object is Mesh=>object instanceof Mesh&&object.name.startsWith('joint-support-'));
}
function guideSources(system:EiffelJointCampaignSystem){
  const batches:BatchedMesh[]=[];
  system.group.traverse(object=>{if(object instanceof BatchedMesh)batches.push(object);});
  const sources:(SourceRange&{mesh:BatchedMesh;instance:number;source:Mesh})[]=[];
  system.group.traverse(object=>{if(object instanceof Mesh&&object.userData.retirementSource){const metadata=object.userData.retirementSource as SourceRange&{instance:number};const mesh=batches.find(batch=>batch.material===object.material)!;sources.push({...metadata,mesh,source:object});}});
  return sources;
}
function retainedSources(system:EiffelJointCampaignSystem){
  return [...supports(system).flatMap(mesh=>(mesh.userData.retirementSources as SourceRange[]).filter(source=>source.end<=mesh.geometry.drawRange.count)),...guideSources(system).filter(source=>source.mesh.getVisibleAt(source.instance))];
}
function craneInstances(system:EiffelJointCampaignSystem){
  const guides=new Map<BatchedMesh,Set<number>>();
  for(const source of guideSources(system)){const ids=guides.get(source.mesh)??new Set<number>();ids.add(source.instance);guides.set(source.mesh,ids);}
  const instances:{mesh:BatchedMesh; id:number}[]=[];
  system.group.traverse(object=>{if(object instanceof BatchedMesh)for(let id=0;id<object.instanceCount;id++)if(!guides.get(object)?.has(id))instances.push({mesh:object,id});});
  return instances;
}

describe('joint plant rigid dismantling',()=>{
  it('retains the complete support until all crane assemblies are removed, then withdraws at most one full member per frame',async()=>{
    const system=new EiffelJointCampaignSystem();await system.ready;
    try{
      const meshes=supports(system),instances=craneInstances(system);
      expect(meshes).toHaveLength(3);expect(instances.length).toBeGreaterThan(20);
      const peak=retainedSources(system).length;expect(peak).toBe(245);
      let previous=peak,maxChange=0,maxAcceleration=0,lastChange=0;
      const transforms=meshes.map(mesh=>mesh.matrixWorld.toArray());
      for(let frame=0;frame<=12*60;frame++){
        const retirement=frame/(12*60);system.update(135,retirement);
        const retained=retainedSources(system),count=retained.length;
        const craneVisible=instances.filter(instance=>instance.mesh.getVisibleAt(instance.id)).length;
        if(craneVisible>0)expect(count).toBe(peak);
        if(retirement<=.25){expect(count).toBe(245);expect(guideSources(system).filter(source=>source.mesh.getVisibleAt(source.instance))).toHaveLength(219);}
        if(retirement>=.25)expect(craneVisible).toBe(0);
        expect(count).toBeLessThanOrEqual(previous);
        expect(retained.map(source=>source.rank).sort((a,b)=>a-b)).toEqual(Array.from({length:count},(_,rank)=>rank));
        meshes.forEach((mesh,index)=>{
          expect(mesh.matrixWorld.toArray()).toEqual(transforms[index]);
          expect(mesh.frustumCulled).toBe(false);
          expect([0,...(mesh.userData.retirementSources as SourceRange[]).map(source=>source.end)]).toContain(mesh.geometry.drawRange.count);
        });
        const change=previous-count;maxChange=Math.max(maxChange,change);maxAcceleration=Math.max(maxAcceleration,Math.abs(change-lastChange));
        lastChange=change;previous=count;
      }
      expect(previous).toBe(0);expect(maxChange).toBe(1);expect(maxChange/peak).toBeLessThan(.05);expect(maxAcceleration).toBe(1);
    }finally{system.dispose();}
  },30000);

  it('preserves every transformed Blender vertex and the original material draw-call count',async()=>{
    const system=new EiffelJointCampaignSystem();await system.ready;
    try{
      const bytes=readFileSync('public/models/eiffel-joint-campaign/support.glb');
      const asset=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
      asset.scene.updateMatrixWorld(true);
      const sourceMeshes=new Map<string,{geometry:BufferGeometry; matrix:Matrix4}>();
      asset.scene.traverse(object=>{if(object instanceof Mesh)sourceMeshes.set(object.name,{geometry:object.geometry,matrix:object.matrixWorld.clone()});});
      const vector=new Vector3();
      for(const mesh of supports(system)){
        const merged=mesh.geometry.getAttribute('position');let offset=0,lastMinY=-Infinity;
        for(const source of mesh.userData.retirementSources as SourceRange[]){
          const original=sourceMeshes.get(source.id)!;expect(original).toBeTruthy();
          const positions=original.geometry.getAttribute('position');
          let minY=Infinity;
          for(let vertex=0;vertex<positions.count;vertex++){
            vector.fromBufferAttribute(positions,vertex).applyMatrix4(original.matrix);minY=Math.min(minY,vector.y);
            expect(merged.getX(offset+vertex)).toBeCloseTo(vector.x,4);
            expect(merged.getY(offset+vertex)).toBeCloseTo(vector.y,4);
            expect(merged.getZ(offset+vertex)).toBeCloseTo(vector.z,4);
          }
          expect(source.minY).toBeCloseTo(minY,4);expect(source.minY).toBeGreaterThanOrEqual(lastMinY);lastMinY=source.minY;offset+=positions.count;
        }
        expect(offset).toBe(merged.count);
      }
      expect(supports(system)).toHaveLength(3);
      asset.scene.traverse(object=>{if(object instanceof Mesh){object.geometry.dispose();for(const material of Array.isArray(object.material)?object.material:[object.material])material.dispose();}});
    }finally{system.dispose();}
  },30000);

  it('preserves all 219 falsework cuboids inside the original crane material batches',async()=>{
    const system=new EiffelJointCampaignSystem();await system.ready;
    try{
      const bytes=readFileSync('public/models/eiffel-guyenet-ne/crane.glb');
      const asset=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
      const guides=guideSources(system);expect(guides).toHaveLength(219);
      expect(new Set(guides.map(source=>source.mesh)).size).toBe(2);
      for(const guide of guides){
        const sourceName=guide.id.slice(0,guide.id.lastIndexOf('-member-'));
        const member=Number(guide.id.slice(guide.id.lastIndexOf('-member-')+8));
        const original=asset.scene.getObjectByName(sourceName) as Mesh;
        const positions=original.geometry.getAttribute('position');
        const geometryId=guide.mesh.getGeometryIdAt(guide.instance),range=guide.mesh.getGeometryRangeAt(geometryId)!;
        const batched=guide.mesh.geometry.getAttribute('position');
        expect(range.vertexCount).toBe(24);expect(range.indexCount).toBe(36);
        for(let vertex=0;vertex<24;vertex++){
          expect(batched.getX(range.vertexStart+vertex)).toBe(positions.getX(member*24+vertex));
          expect(batched.getY(range.vertexStart+vertex)).toBe(positions.getY(member*24+vertex));
          expect(batched.getZ(range.vertexStart+vertex)).toBe(positions.getZ(member*24+vertex));
        }
        for(let index=0;index<36;index++)expect(guide.mesh.geometry.index!.getX(range.indexStart+index)-range.vertexStart).toBe(original.geometry.index!.getX(member*36+index)-member*24);
        const matrix=new Matrix4();guide.mesh.getMatrixAt(guide.instance,matrix);matrix.premultiply(guide.mesh.matrixWorld);
        const actualMinY=guide.source.geometry.boundingBox!.clone().applyMatrix4(matrix).min.y;
        expect(guide.minY).toBeCloseTo(actualMinY,4);
      }
      asset.scene.traverse(object=>{if(object instanceof Mesh){object.geometry.dispose();for(const material of Array.isArray(object.material)?object.material:[object.material])material.dispose();}});
    }finally{system.dispose();}
  },30000);

  it('restores the exact original render state on reverse seeks, including rope and equipment batches',async()=>{
    const system=new EiffelJointCampaignSystem();await system.ready;
    try{
      system.update(135);
      const baseline:{mesh:Mesh; visible:boolean; matrix:number[]; drawRange:{start:number;count:number}}[]=[];
      system.group.traverse(object=>{if(object instanceof Mesh)baseline.push({mesh:object,visible:object.visible,matrix:object.matrixWorld.toArray(),drawRange:{...object.geometry.drawRange}});});
      const instances=craneInstances(system);
      for(const retirement of [.2,.9,1,.5,0])system.update(135,retirement);
      for(const state of baseline){expect(state.mesh.visible).toBe(state.visible);expect(state.mesh.matrixWorld.toArray()).toEqual(state.matrix);expect(state.mesh.geometry.drawRange).toEqual(state.drawRange);}
      expect(instances.every(instance=>instance.mesh.getVisibleAt(instance.id))).toBe(true);
      system.update(135,.0001);
      for(const state of baseline.filter(state=>!state.mesh.name.startsWith('joint-support-')&&!(state.mesh instanceof BatchedMesh)&&state.visible))expect(state.mesh.visible).toBe(false);
    }finally{system.dispose();}
  },30000);

  it('retains a retirement requested before asynchronous loading completes',async()=>{
    const system=new EiffelJointCampaignSystem();system.update(135,1);await system.ready;
    try{expect(retainedSources(system)).toHaveLength(0);expect(craneInstances(system).every(instance=>!instance.mesh.getVisibleAt(instance.id))).toBe(true);}
    finally{system.dispose();}
  },30000);
});
