/**
 * Structured environment description for the Giza reference scene,
 * c. 2560 BCE (Spec 08 §Era and place grounding). Pure serializable data plus
 * a deterministic plan factory — no React, DOM, or Three.js imports.
 *
 * The renderer (`src/render/three/Environment.ts`) consumes this description;
 * placement semantics live here, not in renderer-side magic numbers.
 */

import { mulberry32 } from '../engine/random';
import { smoothstep } from '../engine/easing';
import type { Vec3 } from './constructionTypes';
import { GIZA_SKY } from './gizaSky';

/** Linear interpolation across a [min, max] band by a unit parameter. */
function lerp01(range: readonly [number, number], u: number): number {
  return range[0] + u * (range[1] - range[0]);
}

/* ------------------------------------------------------------------ */
/* Era and orientation                                                 */
/* ------------------------------------------------------------------ */

export interface EraContext {
  label: string;
  dynasty: string;
  pharaoh: string;
  /** Negative = BC. */
  approximateYear: number;
  /** Egyptian season chosen for the movie's single day. */
  season: 'akhet' | 'peret' | 'shemu';
  latitude: number;
  longitude: number;
  description: string;
  /** Honest authoring note where the scene simplifies history. */
  productionNote: string;
}

export type Compass =
  | 'north'
  | 'north-east'
  | 'east'
  | 'south-east'
  | 'south'
  | 'south-west'
  | 'west'
  | 'north-west';

export interface CompassOrientation {
  north: Vec3;
  east: Vec3;
  south: Vec3;
  west: Vec3;
  note: string;
}

/**
 * Fixed world compass for the Giza scene. The Nile lies toward `-z` (east),
 * the Libyan desert toward `+z` (west); the sun path in `gizaSky.ts` rises
 * over the river and sets over the desert accordingly.
 */
export const GIZA_COMPASS: CompassOrientation = {
  north: [1, 0, 0],
  east: [0, 0, -1],
  south: [-1, 0, 0],
  west: [0, 0, 1],
  note:
    'World-space compass: east = -z (the Nile), west = +z (the Libyan ' +
    'desert), north = +x, south = -x. Matches the sun path in GIZA_SKY.',
};

/* ------------------------------------------------------------------ */
/* Geography                                                           */
/* ------------------------------------------------------------------ */

export interface GeographyZone {
  id: string;
  bearing: Compass;
  /** World-space anchor (x, y, z). */
  anchor: Vec3;
  /** Approximate half-extents along x/z. */
  extent: [number, number];
  description: string;
  historicalNote: string;
}

export interface HorizonSector {
  id: string;
  label: string;
  description: string;
  /** World-space angle center, degrees: 0 = +x (north), 90 = +z (west). */
  centerDegrees: number;
  /** Full width of the raised-cosine influence window, degrees. */
  widthDegrees: number;
  /** Ridge height multiplier inside the sector. */
  heightMultiplier: number;
  /** Vertex tint blended into the ring color inside the sector. */
  tint: string;
}

export interface RiverCraftDescription {
  id: string;
  kind: 'cargo-barge' | 'sailing-boat' | 'reed-skiff';
  count: number;
  heading: 'downstream-north' | 'upstream-south' | 'moored';
  /** Old Kingdom rigs are square sails; lateen sails are anachronistic. */
  squareSail: boolean;
  cargo: 'tura-casing-stones' | 'reed-bundles' | 'none';
  description: string;
  historicalNote: string;
}

export interface RiverChannelDescription {
  /** Centerline: z(x) = baseZ + bends. The river flows along +x (north). */
  baseZ: number;
  primaryBend: { amplitude: number; wavelength: number; phase: number };
  secondaryBend: { amplitude: number; wavelength: number; phase: number };
  width: { base: number; variation: number; wavelength: number; phase: number };
  /** Lens-shaped braided side channel on the far (east) side of the channel. */
  braid: { startX: number; endX: number; maxWidth: number; gap: number };
  description: string;
  historicalNote: string;
}

