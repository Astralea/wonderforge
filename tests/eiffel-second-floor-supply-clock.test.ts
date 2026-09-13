import {describe,it,expect} from 'vitest';
import {sampleEiffelSecondFloorSupply as sample} from '../src/engine/eiffelSecondFloorSupply';
describe('second floor stock to upper receiving',()=>{
 it('keeps cargo on its cart until attachment, then leaves the empty cart on the bridge',()=>{
  for(let t=0;t<=26;t+=.25){const s=sample(t);expect(s.cargo[0]).toBeCloseTo(s.cart[0],10);expect(s.cargo[1]-.9).toBeCloseTo(s.cart[1]+.34,10);}
  for(const t of [40,90,166,182]){expect(sample(t).cart).toEqual([0,116.14,-1.8]);expect(sample(t).attached).toBe(true);}
  const end=sample(182);expect(end.cargo[1]-.9).toBeCloseTo(197,10);expect(end.cargo[2]).toBeCloseTo(-3.6,10);
 });
 it('preserves pose and rope continuity at stock, rigging and receiving transitions',()=>{
  for(const t of [20,26,166,170,178,182]){
   const a=sample(t-1e-6),b=sample(t+1e-6);
   expect(Math.hypot(...a.cargo.map((v,k)=>v-b.cargo[k]!))).toBeLessThan(1e-5);
   expect(Math.abs(a.deployedLength-b.deployedLength)).toBeLessThan(1e-5);
   for(let i=0;i<2;i++)expect(Math.hypot(...a.slings[i]![1]!.map((v,k)=>v-b.slings[i]![1]![k]!))).toBeLessThan(1e-5);
  }
 });
 it('keeps hoisting speed below0.87m/s and restores exact state after reverse seeks',()=>{
  for(let t=26;t<166;t+=.25)expect((sample(t+.001).cargo[1]-sample(t).cargo[1])/.001).toBeLessThan(.87);
  const at=sample(80);sample(182);sample(0);expect(sample(80)).toEqual(at);
 });
});
