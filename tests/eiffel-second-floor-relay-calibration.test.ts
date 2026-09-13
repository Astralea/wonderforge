import{readFileSync}from'node:fs';
import{expect,it}from'vitest';
import{EIFFEL_SECOND_FLOOR_RELAY_PROVISIONAL_RIG as rig,EIFFEL_SECOND_FLOOR_RELAY_DIAGONAL_LENGTH as L,sampleEiffelSecondFloorRelayRoute as sample}from'../src/engine/eiffelSecondFloorRelayRoute';
it('calibrates the rope to the actual relocated drum without changing cargo or drive travel',()=>{
 const design=JSON.parse(readFileSync('artifacts/eiffel-upper-material-chain-2026-09-08/receiver/relay-clearance-design.json','utf8')) as {drum:number[];guide:number[]};
 expect(rig.drumU).toBeCloseTo(design.drum[0]!,12);expect(rig.guideU).toBe(design.guide[0]);
 for(const t of[0,53,106,114,122,124,126]){
  const now=sample(t),old=sample(t,{...rig,drumU:8.55});
  expect(now.carrierPose).toEqual(old.carrierPose);expect(now.payloadPose).toEqual(old.payloadPose);expect(now.masterLinkPose).toEqual(old.masterLinkPose);expect(now.retainedFirstHoistRope).toEqual(old.retainedFirstHoistRope);
  expect(now.route.rig.drumAngle).toBeCloseTo(old.route.rig.drumAngle,10);
  const p=now.secondHoist.worldRope[0]!,q=now.secondHoist.worldRope[1]!,centre=[-8.5-6.5/L*rig.drumU,rig.drumY,-4+2.2/L*rig.drumU];
  const radial=p.map((v,k)=>v-centre[k]!),tangent=q.map((v,k)=>v-p[k]!);
  expect(Math.hypot(...radial)).toBeCloseTo(rig.drumRadius,10);expect(radial.reduce((s,v,k)=>s+v*tangent[k]!,0)).toBeCloseTo(0,10);
  expect(now.secondHoist.worldRope[0]).not.toEqual(old.secondHoist.worldRope[0]);
 }
});
