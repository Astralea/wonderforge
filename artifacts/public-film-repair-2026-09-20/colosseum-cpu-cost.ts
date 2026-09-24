// Geometry inventory only: counts all shadow casters, before the light frustum.
// It is not a GPU frame-time or actual submitted-triangle measurement.
import { PerspectiveCamera, Vector3, Mesh, InstancedMesh } from 'three';
import { ColosseumWorld } from '../../src/render/three/ColosseumWorld';
import { createMaterialLibrary } from '../../src/render/three/MaterialLibrary';
import { getWonder } from '../../src/data';
import { sampleColosseumSky } from '../../src/data/colosseumSky';
import { colosseumCinematicShotAt } from '../../src/engine/colosseumCamera';
const world = new ColosseumWorld(createMaterialLibrary(getWonder('colosseum')!));
await world.ready;
const light = { sun: {azimuth:0,elevation:20,color:'#fff',intensity:1}, ambient:{skyColor:'#fff',groundColor:'#fff',intensity:1}, sky:'#fff', fog:'#fff', emissive:0 };
const denseSweep = process.argv.includes("--sweep-60fps");
const sweep = denseSweep || process.argv.includes("--sweep");
const samples = denseSweep ? 3600 : 100;
const summaries: Array<{aspect:number;t:number;totalUpperBound:number}> = [];
for (const aspect of [1.6, 390/844]) for (const t of sweep ? Array.from({length:samples+1}, (_, i) => i/samples) : process.argv.includes("--peaks") ? [.61,.62,.65,.81,.83,.84] : [.32, .58, .86, 1]) {
  const camera = new PerspectiveCamera(35, aspect, .1, 4000), shot = colosseumCinematicShotAt(t, aspect);
  const horizontal = Math.cos(shot.pitch)*shot.radius;
  camera.position.set(shot.target[0]+Math.cos(shot.azimuth)*horizontal,shot.target[1]+Math.sin(shot.pitch)*shot.radius,shot.target[2]+Math.sin(shot.azimuth)*horizontal);
  camera.lookAt(new Vector3(...shot.target)); camera.fov=shot.fov; camera.updateProjectionMatrix();
  world.update(t,light,new Vector3(1,1,1),sampleColosseumSky(t),camera);
  let main=0, shadow=0;
  const details: Array<{name:string;main:number;shadow:number;instances:number}> = [];
  world.group.traverseVisible(object => {
    if (!(object instanceof Mesh)) return;
    const triangles=(object.geometry.index?.count ?? object.geometry.attributes.position!.count)/3*(object instanceof InstancedMesh ? object.count : 1);
    main+=triangles;
    details.push({name:object.name || `${object.geometry.type}#${object.id}`,main:triangles,shadow:object.castShadow?triangles:0,instances:object instanceof InstancedMesh?object.count:1});
    if(object.castShadow) shadow+=triangles;
  });
  summaries.push({aspect,t,totalUpperBound:main+shadow});
  if (!sweep) console.log(JSON.stringify({aspect,t,main,shadowUpperBound:shadow,totalUpperBound:main+shadow,...(process.argv.includes("--details") ? {details:details.sort((a,b)=>(b.main+b.shadow)-(a.main+a.shadow)).slice(0,12)} : {})}));
}
if (sweep) for (const aspect of [1.6,390/844]) console.log(JSON.stringify(summaries.filter(frame=>frame.aspect===aspect).sort((a,b)=>b.totalUpperBound-a.totalUpperBound).slice(0,3)));
world.dispose();
