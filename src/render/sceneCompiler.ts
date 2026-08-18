import type { Part, Stage, StructureSpec } from '../data/types';
import type { BackdropLayer, SceneDoc, ScenePart } from '../data/sceneSchema';
import { sceneDocSchema } from '../data/sceneSchema';
import {
  masonryPyramid as masonryPyramidBuilder,
  ring as ringBuilder,
  steppedPyramid as steppedPyramidBuilder,
} from '../data/builders';

/** Spec 07 §Compiler — JSON scene document → renderer inputs. */

export interface CompiledScene {
  structure: StructureSpec;
  backdrop: BackdropLayer[];
  foreground: NonNullable<SceneDoc['foreground']>;
  terrain: SceneDoc['background']['terrain'];
}

const asPart = (p: ScenePart): Part => ({ material: 'primary', ...p }) as Part;

/** Expand a component generator into concrete parts. Pure. */
function generate(component: SceneDoc['mainObject']['components'][number]): Part[] {
  const params = (component.params ?? {}) as Record<string, unknown>;
  const material = component.material ?? 'primary';
  const entrance = component.entrance;

  switch (component.generator) {
    case 'steppedPyramid': {
      const parts = steppedPyramidBuilder({
        center: params.center as [number, number] | undefined,
        base: params.base as number,
        levels: params.levels as number,
        levelHeight: params.levelHeight as number,
        material,
      });
      const y = (params.y as number | undefined) ?? 0;
      return parts.map((p, i) => ({
        ...p,
        position: [p.position[0], p.position[1] + y, p.position[2]] as [number, number, number],
        entrance: entrance ?? p.entrance,
        order: p.order ?? i,
      }));
    }
    case 'masonryPyramid': {
      return masonryPyramidBuilder({
        center: params.center as [number, number] | undefined,
        base: params.base as number,
        courses: params.courses as number,
        courseHeight: params.courseHeight as number,
        startCourse: params.startCourse as number | undefined,
        endCourse: params.endCourse as number | undefined,
        y: params.y as number | undefined,
        material,
      }).map((p) => ({
        ...p,
        entrance: entrance ?? p.entrance,
      }));
    }
    case 'ring': {
      const parts = ringBuilder({
        center: params.center as [number, number] | undefined,
        radius: params.radius as number,
        count: params.count as number,
        shape: params.shape as never,
        partScale: params.partScale as [number, number, number],
        y: params.y as number | undefined,
        material,
        jitter: params.jitter as number | undefined,
        yawOffset: params.yawOffset as number | undefined,
        arc: params.arc as [number, number] | undefined,
      });
      const ellipse = params.ellipse as [number, number] | undefined;
      return parts.map((p, i) => ({
        ...p,
        position: ellipse
          ? ([p.position[0] * ellipse[0], p.position[1], p.position[2] * ellipse[1]] as [number, number, number])
          : p.position,
        entrance: entrance ?? 'stack',
        order: p.order ?? i,
      }));
    }
    case 'row': {
      const count = params.count as number;
      const from = params.from as [number, number]; // [x, z]
      const to = params.to as [number, number]; // [x, z]
      const size = params.size as [number, number, number];
      const shape = (params.shape as Part['shape'] | undefined) ?? 'box';
      const y = (params.y as number | undefined) ?? 0;
      const rise = (params.rise as number | undefined) ?? 0; // y added per step
      return Array.from({ length: count }, (_, i) => {
        const k = count === 1 ? 0 : i / (count - 1);
        return {
          shape,
          material,
          position: [
            from[0] + (to[0] - from[0]) * k,
            y + rise * k,
            from[1] + (to[1] - from[1]) * k,
          ] as [number, number, number],
          scale: [...size] as [number, number, number],
          entrance: entrance ?? 'stack',
          order: i,
        };
      });
    }
    case 'trilithonArc': {
      // Stonehenge horseshoe: pairs of uprights + a lintel across each pair,
      // arranged along an arc, facing the center.
      const radius = params.radius as number;
      const count = params.count as number;
      const height = params.height as number;
      const thick = (params.thickness as number | undefined) ?? 1;
      const gap = (params.gap as number | undefined) ?? 2.3;
      const arc = (params.arc as [number, number] | undefined) ?? [0, Math.PI * 2];
      const parts: Part[] = [];
      for (let i = 0; i < count; i++) {
        const theta = arc[0] + ((arc[1] - arc[0]) * i) / count;
        const cx = Math.cos(theta) * radius;
        const cz = Math.sin(theta) * radius;
        const tangent: [number, number] = [-Math.sin(theta), Math.cos(theta)];
        const yaw = -theta + Math.PI / 2;
        for (const sign of [1, -1] as const) {
          parts.push({
            shape: 'box',
            material,
            position: [cx + tangent[0] * gap * 0.5 * sign, 0, cz + tangent[1] * gap * 0.5 * sign],
            scale: [thick, height, thick],
            rotation: [0, yaw, 0],
            entrance: 'stack',
            order: i * 3,
          });
        }
        parts.push({
          shape: 'box',
          material: 'accent',
          position: [cx, height, cz],
          scale: [gap + thick, thick * 0.7, thick * 1.1],
          rotation: [0, yaw, 0],
          entrance: 'stack',
          order: i * 3 + 1,
        });
      }
      return parts;
    }
    case 'arcade': {
      // Elliptical ring of piers with recessed dark voids between them, plus
      // a ring band on top — the Colosseum pattern.
      const a = params.a as number;
      const b = params.b as number;
      const count = params.count as number;
      const y = (params.y as number | undefined) ?? 0;
      const height = params.height as number;
      const pier = params.pier as [number, number]; // [w, d]
      const band = (params.band as boolean | undefined) ?? true;
      const parts: Part[] = [];
      for (let i = 0; i < count; i++) {
        const theta = (i / count) * Math.PI * 2;
        parts.push({
          shape: 'box',
          material,
          position: [Math.cos(theta) * a, y, Math.sin(theta) * b],
          scale: [pier[0], height, pier[1]],
          rotation: [0, -theta, 0],
          entrance: 'stack',
          order: i,
        });
        const mid = theta + Math.PI / count;
        parts.push({
          shape: 'box',
          material: 'shadow',
          position: [Math.cos(mid) * (a - 0.4), y + 0.5, Math.sin(mid) * (b - 0.32)],
          scale: [pier[0] * 0.92, height - 0.8, 0.45],
          rotation: [0, -mid, 0],
          entrance: 'stack',
          order: i,
        });
      }
      if (band) {
        parts.push({
          shape: 'torus',
          material,
          position: [0, y + height, 0],
          scale: [a * 2 + 1.2, 0.85, b * 2 + 1.2],
          entrance: 'stack',
          order: count,
        });
      }
      return parts;
    }
    case 'tieredTower': {
      // box base + stacked shrinking cones — Khmer prasat / pagoda finial
      const center = (params.center as [number, number] | undefined) ?? [0, 0];
      const base = params.base as number;
      const tiers = (params.tiers as number | undefined) ?? 3;
      const tierH = params.tierHeight as number;
      const parts: Part[] = [
        {
          shape: 'box',
          material,
          position: [center[0], 0, center[1]],
          scale: [base, tierH, base],
          entrance: entrance ?? 'stack',
          order: 0,
        },
      ];
      let size = base * 0.95;
      let yy = tierH;
      for (let i = 0; i < tiers; i++) {
        parts.push({
          shape: 'cone',
          material,
          position: [center[0], yy, center[1]],
          scale: [size, tierH, size],
          entrance: entrance ?? 'stack',
          order: i + 1,
        });
        yy += tierH * 0.72;
        size *= 0.72;
      }
      const y = (params.y as number | undefined) ?? 0;
      return y === 0
        ? parts
        : parts.map((p) => ({
            ...p,
            position: [p.position[0], p.position[1] + y, p.position[2]] as [number, number, number],
          }));
    }
    default:
      return (component.parts ?? []).map(asPart);
  }
}

