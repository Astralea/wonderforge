import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { PerspectiveCamera, Vector3 } from 'three';
import { eiffelCinematicShotAt } from '../src/engine/eiffelCamera';
import { EIFFEL_FILM_DURATION, EIFFEL_FILM_INSERTIONS, EIFFEL_FILM_PILOT_PART_ID, EIFFEL_FILM_INSERT_T, EIFFEL_FILM_LIFT_START_SECONDS as START, EIFFEL_FILM_LIFT_END_SECONDS as END, EIFFEL_FILM_LONG_LOAD_START_SECONDS as LONG_START, EIFFEL_FILM_LONG_LOAD_END_SECONDS as LONG_END, EIFFEL_FILM_LONG_LOAD_CHAPTER_DURATION, EIFFEL_FILM_COMPLETED_ENDING_SECONDS, EIFFEL_FILM_STAGE63_FINAL_WAVE_START_SECONDS, EIFFEL_FILM_STAGE63_FINAL_WAVE_END_SECONDS, eiffelFilmConstructionProductionT, eiffelGroundLiftShotPointsAt, eiffelGroundLiftFocusPointsAt, eiffelGroundLiftCloseWeight, eiffelFilmShotAt, eiffelFilmAzimuthAt, eiffelFilmTimeForProduction, sampleEiffelFilm } from '../src/engine/eiffelFilm';
import { EIFFEL_JOINT_CAMPAIGN_ADMITTED, EIFFEL_JOINT_CAMPAIGN_DURATION, EIFFEL_JOINT_CAMPAIGN_FREEZE, EIFFEL_JOINT_CAMPAIGN_PART_IDS, EIFFEL_JOINT_CAMPAIGN_SEAT_TIMES } from '../src/engine/eiffelJointCampaign';
import { createInitialState, usePlaybackStore } from '../src/store/playback';
import { EIFFEL_TRAFFIC_ACTORS } from '../src/data/eiffelTraffic';
import { eiffelTrafficPoseAt } from '../src/engine/eiffelTraffic';
import { EIFFEL_LONG_LOAD_FILM_PART_ID, EIFFEL_LONG_LOAD_FILM_PRODUCTION_T } from '../src/engine/eiffelLongLoadFilm';
import { createEiffelProductionPlan } from '../src/engine/eiffelProductionConstruction';
import type { EiffelKitManifest } from '../src/data/eiffelKitTypes';
import operationStart from '../artifacts/eiffel-long-load-main-2026-09-08/operation-start.json';
import { EIFFEL_STAGE63_FINAL_WAVE, EIFFEL_STAGE63_PRODUCTION_DURATION } from '../src/engine/eiffelStage63Pace';

