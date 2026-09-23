/** Ground metres, WGS84 origin151.2150309475,-33.8569744291. East +X,
 * south +Z. Coast manually digitized from NSW SIX north-up imagery; near-site
 * tolerance2–5m, district5–20m. Modern coastline, interpreted1960s heights.
 * Evidence: artifacts/sydney-reference-rebuild-2026-09-23/references/geography-audit.md.
 * Shared sampler for renderer, construction support, lots and boat clearance. */
export const SYDNEY_WATER_Y = 0;
export const SYDNEY_BUILDING_YAW = (-12 * Math.PI) / 180;
export function sydneyBuildingToWorld(
  x: number,
  z: number,
): { x: number; z: number } {
  const c = Math.cos(SYDNEY_BUILDING_YAW),
    s = Math.sin(SYDNEY_BUILDING_YAW);
  return { x: c * x + s * z, z: -s * x + c * z };
}
export const SYDNEY_BRIDGE = {
  x: -414,
  z: -524,
  yaw: (-30 * Math.PI) / 180,
  southZ: 251.5,
  northZ: -251.5,
  deckY: 49,
  archRise: 76,
  pylonHalfW: 18,
  pylonHalfD: 14,
  pylonZ: 285,
} as const;
export function sydneyBridgeToWorld(
  x: number,
  z: number,
): { x: number; z: number } {
  const c = Math.cos(SYDNEY_BRIDGE.yaw),
    s = Math.sin(SYDNEY_BRIDGE.yaw);
  return {
    x: SYDNEY_BRIDGE.x + c * x + s * z,
    z: SYDNEY_BRIDGE.z - s * x + c * z,
  };
}
export type SydneyGroundKind =
  'water' | 'point' | 'quay' | 'garden' | 'city' | 'abutment' | 'north';
