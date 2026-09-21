import { describe, expect, it } from 'vitest';
import { Box3, InstancedMesh, Matrix4, PerspectiveCamera, Vector3 } from 'three';
import { getWonder } from '../src/data';
import { COLOSSEUM_CONSTRUCTION } from '../src/data/colosseumConstruction';
import { colosseumCraneRigAt, colosseumPartStateAt, colosseumScaffoldsAt } from '../src/engine/colosseumConstruction';
import { colosseumTerrainHeightAt } from '../src/engine/colosseumTerrain';
import { colosseumRomeLotsOf } from '../src/engine/colosseumRomeLots';
import { ColosseumWorkSystem } from '../src/render/three/ColosseumWorkSystem';
import { ColosseumStoneSystem } from '../src/render/three/ColosseumStoneSystem';
import { ColosseumEnvironment } from '../src/render/three/ColosseumEnvironment';
import { sampleColosseumSky } from '../src/data/colosseumSky';
import { colosseumCinematicShotAt } from '../src/engine/colosseumCamera';
import { colosseumFilmAt } from '../src/engine/colosseumFilm';
import { createMaterialLibrary } from '../src/render/three/MaterialLibrary';

const route = COLOSSEUM_CONSTRUCTION.routes[0]!;
const part = COLOSSEUM_CONSTRUCTION.parts.find(p => p.id === 'arcade-1-8')!;
const stateAt = (u: number) => colosseumPartStateAt(part, route, part.start + part.duration * u);
const distance = (a: readonly number[], b: readonly number[]) => Math.hypot(...a.map((v, i) => v - b[i]!));
const angleGap = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
const bounds = (mesh: InstancedMesh, index: number) => {
  const matrix = new Matrix4(); mesh.getMatrixAt(index, matrix);
  const positions = mesh.geometry.attributes.position!;
  const box = new Box3();
  for (let i = 0; i < positions.count; i++) box.expandByPoint(new Vector3().fromBufferAttribute(positions, i).applyMatrix4(matrix));
  return box;
};

