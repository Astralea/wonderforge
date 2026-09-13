/** Close inspection of the production Paris environment and living routes. */
import { Color, DirectionalLight, HemisphereLight, OrthographicCamera, Scene, Vector3, WebGLRenderer } from 'three';
import { getWonder } from '../src/data';
import { EIFFEL_TRAFFIC_ACTORS } from '../src/data/eiffelTraffic';
import { sampleEiffelSky } from '../src/data/eiffelSky';
import { eiffelTrafficPoseAt } from '../src/engine/eiffelTraffic';
import { lightStateAt } from '../src/engine/daynight';
import { EiffelEnvironment } from '../src/render/three/EiffelEnvironment';
import { createMaterialLibrary } from '../src/render/three/MaterialLibrary';

let cleanup = () => {};
export async function mountParisReview(kind: 'street' | 'pedestrian' | 'river' | 'city' | 'facade' | 'exposition' | 'market' | 'workyard' | 'north-bank' | 'photo-axis' | 'palace', t = .5) {
  cleanup(); document.body.replaceChildren();
  const renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(innerWidth, innerHeight); renderer.setPixelRatio(1);
  document.body.appendChild(renderer.domElement);
  const scene = new Scene(); scene.background = new Color('#a8bdca');
  const wonder = getWonder('eiffel-tower'); const materials = createMaterialLibrary(wonder);
  const env = new EiffelEnvironment(materials, true); scene.add(env.group);
  cleanup = () => { env.dispose(); for (const m of materials.all) m.dispose(); renderer.dispose(); renderer.domElement.remove(); };
  await env.ready; env.update(t, lightStateAt(t, wonder), sampleEiffelSky(t));
  if (env.parisSource !== 'blender' || env.lifeSource !== 'blender') throw new Error('Paris GLB integration failed');
  const aspect = innerWidth / innerHeight;
  const id = kind === 'river' ? 'steamer-east' : kind === 'pedestrian' ? 'pedestrian-east-1-1' : 'cart-east-a';
  const actor = EIFFEL_TRAFFIC_ACTORS.find(a => a.id === id) ?? EIFFEL_TRAFFIC_ACTORS.find(a => a.kind === (kind === 'pedestrian' ? 'pedestrian-man' : kind === 'river' ? 'steam-boat' : 'cart'))!;
  const pose = eiffelTrafficPoseAt(actor, t);
  const target = kind === 'workyard' ? new Vector3(138, 3, 5) : kind === 'north-bank' ? new Vector3(285, 12, -460) : kind === 'exposition' ? new Vector3(0, 18, 270) : kind === 'market' ? new Vector3(-123, 3, 12) : kind === 'facade' ? new Vector3(242, 12, 109) : kind === 'city' ? new Vector3(242, 9, 144) : new Vector3(...pose.position).add(new Vector3(0, 1.5, 0));
  const span = kind === 'workyard' ? 190 : kind === 'north-bank' ? 350 : kind === 'exposition' ? 380 : kind === 'market' ? 135 : kind === 'facade' ? 22 : kind === 'city' ? 180 : kind === 'river' ? 48 : kind === 'pedestrian' ? 9 : 19;
  const reviewSpan = kind === 'photo-axis' ? 265 : kind === 'palace' ? 75 : span;
  const camera = new OrthographicCamera(-reviewSpan * aspect / 2, reviewSpan * aspect / 2, reviewSpan / 2, -reviewSpan / 2, 1, 3000);
  // Actor views look along the street so nearby walls do not occlude the subject.
  const direction = new Vector3(Math.sin(pose.yaw), 0, Math.cos(pose.yaw));
  const side = new Vector3(direction.z, 0, -direction.x);
  camera.position.copy(target).add(kind === 'city' ? new Vector3(180, 170, 200) : direction.multiplyScalar(12).add(side.multiplyScalar(4)).add(new Vector3(0, kind === 'river' ? 22 : 9, 0)));
  if (kind === 'exposition') camera.position.set(240, 265, -100);
  if (kind === 'market') camera.position.set(-20, 140, -150);
  if (kind === 'facade') camera.position.set(256, 27, 86);
  if (kind === 'workyard') camera.position.set(10, 160, 170);
  if (kind === 'north-bank') camera.position.set(60, 280, -220);
  if (kind === 'photo-axis') { camera.position.set(0, 88, 60); target.set(0, 24, 295); }
  if (kind === 'palace') { camera.position.set(38, 58, 146); target.set(137, 25, 212); }
  camera.lookAt(target);
  scene.add(new HemisphereLight('#e5f1ff', '#8e806d', 2));
  const sun = new DirectionalLight('#fff1dc', 2.8); sun.position.set(-90, 180, 60); scene.add(sun);
  renderer.render(scene, camera);
  const result = { kind, t, source: env.parisSource, life: env.lifeSource, render: { ...renderer.info.render }, actor: pose };
  Object.assign(window, { __PARIS_REVIEW__: result }); return result;
}
