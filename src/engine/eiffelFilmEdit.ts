import { EIFFEL_GROUND_STATIONS, type EiffelGroundStationId } from './eiffelGroundStations';
import { EIFFEL_GROUND_PLANT_PRESENT, EIFFEL_GROUND_PLANT_RETIRE_END, sampleEiffelGroundPlantRetirement, type EiffelGroundPlantRetirement } from './eiffelGroundPlantRetirement';
import { EIFFEL_GROUND_STATION_ERECTION_READY, sampleEiffelGroundStationErection, type EiffelGroundStationErectionSample } from './eiffelGroundStationErection';
import {eiffelCinematicShotAt,type EiffelCameraShot} from './eiffelCamera';
import {EIFFEL_FILM_DURATION,EIFFEL_FILM_INSERTIONS,EIFFEL_FILM_LIFT_START_SECONDS as lift,EIFFEL_FILM_LIFT_END_SECONDS as liftEnd,EIFFEL_FILM_JOINT_START_SECONDS as joint,EIFFEL_FILM_JOINT_END_SECONDS as jointEnd,EIFFEL_FILM_LONG_LOAD_START_SECONDS as longLoad,EIFFEL_FILM_LONG_LOAD_END_SECONDS as longEnd,eiffelFilmShotAt,eiffelJointCampaignShotAt,eiffelFilmAzimuthAt,sampleEiffelFilmSeconds,type EiffelFilmSample} from './eiffelFilm';

export type EiffelFilmEdit='detailed'|'cinematic';
export const EIFFEL_CINEMATIC_DURATION=180;
/** Edit seconds → original film seconds. These budgets select representative
 * work rather than multiplying every operation by the same playback rate. */
export const EIFFEL_CINEMATIC_KEYS:readonly(readonly[number,number])[]=[
  [0,0],[7,lift-3],[9,lift],[11,lift+8],[15,lift+14],[24,lift+46],[28,liftEnd+4],
  [29,joint-3],[31,joint+90],[34,joint+100],[42,joint+114],[45,joint+134],[48,jointEnd+4],
  [66,longLoad-3],[69,longLoad+100],[72,longLoad+112],[80,longLoad+128],
  [88,longLoad+168],[96,longLoad+240],[104,longLoad+280],
  // The real upper receiver is reached before the shaft rises. Its four-source-
  // second supported hold gives the upper frame time to be erected around it.
  [124,longEnd-4],[158,longEnd],[162,longEnd+4],
  [172,EIFFEL_FILM_DURATION-6],[180,EIFFEL_FILM_DURATION],
];
const clamp=(t:number)=>{if(!Number.isFinite(t))throw new Error('Eiffel edit time must be finite');return Math.max(0,Math.min(1,t));};
const ease=(v:number)=>{const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t);};
const jointInsertion=EIFFEL_FILM_INSERTIONS.find(entry=>entry.id==='joint-campaign')!;
const longInsertion=EIFFEL_FILM_INSERTIONS.find(entry=>entry.id==='long-load-first-floor')!;
const postJoint=jointEnd+jointInsertion.dismantlingSeconds;
const longStartWithPreparation=longLoad-longInsertion.preparationSeconds;
const postLong=longEnd+longInsertion.dismantlingSeconds;
/** Viewer seconds -> physical source seconds. Editorial 500s is the expanded
 * structural-montage endpoint; every source boundary is derived from film data. */
