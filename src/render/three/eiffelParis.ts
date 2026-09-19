import {analyzeParisDetail,configureParisDetail} from './eiffelParisDetail';
import { clipEiffelPoolPaving } from './eiffelPoolPaving';
import {
  BatchedMesh,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  Matrix3,
  Matrix4,
  LinearFilter,
  LinearMipmapLinearFilter,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
  Mesh,
  MeshStandardMaterial,
  Vector3,
  type Material,
  type Object3D,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { EiffelTrafficActorKind } from '../../data/eiffelTraffic';

export type EiffelParisPrototypeKind = EiffelTrafficActorKind | 'horse';

export const EIFFEL_PARIS_CITY_GLB = '/models/paris-1889/paris-city.glb';
export const EIFFEL_PARIS_LIFE_GLB = '/models/paris-1889/paris-life.glb';
export const EIFFEL_PARIS_LIFE_ROOTS: readonly EiffelParisPrototypeKind[] = [
  'pedestrian-man',
  'pedestrian-woman',
  'cart',
  'carriage',
  'steam-boat',
  'barge',
  'horse',
];
export const EIFFEL_PARIS_CITY_CELL_SIZE = 104;

async function readGlbBuffer(url: string): Promise<ArrayBuffer> {
  try {
    const response = await fetch(url);
    if (response.ok) return await response.arrayBuffer();
  } catch {
    /* Vitest may expose fetch without a preview server. */
  }
  if (typeof process === 'undefined' || !process.versions?.node)
    throw new Error(`Paris asset missing: ${url}`);
  const { readFileSync } = await import('node:fs');
  const { resolve } = await import('node:path');
  const file = resolve(process.cwd(), `public${url}`);
  const buffer = readFileSync(file);
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  );
}

async function parseGlb(url: string): Promise<Group> {
  const gltf = await new GLTFLoader().parseAsync(await readGlbBuffer(url), '');
  return gltf.scene;
}

