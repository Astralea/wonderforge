import { afterEach, describe, expect, it, vi } from 'vitest';
import { Box3, BufferGeometry, DoubleSide, Group, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Raycaster, Vector3 } from 'three';
import { COLOSSEUM_HOUSING, colosseumHousingById } from '../src/data/colosseumHousing';
import { getWonder } from '../src/data';
import { COLOSSEUM_ROME_LOTS, colosseumRomeLotsOf, createColosseumRomeLots, romeHousingFoundation } from '../src/engine/colosseumRomeLots';
import { createCaelianStreetFronts } from '../src/engine/colosseumUrbanContext';
import { colosseumTerrainHeightAt } from '../src/engine/colosseumTerrain';
import { ColosseumEnvironment } from '../src/render/three/ColosseumEnvironment';
import { createMaterialLibrary } from '../src/render/three/MaterialLibrary';
import * as Rome from '../src/render/three/colosseumRome';

afterEach(() => vi.restoreAllMocks());
const triangles = (geometry: BufferGeometry) => (geometry.index?.count ?? geometry.getAttribute('position').count) / 3;
const disposeKit = (kit: Awaited<ReturnType<typeof Rome.loadColosseumHousingKit>>) => {
  for (const root of Object.values(kit)) root.traverse(object => {
    if (!(object instanceof Mesh)) return;
    object.geometry.dispose();
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose();
  });
};

