import { getBakedEiffelUpperRoute, eiffelUpperManifestHash, eiffelUpperRouteDomainHash } from './eiffelUpperRouteCache';
import { sampleEiffelUpperRoute, type EiffelUpperRoute } from './eiffelUpperClearance';
import type { EiffelKitManifest, EiffelKitPart } from '../data/eiffelKitTypes';
import {
  sampleEiffelCrane,
  type EiffelCraneSample,
  type EiffelCraneStation,
} from './eiffelCrane';
import {
  auditEiffelStationMap,
  type EiffelStationBracket,
} from './eiffelStationMap';
import { scheduleEiffelKitTiming } from './eiffelConstructionTiming';
import { eiffelTerrainHeightAt } from './eiffelTerrain';
import { createEiffelFoundationRouter, sampleEiffelFoundationRoute, eiffelFoundationRouteMotion, eiffelFoundationCarrierSize, type EiffelFoundationRoute } from './eiffelFoundationRoute';
import {
  composeRigidPoses,
  interpolateRigidPose,
  transformedRigidBounds,
  type RigidPose,
  type RigidQuat,
  type RigidVec3,
} from './eiffelRigid';
import {EIFFEL_SUMMIT_RIGID_ASSEMBLIES,eiffelRigidAssemblyRelativePose}from'./eiffelRigidAssembly';

export interface EiffelProductionOperation {
  readonly part: EiffelKitPart;
  readonly start: number;
  readonly end: number;
  readonly pickup: RigidPose;
  readonly clear: RigidPose;
  readonly approach: RigidPose;
  readonly waypoint: RigidPose;
  readonly station: EiffelCraneStation | null;
  readonly bracket: EiffelStationBracket | null;
  readonly staging: RigidPose;
  readonly receiver: {
    readonly center: RigidVec3;
    readonly size: RigidVec3;
    readonly saddles: readonly [RigidVec3, RigidVec3];
    readonly directDeckSupport?: true;
  } | null;
  readonly foundationRoute?: EiffelFoundationRoute;
  readonly upperRoute?: EiffelUpperRoute;
  readonly upperClearance?: 'sampled-clear' | 'unresolved';
  readonly hero: boolean;
  readonly wave: number;
  /** A factory-fastened child follows this operation's rigid frame and never
   * owns construction equipment. The object reference is plan-local only. */
  readonly assemblyParentId?:string;
  readonly assemblyRelativePose?:RigidPose;
  readonly assemblyParentOperation?:EiffelProductionOperation;
  readonly handlingLocalBounds?:{readonly min:RigidVec3;readonly max:RigidVec3};
  readonly assemblyDeckClear?:RigidPose;
  readonly assemblyOutboardLow?:RigidPose;
}
export interface EiffelProductionPlan {
  readonly operations: readonly EiffelProductionOperation[];
  readonly byPart: ReadonlyMap<string, EiffelProductionOperation>;
}
export interface EiffelProductionSample {
  readonly phase:
    'queued' | 'haul' | 'staged' | 'hoist' | 'transfer' | 'lower' | 'seated';
  readonly pose: RigidPose;
  readonly crane: EiffelCraneSample | null;
  readonly bracket: EiffelStationBracket | null;
  readonly carrier: {
    readonly center: RigidVec3;
    readonly size: RigidVec3;
    readonly supportY: number;
    readonly motive: boolean;
    readonly steering?: { readonly yaw: number; readonly distance: number; readonly walking: boolean };
  } | null;
  readonly receiver: EiffelProductionOperation['receiver'];
}
const smooth = (x: number) => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};
function orbitTransfer(
  from: RigidPose,
  to: RigidPose,
  station: EiffelCraneStation,
  t: number,
): RigidPose {
  const pose = interpolateRigidPose(from, to, t);
  const ax = from.position[0] - station.base[0],
    az = from.position[2] - station.base[2],
    bx = to.position[0] - station.base[0],
    bz = to.position[2] - station.base[2];
  let a = Math.atan2(az, ax),
    b = Math.atan2(bz, bx);
  while (b - a > Math.PI) b -= Math.PI * 2;
  while (b - a < -Math.PI) b += Math.PI * 2;
  const radius =
      Math.hypot(ax, az) + (Math.hypot(bx, bz) - Math.hypot(ax, az)) * t,
    angle = a + (b - a) * t;
  return {
    position: [
      station.base[0] + Math.cos(angle) * radius,
      pose.position[1],
      station.base[2] + Math.sin(angle) * radius,
    ],
    quaternion: pose.quaternion,
  };
}

