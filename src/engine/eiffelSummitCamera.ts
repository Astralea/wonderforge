import envelope from '../data/eiffelSummitWorkEnvelope.json';
import type { EiffelCameraShot } from './eiffelCamera';
const ease=(v:number)=>{const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t);};
export const EIFFEL_SUMMIT_WORK_CORNERS=([-1,1] as const).flatMap(x=>([-1,1] as const).flatMap(y=>([-1,1] as const).map(z=>[x<0?envelope.minimum[0]!:envelope.maximum[0]!,y<0?envelope.minimum[1]!:envelope.maximum[1]!,z<0?envelope.minimum[2]!:envelope.maximum[2]!] as const)));
export const EIFFEL_SUMMIT_CONTEXT_CORNERS=([-1,1] as const).flatMap(x=>([-1,1] as const).flatMap(z=>[220,318].map(y=>[x*18,y,z*18] as const)));
/** Keep final apparatus within the upper tower and Paris composition. */
export function eiffelSummitWorkShotAt(seconds:number,start:number,end:number,wide:EiffelCameraShot,aspect=16/9):EiffelCameraShot{
 if(seconds<=start||seconds>=end+4)return wide;
 // Use the upper shaft and summit platform as context throughout the work.
 const weight=ease((seconds-start)/4)*(1-ease((seconds-end)/4));
 const center=[0,270,0];
 const target=wide.target.map((v,i)=>v+(center[i]!-v)*weight) as [number,number,number];
 const pitch=wide.pitch+(10*Math.PI/180-wide.pitch)*weight;
 const azimuth=wide.azimuth,ca=Math.cos(azimuth),sa=Math.sin(azimuth),cp=Math.cos(pitch),sp=Math.sin(pitch),ty=Math.tan(wide.fov*Math.PI/360),tx=ty*(Number.isFinite(aspect)&&aspect>0?aspect:16/9);
 let closeRadius=210;
 for(const p of [...EIFFEL_SUMMIT_WORK_CORNERS,...EIFFEL_SUMMIT_CONTEXT_CORNERS]){const dx=p[0]-center[0]!,dy=p[1]-center[1]!,dz=p[2]-center[2]!,radial=ca*dx+sa*dz,depth=cp*radial+sp*dy;closeRadius=Math.max(closeRadius,depth+Math.abs(-sa*dx+ca*dz)/(tx*.84),depth+Math.abs(-sp*radial+cp*dy)/(ty*.78));}
 return{...wide,target,pitch,radius:wide.radius+(closeRadius-wide.radius)*weight};
}
