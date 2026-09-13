import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  BatchedMesh,
  BufferGeometry,
  Float32BufferAttribute,
  Raycaster,
  Box3,
  Color,
  Frustum,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Vector3,
  type Group,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { eiffelCinematicShotAt } from '../src/engine/eiffelCamera';
import { eiffelTerrainHeightAt } from '../src/engine/eiffelTerrain';
import { loadEiffelParisCity } from '../src/render/three/eiffelParis';
import { EIFFEL_TRAFFIC_ACTORS } from '../src/data/eiffelTraffic';
import { eiffelTrafficPoseAt } from '../src/engine/eiffelTraffic';
import { parisBasinWitness } from './helpers/paris-basin-witness';

async function asset(name: string): Promise<Group> {
  const bytes = readFileSync(`public/models/paris-1889/${name}.glb`);
  return (
    await new GLTFLoader().parseAsync(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      '',
    )
  ).scene;
}
function release(group: Group) {
  group.traverse((o) => {
    if (o instanceof Mesh) {
      if (o instanceof BatchedMesh) o.dispose();
      else o.geometry.dispose();
      for (const m of Array.isArray(o.material) ? o.material : [o.material])
        m.dispose();
    }
  });
}
type Polygon = [number,number][];
const pointSegmentDistance=(p:[number,number],a:[number,number],b:[number,number])=>{
  const dx=b[0]-a[0],dz=b[1]-a[1],den=dx*dx+dz*dz,t=den===0?0:Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/den));
  return Math.hypot(p[0]-(a[0]+dx*t),p[1]-(a[1]+dz*t));
};
const pointInPolygon=(point:[number,number],polygon:Polygon)=>{
  let inside=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const a=polygon[i]!,b=polygon[j]!;
    if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
};
const pointNearPolygon=(point:[number,number],polygon:Polygon,padding:number)=>pointInPolygon(point,polygon)||polygon.some((a,i)=>pointSegmentDistance(point,a,polygon[(i+1)%polygon.length]!)<padding);

