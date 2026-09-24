import {writeFileSync} from 'node:fs';
import {SYDNEY_CONSTRUCTION} from '../../src/data/sydneyConstruction';
import {sydneyPartStateAt,sydneyCraneStateAt} from '../../src/engine/sydneyConstruction';
import {SYDNEY_YARD_SHOT} from '../../src/engine/sydneyCamera';
const selected=SYDNEY_CONSTRUCTION.parts.filter(p=>p.graph==='shell'&&p.duration>=.05).map(p=>({id:p.id,crane:p.crane,kind:p.kind,start:p.start,duration:p.duration,dimensions:p.dimensions,samples:[.07,.3,.53,.65,.77,.89,.95].map(u=>({t:p.start+p.duration*u,state:sydneyPartStateAt(p,SYDNEY_CONSTRUCTION.routes[0]!,p.start+p.duration*u),rig:sydneyCraneStateAt(p.crane,p.start+p.duration*u)}))}));
writeFileSync('artifacts/sydney-motion-2026-09-23/hero-operations.json',JSON.stringify(selected,null,2));
writeFileSync('artifacts/sydney-motion-2026-09-23/yard-shot.json',JSON.stringify(SYDNEY_YARD_SHOT,null,2));