export function compileScene(json: unknown): CompiledScene {
  const doc: SceneDoc = sceneDocSchema.parse(json);

  // group components into stages, preserving first-seen order
  const stageOrder: string[] = [];
  const byStage = new Map<string, Part[]>();
  for (const component of doc.mainObject.components) {
    if (!byStage.has(component.stage)) stageOrder.push(component.stage);
    const parts = byStage.get(component.stage) ?? [];
    parts.push(...generate(component));
    byStage.set(component.stage, parts);
  }

  const stageWeights = doc.mainObject.stageWeights ?? {};
  const stages: Stage[] = stageOrder.map((name) => ({
    name,
    parts: byStage.get(name)!,
    ...(stageWeights[name] !== undefined ? { weight: stageWeights[name] } : {}),
  }));

  return {
    structure: {
      stages,
      ...(doc.camera?.startAzimuth !== undefined
        ? { startAzimuth: doc.camera.startAzimuth }
        : {}),
      ...(doc.camera?.turns !== undefined ? { turns: doc.camera.turns } : {}),
      ...(doc.camera?.framing !== undefined ? { framing: doc.camera.framing } : {}),
    },
    backdrop: doc.background.layers,
    foreground: doc.foreground ?? {},
    terrain: doc.background.terrain,
  };
}
