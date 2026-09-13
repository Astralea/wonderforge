import {
  BoxGeometry,
  Color,
  ConeGeometry,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  Vector3,
} from 'three';
import { PETRA_ENVIRONMENT } from '../../data/petraEnvironment';
import type { PetraSkySample } from '../../data/petraSky';
import { mulberry32 } from '../../engine/random';
import { petraTerrainHeightAt } from '../../engine/petraTerrain';
import { petraWorkingFaceY } from '../../engine/petraConstruction';
import type { LightState } from '../../engine/daynight';
import type { MaterialLibrary } from './MaterialLibrary';
import { injectMaterialRecipe } from './proceduralDetail';

export class PetraEnvironment {
  readonly group = new Group();
  private readonly geometries: Array<{ dispose(): void }> = [];
  private readonly materials: MeshStandardMaterial[] = [];
  private readonly benches: InstancedMesh;
  private readonly tufts: InstancedMesh;
  private readonly chips: InstancedMesh;

  constructor(materials: MaterialLibrary) {
    this.group.name = 'petra-environment';
    const rose = new MeshStandardMaterial({ color: '#c0774c', roughness: 0.96, vertexColors: true });
    const shade = new MeshStandardMaterial({ color: '#8a5340', roughness: 0.98, vertexColors: true });
    const plaza = new MeshStandardMaterial({ color: '#c9a06a', roughness: 0.98, vertexColors: true });
    injectMaterialRecipe(rose, 'disi-sandstone');
    injectMaterialRecipe(plaza, 'disi-sandstone');
    this.materials.push(rose, shade, plaza);

    const floor = this.createFloor(plaza);
    const west = this.createWall(-22.5, shade);
    const east = this.createWall(22.5, shade);
    const massif = this.createMassif(rose);
    this.group.add(floor, west, east, massif);

    this.benches = this.createScatter(
      new BoxGeometry(1, 1, 1),
      materials.wood.clone(),
      PETRA_ENVIRONMENT.site.timberBenches,
      'petra-timber-benches',
    );
    this.tufts = this.createScatter(
      new ConeGeometry(0.18, 0.22, 5),
      materials.foliage.clone(),
      PETRA_ENVIRONMENT.ecology.floorTufts,
      'petra-floor-tufts',
    );
    this.chips = this.createScatter(
      new BoxGeometry(1, 1, 1),
      rose.clone(),
      PETRA_ENVIRONMENT.site.spoilChips,
      'petra-floor-chips',
    );
    this.placeStaticScatter();
  }

  private createFloor(material: MeshStandardMaterial): Mesh {
    const { radius, segments } = PETRA_ENVIRONMENT.terrain;
    const geometry = new PlaneGeometry(radius * 2, radius * 2, segments, segments);
    geometry.rotateX(-Math.PI / 2);
    const position = geometry.getAttribute('position');
    const colors = new Float32Array(position.count * 3);
    const ochre = new Color(PETRA_ENVIRONMENT.palette.plaza);
    const deep = new Color('#8a5a3a');
    const color = new Color();
    for (let index = 0; index < position.count; index += 1) {
      const x = position.getX(index);
      const z = position.getZ(index);
      position.setY(index, petraTerrainHeightAt(x, z));
      const shade = Math.min(1, Math.abs(x) / 14);
      color.copy(ochre).lerp(deep, 0.12 + shade * 0.28);
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
    }
    position.needsUpdate = true;
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    this.geometries.push(geometry);
    const mesh = new Mesh(geometry, material);
    mesh.name = 'petra-siq-floor';
    mesh.receiveShadow = true;
    return mesh;
  }