type Point = readonly [number, number];
export const SYDNEY_POINT_SHORE: readonly Point[] = [
  [-36.8, -89.2],
  [-21.3, -87.3],
  [-5.9, -93.5],
  [12.5, -97.8],
  [37.2, -96.6],
  [55.7, -90.4],
  [66.8, -82.4],
  [75.4, -67.6],
  [82.8, -44.2],
  [84.7, -38.7],
  [79.1, -12.8],
  [68.0, 11.3],
  [60.0, 31.0],
  [47.7, 93.2],
  [49.5, 124.0],
  [58.8, 155.5],
  [69.2, 175.2],
  [89.6, 198.0],
  [136.4, 235.6],
  [164.2, 263.3],
  [174.6, 281.2],
  [-219.8, 281.2],
  [-209.3, 236.2],
  [-193.9, 211.6],
  [-169.3, 190.0],
  [-141.5, 172.1],
  [-120.0, 147.5],
  [-103.9, 118.5],
  [-95.3, 87.7],
  [-87.3, 45.2],
  [-80.5, 42.7],
  [-76.8, 46.4],
  [-72.5, 46.4],
  [-53.4, -31.3],
];
export const SYDNEY_SOUTH_LAND: readonly Point[] = [
  [-8500, 200],
  [-1482, 268],
  [-1378, 173],
  [-1378, -89],
  [-1333, -170],
  [-1214, -191],
  [-1044, -134],
  [-934, -203],
  [-788, -256],
  [-648, -390],
  [-588, -360],
  [-532, -226],
  [-439, -191],
  [-419, -161],
  [-451, -131],
  [-541, -125],
  [-574, -60],
  [-437, 21],
  [-463, 224],
  [-484, 369],
  [-469, 444],
  [-231, 483],
  [-210, 328],
  [-201, 247],
  [-170, 220],
  [150, 245],
  [162, 328],
  [204, 426],
  [183, 554],
  [234, 658],
  [323, 688],
  [419, 650],
  [484, 566],
  [541, 402],
  [568, 295],
  [609, 238],
  [660, 226],
  // OSM Sydney Harbour relation 1252425 (ODbL), simplified ~6-12 m: Mrs
  // Macquaries east shore, Woolloomooloo Bay (Finger Wharf on piles, not fill),
  // Garden Island, Elizabeth Bay and Darling Point continuation.
  [715, 257], [732, 308], [719, 323], [716, 344], [737, 586], [674, 693],
  [615, 760], [602, 756], [569, 832], [507, 913], [495, 936], [499, 950],
  [486, 968], [477, 962], [455, 990], [449, 1016], [460, 1028], [451, 1060],
  [467, 1065], [421, 1233], [439, 1241], [425, 1259], [439, 1300], [449, 1310],
  [505, 1348], [574, 1358], [599, 1318], [616, 1328], [775, 1053], [963, 562],
  [974, 555], [994, 564], [1036, 716], [1062, 711], [1064, 726], [1107, 718],
  [1107, 702], [1161, 692], [1105, 508], [1093, 438], [1231, 95], [1255, 104],
  [1282, 129], [1351, 133], [1379, 151], [1465, 260], [1459, 268], [1439, 265],
  [1374, 339], [1379, 344], [1296, 427], [1277, 459], [1227, 815], [1277, 1066],
  [1272, 1094], [1241, 1147], [1174, 1190], [1154, 1234], [1148, 1282], [1155, 1327],
  [1168, 1354], [1209, 1393], [1311, 1471], [1355, 1468], [1375, 1442], [1421, 1451],
  [1438, 1466], [1447, 1497], [1471, 1531], [1518, 1560], [1547, 1593], [1490, 1722],
  [1385, 1784], [1429, 1886], [1427, 1918], [1457, 1918], [1512, 1960], [1572, 1985],
  [1642, 1979], [1710, 1923], [1698, 1911], [1715, 1891], [1707, 1883], [1737, 1847],
  [1742, 1851], [1757, 1835], [1768, 1843], [1776, 1833], [1761, 1822], [1783, 1797],
  [1811, 1814], [1817, 1806], [1808, 1796], [1788, 1787], [1816, 1740], [1832, 1749],
  [1854, 1693], [1880, 1539], [1847, 1218], [1931, 1171], [2031, 1147], [2028, 1130],
  [2164, 1132], [2161, 1113], [2323, 1053], [2372, 1101], [2377, 1208], [2484, 1294],
  [2475, 1387], [2391, 1648], [2400, 1739], [2453, 1799], [2509, 1827], [2529, 1814],
  [2533, 1834], [2548, 1791], [2546, 1857], [2589, 1874], [2765, 1869], [2876, 1829],
  [2842, 1729], [2865, 1693], [3036, 1630], [3104, 1587], [3210, 1477], [3240, 1401],
  [3209, 1257], [3147, 1241], [3091, 1196], [3138, 1151], [3142, 1097], [3095, 1052],
  [3105, 1020], [3126, 1021], [3138, 908], [3171, 867], [3248, 809], [3451, 759],
  [3487, 775], [3485, 856], [3517, 880], [3620, 890], [3633, 868], [3663, 870],
  [3663, 840], [3755, 802], [3744, 773], [8500, 700],
  [8500, 8500],
  [-8500, 8500],
];
export const SYDNEY_NORTH_LAND: readonly Point[] = [
  [-559, -8500],
  [-559, -1222],
  [-514, -1046],
  [-475, -933],
  [-386, -852],
  [-338, -781],
  [-264, -748],
  [-249, -685],
  [-207, -682],
  [-207, -793],
  [-145, -816],
  [-61, -778],
  [7, -733],
  [55, -709],
  [112, -620],
  [210, -566],
  [276, -533],
  [323, -477],
  [362, -480],
  [392, -569],
  [451, -629],
  [466, -718],
  [425, -828],
  [425, -936],
  [478, -998],
  [469, -1055],
  [368, -1100],
  [273, -1165],
  [192, -1222],
  [192, -8500],
];
export const SYDNEY_WEST_NORTH_LAND: readonly Point[] = [
  [-8500, -8500],
  [-8500, -1000],
  [-1190, -1222],
  [-1155, -1082],
  [-1140, -909],
  [-1143, -813],
  [-1092, -718],
  [-1041, -706],
  [-1018, -769],
  [-1018, -885],
  [-943, -891],
  [-833, -867],
  [-809, -897],
  [-818, -942],
  [-842, -1061],
  [-836, -1222],
  [-836, -8500],
];

