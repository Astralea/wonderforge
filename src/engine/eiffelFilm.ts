import station from '../../artifacts/eiffel-integration-2026-09-07/guyenet-ne-station.json';
import { eiffelCinematicShotAt, type EiffelCameraShot } from './eiffelCamera';
import { EIFFEL_GROUND_LIFT_PILOT_CONTEXT, EIFFEL_GROUND_LIFT_PILOT_DURATION, sampleEiffelGroundLiftPilot } from './eiffelGroundLiftPilot';
import { transformRigidPoint, type RigidVec3 } from './eiffelRigid';
import jointRoutes from '../../artifacts/eiffel-joint-campaign-2026-09-07/campaign-routes.json';
import jointSupport from '../../artifacts/eiffel-joint-campaign-2026-09-07/joint-support.json';
import { EIFFEL_JOINT_CAMPAIGN_ADMITTED, EIFFEL_JOINT_CAMPAIGN_DURATION, EIFFEL_JOINT_CAMPAIGN_FREEZE, EIFFEL_JOINT_CAMPAIGN_PART_IDS, EIFFEL_JOINT_CAMPAIGN_SEAT_TIMES, EIFFEL_JOINT_CAMPAIGN_CONNECTED_AT, sampleEiffelJointCampaign } from './eiffelJointCampaign';
import { EIFFEL_LONG_LOAD_FILM_DURATION, EIFFEL_LONG_LOAD_FILM_PART_ID, EIFFEL_LONG_LOAD_FILM_PRODUCTION_T } from './eiffelLongLoadFilm';
import {eiffelLongLoadFilmShotAt} from './eiffelLongLoadCamera';
import { EIFFEL_SECOND_FLOOR_RELAY_SEQUENCE_DURATION } from './eiffelSecondFloorRelaySequence';
import { eiffelSecondFloorRelayFilmShotAt } from './eiffelSecondFloorRelayCamera';
import {EIFFEL_STAGE63_FINAL_WAVE,EIFFEL_STAGE63_PRODUCTION_DURATION,eiffelStage63ProductionToSeconds,eiffelStage63SecondsToProduction} from './eiffelStage63Pace';
import {eiffelSummitWorkShotAt} from './eiffelSummitCamera';

const ORIGINAL_DURATION = 60;
const INSERT_T = station.originalStart;
const INSERT_SECONDS = eiffelStage63ProductionToSeconds(INSERT_T);
const PREPARATION_SECONDS = 3;
const DISMANTLING_SECONDS = 4;
export const EIFFEL_FILM_SECOND_FLOOR_RELAY_RATE = 2;
export const EIFFEL_FILM_SECOND_FLOOR_LANDING_HOLD_SECONDS = 4;
export const EIFFEL_FILM_LONG_LOAD_CHAPTER_DURATION = EIFFEL_LONG_LOAD_FILM_DURATION + EIFFEL_SECOND_FLOOR_RELAY_SEQUENCE_DURATION / EIFFEL_FILM_SECOND_FLOOR_RELAY_RATE + EIFFEL_FILM_SECOND_FLOOR_LANDING_HOLD_SECONDS;
/** A chapter is admitted only after its physical sampler and support contract
 * exist. Keeping insertion timing in production coordinates avoids retiming any
 * previously reviewed route when another chapter is added later in the film.
 */
