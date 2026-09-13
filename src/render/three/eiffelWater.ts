import type { MeshStandardMaterial } from 'three';
import { GIZA_SKY } from '../../data/gizaSky';
import { materialDetailFor } from '../../data/materialDetail';

/** Radial second moment in t=1-cos(theta), used only by the analytic sun disc. */
export function eiffelWaterDiscMoment(low:number,high:number):number{
  const limit=1-low,n=512,step=limit/n;
  let energy=0,moment=0;
  for(let i=0;i<n;i++){
    const t=(i+.5)*step,u=Math.max(0,Math.min(1,(1-t-low)/(high-low))),value=u*u*(3-2*u);
    energy+=value;moment+=t*value;
  }
  return moment/energy;
}

const FILTER_GLSL=/* glsl */`
uniform float uEiffelHighlightFilter;
vec2 efNoiseGradient(vec2 p){
 vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f),du=6.0*f*(1.0-f);
 float a=wfHash(i),b=wfHash(i+vec2(1.0,0.0)),c=wfHash(i+vec2(0.0,1.0)),d=wfHash(i+vec2(1.0,1.0));
 return vec2(mix(b-a,d-c,u.y)*du.x,mix(c-a,d-b,u.x)*du.y);
}
vec2 efFieldGradient(vec2 p,vec2 weights){
 return efNoiseGradient(p)*(.65*weights.x)+efNoiseGradient(p*2.13+7.3)*(.35*2.13*weights.y);
}
mat2 efSlopeJacobian(vec2 p,vec2 scale){
 float span=max(length(dFdx(p)),length(dFdy(p)));
 vec2 weights=mix(vec2(1.0),1.0-smoothstep(vec2(.15),vec2(.5),span*vec2(1.0,2.13)),uEiffelRippleFilter);
 vec2 base=efFieldGradient(p,weights);
 vec2 gx=(efFieldGradient(p+vec2(.08,0.0),weights)-base)/.08;
 vec2 gz=(efFieldGradient(p+vec2(0.0,.08),weights)-base)/.08;
 return mat2(gx.x*scale.x*scale.x,gz.x*scale.y*scale.x,gx.y*scale.x*scale.y,gz.y*scale.y*scale.y);
}
vec3 efReflectionDerivative(vec3 v,vec3 n,vec3 dv,vec3 dn){
 return -dv+2.0*((dot(dv,n)+dot(v,dn))*n+dot(v,n)*dn);
}
float efSunPower(float cosine,float power,float variance){
 float filteredPower=power/(1.0+power*variance);
 return pow(cosine,filteredPower)*(filteredPower+1.0)/(power+1.0);
}
`;

/** Retire unresolved ripple octaves before their normal gradients alias into sun glitter.
 * Eiffel-only: other wonders keep their existing material recipes and programs.
 */
