import {writeFileSync} from 'node:fs';
import {Mesh,InstancedMesh,PerspectiveCamera,Vector3} from 'three';
import {getWonder} from '../../src/data';
import {ColosseumWorld} from '../../src/render/three/ColosseumWorld';
import {createMaterialLibrary} from '../../src/render/three/MaterialLibrary';
import {colosseumCinematicShotAt} from '../../src/engine/colosseumCamera';
import {sampleColosseumSky} from '../../src/data/colosseumSky';
const world=new ColosseumWorld(createMaterialLibrary(getWonder('colosseum')!));
await world.ready;
const light={sun:{azimuth:0,elevation:20,color:'#fff',intensity:1},ambient:{skyColor:'#fff',groundColor:'#fff',intensity:1},sky:'#fff',fog:'#fff',emissive:0};
const results=[];
for(const aspect of [1.6,16/9,390/844,320/844]){
 const camera=new PerspectiveCamera(35,aspect,.1,4000);let peak=0,peakT=0;
 for(let frame=0;frame<=3600;frame++){
  const t=frame/3600,s=colosseumCinematicShotAt(t,aspect),h=Math.cos(s.pitch)*s.radius;
  camera.position.set(s.target[0]+Math.cos(s.azimuth)*h,s.target[1]+Math.sin(s.pitch)*s.radius,s.target[2]+Math.sin(s.azimuth)*h);
  camera.lookAt(new Vector3(...s.target));camera.fov=s.fov;camera.updateProjectionMatrix();
  world.update(t,light,new Vector3(1,1,1),sampleColosseumSky(t),camera);
  let count=0;world.group.traverseVisible(o=>{if(o instanceof Mesh)count+=(o.geometry.index?.count??o.geometry.attributes.position!.count)/3*(o instanceof InstancedMesh?o.count:1)*(o.castShadow?2:1);});
  if(count>peak){peak=count;peakT=t;}
 }
 const row={aspect,samples:3601,peak,peakT,budget:aspect<.72?120000:180000}; results.push(row);console.log(JSON.stringify(row));
}
world.dispose();
writeFileSync('artifacts/colosseum-sun-city-2026-09-20/validation/geometry-sweep.json',JSON.stringify(results,null,2));
if(results.some(r=>r.peak>r.budget)) process.exitCode=1;