export interface EiffelFilmInsertion {
  readonly id: 'ground-lift' | 'joint-campaign' | 'long-load-first-floor';
  readonly productionT: number;
  readonly duration: number;
  readonly preparationSeconds: number;
  readonly dismantlingSeconds: number;
  readonly deliveries: readonly { readonly partId: string; readonly seatedAt: number }[];
  readonly preparationTitle: string;
  readonly preparationText: string;
  readonly dismantlingText: string;
}
const JOINT_CAMPAIGN_INSERTION: EiffelFilmInsertion = {
  id: 'joint-campaign', productionT: EIFFEL_JOINT_CAMPAIGN_FREEZE, duration: EIFFEL_JOINT_CAMPAIGN_DURATION,
  preparationSeconds: 3, dismantlingSeconds: 4,
  deliveries: EIFFEL_JOINT_CAMPAIGN_PART_IDS.map((partId,index)=>({partId,seatedAt: EIFFEL_JOINT_CAMPAIGN_SEAT_TIMES[index]!})),
  preparationTitle: 'A supported iron joint',
  preparationText: 'Time has passed. The crane, braced temporary joint support, worker platform, tool stock and two loaded ground carts are prepared. Their installation and stock loading are omitted.',
  dismantlingText: 'The cheek plates have been fastened across the joint. Later, the temporary crane, working platform and joint support are dismantled; that removal is omitted. The connected iron sections remain.',
};
const LONG_LOAD_INSERTION: EiffelFilmInsertion = {
  id:'long-load-first-floor',productionT:EIFFEL_LONG_LOAD_FILM_PRODUCTION_T,duration:EIFFEL_FILM_LONG_LOAD_CHAPTER_DURATION,
  preparationSeconds:3,dismantlingSeconds:4,
  // Seating occurs only after the opaque omission cut, never on cart landing.
  deliveries:[{partId:EIFFEL_LONG_LOAD_FILM_PART_ID,seatedAt:EIFFEL_FILM_LONG_LOAD_CHAPTER_DURATION+4}],
  preparationTitle:'A two-floor receiving lift',
  preparationText:'Time has passed. The first-floor bridge and winch, upper receiving frame, access scaffold, tools and upper hoist rope are prepared. Their erection, initial sling attachment and the upper-rope approach are omitted.',
  dismantlingText:'Later work is omitted. The member continues through the 197 m relay, is extracted from its carrier, and is finally installed; none of those operations is shown.',
};
export const EIFFEL_FILM_INSERTIONS: readonly EiffelFilmInsertion[] = [({
  id: 'ground-lift', productionT: INSERT_T, duration: EIFFEL_GROUND_LIFT_PILOT_DURATION,
  preparationSeconds: PREPARATION_SECONDS, dismantlingSeconds: DISMANTLING_SECONDS,
  deliveries: [{partId: EIFFEL_GROUND_LIFT_PILOT_CONTEXT.partId, seatedAt: 46}],
  preparationTitle: 'A prepared lifting station',
  preparationText: 'Time has passed. The temporary frame and guide rails are now prepared; their installation is omitted.',
  dismantlingText: 'Time has passed. The temporary crane and frame have been dismantled. Their dismantling is omitted; the seated iron member remains.',
} satisfies EiffelFilmInsertion), ...(EIFFEL_JOINT_CAMPAIGN_ADMITTED ? [JOINT_CAMPAIGN_INSERTION] : []), LONG_LOAD_INSERTION].sort((a,b)=>a.productionT-b.productionT);
const insertionDuration = (entry: EiffelFilmInsertion) => entry.preparationSeconds + entry.duration + entry.dismantlingSeconds;
export const EIFFEL_FILM_DURATION = EIFFEL_STAGE63_PRODUCTION_DURATION + EIFFEL_FILM_INSERTIONS.reduce((total, entry) => total + insertionDuration(entry), 0);
const EIFFEL_INSERTED_DURATION=EIFFEL_FILM_INSERTIONS.reduce((total,entry)=>total+insertionDuration(entry),0);
export const EIFFEL_FILM_COMPLETED_ENDING_SECONDS=12;
const EIFFEL_FILM_STAGE63_FINAL_WAVE_ADVANCE_SECONDS=EIFFEL_FILM_COMPLETED_ENDING_SECONDS-(EIFFEL_STAGE63_PRODUCTION_DURATION-EIFFEL_STAGE63_FINAL_WAVE.secondsEnd);
// Begins after the last insertion and borrows only from the upper-work montage.
const EIFFEL_FILM_ENDING_MONTAGE_SECONDS=48;
export const EIFFEL_FILM_STAGE63_FINAL_WAVE_START_SECONDS=EIFFEL_STAGE63_FINAL_WAVE.secondsStart+EIFFEL_INSERTED_DURATION-EIFFEL_FILM_STAGE63_FINAL_WAVE_ADVANCE_SECONDS;
export const EIFFEL_FILM_STAGE63_FINAL_WAVE_END_SECONDS=EIFFEL_STAGE63_FINAL_WAVE.secondsEnd+EIFFEL_INSERTED_DURATION-EIFFEL_FILM_STAGE63_FINAL_WAVE_ADVANCE_SECONDS;
const EIFFEL_FILM_ENDING_MONTAGE_START_SECONDS=EIFFEL_FILM_STAGE63_FINAL_WAVE_START_SECONDS-EIFFEL_FILM_ENDING_MONTAGE_SECONDS;
/** Compress the preceding upper montage, then preserve the final operation
 * at its native clock and use the recovered time for the completed ending. */
export function eiffelFilmConstructionProductionT(seconds:number,productionT:number):number{
  const montageStart=EIFFEL_FILM_ENDING_MONTAGE_START_SECONDS;
  if(seconds<=montageStart)return productionT;
  if(seconds<EIFFEL_FILM_STAGE63_FINAL_WAVE_START_SECONDS){
    const u=(seconds-montageStart)/EIFFEL_FILM_ENDING_MONTAGE_SECONDS;
    return eiffelStage63SecondsToProduction(seconds-EIFFEL_INSERTED_DURATION+EIFFEL_FILM_STAGE63_FINAL_WAVE_ADVANCE_SECONDS*u);
  }
  if(seconds<=EIFFEL_FILM_STAGE63_FINAL_WAVE_END_SECONDS)return Math.min(EIFFEL_STAGE63_FINAL_WAVE.productionEnd,eiffelStage63SecondsToProduction(seconds-EIFFEL_INSERTED_DURATION+EIFFEL_FILM_STAGE63_FINAL_WAVE_ADVANCE_SECONDS));
  return EIFFEL_STAGE63_FINAL_WAVE.productionEnd+(1-EIFFEL_STAGE63_FINAL_WAVE.productionEnd)*(seconds-EIFFEL_FILM_STAGE63_FINAL_WAVE_END_SECONDS)/EIFFEL_FILM_COMPLETED_ENDING_SECONDS;
}
export const EIFFEL_FILM_PILOT_PART_ID = EIFFEL_GROUND_LIFT_PILOT_CONTEXT.partId;
export const EIFFEL_FILM_INSERT_T = INSERT_T;
export const EIFFEL_FILM_LIFT_START_SECONDS = INSERT_SECONDS + PREPARATION_SECONDS;
export const EIFFEL_FILM_LIFT_END_SECONDS = EIFFEL_FILM_LIFT_START_SECONDS + EIFFEL_GROUND_LIFT_PILOT_DURATION;
export const EIFFEL_FILM_JOINT_START_SECONDS = eiffelStage63ProductionToSeconds(EIFFEL_JOINT_CAMPAIGN_FREEZE)
  + EIFFEL_FILM_INSERTIONS.filter(entry=>entry.productionT<EIFFEL_JOINT_CAMPAIGN_FREEZE).reduce((sum,entry)=>sum+insertionDuration(entry),0)
  + JOINT_CAMPAIGN_INSERTION.preparationSeconds;
