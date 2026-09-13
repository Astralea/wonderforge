import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import type {EiffelKitManifest} from '../src/data/eiffelKitTypes';
import {createEiffelProductionPlan} from '../src/engine/eiffelProductionConstruction';
import {EiffelOccupancy} from '../src/engine/eiffelOccupancy';
import {probeEiffelGroundFeed} from '../src/engine/eiffelGroundSupply';

const out='artifacts/eiffel-ground-supply-2026-09-08';mkdirSync(out,{recursive:true});
const manifest=JSON.parse(readFileSync('public/models/eiffel-construction-kit/tower-kit.manifest.json','utf8')) as EiffelKitManifest;
const plan=createEiffelProductionPlan(manifest);
// Curved top pieces use conservative envelopes. Do not silently exclude them
// from occupancy as the older box-only spatial index otherwise would.
const occupancy=new EiffelOccupancy(plan.operations.map(op=>({part:{...op.part,shape:'box' as const},end:op.end})));
const operations=plan.operations.filter(op=>op.part.group!=='foundation');
const probes=[],byStage:Record<string,{total:number;routes:number;directIronBlocked:number}>={};
const start=performance.now();
for(const [i,op]of operations.entries()){
  const probe=probeEiffelGroundFeed(op,occupancy);probes.push(probe);
  const group=byStage[String(op.part.stage)]??={total:0,routes:0,directIronBlocked:0};
  group.total++;if(probe.route)group.routes++;if(probe.directIronBlocker)group.directIronBlocked++;
  if(i%500===0)console.log(JSON.stringify({processed:i+1,total:operations.length,seconds:(performance.now()-start)/1000}));
}
const summary={productionReady:false,total:probes.length,envelopeRoutes:probes.filter(p=>p.route).length,
  directBlocked:probes.filter(p=>p.directBlocker).length,directIronBlocked:probes.filter(p=>p.directIronBlocker).length,
  directReceiverBlocked:probes.filter(p=>p.directBlocker==='receiver-deck').length,
  rejected:probes.filter(p=>!p.route).length,byStage,elapsedSeconds:(performance.now()-start)/1000,
  limits:['Fixed-orientation cargo envelope sweep only; non-box kit parts are conservative boxes.',
    'Uses completed kit at original start; concurrent moving loads and equipment lifecycles are excluded.',
    'Receiver deck/supports, stock table/feet, bracket/saddles and simplified mast included; articulated crane, slings, ground cart, city, roads and workers are not certified.',
    'No main-film promotion; original upper routes and unreadable clock remain separate defects.']};
const sourceHashes=Object.fromEntries(['src/engine/eiffelGroundSupply.ts','src/engine/eiffelProductionConstruction.ts','src/engine/eiffelConstructionTiming.ts','public/models/eiffel-construction-kit/tower-kit.manifest.json'].map(path=>[path,createHash('sha256').update(readFileSync(path)).digest('hex')]));
writeFileSync(`${out}/ground-feed-audit.json`,JSON.stringify({summary,sourceHashes,probes},null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