export const GIZA_RIVER_CHANNEL: RiverChannelDescription = {
  baseZ: -105.5,
  // Broad S-meander: the northward apex sits near x +75 (clear of every
  // monument footprint), the southward swing near x -50 (toward Memphis,
  // which is anchored far enough south to stay clear). Peak-to-peak swing
  // is ~14-16 world units so the curve reads from the orbit camera.
  primaryBend: { amplitude: 6.8, wavelength: 250, phase: -0.566 },
  secondaryBend: { amplitude: 1.7, wavelength: 78, phase: 2.1 },
  width: { base: 15, variation: 2.5, wavelength: 140, phase: 1.0 },
  braid: { startX: -64, endX: 28, maxWidth: 2.8, gap: 2.2 },
  description:
    'The Khufu branch swings in a broad S-meander across the floodplain ' +
    'instead of running straight, with one lens-tapered braided side ' +
    'channel on the far bank; banks, reeds, craft, and the whole cultivated ' +
    'strip follow the sampled centerline.',
  historicalNote:
    'Old Kingdom Nile channels meandered and braided across the floodplain; ' +
    'the Khufu branch ran close to the plateau and carried Tura casing ' +
    'stone and Aswan granite directly to the Giza harbor.',
};

/** Channel centerline z at world x. Pure and deterministic. */
export function riverCenterZAt(x: number): number {
  const c = GIZA_RIVER_CHANNEL;
  return c.baseZ
    + c.primaryBend.amplitude * Math.sin(((x + 10) / c.primaryBend.wavelength) * Math.PI * 2 + c.primaryBend.phase)
    + c.secondaryBend.amplitude * Math.sin(((x + 10) / c.secondaryBend.wavelength) * Math.PI * 2 + c.secondaryBend.phase);
}

/** Channel width at world x. */
export function riverWidthAt(x: number): number {
  const { width } = GIZA_RIVER_CHANNEL;
  return width.base + width.variation * Math.sin((x / width.wavelength) * Math.PI * 2 + width.phase);
}

/** Yaw of the local channel tangent; the river flows north along +x. */
export function channelTangentYawAt(x: number): number {
  return Math.atan2(riverCenterZAt(x + 1) - riverCenterZAt(x - 1), 2);
}

/* ------------------------------------------------------------------ */
/* River craft kinematics (living motion, pure functions of t)         */
/* ------------------------------------------------------------------ */

export interface BoatKinematics {
  x: number;
  z: number;
  yaw: number;
  bobY: number;
  roll: number;
}

/**
 * Deterministic boat motion on the channel (Spec 08 §Living environment):
 * barges drift north (+x) with the current, square-sail boats run south on
 * the prevailing northerlies, the skiff stays moored. Everything — lane,
 * start position, drift, bob, roll — derives from the craft description,
 * the fleet index, and playback `t`. Speeds are slow enough that no hull
 * reaches a ribbon end within one movie even at 4× (wrap is a safety net).
 */
export function riverCraftStateAt(
  craft: RiverCraftDescription,
  globalIndex: number,
  t: number,
): BoatKinematics {
  const random = mulberry32(`giza:boat:${craft.id}:${globalIndex}`);
  const lane = random() - 0.5;
  const phase = random() * Math.PI * 2;
  const x0 = -100 + globalIndex * 26 + (random() - 0.5) * 8;
  const speed =
    craft.kind === 'cargo-barge' ? 8 : craft.kind === 'sailing-boat' ? 12 : 0;
  const direction = craft.heading === 'upstream-south' ? -1 : 1;
  const spanStart = -118;
  const span = 216;
  const raw = x0 + direction * speed * t;
  const x = spanStart + (((raw - spanStart) % span) + span) % span;
  const half = riverWidthAt(x) / 2;
  const centerZ = riverCenterZAt(x);
  const z = craft.kind === 'reed-skiff'
    ? centerZ + half - 1.6
    : centerZ + lane * Math.max(4, half * 2 - 5);
  const tangent = channelTangentYawAt(x);
  const yaw =
    craft.heading === 'downstream-north'
      ? tangent + 0.08
      : craft.heading === 'upstream-south'
        ? Math.PI + tangent - 0.08
        : 0.42 + tangent;
  const bobY = 0.47 + 0.045 * Math.sin(Math.PI * 2 * t * 18 + phase);
  const roll = 0.03 * Math.sin(Math.PI * 2 * t * 15 + phase * 1.3);
  return { x, z, yaw, bobY, roll };
}

/* ------------------------------------------------------------------ */
/* Wind-blown dust (living motion, pure functions of t)                */
/* ------------------------------------------------------------------ */