export const EIFFEL_FILM_JOINT_END_SECONDS = EIFFEL_FILM_JOINT_START_SECONDS + EIFFEL_JOINT_CAMPAIGN_DURATION;
const LONG_LOAD_ADDED_BEFORE=()=>EIFFEL_FILM_INSERTIONS.filter(entry=>entry.productionT<EIFFEL_LONG_LOAD_FILM_PRODUCTION_T).reduce((sum,entry)=>sum+insertionDuration(entry),0);
export const EIFFEL_FILM_LONG_LOAD_START_SECONDS=eiffelStage63ProductionToSeconds(EIFFEL_LONG_LOAD_FILM_PRODUCTION_T)+LONG_LOAD_ADDED_BEFORE()+LONG_LOAD_INSERTION.preparationSeconds;
export const EIFFEL_FILM_FIRST_FLOOR_END_SECONDS=EIFFEL_FILM_LONG_LOAD_START_SECONDS+EIFFEL_LONG_LOAD_FILM_DURATION;
export const EIFFEL_FILM_LONG_LOAD_END_SECONDS=EIFFEL_FILM_LONG_LOAD_START_SECONDS+EIFFEL_FILM_LONG_LOAD_CHAPTER_DURATION;
export type EiffelFilmChapter = 'main' | 'preparation-cut' | 'ground-lift' | 'joint-campaign' | 'long-load-first-floor' | 'dismantling-cut';
export interface EiffelFilmSample {
  readonly chapter: EiffelFilmChapter;
  readonly insertionId: EiffelFilmInsertion['id'] | null;
  readonly seconds: number;
  /** Original production plan and baked route coordinates remain unchanged. */
  readonly productionT: number;
  readonly motionT: number;
  readonly chapterSeconds: number;
  readonly pilotSeconds: number;
  readonly campaignSeconds: number;
  readonly longLoadSeconds:number;
  /** Independent handoffs persist through later chapters and reverse seeking. */
  readonly seatedPartIds: readonly string[];
  /** Kit identities currently owned by a chapter renderer away from final pose. */
  readonly transportedPartIds:readonly string[];
  readonly selectedSeated: boolean;
  readonly cutOpacity: 0 | 1;
  readonly cutTitle: string;
  readonly cutText: string;
}

/** Map original caption/stage coordinates onto the extended main movie. */
export function eiffelFilmTimeForProduction(t: number): number {
  const bounded = Math.max(0, Math.min(1, t));
  const added = EIFFEL_FILM_INSERTIONS.reduce((total, entry) => total + (bounded >= entry.productionT ? insertionDuration(entry) : 0), 0);
  const ordinary=eiffelStage63ProductionToSeconds(bounded)+added;
  const montageStartT=eiffelStage63SecondsToProduction(EIFFEL_FILM_ENDING_MONTAGE_START_SECONDS-EIFFEL_INSERTED_DURATION);
  if(bounded<=montageStartT)return ordinary/EIFFEL_FILM_DURATION;
  if(bounded<EIFFEL_STAGE63_FINAL_WAVE.productionStart){
    const stage=eiffelStage63ProductionToSeconds(bounded);
    return (stage+EIFFEL_INSERTED_DURATION+EIFFEL_FILM_STAGE63_FINAL_WAVE_ADVANCE_SECONDS*EIFFEL_FILM_ENDING_MONTAGE_START_SECONDS/EIFFEL_FILM_ENDING_MONTAGE_SECONDS)/(1+EIFFEL_FILM_STAGE63_FINAL_WAVE_ADVANCE_SECONDS/EIFFEL_FILM_ENDING_MONTAGE_SECONDS)/EIFFEL_FILM_DURATION;
  }
  if(bounded<=EIFFEL_STAGE63_FINAL_WAVE.productionEnd)return (eiffelStage63ProductionToSeconds(bounded)+EIFFEL_INSERTED_DURATION-EIFFEL_FILM_STAGE63_FINAL_WAVE_ADVANCE_SECONDS)/EIFFEL_FILM_DURATION;
  return (EIFFEL_FILM_STAGE63_FINAL_WAVE_END_SECONDS+(bounded-EIFFEL_STAGE63_FINAL_WAVE.productionEnd)/(1-EIFFEL_STAGE63_FINAL_WAVE.productionEnd)*EIFFEL_FILM_COMPLETED_ENDING_SECONDS)/EIFFEL_FILM_DURATION;
}

/** Stateless ordered chapter clock: each handoff is derived from absolute film
 * time, never the last frame played. A later chapter cannot unseat an earlier
 * delivery, and reverse seeking restores the correct original payload state.
 */
export function sampleEiffelFilm(rawT: number): EiffelFilmSample {
  if (!Number.isFinite(rawT)) throw new Error('Eiffel film time must be finite');
  return sampleEiffelFilmSeconds(Math.max(0, Math.min(1, rawT)) * EIFFEL_FILM_DURATION);
}

/** Sample from exact film seconds so an authored edit key is not reconstructed
 * through unit time and missed by a ULP at a discrete mechanical boundary. */
