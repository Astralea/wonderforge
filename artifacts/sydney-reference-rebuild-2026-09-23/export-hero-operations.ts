import { SYDNEY_CONSTRUCTION as plan } from '../../src/data/sydneyConstruction';
import { sydneyPartStateAt } from '../../src/engine/sydneyConstruction';
const ids = ['rib-0--1-4-4', 'rib-3--1-4-4', 'tile-0--1-7-0', 'tile-3--1-5-4'];
console.log(JSON.stringify(ids.map(id => {
 const p=plan.parts.find(p=>p.id===id)!;
 return {id,crane:p.crane,kind:p.kind,dimensions:p.dimensions,start:p.start,duration:p.duration,
 samples:[.07,.3,.48,.65,.77,.89,.91].map(u=>({t:p.start+u*p.duration,...sydneyPartStateAt(p,plan.routes[0]!,p.start+u*p.duration)}))};
}),null,2));