const at = (seconds: number) => sampleEiffelFilm(seconds / EIFFEL_FILM_DURATION);
describe('Eiffel main film chapter', () => {
  it('retains the complete final-wave clock and reserves a twelve-second completed ending',()=>{
    expect(EIFFEL_FILM_DURATION-EIFFEL_FILM_STAGE63_FINAL_WAVE_END_SECONDS).toBe(EIFFEL_FILM_COMPLETED_ENDING_SECONDS);
    const start=sampleEiffelFilm(EIFFEL_FILM_STAGE63_FINAL_WAVE_START_SECONDS/EIFFEL_FILM_DURATION);
    const end=sampleEiffelFilm(EIFFEL_FILM_STAGE63_FINAL_WAVE_END_SECONDS/EIFFEL_FILM_DURATION);
    expect(eiffelFilmConstructionProductionT(start.seconds,start.productionT)).toBeCloseTo(EIFFEL_STAGE63_FINAL_WAVE.productionStart,12);
    expect(eiffelFilmConstructionProductionT(end.seconds,end.productionT)).toBeCloseTo(EIFFEL_STAGE63_FINAL_WAVE.productionEnd,12);
    expect(EIFFEL_FILM_STAGE63_FINAL_WAVE_END_SECONDS-EIFFEL_FILM_STAGE63_FINAL_WAVE_START_SECONDS).toBeCloseTo(EIFFEL_STAGE63_FINAL_WAVE.secondsEnd-EIFFEL_STAGE63_FINAL_WAVE.secondsStart,12);
    expect(eiffelFilmConstructionProductionT(.99*EIFFEL_FILM_DURATION,sampleEiffelFilm(.99).productionT)).toBeGreaterThan(EIFFEL_STAGE63_FINAL_WAVE.productionEnd);
  });
  it('covers the short production gap between adjacent editorial cards without changing its clock', () => {
    if (!EIFFEL_JOINT_CAMPAIGN_ADMITTED) return;
    const from=END+4,to=EIFFEL_JOINT_CAMPAIGN_FREEZE*60+62;
    expect(to-from).toBeGreaterThan(0);expect(to-from).toBeLessThan(.25);
    for(let seconds=from+1e-6;seconds<to;seconds+=1/240){const frame=at(seconds);
      expect(frame.chapter).toBe('main');expect(frame.cutOpacity).toBe(1);
      expect(frame.productionT).toBeCloseTo((seconds-62)/60,12);
      expect(frame.seatedPartIds).toContain(EIFFEL_FILM_PILOT_PART_ID);
      expect(frame.seatedPartIds).not.toContain(EIFFEL_JOINT_CAMPAIGN_PART_IDS[0]);
    }
  });
  it('preserves every original production coordinate outside the chapter', () => {
    for (let i = 0; i <= 1000; i++) {
      const productionT = i / 1000;
      expect(sampleEiffelFilm(eiffelFilmTimeForProduction(productionT)).productionT).toBeCloseTo(productionT, 12);
    }
    expect(sampleEiffelFilm(1).productionT).toBeCloseTo(1,12);
    expect(EIFFEL_FILM_DURATION).toBe(EIFFEL_STAGE63_PRODUCTION_DURATION+EIFFEL_FILM_INSERTIONS.reduce((sum,entry)=>sum+entry.preparationSeconds+entry.duration+entry.dismantlingSeconds,0));
  });
  it('brackets the complete lift with explicit, opaque installation/removal omissions', () => {
    expect(at(START - 1).chapter).toBe('preparation-cut');
    expect(at(START - 1).cutOpacity).toBe(1);
    expect(at(START - 1).cutText).toContain('installation is omitted');
    for (let seconds = START + 1e-7; seconds < END; seconds += .25) {
      const frame = at(seconds);
      expect(frame.chapter).toBe('ground-lift');
      expect(frame.productionT).toBe(EIFFEL_FILM_INSERT_T);
      expect(frame.pilotSeconds).toBeCloseTo(seconds - START, 10);
      expect(frame.cutOpacity).toBe(0);
    }
    expect(at(END - 1e-7).pilotSeconds).toBeCloseTo(55, 5);
    expect(at(END + .1).chapter).toBe('dismantling-cut');
    expect(at(END + .1).cutOpacity).toBe(1);
    expect(at(END + .1).cutText).toContain('dismantling is omitted');
    expect(at(END + .1).selectedSeated).toBe(true);
    expect(at(END + 4.01).chapter).toBe('main');
    expect(at(END + 4.01).selectedSeated).toBe(true);
    expect(at(START + 46.001).selectedSeated).toBe(true);
  });
  it('keeps environment motion continuous while construction holds and the extended orbit endpoints', () => {
    expect(at(START + 20).motionT - at(START + 10).motionT).toBeCloseTo(10 / 60, 12);
    // Production .9 is now the close seated frame; the wide return follows
    // four seconds later and is covered independently by summit camera tests.
    for (const t of [0, .04, .2, .5, .98, 1]) {
      const filmT=eiffelFilmTimeForProduction(t),filmShot=eiffelFilmShotAt(filmT),productionShot=eiffelCinematicShotAt(t,16/9,filmT,filmShot.azimuth);
      expect(filmShot.azimuth).toBe(productionShot.azimuth);expect(filmShot.pitch).toBeCloseTo(productionShot.pitch,12);expect(filmShot.radius).toBeCloseTo(productionShot.radius,10);expect(filmShot.fov).toBe(productionShot.fov);filmShot.target.forEach((value,index)=>expect(value).toBeCloseTo(productionShot.target[index]!,11));
      expect(filmShot.azimuth).toBeCloseTo(eiffelFilmShotAt(filmT).azimuth,12);
    }
    expect(eiffelFilmShotAt(1).azimuth - eiffelFilmShotAt(0).azimuth).toBeCloseTo(307 * Math.PI / 180, 10);
  });
  it('keeps the base orbit constant-direction while the visible ground approach may detour around its arch',()=>{
    const samples=Array.from({length:26401},(_,i)=>eiffelFilmAzimuthAt(i/26400)),deltas=samples.slice(1).map((a,i)=>a-samples[i]!);
    expect(deltas[0]).toBeGreaterThan(0);
    expect(deltas.every(delta=>delta>0)).toBe(true);
    expect(Math.min(...deltas)).toBeGreaterThan(0);
    expect((samples.at(-1)!-samples[0]!)*180/Math.PI).toBeCloseTo(307,8);
    expect((eiffelFilmShotAt(205/EIFFEL_FILM_DURATION).azimuth-eiffelFilmShotAt(0).azimuth)*180/Math.PI).toBeCloseTo(45,8);
  },30_000);
  it.each([1440 / 900, 390 / 844, 320 / 844])('contains phase-specific supported establish/recovery and payload/cart working bounds at aspect %s', aspect => {
    const point = new Vector3();
    for (let seconds = 0; seconds < 55; seconds += 5) {
      const shot = eiffelFilmShotAt((START + seconds + 1e-7) / EIFFEL_FILM_DURATION, aspect);
      const camera = new PerspectiveCamera(shot.fov, aspect, 5, 2400), horizontal = Math.cos(shot.pitch) * shot.radius;
      camera.position.set(shot.target[0] + Math.cos(shot.azimuth) * horizontal, shot.target[1] + Math.sin(shot.pitch) * shot.radius, shot.target[2] + Math.sin(shot.azimuth) * horizontal);
      camera.lookAt(new Vector3(...shot.target)); camera.updateMatrixWorld(true);
      let maxX = 0, maxY = 0, minZ = 1;
      for (const p of eiffelGroundLiftCloseWeight(seconds) < .00001 ? eiffelGroundLiftShotPointsAt(seconds) : eiffelGroundLiftFocusPointsAt(seconds)) { point.set(...p).project(camera); maxX = Math.max(maxX, Math.abs(point.x)); maxY = Math.max(maxY, Math.abs(point.y)); minZ = Math.min(minZ, point.z); }
      expect(maxX).toBeLessThanOrEqual(.880001); expect(maxY).toBeLessThanOrEqual(.840001); expect(minZ).toBeGreaterThan(-1);
    }
  });
  it('continues traffic after the original60s boundary without changing the default API', () => {
    const actor = EIFFEL_TRAFFIC_ACTORS.find(a => a.kind.startsWith('pedestrian')) ?? EIFFEL_TRAFFIC_ACTORS[0]!;
    expect(eiffelTrafficPoseAt(actor, 1.5)).toEqual(eiffelTrafficPoseAt(actor, 1));
    const before = eiffelTrafficPoseAt(actor, 1.4, true), after = eiffelTrafficPoseAt(actor, 1.401, true);
    const movement = Math.hypot(...after.position.map((v, i) => v - before.position[i]!));
    expect(movement).toBeGreaterThan(0);
    expect(movement).toBeLessThan(actor.speed * 60 * .0011);
  });
  it('derives independent seated handoffs and insertion clocks on forward and reverse seeks', () => {
    expect(EIFFEL_FILM_INSERTIONS.map(entry => entry.id)).toEqual(EIFFEL_JOINT_CAMPAIGN_ADMITTED?['ground-lift','joint-campaign','long-load-first-floor']:['ground-lift','long-load-first-floor']);
    for (const seconds of [0, START+10, START+46.01, END+5, START+20, START-1, EIFFEL_FILM_DURATION]) {
      const frame=at(seconds), seated=seconds>=START+46;
      expect(frame.seatedPartIds.includes(EIFFEL_FILM_PILOT_PART_ID)).toBe(seated);
      expect(frame.selectedSeated).toBe(seated);
      if(frame.chapter==='ground-lift') {
        expect(frame.insertionId).toBe('ground-lift');
        expect(frame.chapterSeconds).toBeCloseTo(frame.pilotSeconds,12);
      }
      if(!EIFFEL_JOINT_CAMPAIGN_ADMITTED)expect(frame.campaignSeconds).toBe(0);
    }
  });
  it('withholds the actual long member through landing and seats it only after the opaque later-work cut',()=>{
    const insertion=EIFFEL_FILM_INSERTIONS.find(entry=>entry.id==='long-load-first-floor')!;
    expect(insertion.productionT).toBe(EIFFEL_LONG_LOAD_FILM_PRODUCTION_T);
    for(const seconds of[LONG_START-2,LONG_START+.001,LONG_START+64,LONG_END-.001,LONG_END+2]){
      const frame=at(seconds);
      expect(frame.productionT).toBe(EIFFEL_LONG_LOAD_FILM_PRODUCTION_T);
      expect(frame.insertionId).toBe('long-load-first-floor');
      expect(frame.transportedPartIds).toContain(EIFFEL_LONG_LOAD_FILM_PART_ID);
      expect(frame.seatedPartIds).not.toContain(EIFFEL_LONG_LOAD_FILM_PART_ID);
      expect(frame.longLoadSeconds).toBeCloseTo(Math.max(0,Math.min(EIFFEL_FILM_LONG_LOAD_CHAPTER_DURATION,seconds-LONG_START)),8);
      if(seconds>=LONG_END)expect(frame.cutOpacity).toBe(1);
    }
    const after=at(LONG_END+insertion.dismantlingSeconds+1e-6);
    expect(after.chapter).toBe('main');expect(after.transportedPartIds).not.toContain(EIFFEL_LONG_LOAD_FILM_PART_ID);
    expect(after.seatedPartIds).toContain(EIFFEL_LONG_LOAD_FILM_PART_ID);
    expect(at(LONG_END+1).cutText).toContain('none of those operations is shown');
    expect(at(LONG_END-.001).chapter).toBe('long-load-first-floor');
  });
  it('binds the lightweight insertion coordinate to the actual production plan and manifest bytes',()=>{
    const path='public/models/eiffel-construction-kit/tower-kit.manifest.json',bytes=readFileSync(path),manifest=JSON.parse(bytes.toString())as EiffelKitManifest;
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(operationStart.manifestSha256);
    const plan=createEiffelProductionPlan(manifest,{upperClearance:'skip'});
    expect(plan.byPart.get(EIFFEL_LONG_LOAD_FILM_PART_ID)!.start).toBe(EIFFEL_LONG_LOAD_FILM_PRODUCTION_T);
    let previous=-Infinity;
    for(let seconds=EIFFEL_FILM_STAGE63_FINAL_WAVE_START_SECONDS-60;seconds<=EIFFEL_FILM_DURATION;seconds+=.05){
      const film=at(seconds),constructionT=eiffelFilmConstructionProductionT(seconds,film.productionT);
      expect(constructionT).toBeGreaterThanOrEqual(previous);previous=constructionT;
      const active=plan.operations.filter(op=>!op.assemblyParentOperation&&constructionT>=op.start&&constructionT<op.end);
      expect(active.length).toBeLessThanOrEqual(4);
    }
  },30_000);
  it('admits only audited joint routes, then preserves both independent cargo handoffs', () => {
    const joint=EIFFEL_FILM_INSERTIONS.find(entry=>entry.id==='joint-campaign');
    expect(Boolean(joint)).toBe(EIFFEL_JOINT_CAMPAIGN_ADMITTED);
    if(!joint)return;
    const begin=EIFFEL_JOINT_CAMPAIGN_FREEZE*60+62+joint.preparationSeconds;
    for(const seconds of [0,45.99,46.01,65,113.99,114.01,EIFFEL_JOINT_CAMPAIGN_DURATION-1,30,114.01]) {
      const frame=at(begin+seconds);
      expect(frame.chapter).toBe('joint-campaign');
      expect(frame.productionT).toBe(EIFFEL_JOINT_CAMPAIGN_FREEZE);
      expect(frame.campaignSeconds).toBeCloseTo(seconds,9);
      expect(frame.seatedPartIds).toContain(EIFFEL_FILM_PILOT_PART_ID);
      EIFFEL_JOINT_CAMPAIGN_PART_IDS.forEach((id,index)=>expect(frame.seatedPartIds.includes(id)).toBe(seconds>=EIFFEL_JOINT_CAMPAIGN_SEAT_TIMES[index]!));
    }
    const after=at(begin+EIFFEL_JOINT_CAMPAIGN_DURATION+5);
    EIFFEL_JOINT_CAMPAIGN_PART_IDS.forEach(id=>expect(after.seatedPartIds).toContain(id));
    expect(at(begin-1).cutText).toContain('tool stock');
    expect(at(begin+EIFFEL_JOINT_CAMPAIGN_DURATION+1).cutText).toContain('cheek plates');
  });
  it('preserves the authoring detailed duration only for Eiffel and restores other wonders', () => {
    usePlaybackStore.setState(createInitialState());
    usePlaybackStore.getState().setEiffelEdit('detailed');
    usePlaybackStore.getState().select('eiffel-tower');
    expect(usePlaybackStore.getState().durationMs).toBe(EIFFEL_FILM_DURATION*1000);
    usePlaybackStore.getState().select('petra');
    expect(usePlaybackStore.getState().durationMs).toBe(60000);
    usePlaybackStore.setState(createInitialState());
  });
});
