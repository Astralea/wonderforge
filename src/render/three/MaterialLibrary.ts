import {
  Color,
  MeshStandardMaterial,
  type Material,
} from 'three';
import type { BlockMaterial } from '../../data/constructionTypes';
import type { MaterialKey, Wonder } from '../../data/types';
import { applyMaterialDetail } from './proceduralDetail';

export interface MaterialLibrary {
  block: Record<BlockMaterial, MeshStandardMaterial>;
  sand: MeshStandardMaterial;
  compactedEarth: MeshStandardMaterial;
  /** Sun-dried mud-brick revetment for earthwork retaining walls: greyer and
   *  duller than the fill, and never the terracotta of the city roofs — the
   *  ramps once shared `cityRoof` and read as giant tiled buildings. */
  revetment: MeshStandardMaterial;
  quarryCut: MeshStandardMaterial;
  wood: MeshStandardMaterial;
  rope: MeshStandardMaterial;
  foliage: MeshStandardMaterial;
  water: MeshStandardMaterial;
  farmland: MeshStandardMaterial;
  horizon: MeshStandardMaterial;
  cityRoof: MeshStandardMaterial;
  cityAccent: MeshStandardMaterial;
  whitewash: MeshStandardMaterial;
  skin: MeshStandardMaterial;
  linen: MeshStandardMaterial;
  city: MeshStandardMaterial;
  legacy: Record<MaterialKey, MeshStandardMaterial>;
  all: Material[];
}

function standard(color: string, roughness: number, metalness = 0): MeshStandardMaterial {
  return new MeshStandardMaterial({ color, roughness, metalness });
}

export function createMaterialLibrary(wonder: Wonder): MaterialLibrary {
  const core = standard('#cbb07a', 0.94);
  const casing = standard('#ead9ac', 0.82);
  const granite = standard('#9b725d', 0.88);
  const sand = standard('#c99a5f', 0.98);
  const compactedEarth = standard('#9e6e3d', 1);
  const revetment = standard('#93764f', 1);
  const quarryCut = standard('#b98c58', 1);
  const wood = standard('#5b3822', 0.96);
  const rope = standard('#8b6338', 1);
  const foliage = standard('#506633', 0.94);
  const water = standard('#3f7f8c', 0.15, 0);
  water.transparent = true;
  water.opacity = 0.82;
  const farmland = standard('#6f7445', 0.99);
  const horizon = standard('#a97949', 1);
  horizon.vertexColors = true;
  const cityRoof = standard('#77513c', 0.98);
  const cityAccent = standard('#c4a16e', 0.91);
  const whitewash = standard('#e9dfc6', 0.92);
  const skin = standard('#8f5e3f', 0.92);
  const linen = standard('#d3bf93', 0.96);
  const city = standard('#ad8a63', 0.98);

  const legacy: Record<MaterialKey, MeshStandardMaterial> = {
    primary: standard(wonder.palette.primary, 0.9),
    accent: standard(wonder.palette.accent, 0.86),
    ground: sand,
    foliage,
    water,
    light: standard('#f3c76b', 0.5),
    shadow: standard('#2e251f', 1),
    casing,
  };
  legacy.light.emissive = new Color('#e1a53f');
  legacy.light.emissiveIntensity = 0.35;

  const block = {
    'core-limestone': core,
    'casing-limestone': casing,
    granite,
  } satisfies Record<BlockMaterial, MeshStandardMaterial>;

  const library: MaterialLibrary = {
    block,
    sand,
    compactedEarth,
    revetment,
    quarryCut,
    wood,
    rope,
    foliage,
    water,
    farmland,
    horizon,
    cityRoof,
    cityAccent,
    whitewash,
    skin,
    linen,
    city,
    legacy,
    all: Array.from(new Set([
      ...Object.values(block),
      sand,
      compactedEarth,
      revetment,
      quarryCut,
      wood,
      rope,
      foliage,
      water,
      farmland,
      horizon,
      cityRoof,
      cityAccent,
      whitewash,
      skin,
      linen,
      city,
      ...Object.values(legacy),
    ])),
  };
  applyMaterialDetail(library);
  return library;
}
