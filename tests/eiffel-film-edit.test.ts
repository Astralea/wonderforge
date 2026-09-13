import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import type {EiffelKitManifest} from '../src/data/eiffelKitTypes';
import {eiffelSolidBox} from '../src/engine/eiffelOccupancy';
import {createEiffelProductionPlan,sampleEiffelProductionOperation} from '../src/engine/eiffelProductionConstruction';
import {eiffelFilmShotAt,eiffelJointCampaignShotAt,EIFFEL_FILM_DURATION,EIFFEL_FILM_INSERTIONS,EIFFEL_FILM_LONG_LOAD_CHAPTER_DURATION,EIFFEL_FILM_SECOND_FLOOR_LANDING_HOLD_SECONDS,eiffelFilmTimeForProduction,sampleEiffelFilm} from '../src/engine/eiffelFilm';
import {eiffelLongLoadCameraPointsAt} from '../src/engine/eiffelLongLoadCamera';
import {sampleEiffelJointCampaign,EIFFEL_JOINT_CAMPAIGN_PART_IDS} from '../src/engine/eiffelJointCampaign';
import {sampleEiffelJointFastening} from '../src/engine/eiffelJointFastening';
import {EIFFEL_CINEMATIC_KEYS,EIFFEL_DETAILED_KEYS,EIFFEL_CINEMATIC_CAPTION_WINDOWS,eiffelFilmEditDuration,eiffelFilmEditSourceSecondsAt,eiffelFilmEditSourceTAt,eiffelFilmEditTimeForSource,eiffelFilmEditShotAt,sampleEiffelFilmEdit} from '../src/engine/eiffelFilmEdit';

