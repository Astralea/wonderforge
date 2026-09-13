import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Box3,Mesh} from 'three';
import {eiffelAxisBox,eiffelSolidBox} from '../src/engine/eiffelOccupancy';
import {eiffelConvexBox,eiffelConvexPenetration,eiffelConvexTranslationSweep} from '../src/engine/eiffelConvex';
import {eiffelReceiverBeamBox} from '../src/engine/eiffelUpperClearance';
import {createEiffelProductionPlan} from '../src/engine/eiffelProductionConstruction';
import {composeRigidPoses,invertRigidPose,transformRigidPoint,rotateRigidVector,type RigidVec3 as V,type RigidPose} from '../src/engine/eiffelRigid';
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const folder='artifacts/eiffel-face-package-2026-09-08/',meta=read(folder+'model/manifest.json'),measure=read(folder+'package-measurements.json');
const routes=read('artifacts/eiffel-joint-campaign-2026-09-07/campaign-routes.json'),manifest=read('public/models/eiffel-construction-kit/tower-kit.manifest.json');
const geometry=read('artifacts/eiffel-integration-2026-09-07/crane-primitives.json'),old=read('artifacts/eiffel-integration-2026-09-07/guyenet-ne-station.json'),joint=read('artifacts/eiffel-joint-campaign-2026-09-07/joint-support.json');
const bytes=readFileSync(folder+'model/face-package.glb');if(createHash('sha256').update(bytes).digest('hex')!==measure.sourceGLBSHA256)throw Error('Package mass is stale');
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');gltf.scene.updateMatrixWorld(true);
const bound=new Box3().setFromObject(gltf.scene),localBounds={min:bound.min.toArray() as V,max:bound.max.toArray() as V};
const plan=createEiffelProductionPlan(manifest),seated=new Set(routes.loads.map(l=>l.part.id));
const fixed=manifest.parts.filter(p=>p.id!=='lower-ne-02-m015-c000'&&(plan.byPart.get(p.id)!.end<=routes.freeze||seated.has(p.id))).map(p=>({id:p.id,shape:eiffelConvexBox(eiffelSolidBox(p,p.finalPose))}));
for(const b of [...old.proposedStructure,...joint.beams])fixed.push({id:b.id,shape:eiffelConvexBox(eiffelReceiverBeamBox(b.a,b.b,b.halfWidth))});
for(const b of joint.boxes)fixed.push({id:b.id,shape:eiffelConvexBox(eiffelAxisBox(b.center,b.size))});
const qy=(a:number)=>[0,Math.sin(a/2),0,Math.cos(a/2)] as const,qx=(a:number)=>[Math.sin(a/2),0,0,Math.cos(a/2)] as const;
const root:RigidPose={position:routes.station.root,quaternion:qy(-Math.PI/4)},heel=routes.station.heel;
const delta=composeRigidPoses(routes.loads[0].route.pickup,invertRigidPose(routes.loads[0].part.finalPose)),base=transformRigidPoint(delta,meta.sourceOrigin);
const primitives=geometry.primitives.map(p=>({...p,box:p.kind==='beam'?eiffelReceiverBeamBox(p.a,p.b,p.halfWidth):eiffelAxisBox(p.center,p.kind==='box'?p.size:p.axis==='x'?[p.length,p.radius*2,p.radius*2]:[p.radius*2,p.length,p.radius*2])}));
function clashes(shape:ReturnType<typeof eiffelConvexBox>){return fixed.flatMap(s=>{const depth=eiffelConvexPenetration(shape,s.shape);return depth>1e-5?[{fixed:s.id,depth}]:[]});}


const search=read('artifacts/eiffel-face-transfer-2026-09-08/placement-search.json');
const anchors=[];for(const x of [48,48.4,48.8,49.2,49.6,50,50.4,50.8])anchors.push({id:'frame-1-3-15.6-1-piece-0',point:[x,16.22,-44.5]});for(const z of [-47,-46.6,-46.2,-45.8,-45.4,-45])anchors.push({id:'frame-2-3-15.6-1-piece-0',point:[51,16.22,z]});
const reports=[];
for(const c of search.candidates.slice(0,25)){
 const [x,y,z]=c.deck.center,w=c.deck.size[0]/2-.07,d=c.deck.size[2]/2-.07;
 const ends=[[-w,-d],[-w,d],[w,-d],[w,d]].map(([dx,dz])=>[x+dx,y-.14,z+dz] as V);
 const choices=ends.map((b,i)=>anchors.map(anchor=>{
  const a=anchor.point as V,beam={id:'receiver-knee-'+i,a,b,halfWidth:.08};
  const post={center:[a[0],15.97,a[2]] as V,size:[.16,.5,.16] as V};const hits=[...clashes(eiffelConvexBox(eiffelReceiverBeamBox(a,b,.08))),...clashes(eiffelConvexBox(eiffelAxisBox(post.center,post.size)))];
  return {...beam,anchor:anchor.id,length:Math.hypot(...a.map((v,k)=>v-b[k]!)),hits};
 }).filter(b=>b.length<5.8));
 reports.push({...c,choices});
}
writeFileSync('artifacts/eiffel-face-transfer-2026-09-08/support-frame-search.json',JSON.stringify(reports,null,2)+'\n');
for(const [i,r] of reports.entries())console.log(i,r.seat.position,r.choices.map(c=>c.filter(b=>b.hits.length===0).map(b=>b.a)));
