import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BatchedMesh, Box3, InstancedMesh, Matrix4, Mesh, Object3D, Vector3 } from 'three';
import { EiffelLongLoadFilmSystem, EIFFEL_LONG_LOAD_FILM_ASSETS } from '../src/render/three/EiffelLongLoadFilmSystem';
import { sampleEiffelLongLoadFilm } from '../src/engine/eiffelLongLoadFilm';
import onwardDesign from '../artifacts/eiffel-long-load-onward-2026-09-08/design.json';

const systems: EiffelLongLoadFilmSystem[] = [];
const create = (mobile = false) => { const system = new EiffelLongLoadFilmSystem(mobile); systems.push(system); return system; };
afterEach(() => { for (const system of systems.splice(0)) system.dispose(); vi.restoreAllMocks(); });
function role(system:EiffelLongLoadFilmSystem,name:string):Object3D {
  let result:Object3D|undefined;system.group.traverse(object=>{if(object.userData.wf_role===name)result=object;});
  if(!result)throw Error(`Missing role ${name}`);return result;
}

describe('Production long-load Blender renderer', () => {
  it('copies the four accepted assets byte-for-byte and batches all source triangles without a second tower', async () => {
    const originals = [
      'artifacts/eiffel-long-load-main-2026-09-08/model/receiver-driven.glb',
      'artifacts/eiffel-long-load-onward-2026-09-08/model/bridge.glb',
      'artifacts/eiffel-cart-fastening-recovered-2026-09-08/model/long-load-carrier-corrected.glb',
      'artifacts/eiffel-long-load-onward-2026-09-08/model/closed-sling.glb',
    ];
    const digest=(file:string)=>createHash('sha256').update(readFileSync(file)).digest('hex');
    Object.values(EIFFEL_LONG_LOAD_FILM_ASSETS).forEach((url,i)=>expect(digest(`public${url}`)).toBe(digest(originals[i]!)));
    const system=create();await system.ready;
    let triangles=0,meshes=0,payloads=0,batches=0;
    system.group.traverse(object=>{
      for(let ancestor:Object3D|null=object;ancestor;ancestor=ancestor.parent)if(ancestor.name==='eiffel-long-load-onward')return;
      if(object instanceof BatchedMesh){batches++;expect(object.frustumCulled).toBe(false);expect(object.perObjectFrustumCulled).toBe(true);return;}
      if(!(object instanceof Mesh)||object instanceof InstancedMesh)return;
      meshes++;triangles+=(object.geometry.index?.count??object.geometry.attributes.position!.count)/3;
      expect(object.visible).toBe(false);
      expect(object.userData.longLoadBatch).toBeDefined();
      if(object.userData.wf_role==='actual-payload')payloads++;
      expect(object.userData.wf_part).toBeUndefined(); // No tower-kit copy in these equipment assets.
    });
    expect(payloads).toBe(1);expect(meshes).toBe(system.group.userData.sourceMeshCount);
    expect(triangles).toBe(system.group.userData.sourceTriangles);
    expect(batches).toBe(system.group.userData.batchCount);expect(batches).toBeLessThanOrEqual(12);
  });

  it('renders actual rigid cargo and rope endpoints through forward/reverse seeks, with the bridge hatch open', async () => {
    const system=create();system.update(60);await system.ready;
    expect(system.group.userData.seconds).toBe(60);
    const payload=role(system,'actual-payload') as Mesh;
    const hatch=role(system,'freight-hatch');
    expect(hatch.rotation.x).toBe(Math.PI/2);
    const rope=system.group.getObjectByName('long-load-hoist-rope') as InstancedMesh;
    for(const seconds of[0,6,60,112,120,124,128,60,0]){
      system.update(seconds);const sample=sampleEiffelLongLoadFilm(seconds);
      const bounds=new Box3().setFromObject(payload),size=bounds.getSize(new Vector3());
      expect(size.x).toBeCloseTo(.15,5);expect(size.y).toBeCloseTo(5.992500305175781,5);expect(size.z).toBeCloseTo(.15,5);
      expect(bounds.min.y).toBeCloseTo(sample.carrierOrigin[1]+.08,5);
      expect(bounds.getCenter(new Vector3()).x).toBeCloseTo(sample.carrierOrigin[0],5);
      const metadata=payload.userData.longLoadBatch;
      const batch=system.group.getObjectByName(`long-load-export-batch-${metadata.batch}`) as BatchedMesh;
      const rendered=batch.getMatrixAt(metadata.instance,new Matrix4()).premultiply(batch.matrixWorld);
      expect(Math.max(...rendered.elements.map((value,i)=>Math.abs(value-payload.matrixWorld.elements[i]!)))).toBeLessThan(1e-5);
      expect(rope.count).toBe(sample.worldRope.length-1);
      for(let i=0;i<rope.count;i++){
        const matrix=new Matrix4();rope.getMatrixAt(i,matrix);
        const a=new Vector3(0,-.5,0).applyMatrix4(matrix),b=new Vector3(0,.5,0).applyMatrix4(matrix);
        expect(a.distanceTo(new Vector3(...sample.worldRope[i]!))).toBeLessThan(1e-5);
        expect(b.distanceTo(new Vector3(...sample.worldRope[i+1]!))).toBeLessThan(1e-5);
      }
      expect(system.group.userData.hookReleased).toBe(false);
    }
  });


  it('keeps one real payload and cart through release, hatch closure, full crossing and reverse', async () => {
    const system=create();await system.ready;
    const payload=role(system,'actual-payload'),cart=role(system,'stock-cart'),hatch=role(system,'freight-hatch');
    const identities=[payload.uuid,cart.uuid];
    for(const seconds of[128,154,168,176,180,198,202,206,212,242,272,280,202,128,60,0]){
      system.update(seconds);const sample=sampleEiffelLongLoadFilm(seconds);
      expect([role(system,'actual-payload').uuid,role(system,'stock-cart').uuid]).toEqual(identities);
      expect(payload.scale.toArray()).toEqual([1,1,1]);
      const addon=system.group.getObjectByName('eiffel-long-load-onward')!;
      for(const prefix of onwardDesign.workers.prefixes)for(const part of onwardDesign.workers.parts){
        const actual=addon.userData.rolePoses.find((p:{role:string})=>p.role===`${prefix}-${part.id}`);
        expect(actual).toBeDefined();expect(actual.worldPosition[1]).toBeGreaterThan(onwardDesign.floorY-.2);
      }
      if('cart' in sample.onward){
        expect(cart.getWorldPosition(new Vector3()).toArray()).toEqual([...sample.onward.cart.position]);
        expect(hatch.rotation.x).toBeCloseTo(sample.onward.hatchAngle,10);
        expect(system.group.userData.hookReleased).toBe(sample.onward.hookReleased);
        for(const pose of sample.onward.roles.filter(p=>p.role!=='freight-hatch')){
          const actual=addon.userData.rolePoses.find((p:{role:string})=>p.role===pose.role);
          expect(actual).toBeDefined();
          if(pose.position)actual.position.forEach((v:number,i:number)=>expect(v).toBeCloseTo(pose.position![i]!,10));
          if(pose.quaternion)actual.quaternion.forEach((v:number,i:number)=>expect(v).toBeCloseTo(pose.quaternion![i]!,10));
        }
      }
    }
  });

  it('selects mobile-only exports while preserving every role, rigid pose and source identity', async () => {
    const desktop=create(),mobile=create(true);await Promise.all([desktop.ready,mobile.ready]);
    expect(desktop.assets.sling).toBe(EIFFEL_LONG_LOAD_FILM_ASSETS.sling);
    expect(desktop.assets.bridge).toBe(EIFFEL_LONG_LOAD_FILM_ASSETS.bridge);
    expect(mobile.assets.bridge).toBe('/models/eiffel-long-load-first-floor/bridge-mobile.glb');
    expect(mobile.assets.sling).toBe('/models/eiffel-long-load-first-floor/closed-sling-mobile.glb');
    expect(mobile.diagnostics.profile).toBe('mobile');expect(desktop.diagnostics.profile).toBe('desktop');
    const addon=(s:EiffelLongLoadFilmSystem)=>s.group.getObjectByName('eiffel-long-load-onward')!;
    expect(addon(mobile).userData.assetUrl).toBe('/models/eiffel-long-load-first-floor/onward-mobile.glb');
    expect(mobile.group.userData.sourceTriangles+addon(mobile).userData.sourceTriangles).toBeLessThan(desktop.group.userData.sourceTriangles+addon(desktop).userData.sourceTriangles);
    const gather=(s:EiffelLongLoadFilmSystem)=>{const roles=new Map<string,Object3D[]>();s.group.traverse(o=>{if(typeof o.userData.wf_role==='string'){const list=roles.get(o.userData.wf_role)??[];list.push(o);roles.set(o.userData.wf_role,list);}});return roles;};
    const d=gather(desktop),m=gather(mobile);expect([...m.keys()].sort()).toEqual([...d.keys()].sort());
    for(const [key,nodes]of d)expect(m.get(key)).toHaveLength(nodes.length);
    for(const seconds of[0,60,128,176,202,242,280,128,0]){
      desktop.update(seconds);mobile.update(seconds);
      for(const [key,nodes]of d)nodes.forEach((node,index)=>{
        const other=m.get(key)![index]!;node.matrixWorld.elements.forEach((v,i)=>expect(other.matrixWorld.elements[i]).toBeCloseTo(v,5));
        expect(other.scale.toArray()).toEqual(node.scale.toArray());
      });
    }
    const batches:BatchedMesh[]=[];mobile.group.traverse(o=>{if(o instanceof BatchedMesh)batches.push(o);});const disposal=batches.map(b=>vi.spyOn(b,'dispose'));
    mobile.dispose();mobile.dispose();disposal.forEach(spy=>expect(spy).toHaveBeenCalledOnce());expect(mobile.group.children).toHaveLength(0);
  });

  it('does not attach late-loaded equipment after disposal and releases loaded batch resources exactly once', async () => {
    const early=create();early.dispose();await early.ready;expect(early.group.children).toHaveLength(0);
    const system=create();await system.ready;
    const batches:BatchedMesh[]=[];system.group.traverse(o=>{if(o instanceof BatchedMesh)batches.push(o);});
    const spies=batches.map(batch=>vi.spyOn(batch,'dispose'));
    system.dispose();system.dispose();
    for(const spy of spies)expect(spy).toHaveBeenCalledTimes(1);
    expect(system.group.children).toHaveLength(0);
  });
});