describe('Colosseum physical repair regressions', () => {
  it('joins the source road, ellipse entry and staging in both position and heading', () => {
    for (const p of COLOSSEUM_CONSTRUCTION.parts.filter((_, i) => i % 19 === 0)) {
      for (const eased of [.25, ...Array.from({length:13}, (_, i) => .34 + .48 * i / 12)]) {
        const local = eased < .5 ? Math.sqrt(eased / 2) : 1 - Math.sqrt((1 - eased) / 2);
        const at = p.start + p.duration * (.14 + local * .34);
        const a = colosseumPartStateAt(p, route, at - 1e-11);
        const b = colosseumPartStateAt(p, route, at + 1e-11);
        expect(distance(a.position, b.position), p.id).toBeLessThan(.001);
        expect(angleGap(a.rotation[1], b.rotation[1]), p.id).toBeLessThan(.001);
      }
    }
  });
  it('keeps heading aligned with travel around the ring', () => {
    for (const local of [.48, .55, .64, .73]) {
      const u = .14 + .34 * local;
      const a = stateAt(u - 1e-6), b = stateAt(u + 1e-6), c = stateAt(u);
      expect(angleGap(c.rotation[1], Math.atan2(b.position[0] - a.position[0], b.position[2] - a.position[2]))).toBeLessThan(.01);
    }
  });
  it('places the actual wagon deck below the payload and its wheels on terrain', () => {
    const work = new ColosseumWorkSystem(createMaterialLibrary(getWonder('colosseum')!), COLOSSEUM_CONSTRUCTION);
    const state = stateAt(.3);
    work.update([{ part, state }], part.start + part.duration * .3);
    const deck = work.group.getObjectByName('colosseum-wagon-decks') as InstancedMesh;
    const wheels = work.group.getObjectByName('colosseum-wagon-wheels') as InstancedMesh;
    expect(bounds(deck, 0).max.y).toBeCloseTo(state.position[1] - part.dimensions[1] / 2, 5);
    for (let i = 0; i < wheels.count; i++) {
      const box = bounds(wheels, i), center = box.getCenter(new Vector3());
      expect(Math.abs(box.min.y - colosseumTerrainHeightAt(center.x, center.z))).toBeLessThan(.03);
    }
    work.dispose();
  });
  it('keeps actual mast and jib member lengths fixed across lift, slew and lower', () => {
    const work = new ColosseumWorkSystem(createMaterialLibrary(getWonder('colosseum')!), COLOSSEUM_CONSTRUCTION);
    const lengths: number[][] = [];
    for (const local of [.02, .2, .4, .55, .75, .9, .99]) {
      const state = stateAt(.58 + local * .32), rig = colosseumCraneRigAt(part, state)!;
      work.update([{ part, state }], part.start + part.duration * (.58 + local * .32));
      const mast = work.group.getObjectByName('colosseum-crane-masts') as InstancedMesh;
      const jib = work.group.getObjectByName('colosseum-crane-jibs') as InstancedMesh;
      const platform = work.group.getObjectByName('colosseum-crane-platforms') as InstancedMesh;
      const feet = work.group.getObjectByName('colosseum-crane-supports') as InstancedMesh;
      const matrix = new Matrix4(), mastScale = new Vector3(), jibScale = new Vector3();
      mast.getMatrixAt(0, matrix); mastScale.setFromMatrixScale(matrix);
      jib.getMatrixAt(0, matrix); jibScale.setFromMatrixScale(matrix);
      lengths.push([mastScale.y, jibScale.y]);
      expect(rig.boomTip[0]).toBeCloseTo(rig.hook[0], 6);
      expect(rig.boomTip[2]).toBeCloseTo(rig.hook[2], 6);
      const platformBox = bounds(platform, 0);
      expect(platformBox.max.y).toBeCloseTo(rig.base[1], 5);
      expect(platformBox.containsPoint(new Vector3(...rig.base).add(new Vector3(0, -.01, 0)))).toBe(true);
      expect(feet.count).toBe(4);
      for (let foot = 0; foot < feet.count; foot++) {
        const footBox = bounds(feet, foot), center = footBox.getCenter(new Vector3());
        expect(footBox.min.y).toBeCloseTo(colosseumTerrainHeightAt(center.x, center.z), 4);
        expect(footBox.max.y).toBeCloseTo(platformBox.min.y, 4);
      }
    }
    for (const pair of lengths) for (let axis = 0; axis < 2; axis++) expect(pair[axis]).toBeCloseTo(lengths[0]![axis]!, 4);
    work.dispose();
  });
  it('strikes all final lifts progressively, without a 98 percent bulk drop', () => {
    let previous = colosseumScaffoldsAt(.90);
    for (let frame = 1; frame <= 360; frame++) {
      const t = .90 + frame / 3600;
      const next = colosseumScaffoldsAt(t);
      const count = (bays: typeof next) => bays.reduce((sum, b) => sum + b.segmentCount, 0);
      expect(count(previous) - count(next), `frame ${frame}`).toBeGreaterThanOrEqual(0);
      expect(count(previous) - count(next), `frame ${frame}`).toBeLessThanOrEqual(4);
      for (const bay of next) {
        const before = previous.find(b => b.station === bay.station)!;
        expect(before.segmentCount - bay.segmentCount).toBeLessThanOrEqual(1);
        expect(bay.footY).toBe(before.footY);
      }
      expect(colosseumScaffoldsAt(t)).toEqual(next);
      previous = next;
    }
    expect(previous).toHaveLength(0);
  });
});


