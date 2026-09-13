import {describe,it,expect} from 'vitest';
import {sampleEiffelFirstFloorTransfer as sample} from '../src/engine/eiffelFirstFloorTransfer';
import {EIFFEL_FIRST_FLOOR_Y as floor} from '../src/engine/eiffelFirstFloorSupply';
describe('continuous first-floor stock transfer',()=>{
 it('keeps one cargo grounded, then lands it on the cart and carries it to the next pickup',()=>{
  expect(sample(0).worldCargo[1]-.9).toBeCloseTo(0,10);
  for(let t=124;t<=166;t+=.2){const s=sample(t);expect(s.worldCargo[0]).toBeCloseTo(s.cart[0],10);expect(s.worldCargo[1]-.9).toBeCloseTo(floor+.34,10);}
  expect(sample(166).cart).toEqual([-8.5,floor,-4]);
 });
 it('clears the hatch before closing it and releases the old sling before rolling',()=>{
  expect(sample(121).hatchAngle).toBe(Math.PI/2);expect(sample(126).hatchAngle).toBe(0);
  for(let t=122;t<=126;t+=.1)expect(sample(t).worldCargo[0]+.3).toBeLessThan(-20.3);
  const rig=sample(134);for(const s of rig.slings)expect(s[1]![1]).toBeCloseTo(rig.hook[1]-.5,10);
  expect(sample(133).cart[0]).toBe(-21.5);expect(sample(140).cart[0]).toBeGreaterThan(-21.5);
 });
 it('has continuous cargo, hook and hatch poses at every phase boundary',()=>{
  for(const t of [6,112,120,122,124,126,128,132,134,160,166]){
   const a=sample(t-1e-6),b=sample(t+1e-6);
   for(const key of ['worldCargo','worldHook','cart'] as const)expect(Math.hypot(...a[key].map((v,k)=>v-b[key][k]!))).toBeLessThan(1e-5);
   expect(Math.abs(a.hatchAngle-b.hatchAngle)).toBeLessThan(1e-5);
  }
  const pose=sample(145);sample(166);sample(0);expect(sample(145)).toEqual(pose);
 });
});
