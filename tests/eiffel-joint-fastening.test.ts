import {describe,it,expect} from 'vitest';
import {Vector3,type Mesh,type BufferGeometry} from 'three';
import {sampleEiffelJointFastening} from '../src/engine/eiffelJointFastening';
import {sampleEiffelJointCampaign,EIFFEL_JOINT_CAMPAIGN_CONNECTED_AT,EIFFEL_JOINT_CAMPAIGN_DURATION} from '../src/engine/eiffelJointCampaign';
import {composeRigidPoses,invertRigidPose} from '../src/engine/eiffelRigid';
import {eiffelAxisBox,eiffelSolidBox,eiffelBoxPenetration} from '../src/engine/eiffelOccupancy';
import {EiffelJointFasteningSystem} from '../src/render/three/EiffelJointFasteningSystem';

describe('delivered permanent splice',()=>{
 it('batches hardware into two submissions without changing any transformed Blender vertex',async()=>{
  const system=new EiffelJointFasteningSystem();await system.ready;
  try{const batches=(system as unknown as {hardwareBatches:{mesh:Mesh;sources:{mesh:Mesh;geometry:BufferGeometry;offset:number}[]}[]}).hardwareBatches;
   expect(batches).toHaveLength(2);
   for(const showWorker of [true,false])for(const t of [0,14,20,40,46,114,116,118,120,122,135]){system.update(t,showWorker);system.group.updateMatrixWorld(true);
    for(const b of batches){const output=b.mesh.geometry.getAttribute('position');expect(b.mesh.frustumCulled).toBe(false);
     for(const source of b.sources){expect(source.mesh.visible).toBe(false);const input=source.geometry.getAttribute('position');
      for(let i=0;i<input.count;i++){const original=new Vector3().fromBufferAttribute(input,i).applyMatrix4(source.mesh.matrixWorld),batched=new Vector3().fromBufferAttribute(output,source.offset+i).applyMatrix4(b.mesh.matrixWorld);expect(batched.distanceTo(original)).toBeLessThan(6e-6);}
     }
    }
   }
  }finally{system.dispose();}
 },30000);
 it('keeps both plates attached to the first iron through stock, arrival and hoisting',()=>{
  const local=(t:number)=>{const s=sampleEiffelJointFastening(t),iron=sampleEiffelJointCampaign(t).loads[0].pose;return s.plates.map(p=>composeRigidPoses(invertRigidPose(iron),p.pose));};
  const prepared=local(0);
  for(const t of [0,5,10,14,20,30,40,46,70,110,114])local(t).forEach((p,i)=>p.position.forEach((x,k)=>expect(x).toBeCloseTo(prepared[i]!.position[k]!,8)));
  expect(sampleEiffelJointFastening(0).plates.every(p=>p.pose.position[1]<2)).toBe(true);
 });
 it('seats both loads before sliding plates and retains them through support removal',()=>{
  expect(sampleEiffelJointFastening(114).progress).toEqual([0,0]);
  expect(sampleEiffelJointFastening(118).progress).toEqual([1,0]);
  expect(sampleEiffelJointFastening(122).progress).toEqual([1,1]);
  expect(sampleEiffelJointFastening(EIFFEL_JOINT_CAMPAIGN_CONNECTED_AT-.001).connected).toBe(false);
  expect(sampleEiffelJointFastening(EIFFEL_JOINT_CAMPAIGN_DURATION).connected).toBe(true);
  const s=sampleEiffelJointFastening(EIFFEL_JOINT_CAMPAIGN_DURATION);
  s.plates.forEach(p=>{expect(p.pose.position[2]-p.size[2]/2).toBeLessThan(-40.2952365875);expect(p.pose.position[2]+p.size[2]/2).toBeGreaterThan(-40.2952365875);});
 });
 it('retains fixed human arm lengths and feet on the platform throughout fastening',()=>{
  for(let t=0;t<=EIFFEL_JOINT_CAMPAIGN_DURATION;t+=.05){const w=sampleEiffelJointFastening(t).worker;
   for(const a of w.arms){expect(new Vector3(...a.shoulder).distanceTo(new Vector3(...a.elbow))).toBeCloseTo(.38,8);expect(new Vector3(...a.elbow).distanceTo(new Vector3(...a.hand))).toBeCloseTo(.4,8);}
   w.feet.forEach(f=>expect(f.center[1]!-f.size[1]!/2).toBeCloseTo(17.8,8));
  }
 });
 it('keeps actual hands touching each plate throughout its slide without passing through the iron',()=>{
  for(const [index,from,to] of [[0,115,118],[1,119,122]])for(let t=from!;t<=to!;t+=.025) {
   const state=sampleEiffelJointFastening(t),plate=state.plates[index!]!,hand=eiffelAxisBox(state.worker.arms[0].hand,[.06,.06,.06]);
   const box=eiffelSolidBox({localBounds:{min:plate.size.map(value=>-value/2) as [number,number,number],max:plate.size.map(value=>value/2) as [number,number,number]}},plate.pose);
   expect(eiffelBoxPenetration(hand,box),`plate grip ${index},${t}`).toBeGreaterThan(.0001);
   // The hand clears the narrow permanent iron while retaining top/side contact
   // with its projecting cheek plate. Forearm clearance has its renderer audit.
   const x=state.worker.arms[0].hand[0];
   expect(index===0?x+.03<51.256235:x-.03>51.372335).toBe(true);
  }
 });
 it('rotates the wrench about the actual bolt face while the hand holds its handle',()=>{
  const origin=sampleEiffelJointFastening(122.5).tool.center;
  let span=0,engaged=0,samples=0,peakRate=0,previous=sampleEiffelJointFastening(122.5);
  for(let t=122.5;t<=125.5;t+=.025) {
   const s=sampleEiffelJointFastening(t);
   samples+=1;
   if(s.tool.engaged){
    engaged+=1;
    expect(new Vector3(...s.tool.contactPoint).distanceTo(new Vector3(...s.tool.boltTarget))).toBeLessThan(1e-10);
    expect(new Vector3(...s.worker.arms[1].hand).distanceTo(new Vector3(...s.tool.center))).toBeLessThan(1e-10);
    expect(new Vector3(...s.tool.jawStart).distanceTo(new Vector3(...s.tool.contactPoint))).toBeCloseTo(Math.hypot(.029235,.01),10);
   }
   span=Math.max(span,new Vector3(...s.tool.center).distanceTo(new Vector3(...origin)));
   peakRate=Math.max(peakRate,Math.abs(s.tool.turn-previous.tool.turn)/.025);
   previous=s;
  }
  expect(span).toBeGreaterThan(.08);
  expect(engaged/samples).toBeGreaterThan(.5);
  expect(peakRate).toBeLessThan(4);
  expect(sampleEiffelJointFastening(123).tool.engaged).toBe(true);
  for(const t of [114,115,118,118.25,118.75,119,122,122.3,123,125.5,126]) {
   const before=sampleEiffelJointFastening(t-1e-6),after=sampleEiffelJointFastening(t+1e-6);
   before.worker.arms.forEach((arm,index)=>expect(new Vector3(...arm.hand).distanceTo(new Vector3(...after.worker.arms[index]!.hand))).toBeLessThan(.0001));
  }
 });
 it('keeps ratchet strokes slow enough to read instead of spinning the handle',()=>{
  let peakRate=0,previous=sampleEiffelJointFastening(122.5);
  for(let t=122.5;t<=133.3;t+=1/60){
   const s=sampleEiffelJointFastening(t);
   peakRate=Math.max(peakRate,Math.abs(s.tool.turn-previous.tool.turn)*60);
   previous=s;
  }
  expect(peakRate).toBeGreaterThan(.4);
  expect(peakRate).toBeLessThan(4);
  expect(sampleEiffelJointFastening(124.8).tool.turn).toBeLessThan(sampleEiffelJointFastening(123.5).tool.turn);
 });
 it('transforms the actual Blender plate nodes onto the sampled load and leaves hardware after the worker exits',async()=>{
  const system=new EiffelJointFasteningSystem();await system.ready;
  try{for(const t of [0,14,25,46,115,117,120,122,EIFFEL_JOINT_CAMPAIGN_DURATION]){system.update(t,t<EIFFEL_JOINT_CAMPAIGN_DURATION);system.group.updateMatrixWorld(true);const state=sampleEiffelJointFastening(t);
   state.plates.forEach((p,i)=>{let found=false;system.group.traverse(o=>{if(o.userData.wf_role===`splice-plate-${i}`){found=true;expect(o.getWorldPosition(new Vector3()).distanceTo(new Vector3(...p.pose.position))).toBeLessThan(1e-5);}});expect(found).toBe(true);});
  }}finally{system.dispose();}
 },30000);
});
