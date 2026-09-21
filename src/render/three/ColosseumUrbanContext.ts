import { BufferGeometry, Color, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial } from 'three';
import { COLOSSEUM_AQUEDUCT as A } from '../../data/colosseumAqueduct';
import { COLOSSEUM_URBAN_CONTEXT as CONTEXT, type RomePoint } from '../../data/colosseumUrbanContext';
import { aqueductPointAt } from '../../engine/colosseumAqueduct';
import { colosseumTerrainHeightAt as ground } from '../../engine/colosseumTerrain';
import { caelianLotFoundation, createCaelianStreetFronts } from '../../engine/colosseumUrbanContext';
import { injectMaterialRecipe } from './proceduralDetail';

type Point = [number, number, number];
interface Part { id: string; firstVertex: number; vertexCount: number }

/** Fixed world-space batches keep context present from the film's first frame. */
class MasonryBatch {
  readonly positions: number[] = [];
  readonly colors: number[] = [];
  readonly parts: Part[] = [];
  private tint = new Color('#ffffff');

  part(id: string, draw: () => void, color = '#ffffff'): void {
    const firstVertex = this.positions.length / 3;
    this.tint.set(color);
    draw();
    this.parts.push({ id, firstVertex, vertexCount: this.positions.length / 3 - firstVertex });
  }

  face(...points: Point[]): void {
    for (let i = 1; i < points.length - 1; i++) {
      for (const point of [points[0]!, points[i]!, points[i + 1]!]) {
        this.positions.push(...point);
        this.colors.push(this.tint.r, this.tint.g, this.tint.b);
      }
    }
  }

  box(x0: number, x1: number, z0: number, z1: number, bottom: number, top: number): void {
    this.face([x0,bottom,z1], [x1,bottom,z1], [x1,top,z1], [x0,top,z1]);
    this.face([x1,bottom,z0], [x0,bottom,z0], [x0,top,z0], [x1,top,z0]);
    this.face([x0,bottom,z0], [x0,bottom,z1], [x0,top,z1], [x0,top,z0]);
    this.face([x1,bottom,z1], [x1,bottom,z0], [x1,top,z0], [x1,top,z1]);
    this.face([x0,top,z1], [x1,top,z1], [x1,top,z0], [x0,top,z0]);
    this.face([x0,bottom,z0], [x1,bottom,z0], [x1,bottom,z1], [x0,bottom,z1]);
  }

  /** Footings follow the sampled ground at every corner; tops remain level. */
  footing(x0: number, x1: number, z0: number, z1: number, top: number): void {
    const outline: RomePoint[] = [[x0,z1], [x1,z1], [x1,z0], [x0,z0]];
    for (let i = 0; i < 4; i++) {
      const [x,z] = outline[i]!, [nx,nz] = outline[(i + 1) % 4]!;
      this.face([x,ground(x,z) - .06,z], [nx,ground(nx,nz) - .06,nz], [nx,top,nz], [x,top,z]);
    }
    this.face([x0,top,z1], [x1,top,z1], [x1,top,z0], [x0,top,z0]);
  }

  geometry(): BufferGeometry {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new Float32BufferAttribute(this.colors, 3));
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    geometry.userData.parts = this.parts;
    return geometry;
  }
}

function street(batch: MasonryBatch, points: readonly RomePoint[], width: number): void {
  for (let leg = 1; leg < points.length; leg++) {
    const [x0,z0] = points[leg - 1]!, [x1,z1] = points[leg]!;
    const length = Math.hypot(x1 - x0, z1 - z0);
    const acrossX = -(z1 - z0) / length * width / 2;
    const acrossZ = (x1 - x0) / length * width / 2;
    const count = Math.ceil(length / 6);
    const edge = (step: number, side: number): Point => {
      const x = x0 + (x1 - x0) * step / count + acrossX * side;
      const z = z0 + (z1 - z0) * step / count + acrossZ * side;
      return [x,ground(x,z) + .08,z];
    };
    for (let i = 0; i < count; i++) batch.face(edge(i, 1), edge(i + 1, 1), edge(i + 1, -1), edge(i, -1));
  }
}

