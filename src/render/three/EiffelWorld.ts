import { EIFFEL_GROUND_STATIONS, sampleEiffelGroundStation } from '../../engine/eiffelGroundStations';
import { Group, Vector3, type PerspectiveCamera } from 'three';
import type { EiffelSkySample } from '../../data/eiffelSky';
import type { LightState } from '../../engine/daynight';
import type { MaterialLibrary } from './MaterialLibrary';
import { EiffelEnvironment } from './EiffelEnvironment';
import { EiffelSkyDome } from './EiffelSkyDome';
import { EiffelKitSystem } from './EiffelKitSystem';
import { EiffelProductionWorks } from './EiffelProductionWorks';
import { EiffelGroundLiftSystem } from './EiffelGroundLiftSystem';
import { EiffelJointCampaignSystem } from './EiffelJointCampaignSystem';
import { EiffelJointFasteningSystem } from './EiffelJointFasteningSystem';
import { EiffelLongLoadFilmSystem } from './EiffelLongLoadFilmSystem';
import { EiffelLongLoadDriveSystem } from './EiffelLongLoadDriveSystem';
import { EiffelSecondFloorRelaySystem } from './EiffelSecondFloorRelaySystem';
import { EiffelHistoricFlagSystem } from './EiffelHistoricFlagSystem';
import { EIFFEL_LONG_LOAD_FILM_DURATION } from '../../engine/eiffelLongLoadFilm';
import { EIFFEL_SECOND_FLOOR_RELAY_SEQUENCE_DURATION, sampleEiffelSecondFloorRelaySequence } from '../../engine/eiffelSecondFloorRelaySequence';
import { EIFFEL_JOINT_CAMPAIGN_DURATION, EIFFEL_JOINT_CAMPAIGN_PART_IDS, sampleEiffelJointCampaign } from '../../engine/eiffelJointCampaign';
import { sampleEiffelFilm, EIFFEL_FILM_PILOT_PART_ID, EIFFEL_FILM_SECOND_FLOOR_RELAY_RATE } from '../../engine/eiffelFilm';
import { type EiffelEditedFilmSample } from '../../engine/eiffelFilmEdit';
import { EIFFEL_GROUND_STATION_ERECTION_READY } from '../../engine/eiffelGroundStationErection';
import { EIFFEL_GROUND_PLANT_PRESENT } from '../../engine/eiffelGroundPlantRetirement';
import { sampleEiffelGroundLiftPilot } from '../../engine/eiffelGroundLiftPilot';
import {
  createEiffelProductionPlan,
  sampleEiffelProductionOperation,
  type EiffelProductionPlan,
} from '../../engine/eiffelProductionConstruction';
import { EIFFEL_HISTORIC_FLAG_SUPPORT_PART_ID, eiffelHistoricFlagIsSupported } from '../../engine/eiffelHistoricFlag';

function detailedFilmAt(t: number): EiffelEditedFilmSample {
  const source = sampleEiffelFilm(t);
  return {
    ...source,
    continuousConstruction: false,
    relayReady: true,
    stationErection: EIFFEL_GROUND_STATION_ERECTION_READY,
    groundLiftVisible: source.insertionId === 'ground-lift',
    jointPlantVisible: source.insertionId === 'joint-campaign',
    plantRetirement: EIFFEL_GROUND_PLANT_PRESENT,
    suppressedGroundStations: [],
  };
}

