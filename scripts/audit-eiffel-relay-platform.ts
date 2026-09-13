import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import type {EiffelKitManifest} from '../src/data/eiffelKitTypes';
import {eiffelConvexBox,eiffelConvexPenetration,eiffelConvexSolid,type EiffelConvexSolid} from '../src/engine/eiffelConvex';
import {eiffelSolidBox} from '../src/engine/eiffelOccupancy';
import type {RigidVec3 as V} from '../src/engine/eiffelRigid';

const folder='artifacts/eiffel-relay-platform-2026-09-08/';
type Prism={id:string;role:string;owner:string|null;vertices:V[]};
type Design={floorY:number;stage:number;attachments:{partId:string;faceCenter:V;localNormal:V;collarHeight:number}[];centralOpening:[number,number,number,number];stairExclusion:[number,number,number,number];productionReady:boolean;limits:string[]};
const manifest=JSON.parse(readFileSync('public/models/eiffel-construction-kit/tower-kit.manifest.json','utf8')) as EiffelKitManifest;
const prisms=JSON.parse(readFileSync(folder+'platform-occupancy.json','utf8')) as Prism[];
const design=JSON.parse(readFileSync(folder+'platform-design.json','utf8')) as Design;
const faces=[[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]] as const;
const platform=prisms.map(prism=>({prism,solid:eiffelConvexSolid(prism.vertices,faces)}));
const kit=manifest.parts.filter(part=>part.stage<=design.stage).map(part=>({part,solid:eiffelConvexBox(eiffelSolidBox({...part,shape:'box'},part.finalPose))}));
const overlaps=(a:EiffelConvexSolid,b:EiffelConvexSolid)=>!a.min.some((v,k)=>v>b.max[k]!||a.max[k]!<b.min[k]!);
const collisions:{platformId:string;role:string;owner:string|null;partId:string;partStage:number;sourceMember:string;penetration:number;ownerCollision:boolean}[]=[];
for(const item of platform)for(const target of kit){if(!overlaps(item.solid,target.solid))continue;const penetration=eiffelConvexPenetration(item.solid,target.solid);if(penetration>1e-5)collisions.push({platformId:item.prism.id,role:item.prism.role,owner:item.prism.owner,partId:target.part.id,partStage:target.part.stage,sourceMember:target.part.sourceMember,penetration,ownerCollision:item.prism.owner===target.part.id});}
collisions.sort((a,b)=>a.platformId.localeCompare(b.platformId)||b.penetration-a.penetration||a.partId.localeCompare(b.partId));
const openingBox=(bounds:[number,number,number,number],minY:number,maxY:number)=>eiffelConvexBox({center:[(bounds[0]+bounds[1])/2,(minY+maxY)/2,(bounds[2]+bounds[3])/2],half:[(bounds[1]-bounds[0])/2,(maxY-minY)/2,(bounds[3]-bounds[2])/2],axes:[[1,0,0],[0,1,0],[0,0,1]]});
const opening=openingBox(design.centralOpening,design.floorY-.5,design.floorY+.15);
const openingIntrusions=platform.flatMap(item=>{if(!overlaps(item.solid,opening))return[];const penetration=eiffelConvexPenetration(item.solid,opening);return penetration>1e-5?[{platformId:item.prism.id,role:item.prism.role,penetration}]:[];});
const attachmentChecks=design.attachments.map(attachment=>{const collars=platform.filter(item=>item.prism.role==='collar'&&item.prism.owner===attachment.partId);const containing=collars.filter(item=>attachment.faceCenter.every((v,k)=>v>=item.solid.min[k]!-1e-7&&v<=item.solid.max[k]!+1e-7)).map(item=>item.prism.id);const ownerHits=collisions.filter(c=>c.ownerCollision&&c.owner===attachment.partId).map(c=>({platformId:c.platformId,penetration:c.penetration}));return{...attachment,collarCount:collars.length,faceCenterInCollarAabb:containing,ownerHits};});
const roleCounts=Object.fromEntries([...new Set(prisms.map(p=>p.role))].sort().map(role=>[role,prisms.filter(p=>p.role===role).length]));
const collisionPartCounts=Object.fromEntries([...new Set(collisions.map(c=>c.partId))].sort().map(id=>[id,collisions.filter(c=>c.partId===id).length]));
const summary={productionReady:false,envelopeOnly:true,stage:design.stage,platformPrisms:prisms.length,kitPartsTested:kit.length,roleCounts,collisionCount:collisions.length,collidingPlatformPrisms:new Set(collisions.map(c=>c.platformId)).size,collidingKitParts:new Set(collisions.map(c=>c.partId)).size,ownerCollisionCount:collisions.filter(c=>c.ownerCollision).length,collisionPartCounts,centralOpeningIntrusions:openingIntrusions.length,geometryClear:collisions.length===0&&openingIntrusions.length===0,limits:['Exact convex SAT covers authored platform prisms against conservative rigid local-bound boxes for every kit part through stage 45.','Attachment face-center containment is an AABB diagnostic only; it does not establish clamp capacity, beam endpoint bearing, or construction sequence.']};
mkdirSync(folder,{recursive:true});writeFileSync(folder+'platform-audit.json',JSON.stringify({summary,attachmentChecks,openingIntrusions,collisions},null,2)+'\n');console.log(JSON.stringify(summary,null,2));
