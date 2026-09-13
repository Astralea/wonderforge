import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import jointSupport from '../artifacts/eiffel-joint-campaign-2026-09-07/joint-support.json';
import jointRoutes from '../artifacts/eiffel-joint-campaign-2026-09-07/campaign-routes.json';
import station from '../artifacts/eiffel-integration-2026-09-07/guyenet-ne-station.json';
import {createEiffelProductionPlan} from '../src/engine/eiffelProductionConstruction';
import {eiffelSolidBox, eiffelAxisBox, type EiffelSolidBox} from '../src/engine/eiffelOccupancy';
import {eiffelReceiverBeamBox} from '../src/engine/eiffelUpperClearance';
import {sampleEiffelGroundLiftPilot} from '../src/engine/eiffelGroundLiftPilot';
import {transformRigidPoint, type RigidVec3} from '../src/engine/eiffelRigid';
import {EIFFEL_JOINT_CAMPAIGN_DURATION, EIFFEL_JOINT_CAMPAIGN_CONNECTED_AT, EIFFEL_JOINT_CAMPAIGN_SEAT_TIMES, sampleEiffelJointCampaign} from '../src/engine/eiffelJointCampaign';
import type {EiffelKitManifest} from '../src/data/eiffelKitTypes';
import {BatchedMesh, Box3, InstancedMesh, Matrix4, Mesh, PerspectiveCamera, Vector3} from 'three';
import {EiffelGroundLiftSystem} from '../src/render/three/EiffelGroundLiftSystem';
import {EIFFEL_FILM_DURATION, EIFFEL_FILM_LIFT_START_SECONDS, EIFFEL_FILM_JOINT_START_SECONDS, eiffelFilmShotAt, eiffelJointCampaignShotPointsAt, eiffelJointCampaignFocusPointsAt} from '../src/engine/eiffelFilm';

