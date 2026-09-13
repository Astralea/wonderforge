import {expect,it,vi} from 'vitest';
import {Color,DirectionalLight,HemisphereLight,Scene,Vector3} from 'three';
import type {LightState} from '../src/engine/daynight';
import type {Wonder} from '../src/data/types';
import {sampleEiffelFilmEdit} from '../src/engine/eiffelFilmEdit';
import {sampleEiffelCinematicAtmosphere} from '../src/engine/eiffelCinematicAtmosphere';
import {WorldScene} from '../src/render/three/WorldScene';
import {RenderPipeline} from '../src/render/three/RenderPipeline';
const wonder={id:'eiffel-tower',endsAtNight:true,palette:{ground:'#7a6a55',sky:'#87b5d6'}} as Wonder;

it('routes the real cinematic renderer through dawn while construction stays complete and Detailed stays night',()=>{
  const pipeline={setAtmosphere:vi.fn(),setShadowSoftness:vi.fn(),setEnvironmentNeutralizers:vi.fn(),updateLight:vi.fn((_light:LightState)=>new Vector3(1,1,0).normalize())};
  const eiffel={update:vi.fn()};
  const world=Object.create(WorldScene.prototype) as WorldScene;
  Object.assign(world,{wonder,eiffel,pipeline,materials:{water:{userData:{}}},updateEiffelCamera:vi.fn(),finishFrame:vi.fn()});
  for(const seconds of [170,180,174,180]){
    world.update(seconds/180,seconds/180,seconds/180,{edit:'cinematic',t:seconds/180});
    const film=sampleEiffelFilmEdit('cinematic',seconds/180),expected=sampleEiffelCinematicAtmosphere(film.productionT,seconds,wonder);
    expect(pipeline.updateLight.mock.lastCall?.[0]).toEqual(expected.light);
    expect(eiffel.update.mock.lastCall?.[3]).toEqual(expected.sky);
    expect(eiffel.update.mock.lastCall?.[4]).toEqual(film);
    if(seconds===180){expect(film.productionT).toBe(1);expect(expected.light.emissive).toBe(0);expect(expected.light.sun.elevation).toBeGreaterThan(10);}
  }
  world.update(1,1,1,{edit:'detailed',t:1});
  expect(pipeline.updateLight.mock.lastCall?.[0].emissive).toBe(1);
});

it('actually hides the directional key despite the renderer intensity floor',()=>{
  const pipeline=Object.create(RenderPipeline.prototype) as RenderPipeline;
  const sun=new DirectionalLight(),ambient=new HemisphereLight(),grade={uniforms:{uTint:{value:new Color()},uTintStrength:{value:0}}};
  Object.assign(pipeline,{sun,ambient,scene:new Scene(),sunTarget:new Vector3(),sunDirection:new Vector3(),warmTint:new Color(),ambientSkyNeutralizer:new Color(),ambientGroundNeutralizer:new Color(),grade});
  const night=sampleEiffelCinematicAtmosphere(1,171,wonder),morning=sampleEiffelCinematicAtmosphere(1,180,wonder);
  pipeline.updateLight(night.light);expect(sun.intensity).toBe(0);expect(grade.uniforms.uTintStrength.value).toBe(0);
  pipeline.updateLight(morning.light);expect(sun.intensity).toBeGreaterThan(2);
  pipeline.updateLight(night.light);expect(sun.intensity).toBe(0);
});
