import {describe,it,expect} from 'vitest';
import {Box3,InstancedMesh,Matrix4,Mesh,Vector3} from 'three';
import {EiffelJointCampaignSystem} from '../src/render/three/EiffelJointCampaignSystem';
import {sampleEiffelJointCampaign} from '../src/engine/eiffelJointCampaign';
import {sampleEiffelFoundationCrew} from '../src/engine/eiffelFoundationCrew';
import {sampleEiffelJointRiggers} from '../src/engine/eiffelJointRiggers';

describe('actual Eiffel joint-campaign equipment renderer',()=>{
 it('loads the authored support and two carts without duplicating either kit load',async()=>{
  const system=new EiffelJointCampaignSystem();await system.ready;
  try{
   expect(system.group.getObjectByName('joint-cart-0')).toBeTruthy();expect(system.group.getObjectByName('joint-cart-1')).toBeTruthy();
   expect(system.group.children.filter(o=>o.name.startsWith('joint-support-')).length).toBeGreaterThan(0);
   expect(system.group.children.filter(o=>o.name.startsWith('joint-support-')).length).toBeLessThanOrEqual(3);
   expect(system.group.getObjectByName('lower-ne-02-m012-c001')).toBeUndefined();expect(system.group.getObjectByName('lower-ne-02-m012-c002')).toBeUndefined();
   expect(system.group.getObjectByName('joint-campaign-hook')).toBeTruthy();
   for(let i=0;i<5;i++)expect(system.group.getObjectByName(`joint-campaign-rope-${i}`)).toBeTruthy();
   for(let i=0;i<20;i++)expect(system.group.getObjectByName(`joint-campaign-basket-segment-${i}`)).toBeTruthy();
  }finally{system.dispose();}
 },30000);

 it('keeps all four captive basket loops on their loads at the authored radius and length',async()=>{
  const system=new EiffelJointCampaignSystem();await system.ready;const a=new Vector3(),b=new Vector3();
  try{for(const seconds of [0,10,14,15,31,65,78,82,83,114,126,135]){
   system.update(seconds);const sample=sampleEiffelJointCampaign(seconds);expect(sample.basketLoops).toHaveLength(4);
   let segmentIndex=0;
   for(const loop of sample.basketLoops){let renderedLength=0;expect(loop.points).toHaveLength(6);for(let pointIndex=1;pointIndex<loop.points.length;pointIndex++){
    const mesh=system.group.getObjectByName(`joint-campaign-basket-segment-${segmentIndex++}`) as Mesh;expect(mesh).toBeTruthy();
    a.set(0,-.5,0).applyMatrix4(mesh.matrixWorld);b.set(0,.5,0).applyMatrix4(mesh.matrixWorld);
    expect(a.distanceTo(new Vector3(...loop.points[pointIndex-1]!))).toBeLessThan(1e-7);expect(b.distanceTo(new Vector3(...loop.points[pointIndex]!))).toBeLessThan(1e-7);renderedLength+=a.distanceTo(b);
    const positions=mesh.geometry.getAttribute('position');let radius=0;for(let vertex=0;vertex<positions.count;vertex++)radius=Math.max(radius,Math.hypot(positions.getX(vertex),positions.getZ(vertex)));expect(radius).toBeCloseTo(.015,6);
   }expect(renderedLength).toBeCloseTo(loop.length,7);}
   expect(segmentIndex).toBe(20);
  }}finally{system.dispose();}
 },30000);

 it('matches both authored cart poses, grounded wheels and crew hands on each crossbar',async()=>{
  const system=new EiffelJointCampaignSystem();await system.ready;const endpoint=new Vector3();
  try{
   for(const seconds of [0,5,10,15,25,31,64.9,65,71,78,82,100,129]){
    system.update(seconds);const state=sampleEiffelJointCampaign(seconds);
    state.carriers.forEach((carrier,cartIndex)=>{
     const cart=system.group.getObjectByName(`joint-cart-${cartIndex}`)!;
     expect(cart.position.x).toBeCloseTo(carrier.bedPose.position[0],8);expect(cart.position.z).toBeCloseTo(carrier.bedPose.position[2],8);
     expect(cart.quaternion.toArray()).toEqual(expect.arrayContaining(carrier.bedPose.quaternion.map(v=>expect.closeTo(v,7))));
     const wheels:TObject[]= [];
     cart.traverse(o=>{if(typeof o.userData.wf_role==='string'&&o.userData.wf_role.startsWith('cart-wheel-'))wheels.push(o);});
     expect(wheels).toHaveLength(4);wheels.sort((a,b)=>String(a.userData.wf_role).localeCompare(String(b.userData.wf_role)));
     const expected=[...carrier.wheelCenters].sort((a,b)=>a[0]-b[0]||a[2]-b[2]);const actual=wheels.map(w=>w.getWorldPosition(new Vector3()).toArray()).sort((a,b)=>a[0]!-b[0]!||a[2]!-b[2]!);
     actual.forEach((center,i)=>{expect(new Vector3(...center).distanceTo(new Vector3(...expected[i]!))).toBeLessThan(5e-6);expect(center[1]!-carrier.wheelRadius).toBeCloseTo(carrier.groundY,7);});
     const crew=sampleEiffelFoundationCrew({center:carrier.bedPose.position,size:[carrier.bedSize[2],carrier.bedSize[1],carrier.bedSize[0]],steering:{yaw:Math.PI/2-carrier.steeringYaw,distance:carrier.distance,walking:carrier.moving}});
     crew.crew.forEach((person,personIndex)=>person.arms.forEach((arm,armIndex)=>{
      const mesh=system.group.getObjectByName(`joint-cart-${cartIndex}-pusher-${personIndex}-arm-${armIndex}`) as Mesh;
      endpoint.set(0,.5,0).applyMatrix4(mesh.matrixWorld);expect(endpoint.distanceTo(new Vector3(...arm.hand))).toBeLessThan(1e-7);
      const barA=new Vector3(...crew.bar[0]),barB=new Vector3(...crew.bar[1]),direction=barB.clone().sub(barA),t=endpoint.clone().sub(barA).dot(direction)/direction.lengthSq();
      expect(t).toBeGreaterThanOrEqual(0);expect(t).toBeLessThanOrEqual(1);expect(endpoint.distanceTo(barA.addScaledVector(direction,t))).toBeLessThan(1e-5);
     }));
     const timber=cart.getObjectByName(`joint-cart-${cartIndex}-body-timber`) as Mesh;timber.geometry.computeBoundingBox();const bedBounds=new Box3().copy(timber.geometry.boundingBox!).applyMatrix4(timber.matrixWorld);
     expect(bedBounds.max.y).toBeCloseTo(carrier.bedTopY,6);
    });
    expect(system.group.userData.tipResidual).toBeLessThan(1e-5);
   }
  }finally{system.dispose();}
 },30000);

 it('keeps every repeated source represented by its dynamic instanced batch',async()=>{
  const system=new EiffelJointCampaignSystem();await system.ready;
  try{
   for(const seconds of [0,31,65,82,114,129]){system.update(seconds);system.group.traverse(o=>{if(!(o instanceof InstancedMesh))return;expect(o.frustumCulled).toBe(false);const sources:Mesh[]=[];system.group.traverse(source=>{if(source instanceof Mesh&&!source.visible&&source.geometry===o.geometry&&source.material===o.material)sources.push(source);});expect(o.count).toBe(sources.length);sources.forEach((source,index)=>{const matrix=new Matrix4();o.getMatrixAt(index,matrix);matrix.premultiply(o.matrixWorld);matrix.elements.forEach((value,k)=>expect(value).toBeCloseTo(source.matrixWorld.elements[k]!,4));});});}
  }finally{system.dispose();}
 },30000);
 it('renders the persistent slinger hands at both actual pickup contacts',async()=>{
  const system=new EiffelJointCampaignSystem();await system.ready;
  try{for(const seconds of [0,10,12,13,13.5,13.999,14,14.3,40,78,80,81,81.5,81.999,82,82.3,129]){system.update(seconds);const sample=sampleEiffelJointRiggers(seconds);sample.workers.forEach((worker,index)=>{const root=system.group.getObjectByName(`joint-slinger-${index}`)!;expect(root).toBeTruthy();expect(root.userData.contact).toEqual(worker.contact);[worker.arms.left,worker.arms.right].forEach((arm,handIndex)=>{const hand=system.group.getObjectByName(`joint-slinger-${index}-hand-${handIndex}`)!;expect(hand.getWorldPosition(new Vector3()).distanceTo(new Vector3(...arm.hand))).toBeLessThan(1e-7);});});}}
  finally{system.dispose();}
 },30000);
});

type TObject={userData:Record<string,unknown>;getWorldPosition(target:Vector3):Vector3};
