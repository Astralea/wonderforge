import {describe,it,expect} from 'vitest';
import {Mesh,InstancedMesh,BatchedMesh,Matrix4,Vector3} from 'three';
import {EiffelGroundLiftSystem} from '../src/render/three/EiffelGroundLiftSystem';
import {sampleEiffelGroundLiftPilot} from '../src/engine/eiffelGroundLiftPilot';
import {EIFFEL_GROUND_STATION_ERECTION_READY,sampleEiffelGroundStationErection} from '../src/engine/eiffelGroundStationErection';
import {sampleEiffelFoundationCrew} from '../src/engine/eiffelFoundationCrew';
import {sampleEiffelGroundRiggers} from '../src/engine/eiffelGroundRiggers';
describe('actual Blender ground-lift renderer',()=>{
 it('matches the sampled hoist apex with the articulated exported jib throughout the passage',async()=>{
  const system=new EiffelGroundLiftSystem();await system.ready;system.setFourStations(true);
  try{
   for(const seconds of [0,10,14,20,26,29,32,36,40,46,49,55]){
    system.update(seconds);
    expect(system.group.userData.tipResidual,`tip at ${seconds}s`).toBeLessThan(.00001);
    system.group.traverse(o=>{
     if(!(o instanceof Mesh))return;
     expect(o.matrixWorld.elements.every(Number.isFinite)).toBe(true);
     if(o instanceof InstancedMesh){
      const sources:Mesh[]=[];
      system.group.traverse(source=>{if(source instanceof Mesh && !source.visible && source.geometry===o.geometry && source.material===o.material)sources.push(source);});
      expect(o.count).toBe(sources.length*4);
      expect(o.frustumCulled).toBe(false);
      for(let i=0;i<o.count;i++){
       const matrix=new Matrix4();o.getMatrixAt(i,matrix);matrix.premultiply(o.matrixWorld);
       const expected=sources[i%sources.length].matrixWorld.clone().premultiply(new Matrix4().makeRotationY(Math.floor(i/sources.length)*Math.PI/2));
       matrix.elements.forEach((v,k)=>expect(v).toBeCloseTo(expected.elements[k],4));
      }
     }
    });
   }
   const shared:BatchedMesh[]=[];system.group.traverse(o=>{if(o instanceof BatchedMesh && o.visible)shared.push(o);});
   expect(shared.length).toBeGreaterThan(0);
   const sourceRig=system.group.children.find(o=>o.userData.materialBatches)!;
   expect(shared.length).toBe(sourceRig.userData.materialBatches);
   expect(shared.reduce((n,b)=>n+b.instanceCount,0)).toBe(sourceRig.userData.sourceMeshes*4);
   expect(system.group.userData.stationCount).toBe(4);
   system.setFourStations(false);
   for(const batch of shared)for(let i=0;i<batch.instanceCount;i++)expect(batch.getVisibleAt(i)).toBe(i<batch.instanceCount/4);
   system.group.traverse(o=>{if(o instanceof InstancedMesh && !o.name.startsWith('ground-station-support-'))expect(o.count).toBe(o.instanceMatrix.count/4);});
   system.setFourStations(true);
   for(const batch of shared)for(let i=0;i<batch.instanceCount;i++)expect(batch.getVisibleAt(i)).toBe(true);
   // The renderer owns equipment only; the production kit owns exactly one load.
   expect(system.group.getObjectByName('lower-ne-02-m013-c003')).toBeUndefined();
   const p=system.group.getWorldPosition(new Vector3());expect(p.toArray()).toEqual([0,0,0]);
  }finally{system.dispose();}
 },30000);
 it('hides only the NE four-station copy so a later chapter can occupy that pad',async()=>{
  const system=new EiffelGroundLiftSystem();await system.ready;system.setFourStations(true);system.setSuppressedStations(['ne']);
  try{
   system.update(30,EIFFEL_GROUND_STATION_ERECTION_READY);
   expect(system.group.userData.stationCount).toBe(4);
   expect(system.group.userData.visibleStationCount).toBe(3);
   const shared:BatchedMesh[]=[];system.group.traverse(o=>{if(o instanceof BatchedMesh && o.name.startsWith('ground-four-station-batch-'))shared.push(o);});
   expect(shared.length).toBeGreaterThan(0);
   for(const batch of shared){
    const perStation=batch.instanceCount/4;
    for(let i=0;i<batch.instanceCount;i++)expect(batch.getVisibleAt(i),batch.name).toBe(i>=perStation);
   }
   system.group.traverse(o=>{
    if(!(o instanceof InstancedMesh) || o.name.startsWith('ground-station-support-'))return;
    const sources:Mesh[]=[];
    system.group.traverse(source=>{if(source instanceof Mesh && !source.visible && source.geometry===o.geometry && source.material===o.material)sources.push(source);});
    expect(o.count).toBe(sources.length*3);
    for(let i=0;i<o.count;i++){
     const matrix=new Matrix4();o.getMatrixAt(i,matrix);matrix.premultiply(o.matrixWorld);
     const expected=sources[i%sources.length]!.matrixWorld.clone().premultiply(new Matrix4().makeRotationY((Math.floor(i/sources.length)+1)*Math.PI/2));
     matrix.elements.forEach((v,k)=>expect(v).toBeCloseTo(expected.elements[k],4));
    }
   });
   system.setSuppressedStations([]);
   expect(system.group.userData.visibleStationCount).toBe(4);
   for(const batch of shared)for(let i=0;i<batch.instanceCount;i++)expect(batch.getVisibleAt(i)).toBe(true);
  }finally{system.dispose();}
 },30000);
 it('builds falsework from the pads instead of showing four finished machines',async()=>{
  const system=new EiffelGroundLiftSystem();await system.ready;system.setFourStations(true);
  try{
   const opening=sampleEiffelGroundStationErection(0),mid=sampleEiffelGroundStationErection(4),ready=EIFFEL_GROUND_STATION_ERECTION_READY;
   system.update(0,opening);
   expect(system.group.userData.erection.seated).toBe(0);
   expect(system.group.userData.erection.operational).toBe(false);
   const stationBatches=()=>{const found:BatchedMesh[]=[];system.group.traverse(o=>{if(o instanceof BatchedMesh && o.name.startsWith('ground-four-station-batch-'))found.push(o);});return found;};
   system.group.traverse(o=>{if(o instanceof InstancedMesh && o.name.startsWith('ground-station-support-'))expect(o.count).toBe(0);});
   for(const batch of stationBatches())for(let i=0;i<batch.instanceCount;i++)expect(batch.getVisibleAt(i),batch.name).toBe(false);
   system.update(0,mid);
   const timber=system.group.getObjectByName('ground-station-support-timber') as InstancedMesh;
   const iron=system.group.getObjectByName('ground-station-support-iron') as InstancedMesh;
   expect(timber.count+iron.count).toBe(mid.seatedSupportCount*4);
   expect(timber.count+iron.count).toBeGreaterThan(0);
   for(const batch of stationBatches())for(let i=0;i<batch.instanceCount;i++)expect(batch.getVisibleAt(i)).toBe(false);
   system.update(0,ready);
   expect(timber.count+iron.count).toBe(0);
   for(const batch of stationBatches())for(let i=0;i<batch.instanceCount;i++)expect(batch.getVisibleAt(i)).toBe(true);
  }finally{system.dispose();}
 },30000);
 it('renders the cart hand support and sling contacts at their sampled world positions',async()=>{
  const system=new EiffelGroundLiftSystem();await system.ready;system.setFourStations(true);
  try{
   for(const seconds of [0,5,10,12,13,13.5,13.9,14,14.2,15,30,55]){
    system.update(seconds);
    const state=sampleEiffelGroundLiftPilot(seconds);
    const pushers=sampleEiffelFoundationCrew({center:state.carrier.bedPose.position,
      size:[state.carrier.bedSize[2],state.carrier.bedSize[1],state.carrier.bedSize[0]],
      steering:{yaw:Math.PI/2,distance:state.carrier.distance,walking:state.carrier.moving}});
    const bar=system.group.getObjectByName('ground-cart-push-crossbar')!;
    for(const person of pushers.crew)for(const arm of person.arms){
     const local=bar.worldToLocal(new Vector3(...arm.hand));
     expect(Math.abs(local.x)).toBeLessThanOrEqual(.5);expect(Math.abs(local.y)).toBeLessThanOrEqual(.5);expect(Math.abs(local.z)).toBeLessThanOrEqual(.5);
    }
    sampleEiffelGroundRiggers(seconds).workers.forEach((worker,i)=>{
     const waiting=sampleEiffelGroundRiggers(0).workers[i];
     expect(worker.leftFoot.center).toEqual(waiting.leftFoot.center);expect(worker.rightFoot.center).toEqual(waiting.rightFoot.center);
     [worker.arms.left,worker.arms.right].forEach((arm,j)=>{
      expect(arm.upperLength).toBeLessThanOrEqual(.41);expect(arm.forearmLength).toBeLessThanOrEqual(.41);
      const mesh=system.group.getObjectByName(`ground-slinger-${i}-hand-${j}`)!;
      expect(mesh.getWorldPosition(new Vector3()).distanceTo(new Vector3(...arm.hand))).toBeLessThan(1e-7);
     });
    });
   }
  }finally{system.dispose();}
 },30000);
});
