import { expect, it, vi } from 'vitest';
import { Group, Vector3 } from 'three';
import { EiffelWorld } from '../src/render/three/EiffelWorld';
import { EIFFEL_LONG_LOAD_FILM_DURATION } from '../src/engine/eiffelLongLoadFilm';
import { EIFFEL_FILM_DURATION, EIFFEL_FILM_LIFT_START_SECONDS, EIFFEL_FILM_LIFT_END_SECONDS, EIFFEL_FILM_JOINT_START_SECONDS, EIFFEL_FILM_JOINT_END_SECONDS, EIFFEL_FILM_LONG_LOAD_START_SECONDS, EIFFEL_FILM_LONG_LOAD_CHAPTER_DURATION, sampleEiffelFilm } from '../src/engine/eiffelFilm';

import { sampleEiffelSecondFloorRelaySequence } from '../src/engine/eiffelSecondFloorRelaySequence';
import { EIFFEL_HISTORIC_FLAG_SUPPORT_PART_ID } from '../src/engine/eiffelHistoricFlag';
import { sampleEiffelFilmEdit, eiffelFilmEditSourceTAt } from '../src/engine/eiffelFilmEdit';

it('omits the small fastening worker in the short film while retaining the delivered hardware and detailed worker', () => {
  const component=()=>({group:new Group(),update:vi.fn(),setFourStations:vi.fn(),setSuppressedStations:vi.fn()});
  const world=Object.create(EiffelWorld.prototype);
  Object.assign(world,{group:new Group(),stones:component(),longLoad:component(),longLoadDrive:component(),secondFloorRelay:component(),groundLift:component(),jointCampaign:component(),jointFastening:component(),environment:component(),sky:component()});
  for(const seconds of [34.2,40,43,46.8,40]){
    const t=seconds/180,film=sampleEiffelFilmEdit('cinematic',t),source=eiffelFilmEditSourceTAt('cinematic',t);
    world.update(source,{},new Vector3(1,1,1),{},film);
    expect(world.jointFastening.group.visible).toBe(true);
    expect(world.jointFastening.update).toHaveBeenLastCalledWith(film.campaignSeconds,false);
    world.update(source,{},new Vector3(1,1,1),{});
    expect(world.jointFastening.update).toHaveBeenLastCalledWith(film.campaignSeconds,true);
  }
});

it('keeps the world visible through chapter transitions and updates equipment and sky in both directions', () => {
  // Exercise the real world update with lightweight subsystem spies, without loading a second city.
  const component=()=>({group:new Group(),update:vi.fn(),updateRelay:vi.fn(),prepareRelayRope:vi.fn(),setFourStations:vi.fn(),setSuppressedStations:vi.fn()});
  const world=Object.create(EiffelWorld.prototype);
  Object.assign(world,{group:new Group(),stones:component(),longLoad:component(),longLoadDrive:component(),secondFloorRelay:component(),preparedRelay:sampleEiffelSecondFloorRelaySequence(0),groundLift:component(),jointCampaign:component(),jointFastening:component(),environment:component(),sky:component()});
  for(const localSeconds of[-1,.5,EIFFEL_FILM_LONG_LOAD_CHAPTER_DURATION-1,EIFFEL_FILM_LONG_LOAD_CHAPTER_DURATION+1,.5,-1]){
    const t=(EIFFEL_FILM_LONG_LOAD_START_SECONDS+localSeconds)/EIFFEL_FILM_DURATION;
    const film=sampleEiffelFilm(t);
    world.update(t,{},new Vector3(1,1,1),{});
    expect(world.group.visible).toBe(true);
    expect(world.stones.update).toHaveBeenLastCalledWith(t);
    expect(world.longLoad.update).toHaveBeenLastCalledWith(Math.min(film.longLoadSeconds,EIFFEL_LONG_LOAD_FILM_DURATION));
    expect(world.longLoadDrive.update).toHaveBeenLastCalledWith(Math.min(film.longLoadSeconds,EIFFEL_LONG_LOAD_FILM_DURATION));
    expect(world.environment.update).toHaveBeenLastCalledWith(film.productionT,{}, {},film.motionT);
    expect(world.sky.update).toHaveBeenLastCalledWith(film.productionT,{},new Vector3(1,1,1));
  }
});

it('keeps prepared ground and joint equipment present across visible camera transitions', () => {
  const component=()=>({group:new Group(),update:vi.fn(),updateRelay:vi.fn(),prepareRelayRope:vi.fn(),setFourStations:vi.fn(),setSuppressedStations:vi.fn()});
  const world=Object.create(EiffelWorld.prototype);
  Object.assign(world,{group:new Group(),stones:component(),longLoad:component(),longLoadDrive:component(),secondFloorRelay:component(),preparedRelay:sampleEiffelSecondFloorRelaySequence(0),groundLift:component(),jointCampaign:component(),jointFastening:component(),environment:component(),sky:component()});
  for (const [name, start, end] of [['groundLift', EIFFEL_FILM_LIFT_START_SECONDS, EIFFEL_FILM_LIFT_END_SECONDS], ['jointCampaign', EIFFEL_FILM_JOINT_START_SECONDS, EIFFEL_FILM_JOINT_END_SECONDS]] as const) {
    for (const seconds of [start-2.5, start-.001, start+.001, end-.001, end+.001, end+3.5, start-2.5]) {
      world.update(seconds/EIFFEL_FILM_DURATION,{},new Vector3(1,1,1),{});
      expect(world.group.visible).toBe(true);
      expect(world[name].group.visible).toBe(true);
      expect(world[name].update.mock.calls.at(-1)[0]).toBeCloseTo(Math.max(0, Math.min(end-start, seconds-start)), 8);
    }
  }
});

it('wires the historic flag to the final mast seating state without adding a chapter', () => {
  const component=()=>({group:new Group(),update:vi.fn(),updateRelay:vi.fn(),prepareRelayRope:vi.fn(),setFourStations:vi.fn(),setSuppressedStations:vi.fn()});
  const historicFlag=component();
  const world=Object.create(EiffelWorld.prototype);
  Object.assign(world,{group:new Group(),stones:component(),work:component(),longLoad:component(),longLoadDrive:component(),secondFloorRelay:component(),historicFlag,preparedRelay:sampleEiffelSecondFloorRelaySequence(0),groundLift:component(),jointCampaign:component(),jointFastening:component(),environment:component(),sky:component(),plan:{operations:[],byPart:new Map([[EIFFEL_HISTORIC_FLAG_SUPPORT_PART_ID,{end:.999}]])}});
  world.update(0,{},new Vector3(1,1,1),{});
  expect(historicFlag.update).toHaveBeenLastCalledWith(0,false);
  world.update(1,{},new Vector3(1,1,1),{});
  const final=sampleEiffelFilm(1);
  expect(final.productionT).toBe(1);
  expect(historicFlag.update).toHaveBeenLastCalledWith(final.seconds,true);
});
