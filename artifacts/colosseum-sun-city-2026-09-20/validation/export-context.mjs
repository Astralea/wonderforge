// artifacts/colosseum-sun-city-2026-09-20/export-context.ts
import { writeFileSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";

// src/data/colosseumAqueduct.ts
var COLOSSEUM_AQUEDUCT = {
  glb: "/models/colosseum-rome/neronian-aqueduct.glb",
  pierCount: 28,
  clearSpan: 7.75,
  pierWidth: 2.3,
  depth: 2.1,
  archRise: 3.875,
  spandrelTop: 4.65,
  channelHeight: 1.8,
  capHeight: 0.22,
  capDepth: 2.55,
  springingHeight: 25.2,
  grade: 1e-3,
  start: [72, -288],
  direction: [14 / Math.hypot(14, 6), -6 / Math.hypot(14, 6)],
  desktopSegments: 10,
  portraitSegments: 7,
  /** Distant silhouette continues the utility past the cinematic fog envelope. */
  continuationBays: 230,
  continuationSegments: 3
};

// src/data/colosseumUrbanContext.ts
var length = (COLOSSEUM_AQUEDUCT.pierCount - 1) * (COLOSSEUM_AQUEDUCT.clearSpan + COLOSSEUM_AQUEDUCT.pierWidth);
var beside = (distance, offset) => [
  COLOSSEUM_AQUEDUCT.start[0] + COLOSSEUM_AQUEDUCT.direction[0] * distance - COLOSSEUM_AQUEDUCT.direction[1] * offset,
  COLOSSEUM_AQUEDUCT.start[1] + COLOSSEUM_AQUEDUCT.direction[1] * distance + COLOSSEUM_AQUEDUCT.direction[0] * offset
];
var COLOSSEUM_URBAN_CONTEXT = {
  id: "flavian-caelian-context",
  dateRange: [70, 80],
  compass: "+X east, +Z north",
  productionNote: "Original compressed Caelian precinct and street layout; no claim of exact plots, elevations or restoration state. No direct Colosseum water supply is depicted.",
  sources: [
    "https://www.turismoroma.it/en/node/1137",
    "https://www.sovraintendenzaroma.it/content/acquedotto-neroniano",
    "https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Frontinus/De_Aquis/Rodgers/1%2A%2A.html#20"
  ],
  assets: ["/models/colosseum-rome/rome-kit.glb", "/models/colosseum-rome/housing-variants.glb", COLOSSEUM_AQUEDUCT.glb],
  precinct: {
    id: "claudian-precinct",
    center: [12, -308],
    width: 118,
    depth: 88,
    // Covered conduit enters the east retaining wall just below terrace level.
    top: COLOSSEUM_AQUEDUCT.springingHeight + COLOSSEUM_AQUEDUCT.spandrelTop + COLOSSEUM_AQUEDUCT.channelHeight + COLOSSEUM_AQUEDUCT.capHeight + 0.04,
    northEntryWidth: 18
  },
  watercourse: {
    id: "neronian-caelian-branch",
    from: "east-caelian-continuation",
    to: "claudian-precinct-east-wall",
    visibleJoin: beside(length, 0),
    upstream: beside(length + COLOSSEUM_AQUEDUCT.continuationBays * (COLOSSEUM_AQUEDUCT.clearSpan + COLOSSEUM_AQUEDUCT.pierWidth), 0),
    upstreamKind: "off-scene-continuation",
    receiver: beside(-COLOSSEUM_AQUEDUCT.pierWidth / 2, 0),
    corridorHalfWidth: 5
  },
  streets: [
    { id: "caelian-arcade-street", width: 7, points: [beside(4, 23), beside(length + 48, 23)] },
    { id: "caelian-south-street", width: 5.5, points: [beside(20, -24), beside(length + 48, -24)] },
    { id: "precinct-north-approach", width: 8, points: [[12, -226], [12, -202], [72, -178], [142, -153], [220, -60], [250, 12]] },
    { id: "caelian-west-link", width: 6, points: [[12, -226], [74, -248], beside(4, 23)] },
    // Authored lanes connect the western neighbourhoods; they are not surveyed
    // ancient street alignments. Shared clearance keeps their whole width open.
    { id: "velia-palatine-lane", width: 4.5, points: [[-140, 125], [-202, 170], [-278, 185], [-330, 125], [-405, 60], [-450, -20], [-540, 30], [-700, 90]] },
    { id: "velia-north-lane", width: 4, points: [[-278, 185], [-260, 240], [-220, 300]] }
  ]
};

// src/engine/colosseumTerrain.ts
var COLOSSEUM_HILLS = [
  { id: "palatine", x: -400, z: -80, sigma: 145, height: 32 },
  { id: "caelian", x: 90, z: -380, sigma: 125, height: 22 },
  { id: "esquiline", x: 300, z: 260, sigma: 140, height: 14 },
  { id: "aventine", x: -340, z: -540, sigma: 130, height: 12 },
  { id: "quirinal", x: -220, z: 620, sigma: 130, height: 18 },
  { id: "viminal", x: 280, z: 540, sigma: 120, height: 16 },
  { id: "janiculum", x: -720, z: 80, sigma: 160, height: 22 },
  { id: "velia", x: -235, z: 195, sigma: 88, height: 18 },
  { id: "oppian", x: 110, z: 300, sigma: 105, height: 12 }
];
var COLOSSEUM_WESTERN_RIDGES = [
  { x: -860, z: 480, spreadX: 270, spreadZ: 260, height: 38 },
  { x: -1030, z: 140, spreadX: 280, spreadZ: 410, height: 36 },
  { x: -1300, z: -510, spreadX: 300, spreadZ: 330, height: 30 },
  { x: -1440, z: 700, spreadX: 350, spreadZ: 350, height: 32 }
];
function colosseumWesternReliefAt(x, z) {
  if (x >= -520) return 0;
  const ramp = Math.min(1, (-x - 520) / 230);
  const envelope = ramp * ramp * (3 - 2 * ramp);
  let relief = 0;
  for (const ridge of COLOSSEUM_WESTERN_RIDGES) {
    const dx = (x - ridge.x) / ridge.spreadX;
    const dz = (z - ridge.z) / ridge.spreadZ;
    relief = Math.max(relief, Math.exp(-(dx * dx + dz * dz) / 2) * ridge.height);
  }
  return relief * envelope;
}
function colosseumTerrainHeightAt(x, z) {
  const site = Math.hypot(x, z);
  const flatten = site <= 140 ? 0 : site >= 220 ? 1 : (site - 140) / 80;
  let height = 0;
  for (const hill of COLOSSEUM_HILLS) {
    const dx = x - hill.x;
    const dz = z - hill.z;
    height += Math.exp(-(dx * dx + dz * dz) / (2 * hill.sigma * hill.sigma)) * hill.height;
  }
  return Math.max(height, colosseumWesternReliefAt(x, z)) * flatten;
}

// src/engine/colosseumAqueduct.ts
var AQUEDUCT_PITCH = COLOSSEUM_AQUEDUCT.clearSpan + COLOSSEUM_AQUEDUCT.pierWidth;
var AQUEDUCT_LENGTH = (COLOSSEUM_AQUEDUCT.pierCount - 1) * AQUEDUCT_PITCH;
function aqueductPointAt(distance) {
  return {
    x: COLOSSEUM_AQUEDUCT.start[0] + COLOSSEUM_AQUEDUCT.direction[0] * distance,
    z: COLOSSEUM_AQUEDUCT.start[1] + COLOSSEUM_AQUEDUCT.direction[1] * distance,
    springing: COLOSSEUM_AQUEDUCT.springingHeight + distance * COLOSSEUM_AQUEDUCT.grade
  };
}
function aqueductPierAt(index) {
  const distance = index * AQUEDUCT_PITCH;
  const point = aqueductPointAt(distance);
  let ground = Infinity;
  for (const along of [-COLOSSEUM_AQUEDUCT.pierWidth / 2, COLOSSEUM_AQUEDUCT.pierWidth / 2]) {
    for (const across of [-COLOSSEUM_AQUEDUCT.depth / 2, COLOSSEUM_AQUEDUCT.depth / 2]) {
      const x = point.x + COLOSSEUM_AQUEDUCT.direction[0] * along - COLOSSEUM_AQUEDUCT.direction[1] * across;
      const z = point.z + COLOSSEUM_AQUEDUCT.direction[1] * along + COLOSSEUM_AQUEDUCT.direction[0] * across;
      ground = Math.min(ground, colosseumTerrainHeightAt(x, z));
    }
  }
  return { ...point, distance, ground: ground - 0.05 };
}

// src/engine/colosseumUrbanContext.ts
function distanceToRomeSegment(x, z, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}
function isClearOfRomeContext(x, z, radius) {
  const p = COLOSSEUM_URBAN_CONTEXT.precinct;
  if (Math.abs(x - p.center[0]) < p.width / 2 + radius + 2 && Math.abs(z - p.center[1]) < p.depth / 2 + radius + 2) return false;
  const stairFoot = COLOSSEUM_URBAN_CONTEXT.streets.find((street2) => street2.id === "precinct-north-approach").points[0];
  if (Math.abs(x - p.center[0]) < p.northEntryWidth / 2 + radius + 2 && z > p.center[1] + p.depth / 2 - radius && z < stairFoot[1] + radius) return false;
  if (distanceToRomeSegment(x, z, COLOSSEUM_AQUEDUCT.start, COLOSSEUM_URBAN_CONTEXT.watercourse.upstream) < COLOSSEUM_URBAN_CONTEXT.watercourse.corridorHalfWidth + radius) return false;
  for (const street2 of COLOSSEUM_URBAN_CONTEXT.streets) {
    for (let i = 1; i < street2.points.length; i++) {
      if (distanceToRomeSegment(x, z, street2.points[i - 1], street2.points[i]) < street2.width / 2 + radius) return false;
    }
  }
  return true;
}
function createCaelianStreetFronts() {
  const lots = [];
  for (const side of [-1, 1]) {
    for (let row = 0; row < 2; row++) {
      for (let bay = 0; bay < 11; bay++) {
        if (row === 1 && bay % 4 === 2) continue;
        const along = 25 + bay * 29 + row * 9;
        const offset = side * (49 + row * 32);
        const p = aqueductPointAt(along);
        const x = p.x - COLOSSEUM_AQUEDUCT.direction[1] * offset, z = p.z + COLOSSEUM_AQUEDUCT.direction[0] * offset;
        const scale = 1.2 + (bay + row * 2 + (side + 1)) % 4 * 0.1;
        if (!isClearOfRomeContext(x, z, 7.4 * scale)) continue;
        lots.push({ kind: "insula", x, z, yaw: -Math.atan2(COLOSSEUM_AQUEDUCT.direction[1], COLOSSEUM_AQUEDUCT.direction[0]) + (side < 0 ? Math.PI : 0), scale, district: "caelian-watercourse" });
      }
    }
  }
  return lots;
}
function caelianLotFoundation(lot) {
  const corners = [];
  for (const [u, v] of [[-5.5, -4.6], [5.5, -4.6], [5.5, 4.6], [-5.5, 4.6]]) {
    const x = lot.x + (Math.cos(lot.yaw) * u + Math.sin(lot.yaw) * v) * lot.scale;
    const z = lot.z + (-Math.sin(lot.yaw) * u + Math.cos(lot.yaw) * v) * lot.scale;
    corners.push({ x, z, ground: colosseumTerrainHeightAt(x, z) });
  }
  return { corners, top: Math.max(colosseumTerrainHeightAt(lot.x, lot.z), ...corners.map((p) => p.ground)) + 0.12 };
}
function romeContextManifest() {
  return {
    ...COLOSSEUM_URBAN_CONTEXT,
    aqueduct: { ...COLOSSEUM_AQUEDUCT, length: AQUEDUCT_LENGTH },
    streetFronts: createCaelianStreetFronts(),
    evidenceScope: "Typed authored context and existing Blender kits; see dated browser captures for film acceptance."
  };
}

// src/engine/random.ts
function xfnv1a(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed) {
  let a = xfnv1a(seed);
  return () => {
    a = a + 1831565813 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// src/data/colosseumConstruction.ts
var COLOSSEUM_MAJOR = 188;
var COLOSSEUM_MINOR = 156;
var COLOSSEUM_A = 94;
var COLOSSEUM_B = 78;
var COLOSSEUM_HEIGHT = 48;
var COLOSSEUM_ARENA_A = 41.5;
var COLOSSEUM_ARENA_B = 24;
var COLOSSEUM_BAYS = 80;
var COLOSSEUM_STOREY_HEIGHT = 11.5;
var COLOSSEUM_ATTIC_HEIGHT = 10.5;
var COLOSSEUM_FOUNDATION_HEIGHT = 3.5;
var COLOSSEUM_PODIUM_HEIGHT = 4.4;
var COLOSSEUM_WAGON_BED = 0.9;
var COLOSSEUM_MAX_ACTIVE = 24;
var COLOSSEUM_QUARRY = [172, 1.2, 10];
var PODIUM_A = 43.2;
var PODIUM_B = 25.8;
var INNER_ARCADE_A = 57.5;
var INNER_ARCADE_B = 40.5;
var INTER_ARCADE_A = 74;
var INTER_ARCADE_B = 60.5;
var CAVEA_IMA = { innerA: 45, innerB: 27.4, outerA: 56.2, outerB: 39.4, height: 13.2, foot: 4.4 };
var CAVEA_MEDIA = { innerA: 59, innerB: 42, outerA: 72.4, outerB: 58.8, height: 13.6, foot: 17.6 };
var CAVEA_SUMMA = { innerA: 76, innerB: 62.2, outerA: 91.4, outerB: 75.6, height: 11.8, foot: 31.2 };
var LAYERS = [
  { id: "roman-valley-sky", depth: 0, motion: "playback-time" },
  { id: "palatine-caelian", depth: 1, motion: "static-world-space" },
  { id: "drained-valley", depth: 2, motion: "playback-time" },
  { id: "amphitheatre", depth: 3, motion: "playback-time" },
  { id: "work-systems", depth: 4, motion: "playback-time" },
  { id: "foreground-road", depth: 5, motion: "static-world-space" }
];
function ellipsePoint(a, b, theta) {
  return [a * Math.cos(theta), b * Math.sin(theta)];
}
function ellipseOutward(a, b, theta) {
  const nx = b * Math.cos(theta);
  const nz = a * Math.sin(theta);
  const length2 = Math.hypot(nx, nz) || 1;
  return [nx / length2, nz / length2];
}
function ellipseYaw(a, b, theta) {
  const [nx, nz] = ellipseOutward(a, b, theta);
  return Math.atan2(nx, nz);
}
function bayTheta(bay) {
  return bay / COLOSSEUM_BAYS * Math.PI * 2 - Math.PI / 2;
}
function bayWidth(a, b, theta) {
  return Math.hypot(a * Math.sin(theta), b * Math.cos(theta)) * (Math.PI * 2 / COLOSSEUM_BAYS);
}
function ellipseRadius(a, b, theta) {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return 1 / Math.hypot(c / a, s / b);
}
function part(partial) {
  return { ...partial, scale: [1, 1, 1], routeId: "tivoli-east" };
}
function createColosseumConstructionPlan() {
  const rand = mulberry32("colosseum-flavian-v1");
  const parts = [];
  const routes = [
    {
      id: "tivoli-east",
      quarry: COLOSSEUM_QUARRY,
      road: [128, 0.4, 6],
      staging: [108, 0.5, 4],
      laneWidth: 4.2
    }
  ];
  for (let segment = 0; segment < 16; segment += 1) {
    const theta = segment / 16 * Math.PI * 2 - Math.PI / 2;
    const [x, z] = ellipsePoint((COLOSSEUM_A + COLOSSEUM_ARENA_A) / 2, (COLOSSEUM_B + COLOSSEUM_ARENA_B) / 2, theta);
    const yaw = ellipseYaw(COLOSSEUM_A, COLOSSEUM_B, theta);
    parts.push(part({
      id: `foundation-${segment}`,
      group: "foundation",
      kind: "block",
      bay: segment * 5,
      storey: -1,
      dimensions: [18.4, COLOSSEUM_FOUNDATION_HEIGHT, 14.2],
      finalPosition: [x, COLOSSEUM_FOUNDATION_HEIGHT / 2, z],
      finalRotation: [0, yaw, 0],
      material: "pozzolana",
      lane: segment % 3,
      start: 0.11 + segment * 7e-3,
      duration: 0.04,
      colorVariation: rand() * 2 - 1
    }));
  }
  const storeyWindow = [
    { storey: 0, origin: 0.12, span: 0.24, duration: 0.03 },
    { storey: 1, origin: 0.34, span: 0.22, duration: 0.028 },
    { storey: 2, origin: 0.55, span: 0.18, duration: 0.022 }
  ];
  const arcadeHeight = COLOSSEUM_STOREY_HEIGHT;
  for (const wave of storeyWindow) {
    const y = COLOSSEUM_FOUNDATION_HEIGHT + wave.storey * arcadeHeight + arcadeHeight / 2;
    for (let bay = 0; bay < COLOSSEUM_BAYS; bay += 1) {
      const theta = bayTheta(bay);
      const [nx, nz] = ellipseOutward(COLOSSEUM_A, COLOSSEUM_B, theta);
      const [x, z] = ellipsePoint(COLOSSEUM_A - 1.4, COLOSSEUM_B - 1.2, theta);
      const yaw = ellipseYaw(COLOSSEUM_A, COLOSSEUM_B, theta);
      const spacing = bayWidth(COLOSSEUM_A, COLOSSEUM_B, theta);
      parts.push(part({
        id: `arcade-${wave.storey}-${bay}`,
        group: "arcade",
        kind: "arch",
        bay,
        storey: wave.storey,
        dimensions: [spacing * 0.94, arcadeHeight - 0.35, 3.35],
        finalPosition: [x + nx * 0.2, y, z + nz * 0.2],
        finalRotation: [0, yaw, 0],
        material: "travertine",
        lane: bay % 4,
        start: wave.origin + bay * (wave.span / COLOSSEUM_BAYS),
        duration: wave.duration,
        colorVariation: rand() * 2 - 1
      }));
    }
  }
  for (let bay = 0; bay < COLOSSEUM_BAYS; bay += 1) {
    const theta = bayTheta(bay);
    const [nx, nz] = ellipseOutward(COLOSSEUM_A, COLOSSEUM_B, theta);
    const [x, z] = ellipsePoint(COLOSSEUM_A - 1.2, COLOSSEUM_B - 1, theta);
    const yaw = ellipseYaw(COLOSSEUM_A, COLOSSEUM_B, theta);
    const y = COLOSSEUM_FOUNDATION_HEIGHT + 3 * arcadeHeight + COLOSSEUM_ATTIC_HEIGHT / 2;
    parts.push(part({
      id: `attic-${bay}`,
      group: "attic",
      kind: "block",
      bay,
      storey: 3,
      dimensions: [
        bayWidth(COLOSSEUM_A, COLOSSEUM_B, theta) * 0.94,
        COLOSSEUM_ATTIC_HEIGHT - 0.4,
        2.9
      ],
      finalPosition: [x + nx * 0.15, y, z + nz * 0.15],
      finalRotation: [0, yaw, 0],
      material: "travertine",
      lane: bay % 4,
      start: 0.74 + bay * (0.12 / COLOSSEUM_BAYS),
      duration: 0.01,
      colorVariation: rand() * 2 - 1
    }));
  }
  const innerArcadeWindow = [
    { storey: 0, a: INNER_ARCADE_A, b: INNER_ARCADE_B, origin: 0.48, span: 0.12, duration: 7e-3, depth: 2.7, prefix: "inner-arcade" },
    { storey: 0, a: INTER_ARCADE_A, b: INTER_ARCADE_B, origin: 0.5, span: 0.12, duration: 7e-3, depth: 2.85, prefix: "inter-arcade" }
  ];
  for (const wave of innerArcadeWindow) {
    const rise = wave.prefix === "inner-arcade" ? 8.4 : arcadeHeight - 0.45;
    const y = wave.prefix === "inner-arcade" ? COLOSSEUM_FOUNDATION_HEIGHT + rise / 2 : COLOSSEUM_FOUNDATION_HEIGHT + wave.storey * arcadeHeight + arcadeHeight / 2;
    for (let bay = 0; bay < COLOSSEUM_BAYS; bay += 1) {
      const theta = bayTheta(bay);
      const [x, z] = ellipsePoint(wave.a, wave.b, theta);
      const yaw = ellipseYaw(wave.a, wave.b, theta);
      parts.push(part({
        id: `${wave.prefix}-${wave.storey}-${bay}`,
        group: "inner-arcade",
        kind: "arch",
        bay,
        storey: wave.storey,
        dimensions: [bayWidth(wave.a, wave.b, theta) * 0.94, rise, wave.depth],
        finalPosition: [x, y, z],
        finalRotation: [0, yaw, 0],
        material: "travertine",
        lane: bay % 4,
        start: wave.origin + bay * (wave.span / COLOSSEUM_BAYS),
        duration: wave.duration,
        colorVariation: rand() * 2 - 1
      }));
    }
  }
  for (let bay = 0; bay < COLOSSEUM_BAYS; bay += 1) {
    const theta = bayTheta(bay);
    const yaw = ellipseYaw(COLOSSEUM_A, COLOSSEUM_B, theta);
    const arcade = parts.find((entry) => entry.id === `arcade-0-${bay}`);
    const [podiumX, podiumZ] = ellipsePoint(PODIUM_A, PODIUM_B, theta);
    parts.push(part({
      id: `podium-${bay}`,
      group: "podium",
      kind: "block",
      bay,
      storey: 0,
      dimensions: [bayWidth(PODIUM_A, PODIUM_B, theta) * 1.04, COLOSSEUM_PODIUM_HEIGHT, 2.4],
      finalPosition: [podiumX, COLOSSEUM_PODIUM_HEIGHT / 2, podiumZ],
      finalRotation: [0, yaw, 0],
      material: "travertine",
      lane: bay % 4,
      start: Math.max(0.16 + bay * (0.16 / COLOSSEUM_BAYS), 0.08),
      duration: 8e-3,
      colorVariation: rand() * 2 - 1
    }));
    const radialInner = ellipseRadius(PODIUM_A + 1.2, PODIUM_B + 1.1, theta);
    const radialOuter = ellipseRadius(COLOSSEUM_A - 4.2, COLOSSEUM_B - 3.6, theta);
    const radialSpan = radialOuter - radialInner;
    const radialMid = (radialInner + radialOuter) / 2;
    const radialX = Math.cos(theta) * radialMid;
    const radialZ = Math.sin(theta) * radialMid;
    const radialStart = Math.max(0.38 + bay * (0.12 / COLOSSEUM_BAYS), arcade.start + arcade.duration + 6e-3);
    parts.push(part({
      id: `radial-${bay}`,
      group: "radial",
      kind: "block",
      bay,
      storey: 0,
      dimensions: [1.85, 9.8, radialSpan],
      finalPosition: [radialX, COLOSSEUM_FOUNDATION_HEIGHT + 4.9, radialZ],
      finalRotation: [0, yaw, 0],
      material: "tuff",
      lane: bay % 3,
      start: radialStart,
      duration: 8e-3,
      colorVariation: rand() * 2 - 1
    }));
    const vaultMid = (ellipseRadius(INNER_ARCADE_A, INNER_ARCADE_B, theta) + ellipseRadius(INTER_ARCADE_A, INTER_ARCADE_B, theta)) / 2;
    const vaultX = Math.cos(theta) * vaultMid;
    const vaultZ = Math.sin(theta) * vaultMid;
    const vaultStart = Math.max(0.58 + bay * (0.14 / COLOSSEUM_BAYS), radialStart + 0.01);
    parts.push(part({
      id: `vault-${bay}`,
      group: "vault",
      kind: "block",
      bay,
      storey: 0,
      dimensions: [bayWidth(INNER_ARCADE_A, INNER_ARCADE_B, theta) * 1.02, 3.2, 14.4],
      finalPosition: [vaultX, COLOSSEUM_FOUNDATION_HEIGHT + 9.8 + 1.6, vaultZ],
      finalRotation: [0, yaw, 0],
      material: "pozzolana",
      lane: bay % 3,
      start: vaultStart,
      duration: 8e-3,
      colorVariation: rand() * 2 - 1
    }));
    const imaArcade = arcade;
    const mediaArcade = parts.find((entry) => entry.id === `arcade-1-${bay}`);
    const summaArcade = parts.find((entry) => entry.id === `arcade-2-${bay}`);
    const imaStart = Math.max(
      0.6 + bay * (0.12 / COLOSSEUM_BAYS),
      vaultStart + 0.01,
      imaArcade.start + imaArcade.duration + 8e-3
    );
    const mediaStart = Math.max(
      0.76 + bay * (0.08 / COLOSSEUM_BAYS),
      imaStart + 0.012,
      mediaArcade.start + mediaArcade.duration + 8e-3
    );
    const summaStart = Math.max(
      0.78 + bay * (0.07 / COLOSSEUM_BAYS),
      mediaStart + 0.01,
      summaArcade.start + summaArcade.duration + 8e-3
    );
    const maeniana = [
      { id: "ima", band: CAVEA_IMA, storey: 0, start: imaStart, material: "travertine" },
      { id: "media", band: CAVEA_MEDIA, storey: 1, start: mediaStart, material: "travertine" },
      { id: "summa", band: CAVEA_SUMMA, storey: 2, start: summaStart, material: "timber" }
    ];
    for (const maenianum of maeniana) {
      const midA = (maenianum.band.innerA + maenianum.band.outerA) / 2;
      const midB = (maenianum.band.innerB + maenianum.band.outerB) / 2;
      const [seatX, seatZ] = ellipsePoint(midA, midB, theta);
      const radial = ellipseRadius(maenianum.band.outerA, maenianum.band.outerB, theta) - ellipseRadius(maenianum.band.innerA, maenianum.band.innerB, theta);
      parts.push(part({
        id: `cavea-${maenianum.id}-${bay}`,
        group: "cavea",
        kind: "seat",
        bay,
        storey: maenianum.storey,
        dimensions: [bayWidth(midA, midB, theta) * 1.08, maenianum.band.height, radial],
        finalPosition: [seatX, maenianum.band.foot + maenianum.band.height / 2, seatZ],
        finalRotation: [0, yaw, 0],
        material: maenianum.material,
        lane: bay % 4,
        start: maenianum.start,
        duration: 6e-3,
        colorVariation: rand() * 2 - 1
      }));
    }
  }
  const arenaSectors = 16;
  for (let sector = 0; sector < arenaSectors; sector += 1) {
    const theta = (sector + 0.5) / arenaSectors * Math.PI * 2 - Math.PI / 2;
    const yaw = ellipseYaw(COLOSSEUM_ARENA_A, COLOSSEUM_ARENA_B, theta);
    const [x, z] = ellipsePoint(COLOSSEUM_ARENA_A * 0.5, COLOSSEUM_ARENA_B * 0.5, theta);
    const radial = ellipseRadius(COLOSSEUM_ARENA_A, COLOSSEUM_ARENA_B, theta) * 0.96;
    const chord = bayWidth(COLOSSEUM_ARENA_A, COLOSSEUM_ARENA_B, theta) * (COLOSSEUM_BAYS / arenaSectors) * 1.12;
    parts.push(part({
      id: `arena-${sector}`,
      group: "arena",
      kind: "plank",
      bay: Math.round(sector / arenaSectors * COLOSSEUM_BAYS) % COLOSSEUM_BAYS,
      storey: 0,
      dimensions: [chord, 0.22, radial],
      finalPosition: [x, 0.24, z],
      finalRotation: [0, yaw, 0],
      material: "timber",
      lane: sector % 3,
      start: 0.76 + sector * (0.08 / arenaSectors),
      duration: 0.01,
      colorVariation: rand() * 2 - 1
    }));
  }
  return {
    seed: "colosseum-flavian-v1",
    major: COLOSSEUM_MAJOR,
    minor: COLOSSEUM_MINOR,
    height: COLOSSEUM_HEIGHT,
    bays: COLOSSEUM_BAYS,
    wagonBedHeight: COLOSSEUM_WAGON_BED,
    maxActive: COLOSSEUM_MAX_ACTIVE,
    parts,
    routes,
    layers: LAYERS.map((layer) => ({ ...layer })),
    keepOuts: [
      { id: "arena", minX: -COLOSSEUM_ARENA_A - 2, maxX: COLOSSEUM_ARENA_A + 2, minZ: -COLOSSEUM_ARENA_B - 2, maxZ: COLOSSEUM_ARENA_B + 2 },
      { id: "east-road", minX: 100, maxX: 176, minZ: -8, maxZ: 16 }
    ]
  };
}
var COLOSSEUM_CONSTRUCTION = createColosseumConstructionPlan();

// src/data/colosseumHousing.ts
var COLOSSEUM_HOUSING_HALF_WIDTH = 5.5;
var COLOSSEUM_HOUSING_HALF_DEPTH = 4.6;
var COLOSSEUM_HOUSING_RADIUS = 7.4;

// src/engine/colosseumRomeLots.ts
var OVAL_KEEP = 2.15;
function onOval(x, z) {
  return Math.hypot(x / COLOSSEUM_A, z / COLOSSEUM_B) < OVAL_KEEP;
}
function onHaul(x, z) {
  return x > 88 && x < 240 && Math.abs(z) < 48;
}
function valleyFootLots(rand, kind, count, minR, maxR) {
  const lots = [];
  let attempts = 0;
  while (lots.length < count && attempts < count * 16) {
    attempts += 1;
    const angle = rand() * Math.PI * 2;
    const radius = minR + rand() * (maxR - minR);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (onOval(x, z) || onHaul(x, z)) continue;
    lots.push({
      kind,
      x,
      z,
      yaw: facingValley(x, z) + (rand() - 0.5) * 0.16,
      scale: kind === "palace" ? 1.05 + rand() * 0.28 : 1.35 + rand() * 0.7
    });
  }
  return lots;
}
function facingValley(x, z) {
  return Math.atan2(-x, -z);
}
function gridLots(rand, hillId, cols, rows, spacingX, spacingZ, kind, minGround) {
  const hill = COLOSSEUM_HILLS.find((item) => item.id === hillId);
  if (!hill) return [];
  const lots = [];
  const yaw0 = facingValley(hill.x, hill.z);
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const offset = hillId === "palatine" || hillId === "velia" ? 1 : 0;
      if ((col + offset) % 4 === 3 || (row + offset) % 5 === 4) continue;
      const jitterX = (rand() - 0.5) * spacingX * 0.18;
      const jitterZ = (rand() - 0.5) * spacingZ * 0.18;
      const localX = (col - (cols - 1) / 2 + row % 2 * 0.25) * spacingX + jitterX;
      const localZ = (row - (rows - 1) / 2) * spacingZ + jitterZ;
      const x = hill.x + Math.cos(yaw0) * localX + Math.sin(yaw0) * localZ;
      const z = hill.z - Math.sin(yaw0) * localX + Math.cos(yaw0) * localZ;
      if (onOval(x, z) || onHaul(x, z)) continue;
      const ground = colosseumTerrainHeightAt(x, z);
      if (ground < minGround) continue;
      const streetYaw = yaw0 + (row % 2 ? Math.PI : 0);
      lots.push({
        kind,
        x,
        z,
        yaw: streetYaw + (rand() - 0.5) * 0.1,
        scale: kind === "palace" ? 1.1 + rand() * 0.22 : 1.12 + rand() * 0.24,
        district: hillId,
        ...kind === "insula" ? { housing: housingForStreet(hillId, row, col) } : {}
      });
    }
  }
  return lots;
}
function ridgePines(rand, hillId, count, kind) {
  const hill = COLOSSEUM_HILLS.find((item) => item.id === hillId);
  if (!hill) return [];
  const lots = [];
  let attempts = 0;
  while (lots.length < count && attempts < count * 14) {
    attempts += 1;
    const angle = rand() * Math.PI * 2;
    const radius = hill.sigma * (0.38 + rand() * 0.55);
    const x = hill.x + Math.cos(angle) * radius;
    const z = hill.z + Math.sin(angle) * radius * 0.84;
    if (onOval(x, z)) continue;
    if (colosseumTerrainHeightAt(x, z) < 3.2) continue;
    lots.push({
      kind,
      x,
      z,
      yaw: rand() * Math.PI * 2,
      scale: kind === "pine" ? 1.45 + rand() * 0.7 : 1.05 + rand() * 0.5
    });
  }
  return lots;
}
function westernStreetFronts() {
  const lots = [];
  for (const street2 of COLOSSEUM_URBAN_CONTEXT.streets.filter((item) => item.id === "velia-palatine-lane" || item.id === "velia-north-lane")) {
    for (let segment = 1; segment < street2.points.length; segment++) {
      const a = street2.points[segment - 1], b = street2.points[segment];
      const length2 = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const dx = (b[0] - a[0]) / length2, dz = (b[1] - a[1]) / length2;
      const bays = Math.floor(length2 / 18);
      for (let bay = 0; bay < bays; bay++) for (const side of [-1, 1]) {
        const along = (bay + 0.5) * length2 / bays;
        const offset = side * (street2.width / 2 + 11);
        const x = a[0] + dx * along - dz * offset, z = a[1] + dz * along + dx * offset;
        if (onOval(x, z) || onHaul(x, z)) continue;
        lots.push({
          kind: "insula",
          x,
          z,
          yaw: -Math.atan2(dz, dx) + (side > 0 ? Math.PI : 0),
          scale: 1.14 + (bay + segment) % 3 * 0.055,
          district: street2.id,
          housing: housingForStreet("western-lane", segment, bay + (side > 0 ? 2 : 0))
        });
      }
    }
  }
  return lots;
}
function createColosseumRomeLots() {
  const rand = mulberry32("colosseum-rome-street-lots");
  const streets = createCaelianStreetFronts().map((lot, i) => ({ ...lot, housing: housingForStreet("caelian-watercourse", Math.floor(i / 10), i) }));
  const existing = [
    ...gridLots(rand, "palatine", 13, 10, 17, 15.5, "insula", 0.7),
    ...gridLots(rand, "caelian", 11, 9, 17, 16, "insula", 0.6),
    ...gridLots(rand, "esquiline", 10, 8, 20, 18, "insula", 0.6),
    ...gridLots(rand, "aventine", 10, 8, 20, 18, "insula", 0.5),
    ...gridLots(rand, "quirinal", 10, 8, 20, 18, "insula", 0.8),
    ...gridLots(rand, "viminal", 9, 7, 20, 18, "insula", 0.7),
    ...gridLots(rand, "janiculum", 11, 7, 20, 18, "insula", 0.9),
    ...gridLots(rand, "velia", 13, 7, 17, 16, "insula", 0.5),
    ...gridLots(rand, "oppian", 7, 5, 18, 16, "insula", 0.5),
    ...gridLots(rand, "palatine", 5, 3, 26, 22, "palace", 4.5),
    ...gridLots(rand, "caelian", 4, 3, 26, 20, "palace", 3.2),
    ...gridLots(rand, "esquiline", 4, 2, 28, 22, "palace", 2.4),
    ...gridLots(rand, "quirinal", 4, 2, 28, 22, "palace", 3.5),
    ...gridLots(rand, "janiculum", 3, 2, 30, 24, "palace", 4.5),
    ...valleyFootLots(rand, "pine", 36, 230, 340),
    ...ridgePines(rand, "palatine", 80, "pine"),
    ...ridgePines(rand, "caelian", 70, "pine"),
    ...ridgePines(rand, "esquiline", 55, "pine"),
    ...ridgePines(rand, "aventine", 48, "pine"),
    ...ridgePines(rand, "quirinal", 52, "pine"),
    ...ridgePines(rand, "viminal", 42, "pine"),
    ...ridgePines(rand, "janiculum", 58, "pine"),
    ...ridgePines(rand, "palatine", 28, "cypress"),
    ...ridgePines(rand, "caelian", 24, "cypress"),
    ...ridgePines(rand, "esquiline", 18, "cypress"),
    ...ridgePines(rand, "aventine", 16, "cypress"),
    ...ridgePines(rand, "quirinal", 16, "cypress"),
    ...ridgePines(rand, "viminal", 12, "cypress"),
    ...ridgePines(rand, "janiculum", 18, "cypress")
  ];
  const accepted = [...streets];
  const priority = (lot) => lot.kind === "palace" ? 0 : lot.kind === "insula" ? 1 : 2;
  for (const lot of [...westernStreetFronts(), ...existing.sort((a, b) => priority(a) - priority(b))]) {
    const radius = romeLotRadius(lot);
    if (!isClearOfRomeContext(lot.x, lot.z, radius)) continue;
    if (streets.some((front) => Math.hypot(front.x - lot.x, front.z - lot.z) < radius + romeLotRadius(front) + 2)) continue;
    const building = lot.kind === "insula" || lot.kind === "palace";
    if (accepted.some((other) => {
      const otherBuilding = other.kind === "insula" || other.kind === "palace";
      return (building || otherBuilding) && romeLotsOverlap(lot, other, 1.2);
    })) continue;
    accepted.push(lot);
  }
  return accepted;
}
function romeLotRadius(lot) {
  return (lot.kind === "insula" ? COLOSSEUM_HOUSING_RADIUS : lot.kind === "palace" ? 10.5 : lot.kind === "pine" ? 5.5 : 1.8) * lot.scale;
}
function housingForStreet(district, row, col) {
  if ((col + row * 3) % 7 === 0) return "corner";
  if ((col + row) % 4 === 0) return "stepped";
  if (district === "palatine" || district === "janiculum") return (col + row) % 3 ? "courtyard" : "frontage";
  return (col + row) % 3 ? "frontage" : "courtyard";
}
function halfExtents(lot) {
  const size = lot.kind === "insula" ? [COLOSSEUM_HOUSING_HALF_WIDTH, COLOSSEUM_HOUSING_HALF_DEPTH] : lot.kind === "palace" ? [9, 5.6] : lot.kind === "pine" ? [5.5, 5.5] : [1.8, 1.8];
  return [size[0] * lot.scale, size[1] * lot.scale];
}
function romeLotsOverlap(a, b, alley = 0) {
  const axes = (lot) => [[Math.cos(lot.yaw), -Math.sin(lot.yaw)], [Math.sin(lot.yaw), Math.cos(lot.yaw)]];
  const aa = axes(a), ba = axes(b), ah = halfExtents(a), bh = halfExtents(b);
  for (const axis of [...aa, ...ba]) {
    const span = (basis, half) => Math.abs(axis[0] * basis[0][0] + axis[1] * basis[0][1]) * half[0] + Math.abs(axis[0] * basis[1][0] + axis[1] * basis[1][1]) * half[1];
    if (Math.abs((b.x - a.x) * axis[0] + (b.z - a.z) * axis[1]) >= span(aa, ah) + span(ba, bh) + alley) return false;
  }
  return true;
}
var COLOSSEUM_ROME_LOTS = createColosseumRomeLots();

// src/render/three/ColosseumUrbanContext.ts
import { BufferGeometry, Color as Color2, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial } from "three";

// src/render/three/proceduralDetail.ts
import { Color, Vector3 } from "three";

// src/data/materialDetail.ts
var MATERIAL_DETAIL_RECIPES = [
  {
    role: "core-limestone",
    description: "Mokattam nummulitic limestone, rough-dressed: fine grain with faint horizontal bedding carried from the quarry strata.",
    space: "object",
    plane: "mixed",
    grain: { scale: 14, amplitude: 0.05 },
    banding: { scale: 9, amplitude: 0.032 },
    roughnessSwing: 0.05,
    normalBump: { strength: 0.16 }
  },
  {
    role: "casing-limestone",
    description: "White Tura casing, dressed smooth: finer grain and barely-visible bedding on the pyramid's original bright face.",
    space: "object",
    plane: "mixed",
    grain: { scale: 22, amplitude: 0.03 },
    banding: { scale: 14, amplitude: 0.018 },
    roughnessSwing: 0.04,
    normalBump: { strength: 0.1 }
  },
  {
    role: "granite",
    description: "Granodiorite barged from Aswan for chamber courses: dense crystalline speckle, never bedded.",
    space: "object",
    plane: "mixed",
    grain: { scale: 30, amplitude: 0.05 },
    roughnessSwing: 0.06,
    normalBump: { strength: 0.12 }
  },
  {
    role: "sarsen",
    description: "Weathered silcrete sarsen: coarse granular relief, broad rain-dark mottling, and a quieter secondary mineral scale instead of a flat grey block.",
    space: "object",
    plane: "mixed",
    grain: { scale: 7.5, amplitude: 0.065 },
    mottle: { scale: 0.42, amplitude: 0.082 },
    mottleSecondary: { scale: 2.4, amplitude: 0.028 },
    roughnessSwing: 0.075,
    normalBump: { strength: 0.15 }
  },
  {
    role: "bluestone",
    description: "Dark Preseli bluestone: tighter crystalline grain and cool irregular mottling, distinct from the larger buff-grey sarsens.",
    space: "object",
    plane: "mixed",
    grain: { scale: 11, amplitude: 0.055 },
    mottle: { scale: 0.58, amplitude: 0.078 },
    mottleSecondary: { scale: 3.2, amplitude: 0.028 },
    roughnessSwing: 0.065,
    normalBump: { strength: 0.16 }
  },
  {
    role: "disi-sandstone",
    description: "Cambrian\u2013Ordovician Disi/Umm Ishrin sandstone: rose-red bedding, broad haematite mottling, and a quieter grain than Giza limestone.",
    space: "object",
    plane: "mixed",
    grain: { scale: 9.5, amplitude: 0.055 },
    banding: { scale: 6.5, amplitude: 0.038 },
    mottle: { scale: 0.48, amplitude: 0.07 },
    mottleSecondary: { scale: 2.1, amplitude: 0.026 },
    roughnessSwing: 0.07,
    normalBump: { strength: 0.14 }
  },
  {
    role: "travertine",
    description: "Tibur travertine (lapis tiburtinus): creamy limestone with open bedding and a quieter grain than desert casing stone.",
    space: "object",
    plane: "mixed",
    grain: { scale: 10, amplitude: 0.045 },
    banding: { scale: 7.2, amplitude: 0.03 },
    mottle: { scale: 0.52, amplitude: 0.055 },
    roughnessSwing: 0.055,
    normalBump: { strength: 0.12 }
  },
  {
    role: "tuff",
    description: "Roman volcanic tuff: warmer ochre, coarser vesicular grain, used on inner radial walls.",
    space: "object",
    plane: "mixed",
    grain: { scale: 8.2, amplitude: 0.06 },
    mottle: { scale: 0.4, amplitude: 0.062 },
    roughnessSwing: 0.06,
    normalBump: { strength: 0.14 }
  },
  {
    role: "pozzolana",
    description: "Opus caementicium with pozzolanic mortar: dull ash body and irregular aggregate mottling.",
    space: "object",
    plane: "mixed",
    grain: { scale: 6.8, amplitude: 0.05 },
    mottle: { scale: 0.36, amplitude: 0.058 },
    roughnessSwing: 0.05,
    normalBump: { strength: 0.11 }
  },
  {
    role: "chalk-grass",
    description: "Grazed Salisbury Plain turf over chalk: broad moisture/value patches, a smaller broken herb layer, and restrained blade-scale grain.",
    space: "world",
    plane: "xz",
    grain: { scale: 1.15, amplitude: 0.024 },
    mottle: { scale: 0.045, amplitude: 0.07 },
    mottleSecondary: { scale: 0.27, amplitude: 0.038 },
    roughnessSwing: 0.05,
    normalBump: { strength: 0.08 }
  },
  {
    role: "sand",
    description: "Desert pavement of the western plateau: broad wind-sorted dune patches, fine grain, and barely-raised wind-worked surface relief.",
    space: "world",
    plane: "xz",
    mottle: { scale: 0.016, amplitude: 0.07 },
    mottleSecondary: { scale: 0.12, amplitude: 0.03 },
    streak: { scale: 0.06, stretch: 0.3, amplitude: 0.04 },
    grain: { scale: 0.32, amplitude: 0.035 },
    roughnessSwing: 0.04,
    normalBump: { strength: 0.075 }
  },
  {
    role: "compacted-earth",
    description: "Sled roads and ramp cores: trodden, moisture-mottled compaction from constant sled and foot traffic, with shallow raking-light compression.",
    space: "world",
    plane: "xz",
    mottle: { scale: 0.35, amplitude: 0.05 },
    grain: { scale: 2.2, amplitude: 0.03 },
    roughnessSwing: 0.045,
    normalBump: { strength: 0.12 }
  },
  {
    role: "quarry-cut",
    description: "Fresh quarry faces south-east of the plateau: stronger strata and tool-scale grain than weathered stone.",
    space: "world",
    plane: "mixed",
    grain: { scale: 1.6, amplitude: 0.045 },
    banding: { scale: 1.1, amplitude: 0.04 },
    normalBump: { strength: 0.2 }
  },
  {
    role: "wood",
    description: "Acacia and sycamore sleds, masts, yards and levers: grain stretched along each member so wood stops reading as brown plastic.",
    space: "object",
    plane: "mixed",
    grain: { scale: 6, amplitude: 0.06, anisotropy: 0.16 },
    roughnessSwing: 0.05
  },
  {
    role: "hoganas-tile",
    description: "H\xF6gan\xE4s cream-and-white chevron fields on Utzon spherical sail skins: repeating V-bands that read as tiled roof from the cinematic hold, never a smooth CAD blob.",
    space: "object",
    plane: "mixed",
    grain: { scale: 18, amplitude: 0.02 },
    chevron: { scale: 9.5, amplitude: 0.055 },
    roughnessSwing: 0.08,
    normalBump: { strength: 0.28 }
  },
  {
    role: "puddled-iron",
    description: "1887 puddled-iron lattice: mill-scale grain stretched along each member and rivet-plate mottle, never a smooth brown plastic bar.",
    space: "object",
    plane: "mixed",
    grain: { scale: 14, amplitude: 0.055, anisotropy: 0.22 },
    mottle: { scale: 2.4, amplitude: 0.04 },
    roughnessSwing: 0.08
  },
  {
    role: "haussmann-stucco",
    description: "1889 Paris limestone-stucco fa\xE7ades: storey banding and window-scale grain so Champ blocks stop reading as CAD beige boxes.",
    space: "object",
    plane: "mixed",
    grain: { scale: 14, amplitude: 0.045 },
    banding: { scale: 7.2, amplitude: 0.055 },
    mottle: { scale: 3.4, amplitude: 0.03 },
    roughnessSwing: 0.06,
    normalBump: { strength: 0.12 }
  },
  {
    role: "paris-tile",
    description: "Paris zinc-and-tile roof chevrons: repeating V-bands that read as mansard tiles from the cinematic hold, never a flat red slab.",
    space: "object",
    plane: "mixed",
    grain: { scale: 16, amplitude: 0.025 },
    chevron: { scale: 8.2, amplitude: 0.06 },
    roughnessSwing: 0.07,
    normalBump: { strength: 0.22 }
  },
  {
    role: "water",
    description: "Outdoor water (Nile, harbour, remaining lake, river glint): a breeze-ruffled ripple plus a fine chop octave sparkle up close, and the analytic sky \u2014 sun glitter included \u2014 rides the surface at grazing angles.",
    space: "world",
    plane: "xz",
    ripple: { scale: 0.55, speed: 0.62, roughness: 0.3, amplitude: 0.035 },
    normalRipple: { strength: 0.36 },
    chop: { scale: 2.6, amplitude: 0.016, speed: 1.35 },
    skyReflection: { strength: 0.5 }
  },
  {
    role: "whitewash",
    description: "Lime-plastered estate and temple walls of the Memphis skyline: nearly smooth, slight trowel grain.",
    space: "world",
    plane: "mixed",
    grain: { scale: 2.4, amplitude: 0.02 }
  },
  {
    role: "mud-brick",
    description: "Sun-dried Nile-mud brick: coarse, fiber-rich grain separating city fabric from dressed stone.",
    space: "world",
    plane: "mixed",
    grain: { scale: 0.9, amplitude: 0.04 }
  },
  {
    role: "city-roof",
    description: "Palm-thatch and mud roofs over Memphis houses: soft weathered grain a step rougher than the walls.",
    space: "world",
    plane: "mixed",
    grain: { scale: 1.2, amplitude: 0.035 }
  },
  {
    role: "city-accent",
    description: "Painted door and shrine accents in the far city: restrained grain so the color blocks stay readable.",
    space: "world",
    plane: "mixed",
    grain: { scale: 1.2, amplitude: 0.03 }
  },
  {
    role: "linen",
    description: "Flax sailcloth and tenting: fine plain-weave grain on the square sails of the upstream boats.",
    space: "object",
    plane: "mixed",
    grain: { scale: 12, amplitude: 0.025 }
  },
  {
    role: "foliage",
    description: "Date-palm crowns along the canal greenbelt: gentle value variation keeps groves from reading as flat plastic.",
    space: "object",
    plane: "mixed",
    grain: { scale: 4, amplitude: 0.05 }
  },
  {
    role: "farmland",
    description: "Peret-season field strips on the floodplain: subtle grain over the per-instance crop tones.",
    space: "world",
    plane: "xz",
    grain: { scale: 0.8, amplitude: 0.03 }
  }
];
var recipeByRole = new Map(MATERIAL_DETAIL_RECIPES.map((recipe) => [recipe.role, recipe]));
function materialDetailFor(role) {
  const recipe = recipeByRole.get(role);
  if (!recipe) throw new Error(`Unknown material detail role: ${role}`);
  return recipe;
}

// src/data/gizaSky.ts
var GIZA_SKY = {
  id: "giza-desert-sky",
  description: "Subtropical desert sky over the Giza plateau: a deep blue midday dome, a dusty pale horizon from Sahara aerosols, and warm dawn/dusk bands that rise over the Nile in the east and sink over the Libyan desert in the west.",
  sunPath: {
    dawnAzimuthDegrees: -90,
    sweepDegrees: 200,
    noonElevationDegrees: 78,
    duskTailStart: 0.62,
    duskTailDepth: 15.1,
    description: "The sun rises due east over the Nile valley, culminates in the south at 78\xB0 (the movie midpoint sits just past solar noon), and sets west-northwest over the Western Desert. A smoothstep dusk tail from t = 0.62 to the reveal hold lowers the arc to ~9\xB0, so the held dusk frame reads sunset-low instead of late-afternoon high.",
    historicalNote: "At 29.98\xB0N in near-summer the sun rises slightly north of east and sets north of west; the sweep is simplified to a due-east rise and a west-northwest set. A southern culmination matches the northern tropics. The westward sunset matters thematically: the west bank of the Nile was the Egyptian realm of the dead, which is why the pyramids stand there. Honest compression: the era block declares peret (the winter growing season, kept so the fields read green), whose noon sun at this latitude tops out near 37\u201357\xB0; the 78\xB0 near-summer arc is retained deliberately for steeper masonry shadows and a higher, more legible sun. One movie-day compresses both season and sun for the camera, and owns it here. The dusk tail is the same kind of honest compression: a real near-summer sun at this latitude only dips to single-digit elevation in the last minutes before sunset, so the taper hastens that final descent for the reveal while the dawn arc, the 78\xB0 culmination, and the azimuth sweep stay exactly as declared."
  },
  sunDisc: {
    angularRadiusDegrees: 1.15,
    intensity: 1.5,
    haloStrength: 0.5,
    wideHaloStrength: 0.16,
    description: "A legible stylized sun disc with a tight glare lobe and a wide forward-scatter glow that strengthens when the sun is low."
  },
  dome: {
    radius: 2e3,
    zenithExponent: 0.55,
    hazeFalloff: 8.5,
    groundHaze: "#b89a6e",
    atmosphericTexture: {
      scale: 15,
      strength: 0.09,
      description: "Subtle, fixed directional variation in dust and dry aerosol across the low desert sky; it adds depth below the zenith without becoming a cloud map."
    },
    description: "Analytical gradient dome: horizon-to-zenith gradient, dust haze band, and sun disc/halo computed per fragment from the world-space sun direction. Fixed in world space; it never follows or counter-rotates with the camera."
  },
  keyframes: [
    {
      t: 0,
      label: "dawn",
      description: "Sunrise over the Nile in the east: a gold horizon band under a soft blue-grey dome, with river mist and dust thickening the haze.",
      zenith: "#7f9fc4",
      horizon: "#ffc98f",
      sunTint: "#ffb27d",
      haze: 0.55,
      fogStretch: 1.5,
      cloudTint: "#ffd9b0",
      cloudOpacity: 0.34
    },
    {
      t: 0.18,
      label: "morning",
      description: "Mid-morning: the dome turns clear Egyptian blue while the horizon keeps a pale dusty cast from the desert floor.",
      zenith: "#4f83c4",
      horizon: "#d8d9c2",
      sunTint: "#ffd9a8",
      haze: 0.4,
      fogStretch: 1.18,
      cloudTint: "#fff2df",
      cloudOpacity: 0.3
    },
    {
      t: 0.45,
      label: "midday",
      description: "Noon: the deep rainless blue of a subtropical desert zenith; haze drops to its daily minimum and shadows are shortest.",
      zenith: "#2f6cb8",
      horizon: "#c9cfbe",
      sunTint: "#fff4e0",
      haze: 0.32,
      fogStretch: 1,
      cloudTint: "#ffffff",
      cloudOpacity: 0.3
    },
    {
      t: 0.65,
      label: "afternoon",
      description: "Afternoon: the blue softens and the western horizon warms as dust rises from the plateau work and the Libyan desert.",
      zenith: "#3a74bc",
      horizon: "#d8c9a4",
      sunTint: "#ffe8c0",
      haze: 0.38,
      fogStretch: 1.06,
      cloudTint: "#fff6e2",
      cloudOpacity: 0.3
    },
    {
      t: 0.8,
      label: "golden-hour",
      description: "Golden hour: long warm light across the casing stones; the horizon over the western dunes turns amber.",
      zenith: "#5a6fa8",
      horizon: "#f0a95e",
      sunTint: "#ffc27a",
      haze: 0.5,
      fogStretch: 1.12,
      cloudTint: "#ffdcb4",
      cloudOpacity: 0.36
    },
    {
      t: 0.9,
      label: "dusk",
      description: "Dusk over the realm of the dead: a deepened indigo zenith pulls away from the burnt-orange western band, so the dome reads as a structured gradient instead of one orange wash, and raised pink-lit cloud banks catch the low sun. The reveal holds this light.",
      // Deepened/cooled from #4a4f86 so the zenith sits clearly darker than
      // the warm horizon band (luminance ~69 vs ~162) — structure, not wash.
      zenith: "#3a437c",
      horizon: "#ff8f52",
      sunTint: "#ff7e47",
      haze: 0.58,
      fogStretch: 1.22,
      // Warmed from #ffc9a0 toward the sun tint #ff7e47: pink-lit clouds.
      cloudTint: "#ffae8f",
      // Raised from 0.4 so the cloud banks actually structure the dusk sky.
      cloudOpacity: 0.55
    }
  ],
  cloudLayers: [
    {
      id: "cirrus",
      description: "High ice-crystal cirrus streaks, thin and elongated, sliding slowly across the upper dome.",
      historicalNote: "Cirrus is the most common cloud over the Egyptian desert; towering cumulus and rain clouds are rare outside winter storms.",
      groups: 8,
      membersPerGroup: 1,
      radius: { min: 340, step: 9 },
      altitude: { min: 212, range: 26 },
      scale: {
        width: [24, 44],
        height: [0.5, 0.9],
        depth: [2.6, 4.6]
      },
      baseOpacity: 0.16,
      drift: {
        compassToward: "south",
        worldDirection: [-1, 0, 0],
        unitsPerMovie: 1.2
      }
    },
    {
      id: "cumulus-humilis",
      description: "Small fair-weather cumulus with flat bases, grouped in loose banks well outside the camera orbit.",
      historicalNote: "Fair-weather cumulus appear over the Nile valley when moist river air meets the desert; they stay small in the dry season.",
      groups: 4,
      membersPerGroup: 5,
      radius: { min: 315, step: 12 },
      altitude: { min: 132, range: 18 },
      scale: {
        width: [7, 15],
        height: [1.5, 2.8],
        depth: [4, 7.5]
      },
      baseOpacity: 0.3,
      drift: {
        compassToward: "south",
        worldDirection: [-1, 0, 0],
        unitsPerMovie: 2.5
      }
    }
  ]
};

// src/render/three/proceduralDetail.ts
function f(value) {
  const text = String(value);
  return text.includes(".") || text.includes("e") ? text : `${text}.0`;
}
var NOISE_GLSL = `
float wfHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float wfNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(wfHash(i), wfHash(i + vec2(1.0, 0.0)), f.x),
             mix(wfHash(i + vec2(0.0, 1.0)), wfHash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float wfFbm(vec2 p) {
  return wfNoise(p) * 0.65 + wfNoise(p * 2.13 + 7.3) * 0.35;
}
`;
function vertexPositionSnippet(recipe) {
  if (recipe.space === "object") {
    return "\n  vWfDetailPos = position;\n";
  }
  return `
  vec4 wfWorldPos = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
  wfWorldPos = instanceMatrix * wfWorldPos;
  #endif
  vWfDetailPos = (modelMatrix * wfWorldPos).xyz;
`;
}
function grainSnippet(recipe) {
  const grain = recipe.grain;
  if (!grain) return "";
  const aniso = f(grain.anisotropy ?? 1);
  const sample = recipe.plane === "xz" ? `wfFbm(vec2(wfP.x * ${f(grain.scale)}, wfP.z * ${f(grain.scale)}))` : `wfFbm(vec2((wfP.x + wfP.z * 0.35) * ${f(grain.scale)}, wfP.y * ${f(grain.scale)} * ${aniso}))`;
  const swing = recipe.roughnessSwing ? `
  wfRough += (wfGrain - 0.5) * ${f(recipe.roughnessSwing * 2)};` : "";
  return `
  float wfGrain = ${sample};
  wfDetail += (wfGrain - 0.5) * ${f(grain.amplitude * 2)};${swing}
`;
}
function bandingSnippet(recipe) {
  const banding = recipe.banding;
  if (!banding) return "";
  return `
  wfDetail += sin((wfP.y * ${f(banding.scale)} + wfNoise(wfP.xz * 0.8) * 0.6) * 6.28318) * ${f(banding.amplitude)};
`;
}
function mottleSnippet(recipe) {
  const mottle = recipe.mottle;
  const secondary = recipe.mottleSecondary;
  if (!mottle && !secondary) return "";
  const sample = recipe.plane === "xz" ? "wfP.xz" : "vec2(wfP.x + wfP.z * 0.35, wfP.y)";
  const primaryTerm = mottle ? `
  wfDetail += (wfFbm(${sample} * ${f(mottle.scale)}) - 0.5) * ${f(mottle.amplitude * 2)};` : "";
  const secondaryTerm = secondary ? `
  wfDetail += (wfFbm(${sample} * ${f(secondary.scale)} + 19.4) - 0.5) * ${f(secondary.amplitude * 2)};` : "";
  return `
  ${primaryTerm}${secondaryTerm}
`;
}
function chevronSnippet(recipe) {
  const chevron = recipe.chevron;
  if (!chevron) return "";
  return `
  float wfChevU = wfP.x * ${f(chevron.scale)} + wfP.z * ${f(chevron.scale * 0.22)};
  float wfChevV = wfP.y * ${f(chevron.scale * 1.15)};
  float wfChevron = abs(fract(wfChevU + abs(fract(wfChevV) - 0.5)) - 0.5);
  wfDetail += (wfChevron - 0.25) * ${f(chevron.amplitude * 2)};
  wfRough += wfChevron * ${f((recipe.roughnessSwing ?? 0) * 0.8)};
`;
}
function streakSnippet(recipe) {
  const streak = recipe.streak;
  if (!streak) return "";
  return `
  float wfStreakWarp = (wfFbm(wfP.xz * ${f(streak.scale * 0.44)}) - 0.5) * 1.25;
  float wfStreak = sin((wfP.x * ${f(streak.scale)} + wfP.z * ${f(streak.scale * streak.stretch)} + wfStreakWarp) * 6.28318);
  wfDetail += wfStreak * ${f(streak.amplitude)};
  wfRough += abs(wfStreak) * ${f((recipe.roughnessSwing ?? 0) * 0.35)};
`;
}
function rippleSnippet(recipe) {
  const ripple = recipe.ripple;
  if (!ripple) return "";
  const chop = recipe.chop;
  const chopBlock = chop ? `
  // Fine chop octave: advected downstream with the swell but running faster,
  // as small waves do \u2014 close-range sparkle the broad swell cannot carry.
  wfCp = vec2(wfP.x * ${f(chop.scale)} + uWfTime * ${f(chop.speed)},
              wfP.z * ${f(chop.scale * 0.8)} - uWfTime * ${f(chop.speed * 0.45)});
  wfChop = wfFbm(wfCp) - 0.5;
  wfDetail += wfChop * ${f(chop.amplitude * 2)};` : "";
  return `
  wfRp = vec2(wfP.x * ${f(ripple.scale)} + uWfTime * ${f(ripple.speed)},
              wfP.z * ${f(ripple.scale * 0.55)} - uWfTime * ${f(ripple.speed * 0.3)});
  wfRip = wfFbm(wfRp) - 0.5;
  wfDetail += wfRip * ${f(ripple.amplitude * 2)};
  wfRough += wfRip * ${f(ripple.roughness)};${chopBlock}
`;
}
function normalRippleSnippet(recipe) {
  const ripple = recipe.ripple;
  const normalRipple = recipe.normalRipple;
  if (!ripple || !normalRipple) return "";
  const step = 0.08;
  const chop = recipe.chop;
  const chopGradient = chop ? `
  // The chop octave perturbs the same normal at its own scale.
  float wfChopBase = wfChop + 0.5;
  wfRippleGradient += vec2(
    (wfFbm(wfCp + vec2(wfNormalStep, 0.0)) - wfChopBase) / wfNormalStep * ${f(chop.scale)},
    (wfFbm(wfCp + vec2(0.0, wfNormalStep)) - wfChopBase) / wfNormalStep * ${f(chop.scale * 0.8)}
  ) * ${f(chop.amplitude / Math.max(ripple.amplitude, 1e-4))};` : "";
  return `
// The visible water surfaces are flat, upward-facing world-XZ ribbons. Their
// ripple-field gradient is therefore a cheap tangent-space slope; transform
// that world-space slope to view space before perturbing three.js's normal.
const float wfNormalStep = ${f(step)};
float wfRippleBase = wfRip + 0.5;
vec2 wfRippleGradient = vec2(
  (wfFbm(wfRp + vec2(wfNormalStep, 0.0)) - wfRippleBase) / wfNormalStep * ${f(ripple.scale)},
  (wfFbm(wfRp + vec2(0.0, wfNormalStep)) - wfRippleBase) / wfNormalStep * ${f(ripple.scale * 0.55)}
);${chopGradient}
vec3 wfRippleSlopeWorld = vec3(-wfRippleGradient.x, 0.0, -wfRippleGradient.y) * ${f(normalRipple.strength)};
normal = normalize(normal + mat3(viewMatrix) * wfRippleSlopeWorld);`;
}
function skyReflectionSnippet(recipe) {
  const reflection = recipe.skyReflection;
  if (!reflection) return "";
  const { dome, sunDisc } = GIZA_SKY;
  const discCos = Math.cos(sunDisc.angularRadiusDegrees * Math.PI / 180);
  return `
{
  vec3 wfViewDir = normalize(vViewPosition);
  vec3 wfReflectWorld = inverseTransformDirection(reflect(-wfViewDir, normal), viewMatrix);
  float wfReflUp = max(wfReflectWorld.y, 0.0);
  vec3 wfSkyRefl = mix(uWfSkyHorizon, uWfSkyZenith, pow(wfReflUp, ${f(dome.zenithExponent)}));
  float wfCosSun = max(dot(wfReflectWorld, uWfSunDirection), 0.0);
  wfSkyRefl += uWfSunTint * (
    pow(wfCosSun, 650.0) * ${f(sunDisc.haloStrength)} +
    pow(wfCosSun, 5.0) * ${f(sunDisc.wideHaloStrength * 0.6)} +
    smoothstep(${f(discCos - 12e-4)}, ${f(discCos + 12e-4)}, wfCosSun) * ${f(sunDisc.intensity)}
  );
  float wfFresnel = 0.02 + 0.98 * pow(1.0 - max(dot(wfViewDir, normal), 0.0), 5.0);
  totalEmissiveRadiance += wfSkyRefl * wfFresnel * uWfSkyReflStrength;
}`;
}
function normalBumpSnippet(recipe) {
  const bump = recipe.normalBump;
  if (!bump || !recipe.grain) return "";
  return `
{
  vec3 wfSigmaX = dFdx(-vViewPosition);
  vec3 wfSigmaY = dFdy(-vViewPosition);
  vec3 wfR1 = cross(wfSigmaY, normal);
  vec3 wfR2 = cross(normal, wfSigmaX);
  float wfDet = dot(wfSigmaX, wfR1) * (gl_FrontFacing ? 1.0 : -1.0);
  float wfCellSpan = max(fwidth(vWfDetailPos.x), max(fwidth(vWfDetailPos.y), fwidth(vWfDetailPos.z))) * ${f(recipe.grain.scale)};
  float wfReliefFade = clamp(1.0 - (wfCellSpan - 0.35) / 0.9, 0.0, 1.0);
  vec2 wfDhdxy = vec2(dFdx(wfDetail), dFdy(wfDetail)) * ${f(bump.strength)} * wfReliefFade;
  vec3 wfGrad = sign(wfDet) * (wfDhdxy.x * wfR1 + wfDhdxy.y * wfR2);
  normal = normalize(abs(wfDet) * normal - wfGrad);
}`;
}
function normalSnippet(recipe) {
  return `#include <normal_fragment_maps>${normalRippleSnippet(recipe)}${normalBumpSnippet(recipe)}`;
}
function detailBlock(recipe) {
  return `#include <color_fragment>
float wfDetail = 0.0;
float wfRough = 0.0;
${recipe.ripple ? "vec2 wfRp;\nfloat wfRip;" : ""}${recipe.chop ? "\nvec2 wfCp;\nfloat wfChop;" : ""}
{
  vec3 wfP = vWfDetailPos;${grainSnippet(recipe)}${bandingSnippet(recipe)}${mottleSnippet(recipe)}${chevronSnippet(recipe)}${streakSnippet(recipe)}${rippleSnippet(recipe)}
}
diffuseColor.rgb *= 1.0 + wfDetail;
`;
}
function injectRecipe(material, recipe) {
  const cacheKey = `wf-detail:${recipe.role}`;
  material.onBeforeCompile = (shader) => {
    const target = shader;
    if (recipe.ripple) {
      target.uniforms.uWfTime = { value: 0 };
      const shaders = material.userData.wfDetailShaders ??= [];
      shaders.push(target);
    }
    if (recipe.skyReflection) {
      target.uniforms.uWfSkyZenith = { value: new Color("#2f6cb8") };
      target.uniforms.uWfSkyHorizon = { value: new Color("#cfc9ae") };
      target.uniforms.uWfSunTint = { value: new Color("#fff4e0") };
      target.uniforms.uWfSunDirection = { value: new Vector3(0, 1, 0) };
      target.uniforms.uWfSkyReflStrength = { value: 0 };
    }
    target.vertexShader = `varying vec3 vWfDetailPos;
${target.vertexShader}`.replace(
      "#include <project_vertex>",
      `#include <project_vertex>${vertexPositionSnippet(recipe)}`
    );
    const timeUniform = recipe.ripple ? "uniform float uWfTime;\n" : "";
    const skyUniforms = recipe.skyReflection ? "uniform vec3 uWfSkyZenith;\nuniform vec3 uWfSkyHorizon;\nuniform vec3 uWfSunTint;\nuniform vec3 uWfSunDirection;\nuniform float uWfSkyReflStrength;\n" : "";
    target.fragmentShader = `varying vec3 vWfDetailPos;
${timeUniform}${skyUniforms}${NOISE_GLSL}${target.fragmentShader}`.replace("#include <color_fragment>", detailBlock(recipe)).replace(
      "#include <roughnessmap_fragment>",
      "#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + wfRough, 0.05, 1.0);"
    ).replace("#include <normal_fragment_maps>", normalSnippet(recipe)).replace(
      "#include <emissivemap_fragment>",
      `#include <emissivemap_fragment>${skyReflectionSnippet(recipe)}`
    );
  };
  material.customProgramCacheKey = () => cacheKey;
}
function injectMaterialRecipe(material, role) {
  injectRecipe(material, materialDetailFor(role));
}

// src/render/three/ColosseumUrbanContext.ts
var MasonryBatch = class {
  positions = [];
  colors = [];
  parts = [];
  tint = new Color2("#ffffff");
  part(id, draw, color = "#ffffff") {
    const firstVertex = this.positions.length / 3;
    this.tint.set(color);
    draw();
    this.parts.push({ id, firstVertex, vertexCount: this.positions.length / 3 - firstVertex });
  }
  face(...points) {
    for (let i = 1; i < points.length - 1; i++) {
      for (const point of [points[0], points[i], points[i + 1]]) {
        this.positions.push(...point);
        this.colors.push(this.tint.r, this.tint.g, this.tint.b);
      }
    }
  }
  box(x0, x1, z0, z1, bottom, top) {
    this.face([x0, bottom, z1], [x1, bottom, z1], [x1, top, z1], [x0, top, z1]);
    this.face([x1, bottom, z0], [x0, bottom, z0], [x0, top, z0], [x1, top, z0]);
    this.face([x0, bottom, z0], [x0, bottom, z1], [x0, top, z1], [x0, top, z0]);
    this.face([x1, bottom, z1], [x1, bottom, z0], [x1, top, z0], [x1, top, z1]);
    this.face([x0, top, z1], [x1, top, z1], [x1, top, z0], [x0, top, z0]);
    this.face([x0, bottom, z0], [x1, bottom, z0], [x1, bottom, z1], [x0, bottom, z1]);
  }
  /** Footings follow the sampled ground at every corner; tops remain level. */
  footing(x0, x1, z0, z1, top) {
    const outline = [[x0, z1], [x1, z1], [x1, z0], [x0, z0]];
    for (let i = 0; i < 4; i++) {
      const [x, z] = outline[i], [nx, nz] = outline[(i + 1) % 4];
      this.face([x, colosseumTerrainHeightAt(x, z) - 0.06, z], [nx, colosseumTerrainHeightAt(nx, nz) - 0.06, nz], [nx, top, nz], [x, top, z]);
    }
    this.face([x0, top, z1], [x1, top, z1], [x1, top, z0], [x0, top, z0]);
  }
  geometry() {
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute("color", new Float32BufferAttribute(this.colors, 3));
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    geometry.userData.parts = this.parts;
    return geometry;
  }
};
function street(batch, points, width) {
  for (let leg = 1; leg < points.length; leg++) {
    const [x0, z0] = points[leg - 1], [x1, z1] = points[leg];
    const length2 = Math.hypot(x1 - x0, z1 - z0);
    const acrossX = -(z1 - z0) / length2 * width / 2;
    const acrossZ = (x1 - x0) / length2 * width / 2;
    const count = Math.ceil(length2 / 6);
    const edge = (step, side) => {
      const x = x0 + (x1 - x0) * step / count + acrossX * side;
      const z = z0 + (z1 - z0) * step / count + acrossZ * side;
      return [x, colosseumTerrainHeightAt(x, z) + 0.08, z];
    };
    for (let i = 0; i < count; i++) batch.face(edge(i, 1), edge(i + 1, 1), edge(i + 1, -1), edge(i, -1));
  }
}
function column(batch, x, z, floor, height = 5.4) {
  const count = 6, bottom = floor + 0.3, top = floor + height;
  batch.box(x - 0.9, x + 0.9, z - 0.9, z + 0.9, floor, bottom);
  for (let i = 0; i < count; i++) {
    const a = i * Math.PI * 2 / count, b = (i + 1) * Math.PI * 2 / count;
    batch.face(
      [x + Math.cos(b) * 0.65, bottom, z + Math.sin(b) * 0.65],
      [x + Math.cos(a) * 0.65, bottom, z + Math.sin(a) * 0.65],
      [x + Math.cos(a) * 0.57, top, z + Math.sin(a) * 0.57],
      [x + Math.cos(b) * 0.57, top, z + Math.sin(b) * 0.57]
    );
  }
  batch.box(x - 0.85, x + 0.85, z - 0.85, z + 0.85, top, top + 0.35);
}
function gable(batch, x0, x1, z0, z1, y, alongX) {
  const middleX = (x0 + x1) / 2, middleZ = (z0 + z1) / 2, ridge = y + 1.65;
  if (alongX) {
    batch.face([x0, y, z1], [x1, y, z1], [x1, ridge, middleZ], [x0, ridge, middleZ]);
    batch.face([x1, y, z0], [x0, y, z0], [x0, ridge, middleZ], [x1, ridge, middleZ]);
    batch.face([x0, y, z0], [x0, y, z1], [x0, ridge, middleZ]);
    batch.face([x1, y, z1], [x1, y, z0], [x1, ridge, middleZ]);
  } else {
    batch.face([x0, y, z0], [x0, y, z1], [middleX, ridge, z1], [middleX, ridge, z0]);
    batch.face([x1, y, z1], [x1, y, z0], [middleX, ridge, z0], [middleX, ridge, z1]);
    batch.face([x0, y, z1], [x1, y, z1], [middleX, ridge, z1]);
    batch.face([x1, y, z0], [x0, y, z0], [middleX, ridge, z0]);
  }
}
var ColosseumUrbanContext = class {
  group = new Group();
  disposed = false;
  resources = [];
  constructor() {
    this.group.name = "colosseum-connected-caelian-context";
    this.group.userData.context = COLOSSEUM_URBAN_CONTEXT.id;
    const roads = new MasonryBatch(), brick = new MasonryBatch(), stone = new MasonryBatch(), roofs = new MasonryBatch();
    for (const route of COLOSSEUM_URBAN_CONTEXT.streets) roads.part(route.id, () => street(roads, route.points, route.width));
    const P = COLOSSEUM_URBAN_CONTEXT.precinct, [cx, cz] = P.center;
    const west = cx - P.width / 2, east = cx + P.width / 2;
    const south = cz - P.depth / 2, north = cz + P.depth / 2, floor = P.top;
    const receiver = COLOSSEUM_URBAN_CONTEXT.watercourse.receiver, openingHalf = 1.75;
    const receiverBottom = aqueductPointAt(-COLOSSEUM_AQUEDUCT.pierWidth / 2).springing + COLOSSEUM_AQUEDUCT.spandrelTop - 0.08;
    const receiverTop = receiverBottom + 0.08 + COLOSSEUM_AQUEDUCT.channelHeight + COLOSSEUM_AQUEDUCT.capHeight + 0.02;
    const wall = (a, b, top = floor) => {
      const steps2 = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 8);
      for (let i = 0; i < steps2; i++) {
        const point = (t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
        const [x, z] = point(i / steps2), [nx, nz2] = point((i + 1) / steps2);
        brick.face([x, colosseumTerrainHeightAt(x, z) - 0.06, z], [nx, colosseumTerrainHeightAt(nx, nz2) - 0.06, nz2], [nx, top, nz2], [x, top, z]);
      }
    };
    brick.part("precinct-retaining-wall", () => {
      wall([west, north], [east, north]);
      wall([west, south], [west, north]);
      wall([east, south], [west, south]);
      wall([east, north], [east, receiver[1] + openingHalf]);
      wall([east, receiver[1] - openingHalf], [east, south]);
      wall([east, receiver[1] + openingHalf], [east, receiver[1] - openingHalf], receiverBottom);
    });
    brick.part("aqueduct-receiving-recess", () => {
      const z0 = receiver[1] - openingHalf, z1 = receiver[1] + openingHalf, back = east - 2.2;
      brick.face([back, receiverBottom, z0], [east, receiverBottom, z0], [east, receiverTop, z0], [back, receiverTop, z0]);
      brick.face([east, receiverBottom, z1], [back, receiverBottom, z1], [back, receiverTop, z1], [east, receiverTop, z1]);
      brick.face([back, receiverBottom, z1], [back, receiverBottom, z0], [back, receiverTop, z0], [back, receiverTop, z1]);
      brick.face([back, receiverTop, z0], [east, receiverTop, z0], [east, receiverTop, z1], [back, receiverTop, z1]);
      brick.face([east, receiverBottom, z0], [back, receiverBottom, z0], [back, receiverBottom, z1], [east, receiverBottom, z1]);
      brick.box(back, east, z0, z1, receiverTop, floor);
    }, "#b8a292");
    brick.part("aqueduct-covered-wall-entry", () => {
      const point = (distance, side, height) => {
        const p = aqueductPointAt(distance);
        return [p.x - COLOSSEUM_AQUEDUCT.direction[1] * side, p.springing + COLOSSEUM_AQUEDUCT.spandrelTop + height, p.z + COLOSSEUM_AQUEDUCT.direction[0] * side];
      };
      const section = (width, bottom, top) => {
        const start = -2.5, end = -COLOSSEUM_AQUEDUCT.pierWidth / 2, half = width / 2;
        brick.face(point(start, half, bottom), point(end, half, bottom), point(end, half, top), point(start, half, top));
        brick.face(point(end, -half, bottom), point(start, -half, bottom), point(start, -half, top), point(end, -half, top));
        brick.face(point(start, half, top), point(end, half, top), point(end, -half, top), point(start, -half, top));
      };
      section(COLOSSEUM_AQUEDUCT.depth, 0, COLOSSEUM_AQUEDUCT.channelHeight);
      section(COLOSSEUM_AQUEDUCT.capDepth, COLOSSEUM_AQUEDUCT.channelHeight, COLOSSEUM_AQUEDUCT.channelHeight + COLOSSEUM_AQUEDUCT.capHeight);
    });
    stone.part("precinct-court", () => stone.face([west, floor, north], [east, floor, north], [east, floor, south], [west, floor, south]));
    brick.part("north-retaining-pilasters", () => {
      for (let i = 0; i <= 10; i++) {
        const x = west + 2 + i * (P.width - 4) / 10;
        if (Math.abs(x - cx) < P.northEntryWidth / 2 + 2) continue;
        brick.footing(x - 0.85, x + 0.85, north - 0.08, north + 0.65, floor);
      }
    }, "#dac3ad");
    brick.part("east-retaining-pilasters", () => {
      for (let i = 0; i < 8; i++) {
        const z = south + 3 + i * (P.depth - 6) / 7;
        if (Math.abs(z - receiver[1]) < 4) continue;
        brick.footing(east - 0.08, east + 0.65, z - 0.8, z + 0.8, floor);
      }
      for (const z of [receiver[1] - 2.4, receiver[1] + 2.4]) brick.footing(east - 0.08, east + 0.85, z - 0.45, z + 0.45, floor);
    }, "#dac3ad");
    const approachStreet = COLOSSEUM_URBAN_CONTEXT.streets.find((route) => route.id === "precinct-north-approach");
    const approach = approachStreet.points[0];
    const run = approach[1] - north, startY = colosseumTerrainHeightAt(approach[0], approach[1]) + 0.08;
    const steps = Math.ceil((floor - startY) / 0.2), tread = run / steps;
    stone.part("precinct-north-stair", () => {
      for (let i = 0; i < steps; i++) {
        const front2 = approach[1] - i * tread, back = approach[1] - (i + 1) * tread;
        const halfWidth = (z) => approachStreet.width / 2 + (P.northEntryWidth - approachStreet.width) / 2 * Math.min(1, (approach[1] - z) / 6);
        const left = cx - halfWidth(front2), right = cx + halfWidth(front2);
        const backLeft = cx - halfWidth(back), backRight = cx + halfWidth(back);
        const y = startY + (floor - startY) * (i + 1) / steps;
        const previous = startY + (floor - startY) * i / steps;
        stone.face([left, y, front2], [right, y, front2], [backRight, y, back], [backLeft, y, back]);
        stone.face([left, previous, front2], [right, previous, front2], [right, y, front2], [left, y, front2]);
        stone.face([backLeft, colosseumTerrainHeightAt(backLeft, back) - 0.06, back], [left, colosseumTerrainHeightAt(left, front2) - 0.06, front2], [left, y, front2], [backLeft, y, back]);
        stone.face([right, colosseumTerrainHeightAt(right, front2) - 0.06, front2], [backRight, colosseumTerrainHeightAt(backRight, back) - 0.06, back], [backRight, y, back], [right, y, front2]);
      }
    });
    const inset = 5.5, wing = 7.5;
    const wx = west + inset, ex = east - inset, sz = south + inset, nz = north - inset;
    stone.part("precinct-portico-columns", () => {
      for (const x of [wx + wing / 2, ex - wing / 2]) for (let i = 0; i <= 6; i++) column(stone, x, nz - i * (nz - sz - wing) / 6, floor);
      for (let i = 0; i <= 8; i++) column(stone, wx + wing / 2 + i * (ex - wx - wing) / 8, sz + wing / 2, floor);
    });
    stone.part("precinct-portico-beams", () => {
      stone.box(wx, wx + wing, sz + wing, nz, floor + 5.75, floor + 6.35);
      stone.box(ex - wing, ex, sz + wing, nz, floor + 5.75, floor + 6.35);
      stone.box(wx, ex, sz, sz + wing, floor + 5.75, floor + 6.35);
    });
    roofs.part("precinct-portico-roofs", () => {
      gable(roofs, wx - 0.5, wx + wing + 0.5, sz + wing, nz + 0.5, floor + 6.35, false);
      gable(roofs, ex - wing - 0.5, ex + 0.5, sz + wing, nz + 0.5, floor + 6.35, false);
      gable(roofs, wx - 0.5, ex + 0.5, sz - 0.5, sz + wing, floor + 6.35, true);
    });
    const podium = floor + 1.35, cellaSouth = cz - 24, cellaNorth = cz - 2;
    const front = cz + 9, templeLeft = cx - 13, templeRight = cx + 13;
    const templeEaves = podium + 8.15;
    stone.part("precinct-temple-podium", () => {
      stone.box(templeLeft - 2, templeRight + 2, cellaSouth - 2, front + 2, floor, podium);
      for (let i = 0; i < 7; i++) {
        const top = floor + (podium - floor) * (i + 1) / 7;
        stone.box(cx - 6.5, cx + 6.5, front + 2 + (6 - i) * 0.4, front + 2 + (7 - i) * 0.4, floor, top);
      }
    });
    stone.part("precinct-temple-cella", () => {
      const top = templeEaves - 0.5;
      stone.box(templeLeft, templeLeft + 1, cellaSouth, cellaNorth, podium, top);
      stone.box(templeRight - 1, templeRight, cellaSouth, cellaNorth, podium, top);
      stone.box(templeLeft + 1, templeRight - 1, cellaSouth, cellaSouth + 1, podium, top);
      stone.box(templeLeft + 1, cx - 1.8, cellaNorth - 1, cellaNorth, podium, top);
      stone.box(cx + 1.8, templeRight - 1, cellaNorth - 1, cellaNorth, podium, top);
      stone.box(cx - 1.8, cx + 1.8, cellaNorth - 1, cellaNorth, podium + 4.8, top);
    });
    stone.part("precinct-temple-pronaos", () => {
      for (let i = 0; i < 6; i++) column(stone, templeLeft + i * (templeRight - templeLeft) / 5, front, podium, 7.3);
      for (const x of [templeLeft, templeRight]) column(stone, x, cellaNorth, podium, 7.3);
      stone.box(templeLeft - 1, templeRight + 1, cellaSouth - 1, front + 1, podium + 7.65, templeEaves);
    });
    roofs.part("precinct-temple-roof", () => gable(roofs, templeLeft - 1.4, templeRight + 1.4, cellaSouth - 1.4, front + 1.4, templeEaves, false));
    createCaelianStreetFronts().forEach((lot, index) => brick.part(`street-front-foundation-${index}`, () => {
      const { corners, top } = caelianLotFoundation(lot);
      for (let i = 0; i < corners.length; i++) {
        const a = corners[i], b = corners[(i + 1) % corners.length];
        brick.face([b.x, b.ground - 0.06, b.z], [a.x, a.ground - 0.06, a.z], [a.x, top, a.z], [b.x, top, b.z]);
      }
      brick.face(...[...corners].reverse().map((p) => [p.x, top, p.z]));
    }));
    for (const [name, batch, color, recipe] of [
      ["streets", roads, "#99866d", "compacted-earth"],
      ["retaining-masonry", brick, "#967056", "mud-brick"],
      ["court-and-portico", stone, "#c4b390", "travertine"],
      ["portico-tiles", roofs, "#955c41", "mud-brick"]
    ]) {
      const material = new MeshStandardMaterial({ color, roughness: 0.94, vertexColors: true });
      injectMaterialRecipe(material, recipe);
      const geometry = batch.geometry(), mesh = new Mesh(geometry, material);
      mesh.name = `colosseum-urban-${name}`;
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      this.group.add(mesh);
      this.resources.push(geometry, material);
    }
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.resources.forEach((resource) => resource.dispose());
  }
};

// artifacts/colosseum-sun-city-2026-09-20/export-context.ts
import { Mesh as Mesh3 } from "three";

// src/render/three/ColosseumAqueductContinuation.ts
import { BufferGeometry as BufferGeometry2, Color as Color3, DoubleSide, Float32BufferAttribute as Float32BufferAttribute2, Group as Group2, Mesh as Mesh2, MeshStandardMaterial as MeshStandardMaterial2 } from "three";
var ColosseumAqueductContinuation = class {
  group = new Group2();
  geometry = new BufferGeometry2();
  material = new MeshStandardMaterial2({ color: "#ffffff", vertexColors: true, roughness: 0.94, side: DoubleSide });
  disposed = false;
  constructor() {
    this.group.name = "colosseum-aqueduct-upstream-continuation";
    const positions = [], colors = [];
    const brick = new Color3("#a67156"), cap = new Color3("#b79b7d");
    const face = (points, color = brick) => {
      for (let i = 1; i < points.length - 1; i++) for (const p of [points[0], points[i], points[i + 1]]) {
        positions.push(...p);
        colors.push(color.r, color.g, color.b);
      }
    };
    const point = (distance, height) => {
      const p = aqueductPointAt(distance);
      return [p.x, p.springing + height, p.z];
    };
    const strip = (start, end2, bottom, top, color = brick) => {
      face([point(start, bottom), point(end2, bottom), point(end2, top), point(start, top)], color);
    };
    for (let bay = 0; bay < COLOSSEUM_AQUEDUCT.continuationBays; bay++) {
      const start = AQUEDUCT_LENGTH + bay * AQUEDUCT_PITCH;
      const profile = [[0, 0]];
      for (let i = 0; i <= COLOSSEUM_AQUEDUCT.continuationSegments; i++) {
        const angle = Math.PI * (1 - i / COLOSSEUM_AQUEDUCT.continuationSegments);
        profile.push([AQUEDUCT_PITCH / 2 + Math.cos(angle) * COLOSSEUM_AQUEDUCT.archRise, Math.sin(angle) * COLOSSEUM_AQUEDUCT.archRise]);
      }
      profile.push([AQUEDUCT_PITCH, 0]);
      for (let i = 1; i < profile.length; i++) {
        const [x0, y0] = profile[i - 1], [x1, y1] = profile[i];
        face([point(start + x0, y0), point(start + x1, y1), point(start + x1, COLOSSEUM_AQUEDUCT.spandrelTop), point(start + x0, COLOSSEUM_AQUEDUCT.spandrelTop)]);
      }
      const pier = aqueductPierAt(COLOSSEUM_AQUEDUCT.pierCount + bay);
      const left = point(pier.distance - COLOSSEUM_AQUEDUCT.pierWidth / 2, 0);
      const right = point(pier.distance + COLOSSEUM_AQUEDUCT.pierWidth / 2, 0);
      face([[left[0], pier.ground, left[2]], [right[0], pier.ground, right[2]], right, left]);
    }
    const end = AQUEDUCT_LENGTH + COLOSSEUM_AQUEDUCT.continuationBays * AQUEDUCT_PITCH + COLOSSEUM_AQUEDUCT.pierWidth / 2;
    strip(AQUEDUCT_LENGTH, end, COLOSSEUM_AQUEDUCT.spandrelTop, COLOSSEUM_AQUEDUCT.spandrelTop + COLOSSEUM_AQUEDUCT.channelHeight);
    strip(AQUEDUCT_LENGTH, end, COLOSSEUM_AQUEDUCT.spandrelTop + COLOSSEUM_AQUEDUCT.channelHeight, COLOSSEUM_AQUEDUCT.spandrelTop + COLOSSEUM_AQUEDUCT.channelHeight + COLOSSEUM_AQUEDUCT.capHeight, cap);
    strip(end - COLOSSEUM_AQUEDUCT.pierWidth / 2, end, 0, COLOSSEUM_AQUEDUCT.spandrelTop);
    this.geometry.setAttribute("position", new Float32BufferAttribute2(positions, 3));
    this.geometry.setAttribute("color", new Float32BufferAttribute2(colors, 3));
    this.geometry.computeVertexNormals();
    this.geometry.computeBoundingBox();
    this.geometry.computeBoundingSphere();
    const mesh = new Mesh2(this.geometry, this.material);
    mesh.name = "colosseum-aqueduct-distant-arcade";
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    this.group.add(mesh);
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.geometry.dispose();
    this.material.dispose();
  }
};

// artifacts/colosseum-sun-city-2026-09-20/export-context.ts
var manifest = romeContextManifest();
var context = new ColosseumUrbanContext();
var continuation = new ColosseumAqueductContinuation();
context.group.add(continuation.group);
var meshes = [];
context.group.traverse((o) => {
  if (o instanceof Mesh3) {
    o.geometry.computeBoundingBox();
    meshes.push({ name: o.name, triangles: (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3, bounds: o.geometry.boundingBox, parts: o.geometry.userData.parts, castShadow: o.castShadow });
  }
});
writeFileSync("artifacts/colosseum-sun-city-2026-09-20/context.manifest.json", JSON.stringify({ ...manifest, existingBlenderAssets: manifest.assets.map((p) => ({ path: p, bytes: readFileSync("public" + p).byteLength, sha256: createHash("sha256").update(readFileSync("public" + p)).digest("hex") })), hills: COLOSSEUM_HILLS, westernRelief: COLOSSEUM_WESTERN_RIDGES, lots: COLOSSEUM_ROME_LOTS, contextMeshes: meshes }, null, 2));
context.dispose();
continuation.dispose();
