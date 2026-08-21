import { describe, expect, it } from 'vitest';
import { InstancedMesh, type MeshStandardMaterial } from 'three';
import {
  channelArcLengthAt,
  fieldAbsorptionAt,
  fieldParcelAt,
  GIZA_ENVIRONMENT,
  greenbeltInnerEdgeAt,
  riverBraidAt,
  riverCenterZAt,
  riverCraftStateAt,
  riverWidthAt,
} from '../src/data/gizaEnvironment';
import { GIZA_CONSTRUCTION } from '../src/data/gizaConstruction';
import { GizaEnvironment } from '../src/render/three/Environment';
import { createMaterialLibrary } from '../src/render/three/MaterialLibrary';
import type { Wonder } from '../src/data/types';

const fixtureWonder: Wonder = {
  id: 'river-fixture',
  name: 'Fixture',
  location: 'Nowhere',
  region: 'Testland',
  era: 'ancient',
  completedYear: 1,
  endsAtNight: false,
  quote: { text: 'q', author: 'a' },
  description: 'd',
  facts: ['a', 'b', 'c'],
  palette: { ground: '#7a6a55', primary: '#c9b18a', accent: '#8a6f4d', sky: '#87b5d6' },
  structure: { stages: [{ name: 's', parts: [] }] },
};

function boatMeshes(environment: GizaEnvironment): Map<string, InstancedMesh> {
  const meshes = new Map<string, InstancedMesh>();
  environment.group.traverse((child) => {
    if (child instanceof InstancedMesh && child.name.startsWith('nile-')) {
      meshes.set(child.name, child);
    }
  });
  return meshes;
}

/** Min/max of one component of a geometry's position attribute. */
function componentRange(mesh: InstancedMesh, component: 0 | 1 | 2): [number, number] {
  const position = mesh.geometry.getAttribute('position');
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < position.count; i += 1) {
    const value = position.getComponent(i, component);
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  return [min, max];
}