it('maps both same-duration detailed and 180-second edits smoothly over all source time',()=>{
  expect(eiffelFilmEditDuration('detailed')).toBe(EIFFEL_FILM_DURATION);expect(eiffelFilmEditDuration('cinematic')).toBe(180);
  for(let i=0;i<=1800;i++){
    const t=i/1800;
    for(const edit of['detailed','cinematic']as const){const s=eiffelFilmEditSourceTAt(edit,t);expect(eiffelFilmEditTimeForSource(edit,s)).toBeCloseTo(t,12);if(i)expect(s).toBeGreaterThan(eiffelFilmEditSourceTAt(edit,(i-1)/1800));}
  }
  for(const[e,s]of EIFFEL_CINEMATIC_KEYS){
    expect(eiffelFilmEditSourceSecondsAt('cinematic',e/180)).toBe(s);
    expect(eiffelFilmEditSourceTAt('cinematic',e/180)*EIFFEL_FILM_DURATION).toBeCloseTo(s,8);
  }
  expect(sampleEiffelFilmEdit('cinematic',124/180).longLoadSeconds)
    .toBe(EIFFEL_FILM_LONG_LOAD_CHAPTER_DURATION-EIFFEL_FILM_SECOND_FLOOR_LANDING_HOLD_SECONDS);
  expect(sampleEiffelFilmEdit('detailed',.1).continuousConstruction).toBe(false);
  expect(sampleEiffelFilmEdit('cinematic',.1).continuousConstruction).toBe(true);
  for(const[e,s]of EIFFEL_DETAILED_KEYS)expect(eiffelFilmEditSourceTAt('detailed',e/EIFFEL_FILM_DURATION)*EIFFEL_FILM_DURATION).toBeCloseTo(s,8);
  for(const t of[.1,.2,.9,.96,.99])expect(eiffelFilmEditSourceTAt('detailed',t)).toBeCloseTo(t,15);
  for(const[e]of EIFFEL_CINEMATIC_KEYS.slice(1,-1)){
    const h=.00001,f=(s:number)=>eiffelFilmEditSourceTAt('cinematic',s/180)*EIFFEL_FILM_DURATION;
    expect(Math.abs((f(e)-f(e-h))/h-(f(e+h)-f(e))/h)).toBeLessThan(.003);
  }
  for(const cue of EIFFEL_CINEMATIC_CAPTION_WINDOWS)expect(cue.toSeconds-cue.fromSeconds).toBeGreaterThanOrEqual(8);
});
it('keeps detailed shots on their mapped source frames and short edit camera continuous and reversible',()=>{
  for(const a of[1.6,390/844])for(const t of[0,.1,.3,.65,.9,1])expect(eiffelFilmEditShotAt('detailed',t,a)).toEqual(eiffelFilmShotAt(eiffelFilmEditSourceTAt('detailed',t),a));
  for(const a of[1.6,390/844]){
    let previous=eiffelFilmEditShotAt('cinematic',0,a);
    for(let seconds=.05;seconds<=180;seconds+=.05){
      const s=eiffelFilmEditShotAt('cinematic',seconds/180,a);
      expect(Math.hypot(...s.target.map((v,i)=>v-previous.target[i]!)),`target at ${seconds}`).toBeLessThan(20);
      expect(Math.abs(s.radius-previous.radius),`radius at ${seconds}`).toBeLessThan(40);
      previous=s;
    }
    const expected=eiffelFilmEditShotAt('cinematic',.57,a);eiffelFilmEditShotAt('cinematic',1,a);expect(eiffelFilmEditShotAt('cinematic',.57,a)).toEqual(expected);
  }
});
it('shows a growing lower frame rather than the summit at thirty percent detailed',()=>{
  const manifest=JSON.parse(readFileSync('public/models/eiffel-construction-kit/tower-kit.manifest.json','utf8')) as EiffelKitManifest;
  const plan=createEiffelProductionPlan(manifest,{upperClearance:'skip'}),film=sampleEiffelFilm(eiffelFilmEditSourceTAt('detailed',.3));
  let highest=-Infinity;
  for(const part of manifest.parts){const op=plan.byPart.get(part.id);if(!op)continue;const state=sampleEiffelProductionOperation(op,film.productionT);if(state.phase==='queued')continue;const box=eiffelSolidBox(part,state.phase==='seated'?part.finalPose:state.pose);highest=Math.max(highest,box.center[1]+box.axes.reduce((sum,axis,i)=>sum+Math.abs(axis[1]!)*box.half[i]!,0));}
  expect(film.productionT).toBeLessThan(.25);expect(highest).toBeLessThan(60);
},30000);
it('shows the hanging second member seating during its spoken close-up cue',()=>{
  const cue=EIFFEL_CINEMATIC_CAPTION_WINDOWS.find(c=>c.id==='eiffel-joint-prepared')!;
  expect(cue.fromSeconds).toBe(34);expect(cue.toSeconds).toBe(42);
  let hangingTravel=0,previousLoad:readonly number[]|undefined;
  const phases=new Set<string>();
  for(let seconds=cue.fromSeconds;seconds<cue.toSeconds;seconds+=.25){
    const t=eiffelFilmEditSourceTAt('cinematic',seconds/180),film=sampleEiffelFilm(t);
    expect(film.chapter).toBe('joint-campaign');
    expect(film.campaignSeconds).toBeGreaterThanOrEqual(100);expect(film.campaignSeconds).toBeLessThanOrEqual(114);
    const campaign=sampleEiffelJointCampaign(film.campaignSeconds);
    expect(campaign.activeLoadIndex).toBe(1);
    phases.add(campaign.campaignPhase);
    const fastening=sampleEiffelJointFastening(film.campaignSeconds);
    expect(fastening.tool.turn).toBe(0);
    expect(fastening.progress).toEqual([0,0]);
    if(previousLoad)hangingTravel=Math.max(hangingTravel,Math.hypot(...campaign.payload.pose.position.map((v,i)=>v-previousLoad![i]!)));
    previousLoad=campaign.payload.pose.position;
    for(const a of[1.6,390/844]){
      const actual=eiffelFilmEditShotAt('cinematic',seconds/180,a);
      const framed=eiffelJointCampaignShotAt(film.campaignSeconds,a,actual.azimuth,false);
      const punched=eiffelJointCampaignShotAt(film.campaignSeconds,a,actual.azimuth,true);
      for(const field of['radius','pitch','fov']as const)expect(actual[field]).toBeCloseTo(framed[field],8);
      actual.target.forEach((v,i)=>expect(v).toBeCloseTo(framed.target[i]!,8));
      expect(actual.fov).toBeCloseTo(42,8);
      expect(actual.radius).toBeGreaterThan(16);
      if(film.campaignSeconds>114)expect(actual.radius).toBeGreaterThan(punched.radius);
    }
  }
  expect(hangingTravel).toBeGreaterThan(.4);
  expect([...phases].some(phase=>phase==='lower-beside-joint'||phase==='slide-seat'||phase==='slew')).toBe(true);
  expect(phases.has('fastening')).toBe(false);
  // Every one-second window in the close cue advances the actual iron.
  for(let seconds=34;seconds<=41;seconds++){
    const position=(s:number)=>sampleEiffelJointCampaign(sampleEiffelFilmEdit('cinematic',s/180).campaignSeconds).payload.pose.position;
    const a=position(seconds),b=position(seconds+1);
    expect(Math.hypot(...b.map((v,i)=>v-a[i]!)),`${seconds}s visible travel`).toBeGreaterThan(.1);
  }
  const end=eiffelFilmEditShotAt('cinematic',42/180);
  expect(eiffelFilmEditShotAt('cinematic',45/180).radius).toBeGreaterThan(end.radius*2);
});
it('keeps the four ground stations standing through the joint close-up instead of striking them',()=>{
  const at=(seconds:number)=>sampleEiffelFilmEdit('cinematic',seconds/180);
  for(const percent of[15,16,17,20]){
    const film=at(percent*1.8);
    expect(film.groundLiftVisible,`${percent}%`).toBe(true);
    if(film.insertionId==='joint-campaign')expect(film.suppressedGroundStations,`${percent}%`).toEqual(['ne']);
    else expect(film.suppressedGroundStations,`${percent}%`).toEqual([]);
  }
  expect(at(30.6).insertionId).toBe('joint-campaign');
  expect(at(36).campaignSeconds).toBeGreaterThan(100);
  expect(at(36).campaignSeconds).toBeLessThan(114);
  expect(at(48).groundLiftVisible).toBe(true);
  expect(at(48).suppressedGroundStations).toEqual(['ne']);
  expect(sampleEiffelFilmEdit('detailed',.05).suppressedGroundStations).toEqual([]);
  expect(sampleEiffelFilmEdit('detailed',.5).suppressedGroundStations).toEqual([]);
});
it('keeps short camera near-frustum clear of the actual completed tower during all close-up approaches',()=>{
  const manifest=JSON.parse(readFileSync('public/models/eiffel-construction-kit/tower-kit.manifest.json','utf8')) as EiffelKitManifest;
  const boxes=manifest.parts.map(p=>eiffelSolidBox(p,p.finalPose));
  for(const a of[1280/720,1.6,390/844])for(const[from,to]of[[9,28],[30,48],[66,88]])for(let seconds=from!;seconds<=to!;seconds+=.1){
    const s=eiffelFilmEditShotAt('cinematic',seconds/180,a),p=[s.target[0]+Math.cos(s.azimuth)*Math.cos(s.pitch)*s.radius,s.target[1]+Math.sin(s.pitch)*s.radius,s.target[2]+Math.sin(s.azimuth)*Math.cos(s.pitch)*s.radius],near=5*Math.sqrt(1+Math.tan(s.fov*Math.PI/360)**2*(1+a*a));let min=Infinity,id='';
    boxes.forEach((b,i)=>{const d=p.map((v,j)=>v-b.center[j]!);const distance=Math.hypot(...b.axes.map((axis,j)=>Math.max(0,Math.abs(axis.reduce((sum,v,k)=>sum+v*d[k]!,0))-b.half[j]!)));if(distance<min){min=distance;id=manifest.parts[i]!.id;}});
    expect(min,`${seconds}s aspect${a} ${id}`).toBeGreaterThan(near);
  }
},15000);