export class EiffelWorld {
  readonly group = new Group();
  private readonly sky: EiffelSkyDome;
  private readonly environment: EiffelEnvironment;
  private readonly stones: EiffelKitSystem;
  private readonly work: EiffelProductionWorks;
  private readonly groundLift: EiffelGroundLiftSystem;
  private readonly jointCampaign: EiffelJointCampaignSystem;
  private readonly jointFastening: EiffelJointFasteningSystem;
  private readonly equipmentShadowCenter = new Vector3(0, 156, 0);
  private readonly longLoad: EiffelLongLoadFilmSystem;
  private readonly longLoadDrive: EiffelLongLoadDriveSystem;
  private readonly secondFloorRelay: EiffelSecondFloorRelaySystem;
  private readonly historicFlag: EiffelHistoricFlagSystem;
  private readonly preparedRelay = sampleEiffelSecondFloorRelaySequence(0);
  private plan: EiffelProductionPlan | null = null;
  private lastT = 0;
  private currentFilm: EiffelEditedFilmSample = {...sampleEiffelFilm(0),continuousConstruction:false,relayReady:true,stationErection:EIFFEL_GROUND_STATION_ERECTION_READY,groundLiftVisible:false,jointPlantVisible:false,plantRetirement:EIFFEL_GROUND_PLANT_PRESENT,suppressedGroundStations:[]};
  private lastEditedFilm?: EiffelEditedFilmSample;
  private readonly mobile: boolean;

  constructor(materials: MaterialLibrary, mobile = false) {
    this.mobile = mobile;
    this.group.name = 'eiffel-tower-reference-world';
    this.sky = new EiffelSkyDome();
    this.environment = new EiffelEnvironment(materials, true);
    this.stones = new EiffelKitSystem((part) => {
      const film = this.currentFilm;
      if (film.transportedPartIds.includes(part.id)) return { phase: 'queued' };
      if (film.seatedPartIds.includes(part.id)) return { phase: 'seated' };
      // Only two cargo members use this full rig/crew/route sampler. Calling
      // it for all 13,852 kit pieces turns the joint chapter into a CPU stall.
      if (film.insertionId === 'joint-campaign' && EIFFEL_JOINT_CAMPAIGN_PART_IDS.some(id => id === part.id)) {
        const load = sampleEiffelJointCampaign(film.campaignSeconds).loads.find(load => load.partId === part.id);
        if (load) return { phase: 'moving', pose: load.pose };
      }
      if (film.continuousConstruction && film.insertionId === 'ground-lift') {
        const station=EIFFEL_GROUND_STATIONS.find(station=>station.payloadId===part.id);
        if(station) return film.selectedSeated ? {phase:'seated'} : {phase:'moving',pose:sampleEiffelGroundStation(film.pilotSeconds,station.id).payload.pose};
      }
      if (part.id === EIFFEL_FILM_PILOT_PART_ID) {
        if (film.selectedSeated) return { phase: 'seated' };
        if (film.chapter === 'ground-lift') return { phase: 'moving', pose: sampleEiffelGroundLiftPilot(film.pilotSeconds).payload.pose };
      }
      const op = this.plan?.byPart.get(part.id);
      if (!op) return { phase: 'queued' };
      // Freeze at an exact wave boundary: no suspended legacy loads during the chapter.
      if (film.chapter !== 'main' && !film.continuousConstruction) return op.end <= film.productionT ? { phase: 'seated' } : { phase: 'queued' };
      const state = sampleEiffelProductionOperation(op, film.productionT);
      return state.phase === 'queued'
        ? { phase: 'queued' }
        : state.phase === 'seated'
          ? { phase: 'seated' }
          : { phase: 'moving', pose: state.pose };
    });
    this.work = new EiffelProductionWorks();
    this.groundLift = new EiffelGroundLiftSystem();
    this.longLoad = new EiffelLongLoadFilmSystem(mobile);
    this.longLoadDrive = new EiffelLongLoadDriveSystem();
    this.secondFloorRelay = new EiffelSecondFloorRelaySystem('/models/eiffel-second-floor-relay/relay.glb');
    this.historicFlag = new EiffelHistoricFlagSystem();
    this.groundLift.group.visible = false;
    this.jointCampaign = new EiffelJointCampaignSystem();
    this.jointFastening = new EiffelJointFasteningSystem();
    this.jointCampaign.group.visible = this.jointFastening.group.visible = false;
    this.group.add(
      this.sky.mesh,
      this.environment.group,
      this.stones.group,
      this.work.group,
      this.groundLift.group,
      this.longLoad.group,
      this.longLoadDrive.group,
      this.secondFloorRelay.group,
      this.historicFlag.group,
      this.jointCampaign.group,
      this.jointFastening.group,
    );
  }