describe('Original Roman housing and connected street fabric', () => {
  it('uses four visibly different height/court profiles in named streets at a restrained scale', () => {
    expect(createColosseumRomeLots()).toEqual(COLOSSEUM_ROME_LOTS);
    const houses = colosseumRomeLotsOf('insula');
    for (const profile of COLOSSEUM_HOUSING) expect(houses.filter(lot => lot.housing === profile.id).length).toBeGreaterThan(20);
    for (const lane of ['velia-palatine-lane', 'velia-north-lane']) {
      expect(houses.filter(lot => lot.district === lane).length).toBeGreaterThan(5);
    }
    for (const lot of houses) {
      expect(lot.district).toBeTruthy();
      const height = Math.max(...colosseumHousingById(lot.housing).wings.map(wing => wing.height + wing.roof)) * lot.scale;
      expect(height).toBeLessThan(19);
      if (lot.district !== 'caelian-watercourse') expect(lot.scale).toBeLessThanOrEqual(1.36);
    }
    // The accepted waterworks' fronts keep their exact position, orientation and scale.
    expect(houses.filter(lot => lot.district === 'caelian-watercourse').map(({housing: _housing, ...lot}) => lot)).toEqual(createCaelianStreetFronts());
  });

  it('delivers real distinct Blender silhouettes with the same usable footprint as the fallback', async () => {
    const kit = await Rome.loadColosseumHousingKit();
    const heights: number[] = [];
    const material = new MeshStandardMaterial({ side: DoubleSide });
    for (const profile of COLOSSEUM_HOUSING) {
      const body = Rome.flattenRomeRoles(kit[profile.id], ['brick','plaster','stone','void'])!;
      const roof = Rome.flattenRomeRole(kit[profile.id], 'tile')!;
      const fallbackBody = Rome.createProceduralHousing(profile.id, 'body');
      const fallbackRoof = Rome.createProceduralHousing(profile.id, 'roof');
      for (const [delivered, fallback] of [[body,fallbackBody],[roof,fallbackRoof]]) {
        delivered!.computeBoundingBox(); fallback!.computeBoundingBox();
        expect(delivered!.boundingBox!.min.distanceTo(fallback!.boundingBox!.min)).toBeLessThan(.0001);
        expect(delivered!.boundingBox!.max.distanceTo(fallback!.boundingBox!.max)).toBeLessThan(.0001);
      }
      expect(triangles(body)+triangles(roof)).toBeLessThan(110);
      expect(Math.max(Math.abs(body.boundingBox!.min.x),Math.abs(body.boundingBox!.max.x))).toBeLessThan(5.5);
      expect(Math.max(Math.abs(body.boundingBox!.min.z),Math.abs(body.boundingBox!.max.z))).toBeLessThan(4.6);
      heights.push(roof.boundingBox!.max.y);
      // Roof faces must actually face the upper hemisphere in both delivery paths.
      for (const geometry of [roof, fallbackRoof]) {
        const normal = geometry.getAttribute('normal');
        for (let i=0; i<normal.count; i++) expect(normal.getY(i)).toBeGreaterThan(0);
      }
      if (profile.id === 'courtyard') {
        const group = new Group(); group.add(new Mesh(body,material),new Mesh(roof,material)); group.updateMatrixWorld(true);
        const hits = new Raycaster(new Vector3(0,30,0),new Vector3(0,-1,0)).intersectObject(group,true);
        expect(hits[0]!.point.y).toBeCloseTo(.24, 4); // Open sky through the court, not a concealed solid box.
      }
      body.dispose(); roof.dispose(); fallbackBody.dispose(); fallbackRoof.dispose();
    }
    expect(Math.max(...heights)-Math.min(...heights)).toBeGreaterThan(6);
    expect(new Set(heights.map(height => Math.round(height*10))).size).toBe(4);
    material.dispose(); disposeKit(kit);
  });

  it('has nonintersecting rotated residential foundations, checked independently from placement rejection', () => {
    const lots = colosseumRomeLotsOf('insula');
    const polygons = lots.map(lot => {
      const matrix = Rome.lotMatrix(lot.x,0,lot.z,lot.yaw,lot.scale);
      return [[-5.5,-4.6],[5.5,-4.6],[5.5,4.6],[-5.5,4.6]].map(([x,z]) => new Vector3(x!,0,z!).applyMatrix4(matrix));
    });
    for (let i=0; i<lots.length; i++) for (let j=i+1; j<lots.length; j++) {
      if (Math.hypot(lots[i]!.x-lots[j]!.x,lots[i]!.z-lots[j]!.z)>25) continue;
      const a=polygons[i]!, b=polygons[j]!;
      const axes=[a[1]!.clone().sub(a[0]!),a[2]!.clone().sub(a[1]!),b[1]!.clone().sub(b[0]!),b[2]!.clone().sub(b[1]!)];
      const separates = axes.some(edge => {
        const axis=new Vector3(-edge.z,0,edge.x).normalize();
        const pa=a.map(p=>p.dot(axis)), pb=b.map(p=>p.dot(axis));
        return Math.max(...pa)<Math.min(...pb) || Math.max(...pb)<Math.min(...pa);
      });
      expect(separates,`${i}/${j} residential footprint`).toBe(true);
    }
  });

  it('grounds the actual delivered instances on level supports above sampled hill terrain', async () => {
    const environment=new ColosseumEnvironment(createMaterialLibrary(getWonder('colosseum')!));
    await environment.ready;
    const bodies=environment.group.children.filter((object): object is InstancedMesh => object instanceof InstancedMesh && !!object.userData.housingVariant && !object.name.endsWith('-roofs'));
    const instances: Array<{matrix:Matrix4;box:Box3;id:string}> = [];
    for (const mesh of bodies) {
      mesh.geometry.computeBoundingBox();
      for(let i=0;i<mesh.count;i++) { const matrix=new Matrix4();mesh.getMatrixAt(i,matrix);instances.push({matrix,box:mesh.geometry.boundingBox!.clone().applyMatrix4(matrix),id:mesh.userData.housingVariant as string}); }
    }
    expect(instances).toHaveLength(colosseumRomeLotsOf('insula').length);
    for(const lot of colosseumRomeLotsOf('insula')) {
      const instance=instances.find(item=>Math.abs(item.matrix.elements[12]!-lot.x)<.001 && Math.abs(item.matrix.elements[14]!-lot.z)<.001)!;
      expect(instance.id).toBe(lot.housing);
      expect(instance.box.min.y).toBeCloseTo(romeHousingFoundation(lot).top,4);
      // A denser independent footprint grid catches a terrain hump between corners.
      for(const u of [-1,-.5,0,.5,1]) for(const v of [-1,-.5,0,.5,1]) {
        const p=new Vector3(u*5.1,0,v*4.1).applyMatrix4(instance.matrix);
        expect(colosseumTerrainHeightAt(p.x,p.z)).toBeLessThanOrEqual(instance.box.min.y+.02);
      }
    }
    const floor=environment.group.getObjectByName('colosseum-valley-floor') as Mesh;
    expect((floor.material as MeshStandardMaterial).color.getHexString()).toBe('ffffff');
    environment.dispose();
  });

  it('retains all four bounded silhouettes when the additional asset cannot load', async () => {
    vi.spyOn(Rome,'loadColosseumHousingKit').mockRejectedValueOnce(new Error('offline fixture'));
    const environment=new ColosseumEnvironment(createMaterialLibrary(getWonder('colosseum')!));
    await environment.ready;
    const bodies=environment.group.children.filter((object):object is InstancedMesh=>object instanceof InstancedMesh && !!object.userData.housingVariant && !object.name.endsWith('-roofs'));
    expect(bodies).toHaveLength(4);
    expect(bodies.reduce((sum,mesh)=>sum+mesh.count,0)).toBe(colosseumRomeLotsOf('insula').length);
    for(const mesh of bodies) expect(triangles(mesh.geometry)).toBeLessThan(100);
    environment.dispose();
  });

  it('disposes every late-delivered housing geometry after leaving before readiness', async () => {
    const kit=await Rome.loadColosseumHousingKit();
    const counts=new Map<BufferGeometry,number>();
    for(const root of Object.values(kit)) root.traverse(object=>{
      if(!(object instanceof Mesh))return;
      counts.set(object.geometry,0);object.geometry.addEventListener('dispose',()=>counts.set(object.geometry,(counts.get(object.geometry)??0)+1));
    });
    let deliver!:(value:typeof kit)=>void;
    vi.spyOn(Rome,'loadColosseumHousingKit').mockReturnValueOnce(new Promise(resolve=>{deliver=resolve;}));
    const environment=new ColosseumEnvironment(createMaterialLibrary(getWonder('colosseum')!));
    environment.dispose();deliver(kit);await environment.ready;
    expect(counts.size).toBeGreaterThan(40);
    for(const count of counts.values()) expect(count).toBe(1);
  });
});