/**
 * A dust lane is an authored ground track the northerly breeze sweeps along
 * (toward -x, south). Lanes are typed data and contract-verified clear of
 * every monument and earthwork footprint; drifting dust is atmosphere, but a
 * puff clipping through a ramp reads as a bug, not weather.
 */
export interface WindDustLane {
  id: string;
  /** Drift span: puffs travel from xHigh down to xLow (southward). */
  xLow: number;
  xHigh: number;
  /** Lane center line in z; puffs wander a little around it. */
  z: number;
}

export interface WindDustDescription {
  lanes: WindDustLane[];
  puffsPerLane: number;
  /**
   * Puff center height band; bottoms stay just off the ground. The floor
   * clears the worst case — lowest center, deepest bob, tallest puff at full
   * fade — so no rendered puff ever dips under the terrain (contract-tested).
   */
  altitude: [number, number];
  /** Drift distance per movie at 1x playback: a slow desert breeze. */
  unitsPerMovie: number;
  /** Peak material opacity before the haze coupling; shallow by design. */
  baseOpacity: number;
  description: string;
  historicalNote: string;
}

export const WIND_DUST: WindDustDescription = {
  lanes: [
    // North edge of the quarry cut, along the western road stretch.
    { id: 'quarry-rim', xLow: -76, xHigh: -30, z: 24 },
    // The main haul road's southern shoulder, threading the camp tent rows.
    { id: 'camp-fringe', xLow: -50, xHigh: 24, z: 42.5 },
    // The quarry floor's southern flank, over the western haul chord.
    { id: 'west-road', xLow: -76, xHigh: -40, z: 32 },
  ],
  puffsPerLane: 7,
  altitude: [0.9, 2.0],
  unitsPerMovie: 26,
  baseOpacity: 0.14,
  description:
    'Shallow wind-blown dust: sparse translucent puffs riding the ' +
    'prevailing northerly breeze along the haul roads and the quarry ' +
    'surround, fading in and out at the ends of their lanes so the loop ' +
    'never pops. Low enough never to conceal block transport.',
  historicalNote:
    'Afternoon khamsin winds lift Nile silt and limestone dust across the ' +
    'plateau; wetted haul roads kept working dust down, so the drifting ' +
    'haze belongs to the dry ground between the lanes.',
};

export interface WindDustPuffState {
  x: number;
  y: number;
  z: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  /** 0 at both lane ends, 1 mid-lane: the wrap never pops. */
  fade: number;
}

/**
 * Deterministic dust drift. Each puff loops its lane over the movie; the
 * fade pinches to zero at both ends so the wrap is invisible. Position,
 * size, and wander derive from the puff index and playback `t` only.
 */
export function windDustPuffAt(index: number, t: number): WindDustPuffState {
  const { lanes, altitude, unitsPerMovie } = WIND_DUST;
  const lane = lanes[index % lanes.length]!;
  const random = mulberry32(`giza:wind-dust:${index}`);
  const phase = random();
  const yBase = altitude[0] + random() * (altitude[1] - altitude[0]);
  const sizeX = 2.4 + random() * 2.2;
  const sizeY = 0.7 + random() * 0.7;
  const sizeZ = 1.3 + random() * 0.9;
  const wanderPhase = random() * Math.PI * 2;
  const bobPhase = random() * Math.PI * 2;

  const span = lane.xHigh - lane.xLow;
  const u = (((phase + (t * unitsPerMovie) / span) % 1) + 1) % 1;
  const fade = smoothstep(u / 0.12) * smoothstep((1 - u) / 0.12);
  return {
    x: lane.xHigh - u * span,
    y: yBase + 0.15 * Math.sin(u * Math.PI * 2 * 2.1 + bobPhase),
    z: lane.z + 1.1 * Math.sin(u * Math.PI * 2 * 1.3 + wanderPhase),
    scaleX: sizeX,
    scaleY: sizeY,
    scaleZ: sizeZ,
    fade,
  };
}

/* ------------------------------------------------------------------ */
/* River birds (living motion, pure functions of t)                    */
/* ------------------------------------------------------------------ */

export interface BirdFlockDescription {
  id: 'nile-egret-flock';
  species: 'cattle-egret';
  count: number;
  /** Orbit center x over the channel; z follows the sampled centerline. */
  centerX: number;
  /** Per-bird orbit radii ranges: along x and off the centerline. */
  radiusX: [number, number];
  radiusZ: [number, number];
  altitude: [number, number];
  /** Closed circuits per movie (magnitude); half the flock flies counter. */
  circuitsPerMovie: [number, number];
  /** Wing-beat cycles per movie while flapping (~2.2-2.8 Hz at 1x). */
  wingBeatsPerMovie: [number, number];
  description: string;
  historicalNote: string;
}

