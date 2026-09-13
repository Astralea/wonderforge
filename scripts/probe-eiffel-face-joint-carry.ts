/** Reject or refine a candidate transport layout; this is not route admission. */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {eiffelConvexSolid,eiffelConvexBox,eiffelConvexPenetration,transformEiffelConvexSolid,eiffelConvexTranslationSweep} from '../src/engine/eiffelConvex';
import {eiffelAxisBox,eiffelSolidBox,EiffelOccupancy} from '../src/engine/eiffelOccupancy';
import {createEiffelProductionPlan} from '../src/engine/eiffelProductionConstruction';
import {sampleEiffelJointCampaign} from '../src/engine/eiffelJointCampaign';
import {eiffelReceiverBeamBox} from '../src/engine/eiffelUpperClearance';
import {composeRigidPoses,invertRigidPose,type RigidVec3 as V} from '../src/engine/eiffelRigid';
import type {EiffelKitManifest} from '../src/data/eiffelKitTypes';
const folder='artifacts/eiffel-face-joint-2026-09-07/';
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const manifest=read('public/models/eiffel-construction-kit/tower-kit.manifest.json') as EiffelKitManifest;
const design=read(folder+'design.json'),routes=read('artifacts/eiffel-joint-campaign-2026-09-07/campaign-routes.json');
const support=read('artifacts/eiffel-joint-campaign-2026-09-07/joint-support.json'),old=read('artifacts/eiffel-integration-2026-09-07/guyenet-ne-station.json');
const plan=createEiffelProductionPlan(manifest),completed=manifest.parts.filter(p=>p.id!==design.replaces&&plan.byPart.get(p.id)!.end<=routes.freeze);
const tower=new EiffelOccupancy(completed.map(part=>({part,end:0})));
const staticSolids=[...old.proposedStructure,...support.beams].map(b=>({id:b.id,solid:eiffelConvexBox(eiffelReceiverBeamBox(b.a,b.b,b.halfWidth))}));
for(const b of support.boxes)staticSolids.push({id:b.id,solid:eiffelConvexBox(eiffelAxisBox(b.center,b.size))});
const part=manifest.parts.find(p=>p.id===routes.loads[0].part.id)!,inverse=invertRigidPose(part.finalPose);
const reports=[];
const step=Number(process.env.CARRIER_STEP||.1);
const carrier=process.env.CARRIER_FRAME?(process.env.CARRIER_INDEX?read(folder+'carrier-design.json').candidates[Number(process.env.CARRIER_INDEX)]:read(folder+'carrier-design.json').candidate):null;
for(const offset of process.env.CARRIER_FRAME?[.4]:[.4,.55,.7]){
 const pieces=design.components.map((c:{id:string;vertices:V[];faces:number[][]})=>({id:c.id,solid:eiffelConvexSolid(c.vertices.map(v=>v.map((x,k)=>x+design.normal[k]*offset) as unknown as V),c.faces)}));
 if(carrier)for(const b of carrier.boxes){
  if(b.id.startsWith('clamp'))pieces.push({id:b.id,solid:eiffelConvexBox(b.box)});
  else {const h=b.box.half,wall=.006;
   for(const [role,half,offset] of [['flange',[h[0],wall/2,h[2]],[0,h[1]-wall/2,0]],['web',[wall/2,h[1]-wall/2,h[2]],[h[0]-wall/2,-wall/2,0]]] as const){
    const center=b.box.center.map((v:number,k:number)=>v+b.box.axes.reduce((sum:number,a:number[],i:number)=>sum+a[k]!*offset[i]!,0));
    pieces.push({id:b.id+'-'+role,solid:eiffelConvexBox({...b.box,center,half})});
   }
  }
 }
 const findings=new Map<string,{piece:string;fixed:string;seconds:number;depth:number}>();
 function check(piece:string,shape:ReturnType<typeof eiffelConvexSolid>,fixed:string,solid:ReturnType<typeof eiffelConvexSolid>,seconds:number){
  const depth=eiffelConvexPenetration(shape,solid),key=piece+'|'+fixed,previous=findings.get(key);
  if(depth>1e-5&&(!previous||depth>previous.depth))findings.set(key,{piece,fixed,seconds,depth});
 }
 for(let tick=0;tick<=(process.env.SWEEP_GRID?-1:Math.round(46/step));tick++){
  const seconds=tick*step,s=sampleEiffelJointCampaign(seconds),delta=composeRigidPoses(s.loads[0].pose,inverse);
  const extras=s.loads.map((l,i)=>({id:'cargo-'+i,solid:eiffelConvexBox(eiffelSolidBox(routes.loads[i].part,l.pose))}));
  for(const [bi,b] of s.basketLoops.entries())for(let i=1;i<b.points.length;i++)extras.push({id:`basket-${bi}-${i}`,solid:eiffelConvexBox(eiffelReceiverBeamBox(b.points[i-1]!,b.points[i]!,.015))});
  for(const [ri,r] of s.rigging.slings.entries())extras.push({id:`upper-sling-${ri}`,solid:eiffelConvexBox(eiffelReceiverBeamBox(r.points[0],r.points[2],.022))});
  extras.push({id:'hook',solid:eiffelConvexBox(eiffelAxisBox(s.crane.hook,[.14,.2,.14]))});
  for(const p of pieces){
   const shape=transformEiffelConvexSolid(p.solid,delta),bounds=eiffelAxisBox(shape.min.map((x,k)=>(x+shape.max[k]!)/2) as unknown as V,shape.min.map((x,k)=>shape.max[k]!-x) as unknown as V);
   for(const fixed of tower.nearby(bounds,0))check(p.id,shape,fixed.part.id,eiffelConvexBox(fixed.box),seconds);
   for(const fixed of [...staticSolids,...extras])check(p.id,shape,fixed.id,fixed.solid,seconds);
  }
 }
 const groundHoistSweeps=[];
 const sweepPieces=process.env.INDEPENDENT_PACKAGE?[{id:'independent-package-envelope',solid:eiffelConvexBox(eiffelAxisBox([design.joint[0]+.14,design.joint[1]+.065,design.joint[2]-.15],[.52,.56,1.12]))}]:[...pieces,{id:'incoming-beam',solid:eiffelConvexBox(eiffelSolidBox(part,part.finalPose))}];
 const allFixed=[...completed.map(p=>({id:p.id,solid:eiffelConvexBox(eiffelSolidBox(p,p.finalPose))})),...staticSolids];
 if(process.env.INDEPENDENT_PACKAGE)for(const load of routes.loads)allFixed.push({id:load.part.id,solid:eiffelConvexBox(eiffelSolidBox(load.part,load.part.finalPose))});
 for(const dx of process.env.SWEEP_GRID?[-1,-.5,0,.5,1,1.5,2]:[0])for(const dz of process.env.SWEEP_GRID?[-1,-.5,0,.5,1]:[0]){
  const a=sampleEiffelJointCampaign(14).loads[0].pose,b=sampleEiffelJointCampaign(26).loads[0].pose;
  const moved={...a,position:[a.position[0]+dx,a.position[1]+(process.env.INDEPENDENT_PACKAGE?.25:0),a.position[2]+dz] as V};
  const delta=composeRigidPoses(moved,inverse),translation=b.position.map((x,k)=>x-a.position[k]!) as unknown as V;
  const hits=[];
  for(const p of sweepPieces){const swept=eiffelConvexTranslationSweep(transformEiffelConvexSolid(p.solid,delta),translation);
   for(const fixed of allFixed){const depth=eiffelConvexPenetration(swept,fixed.solid);if(depth>1e-5)hits.push({piece:p.id,fixed:fixed.id,depth});}
  }
  groundHoistSweeps.push({dx,dz,hits});
 }
 reports.push({offset,samples:process.env.SWEEP_GRID?0:Math.round(46/step)+1,findings:[...findings.values()].sort((a,b)=>b.depth-a.depth),groundHoistSweeps});
}
const result={scope:process.env.INDEPENDENT_PACKAGE?'Exact vertical sweep of a .52 x .56 x 1.12 m independent package envelope after both beams are seated. This is space planning only; no packing, sling, crane, transfer, delivery or worker admission.':'Actual 6 mm angle legs, clamp solids and plate/pads beside the first beam; completed tower minus replaced slab, 245 static support solids, both cargo, baskets, upper slings and hook. Exact ground-hoist sweeps additionally include the incoming beam; optional column offsets are search candidates, not crane or route admission. Excludes actual articulated crane, exact cart and crew.',includesCarrierFrame:!!carrier,carrierEnds:carrier?.ends,sourceCarrierSHA256:carrier?createHash('sha256').update(readFileSync(folder+'carrier-design.json')).digest('hex'):null,step,productionAdmitted:false,reports};
writeFileSync(folder+(process.env.INDEPENDENT_PACKAGE?'package-column-search.json':process.env.SWEEP_GRID?'carrier-column-search.json':process.env.CARRIER_FRAME?`carrier-probe${process.env.CARRIER_INDEX?'-'+process.env.CARRIER_INDEX:''}.json`:'carry-probe.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
