// Read-only source/renderer verification. Run from repo: bun artifacts/public-release-audit-2026-09-20/construction-probe.ts
// Creates Three.js objects in memory; does not start a browser, render, or write project files.
import { Euler, InstancedMesh, Matrix4, Raycaster, Vector3 } from 'three';
import { GIZA_CONSTRUCTION } from '../../src/data/gizaConstruction';
import { constructionStateAt } from '../../src/engine/construction';
import { GizaEnvironment } from '../../src/render/three/Environment';
import { createMaterialLibrary } from '../../src/render/three/MaterialLibrary';
import { pyramidsOfGiza } from '../../src/data/wonders/pyramids-of-giza';
import { sampleGizaSky } from '../../src/data/gizaSky';
import { lightStateAt } from '../../src/engine/daynight';
import { STONEHENGE_CONSTRUCTION } from '../../src/data/stonehengeConstruction';
import { stonehengeConstructionStateAt } from '../../src/engine/stonehengeConstruction';
import { stonehengeTerrainHeightAt } from '../../src/engine/stonehengeTerrain';
import { StonehengeWorkSystem } from '../../src/render/three/StonehengeWorkSystem';
import { COLOSSEUM_CONSTRUCTION } from '../../src/data/colosseumConstruction';
import { colosseumPartStateAt, colosseumCraneRigAt, colosseumScaffoldsAt } from '../../src/engine/colosseumConstruction';

const mat = createMaterialLibrary(pyramidsOfGiza);
const environment = new GizaEnvironment(GIZA_CONSTRUCTION, mat);
const terraces = environment.group.getObjectByName('ramp-earthwork-terraces') as InstancedMesh;
const giza = [];
for (const routeId of ['khufu-south', 'khufu-east', 'khafre-south', 'khafre-west', 'menkaure-south']) {
  const route = GIZA_CONSTRUCTION.routes.find(r => r.id === routeId)!;
  const block = GIZA_CONSTRUCTION.blocks.filter(b => b.routeId === routeId).sort((a, b) => b.finalPosition[1] - a.finalPosition[1])[0]!;
  const t = block.start + block.duration * 5.5 / 8;
  const state = constructionStateAt(block, route, t);
  environment.update(t, lightStateAt(t, pyramidsOfGiza), new Vector3(0, 1, 0), sampleGizaSky(t));
  environment.group.updateMatrixWorld(true);
  // Instanced bounds can cache earlier frames. Refresh the actual CPU raycast bounds.
  terraces.computeBoundingSphere();
  const along = 1.55 + block.dimensions[2] * .55;
  const leadWorker = [state.position[0] + Math.sin(state.yaw) * along - Math.cos(state.yaw) * .62, state.groundY, state.position[2] + Math.cos(state.yaw) * along + Math.sin(state.yaw) * .62];
  const hitAt = (point: readonly number[]) => {
    const ray = new Raycaster(new Vector3(point[0]!, 100, point[2]!), new Vector3(0, -1, 0));
    const hit = ray.intersectObject(terraces, false)[0];
    if (!hit || hit.instanceId === undefined) return null;
    const matrix = new Matrix4(); terraces.getMatrixAt(hit.instanceId, matrix);
    matrix.premultiply(terraces.matrixWorld);
    const local = hit.point.clone().applyMatrix4(matrix.clone().invert());
    return { instanceId: hit.instanceId, surfaceY: hit.point.y, pointInUnitBox: local.toArray(), instanceWorldMatrix: matrix.toArray() };
  };
  giza.push({ routeId, blockId: block.id, t, phase: state.phase, position: state.position, sledGroundY: state.groundY, terraceAtStone: hitAt(state.position), leadWorker, terraceAtWorker: hitAt(leadWorker) });
}
environment.dispose(); mat.all.forEach(m => m.dispose());

