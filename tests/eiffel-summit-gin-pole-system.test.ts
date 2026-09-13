import {it,expect} from 'vitest';
import {Mesh,Vector3} from 'three';
import {EiffelSummitGinPoleSystem} from '../src/render/three/EiffelSummitGinPoleSystem';
import {sampleEiffelSummitGinPoleClimb} from '../src/engine/eiffelSummitGinPoleClimb';
it('loads actual candidate hierarchy and preserves fixed guide roots through reverse poses',async()=>{
 const s=new EiffelSummitGinPoleSystem();await s.ready;
 const roles=new Map<string,any>();s.group.traverse(o=>{if(o.userData.wf_role)roles.set(o.userData.wf_role,o);});
 expect([...roles.keys()].filter(k=>k.startsWith('pusher-'))).toHaveLength(18);
 const guide=roles.get('guide-3-fixed'),before=guide.getWorldPosition(new Vector3()).toArray();
 for(const t of[0,14,32,60,70,12,0]){s.update(t);expect(guide.getWorldPosition(new Vector3()).toArray()).toEqual(before);expect(roles.get('moving-pole').position.y).toBeCloseTo(sampleEiffelSummitGinPoleClimb(t).poleBottomY,8);}
 const owned:Mesh[]=[];s.group.traverse(o=>{if(o instanceof Mesh)owned.push(o);});expect(owned.length).toBeGreaterThan(200);s.dispose();expect(s.group.children).toHaveLength(0);s.dispose();
});
it('renders every fixed sampler chord and continuous moving span without reallocating geometry',async()=>{
 const s=new EiffelSummitGinPoleSystem();await s.ready;
 const fixed=s.group.getObjectByName('climbing-rope-fixed')!,moving=s.group.getObjectByName('climbing-rope-span') as Mesh;
 const expected=sampleEiffelSummitGinPoleClimb(0).drive.rope.fixedPoints;
 const segments=fixed.children.filter(o=>o.name.startsWith('climbing-rope-fixed-span-')) as Mesh[];
 expect(segments).toHaveLength(expected.length-1);
 const geometries=new Set(segments.map(m=>m.geometry));expect(geometries.size).toBe(1);expect(geometries.has(moving.geometry)).toBe(true);
 for(let i=0;i<segments.length;i++){
 const segment=segments[i]!;for(const [localY,point]of[[-.5,expected[i]],[.5,expected[i+1]]] as const){const actual=segment.localToWorld(new Vector3(0,localY,0));expect(actual.distanceTo(new Vector3(...point!))).toBeLessThan(1e-9);}
 }
 for(const seconds of[0,14,32,60,70,0]){s.update(seconds);const sample=sampleEiffelSummitGinPoleClimb(seconds);expect(moving.localToWorld(new Vector3(0,-.5,0)).distanceTo(new Vector3(...sample.drive.fairlead))).toBeLessThan(1e-9);expect(moving.localToWorld(new Vector3(0,.5,0)).distanceTo(new Vector3(...sample.drive.movingLug))).toBeLessThan(1e-9);expect(moving.geometry).toBe(segments[0]!.geometry);}
 let disposed=0;moving.geometry.addEventListener('dispose',()=>disposed++);s.dispose();expect(disposed).toBe(1);s.dispose();expect(disposed).toBe(1);
});