  private createWall(x: number, material: MeshStandardMaterial): Mesh {
    const geometry = new BoxGeometry(6.2, 64, 110, 1, 8, 8);
    const position = geometry.getAttribute('position');
    const colors = new Float32Array(position.count * 3);
    const lit = new Color('#a3664a');
    const deep = new Color('#5c3328');
    const color = new Color();
    for (let index = 0; index < position.count; index += 1) {
      const y = position.getY(index);
      const z = position.getZ(index);
      const strata = Math.sin(y * 0.55) * 0.18 + Math.sin(z * 0.21) * 0.12;
      position.setX(index, position.getX(index) + strata);
      color.copy(lit).lerp(deep, 0.22 + Math.max(0, -z) * 0.004);
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
    }
    position.needsUpdate = true;
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    this.geometries.push(geometry);
    const mesh = new Mesh(geometry, material);
    mesh.name = x < 0 ? 'petra-siq-wall-west' : 'petra-siq-wall-east';
    mesh.position.set(x, 22, -22);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  private createMassif(material: MeshStandardMaterial): Mesh {
    const geometry = new BoxGeometry(48, 72, 22, 4, 6, 2);
    const position = geometry.getAttribute('position');
    for (let index = 0; index < position.count; index += 1) {
      const y = position.getY(index);
      position.setZ(index, position.getZ(index) + Math.sin(y * 0.18) * 0.6);
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();
    this.geometries.push(geometry);
    const mesh = new Mesh(geometry, material);
    mesh.name = 'petra-khubtha-massif';
    mesh.position.set(0, 28, 16);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  private createScatter(
    geometry: BoxGeometry | ConeGeometry,
    material: MeshStandardMaterial,
    count: number,
    name: string,
  ): InstancedMesh {
    this.geometries.push(geometry);
    this.materials.push(material);
    const mesh = new InstancedMesh(geometry, material, count);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    this.group.add(mesh);
    return mesh;
  }

  private placeStaticScatter(): void {
    const rand = mulberry32('petra-environment-scatter');
    const matrix = new Matrix4();
    const quaternion = new Quaternion();
    const keepOut = (x: number, z: number) => (
      PETRA_ENVIRONMENT.facade
      && Math.abs(x) < 14
      && z > -4.5
      && z < 8
    );
    let tuft = 0;
    let chip = 0;
    while (tuft < this.tufts.count || chip < this.chips.count) {
      const x = (rand() - 0.5) * 22;
      const z = -4 - rand() * 46;
      if (keepOut(x, z) || Math.abs(x) < 3.2 && z < -6) {
        if (Math.abs(x) < 5.5 && z < -8) continue;
      }
      const y = petraTerrainHeightAt(x, z);
      if (tuft < this.tufts.count && rand() > 0.45) {
        matrix.compose(
          new Vector3(x, y + 0.08, z),
          quaternion.setFromAxisAngle(new Vector3(0, 1, 0), rand() * 6),
          new Vector3(0.7 + rand() * 0.5, 0.6 + rand() * 0.4, 0.7),
        );
        this.tufts.setMatrixAt(tuft, matrix);
        tuft += 1;
      } else if (chip < this.chips.count) {
        matrix.compose(
          new Vector3(x, y + 0.05, z),
          quaternion.setFromAxisAngle(new Vector3(0, 1, 0), rand() * 6),
          new Vector3(0.28, 0.1, 0.22),
        );
        this.chips.setMatrixAt(chip, matrix);
        chip += 1;
      }
    }
    this.tufts.instanceMatrix.needsUpdate = true;
    this.chips.instanceMatrix.needsUpdate = true;
  }

  update(t: number, _light: LightState, _sky: PetraSkySample): void {
    const faceY = petraWorkingFaceY(t);
    const matrix = new Matrix4();
    const quaternion = new Quaternion();
    for (let index = 0; index < this.benches.count; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const y = Math.max(1.4, faceY - 1.1 - (index % 4) * 2.4);
      matrix.compose(
        new Vector3(side * 11.6, y, 0.2),
        quaternion.setFromAxisAngle(new Vector3(0, 1, 0), 0),
        new Vector3(2.4, 0.18, 1.1),
      );
      this.benches.setMatrixAt(index, matrix);
    }
    this.benches.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    this.benches.dispose();
    this.tufts.dispose();
    this.chips.dispose();
  }
}
