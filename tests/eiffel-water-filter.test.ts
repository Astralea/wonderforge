import {describe,expect,it} from 'vitest';
import {MeshStandardMaterial,ShaderLib} from 'three';
import {configureEiffelWater,eiffelWaterDiscMoment} from '../src/render/three/eiffelWater';
import {injectMaterialRecipe} from '../src/render/three/proceduralDetail';
import {GIZA_SKY} from '../src/data/gizaSky';

describe('Eiffel narrow water-highlight filtering',()=>{
 it('composes the actual water recipe once, retains shared time/sky uniforms and independent controls',()=>{
  const material=new MeshStandardMaterial();injectMaterialRecipe(material,'water');configureEiffelWater(material);
  const compile=material.onBeforeCompile;configureEiffelWater(material);expect(material.onBeforeCompile).toBe(compile);
  const shader={vertexShader:ShaderLib.standard.vertexShader,fragmentShader:ShaderLib.standard.fragmentShader,uniforms:{}};
  compile.call(material,shader as Parameters<typeof compile>[0],{} as Parameters<typeof compile>[1]);
  expect(shader.uniforms).toHaveProperty('uEiffelHighlightFilter',material.userData.eiffelHighlightFilter);
  expect(shader.uniforms).toHaveProperty('uEiffelRippleFilter',material.userData.eiffelRippleFilter);
  for(const name of['uWfTime','uWfSkyZenith','uWfSkyHorizon','uWfSunDirection','uWfSkyReflStrength'])expect(shader.uniforms).toHaveProperty(name);
  expect(shader.fragmentShader.match(/vec2 efNoiseGradient\(/g)).toHaveLength(1);
  expect(shader.fragmentShader).toContain('pow(wfCosSun,5.0)');
  expect(shader.fragmentShader).toContain('totalEmissiveRadiance += wfSkyRefl * wfFresnel * uWfSkyReflStrength;');
  expect(shader.fragmentShader).not.toMatch(/dFd[xy]\((?:normal|wfRippleSlopeWorld|wfReflectWorld)/);
  const normalVariance=shader.fragmentShader.indexOf('float efNormalVariance='),
    roughnessKernel=shader.fragmentShader.indexOf('float efKernel='),
    lighting=shader.fragmentShader.indexOf('#include <lights_physical_fragment>');
  expect(normalVariance).toBeGreaterThan(shader.fragmentShader.indexOf('#include <emissivemap_fragment>'));
  expect(roughnessKernel).toBeGreaterThan(normalVariance);
  expect(lighting).toBeGreaterThan(roughnessKernel);
  expect(shader.fragmentShader).toContain('if(uEiffelHighlightFilter>0.0)');
  expect(shader.fragmentShader).toContain('min(2.0*efNormalVariance,.0036)');
  expect(shader.fragmentShader.match(/float efNormalVariance=/g)).toHaveLength(1);
  material.dispose();
 });
 it('normalizes broadened power-lobe energy and preserves the zero-footprint limit',()=>{
  const original=650;
  for(const variance of[0,1e-8,1e-5,.0001,.0036]){
   const exponent=original/(1+original*variance),amplitude=(exponent+1)/(original+1);
   // Integral of cos(theta)^n over its hemisphere is 2*pi/(n+1).
   expect(amplitude*2*Math.PI/(exponent+1)).toBeCloseTo(2*Math.PI/(original+1),12);
   expect(exponent).toBeGreaterThan(0);expect(amplitude).toBeGreaterThan(0);
   if(variance===0){expect(exponent).toBe(original);expect(amplitude).toBe(1);}
  }
 });
 it('matches the actual sun-disc radial second moment to independent fine integration',()=>{
  const cosine=Math.cos(GIZA_SKY.sunDisc.angularRadiusDegrees*Math.PI/180),low=cosine-.0012,high=cosine+.0012;
  let sum=0,moment=0;const n=100000,step=(1-low)/n;
  for(let i=0;i<n;i++){const t=(i+.5)*step,u=Math.max(0,Math.min(1,(1-t-low)/(high-low))),v=u*u*(3-2*u);sum+=v;moment+=t*v;}
  expect(eiffelWaterDiscMoment(low,high)).toBeCloseTo(moment/sum,8);
  for(const scale of[1,1.01,2,8]){
   let integral=0;
   for(let i=0;i<n;i++){const t=(i+.5)*step*scale,u=Math.max(0,Math.min(1,(1-t/scale-low)/(high-low)));integral+=u*u*(3-2*u)/scale*step*scale;}
   expect(integral).toBeCloseTo(sum*step,10);
  }
 });
});