describe('Nile channel description (Spec 08)', () => {
  it('meanders visibly instead of running straight', () => {
    let min = Infinity;
    let max = -Infinity;
    for (let x = -125; x <= 105; x += 0.5) {
      const z = riverCenterZAt(x);
      min = Math.min(min, z);
      max = Math.max(max, z);
    }
    // The S-meander must be obvious from the orbit camera, not cosmetic.
    expect(max - min).toBeGreaterThan(12);
  });

  it('keeps the channel inside the floodplain band', () => {
    for (let x = -125; x <= 105; x += 0.25) {
      const half = riverWidthAt(x) / 2;
      const center = riverCenterZAt(x);
      // North edge stays clear of the plateau monuments, south edge clear
      // of the Memphis foreshore (walls begin at settlement z +10.5).
      expect(center + half).toBeLessThan(-84);
      expect(center - half).toBeGreaterThan(-124);
      const braid = riverBraidAt(x);
      if (braid) {
        expect(braid.centerZ - braid.width / 2).toBeGreaterThan(-130);
      }
    }
  });

  it('keeps the braid lens-shaped, tapering to nothing at both ends', () => {
    expect(riverBraidAt(GIZA_ENVIRONMENT.riverChannel.braid.startX - 1)).toBeNull();
    expect(riverBraidAt(GIZA_ENVIRONMENT.riverChannel.braid.endX + 1)).toBeNull();
    const start = riverBraidAt(GIZA_ENVIRONMENT.riverChannel.braid.startX)!;
    const end = riverBraidAt(GIZA_ENVIRONMENT.riverChannel.braid.endX)!;
    expect(start.width).toBeLessThan(0.05);
    expect(end.width).toBeLessThan(0.05);
    const middle = riverBraidAt(
      (GIZA_ENVIRONMENT.riverChannel.braid.startX + GIZA_ENVIRONMENT.riverChannel.braid.endX) / 2,
    )!;
    expect(middle.width).toBeGreaterThan(2.5);
  });

  it('flows north along +x with gentle tangent slopes', () => {
    for (let x = -124; x <= 104; x += 1) {
      const slope = Math.abs(riverCenterZAt(x + 1) - riverCenterZAt(x - 1)) / 2;
      // Banks and craft yaw to this tangent; it must stay visually gentle.
      // Analytic bound: 6.8·2π/250 + 1.7·2π/78 ≈ 0.308.
      expect(slope).toBeLessThan(0.33);
    }
  });

  it('keeps Memphis clear of the channel and braid', () => {
    const [, , anchorZ] = GIZA_ENVIRONMENT.settlement.anchor;
    const nearestCityEdge = anchorZ + 10.5; // whitewashed riverfront walls
    for (let x = -125; x <= 105; x += 0.25) {
      const southEdge = riverCenterZAt(x) - riverWidthAt(x) / 2;
      expect(southEdge).toBeGreaterThan(nearestCityEdge + 0.5);
      const braid = riverBraidAt(x);
      if (braid) {
        expect(braid.centerZ - braid.width / 2).toBeGreaterThan(nearestCityEdge + 0.5);
      }
    }
  });

  it('keeps the cultivated strip on land, between levee and monuments', () => {
    const { depth } = GIZA_ENVIRONMENT.greenbelt;
    for (let x = -125; x <= 105; x += 0.25) {
      const inner = greenbeltInnerEdgeAt(x);
      // The strip starts beyond the water edge and never reaches the
      // monument band (Menkaure's river-side corner sits at z -52.5).
      expect(inner).toBeGreaterThan(riverCenterZAt(x) + riverWidthAt(x) / 2);
      expect(inner + depth).toBeLessThan(-60);
    }
  });

  it('places every field parcel on the cultivated strip, parallel to the bank', () => {
    const { depth } = GIZA_ENVIRONMENT.greenbelt;
    for (let i = 0; i < GIZA_ENVIRONMENT.fields; i += 1) {
      const parcel = fieldParcelAt(i);
      const half = riverWidthAt(parcel.x) / 2;
      // Parcel center stays on dry land and inside the strip depth.
      expect(parcel.z).toBeGreaterThan(riverCenterZAt(parcel.x) + half + 1);
      expect(parcel.z).toBeLessThan(greenbeltInnerEdgeAt(parcel.x) + depth);
      // Bank-parallel within the seeded yaw jitter envelope (±0.03 rad).
      const tangent = Math.atan2(
        riverCenterZAt(parcel.x + 1) - riverCenterZAt(parcel.x - 1),
        2,
      );
      expect(Math.abs(parcel.yaw - tangent)).toBeLessThanOrEqual(0.031);
    }
  });

  it('jitters, merges, and rests parcels — never a uniform lattice', () => {
    let merged = 0;
    let bare = 0;
    let widened = 0;
    const widths = new Set<number>();
    for (let i = 0; i < GIZA_ENVIRONMENT.fields; i += 1) {
      const parcel = fieldParcelAt(i);
      if (parcel.merged) {
        merged += 1;
        expect(parcel.width).toBe(0);
        continue;
      }
      if (parcel.bare) bare += 1;
      widths.add(Number(parcel.width.toFixed(4)));
      const absorbed = fieldAbsorptionAt(i);
      expect(absorbed.width).toBeGreaterThanOrEqual(parcel.width);
      if (absorbed.width > parcel.width) {
        widened += 1;
        expect(absorbed.xOffset).toBeGreaterThan(0);
      }
    }
    // The mosaic needs every break from uniformity present.
    expect(merged).toBeGreaterThan(0);
    expect(bare).toBeGreaterThan(0);
    expect(widened).toBeGreaterThan(0);
    expect(widths.size).toBeGreaterThan(GIZA_ENVIRONMENT.fields / 2);
  });
});

