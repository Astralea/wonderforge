/** Longer films repeat their own local cue at native speed. Normal-length
 * movies retain their authored normalized synchronization. No cross-wonder cue.
 */
export function soundtrackClockAt(t:number,filmSeconds:number,cueSeconds:number,authoredLoop:boolean){
  const repeat=filmSeconds>cueSeconds+.1;
  return {loop:authoredLoop||repeat,time:repeat?(Math.max(0,t)*filmSeconds)%cueSeconds:Math.max(0,Math.min(1,t))*cueSeconds};
}