function column(batch: MasonryBatch, x: number, z: number, floor: number, height = 5.4): void {
  const count = 6, bottom = floor + .3, top = floor + height;
  batch.box(x - .9, x + .9, z - .9, z + .9, floor, bottom);
  for (let i = 0; i < count; i++) {
    const a = i * Math.PI * 2 / count, b = (i + 1) * Math.PI * 2 / count;
    batch.face([x + Math.cos(b) * .65,bottom,z + Math.sin(b) * .65],
      [x + Math.cos(a) * .65,bottom,z + Math.sin(a) * .65],
      [x + Math.cos(a) * .57,top,z + Math.sin(a) * .57],
      [x + Math.cos(b) * .57,top,z + Math.sin(b) * .57]);
  }
  batch.box(x - .85, x + .85, z - .85, z + .85, top, top + .35);
}

function gable(batch: MasonryBatch, x0: number, x1: number, z0: number, z1: number, y: number, alongX: boolean): void {
  const middleX = (x0 + x1) / 2, middleZ = (z0 + z1) / 2, ridge = y + 1.65;
  if (alongX) {
    batch.face([x0,y,z1], [x1,y,z1], [x1,ridge,middleZ], [x0,ridge,middleZ]);
    batch.face([x1,y,z0], [x0,y,z0], [x0,ridge,middleZ], [x1,ridge,middleZ]);
    batch.face([x0,y,z0], [x0,y,z1], [x0,ridge,middleZ]);
    batch.face([x1,y,z1], [x1,y,z0], [x1,ridge,middleZ]);
  } else {
    batch.face([x0,y,z0], [x0,y,z1], [middleX,ridge,z1], [middleX,ridge,z0]);
    batch.face([x1,y,z1], [x1,y,z0], [middleX,ridge,z0], [middleX,ridge,z1]);
    batch.face([x0,y,z1], [x1,y,z1], [middleX,ridge,z1]);
    batch.face([x1,y,z0], [x0,y,z0], [middleX,ridge,z0]);
  }
}

/** Authored compressed precinct mass, not an archaeological temple model. */
export class ColosseumUrbanContext {
  readonly group = new Group();
  private disposed = false;
  private readonly resources: Array<{ dispose(): void }> = [];

  constructor() {
    this.group.name = 'colosseum-connected-caelian-context';
    this.group.userData.context = CONTEXT.id;
    const roads = new MasonryBatch(), brick = new MasonryBatch(), stone = new MasonryBatch(), roofs = new MasonryBatch();
    for (const route of CONTEXT.streets) roads.part(route.id, () => street(roads, route.points, route.width));
    const P = CONTEXT.precinct, [cx,cz] = P.center;
    const west = cx - P.width / 2, east = cx + P.width / 2;
    const south = cz - P.depth / 2, north = cz + P.depth / 2, floor = P.top;
    const receiver = CONTEXT.watercourse.receiver, openingHalf = 1.75;
    const receiverBottom = aqueductPointAt(-A.pierWidth / 2).springing + A.spandrelTop - .08;
    const receiverTop = receiverBottom + .08 + A.channelHeight + A.capHeight + .02;

    // Subdivide the outer retaining skin so every exposed footing follows the hill.
    const wall = (a: RomePoint, b: RomePoint, top = floor) => {
      const steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 8);
      for (let i = 0; i < steps; i++) {
        const point = (t: number): RomePoint => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
        const [x,z] = point(i / steps), [nx,nz] = point((i + 1) / steps);
        brick.face([x,ground(x,z) - .06,z], [nx,ground(nx,nz) - .06,nz], [nx,top,nz], [x,top,z]);
      }
    };
    brick.part('precinct-retaining-wall', () => {
      wall([west,north], [east,north]);
      wall([west,south], [west,north]);
      wall([east,south], [west,south]);
      wall([east,north], [east,receiver[1] + openingHalf]);
      wall([east,receiver[1] - openingHalf], [east,south]);
      wall([east,receiver[1] + openingHalf], [east,receiver[1] - openingHalf], receiverBottom);
    });
    brick.part('aqueduct-receiving-recess', () => {
      const z0 = receiver[1] - openingHalf, z1 = receiver[1] + openingHalf, back = east - 2.2;
      // A real shallow covered opening, with jamb returns and an inset back wall.
      brick.face([back,receiverBottom,z0], [east,receiverBottom,z0], [east,receiverTop,z0], [back,receiverTop,z0]);
      brick.face([east,receiverBottom,z1], [back,receiverBottom,z1], [back,receiverTop,z1], [east,receiverTop,z1]);
      brick.face([back,receiverBottom,z1], [back,receiverBottom,z0], [back,receiverTop,z0], [back,receiverTop,z1]);
      brick.face([back,receiverTop,z0], [east,receiverTop,z0], [east,receiverTop,z1], [back,receiverTop,z1]);
      brick.face([east,receiverBottom,z0], [back,receiverBottom,z0], [back,receiverBottom,z1], [east,receiverBottom,z1]);
      brick.box(back, east, z0, z1, receiverTop, floor);
    }, '#b8a292');
    brick.part('aqueduct-covered-wall-entry', () => {
      // Continue the existing kit's closed specus through the wall face. Its
      // outer end uses exactly the same section/grade as the Blender channel.
      const point = (distance: number, side: number, height: number): Point => {
        const p = aqueductPointAt(distance);
        return [p.x - A.direction[1] * side, p.springing + A.spandrelTop + height, p.z + A.direction[0] * side];
      };
      const section = (width: number, bottom: number, top: number) => {
        const start = -2.5, end = -A.pierWidth / 2, half = width / 2;
        brick.face(point(start,half,bottom), point(end,half,bottom), point(end,half,top), point(start,half,top));
        brick.face(point(end,-half,bottom), point(start,-half,bottom), point(start,-half,top), point(end,-half,top));
        brick.face(point(start,half,top), point(end,half,top), point(end,-half,top), point(start,-half,top));
      };
      section(A.depth, 0, A.channelHeight);
      section(A.capDepth, A.channelHeight, A.channelHeight + A.capHeight);
    });
    stone.part('precinct-court', () => stone.face([west,floor,north], [east,floor,north], [east,floor,south], [west,floor,south]));

