/** Empty-trolley geometric fit, not a powered crane simulation. */
export const EIFFEL_DIAGONAL_TROLLEY_DURATION=16;
export const EIFFEL_DIAGONAL_TROLLEY_LENGTH=Math.hypot(6.5,2.2);
export function sampleEiffelDiagonalTrolley(rawSeconds:number){
 if(!Number.isFinite(rawSeconds))throw Error('Trolley time must be finite');
 const seconds=Math.max(0,Math.min(EIFFEL_DIAGONAL_TROLLEY_DURATION,rawSeconds));
 const t=seconds/EIFFEL_DIAGONAL_TROLLEY_DURATION,progress=t*t*(3-2*t);
 const distance=EIFFEL_DIAGONAL_TROLLEY_LENGTH*progress;
 return{seconds,distance,position:[-8.5-6.5*progress,121.495,-4+2.2*progress] as const,wheelAngle:-distance/.115};
}