describe('Colosseum Rome runtime cost', () => {
  it('restores desktop stone detail after portrait without moving any instance', () => {
    const stones = new ColosseumStoneSystem(COLOSSEUM_CONSTRUCTION, createMaterialLibrary(getWonder('colosseum')!));
    stones.update(.86);
    for (const kind of ['arch', 'seat']) {
      const mesh = stones.group.getObjectByName(`colosseum-parts-${kind}`) as InstancedMesh;
      const full = mesh.geometry;
      const transforms = Array.from(mesh.instanceMatrix.array);
      const count = mesh.count;
      full.computeBoundingBox();
      stones.setCompactDetail(true);
      mesh.geometry.computeBoundingBox();
      expect(mesh.geometry.attributes.position!.count).toBeLessThan(full.attributes.position!.count);
      expect(mesh.geometry.boundingBox!.min.distanceTo(full.boundingBox!.min)).toBeLessThan(1e-6);
      expect(mesh.geometry.boundingBox!.max.distanceTo(full.boundingBox!.max)).toBeLessThan(1e-6);
      expect(mesh.count).toBe(count);
      expect(Array.from(mesh.instanceMatrix.array)).toEqual(transforms);
      stones.setCompactDetail(false);
      expect(mesh.geometry).toBe(full);
    }
    stones.dispose();
  });
  it('keeps the full portrait ellipse inside the actual projected frame', () => {
    for (const aspect of [390/844, 320/844]) for (const t of [.32, .58, .86, 1]) {
      const shot = colosseumCinematicShotAt(t, aspect), horizontal = Math.cos(shot.pitch) * shot.radius;
      const camera = new PerspectiveCamera(shot.fov, aspect, .1, 4000);
      camera.position.set(shot.target[0]+Math.cos(shot.azimuth)*horizontal, shot.target[1]+Math.sin(shot.pitch)*shot.radius, -shot.target[2]-Math.sin(shot.azimuth)*horizontal);
      camera.lookAt(shot.target[0], shot.target[1], -shot.target[2]); camera.updateMatrixWorld();
      for (let i = 0; i < 80; i++) for (const y of [0, 48]) {
        const theta = i / 80 * Math.PI * 2;
        const screen = new Vector3(94*Math.cos(theta), y, -78*Math.sin(theta)).project(camera);
        expect(Math.abs(screen.x)).toBeLessThan(.94);
      }
    }
  });
  it('retains all city lots while culling and restoring their exact matrices on reverse seeks and resize', async () => {
    const environment = new ColosseumEnvironment(createMaterialLibrary(getWonder('colosseum')!));
    environment.group.scale.z = -1;
    await environment.ready;
    const names = ['colosseum-insulae', 'colosseum-insulae-roofs', 'colosseum-umbrella-pines', 'colosseum-cypress', 'colosseum-housing-stepped', 'colosseum-housing-frontage', 'colosseum-housing-corner', 'colosseum-housing-stepped-roofs', 'colosseum-housing-frontage-roofs', 'colosseum-housing-corner-roofs', 'colosseum-housing-foundations'];
    const meshes = names.map(name => environment.group.getObjectByName(name) as InstancedMesh);
    const totals = meshes.map(mesh => mesh.count);
    const house = meshes[0]!;
    const prototypeTriangles = (house.geometry.index?.count ?? house.geometry.attributes.position!.count) / 3;
    expect(prototypeTriangles).toBeLessThan(200);
    expect([0,4,5,6].reduce((sum, index) => sum + totals[index]!, 0)).toBe(colosseumRomeLotsOf('insula').length);
    expect(totals[2]).toBe(colosseumRomeLotsOf('pine').length);
    for (const mesh of meshes) expect(mesh.castShadow).toBe(false);
    const light = { sun: {azimuth:0,elevation:20,color:'#fff',intensity:1}, ambient:{skyColor:'#fff',groundColor:'#fff',intensity:1}, sky:'#fff', fog:'#fff', emissive:0 };
    const camera = new PerspectiveCamera(35, 1.6, .1, 4000);
    const frame = (t: number, aspect: number) => {
      const shot = colosseumCinematicShotAt(t, aspect), horizontal = Math.cos(shot.pitch) * shot.radius;
      camera.position.set(shot.target[0]+Math.cos(shot.azimuth)*horizontal, shot.target[1]+Math.sin(shot.pitch)*shot.radius, -shot.target[2]-Math.sin(shot.azimuth)*horizontal);
      camera.lookAt(new Vector3(shot.target[0],shot.target[1],-shot.target[2])); camera.aspect = aspect; camera.fov = shot.fov; camera.updateProjectionMatrix();
      environment.update(colosseumFilmAt(t).constructionT, light, sampleColosseumSky(t), camera);
      return meshes.map(mesh => ({count:mesh.count, matrices:Array.from(mesh.instanceMatrix.array).slice(0,mesh.count*16), colors:mesh.instanceColor ? Array.from(mesh.instanceColor.array).slice(0,mesh.count*3) : []}));
    };
    const desktop = frame(.86, 1.6);
    expect(desktop[0]!.count).toBeLessThan(totals[0]!);
    const portrait = frame(.86, 390/844);
    expect(portrait[0]!.count).toBeLessThan(desktop[0]!.count);
    frame(.2, 1.6);
    expect(frame(.86, 1.6)).toEqual(desktop);
    expect(frame(.86, 390/844)).toEqual(portrait);
    environment.dispose();
  });
});