export function sydneyInsidePolygon(
  x: number,
  z: number,
  polygon: readonly Point[],
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!,
      b = polygon[j]!;
    if (
      a[1] > z !== b[1] > z &&
      x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0]
    )
      inside = !inside;
  }
  return inside;
}
export function sydneyGroundKindAt(x: number, z: number): SydneyGroundKind {
  // Bridge deck obscures shoreline in orthophoto: compact bearing abutments,
  // tied to mapped pylons (OSM ways382401361/156584774), join both shores.
  const dx = x - SYDNEY_BRIDGE.x,
    dz = z - SYDNEY_BRIDGE.z,
    c = Math.cos(SYDNEY_BRIDGE.yaw),
    s = Math.sin(SYDNEY_BRIDGE.yaw);
  const bx = c * dx - s * dz,
    bz = s * dx + c * dz;
  if (Math.abs(bx) < 46 && Math.abs(bz) > 249 && Math.abs(bz) < 355)
    return 'abutment';
  if (sydneyInsidePolygon(x, z, SYDNEY_POINT_SHORE))
    return z < 165 ? 'point' : 'garden';
  if (sydneyInsidePolygon(x, z, SYDNEY_SOUTH_LAND)) {
    // Botanic Garden, Mrs Macquaries Point and the Domain lie east of
    // Macquarie Street and west of Woolloomooloo Bay; Woolloomooloo and
    // Potts Point beyond the bay are built city.
    if (x > -160 && (x < 450 ? z < 1420 : x < 760 && z < 1250))
      return 'garden';
    if (x > -510 && x < -185 && z > 410 && z < 520) return 'quay';
    if (x < -420 && x > -610 && z < -100) return 'abutment';
    return 'city';
  }
  if (
    sydneyInsidePolygon(x, z, SYDNEY_NORTH_LAND) ||
    sydneyInsidePolygon(x, z, SYDNEY_WEST_NORTH_LAND)
  )
    return 'north';
  return 'water';
}
/** Interpreted sandstone relief: named smooth rises, not surveyed contours.
 * Heights are metres added to the district base slope. */