export function sampleEiffelFilmSeconds(rawSeconds: number): EiffelFilmSample {
  if (!Number.isFinite(rawSeconds)) throw new Error('Eiffel film time must be finite');
  const seconds = Math.max(0, Math.min(EIFFEL_FILM_DURATION, rawSeconds));
  let added = 0, active: EiffelFilmInsertion | null = null, elapsed = 0;
  let bridgeCut: EiffelFilmInsertion | null = null;
  let completedProductionT = 0;
  const seatedPartIds: string[] = [];
  let campaignSeconds = 0;
  let longLoadSeconds=0;
  const transportedPartIds:string[]=[];
  for (const [index, entry] of EIFFEL_FILM_INSERTIONS.entries()) {
    const start = eiffelStage63ProductionToSeconds(entry.productionT) + added;
    const relative = seconds - start;
    for (const delivery of entry.deliveries) if (relative >= entry.preparationSeconds + delivery.seatedAt) seatedPartIds.push(delivery.partId);
    if (entry.id === 'joint-campaign') campaignSeconds = Math.max(0, Math.min(entry.duration, relative - entry.preparationSeconds));
    if(entry.id==='long-load-first-floor'){
      const hold=EIFFEL_FILM_SECOND_FLOOR_LANDING_HOLD_SECONDS;
      const landingHoldStart=EIFFEL_FILM_LONG_LOAD_END_SECONDS-hold;
      // Authored 124s is this exact film second. Reconstructing the chapter
      // clock by subtracting the insertion start can sit a ULP under 454s and
      // keep the already-landed carrier labeled as tackle-supported.
      if(seconds===landingHoldStart)longLoadSeconds=entry.duration-hold;
      else if(seconds===EIFFEL_FILM_LONG_LOAD_END_SECONDS)longLoadSeconds=entry.duration;
      else if(seconds===EIFFEL_FILM_LONG_LOAD_START_SECONDS)longLoadSeconds=0;
      else longLoadSeconds=Math.max(0,Math.min(entry.duration,relative-entry.preparationSeconds));
      if(relative>=0&&relative<insertionDuration(entry))transportedPartIds.push(EIFFEL_LONG_LOAD_FILM_PART_ID);
    }
    if (relative >= 0 && relative < insertionDuration(entry)) { active = entry; elapsed = relative; break; }
    if (relative >= insertionDuration(entry)) {
      const next = EIFFEL_FILM_INSERTIONS[index + 1];
      const gap = next ? eiffelStage63ProductionToSeconds(next.productionT)-eiffelStage63ProductionToSeconds(entry.productionT) : Infinity;
      if (gap > 0 && gap < .25 && relative < insertionDuration(entry) + gap) bridgeCut = entry;
      added += insertionDuration(entry);
      completedProductionT = entry.productionT;
    }
  }
  const chapter: EiffelFilmChapter = !active ? 'main' : elapsed < active.preparationSeconds ? 'preparation-cut'
    : elapsed < active.preparationSeconds + active.duration ? active.id : 'dismantling-cut';
  // A completed insertion pins an exact lower boundary. Subtracting its
  // duration and inverting the pace map can round below that same boundary,
  // briefly unseating members whose operations end exactly there.
  const ordinaryProductionT = active ? active.productionT : Math.max(completedProductionT, eiffelStage63SecondsToProduction(seconds-added));
  const productionT = active ? ordinaryProductionT : eiffelFilmConstructionProductionT(seconds,ordinaryProductionT);
  const pilotSeconds = Math.max(0, Math.min(EIFFEL_GROUND_LIFT_PILOT_DURATION, seconds - EIFFEL_FILM_LIFT_START_SECONDS));
  const chapterSeconds = active?.id==='long-load-first-floor' ? longLoadSeconds
    : active ? Math.max(0, Math.min(active.duration, elapsed - active.preparationSeconds)) : 0;
  return {
    chapter, insertionId: active?.id ?? null, seconds, productionT, motionT: seconds / ORIGINAL_DURATION,
    chapterSeconds, pilotSeconds, campaignSeconds, longLoadSeconds, seatedPartIds, transportedPartIds,
    selectedSeated: seatedPartIds.includes(EIFFEL_FILM_PILOT_PART_ID),
    cutOpacity: chapter === 'preparation-cut' || chapter === 'dismantling-cut' || bridgeCut ? 1 : 0,
    cutTitle: chapter === 'preparation-cut' ? active!.preparationTitle : chapter === 'dismantling-cut' || bridgeCut ? 'Later work' : '',
    cutText: chapter === 'preparation-cut' ? active!.preparationText : chapter === 'dismantling-cut' ? active!.dismantlingText : bridgeCut?.dismantlingText ?? '',
  };
}

/** Actual supported equipment envelope for this phase. The remaining approach
 * stays in view during arrival; old cart positions do not force a distant lens
 * after the cart has reached the bay. Padding includes the pushing/rigging crew.
 */