export const BIRD_FLOCK: BirdFlockDescription = {
  id: 'nile-egret-flock',
  species: 'cattle-egret',
  count: 12,
  centerX: 6,
  radiusX: [24, 34],
  radiusZ: [5, 9],
  altitude: [7, 13],
  circuitsPerMovie: [1.5, 2.5],
  wingBeatsPerMovie: [132, 168],
  description:
    'A small egret flock working the Nile bend on closed circling paths: ' +
    'position, heading, bank, wing flap, and glide gates are pure functions ' +
    'of playback t. Birds stay over the river and floodplain, below the ' +
    'monument tops and above the mast tips, and never cross masonry.',
  historicalNote:
    'Cattle egrets (Bubulcus ibis) and sacred ibises were everyday Nile ' +
    'valley birds in the Old Kingdom; egrets ride thermals over the ' +
    'floodplain and work the riverbanks in loose flocks.',
};

export interface BirdState {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  /** Constant bank into the circuit direction, as a circling bird does. */
  roll: number;
  /** Wing rotation (radians, + = raised); glides hold a shallow dihedral. */
  wingAngle: number;
}

/** Deterministic circling flight over the channel at playback `t`. */
export function birdStateAt(index: number, t: number): BirdState {
  const flock = BIRD_FLOCK;
  const random = mulberry32(`giza:bird:${index}`);
  const phase = random();
  const direction = index % 2 === 0 ? 1 : -1;
  const radiusX = lerp01(flock.radiusX, random());
  const radiusZ = lerp01(flock.radiusZ, random());
  const altitude = lerp01(flock.altitude, random());
  const circuits = lerp01(flock.circuitsPerMovie, random());
  const beats = lerp01(flock.wingBeatsPerMovie, random());
  const flapPhase = random() * Math.PI * 2;
  const glidePhase = random() * Math.PI * 2;
  const bobPhase = random() * Math.PI * 2;

  const theta = Math.PI * 2 * (phase + t * circuits * direction);
  const x = flock.centerX + radiusX * Math.cos(theta);
  const z = riverCenterZAt(x) + radiusZ * Math.sin(theta);
  const y = altitude + 1.1 * Math.sin(2 * theta + bobPhase);

  // Heading from the orbit derivative; atan2(dx, dz) matches the scene's
  // yaw convention (forward = +z rotated by yaw about +y).
  const dTheta = direction;
  const dx = -radiusX * Math.sin(theta) * dTheta;
  const dz =
    (riverCenterZAt(x + 0.5) - riverCenterZAt(x - 0.5)) * dx + radiusZ * Math.cos(theta) * dTheta;
  const yaw = Math.atan2(dx, dz);
  const horizontal = Math.hypot(dx, dz);
  const pitch = Math.atan2(2.2 * Math.cos(2 * theta + bobPhase), Math.max(horizontal, 1e-6)) * 0.35;
  const roll = -direction * 0.16;

  // Flap unless the slow glide gate is open; glides hold a shallow dihedral
  // with a hint of rocking.
  const glideSine = Math.sin(t * Math.PI * 2 * (1.3 + circuits * 0.7) + glidePhase);
  const glide = smoothstep((glideSine - 0.3) / 0.3);
  const flap = Math.sin(t * Math.PI * 2 * beats + flapPhase);
  const wingAngle = 0.18 + 0.62 * (1 - glide) * flap + glide * 0.05 * flap;

  return { x, y, z, yaw, pitch, roll, wingAngle };
}

/* ------------------------------------------------------------------ */
/* Cultivated strip (follows the near bank, never a fixed rectangle)   */
/* ------------------------------------------------------------------ */

export interface GreenbeltDescription {
  /** Levee width between the water edge and the cultivated strip. */
  bankOffset: number;
  /** Depth of the cultivated strip toward the plateau (world units). */
  depth: number;
  description: string;
  historicalNote: string;
}

