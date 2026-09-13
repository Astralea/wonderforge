import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import type {EiffelKitManifest} from '../src/data/eiffelKitTypes';
import {createEiffelProductionPlan} from '../src/engine/eiffelProductionConstruction';
import {createEiffelReadableClock} from '../src/engine/eiffelReadableClock';

describe('Eiffel readable production clock',()=>{
 it('stretches unique waves, retains original hold gaps and keeps simultaneous work simultaneous',()=>{
  const operations=[{start:.1,end:.1001,wave:2},{start:.1,end:.1001,wave:2},{start:.2,end:.21,wave:3},{start:.21,end:.22,wave:4}];
  const clock=createEiffelReadableClock(operations,60);
  const wave2=clock.segments.find(s=>s.wave===2)!,wave3=clock.segments.find(s=>s.wave===3)!;
  expect(wave2.secondsEnd-wave2.secondsStart).toBeCloseTo(4/60,12);
  expect(wave3.secondsEnd-wave3.secondsStart).toBeCloseTo(.6,12);
  const gap=clock.segments.find(s=>s.kind==='hold'&&s.productionStart===.1001)!;
  expect(gap.secondsEnd-gap.secondsStart).toBeCloseTo((.2-.1001)*60,12);
  expect(clock.productionToSeconds(.1)).toBe(wave2.secondsStart);
  expect(clock.productionToSeconds(.1001)).toBeCloseTo(wave2.secondsEnd,12);
  expect(clock.productionToSeconds(.21)).toBeLessThanOrEqual(clock.productionToSeconds(.22));
 });

 it('is an exact deterministic inverse at every segment boundary and dense queries',()=>{
  const clock=createEiffelReadableClock([{start:.03,end:.031,wave:0},{start:.4,end:.7,wave:1}],60);
  const production=[0,1,...clock.segments.flatMap(s=>[s.productionStart,s.productionEnd]),...Array.from({length:1001},(_,i)=>i/1000)];
  for(const t of production)expect(clock.secondsToProductionT(clock.productionToSeconds(t))).toBeCloseTo(t,12);
  for(let i=0;i<=1000;i++){const seconds=clock.duration*i/1000;expect(clock.productionToSeconds(clock.secondsToProductionT(seconds))).toBeCloseTo(seconds,10);}
  const backward=clock.secondsToProductionT(clock.duration*.73);clock.secondsToProductionT(clock.duration*.1);expect(clock.secondsToProductionT(clock.duration*.73)).toBe(backward);
 });

 it('measures the complete manifest and reserves four 60 Hz frame intervals per wave',()=>{
  const manifest=JSON.parse(readFileSync('public/models/eiffel-construction-kit/tower-kit.manifest.json','utf8')) as EiffelKitManifest;
  const plan=createEiffelProductionPlan(manifest),clock=createEiffelReadableClock(plan.operations,60);
  expect(plan.operations).toHaveLength(manifest.parts.length);
  expect(clock.segments.filter(s=>s.kind==='wave')).toHaveLength(3_597);
  expect(clock.minimumWaveSeconds).toBeCloseTo(4/60,12);
  expect(clock.duration).toBeCloseTo(252.15799853257852,10);
  for(const segment of clock.segments.filter(s=>s.kind==='wave'))expect(segment.secondsEnd-segment.secondsStart).toBeGreaterThanOrEqual(4/60-1e-12);
  expect(clock.productionToSeconds(-1)).toBe(0);expect(clock.productionToSeconds(0)).toBe(0);
  expect(clock.productionToSeconds(1)).toBeCloseTo(clock.duration,12);expect(clock.productionToSeconds(2)).toBeCloseTo(clock.duration,12);
  expect(clock.secondsToProductionT(-1)).toBe(0);expect(clock.secondsToProductionT(clock.duration+1)).toBe(1);
 },30_000);

 it('rejects ambiguous or invalid clocks',()=>{
  expect(()=>createEiffelReadableClock([{start:.1,end:.2,wave:1},{start:.15,end:.25,wave:2}])).toThrow(/overlap/);
  expect(()=>createEiffelReadableClock([{start:.1,end:.2,wave:1},{start:.1,end:.21,wave:1}])).toThrow(/inconsistent/);
  expect(()=>createEiffelReadableClock([{start:.2,end:.1,wave:1}])).toThrow(/start < end/);
  expect(()=>createEiffelReadableClock([],0)).toThrow(/positive/);
  expect(()=>createEiffelReadableClock([],60,{fps:NaN})).toThrow(/finite/);
 });
});
