import type { EiffelKitManifest } from '../data/eiffelKitTypes';
import { rotateRigidVector, type RigidPose, type RigidQuat, type RigidVec3 } from './eiffelRigid';

export const EIFFEL_SUMMIT_STOCK_FREEZE = 0.7035504929004187;
export const EIFFEL_SUMMIT_STOCK_GAP = 0.08;
export const EIFFEL_SUMMIT_STOCK_SHELF_TOPS = [280.95, 283.3] as const;
export const EIFFEL_SUMMIT_STOCK_FLOOR = 280.59;

export interface EiffelSummitRackFoot { readonly id:string; readonly position:RigidVec3; readonly size:readonly[0.18,0.18]; readonly support:'summit-terrace-floor'; }
export interface EiffelSummitRack { readonly id:string; readonly center:readonly[number,number]; readonly length:number; readonly depth:1.8; readonly axis:'x'|'z'; readonly floorY:280.59; readonly yaw:number; readonly usableLength:number; readonly usableDepth:1.64; readonly shelfTops:readonly[number,number]; readonly feet:readonly EiffelSummitRackFoot[]; }
export interface EiffelSummitStockPlacement { readonly partId:string; readonly stage:number; readonly rackId:string; readonly binIndex:number; readonly shelfIndex:0|1; readonly bin:{readonly x:number;readonly z:number;readonly width:number;readonly depth:number}; readonly pose:RigidPose; readonly envelopeOnly:true; }
export interface EiffelSummitStockPlan { readonly productionReady:false; readonly envelopeOnly:true; readonly freeze:number; readonly gap:number; readonly racks:readonly EiffelSummitRack[]; readonly placements:readonly EiffelSummitStockPlacement[]; readonly limits:readonly string[]; }

type Rect={x:number;z:number;width:number;depth:number};
type Bin={rack:EiffelSummitRack;shelfIndex:0|1;free:Rect[];used:Rect[];index:number};
const contained=(a:Rect,b:Rect)=>a.x>=b.x&&a.z>=b.z&&a.x+a.width<=b.x+b.width&&a.z+a.depth<=b.z+b.depth;
const intersects=(a:Rect,b:Rect)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.z<b.z+b.depth&&a.z+a.depth>b.z;
function split(free:Rect,used:Rect,gap:number):Rect[]{
 if(!intersects(free,used))return[free];
 const x0=used.x-gap,x1=used.x+used.width+gap,z0=used.z-gap,z1=used.z+used.depth+gap,result:Rect[]=[];
 if(x0>free.x)result.push({x:free.x,z:free.z,width:x0-free.x,depth:free.depth});
 if(x1<free.x+free.width)result.push({x:x1,z:free.z,width:free.x+free.width-x1,depth:free.depth});
 if(z0>free.z)result.push({x:free.x,z:free.z,width:free.width,depth:z0-free.z});
 if(z1<free.z+free.depth)result.push({x:free.x,z:z1,width:free.width,depth:free.z+free.depth-z1});
 return result.filter(r=>r.width>1e-9&&r.depth>1e-9);
}
function prune(rectangles:Rect[]):Rect[]{return rectangles.filter((r,i)=>!rectangles.some((other,j)=>i!==j&&contained(r,other)));}
const rackSpecs=[
 [-3.1,-6.7,5.8,Math.PI/2],[3.1,-6.7,5.8,Math.PI/2],[-3.1,6.7,5.8,Math.PI/2],[3.1,6.7,5.8,Math.PI/2],
 [-6.7,-2.75,5,0],[-6.7,2.75,5,0],[6.7,-2.75,5,0],[6.7,2.75,5,0],
] as const;
export function eiffelSummitStockRacks():readonly EiffelSummitRack[]{return rackSpecs.map(([x,z,length,yaw],index)=>{
 const q:RigidQuat=[0,Math.sin(yaw/2),0,Math.cos(yaw/2)],feet:EiffelSummitRackFoot[]=[];
 for(const sx of [-1,1])for(const sz of [-1,1]){const p=rotateRigidVector(q,[sx*.9,0,sz*length/2]);feet.push({id:`summit-stock-rack-${index}-foot-${feet.length}`,position:[x+p[0],EIFFEL_SUMMIT_STOCK_FLOOR,z+p[2]],size:[.18,.18],support:'summit-terrace-floor'});}
 return{id:`summit-stock-rack-${index}`,center:[x,z],length,depth:1.8,axis:yaw?'x':'z',floorY:EIFFEL_SUMMIT_STOCK_FLOOR,yaw,usableLength:length-.2,usableDepth:1.64,shelfTops:EIFFEL_SUMMIT_STOCK_SHELF_TOPS,feet};});}

