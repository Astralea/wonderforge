import {describe,it,expect} from 'vitest';
import {sampleEiffelTwoFloorSupply as sample} from '../src/engine/eiffelTwoFloorSupply';
describe('same cargo through first and second winches',()=>{
 it('preserves cart support before each lift and leaves both carts in the scene',()=>{
  expect(sample(0).worldCargo[1]-.9).toBeCloseTo(0,10);
  for(let t=124;t<=166;t+=.25){const s=sample(t);expect(s.worldCargo[0]).toBeCloseTo(s.lower.cart[0],10);expect(s.worldCargo[1]-.9).toBeCloseTo(s.lower.cart[1]+.34,10);}
  for(let t=284;t<=290;t+=.25){const s=sample(t);expect(s.worldCargo[0]).toBeCloseTo(s.secondCart[0],10);expect(s.worldCargo[1]-.9).toBeCloseTo(s.secondCart[1]+.34,10);expect(s.lower.cart[0]).toBe(-8.5);}
 });
 it('does not attach the second sling before the first cart and worker stop',()=>{
  for(const t of [0,40,145,160,163]){const s=sample(t),rig=s.secondRig;for(const sling of rig.slings)expect(sling[1]![1]).toBeCloseTo(rig.hook[1]-.5,10);}
  const s=sample(166);for(const sling of s.secondRig.slings)expect(sling[1]![1]).toBeCloseTo(s.secondRig.cargo[1]+.9,10);
  expect(s.lower.worker.phase).toBe('watching');
 });
 it('preserves pose at hook ownership change and every subsequent transition',()=>{
  for(const t of [160,163,166,272,280,284,290]){const a=sample(t-1e-6),b=sample(t+1e-6);expect(Math.hypot(...a.worldCargo.map((v,k)=>v-b.worldCargo[k]!))).toBeLessThan(1e-5);expect(Math.abs(a.secondRig.deployedLength-b.secondRig.deployedLength)).toBeLessThan(1e-5);}
  for(let t=166;t<272;t+=.5)expect((sample(t+.001).worldCargo[1]-sample(t).worldCargo[1])/.001).toBeLessThan(.85);
  const pose=sample(220);sample(290);sample(0);expect(sample(220)).toEqual(pose);
 });
});