export const SYDNEY_RELIEF_HILLS: readonly {
  id: string;
  x: number;
  z: number;
  radius: number;
  height: number;
}[] = [
  { id: 'observatory-hill', x: -960, z: 290, radius: 170, height: 30 },
  { id: 'rocks-ridge', x: -800, z: 110, radius: 150, height: 12 },
  { id: 'cbd-ridge', x: -640, z: 1250, radius: 420, height: 12 },
  { id: 'the-domain', x: 170, z: 1180, radius: 300, height: 15 },
  { id: 'potts-point', x: 1010, z: 1380, radius: 230, height: 26 },
  { id: 'kirribilli', x: 180, z: -960, radius: 250, height: 14 },
  { id: 'north-sydney', x: -320, z: -1560, radius: 480, height: 28 },
  { id: 'milsons-point', x: -390, z: -1260, radius: 200, height: 10 },
  { id: 'blues-point', x: -990, z: -1250, radius: 220, height: 12 },
];
function reliefLattice(ix: number, iz: number): number {
  let h = Math.imul(ix, 374761393) + Math.imul(iz, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function reliefNoise(x: number, z: number, cell: number): number {
  const fx = x / cell,
    fz = z / cell,
    ix = Math.floor(fx),
    iz = Math.floor(fz),
    u = fx - ix,
    v = fz - iz,
    su = u * u * (3 - 2 * u),
    sv = v * v * (3 - 2 * v);
  const a = reliefLattice(ix, iz),
    b = reliefLattice(ix + 1, iz),
    c = reliefLattice(ix, iz + 1),
    d = reliefLattice(ix + 1, iz + 1);
  return a + (b - a) * su + (c - a) * sv + (a - b - c + d) * su * sv;
}
/** Zero across the point, forecourt, yard and near garden, so construction
 * support and the accepted garden composition keep their heights. */
export function sydneyReliefAt(x: number, z: number): number {
  const d = Math.hypot(x + 20, z - 120);
  // Garden Island is reclaimed naval dockyard: level, whatever the ridge does.
  const island = Math.max(Math.abs(x - 1230) - 230, Math.abs(z - 560) - 440);
  const m =
    Math.max(0, Math.min(1, (d - 430) / 300)) *
    Math.max(0, Math.min(1, island / 90));
  if (m === 0) return 0;
  let h = (reliefNoise(x, z, 190) - 0.5) * 5 + (reliefNoise(x, z, 520) - 0.5) * 7;
  for (const hill of SYDNEY_RELIEF_HILLS) {
    const r2 = ((x - hill.x) ** 2 + (z - hill.z) ** 2) / hill.radius ** 2;
    h += hill.height * Math.exp(-1.6 * r2);
  }
  return Math.max(0, h) * m * m * (3 - 2 * m);
}
export function sydneyTerrainHeightAt(x: number, z: number): number {
  const kind = sydneyGroundKindAt(x, z);
  if (kind === 'water') return SYDNEY_WATER_Y;
  if (kind === 'point' || kind === 'quay') return 2.3;
  if (kind === 'abutment') return 5;
  const relief = sydneyReliefAt(x, z);
  if (kind === 'garden')
    return 2.5 + Math.min(10, Math.max(0, (z - 170) * 0.025)) + relief;
  if (kind === 'north')
    return 4 + Math.min(36, Math.max(0, (-z - 620) * 0.035)) + relief;
  // The city climbs gently south from Circular Quay; Garden Island and the
  // Woolloomooloo flats east of the Domain stay near the water.
  const citySlope = x < 450 ? Math.min(24, Math.max(0, (z - 450) * 0.022)) : 0;
  return 4 + citySlope + relief;
}
export function sydneyOnPeninsula(x: number, z: number): boolean {
  return sydneyTerrainHeightAt(x, z) > 0.2;
}
/** Arc-length sampling of the actual point boundary, not a fitted ellipse.
 * seaward expands a small normal offset; southern seam is rejected by callers. */
export function sydneyPeninsulaShoreAt(
  theta: number,
  seaward = 1,
): { x: number; z: number; yaw: number } {
  const lengths = SYDNEY_POINT_SHORE.map((a, i) => {
    const b = SYDNEY_POINT_SHORE[(i + 1) % SYDNEY_POINT_SHORE.length]!;
    return Math.hypot(b[0] - a[0], b[1] - a[1]);
  });
  let d =
    ((((theta / (Math.PI * 2)) % 1) + 1) % 1) *
    lengths.reduce((a, b) => a + b, 0);
  let i = 0;
  while (i < lengths.length - 1 && d > lengths[i]!) d -= lengths[i++]!;
  const a = SYDNEY_POINT_SHORE[i]!,
    b = SYDNEY_POINT_SHORE[(i + 1) % SYDNEY_POINT_SHORE.length]!,
    length = lengths[i]!,
    u = d / length;
  const dx = (b[0] - a[0]) / length,
    dz = (b[1] - a[1]) / length,
    offset = (seaward - 1) * 60;
  return {
    x: a[0] + u * (b[0] - a[0]) + dz * offset,
    z: a[1] + u * (b[1] - a[1]) - dx * offset,
    yaw: Math.atan2(dx, dz),
  };
}
