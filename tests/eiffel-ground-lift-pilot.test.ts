import {describe,expect,it} from 'vitest';
import {
  EIFFEL_GROUND_LIFT_PILOT_CONTEXT as context,
  EIFFEL_GROUND_LIFT_PILOT_DURATION as duration,
  EIFFEL_GROUND_LIFT_PILOT_PHASES as phases,
  sampleEiffelGroundLiftPilot as sample,
} from '../src/engine/eiffelGroundLiftPilot';
import {transformRigidPoint,transformedRigidBounds,type RigidVec3 as V} from '../src/engine/eiffelRigid';
import frozen from '../artifacts/eiffel-integration-2026-09-07/guyenet-ne-station.json';
const distance=(a:readonly number[],b:readonly number[])=>Math.hypot(...a.map((v,i)=>v-b[i]!));
const asV=(p:number[])=>p as unknown as V;
describe('isolated seconds-long ground lift review',()=>{
 it('starts loaded at the ground approach, stays supported, and rolls without wheel slip',()=>{
  expect(sample(0).payload.pose.position).toEqual(frozen.haulCorridor.from);
  for(let i=0;i<=280;i++){
   const s=sample(i/20);
   if(s.payload.support!=='carrier')continue;
   const bottom=transformedRigidBounds(s.payload.pose,asV(frozen.part.localBounds.min),asV(frozen.part.localBounds.max)).min[1];
   expect(bottom).toBeCloseTo(s.carrier.bedTopY,10);
   expect(s.payload.pose.position[0]).toBe(s.carrier.bedPose.position[0]);
   expect(s.payload.pose.position[2]).toBe(s.carrier.bedPose.position[2]);
   expect(s.carrier.wheelAngle*s.carrier.wheelRadius).toBeCloseTo(s.carrier.distance,10);
   for(const wheel of s.carrier.wheelCenters)expect(wheel[1]-s.carrier.wheelRadius).toBe(s.carrier.groundY);
  }
  expect(sample(10).payload.pose.position).toEqual(frozen.route.pickup.position);
  expect(sample(10).carrier.distance).toBeCloseTo(10,10);
  let peakSpeed=0;
  for(let i=0;i<1000;i++)peakSpeed=Math.max(peakSpeed,(sample((i+1)/100).carrier.distance-sample(i/100).carrier.distance)/.01);
  expect(peakSpeed).toBeGreaterThan(1.499);expect(peakSpeed).toBeLessThanOrEqual(1.5+1e-8);
  expect(sample(30).carrier.bedPose).toEqual(sample(10).carrier.bedPose);
 });
 it('keeps payload, hook and all flexible rope paths continuous at every phase boundary',()=>{
  for(const p of phases.slice(0,-1)){
   const a=sample(p.end-1e-7),b=sample(p.end+1e-7);
   expect(distance(a.payload.pose.position,b.payload.pose.position),p.phase).toBeLessThan(1e-5);
   expect(Math.abs(a.payload.pose.quaternion.reduce((v,x,i)=>v+x*b.payload.pose.quaternion[i]!,0))).toBeCloseTo(1,8);
   expect(distance(a.crane.hook,b.crane.hook),p.phase).toBeLessThan(1e-5);
   for(let i=0;i<2;i++)for(let k=0;k<3;k++)expect(distance(a.rigging.slings[i]!.points[k]!,b.rigging.slings[i]!.points[k]!),`${p.phase}:sling${i}:${k}`).toBeLessThan(1e-5);
  }
 });
 it('uses actual rigid pickup lugs and fixed rope lengths, including sloped loads and rigging loops',()=>{
  for(let i=0;i<=1100;i++){
   const s=sample(i/20);
   expect(Math.hypot(...s.payload.pose.quaternion)).toBeCloseTo(1,10);
   expect(s.crane.hoistRopeLength).toBeGreaterThan(0);
   expect(distance(s.crane.heel,s.crane.boomTip)).toBeCloseTo(Math.sqrt(180),9);
   expect(s.crane.boomTip[0]).toBe(s.crane.hook[0]);expect(s.crane.boomTip[2]).toBe(s.crane.hook[2]);
   for(let k=0;k<2;k++){
    const rope=s.rigging.slings[k]!,p=rope.points;
    expect(distance(p[0],p[1])+distance(p[1],p[2]),`${s.seconds}:sling${k}`).toBeCloseTo(rope.length,8);
    expect(s.rigging.lugs[k]).toEqual(transformRigidPoint(s.payload.pose,asV(frozen.part.pickupLugs[k]!)));
    if(s.rigging.attached){
     expect(distance(p[2],s.rigging.lugs[k]!)).toBeLessThan(1e-8);
     expect(distance(s.crane.hook,s.rigging.lugs[k]!)).toBeCloseTo(rope.length,9);
    }
   }
  }
 });
 it('seats before unrigging and recovers only the empty hook',()=>{
  const seated=sample(46),end=sample(duration);
  expect(seated.payload.support).toBe('final-joints');
  expect(end.payload.pose.position).toEqual(frozen.part.finalPose.position);
  expect(end.payload.pose).toEqual(seated.payload.pose);
  expect(end.rigging.attached).toBe(false);
  expect(end.crane.hook[1]).toBeGreaterThan(seated.crane.hook[1]);
  expect(end.crane.hoistRopeLength).toBeCloseTo(2,10);
 });
 it('uses the narrowly reviewed station sector for the actual hook, keeping the prototype restriction explicit',()=>{
  let maximumYaw=0;
  for(let i=0;i<=550;i++){
   const s=sample(i/10);
   expect(s.crane.withinWorkingAnnulus).toBe(true);
   maximumYaw=Math.max(maximumYaw,s.crane.yaw*180/Math.PI);
   expect(s.crane.withinReviewSector).toBe(true);expect(s.reviewIssues).toEqual([]);
  }
  expect(maximumYaw).toBeGreaterThan(120);expect(maximumYaw).toBeLessThan(121.65);
  expect(context.reviewOnly).toBe(true);expect(context.lifecycleLimit).toContain('before stage 10');
  expect(context.preparedStructureAssumption).toContain('before this isolated review');
 });
 it('is deterministic, serializable, clamps time and rejects non-finite input',()=>{
  expect(sample(-1)).toEqual(sample(0));expect(sample(999)).toEqual(sample(duration));
  expect(JSON.parse(JSON.stringify(sample(31.7)))).toEqual(sample(31.7));
  expect(()=>sample(NaN)).toThrow();expect(()=>sample(Infinity)).toThrow();
 });
});
