import {describe,it,expect} from 'vitest';
import {sampleEiffelRelayReceiving} from '../src/engine/eiffelRelayReceiving';
describe('supported receiving excerpt',()=>{
 it('keeps one rigid cargo suspended from the real sheave tangent until deck contact',()=>{
  for(let i=0;i<=640;i++){
   const s=sampleEiffelRelayReceiving(i/20);expect(s.productionReady).toBe(false);
   expect(s.hook[2]).toBeCloseTo(s.trolleyZ+.25,10);expect(s.hook[1]).toBeGreaterThan(s.cargo[1]+.9);
   expect(s.hook[1]).toBeLessThan(200.46);expect(s.rope.at(-1)).toEqual(s.hook);
   for(const sling of s.slings){expect(sling[0]).toEqual(s.hook);expect(sling[1]![1]).toBeCloseTo(s.cargo[1]+.9,10);}
   for(const p of s.rope.slice(1,-1))expect(Math.hypot(p[1]-200.46,p[2]-s.trolleyZ)).toBeCloseTo(.25,10);
   if(i/20>=16&&i/20<=24)expect(s.cargo[1]-.9).toBeCloseTo(197.2,10);
  }
  sampleEiffelRelayReceiving(32).cargo.forEach((v,i)=>expect(v).toBeCloseTo([0,197.9,-3.6][i]!,10));
 });
 it('rolls on the fixed rail and winds rope in the physical direction',()=>{
  const a=sampleEiffelRelayReceiving(18),b=sampleEiffelRelayReceiving(22);
  expect((b.trolleyZ-a.trolleyZ)-.115*(b.wheelAngle-a.wheelAngle)).toBeCloseTo(0,10);
  expect(b.sheaveAngle).toBeCloseTo(a.sheaveAngle,10);
  const lifted=sampleEiffelRelayReceiving(12),start=sampleEiffelRelayReceiving(0);
  expect(lifted.drumAngle).toBeLessThan(start.drumAngle);
  expect(lifted.sheaveAngle).toBeLessThan(start.sheaveAngle);
  expect(.30*(lifted.drumAngle-start.drumAngle)).toBeCloseTo(lifted.deployedLength-start.deployedLength,10);
 });
 it('is continuous at every phase boundary and deterministic under reverse seeking',()=>{
  for(const t of [12,16,24,28]){const a=sampleEiffelRelayReceiving(t-1e-6),b=sampleEiffelRelayReceiving(t+1e-6);expect(Math.hypot(...a.cargo.map((x,i)=>x-b.cargo[i]!))).toBeLessThan(1e-5);expect(Math.abs(a.deployedLength-b.deployedLength)).toBeLessThan(1e-5);}
  const expected=sampleEiffelRelayReceiving(21);sampleEiffelRelayReceiving(32);sampleEiffelRelayReceiving(0);expect(sampleEiffelRelayReceiving(21)).toEqual(expected);
 });
});