describe('River craft kinematics (Spec 08 §Living environment)', () => {
  const T_SAMPLES = [0, 0.13, 0.37, 0.62, 0.9, 1];

  it('is a pure deterministic function of playback t', () => {
    const barge = GIZA_ENVIRONMENT.riverCraft[0]!;
    for (const t of T_SAMPLES) {
      expect(riverCraftStateAt(barge, 0, t)).toEqual(riverCraftStateAt(barge, 0, t));
    }
  });

  it('drifts barges north with the current and sails boats south', () => {
    const barge = GIZA_ENVIRONMENT.riverCraft.find((c) => c.kind === 'cargo-barge')!;
    const sail = GIZA_ENVIRONMENT.riverCraft.find((c) => c.kind === 'sailing-boat')!;
    const skiff = GIZA_ENVIRONMENT.riverCraft.find((c) => c.kind === 'reed-skiff')!;
    expect(riverCraftStateAt(barge, 0, 1).x).toBeGreaterThan(riverCraftStateAt(barge, 0, 0).x);
    expect(riverCraftStateAt(sail, 4, 1).x).toBeLessThan(riverCraftStateAt(sail, 4, 0).x);
    expect(riverCraftStateAt(skiff, 6, 0).x).toBe(riverCraftStateAt(skiff, 6, 1).x);
  });

  it('keeps every hull inside the channel water at all times', () => {
    let globalIndex = 0;
    for (const craft of GIZA_ENVIRONMENT.riverCraft) {
      for (let unit = 0; unit < craft.count; unit += 1) {
        for (const t of T_SAMPLES) {
          const state = riverCraftStateAt(craft, globalIndex, t);
          expect(state.x).toBeGreaterThanOrEqual(-118);
          expect(state.x).toBeLessThan(98 + 1);
          const half = riverWidthAt(state.x) / 2;
          expect(Math.abs(state.z - riverCenterZAt(state.x))).toBeLessThan(half);
          // Gentle bob and roll, always right-side up and afloat.
          expect(state.bobY).toBeGreaterThan(0.4);
          expect(state.bobY).toBeLessThan(0.55);
          // Wave roll + helm heel stay well inside a stable hull's envelope.
          expect(Math.abs(state.roll)).toBeLessThan(0.09);
          expect(Math.abs(state.pitch)).toBeLessThan(0.09);
        }
        globalIndex += 1;
      }
    }
  });

  it('heads hulls along the local channel tangent, with helm lag and weave', () => {
    const barge = GIZA_ENVIRONMENT.riverCraft.find((c) => c.kind === 'cargo-barge')!;
    for (const t of T_SAMPLES) {
      const state = riverCraftStateAt(barge, 1, t);
      const tangent = Math.atan2(
        riverCenterZAt(state.x + 1) - riverCenterZAt(state.x - 1),
        2,
      );
      // Heading tracks the tangent within the lag + weave envelope — never
      // crossing the channel, never mechanically exact.
      expect(Math.abs(state.yaw - (tangent + 0.08))).toBeLessThan(0.12);
    }
  });

  it('advances craft along the channel arc, not raw x (no surging through bends)', () => {
    const sail = GIZA_ENVIRONMENT.riverCraft.find((c) => c.kind === 'sailing-boat')!;
    // Equal time steps cover equal arc length, within the gust band.
    const steps = 40;
    const arcs: number[] = [];
    for (let i = 0; i <= steps; i += 1) {
      arcs.push(channelArcLengthAt(riverCraftStateAt(sail, 4, i / steps).x));
    }
    // Unwrap the wrap point so differences measure real travel.
    const totalArc = channelArcLengthAt(98) - channelArcLengthAt(-118);
    for (let i = 1; i < arcs.length; i += 1) {
      let delta = arcs[i]! - arcs[i - 1]!;
      if (delta > totalArc / 2) delta -= totalArc;
      if (delta < -totalArc / 2) delta += totalArc;
      const perStep = delta * steps;
      expect(Math.abs(perStep)).toBeGreaterThan(20);
      expect(Math.abs(perStep)).toBeLessThan(50);
    }
  });

  it('moves the fleet at a perceptible pace — a hull length in seconds', () => {
    const barge = GIZA_ENVIRONMENT.riverCraft.find((c) => c.kind === 'cargo-barge')!;
    const sail = GIZA_ENVIRONMENT.riverCraft.find((c) => c.kind === 'sailing-boat')!;
    // The movie is 60 s; a 4.6-unit hull at 26+ units/movie crosses its own
    // length in ~11 s of playback (was ~35 s — an imperceptible drift).
    const bargeArc =
      channelArcLengthAt(riverCraftStateAt(barge, 0, 1).x) -
      channelArcLengthAt(riverCraftStateAt(barge, 0, 0).x);
    const sailArc = Math.abs(
      channelArcLengthAt(riverCraftStateAt(sail, 5, 1).x) -
        channelArcLengthAt(riverCraftStateAt(sail, 5, 0).x),
    );
    expect(bargeArc).toBeGreaterThan(15);
    expect(sailArc).toBeGreaterThan(30);
  });

  it('couples hull motion to the wave field: bob, pitch, roll all live', () => {
    const barge = GIZA_ENVIRONMENT.riverCraft.find((c) => c.kind === 'cargo-barge')!;
    let bobRange = 0;
    let pitchRange = 0;
    let minBob = Infinity;
    let maxBob = -Infinity;
    let minPitch = Infinity;
    let maxPitch = -Infinity;
    for (let i = 0; i <= 100; i += 1) {
      const state = riverCraftStateAt(barge, 2, i / 100);
      minBob = Math.min(minBob, state.bobY);
      maxBob = Math.max(maxBob, state.bobY);
      minPitch = Math.min(minPitch, state.pitch);
      maxPitch = Math.max(maxPitch, state.pitch);
    }
    bobRange = maxBob - minBob;
    pitchRange = maxPitch - minPitch;
    expect(bobRange).toBeGreaterThan(0.01);
    expect(pitchRange).toBeGreaterThan(0.004);
    // Steering oars sweep, biased into the turn.
    let oarMin = Infinity;
    let oarMax = -Infinity;
    for (let i = 0; i <= 100; i += 1) {
      const { oarSweep } = riverCraftStateAt(barge, 2, i / 100);
      oarMin = Math.min(oarMin, oarSweep);
      oarMax = Math.max(oarMax, oarSweep);
    }
    expect(oarMax - oarMin).toBeGreaterThan(0.1);
  });

  it('marks the moored skiff as wake-ineligible while the fleet moves', () => {
    const skiff = GIZA_ENVIRONMENT.riverCraft.find((c) => c.kind === 'reed-skiff')!;
    const barge = GIZA_ENVIRONMENT.riverCraft.find((c) => c.kind === 'cargo-barge')!;
    expect(riverCraftStateAt(skiff, 6, 0.5).groundSpeed).toBe(0);
    expect(riverCraftStateAt(barge, 0, 0.5).groundSpeed).toBeGreaterThan(15);
    // Moored does not mean frozen: the wave field still rocks the skiff.
    expect(riverCraftStateAt(skiff, 6, 0.25).bobY)
      .not.toBe(riverCraftStateAt(skiff, 6, 0.75).bobY);
  });
});

