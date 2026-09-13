import { expect,it,vi } from 'vitest';
import { Color,ShaderMaterial,Vector3 } from 'three';
import { EiffelSkyDome } from '../src/render/three/EiffelSkyDome';
import { sampleEiffelSky } from '../src/data/eiffelSky';

it('keeps cloud lighting on the exact scene sun and reverse clock without replacing GPU resources',()=>{
 const dome=new EiffelSkyDome(),material=dome.mesh.material as ShaderMaterial,geometry=dome.mesh.geometry;
 const sun=new Vector3(.3,.8,.4).normalize();
 for(const t of[0,.5,1,.5,0]){
  const sky=sampleEiffelSky(t);dome.update(t,sky,sun);
  expect(material.uniforms.uSunDirection!.value.toArray()).toEqual(sun.toArray());
  expect(material.uniforms.uCloudTint!.value.toArray()).toEqual(new Color(sky.cloudTint).toArray());
  expect(material.uniforms.uCloudShadow!.value.toArray()).toEqual(new Color(sky.cloudShadow).toArray());
  expect(material.uniforms.uTime!.value).toBe(t);
  expect(dome.mesh.geometry).toBe(geometry);expect(dome.mesh.material).toBe(material);
 }
 const stored=material.uniforms.uSunDirection!.value.clone();sun.set(0,1,0);expect(material.uniforms.uSunDirection!.value.toArray()).toEqual(stored.toArray());
 const gd=vi.spyOn(geometry,'dispose'),md=vi.spyOn(material,'dispose');dome.dispose();expect(gd).toHaveBeenCalledOnce();expect(md).toHaveBeenCalledOnce();
});
