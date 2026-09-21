import {expect,it,vi} from 'vitest';
import {Mesh,PerspectiveCamera,Vector3} from 'three';
import {sampleEiffelFlagWindCurve,EIFFEL_FLAG_WIND_SEGMENTS} from '../src/engine/eiffelHistoricFlag';
import {eiffelFilmEditShotAt} from '../src/engine/eiffelFilmEdit';
import {EiffelHistoricFlagSystem} from '../src/render/three/EiffelHistoricFlagSystem';
import {WorldScene} from '../src/render/three/WorldScene';

it('bends an eight-metre cloth span without stretching its segments or moving its hoist',()=>{
  for(let t=174;t<190;t+=.1){const curve=sampleEiffelFlagWindCurve(t,8);expect(curve[0]).toEqual([0,0,0]);
    for(let i=1;i<curve.length;i++)expect(new Vector3(...curve[i]!).distanceTo(new Vector3(...curve[i-1]!))).toBeCloseTo(8/EIFFEL_FLAG_WIND_SEGMENTS,12);
    expect(curve.at(-1)![0]).toBeGreaterThan(5);
  }
  expect(sampleEiffelFlagWindCurve(181,8)).toEqual(sampleEiffelFlagWindCurve(181,8));
});

it('moves the real cloth visibly in the final desktop and portrait cameras while seams stay joined',async()=>{
 const flag=new EiffelHistoricFlagSystem();await flag.ready;
 try{
  for(const [width,height] of [[1280,720],[390,844]]){
   const s=eiffelFilmEditShotAt('cinematic',1,width!/height!),camera=new PerspectiveCamera(s.fov,width!/height!,5,2400);
   camera.position.set(s.target[0]+Math.cos(s.azimuth)*Math.cos(s.pitch)*s.radius,s.target[1]+Math.sin(s.pitch)*s.radius,s.target[2]+Math.sin(s.azimuth)*Math.cos(s.pitch)*s.radius);camera.lookAt(new Vector3(...s.target));camera.updateMatrixWorld();
   const tracks:Vector3[][]=[];
   for(let t=180;t<=184;t+=.1){flag.update(t,true);flag.group.updateMatrixWorld(true);const points:Vector3[]=[];const seam=new Map<string,Vector3>();
    for(const o of flag.group.children){const m=o as Mesh,p=m.geometry.getAttribute('position'),uv=m.geometry.getAttribute('uv');
     for(let i=0;i<p.count;i++){const v=new Vector3().fromBufferAttribute(p,i);const key=uv.getX(i).toFixed(5)+','+uv.getY(i).toFixed(5);if(seam.has(key))expect(v.distanceTo(seam.get(key)!)).toBeLessThan(1e-5);else seam.set(key,v.clone());
      const projected=v.applyMatrix4(m.matrixWorld).project(camera);points.push(new Vector3(projected.x*width!/2,projected.y*height!/2,0));
     }
    }tracks.push(points);
   }
   let maxMove=0;for(const frame of tracks)for(let i=0;i<frame.length;i++)maxMove=Math.max(maxMove,frame[i]!.distanceTo(tracks[0]![i]!));
   expect(maxMove,`${width}x${height} projected flag motion`).toBeGreaterThan(2);
  }
 }finally{flag.dispose();}
});

it('does not resample construction, camera or lighting during completed decorative frames',()=>{
 const world=Object.create(WorldScene.prototype) as WorldScene;
 const eiffel={updateDecorations:vi.fn(),update:vi.fn()},finishFrame=vi.fn(),updateLightRig=vi.fn(),updateEiffelCamera=vi.fn();
 Object.assign(world,{eiffel,finishFrame,updateLightRig,updateEiffelCamera});
 world.updateEiffelFinale(183.2);
 expect(eiffel.updateDecorations).toHaveBeenCalledWith(183.2,true);expect(finishFrame).toHaveBeenCalledWith(1,true);
 expect(eiffel.update).not.toHaveBeenCalled();expect(updateLightRig).not.toHaveBeenCalled();expect(updateEiffelCamera).not.toHaveBeenCalled();
});
