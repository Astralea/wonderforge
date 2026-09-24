import {SYDNEY_CONSTRUCTION as plan} from '../../src/data/sydneyConstruction.ts';
import {sydneyCraneStateAt} from '../../src/engine/sydneyConstruction.ts';
const dist=(a:readonly number[],b:readonly number[])=>Math.hypot(...a.map((v,i)=>v-b[i]!));
const results=[];
for(const crane of [0,1] as const){
 const jobs=plan.parts.filter(p=>p.graph==='shell'&&p.crane===crane).map(p=>({p,from:p.start+p.duration*.58,until:p.start+p.duration*.9})).sort((a,b)=>a.from-b.from);
 let worstTip={meters:0,t:0,from:'',to:''},worstHook={meters:0,t:0};let previous=sydneyCraneStateAt(crane,.24);
 for(let f=1;f<=Math.floor((.89-.24)*3600);f++){const t=.24+f/3600,state=sydneyCraneStateAt(crane,t),tip=dist(state.jibTip,previous.jibTip),hook=dist(state.hook,previous.hook);if(tip>worstTip.meters)worstTip={meters:tip,t,from:previous.phase,to:state.phase};if(hook>worstHook.meters)worstHook={meters:hook,t};previous=state;}
 const heroes=jobs.flatMap((j,i)=>{if(j.p.duration<.03)return[];const from=jobs[i-1]!.until,to=jobs[i+1]!.from;let maxTip=0,maxHook=0,previous=sydneyCraneStateAt(crane,from);for(let t=from+1/3600;t<=to;t+=1/3600){const state=sydneyCraneStateAt(crane,t);maxTip=Math.max(maxTip,dist(state.jibTip,previous.jibTip));maxHook=Math.max(maxHook,dist(state.hook,previous.hook));previous=state;}return[{id:j.p.id,start:j.p.start,duration:j.p.duration,hoistFrom:j.from,hoistUntil:j.until,preCycleSeconds:(j.from-from)*60,postCycleSeconds:(to-j.until)*60,maxTipMetersPerFrame:maxTip,maxHookMetersPerFrame:maxHook}];});
 results.push({crane,fps:60,globalWorstTip:worstTip,globalWorstHook:worstHook,heroes});
}

console.log(JSON.stringify(results,null,2));