export const GIZA_GREENBELT: GreenbeltDescription = {
  bankOffset: 1.6,
  depth: 22,
  description:
    'The cultivated strip hugs the meandering near bank: a foliage ribbon ' +
    'from the levee toward the plateau, carrying field parcels, palm rows, ' +
    'and short irrigation feeders that run in from the river.',
  historicalNote:
    'Egyptian fields ended at the riverbank levee; basin irrigation fed ' +
    'water from the channel into walled parcels, so the green/black ' +
    'boundary tracked every bend of the Nile.',
};

/** Inner (river-side) edge of the cultivated strip at world x. */
export function greenbeltInnerEdgeAt(x: number): number {
  return riverCenterZAt(x) + riverWidthAt(x) / 2 + GIZA_GREENBELT.bankOffset;
}

export interface FieldParcel {
  x: number;
  z: number;
  /** Yawed to the local channel tangent so parcels parallel the bank. */
  yaw: number;
  row: number;
  column: number;
}

/** Deterministic field parcel placement following the near bank. */
export function fieldParcelAt(index: number, columns = 12): FieldParcel {
  const row = Math.floor(index / columns);
  const column = index % columns;
  const x = -108 + column * 17.8;
  const z = greenbeltInnerEdgeAt(x) + 3.0 + row * 6.9;
  return { x, z, yaw: channelTangentYawAt(x), row, column };
}

export interface RiverBraidSample {
  centerZ: number;
  width: number;
}

/** Braided side channel; null outside the braid's x range. */
export function riverBraidAt(x: number): RiverBraidSample | null {
  const { braid } = GIZA_RIVER_CHANNEL;
  if (x < braid.startX || x > braid.endX) return null;
  const u = (x - braid.startX) / (braid.endX - braid.startX);
  const width = braid.maxWidth * Math.sin(Math.PI * u);
  const centerZ = riverCenterZAt(x) - riverWidthAt(x) / 2 - braid.gap - width / 2;
  return { centerZ, width };
}

export interface SettlementDescription {
  id: 'memphis';
  name: string;
  bearing: Compass;
  anchor: Vec3;
  description: string;
  historicalNote: string;
  features: Array<
    | 'mud-brick-homes'
    | 'flat-reed-roofs'
    | 'domed-granaries'
    | 'whitewashed-walls'
    | 'temple-pylons'
    | 'obelisks'
  >;
  /** Anachronisms that must never appear in this scene. */
  exclusions: string[];
}

export interface EcologyDescription {
  palms: { description: string; historicalNote: string };
  reeds: { description: string; historicalNote: string };
  crops: { description: string; historicalNote: string };
  birds: { description: string; historicalNote: string };
}

/* ------------------------------------------------------------------ */
/* Plan (numeric contract consumed by the renderer and tests)          */
/* ------------------------------------------------------------------ */

export interface HorizonRingPlan {
  radius: number;
  heightScale: number;
  baseY: number;
  /** Base vertex color for the ring, blended with the sector tint. */
  color: string;
}

export interface HorizonSample {
  angle: number;
  ridgeHeight: number;
  /** Dominant horizon sector at this angle. */
  sectorId: string;
  /** Sector tint blended over the ring color. */
  tint: string;
}

export interface GizaEnvironmentPlan {
  era: EraContext;
  orientation: CompassOrientation;
  geography: GeographyZone[];
  horizonSectors: HorizonSector[];
  riverCraft: RiverCraftDescription[];
  riverChannel: RiverChannelDescription;
  greenbelt: GreenbeltDescription;
  settlement: SettlementDescription;
  ecology: EcologyDescription;
  horizon: {
    motion: 'static-world-space';
    center: [number, number];
    radialSegments: number;
    rings: HorizonRingPlan[];
    samples: HorizonSample[];
  };
  fields: number;
  irrigationChannels: number;
  palms: number;
  reedClusters: number;
  riverBoats: number;
  cityBuildings: number;
  cityRoofs: number;
  mastabas: number;
  cloudBanks: {
    groups: number;
    membersPerGroup: number;
    minRadius: number;
    radialStep: number;
    minElevation: number;
    elevationRange: number;
  };
}

const ERA: EraContext = {
  label: 'Old Kingdom — Fourth Dynasty, reign of Khufu',
  dynasty: 'Fourth Dynasty',
  pharaoh: 'Khufu',
  approximateYear: -2560,
  season: 'peret',
  latitude: 29.9792,
  longitude: 31.1342,
  description:
    'The Giza plateau on the west bank of the Nile during the construction ' +
    'of the Great Pyramid, when Memphis was the capital of Egypt.',
  productionNote:
    'Workforce logistics historically peaked during akhet (the inundation, ' +
    'when fields were flooded); the scene instead shows peret, the growing ' +
    'season, so the greenbelt and field parcels stay legible as a cool color ' +
    'layer. This is an authored, plausible interpretation per Spec 00.',
};