  get longLoadDiagnostics(): Record<string, unknown> {
    return { ...this.longLoad.diagnostics, kit:{...this.stones.group.userData}, worldVisible:this.group.visible,productionT:this.currentFilm.productionT,continuousConstruction:this.currentFilm.continuousConstruction,relayReady:this.currentFilm.relayReady, filmChapterSeconds:this.currentFilm.longLoadSeconds, secondFloorRelay:{...this.secondFloorRelay.group.userData,visible:this.secondFloorRelay.group.visible,assetUrl:this.secondFloorRelay.assetUrl,sourceSeconds:Math.min(EIFFEL_SECOND_FLOOR_RELAY_SEQUENCE_DURATION,Math.max(0,(this.currentFilm.longLoadSeconds-EIFFEL_LONG_LOAD_FILM_DURATION)*EIFFEL_FILM_SECOND_FLOOR_RELAY_RATE))} };
  }

  setCrowdCamera(camera: PerspectiveCamera, viewportHeight: number, shortFilm = false): void {
    this.environment.setCrowdCamera(camera, viewportHeight);
    this.stones.setShadowCamera(camera.position, this.mobile, shortFilm);
    this.longLoadDrive.setShadowCamera(camera, viewportHeight, shortFilm);
    // The approach is still a wide view at ~190m. Restore tiny equipment
    // shadows only once the camera reaches the actual close work passage.
    const detailedEquipment = !shortFilm || camera.position.distanceToSquared(this.equipmentShadowCenter) < 180 ** 2;
    this.longLoad.setShadowDetail(detailedEquipment);
    this.secondFloorRelay.setShadowDetail(detailedEquipment);
  }

  get lightingDiagnostics(): Record<string, unknown> { return this.environment.lightingDiagnostics; }

  get crowdDiagnostics(): Record<string, unknown> {
    return this.environment.crowdDiagnostics;
  }
  get groundPlantDiagnostics(): Record<string, unknown> {
    return {
      groundVisible:this.groundLift.group.visible,
      stations:this.groundLift.group.userData.retirement,
      jointVisible:this.jointCampaign.group.visible,
      jointSupportCount:this.jointCampaign.group.userData.retainedSupportCount,
      jointCraneCount:this.jointCampaign.group.userData.retainedCraneAssemblyCount,
      progress:this.currentFilm.plantRetirement,
    };
  }

  private readiness?: Promise<void>;
  private loadedSystems = 0;
  private readonly pendingSystems = new Set(['Preparing Paris', 'Assembling the ironwork', 'Preparing the lifting frames', 'Preparing the iron joints', 'Preparing the fastenings', 'Preparing the first platform', 'Preparing the steam winch', 'Preparing the upper platforms', 'Preparing the summit']);
  get loadStage(): string { return this.pendingSystems.values().next().value ?? 'Preparing the first view'; }
  get loadProgress(): number { return this.loadedSystems / 10; }