const stone = STONEHENGE_CONSTRUCTION.stones.find(s => s.id === 'trilithon-00-upright-b')!;
const stoneRoute = STONEHENGE_CONSTRUCTION.routes.find(r => r.id === stone.routeId)!;
const t = stone.start + stone.duration * 4.8 / 8;
const state = stonehengeConstructionStateAt(stone, stoneRoute, t);
const butt = new Vector3(0, -stone.dimensions[1] / 2, 0).applyEuler(new Euler(...state.rotation, 'YXZ')).add(new Vector3(...state.position));
const lintel = STONEHENGE_CONSTRUCTION.stones.find(s => s.id === 'trilithon-00-lintel')!;
const lintelRoute = STONEHENGE_CONSTRUCTION.routes.find(r => r.id === lintel.routeId)!;
const stoneMat = createMaterialLibrary(pyramidsOfGiza);
const stoneWork = new StonehengeWorkSystem(stoneMat, STONEHENGE_CONSTRUCTION);
const stonehenge = { upright: { id: stone.id, t, declaredHeel: state.heelPosition, transformedButt: butt.toArray(), residual: butt.distanceTo(new Vector3(...state.heelPosition!)) }, cribs: [5.0, 5.8, 6.0].map(phase => {
  const t = lintel.start + lintel.duration * phase / 8, state = stonehengeConstructionStateAt(lintel, lintelRoute, t);
  const layers = Math.max(1, Math.min(22, Math.round(state.cribHeight / .22)));
  stoneWork.update([{ stone: lintel, route: lintelRoute, state }], t);
  // Inspect actual written per-instance matrices for this operation's renderer.
  const renderedCribs = (stoneWork as unknown as { cribLogs: InstancedMesh }).cribLogs;
  const renderedGuides = (stoneWork as unknown as { guideBeams: InstancedMesh }).guideBeams;
  let renderedBottom = Infinity;
  for (let i = 0; i < renderedCribs.count; i++) {
    const m = new Matrix4(); renderedCribs.getMatrixAt(i, m);
    for (const x of [-.5, .5]) for (const y of [-.5, .5]) for (const z of [-.5, .5]) {
      renderedBottom = Math.min(renderedBottom, new Vector3(x, y, z).applyMatrix4(m).y);
    }
  }
  return { id: lintel.id, t, mechanism: state.mechanism, cribHeight: state.cribHeight, layers, actualRenderedCribCount: renderedCribs.count, actualRenderedGuideCount: renderedGuides.count, actualRenderedCribBottom: Number.isFinite(renderedBottom) ? renderedBottom : null, lowestLogBottomIfCrib: state.cribHeight - .11 - (layers - 1) * .22 - .22 * .9 / 2, terrainY: stonehengeTerrainHeightAt(state.position[0], state.position[2]) };
}) };
stoneWork.dispose(); stoneMat.all.forEach(m => m.dispose());

const part = COLOSSEUM_CONSTRUCTION.parts.find(p => p.id === 'arcade-1-8')!, route = COLOSSEUM_CONSTRUCTION.routes[0]!;
const subsegmentBoundary = part.start + part.duration * (.14 + .34 * Math.sqrt(.34 / 2));
const before = colosseumPartStateAt(part, route, subsegmentBoundary - 1e-10), after = colosseumPartStateAt(part, route, subsegmentBoundary + 1e-10);
const colosseum = { haul: { id: part.id, t: subsegmentBoundary, before: before.position, after: after.position, jump: Math.hypot(...before.position.map((v, i) => v - after.position[i]!)) }, scaffold: [.979999, .98].map(t => ({ t, height: colosseumScaffoldsAt(t)[0]?.height ?? 0 })), crane: [.001, .3, .6, .95].map(local => {
  const t = part.start + part.duration * (.58 + .32 * local), state = colosseumPartStateAt(part, route, t), rig = colosseumCraneRigAt(part, state)!;
  return { t, mastLength: rig.mastTop[1] - rig.base[1], boomLength: Math.hypot(...rig.boomTip.map((v, i) => v - rig.mastTop[i]!)) };
}), wagonDeckPenetrationAtFullLift: -.9 * .2 + .42 + .38 / 2 };
console.log(JSON.stringify({ scope: 'Current source CPU engine and Three.js object/transform probes; no browser or GPU claim', giza, stonehenge, colosseum }, null, 2));
