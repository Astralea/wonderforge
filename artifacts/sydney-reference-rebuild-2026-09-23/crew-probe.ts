import {Vector3,PerspectiveCamera} from 'three';
import {sydneyCinematicShotAt,SYDNEY_YARD_SHOT} from '../../src/engine/sydneyCamera';
import {sydneyLabourAt} from '../../src/engine/sydneyCrew';
import {activeSydneyOperationsAt} from '../../src/engine/sydneyConstruction';
import {SYDNEY_CONSTRUCTION as plan} from '../../src/data/sydneyConstruction';
const t=(SYDNEY_YARD_SHOT.closeFrom+SYDNEY_YARD_SHOT.closeUntil)/2;
for(const [w,h] of [[1440,900],[390,844]]){
const s=sydneyCinematicShotAt(t,w/h),c=new PerspectiveCamera(s.fov,w/h,20,12000);c.position.set(s.target[0]+Math.cos(s.azimuth)*Math.cos(s.pitch)*s.radius,s.target[1]+Math.sin(s.pitch)*s.radius,s.target[2]+Math.sin(s.azimuth)*Math.cos(s.pitch)*s.radius);c.lookAt(...s.target);c.updateMatrixWorld();
const crews=sydneyLabourAt(activeSydneyOperationsAt(plan,t),t).crews.map(p=>{const f=new Vector3(...p.position).project(c),hd=new Vector3(p.position[0],p.position[1]+1.88,p.position[2]).project(c);return {id:p.id,pixels:Math.abs(hd.y-f.y)*h/2,inFrame:Math.abs(f.x)<.94&&Math.abs(f.y)<.94&&f.z<1};});console.log(JSON.stringify({w,h,t,shot:s,visible:crews.filter(p=>p.inFrame&&p.pixels>=9),near:crews.filter(p=>p.inFrame&&p.pixels>=7&&p.pixels<9)},null,2));}
