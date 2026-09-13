import { describe, expect, it } from 'vitest';
import { Mesh, Object3D, Vector3 } from 'three';
import { EiffelSecondFloorRelaySystem } from '../src/render/three/EiffelSecondFloorRelaySystem';
import { EiffelLongLoadFilmSystem } from '../src/render/three/EiffelLongLoadFilmSystem';
import { sampleEiffelSecondFloorRelaySequence } from '../src/engine/eiffelSecondFloorRelaySequence';
import { EIFFEL_RELAY_HANDOFF_SEQUENCE_DURATION } from '../src/engine/eiffelRelayHandoffSequence';
import { sampleEiffelSecondFloorRelayRoute } from '../src/engine/eiffelSecondFloorRelayRoute';

const payload=(root:Object3D)=>{let found:Object3D|undefined;root.traverse(o=>{if(o.userData.wf_role==='actual-payload')found=o});return found!};

describe('saved second-floor relay renderer',()=>{
 it('loads the actual batched rig and moves source roles from the route sampler',async()=>{
  const system=new EiffelSecondFloorRelaySystem();await system.ready;system.group.visible=true;
  const start=sampleEiffelSecondFloorRelayRoute(0),end=sampleEiffelSecondFloorRelayRoute(122);system.update(start);const a=system.roleWorldPosition('relay-trolley')!;system.update(end);const b=system.roleWorldPosition('relay-trolley')!;
  // The final saved relay contains 301 mesh objects, batched for the web.
  expect(system.group.userData.sourceMeshCount).toBe(301);expect(system.group.userData.materialCohortCount).toBe(13);expect(system.group.userData.batchCount).toBe(19);expect(Math.hypot(b[0]-a[0],b[2]-a[2])).toBeCloseTo(6.862215385719,5);expect(system.group.userData.seated).toBe(false);system.dispose();
 });
 it('preserves the payload local pose inside the one moving carrier',async()=>{
  const film=new EiffelLongLoadFilmSystem();await film.ready;film.group.visible=true;const sample=sampleEiffelSecondFloorRelayRoute(63);film.updateRelay(sample);film.group.updateMatrixWorld(true);const parts:Object3D[]=[];film.group.traverse(o=>{if(o.userData.wf_role==='actual-payload')parts.push(o)});expect(parts).toHaveLength(1);const p=payload(film.group).getWorldPosition(new Vector3());expect(p.distanceTo(new Vector3(...sample.payloadPose.position))).toBeLessThan(2e-5);film.dispose();
 });
 it('keeps the retained sling saddle on its carrier through the composed lift and reverse seeks',async()=>{
  const film=new EiffelLongLoadFilmSystem();await film.ready;
  const all:Object3D[]=[];film.group.traverse(o=>{if(o.userData.wf_role==='sling-parking-saddle')all.push(o)});expect(all).toHaveLength(1);
  for(const t of[0,53,114,126,53,0]){film.update(280);const sample=sampleEiffelSecondFloorRelaySequence(EIFFEL_RELAY_HANDOFF_SEQUENCE_DURATION+t);film.updateRelay(sample);film.group.updateMatrixWorld(true);expect(all[0]!.getWorldPosition(new Vector3()).distanceTo(new Vector3(...sample.carrierPose.position))).toBeLessThan(2e-5);}
  film.dispose();
 });
 it('contains no second payload mesh in the relay equipment asset',async()=>{const system=new EiffelSecondFloorRelaySystem();await system.ready;let count=0;system.group.traverse(o=>{if(o instanceof Mesh&&o.userData.wf_role==='actual-payload')count++});expect(count).toBe(0);system.dispose();});
});