const GEOGRAPHY: GeographyZone[] = [
  {
    id: 'plateau',
    bearing: 'west',
    anchor: [-10, 0, -20],
    extent: [90, 90],
    description:
      'The wind-scoured limestone plateau carrying the pyramids, quarry, ' +
      'ramps, and necropolis.',
    historicalNote:
      'The pyramids stand on the west bank — the side of the setting sun ' +
      'and the realm of the dead in Egyptian belief.',
  },
  {
    id: 'nile',
    bearing: 'east',
    anchor: [-10, 0, -105.5],
    extent: [115, 17],
    description:
      'The river channel east of the plateau — a broad S-meander with one ' +
      'braided side channel — carrying barge traffic between the Tura ' +
      'quarries, Aswan, and the construction harbor.',
    historicalNote:
      'In 2560 BCE a branch of the Nile (the Khufu branch) ran much closer ' +
      'to the plateau than the modern river, which is how casing stones ' +
      'reached the site by boat.',
  },
  {
    id: 'greenbelt',
    bearing: 'east',
    anchor: [-10, 0, -89],
    extent: [115, 24],
    description:
      'The cultivated floodplain strip between plateau and river, following ' +
      'every bend of the near bank: palms, reeds, field parcels, and ' +
      'irrigation feeders.',
    historicalNote:
      'Basin irrigation fed emmer wheat, barley, and flax on the floodplain; ' +
      'the stark desert/floodplain edge was called the "red land / black ' +
      'land" boundary (deshret / kemet).',
  },
  {
    id: 'memphis',
    bearing: 'south-east',
    anchor: [-72, 0, -136.5],
    extent: [80, 26],
    description:
      'The distant capital skyline across the river: mud-brick massing, ' +
      'whitewashed walls, granary domes, pylons, and obelisks.',
    historicalNote:
      'Memphis (Ineb-Hedj, "White Walls") lay roughly 20 km south of Giza ' +
      'and was the Old Kingdom administrative capital; it reads here as a ' +
      'southern-eastern skyline, never a modern city.',
  },
  {
    id: 'eastern-hills',
    bearing: 'east',
    anchor: [-10, 0, -320],
    extent: [400, 60],
    description:
      'Rocky desert hills closing the eastern horizon beyond the river.',
    historicalNote:
      'The Muqattam hills and the Arabian desert margin rise east of the ' +
      'Nile valley; the Tura limestone quarries cut into this escarpment.',
  },
  {
    id: 'western-desert',
    bearing: 'west',
    anchor: [-10, 0, 320],
    extent: [400, 60],
    description:
      'Low dunes and gravel plains of the Libyan desert under the setting ' +
      'sun.',
    historicalNote:
      'West of the plateau opens the Western (Libyan) Desert — deshret, the ' +
      'red land — where the sun dies each evening.',
  },
];

const HORIZON_SECTORS: HorizonSector[] = [
  {
    id: 'eastern-hills',
    label: 'Muqattam hills',
    description:
      'Higher, rockier ridges to the east beyond the Nile — the Arabian ' +
      'desert margin that held the Tura casing quarries.',
    centerDegrees: 270,
    widthDegrees: 130,
    heightMultiplier: 1.55,
    tint: '#8f6b4a',
  },
  {
    id: 'western-dunes',
    label: 'Libyan desert dunes',
    description:
      'Lower, softer dune silhouettes to the west where the sun sets.',
    centerDegrees: 90,
    widthDegrees: 140,
    heightMultiplier: 0.55,
    tint: '#d8b47e',
  },
  {
    id: 'northern-valley',
    label: 'Nile valley north',
    description:
      'The valley corridor running north toward the delta; mid-low ridges.',
    centerDegrees: 0,
    widthDegrees: 80,
    heightMultiplier: 0.8,
    tint: '#c2a06e',
  },
  {
    id: 'southern-valley',
    label: 'Nile valley south',
    description:
      'The valley corridor running south toward Memphis and Upper Egypt.',
    centerDegrees: 180,
    widthDegrees: 80,
    heightMultiplier: 0.9,
    tint: '#c69f6c',
  },
];