const EIFFEL_GROUND_STATION_SHOT_POINTS: readonly RigidVec3[] = (() => {
  const points: RigidVec3[] = [];
  const pad = (p: readonly number[], amount: number) => padShotPoint(points, p, amount);
  for (const b of station.proposedStructure) { pad(b.a, b.halfWidth + .1); pad(b.b, b.halfWidth + .1); }
  for (const foot of station.groundFalsework.feet) pad(foot, .4);
  pad(station.station.root, 3.5);
  return points;
})();
function padShotPoint(points: RigidVec3[], p: readonly number[], amount: number): void {
  for (const x of [-amount, amount]) for (const y of [-amount, amount]) for (const z of [-amount, amount]) points.push([p[0]! + x, p[1]! + y, p[2]! + z]);
}
export function eiffelGroundLiftShotPointsAt(seconds: number): readonly RigidVec3[] {
  const points = [...EIFFEL_GROUND_STATION_SHOT_POINTS];
  const pad = (p: readonly number[], amount: number) => padShotPoint(points, p, amount);
  const sample = sampleEiffelGroundLiftPilot(seconds);
  pad(sample.carrier.bedPose.position, 3.5);
  // The pickup remains a visible destination before the moving cart arrives.
  pad(sampleEiffelGroundLiftPilot(10).carrier.bedPose.position, 3.5);
  pad(sample.crane.heel, 1); pad(sample.crane.boomTip, .6); pad(sample.crane.hook, 1.7);
  for (const sling of sample.rigging.slings) for (const point of sling.points) pad(point, .15);
  for (const x of [station.part.localBounds.min[0]!, station.part.localBounds.max[0]!]) {
    for (const y of [station.part.localBounds.min[1]!, station.part.localBounds.max[1]!]) for (const z of [station.part.localBounds.min[2]!, station.part.localBounds.max[2]!]) pad(transformRigidPoint(sample.payload.pose, [x, y, z]), .1);
  }
  return points;
}
/** Kept as a complete-route audit envelope; the camera uses current phase bounds. */
export const EIFFEL_GROUND_LIFT_SHOT_POINTS: readonly RigidVec3[] = [...EIFFEL_GROUND_STATION_SHOT_POINTS, ...Array.from({ length: 56 }, (_, seconds) => eiffelGroundLiftShotPointsAt(seconds).slice(EIFFEL_GROUND_STATION_SHOT_POINTS.length)).flat()];

/** Visible evidence required in the closer working view, rather than every
 * previously established station member. The hoist line continues above the
 * slings; the full supported machine returns during recovery.
 */
export function eiffelGroundLiftFocusPointsAt(seconds: number): readonly RigidVec3[] {
  const s = sampleEiffelGroundLiftPilot(seconds), points: RigidVec3[] = [];
  const pad = (p: readonly number[], amount: number) => padShotPoint(points, p, amount);
  for (const x of [station.part.localBounds.min[0]!, station.part.localBounds.max[0]!]) for (const y of [station.part.localBounds.min[1]!, station.part.localBounds.max[1]!]) for (const z of [station.part.localBounds.min[2]!, station.part.localBounds.max[2]!]) pad(transformRigidPoint(s.payload.pose, [x,y,z]), .25);
  for (const sling of s.rigging.slings) for (const point of sling.points) pad(point,.2);
  pad(s.crane.hook,.35);
  pad([s.crane.hook[0], Math.min(s.crane.boomTip[1], s.crane.hook[1]+4), s.crane.hook[2]], .2);
  if (seconds <= 14) {
    pad(s.carrier.bedPose.position,3.5);
    // Fixed human-scale extents for the outboard slingers and pushing crew.
    for (const x of [-1.1,2]) for (const z of [-3.8,1.5]) for (const y of [0,2]) points.push([s.carrier.bedPose.position[0]+x,y,s.carrier.bedPose.position[2]+z]);
  }
  return points;
}
const shotEase = (value: number) => { const t=Math.max(0,Math.min(1,value)); return t*t*(3-2*t); };
export function eiffelGroundLiftCloseWeight(seconds: number): number {
  return shotEase((seconds-1.5)/4.5) * (1-shotEase((seconds-49)/5.5));
}

const filmOrbitKeyframes = [
  {seconds:0,angle:-20,slope:.1},
  {seconds:205,angle:25,slope:.18},
  {seconds:EIFFEL_FILM_LONG_LOAD_START_SECONDS,angle:38,slope:.12},
  {seconds:EIFFEL_FILM_LONG_LOAD_START_SECONDS+100,angle:49,slope:.12},
  {seconds:EIFFEL_FILM_LONG_LOAD_START_SECONDS+128,angle:53,slope:.4},
  {seconds:EIFFEL_FILM_LONG_LOAD_START_SECONDS+168,angle:89,slope:.08},
  {seconds:EIFFEL_FILM_LONG_LOAD_START_SECONDS+184,angle:91,slope:.12},
  {seconds:EIFFEL_FILM_FIRST_FLOOR_END_SECONDS,angle:95,slope:.03},
  {seconds:EIFFEL_FILM_FIRST_FLOOR_END_SECONDS+66/EIFFEL_FILM_SECOND_FLOOR_RELAY_RATE,angle:96,slope:.03},
  {seconds:EIFFEL_FILM_FIRST_FLOOR_END_SECONDS+116/EIFFEL_FILM_SECOND_FLOOR_RELAY_RATE,angle:199,slope:.03},
  {seconds:EIFFEL_FILM_FIRST_FLOOR_END_SECONDS+222/EIFFEL_FILM_SECOND_FLOOR_RELAY_RATE,angle:200,slope:.03},
  {seconds:EIFFEL_FILM_FIRST_FLOOR_END_SECONDS+300/EIFFEL_FILM_SECOND_FLOOR_RELAY_RATE,angle:201,slope:.03},
  {seconds:EIFFEL_FILM_FIRST_FLOOR_END_SECONDS+342/EIFFEL_FILM_SECOND_FLOOR_RELAY_RATE,angle:280,slope:.03},
  {seconds:EIFFEL_FILM_LONG_LOAD_END_SECONDS,angle:281,slope:.03},
  {seconds:EIFFEL_FILM_DURATION,angle:287,slope:.03},
] as const;
/** Continuous 307° orbit. Keep the accepted first-floor views, travel around
 * the pier during the rigger descent/walk, then follow the upper load through
 * the clear western gap. The southern receiving view reveals bed contact.
 * The view never freezes or reverses. */
