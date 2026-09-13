import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import layout from '../src/data/eiffelSiteLayout.json';
import { eiffelTerrainHeightAt } from '../src/engine/eiffelTerrain';

type Rect = [number, number, number, number];
type Point = [number, number];
type Polygon = Point[];
const overlaps = (a: number[], b: number[]) =>
  a[0]! < b[2]! - .01 && a[2]! > b[0]! + .01 &&
  a[1]! < b[3]! - .01 && a[3]! > b[1]! + .01;
const rectPolygon = ([x1,z1,x2,z2]: readonly number[]): Polygon => [[x1!,z1!],[x2!,z1!],[x2!,z2!],[x1!,z2!]];
const polygonArea = (polygon: Polygon) => Math.abs(polygon.reduce((sum,a,index)=>{const b=polygon[(index+1)%polygon.length]!;return sum+a[0]*b[1]-b[0]*a[1];},0))/2;
/** Convex polygons have exclusive occupied area only when every separating-axis
 * projection overlaps by more than epsilon. Shared kerbs/bearings may touch. */
const polygonOverlaps = (a: Polygon,b: Polygon,epsilon=.01) => {
  for(const polygon of [a,b]) for(let i=0;i<polygon.length;i++){
    const p=polygon[i]!,q=polygon[(i+1)%polygon.length]!,axis:[number,number]=[q[1]-p[1],p[0]-q[0]];
    const length=Math.hypot(...axis);axis[0]/=length;axis[1]/=length;
    const project=(shape:Polygon)=>shape.map(v=>v[0]*axis[0]+v[1]*axis[1]);
    const ap=project(a),bp=project(b),depth=Math.min(Math.max(...ap),Math.max(...bp))-Math.max(Math.min(...ap),Math.min(...bp));
    if(depth<=epsilon)return false;
  }
  return true;
};
const edgeWidths = (polygon: Polygon) => polygon.map((p,index)=>Math.hypot(polygon[(index+1)%polygon.length]![0]-p[0],polygon[(index+1)%polygon.length]![1]-p[1]));
const polygonBounds = (polygon:Polygon):Rect => [Math.min(...polygon.map(p=>p[0])),Math.min(...polygon.map(p=>p[1])),Math.max(...polygon.map(p=>p[0])),Math.max(...polygon.map(p=>p[1]))];
const convexContains = (polygon:Polygon,point:Point,epsilon=.01) => {
  const crosses=polygon.map((a,i)=>{const b=polygon[(i+1)%polygon.length]!;return (b[0]-a[0])*(point[1]-a[1])-(b[1]-a[1])*(point[0]-a[0]);});
  return crosses.every(v=>v>=-epsilon)||crosses.every(v=>v<=epsilon);
};