const RIVER_CRAFT: RiverCraftDescription[] = [
  {
    id: 'tura-barge',
    kind: 'cargo-barge',
    count: 4,
    heading: 'downstream-north',
    squareSail: false,
    cargo: 'tura-casing-stones',
    description:
      'Heavy wooden barges drifting north with the current, loaded with ' +
      'white Tura casing stones for the pyramid faces, twin quarter ' +
      'steering oars trailing at the raised stern.',
    historicalNote:
      'Fine white casing limestone came from Tura, across and down the ' +
      'river; granite came from Aswan far to the south. Cargo moved ' +
      'downstream (north) with the current, sails lowered and steering by ' +
      'large quarter oars; the crescent hull lifted bow and stern clear of ' +
      'the chop.',
  },
  {
    id: 'sailing-boat',
    kind: 'sailing-boat',
    count: 2,
    heading: 'upstream-south',
    squareSail: true,
    cargo: 'none',
    description:
      'Light wooden boats under a tall, narrow square sail laced between ' +
      'an upper yard and a lower boom on a bipod mast, running south ' +
      'against the current on the prevailing northerly wind.',
    historicalNote:
      'Egyptian river travel paired a north-flowing current with northerly ' +
      'winds: boats sailed south and drifted north. Old Kingdom rigs stepped ' +
      'a bipod (A-frame) mast carrying a square sail taller than wide ' +
      'between yard and boom; the lateen sail is a much later invention.',
  },
  {
    id: 'reed-skiff',
    kind: 'reed-skiff',
    count: 1,
    heading: 'moored',
    squareSail: false,
    cargo: 'reed-bundles',
    description:
      'A small bound-papyrus skiff with raised, tied-up ends, moored at ' +
      'the near bank among the reeds and loaded with cut reed bundles.',
    historicalNote:
      'Bundled papyrus skiffs were the everyday craft of the floodplain for ' +
      'fishing, fowling, and short crossings; their lashed ends rose in the ' +
      'steep crescent silhouette painted on Old Kingdom tomb walls.',
  },
];

const SETTLEMENT: SettlementDescription = {
  id: 'memphis',
  name: 'Memphis (Ineb-Hedj)',
  bearing: 'south-east',
  anchor: [-72, 0, -136.5],
  description:
    'The Old Kingdom capital seen across the river: dense mud-brick homes ' +
    'with flat reed roofs, domed granaries near the quays, a whitewashed ' +
    'riverfront wall, and a temple district with pylons and obelisks.',
  historicalNote:
    'Ineb-Hedj means "White Walls", likely after a whitewashed enclosure. ' +
    'The great Ptah temple (Hut-ka-Ptah) anchored its cult life. Nothing ' +
    'modern may silhouette here.',
  features: [
    'mud-brick-homes',
    'flat-reed-roofs',
    'domed-granaries',
    'whitewashed-walls',
    'temple-pylons',
    'obelisks',
  ],
  exclusions: [
    'minarets',
    'mosque-domes',
    'modern-skyline',
    'smokestacks',
    'glass-curtain-walls',
    'lateen-sails',
  ],
};

const ECOLOGY: EcologyDescription = {
  palms: {
    description:
      'Date palms leaning over the greenbelt: tapered trunks, two tiers of ' +
      'drooping fronds with per-instance color variation, dry dead-frond ' +
      'skirts, and a gentle sway in the northerly breeze (pure function of t).',
    historicalNote:
      'Date and doum palms lined the fields and provided fruit, fiber, and ' +
      'timber; they were never planted out on the bare plateau.',
  },
  reeds: {
    description: 'Papyrus and reed beds hugging both river banks.',
    historicalNote:
      'Papyrus (Cyperus papyrus) thrived in the Old Kingdom marshes and ' +
      'supplied rope, skiffs, and writing material.',
  },
  crops: {
    description:
      'Fixed field parcels of emmer wheat, barley, and flax in peret green, ' +
      'gridded by irrigation channels.',
    historicalNote:
      'Basin irrigation trapped floodwater in walled parcels; the scene ' +
      'shows the growing season rather than the inundation (see era note).',
  },
  birds: {
    description:
      'A cattle-egret flock circling the Nile bend on closed, deterministic ' +
      'paths (BIRD_FLOCK + birdStateAt): flapping, gliding, and banking over ' +
      'the channel, never crossing the plateau masonry.',
    historicalNote:
      'Egrets, ibises, and kites were constant presences over the Old ' +
      'Kingdom floodplain; the ibis was sacred to Thoth. The flock stays ' +
      'over the river where the birds actually worked.',
  },
};