    // Pilasters break the large retaining elevation without invented temple detail.
    brick.part('north-retaining-pilasters', () => {
      for (let i = 0; i <= 10; i++) {
        const x = west + 2 + i * (P.width - 4) / 10;
        if (Math.abs(x - cx) < P.northEntryWidth / 2 + 2) continue;
        brick.footing(x - .85, x + .85, north - .08, north + .65, floor);
      }
    }, '#dac3ad');
    brick.part('east-retaining-pilasters', () => {
      for (let i = 0; i < 8; i++) {
        const z = south + 3 + i * (P.depth - 6) / 7;
        if (Math.abs(z - receiver[1]) < 4) continue;
        brick.footing(east - .08, east + .65, z - .8, z + .8, floor);
      }
      for (const z of [receiver[1] - 2.4, receiver[1] + 2.4]) brick.footing(east - .08, east + .85, z - .45, z + .45, floor);
    }, '#dac3ad');

    const approachStreet = CONTEXT.streets.find(route => route.id === 'precinct-north-approach')!;
    const approach = approachStreet.points[0]!;
    const run = approach[1] - north, startY = ground(approach[0], approach[1]) + .08;
    const steps = Math.ceil((floor - startY) / .2), tread = run / steps;
    stone.part('precinct-north-stair', () => {
      for (let i = 0; i < steps; i++) {
        const front = approach[1] - i * tread, back = approach[1] - (i + 1) * tread;
        // The first treads meet the narrower street, then flare into the
        // precinct entrance. A full-width first tread would cut the hillside.
        const halfWidth = (z: number) => approachStreet.width / 2 +
          (P.northEntryWidth - approachStreet.width) / 2 * Math.min(1, (approach[1] - z) / 6);
        const left = cx - halfWidth(front), right = cx + halfWidth(front);
        const backLeft = cx - halfWidth(back), backRight = cx + halfWidth(back);
        const y = startY + (floor - startY) * (i + 1) / steps;
        const previous = startY + (floor - startY) * i / steps;
        // The stair is one grounded mass: omit invisible interior back faces.
        stone.face([left,y,front], [right,y,front], [backRight,y,back], [backLeft,y,back]);
        stone.face([left,previous,front], [right,previous,front], [right,y,front], [left,y,front]);
        stone.face([backLeft,ground(backLeft,back) - .06,back], [left,ground(left,front) - .06,front], [left,y,front], [backLeft,y,back]);
        stone.face([right,ground(right,front) - .06,front], [backRight,ground(backRight,back) - .06,back], [backRight,y,back], [right,y,front]);
      }
    });

