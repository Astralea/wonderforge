import { expect, it } from 'vitest';
import { InstancedMesh, Matrix4, Vector3 } from 'three';
import { getWonder } from '../src/data';
import { EIFFEL_TRAFFIC_ACTORS } from '../src/data/eiffelTraffic';
import { EIFFEL_SEINE_WATER_Y } from '../src/engine/eiffelTerrain';
import { eiffelTrafficPoseAt } from '../src/engine/eiffelTraffic';
import { EiffelEnvironment } from '../src/render/three/EiffelEnvironment';
import { createMaterialLibrary } from '../src/render/three/MaterialLibrary';

it('attaches barge moorings to gunwales and bollards supported by the actual quay solids', async () => {
  const materials = createMaterialLibrary(getWonder('eiffel-tower'));
  const env = new EiffelEnvironment(materials, true); await env.ready;
  const ropes = env.group.getObjectByName('eiffel-barge-mooring-lines') as InstancedMesh;
  const bollards = env.group.getObjectByName('eiffel-quay-mooring-bollards') as InstancedMesh;
  const stones = env.group.getObjectByName('eiffel-pont-d-iena-stonework') as InstancedMesh;
  const barges = EIFFEL_TRAFFIC_ACTORS.filter(a => a.kind === 'barge');
  expect(ropes.count).toBe(barges.length * 2); expect(bollards.count).toBe(ropes.count);
  const m = new Matrix4(); const b = new Matrix4(); const q = new Matrix4();
  for (let i = 0; i < ropes.count; i++) {
    ropes.getMatrixAt(i, m); bollards.getMatrixAt(i, b);
    const start = new Vector3(0, -.5, 0).applyMatrix4(m);
    const end = new Vector3(0, .5, 0).applyMatrix4(m);
    const bollardCenter = new Vector3().setFromMatrixPosition(b);
    expect(end.distanceTo(bollardCenter)).toBeLessThan(.001);
    const pose = eiffelTrafficPoseAt(barges[Math.floor(i / 2)]!, 0);
    const dx = start.x - pose.position[0]; const dz = start.z - pose.position[2];
    expect(Math.abs(dx * Math.cos(pose.yaw) - dz * Math.sin(pose.yaw))).toBeCloseTo(2.45, 3);
    expect(Math.abs(dx * Math.sin(pose.yaw) + dz * Math.cos(pose.yaw))).toBeCloseTo(5.5, 3);
    expect(start.y).toBeCloseTo(EIFFEL_SEINE_WATER_Y + .75, 4);
    const bottom = bollardCenter.clone().add(new Vector3(0, -.25, 0));
    let supported = false;
    for (let quay = 0; quay < 2; quay++) {
      stones.getMatrixAt(quay, q);
      const local = bottom.clone().applyMatrix4(q.invert());
      if (Math.abs(local.x) <= .5001 && Math.abs(local.z) <= .5001 && Math.abs(local.y - .5) < .0001) supported = true;
    }
    expect(supported).toBe(true);
  }
  env.dispose(); for (const m of materials.all) m.dispose();
});
