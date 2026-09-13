import { expect, it } from 'vitest';
import { BatchedMesh, InstancedMesh, Matrix4 } from 'three';
import { EIFFEL_GROUND_STATIONS } from '../src/engine/eiffelGroundStations';
import { EIFFEL_GROUND_STATION_ERECTION_READY } from '../src/engine/eiffelGroundStationErection';
import { sampleEiffelGroundPlantRetirement, sampleEiffelRetiringStation } from '../src/engine/eiffelGroundPlantRetirement';
import { EIFFEL_FIRST_FLOOR_READY_T, sampleEiffelFilmEdit } from '../src/engine/eiffelFilmEdit';
import { EiffelGroundLiftSystem } from '../src/render/three/EiffelGroundLiftSystem';

it('keeps all ground plant across 26–27%, until the first-floor deck is complete', () => {
  for(const seconds of [46.8,47.9,48,48.01,48.6,50,60,66]){
    const film=sampleEiffelFilmEdit('cinematic',seconds/180);
    expect(film.groundLiftVisible).toBe(true);
    expect(film.jointPlantVisible).toBe(true);
    expect(film.suppressedGroundStations).toEqual(['ne']);
    expect(Object.values(film.plantRetirement)).toEqual([0,0,0,0]);
  }
  for(let seconds=66;seconds<90;seconds+=.1){
    const film=sampleEiffelFilmEdit('cinematic',seconds/180);
    expect(film.productionT).toBeGreaterThanOrEqual(EIFFEL_FIRST_FLOOR_READY_T);
    expect(film.groundLiftVisible).toBe(true);
  }
  expect(sampleEiffelFilmEdit('cinematic',.5).groundLiftVisible).toBe(false);
  expect(sampleEiffelFilmEdit('cinematic',78/180).jointPlantVisible).toBe(false);
});

it('staggers unloaded plant removal and removes crane before its support from the top down', () => {
  const counts:number[]=[];
  let previous=EIFFEL_GROUND_STATIONS.map(()=>EIFFEL_GROUND_STATION_ERECTION_READY);
  for(let frame=0;frame<=24*60;frame++){
    const seconds=66+frame/60,retirement=sampleEiffelGroundPlantRetirement(seconds);
    const states=EIFFEL_GROUND_STATIONS.map(station=>sampleEiffelRetiringStation(retirement[station.id]));
    states.forEach((state,i)=>{
      expect(state.seatedSupportIds).toEqual(previous[i]!.seatedSupportIds.slice(0,state.seatedSupportCount));
      if(state.seatedSupportCount<state.supportCount)expect(state.craneRoles).toEqual([]);
    });
    counts.push(states.reduce((sum,state)=>sum+state.seatedSupportCount,0));
    previous=states;
  }
  const delta=counts.slice(1).map((n,i)=>n-counts[i]!);
  expect(Math.max(...delta.map(Math.abs))).toBeLessThanOrEqual(3);
  expect(Math.max(...delta.slice(1).map((n,i)=>Math.abs(n-delta[i]!)))).toBeLessThanOrEqual(3);
  expect(counts.at(-1)).toBe(0);
  expect(sampleEiffelGroundPlantRetirement(72)).toEqual({ne:.5,nw:1/6,sw:0,se:0});
});

it('renders each station retirement independently and restores exact rigid matrices on reverse seek', async () => {
  const system=new EiffelGroundLiftSystem();await system.ready;system.setFourStations(true);system.setSuppressedStations(['ne']);
  const snapshot=()=>{
    const result:unknown[]=[];system.group.updateMatrixWorld(true);
    system.group.traverse(o=>{
      if(!o.visible)return;
      if(o instanceof InstancedMesh || o instanceof BatchedMesh){
        const entries:number[][]=[];
        const count=o instanceof InstancedMesh?o.count:o.instanceCount;
        for(let i=0;i<count;i++){
          if(o instanceof BatchedMesh&&!o.getVisibleAt(i))continue;
          const m=new Matrix4();o.getMatrixAt(i,m);m.premultiply(o.matrixWorld);
          expect(m.determinant()).toBeGreaterThan(0);
          entries.push(m.elements.slice());
        }
        result.push({name:o.name,entries});
      }
    });return result;
  };
  try{
    const at=(seconds:number)=>system.update(55,EIFFEL_GROUND_STATION_ERECTION_READY,sampleEiffelGroundPlantRetirement(seconds));
    at(74);const expected=snapshot();
    const timber=system.group.getObjectByName('ground-station-support-timber') as InstancedMesh;
    const iron=system.group.getObjectByName('ground-station-support-iron') as InstancedMesh;
    const nw=sampleEiffelRetiringStation(sampleEiffelGroundPlantRetirement(74).nw);
    expect(timber.count+iron.count).toBe(nw.seatedSupportCount);
    at(90);snapshot();
    system.group.traverse(o=>{if(!o.visible)return;if(o instanceof InstancedMesh)expect(o.count).toBe(0);if(o instanceof BatchedMesh)for(let i=0;i<o.instanceCount;i++)expect(o.getVisibleAt(i)).toBe(false);});
    at(74);expect(snapshot()).toEqual(expected);
    at(48.6);expect(timber.count+iron.count).toBe(0);
    expect(system.group.userData.visibleStationCount).toBe(3);
  }finally{system.dispose();}
});