function cameraAt(seconds: number, aspect: number) {
  const shot = eiffelFilmShotAt((EIFFEL_FILM_LIFT_START_SECONDS + seconds) / EIFFEL_FILM_DURATION, aspect);
  const camera = new PerspectiveCamera(shot.fov, aspect, 5, 2400), horizontal = Math.cos(shot.pitch) * shot.radius;
  camera.position.set(shot.target[0] + Math.cos(shot.azimuth) * horizontal, shot.target[1] + Math.sin(shot.pitch) * shot.radius, shot.target[2] + Math.sin(shot.azimuth) * horizontal);
  camera.lookAt(new Vector3(...shot.target)); camera.updateMatrixWorld(true);
  return camera;
}
const dot = (a: readonly number[], b: readonly number[]) => a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
function rayBlocked(from: readonly number[], to: RigidVec3, boxes: readonly EiffelSolidBox[]) {
  const delta = to.map((v,i) => v-from[i]!);
  return boxes.some(box => {
    let lo=0,hi=.9999;
    const offset=from.map((v,i)=>v-box.center[i]!);
    for(let i=0;i<3;i++) {
      const origin=dot(offset,box.axes[i]!),direction=dot(delta,box.axes[i]!),radius=box.half[i]!;
      if(Math.abs(direction)<1e-12) { if(Math.abs(origin)>radius)return false; }
      else {let a=(-radius-origin)/direction,b=(radius-origin)/direction;if(a>b)[a,b]=[b,a];lo=Math.max(lo,a);hi=Math.min(hi,b);if(lo>hi)return false;}
    }
    return hi>=lo;
  });
}
describe('supported ground delivery camera', () => {
  it('keeps the near-frustum clear of all final tower solids and actual falsework while exposing the moving payload at useful pixel scale', () => {
    const manifest=JSON.parse(readFileSync('public/models/eiffel-construction-kit/tower-kit.manifest.json','utf8')) as EiffelKitManifest;
    const plan=createEiffelProductionPlan(manifest,{upperClearance:'skip'});
    const tower=manifest.parts.map(part=>({box:eiffelSolidBox(part,part.finalPose),end:plan.byPart.get(part.id)!.end}));
    const structure=station.proposedStructure.map(beam=>eiffelReceiverBeamBox([beam.a[0]!,beam.a[1]!,beam.a[2]!],[beam.b[0]!,beam.b[1]!,beam.b[2]!],beam.halfWidth));
    const allBoxes=[...tower.map(part=>part.box),...structure];
    const completed=[...tower.filter(part=>part.end<=station.originalStart).map(part=>part.box),...structure];
    for(const [width,height] of [[1440,900],[390,844]]) {
      const aspect=width!/height!;
      for(let seconds=.001;seconds<55;seconds+=.125) {
        const camera=cameraAt(seconds,aspect),position=camera.position.toArray();
        const nearCorner=5*Math.sqrt(1+Math.tan(camera.fov*Math.PI/360)**2*(1+aspect**2));
        let minimumDistance=Infinity;
        for(const box of allBoxes) {
          const delta=position.map((v,i)=>v-box.center[i]!);
          const distance=Math.hypot(...box.axes.map((axis,i)=>Math.max(0,Math.abs(dot(delta,axis))-box.half[i]!)));
          minimumDistance=Math.min(minimumDistance,distance);
        }
        expect(minimumDistance,`near plane ${seconds},${aspect}`).toBeGreaterThan(nearCorner);
      }
      for(const seconds of [6,10,13,18,23,29,35,41,45]) {
        const camera=cameraAt(seconds,aspect),sample=sampleEiffelGroundLiftPilot(seconds),position=camera.position.toArray();
        let visible=0;
        for(let i=0;i<15;i++)visible+=Number(!rayBlocked(position,transformRigidPoint(sample.payload.pose,[0,.05265,-2.15+i*4.3/14]),completed));
        expect(visible,`payload rays ${seconds},${aspect}`).toBeGreaterThanOrEqual(14);
        const endpoints=[-2.15,2.15].map(z=>new Vector3(...transformRigidPoint(sample.payload.pose,[0,0,z])).project(camera));
        const pixels=Math.hypot((endpoints[1]!.x-endpoints[0]!.x)*width!/2,(endpoints[1]!.y-endpoints[0]!.y)*height!/2);
        expect(pixels,`actual4.3m payload ${seconds},${aspect}`).toBeGreaterThan(width===390?100:175);
      }
    }
  },30000);
  it('establishes and recovers the actual exported supported rig inside the desktop/mobile picture', async () => {
    const system = new EiffelGroundLiftSystem(); await system.ready;
    const local = new Matrix4(), world = new Matrix4(), p = new Vector3(), bounds = new Box3();
    try {
      for (const aspect of [1440/900, 390/844]) for (const seconds of [.001,1,54.999]) {
        const camera = cameraAt(seconds, aspect); system.update(seconds); system.group.updateMatrixWorld(true);
        let maxX=0,maxY=0,minDepth=1;
        system.group.traverse(object => {
          if (!(object instanceof Mesh) || !object.visible) return;
          const count = object instanceof InstancedMesh ? object.count : object instanceof BatchedMesh ? object.instanceCount : 1;
          for (let instance=0;instance<count;instance++) {
            if (object instanceof BatchedMesh && !object.getVisibleAt(instance)) continue;
            if (object instanceof InstancedMesh) {
              object.geometry.computeBoundingBox(); bounds.copy(object.geometry.boundingBox!);
              object.getMatrixAt(instance, local); world.multiplyMatrices(object.matrixWorld, local);
            } else if (object instanceof BatchedMesh) {
              if (!object.getBoundingBoxAt(object.getGeometryIdAt(instance), bounds)) continue;
              object.getMatrixAt(instance, local); world.multiplyMatrices(object.matrixWorld, local);
            } else {
              object.geometry.computeBoundingBox(); bounds.copy(object.geometry.boundingBox!);
              world.copy(object.matrixWorld);
            }
            for (const x of [bounds.min.x,bounds.max.x]) for (const y of [bounds.min.y,bounds.max.y]) for (const z of [bounds.min.z,bounds.max.z]) {
              p.set(x,y,z).applyMatrix4(world).project(camera); maxX=Math.max(maxX,Math.abs(p.x));maxY=Math.max(maxY,Math.abs(p.y));minDepth=Math.min(minDepth,p.z);
            }
          }
        });
        expect(maxX, `${seconds},${aspect}:horizontal`).toBeLessThan(.98);
        expect(maxY, `${seconds},${aspect}:vertical`).toBeLessThan(.91);
        expect(minDepth).toBeGreaterThan(-1);
      }
    } finally { system.dispose(); }
  },30000);
  it('moves continuously through haul, rigging, hoist, turn and seat boundaries', () => {
    for (const seconds of [1.5,6,10,14,26,32,40,46,49,54.5]) for (const aspect of [1440/900,390/844]) {
      const before=cameraAt(seconds-1e-5,aspect),after=cameraAt(seconds+1e-5,aspect);
      expect(before.position.distanceTo(after.position), `position ${seconds}`).toBeLessThan(.001);
      expect(before.quaternion.angleTo(after.quaternion), `orientation ${seconds}`).toBeLessThan(.0001);
    }
  });
});