it('budgets readable structural rise and retains every seated identity through dense forward and reverse seeks',()=>{
  const manifest=JSON.parse(readFileSync('public/models/eiffel-construction-kit/tower-kit.manifest.json','utf8')) as EiffelKitManifest;
  const plan=createEiffelProductionPlan(manifest,{upperClearance:'skip'});
  const seatedAt=(t:number,edited=false)=>{const film=edited?sampleEiffelFilmEdit('cinematic',t):sampleEiffelFilm(t);return plan.operations.filter(op=>{
    const id=op.part.id;
    if(film.transportedPartIds.includes(id))return false;
    if(film.seatedPartIds.includes(id))return true;
    if(film.insertionId==='joint-campaign'&&EIFFEL_JOINT_CAMPAIGN_PART_IDS.some(partId=>partId===id))return false;
    if(film.insertionId==='ground-lift'&&(id==='lower-ne-02-m013-c003'||(edited&&['lower-nw-02-m005-c003','lower-sw-02-m029-c003','lower-se-02-m021-c003'].includes(id))))return false;
    return op.end<=film.productionT;
  }).map(op=>op.part);};
  let previous=new Set<string>(),reached50=0,reached280=0;const removals:{id:string;seconds:number}[]=[];
  for(let step=0;step<=1800;step++){
    const seconds=step/10,parts=seatedAt(seconds/180,true),ids=new Set(parts.map(p=>p.id)),height=Math.max(0,...parts.map(p=>p.boundsMax[1]));
    for(const id of previous)if(!ids.has(id))removals.push({id,seconds});
    if(!reached50&&height>=50)reached50=seconds;if(!reached280&&height>=280)reached280=seconds;previous=ids;
  }
  expect(removals).toEqual([]);
  // Background iron now grows during the joint close-up, before its48s exit.
  expect(reached50).toBeGreaterThan(34);expect(reached50).toBeLessThan(48);expect(reached280).toBeGreaterThan(140);expect(reached280).toBeLessThanOrEqual(158);expect(reached280-reached50).toBeGreaterThan(70);
  // Exact insertion endpoints and neighboring representable source times must
  // not round behind the production boundary, including short-edit50seconds.
  for(const entry of EIFFEL_FILM_INSERTIONS){
    const endpoint=eiffelFilmTimeForProduction(entry.productionT);
    const before=new Set(seatedAt(endpoint-1e-9).map(p=>p.id));
    for(const t of[endpoint,endpoint+Number.EPSILON,endpoint+1e-9,endpoint]){const after=new Set(seatedAt(t).map(p=>p.id));for(const id of before)expect(after.has(id),`${entry.id} endpoint lost ${id}`).toBe(true);}
  }
  const at50=eiffelFilmEditSourceTAt('cinematic',50/180),expected=seatedAt(at50).map(p=>p.id);seatedAt(1);expect(seatedAt(at50).map(p=>p.id)).toEqual(expected);
},30000);
it('frames the physical first-floor arrival and supported landing throughout the relay sentence',()=>{
  const cue=EIFFEL_CINEMATIC_CAPTION_WINDOWS.find(c=>c.id==='eiffel-relay-prepared')!;
  for(let seconds=cue.fromSeconds;seconds<=cue.toSeconds;seconds+=.25){
    const sourceT=eiffelFilmEditSourceTAt('cinematic',seconds/180),film=sampleEiffelFilm(sourceT);
    expect(film.chapter).toBe('long-load-first-floor');expect(film.longLoadSeconds).toBeGreaterThanOrEqual(112-1e-9);expect(film.longLoadSeconds).toBeLessThanOrEqual(128+1e-9);
    for(const aspect of[1280/720,390/844]){
      const shot=eiffelFilmEditShotAt('cinematic',seconds/180,aspect),local=eiffelFilmShotAt(sourceT,aspect);
      for(const field of['radius','azimuth','pitch','fov']as const)expect(shot[field]).toBeCloseTo(local[field],10);shot.target.forEach((v,i)=>expect(v).toBeCloseTo(local.target[i]!,10));
      const ca=Math.cos(shot.azimuth),sa=Math.sin(shot.azimuth),cp=Math.cos(shot.pitch),sp=Math.sin(shot.pitch),tan=Math.tan(shot.fov*Math.PI/360);
      for(const point of eiffelLongLoadCameraPointsAt(film.longLoadSeconds)){
        const [x,y,z]=point.map((v,i)=>v-shot.target[i]!),radial=ca*x!+sa*z!,depth=shot.radius-cp*radial-sp*y!;
        expect(depth).toBeGreaterThan(5);expect(Math.abs((-sa*x!+ca*z!)/(depth*tan*aspect))).toBeLessThanOrEqual(.820001);expect(Math.abs((-sp*radial+cp*y!)/(depth*tan))).toBeLessThanOrEqual(.800001);
      }
    }
  }
});