export function eiffelFilmAzimuthAt(rawT:number):number {
  const seconds=Math.max(0,Math.min(1,rawT))*EIFFEL_FILM_DURATION;
  let a:(typeof filmOrbitKeyframes)[number]=filmOrbitKeyframes[0],b:(typeof filmOrbitKeyframes)[number]=filmOrbitKeyframes.at(-1)!;
  for(let i=1;i<filmOrbitKeyframes.length;i++)if(seconds<=filmOrbitKeyframes[i]!.seconds){a=filmOrbitKeyframes[i-1]!;b=filmOrbitKeyframes[i]!;break;}
  const span=b.seconds-a.seconds,u=(seconds-a.seconds)/span,u2=u*u,u3=u2*u;
  const angle=(2*u3-3*u2+1)*a.angle+(u3-2*u2+u)*span*a.slope+(-2*u3+3*u2)*b.angle+(u3-u2)*span*b.slope;
  return angle*Math.PI/180;
}

/** Establish support, dolly into the outboard process, follow the load, recover wide. */
export function eiffelFilmShotAt(rawT: number, aspect = 16 / 9): EiffelCameraShot {
  const film = sampleEiffelFilm(rawT);
  if (film.chapter !== 'preparation-cut' && film.chapter !== 'dismantling-cut') return eiffelFilmChapterShotAt(rawT, aspect, film);
  let added = 0;
  const entry = EIFFEL_FILM_INSERTIONS.find(candidate => {
    if (candidate.id === film.insertionId) return true;
    added += insertionDuration(candidate);
    return false;
  });
  if (!entry) return eiffelFilmChapterShotAt(rawT, aspect, film);
  const entering = film.chapter === 'preparation-cut';
  const endpoint = entering ? 0 : entry.duration;
  const local = eiffelFilmChapterShotAt(rawT, aspect, {
    ...film, chapter: entry.id, chapterSeconds: endpoint,
    pilotSeconds: entry.id === 'ground-lift' ? endpoint : film.pilotSeconds,
    campaignSeconds: entry.id === 'joint-campaign' ? endpoint : film.campaignSeconds,
    longLoadSeconds: entry.id === 'long-load-first-floor' ? endpoint : film.longLoadSeconds,
  });
  const wide = eiffelCinematicShotAt(entry.productionT, aspect, rawT, eiffelFilmAzimuthAt(rawT));
  const start = eiffelStage63ProductionToSeconds(entry.productionT) + added;
  const u = entering ? (film.seconds-start)/entry.preparationSeconds
    : (film.seconds-start-entry.preparationSeconds-entry.duration)/entry.dismantlingSeconds;
  // Retarget while distant. The reverse move first withdraws from the work.
  const targetWeight = entering ? shotEase(u/.55) : 1-shotEase((u-.45)/.55);
  const zoomWeight = entering ? shotEase((u-.35)/.65) : 1-shotEase(u/.65);
  const blend = (a:number,b:number,w:number) => a+(b-a)*w;
  const radius=blend(wide.radius,local.radius,zoomWeight);
  // The ground station lies inside the arch: enter through the north opening
  // rather than dollying down the diagonal pier's axis.
  const northApproach=entering&&entry.id==='long-load-first-floor'
    ? shotEase((radius-19)/23)*(1-shotEase((radius-135)/100)) : 0;
  return {
    target: wide.target.map((v,i)=>blend(v,local.target[i]!,targetWeight)) as [number,number,number],
    azimuth: blend(wide.azimuth,Math.PI/2,northApproach), pitch: blend(wide.pitch,local.pitch,targetWeight),
    fov: blend(wide.fov,local.fov,targetWeight), radius,
  };
}