describe('two-load supported joint campaign camera',()=>{
  function jointCamera(seconds:number,aspect:number) {
    const shot=eiffelFilmShotAt((EIFFEL_FILM_JOINT_START_SECONDS+seconds)/EIFFEL_FILM_DURATION,aspect),camera=new PerspectiveCamera(shot.fov,aspect,5,2400),horizontal=Math.cos(shot.pitch)*shot.radius;
    camera.position.set(shot.target[0]+Math.cos(shot.azimuth)*horizontal,shot.target[1]+Math.sin(shot.pitch)*shot.radius,shot.target[2]+Math.sin(shot.azimuth)*horizontal);
    camera.lookAt(new Vector3(...shot.target));camera.updateMatrixWorld(true);return camera;
  }
  it('frames both real stocks and support during establishes/transfers, each working load, and the supported fastening worker',()=>{
    const point=new Vector3();
    for(const aspect of [1440/900,390/844])for(let seconds=.001;seconds<EIFFEL_JOINT_CAMPAIGN_DURATION;seconds+=.25) {
      const camera=jointCamera(seconds,aspect),wide=seconds<1.5||(seconds>=54.5&&seconds<66.5)||seconds>=EIFFEL_JOINT_CAMPAIGN_DURATION-.5;
      let maxX=0,maxY=0,minZ=1;
      for(const p of wide?eiffelJointCampaignShotPointsAt(seconds):eiffelJointCampaignFocusPointsAt(seconds)) {
        point.set(...p).project(camera);maxX=Math.max(maxX,Math.abs(point.x));maxY=Math.max(maxY,Math.abs(point.y));minZ=Math.min(minZ,point.z);
      }
      expect(maxX,`horizontal ${seconds},${aspect}`).toBeLessThan(.98);
      expect(maxY,`vertical ${seconds},${aspect}`).toBeLessThan(.92);
      expect(minZ,`near ${seconds},${aspect}`).toBeGreaterThan(-1);
    }
  });
  it('never snaps camera position or attitude on stock handoff, individual seats, fastening or recovery',()=>{
    for(const aspect of [1440/900,390/844])for(const seconds of [1.5,6,46,49,54.5,55,65,66.5,71,78,82,EIFFEL_JOINT_CAMPAIGN_SEAT_TIMES[1],EIFFEL_JOINT_CAMPAIGN_SEAT_TIMES[1]+3,EIFFEL_JOINT_CAMPAIGN_CONNECTED_AT,EIFFEL_JOINT_CAMPAIGN_CONNECTED_AT+3,EIFFEL_JOINT_CAMPAIGN_DURATION-.5]) {
      const before=jointCamera(seconds-1e-5,aspect),after=jointCamera(seconds+1e-5,aspect);
      expect(before.position.distanceTo(after.position),`position ${seconds},${aspect}`).toBeLessThan(.001);
      expect(before.quaternion.angleTo(after.quaternion),`attitude ${seconds},${aspect}`).toBeLessThan(.0001);
    }
  });
  it('gives each physical load and the fastening worker useful desktop/mobile projected size',()=>{
    for(const [width,height] of [[1440,900],[390,844]]) {
      const aspect=width!/height!;
      for(const seconds of [10,18,35,45,78,90,104,113]) {
        const camera=jointCamera(seconds,aspect),sample=sampleEiffelJointCampaign(seconds),bounds=jointRoutes.loads[sample.activeLoadIndex]!.part.localBounds;
        const endpoints=[bounds.min[2]!,bounds.max[2]!].map(z=>new Vector3(...transformRigidPoint(sample.payload.pose,[0,0,z])).project(camera));
        const pixels=Math.hypot((endpoints[1]!.x-endpoints[0]!.x)*width!/2,(endpoints[1]!.y-endpoints[0]!.y)*height!/2);
        expect(pixels,`load ${seconds},${aspect}`).toBeGreaterThan(width===390?110:200);
      }
      const camera=jointCamera(EIFFEL_JOINT_CAMPAIGN_SEAT_TIMES[1]+4,aspect),worker=jointSupport.workerPlatform.recommendedWorker;
      const head=new Vector3(...worker.head.center as [number,number,number]).project(camera),foot=new Vector3(...worker.feet[0]!.center as [number,number,number]).project(camera);
      const pixels=Math.hypot((head.x-foot.x)*width!/2,(head.y-foot.y)*height!/2);
      expect(pixels,`worker ${aspect}`).toBeGreaterThan(width===390?80:130);
    }
  });
  it('keeps the5m near-frustum outside every final tower solid during both close follows and fastening',()=>{
    const manifest=JSON.parse(readFileSync('public/models/eiffel-construction-kit/tower-kit.manifest.json','utf8')) as EiffelKitManifest;
    const boxes=[...manifest.parts.map(part=>eiffelSolidBox(part,part.finalPose)),
      ...[...station.proposedStructure,...jointSupport.beams].map(beam=>eiffelReceiverBeamBox([beam.a[0]!,beam.a[1]!,beam.a[2]!],[beam.b[0]!,beam.b[1]!,beam.b[2]!],beam.halfWidth)),
      ...jointSupport.boxes.map(box=>eiffelAxisBox([box.center[0]!,box.center[1]!,box.center[2]!],[box.size[0]!,box.size[1]!,box.size[2]!]))];
    for(const aspect of [1440/900,390/844])for(let seconds=.001;seconds<EIFFEL_JOINT_CAMPAIGN_DURATION;seconds+=.25) {
      const camera=jointCamera(seconds,aspect),position=camera.position.toArray();
      const nearCorner=5*Math.sqrt(1+Math.tan(camera.fov*Math.PI/360)**2*(1+aspect**2));
      let minimum=Infinity;
      for(const box of boxes) {
        // Bounding sphere first; exact OBB distance only for potential contacts.
        const delta=position.map((value,index)=>value-box.center[index]!);
        if(Math.hypot(...delta)-Math.hypot(...box.half)>nearCorner)continue;
        minimum=Math.min(minimum,Math.hypot(...box.axes.map((axis,index)=>Math.max(0,Math.abs(dot(delta,axis))-box.half[index]!))));
      }
      expect(minimum,`foreground geometry ${seconds},${aspect}`).toBeGreaterThan(nearCorner);
    }
  },30000);
});