/** Deterministic MaxRects envelope packing; curved cargo still requires fitted cradles. */
export function planEiffelSummitStock(manifest:EiffelKitManifest):EiffelSummitStockPlan{
 const racks=eiffelSummitStockRacks(),bins:Bin[]=[];for(const shelfIndex of [0,1] as const)for(const rack of racks)bins.push({rack,shelfIndex,index:bins.length,free:[{x:0,z:0,width:rack.usableLength,depth:rack.usableDepth}],used:[]});
 const parts=manifest.parts.filter(part=>part.stage>=61&&part.stage<=63).slice().sort((a,b)=>Math.max(b.transportSize[2],b.transportSize[0])-Math.max(a.transportSize[2],a.transportSize[0])||b.transportSize[2]-a.transportSize[2]||b.transportSize[0]-a.transportSize[0]||a.id.localeCompare(b.id));
 const placements:EiffelSummitStockPlacement[]=[];
 for(const part of parts){const width=part.transportSize[2],depth=part.transportSize[0];let best:{bin:Bin;free:Rect;short:number;long:number}|null=null;
  for(const bin of bins)for(const free of bin.free)if(width<=free.width+1e-9&&depth<=free.depth+1e-9){const proposed={x:free.x,z:free.z,width,depth};if(bin.used.some(old=>proposed.x<old.x+old.width+EIFFEL_SUMMIT_STOCK_GAP-1e-9&&proposed.x+proposed.width+EIFFEL_SUMMIT_STOCK_GAP>old.x+1e-9&&proposed.z<old.z+old.depth+EIFFEL_SUMMIT_STOCK_GAP-1e-9&&proposed.z+proposed.depth+EIFFEL_SUMMIT_STOCK_GAP>old.z+1e-9))continue;const dw=free.width-width,dd=free.depth-depth,c={bin,free,short:Math.min(dw,dd),long:Math.max(dw,dd)};if(!best||c.short<best.short-1e-12||Math.abs(c.short-best.short)<1e-12&&(c.long<best.long-1e-12||Math.abs(c.long-best.long)<1e-12&&(bin.index<best.bin.index||bin.index===best.bin.index&&(free.z<best.free.z||free.z===best.free.z&&free.x<best.free.x))))best=c;}
  if(!best)throw new Error(`Summit stock packing failed for ${part.id}`);
  const used={x:best.free.x,z:best.free.z,width,depth};best.bin.used.push(used);best.bin.free=prune(best.bin.free.flatMap(f=>split(f,used,EIFFEL_SUMMIT_STOCK_GAP)));
  const rack=best.bin.rack,yaw=rack.yaw,q:RigidQuat=[0,Math.sin(yaw/2),0,Math.cos(yaw/2)],localCenter:RigidVec3=[(part.localBounds.min[0]+part.localBounds.max[0])/2,0,(part.localBounds.min[2]+part.localBounds.max[2])/2],rotatedCenter=rotateRigidVector(q,localCenter);
  const localRack:RigidVec3=[used.z+depth/2-rack.usableDepth/2,0,used.x+width/2-rack.usableLength/2],world=rotateRigidVector(q,localRack),shelfTop=rack.shelfTops[best.bin.shelfIndex];
  placements.push({partId:part.id,stage:part.stage,rackId:rack.id,binIndex:best.bin.index,shelfIndex:best.bin.shelfIndex,bin:used,pose:{position:[rack.center[0]+world[0]-rotatedCenter[0],shelfTop-part.localBounds.min[1],rack.center[1]+world[2]-rotatedCenter[2]],quaternion:q},envelopeOnly:true});
 }
 return{productionReady:false,envelopeOnly:true,freeze:EIFFEL_SUMMIT_STOCK_FREEZE,gap:EIFFEL_SUMMIT_STOCK_GAP,racks,placements,limits:['Envelope packing only; curved parts require fitted cradles.','Rack strength, access, lifting routes and final-tower clearance require separate validation.']};
}
