import {
  BoxGeometry,
  BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  SphereGeometry,
  TorusGeometry,
} from 'three';
import type { Part, ShapeKind, Wonder } from '../../data/types';
import { getCompiledScene } from '../../data/scenes';
import { carveState, entranceState, partProgress, stageWindows } from '../../engine/timeline';
import type { MaterialLibrary } from './MaterialLibrary';

interface LegacyPart {
  part: Part;
  mesh: Mesh;
  stageIndex: number;
}

function rampGeometry(): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setFromPoints([]);
  const box = new BoxGeometry(1, 1, 1);
  const positions = box.getAttribute('position');
  for (let index = 0; index < positions.count; index += 1) {
    const z = positions.getZ(index);
    if (positions.getY(index) > 0) positions.setY(index, z < 0 ? 0.5 : -0.5);
  }
  positions.needsUpdate = true;
  box.computeVertexNormals();
  geometry.copy(box);
  box.dispose();
  return geometry;
}

function geometryFor(shape: ShapeKind): BufferGeometry {
  switch (shape) {
    case 'box': return new BoxGeometry(1, 1, 1);
    case 'cylinder': return new CylinderGeometry(0.5, 0.5, 1, 12);
    case 'cone': return new ConeGeometry(0.5, 1, 12);
    case 'pyramid': return new ConeGeometry(0.72, 1, 4);
    case 'prism': return new CylinderGeometry(0.5, 0.5, 1, 6);
    case 'sphere': return new SphereGeometry(0.5, 14, 9);
    case 'torus': return new TorusGeometry(0.36, 0.14, 8, 18);
    case 'ramp': return rampGeometry();
    case 'sail': return new SphereGeometry(0.5, 14, 9, 0, Math.PI * 1.25, 0, Math.PI * 0.7);
  }
}

export class LegacyWorld {
  readonly group = new Group();
  private readonly items: LegacyPart[] = [];
  private readonly geometries: BufferGeometry[] = [];
  private readonly windows;

  constructor(wonder: Wonder, materials: MaterialLibrary) {
    this.group.name = `legacy-three-fallback-${wonder.id}`;
    const scene = getCompiledScene(wonder.id);
    const structure = scene?.structure ?? wonder.structure;
    this.windows = stageWindows(structure.stages);
    const geometryCache = new Map<ShapeKind, BufferGeometry>();
    const geometry = (shape: ShapeKind) => {
      const existing = geometryCache.get(shape);
      if (existing) return existing;
      const created = geometryFor(shape);
      geometryCache.set(shape, created);
      this.geometries.push(created);
      return created;
    };

    structure.stages.forEach((stage, stageIndex) => {
      stage.parts.forEach((part) => {
        const item = new Mesh(geometry(part.shape), materials.legacy[part.material]);
        item.position.set(part.position[0], part.position[1] + part.scale[1] * 0.5, part.position[2]);
        item.scale.set(...part.scale);
        if (part.rotation) item.rotation.set(...part.rotation);
        item.castShadow = part.material !== 'water' && part.material !== 'light';
        item.receiveShadow = true;
        this.items.push({ part, mesh: item, stageIndex });
        this.group.add(item);
      });
    });
  }

  update(t: number): void {
    for (const item of this.items) {
      const window = this.windows[item.stageIndex]!;
      const state = item.part.entrance === 'carve'
        ? carveState(item.part, t, window)
        : entranceState(item.part, partProgress(t, window));
      item.mesh.visible = state.visible;
      item.mesh.position.y = item.part.position[1] + item.part.scale[1] * 0.5 + state.yOffset;
    }
  }

  dispose(): void {
    for (const geometry of this.geometries) geometry.dispose();
  }
}
