import { describe, expect, it, vi } from 'vitest';
import { Group, Vector3 } from 'three';
import { EIFFEL_FILM_DURATION, EIFFEL_FILM_FIRST_FLOOR_END_SECONDS as FIRST_END, EIFFEL_FILM_LONG_LOAD_CHAPTER_DURATION as CHAPTER_DURATION, EIFFEL_FILM_LONG_LOAD_START_SECONDS as START, EIFFEL_FILM_LONG_LOAD_END_SECONDS as END, EIFFEL_FILM_SECOND_FLOOR_RELAY_RATE as RATE, EIFFEL_FILM_SECOND_FLOOR_LANDING_HOLD_SECONDS as HOLD, eiffelFilmAzimuthAt, eiffelFilmShotAt, sampleEiffelFilm } from '../src/engine/eiffelFilm';
import { EIFFEL_LONG_LOAD_FILM_DURATION, EIFFEL_LONG_LOAD_FILM_PART_ID } from '../src/engine/eiffelLongLoadFilm';
import { EIFFEL_SECOND_FLOOR_RELAY_SEQUENCE_DURATION, sampleEiffelSecondFloorRelaySequence } from '../src/engine/eiffelSecondFloorRelaySequence';
import { eiffelSecondFloorRelayFilmShotAt } from '../src/engine/eiffelSecondFloorRelayCamera';
import { EiffelWorld } from '../src/render/three/EiffelWorld';

const at = (seconds:number) => sampleEiffelFilm(seconds / EIFFEL_FILM_DURATION);
const shotAt = (seconds:number,aspect:number) => eiffelFilmShotAt(seconds / EIFFEL_FILM_DURATION,aspect);

