import {readFileSync} from 'node:fs';
import {beforeAll,expect,it} from 'vitest';
import type {EiffelKitManifest} from '../src/data/eiffelKitTypes';
import {eiffelFilmEditShotAt,sampleEiffelFilmEdit} from '../src/engine/eiffelFilmEdit';
import {EIFFEL_LONG_LOAD_FILM_PART_ID} from '../src/engine/eiffelLongLoadFilm';
import {eiffelBoxPenetration,eiffelSolidBox,EiffelOccupancy} from '../src/engine/eiffelOccupancy';
import {createEiffelProductionPlan,sampleEiffelProductionOperation,type EiffelProductionOperation,type EiffelProductionPlan} from '../src/engine/eiffelProductionConstruction';
import {transformRigidPoint,type RigidVec3} from '../src/engine/eiffelRigid';
import {sampleEiffelSecondFloorRelaySequence} from '../src/engine/eiffelSecondFloorRelaySequence';

let plan:EiffelProductionPlan,exterior:EiffelProductionOperation[],posts:EiffelProductionOperation[];
const at=(seconds:number)=>sampleEiffelFilmEdit('cinematic',seconds/180);
beforeAll(()=>{
  const manifest=JSON.parse(readFileSync('public/models/eiffel-construction-kit/tower-kit.manifest.json','utf8')) as EiffelKitManifest;
  plan=createEiffelProductionPlan(manifest,{upperClearance:'skip'});
  // Each authored shaft ring has four exterior faces, eight source members per
  // face. Sources32+ are interior stair rails/flights and cannot prove visible
  // exterior growth. The first member of each face is its full-size corner post.
  exterior=plan.operations.filter(op=>op.part.group==='shaft'&&Number(op.part.id.match(/-m(\d+)-/)?.[1])<32);
  posts=exterior.filter(op=>/-m(000|008|016|024)-/.test(op.part.id));
},60000);
const heightAt=(seconds:number)=>Math.max(...exterior.filter(op=>op.end<=at(seconds).productionT).map(op=>op.part.boundsMax[1]));

it('raises real exterior iron in every three-second passage from58to68percent',()=>{
  for(let start=104.4;start<=119.4;start+=.25){
    const first=at(start),last=at(start+3);
    const newPosts=posts.filter(op=>op.end>first.productionT&&op.end<=last.productionT);
    expect(heightAt(start+3)-heightAt(start),`exterior height ${start}–${start+3}s`).toBeGreaterThan(5.8);
    expect(newPosts.length,`primary corner posts ${start}–${start+3}s`).toBeGreaterThanOrEqual(8);
  }
  expect(heightAt(122.4)-heightAt(104.4)).toBeGreaterThan(70);
  expect(heightAt(124)).toBeLessThan(215);
  expect(heightAt(140)).toBeLessThan(270);
});

it('keeps new front-facing exterior height readable in desktop and mobile overview frames',()=>{
  for(const [width,height] of [[1280,720],[390,844]]){
    const aspect=width!/height!;
    for(let start=104.4;start<=119.4;start+=.25){
      const first=at(start),last=at(start+3),oldHeight=heightAt(start);
      const shot=eiffelFilmEditShotAt('cinematic',(start+3)/180,aspect);
      const ca=Math.cos(shot.azimuth),sa=Math.sin(shot.azimuth),cp=Math.cos(shot.pitch),sp=Math.sin(shot.pitch),tan=Math.tan(shot.fov*Math.PI/360);
      const project=(point:RigidVec3)=>{
        const x=point[0]-shot.target[0],y=point[1]-shot.target[1],z=point[2]-shot.target[2];
        const radial=ca*x+sa*z,depth=shot.radius-cp*radial-sp*y;
        return {x:(-sa*x+ca*z)/(depth*tan*aspect),y:(-sp*radial+cp*y)/(depth*tan),depth};
      };
      let readablePixels=0;
      for(const op of posts){
        if(op.end<=first.productionT||op.end>last.productionT||op.part.boundsMax[1]<=oldHeight)continue;
        const [x,,z]=op.part.center;
        // The upper segment on the camera-facing half is above the previous
        // silhouette, so older tower iron cannot hide this added height.
        if(x*ca+z*sa<=0)continue;
        for(let corner=0;corner<8;corner++){
          const point=transformRigidPoint(op.part.finalPose,[0,1,2].map(axis=>(corner&(1<<axis)?op.part.localBounds.max:op.part.localBounds.min)[axis]!) as unknown as RigidVec3);
          if(point[1]<=oldHeight)continue;
          const top=project(point),previous=project([point[0],oldHeight,point[2]]);
          if(top.depth>5&&Math.abs(top.x)<.9&&Math.abs(top.y)<.9){
            readablePixels=Math.max(readablePixels,(top.y-previous.y)*height!/2);
          }
        }
      }
      // Same end camera for both heights: panning/zooming cannot manufacture
      // the measured growth. Physical renderer/canvas acceptance stays browser QA.
      expect(readablePixels,`${width}×${height} exterior extension ${start}–${start+3}s`).toBeGreaterThan(width!>1000?4:2);
    }
  }
});

it('keeps the supported second-floor payload clear of the continuing shaft construction',()=>{
  const shaft=plan.operations.filter(op=>op.part.group==='shaft');
  const occupancy=new EiffelOccupancy(shaft.map(op=>({part:op.part,end:op.end})));
  const payloadPart=plan.byPart.get(EIFFEL_LONG_LOAD_FILM_PART_ID)!.part;
  for(let step=0;step<=100;step++){
    const seconds=104+step*.2,film=at(seconds);
    const relay=sampleEiffelSecondFloorRelaySequence((film.longLoadSeconds-280)*2);
    const payload=eiffelSolidBox(payloadPart,relay.payloadPose);
    for(const neighbor of occupancy.nearby(payload,film.productionT)){
      expect(eiffelBoxPenetration(payload,neighbor.box),`${seconds}s payload / seated ${neighbor.part.id}`).toBeLessThanOrEqual(1e-5);
    }
    for(const op of shaft){
      if(op.start>film.productionT||op.end<=film.productionT)continue;
      const sample=sampleEiffelProductionOperation(op,film.productionT);
      if(sample.phase==='queued')continue;
      expect(eiffelBoxPenetration(payload,eiffelSolidBox(op.part,sample.pose)),`${seconds}s payload / moving ${op.part.id}`).toBeLessThanOrEqual(1e-5);
    }
  }
},15000);