it('keeps the complete film and mapped daylight work within geometry budgets with grounded shadows', async () => {
  const { ColosseumWorld } = await import('../src/render/three/ColosseumWorld');
  const { Mesh } = await import('three');
  const world = new ColosseumWorld(createMaterialLibrary(getWonder('colosseum')!));
  await world.ready;
  const light = { sun: {azimuth:0,elevation:20,color:'#fff',intensity:1}, ambient:{skyColor:'#fff',groundColor:'#fff',intensity:1}, sky:'#fff', fog:'#fff', emissive:0 };
  // Construction and camera no longer share normalized time. Include the exact
  // narrow construction peak found by the 3,601-frame sweep, plus the evening
  // hold after labour stops, on short/tall phones and both desktop aspects.
  const checkpoints = [...Array.from({ length: 101 }, (_, i) => i / 100), .6702777777777778];
  for (const aspect of [1.6, 16/9, 390/844, 320/844, 375/667, .6, .71, 1.6]) for (const t of checkpoints) {
    const constructionT = colosseumFilmAt(t).constructionT;
    const shot = colosseumCinematicShotAt(t, aspect), camera = new PerspectiveCamera(shot.fov, aspect, .1, 4000);
    const horizontal = Math.cos(shot.pitch)*shot.radius;
    camera.position.set(shot.target[0]+Math.cos(shot.azimuth)*horizontal,shot.target[1]+Math.sin(shot.pitch)*shot.radius,-shot.target[2]-Math.sin(shot.azimuth)*horizontal);
    camera.lookAt(new Vector3(shot.target[0],shot.target[1],-shot.target[2]));
    world.update(constructionT, light, new Vector3(1,1,1), sampleColosseumSky(t), camera);
    let triangles = 0;
    world.group.traverseVisible(object => {
      if (!(object instanceof Mesh)) return;
      const count = (object.geometry.index?.count ?? object.geometry.attributes.position!.count)/3;
      triangles += count * (object instanceof InstancedMesh ? object.count : 1) * (object.castShadow ? 2 : 1);
    });
    expect(triangles, `aspect ${aspect}, t=${t}`).toBeLessThanOrEqual(aspect < .72 ? 120_000 : 180_000);
    const bodies = world.group.getObjectByName('colosseum-crew-bodies') as InstancedMesh;
    const heads = world.group.getObjectByName('colosseum-crew-heads') as InstancedMesh;
    const proxy = world.group.getObjectByName('colosseum-scaffold-shadow-columns') as InstancedMesh;
    expect(bodies.castShadow).toBe(true);
    expect(heads.castShadow).toBe(aspect >= .72);
    expect(proxy.castShadow).toBe(true);
    expect(proxy.count).toBe(colosseumScaffoldsAt(constructionT).length * 4);
    const outerArches = world.group.getObjectByName('colosseum-parts-arch') as InstancedMesh;
    const innerArches = world.group.getObjectByName('colosseum-parts-arch-inner') as InstancedMesh;
    expect(outerArches.castShadow).toBe(true);
    expect(innerArches.castShadow).toBe(false);
    expect(innerArches.visible).toBe(true);
    expect(outerArches.count + innerArches.count).toBe(COLOSSEUM_CONSTRUCTION.parts.filter(part => part.kind==='arch' && colosseumPartStateAt(part, route, constructionT).phase==='seated').length);
    for (let i=0; i<proxy.count; i++) {
      const box = bounds(proxy,i), center = box.getCenter(new Vector3());
      expect(Math.abs(box.min.y - colosseumTerrainHeightAt(center.x,center.z))).toBeLessThan(.03);
    }
  }
  world.dispose();
});