describe('MCP-authored Paris exports', () => {
  it('places north-bank walkers on exported paving and the new houses on dry land', async () => {
    const city = await asset('paris-city');city.updateMatrixWorld(true);
    const manifest=JSON.parse(readFileSync('public/models/paris-1889/paris.manifest.json','utf8'));
    const paving:number[]=[],wallCorners:Vector3[]=[];
    city.traverse(o=>{
      if(!(o instanceof Mesh))return;
      const role=o.userData.wf_material,pos=o.geometry.attributes.position!,idx=o.geometry.index;
      if(role==='masonry-facade')for(let i=0;i<pos.count;i++){
        const p=new Vector3().fromBufferAttribute(pos,i).applyMatrix4(o.matrixWorld);
        if(p.z< -200&&p.z> -340)wallCorners.push(p);
      }
      if(role!=='paving')return;
      for(let i=0;i<(idx?.count??pos.count);i+=3){
        const tri=[0,1,2].map(k=>new Vector3().fromBufferAttribute(pos,idx?idx.getX(i+k):i+k).applyMatrix4(o.matrixWorld));
        if(Math.min(...tri.map(v=>v.z))<=-385&&Math.max(...tri.map(v=>v.z))>=-388)
          for(const p of tri)paving.push(...p.toArray());
      }
    });
    expect(paving.length).toBeGreaterThan(0);
    const ground=new Mesh(new BufferGeometry().setAttribute('position',new Float32BufferAttribute(paving,3)),new MeshStandardMaterial());
    ground.updateMatrixWorld(true);const ray=new Raycaster(),down=new Vector3(0,-1,0);
    const walkers=EIFFEL_TRAFFIC_ACTORS.filter(a=>a.routeId.startsWith('north-bank-'));
    expect(walkers).toHaveLength(128);
    for(const t of [0,.11,.37,.61,.89,1]){
      // Elapsed clock covers the full 264 s film, not just its original minute.
      const poses=walkers.map(a=>eiffelTrafficPoseAt(a,t*264/60,true));
      for(const pose of poses){
        const [x,y,z]=pose.position;
        for(const dx of [-.22,.22])for(const dz of [-.22,.22]){
          ray.set(new Vector3(x+dx,y+2,z+dz),down);
          const hit=ray.intersectObject(ground)[0];expect(hit,'actual paved sole footprint').toBeDefined();
          expect(Math.abs(hit!.point.y-y)).toBeLessThan(.10);
        }
        for(const parcel of manifest.northBankParcels as {polygon:Polygon}[]){
          expect(pointNearPolygon([x,z],parcel.polygon,.3),'walker versus building polygon').toBe(false);
        }
      }
      for(let i=0;i<poses.length;i++)for(let j=0;j<i;j++)
        expect(Math.hypot(poses[i]!.position[0]-poses[j]!.position[0],poses[i]!.position[2]-poses[j]!.position[2]),'body separation including return lane').toBeGreaterThan(.65);
    }
    expect(manifest.riverfrontBuildings).toHaveLength(24);
    for(const house of manifest.riverfrontBuildings){
      const [x,z]=house.center,[w,d,h]=house.size;
      const corners=[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([dx,dz])=>[x+dx!,z+dz!]);
      const eave=Math.max(...corners.map(([xx,zz])=>eiffelTerrainHeightAt(xx!,zz!)))+.24+h;
      for(const [xx,zz] of corners){
        expect(Math.abs(Math.sin(.08)*xx!+Math.cos(.08)*(zz!+175))).toBeGreaterThan(72);
        expect(wallCorners.some(p=>p.distanceToSquared(new Vector3(xx,eave,zz))<1e-6),'exported riverfront wall corner').toBe(true);
      }
      const [x1,z1,x2,z2]=house.bounds;
      expect(Math.min(x2,195)>Math.max(x1,-195)&&Math.min(z2,-230)>Math.max(z1,-440),'Palais reserve').toBe(false);
      for(const street of manifest.northBankStreets){const b=street.bounds;
        expect(Math.min(x2,b[2])>Math.max(x1,b[0])&&Math.min(z2,b[3])>Math.max(z1,b[1]),'riverfront house versus existing street').toBe(false);
      }
    }
    ground.geometry.dispose();(ground.material as MeshStandardMaterial).dispose();release(city);
  },30000);

  it('exports only city geometry with upward paved surfaces matching the shared terrain', async () => {
    const city = await asset('paris-city');
    city.updateMatrixWorld(true);
    let triangles = 0;
    let pavingVertices = 0;
    const p = new Vector3();
    const n = new Vector3();
    city.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      expect(o.userData.wf_paris).toBe(true);
      triangles +=
        (o.geometry.index?.count ?? o.geometry.getAttribute('position').count) /
        3;
      const role = o.userData.wf_material;
      if (role === 'zinc') {
        const roofNormals = o.geometry.getAttribute('normal');
        for (let i = 0; i < roofNormals.count; i++) {
          n.fromBufferAttribute(roofNormals, i).transformDirection(
            o.matrixWorld,
          );
          expect(n.y).toBeGreaterThan(0); // exposed mansard/top faces point out/up
        }
      }
      if (!['road', 'paving', 'work-earth', 'courtyard-earth'].includes(role)) return;
      const pos = o.geometry.getAttribute('position');
      const normals = o.geometry.getAttribute('normal');
      for (let i = 0; i < pos.count; i++) {
        p.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
        n.fromBufferAttribute(normals, i).transformDirection(o.matrixWorld);
        expect(n.y).toBeGreaterThan(0.94); // near-Champ walks follow sloping terrain
        expect(
          Math.abs(
            p.y -
              eiffelTerrainHeightAt(p.x, p.z) -
              (role === 'road' ? 0.08 : role === 'work-earth' ? 0.025 : role === 'courtyard-earth' ? 0.06 : 0.24),
          ),
        ).toBeLessThan(0.001);
        if (role !== 'work-earth') expect(Math.max(Math.abs(p.x), Math.abs(p.z))).toBeGreaterThanOrEqual(
          85,
        ); // paved promenades stay outside the tower work area
        pavingVertices++;
      }
    });
    const manifest = JSON.parse(
      readFileSync('public/models/paris-1889/paris.manifest.json', 'utf8'),
    );
    expect(triangles).toBe(manifest.cityTriangles);
    expect(triangles).toBeLessThan(240_000); // complete exhibition, work yard and north-bank streets; viewport remains <=300k in browser
    // The photo-led roof variety must exist in the GLB, not just the manifest.
    const roofVertices: Vector3[] = [];
    city.traverse((o) => {
      if (!(o instanceof Mesh) || !['zinc','slate'].includes(o.userData.wf_material)) return;
      const position = o.geometry.attributes.position!;
      for (let i=0; i<position.count; i++) {
        p.fromBufferAttribute(position,i).applyMatrix4(o.matrixWorld);
        if (p.z < -380) roofVertices.push(p.clone());
      }
    });
    for (const parcel of manifest.northBankParcels) for (const wing of parcel.wings) {
      // GLB coordinates are Float32; test a submillimetre geometric tolerance,
      // not rounded string equality at an arbitrary decimal boundary.
      for(const [x,z] of wing.polygon as Polygon)
        expect(roofVertices.some(v => v.distanceToSquared(new Vector3(x,wing.eaveY,z)) < 1e-6), `${parcel.id} exported polygon eave ${x},${z}`).toBe(true);
    }
    // The photo-led central entrance projects beyond the old flat palace face.
    // Read the exported geometry, not just the builder's feature metadata.
    let projectingEntranceVertices = 0;
    city.traverse((o) => {
      if (!(o instanceof Mesh) || o.userData.wf_material !== 'glass') return;
      const pos = o.geometry.getAttribute('position');
      for (let i = 0; i < pos.count; i++) {
        p.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
        if (Math.abs(Math.abs(p.x) - 114.82) < 0.01 &&
            Math.abs(p.z - 212) < 14 && p.y > 10 && p.y < 28)
          projectingEntranceVertices++;
      }
    });
    expect(projectingEntranceVertices).toBeGreaterThan(30);
    expect(city.children.length).toBeGreaterThanOrEqual(12);
    expect(city.children.length).toBeLessThan(30);
    expect(manifest.landmarks.map((p: { id: string }) => p.id)).toEqual(
      expect.arrayContaining([
        'palais-beaux-arts',
        'palais-arts-liberaux',
        'dome-central',
        'galerie-des-machines',
      ]),
    );
    expect(
      new Set(manifest.buildings.map((p: { roof: number }) => p.roof)).size,
    ).toBe(4);
    expect(
      new Set(manifest.buildings.map((p: { size: number[] }) => p.size[2]))
        .size,
    ).toBeGreaterThan(6);
    expect(pavingVertices).toBeGreaterThan(1000);
    const bounds = new Box3().setFromObject(city);
    expect(bounds.max.y).toBeLessThan(80); // catches accidentally exporting the preserved tower scenes
    expect(bounds.min.x).toBeGreaterThan(-950);
    expect(bounds.max.x).toBeLessThan(950);
    release(city);
  });

  it('preserves the city mesh while chunking it for real mobile-frustum culling', async () => {
    const source = await asset('paris-city');
    source.updateMatrixWorld(true);
    const basinWitness = parisBasinWitness(source);
    let sourceTriangles = 0;
    let earthCorners = 0;
    const expectedMin = new Color(Infinity, Infinity, Infinity);
    const expectedMax = new Color(-Infinity, -Infinity, -Infinity);
    source.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      sourceTriangles +=
        (object.geometry.index?.count ??
          object.geometry.attributes.position!.count) / 3;
      if (['work-earth', 'courtyard-earth'].includes(object.userData.wf_material))
        earthCorners += object.geometry.index?.count ?? object.geometry.attributes.position!.count;
      for (const material of Array.isArray(object.material)
        ? object.material
        : [object.material]) {
        if (!(material instanceof MeshStandardMaterial)) continue;
        expectedMin.r = Math.min(expectedMin.r, material.color.r);
        expectedMin.g = Math.min(expectedMin.g, material.color.g);
        expectedMin.b = Math.min(expectedMin.b, material.color.b);
        expectedMax.r = Math.max(expectedMax.r, material.color.r);
        expectedMax.g = Math.max(expectedMax.g, material.color.g);
        expectedMax.b = Math.max(expectedMax.b, material.color.b);
      }
    });
    const city = await loadEiffelParisCity();
    city.updateMatrixWorld(true);
    expect(city.children).toHaveLength(1);
    const batch = city.children[0] as BatchedMesh;
    expect(batch).toBeInstanceOf(BatchedMesh);
    expect(batch.perObjectFrustumCulled).toBe(true);
    const cells = batch.userData.cells as {
      geometryId: number;
      triangles: number;
      min: number[];
      max: number[];
    }[];
    expect(cells.length).toBeGreaterThan(80);
    expect(cells.length, `Actual Paris cells: ${cells.length}`).toBeLessThan(1_600); // bounded sliver merging; still one multi-draw batch
    for (const cell of cells) {
      const bounds = batch.getBoundingBoxAt(cell.geometryId, new Box3())!;
      expect(bounds.min.toArray()).toEqual(cell.min);
      expect(bounds.max.toArray()).toEqual(cell.max);
    }
    let chunkTriangles = 0;
    let packedEarthCorners = 0;
    const actualMin = new Color(Infinity, Infinity, Infinity);
    const actualMax = new Color(-Infinity, -Infinity, -Infinity);
    const sharedMaterials = new Set();
    for (const object of city.children) {
      expect(object).toBeInstanceOf(Mesh);
      const mesh = object as Mesh;
      const positions = mesh.geometry.attributes.position!;
      const normals = mesh.geometry.attributes.normal!;
      const colors = mesh.geometry.attributes.color!;
      const surfaces = mesh.geometry.attributes.parisSurface!;
      expect(normals.count).toBe(positions.count);
      expect(colors.count).toBe(positions.count);
      expect(surfaces.count).toBe(positions.count);
      for (let index = 0; index < surfaces.count; index++)
        if (surfaces.getX(index) === 1) packedEarthCorners++;
      expect(mesh.castShadow).toBe(false);
      expect(mesh.receiveShadow).toBe(true);
      chunkTriangles += positions.count / 3;
      sharedMaterials.add(mesh.material);
      for (let index = 0; index < colors.count; index += 1) {
        actualMin.r = Math.min(actualMin.r, colors.getX(index));
        actualMin.g = Math.min(actualMin.g, colors.getY(index));
        actualMin.b = Math.min(actualMin.b, colors.getZ(index));
        actualMax.r = Math.max(actualMax.r, colors.getX(index));
        actualMax.g = Math.max(actualMax.g, colors.getY(index));
        actualMax.b = Math.max(actualMax.b, colors.getZ(index));
      }
    }
    // Spec25: only the small basin's exact 194 m² paving intersection is cut.
    // Eighteen enclosed triangles are removed; twelve boundary triangles keep
    // their exterior area as eighteen replacements. All other source is retained.
    // Locate the same thirty basin faces from their preserved actual geometry;
    // near-street union changes the preceding triangle offsets and source count.
    expect(city.userData.poolPavingAudit).toEqual([basinWitness]);
    expect(chunkTriangles).toBe(sourceTriangles - 12);
    expect(packedEarthCorners).toBe(earthCorners);
    expect(sharedMaterials.size).toBe(1);
    for (const channel of ['r', 'g', 'b'] as const) {
      expect(actualMin[channel]).toBeCloseTo(expectedMin[channel], 5);
      expect(actualMax[channel]).toBeCloseTo(expectedMax[channel], 5);
    }

    const aspect = 9 / 16;
    for (const t of [0.32, 0.53093, 0.58, 0.69127, 0.78, 0.92, 1]) {
      const shot = eiffelCinematicShotAt(t, aspect);
      const camera = new PerspectiveCamera(shot.fov, aspect, 0.5, 2_400);
      const target = new Vector3(...shot.target);
      const horizontal = Math.cos(shot.pitch) * shot.radius;
      camera.position.set(
        target.x + Math.cos(shot.azimuth) * horizontal,
        target.y + Math.sin(shot.pitch) * shot.radius,
        target.z + Math.sin(shot.azimuth) * horizontal,
      );
      camera.lookAt(target);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
      const frustum = new Frustum().setFromProjectionMatrix(
        new Matrix4().multiplyMatrices(
          camera.projectionMatrix,
          camera.matrixWorldInverse,
        ),
      );
      const visible = cells.filter((cell) =>
        frustum.intersectsBox(
          new Box3(
            new Vector3(...(cell.min as [number, number, number])),
            new Vector3(...(cell.max as [number, number, number])),
          ),
        ),
      );
      expect(visible.length).toBeLessThan(cells.length * .7);
      if (t >= 0.53) {
        const submittedTriangles = visible.reduce(
          (sum, child) => sum + child.triangles,
          0,
        );
        expect(submittedTriangles).toBeLessThan(110_000);
      }
    }
    release(source);
    release(city);
  });

  it('keeps grounded articulated prototypes at real scale and boats straddling the waterline', async () => {
    const life = await asset('paris-life');
    life.updateMatrixWorld(true);
    const names = [
      'pedestrian-man',
      'pedestrian-woman',
      'horse',
      'cart',
      'carriage',
      'steam-boat',
      'barge',
    ];
    expect(life.children).toHaveLength(names.length);
    for (const name of names) {
      const root = life.children.find((o) => o.name.startsWith(name));
      expect(root).toBeDefined();
      expect(root!.position.length()).toBeLessThan(1e-8);
      const box = new Box3().setFromObject(root!);
      if (name === 'barge' || name === 'steam-boat') {
        expect(box.min.y).toBeCloseTo(-0.65, 4);
        expect(box.max.y).toBeGreaterThan(2);
      } else {
        expect(box.min.y).toBeCloseTo(0, 4);
        expect(box.max.y).toBeLessThan(2.5);
      }
      if (name === 'cart' || name === 'carriage') {
        const wheels = root!.children.filter((o) =>
          o.name.startsWith('wheel-'),
        );
        expect(wheels).toHaveLength(4);
        for (const wheel of wheels) {
          expect(wheel.position.y).toBeCloseTo(0.63, 4);
          expect(new Box3().setFromObject(wheel).min.y).toBeCloseTo(0, 4);
        }
      }
    }
    release(life);
  });
});
