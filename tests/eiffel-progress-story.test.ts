import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import type { EiffelKitManifest } from '../src/data/eiffelKitTypes';
import { EIFFEL_CINEMATIC_KEYS, EIFFEL_CINEMATIC_PRODUCTION_KEYS, EIFFEL_FIRST_FLOOR_READY_T, EIFFEL_SECOND_FLOOR_READY_T, eiffelFilmEditShotAt, sampleEiffelFilmEdit } from '../src/engine/eiffelFilmEdit';
import { createEiffelProductionPlan, sampleEiffelProductionOperation, type EiffelProductionPlan } from '../src/engine/eiffelProductionConstruction';
import { EIFFEL_GROUND_STATIONS, sampleEiffelGroundStation } from '../src/engine/eiffelGroundStations';
import { sampleEiffelJointCampaign } from '../src/engine/eiffelJointCampaign';
import { sampleEiffelLongLoadFilm, EIFFEL_LONG_LOAD_FILM_PART_ID } from '../src/engine/eiffelLongLoadFilm';
import { sampleEiffelSecondFloorRelaySequence } from '../src/engine/eiffelSecondFloorRelaySequence';
import { EIFFEL_RELAY_HANDOFF_START } from '../src/engine/eiffelRelayHandoff';
import { eiffelSolidBox } from '../src/engine/eiffelOccupancy';
import type { RigidPose } from '../src/engine/eiffelRigid';

const manifestPath='public/models/eiffel-construction-kit/tower-kit.manifest.json';
let manifest:EiffelKitManifest,plan:EiffelProductionPlan;
const at=(seconds:number)=>sampleEiffelFilmEdit('cinematic',seconds/180);
function frame(seconds:number){
  const film=at(seconds),seated=new Set<string>();let seatedHeight=0,movingHeight=0,movingCount=0;
  const stationPoses=new Map(EIFFEL_GROUND_STATIONS.map(s=>[s.payloadId,sampleEiffelGroundStation(film.pilotSeconds,s.id).payload.pose]));
  const joint=film.insertionId==='joint-campaign'?sampleEiffelJointCampaign(film.campaignSeconds):null;
  for(const op of plan.operations){
    const id=op.part.id;let pose:RigidPose|undefined;
    if(film.transportedPartIds.includes(id)){
      if(id===EIFFEL_LONG_LOAD_FILM_PART_ID){
        if(film.longLoadSeconds>280)pose=sampleEiffelSecondFloorRelaySequence((film.longLoadSeconds-280)*2).payloadPose;
        else {const carrier=sampleEiffelLongLoadFilm(film.longLoadSeconds).carrierOrigin;pose={position:[carrier[0]+EIFFEL_RELAY_HANDOFF_START.payloadLocalPosition[0],carrier[1]+EIFFEL_RELAY_HANDOFF_START.payloadLocalPosition[1],carrier[2]+EIFFEL_RELAY_HANDOFF_START.payloadLocalPosition[2]],quaternion:[0,0,0,1]};}
      }
    } else if(film.seatedPartIds.includes(id)){seated.add(id);seatedHeight=Math.max(seatedHeight,op.part.boundsMax[1]);continue;}
    else if(joint?.loads.some(load=>load.partId===id))pose=joint.loads.find(load=>load.partId===id)!.pose;
    else if(film.insertionId==='ground-lift'&&stationPoses.has(id as typeof EIFFEL_GROUND_STATIONS[number]['payloadId']))pose=stationPoses.get(id as typeof EIFFEL_GROUND_STATIONS[number]['payloadId']);
    else if(op.end<=film.productionT){seated.add(id);seatedHeight=Math.max(seatedHeight,op.part.boundsMax[1]);continue;}
    else if(op.start<=film.productionT){const state=sampleEiffelProductionOperation(op,film.productionT);if(state.phase!=='queued')pose=state.pose;}
    if(pose){const b=eiffelSolidBox(op.part,pose);movingHeight=Math.max(movingHeight,b.center[1]+b.axes.reduce((sum,axis,i)=>sum+Math.abs(axis[1]!)*b.half[i]!,0));movingCount++;}
  }
  return {seconds,sourceSeconds:film.seconds,productionT:film.productionT,chapter:film.chapter,longLoadSeconds:film.longLoadSeconds,relayReady:film.relayReady,seated,seatedHeight,movingHeight,movingCount,visibleHeight:Math.max(seatedHeight,movingHeight)};
}

