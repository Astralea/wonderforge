import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { EIFFEL_GROUND_STATIONS, rotateGroundStationPoint, sampleEiffelGroundStation } from '../src/engine/eiffelGroundStations';
import { eiffelTerrainHeightAt } from '../src/engine/eiffelTerrain';
import { transformRigidPoint, type RigidVec3 } from '../src/engine/eiffelRigid';
import type { EiffelKitManifest } from '../src/data/eiffelKitTypes';
import frozen from '../artifacts/eiffel-integration-2026-09-07/guyenet-ne-station.json';
const manifest=JSON.parse(readFileSync('public/models/eiffel-construction-kit/tower-kit.manifest.json','utf8')) as EiffelKitManifest;

describe('four actual grounded station identities',()=>{
 it('seats four distinct manifest members with identical local bounds and rotated endpoints',()=>{
  expect(new Set(EIFFEL_GROUND_STATIONS.map(s=>s.payloadId)).size).toBe(4);
  const original=manifest.parts.find(p=>p.id===EIFFEL_GROUND_STATIONS[0].payloadId)!;
  for(const station of EIFFEL_GROUND_STATIONS){
   const part=manifest.parts.find(p=>p.id===station.payloadId)!;
   expect(part.localBounds).toEqual(original.localBounds);
   const sample=sampleEiffelGroundStation(55,station.id);
   expect(sample.payload.partId).toBe(part.id);
   for(const p of [part.localBounds.min,part.localBounds.max,...part.pickupLugs]){
    const actual=transformRigidPoint(sample.payload.pose,p);
    const expected=transformRigidPoint(part.finalPose,p);
    expect(Math.hypot(...actual.map((v,i)=>v-expected[i]))).toBeLessThan(1e-5);
   }
  }
 });
 it('keeps all support feet, wheels and haul corridors on the prepared ground',()=>{
  const feet:RigidVec3[]=[[44.5,0,-51],[44.5,0,-44.5],[51,0,-51],[51,0,-44.5],[42.8,0,-46.6],[46.6,0,-42.8]];
  for(const station of EIFFEL_GROUND_STATIONS){
   for(const p of [...feet,...([frozen.haulCorridor.from,frozen.haulCorridor.to].map(p=>[p[0],p[1],p[2]] as RigidVec3))]){
    const world=rotateGroundStationPoint(p,station.id);expect(eiffelTerrainHeightAt(world[0],world[2])).toBeCloseTo(0,10);
   }
   for(let seconds=0;seconds<=10;seconds+=.5){
    const s=sampleEiffelGroundStation(seconds,station.id);
    for(const wheel of s.carrier.wheelCenters)expect(wheel[1]-s.carrier.wheelRadius).toBeCloseTo(eiffelTerrainHeightAt(wheel[0],wheel[2]),10);
   }
  }
 });
 it('preserves exact sling lengths and reverse-seek state at each station',()=>{
  for(const station of EIFFEL_GROUND_STATIONS)for(const seconds of [0,10,14,26,32,40,46,49,55]){
   const first=sampleEiffelGroundStation(seconds,station.id);
   sampleEiffelGroundStation(55,station.id);sampleEiffelGroundStation(0,station.id);
   expect(sampleEiffelGroundStation(seconds,station.id)).toEqual(first);
   for(const sling of first.rigging.slings){
    const length=Math.hypot(...sling.points[1].map((v,i)=>v-sling.points[0][i]))+Math.hypot(...sling.points[2].map((v,i)=>v-sling.points[1][i]));
    expect(length).toBeCloseTo(sling.length,10);
   }
  }
 });
});
