import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {PerspectiveCamera,Vector3} from 'three';
import type {EiffelKitManifest} from '../src/data/eiffelKitTypes';
import {eiffelSolidBox} from '../src/engine/eiffelOccupancy';
import {EIFFEL_FILM_DURATION,EIFFEL_FILM_LONG_LOAD_START_SECONDS,eiffelFilmAzimuthAt,eiffelFilmShotAt,sampleEiffelFilm} from '../src/engine/eiffelFilm';
import {EIFFEL_LONG_LOAD_FILM_DURATION,sampleEiffelLongLoadFilm} from '../src/engine/eiffelLongLoadFilm';
import {eiffelLongLoadCameraPointsAt,eiffelLongLoadFilmShotAt} from '../src/engine/eiffelLongLoadCamera';
import {EIFFEL_FIRST_FLOOR_Y as floor} from '../src/engine/eiffelFirstFloorSupply';

const dot=(a:readonly number[],b:readonly number[])=>a[0]!*b[0]!+a[1]!*b[1]!+a[2]!*b[2]!;
const shotAt=(seconds:number,aspect:number)=>eiffelLongLoadFilmShotAt(seconds,aspect,eiffelFilmAzimuthAt((EIFFEL_FILM_LONG_LOAD_START_SECONDS+seconds)/EIFFEL_FILM_DURATION));
const cameraAt=(seconds:number,aspect:number)=>{const shot=shotAt(seconds,aspect),camera=new PerspectiveCamera(shot.fov,aspect,5,2400),horizontal=Math.cos(shot.pitch)*shot.radius;
  camera.position.set(shot.target[0]+Math.cos(shot.azimuth)*horizontal,shot.target[1]+Math.sin(shot.pitch)*shot.radius,shot.target[2]+Math.sin(shot.azimuth)*horizontal);camera.lookAt(new Vector3(...shot.target));camera.updateMatrixWorld(true);return camera;};

