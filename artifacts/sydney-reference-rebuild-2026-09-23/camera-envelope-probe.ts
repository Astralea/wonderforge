import { PerspectiveCamera, Vector3 } from 'three';
import { SYDNEY_CONSTRUCTION } from '../../src/data/sydneyConstruction';
import { sydneyPartStateAt } from '../../src/engine/sydneyConstruction';
import { sydneyCinematicShotAt } from '../../src/engine/sydneyCamera';
for (const aspect of [1440/900,390/844]) {
 let max={value:0,t:0,axis:'',phase:'',shot:{}}; let maxstep=0;
 const hero=SYDNEY_CONSTRUCTION.parts.find(p=>p.id==='rib-3--1-4-4')!;
 let last:Vector3|undefined;
 for(let i=0;i<=3600;i++){
 const t=i/3600,s=sydneyCinematicShotAt(t,aspect),c=new PerspectiveCamera(s.fov,aspect,20,12000);
 c.position.set(s.target[0]+Math.cos(s.azimuth)*Math.cos(s.pitch)*s.radius,s.target[1]+Math.sin(s.pitch)*s.radius,s.target[2]+Math.sin(s.azimuth)*Math.cos(s.pitch)*s.radius);c.lookAt(...s.target);c.updateMatrixWorld();if(last)maxstep=Math.max(maxstep,last.distanceTo(c.position));last=c.position.clone();
 if(t<hero.start||t>hero.start+hero.duration)continue;
 const st=sydneyPartStateAt(hero,SYDNEY_CONSTRUCTION.routes[0]!,t);
 for(const x of[-.5,.5])for(const y of[-.5,.5])for(const z of[-.5,.5]){
 const p=new Vector3(st.position[0]+x*hero.dimensions[0],st.position[1]+y*hero.dimensions[1],st.position[2]+z*hero.dimensions[2]).project(c);
 for(const a of['x','y']as const)if(Math.abs(p[a])>max.value)max={value:Math.abs(p[a]),t,axis:a,phase:st.phase,shot:s};
 }
 }
 console.log(JSON.stringify({aspect,heroStart:hero.start,heroDuration:hero.duration,max,maxstep}));
}