describe('Paris work yard and north-bank circulation', () => {
  it('keeps authored street surfaces outside all exported parcels and the Palais', () => {
    const manifest = JSON.parse(readFileSync('public/models/paris-1889/paris.manifest.json', 'utf8'));
    const parcels = manifest.northBankParcels as { bounds: Rect; polygon:Polygon; courtyardPolygon:Polygon; typology:string; wings:{polygon:Polygon;eaveY:number;ridgeY:number;supportY:number;baseY:number;roof:number}[]}[];
    const streets = manifest.northBankStreets as { bounds: Rect; polygon:Polygon; kind:string; material:string }[];
    const surfaces = manifest.northBankSurfacePieces as {material:string;polygon:Polygon}[];
    expect(parcels.length).toBeGreaterThan(0);
    const ensembles = parcels;
    expect(ensembles.some(p=>p.polygon.length!==4)).toBe(true);
    expect(ensembles.some(p=>p.courtyardPolygon.length>=3)).toBe(true);
    expect(ensembles.filter(p=>p.courtyardPolygon.length>=3).length).toBeGreaterThan(ensembles.length/2);
    expect(ensembles.reduce((sum,p)=>sum+p.wings.length,0)).toBeGreaterThan(ensembles.length*3);
    expect(new Set(ensembles.flatMap(p=>p.wings.map(w=>Math.round(Math.sqrt(polygonArea(w.polygon))*10)/10))).size).toBeGreaterThan(12);
    for (const ensemble of ensembles) {
      expect(ensemble.polygon.length).toBeGreaterThanOrEqual(3);
      expect(polygonArea(ensemble.polygon)).toBeGreaterThan(0);
      let courtyardWings=0;
      for (let wingIndex=0;wingIndex<ensemble.wings.length;wingIndex++) {
        const wing=ensemble.wings[wingIndex]!;
        expect(wing.polygon.length).toBeGreaterThanOrEqual(3);
        expect(wing.ridgeY).toBeGreaterThan(wing.eaveY + 2);
        expect(wing.eaveY).toBeGreaterThan(wing.supportY);
        expect(wing.supportY).toBeGreaterThan(wing.baseY);
        for(const point of wing.polygon)expect(convexContains(ensemble.polygon,point),`${ensemble.typology} wing corner inside parcel`).toBe(true);
        if(ensemble.courtyardPolygon.length>=3&&polygonOverlaps(wing.polygon,ensemble.courtyardPolygon))courtyardWings++;
        for(const other of ensemble.wings.slice(wingIndex+1))expect(polygonOverlaps(wing.polygon,other.polygon),`${ensemble.typology} wings occupy exclusive interiors`).toBe(false);
        for(let edge=0;edge<wing.polygon.length;edge++){
          const a=wing.polygon[edge]!,b=wing.polygon[(edge+1)%wing.polygon.length]!;
          for(const t of[0,.25,.5,.75,1]){
            const x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t,terrain=eiffelTerrainHeightAt(x,z);
            expect(wing.baseY,`${ensemble.typology} plinth base below terrain ${x},${z}`).toBeLessThanOrEqual(terrain+1e-6);
            expect(wing.supportY,`${ensemble.typology} floor above terrain ${x},${z}`).toBeGreaterThanOrEqual(terrain-1e-6);
          }
        }
      }
      if(ensemble.courtyardPolygon.length>=3)
        expect(courtyardWings,`${ensemble.typology} has only its authored rear workshop in the court`).toBe(ensemble.typology==='rear-workshop-court'?1:0);
    }
    expect(streets.length).toBeGreaterThan(0);
    expect(streets.some(s=>s.kind==='diagonal-boulevard'&&Math.abs(s.polygon[1]![1]-s.polygon[0]![1])>1)).toBe(true);
    const streetWidths=streets.filter(s=>s.polygon.length===4).map(s=>Math.min(...edgeWidths(s.polygon)));
    expect(Math.max(...streetWidths)-Math.min(...streetWidths)).toBeGreaterThan(15);
    expect(surfaces.length).toBeGreaterThan(0);
    const surfaceBounds=surfaces.map(surface=>polygonBounds(surface.polygon));
    for(let index=0;index<surfaces.length;index++){
      const surface=surfaces[index]!;
      expect(surface.polygon.length).toBeGreaterThanOrEqual(3);
      expect(polygonArea(surface.polygon)).toBeGreaterThan(1e-5);
      for(let otherIndex=index+1;otherIndex<surfaces.length;otherIndex++){
        const other=surfaces[otherIndex]!;
        const a=surfaceBounds[index]!,b=surfaceBounds[otherIndex]!;
        if(surface.material!==other.material||a[0]!>=b[2]!||a[2]!<=b[0]!||a[1]!>=b[3]!||a[3]!<=b[1]!)continue;
        expect(polygonOverlaps(surface.polygon,other.polygon,1e-5),`${surface.material} surface pieces ${index}/${otherIndex} have exclusive interiors`).toBe(false);
      }
    }
    const palais=rectPolygon(layout.northBank.palaisKeepout);
    for (let i = 0; i < parcels.length; i++) {
      expect(parcels[i]!.bounds).toEqual(polygonBounds(parcels[i]!.polygon));
      expect(polygonOverlaps(parcels[i]!.polygon,palais)).toBe(false);
      for (const other of parcels.slice(i + 1)) expect(polygonOverlaps(parcels[i]!.polygon,other.polygon)).toBe(false);
    }
    for (const street of streets) {
      expect(street.bounds).toEqual(polygonBounds(street.polygon));
      expect(polygonOverlaps(street.polygon,palais)).toBe(false);
      for (const parcel of parcels) expect(polygonOverlaps(street.polygon,parcel.polygon)).toBe(false);
    }
    const connectors = streets.filter(s => s.kind === 'quay-connector');
    expect(connectors).toHaveLength(2);
    for (const connector of connectors) expect(connector.bounds[3]).toBeGreaterThan(-280);
  });

  it('exports the shared yard without placing fixed props in the construction corridors', () => {
    const manifest = JSON.parse(readFileSync('public/models/paris-1889/paris.manifest.json', 'utf8'));
    expect(manifest.siteLayout).toEqual(layout);
    const props: { bounds: Rect }[] = manifest.workyardProps;
    expect(props.length).toBeGreaterThan(12);
    for (const prop of props) {
      expect(overlaps(prop.bounds, layout.constructionGround.bounds)).toBe(false);
      const [a,b,c,d] = layout.workyard.bounds;
      expect(prop.bounds[0]).toBeGreaterThanOrEqual(a! - .5);
      expect(prop.bounds[1]).toBeGreaterThanOrEqual(b! - .5);
      expect(prop.bounds[2]).toBeLessThanOrEqual(c! + .5);
      expect(prop.bounds[3]).toBeLessThanOrEqual(d! + .5);
    }
  });
});