export const EIFFEL_DETAILED_KEYS:readonly(readonly[number,number])[]=[[postJoint,postJoint],[postJoint+6,postJoint+3],[500,longStartWithPreparation],[postLong,postLong]];
const EIFFEL_DETAILED_TANGENTS:readonly number[]=[1,.1,.2,1];
function tangentsFor(keys:readonly(readonly[number,number])[]){const slopes=keys.slice(1).map((k,i)=>(k[1]-keys[i]![1])/(k[0]-keys[i]![0]));return keys.map((_,i)=>{if(i===0)return slopes[0]!;if(i===keys.length-1)return slopes.at(-1)!;const h0=keys[i]![0]-keys[i-1]![0],h1=keys[i+1]![0]-keys[i]![0],w0=2*h1+h0,w1=h1+2*h0;return slopes[i-1]===0||slopes[i]===0?0:(w0+w1)/(w0/slopes[i-1]!+w1/slopes[i]!);});}
function mapSeconds(keys:readonly(readonly[number,number])[],seconds:number,explicitTangents?:readonly number[]){const tangents=explicitTangents??tangentsFor(keys),i=Math.min(keys.length-2,Math.max(0,keys.findIndex((k,index)=>index>0&&k[0]>=seconds)-1)),a=keys[i]!,b=keys[i+1]!,h=b[0]-a[0],u=(seconds-a[0])/h;if(u===0||a[1]===b[1])return a[1];if(u===1)return b[1];const u2=u*u,u3=u2*u;return Math.max(a[1],Math.min(b[1],(2*u3-3*u2+1)*a[1]+(u3-2*u2+u)*h*tangents[i]!+(-2*u3+3*u2)*b[1]+(u3-u2)*h*tangents[i+1]!));}
function authoredSourceSeconds(keys:readonly(readonly[number,number])[],t:number,duration:number){
  const seconds=clamp(t)*duration;
  return keys.find(key=>key[0]===seconds||key[0]/duration===t)?.[1];
}
export const eiffelFilmEditDuration=(edit:EiffelFilmEdit)=>edit==='cinematic'?EIFFEL_CINEMATIC_DURATION:EIFFEL_FILM_DURATION;
/** Viewer seconds → exact source seconds. Authored keys keep their source
 * values rather than a unit-time round-trip that can sit a ULP under a hold. */
export function eiffelFilmEditSourceSecondsAt(edit:EiffelFilmEdit,t:number):number{
  const bounded=clamp(t),duration=eiffelFilmEditDuration(edit),seconds=bounded*duration;
  if(edit==='detailed'){
    const exact=authoredSourceSeconds(EIFFEL_DETAILED_KEYS,bounded,duration);
    return exact??(seconds<=postJoint||seconds>=postLong?seconds:mapSeconds(EIFFEL_DETAILED_KEYS,seconds,EIFFEL_DETAILED_TANGENTS));
  }
  return authoredSourceSeconds(EIFFEL_CINEMATIC_KEYS,bounded,duration)??mapSeconds(EIFFEL_CINEMATIC_KEYS,seconds);
}
export function eiffelFilmEditSourceTAt(edit:EiffelFilmEdit,t:number):number{
  return eiffelFilmEditSourceSecondsAt(edit,t)/EIFFEL_FILM_DURATION;
}
export function eiffelFilmEditTimeForSource(edit:EiffelFilmEdit,sourceT:number):number{
  const t=clamp(sourceT);if(t===0||t===1)return t;
  let a=0,b=1;for(let i=0;i<48;i++){const m=(a+b)/2;if(eiffelFilmEditSourceTAt(edit,m)<t)a=m;else b=m;}return(a+b)/2;
}
export const EIFFEL_CINEMATIC_CAPTION_WINDOWS=[
  {id:'eiffel-lift-prepared',fromSeconds:15,toSeconds:23},
  {id:'eiffel-lift-later',fromSeconds:24,toSeconds:32},
  {id:'eiffel-joint-prepared',fromSeconds:34,toSeconds:42},
  {id:'eiffel-joint-later',fromSeconds:44,toSeconds:52},
  {id:'eiffel-relay-prepared',fromSeconds:72,toSeconds:80},
  {id:'eiffel-relay-later',fromSeconds:144,toSeconds:152},
] as const;

/** Deck seat boundaries from the actual production plan (contract-tested). */
export const EIFFEL_FIRST_FLOOR_READY_T=.3152;
export const EIFFEL_SECOND_FLOOR_READY_T=.4298666666666667;
export const EIFFEL_CINEMATIC_PRODUCTION_KEYS:readonly(readonly[number,number])[]=[
  // Keep the four ground landing corridors free until their cargo seats at24s.
  [0,0],[9,EIFFEL_FILM_INSERTIONS[0]!.productionT],[24,.09104],[28,.0917],
  [29,jointInsertion.productionT],[48,.19],
  [66,EIFFEL_FIRST_FLOOR_READY_T],[82,.36],
  // Spend the relay overview on visible shaft growth, then keep rising through146s.
  [104,EIFFEL_SECOND_FLOOR_READY_T],[124,.56],[146,.645],
  [158,.79],[162,longInsertion.productionT],
];
export interface EiffelEditedFilmSample extends EiffelFilmSample {
  readonly continuousConstruction:boolean;
  readonly relayReady:boolean;
  readonly stationErection:EiffelGroundStationErectionSample;
  readonly groundLiftVisible:boolean;
  readonly jointPlantVisible:boolean;
  readonly plantRetirement:EiffelGroundPlantRetirement;
  readonly suppressedGroundStations:readonly EiffelGroundStationId[];
}
/** Mechanical time does not imply that the summit was already erected before
 * the first-floor delivery. One sample drives structure, light and framing. */
