import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {eiffelConvexSolid,eiffelConvexBox,eiffelConvexPenetration,eiffelConvexTranslationSweep} from '../src/engine/eiffelConvex';
import {eiffelSolidBox} from '../src/engine/eiffelOccupancy';
import {sampleEiffelJointCampaign} from '../src/engine/eiffelJointCampaign';
import type {EiffelKitManifest} from '../src/data/eiffelKitTypes';
import type {RigidVec3 as V} from '../src/engine/eiffelRigid';

const folder='artifacts/eiffel-face-joint-2026-09-07/';
const manifestBytes=readFileSync('public/models/eiffel-construction-kit/tower-kit.manifest.json');
const manifest=JSON.parse(manifestBytes.toString()) as EiffelKitManifest;
const candidate=JSON.parse(readFileSync(folder+'design.json','utf8'));
const hash=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
if(candidate.sourceManifestSHA256!==hash(manifestBytes)) throw new Error('Candidate source manifest changed');
const pieces=candidate.components.map((c:{id:string;vertices:V[];faces:number[][]})=>({id:c.id,solid:eiffelConvexSolid(c.vertices,c.faces)}));
const tower=manifest.parts.filter(p=>p.id!==candidate.replaces).map(p=>({id:p.id,solid:eiffelConvexBox(eiffelSolidBox(p,p.finalPose))}));
const clashes=(shape:ReturnType<typeof eiffelConvexSolid>)=>tower.flatMap(p=>{
  const depth=eiffelConvexPenetration(shape,p.solid);return depth>1e-7?[{id:p.id,depth}]:[];
});
const final=pieces.flatMap((p:typeof pieces[number])=>clashes(p.solid).map(hit=>({piece:p.id,...hit})));
const insertion=pieces.flatMap((p:typeof pieces[number])=>clashes(eiffelConvexTranslationSweep(p.solid,candidate.normal.map((v:number)=>v*.4) as V)).map(hit=>({piece:p.id,...hit})));
const self=[];
for(let i=0;i<pieces.length;i++)for(let j=i+1;j<pieces.length;j++){
  const depth=eiffelConvexPenetration(pieces[i].solid,pieces[j].solid);
  if(depth>1e-7)self.push({a:pieces[i].id,b:pieces[j].id,depth});
}
const beam=manifest.parts.find(p=>p.id==='lower-ne-02-m012-c001')!;
const badOrder=new Map<string,{piece:string;seconds:number;depth:number}>();
for(let tick=0;tick<=4600;tick++){
  const seconds=tick/100,pose=sampleEiffelJointCampaign(seconds).loads[0].pose;
  const moving=eiffelConvexBox(eiffelSolidBox(beam,pose));
  for(const p of pieces){const depth=eiffelConvexPenetration(p.solid,moving),old=badOrder.get(p.id);
    if(depth>1e-7&&(!old||depth>old.depth))badOrder.set(p.id,{piece:p.id,seconds,depth});}
}
const result={sourceManifestSHA256:hash(manifestBytes),candidateSHA256:hash(readFileSync(folder+'design.json')),
  final:{testedTowerSolids:tower.length,clashes:final},selfClashes:self,
  insertion:{translation:.4,direction:candidate.normal,method:'Exact fixed-orientation convex translation sweep',clashes:insertion},
  preinstalledPlate:{samples:4601,stepSeconds:.01,beam:beam.id,clashes:[...badOrder.values()]},
  geometryAccepted:final.length===0&&self.length===0&&insertion.length===0,
  productionAdmitted:false,
  limits:['Geometry only. No ground-delivery or fastening admission.','Other original tower joint contacts remain unresolved.','Incoming beam clearance is sampled; it is sufficient to reject an observed intersecting order, not to prove all motion clear.']};
writeFileSync(folder+'placement-audit.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
