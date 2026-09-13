import closedSling from '../../artifacts/eiffel-closed-sling-2026-09-08/design.json';
import operationStart from '../../artifacts/eiffel-long-load-main-2026-09-08/operation-start.json';
import { sampleEiffelMasterLinkHoist } from './eiffelMasterLinkHoist';
import onwardDesign from '../../artifacts/eiffel-long-load-onward-2026-09-08/design.json';
import {eiffelLongLoadPreparedRoles,EIFFEL_LONG_LOAD_ONWARD_DURATION,EIFFEL_LONG_LOAD_ONWARD_START,sampleEiffelLongLoadOnward} from './eiffelLongLoadOnward';

export const EIFFEL_LONG_LOAD_FILM_PART_ID = 'summit-access-stair-m000-c000';
export const EIFFEL_LONG_LOAD_FILM_DURATION = EIFFEL_LONG_LOAD_ONWARD_DURATION;

/** Generated from the real production plan. A focused test recomputes the
 * plan and manifest hash; runtime does not embed the 24 MB manifest twice. */
if(operationStart.partId!==EIFFEL_LONG_LOAD_FILM_PART_ID)throw Error('Eiffel long-load operation record identity mismatch');
export const EIFFEL_LONG_LOAD_FILM_PRODUCTION_T=operationStart.productionT;

/** Sole-payload-owner sample for the main renderer. It ends supported on the
 * first-floor cart with the closed sling still attached. */
export function sampleEiffelLongLoadFilm(seconds:number) {
  if(!Number.isFinite(seconds))throw Error('Eiffel long-load film time must be finite');
  if(seconds>EIFFEL_LONG_LOAD_ONWARD_START)return sampleEiffelLongLoadOnward(seconds);
  const sample=sampleEiffelMasterLinkHoist(seconds,{...closedSling,hoistEnd:onwardDesign.hoistEnd}),prepared=sampleEiffelLongLoadOnward(128).onward;
  return {...sample,partId:EIFFEL_LONG_LOAD_FILM_PART_ID,ownsPayload:true as const,onward:{...prepared,phase:'hoisting' as const,roles:eiffelLongLoadPreparedRoles(sample.carrierOrigin,sample.masterOrigin)}};
}