describe('main-film actual long-load camera',()=>{
  it('dispatches the complete onward chapter through the work camera in the actual main film',()=>{
    expect(EIFFEL_LONG_LOAD_FILM_DURATION).toBe(280);
    for(const aspect of[1440/900,390/844])for(const seconds of[.001,64,128,140,160,176,190,202,220,242,276,279.99]){
      const t=(EIFFEL_FILM_LONG_LOAD_START_SECONDS+seconds)/EIFFEL_FILM_DURATION,film=sampleEiffelFilm(t);
      expect(film.chapter).toBe('long-load-first-floor');
      expect(eiffelFilmShotAt(t,aspect)).toEqual(eiffelLongLoadFilmShotAt(film.longLoadSeconds,aspect,eiffelFilmAzimuthAt(t)));
    }
  });
  it('fits each work envelope through continuous framing transitions in desktop and portrait',()=>{
    const point=new Vector3();
    for(const[width,height]of[[1440,900],[390,844],[320,844]])for(let seconds=.001;seconds<EIFFEL_LONG_LOAD_FILM_DURATION;seconds+=.5){
      const camera=cameraAt(seconds,width!/height!);let maxX=0,maxY=0,minZ=1;
      for(const p of eiffelLongLoadCameraPointsAt(seconds)){point.set(...p).project(camera);maxX=Math.max(maxX,Math.abs(point.x));maxY=Math.max(maxY,Math.abs(point.y));minZ=Math.min(minZ,point.z);}
      expect(maxX,`horizontal ${seconds},${width}`).toBeLessThan(.93);expect(maxY,`vertical ${seconds},${width}`).toBeLessThan(.93);expect(minZ).toBeGreaterThan(-1);
    }
  });
  it('shows the whole real carrier during ascent, landing, climb, descent and cart travel',()=>{
    for(const[width,height]of[[1440,900],[390,844]])for(const seconds of[.001,6,64,108,120,124,160,188,196,212,242,272,279.999].filter(t=>t<EIFFEL_LONG_LOAD_FILM_DURATION)){
      const camera=cameraAt(seconds,width!/height!),sample=sampleEiffelLongLoadFilm(seconds);
      for(const x of[-.22,.22])for(const y of[0,6.317500305])for(const z of[-.22,.22]){
        const p=new Vector3(sample.carrierOrigin[0]+x,sample.carrierOrigin[1]+y,sample.carrierOrigin[2]+z).project(camera);
        expect(Math.abs(p.x),`carrier X ${seconds},${width}`).toBeLessThan(.93);
        expect(Math.abs(p.y),`carrier Y ${seconds},${width}`).toBeLessThan(.93);
        expect(p.z).toBeGreaterThan(-1);
      }
      const ends=[sample.carrierOrigin[1],sample.carrierOrigin[1]+6.317500305].map(y=>new Vector3(sample.carrierOrigin[0],y,sample.carrierOrigin[2]).project(camera));
      const pixels=Math.hypot((ends[1]!.x-ends[0]!.x)*width!/2,(ends[1]!.y-ends[0]!.y)*height!/2);
      expect(pixels,`actual member/carrier scale ${seconds},${width}`).toBeGreaterThan(width===390?150:250);
    }
  });
  it('gives the fastening and upper-release worker actions a readable projected size',()=>{
    for(const[width,height]of[[1440,900],[390,844]])for(const shot of[
      {seconds:140,x:-21.5,z:-4.54,bottom:floor,height:1.3},
      {seconds:176,x:-22.05,z:-4,bottom:floor+5.82,height:1.75},
    ].filter(shot=>shot.seconds<EIFFEL_LONG_LOAD_FILM_DURATION)){
      const camera=cameraAt(shot.seconds,width!/height!);
      const ends=[shot.bottom,shot.bottom+shot.height].map(y=>new Vector3(shot.x,y,shot.z).project(camera));
      for(const end of ends){expect(Math.abs(end.x)).toBeLessThan(.93);expect(Math.abs(end.y)).toBeLessThan(.93);expect(end.z).toBeGreaterThan(-1);}
      const pixels=Math.hypot((ends[1]!.x-ends[0]!.x)*width!/2,(ends[1]!.y-ends[0]!.y)*height!/2);
      expect(pixels,`worker ${shot.seconds},${width}`).toBeGreaterThan(width===390?110:150);
    }
  });
  it('has no camera-pose or lens jump at framing and mechanical phase boundaries, including reverse seeking',()=>{
    const boundaries=[6,100,104,108,112,120,124,128,132,152,154,158,166,168,171,172,180,182,184,188,196,198,200,206,212,272];
    for(const aspect of[1440/900,390/844])for(const time of boundaries.filter(t=>t<EIFFEL_LONG_LOAD_FILM_DURATION)){
      const a=shotAt(time-1e-5,aspect),b=shotAt(time+1e-5,aspect);
      expect(Math.hypot(...a.target.map((v,k)=>v-b.target[k]!)),`target join ${time}`).toBeLessThan(.001);
      expect(Math.abs(a.fov-b.fov),`lens join ${time}`).toBeLessThan(.001);
      expect(b.azimuth-a.azimuth).toBeGreaterThan(0);
      const expected=shotAt(time,aspect);shotAt(0,aspect);shotAt(EIFFEL_LONG_LOAD_FILM_DURATION,aspect);
      expect(shotAt(time,aspect)).toEqual(expected);
    }
  });
  it('keeps the five-metre near frustum outside every completed-tower solid',()=>{
    const manifest=JSON.parse(readFileSync('public/models/eiffel-construction-kit/tower-kit.manifest.json','utf8'))as EiffelKitManifest,boxes=manifest.parts.map(part=>eiffelSolidBox(part,part.finalPose));
    for(const aspect of[1440/900,390/844])for(let seconds=.001;seconds<EIFFEL_LONG_LOAD_FILM_DURATION;seconds+=.5){const camera=cameraAt(seconds,aspect),position=camera.position.toArray(),nearCorner=5*Math.sqrt(1+Math.tan(camera.fov*Math.PI/360)**2*(1+aspect**2));let minimum=Infinity,closest="";
      for(const [index,box] of boxes.entries()){const delta=position.map((v,i)=>v-box.center[i]!),distance=Math.hypot(...box.axes.map((axis,i)=>Math.max(0,Math.abs(dot(delta,axis))-box.half[i]!)));if(distance<minimum){minimum=distance;closest=manifest.parts[index]!.id;}}
      expect(minimum,`${seconds},${aspect}: ${closest}`).toBeGreaterThan(nearCorner);
    }
  });
});