export async function loadEiffelParisCity(
  shouldDiscard?: () => boolean,
  onStep?: () => void,
): Promise<Group> {
  const buffer = await readGlbBuffer(EIFFEL_PARIS_CITY_GLB);
  onStep?.();
  const source = (await new GLTFLoader().parseAsync(buffer, '')).scene;
  onStep?.();
  // Navigation can dispose the owner while fetch/GLTF decoding is pending.
  // Avoid analysing and repartitioning a city that will never be displayed.
  if (shouldDiscard?.()) {
    const geometries = new Set<BufferGeometry>();
    const materials = new Set<Material>();
    const textures = new Set<Texture>();
    const images = new Set<{close?: () => void}>();
    source.traverse(object => {
      if (!(object instanceof Mesh)) return;
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        materials.add(material);
        for (const value of Object.values(material)) {
          if (value && typeof value === 'object' && (value as Texture).isTexture) textures.add(value as Texture);
        }
      }
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    for (const texture of textures) {
      texture.dispose();
      const image = texture.source.data as {close?: () => void} | undefined;
      if (image) images.add(image);
    }
    for (const image of images) image.close?.();
    source.clear();
    return source;
  }
  source.updateMatrixWorld(true);
  const poolPavingAudit = clipEiffelPoolPaving(source);
  const detailAnalysis=analyzeParisDetail(source);
  type Cell = {
    positions: number[];
    normals: number[];
    colors: number[];
    surfaces: number[];
    pbr: number[];
    detailInfo:number[];
    detailDimensions:number[];
    detailNormals:number[];
    uvs: number[];
    triangles: number;
  };
  const cells = new Map<string, Cell>();
  const facadeTextures = new Set<Texture>();
  const vertex = new Vector3();
  const normal = new Vector3();
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  source.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const geometry = object.geometry;
    const positions = geometry.attributes.position!;
    const normals = geometry.attributes.normal;
    const colors = geometry.attributes.color;
    const index = geometry.index;
    const normalMatrix = new Matrix3().getNormalMatrix(object.matrixWorld);
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    const groups = geometry.groups;
    const materialForOffset = (offset: number): Material => {
      if (materials.length === 1 || groups.length === 0) return materials[0]!;
      const group = groups.find(
        (candidate: { start: number; count: number; materialIndex?: number }) =>
          offset >= candidate.start &&
          offset < candidate.start + candidate.count,
      );
      return materials[group?.materialIndex ?? 0]!;
    };
    const sourceIndex = (offset: number) =>
      index ? index.getX(offset) : offset;
    const readPosition = (offset: number, target: Vector3) =>
      target
        .fromBufferAttribute(positions, sourceIndex(offset))
        .applyMatrix4(object.matrixWorld);
    for (
      let offset = 0;
      offset < (index?.count ?? positions.count);
      offset += 3
    ) {
      readPosition(offset, a);
      readPosition(offset + 1, b);
      readPosition(offset + 2, c);
      const cellX = Math.floor(
        (a.x + b.x + c.x) / 3 / EIFFEL_PARIS_CITY_CELL_SIZE,
      );
      const cellZ = Math.floor(
        (a.z + b.z + c.z) / 3 / EIFFEL_PARIS_CITY_CELL_SIZE,
      );
      const key = `${cellX}:${cellZ}`;
      const cell = cells.get(key) ?? {
        positions: [],
        normals: [],
        colors: [],
        surfaces: [],
        pbr: [],
        detailInfo: [],
        detailDimensions: [],
        detailNormals: [],
        uvs: [],
        triangles: 0,
      };
      const detail=detailAnalysis.triangles.get(object)?.get(offset);
      const material = materialForOffset(offset);
      const materialColor =
        material instanceof MeshStandardMaterial
          ? material.color
          : new Color('#777777');
      for (const cornerOffset of [offset, offset + 1, offset + 2]) {
        const sourceVertex = sourceIndex(cornerOffset);
        vertex
          .fromBufferAttribute(positions, sourceVertex)
          .applyMatrix4(object.matrixWorld);
        cell.positions.push(vertex.x, vertex.y, vertex.z);
        if (normals)
          normal
            .fromBufferAttribute(normals, sourceVertex)
            .applyMatrix3(normalMatrix)
            .normalize();
        else normal.set(0, 1, 0);
        cell.normals.push(normal.x, normal.y, normal.z);
        const facade = object.userData.wf_material === 'masonry-facade';
        cell.surfaces.push(facade ? 2 : ['work-earth','courtyard-earth'].includes(object.userData.wf_material) ? 1 : 0);
        cell.pbr.push(material instanceof MeshStandardMaterial ? material.roughness : .85, material instanceof MeshStandardMaterial ? material.metalness : 0);
        cell.detailInfo.push(...(detail?.info??[0,0,0,0]));
        cell.detailDimensions.push(...(detail?.dimensions??[0,0,0,0]));
        cell.detailNormals.push(...(detail?.normal??[0,0,0]));
        const uv = geometry.attributes.uv;
        if (facade) {
          if (!uv || !(material instanceof MeshStandardMaterial) || !material.map)
            throw new Error('Paris facade requires the embedded GLB texture and UVs');
          facadeTextures.add(material.map);
        }
        cell.uvs.push(facade ? uv!.getX(sourceVertex) : 0, facade ? uv!.getY(sourceVertex) : 0);
        if (colors) {
          const sourceColor = new Color().fromBufferAttribute(
            colors,
            sourceVertex,
          );
          cell.colors.push(
            materialColor.r * sourceColor.r,
            materialColor.g * sourceColor.g,
            materialColor.b * sourceColor.b,
          );
        } else {
          cell.colors.push(materialColor.r, materialColor.g, materialColor.b);
        }
      }
      cell.triangles += 1;
      cells.set(key, cell);
    }
  });
  // A few road-edge slivers fall just over a cell boundary. Folding only
  // sub-200-triangle slivers into their nearest substantial neighbour avoids
  // per-cell bookkeeping for a narrow strip of paving while retaining spatial
  // culling for the authored architecture.
  for (const [key, cell] of [...cells]) {
    if (cell.triangles >= 200) continue;
    const [cellX, cellZ] = key.split(':').map(Number) as [number, number];
    let nearest: [string, Cell] | undefined;
    let nearestDistance = Infinity;
    for (const candidate of cells) {
      if (candidate[0] === key || candidate[1].triangles < 200) continue;
      const [candidateX, candidateZ] = candidate[0].split(':').map(Number) as [
        number,
        number,
      ];
      const distance =
        Math.abs(candidateX - cellX) + Math.abs(candidateZ - cellZ);
      if (distance < nearestDistance) {
        nearest = candidate;
        nearestDistance = distance;
      }
    }
    if (!nearest) continue;
    nearest[1].positions.push(...cell.positions);
    nearest[1].normals.push(...cell.normals);
    nearest[1].colors.push(...cell.colors);
    nearest[1].surfaces.push(...cell.surfaces);
    nearest[1].pbr.push(...cell.pbr);
    nearest[1].detailInfo.push(...cell.detailInfo);nearest[1].detailDimensions.push(...cell.detailDimensions);nearest[1].detailNormals.push(...cell.detailNormals);
    nearest[1].uvs.push(...cell.uvs);
    nearest[1].triangles += cell.triangles;
    cells.delete(key);
  }
  // Cull dense architecture in 13 m cells. Multi-draw batching keeps the draw-call
  // count fixed while portrait framing rejects off-screen facade detail.
  // Sparse distant silhouettes retain the coarser grid.
  for (const [key, cell] of [...cells]) {
    if (cell.triangles < 400) continue;
    const children = new Map<string, Cell>();
    for (let offset = 0; offset < cell.positions.length; offset += 9) {
      const centerX =
        (cell.positions[offset]! +
          cell.positions[offset + 3]! +
          cell.positions[offset + 6]!) /
        3;
      const centerZ =
        (cell.positions[offset + 2]! +
          cell.positions[offset + 5]! +
          cell.positions[offset + 8]!) /
        3;
      const childKey = `${key}@${Math.floor(centerX / 13)}:${Math.floor(centerZ / 13)}`;
      const child = children.get(childKey) ?? {
        positions: [],
        normals: [],
        colors: [],
        surfaces: [],
        pbr: [],
        detailInfo: [],
        detailDimensions: [],
        detailNormals: [],
        uvs: [],
        triangles: 0,
      };
      child.positions.push(...cell.positions.slice(offset, offset + 9));
      child.normals.push(...cell.normals.slice(offset, offset + 9));
      child.colors.push(...cell.colors.slice(offset, offset + 9));
      child.surfaces.push(...cell.surfaces.slice(offset / 3, offset / 3 + 3));
      child.pbr.push(...cell.pbr.slice(offset / 3 * 2, offset / 3 * 2 + 6));
      child.detailInfo.push(...cell.detailInfo.slice(offset / 3 * 4,offset / 3 * 4+12));
      child.detailDimensions.push(...cell.detailDimensions.slice(offset / 3 * 4,offset / 3 * 4+12));
      child.detailNormals.push(...cell.detailNormals.slice(offset,offset+9));
      child.uvs.push(...cell.uvs.slice(offset / 3 * 2, offset / 3 * 2 + 6));
      child.triangles += 1;
      children.set(childKey, child);
    }
    cells.delete(key);
    for (const child of children) cells.set(child[0], child[1]);
  }

  // Polygonal streets create many tiny 13 m edge fragments. Merge those into
  // their nearest sibling inside the same 104 m parent cell, but keep the
  // combined horizontal bounding radius below 35 m so culling stays local.
  // Attribute arrays move together, preserving every authored triangle/UV.
  const cellBounds = (cell: Cell) => {
    let minX=Infinity,minZ=Infinity,maxX=-Infinity,maxZ=-Infinity;
    for(let offset=0;offset<cell.positions.length;offset+=3){
      minX=Math.min(minX,cell.positions[offset]!);maxX=Math.max(maxX,cell.positions[offset]!);
      minZ=Math.min(minZ,cell.positions[offset+2]!);maxZ=Math.max(maxZ,cell.positions[offset+2]!);
    }
    return {minX,minZ,maxX,maxZ,cx:(minX+maxX)/2,cz:(minZ+maxZ)/2};
  };
  const mergeCell = (target:Cell,source:Cell) => {
    target.positions.push(...source.positions);target.normals.push(...source.normals);
    target.colors.push(...source.colors);target.surfaces.push(...source.surfaces);
    target.pbr.push(...source.pbr);
    target.uvs.push(...source.uvs);target.triangles+=source.triangles;
    target.detailInfo.push(...source.detailInfo);target.detailDimensions.push(...source.detailDimensions);target.detailNormals.push(...source.detailNormals);
  };
  for(const [key,cell] of [...cells].sort((left,right)=>left[1].triangles-right[1].triangles)){
    if(!cells.has(key)||cell.triangles>=100||!key.includes('@'))continue;
    const parent=key.split('@')[0],bounds=cellBounds(cell);
    let nearest:[string,Cell]|undefined,nearestDistance=Infinity;
    for(const candidate of cells){
      if(candidate[0]===key||candidate[0].split('@')[0]!==parent)continue;
      const other=cellBounds(candidate[1]);
      const width=Math.max(bounds.maxX,other.maxX)-Math.min(bounds.minX,other.minX);
      const depth=Math.max(bounds.maxZ,other.maxZ)-Math.min(bounds.minZ,other.minZ);
      if(Math.hypot(width,depth)/2>35)continue;
      const distance=Math.hypot(bounds.cx-other.cx,bounds.cz-other.cz);
      if(distance<nearestDistance){nearest=candidate;nearestDistance=distance;}
    }
    if(!nearest)continue;
    mergeCell(nearest[1],cell);cells.delete(key);
  }

  const city = new Group();
  city.name = 'eiffel-paris-1889-city';
  const material = new MeshStandardMaterial({
    color: '#ffffff',
    vertexColors: true,
    roughness: 0.85,
  });
  if (facadeTextures.size > 1) throw new Error('Paris city expects one shared facade texture');
  const facadeTexture = [...facadeTextures][0];
  if (facadeTexture) {
    facadeTexture.colorSpace = SRGBColorSpace;
    facadeTexture.wrapS = facadeTexture.wrapT = RepeatWrapping;
    facadeTexture.minFilter = LinearMipmapLinearFilter;
    facadeTexture.magFilter = LinearFilter;
    facadeTexture.generateMipmaps = true;
    facadeTexture.anisotropy = 8; // WebGL clamps to the device limit.
    facadeTexture.needsUpdate = true;
    material.map = facadeTexture;
    let disposed = false;
    material.addEventListener('dispose', () => {
      if (disposed) return;
      disposed = true;
      facadeTexture.dispose();
      // GLTFLoader's ImageBitmap needs explicit CPU-side release too.
      const bitmap = facadeTexture.source.data as {close?: () => void} | undefined;
      bitmap?.close?.();
    });
  }
  // Keep the authored palette and silhouettes, adding subtle stone courses at
  // viewing distances where they can be resolved. Derivatives fade subpixel
  // joints to prevent moire on the distant city. Dark roofs/foliage are excluded.
  material.onBeforeCompile = (shader) => {
    // Retain one material/draw batch. Ordinary surfaces sample no facade color;
    // mapped faces use the real GLB UVs and stock sRGB texture conversion.
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
#ifdef USE_MAP
  vec4 facadeColor = texture2D(map, vMapUv);
  diffuseColor *= mix(vec4(1.0), facadeColor, step(1.5, vParisSurface));
#endif
`);
    shader.vertexShader =
      'attribute vec2 parisPbr;\nvarying vec2 vParisPbr;\nattribute float parisSurface;\nvarying float vParisSurface;\nvarying vec3 vParisPosition;\nvarying vec3 vParisNormal;\n' +
      shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nvParisPosition = position;\nvParisNormal = normal;\nvParisSurface = parisSurface;\nvParisPbr = parisPbr;',
    );
    shader.fragmentShader =
      'varying vec2 vParisPbr;\nvarying float vParisSurface;\nvarying vec3 vParisPosition;\nvarying vec3 vParisNormal;\n' +
      shader.fragmentShader;
    // Preserve exported PBR roles through the one-material spatial batch.
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = vParisPbr.x;')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = vParisPbr.y;');
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `
      #include <color_fragment>
      float facadeMask = step(1.5, vParisSurface);
      float parisStone = smoothstep(0.24, 0.44, min(diffuseColor.r, diffuseColor.g)) * (1.0 - facadeMask);
      float parisWall = 1.0 - smoothstep(0.15, 0.4, abs(vParisNormal.y));
      float course = vParisPosition.y / 0.62;
      float footprint = fwidth(course);
      float edge = min(fract(course), 1.0 - fract(course));
      float seam = (1.0 - smoothstep(0.0, max(footprint, 0.025), edge))
        * (1.0 - smoothstep(0.18, 0.65, footprint));
      float patina = sin(vParisPosition.x * 0.83 + vParisPosition.z * 0.91)
        * sin(vParisPosition.y * 0.47 + vParisPosition.z * 0.13);
      diffuseColor.rgb *= 1.0 - parisStone * (parisWall * seam * 0.14 + (patina + 1.0) * 0.025);
      // Low-contrast, world-space wear on Blender-authored earth surfaces.
      // Derivatives remove fine ruts at distance; broad damp patches remain.
      vec2 yardUv = vParisPosition.xz;
      float damp = sin(yardUv.x * 0.17 + sin(yardUv.y * 0.11) * 2.0)
        * sin(yardUv.y * 0.13 + yardUv.x * 0.04);
      float rutCoord = yardUv.y * 1.8;
      float gateLane = exp(-pow((yardUv.y - 75.0) / 2.0, 2.0))
        * smoothstep(78.0, 88.0, yardUv.x) * (1.0 - smoothstep(152.0, 169.0, yardUv.x));
      float ruts = pow(0.5 + 0.5 * sin(rutCoord), 12.0)
        * (1.0 - smoothstep(0.3, 1.1, fwidth(rutCoord)));
      diffuseColor.rgb *= 1.0 + max(0.0, 1.0 - abs(vParisSurface - 1.0)) * (damp * 0.075 - ruts * gateLane * 0.12);
      // The economical north-bank silhouettes need window rhythm at the late
      // orbit. Analytic facade detail avoids adding thousands of tiny quads.
      float farBank = (1.0 - smoothstep(-405.0, -385.0, vParisPosition.z)) * parisWall * (1.0 - facadeMask);
      float facadeX = mix(vParisPosition.x, vParisPosition.z, step(0.5, abs(vParisNormal.x)));
      float facadeY = vParisPosition.y - min(0.0, (vParisPosition.z + 90.0) * 0.0225);
      vec2 windowGrid = vec2(facadeX / 4.3, facadeY / 3.2);
      vec2 pixel = max(fwidth(windowGrid), vec2(0.015));
      vec2 tile = fract(windowGrid);
      vec2 opening = smoothstep(vec2(0.29, 0.25) - pixel, vec2(0.29, 0.25) + pixel, tile)
        * (1.0 - smoothstep(vec2(0.63, 0.8) - pixel, vec2(0.63, 0.8) + pixel, tile));
      float windows = opening.x * opening.y * farBank * smoothstep(1.8, 3.0, facadeY)
        * (1.0 - smoothstep(0.38, 0.85, max(pixel.x, pixel.y)));
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.047, 0.068, 0.080), windows * 0.85);

    `,
    );
  };
  material.customProgramCacheKey = () => 'paris-stone-courses-facade-map-pbr-v5';
  configureParisDetail(material,detailAnalysis);
  const triangleCount = [...cells.values()].reduce(
    (sum, cell) => sum + cell.triangles,
    0,
  );
  const mesh = new BatchedMesh(cells.size, triangleCount * 3, 0, material);
  mesh.name = 'eiffel-paris-city-batch';
  mesh.perObjectFrustumCulled = true;
  mesh.sortObjects = false;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  const cellMetadata: {
    key: string;
    geometryId: number;
    instanceId: number;
    triangles: number;
    min: number[];
    max: number[];
  }[] = [];
  for (const [key, cell] of [...cells].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      'position',
      new Float32BufferAttribute(cell.positions, 3),
    );
    geometry.setAttribute(
      'normal',
      new Float32BufferAttribute(cell.normals, 3),
    );
    geometry.setAttribute('color', new Float32BufferAttribute(cell.colors, 3));
    geometry.setAttribute('parisPbr', new Float32BufferAttribute(cell.pbr, 2));
    geometry.setAttribute('parisSurface', new Float32BufferAttribute(cell.surfaces, 1));
    geometry.setAttribute('parisDetailInfo',new Float32BufferAttribute(cell.detailInfo,4));
    geometry.setAttribute('parisDetailDimensions',new Float32BufferAttribute(cell.detailDimensions,4));
    geometry.setAttribute('parisDetailNormal',new Float32BufferAttribute(cell.detailNormals,3));
    geometry.setAttribute('uv', new Float32BufferAttribute(cell.uvs, 2));
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const geometryId = mesh.addGeometry(geometry);
    const instanceId = mesh.addInstance(geometryId);
    mesh.setMatrixAt(instanceId, new Matrix4());
    cellMetadata.push({
      key,
      geometryId,
      instanceId,
      triangles: cell.triangles,
      min: geometry.boundingBox!.min.toArray(),
      max: geometry.boundingBox!.max.toArray(),
    });
    geometry.dispose();
  }
  mesh.userData.cells = cellMetadata;
  city.add(mesh);
  city.userData.sourceTriangles = triangleCount;
  city.userData.poolPavingAudit = poolPavingAudit;
  city.userData.detailFilter={enabled:detailAnalysis.enabled,reason:detailAnalysis.reason,counts:detailAnalysis.counts};
  const sourceGeometries = new Set<BufferGeometry>();
  const sourceMaterials = new Set<Material>();
  source.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    sourceGeometries.add(object.geometry);
    for (const sourceMaterial of Array.isArray(object.material)
      ? object.material
      : [object.material]) {
      sourceMaterials.add(sourceMaterial);
    }
  });
  for (const geometry of sourceGeometries) geometry.dispose();
  for (const sourceMaterial of sourceMaterials) sourceMaterial.dispose();
  onStep?.();
  return city;
}

export async function loadEiffelParisLife(): Promise<{
  root: Group;
  prototypes: Map<EiffelParisPrototypeKind, Object3D>;
}> {
  const root = await parseGlb(EIFFEL_PARIS_LIFE_GLB);
  root.name = 'eiffel-paris-1889-life-prototypes';
  const prototypes = new Map<EiffelParisPrototypeKind, Object3D>();
  for (const name of EIFFEL_PARIS_LIFE_ROOTS) {
    const normalized = name.replaceAll('-', '').toLowerCase();
    const prototype =
      root.getObjectByName(name) ??
      root.children.find((child) =>
        child.name
          .replaceAll(/[-_]/g, '')
          .toLowerCase()
          .match(new RegExp(`^${normalized}\\d*$`)),
      );
    if (!prototype) throw new Error(`Paris life asset is missing root ${name}`);
    prototypes.set(name, prototype);
  }
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = true;
  });
  return { root, prototypes };
}
