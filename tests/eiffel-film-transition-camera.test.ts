import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import type {EiffelKitManifest} from '../src/data/eiffelKitTypes';
import {eiffelSolidBox} from '../src/engine/eiffelOccupancy';
import {EIFFEL_FILM_DURATION,EIFFEL_FILM_INSERTIONS,eiffelFilmShotAt,eiffelFilmAzimuthAt} from '../src/engine/eiffelFilm';
import {eiffelStage63ProductionToSeconds} from '../src/engine/eiffelStage63Pace';

let added=0;
const windows=EIFFEL_FILM_INSERTIONS.flatMap(e=>{
  const start=eiffelStage63ProductionToSeconds(e.productionT)+added;
  added+=e.preparationSeconds+e.duration+e.dismantlingSeconds;
  return [[start,start+e.preparationSeconds],[start+e.preparationSeconds+e.duration,start+e.preparationSeconds+e.duration+e.dismantlingSeconds]];
});
const shot=(s:number,a:number)=>eiffelFilmShotAt(s/EIFFEL_FILM_DURATION,a);
const position=(s:ReturnType<typeof shot>)=>[s.target[0]+Math.cos(s.azimuth)*Math.cos(s.pitch)*s.radius,s.target[1]+Math.sin(s.pitch)*s.radius,s.target[2]+Math.sin(s.azimuth)*Math.cos(s.pitch)*s.radius];
it('preserves the full clock and joins all six visible camera moves continuously and reversibly',()=>{
  expect(EIFFEL_FILM_DURATION).toBeCloseTo(829.4267707038563,8);
  for(const a of[1440/900,390/844])for(const w of windows){
    for(const boundary of w){
      const before=shot(boundary!-1e-6,a),after=shot(boundary!+1e-6,a);
      expect(Math.hypot(...position(before).map((v,i)=>v-position(after)[i]!))).toBeLessThan(.002);
      expect(Math.hypot(...before.target.map((v,i)=>v-after.target[i]!))).toBeLessThan(.002);
      expect(Math.abs(before.fov-after.fov)).toBeLessThan(.001);
    }
    const mid=(w[0]!+w[1]!)/2,expected=shot(mid,a);
    shot(w[1]!,a);shot(w[0]!,a);expect(shot(mid,a)).toEqual(expected);
    expect(expected.azimuth).toBe(eiffelFilmAzimuthAt(mid/EIFFEL_FILM_DURATION));
  }
});
it('keeps the near-frustum outside actual completed tower solids throughout the visible moves',()=>{
  const manifest=JSON.parse(readFileSync('public/models/eiffel-construction-kit/tower-kit.manifest.json','utf8')) as EiffelKitManifest;
  const boxes=manifest.parts.map(p=>eiffelSolidBox(p,p.finalPose));
  for(const a of[1440/900,390/844])for(const w of windows)for(let t=w[0]!;t<=w[1]!;t+=.05){
    const s=shot(t,a),p=position(s),near=5*Math.sqrt(1+Math.tan(s.fov*Math.PI/360)**2*(1+a*a));let min=Infinity,id='';
    boxes.forEach((b,i)=>{const d=p.map((v,j)=>v-b.center[j]!);const distance=Math.hypot(...b.axes.map((axis,j)=>Math.max(0,Math.abs(axis.reduce((sum,v,k)=>sum+v*d[k]!,0))-b.half[j]!)));if(distance<min){min=distance;id=manifest.parts[i]!.id;}});
    expect(min,`${t}s aspect${a} ${id}`).toBeGreaterThan(near);
  }
},15000);