export function sampleEiffelFilmEdit(edit:EiffelFilmEdit,t:number):EiffelEditedFilmSample{
  const source=sampleEiffelFilmSeconds(eiffelFilmEditSourceSecondsAt(edit,t)),seconds=clamp(t)*180;
  const productionT=edit==='cinematic'&&seconds<=162
    ? mapSeconds(EIFFEL_CINEMATIC_PRODUCTION_KEYS,seconds) : source.productionT;
  const seatedPartIds=edit==='cinematic'&&source.selectedSeated
    ? [...new Set([...source.seatedPartIds,...EIFFEL_GROUND_STATIONS.map(s=>s.payloadId)])] : source.seatedPartIds;
  const continuousConstruction=edit==='cinematic';
  const plantRetirement=continuousConstruction?sampleEiffelGroundPlantRetirement(seconds):EIFFEL_GROUND_PLANT_PRESENT;
  const jointPlantVisible=source.insertionId==='joint-campaign'||(continuousConstruction&&source.seconds>=jointEnd&&plantRetirement.ne<1);
  return {...source,seatedPartIds,productionT,continuousConstruction,
    relayReady:edit==='detailed'||productionT>=EIFFEL_SECOND_FLOOR_READY_T,
    stationErection:continuousConstruction?sampleEiffelGroundStationErection(seconds):EIFFEL_GROUND_STATION_ERECTION_READY,
    groundLiftVisible:continuousConstruction?seconds<EIFFEL_GROUND_PLANT_RETIRE_END:source.insertionId==='ground-lift',
    jointPlantVisible,plantRetirement,
    suppressedGroundStations:continuousConstruction&&jointPlantVisible?['ne']:[],
  };
}

/** Withdraw to the complete tower between representative work passages. */
export function eiffelFilmEditShotAt(edit:EiffelFilmEdit,t:number,aspect=16/9):EiffelCameraShot{
  const sourceT=eiffelFilmEditSourceTAt(edit,t);let local=eiffelFilmShotAt(sourceT,aspect);
  if(edit==='detailed')return local;
  const seconds=clamp(t)*180,film=sampleEiffelFilmEdit(edit,t);
  const wide=eiffelCinematicShotAt(film.productionT,aspect,sourceT,eiffelFilmAzimuthAt(sourceT));
  if(film.chapter==='joint-campaign'){
    // Keep the hanging member, crane and joint in one 42° frame. A worker-scale
    // fastening punch left only a ratchet readable against the lattice.
    local=eiffelJointCampaignShotAt(film.campaignSeconds,aspect,eiffelFilmAzimuthAt(sourceT),false);
  }
  const weight=Math.max(ease((seconds-9)/3)*(1-ease((seconds-24)/4)),ease((seconds-30)/4)*(1-ease((seconds-42)/5)),ease((seconds-66)/6)*(1-ease((seconds-80)/8)));
  // Move the target first while wide; withdraw before changing it back.
  const targetWeight=ease(weight/.65),radiusWeight=ease((weight-.35)/.65);
  const mix=(a:number,b:number,w:number)=>a+(b-a)*w;
  const radius=mix(wide.radius,local.radius,radiusWeight);
  const azimuth=wide.azimuth;
  return {target:wide.target.map((v,i)=>mix(v,local.target[i]!,targetWeight)) as [number,number,number],radius,
    pitch:mix(wide.pitch,local.pitch,targetWeight),fov:mix(wide.fov,local.fov,targetWeight),azimuth};
}