export function configureEiffelWater(material: MeshStandardMaterial): void {
  if (material.userData.eiffelRippleFilter) return;
  const enabled = { value: 1 };
  const highlight={value:1};
  material.userData.eiffelRippleFilter = enabled;
  material.userData.eiffelHighlightFilter=highlight;
  const previous = material.onBeforeCompile.bind(material);
  const previousKey = material.customProgramCacheKey.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    previous(shader, renderer);
    const original = /float wfFbm\(vec2 p\)\s*\{\s*return wfNoise\(p\) \* 0\.65 \+ wfNoise\(p \* 2\.13 \+ 7\.3\) \* 0\.35;\s*\}/;
    if (!original.test(shader.fragmentShader)) throw new Error('Eiffel water expected the shared two-octave ripple field');
    shader.uniforms.uEiffelRippleFilter = enabled;
    shader.fragmentShader = 'uniform float uEiffelRippleFilter;\n' + shader.fragmentShader.replace(original, `
float wfFbm(vec2 p) {
  float span = max(length(dFdx(p)), length(dFdy(p)));
  // Use a smooth footprint transition; a hard octave switch would itself pop.
  float coarse = 1.0 - smoothstep(0.15, 0.5, span);
  float fine = 1.0 - smoothstep(0.15, 0.5, span * 2.13);
  float n0 = wfNoise(p), n1 = wfNoise(p * 2.13 + 7.3);
  float unfiltered = n0 * 0.65 + n1 * 0.35;
  float filtered = 0.5 + (n0 - 0.5) * 0.65 * coarse + (n1 - 0.5) * 0.35 * fine;
  return mix(unfiltered, filtered, uEiffelRippleFilter);
}`);
    const recipe=materialDetailFor('water'),ripple=recipe.ripple!,chop=recipe.chop!;
    const cosine=Math.cos(GIZA_SKY.sunDisc.angularRadiusDegrees*Math.PI/180),low=cosine-.0012,high=cosine+.0012;
    const discMoment=eiffelWaterDiscMoment(low,high);
    shader.uniforms.uEiffelHighlightFilter=highlight;
    // Insert after the shared noise declarations, so gradient helpers may use
    // their exact hash. Derivatives only operate on coordinates, never on a
    // normal that already contains derivative-based octave filtering.
    shader.fragmentShader=shader.fragmentShader.replace('void main() {',FILTER_GLSL+'\nvoid main() {');
    shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
  vec3 efWorldDx=dFdx(vWfDetailPos),efWorldDy=dFdy(vWfDetailPos);
  mat2 efJacobian=-${recipe.normalRipple!.strength}*(efSlopeJacobian(wfRp,vec2(${ripple.scale},${ripple.scale*.55}))
    +efSlopeJacobian(wfCp,vec2(${chop.scale},${chop.scale*.8}))*${chop.amplitude/ripple.amplitude});
  vec3 efN=normalize(vec3(wfRippleSlopeWorld.x,1.0,wfRippleSlopeWorld.z));
  float efNormalLength=length(vec3(wfRippleSlopeWorld.x,1.0,wfRippleSlopeWorld.z));
  vec2 efSx=efJacobian*efWorldDx.xz,efSy=efJacobian*efWorldDy.xz;
  vec3 efNx=vec3(efSx.x,0.0,efSx.y),efNy=vec3(efSy.x,0.0,efSy.y);
  efNx=(efNx-efN*dot(efN,efNx))/efNormalLength;
  efNy=(efNy-efN*dot(efN,efNy))/efNormalLength;
  float efNormalVariance=(dot(efNx,efNx)+dot(efNy,efNy))/12.0;
`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <lights_physical_fragment>',`
  // GGX alpha is roughness squared. Approximate the normal-footprint
  // convolution in alpha-squared space, only for unresolved local slope.
  if(uEiffelHighlightFilter>0.0){
    float efBaseRoughness=max(roughnessFactor,.0525);
    float efKernel=min(2.0*efNormalVariance,.0036)*uEiffelHighlightFilter;
    roughnessFactor=pow(pow(efBaseRoughness,4.0)+efKernel,.25);
  }
  #include <lights_physical_fragment>`);
    const sun=/  wfSkyRefl \+= uWfSunTint \* \(\s*pow\(wfCosSun, 650\.0\) \* ([\d.e-]+) \+\s*pow\(wfCosSun, 5\.0\) \* ([\d.e-]+) \+\s*smoothstep\(([^,]+), ([^,]+), wfCosSun\) \* ([\d.e-]+)\s*\);/;
    if(!sun.test(shader.fragmentShader))throw new Error('Eiffel water expected the shared analytic sun lobe');
    shader.fragmentShader=shader.fragmentShader.replace(sun,(_,halo,wide,discLow,discHigh,intensity)=>`
  vec3 efView=normalize(cameraPosition-vWfDetailPos);
  float efDistance=max(length(cameraPosition-vWfDetailPos),.001);
  vec3 efVx=(-efWorldDx+efView*dot(efView,efWorldDx))/efDistance;
  vec3 efVy=(-efWorldDy+efView*dot(efView,efWorldDy))/efDistance;
  vec3 efRx=efReflectionDerivative(efView,efN,efVx,efNx),efRy=efReflectionDerivative(efView,efN,efVy,efNy);
  float efVariance=min((dot(efRx,efRx)+dot(efRy,efRy))/24.0,.0036)*uEiffelHighlightFilter;
  float efDiscScale=1.0+efVariance/${discMoment};
  float efDiscCos=1.0-(1.0-wfCosSun)/efDiscScale;
  wfSkyRefl += uWfSunTint * (
    efSunPower(wfCosSun,650.0,efVariance)*${halo} +
    pow(wfCosSun,5.0)*${wide} +
    smoothstep(${discLow},${discHigh},efDiscCos)*${intensity}/efDiscScale
  );`);
  };
  material.customProgramCacheKey = () => `${previousKey()}:eiffel-footprint-water-v1:highlight-moment-v2`;
  material.needsUpdate = true;
}