describe('cinematic construction story against the actual tower kit',()=>{
  beforeAll(()=>{manifest=JSON.parse(readFileSync(manifestPath,'utf8')) as EiffelKitManifest;plan=createEiffelProductionPlan(manifest);},30000);

  it('makes the requested progress points different without a premature summit silhouette',()=>{
    const opening=frame(18),firstFloor=frame(72),twoFloors=frame(118.8),rising=frame(126),late=frame(162),end=frame(180);
    expect(opening.visibleHeight).toBeLessThan(35);
    expect(firstFloor.seatedHeight).toBeGreaterThanOrEqual(57.94);expect(firstFloor.visibleHeight).toBeLessThan(80);
    expect(firstFloor.seated.size).toBeGreaterThan(opening.seated.size*2);
    // The relay overview now shows substantial shaft erection above both decks.
    expect(twoFloors.seatedHeight).toBeGreaterThan(170);expect(twoFloors.visibleHeight).toBeLessThan(210);
    expect(rising.seatedHeight).toBeGreaterThan(twoFloors.seatedHeight);
    expect(late.seatedHeight).toBeLessThan(312);expect(end.seatedHeight).toBeCloseTo(312,5);expect(end.seated.size).toBe(manifest.parts.length);
  });

  it('admits each relay only after every actual bearing-platform member is seated',()=>{
    const first=plan.operations.filter(op=>op.part.id.startsWith('platform-1-'));
    const second=plan.operations.filter(op=>op.part.id.startsWith('platform-2-'));
    expect(Math.max(...first.map(op=>op.end))).toBe(EIFFEL_FIRST_FLOOR_READY_T);
    expect(Math.max(...second.map(op=>op.end))).toBeCloseTo(EIFFEL_SECOND_FLOOR_READY_T,14);
    for(let i=0;i<=1800;i++){const f=at(i/10);if(f.insertionId==='long-load-first-floor'){
      expect(first.every(op=>op.end<=f.productionT),`first floor at ${i/10}`).toBe(true);
      if(f.relayReady)expect(second.every(op=>op.end<=f.productionT),`second floor at ${i/10}`).toBe(true);
      if(f.longLoadSeconds>280)expect(f.relayReady,`upper gear at ${i/10}`).toBe(true);
    }}
  });

  it('retains four reserved ground deliveries and holds the upper payload supported until installation',()=>{
    const ids=EIFFEL_GROUND_STATIONS.map(s=>s.payloadId);expect(new Set(ids).size).toBe(4);expect(ids.every(id=>plan.byPart.has(id))).toBe(true);
    for(const seconds of[24.01,28,48,72,124,158,180])for(const id of ids)expect(frame(seconds).seated.has(id),`${id} at ${seconds}`).toBe(true);
    for(const seconds of[124,130,144,157.9]){const f=at(seconds),relay=sampleEiffelSecondFloorRelaySequence((f.longLoadSeconds-280)*2);
      expect(f.transportedPartIds).toContain(EIFFEL_LONG_LOAD_FILM_PART_ID);expect(f.seatedPartIds).not.toContain(EIFFEL_LONG_LOAD_FILM_PART_ID);
      expect(relay.carrierSupport).toBe('upper-receiver');expect(relay.secondHoist.attached).toBe(true);expect(relay.carrierPose.position[1]).toBeCloseTo(116.47999939,7);
    }
    expect(at(161.999).seatedPartIds).not.toContain(EIFFEL_LONG_LOAD_FILM_PART_ID);
  });

  it('preserves every seated identity over dense forward playback and reverse seeks',()=>{
    let previous=new Set<string>(),production=-1;const removals:{seconds:number;id:string}[]=[],samples:(Omit<ReturnType<typeof frame>,'seated'>&{seatedCount:number;seatedIdentityHash:string})[]=[];
    for(let i=0;i<=1800;i++){const f=frame(i/10);for(const id of previous)if(!f.seated.has(id))removals.push({seconds:f.seconds,id});
      expect(f.productionT+1e-14).toBeGreaterThanOrEqual(production);previous=f.seated;production=f.productionT;
      const {seated,...record}=f;samples.push({...record,seatedCount:seated.size,seatedIdentityHash:createHash('sha256').update([...seated].sort().join('\n')).digest('hex')});
    }
    if(process.env.WONDERFORGE_WRITE_STORY_AUDIT==='1'){
      const root='artifacts/eiffel-progress-2026-09-13';mkdirSync(root,{recursive:true});
      writeFileSync(root+'/sequence-audit.json',JSON.stringify({generatedAt:new Date().toISOString(),scope:'Pure actual-manifest production and reserved-payload poses; no browser/GPU claims',sourceHashes:Object.fromEntries([manifestPath,'src/engine/eiffelFilmEdit.ts','src/engine/eiffelGroundStations.ts'].map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')])),sourceKeys:EIFFEL_CINEMATIC_KEYS,productionKeys:EIFFEL_CINEMATIC_PRODUCTION_KEYS,removals,requested:samples.filter(s=>[9,10.8,18,72,118.8,126,162,180].includes(s.seconds)),samples},null,2));
    }
    expect(removals).toEqual([]);
    for(const seconds of[9,10.8,18,72,118.8,126,162,180]){const expected=frame(seconds);frame(180);expect(frame(seconds)).toEqual(expected);}
  },30000);

  it('starts the leg approach by six percent and never returns to a low close-up after withdrawal',()=>{
    const start=eiffelFilmEditShotAt('cinematic',9/180),approaching=eiffelFilmEditShotAt('cinematic',10.8/180),close=eiffelFilmEditShotAt('cinematic',12/180);
    expect(approaching.radius).toBeLessThan(start.radius);expect(close.radius).toBeLessThan(50);
    for(let seconds=88;seconds<=180;seconds+=.25)expect(eiffelFilmEditShotAt('cinematic',seconds/180).radius,`${seconds}s`).toBeGreaterThan(200);
    // Sample both sides of every authored join: shrinking the step must shrink
    // the jump, rather than merely passing a permissive frame-distance limit.
    const joins=new Set([...EIFFEL_CINEMATIC_KEYS,...EIFFEL_CINEMATIC_PRODUCTION_KEYS].map(k=>k[0]));
    for(const seconds of joins){if(seconds<=0||seconds>=180)continue;const a=eiffelFilmEditShotAt('cinematic',(seconds-1e-6)/180),b=eiffelFilmEditShotAt('cinematic',(seconds+1e-6)/180);
      expect(Math.abs(a.radius-b.radius),`radius join ${seconds}`).toBeLessThan(.01);expect(Math.hypot(...a.target.map((v,i)=>v-b.target[i]!)),`target join ${seconds}`).toBeLessThan(.01);
    }
  });
});