/** Original operation shots remain independent of the visible entry/exit move. */
function eiffelFilmChapterShotAt(rawT: number, aspect: number, film: EiffelFilmSample): EiffelCameraShot {
  // Orbit belongs to the visible film clock, including inserted construction
  // chapters. Production time still controls build height and the wide shot.
  const filmAzimuth = eiffelFilmAzimuthAt(rawT);
  if (film.chapter === 'joint-campaign') return eiffelJointCampaignShotAt(film.campaignSeconds,aspect,filmAzimuth);
  if(film.chapter==='long-load-first-floor') {
    if(film.longLoadSeconds<=EIFFEL_LONG_LOAD_FILM_DURATION)return eiffelLongLoadFilmShotAt(film.longLoadSeconds,aspect,filmAzimuth);
    const elapsed=film.longLoadSeconds-EIFFEL_LONG_LOAD_FILM_DURATION;
    const relay=eiffelSecondFloorRelayFilmShotAt(elapsed*EIFFEL_FILM_SECOND_FLOOR_RELAY_RATE,aspect,filmAzimuth);
    if(elapsed>=2)return relay;
    const before=eiffelLongLoadFilmShotAt(EIFFEL_LONG_LOAD_FILM_DURATION,aspect,filmAzimuth),weight=shotEase(elapsed/2);
    const blend=(a:number,b:number)=>a+(b-a)*weight;
    return {target:before.target.map((v,i)=>blend(v,relay.target[i]!)) as [number,number,number],azimuth:filmAzimuth,pitch:blend(before.pitch,relay.pitch),radius:blend(before.radius,relay.radius),fov:blend(before.fov,relay.fov)};
  }
  if (film.chapter !== 'ground-lift') {const wide=eiffelCinematicShotAt(film.productionT, aspect,rawT,filmAzimuth);return film.chapter==='main'?eiffelSummitWorkShotAt(film.seconds,EIFFEL_FILM_STAGE63_FINAL_WAVE_START_SECONDS,EIFFEL_FILM_STAGE63_FINAL_WAVE_END_SECONDS,wide,aspect):wide;}
  const sample = sampleEiffelGroundLiftPilot(film.pilotSeconds);
  const close = eiffelGroundLiftCloseWeight(film.pilotSeconds);
  const wideTarget: [number,number,number] = [49.5,13,-48];
  const detailTarget: [number,number,number] = [sample.payload.pose.position[0],sample.payload.pose.position[1]+.8,sample.payload.pose.position[2]];
  const target = wideTarget.map((v,i)=>v+(detailTarget[i]!-v)*close) as [number,number,number];
  // Stay below the falsework through hoisting, then look down on the raised
  // load as it turns and traverses into its receiving joint.
  const elevated = shotEase((film.pilotSeconds-26)/4);
  const azimuth = filmAzimuth, pitch=(24-19*close+11*close*elevated)*Math.PI/180, fov=42;
  const safeAspect=Number.isFinite(aspect)&&aspect>0?aspect:16/9;
  const ca=Math.cos(azimuth),sa=Math.sin(azimuth),cp=Math.cos(pitch),sp=Math.sin(pitch),ty=Math.tan(fov*Math.PI/360),tx=ty*safeAspect;
  const fit = (points: readonly RigidVec3[], aim: RigidVec3, minimum: number) => {
    let radius=minimum;
    for(const p of points){const dx=p[0]-aim[0],dy=p[1]-aim[1],dz=p[2]-aim[2],radial=ca*dx+sa*dz,depth=cp*radial+sp*dy;
      radius=Math.max(radius,depth+Math.abs(-sa*dx+ca*dz)/(tx*.86),depth+Math.abs(-sp*radial+cp*dy)/(ty*.79));}
    return radius;
  };
  const wideRadius=fit(eiffelGroundLiftShotPointsAt(film.pilotSeconds),wideTarget,38);
  // A fixed local envelope avoids zoom changes when the cart is left behind or
  // the sling endpoints change ownership. It includes crew, hook and rope lead.
  const detailEnvelope: RigidVec3[]=[];
  for(const x of [-3.8,3.8])for(const y of [-4.3,5.2])for(const z of [-4.2,4.2])detailEnvelope.push([detailTarget[0]+x,detailTarget[1]+y,detailTarget[2]+z]);
  const detailRadius=fit(detailEnvelope,detailTarget,22);
  // A modest radial clearance keeps the real 5 m near-frustum outside the
  // final iron envelope as the global orbit crosses the north-east leg.
  return {target,azimuth,pitch,fov,radius:wideRadius+(detailRadius-wideRadius)*close+.5};
}

const jointPoint = (value: readonly number[]): RigidVec3 => [value[0]!,value[1]!,value[2]!];
/** Two visible ground stocks, actual temporary support and crane establish the
 * campaign. Detail frames then select the current operation without changing
 * either cargo's real pose or hiding the inactive stock cart.
 */
