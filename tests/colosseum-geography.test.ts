import { describe, expect, it } from 'vitest';
import { InstancedMesh, PerspectiveCamera, Vector3 } from 'three';
import { getWonder } from '../src/data';
import { sampleColosseumSky } from '../src/data/colosseumSky';
import { colosseumLightState } from '../src/engine/colosseumLighting';
import { colosseumCinematicShotAt } from '../src/engine/colosseumCamera';
import { ColosseumEnvironment } from '../src/render/three/ColosseumEnvironment';
import { ColosseumWorld } from '../src/render/three/ColosseumWorld';
import { createMaterialLibrary } from '../src/render/three/MaterialLibrary';

const CITY = ['colosseum-insulae', 'colosseum-housing-stepped', 'colosseum-housing-frontage', 'colosseum-housing-corner', 'colosseum-umbrella-pines', 'colosseum-cypress'];
describe('Colosseum geographic renderer boundary', () => {
  it('preserves every visible city instance when the content and camera compass are reflected together', async () => {
    const materials = createMaterialLibrary(getWonder('colosseum')!);
    const authored = new ColosseumEnvironment(materials);
    const rendered = new ColosseumWorld(materials);
    await Promise.all([authored.ready, rendered.ready]);
    try {
      const content = rendered.group.getObjectByName('colosseum-geographic-content')!;
      const dome = rendered.group.getObjectByName('colosseum-world-space-weather-sky')!;
      expect(content.scale.toArray()).toEqual([1, 1, -1]);
      expect(dome.parent).toBe(rendered.group);
      for (const [t, aspect] of [[.3,1.6],[.86,390/844],[.7,1.6],[.86,390/844]]) {
        const shot = colosseumCinematicShotAt(t!,aspect!), h = Math.cos(shot.pitch) * shot.radius;
        const camera = new PerspectiveCamera(shot.fov,aspect,.1,4000);
        camera.position.set(shot.target[0]+Math.cos(shot.azimuth)*h,shot.target[1]+Math.sin(shot.pitch)*shot.radius,shot.target[2]+Math.sin(shot.azimuth)*h);
        camera.lookAt(new Vector3(...shot.target));
        const sky = sampleColosseumSky(t!), light = colosseumLightState(sky);
        authored.update(t!,light,sky,camera);
        camera.position.z *= -1;
        camera.lookAt(new Vector3(shot.target[0],shot.target[1],-shot.target[2]));
        rendered.update(t!,light,new Vector3(),sky,camera);
        for (const name of CITY) {
          const a = authored.group.getObjectByName(name) as InstancedMesh;
          const b = rendered.group.getObjectByName(name) as InstancedMesh;
          expect(b.count, `${name} at ${t}/${aspect}`).toBe(a.count);
          expect(Array.from(b.instanceMatrix.array).slice(0,b.count*16)).toEqual(Array.from(a.instanceMatrix.array).slice(0,a.count*16));
        }
      }
    } finally {authored.dispose();rendered.dispose();}
  });
});