describe('second-floor relay in the main construction film',()=>{
  it('extends only the long-load chapter and preserves the original 280-second mechanism clock',()=>{
    expect(EIFFEL_LONG_LOAD_FILM_DURATION).toBe(280);
    expect(RATE).toBe(2);
    expect(CHAPTER_DURATION).toBe(280+EIFFEL_SECOND_FLOOR_RELAY_SEQUENCE_DURATION/2+HOLD);
    expect(FIRST_END-START).toBeCloseTo(280,10);
    expect(END-FIRST_END).toBeCloseTo(EIFFEL_SECOND_FLOOR_RELAY_SEQUENCE_DURATION/2+HOLD,10);
    for(const local of[0.001,279.99,280,281,CHAPTER_DURATION-.001]){
      const frame=at(START+local);
      expect(frame.chapter).toBe('long-load-first-floor');
      expect(frame.longLoadSeconds).toBeCloseTo(local,10);
      expect(frame.cutOpacity).toBe(0);
      expect(frame.transportedPartIds.filter(id=>id===EIFFEL_LONG_LOAD_FILM_PART_ID)).toHaveLength(1);
      expect(frame.seatedPartIds).not.toContain(EIFFEL_LONG_LOAD_FILM_PART_ID);
    }
  });

  it('holds the landed member on the receiving cart for four visible film seconds before the cut',()=>{
    expect(HOLD).toBe(4);
    for(const offset of[.001,1,2,3.999]){
      const frame=at(END-HOLD+offset);
      expect(frame.chapter).toBe('long-load-first-floor');
      expect(frame.cutOpacity).toBe(0);
      const relay=sampleEiffelSecondFloorRelaySequence((frame.longLoadSeconds-280)*RATE);
      expect(relay.carrierSupport).toBe('upper-receiver');
      expect(relay.seated).toBe(false);
      expect(relay.carrierPose.position).toEqual(sampleEiffelSecondFloorRelaySequence(EIFFEL_SECOND_FLOOR_RELAY_SEQUENCE_DURATION).carrierPose.position);
    }
  });

  it('discloses prepared equipment and retains the sole payload owner through the final-installation transition',()=>{
    // cutOpacity is retained source metadata. Current film editions render
    // floating captions and the visible world, as covered by their UI tests.
    const prep=at(START-1);
    expect(prep.cutOpacity).toBe(1);
    for(const text of['upper receiving frame','access scaffold','tools','upper-rope approach'])expect(prep.cutText).toContain(text);
    for(const seconds of[END-1e-5,END+1e-5,END+2,END+4-1e-5]){
      const frame=at(seconds);
      expect(frame.transportedPartIds).toContain(EIFFEL_LONG_LOAD_FILM_PART_ID);
      expect(frame.seatedPartIds).not.toContain(EIFFEL_LONG_LOAD_FILM_PART_ID);
      if(seconds>=END){expect(frame.cutOpacity).toBe(1);expect(frame.cutText).toContain('197 m relay');expect(frame.cutText).not.toContain('second-floor');}
    }
    expect(at(END+4+1e-5).seatedPartIds).toContain(EIFFEL_LONG_LOAD_FILM_PART_ID);
    expect(at(END+4+1e-5).transportedPartIds).not.toContain(EIFFEL_LONG_LOAD_FILM_PART_ID);
  });

  it('preserves accepted first-floor orbit angles, clears the western pier gap and extends the monotone orbit to307 degrees',()=>{
    const accepted=[[0,38],[6,38.709632],[100,49],[128,53],[168,89],[184,91],[220,93.7],[242,94.2903587962963],[272,94.79296296296296],[280,95]];
    for(const [seconds,angle]of accepted)expect(eiffelFilmAzimuthAt((START+seconds!)/EIFFEL_FILM_DURATION)*180/Math.PI).toBeCloseTo(angle!,10);
    expect(eiffelFilmAzimuthAt(END/EIFFEL_FILM_DURATION)*180/Math.PI).toBeCloseTo(281,10);
    for(const join of[FIRST_END,END]){
      const slope=(eiffelFilmAzimuthAt((join+1e-4)/EIFFEL_FILM_DURATION)-eiffelFilmAzimuthAt((join-1e-4)/EIFFEL_FILM_DURATION))*180/Math.PI/.0002;
      expect(slope).toBeCloseTo(.03,5);
    }
    let previous=eiffelFilmAzimuthAt(0);
    for(let i=1;i<=10000;i++){const angle=eiffelFilmAzimuthAt(i/10000);expect(angle).toBeGreaterThan(previous);previous=angle;}
    expect((previous-eiffelFilmAzimuthAt(0))*180/Math.PI).toBeCloseTo(307,10);
  });

  it.each([1440/900,390/844])('blends into the relay camera continuously and dispatches source-clock time at aspect%s',aspect=>{
    for(const local of[0,2]){
      const a=shotAt(FIRST_END+local-1e-5,aspect),b=shotAt(FIRST_END+local+1e-5,aspect);
      expect(Math.hypot(...a.target.map((v,i)=>v-b.target[i]!))).toBeLessThan(.001);
      expect(Math.abs(a.radius-b.radius)).toBeLessThan(.001);
      expect(Math.abs(a.pitch-b.pitch)).toBeLessThan(.001);
      expect(Math.abs(a.fov-b.fov)).toBeLessThan(.001);
      expect(b.azimuth).toBeGreaterThan(a.azimuth);
    }
    for(const local of[2.01,30,80,125,(END-FIRST_END)-.001]){
      const t=(FIRST_END+local)/EIFFEL_FILM_DURATION,frame=sampleEiffelFilm(t);
      expect(eiffelFilmShotAt(t,aspect)).toEqual(eiffelSecondFloorRelayFilmShotAt((frame.longLoadSeconds-280)*RATE,aspect,eiffelFilmAzimuthAt(t)));
    }
    const expected=shotAt(FIRST_END+1,aspect);shotAt(END-.001,aspect);shotAt(START+.1,aspect);
    expect(shotAt(FIRST_END+1,aspect)).toEqual(expected);
  });

  it('updates the same owner after the frozen first-floor state and restores prepared hardware during reverse seeks',()=>{
    const component=()=>({group:new Group(),update:vi.fn(),updateRelay:vi.fn(),prepareRelayRope:vi.fn(),setFourStations:vi.fn(),setSuppressedStations:vi.fn(),dispose:vi.fn()});
    const world=Object.create(EiffelWorld.prototype),parts={stones:component(),longLoad:component(),longLoadDrive:component(),secondFloorRelay:component(),historicFlag:component(),groundLift:component(),jointCampaign:component(),jointFastening:component(),environment:component(),sky:component(),work:component()};
    Object.assign(world,{group:new Group(),...parts,preparedRelay:sampleEiffelSecondFloorRelaySequence(0)});
    for(const local of[1,280,281,400,CHAPTER_DURATION-.001,140,281,1]){
      for(const part of Object.values(parts)){part.update.mockClear();part.updateRelay.mockClear();part.prepareRelayRope.mockClear();}
      const t=(START+local)/EIFFEL_FILM_DURATION,frame=sampleEiffelFilm(t),oldSeconds=Math.min(frame.longLoadSeconds,280);
      world.update(t,{},new Vector3(1,1,1),{});
      expect(parts.longLoad.update).toHaveBeenLastCalledWith(oldSeconds);
      expect(parts.longLoadDrive.update).toHaveBeenLastCalledWith(oldSeconds);
      expect(parts.secondFloorRelay.group.visible).toBe(true);
      expect(world.longLoadDiagnostics.secondFloorRelay.sourceSeconds).toBe(Math.min(EIFFEL_SECOND_FLOOR_RELAY_SEQUENCE_DURATION,Math.max(0,(frame.longLoadSeconds-280)*RATE)));
      if(local>280){
        const relay=sampleEiffelSecondFloorRelaySequence((frame.longLoadSeconds-280)*RATE);
        expect(parts.longLoad.updateRelay).toHaveBeenCalledWith(relay);
        expect(parts.secondFloorRelay.update).toHaveBeenCalledWith(relay);
        expect(parts.longLoad.update.mock.invocationCallOrder[0]).toBeLessThan(parts.longLoad.updateRelay.mock.invocationCallOrder[0]!);
        expect(parts.longLoad.prepareRelayRope).not.toHaveBeenCalled();
      }else{
        const prepared=sampleEiffelSecondFloorRelaySequence(0);
        expect(parts.longLoad.updateRelay).not.toHaveBeenCalled();
        expect(parts.longLoad.prepareRelayRope).toHaveBeenCalledWith(prepared.secondHoist.worldRope);
        expect(parts.secondFloorRelay.update).toHaveBeenCalledWith(prepared);
      }
    }
    world.update((END+4.01)/EIFFEL_FILM_DURATION,{},new Vector3(1,1,1),{});
    expect(parts.secondFloorRelay.group.visible).toBe(false);
    world.dispose();
    expect(parts.secondFloorRelay.dispose).toHaveBeenCalledTimes(1);
    expect(parts.historicFlag.dispose).toHaveBeenCalledTimes(1);
    expect(parts.longLoad.dispose).toHaveBeenCalledTimes(1);
  });
});
