import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import seal from '../artifacts/eiffel-joint-campaign-2026-09-07/evidence-seal.json';
import support from '../artifacts/eiffel-joint-campaign-2026-09-07/joint-support.json';
import {describe,it,expect} from 'vitest';
import {sampleEiffelJointCampaign as sample,EIFFEL_JOINT_CAMPAIGN_DURATION as duration,EIFFEL_JOINT_CAMPAIGN_SEAT_TIMES as seats,EIFFEL_JOINT_CAMPAIGN_FREEZE as freeze} from '../src/engine/eiffelJointCampaign';
import {transformedRigidBounds,type RigidVec3 as V} from '../src/engine/eiffelRigid';
import frozen from '../artifacts/eiffel-joint-campaign-2026-09-07/campaign-routes.json';
const distance=(a:readonly number[],b:readonly number[])=>Math.hypot(...a.map((v,i)=>v-b[i]!));
describe('two actual ground deliveries with retained joint support',()=>{
 it('binds admission to the audited assets, route and external clearance reports',()=>{
  for(const [path,hash] of Object.entries(seal.sha256)){
   // The seal is an immutable 2026-09-07 record. The live summit kit may evolve,
   // so bind its historical manifest hash to the preserved matching snapshot.
   const sealedPath=path==='public/models/eiffel-construction-kit/tower-kit.manifest.json'
    ? 'artifacts/eiffel-summit-revision-2026-09-08/before-kit/tower-kit.manifest.json'
    : path;
   expect(createHash('sha256').update(readFileSync(sealedPath)).digest('hex'),path).toBe(hash);
  }
  expect(support.freeze).toBe(freeze);
  for(const load of frozen.loads){const b=load.part.localBounds,p=sample(duration).loads.find(l=>l.partId===load.part.id)!.pose;
   expect(transformedRigidBounds(p,b.min as unknown as V,b.max as unknown as V).min[1]).toBeCloseTo(support.bearingTopY,7);
  }
 });
 it('preserves both ground-stock identities and exact final poses through the dependency freeze',()=>{
  expect(freeze).toBe(.09193744785606445);
  for(let j=0;j<2;j++){
   const first=sample(0),last=sample(duration);
   expect(first.loads[j]!.partId).toBe(frozen.loads[j]!.part.id);
   expect(first.loads[j]!.pose.position[1]).toBe(1.2);
   expect(first.loads[j]!.support).toBe('carrier');
   expect(distance(last.loads[j]!.pose.position,frozen.loads[j]!.part.finalPose.position)).toBeLessThan(1e-10);
   expect(sample(seats[j]!).loads[j]!.support).toBe('temporary-joints');
   expect(last.loads[j]!.support).toBe('permanent-joints');
  }
  expect(sample(125.999).permanentConnected).toBe(false);expect(sample(126).permanentConnected).toBe(true);
 });
 it('keeps supported cargo on a ground-rolling carrier with reasonable loaded speed',()=>{
  let peak=0;
  for(let i=0;i<=1350;i++){
   const t=i/10,s=sample(t);
   for(let j=0;j<2;j++){
    const c=s.carriers[j]!,l=s.loads[j]!;
    expect(c.wheelAngle*c.wheelRadius).toBeCloseTo(c.distance,9);
    for(const w of c.wheelCenters)expect(w[1]-c.wheelRadius).toBe(0);
    if(l.support!=='carrier')continue;
    const b=frozen.loads[j]!.part.localBounds,bottom=transformedRigidBounds(l.pose,b.min as unknown as V,b.max as unknown as V).min[1];
    expect(Math.abs(bottom-c.bedTopY)).toBeLessThan(1e-6);
    expect(c.yaw).toBe(0);
    peak=Math.max(peak,distance(c.bedPose.position,sample(t+.001).carriers[j]!.bedPose.position)/.001);
   }
  }
  expect(peak).toBeGreaterThan(1.49);expect(peak).toBeLessThan(1.50001);
 });
 it('keeps fixed basket material, balanced COM and actual hook geometry throughout suspension',()=>{
  const lengths=sample(0).basketLoops.map(b=>b.length);
  for(let i=0;i<=2700;i++){
   const s=sample(i/20);
   expect(s.crane.withinWorkingAnnulus).toBe(true);expect(s.crane.withinReviewSector).toBe(true);
   expect(s.crane.hoistRopeLength).toBeGreaterThan(1.4);
   expect(distance(s.crane.heel,s.crane.boomTip)).toBeCloseTo(Math.sqrt(180),9);
   expect(s.basketLoops).toHaveLength(4);
   s.basketLoops.forEach((b,j)=>{expect(b.length).toBeCloseTo(lengths[j]!,10);expect(b.points[0]).toEqual(b.points.at(-1));});
   for(const rope of s.rigging.slings)expect(distance(rope.points[0],rope.points[1])+distance(rope.points[1],rope.points[2])).toBeCloseTo(rope.length,8);
   if(s.rigging.attached){
    expect(s.hookHorizontalCOMResidual).toBeLessThan(1e-6);
    s.rigging.slings.forEach((rope,j)=>expect(distance(rope.points[2],s.rigging.lugs[j]!)).toBeLessThan(1e-8));
   }
  }
 });
 it('keeps load, carrier, hook, slings and basket paths continuous across every phase transition',()=>{
  for(const t of [10,14,15,25,26,31,32,40,44,46,49,55,60,65,78,82,94,100,108,112,114,126,129]){
   const a=sample(t-1e-7),b=sample(t+1e-7);
   for(let j=0;j<2;j++){
    expect(distance(a.loads[j]!.pose.position,b.loads[j]!.pose.position),`load${j}@${t}`).toBeLessThan(1e-5);
    expect(distance(a.carriers[j]!.bedPose.position,b.carriers[j]!.bedPose.position),`cart${j}@${t}`).toBeLessThan(1e-5);
   }
   expect(distance(a.crane.hook,b.crane.hook),`hook@${t}`).toBeLessThan(1e-5);
   for(let j=0;j<2;j++)for(let k=0;k<3;k++)expect(distance(a.rigging.slings[j]!.points[k]!,b.rigging.slings[j]!.points[k]!),`sling${j}/${k}@${t}`).toBeLessThan(1e-5);
  }
 });
 it('rejects non-finite times and remains serializable and deterministic',()=>{
  expect(()=>sample(NaN)).toThrow();expect(()=>sample(Infinity)).toThrow();
  expect(sample(-1)).toEqual(sample(0));expect(sample(999)).toEqual(sample(duration));
  expect(JSON.parse(JSON.stringify(sample(87.321)))).toEqual(sample(87.321));
 });
});