  get ready(): Promise<void> {
    return this.readiness ??= Promise.all([this.environment.ready, this.stones.ready, this.groundLift.ready, this.jointCampaign.ready, this.jointFastening.ready, this.longLoad.ready, this.longLoadDrive.ready, this.secondFloorRelay.ready, this.historicFlag.ready].map((task, index) => {
      const label = [...this.pendingSystems][index]!;
      return task.then(() => { this.loadedSystems += 1; this.pendingSystems.delete(label); });
    })).then(() => {
      if (!this.stones.manifest)
        throw new Error('Eiffel construction kit manifest missing');
      this.plan = createEiffelProductionPlan(this.stones.manifest);
      this.updateConstruction(this.lastT, this.lastEditedFilm);
      this.loadedSystems = 10;
    });
  }
  private updateConstruction(t: number, editedFilm?: EiffelEditedFilmSample) {
    const film = this.currentFilm = editedFilm ?? detailedFilmAt(t);
    // Chapter captions float over the continuing film; no transition hides the world.
    this.group.visible = true;
    this.stones.update(t);
    this.longLoad.group.visible = film.insertionId === 'long-load-first-floor';
    this.longLoadDrive.group.visible = this.longLoad.group.visible;
    this.secondFloorRelay.group.visible = this.longLoad.group.visible && film.relayReady;
    if (this.longLoad.group.visible) {
      const firstFloorSeconds=Math.min(film.longLoadSeconds,EIFFEL_LONG_LOAD_FILM_DURATION);
      this.longLoad.update(firstFloorSeconds);
      this.longLoadDrive.update(firstFloorSeconds);
      const continuation=film.longLoadSeconds>EIFFEL_LONG_LOAD_FILM_DURATION;
      const relay=continuation?sampleEiffelSecondFloorRelaySequence((film.longLoadSeconds-EIFFEL_LONG_LOAD_FILM_DURATION)*EIFFEL_FILM_SECOND_FLOOR_RELAY_RATE):this.preparedRelay;
      if(continuation)this.longLoad.updateRelay(relay);
      else this.longLoad.prepareRelayRope(film.relayReady ? relay.secondHoist.worldRope : []);
      this.secondFloorRelay.update(relay);
    }
    this.groundLift.setFourStations(film.continuousConstruction);
    this.groundLift.setSuppressedStations(film.suppressedGroundStations);
    this.groundLift.group.visible = film.groundLiftVisible;
    if (this.groundLift.group.visible) this.groundLift.update(film.pilotSeconds, film.stationErection, film.plantRetirement);
    this.jointCampaign.group.visible = film.jointPlantVisible;
    if (this.jointCampaign.group.visible) this.jointCampaign.update(film.campaignSeconds, film.plantRetirement.ne);
    const joined = film.seatedPartIds.includes('lower-ne-02-m012-c002');
    this.jointFastening.group.visible = this.jointCampaign.group.visible || joined;
    if (this.jointFastening.group.visible) this.jointFastening.update(this.jointCampaign.group.visible ? film.campaignSeconds : EIFFEL_JOINT_CAMPAIGN_DURATION, this.jointCampaign.group.visible && !film.continuousConstruction);
    if (!this.plan) return;
    const supportSeatT = this.plan.byPart.get(EIFFEL_HISTORIC_FLAG_SUPPORT_PART_ID)?.end;
    this.historicFlag.update(film.seconds, eiffelHistoricFlagIsSupported(film.productionT, supportSeatT, film.transportedPartIds));
    this.work.update(
      this.plan.operations
        .map(op=>({op,t:film.productionT}))
        .filter(({op,t}) => (film.chapter === 'main' || film.continuousConstruction) && t >= op.start && t < op.end && !film.seatedPartIds.includes(op.part.id) && !film.transportedPartIds.includes(op.part.id)
          // A featured rig owns both its cargo and its lifting apparatus while
          // ordinary production continues; never draw a second rig for it.
          && !(film.insertionId === 'joint-campaign' && EIFFEL_JOINT_CAMPAIGN_PART_IDS.some(id => id === op.part.id))
          && !(film.continuousConstruction && film.insertionId === 'ground-lift' && EIFFEL_GROUND_STATIONS.some(station => station.payloadId === op.part.id)))
        .map(({op,t}) => sampleEiffelProductionOperation(op, t)),
    );
  }

  update(
    t: number,
    light: LightState,
    sunDirection: Vector3,
    sky: EiffelSkySample,
    editedFilm?: EiffelEditedFilmSample,
  ): void {
    this.lastT = t;
    this.lastEditedFilm = editedFilm;
    this.updateConstruction(t, editedFilm);
    const film = this.currentFilm;
    this.environment.update(film.productionT, light, sky, film.motionT);
    this.sky.update(film.productionT, sky, sunDirection);
  }

  dispose(): void {
    this.sky.dispose();
    this.environment.dispose();
    this.stones.dispose();
    this.work.dispose();
    this.groundLift.dispose();
    this.longLoad.dispose();
    this.longLoadDrive.dispose();
    this.secondFloorRelay.dispose();
    this.historicFlag.dispose();
    this.jointCampaign.dispose();
    this.jointFastening.dispose();
  }
}
