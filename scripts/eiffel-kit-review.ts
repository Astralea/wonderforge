/** Browser-only geometry/rigid-pose inspection; not the construction movie. */
import { AmbientLight, BoxGeometry, Color, DirectionalLight, HemisphereLight, Mesh, MeshStandardMaterial, OrthographicCamera, PlaneGeometry, Scene, WebGLRenderer } from 'three';
import { EiffelKitSystem, type EiffelKitState } from '../src/render/three/EiffelKitSystem';
import { interpolateRigidPose } from '../src/engine/eiffelRigid';
import { sampleEiffelCrane } from '../src/engine/eiffelCrane';
import { EiffelCraneRig } from '../src/render/three/EiffelCraneRig';
import type { EiffelKitPart } from '../src/data/eiffelKitTypes';

let cleanup = () => {};
export async function mountKitReview(mode: 'compact' | 'expanded' | 'transport', selectedId = '', progress = 0) {
  cleanup(); document.body.replaceChildren();
  const renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(innerWidth, innerHeight); renderer.setPixelRatio(1);
  document.body.appendChild(renderer.domElement);
  const scene = new Scene(); scene.background = new Color('#d6dfe7');
  const aspect = innerWidth / innerHeight;
  const span = mode === 'transport' ? 23 : aspect < 1 ? 440 : 350;
  const camera = new OrthographicCamera(-span * aspect / 2, span * aspect / 2, span / 2, -span / 2, .1, 5000);
  if (mode === 'transport') { camera.position.set(18, 15, 22); camera.lookAt(-2, 8, 0); }
  else { camera.position.set(390, 230, 560); camera.lookAt(0, 149, 0); }
  scene.add(new HemisphereLight('#eef5ff', '#817364', 2.1), new AmbientLight('#ffffff', .2));
  const key = new DirectionalLight('#ffe7ce', 2.8); key.position.set(-80, 240, 120); scene.add(key);
  const groundGeometry = new PlaneGeometry(5000, 5000); const groundMaterial = new MeshStandardMaterial({ color: '#aeb5b6', roughness: .95 });
  const ground = new Mesh(groundGeometry, groundMaterial); ground.rotation.x = -Math.PI / 2; ground.position.y = -.015; scene.add(ground);
  const bedGeometry = new BoxGeometry(7, .2, 3); const bedMaterial = new MeshStandardMaterial({ color: '#987249', roughness: .88 });
  const bed = new Mesh(bedGeometry, bedMaterial); bed.position.y = .75; if (mode === 'transport') scene.add(bed);
  const studyPose = (part: EiffelKitPart) => {
    const clearY = .85 + Math.hypot(...part.transportSize) / 2 + 1;
    return progress <= .4
      ? interpolateRigidPose({ position: [0, .85 + part.transportSize[1] / 2, 0], quaternion: [0, 0, 0, 1] },
          { position: [0, clearY, 0], quaternion: [0, 0, 0, 1] }, progress / .4)
      : interpolateRigidPose({ position: [0, clearY, 0], quaternion: [0, 0, 0, 1] },
          { position: [0, clearY, 0], quaternion: part.finalPose.quaternion }, (progress - .4) / .6);
  };
  const rig = new EiffelCraneRig();
  const system = new EiffelKitSystem((part): EiffelKitState => {
    if (mode === 'compact') return { phase: 'seated' };
    if (mode === 'expanded') return { phase: 'moving', pose: part.finalPose };
    if (part.id !== selectedId) return { phase: 'queued' };
    return { phase: 'moving', pose: studyPose(part) };
  });
  cleanup = () => { system.dispose(); rig.dispose(); groundGeometry.dispose(); groundMaterial.dispose(); bedGeometry.dispose(); bedMaterial.dispose(); renderer.dispose(); renderer.domElement.remove(); };
  scene.add(system.group); await system.ready; system.update(1);
  let crane = null;
  if (mode === 'transport') {
    const part = system.manifest!.parts.find(p => p.id === selectedId)!;
    crane = sampleEiffelCrane({ base: [-4, 0, 0], mastHeight: 10, boomLength: 8.4 }, studyPose(part), part.pickupLugs);
    rig.update(crane); scene.add(rig.group);
  }
  renderer.render(scene, camera);
  const gl = renderer.getContext(); const debug = gl.getExtension('WEBGL_debug_renderer_info');
  const result = { mode, progress, crane, renderer: { ...renderer.info.render }, kit: { ...system.group.userData }, hardware: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : 'unavailable' };
  Object.assign(window, { __KIT_REVIEW__: result });
  return result;
}
