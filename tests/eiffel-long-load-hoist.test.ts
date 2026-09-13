import {describe,expect,it} from 'vitest';
import {sampleEiffelLongLoadHoist} from '../src/engine/eiffelLongLoadHoist';
import design from '../artifacts/eiffel-long-load-carrier-2026-09-08/carrier-design.json';
import {EIFFEL_FIRST_FLOOR_Y} from '../src/engine/eiffelFirstFloorSupply';

describe('real long member ground-to-first-floor hoist',()=>{
 it('preserves the same named carrier with continuous joins and supported final bottom',()=>{
  expect(sampleEiffelLongLoadHoist(0).carrierOrigin[1]).toBe(0);
  const end=sampleEiffelLongLoadHoist(128);
  expect(end.carrierOrigin[1]).toBeCloseTo(EIFFEL_FIRST_FLOOR_Y+.34,10);
  expect(end.carrierOrigin[0]).toBeCloseTo(-21.5,10);
  expect(end.partId).toBe('summit-access-stair-m000-c000');
  expect(end.released).toBe(false);expect(end.phase).toBe('landed-attached');
  for(const t of [6,112,120,124]){
   const a=sampleEiffelLongLoadHoist(t-1e-5),b=sampleEiffelLongLoadHoist(t+1e-5);
   expect(Math.hypot(...a.carrierOrigin.map((v,i)=>v-b.carrierOrigin[i]!))).toBeLessThan(1e-5);
   expect(Math.hypot(...a.worldHook.map((v,i)=>v-b.worldHook[i]!))).toBeLessThan(1e-5);
  }
  sampleEiffelLongLoadHoist(128);expect(sampleEiffelLongLoadHoist(30)).toEqual(sampleEiffelLongLoadHoist(30));
 });
 it('keeps a positive vertical rope and four sling ends at actual eye bore radii',()=>{
  for(const t of [0,30,80,112,116,120,124,128]){
   const s=sampleEiffelLongLoadHoist(t),ropeEnd=s.worldRope.at(-2)!;
   expect(s.worldRope.at(-1)).toEqual(s.worldHook);
   expect(ropeEnd[1]-s.worldHook[1]).toBeGreaterThan(.6374);
   expect(s.worldHook[1]-s.carrierOrigin[1]).toBeCloseTo(design.hookY,10);
   expect(s.worldSlings).toHaveLength(4);
   s.worldSlings.forEach(([contact,hook],i)=>{
    const c=design.eyeCenters[i]!;
    expect(Math.hypot(...contact.map((v,k)=>v-s.carrierOrigin[k]!-c[k]!))+design.slingRadius).toBeCloseTo(design.eyeInnerRadius,10);
    expect(hook).toEqual(s.worldHook);
   });
  }
 });
});