describe('River craft geometry (era-correct silhouette)', () => {
  const environment = new GizaEnvironment(
    GIZA_CONSTRUCTION,
    createMaterialLibrary(fixtureWonder),
  );
  const meshes = boatMeshes(environment);
  const sailBoats = GIZA_ENVIRONMENT.riverCraft
    .filter((craft) => craft.squareSail)
    .reduce((total, craft) => total + craft.count, 0);
  const skiffs = GIZA_ENVIRONMENT.riverCraft
    .filter((craft) => craft.kind === 'reed-skiff')
    .reduce((total, craft) => total + craft.count, 0);
  const wooden = GIZA_ENVIRONMENT.riverBoats - skiffs;

  /** Highest vertex y among stations near the ends vs near midships. */
  function sheerProfile(mesh: InstancedMesh): { ends: number; midships: number } {
    const position = mesh.geometry.getAttribute('position');
    const [, xMax] = componentRange(mesh, 0);
    let ends = -Infinity;
    let midships = -Infinity;
    for (let i = 0; i < position.count; i += 1) {
      const x = position.getX(i);
      const y = position.getY(i);
      if (Math.abs(x) > xMax * 0.85) ends = Math.max(ends, y);
      if (Math.abs(x) < xMax * 0.15) midships = Math.max(midships, y);
    }
    return { ends, midships };
  }

  it('gives wooden hulls a crescent sheer: bow and stern above midships', () => {
    const hulls = meshes.get('nile-wooden-hulls');
    expect(hulls).toBeDefined();
    expect(hulls!.count).toBe(wooden);
    const { ends, midships } = sheerProfile(hulls!);
    // Old Kingdom hulls rose toward the ends; an inverted sheer (ends
    // lower than midships) is the regression this guards against.
    expect(ends).toBeGreaterThan(midships + 0.3);
  });

  it('gives the reed skiff a papyriform hull in a straw tone', () => {
    const skiff = meshes.get('nile-papyrus-skiff-hulls');
    expect(skiff).toBeDefined();
    expect(skiff!.count).toBe(skiffs);
    const { ends, midships } = sheerProfile(skiff!);
    // Bundled-reed craft tied their ends up dramatically.
    expect(ends).toBeGreaterThan(midships + 0.6);
    // Straw, not wood: the skiff must not render as a miniature wooden hull.
    const material = skiff!.material as MeshStandardMaterial;
    const wood = meshes.get('nile-wooden-hulls')!.material as MeshStandardMaterial;
    expect(material.color.getHexString()).not.toBe(wood.color.getHexString());
  });

  it('rigs sailing boats with a bipod mast, upper yard, and lower boom', () => {
    const legs = meshes.get('nile-bipod-mast-legs');
    const yards = meshes.get('nile-square-sail-yards');
    const booms = meshes.get('nile-square-sail-booms');
    expect(legs).toBeDefined();
    expect(yards).toBeDefined();
    expect(booms).toBeDefined();
    // Bipod (A-frame): two legs per sailed boat, not a single pole mast.
    expect(legs!.count).toBe(sailBoats * 2);
    expect(yards!.count).toBe(sailBoats);
    expect(booms!.count).toBe(sailBoats);
  });

  it('carries square sails taller than wide (Old Kingdom proportions)', () => {
    const sails = meshes.get('nile-square-linen-sails');
    expect(sails).toBeDefined();
    const [yMin, yMax] = componentRange(sails!, 1);
    const [zMin, zMax] = componentRange(sails!, 2);
    expect(yMax - yMin).toBeGreaterThan(zMax - zMin);
  });

  it('steers with large quarter oars at the stern', () => {
    const oars = meshes.get('nile-quarter-steering-oars');
    expect(oars).toBeDefined();
    // Two quarter oars per wooden hull, one for the skiff.
    expect(oars!.count).toBe(wooden * 2 + skiffs);
    // Oar = shaft plus a flattened blade below the pivot.
    const [yMin, yMax] = componentRange(oars!, 1);
    expect(yMax).toBeGreaterThan(0.5); // handle above the pivot
    expect(yMin).toBeLessThan(-1.5); // blade reaches the water
  });

  it('renders the skiff declared reed-bundle cargo', () => {
    const declared = GIZA_ENVIRONMENT.riverCraft.filter(
      (craft) => craft.cargo === 'reed-bundles',
    );
    expect(declared.length).toBeGreaterThanOrEqual(1);
    const bundles = meshes.get('nile-skiff-reed-bundle-cargo');
    expect(bundles).toBeDefined();
    expect(bundles!.count).toBe(
      declared.reduce((total, craft) => total + craft.count, 0) * 3,
    );
  });

  it('keeps the whole fleet within a tight, itemized draw-call budget', () => {
    // Nine hull/rig/cargo batches plus the living-water fittings: wakes,
    // crew bodies + heads, jars, rope coils, mooring rope. (The mooring
    // stake is a plain Mesh and never enters this census.) The bank reeds,
    // egret flock, and waterline foam are river ecology, not fleet.
    const ecology = new Set([
      'nile-bank-reed-clusters',
      'nile-egret-bodies',
      'nile-egret-wings',
      'nile-waterline-foam',
    ]);
    const fleetMeshes = [...meshes.keys()].filter((name) => !ecology.has(name));
    expect([...fleetMeshes].sort()).toEqual([
      'nile-barge-tura-casing-cargo',
      'nile-bipod-mast-legs',
      'nile-boat-crew-bodies',
      'nile-boat-crew-heads',
      'nile-boat-rope-coils',
      'nile-boat-wake-ribbons',
      'nile-boat-water-jars',
      'nile-papyrus-skiff-hulls',
      'nile-quarter-steering-oars',
      'nile-skiff-mooring-rope',
      'nile-skiff-reed-bundle-cargo',
      'nile-square-linen-sails',
      'nile-square-sail-booms',
      'nile-square-sail-yards',
      'nile-wooden-hulls',
    ]);
  });

  it('stays deterministic across repeated construction', () => {
    const again = new GizaEnvironment(
      GIZA_CONSTRUCTION,
      createMaterialLibrary(fixtureWonder),
    );
    const first = boatMeshes(environment).get('nile-wooden-hulls')!;
    const second = boatMeshes(again).get('nile-wooden-hulls')!;
    expect(Array.from(second.instanceMatrix.array)).toEqual(
      Array.from(first.instanceMatrix.array),
    );
    again.dispose();
  });
});