    // Three low colonnaded wings enclose a visibly open court, facing north.
    const inset = 5.5, wing = 7.5;
    const wx = west + inset, ex = east - inset, sz = south + inset, nz = north - inset;
    stone.part('precinct-portico-columns', () => {
      for (const x of [wx + wing / 2, ex - wing / 2]) for (let i = 0; i <= 6; i++) column(stone, x, nz - i * (nz - sz - wing) / 6, floor);
      for (let i = 0; i <= 8; i++) column(stone, wx + wing / 2 + i * (ex - wx - wing) / 8, sz + wing / 2, floor);
    });
    stone.part('precinct-portico-beams', () => {
      stone.box(wx, wx + wing, sz + wing, nz, floor + 5.75, floor + 6.35);
      stone.box(ex - wing, ex, sz + wing, nz, floor + 5.75, floor + 6.35);
      stone.box(wx, ex, sz, sz + wing, floor + 5.75, floor + 6.35);
    });
    roofs.part('precinct-portico-roofs', () => {
      gable(roofs, wx - .5, wx + wing + .5, sz + wing, nz + .5, floor + 6.35, false);
      gable(roofs, ex - wing - .5, ex + .5, sz + wing, nz + .5, floor + 6.35, false);
      gable(roofs, wx - .5, ex + .5, sz - .5, sz + wing, floor + 6.35, true);
    });

    // A deliberately schematic north-facing temple, not a surveyed elevation
    // or an assertion about the precise Flavian restoration campaign.
    const podium = floor + 1.35, cellaSouth = cz - 24, cellaNorth = cz - 2;
    const front = cz + 9, templeLeft = cx - 13, templeRight = cx + 13;
    const templeEaves = podium + 8.15;
    stone.part('precinct-temple-podium', () => {
      stone.box(templeLeft - 2, templeRight + 2, cellaSouth - 2, front + 2, floor, podium);
      for (let i = 0; i < 7; i++) {
        const top = floor + (podium - floor) * (i + 1) / 7;
        stone.box(cx - 6.5, cx + 6.5, front + 2 + (6 - i) * .4, front + 2 + (7 - i) * .4, floor, top);
      }
    });
    stone.part('precinct-temple-cella', () => {
      const top = templeEaves - .5;
      stone.box(templeLeft, templeLeft + 1, cellaSouth, cellaNorth, podium, top);
      stone.box(templeRight - 1, templeRight, cellaSouth, cellaNorth, podium, top);
      stone.box(templeLeft + 1, templeRight - 1, cellaSouth, cellaSouth + 1, podium, top);
      stone.box(templeLeft + 1, cx - 1.8, cellaNorth - 1, cellaNorth, podium, top);
      stone.box(cx + 1.8, templeRight - 1, cellaNorth - 1, cellaNorth, podium, top);
      stone.box(cx - 1.8, cx + 1.8, cellaNorth - 1, cellaNorth, podium + 4.8, top);
    });
    stone.part('precinct-temple-pronaos', () => {
      for (let i = 0; i < 6; i++) column(stone, templeLeft + i * (templeRight - templeLeft) / 5, front, podium, 7.3);
      for (const x of [templeLeft,templeRight]) column(stone, x, cellaNorth, podium, 7.3);
      stone.box(templeLeft - 1, templeRight + 1, cellaSouth - 1, front + 1, podium + 7.65, templeEaves);
    });
    roofs.part('precinct-temple-roof', () => gable(roofs, templeLeft - 1.4, templeRight + 1.4, cellaSouth - 1.4, front + 1.4, templeEaves, false));

    createCaelianStreetFronts().forEach((lot, index) => brick.part(`street-front-foundation-${index}`, () => {
      const { corners, top } = caelianLotFoundation(lot);
      for (let i = 0; i < corners.length; i++) {
        const a = corners[i]!, b = corners[(i + 1) % corners.length]!;
        brick.face([b.x,b.ground - .06,b.z], [a.x,a.ground - .06,a.z], [a.x,top,a.z], [b.x,top,b.z]);
      }
      brick.face(...[...corners].reverse().map(p => [p.x,top,p.z] as Point));
    }));

    for (const [name,batch,color,recipe] of [
      ['streets',roads,'#99866d','compacted-earth'],
      ['retaining-masonry',brick,'#967056','mud-brick'],
      ['court-and-portico',stone,'#c4b390','travertine'],
      ['portico-tiles',roofs,'#955c41','mud-brick'],
    ] as const) {
      const material = new MeshStandardMaterial({ color, roughness: .94, vertexColors: true });
      injectMaterialRecipe(material, recipe);
      const geometry = batch.geometry(), mesh = new Mesh(geometry, material);
      mesh.name = `colosseum-urban-${name}`;
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      this.group.add(mesh);
      this.resources.push(geometry, material);
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.resources.forEach(resource => resource.dispose());
  }
}
