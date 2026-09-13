import{describe,it,expect}from'vitest';
import{sampleEiffelRelayHandoffSequence as sample,EIFFEL_RELAY_HANDOFF_SEQUENCE_BOUNDARIES as joins,EIFFEL_RELAY_HANDOFF_SEQUENCE_DURATION as duration}from'../src/engine/eiffelRelayHandoffSequence';
import{EIFFEL_RELAY_HANDOFF_START as S}from'../src/engine/eiffelRelayHandoff';
import{sampleEiffelLongLoadOnward}from'../src/engine/eiffelLongLoadOnward';
const rope=[[S.masterOrigin[0],116,S.masterOrigin[2]],[S.masterOrigin[0],S.masterOrigin[1]+.325,S.masterOrigin[2]]]as const;
const at=(t:number)=>sample(t,rope),dist=(a:readonly number[],b:readonly number[])=>Math.hypot(...a.map((v,i)=>v-b[i]!));
describe('same-actor relay handoff candidate',()=>{
 it('starts from the exact old actor and retains the same cart/load/rope identities',()=>{
 const initial=at(0),old=sampleEiffelLongLoadOnward(280);
 expect(initial.worker.feet).toEqual(old.onward.deckRigger.feet);expect(initial.worker.hands).toEqual(old.onward.deckRigger.hands);
 for(const role of initial.worker.roles){const prior=old.onward.roles.find(r=>r.role===role.role)!;expect(dist(role.position!,prior.position!)).toBeLessThan(1e-9);}
 expect(initial.retainedFirstHoistRope).toEqual(old.worldRope);expect(initial.partId).toBe(S.partId);expect(initial.seated).toBe(false);
 });
 it('solves all rigid limbs without stretching, retains one actor, and reverses exactly',()=>{
 const samples=[];for(let t=0;t<=duration;t+=.5){const s=at(t);expect(s.worker.roles).toHaveLength(18);expect(new Set(s.hardwareRoles.map(r=>r.role)).size).toBe(s.hardwareRoles.length);expect(s.carrierPose.position).toEqual(S.carrierOrigin);samples.push(s);}
 for(let i=samples.length-1;i>=0;i--)expect(at(i*.5)).toEqual(samples[i]);
 });
 it('does not jump role positions at authored phase boundaries',()=>{
 for(const t of [...joins.slice(1,-1),...Array.from({length:4},(_,i)=>[4,6,8,14,17].map(d=>122+i*24+d)).flat()]){const a=at(t-1e-7),b=at(t+1e-7);for(const r of a.worker.roles){const p=b.worker.roles.find(s=>s.role===r.role)!;expect(dist(r.position,p.position),`${t}:${r.role}`).toBeLessThan(1e-5);expect(Math.abs(r.quaternion.reduce((v,q,i)=>v+q*p.quaternion[i]!,0))).toBeGreaterThan(1-1e-6);}}
 });
 it('keeps one foot planted on walking legs and stores every original shaft on the actual tray',()=>{
 for(const [a,b]of[[4,32],[80,112],[116,122]]as const)for(let t=a+.1;t<b;t+=.3){const s=at(t);expect(s.worker.feet.some(f=>Math.abs(f[1]-S.cartOrigin[1])<1e-7)).toBe(true);}
 const end=at(duration);expect(end.fastening.released).toBe(true);expect(end.cartAttached).toBe(false);expect(end.carrierSupport).toBe('cart');
 for(let i=0;i<4;i++){const r=end.hardwareRoles.find(r=>r.role===`cart-bolt-${i}`)!;expect(r.position![1]-.12).toBeCloseTo(S.cartOrigin[1]+.31,9);expect(r.position![0]).toBe(-9.25);}
 });
});
