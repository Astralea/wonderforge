import record from '../data/eiffelStage63Pace.json';

export const EIFFEL_STAGE63_PRODUCTION_DURATION=record.duration;
export const EIFFEL_STAGE63_FINAL_WAVE=record.representative;

type PaceSegment=(typeof record.segments)[number];
function map(value:number,sourceStart:'productionStart'|'secondsStart',sourceEnd:'productionEnd'|'secondsEnd',targetStart:'productionStart'|'secondsStart',targetEnd:'productionEnd'|'secondsEnd'){
 if(!Number.isFinite(value))throw Error('Stage-63 clock query must be finite');const segments=record.segments,first=segments[0]!,last=segments.at(-1)!;
 if(value<=first[sourceStart])return first[targetStart];if(value>=last[sourceEnd])return last[targetEnd];let low=0,high=segments.length-1;
 while(low<high){const mid=(low+high)>>>1;if(value>(segments[mid]as PaceSegment)[sourceEnd])low=mid+1;else high=mid;}
 const segment=segments[low]as PaceSegment,u=(value-segment[sourceStart])/(segment[sourceEnd]-segment[sourceStart]);return segment[targetStart]+(segment[targetEnd]-segment[targetStart])*u;
}
export const eiffelStage63ProductionToSeconds=(productionT:number)=>map(productionT,'productionStart','productionEnd','secondsStart','secondsEnd');
export const eiffelStage63SecondsToProduction=(seconds:number)=>map(seconds,'secondsStart','secondsEnd','productionStart','productionEnd');
