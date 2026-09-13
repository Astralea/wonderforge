import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { Group } from 'three';
import manifest from '../public/models/eiffel-construction-kit/tower-kit.manifest.json';
import { EIFFEL_GROUND_STATIONS } from '../src/engine/eiffelGroundStations';
import { createEiffelProductionPlan, sampleEiffelProductionOperation, type EiffelProductionSample } from '../src/engine/eiffelProductionConstruction';
import type { EiffelKitManifest } from '../src/data/eiffelKitTypes';
import type { EiffelKitPart } from '../src/data/eiffelKitTypes';
import type { EiffelKitSampler, EiffelKitState } from '../src/render/three/EiffelKitSystem';
import type { MaterialLibrary } from '../src/render/three/MaterialLibrary';
import type { EiffelEditedFilmSample } from '../src/engine/eiffelFilmEdit';
import { sampleEiffelFilmEdit } from '../src/engine/eiffelFilmEdit';
import { EIFFEL_FILM_DURATION, EIFFEL_FILM_JOINT_START_SECONDS } from '../src/engine/eiffelFilm';
import * as campaign from '../src/engine/eiffelJointCampaign';

// Keep the real world constructor and its kit callback. Only GPU/asset-owning
// systems are replaced, so the regression measures production sampler dispatch.
const parts = manifest.parts as unknown as EiffelKitPart[];
let rendered = new Map<string, EiffelKitState>();
class StubSystem {
  group = new Group();
  mesh = new Group();
  ready = Promise.resolve();
  update() {}
  setFourStations() {}
  setSuppressedStations() {}
}
class SampledKit extends StubSystem {
  constructor(private readonly sample: EiffelKitSampler) { super(); }
  override update(t = 0) {
    rendered = new Map(parts.map(part => [part.id, this.sample(part, t)]));
  }
}

let World: typeof import('../src/render/three/EiffelWorld').EiffelWorld;
beforeAll(async () => {
  for (const name of [
    'EiffelEnvironment', 'EiffelSkyDome', 'EiffelProductionWorks',
    'EiffelGroundLiftSystem', 'EiffelJointCampaignSystem', 'EiffelJointFasteningSystem',
    'EiffelLongLoadFilmSystem', 'EiffelLongLoadDriveSystem',
    'EiffelSecondFloorRelaySystem', 'EiffelHistoricFlagSystem',
  ]) vi.doMock(`../src/render/three/${name}`, () => ({ [name]: StubSystem }));
  vi.doMock('../src/render/three/EiffelKitSystem', () => ({ EiffelKitSystem: SampledKit }));
  World = (await import('../src/render/three/EiffelWorld')).EiffelWorld;
});
afterAll(() => vi.restoreAllMocks());

function advance(world: InstanceType<typeof World>, film: EiffelEditedFilmSample) {
  (world as unknown as { updateConstruction(t: number, film: EiffelEditedFilmSample): void })
    .updateConstruction(film.seconds / EIFFEL_FILM_DURATION, film);
}

describe('Eiffel world payload sampling cost', () => {
  it('bounds full joint simulation by the two delivered loads, independent of tower size', () => {
    const world = new World({} as MaterialLibrary);
    const film = sampleEiffelFilmEdit('cinematic', .22);
    const spy = vi.spyOn(campaign, 'sampleEiffelJointCampaign');
    spy.mockClear();
    advance(world, film);
    expect(parts.length).toBeGreaterThan(10_000);
    expect(rendered.size).toBe(parts.length);
    expect(spy).toHaveBeenCalledWith(film.campaignSeconds);
    expect(spy.mock.calls.length).toBeLessThanOrEqual(campaign.EIFFEL_JOINT_CAMPAIGN_PART_IDS.length);
    const unrelated = parts.find(part => !campaign.EIFFEL_JOINT_CAMPAIGN_PART_IDS.some(id => id === part.id)
      && !film.seatedPartIds.includes(part.id) && !film.transportedPartIds.includes(part.id))!;
    expect(rendered.get(unrelated.id)).toEqual({ phase: 'queued' });
    spy.mockRestore();
  });

  it('keeps both load poses and restores them after seating and reverse seek', () => {
    const world = new World({} as MaterialLibrary);
    const firstPass = new Map<string, EiffelKitState>();
    for (const seconds of [20, 100, 130, 20]) {
      const film = sampleEiffelFilmEdit('detailed', (EIFFEL_FILM_JOINT_START_SECONDS + seconds) / EIFFEL_FILM_DURATION);
      const expected = campaign.sampleEiffelJointCampaign(film.campaignSeconds);
      advance(world, film);
      for (const load of expected.loads) {
        expect(rendered.get(load.partId)).toEqual(load.state === 'seated'
          ? { phase: 'seated' } : { phase: 'moving', pose: load.pose });
        if (seconds === 20) {
          if (firstPass.has(load.partId)) expect(rendered.get(load.partId)).toEqual(firstPass.get(load.partId));
          else firstPass.set(load.partId, rendered.get(load.partId)!);
        }
      }
    }
  });
});

it('keeps ordinary lifting rigs away from cargo owned by a featured rig', () => {
  const world = new World({} as MaterialLibrary);
  const plan = createEiffelProductionPlan(manifest as unknown as EiffelKitManifest, {upperClearance:'skip'});
  const internal = world as unknown as {plan:typeof plan;work:{update(samples:EiffelProductionSample[]):void}};
  internal.plan = plan;
  const calls = vi.spyOn(internal.work, 'update');
  for (const [seconds,ids] of [[10,EIFFEL_GROUND_STATIONS.map(station=>station.payloadId)],[30,campaign.EIFFEL_JOINT_CAMPAIGN_PART_IDS]] as const) {
    const film = sampleEiffelFilmEdit('cinematic',seconds/180);
    const op = plan.byPart.get(ids.find(id=>!film.seatedPartIds.includes(id))!)!;
    // Probe while the ordinary schedule itself would try to lift this member.
    const productionT=(op.start+op.end)/2;
    advance(world,{...film,productionT});
    const samples = calls.mock.lastCall![0];
    const expected=plan.operations.filter(candidate=>productionT>=candidate.start&&productionT<candidate.end&&!ids.some(id=>id===candidate.part.id)&&!film.seatedPartIds.includes(candidate.part.id)&&!film.transportedPartIds.includes(candidate.part.id)).map(candidate=>sampleEiffelProductionOperation(candidate,productionT));
    expect(samples).toEqual(expected);
    expect(samples).not.toContainEqual(sampleEiffelProductionOperation(op,productionT));
  }
},30000);