export function eiffelJointCampaignShotPointsAt(seconds: number): readonly RigidVec3[] {
  const sample=sampleEiffelJointCampaign(seconds),points=[...EIFFEL_GROUND_STATION_SHOT_POINTS];
  for(const beam of jointSupport.beams) {padShotPoint(points,beam.a,beam.halfWidth+.1);padShotPoint(points,beam.b,beam.halfWidth+.1);}
  for(const box of jointSupport.boxes) for(const x of [-.5,.5])for(const y of [-.5,.5])for(const z of [-.5,.5])points.push([box.center[0]!+x*box.size[0]!,box.center[1]!+y*box.size[1]!,box.center[2]!+z*box.size[2]!]);
  padShotPoint(points,jointSupport.workerPlatform.recommendedWorker.head.center,.4);
  for(const carrier of sample.carriers)padShotPoint(points,carrier.bedPose.position,4.1);
  for(const load of sample.loads) {const bounds=jointRoutes.loads.find(entry=>entry.part.id===load.partId)!.part.localBounds;for(const x of [bounds.min[0]!,bounds.max[0]!])for(const y of [bounds.min[1]!,bounds.max[1]!])for(const z of [bounds.min[2]!,bounds.max[2]!])padShotPoint(points,transformRigidPoint(load.pose,[x,y,z]),.15);}
  padShotPoint(points,sample.crane.boomTip,.7);padShotPoint(points,sample.crane.hook,.5);
  for(const sling of sample.rigging.slings)for(const point of sling.points)padShotPoint(points,point,.2);
  return points;
}
function jointCloseWeight(seconds: number): number {
  const sample=sampleEiffelJointCampaign(seconds);
  if(sample.activeLoadIndex===0)return eiffelGroundLiftCloseWeight(sample.localSeconds);
  const recover=EIFFEL_JOINT_CAMPAIGN_CONNECTED_AT+3;
  return shotEase((sample.localSeconds-1.5)/4.5)*(1-shotEase((seconds-recover)/(EIFFEL_JOINT_CAMPAIGN_DURATION-recover-.5)));
}
function jointFasteningWeight(seconds: number): number {
  return shotEase((seconds-EIFFEL_JOINT_CAMPAIGN_SEAT_TIMES[1])/3)*(1-shotEase((seconds-EIFFEL_JOINT_CAMPAIGN_CONNECTED_AT)/3));
}
export function eiffelJointCampaignFocusPointsAt(seconds: number): readonly RigidVec3[] {
  const sample=sampleEiffelJointCampaign(seconds),points:RigidVec3[]=[];
  if(seconds>=EIFFEL_JOINT_CAMPAIGN_SEAT_TIMES[1]&&seconds<=EIFFEL_JOINT_CAMPAIGN_CONNECTED_AT+3) {
    padShotPoint(points,jointSupport.joint,.8);
    padShotPoint(points,jointSupport.workerPlatform.center,.65);
    padShotPoint(points,jointSupport.workerPlatform.recommendedWorker.head.center,.3);
    return points;
  }
  const bounds=jointRoutes.loads[sample.activeLoadIndex]!.part.localBounds;
  for(const x of [bounds.min[0]!,bounds.max[0]!])for(const y of [bounds.min[1]!,bounds.max[1]!])for(const z of [bounds.min[2]!,bounds.max[2]!])padShotPoint(points,transformRigidPoint(sample.payload.pose,[x,y,z]),.2);
  for(const sling of sample.rigging.slings)for(const point of sling.points)padShotPoint(points,point,.2);
  padShotPoint(points,sample.crane.hook,.3);
  padShotPoint(points,[sample.crane.hook[0],Math.min(sample.crane.boomTip[1],sample.crane.hook[1]+3.5),sample.crane.hook[2]],.2);
  if(sample.phase==='cart-arrival'||sample.phase==='rigging')padShotPoint(points,sample.carrier.bedPose.position,4.1);
  return points;
}
/** Pure candidate camera may be tested while admission remains false; the main
 * film can only select it through an admitted joint-campaign registry entry. */
export function eiffelJointCampaignShotAt(seconds: number,aspect=16/9,azimuth=-15*Math.PI/180,fasteningClose=true): EiffelCameraShot {
  const sample=sampleEiffelJointCampaign(seconds),close=jointCloseWeight(seconds),fastening=fasteningClose?jointFasteningWeight(seconds):0;
  const wideTarget:RigidVec3=[49.5,13,-49],loadTarget:RigidVec3=[sample.payload.pose.position[0],sample.payload.pose.position[1]+.8,sample.payload.pose.position[2]],joint=jointPoint(jointSupport.joint);
  const detailTarget=loadTarget.map((value,index)=>value+((joint[index]!+(index===1?.2:0))-value)*fastening) as unknown as RigidVec3;
  const target=wideTarget.map((value,index)=>value+(detailTarget[index]!-value)*close) as [number,number,number];
  // Keep the detailed fastening view at 25 degrees while lifting the load
  // view to 16 degrees; the bounds fit below follows the new pitch.
  const pitch=(24-8*close+9*fastening*close)*Math.PI/180,fov=42,safeAspect=Number.isFinite(aspect)&&aspect>0?aspect:16/9;
  const ca=Math.cos(azimuth),sa=Math.sin(azimuth),cp=Math.cos(pitch),sp=Math.sin(pitch),ty=Math.tan(fov*Math.PI/360),tx=ty*safeAspect;
  const fit=(points:readonly RigidVec3[],aim:RigidVec3,minimum:number)=>{let radius=minimum;for(const p of points){const dx=p[0]-aim[0],dy=p[1]-aim[1],dz=p[2]-aim[2],radial=ca*dx+sa*dz,depth=cp*radial+sp*dy;radius=Math.max(radius,depth+Math.abs(-sa*dx+ca*dz)/(tx*.86),depth+Math.abs(-sp*radial+cp*dy)/(ty*.79));}return radius;};
  const handoffEnvelope=[...eiffelJointCampaignShotPointsAt(81.999),...eiffelJointCampaignShotPointsAt(82.001)];
  const wideRadius=fit([...eiffelJointCampaignShotPointsAt(seconds),...handoffEnvelope],wideTarget,38),detail:RigidVec3[]=[];
  // Shrink the local *framing* envelope for the completed joint and worker; no
  // physical object changes size, visibility or pose during this camera move.
  const extent=[3.8+(1.7-3.8)*fastening,5+(1.9-5)*fastening,4.3+(1.7-4.3)*fastening];
  for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])detail.push([detailTarget[0]+x*extent[0]!,detailTarget[1]+y*extent[1]!,detailTarget[2]+z*extent[2]!]);
  const detailRadius=fit(detail,detailTarget,21.4+(10.43-21.4)*fastening);
  const focusRadius=fit(eiffelJointCampaignFocusPointsAt(seconds),target,0);
  const handoffFocus=fit([...eiffelJointCampaignFocusPointsAt(81.999),...eiffelJointCampaignFocusPointsAt(82.001)],target,0);
  const handoffWeight=1-shotEase((Math.abs(seconds-82)-.25)/1);
  const radius=Math.max(wideRadius+(detailRadius-wideRadius)*close,focusRadius+(handoffFocus-focusRadius)*handoffWeight);
  return {target,azimuth,pitch,fov,radius};
}
