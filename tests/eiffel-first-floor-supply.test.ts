import {describe,it,expect} from 'vitest';
import {sampleEiffelFirstFloorSupply as sample,EIFFEL_FIRST_FLOOR_Y as floor} from '../src/engine/eiffelFirstFloorSupply';
import {eiffelTerrainHeightAt} from '../src/engine/eiffelTerrain';
describe('first-floor freight relay kinematics',()=>{
 it('starts on actual ground and lands on the first floor without changing load identity or dimensions',()=>{
  const start=sample(0),end=sample(128);
  expect(start.worldCargo[1]-.9).toBeCloseTo(eiffelTerrainHeightAt(start.worldCargo[0],start.worldCargo[2]),10);
  expect(end.worldCargo[1]-.9).toBeCloseTo(floor,10);
  expect(end.worldCargo[0]).toBeCloseTo(-21.5,10);expect(end.worldCargo[2]).toBe(-4);
 });
 it('keeps a vertical hoist line below the sheave and continuous rope at every transition',()=>{
  for(let t=0;t<=128;t+=.2){const s=sample(t),a=s.rope.at(-2)!,b=s.rope.at(-1)!;
   expect(a[1]-b[1]).toBeGreaterThan(1);expect(a[0]).toBe(b[0]);expect(a[2]).toBeCloseTo(b[2],10);
  }
  for(const t of [6,112,120,124]){const a=sample(t-1e-6),b=sample(t+1e-6);expect(Math.hypot(...a.worldCargo.map((v,k)=>v-b.worldCargo[k]!))).toBeLessThan(1e-5);expect(Math.abs(a.deployedLength-b.deployedLength)).toBeLessThan(1e-5);}
 });
 it('bounds hoist speed and restores deterministic state on backwards seeks',()=>{
  for(let t=6;t<112;t+=.5)expect((sample(t+.001).worldCargo[1]-sample(t).worldCargo[1])/.001).toBeLessThan(.85);
  const s=sample(80);sample(128);expect(sample(80)).toEqual(s);expect(()=>sample(NaN)).toThrow();
 });
});