/* ------------------------------------------------------------------ */
/* Deterministic plan factory                                          */
/* ------------------------------------------------------------------ */

function angularDistanceDegrees(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

/** Raised-cosine sector weight: 1 at the center, 0 at the window edge. */
function sectorWeight(angleDegrees: number, sector: HorizonSector): number {
  const distance = angularDistanceDegrees(angleDegrees, sector.centerDegrees);
  const halfWidth = sector.widthDegrees / 2;
  if (distance >= halfWidth) return 0;
  return 0.5 + 0.5 * Math.cos((Math.PI * distance) / halfWidth);
}

export function createGizaEnvironmentPlan(): GizaEnvironmentPlan {
  const radialSegments = 128;
  const random = mulberry32('giza:fixed-horizon:v1');
  const phases = [random() * Math.PI * 2, random() * Math.PI * 2, random() * Math.PI * 2];
  const samples = Array.from({ length: radialSegments }, (_, index) => {
    const angle = (index / radialSegments) * Math.PI * 2;
    const base =
      14 +
      Math.sin(angle * 3 + phases[0]!) * 5.8 +
      Math.sin(angle * 7 + phases[1]!) * 2.7 +
      Math.sin(angle * 13 + phases[2]!) * 1.2;
    const degrees = (angle * 180) / Math.PI;
    let multiplier = 1;
    let bestWeight = 0;
    let sectorId = 'open-desert';
    let tint = '#c9a06a';
    for (const sector of HORIZON_SECTORS) {
      const weight = sectorWeight(degrees, sector);
      multiplier += weight * (sector.heightMultiplier - 1);
      if (weight > bestWeight) {
        bestWeight = weight;
        sectorId = sector.id;
        tint = sector.tint;
      }
    }
    const ridgeHeight = Math.min(
      30,
      Math.max(3, base * Math.min(1.8, Math.max(0.4, multiplier))),
    );
    return { angle, ridgeHeight, sectorId, tint };
  });

  const cumulus = GIZA_SKY.cloudLayers.find((layer) => layer.id === 'cumulus-humilis')!;

  return {
    era: ERA,
    orientation: GIZA_COMPASS,
    geography: GEOGRAPHY,
    horizonSectors: HORIZON_SECTORS,
    riverCraft: RIVER_CRAFT,
    riverChannel: GIZA_RIVER_CHANNEL,
    greenbelt: GIZA_GREENBELT,
    settlement: SETTLEMENT,
    ecology: ECOLOGY,
    horizon: {
      motion: 'static-world-space',
      center: [-10, -20],
      radialSegments,
      rings: [
        { radius: 80, heightScale: 0, baseY: -3.4, color: '#d2aa76' },
        { radius: 160, heightScale: 0.02, baseY: -2.5, color: '#cda36e' },
        { radius: 245, heightScale: 0.08, baseY: -0.8, color: '#c69a66' },
        { radius: 277, heightScale: 0.56, baseY: -0.15, color: '#ae7d4d' },
        { radius: 320, heightScale: 1, baseY: 0, color: '#8f633f' },
        { radius: 520, heightScale: 0.12, baseY: -3.2, color: '#a97749' },
        { radius: 900, heightScale: 0.02, baseY: -7.5, color: '#b98957' },
        { radius: 1_800, heightScale: 0, baseY: -18, color: '#c6a477' },
      ],
      samples,
    },
    fields: 36,
    irrigationChannels: 7,
    palms: 56,
    reedClusters: 112,
    riverBoats: RIVER_CRAFT.reduce((total, craft) => total + craft.count, 0),
    cityBuildings: 168,
    cityRoofs: 116,
    mastabas: 64,
    cloudBanks: {
      groups: cumulus.groups,
      membersPerGroup: cumulus.membersPerGroup,
      minRadius: cumulus.radius.min,
      radialStep: cumulus.radius.step,
      minElevation: cumulus.altitude.min,
      elevationRange: cumulus.altitude.range,
    },
  };
}

export const GIZA_ENVIRONMENT = createGizaEnvironmentPlan();
