import {readFileSync} from 'node:fs';
import {beforeAll,expect,it} from 'vitest';
import type {EiffelKitManifest} from '../src/data/eiffelKitTypes';
import {EIFFEL_FILM_INSERTIONS} from '../src/engine/eiffelFilm';
import {sampleEiffelFilmEdit,type EiffelEditedFilmSample} from '../src/engine/eiffelFilmEdit';
import {EIFFEL_GROUND_STATIONS,sampleEiffelGroundStation} from '../src/engine/eiffelGroundStations';
import {EIFFEL_JOINT_CAMPAIGN_PART_IDS,sampleEiffelJointCampaign} from '../src/engine/eiffelJointCampaign';
import {EiffelOccupancy,eiffelBoxPenetration,eiffelSolidBox} from '../src/engine/eiffelOccupancy';
import {createEiffelProductionPlan,sampleEiffelProductionOperation,type EiffelProductionOperation,type EiffelProductionPlan} from '../src/engine/eiffelProductionConstruction';
import {transformRigidPoint,type RigidPose} from '../src/engine/eiffelRigid';

let plan:EiffelProductionPlan;
beforeAll(()=>{
  const manifest=JSON.parse(readFileSync('public/models/eiffel-construction-kit/tower-kit.manifest.json','utf8')) as EiffelKitManifest;
  plan=createEiffelProductionPlan(manifest,{upperClearance:'skip'});
},60000);

const featureIds=new Set<string>([
  ...EIFFEL_GROUND_STATIONS.map(station=>station.payloadId),
  ...EIFFEL_FILM_INSERTIONS.flatMap(insertion=>insertion.deliveries.map(delivery=>delivery.partId)),
]);
const at=(seconds:number)=>sampleEiffelFilmEdit('cinematic',seconds/180);

/** Match renderer ownership before consulting the ordinary production plan.
 * An operation ending does not seat a member still owned by a featured rig. */
function visibleState(op:EiffelProductionOperation,film:EiffelEditedFilmSample):{phase:'queued'|'moving'|'seated';pose:RigidPose}{
  if(film.transportedPartIds.includes(op.part.id))return {phase:'queued',pose:op.pickup};
  if(film.seatedPartIds.includes(op.part.id))return {phase:'seated',pose:op.part.finalPose};
  if(film.insertionId==='joint-campaign'&&EIFFEL_JOINT_CAMPAIGN_PART_IDS.some(id=>id===op.part.id)){
    const load=sampleEiffelJointCampaign(film.campaignSeconds).loads.find(load=>load.partId===op.part.id)!;
    return {phase:'moving',pose:load.pose};
  }
  if(film.insertionId==='ground-lift'){
    const station=EIFFEL_GROUND_STATIONS.find(station=>station.payloadId===op.part.id);
    if(station)return {phase:'moving',pose:sampleEiffelGroundStation(film.pilotSeconds,station.id).payload.pose};
  }
  const sample=sampleEiffelProductionOperation(op,film.productionT);
  return {phase:sample.phase==='queued'?'queued':sample.phase==='seated'?'seated':'moving',pose:sample.pose};
}

it('advances structural time throughout camera approaches, close views and withdrawals',()=>{
  for(const [start,end]of [[9,28],[29,48],[66,88],[104,124],[158,162]]){
    for(let seconds=start!;seconds<end!;seconds+=.25){
      expect(at(seconds+.25).productionT,`structural clock ${seconds}s`).toBeGreaterThan(at(seconds).productionT);
    }
  }
});