export function createEiffelProductionPlan(
  manifest: EiffelKitManifest,
  options: { readonly upperClearance?: 'baked' | 'skip' } = {},
): EiffelProductionPlan {
  const stations = auditEiffelStationMap(manifest);
  if (stations.gaps.length)
    throw new Error(
      `Eiffel production has ${stations.gaps.length} unsupported stations`,
    );
  const brackets = new Map(stations.brackets.map((b) => [b.partId, b]));
  const ordered = manifest.parts
    .slice()
    .sort(
      (a, b) =>
        a.stage - b.stage ||
        a.boundsMin[1] - b.boundsMin[1] ||
        a.id.localeCompare(b.id),
    );
  const dependencies = new Map<string, readonly string[]>();
  for (const part of ordered) {
    const candidate = stations.candidates.get(part.id);
    dependencies.set(part.id, candidate ? [candidate.supportPartId] : []);
  }
  const timing = scheduleEiffelKitTiming(ordered, dependencies);
  const foundationRouter = createEiffelFoundationRouter(manifest.parts);
  const upperManifestHash = eiffelUpperManifestHash(manifest);
  const upperRouteDomainHash = eiffelUpperRouteDomainHash(manifest);
  const independentOperations = ordered.map((part, index): EiffelProductionOperation => {
    const { start, end, hero, wave } = timing.get(part.id)!;
    if (part.group === 'foundation') {
      const px = 82 + (index % 2) * 4,
        pz = 72 + (index % 4) * 3;
      const pickup: RigidPose = {
        position: [
          px,
          eiffelTerrainHeightAt(px, pz) + 0.6 - part.localBounds.min[1],
          pz,
        ],
        quaternion: [0, 0, 0, 1],
      };
      const radialLength = Math.hypot(part.center[0], part.center[2]) || 1,
        rx = part.center[0] / radialLength,
        rz = part.center[2] / radialLength;
      const sx = part.finalPose.position[0] + rx * 7,
        sz = part.finalPose.position[2] + rz * 7;
      const staging: RigidPose = {
        position: [
          sx,
          eiffelTerrainHeightAt(sx, sz) + 0.6 - part.localBounds.min[1],
          sz,
        ],
        quaternion: [0, 0, 0, 1],
      };
      const stationX = part.center[0] + rx * 3.5,
        stationZ = part.center[2] + rz * 3.5;
      const station: EiffelCraneStation = {
        base: [stationX, eiffelTerrainHeightAt(stationX, stationZ), stationZ],
        mastHeight: 8,
        boomLength: 8.4,
      };
      const clear: RigidPose = {
        position: [
          staging.position[0],
          Math.max(5.5 - part.localBounds.min[1], staging.position[1] + 0.6),
          staging.position[2],
        ],
        quaternion: part.finalPose.quaternion,
      };
      const approach: RigidPose = {
        position: [
          part.finalPose.position[0],
          part.finalPose.position[1] + 0.5,
          part.finalPose.position[2],
        ],
        quaternion: part.finalPose.quaternion,
      };
      return {
        part,
        start,
        end,
        hero,
        wave,
        pickup,
        staging,
        clear,
        waypoint: clear,
        approach,
        station,
        bracket: null,
        receiver: null,
        foundationRoute: foundationRouter(part, pickup, staging),
      };
    }
    const candidate = stations.candidates.get(part.id)!;
    let bracket = brackets.get(part.id) ?? null;
    let stationPoint = candidate.stationPoint;
    const cargoRadius =
      Math.hypot(
        Math.max(
          Math.abs(part.localBounds.min[0]),
          Math.abs(part.localBounds.max[0]),
        ),
        Math.max(
          Math.abs(part.localBounds.min[2]),
          Math.abs(part.localBounds.max[2]),
        ),
      ) + 0.9;
    if (candidate.horizontalReach < cargoRadius) {
      let vx = part.center[0] - candidate.supportPoint[0],
        vz = part.center[2] - candidate.supportPoint[2],
        vl = Math.hypot(vx, vz);
      if (vl < 1e-6) {
        vl = Math.hypot(part.center[0], part.center[2]) || 1;
        vx = part.center[0] || 1;
        vz = part.center[2];
      }
      stationPoint = [
        part.center[0] - (vx / vl) * cargoRadius,
        candidate.supportPoint[1],
        part.center[2] - (vz / vl) * cargoRadius,
      ];
      let extension = Math.hypot(
        stationPoint[0] - candidate.supportPoint[0],
        stationPoint[2] - candidate.supportPoint[2],
      );
      if (extension > 4) {
        stationPoint = [
          candidate.supportPoint[0] + ((stationPoint[0] - candidate.supportPoint[0]) * 4) / extension,
          candidate.supportPoint[1],
          candidate.supportPoint[2] + ((stationPoint[2] - candidate.supportPoint[2]) * 4) / extension,
        ];
        extension = 4;
      }
      bracket = {
        partId: part.id,
        supportPartId: candidate.supportPartId,
        saddle: candidate.supportPoint,
        saddles: candidate.supportSaddles,
        tip: stationPoint,
        extension,
        dependencyPartIds: [candidate.supportPartId],
      };
    }
    let station: EiffelCraneStation = {
      base: stationPoint,
      mastHeight: 22,
      boomLength: 8.4,
    };
    const finalBounds = transformedRigidBounds(
      part.finalPose,
      part.localBounds.min,
      part.localBounds.max,
    );
    let dx = part.center[0] - station.base[0],
      dz = part.center[2] - station.base[2],
      length = Math.hypot(dx, dz);
    if (length < 1e-6) {
      length = Math.hypot(part.center[0], part.center[2]) || 1;
      dx = part.center[0] || 1;
      dz = part.center[2];
    }
    const radius = Math.hypot(
      Math.max(
        Math.abs(part.localBounds.min[0]),
        Math.abs(part.localBounds.max[0]),
      ),
      Math.max(
        Math.abs(part.localBounds.min[2]),
        Math.abs(part.localBounds.max[2]),
      ),
    );
    const offset = Math.min(4, cargoRadius);
    const pickup: RigidPose = {
      position: [
        station.base[0] - (dx / length) * offset,
        station.base[1] + 0.9 - part.localBounds.min[1],
        station.base[2] - (dz / length) * offset,
      ],
      quaternion: [0, 0, 0, 1],
    };
    const pickupBounds = transformedRigidBounds(
      pickup,
      part.localBounds.min,
      part.localBounds.max,
    );
    // Keep the hook inside the finite mast/jib headroom. The swept-collision
    // gate below must reject routes whose direct transfer corridor is occupied.
    const clearBottom = Math.max(
      pickupBounds.min[1] + 0.6,
      finalBounds.min[1] + 0.6,
    );
    const oriented = transformedRigidBounds(
      { position: [0, 0, 0], quaternion: part.finalPose.quaternion },
      part.localBounds.min,
      part.localBounds.max,
    );
    const clear: RigidPose = {
      position: [
        pickup.position[0],
        clearBottom - oriented.min[1],
        pickup.position[2],
      ],
      quaternion: part.finalPose.quaternion,
    };
    const approach: RigidPose = {
      position: [
        part.finalPose.position[0],
        part.finalPose.position[1] + clearBottom - finalBounds.min[1],
        part.finalPose.position[2],
      ],
      quaternion: part.finalPose.quaternion,
    };
    const ax = clear.position[0] - station.base[0],
      az = clear.position[2] - station.base[2],
      bx = approach.position[0] - station.base[0],
      bz = approach.position[2] - station.base[2];
    const al = Math.hypot(ax, az) || 1,
      bl = Math.hypot(bx, bz) || 1;
    let ux = ax / al + bx / bl,
      uz = az / al + bz / bl;
    if (Math.hypot(ux, uz) < 0.2) {
      ux = -az / al;
      uz = ax / al;
    }
    const ul = Math.hypot(ux, uz);
    const waypointRadius = Math.min(7.6, Math.max(al, bl, radius + 0.75));
    const waypoint: RigidPose = {
      position: [
        station.base[0] + (ux / ul) * waypointRadius,
        Math.max(clear.position[1], approach.position[1]),
        station.base[2] + (uz / ul) * waypointRadius,
      ],
      quaternion: part.finalPose.quaternion,
    };
    const probes = [
      pickup,
      waypoint,
      approach,
      ...Array.from({ length: 33 }, (_, i) =>
        orbitTransfer(clear, approach, station, i / 32),
      ),
    ].map((pose) => sampleEiffelCrane(station, pose, part.pickupLugs));
    const mastHeight = Math.max(
      8,
      ...probes.map(
        (sample) =>
          sample.hook[1] -
          station.base[1] -
          Math.sqrt(8.4 ** 2 - sample.horizontalReach ** 2) +
          0.5,
      ),
    );
    station = { ...station, mastHeight: Math.min(22, mastHeight) };
    // Endpoint validation rejects impossible hook geometry; nothing is clamped.
    try {
      sampleEiffelCrane(station, pickup, part.pickupLugs);
      sampleEiffelCrane(station, waypoint, part.pickupLugs);
      sampleEiffelCrane(station, approach, part.pickupLugs);
    } catch (error) {
      throw new Error(
        `Eiffel production route ${part.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    const receiver = {
      center: [
        pickup.position[0],
        station.base[1] + 0.15,
        pickup.position[2],
      ] as RigidVec3,
      size: [
        part.transportSize[0] + 0.5,
        0.3,
        part.transportSize[2] + 0.5,
      ] as RigidVec3,
      saddles: candidate.supportSaddles,
    };
    const correction = part.stage === 23 && options.upperClearance !== 'skip' ? getBakedEiffelUpperRoute({ part, start, end, station, pickup, receiver, supportPartId: candidate.supportPartId }, upperManifestHash, upperRouteDomainHash) : null;
    return {
      part, start, end, hero, wave,
      pickup: correction?.pickup ?? pickup,
      staging: correction?.pickup ?? pickup,
      clear: correction?.route.turned ?? clear,
      waypoint,
      approach: correction?.route.approach ?? approach,
      station: correction?.station ?? station,
      bracket,
      receiver: correction?.receiver ?? receiver,
      upperRoute: correction?.route,
      upperClearance: part.stage === 23 ? (correction ? 'sampled-clear' : 'unresolved') : undefined,
    };
  });
  const links=new Map(EIFFEL_SUMMIT_RIGID_ASSEMBLIES.map(link=>[link.childPartId,link]));
  const partById=new Map(manifest.parts.map(part=>[part.id,part]));
  const assemblyBounds=new Map<string,{min:RigidVec3;max:RigidVec3}>();
  for(const parentId of new Set(EIFFEL_SUMMIT_RIGID_ASSEMBLIES.map(link=>link.parentPartId))){const parent=partById.get(parentId)!;const min=[...parent.localBounds.min]as[number,number,number],max=[...parent.localBounds.max]as[number,number,number];for(const link of EIFFEL_SUMMIT_RIGID_ASSEMBLIES.filter(row=>row.parentPartId===parentId)){const child=partById.get(link.childPartId)!,relative=eiffelRigidAssemblyRelativePose(parent.finalPose,child.finalPose),bounds=transformedRigidBounds(relative,child.localBounds.min,child.localBounds.max);for(let axis=0;axis<3;axis++){min[axis]=Math.min(min[axis]!,bounds.min[axis]!);max[axis]=Math.max(max[axis]!,bounds.max[axis]!);}}assemblyBounds.set(parentId,{min,max});}
  // The first mast assembly is stocked on the real stage-56 terrace. Its
  // receiver starts at the deck top, and the complete parent+crossbar cargo
  // starts on the receiver top; the earlier generic station-height pickup was
  // buried in the deck.
  const terraceDeck=manifest.parts.find(part=>part.id==='summit-terrace-deck-m010-c001');
  if(!terraceDeck)throw Error('Eiffel summit terrace support deck missing');
  const terraceTop=transformedRigidBounds(terraceDeck.finalPose,terraceDeck.localBounds.min,terraceDeck.localBounds.max).max[1];
  const supportedOperations=independentOperations.map(operation=>{
    if(operation.part.id!=='summit-crown-m072-c000'||!operation.receiver)return operation;
    const handlingLocalBounds=assemblyBounds.get(operation.part.id)!;
    const pickupX=-6.470136805314455;
    const receiver={...operation.receiver,center:[pickupX,terraceTop+operation.receiver.size[1]/2,0]as RigidVec3,directDeckSupport:true as const};
    const pickupQuaternion=[0,0,Math.SQRT1_2,Math.SQRT1_2]as RigidQuat;
    const pickupBounds=transformedRigidBounds({position:[0,0,0],quaternion:pickupQuaternion},handlingLocalBounds.min,handlingLocalBounds.max);
    const pickup={...operation.pickup,position:[pickupX,terraceTop+operation.receiver.size[1]+.24-pickupBounds.min[1],0]as RigidVec3,quaternion:pickupQuaternion};
    const deckClear={position:[pickup.position[0],terraceTop+1.5,pickup.position[2]]as RigidVec3,quaternion:pickupQuaternion},assemblyOutboardLow={position:[-8.3,terraceTop+1.5,-1.4]as RigidVec3,quaternion:pickupQuaternion};
    const transitY=operation.part.finalPose.position[1]+1.3,clear={position:[-8.3,transitY,-1.4]as RigidVec3,quaternion:operation.part.finalPose.quaternion},waypoint={...operation.waypoint,position:[operation.waypoint.position[0],transitY,operation.waypoint.position[2]]as RigidVec3},approach={...operation.approach,position:[operation.approach.position[0],transitY,operation.approach.position[2]]as RigidVec3};
    const station={...operation.station!,base:[-3,terraceTop,-6.4]as RigidVec3,mastHeight:21,supportPadSize:[3.4,.3,2.2]as RigidVec3};
    return{...operation,pickup,staging:pickup,clear,waypoint,approach,receiver,station,bracket:null,handlingLocalBounds,assemblyDeckClear:deckClear,assemblyOutboardLow};
  });
  const withAssemblyBounds=supportedOperations.map(operation=>{if(!assemblyBounds.has(operation.part.id)||operation.handlingLocalBounds)return operation;const quaternion=[0,0,Math.SQRT1_2,Math.SQRT1_2]as RigidQuat,pickup={...operation.pickup,quaternion};return{...operation,pickup,staging:pickup,handlingLocalBounds:assemblyBounds.get(operation.part.id)};});
  const independentByPart=new Map(withAssemblyBounds.map(operation=>[operation.part.id,operation]));
  const operations=withAssemblyBounds.map(operation=>{const link=links.get(operation.part.id);if(!link)return operation;const parent=independentByPart.get(link.parentPartId);if(!parent)throw Error(`Eiffel rigid assembly parent ${link.parentPartId} missing for ${link.childPartId}`);const relative=eiffelRigidAssemblyRelativePose(parent.part.finalPose,operation.part.finalPose);return{...operation,start:parent.start,end:parent.end,hero:parent.hero,wave:parent.wave,pickup:composeRigidPoses(parent.pickup,relative),staging:composeRigidPoses(parent.staging,relative),clear:composeRigidPoses(parent.clear,relative),waypoint:composeRigidPoses(parent.waypoint,relative),approach:composeRigidPoses(parent.approach,relative),station:null,bracket:null,receiver:null,upperRoute:undefined,foundationRoute:undefined,assemblyParentId:parent.part.id,assemblyRelativePose:relative,assemblyParentOperation:parent};});
  return { operations, byPart: new Map(operations.map((o) => [o.part.id, o])) };
}

const poseDistance=(a:RigidPose,b:RigidPose)=>Math.hypot(a.position[0]-b.position[0],a.position[1]-b.position[1],a.position[2]-b.position[2]);
function sampleRigidPosePath(poses:readonly RigidPose[],u:number):RigidPose{const lengths=poses.slice(1).map((pose,index)=>Math.max(1e-9,poseDistance(poses[index]!,pose))),total=lengths.reduce((sum,value)=>sum+value,0),target=Math.max(0,Math.min(1,u))*total;let traversed=0;for(let index=0;index<lengths.length;index++){const length=lengths[index]!;if(target<=traversed+length||index===lengths.length-1)return interpolateRigidPose(poses[index]!,poses[index+1]!,smooth((target-traversed)/length));traversed+=length;}return poses.at(-1)!;}

export function sampleEiffelProductionOperation(
  op: EiffelProductionOperation,
  t: number,
): EiffelProductionSample {
  if(op.assemblyParentOperation&&op.assemblyRelativePose){const parent=sampleEiffelProductionOperation(op.assemblyParentOperation,t);return{phase:parent.phase,pose:parent.phase==='seated'?op.part.finalPose:composeRigidPoses(parent.pose,op.assemblyRelativePose),crane:null,bracket:null,carrier:null,receiver:null};}
  if (t < op.start)
    return {
      phase: 'queued',
      pose: op.pickup,
      crane: null,
      bracket: op.bracket,
      carrier: null,
      receiver: null,
    };
  if (t >= op.end)
    return {
      phase: 'seated',
      pose: op.part.finalPose,
      crane: null,
      bracket: null,
      carrier: null,
      receiver: null,
    };
  const p = (t - op.start) / (op.end - op.start);
  let phase: EiffelProductionSample['phase'];
  let pose: RigidPose;
  const foundation = op.part.group === 'foundation';
  if (op.upperRoute) {
    phase = p < .12 ? 'staged' : p < .36 ? 'hoist' : p < .78 ? 'transfer' : 'lower';
    pose = sampleEiffelUpperRoute(op.upperRoute, op.pickup, op.part.finalPose, op.station!, p);
  } else if (foundation && p < 0.36) {
    phase = 'haul';
    pose = sampleEiffelFoundationRoute(op.foundationRoute!, smooth(p / 0.36), op.part);
  } else if (p < (foundation ? 0.46 : 0.12)) {
    phase = 'staged';
    pose = op.staging;
  } else if(op.assemblyDeckClear&&op.assemblyOutboardLow&&p<.30){
    phase='hoist';pose=sampleRigidPosePath([op.staging,op.assemblyDeckClear,op.assemblyOutboardLow,op.clear],(p-.12)/.18);
  } else if (p < (foundation ? 0.62 : 0.3)) {
    phase = 'hoist';
    pose = interpolateRigidPose(
      op.staging,
      op.clear,
      smooth((p - (foundation ? 0.46 : 0.12)) / (foundation ? 0.16 : 0.18)),
    );
  } else if (foundation && p < 0.78) {
    phase = 'transfer';
    pose = interpolateRigidPose(
      op.clear,
      op.approach,
      smooth((p - 0.62) / 0.16),
    );
  } else if (p < 0.78) {
    phase = 'transfer';
    pose = orbitTransfer(
      op.clear,
      op.approach,
      op.station!,
      smooth((p - 0.3) / 0.48),
    );
  } else {
    phase = 'lower';
    pose = interpolateRigidPose(
      op.approach,
      op.part.finalPose,
      smooth((p - 0.78) / 0.22),
    );
  }
  const onCarrier = phase === 'haul' || phase === 'staged';
  return {
    phase,
    pose,
    crane:
      !onCarrier && op.station
        ? sampleEiffelCrane(op.station, pose, op.part.pickupLugs)
        : null,
    bracket: op.bracket,
    carrier: onCarrier
      ? (() => {
          const cargoBottom = transformedRigidBounds(
            pose,
            (op.handlingLocalBounds??op.part.localBounds).min,
            (op.handlingLocalBounds??op.part.localBounds).max,
          ).min[1];
          const supportY = foundation
            ? eiffelTerrainHeightAt(pose.position[0], pose.position[2])
            : op.receiver!.center[1] + op.receiver!.size[1] / 2;
          return {
            center: [
              pose.position[0],
              cargoBottom - 0.12,
              pose.position[2],
            ] as RigidVec3,
            size: foundation ? eiffelFoundationCarrierSize(op.part) : [
              (op.handlingLocalBounds?op.handlingLocalBounds.max[0]-op.handlingLocalBounds.min[0]:op.part.transportSize[0]) + 0.6,
              0.24,
              (op.handlingLocalBounds?op.handlingLocalBounds.max[2]-op.handlingLocalBounds.min[2]:op.part.transportSize[2]) + 0.6,
            ] as RigidVec3,
            supportY,
            motive: foundation,
            steering: foundation ? { ...eiffelFoundationRouteMotion(op.foundationRoute!, smooth(Math.min(1, p / .36))), walking: phase === 'haul' } : undefined,
          };
        })()
      : null,
    receiver: foundation ? null : op.receiver,
  };
}
