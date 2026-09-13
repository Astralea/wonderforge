import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Quaternion, Vector3 } from 'three';
import type { EiffelKitManifest } from '../src/data/eiffelKitTypes';
import { createEiffelProductionPlan, sampleEiffelProductionOperation } from '../src/engine/eiffelProductionConstruction';
import { auditEiffelStationMap } from '../src/engine/eiffelStationMap';
import { eiffelCinematicShotAt } from '../src/engine/eiffelCamera';
import { allocateEiffelSignatureTiming, selectEiffelSignatures, projectEiffelPayload, EIFFEL_SIGNATURE_WINDOWS } from '../src/engine/eiffelSignatureTiming';
const manifest=JSON.parse(readFileSync('public/models/eiffel-construction-kit/tower-kit.manifest.json','utf8')) as EiffelKitManifest;
const plan=createEiffelProductionPlan(manifest), stations=auditEiffelStationMap(manifest);
const dependencies=new Map(plan.operations.map(op=>{const support=stations.candidates.get(op.part.id);return [op.part.id,support?[support.supportPartId]:[]] as const;}));
const inputs=plan.operations.map(op=>({...op,previewPoses:[.04,.2,.4,.6,.8,.98].map(fraction=>({fraction,pose:sampleEiffelProductionOperation(op,op.start+(op.end-op.start)*fraction).pose}))}));
const choices=selectEiffelSignatures(inputs);
const timing=allocateEiffelSignatureTiming(plan.operations,dependencies,choices);

describe('camera-aware Eiffel signature proposal, isolated from current timing',()=>{
 it('selects four near-facing, bounded payloads with measured route projections',()=>{
   expect(choices).toHaveLength(4);
   for(const choice of choices){const op=plan.byPart.get(choice.partId)!;expect(choice.frontness).toBeGreaterThan(.2);expect(choice.projectionScope).toBe('route-samples');expect(choice.routeSampleCount).toBe(6);expect(choice.desktop.longPixels).toBeGreaterThanOrEqual(12);expect(choice.mobile.longPixels).toBeGreaterThanOrEqual(7);expect(choice.desktop.entirelyInFrame&&choice.mobile.entirelyInFrame).toBe(true);expect(Math.max(...op.part.transportSize)).toBeLessThanOrEqual(6.0001);}
   expect(choices.find(c=>c.id==='first-floor')!.clearance).toBe('sampled-clear');
   expect(selectEiffelSignatures(inputs.slice().reverse()).map(c=>c.partId)).toEqual(choices.map(c=>c.partId));
 });
 it('matches independent Three.js perspective projection at desktop and mobile sizes',()=>{
   for(const choice of choices)for(const [width,height] of [[1440,900],[390,844]]){
     const part=plan.byPart.get(choice.partId)!.part,t=(choice.start+choice.end)/2,shot=eiffelCinematicShotAt(t,width!/height!);
     const camera=new PerspectiveCamera(shot.fov,width!/height!,.1,4000);
     camera.position.set(shot.target[0]+shot.radius*Math.cos(shot.pitch)*Math.cos(shot.azimuth),shot.target[1]+shot.radius*Math.sin(shot.pitch),shot.target[2]+shot.radius*Math.cos(shot.pitch)*Math.sin(shot.azimuth));camera.lookAt(...shot.target);camera.updateMatrixWorld();
     const projected=projectEiffelPayload(part,t,width!,height!);let i=0;
     for(const x of [part.localBounds.min[0],part.localBounds.max[0]])for(const y of [part.localBounds.min[1],part.localBounds.max[1]])for(const z of [part.localBounds.min[2],part.localBounds.max[2]]){
       const p=new Vector3(x,y,z).applyQuaternion(new Quaternion(...part.finalPose.quaternion)).add(new Vector3(...part.finalPose.position)).project(camera);
       expect(projected.points[i]![0]).toBeCloseTo((p.x+1)*width!/2,5);expect(projected.points[i]![1]).toBeCloseTo((1-p.y)*height!/2,5);i++;
     }
   }
 });
 it('allocates four independent2.4s windows without overlaps, dependency violations or changed height milestones',()=>{
   expect(timing.size).toBe(manifest.parts.length);
   const waves=new Map<number,{start:number;end:number;count:number}>();
   for(const [id,value] of timing){const w=waves.get(value.wave)??{start:value.start,end:value.end,count:0};expect(value.start).toBe(w.start);expect(value.end).toBe(w.end);w.count++;waves.set(value.wave,w);expect(value.end).toBeGreaterThan(value.start);for(const dep of dependencies.get(id)??[])expect(timing.get(dep)!.end).toBeLessThanOrEqual(value.start+1e-12);}
   const ordered=[...waves.values()].sort((a,b)=>a.start-b.start);for(let i=0;i<ordered.length;i++){expect(ordered[i]!.count).toBeLessThanOrEqual(4);if(i)expect(ordered[i-1]!.end).toBeLessThanOrEqual(ordered[i]!.start+1e-12);}
   for(const c of choices){const t=timing.get(c.partId)!;expect((t.end-t.start)*60).toBeCloseTo(2.4,9);expect(t.start).toBe(c.start);expect(t.end).toBe(c.end);expect(waves.get(t.wave)!.count).toBe(1);}
   for(const [stage,end] of [[9,.15466666666666667],[23,.3152],[34,.4298666666666666],[54,.6477333333333334],[63,.9]])expect(Math.max(...plan.operations.filter(o=>o.part.stage<=stage!).map(o=>timing.get(o.part.id)!.end))).toBe(end);
   for(let stage=1;stage<=63;stage++){const before=plan.operations.filter(o=>o.part.stage<stage),after=plan.operations.filter(o=>o.part.stage===stage);if(before.length&&after.length)expect(Math.max(...before.map(o=>timing.get(o.part.id)!.end))).toBeLessThanOrEqual(Math.min(...after.map(o=>timing.get(o.part.id)!.start))+1e-12);}
 });
 it('rejects missing dependencies and invalid signature windows instead of silent fallback',()=>{
   expect(()=>allocateEiffelSignatureTiming(plan.operations,new Map([[plan.operations[0]!.part.id,['missing']]]),choices)).toThrow(/dependency/);
   expect(()=>allocateEiffelSignatureTiming(plan.operations,dependencies,choices.map((c,i)=>i?c:{...c,end:c.end+.01}))).toThrow(/reservation/);
   expect(choices.map(c=>[c.start,c.end])).toEqual(EIFFEL_SIGNATURE_WINDOWS.map(w=>[w.start,w.end]));
 });
});