it('moves ordinary iron in every one- or two-second camera window independently of featured cargo',()=>{
  const ordinary=plan.operations.filter(op=>!featureIds.has(op.part.id));
  for(const [start,end,interval]of [[9,28,2],[30,48,1],[66,88,1],[104,124,1],[158,162,1]]){
    for(let seconds=start!;seconds+interval!<=end!;seconds+=.5){
      const first=at(seconds),last=at(seconds+interval!);
      let newlySeated=0,maxTravel=0;
      for(const op of ordinary){
        if(op.end<=first.productionT||op.start>=last.productionT)continue;
        const a=visibleState(op,first),b=visibleState(op,last);
        if(a.phase!=='seated'&&b.phase==='seated')newlySeated++;
        if(b.phase==='moving'){
          // A bounds corner catches genuine rigid rotation as well as travel.
          // Queued pieces start at their authored pickup, not an invented pose.
          const corner=op.part.localBounds.max;
          const pa=transformRigidPoint(a.pose,corner),pb=transformRigidPoint(b.pose,corner);
          maxTravel=Math.max(maxTravel,Math.hypot(...pb.map((v,i)=>v-pa[i]!)));
        }
      }
      expect(newlySeated>0||maxTravel>.02,`${seconds}–${seconds+interval!}s: ${newlySeated} ordinary seats, ${maxTravel}m ordinary movement`).toBe(true);
    }
  }
},15000);

it('seats the reserved joint support before starting its ordinary dependent',()=>{
  const support=plan.byPart.get('lower-ne-02-m012-c001')!;
  const dependent=plan.byPart.get('lower-ne-02-m014-c001')!;
  let witnessedDependent=false;
  for(let step=0;step<=320;step++){
    const film=at(28+step/40);
    if(film.productionT>=dependent.start){
      witnessedDependent=true;
      expect(visibleState(support,film).phase,`joint support at ${28+step/40}s`).toBe('seated');
      expect(film.seatedPartIds).toContain(support.part.id);
    }
  }
  expect(witnessedDependent).toBe(true);
});

it('never unseats featured members when ownership passes from a rig to the tower',()=>{
  const operations=[...featureIds].map(id=>plan.byPart.get(id)!);
  const seated=new Set<string>();
  for(let step=0;step<=1800;step++){
    const film=at(step/10);
    for(const op of operations){
      const state=visibleState(op,film);
      if(seated.has(op.part.id))expect(state.phase,`${op.part.id} at ${step/10}s`).toBe('seated');
      if(state.phase==='seated')seated.add(op.part.id);
    }
  }
  expect(seated.size).toBe(operations.length);
},15000);

it('keeps advancing background iron clear of the four ground loads through final lowering',()=>{
  const ordinary=plan.operations.filter(op=>!featureIds.has(op.part.id));
  const occupancy=new EiffelOccupancy(ordinary.map(op=>({part:op.part,end:op.end})));
  // New m016/m008/m000/m024 c001 neighbors previously obstructed the last
  // 0.4 seconds of descent. Check the entire moving-ground-load passage too.
  for(let step=90;step<240;step++){
    const seconds=step/10,film=at(seconds);
    const moving=ordinary.filter(op=>op.start<=film.productionT&&op.end>film.productionT);
    for(const station of EIFFEL_GROUND_STATIONS){
      const payload=sampleEiffelGroundStation(film.pilotSeconds,station.id).payload;
      const op=plan.byPart.get(payload.partId)!,box=eiffelSolidBox(op.part,payload.pose);
      const finalBox=eiffelSolidBox(op.part,op.part.finalPose);
      for(const neighbor of occupancy.nearby(box,film.productionT)){
        expect(visibleState(plan.byPart.get(neighbor.part.id)!,film).phase).toBe('seated');
        // Existing Guyenet contract permits only the exact final joint overlap
        // during lowering, with the same 1e-5 m numerical tolerance.
        const allowed=film.pilotSeconds>=40?eiffelBoxPenetration(finalBox,neighbor.box):0;
        expect(eiffelBoxPenetration(box,neighbor.box),`${seconds}s ${payload.partId} / seated ${neighbor.part.id}`).toBeLessThanOrEqual(allowed+1e-5);
      }
      for(const neighbor of moving){
        const state=visibleState(neighbor,film);
        if(state.phase!=='moving')continue;
        expect(eiffelBoxPenetration(box,eiffelSolidBox(neighbor.part,state.pose)),`${seconds}s ${payload.partId} / moving ${neighbor.part.id}`).toBeLessThanOrEqual(1e-5);
      }
    }
  }
},15000);
