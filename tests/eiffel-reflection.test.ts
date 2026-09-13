import {describe,it,expect} from 'vitest';
import {Color,EquirectangularReflectionMapping,LinearSRGBColorSpace} from 'three';
import {sampleEiffelSky} from '../src/data/eiffelSky';
import {createEiffelReflectionSource,eiffelReflectionIntensity} from '../src/render/three/eiffelReflection';

describe('Eiffel outdoor reflection environment',()=>{
 it('places the typed blue sky above the ground in the actual equirectangular texture convention',()=>{
  const t=createEiffelReflectionSource(),d=t.image.data as Float32Array;
  expect(t.mapping).toBe(EquirectangularReflectionMapping);expect(t.colorSpace).toBe(LinearSRGBColorSpace);
  expect(t.flipY).toBe(false);expect([t.image.width,t.image.height]).toEqual([128,64]);
  const bottom=new Color().fromArray(Array.from(d.slice(0,3)));
  const top=new Color().fromArray(Array.from(d.slice(-4,-1)));
  const ground=new Color('#857763'),sky=new Color(sampleEiffelSky(.45).zenith);
  expect(bottom.r).toBeCloseTo(ground.r,5);expect(bottom.b).toBeCloseTo(ground.b,5);
  expect(top.r).toBeCloseTo(sky.r,3);expect(top.b).toBeCloseTo(sky.b,3);
  expect(Array.from(d).every(Number.isFinite)).toBe(true);
  // No hard artificial sun/bright strip along the longitudinal seam.
  for(let y=0;y<64;y++)for(let c=0;c<4;c++)expect(d[(y*128)*4+c]).toBe(d[(y*128+127)*4+c]);
  t.dispose();
 });
 it('dims daytime reflections at sunset/night without depending on seek history',()=>{
  expect(eiffelReflectionIntensity(-.2)).toBe(.025);
  expect(eiffelReflectionIntensity(.8)).toBe(.525);
  for(const e of[.8,.2,-.2,.2,.8])expect(eiffelReflectionIntensity(e)).toBeGreaterThanOrEqual(.025);
  expect(eiffelReflectionIntensity(.2)).toBeLessThan(eiffelReflectionIntensity(.8));
 });
});
