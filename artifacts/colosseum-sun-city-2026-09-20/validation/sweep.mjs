// artifacts/colosseum-sun-city-2026-09-20/sweep.ts
import { writeFileSync } from "node:fs";
import { Mesh as Mesh8, InstancedMesh as InstancedMesh5, PerspectiveCamera as PerspectiveCamera5, Vector3 as Vector38 } from "three";

// src/data/sceneSchema.ts
import { z } from "zod";
var vec2 = z.tuple([z.number(), z.number()]);
var vec3 = z.tuple([z.number(), z.number(), z.number()]);
var shapeSchema = z.enum([
  "box",
  "cylinder",
  "cone",
  "pyramid",
  "prism",
  "sphere",
  "torus",
  "ramp",
  "sail"
]);
var materialSchema = z.enum([
  "primary",
  "accent",
  "ground",
  "foliage",
  "water",
  "light",
  "shadow",
  "casing"
]);
var partSchema = z.object({
  shape: shapeSchema,
  material: materialSchema.optional(),
  position: vec3,
  scale: vec3,
  rotation: vec3.optional(),
  entrance: z.enum(["place", "stack", "carve", "fade", "scaffold", "none"]).optional(),
  order: z.number().optional(),
  jitter: z.number().optional()
});
var componentSchema = z.object({
  id: z.string().min(1),
  /** Components sharing a stage build together; stages build in list order. */
  stage: z.string().min(1),
  generator: z.enum([
    "steppedPyramid",
    "masonryPyramid",
    "ring",
    "row",
    "arcade",
    "tieredTower",
    "trilithonArc"
  ]).optional(),
  params: z.record(z.string(), z.unknown()).optional(),
  material: materialSchema.optional(),
  parts: z.array(partSchema).optional(),
  /** Default entrance for generated parts. */
  entrance: z.enum(["place", "stack", "carve", "fade", "scaffold", "none"]).optional()
}).refine((c) => c.generator || c.parts, {
  message: "component needs a generator or explicit parts"
});
var backdropLayerSchema = z.object({
  kind: z.enum(["dunes", "cliffs", "hills", "city", "jungle", "mountains", "harbor"]),
  /** Horizon distance as a multiple of the structure footprint radius. */
  distance: z.number().min(1.5).max(6),
  /** Silhouette height as a fraction of footprint radius. */
  height: z.number().min(0.1).max(2.5),
  tint: z.string().regex(/^#[0-9a-f]{6}$/i),
  /** Optional detail dressing the layer's foot (Spec 08). */
  details: z.array(z.enum(["palms", "river"])).optional()
});
var sceneDocSchema = z.object({
  wonder: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  style: z.object({ notes: z.string() }).optional(),
  camera: z.object({
    startAzimuth: z.number().optional(),
    turns: z.number().min(0.5).max(2).optional(),
    framing: z.number().min(0.7).max(1.4).optional()
  }).optional(),
  lighting: z.object({ endsAtNight: z.boolean() }).optional(),
  background: z.object({
    terrain: z.enum(["desert", "plain", "cliff", "city", "jungle", "mountain", "harbor"]),
    layers: z.array(backdropLayerSchema).max(3)
  }),
  mainObject: z.object({
    components: z.array(componentSchema).min(1),
    /** Rhythm weights per stage name (Spec 02): heavier stages linger. */
    stageWeights: z.record(z.string(), z.number().min(0.2).max(5)).optional()
  }),
  foreground: z.object({
    workers: z.union([
      z.object({
        count: z.number().int().min(1).max(24),
        path: z.enum(["perimeter", "road", "ramp"]),
        carry: z.boolean().optional()
      }),
      z.array(
        z.object({
          count: z.number().int().min(1).max(24),
          path: z.enum(["perimeter", "road", "ramp"]),
          carry: z.boolean().optional()
        })
      )
    ]).optional(),
    /** Packed-dirt site roads (decals + worker routes): from → to. */
    roads: z.array(
      z.object({
        from: vec2,
        to: vec2,
        width: z.number().min(0.5).max(4).optional()
      })
    ).max(2).optional(),
    /** Construction ramps: earthen inclines leaning on a stage's structure,
     *  climbed by `ramp` crews while that stage is being built (Spec 08). */
    ramps: z.array(
      z.object({
        from: vec2,
        to: vec2,
        height: z.number().min(0.5).max(30),
        stage: z.string()
      })
    ).max(2).optional(),
    scaffolding: z.object({
      style: z.enum(["wood-frame"]),
      aroundStages: z.array(z.string())
    }).optional(),
    dust: z.boolean().optional(),
    /** Disable generic scatter when the scene authors its own site debris. */
    scatter: z.boolean().optional(),
    fauna: z.object({ kind: z.enum(["birds"]), count: z.number().int().min(1).max(8) }).optional()
  }).optional()
});

// src/data/builders.ts
function steppedPyramid(opts) {
  const { center = [0, 0], base, levels, levelHeight, material = "primary" } = opts;
  const parts = [];
  for (let i = 0; i < levels; i++) {
    const size = base * (1 - i / levels);
    parts.push({
      shape: "box",
      material,
      position: [center[0], i * levelHeight, center[1]],
      scale: [size, levelHeight, size],
      entrance: "stack",
      order: i
    });
  }
  return parts;
}
function masonryPyramid(opts) {
  const {
    center = [0, 0],
    base,
    courses,
    courseHeight,
    startCourse = 0,
    endCourse = courses,
    y = 0,
    material = "primary"
  } = opts;
  const first = Math.max(0, Math.floor(startCourse));
  const last = Math.min(courses, Math.ceil(endCourse));
  const parts = [];
  for (let i = first; i < last; i++) {
    const size = base * (1 - i / courses);
    parts.push({
      shape: "box",
      material,
      position: [center[0], y + i * courseHeight, center[1]],
      scale: [size, courseHeight, size],
      entrance: "stack",
      order: i - first
    });
  }
  return parts;
}
function ring(opts) {
  const {
    center = [0, 0],
    radius,
    count,
    shape = "box",
    partScale,
    y = 0,
    material = "primary",
    entrance = "place",
    order,
    jitter,
    arc,
    yawOffset = 0
  } = opts;
  const [a0, a1] = arc ?? [0, Math.PI * 2];
  const parts = [];
  for (let i = 0; i < count; i++) {
    const theta = a0 + (a1 - a0) * i / count;
    parts.push({
      shape,
      material,
      position: [
        center[0] + Math.cos(theta) * radius,
        y,
        center[1] + Math.sin(theta) * radius
      ],
      scale: [...partScale],
      rotation: [0, -theta + yawOffset, 0],
      entrance,
      order,
      jitter
    });
  }
  return parts;
}

// src/render/sceneCompiler.ts
var asPart = (p) => ({ material: "primary", ...p });
function generate(component) {
  const params = component.params ?? {};
  const material = component.material ?? "primary";
  const entrance = component.entrance;
  switch (component.generator) {
    case "steppedPyramid": {
      const parts = steppedPyramid({
        center: params.center,
        base: params.base,
        levels: params.levels,
        levelHeight: params.levelHeight,
        material
      });
      const y = params.y ?? 0;
      return parts.map((p, i) => ({
        ...p,
        position: [p.position[0], p.position[1] + y, p.position[2]],
        entrance: entrance ?? p.entrance,
        order: p.order ?? i
      }));
    }
    case "masonryPyramid": {
      return masonryPyramid({
        center: params.center,
        base: params.base,
        courses: params.courses,
        courseHeight: params.courseHeight,
        startCourse: params.startCourse,
        endCourse: params.endCourse,
        y: params.y,
        material
      }).map((p) => ({
        ...p,
        entrance: entrance ?? p.entrance
      }));
    }
    case "ring": {
      const parts = ring({
        center: params.center,
        radius: params.radius,
        count: params.count,
        shape: params.shape,
        partScale: params.partScale,
        y: params.y,
        material,
        jitter: params.jitter,
        yawOffset: params.yawOffset,
        arc: params.arc
      });
      const ellipse = params.ellipse;
      return parts.map((p, i) => ({
        ...p,
        position: ellipse ? [p.position[0] * ellipse[0], p.position[1], p.position[2] * ellipse[1]] : p.position,
        entrance: entrance ?? "stack",
        order: p.order ?? i
      }));
    }
    case "row": {
      const count = params.count;
      const from = params.from;
      const to = params.to;
      const size = params.size;
      const shape = params.shape ?? "box";
      const y = params.y ?? 0;
      const rise = params.rise ?? 0;
      return Array.from({ length: count }, (_, i) => {
        const k = count === 1 ? 0 : i / (count - 1);
        return {
          shape,
          material,
          position: [
            from[0] + (to[0] - from[0]) * k,
            y + rise * k,
            from[1] + (to[1] - from[1]) * k
          ],
          scale: [...size],
          entrance: entrance ?? "stack",
          order: i
        };
      });
    }
    case "trilithonArc": {
      const radius = params.radius;
      const count = params.count;
      const height = params.height;
      const thick = params.thickness ?? 1;
      const gap = params.gap ?? 2.3;
      const arc = params.arc ?? [0, Math.PI * 2];
      const parts = [];
      for (let i = 0; i < count; i++) {
        const theta = arc[0] + (arc[1] - arc[0]) * i / count;
        const cx = Math.cos(theta) * radius;
        const cz = Math.sin(theta) * radius;
        const tangent = [-Math.sin(theta), Math.cos(theta)];
        const yaw = -theta + Math.PI / 2;
        for (const sign of [1, -1]) {
          parts.push({
            shape: "box",
            material,
            position: [cx + tangent[0] * gap * 0.5 * sign, 0, cz + tangent[1] * gap * 0.5 * sign],
            scale: [thick, height, thick],
            rotation: [0, yaw, 0],
            entrance: "stack",
            order: i * 3
          });
        }
        parts.push({
          shape: "box",
          material: "accent",
          position: [cx, height, cz],
          scale: [gap + thick, thick * 0.7, thick * 1.1],
          rotation: [0, yaw, 0],
          entrance: "stack",
          order: i * 3 + 1
        });
      }
      return parts;
    }
    case "arcade": {
      const a = params.a;
      const b = params.b;
      const count = params.count;
      const y = params.y ?? 0;
      const height = params.height;
      const pier = params.pier;
      const band = params.band ?? true;
      const parts = [];
      for (let i = 0; i < count; i++) {
        const theta = i / count * Math.PI * 2;
        parts.push({
          shape: "box",
          material,
          position: [Math.cos(theta) * a, y, Math.sin(theta) * b],
          scale: [pier[0], height, pier[1]],
          rotation: [0, -theta, 0],
          entrance: "stack",
          order: i
        });
        const mid = theta + Math.PI / count;
        parts.push({
          shape: "box",
          material: "shadow",
          position: [Math.cos(mid) * (a - 0.4), y + 0.5, Math.sin(mid) * (b - 0.32)],
          scale: [pier[0] * 0.92, height - 0.8, 0.45],
          rotation: [0, -mid, 0],
          entrance: "stack",
          order: i
        });
      }
      if (band) {
        parts.push({
          shape: "torus",
          material,
          position: [0, y + height, 0],
          scale: [a * 2 + 1.2, 0.85, b * 2 + 1.2],
          entrance: "stack",
          order: count
        });
      }
      return parts;
    }
    case "tieredTower": {
      const center = params.center ?? [0, 0];
      const base = params.base;
      const tiers = params.tiers ?? 3;
      const tierH = params.tierHeight;
      const parts = [
        {
          shape: "box",
          material,
          position: [center[0], 0, center[1]],
          scale: [base, tierH, base],
          entrance: entrance ?? "stack",
          order: 0
        }
      ];
      let size = base * 0.95;
      let yy = tierH;
      for (let i = 0; i < tiers; i++) {
        parts.push({
          shape: "cone",
          material,
          position: [center[0], yy, center[1]],
          scale: [size, tierH, size],
          entrance: entrance ?? "stack",
          order: i + 1
        });
        yy += tierH * 0.72;
        size *= 0.72;
      }
      const y = params.y ?? 0;
      return y === 0 ? parts : parts.map((p) => ({
        ...p,
        position: [p.position[0], p.position[1] + y, p.position[2]]
      }));
    }
    default:
      return (component.parts ?? []).map(asPart);
  }
}
function compileScene(json) {
  const doc = sceneDocSchema.parse(json);
  const stageOrder = [];
  const byStage = /* @__PURE__ */ new Map();
  for (const component of doc.mainObject.components) {
    if (!byStage.has(component.stage)) stageOrder.push(component.stage);
    const parts = byStage.get(component.stage) ?? [];
    parts.push(...generate(component));
    byStage.set(component.stage, parts);
  }
  const stageWeights = doc.mainObject.stageWeights ?? {};
  const stages = stageOrder.map((name) => ({
    name,
    parts: byStage.get(name),
    ...stageWeights[name] !== void 0 ? { weight: stageWeights[name] } : {}
  }));
  return {
    structure: {
      stages,
      ...doc.camera?.startAzimuth !== void 0 ? { startAzimuth: doc.camera.startAzimuth } : {},
      ...doc.camera?.turns !== void 0 ? { turns: doc.camera.turns } : {},
      ...doc.camera?.framing !== void 0 ? { framing: doc.camera.framing } : {}
    },
    backdrop: doc.background.layers,
    foreground: doc.foreground ?? {},
    terrain: doc.background.terrain
  };
}

// src/data/scenes/pyramids-of-giza.scene.json
var pyramids_of_giza_scene_default = {
  wonder: "pyramids-of-giza",
  style: {
    notes: "fine limestone masonry courses on the desert-city edge; quarry traffic, an earthen ramp, casing, dust, and scaffold beats make the build legible"
  },
  camera: { startAzimuth: -0.785, turns: 1.25, framing: 0.92 },
  lighting: { endsAtNight: false },
  background: {
    terrain: "desert",
    layers: [
      { kind: "cliffs", distance: 3.8, height: 0.42, tint: "#b88755" },
      { kind: "city", distance: 3.15, height: 0.32, tint: "#8f856f" },
      { kind: "dunes", distance: 2.45, height: 0.2, tint: "#7b9560", details: ["palms", "river"] }
    ]
  },
  mainObject: {
    stageWeights: {
      "Site preparation": 0.72,
      "Khufu foundation": 1.35,
      "Khufu crown": 1.22,
      "Khafre masonry": 1.05,
      "Menkaure & queens": 0.86,
      "Temples & necropolis": 0.92,
      "Final casing": 0.78
    },
    components: [
      {
        id: "quarry-pits",
        stage: "Site preparation",
        parts: [
          { shape: "cylinder", material: "accent", position: [-21, 0, 16], scale: [7, 0.2, 5.2], entrance: "none" },
          { shape: "cylinder", material: "ground", position: [-21, 0, 16], scale: [7.4, 0.5, 5.6], entrance: "carve", order: 0 },
          { shape: "box", material: "primary", position: [-21, 0.12, 16], scale: [1.5, 0.9, 1.2], entrance: "none", jitter: 2.6 },
          { shape: "box", material: "primary", position: [-17.5, 0.12, 14.3], scale: [1.3, 0.78, 1.05], entrance: "none", jitter: 2.1 }
        ]
      },
      {
        id: "site-causeways",
        stage: "Site preparation",
        parts: [
          { shape: "box", material: "ground", position: [-3, 0, -11], scale: [3.2, 0.28, 17], entrance: "none" },
          { shape: "box", material: "ground", position: [9, 0, -8], scale: [2.7, 0.28, 14], rotation: [0, 0.5, 0], entrance: "none" },
          { shape: "box", material: "ground", position: [18, 0, -19], scale: [2.1, 0.24, 9], rotation: [0, 0.18, 0], entrance: "none" }
        ]
      },
      {
        id: "khufu-lower",
        stage: "Khufu foundation",
        generator: "masonryPyramid",
        params: { center: [-10, -7], base: 27, courses: 24, courseHeight: 0.69, startCourse: 0, endCourse: 12 },
        material: "primary"
      },
      {
        id: "khufu-ramp",
        stage: "Khufu foundation",
        parts: [
          { shape: "ramp", material: "ground", position: [-10, 0, 10.75], scale: [4.8, 7.5, 10.5], entrance: "scaffold", order: 0 }
        ]
      },
      {
        id: "khufu-upper",
        stage: "Khufu crown",
        generator: "masonryPyramid",
        params: { center: [-10, -7], base: 27, courses: 24, courseHeight: 0.69, startCourse: 12, endCourse: 24 },
        material: "primary"
      },
      {
        id: "khafre-core",
        stage: "Khafre masonry",
        generator: "masonryPyramid",
        params: { center: [14, 9], base: 24, courses: 22, courseHeight: 0.68, startCourse: 0, endCourse: 18, y: 0.85 },
        material: "primary"
      },
      {
        id: "menkaure",
        stage: "Menkaure & queens",
        generator: "masonryPyramid",
        params: { center: [24, -14], base: 11.5, courses: 10, courseHeight: 0.72 },
        material: "primary"
      },
      {
        id: "queen-1",
        stage: "Menkaure & queens",
        generator: "masonryPyramid",
        params: { center: [31, -9], base: 4.6, courses: 5, courseHeight: 0.5 },
        material: "primary"
      },
      {
        id: "queen-2",
        stage: "Menkaure & queens",
        generator: "masonryPyramid",
        params: { center: [31, -15], base: 4.6, courses: 5, courseHeight: 0.5 },
        material: "primary"
      },
      {
        id: "queen-3",
        stage: "Menkaure & queens",
        generator: "masonryPyramid",
        params: { center: [31, -21], base: 4.6, courses: 5, courseHeight: 0.5 },
        material: "primary"
      },
      {
        id: "west-mastabas",
        stage: "Temples & necropolis",
        generator: "row",
        params: { count: 12, from: [-24, -16], to: [-24, 10], size: [2.6, 1.05, 3.4], y: 0 },
        material: "accent"
      },
      {
        id: "south-mastabas",
        stage: "Temples & necropolis",
        generator: "row",
        params: { count: 8, from: [-19, -20], to: [3, -20], size: [2.5, 0.9, 3.1], y: 0 },
        material: "accent"
      },
      {
        id: "mortuary-temples",
        stage: "Temples & necropolis",
        parts: [
          { shape: "box", material: "accent", position: [5, 0, -7], scale: [6, 1.1, 4], entrance: "stack", order: 0 },
          { shape: "box", material: "accent", position: [20, 0, 9], scale: [5.2, 1.05, 3.7], entrance: "stack", order: 1 },
          { shape: "box", material: "accent", position: [28, 0, -14], scale: [4, 0.9, 3], entrance: "stack", order: 2 }
        ]
      },
      {
        id: "sphinx-finished",
        stage: "Temples & necropolis",
        parts: [
          { shape: "box", material: "accent", position: [20, 0, -2], scale: [7.5, 1.8, 3.2], entrance: "place", order: 2 },
          { shape: "cylinder", material: "accent", position: [17.5, 0, -3.1], scale: [2.8, 2.2, 2.8], entrance: "place", order: 2 },
          { shape: "cylinder", material: "accent", position: [17.5, 0, -0.9], scale: [2.8, 2.2, 2.8], entrance: "place", order: 2 },
          { shape: "box", material: "accent", position: [23, 0, -2], scale: [2, 2.7, 2.5], entrance: "place", order: 3 },
          { shape: "sphere", material: "primary", position: [23, 2.5, -2], scale: [1.7, 1.9, 1.7], entrance: "place", order: 4 },
          { shape: "box", material: "accent", position: [26, 0, -3.1], scale: [4, 0.55, 0.8], entrance: "place", order: 3 },
          { shape: "box", material: "accent", position: [26, 0, -0.9], scale: [4, 0.55, 0.8], entrance: "place", order: 3 }
        ]
      },
      {
        id: "sphinx-bedrock",
        stage: "Temples & necropolis",
        parts: [
          { shape: "box", material: "accent", position: [15.5, 0, -0.2], scale: [3.2, 4, 3], entrance: "carve", order: 0, jitter: 0.08 },
          { shape: "box", material: "accent", position: [19.2, 0, -0.2], scale: [3.2, 4, 3], entrance: "carve", order: 1, jitter: 0.08 },
          { shape: "box", material: "accent", position: [22.9, 0, -0.2], scale: [3.2, 4, 3], entrance: "carve", order: 2, jitter: 0.08 },
          { shape: "box", material: "accent", position: [26.6, 0, -0.2], scale: [3.2, 4, 3], entrance: "carve", order: 3, jitter: 0.08 },
          { shape: "box", material: "accent", position: [15.5, 0, -3.8], scale: [3.2, 4, 3], entrance: "carve", order: 4, jitter: 0.08 },
          { shape: "box", material: "accent", position: [19.2, 0, -3.8], scale: [3.2, 4, 3], entrance: "carve", order: 5, jitter: 0.08 },
          { shape: "box", material: "accent", position: [22.9, 0, -3.8], scale: [3.2, 4, 3], entrance: "carve", order: 6, jitter: 0.08 },
          { shape: "box", material: "accent", position: [26.6, 0, -3.8], scale: [3.2, 4, 3], entrance: "carve", order: 7, jitter: 0.08 }
        ]
      },
      {
        id: "khafre-casing",
        stage: "Final casing",
        generator: "masonryPyramid",
        params: { center: [14, 9], base: 24, courses: 22, courseHeight: 0.68, startCourse: 18, endCourse: 22, y: 0.85 },
        material: "casing"
      }
    ]
  },
  foreground: {
    workers: [
      { count: 8, path: "road", carry: true },
      { count: 3, path: "ramp", carry: true },
      { count: 4, path: "perimeter", carry: false }
    ],
    roads: [{ from: [-21, 16], to: [-10, 5.5], width: 2.2 }],
    ramps: [{ from: [-10, 16], to: [-10, 5.5], height: 7.5, stage: "Khufu foundation" }],
    scaffolding: {
      style: "wood-frame",
      aroundStages: ["Khufu foundation", "Khufu crown", "Khafre masonry"]
    },
    dust: true,
    scatter: false,
    fauna: { kind: "birds", count: 4 }
  }
};

// src/data/scenes/stonehenge.scene.json
var stonehenge_scene_default = {
  wonder: "stonehenge",
  style: { notes: "hand-placed sarsens on open grass; the movie builds the COMPLETE monument, not the ruin" },
  camera: { startAzimuth: 0 },
  lighting: { endsAtNight: false },
  background: {
    terrain: "plain",
    layers: [
      { kind: "hills", distance: 3.4, height: 0.35, tint: "#5d7a4a" },
      { kind: "hills", distance: 2.5, height: 0.22, tint: "#6f8a55" }
    ]
  },
  mainObject: {
    stageWeights: { "Sarsen circle": 0.8, "Lintel ring": 1.5, "Trilithon horseshoe": 1.8, "Bluestones & heel stone": 0.9 },
    components: [
      {
        id: "sarsen-circle",
        stage: "Sarsen circle",
        generator: "ring",
        params: { radius: 9, count: 30, partScale: [1.25, 3.8, 0.85], jitter: 0.1, yawOffset: 1.5708 },
        material: "primary"
      },
      {
        id: "lintel-ring",
        stage: "Lintel ring",
        generator: "ring",
        params: { radius: 9, count: 30, partScale: [2.1, 0.7, 0.95], y: 3.8, jitter: 0.06, yawOffset: 1.5708, arc: [0.105, 6.388] },
        material: "accent"
      },
      {
        id: "trilithons",
        stage: "Trilithon horseshoe",
        generator: "trilithonArc",
        params: { radius: 4.4, count: 5, height: 5.4, thickness: 1.15, gap: 2.3, arc: [-1.005, 2.262] },
        material: "primary"
      },
      {
        id: "bluestones",
        stage: "Bluestones & heel stone",
        generator: "ring",
        params: { radius: 6.6, count: 14, partScale: [0.85, 2.1, 0.65], jitter: 0.25 },
        material: "accent"
      },
      {
        id: "heel-stone",
        stage: "Bluestones & heel stone",
        parts: [
          { shape: "box", material: "primary", position: [15, 0, 14.5], scale: [1.3, 4.2, 1], rotation: [0, 0.85, 0.06], jitter: 0.2, entrance: "place" }
        ]
      }
    ]
  },
  foreground: {
    workers: { count: 8, path: "perimeter", carry: true },
    dust: true,
    fauna: { kind: "birds", count: 4 }
  }
};

// src/data/scenes/petra.scene.json
var petra_scene_default = {
  wonder: "petra",
  style: { notes: "the Treasury is CARVED, not built: rock-shell chunks drop away top-down to reveal the colonnade; sandstone strata; the Siq is the site" },
  camera: { startAzimuth: -1.5708 },
  lighting: { endsAtNight: false },
  background: {
    terrain: "cliff",
    layers: [
      { kind: "cliffs", distance: 3.2, height: 0.6, tint: "#a35c38" },
      { kind: "dunes", distance: 2.5, height: 0.25, tint: "#c9a06a" }
    ]
  },
  mainObject: {
    stageWeights: { "The Siq": 0.5, "Carving the Treasury": 2, "Portico & finish": 1 },
    components: [
      {
        id: "siq-cliffs",
        stage: "The Siq",
        parts: [
          { shape: "box", material: "accent", position: [0, 0, -6.5], scale: [34, 26, 7], entrance: "none", jitter: 0.01 },
          { shape: "box", material: "accent", position: [-24, 0, -4], scale: [8, 18, 12], entrance: "none", jitter: 0.01 },
          { shape: "box", material: "accent", position: [24, 0, -4], scale: [8, 21, 12], entrance: "none", jitter: 0.01 },
          { shape: "box", material: "ground", position: [0, 7, -3.1], scale: [33, 0.5, 0.3], entrance: "none" },
          { shape: "box", material: "ground", position: [0, 14, -3.1], scale: [33, 0.4, 0.3], entrance: "none" }
        ]
      },
      {
        id: "shell-top",
        stage: "Carving the Treasury",
        parts: [
          { shape: "box", material: "accent", position: [-4.45, 16.8, -1.6], scale: [8.9, 3.9, 1.4], entrance: "carve", order: 0, jitter: 0.08 },
          { shape: "box", material: "accent", position: [4.45, 16.8, -1.6], scale: [8.9, 3.9, 1.4], entrance: "carve", order: 1, jitter: 0.08 },
          { shape: "box", material: "accent", position: [-4.45, 12.9, -1.6], scale: [8.9, 3.9, 1.4], entrance: "carve", order: 2, jitter: 0.08 },
          { shape: "box", material: "accent", position: [4.45, 12.9, -1.6], scale: [8.9, 3.9, 1.4], entrance: "carve", order: 3, jitter: 0.08 },
          { shape: "box", material: "accent", position: [-4.45, 9, -1.6], scale: [8.9, 3.9, 1.4], entrance: "carve", order: 4, jitter: 0.08 },
          { shape: "box", material: "accent", position: [4.45, 9, -1.6], scale: [8.9, 3.9, 1.4], entrance: "carve", order: 5, jitter: 0.08 },
          { shape: "box", material: "accent", position: [-4.45, 5.1, -1.6], scale: [8.9, 3.9, 1.4], entrance: "carve", order: 6, jitter: 0.08 },
          { shape: "box", material: "accent", position: [4.45, 5.1, -1.6], scale: [8.9, 3.9, 1.4], entrance: "carve", order: 7, jitter: 0.08 },
          { shape: "box", material: "accent", position: [-4.45, 1.2, -1.6], scale: [8.9, 3.9, 1.4], entrance: "carve", order: 8, jitter: 0.08 },
          { shape: "box", material: "accent", position: [4.45, 1.2, -1.6], scale: [8.9, 3.9, 1.4], entrance: "carve", order: 9, jitter: 0.08 }
        ]
      },
      {
        id: "facade-colonnade",
        stage: "Carving the Treasury",
        generator: "row",
        params: { count: 6, from: [-7.5, -2.2], to: [7.5, -2.2], size: [0.9, 9, 0.9], y: 1.2, shape: "cylinder" },
        material: "primary",
        entrance: "none"
      },
      {
        id: "facade-upper-colonnade",
        stage: "Carving the Treasury",
        generator: "row",
        params: { count: 4, from: [-6, -2.2], to: [6, -2.2], size: [0.9, 6.5, 0.9], y: 12.2, shape: "cylinder" },
        material: "primary",
        entrance: "none"
      },
      {
        id: "facade-body",
        stage: "Carving the Treasury",
        parts: [
          { shape: "box", material: "primary", position: [0, 10.2, -2.4], scale: [17.5, 1.4, 3], entrance: "none" },
          { shape: "box", material: "accent", position: [0, 0, -2.6], scale: [18, 1.2, 3.6], entrance: "none" },
          { shape: "box", material: "primary", position: [-4.7, 18.7, -2.3], scale: [4.6, 1.6, 2.6], rotation: [0, 0, 0.18], entrance: "none" },
          { shape: "box", material: "primary", position: [4.7, 18.7, -2.3], scale: [4.6, 1.6, 2.6], rotation: [0, 0, -0.18], entrance: "none" },
          { shape: "cylinder", material: "accent", position: [0, 12.2, -2.2], scale: [3.4, 4.2, 3.4], entrance: "none" },
          { shape: "cone", material: "primary", position: [0, 16.4, -2.2], scale: [3.8, 2.6, 3.8], entrance: "none" }
        ]
      },
      {
        id: "portico",
        stage: "Portico & finish",
        parts: [
          { shape: "box", material: "shadow", position: [0, 1.2, -1.9], scale: [3, 6.4, 0.8], entrance: "place" },
          { shape: "sphere", material: "accent", position: [0, 19, -2.2], scale: [1.4, 1.4, 1.4], entrance: "place" },
          { shape: "box", material: "ground", position: [0, 0, 1.5], scale: [10, 0.6, 3], entrance: "stack", order: 0 },
          { shape: "cone", material: "foliage", position: [-13, 0, 8], scale: [1, 2.4, 1], jitter: 1.2, entrance: "place" },
          { shape: "cone", material: "foliage", position: [13.5, 0, 6], scale: [1, 2.2, 1], jitter: 1.2, entrance: "place" }
        ]
      }
    ]
  },
  foreground: {
    workers: { count: 6, path: "perimeter", carry: true },
    scaffolding: { style: "wood-frame", aroundStages: ["Carving the Treasury"] },
    dust: true,
    fauna: { kind: "birds", count: 2 }
  }
};

// src/data/scenes/colosseum.scene.json
var colosseum_scene_default = {
  wonder: "colosseum",
  style: { notes: "travertine arcades over a stepped cavea; Roman skyline behind; ends lit at night" },
  camera: { startAzimuth: 0 },
  lighting: { endsAtNight: true },
  background: {
    terrain: "city",
    layers: [
      { kind: "city", distance: 3.4, height: 0.5, tint: "#a8895c" },
      { kind: "hills", distance: 2.6, height: 0.3, tint: "#7d8a5c" }
    ]
  },
  mainObject: {
    stageWeights: { "Arena & cavea": 1.2, "First arcade": 0.8, "Second arcade": 0.8, "Third arcade": 0.8, "Attic & velarium": 1.6 },
    components: [
      {
        id: "arena-floor",
        stage: "Arena & cavea",
        parts: [
          { shape: "cylinder", material: "ground", position: [0, 0, 0], scale: [22.5, 1, 18], entrance: "fade" },
          { shape: "box", material: "accent", position: [0, 1, 0], scale: [16.5, 0.5, 1] },
          { shape: "box", material: "accent", position: [0, 1, -4.2], scale: [13.5, 0.5, 0.8] },
          { shape: "box", material: "accent", position: [0, 1, 4.2], scale: [13.5, 0.5, 0.8] }
        ]
      },
      {
        id: "cavea-tier-0",
        stage: "Arena & cavea",
        parts: [{ shape: "cylinder", material: "accent", position: [0, 1, 0], scale: [21.3, 0.85, 17], entrance: "stack", order: 1 }]
      },
      {
        id: "cavea-tier-1",
        stage: "Arena & cavea",
        parts: [{ shape: "cylinder", material: "primary", position: [0, 1.85, 0], scale: [19.2, 0.85, 15.2], entrance: "stack", order: 2 }]
      },
      {
        id: "cavea-tier-2",
        stage: "Arena & cavea",
        parts: [{ shape: "cylinder", material: "accent", position: [0, 2.7, 0], scale: [17.1, 0.85, 13.4], entrance: "stack", order: 3 }]
      },
      {
        id: "cavea-tier-3",
        stage: "Arena & cavea",
        parts: [{ shape: "cylinder", material: "primary", position: [0, 3.55, 0], scale: [15, 0.85, 11.6], entrance: "stack", order: 4 }]
      },
      {
        id: "arcade-1",
        stage: "First arcade",
        generator: "arcade",
        params: { a: 15, b: 12, count: 20, height: 2.8, pier: [1.5, 1.7], y: 0 },
        material: "primary"
      },
      {
        id: "arcade-2",
        stage: "Second arcade",
        generator: "arcade",
        params: { a: 15, b: 12, count: 20, height: 2.8, pier: [1.5, 1.7], y: 2.8 },
        material: "primary"
      },
      {
        id: "arcade-3",
        stage: "Third arcade",
        generator: "arcade",
        params: { a: 15, b: 12, count: 20, height: 2.8, pier: [1.5, 1.7], y: 5.6 },
        material: "primary"
      },
      {
        id: "attic",
        stage: "Attic & velarium",
        generator: "ring",
        params: { radius: 1, count: 14, partScale: [1.6, 2.6, 1.8], arc: [-1.73, 2.67], ellipse: [15, 12], y: 8.4 },
        material: "primary"
      },
      {
        id: "velarium-poles",
        stage: "Attic & velarium",
        generator: "ring",
        params: { radius: 1, count: 12, partScale: [0.28, 2.6, 0.28], arc: [-1.73, 2.67], ellipse: [16.2, 13.2], y: 11 },
        material: "accent",
        entrance: "place"
      }
    ]
  },
  foreground: {
    workers: { count: 10, path: "perimeter", carry: true },
    scaffolding: { style: "wood-frame", aroundStages: ["Third arcade", "Attic & velarium"] },
    dust: true,
    fauna: { kind: "birds", count: 2 }
  }
};

// src/data/scenes/chichen-itza.scene.json
var chichen_itza_scene_default = {
  wonder: "chichen-itza",
  style: { notes: "nine limestone tiers over a jungle floor; four stairways; serpent balustrades" },
  camera: { startAzimuth: 0 },
  lighting: { endsAtNight: false },
  background: {
    terrain: "jungle",
    layers: [
      { kind: "jungle", distance: 3.4, height: 0.4, tint: "#4d6b3a" },
      { kind: "jungle", distance: 2.5, height: 0.28, tint: "#3d5c2e" }
    ]
  },
  mainObject: {
    stageWeights: { Platform: 0.7, "Nine tiers": 1.3, "Four stairways": 1.2, "Temple of Kukulc\xE1n": 1.7 },
    components: [
      {
        id: "platform",
        stage: "Platform",
        parts: [
          { shape: "box", material: "accent", position: [0, 0, 0], scale: [30, 1.4, 30], entrance: "place" }
        ]
      },
      {
        id: "tiers",
        stage: "Nine tiers",
        generator: "steppedPyramid",
        params: { base: 22, levels: 9, levelHeight: 1.4, y: 1.4 },
        material: "primary"
      },
      {
        id: "stairway-n",
        stage: "Four stairways",
        parts: [
          { shape: "box", material: "primary", position: [0, 7.3, 6.1], scale: [3.4, 0.9, 16.7], rotation: [-0.853, 0, 0], entrance: "stack", order: 0 },
          { shape: "box", material: "accent", position: [-1.9, 7.65, 6.1], scale: [0.7, 0.7, 16.7], rotation: [-0.853, 0, 0], entrance: "stack", order: 1 },
          { shape: "box", material: "accent", position: [1.9, 7.65, 6.1], scale: [0.7, 0.7, 16.7], rotation: [-0.853, 0, 0], entrance: "stack", order: 2 }
        ]
      },
      {
        id: "stairway-s",
        stage: "Four stairways",
        parts: [
          { shape: "box", material: "primary", position: [0, 7.3, -6.1], scale: [3.4, 0.9, 16.7], rotation: [0.853, 0, 0], entrance: "stack", order: 3 },
          { shape: "box", material: "accent", position: [-1.9, 7.65, -6.1], scale: [0.7, 0.7, 16.7], rotation: [0.853, 0, 0], entrance: "stack", order: 4 },
          { shape: "box", material: "accent", position: [1.9, 7.65, -6.1], scale: [0.7, 0.7, 16.7], rotation: [0.853, 0, 0], entrance: "stack", order: 5 }
        ]
      },
      {
        id: "stairway-e",
        stage: "Four stairways",
        parts: [
          { shape: "box", material: "primary", position: [6.1, 7.3, 0], scale: [3.4, 0.9, 16.7], rotation: [0, 0, 0.853], entrance: "stack", order: 6 },
          { shape: "box", material: "accent", position: [6.1, 7.65, -1.9], scale: [0.7, 0.7, 16.7], rotation: [0, 0, 0.853], entrance: "stack", order: 7 },
          { shape: "box", material: "accent", position: [6.1, 7.65, 1.9], scale: [0.7, 0.7, 16.7], rotation: [0, 0, 0.853], entrance: "stack", order: 8 }
        ]
      },
      {
        id: "stairway-w",
        stage: "Four stairways",
        parts: [
          { shape: "box", material: "primary", position: [-6.1, 7.3, 0], scale: [3.4, 0.9, 16.7], rotation: [0, 0, -0.853], entrance: "stack", order: 9 },
          { shape: "box", material: "accent", position: [-6.1, 7.65, -1.9], scale: [0.7, 0.7, 16.7], rotation: [0, 0, -0.853], entrance: "stack", order: 10 },
          { shape: "box", material: "accent", position: [-6.1, 7.65, 1.9], scale: [0.7, 0.7, 16.7], rotation: [0, 0, -0.853], entrance: "stack", order: 11 }
        ]
      },
      {
        id: "temple",
        stage: "Temple of Kukulc\xE1n",
        parts: [
          { shape: "box", material: "accent", position: [0, 15.4, 0], scale: [8.5, 1, 8.5], entrance: "stack", order: 0 },
          { shape: "box", material: "primary", position: [0, 16.4, 0], scale: [6.5, 2.6, 5.5], entrance: "stack", order: 1 },
          { shape: "box", material: "accent", position: [0, 19, 0], scale: [7, 0.9, 6], entrance: "stack", order: 2 },
          { shape: "box", material: "accent", position: [0, 19.9, 0], scale: [4.5, 1.6, 1], entrance: "stack", order: 3 },
          { shape: "box", material: "accent", position: [-1.9, 1.4, 11.6], scale: [0.9, 0.9, 1.4], entrance: "place" },
          { shape: "box", material: "accent", position: [1.9, 1.4, 11.6], scale: [0.9, 0.9, 1.4], entrance: "place" },
          { shape: "box", material: "accent", position: [11.6, 1.4, -1.9], scale: [1.4, 0.9, 0.9], entrance: "place" },
          { shape: "box", material: "accent", position: [11.6, 1.4, 1.9], scale: [1.4, 0.9, 0.9], entrance: "place" },
          { shape: "cone", material: "foliage", position: [-16, 0, 14], scale: [1.76, 2.6, 1.76], jitter: 0.5, entrance: "place" },
          { shape: "cone", material: "foliage", position: [17, 0, -12], scale: [1.58, 2.4, 1.58], jitter: 0.5, entrance: "place" },
          { shape: "cone", material: "foliage", position: [-15, 0, -15], scale: [1.7, 2.5, 1.7], jitter: 0.5, entrance: "place" }
        ]
      }
    ]
  },
  foreground: {
    workers: { count: 8, path: "perimeter", carry: true },
    scaffolding: { style: "wood-frame", aroundStages: ["Temple of Kukulc\xE1n"] },
    dust: true,
    fauna: { kind: "birds", count: 4 }
  }
};

// src/data/scenes/machu-picchu.scene.json
var machu_picchu_scene_default = {
  wonder: "machu-picchu",
  style: { notes: "granite terraces stepping down the ridge between two Andean peaks; dry-stone gabled houses" },
  camera: { startAzimuth: -1.047 },
  lighting: { endsAtNight: false },
  background: {
    terrain: "mountain",
    layers: [
      { kind: "mountains", distance: 3.6, height: 0.55, tint: "#6f8a6a" },
      { kind: "mountains", distance: 2.6, height: 0.42, tint: "#7c6f5a" }
    ]
  },
  mainObject: {
    stageWeights: { Terraces: 1.2, "The citadel": 1.5, "Intihuatana & plaza": 1 },
    components: [
      {
        id: "peaks",
        stage: "The peaks",
        parts: [
          { shape: "cone", material: "accent", position: [0, 0, -19], scale: [16, 8.5, 16], entrance: "none" },
          { shape: "cone", material: "foliage", position: [-17, 0, 12], scale: [11, 5, 11], entrance: "none" },
          { shape: "cone", material: "foliage", position: [17, 0, 10], scale: [9, 4.5, 9], entrance: "none" }
        ]
      },
      {
        id: "terraces",
        stage: "Terraces",
        parts: [
          { shape: "box", material: "primary", position: [-2, 0, -8], scale: [18, 1.3, 2.4], entrance: "stack", order: 0 },
          { shape: "box", material: "primary", position: [-2, 0, -5.6], scale: [16.2, 2.2, 2.4], entrance: "stack", order: 1 },
          { shape: "box", material: "primary", position: [-2, 0, -3.2], scale: [15.6, 3.1, 2.4], entrance: "stack", order: 2 },
          { shape: "box", material: "primary", position: [-2, 0, -0.8], scale: [14.4, 4, 2.4], entrance: "stack", order: 3 },
          { shape: "box", material: "primary", position: [-2, 0, 1.6], scale: [13.2, 4.9, 2.4], entrance: "stack", order: 4 },
          { shape: "box", material: "primary", position: [-2, 0, 4], scale: [12, 5.8, 2.4], entrance: "stack", order: 5 },
          { shape: "box", material: "primary", position: [-2, 0, 6.4], scale: [10.8, 6.4, 2.4], entrance: "stack", order: 6 },
          { shape: "box", material: "ground", position: [0.5, 0, 5.5], scale: [20, 6.2, 11], entrance: "stack", order: 7 }
        ]
      },
      {
        id: "houses",
        stage: "The citadel",
        parts: [
          { shape: "box", material: "primary", position: [-6, 6.2, 4], scale: [3.2, 2, 2.6], rotation: [0, 0.2, 0], entrance: "stack", order: 0 },
          { shape: "prism", material: "accent", position: [-6, 8.2, 4], scale: [3.7, 1.1, 3], rotation: [0, 0.2, 0], entrance: "stack", order: 1 },
          { shape: "box", material: "primary", position: [-1, 6.2, 5.5], scale: [2.8, 1.8, 2.4], rotation: [0, -0.15, 0], entrance: "stack", order: 2 },
          { shape: "prism", material: "accent", position: [-1, 8, 5.5], scale: [3.2, 1, 2.8], rotation: [0, -0.15, 0], entrance: "stack", order: 3 },
          { shape: "box", material: "primary", position: [4, 6.2, 4.2], scale: [3, 2.2, 2.5], rotation: [0, 0.1, 0], entrance: "stack", order: 4 },
          { shape: "prism", material: "accent", position: [4, 8.4, 4.2], scale: [3.5, 1.2, 2.9], rotation: [0, 0.1, 0], entrance: "stack", order: 5 },
          { shape: "box", material: "primary", position: [8, 6.2, 7.5], scale: [2.6, 1.7, 2.2], rotation: [0, 0.45, 0], entrance: "stack", order: 6 },
          { shape: "prism", material: "accent", position: [8, 7.9, 7.5], scale: [3, 0.9, 2.6], rotation: [0, 0.45, 0], entrance: "stack", order: 7 },
          { shape: "box", material: "primary", position: [-8.5, 6.2, 8.5], scale: [2.6, 1.9, 2.2], rotation: [0, -0.3, 0], entrance: "stack", order: 8 },
          { shape: "prism", material: "accent", position: [-8.5, 8.1, 8.5], scale: [3, 1, 2.6], rotation: [0, -0.3, 0], entrance: "stack", order: 9 }
        ]
      },
      {
        id: "intihuatana",
        stage: "Intihuatana & plaza",
        parts: [
          { shape: "pyramid", material: "accent", position: [2.5, 6.65, 9], scale: [2, 1.6, 2], entrance: "place" },
          { shape: "box", material: "ground", position: [1.5, 6.15, 8.5], scale: [9, 0.5, 7], entrance: "fade" },
          { shape: "cone", material: "foliage", position: [-11, 0, 3], scale: [1.4, 2.1, 1.4], jitter: 0.4, entrance: "place" },
          { shape: "cone", material: "foliage", position: [10, 0, 1], scale: [1.55, 2.3, 1.55], jitter: 0.4, entrance: "place" }
        ]
      }
    ]
  },
  foreground: {
    workers: { count: 8, path: "perimeter", carry: true },
    dust: true,
    fauna: { kind: "birds", count: 3 }
  }
};

// src/data/scenes/angkor-wat.scene.json
var angkor_wat_scene_default = {
  wonder: "angkor-wat",
  style: { notes: "five lotus-bud towers in quincunx over the moat; sandstone galleries; jungle at the horizon" },
  camera: { startAzimuth: 0 },
  lighting: { endsAtNight: false },
  background: {
    terrain: "jungle",
    layers: [
      { kind: "jungle", distance: 3.6, height: 0.35, tint: "#4d6b3a" },
      { kind: "jungle", distance: 2.6, height: 0.24, tint: "#6b7f52" }
    ]
  },
  mainObject: {
    stageWeights: { "Moat & causeway": 0.8, Galleries: 1.1, "Five towers": 1.8, "Corner prasats & libraries": 1 },
    components: [
      {
        id: "moat",
        stage: "Moat & causeway",
        parts: [
          { shape: "box", material: "water", position: [0, 0, 0], scale: [48, 0.25, 48], entrance: "fade" },
          { shape: "box", material: "ground", position: [0, 0.25, 0], scale: [30, 0.5, 30], entrance: "place" },
          { shape: "box", material: "accent", position: [0, 0.3, 17], scale: [4, 0.6, 14], entrance: "stack", order: 0 },
          { shape: "box", material: "accent", position: [-2.2, 0.75, 17], scale: [0.3, 0.5, 14], entrance: "stack", order: 1 },
          { shape: "box", material: "accent", position: [2.2, 0.75, 17], scale: [0.3, 0.5, 14], entrance: "stack", order: 1 }
        ]
      },
      {
        id: "galleries",
        stage: "Galleries",
        parts: [
          { shape: "box", material: "primary", position: [0, 0.75, -11], scale: [24, 2.6, 1.4], entrance: "stack", order: 0 },
          { shape: "box", material: "primary", position: [0, 0.75, 11], scale: [24, 2.6, 1.4], entrance: "stack", order: 1 },
          { shape: "box", material: "primary", position: [-11, 0.75, 0], scale: [1.4, 2.6, 24], entrance: "stack", order: 2 },
          { shape: "box", material: "primary", position: [11, 0.75, 0], scale: [1.4, 2.6, 24], entrance: "stack", order: 3 },
          { shape: "prism", material: "accent", position: [0, 3.35, -11], scale: [24.6, 1.2, 2.2], entrance: "stack", order: 4 },
          { shape: "prism", material: "accent", position: [0, 3.35, 11], scale: [24.6, 1.2, 2.2], entrance: "stack", order: 5 },
          { shape: "prism", material: "accent", position: [-11, 3.35, 0], scale: [2.2, 1.2, 24.6], rotation: [0, 1.5708, 0], entrance: "stack", order: 6 },
          { shape: "prism", material: "accent", position: [11, 3.35, 0], scale: [2.2, 1.2, 24.6], rotation: [0, 1.5708, 0], entrance: "stack", order: 6 },
          { shape: "box", material: "primary", position: [0, 0.75, 0], scale: [14, 3.4, 14], entrance: "stack", order: 7 },
          { shape: "box", material: "shadow", position: [0, 1.4, 11.75], scale: [3, 1.8, 0.4], entrance: "none" }
        ]
      },
      {
        id: "tower-center",
        stage: "Five towers",
        generator: "tieredTower",
        params: { center: [0, 0], base: 5, tiers: 4, tierHeight: 2.2, y: 4.15 },
        material: "primary"
      },
      {
        id: "tower-nw",
        stage: "Five towers",
        generator: "tieredTower",
        params: { center: [-7, -7], base: 3.4, tiers: 3, tierHeight: 1.7, y: 3.35 },
        material: "primary"
      },
      {
        id: "tower-ne",
        stage: "Five towers",
        generator: "tieredTower",
        params: { center: [7, -7], base: 3.4, tiers: 3, tierHeight: 1.7, y: 3.35 },
        material: "primary"
      },
      {
        id: "tower-sw",
        stage: "Five towers",
        generator: "tieredTower",
        params: { center: [-7, 7], base: 3.4, tiers: 3, tierHeight: 1.7, y: 3.35 },
        material: "primary"
      },
      {
        id: "tower-se",
        stage: "Five towers",
        generator: "tieredTower",
        params: { center: [7, 7], base: 3.4, tiers: 3, tierHeight: 1.7, y: 3.35 },
        material: "primary"
      },
      {
        id: "prasats-libraries",
        stage: "Corner prasats & libraries",
        parts: [
          { shape: "box", material: "accent", position: [-6, 0.75, 16], scale: [3, 2, 4], entrance: "stack", order: 0 },
          { shape: "box", material: "accent", position: [6, 0.75, 16], scale: [3, 2, 4], entrance: "stack", order: 1 },
          { shape: "cone", material: "accent", position: [-6, 2.75, 16], scale: [3.2, 1.8, 3.2], entrance: "stack", order: 2 },
          { shape: "cone", material: "accent", position: [6, 2.75, 16], scale: [3.2, 1.8, 3.2], entrance: "stack", order: 2 }
        ]
      },
      {
        id: "corner-tower-nw",
        stage: "Corner prasats & libraries",
        generator: "tieredTower",
        params: { center: [-13, -13], base: 1.8, tiers: 2, tierHeight: 1.3, y: 0 },
        material: "accent"
      },
      {
        id: "corner-tower-ne",
        stage: "Corner prasats & libraries",
        generator: "tieredTower",
        params: { center: [13, -13], base: 1.8, tiers: 2, tierHeight: 1.3, y: 0 },
        material: "accent"
      },
      {
        id: "corner-tower-sw",
        stage: "Corner prasats & libraries",
        generator: "tieredTower",
        params: { center: [-13, 13], base: 1.8, tiers: 2, tierHeight: 1.3, y: 0 },
        material: "accent"
      },
      {
        id: "corner-tower-se",
        stage: "Corner prasats & libraries",
        generator: "tieredTower",
        params: { center: [13, 13], base: 1.8, tiers: 2, tierHeight: 1.3, y: 0 },
        material: "accent"
      }
    ]
  },
  foreground: {
    workers: { count: 10, path: "perimeter", carry: true },
    scaffolding: { style: "wood-frame", aroundStages: ["Five towers"] },
    dust: true,
    fauna: { kind: "birds", count: 4 }
  }
};

// src/data/scenes/forbidden-city.scene.json
var forbidden_city_scene_default = {
  wonder: "forbidden-city",
  style: { notes: "vermilion colonnades and golden double-eave roofs on a three-tier marble terrace; Beijing rooftops beyond" },
  camera: { startAzimuth: 0 },
  lighting: { endsAtNight: false },
  background: {
    terrain: "city",
    layers: [
      { kind: "city", distance: 3.4, height: 0.45, tint: "#8a6a4e" },
      { kind: "city", distance: 2.5, height: 0.3, tint: "#b7a284" }
    ]
  },
  mainObject: {
    stageWeights: { "Marble terrace": 0.9, "Hall of Supreme Harmony": 1.7, "Side halls": 0.9, "Meridian gate & guardians": 1.1 },
    components: [
      {
        id: "terrace",
        stage: "Marble terrace",
        parts: [
          { shape: "box", material: "ground", position: [0, 0, 0], scale: [28, 1, 20], entrance: "stack", order: 0 },
          { shape: "box", material: "ground", position: [0, 1, 0], scale: [24, 1, 16.5], entrance: "stack", order: 1 },
          { shape: "box", material: "ground", position: [0, 2, 0], scale: [20, 1, 13], entrance: "stack", order: 2 },
          { shape: "box", material: "accent", position: [0, 2, 7.2], scale: [4, 0.4, 1.4], rotation: [-0.35, 0, 0], entrance: "stack", order: 3 }
        ]
      },
      {
        id: "hall-columns",
        stage: "Hall of Supreme Harmony",
        generator: "row",
        params: { count: 8, from: [-6.9, 4.1], to: [6.9, 4.1], size: [0.5, 3.6, 0.5], y: 3, shape: "cylinder" },
        material: "primary",
        entrance: "stack"
      },
      {
        id: "hall-columns-back",
        stage: "Hall of Supreme Harmony",
        generator: "row",
        params: { count: 8, from: [-6.9, -4.1], to: [6.9, -4.1], size: [0.5, 3.6, 0.5], y: 3, shape: "cylinder" },
        material: "primary",
        entrance: "stack"
      },
      {
        id: "hall-body",
        stage: "Hall of Supreme Harmony",
        parts: [
          { shape: "box", material: "primary", position: [0, 3, 0], scale: [15, 3.6, 9], entrance: "stack", order: 8 },
          { shape: "pyramid", material: "accent", position: [0, 6.6, 0], scale: [19.2, 1.7, 11.5], entrance: "stack", order: 9 },
          { shape: "pyramid", material: "accent", position: [0, 8.1, 0], scale: [14.4, 1.5, 8.6], entrance: "stack", order: 10 },
          { shape: "box", material: "accent", position: [0, 9.6, 0], scale: [12, 0.45, 1], entrance: "stack", order: 11 },
          { shape: "box", material: "accent", position: [-6, 9.9, 0], scale: [0.8, 0.8, 0.8], entrance: "place" },
          { shape: "box", material: "accent", position: [6, 9.9, 0], scale: [0.8, 0.8, 0.8], entrance: "place" }
        ]
      },
      {
        id: "side-hall-w",
        stage: "Side halls",
        parts: [
          { shape: "box", material: "primary", position: [-17, 0, 1], scale: [7, 3, 6], entrance: "stack", order: 0 },
          { shape: "pyramid", material: "accent", position: [-17, 3, 1], scale: [8.4, 1.4, 7.2], entrance: "stack", order: 1 }
        ]
      },
      {
        id: "side-hall-e",
        stage: "Side halls",
        parts: [
          { shape: "box", material: "primary", position: [17, 0, 1], scale: [7, 3, 6], entrance: "stack", order: 2 },
          { shape: "pyramid", material: "accent", position: [17, 3, 1], scale: [8.4, 1.4, 7.2], entrance: "stack", order: 3 }
        ]
      },
      {
        id: "gate",
        stage: "Meridian gate & guardians",
        parts: [
          { shape: "box", material: "primary", position: [0, 0, 14], scale: [10, 4.5, 2.4], entrance: "stack", order: 0 },
          { shape: "pyramid", material: "accent", position: [0, 4.5, 14], scale: [11.5, 1.8, 3.4], entrance: "stack", order: 1 },
          { shape: "sphere", material: "accent", position: [-2.6, 0.6, 10.5], scale: [1.1, 1.1, 1.1], entrance: "place" },
          { shape: "sphere", material: "accent", position: [2.6, 0.6, 10.5], scale: [1.1, 1.1, 1.1], entrance: "place" },
          { shape: "box", material: "primary", position: [-14, 0, 12], scale: [12, 3, 1.6], entrance: "stack", order: 2 },
          { shape: "box", material: "primary", position: [14, 0, 12], scale: [12, 3, 1.6], entrance: "stack", order: 3 }
        ]
      },
      {
        id: "watchtower-w",
        stage: "Meridian gate & guardians",
        generator: "tieredTower",
        params: { center: [-19, 10], base: 2.6, tiers: 2, tierHeight: 1.5, y: 3 },
        material: "accent"
      },
      {
        id: "watchtower-e",
        stage: "Meridian gate & guardians",
        generator: "tieredTower",
        params: { center: [19, 10], base: 2.6, tiers: 2, tierHeight: 1.5, y: 3 },
        material: "accent"
      }
    ]
  },
  foreground: {
    workers: { count: 10, path: "perimeter", carry: true },
    scaffolding: { style: "wood-frame", aroundStages: ["Hall of Supreme Harmony"] },
    dust: true,
    fauna: { kind: "birds", count: 2 }
  }
};

// src/data/scenes/eiffel-tower.scene.json
var eiffel_tower_scene_default = {
  wonder: "eiffel-tower",
  style: { notes: "puddled-iron lattice over the Champ de Mars; wooden falsework during the build; sparkles at night" },
  camera: { startAzimuth: 0.785 },
  lighting: { endsAtNight: true },
  background: {
    terrain: "city",
    layers: [
      { kind: "city", distance: 3.2, height: 0.45, tint: "#87a9c9" },
      { kind: "city", distance: 2.4, height: 0.3, tint: "#a8b4a0" }
    ]
  },
  mainObject: {
    stageWeights: { "Four masonry feet": 0.7, "Curved legs & arches": 1.3, "First platform & upper legs": 1.1, "Second platform & shaft": 1.1, "Campanile & beacon": 1.6 },
    components: [
      {
        id: "feet",
        stage: "Four masonry feet",
        parts: [
          { shape: "box", material: "accent", position: [7.4, 0, 7.4], scale: [3.4, 2.2, 3.4] },
          { shape: "box", material: "accent", position: [7.4, 0, -7.4], scale: [3.4, 2.2, 3.4] },
          { shape: "box", material: "accent", position: [-7.4, 0, 7.4], scale: [3.4, 2.2, 3.4] },
          { shape: "box", material: "accent", position: [-7.4, 0, -7.4], scale: [3.4, 2.2, 3.4] }
        ]
      },
      {
        id: "lower-legs",
        stage: "Curved legs & arches",
        parts: [
          { shape: "box", material: "primary", position: [6.4, 1.9, 6.4], scale: [2.3, 9.6, 2.3], rotation: [0.21, 0, -0.21], entrance: "stack", order: 0 },
          { shape: "box", material: "primary", position: [6.4, 1.9, -6.4], scale: [2.3, 9.6, 2.3], rotation: [-0.21, 0, -0.21], entrance: "stack", order: 1 },
          { shape: "box", material: "primary", position: [-6.4, 1.9, 6.4], scale: [2.3, 9.6, 2.3], rotation: [0.21, 0, 0.21], entrance: "stack", order: 2 },
          { shape: "box", material: "primary", position: [-6.4, 1.9, -6.4], scale: [2.3, 9.6, 2.3], rotation: [-0.21, 0, 0.21], entrance: "stack", order: 3 }
        ]
      },
      {
        id: "girder-band-low",
        stage: "Curved legs & arches",
        generator: "ring",
        params: { radius: 5.9, count: 4, partScale: [11.8, 0.55, 0.55], yawOffset: 1.5708, y: 4.6 },
        material: "accent"
      },
      {
        id: "arches",
        stage: "Curved legs & arches",
        parts: [
          { shape: "torus", material: "accent", position: [0, 0.4, 6.6], scale: [4.6, 4.6, 0.55], rotation: [0, 0, 0], entrance: "stack", order: 4 },
          { shape: "torus", material: "accent", position: [6.6, 0.4, 0], scale: [4.6, 4.6, 0.55], rotation: [0, 1.5708, 0], entrance: "stack", order: 5 },
          { shape: "torus", material: "accent", position: [0, 0.4, -6.6], scale: [4.6, 4.6, 0.55], rotation: [0, 3.1416, 0], entrance: "stack", order: 6 },
          { shape: "torus", material: "accent", position: [-6.6, 0.4, 0], scale: [4.6, 4.6, 0.55], rotation: [0, -1.5708, 0], entrance: "stack", order: 7 }
        ]
      },
      {
        id: "first-platform",
        stage: "First platform & upper legs",
        parts: [
          { shape: "box", material: "accent", position: [0, 10.9, 0], scale: [15.8, 1.2, 15.8], entrance: "stack", order: 0 },
          { shape: "box", material: "primary", position: [0, 12.1, 0], scale: [16.3, 0.5, 16.3], entrance: "stack", order: 1 }
        ]
      },
      {
        id: "upper-legs",
        stage: "First platform & upper legs",
        parts: [
          { shape: "box", material: "primary", position: [3.3, 11.2, 3.3], scale: [1.7, 9, 1.7], rotation: [0.13, 0, -0.13], entrance: "stack", order: 2 },
          { shape: "box", material: "primary", position: [3.3, 11.2, -3.3], scale: [1.7, 9, 1.7], rotation: [-0.13, 0, -0.13], entrance: "stack", order: 3 },
          { shape: "box", material: "primary", position: [-3.3, 11.2, 3.3], scale: [1.7, 9, 1.7], rotation: [0.13, 0, 0.13], entrance: "stack", order: 4 },
          { shape: "box", material: "primary", position: [-3.3, 11.2, -3.3], scale: [1.7, 9, 1.7], rotation: [-0.13, 0, 0.13], entrance: "stack", order: 5 }
        ]
      },
      {
        id: "girder-band-high",
        stage: "First platform & upper legs",
        generator: "ring",
        params: { radius: 3.1, count: 4, partScale: [6.2, 0.5, 0.5], yawOffset: 1.5708, y: 16.4 },
        material: "accent"
      },
      {
        id: "second-platform",
        stage: "Second platform & shaft",
        parts: [
          { shape: "box", material: "accent", position: [0, 20, 0], scale: [8.2, 1.1, 8.2], entrance: "stack", order: 0 },
          { shape: "box", material: "primary", position: [0, 21.1, 0], scale: [8.6, 0.45, 8.6], entrance: "stack", order: 1 },
          { shape: "box", material: "primary", position: [0, 21.1, 0], scale: [3.8, 6.4, 3.8], entrance: "stack", order: 2 },
          { shape: "box", material: "primary", position: [0, 27.5, 0], scale: [2.4, 5.4, 2.4], entrance: "stack", order: 3 }
        ]
      },
      {
        id: "campanile",
        stage: "Campanile & beacon",
        parts: [
          { shape: "box", material: "accent", position: [0, 32.9, 0], scale: [2.9, 1, 2.9], entrance: "stack", order: 0 },
          { shape: "box", material: "primary", position: [0, 33.9, 0], scale: [1.3, 3.6, 1.3], entrance: "stack", order: 1 },
          { shape: "cylinder", material: "light", position: [0, 37.5, 0], scale: [0.35, 2.6, 0.35], entrance: "fade" }
        ]
      }
    ]
  },
  foreground: {
    workers: { count: 8, path: "perimeter", carry: true },
    scaffolding: { style: "wood-frame", aroundStages: ["Curved legs & arches", "Second platform & shaft"] },
    dust: true,
    fauna: { kind: "birds", count: 3 }
  }
};

// src/data/scenes/sydney-opera-house.scene.json
var sydney_opera_house_scene_default = {
  wonder: "sydney-opera-house",
  style: { notes: "white shell wedges (sphere sections, per Utzon) over the harbour podium; floodlit at night" },
  camera: { startAzimuth: -0.785 },
  lighting: { endsAtNight: true },
  background: {
    terrain: "harbor",
    layers: [
      { kind: "harbor", distance: 3.6, height: 0.15, tint: "#3d6e8f" },
      { kind: "city", distance: 2.8, height: 0.45, tint: "#7fa8c9" }
    ]
  },
  mainObject: {
    stageWeights: { "Harbour & podium": 0.8, "Concert hall sails": 1.5, "Opera theatre sails": 1.5, "Glass walls & restaurant": 0.9 },
    components: [
      {
        id: "harbour",
        stage: "Harbour & podium",
        parts: [
          { shape: "box", material: "accent", position: [0, 0.2, 0], scale: [30, 1.4, 19], entrance: "stack", order: 0 },
          { shape: "box", material: "ground", position: [0, 1.6, 0], scale: [26, 1, 15], entrance: "stack", order: 1 },
          { shape: "box", material: "accent", position: [0, 0.2, 12.5], scale: [20, 0.9, 4], entrance: "stack", order: 2 },
          { shape: "box", material: "accent", position: [0, 0.2, -12.5], scale: [20, 0.9, 4], entrance: "stack", order: 2 },
          { shape: "box", material: "ground", position: [0, 2.6, 8.2], scale: [18, 0.35, 1.1], entrance: "stack", order: 3 },
          { shape: "box", material: "ground", position: [0, 2.6, 9.5], scale: [18, 0.35, 1.1], entrance: "stack", order: 4 },
          { shape: "cylinder", material: "ground", position: [0, 0, 0], scale: [40, 0.35, 30], entrance: "place" },
          { shape: "box", material: "accent", position: [0, 0.35, 14.2], scale: [22, 0.6, 1], entrance: "stack", order: 5 },
          { shape: "box", material: "accent", position: [0, 0.35, -14.2], scale: [22, 0.6, 1], entrance: "stack", order: 6 }
        ]
      },
      {
        id: "concert-sails",
        stage: "Concert hall sails",
        parts: [
          { shape: "sail", material: "primary", position: [-6.4, 1.6, -3.4], scale: [4.2, 5.2, 4.6], rotation: [-0.55, 0, 0], entrance: "stack", order: 0 },
          { shape: "sail", material: "primary", position: [-6.4, 1.6, -0.9], scale: [4.6, 6.8, 5.2], rotation: [-0.55, 0, 0], entrance: "stack", order: 1 },
          { shape: "sail", material: "primary", position: [-6.4, 1.6, 1.6], scale: [5, 8.4, 5.8], rotation: [-0.55, 0, 0], entrance: "stack", order: 2 },
          { shape: "sail", material: "primary", position: [-6.4, 1.6, 4.1], scale: [5.4, 10, 6.4], rotation: [-0.55, 0, 0], entrance: "stack", order: 3 }
        ]
      },
      {
        id: "opera-sails",
        stage: "Opera theatre sails",
        parts: [
          { shape: "sail", material: "primary", position: [6.4, 1.6, -3.4], scale: [4.2, 5.2, 4.6], rotation: [-0.55, 3.1416, 0], entrance: "stack", order: 0 },
          { shape: "sail", material: "primary", position: [6.4, 1.6, -0.9], scale: [4.6, 6.8, 5.2], rotation: [-0.55, 3.1416, 0], entrance: "stack", order: 1 },
          { shape: "sail", material: "primary", position: [6.4, 1.6, 1.6], scale: [5, 8.4, 5.8], rotation: [-0.55, 3.1416, 0], entrance: "stack", order: 2 },
          { shape: "sail", material: "primary", position: [6.4, 1.6, 4.1], scale: [5.4, 10, 6.4], rotation: [-0.55, 3.1416, 0], entrance: "stack", order: 3 }
        ]
      },
      {
        id: "glass-walls",
        stage: "Glass walls & restaurant",
        parts: [
          { shape: "box", material: "light", position: [-6.4, 2.6, 6.2], scale: [7.6, 5.2, 0.4], entrance: "fade" },
          { shape: "box", material: "light", position: [6.4, 2.6, 6.2], scale: [7.6, 5.2, 0.4], entrance: "fade" },
          { shape: "sail", material: "primary", position: [13, 1.4, 6.5], scale: [2.4, 3.2, 3], rotation: [-0.4, 0.5, 0], entrance: "stack", order: 0 },
          { shape: "sail", material: "primary", position: [13.8, 1.4, 8.4], scale: [1.9, 2.4, 2.4], rotation: [-0.5, 0.9, 0], entrance: "stack", order: 1 },
          { shape: "sail", material: "primary", position: [12.4, 1.4, 9.8], scale: [1.5, 1.9, 2], rotation: [-0.6, 0.7, 0], entrance: "stack", order: 2 }
        ]
      }
    ]
  },
  foreground: {
    workers: { count: 8, path: "perimeter", carry: true },
    scaffolding: { style: "wood-frame", aroundStages: ["Concert hall sails", "Opera theatre sails"] },
    dust: true,
    fauna: { kind: "birds", count: 4 }
  }
};

// src/data/scenes/index.ts
var SCENE_DOCS = {
  "pyramids-of-giza": pyramids_of_giza_scene_default,
  stonehenge: stonehenge_scene_default,
  petra: petra_scene_default,
  colosseum: colosseum_scene_default,
  "chichen-itza": chichen_itza_scene_default,
  "machu-picchu": machu_picchu_scene_default,
  "angkor-wat": angkor_wat_scene_default,
  "forbidden-city": forbidden_city_scene_default,
  "eiffel-tower": eiffel_tower_scene_default,
  "sydney-opera-house": sydney_opera_house_scene_default
};
var cache = /* @__PURE__ */ new Map();
function getCompiledScene(wonderId) {
  if (!(wonderId in SCENE_DOCS)) return null;
  const hit = cache.get(wonderId);
  if (hit) return hit;
  const compiled = compileScene(SCENE_DOCS[wonderId]);
  cache.set(wonderId, compiled);
  return compiled;
}

// src/data/wonders/pyramids-of-giza.ts
var pyramidsOfGiza = {
  id: "pyramids-of-giza",
  name: "Pyramids of Giza",
  location: "Giza, Egypt",
  region: "Africa",
  era: "ancient",
  completedYear: -2560,
  endsAtNight: false,
  quote: {
    text: "From the heights of these pyramids, forty centuries look down on us.",
    author: "Napoleon Bonaparte"
  },
  description: "",
  facts: [
    "The Great Pyramid of Khufu stood 146.6 m tall and remained the tallest human-made structure for more than 3,800 years.",
    "It was assembled from an estimated 2.3 million stone blocks averaging about 2.5 tonnes each.",
    "The Giza complex is the only one of the Seven Wonders of the Ancient World still largely intact."
  ],
  palette: { ground: "#d9b380", primary: "#e8cf9e", accent: "#b98d55", sky: "#8ec8e8" },
  structure: getCompiledScene("pyramids-of-giza").structure
};

// src/data/wonders/stonehenge.ts
var stonehenge = {
  id: "stonehenge",
  name: "Stonehenge",
  location: "Wiltshire, England",
  region: "Europe",
  era: "ancient",
  completedYear: -2500,
  endsAtNight: false,
  quote: {
    text: "Can you imagine trying to talk six hundred people into helping you drag a fifty-ton stone eighteen miles across the countryside and muscle it into an upright position, and then saying, \u201CRight, lads! Another twenty like that \u2026 and then we can party!\u201D",
    author: "Bill Bryson"
  },
  description: "",
  facts: [
    "An average circle sarsen weighs around 25 tonnes; the great trilithon uprights exceed 30 tonnes and once stood over 7 m above ground.",
    "The smaller bluestones were transported from the Preseli Hills in Wales, over 200 km away.",
    "The monument is aligned to the summer solstice sunrise and winter solstice sunset."
  ],
  palette: { ground: "#66794a", primary: "#8d8d84", accent: "#5c6a70", sky: "#7895ad" },
  structure: getCompiledScene("stonehenge").structure
};

// src/data/wonders/petra.ts
var petra = {
  id: "petra",
  name: "Petra",
  location: "Ma'an, Jordan",
  region: "Middle East",
  era: "classical",
  completedYear: -100,
  endsAtNight: false,
  // Burgon's Newdigate Prize sonnet (1845) — the documented line the
  // description already borrowed, now credited in the quote slot where an
  // untraceable attribution used to sit.
  quote: {
    text: "Match me such marvel save in Eastern clime, a rose-red city half as old as time.",
    author: "John William Burgon, Petra"
  },
  description: "A rose-red city carved from living sandstone \u2014 its famous Treasury facade cut straight into the cliff at the mouth of the Siq.",
  facts: [
    "Al-Khazneh (the Treasury) stands about 39 m tall, carved directly into the sandstone cliff face.",
    "Petra was the capital of the Nabataean Kingdom from around the 4th century BC.",
    "The city is entered through the Siq, a narrow gorge over 1 km long."
  ],
  palette: { ground: "#c9a06a", primary: "#c77b4f", accent: "#a35c38", sky: "#8fb8d8" },
  structure: getCompiledScene("petra").structure
};

// src/data/wonders/colosseum.ts
var colosseum = {
  id: "colosseum",
  name: "Colosseum",
  location: "Rome, Italy",
  region: "Europe",
  era: "classical",
  completedYear: 80,
  endsAtNight: true,
  quote: {
    text: "While the Colosseum stands, Rome shall stand; when the Colosseum falls, Rome shall fall; when Rome falls, the world shall fall.",
    author: "Saint Bede"
  },
  description: "",
  facts: [
    "It held an estimated 50,000\u201380,000 spectators \u2014 the largest amphitheatre ever built.",
    "Completed in 80 AD under Emperor Titus after roughly a decade of construction.",
    'Its real name is the Flavian Amphitheatre; "Colosseum" refers to a colossal statue of Nero that stood nearby.'
  ],
  palette: { ground: "#b49a72", primary: "#d8c49a", accent: "#a8895c", sky: "#87b5d6" },
  structure: getCompiledScene("colosseum").structure
};

// src/data/wonders/chichen-itza.ts
var chichenItza = {
  id: "chichen-itza",
  name: "Chichen Itza",
  location: "Yucat\xE1n, Mexico",
  region: "North America",
  era: "medieval",
  completedYear: 900,
  endsAtNight: false,
  quote: {
    text: "The Great Ball Court is also very impressive. I would like to have seen them play a game, although it sounds like the end was pretty violent. I think it was safer to be a spectator.",
    author: "IslaDeb"
  },
  description: "El Castillo rises over the Yucat\xE1n jungle \u2014 a Maya calendar in stone, where a serpent of sunlight descends the steps each equinox.",
  facts: [
    "El Castillo has 365 steps in total when the four stairways and top platform are counted \u2014 one for each day of the year.",
    "On the equinoxes, light and shadow form a serpent that appears to slither down the northern stairway.",
    "The Great Ball Court at Chichen Itza is the largest in Mesoamerica, at 168 m long."
  ],
  palette: { ground: "#6a8a4f", primary: "#cfc39a", accent: "#8f855f", sky: "#8fc9e8" },
  structure: getCompiledScene("chichen-itza").structure
};

// src/data/wonders/machu-picchu.ts
var machuPicchu = {
  id: "machu-picchu",
  name: "Machu Picchu",
  location: "Cusco, Peru",
  region: "South America",
  era: "medieval",
  completedYear: 1450,
  endsAtNight: false,
  // Hiram Bingham's own words on the citadel (Inca Land, 1922) — the prior
  // verse was credited to a poet who died fifty years before Machu Picchu
  // was revealed to the West, so it could not describe this site.
  quote: {
    text: "Few romances can ever surpass that of the granite citadel on top of the beetling precipices of Machu Picchu, the crown of Inca Land.",
    author: "Hiram Bingham, Inca Land"
  },
  description: "A granite citadel perched on an Andean ridge, hidden from the conquistadors and unveiled to the world in 1911.",
  facts: [
    "Built around 1450 under the Inca emperor Pachacuti, then abandoned during the Spanish conquest.",
    "The citadel sits on a mountain ridge 2,430 m above sea level.",
    "Its dry-stone walls fit without mortar \u2014 precisely enough to ride out earthquakes."
  ],
  palette: { ground: "#5f7d4a", primary: "#9aa08b", accent: "#7c6f5a", sky: "#89b4d4" },
  structure: getCompiledScene("machu-picchu").structure
};

// src/data/wonders/angkor-wat.ts
var angkorWat = {
  id: "angkor-wat",
  name: "Angkor Wat",
  location: "Siem Reap, Cambodia",
  region: "Asia",
  era: "medieval",
  completedYear: 1150,
  endsAtNight: false,
  quote: {
    text: "The temple is surrounded by a moat, and access is by a single bridge, protected by two stone tigers so grand and fearsome as to strike terror into the visitor.",
    author: "Diogo do Couto"
  },
  description: "The largest religious monument on Earth \u2014 five lotus-bud towers for the peaks of Mount Meru, ringed by a moat like the cosmic ocean.",
  facts: [
    "Angkor Wat covers over 160 hectares, making it the largest religious monument in the world.",
    "It was built in the early 12th century for King Suryavarman II as a Hindu temple dedicated to Vishnu.",
    "The five towers form a quincunx representing the five peaks of Mount Meru, home of the gods."
  ],
  palette: { ground: "#6b7f52", primary: "#a8998a", accent: "#7d6f60", sky: "#93c2d8" },
  structure: getCompiledScene("angkor-wat").structure
};

// src/data/wonders/forbidden-city.ts
var forbiddenCity = {
  id: "forbidden-city",
  name: "Forbidden City",
  location: "Beijing, China",
  region: "Asia",
  era: "renaissance",
  completedYear: 1420,
  endsAtNight: false,
  quote: {
    text: "The whole palace complex is built along a central axis, the axis of the world, everything in the four directions suspend from this central point represented by these palaces.",
    author: "Jeffrey Riegel"
  },
  description: "The seat of twenty-four emperors \u2014 a walled universe of vermilion walls and golden roofs on the central axis of Beijing.",
  facts: [
    "The complex holds 980 buildings and, by tradition, 9,999 rooms.",
    "It was home to 24 emperors across the Ming and Qing dynasties.",
    "At 72 hectares it is the largest palace complex in the world."
  ],
  palette: { ground: "#b7a284", primary: "#b5341f", accent: "#e8b93c", sky: "#8db6d9" },
  structure: getCompiledScene("forbidden-city").structure
};

// src/data/wonders/eiffel-tower.ts
var eiffelTower = {
  id: "eiffel-tower",
  name: "Eiffel Tower",
  location: "Paris, France",
  region: "Europe",
  era: "industrial",
  completedYear: 1889,
  endsAtNight: true,
  quote: {
    text: "I ought to be jealous of the tower. She is more famous than I am.",
    author: "Gustave Eiffel"
  },
  description: "",
  facts: [
    "The tower opened at 312 metres in 1889. Today, including its antennas, it reaches 330 metres.",
    "The tower was assembled from 18,038 iron parts joined by roughly 2.5 million rivets.",
    "It was the tallest structure on Earth until the Chrysler Building surpassed it in 1930."
  ],
  palette: { ground: "#7d8a5c", primary: "#8a6a4e", accent: "#5c4330", sky: "#87a9c9" },
  structure: getCompiledScene("eiffel-tower").structure
};

// src/data/wonders/sydney-opera-house.ts
var sydneyOperaHouse = {
  id: "sydney-opera-house",
  name: "Sydney Opera House",
  location: "Sydney, Australia",
  region: "Oceania",
  era: "modern",
  completedYear: 1973,
  endsAtNight: true,
  quote: {
    text: "An opera begins long before the curtain goes up and ends long after it has come down. It starts in my imagination, it becomes my life, and it stays part of my life long after I've left the opera house.",
    author: "Maria Callas"
  },
  description: "White sails rising over Bennelong Point \u2014 the harbour city\u2019s gift to the performing arts and to the skyline itself.",
  facts: [
    "The shell roofs are clad in more than one million ceramic tiles.",
    "J\xF8rn Utzon won the 1957 design competition; the building opened in 1973.",
    "Construction took 14 years and cost about fourteen times the original estimate \u2014 AU$102 million against a projected AU$7 million."
  ],
  palette: { ground: "#b3a58c", primary: "#f2ede2", accent: "#c9c2b2", sky: "#7fb6e0" },
  structure: getCompiledScene("sydney-opera-house").structure
};

// src/data/index.ts
var WONDERS = [
  pyramidsOfGiza,
  stonehenge,
  petra,
  colosseum,
  chichenItza,
  machuPicchu,
  angkorWat,
  forbiddenCity,
  eiffelTower,
  sydneyOperaHouse
];
function getWonder(id) {
  const w = WONDERS.find((w2) => w2.id === id);
  if (!w) throw new Error(`Unknown wonder id: ${id}`);
  return w;
}

// src/render/three/ColosseumWorld.ts
import { Group as Group7, PerspectiveCamera as PerspectiveCamera4 } from "three";

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
    const [x, z2] = ellipsePoint((COLOSSEUM_A + COLOSSEUM_ARENA_A) / 2, (COLOSSEUM_B + COLOSSEUM_ARENA_B) / 2, theta);
    const yaw = ellipseYaw(COLOSSEUM_A, COLOSSEUM_B, theta);
    parts.push(part({
      id: `foundation-${segment}`,
      group: "foundation",
      kind: "block",
      bay: segment * 5,
      storey: -1,
      dimensions: [18.4, COLOSSEUM_FOUNDATION_HEIGHT, 14.2],
      finalPosition: [x, COLOSSEUM_FOUNDATION_HEIGHT / 2, z2],
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
      const [x, z2] = ellipsePoint(COLOSSEUM_A - 1.4, COLOSSEUM_B - 1.2, theta);
      const yaw = ellipseYaw(COLOSSEUM_A, COLOSSEUM_B, theta);
      const spacing = bayWidth(COLOSSEUM_A, COLOSSEUM_B, theta);
      parts.push(part({
        id: `arcade-${wave.storey}-${bay}`,
        group: "arcade",
        kind: "arch",
        bay,
        storey: wave.storey,
        dimensions: [spacing * 0.94, arcadeHeight - 0.35, 3.35],
        finalPosition: [x + nx * 0.2, y, z2 + nz * 0.2],
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
    const [x, z2] = ellipsePoint(COLOSSEUM_A - 1.2, COLOSSEUM_B - 1, theta);
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
      finalPosition: [x + nx * 0.15, y, z2 + nz * 0.15],
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
      const [x, z2] = ellipsePoint(wave.a, wave.b, theta);
      const yaw = ellipseYaw(wave.a, wave.b, theta);
      parts.push(part({
        id: `${wave.prefix}-${wave.storey}-${bay}`,
        group: "inner-arcade",
        kind: "arch",
        bay,
        storey: wave.storey,
        dimensions: [bayWidth(wave.a, wave.b, theta) * 0.94, rise, wave.depth],
        finalPosition: [x, y, z2],
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
    const [x, z2] = ellipsePoint(COLOSSEUM_ARENA_A * 0.5, COLOSSEUM_ARENA_B * 0.5, theta);
    const radial = ellipseRadius(COLOSSEUM_ARENA_A, COLOSSEUM_ARENA_B, theta) * 0.96;
    const chord = bayWidth(COLOSSEUM_ARENA_A, COLOSSEUM_ARENA_B, theta) * (COLOSSEUM_BAYS / arenaSectors) * 1.12;
    parts.push(part({
      id: `arena-${sector}`,
      group: "arena",
      kind: "plank",
      bay: Math.round(sector / arenaSectors * COLOSSEUM_BAYS) % COLOSSEUM_BAYS,
      storey: 0,
      dimensions: [chord, 0.22, radial],
      finalPosition: [x, 0.24, z2],
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

// src/render/three/ColosseumEnvironment.ts
import {
  BoxGeometry as BoxGeometry2,
  CircleGeometry,
  Color as Color6,
  CylinderGeometry as CylinderGeometry2,
  ConeGeometry as ConeGeometry2,
  DoubleSide as DoubleSide2,
  IcosahedronGeometry as IcosahedronGeometry2,
  BufferGeometry as BufferGeometry5,
  Float32BufferAttribute as Float32BufferAttribute5,
  Frustum,
  Sphere,
  Group as Group4,
  InstancedMesh as InstancedMesh2,
  Matrix4 as Matrix43,
  Mesh as Mesh5,
  MeshStandardMaterial as MeshStandardMaterial5,
  PlaneGeometry as PlaneGeometry2,
  PerspectiveCamera as PerspectiveCamera2,
  Quaternion as Quaternion2,
  Vector3 as Vector33
} from "three";

// src/data/colosseumEnvironment.ts
function createColosseumEnvironmentPlan() {
  return {
    era: {
      approximateYear: 80,
      latitude: 41.8902,
      description: "Flavian crews raising the amphitheatre in the drained Domus Aurea valley.",
      productionNote: "The movie compresses Vespasian\u2013Titus\u2013Domitian into one minute and authors Haterii-type treadwheel cranes plus timber centering as a coherent kit, not proven site archaeology. The dedicated monument has a timber arena floor."
    },
    palette: {
      travertine: "#d8c4a0",
      tuff: "#a8895c",
      pozzolana: "#8a7a68",
      brick: "#9a5a42",
      dust: "#c4a882",
      sky: "#6a9cc8"
    },
    layers: COLOSSEUM_CONSTRUCTION.layers.map((layer) => ({ ...layer })),
    terrain: {
      radius: 2200,
      segments: 64,
      motion: "static-world-space",
      description: "Drained alluvial valley between Palatine, Oppian, Velia and Caelian, with Quirinal, Viminal, and Janiculum as a farther city ring, extending past every cinematic hold so the square plane never silhouettes. Olive scrub on the rises; far valley fog meets the sky."
    },
    monument: {
      major: COLOSSEUM_MAJOR,
      minor: COLOSSEUM_MINOR,
      height: COLOSSEUM_HEIGHT,
      bays: COLOSSEUM_CONSTRUCTION.bays
    },
    ecology: {
      tufts: 720,
      pines: 400,
      cypress: 130,
      insulae: 420,
      farBlocks: 48,
      aqueductPiers: 28,
      description: "Olive Palatine and Caelian neighbourhoods of hip-roof insulae and palace wings, a farther Quirinal\u2013Viminal\u2013Janiculum city ring, umbrella-pine ridges, and the Neronian watercourse entering the Claudian precinct from the east, with adjoining streets and courtyard blocks. Hills stay below the 48 m facade. No standing water in the oval."
    },
    site: {
      wagons: 18,
      timberStocks: 48,
      mixingTubs: 28
    },
    exclusions: [
      "modern tourism",
      "exposed Domitianic hypogeum as the original arena",
      "Giza ramps",
      "Stonehenge pits",
      "gladiatorial games during construction",
      "standing water in the working oval",
      "mid-ground Tiber pool",
      "Domitianic aqueduct extension to the Palatine",
      "Trajan baths",
      "Arch of Constantine"
    ],
    sources: [
      { title: "UNESCO Historic Centre of Rome", url: "https://whc.unesco.org/en/list/91/" },
      { title: "Britannica: Colosseum", url: "https://www.britannica.com/topic/Colosseum" },
      { title: "World History Encyclopedia: Colosseum", url: "https://www.worldhistory.org/Colosseum/" },
      { title: "Structurae: Colosseum", url: "https://structurae.net/en/structures/colosseum" }
    ]
  };
}
var COLOSSEUM_ENVIRONMENT = createColosseumEnvironmentPlan();

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
function colosseumWesternReliefAt(x, z2) {
  if (x >= -520) return 0;
  const ramp = Math.min(1, (-x - 520) / 230);
  const envelope = ramp * ramp * (3 - 2 * ramp);
  let relief = 0;
  for (const ridge of COLOSSEUM_WESTERN_RIDGES) {
    const dx = (x - ridge.x) / ridge.spreadX;
    const dz = (z2 - ridge.z) / ridge.spreadZ;
    relief = Math.max(relief, Math.exp(-(dx * dx + dz * dz) / 2) * ridge.height);
  }
  return relief * envelope;
}
function colosseumTerrainHeightAt(x, z2) {
  const site = Math.hypot(x, z2);
  const flatten = site <= 140 ? 0 : site >= 220 ? 1 : (site - 140) / 80;
  let height = 0;
  for (const hill of COLOSSEUM_HILLS) {
    const dx = x - hill.x;
    const dz = z2 - hill.z;
    height += Math.exp(-(dx * dx + dz * dz) / (2 * hill.sigma * hill.sigma)) * hill.height;
  }
  return Math.max(height, colosseumWesternReliefAt(x, z2)) * flatten;
}
function colosseumLakeScarWeight(x, z2) {
  const e = Math.hypot(x / 102, z2 / 86);
  if (e >= 1) return 0;
  return (1 - e) * (1 - e);
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
      const z2 = point.z + COLOSSEUM_AQUEDUCT.direction[1] * along + COLOSSEUM_AQUEDUCT.direction[0] * across;
      ground = Math.min(ground, colosseumTerrainHeightAt(x, z2));
    }
  }
  return { ...point, distance, ground: ground - 0.05 };
}

// src/engine/colosseumUrbanContext.ts
function distanceToRomeSegment(x, z2, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z2 - a[1]) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - a[0] - dx * t, z2 - a[1] - dz * t);
}
function isClearOfRomeContext(x, z2, radius) {
  const p = COLOSSEUM_URBAN_CONTEXT.precinct;
  if (Math.abs(x - p.center[0]) < p.width / 2 + radius + 2 && Math.abs(z2 - p.center[1]) < p.depth / 2 + radius + 2) return false;
  const stairFoot = COLOSSEUM_URBAN_CONTEXT.streets.find((street2) => street2.id === "precinct-north-approach").points[0];
  if (Math.abs(x - p.center[0]) < p.northEntryWidth / 2 + radius + 2 && z2 > p.center[1] + p.depth / 2 - radius && z2 < stairFoot[1] + radius) return false;
  if (distanceToRomeSegment(x, z2, COLOSSEUM_AQUEDUCT.start, COLOSSEUM_URBAN_CONTEXT.watercourse.upstream) < COLOSSEUM_URBAN_CONTEXT.watercourse.corridorHalfWidth + radius) return false;
  for (const street2 of COLOSSEUM_URBAN_CONTEXT.streets) {
    for (let i = 1; i < street2.points.length; i++) {
      if (distanceToRomeSegment(x, z2, street2.points[i - 1], street2.points[i]) < street2.width / 2 + radius) return false;
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
        const x = p.x - COLOSSEUM_AQUEDUCT.direction[1] * offset, z2 = p.z + COLOSSEUM_AQUEDUCT.direction[0] * offset;
        const scale = 1.2 + (bay + row * 2 + (side + 1)) % 4 * 0.1;
        if (!isClearOfRomeContext(x, z2, 7.4 * scale)) continue;
        lots.push({ kind: "insula", x, z: z2, yaw: -Math.atan2(COLOSSEUM_AQUEDUCT.direction[1], COLOSSEUM_AQUEDUCT.direction[0]) + (side < 0 ? Math.PI : 0), scale, district: "caelian-watercourse" });
      }
    }
  }
  return lots;
}
function caelianLotFoundation(lot) {
  const corners = [];
  for (const [u, v] of [[-5.5, -4.6], [5.5, -4.6], [5.5, 4.6], [-5.5, 4.6]]) {
    const x = lot.x + (Math.cos(lot.yaw) * u + Math.sin(lot.yaw) * v) * lot.scale;
    const z2 = lot.z + (-Math.sin(lot.yaw) * u + Math.cos(lot.yaw) * v) * lot.scale;
    corners.push({ x, z: z2, ground: colosseumTerrainHeightAt(x, z2) });
  }
  return { corners, top: Math.max(colosseumTerrainHeightAt(lot.x, lot.z), ...corners.map((p) => p.ground)) + 0.12 };
}

// src/data/colosseumHousing.ts
var COLOSSEUM_HOUSING = [
  {
    "id": "courtyard",
    "label": "Low open courtyard house",
    "wings": [
      { "x": 0, "z": -2.95, "width": 10, "depth": 2.1, "height": 4.3, "roof": 1.15 },
      { "x": 0, "z": 2.95, "width": 10, "depth": 2.1, "height": 4.3, "roof": 1.15 },
      { "x": -3.95, "z": 0, "width": 2.1, "depth": 3.8, "height": 4.3, "roof": 1.05 },
      { "x": 3.95, "z": 0, "width": 2.1, "depth": 3.8, "height": 4.3, "roof": 1.05 }
    ]
  },
  {
    "id": "stepped",
    "label": "Stepped upper-storey court",
    "wings": [
      { "x": -1.8, "z": -2.2, "width": 6.4, "depth": 3.6, "height": 6.2, "roof": 1.25 },
      { "x": 3.2, "z": -2.2, "width": 3.6, "depth": 3.6, "height": 8.8, "roof": 1.4 },
      { "x": -3.2, "z": 1.8, "width": 3.6, "depth": 4.4, "height": 4.4, "roof": 1.1 }
    ]
  },
  {
    "id": "frontage",
    "label": "Joined street frontage with ground-floor shops",
    "wings": [
      { "x": -2.5, "z": 0, "width": 5, "depth": 7.8, "height": 6.7, "roof": 1.3 },
      { "x": 2.5, "z": 0, "width": 5, "depth": 7.8, "height": 5.1, "roof": 1.25 }
    ]
  },
  {
    "id": "corner",
    "label": "Tall corner house with lower adjoining wings",
    "wings": [
      { "x": -3, "z": 2, "width": 4, "depth": 4, "height": 10.8, "roof": 1.35 },
      { "x": 2, "z": 2, "width": 6, "depth": 4, "height": 7.4, "roof": 1.3 },
      { "x": -3, "z": -2, "width": 4, "depth": 4, "height": 5.2, "roof": 1.1 }
    ]
  }
];
var COLOSSEUM_HOUSING_HALF_WIDTH = 5.5;
var COLOSSEUM_HOUSING_HALF_DEPTH = 4.6;
var COLOSSEUM_HOUSING_RADIUS = 7.4;
var COLOSSEUM_HOUSING_GLB = "/models/colosseum-rome/housing-variants.glb";
function colosseumHousingById(id = "courtyard") {
  return COLOSSEUM_HOUSING.find((profile) => profile.id === id);
}

// src/engine/colosseumRomeLots.ts
var OVAL_KEEP = 2.15;
function onOval(x, z2) {
  return Math.hypot(x / COLOSSEUM_A, z2 / COLOSSEUM_B) < OVAL_KEEP;
}
function onHaul(x, z2) {
  return x > 88 && x < 240 && Math.abs(z2) < 48;
}
function valleyFootLots(rand, kind, count, minR, maxR) {
  const lots = [];
  let attempts = 0;
  while (lots.length < count && attempts < count * 16) {
    attempts += 1;
    const angle = rand() * Math.PI * 2;
    const radius = minR + rand() * (maxR - minR);
    const x = Math.cos(angle) * radius;
    const z2 = Math.sin(angle) * radius;
    if (onOval(x, z2) || onHaul(x, z2)) continue;
    lots.push({
      kind,
      x,
      z: z2,
      yaw: facingValley(x, z2) + (rand() - 0.5) * 0.16,
      scale: kind === "palace" ? 1.05 + rand() * 0.28 : 1.35 + rand() * 0.7
    });
  }
  return lots;
}
function facingValley(x, z2) {
  return Math.atan2(-x, -z2);
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
      const z2 = hill.z - Math.sin(yaw0) * localX + Math.cos(yaw0) * localZ;
      if (onOval(x, z2) || onHaul(x, z2)) continue;
      const ground = colosseumTerrainHeightAt(x, z2);
      if (ground < minGround) continue;
      const streetYaw = yaw0 + (row % 2 ? Math.PI : 0);
      lots.push({
        kind,
        x,
        z: z2,
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
    const z2 = hill.z + Math.sin(angle) * radius * 0.84;
    if (onOval(x, z2)) continue;
    if (colosseumTerrainHeightAt(x, z2) < 3.2) continue;
    lots.push({
      kind,
      x,
      z: z2,
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
        const x = a[0] + dx * along - dz * offset, z2 = a[1] + dz * along + dx * offset;
        if (onOval(x, z2) || onHaul(x, z2)) continue;
        lots.push({
          kind: "insula",
          x,
          z: z2,
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
function romeHousingFoundation(lot) {
  const half = halfExtents(lot);
  const samples = [];
  for (const u of [-1, 0, 1]) for (const v of [-1, 0, 1]) {
    const x = lot.x + Math.cos(lot.yaw) * u * half[0] + Math.sin(lot.yaw) * v * half[1];
    const z2 = lot.z - Math.sin(lot.yaw) * u * half[0] + Math.cos(lot.yaw) * v * half[1];
    samples.push({ x, z: z2, ground: colosseumTerrainHeightAt(x, z2) });
  }
  const top = lot.district === "caelian-watercourse" ? caelianLotFoundation(lot).top : Math.max(...samples.map((p) => p.ground)) + 0.12;
  return { top, bottom: Math.min(...samples.map((p) => p.ground)) - 0.18, half, samples };
}
var COLOSSEUM_ROME_LOTS = createColosseumRomeLots();
function colosseumRomeLotsOf(kind) {
  return COLOSSEUM_ROME_LOTS.filter((lot) => lot.kind === kind);
}

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

// src/engine/easing.ts
function clamp(v, min = 0, max = 1) {
  return Math.min(max, Math.max(min, v));
}
function smoothstep(t) {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
}
function easeInOutQuad(t) {
  const k = clamp(t);
  return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
}

// src/engine/daynight.ts
function lerpColor(a, b, p) {
  const k = clamp(p);
  const ca = parseInt(a.slice(1), 16);
  const cb = parseInt(b.slice(1), 16);
  const mix = (shift) => {
    const x = ca >> shift & 255;
    const y = cb >> shift & 255;
    return Math.round(x + (y - x) * k).toString(16).padStart(2, "0");
  };
  return `#${mix(16)}${mix(8)}${mix(0)}`;
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
var TARGETS = {
  "core-limestone": (m) => m.block["core-limestone"],
  "casing-limestone": (m) => m.block["casing-limestone"],
  granite: (m) => m.block.granite,
  sand: (m) => m.sand,
  "compacted-earth": (m) => m.compactedEarth,
  "quarry-cut": (m) => m.quarryCut,
  wood: (m) => m.wood,
  water: (m) => m.water,
  whitewash: (m) => m.whitewash,
  "mud-brick": (m) => m.city,
  "city-roof": (m) => m.cityRoof,
  "city-accent": (m) => m.cityAccent,
  linen: (m) => m.linen,
  foliage: (m) => m.foliage,
  farmland: (m) => m.farmland
};
function applyMaterialDetail(materials) {
  for (const recipe of MATERIAL_DETAIL_RECIPES) {
    const target = TARGETS[recipe.role];
    if (target) injectRecipe(target(materials), recipe);
  }
}
function injectMaterialRecipe(material, role) {
  injectRecipe(material, materialDetailFor(role));
}

// src/render/three/ColosseumAqueduct.ts
import { BufferGeometry as BufferGeometry2, Color as Color3, Float32BufferAttribute as Float32BufferAttribute2, Group as Group2, InstancedMesh, Matrix4, Mesh as Mesh2, PerspectiveCamera } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// src/render/three/aqueductMaterial.ts
import { MeshStandardMaterial } from "three";
function createAqueductMaterial() {
  const material = new MeshStandardMaterial({ color: "#ffffff", vertexColors: true, roughness: 0.94 });
  material.customProgramCacheKey = () => "wf-neronian-brick-v1";
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = "varying vec3 vAqueductWorld;\n" + shader.vertexShader.replace("#include <project_vertex>", `
      #include <project_vertex>
      vec4 aqueductWorld = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        aqueductWorld = instanceMatrix * aqueductWorld;
      #endif
      vAqueductWorld = (modelMatrix * aqueductWorld).xyz;
    `);
    shader.fragmentShader = "varying vec3 vAqueductWorld;\n" + shader.fragmentShader.replace("#include <color_fragment>", `
      #include <color_fragment>
      float aqAlong = dot(vAqueductWorld.xz - vec2(${COLOSSEUM_AQUEDUCT.start[0].toFixed(1)}, ${COLOSSEUM_AQUEDUCT.start[1].toFixed(1)}), vec2(${COLOSSEUM_AQUEDUCT.direction[0]}, ${COLOSSEUM_AQUEDUCT.direction[1]}));
      float aqHeight = vAqueductWorld.y - ${COLOSSEUM_AQUEDUCT.springingHeight} - aqAlong * ${COLOSSEUM_AQUEDUCT.grade};
      float aqLocalX = mod(aqAlong, ${(COLOSSEUM_AQUEDUCT.clearSpan + COLOSSEUM_AQUEDUCT.pierWidth).toFixed(2)}) - ${(COLOSSEUM_AQUEDUCT.clearSpan + COLOSSEUM_AQUEDUCT.pierWidth) / 2};
      float aqRadius = length(vec2(aqLocalX, aqHeight));
      float aqRing = step(0.0, aqHeight) * step(${COLOSSEUM_AQUEDUCT.archRise - 0.02}, aqRadius) * (1.0 - step(${COLOSSEUM_AQUEDUCT.archRise + 0.66}, aqRadius));
      vec2 aqUv = mix(vec2(aqAlong, vAqueductWorld.y), vec2(atan(aqHeight, aqLocalX) * ${COLOSSEUM_AQUEDUCT.archRise}, aqRadius), aqRing) / vec2(0.48, 0.10);
      vec2 aqFootprint = max(fwidth(aqUv), vec2(0.0001));
      aqUv.x += mod(floor(aqUv.y), 2.0) * 0.5;
      vec2 aqEdge = min(fract(aqUv), 1.0 - fract(aqUv));
      vec2 aqMortar = vec2(1.0) - smoothstep(vec2(0.014, 0.035), vec2(0.014, 0.035) + aqFootprint, aqEdge);
      float aqDetail = 1.0 - smoothstep(0.3, 1.2, max(aqFootprint.x, aqFootprint.y));
      float aqJoint = max(aqMortar.x, aqMortar.y) * aqDetail;
      float aqTone = fract(sin(dot(floor(aqUv), vec2(127.1,311.7))) * 43758.5453);
      // The light cap stays plain; its form and material read at a distance.
      float aqMasonry = 1.0 - step(${COLOSSEUM_AQUEDUCT.spandrelTop + COLOSSEUM_AQUEDUCT.channelHeight - 0.01}, aqHeight);
      diffuseColor.rgb *= 1.0 + aqMasonry * aqDetail * (aqTone - 0.5) * 0.12;
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.72 + vec3(0.075,0.066,0.051), aqJoint * aqMasonry * 0.6);
    `);
  };
  return material;
}

// src/render/three/ColosseumAqueductContinuation.ts
import { BufferGeometry, Color as Color2, DoubleSide, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial as MeshStandardMaterial2 } from "three";
var ColosseumAqueductContinuation = class {
  group = new Group();
  geometry = new BufferGeometry();
  material = new MeshStandardMaterial2({ color: "#ffffff", vertexColors: true, roughness: 0.94, side: DoubleSide });
  disposed = false;
  constructor() {
    this.group.name = "colosseum-aqueduct-upstream-continuation";
    const positions = [], colors = [];
    const brick = new Color2("#a67156"), cap = new Color2("#b79b7d");
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
    this.geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
    this.geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
    this.geometry.computeVertexNormals();
    this.geometry.computeBoundingBox();
    this.geometry.computeBoundingSphere();
    const mesh = new Mesh(this.geometry, this.material);
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

// src/render/three/ColosseumAqueduct.ts
var BRICK = new Color3("#a67156");
var ARCH_BRICK = new Color3("#bd8967");
var CAP = new Color3("#b79b7d");
function fallbackGeometry(kind) {
  const positions = [], colors = [];
  const face = (points, color) => {
    for (let i = 1; i < points.length - 1; i++) for (const p of [points[0], points[i], points[i + 1]]) {
      positions.push(...p);
      colors.push(color.r, color.g, color.b);
    }
  };
  const box = (width, bottom, height, depth, color, offsetX = 0) => {
    const x = width / 2, z2 = depth / 2, top = bottom + height;
    const p = [[-x, bottom, z2], [x, bottom, z2], [x, top, z2], [-x, top, z2], [-x, bottom, -z2], [x, bottom, -z2], [x, top, -z2], [-x, top, -z2]];
    for (const point of p) point[0] += offsetX;
    for (const indices of [[0, 1, 2, 3], [5, 4, 7, 6], [4, 0, 3, 7], [1, 5, 6, 2], [3, 2, 6, 7], [4, 5, 1, 0]]) face(indices.map((i) => p[i]), color);
  };
  if (kind === "pier") box(COLOSSEUM_AQUEDUCT.pierWidth, 0, 1, COLOSSEUM_AQUEDUCT.depth, BRICK);
  else if (kind === "impost") box(COLOSSEUM_AQUEDUCT.pierWidth + 0.2, -0.2, 0.2, COLOSSEUM_AQUEDUCT.depth + 0.2, ARCH_BRICK);
  else if (kind === "channel") {
    box(AQUEDUCT_LENGTH + COLOSSEUM_AQUEDUCT.pierWidth, 0, COLOSSEUM_AQUEDUCT.channelHeight, COLOSSEUM_AQUEDUCT.depth, BRICK);
    box(AQUEDUCT_LENGTH + COLOSSEUM_AQUEDUCT.pierWidth, COLOSSEUM_AQUEDUCT.channelHeight, COLOSSEUM_AQUEDUCT.capHeight, COLOSSEUM_AQUEDUCT.capDepth, CAP);
    for (const sign of [-1, 1]) box(COLOSSEUM_AQUEDUCT.pierWidth / 2, -COLOSSEUM_AQUEDUCT.spandrelTop, COLOSSEUM_AQUEDUCT.spandrelTop, COLOSSEUM_AQUEDUCT.depth, BRICK, sign * (AQUEDUCT_LENGTH / 2 + COLOSSEUM_AQUEDUCT.pierWidth / 4));
  } else {
    const segments = kind === "arch" ? COLOSSEUM_AQUEDUCT.desktopSegments : COLOSSEUM_AQUEDUCT.portraitSegments;
    const r = COLOSSEUM_AQUEDUCT.archRise, half = AQUEDUCT_PITCH / 2, d = COLOSSEUM_AQUEDUCT.depth / 2;
    const bottom = [[-half, 0], ...Array.from({ length: segments + 1 }, (_, i) => {
      const angle = Math.PI * (1 - i / segments);
      return [Math.cos(angle) * r, Math.sin(angle) * r];
    }), [half, 0]];
    for (let i = 0; i < bottom.length - 1; i++) {
      const [x0, y0] = bottom[i], [x1, y1] = bottom[i + 1];
      face([[x0, y0, d], [x1, y1, d], [x1, COLOSSEUM_AQUEDUCT.spandrelTop, d], [x0, COLOSSEUM_AQUEDUCT.spandrelTop, d]], BRICK);
      face([[x1, y1, -d], [x0, y0, -d], [x0, COLOSSEUM_AQUEDUCT.spandrelTop, -d], [x1, COLOSSEUM_AQUEDUCT.spandrelTop, -d]], BRICK);
      face([[x0, y0, d], [x0, y0, -d], [x1, y1, -d], [x1, y1, d]], ARCH_BRICK);
    }
    face([[-half, COLOSSEUM_AQUEDUCT.spandrelTop, d], [half, COLOSSEUM_AQUEDUCT.spandrelTop, d], [half, COLOSSEUM_AQUEDUCT.spandrelTop, -d], [-half, COLOSSEUM_AQUEDUCT.spandrelTop, -d]], BRICK);
    face([[-half, 0, d], [-half, COLOSSEUM_AQUEDUCT.spandrelTop, d], [-half, COLOSSEUM_AQUEDUCT.spandrelTop, -d], [-half, 0, -d]], BRICK);
    face([[half, 0, -d], [half, COLOSSEUM_AQUEDUCT.spandrelTop, -d], [half, COLOSSEUM_AQUEDUCT.spandrelTop, d], [half, 0, d]], BRICK);
  }
  const geometry = new BufferGeometry2();
  geometry.setAttribute("position", new Float32BufferAttribute2(positions, 3));
  geometry.setAttribute("color", new Float32BufferAttribute2(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}
async function loadAqueductKit() {
  let buffer;
  try {
    const response = await fetch(COLOSSEUM_AQUEDUCT.glb);
    if (response.ok) buffer = await response.arrayBuffer();
  } catch {
  }
  if (!buffer && typeof process !== "undefined" && process.versions?.node) {
    const { readFile } = await import("node:fs/promises");
    const data = await readFile(`${process.cwd()}/public${COLOSSEUM_AQUEDUCT.glb}`);
    buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  }
  if (!buffer) throw new Error("Neronian aqueduct kit unavailable");
  const { scene } = await new GLTFLoader().parseAsync(buffer, "");
  scene.updateMatrixWorld(true);
  const kit = {};
  const parts = ["pier", "impost", "arch", "archPortrait", "channel"];
  try {
    for (const key of parts) {
      const node = scene.getObjectByName(`aqueduct-${key}`);
      if (!node) throw new Error(`Aqueduct kit is missing ${key}`);
      const pieces = [];
      node.traverse((object) => {
        if (!(object instanceof Mesh2)) return;
        const copy = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
        copy.applyMatrix4(object.matrixWorld);
        for (const attribute of Object.keys(copy.attributes)) {
          if (!["position", "normal", "color"].includes(attribute)) copy.deleteAttribute(attribute);
        }
        const color = copy.getAttribute("color");
        if (color?.itemSize === 4) {
          const rgb = new Float32Array(color.count * 3);
          for (let i = 0; i < color.count; i++) rgb.set([color.getX(i), color.getY(i), color.getZ(i)], i * 3);
          copy.setAttribute("color", new Float32BufferAttribute2(rgb, 3));
        }
        pieces.push(copy);
      });
      const merged = mergeGeometries(pieces);
      pieces.forEach((piece) => piece.dispose());
      if (!merged) throw new Error(`Aqueduct kit has incompatible ${key} geometry`);
      kit[key] = merged;
    }
    return kit;
  } catch (error) {
    Object.values(kit).forEach((geometry) => geometry.dispose());
    throw error;
  } finally {
    const geometries = /* @__PURE__ */ new Set(), materials = /* @__PURE__ */ new Set();
    scene.traverse((object) => {
      if (!(object instanceof Mesh2)) return;
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
  }
}
function placement(distance, y, height = 1) {
  const p = aqueductPointAt(distance), [dx, dz] = COLOSSEUM_AQUEDUCT.direction;
  return new Matrix4().set(dx, 0, -dz, p.x, COLOSSEUM_AQUEDUCT.grade, height, 0, y, dz, 0, dx, p.z, 0, 0, 0, 1);
}
var ColosseumAqueduct = class {
  group = new Group2();
  ready;
  disposed = false;
  portrait = false;
  kit;
  material = createAqueductMaterial();
  piers;
  imposts;
  arches;
  channel;
  continuation = new ColosseumAqueductContinuation();
  constructor() {
    this.group.name = "colosseum-neronian-aqueduct";
    this.group.userData.asset = "fallback";
    this.group.add(this.continuation.group);
    this.kit = Object.fromEntries(["pier", "impost", "arch", "archPortrait", "channel"].map((key) => [key, fallbackGeometry(key)]));
    this.piers = new InstancedMesh(this.kit.pier, this.material, COLOSSEUM_AQUEDUCT.pierCount);
    this.imposts = new InstancedMesh(this.kit.impost, this.material, COLOSSEUM_AQUEDUCT.pierCount);
    this.arches = new InstancedMesh(this.kit.arch, this.material, COLOSSEUM_AQUEDUCT.pierCount - 1);
    this.channel = new Mesh2(this.kit.channel, this.material);
    for (const [mesh, name] of [[this.piers, "piers"], [this.imposts, "imposts"], [this.arches, "arches"], [this.channel, "channel"]]) {
      mesh.name = `colosseum-aqueduct-${name}`;
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }
    for (let i = 0; i < COLOSSEUM_AQUEDUCT.pierCount; i++) {
      const p = aqueductPierAt(i);
      this.piers.setMatrixAt(i, placement(p.distance, p.ground, p.springing - p.ground));
      this.imposts.setMatrixAt(i, placement(p.distance, p.springing));
      if (i < COLOSSEUM_AQUEDUCT.pierCount - 1) {
        const middle = p.distance + AQUEDUCT_PITCH / 2;
        this.arches.setMatrixAt(i, placement(middle, aqueductPointAt(middle).springing));
      }
    }
    for (const mesh of [this.piers, this.imposts, this.arches]) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
    this.channel.matrix.copy(placement(AQUEDUCT_LENGTH / 2, aqueductPointAt(AQUEDUCT_LENGTH / 2).springing + COLOSSEUM_AQUEDUCT.spandrelTop));
    this.channel.matrixAutoUpdate = false;
    this.ready = this.load();
  }
  async load() {
    try {
      const kit = await loadAqueductKit();
      if (this.disposed) {
        Object.values(kit).forEach((geometry) => geometry.dispose());
        return;
      }
      Object.values(this.kit).forEach((geometry) => geometry.dispose());
      this.kit = kit;
      this.piers.geometry = kit.pier;
      this.imposts.geometry = kit.impost;
      this.arches.geometry = this.portrait ? kit.archPortrait : kit.arch;
      this.channel.geometry = kit.channel;
      for (const mesh of [this.piers, this.imposts, this.arches]) mesh.computeBoundingSphere();
      this.group.userData.asset = "blender";
    } catch {
    }
  }
  update(camera) {
    const portrait = camera instanceof PerspectiveCamera && camera.aspect < 0.72;
    if (portrait === this.portrait) return;
    this.portrait = portrait;
    this.arches.geometry = portrait ? this.kit.archPortrait : this.kit.arch;
    this.arches.computeBoundingSphere();
  }
  dispose() {
    this.disposed = true;
    Object.values(this.kit).forEach((geometry) => geometry.dispose());
    this.material.dispose();
    this.piers.dispose();
    this.imposts.dispose();
    this.arches.dispose();
    this.continuation.dispose();
  }
};

// src/render/three/ColosseumUrbanContext.ts
import { BufferGeometry as BufferGeometry3, Color as Color4, Float32BufferAttribute as Float32BufferAttribute3, Group as Group3, Mesh as Mesh3, MeshStandardMaterial as MeshStandardMaterial4 } from "three";
var MasonryBatch = class {
  positions = [];
  colors = [];
  parts = [];
  tint = new Color4("#ffffff");
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
      const [x, z2] = outline[i], [nx, nz] = outline[(i + 1) % 4];
      this.face([x, colosseumTerrainHeightAt(x, z2) - 0.06, z2], [nx, colosseumTerrainHeightAt(nx, nz) - 0.06, nz], [nx, top, nz], [x, top, z2]);
    }
    this.face([x0, top, z1], [x1, top, z1], [x1, top, z0], [x0, top, z0]);
  }
  geometry() {
    const geometry = new BufferGeometry3();
    geometry.setAttribute("position", new Float32BufferAttribute3(this.positions, 3));
    geometry.setAttribute("color", new Float32BufferAttribute3(this.colors, 3));
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
      const z2 = z0 + (z1 - z0) * step / count + acrossZ * side;
      return [x, colosseumTerrainHeightAt(x, z2) + 0.08, z2];
    };
    for (let i = 0; i < count; i++) batch.face(edge(i, 1), edge(i + 1, 1), edge(i + 1, -1), edge(i, -1));
  }
}
function column(batch, x, z2, floor, height = 5.4) {
  const count = 6, bottom = floor + 0.3, top = floor + height;
  batch.box(x - 0.9, x + 0.9, z2 - 0.9, z2 + 0.9, floor, bottom);
  for (let i = 0; i < count; i++) {
    const a = i * Math.PI * 2 / count, b = (i + 1) * Math.PI * 2 / count;
    batch.face(
      [x + Math.cos(b) * 0.65, bottom, z2 + Math.sin(b) * 0.65],
      [x + Math.cos(a) * 0.65, bottom, z2 + Math.sin(a) * 0.65],
      [x + Math.cos(a) * 0.57, top, z2 + Math.sin(a) * 0.57],
      [x + Math.cos(b) * 0.57, top, z2 + Math.sin(b) * 0.57]
    );
  }
  batch.box(x - 0.85, x + 0.85, z2 - 0.85, z2 + 0.85, top, top + 0.35);
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
  group = new Group3();
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
        const [x, z2] = point(i / steps2), [nx, nz2] = point((i + 1) / steps2);
        brick.face([x, colosseumTerrainHeightAt(x, z2) - 0.06, z2], [nx, colosseumTerrainHeightAt(nx, nz2) - 0.06, nz2], [nx, top, nz2], [x, top, z2]);
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
        const z2 = south + 3 + i * (P.depth - 6) / 7;
        if (Math.abs(z2 - receiver[1]) < 4) continue;
        brick.footing(east - 0.08, east + 0.65, z2 - 0.8, z2 + 0.8, floor);
      }
      for (const z2 of [receiver[1] - 2.4, receiver[1] + 2.4]) brick.footing(east - 0.08, east + 0.85, z2 - 0.45, z2 + 0.45, floor);
    }, "#dac3ad");
    const approachStreet = COLOSSEUM_URBAN_CONTEXT.streets.find((route) => route.id === "precinct-north-approach");
    const approach = approachStreet.points[0];
    const run = approach[1] - north, startY = colosseumTerrainHeightAt(approach[0], approach[1]) + 0.08;
    const steps = Math.ceil((floor - startY) / 0.2), tread = run / steps;
    stone.part("precinct-north-stair", () => {
      for (let i = 0; i < steps; i++) {
        const front2 = approach[1] - i * tread, back = approach[1] - (i + 1) * tread;
        const halfWidth = (z2) => approachStreet.width / 2 + (P.northEntryWidth - approachStreet.width) / 2 * Math.min(1, (approach[1] - z2) / 6);
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
      const material = new MeshStandardMaterial4({ color, roughness: 0.94, vertexColors: true });
      injectMaterialRecipe(material, recipe);
      const geometry = batch.geometry(), mesh = new Mesh3(geometry, material);
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

// src/render/three/colosseumRome.ts
import {
  BoxGeometry,
  BufferGeometry as BufferGeometry4,
  Color as Color5,
  ConeGeometry,
  CylinderGeometry,
  Float32BufferAttribute as Float32BufferAttribute4,
  IcosahedronGeometry,
  Matrix4 as Matrix42,
  PlaneGeometry,
  Mesh as Mesh4,
  Quaternion,
  SphereGeometry,
  Vector3 as Vector32
} from "three";
import { mergeGeometries as mergeGeometries2 } from "three/addons/utils/BufferGeometryUtils.js";
import { GLTFLoader as GLTFLoader2 } from "three/addons/loaders/GLTFLoader.js";
var COLOSSEUM_ROME_KIT_GLB = "/models/colosseum-rome/rome-kit.glb";
var ROME_ROLE_COLOR = {
  brick: new Color5("#a27e65"),
  plaster: new Color5("#c9bea7"),
  tile: new Color5("#a4664b"),
  foliage: new Color5("#3a5a34"),
  timber: new Color5("#5a3c24"),
  stone: new Color5("#b5aa93"),
  void: new Color5("#1c1612")
};
async function readKitBuffer(path = COLOSSEUM_ROME_KIT_GLB) {
  try {
    const response = await fetch(path);
    if (response.ok) return await response.arrayBuffer();
  } catch {
  }
  if (typeof process === "undefined" || !process.versions?.node) {
    throw new Error(`Colosseum Rome kit missing: ${path}`);
  }
  const { readFileSync } = await import("node:fs");
  const { resolve } = await import("node:path");
  const file = resolve(process.cwd(), `public${path}`);
  const buffer = readFileSync(file);
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}
function findNamed(root, name) {
  const found = root.getObjectByName(name);
  if (found) return found;
  throw new Error(`Colosseum Rome prototype missing: ${name}`);
}
async function loadColosseumRomeKit() {
  const gltf = await new GLTFLoader2().parseAsync(await readKitBuffer(), "");
  const root = gltf.scene;
  return {
    insula: findNamed(root, "insula"),
    palace: findNamed(root, "palace-wing"),
    pine: findNamed(root, "umbrella-pine"),
    cypress: findNamed(root, "cypress")
  };
}
async function loadColosseumHousingKit() {
  const gltf = await new GLTFLoader2().parseAsync(await readKitBuffer(COLOSSEUM_HOUSING_GLB), "");
  return Object.fromEntries(COLOSSEUM_HOUSING.map((profile) => [profile.id, findNamed(gltf.scene, `housing-${profile.id}`)]));
}
function paintRole(name) {
  const n = name.toLowerCase();
  if (n.includes("plaster")) return "plaster";
  if (n.includes("roof") || n.includes("tile")) return "tile";
  if (n.includes("crown") || n.includes("foliage")) return "foliage";
  if (n.includes("trunk") || n.includes("timber")) return "timber";
  if (n.includes("plinth") || n.includes("cornice") || n.includes("stone") || n.includes("balcony")) {
    return "stone";
  }
  if (n.includes("window") || n.includes("void") || n.includes("arch") || n.includes("door")) return "void";
  return "brick";
}
function colorGeometry(geometry, color) {
  const count = geometry.getAttribute("position")?.count ?? 0;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geometry.setAttribute("color", new Float32BufferAttribute4(colors, 3));
  return geometry;
}
function asNonIndexed(geometry) {
  if (!geometry.index) return geometry;
  const next = geometry.toNonIndexed();
  geometry.dispose();
  return next;
}
function prepareGeometry(geometry) {
  for (const name of Object.keys(geometry.attributes)) {
    if (name !== "position" && name !== "normal" && name !== "color") {
      geometry.deleteAttribute(name);
    }
  }
  return asNonIndexed(geometry);
}
function simplifyRomePiece(source, name, role) {
  source.computeBoundingBox();
  const box = source.boundingBox;
  const center = box.getCenter(new Vector32()), size = box.getSize(new Vector32());
  if (name.includes("pine-crown")) {
    const crown = new IcosahedronGeometry(1, 0);
    crown.computeBoundingBox();
    const extents = crown.boundingBox.getSize(new Vector32());
    crown.scale(size.x / extents.x, size.y / extents.y, size.z / extents.z).translate(center.x, center.y, center.z);
    source.dispose();
    return crown;
  }
  const planar = role === "void" || name.includes("course-") || name.includes("court-");
  if (!planar) return source;
  const expanded = asNonIndexed(source);
  const positions = expanded.getAttribute("position"), normals = expanded.getAttribute("normal");
  const axis = name.includes("court-") ? 1 : size.x < size.z ? 0 : 2;
  const sign = axis === 1 ? 1 : Math.sign(axis === 0 ? center.x : center.z) || 1;
  const vertices = [];
  for (let i = 0; i < positions.count; i += 3) {
    const n = axis === 0 ? normals.getX(i) : axis === 1 ? normals.getY(i) : normals.getZ(i);
    if (n * sign < 0.9) continue;
    for (let j = 0; j < 3; j++) vertices.push(positions.getX(i + j), positions.getY(i + j), positions.getZ(i + j));
  }
  if (vertices.length === 0) return expanded;
  const flat = new BufferGeometry4();
  flat.setAttribute("position", new Float32BufferAttribute4(vertices, 3));
  flat.computeVertexNormals();
  expanded.dispose();
  return flat;
}
function flattenRomeRole(root, role) {
  const pieces = [];
  root.updateWorldMatrix(true, true);
  const inverse = root.matrixWorld.clone().invert();
  root.traverse((object) => {
    if (!(object instanceof Mesh4)) return;
    if (paintRole(object.name) !== role) return;
    let geometry = object.geometry.clone();
    geometry.applyMatrix4(inverse.clone().multiply(object.matrixWorld));
    geometry = simplifyRomePiece(geometry, object.name, role);
    colorGeometry(geometry, ROME_ROLE_COLOR[role]);
    pieces.push(prepareGeometry(geometry));
  });
  if (pieces.length === 0) return null;
  const merged = mergeGeometries2(pieces, false);
  for (const piece of pieces) piece.dispose();
  if (!merged) return null;
  merged.computeVertexNormals();
  return merged;
}
function flattenRomeRoles(root, roles) {
  const pieces = [];
  for (const role of roles) {
    const part2 = flattenRomeRole(root, role);
    if (part2) pieces.push(part2);
  }
  if (pieces.length === 0) return null;
  if (pieces.length === 1) return pieces[0];
  const merged = mergeGeometries2(pieces, false);
  for (const piece of pieces) piece.dispose();
  merged?.computeVertexNormals();
  return merged;
}
function hipRoof(width, depth, height) {
  const hw = width * 0.52;
  const hd = depth * 0.52;
  const ridge = Math.min(width, depth) * 0.18;
  const geometry = new BufferGeometry4();
  geometry.setAttribute(
    "position",
    new Float32BufferAttribute4(
      [
        -hw,
        0,
        -hd,
        hw,
        0,
        -hd,
        ridge,
        height,
        0,
        -hw,
        0,
        -hd,
        ridge,
        height,
        0,
        -ridge,
        height,
        0,
        hw,
        0,
        -hd,
        hw,
        0,
        hd,
        ridge,
        height,
        0,
        hw,
        0,
        hd,
        -hw,
        0,
        hd,
        -ridge,
        height,
        0,
        hw,
        0,
        hd,
        -ridge,
        height,
        0,
        ridge,
        height,
        0,
        -hw,
        0,
        hd,
        -hw,
        0,
        -hd,
        -ridge,
        height,
        0
      ],
      3
    )
  );
  geometry.computeVertexNormals();
  return geometry;
}
function mergeColored(pieces) {
  const prepared = pieces.map(prepareGeometry);
  const merged = mergeGeometries2(prepared, false);
  for (const piece of prepared) piece.dispose();
  if (!merged) throw new Error("Rome procedural merge failed");
  merged.computeVertexNormals();
  return merged;
}
function createProceduralPalaceBrick() {
  const w = 16;
  const d = 9.2;
  const h = 7.2;
  const body = colorGeometry(new BoxGeometry(w, h, d).translate(0, h / 2, 0), ROME_ROLE_COLOR.brick);
  const plinth = colorGeometry(new BoxGeometry(w + 0.8, 0.7, d + 0.8).translate(0, 0.35, 0), ROME_ROLE_COLOR.stone);
  const cornice = colorGeometry(new BoxGeometry(w + 0.55, 0.28, d + 0.55).translate(0, h - 0.1, 0), ROME_ROLE_COLOR.stone);
  const voids = [-5.4, -1.8, 1.8, 5.4].map(
    (x) => colorGeometry(new BoxGeometry(1.6, 2.4, 0.22).translate(x, 2.4, d * 0.5 + 0.08), ROME_ROLE_COLOR.void)
  );
  return mergeColored([body, plinth, cornice, ...voids]);
}
function createProceduralPalaceRoof() {
  const roof = colorGeometry(hipRoof(17.2, 10.4, 2.8).translate(0, 7.2, 0), ROME_ROLE_COLOR.tile);
  const eaves = colorGeometry(new BoxGeometry(17.25, 0.12, 10.45).translate(0, 7.25, 0), ROME_ROLE_COLOR.tile);
  return mergeColored([roof, eaves]);
}
function createProceduralPineCrown() {
  const layers = [
    { y: 9.05, sx: 3.8, sy: 0.52 },
    { y: 9.45, sx: 2.9, sy: 0.46 },
    { y: 9.95, sx: 1.7, sy: 0.4 }
  ].map(({ y, sx, sy }) => {
    const sphere = new SphereGeometry(1, 10, 7);
    sphere.scale(sx, sy, sx);
    sphere.translate(0, y, 0);
    return colorGeometry(sphere, ROME_ROLE_COLOR.foliage);
  });
  return mergeColored(layers);
}
function createProceduralPineTrunk() {
  const trunk = new CylinderGeometry(0.22, 0.34, 9.2, 8);
  trunk.translate(0, 4.6, 0);
  return colorGeometry(trunk, ROME_ROLE_COLOR.timber);
}
function createProceduralCypress() {
  const trunk = colorGeometry(new CylinderGeometry(0.12, 0.18, 2.2, 6).translate(0, 1.1, 0), ROME_ROLE_COLOR.timber);
  const low = colorGeometry(new ConeGeometry(1.15, 4.4, 7).translate(0, 3.4, 0), ROME_ROLE_COLOR.foliage);
  const mid = colorGeometry(new ConeGeometry(0.78, 3.2, 7).translate(0, 6.2, 0), ROME_ROLE_COLOR.foliage);
  const tip = colorGeometry(new ConeGeometry(0.42, 2, 7).translate(0, 8.4, 0), ROME_ROLE_COLOR.foliage);
  return mergeColored([trunk, low, mid, tip]);
}
function lotMatrix(x, y, z2, yaw, scale) {
  return new Matrix42().compose(
    new Vector32(x, y, z2),
    new Quaternion().setFromAxisAngle(new Vector32(0, 1, 0), yaw),
    new Vector32(scale, scale, scale)
  );
}
function createProceduralHousing(id, part2, detail = "full") {
  const profile = colosseumHousingById(id);
  const pieces = [];
  if (part2 === "body") pieces.push(colorGeometry(new BoxGeometry(10.5, 0.24, 8.45).translate(0, 0.12, 0), ROME_ROLE_COLOR.stone));
  for (let i = 0; i < profile.wings.length; i++) {
    const wing = profile.wings[i];
    if (part2 === "roof") {
      const hw = (wing.width + 0.42) / 2, hd = (wing.depth + 0.42) / 2, ridge = Math.min(hw, hd) * 0.42;
      const vertices = [[-hw, 0, -hd], [hw, 0, -hd], [hw, 0, hd], [-hw, 0, hd], [-ridge, wing.roof, 0], [ridge, wing.roof, 0]];
      const triangles = [0, 5, 1, 0, 4, 5, 1, 5, 2, 2, 4, 3, 2, 5, 4, 3, 4, 0];
      const roof = new BufferGeometry4();
      roof.setAttribute("position", new Float32BufferAttribute4(triangles.flatMap((index) => vertices[index]), 3));
      roof.computeVertexNormals();
      roof.translate(wing.x, wing.height, wing.z);
      pieces.push(colorGeometry(roof, ROME_ROLE_COLOR.tile));
      continue;
    }
    const role = id === "corner" && i === 0 ? "brick" : "plaster";
    pieces.push(colorGeometry(new BoxGeometry(wing.width, wing.height, wing.depth).translate(wing.x, wing.height / 2, wing.z), ROME_ROLE_COLOR[role]));
    if (detail === "compact") continue;
    for (const side of [-1, 1]) {
      const faceZ = wing.z + side * (wing.depth / 2 + 0.015);
      if (Math.abs(faceZ) < 3.85) continue;
      const levels = Math.max(1, Math.round(wing.height / 3));
      for (let level = 0; level < levels; level++) for (const offset of [-0.24, 0.24]) {
        const height = level ? 1.3 : id === "frontage" ? 2.25 : 1.5;
        const width = id === "frontage" && level === 0 ? 1.2 : 0.75;
        const opening = new PlaneGeometry(width, height);
        if (side < 0) opening.rotateY(Math.PI);
        opening.translate(wing.x + wing.width * offset, 1.25 + level * 2.7, faceZ);
        pieces.push(colorGeometry(opening, ROME_ROLE_COLOR.void));
      }
    }
  }
  return mergeColored(pieces);
}
function compactHousingBody(source) {
  const expanded = source.index ? source.toNonIndexed() : source;
  const positions = expanded.getAttribute("position");
  const normals = expanded.getAttribute("normal");
  const colors = expanded.getAttribute("color");
  const keptPositions = [], keptNormals = [], keptColors = [];
  for (let i = 0; i < positions.count; i += 3) {
    const stone = Math.abs(colors.getX(i) - ROME_ROLE_COLOR.stone.r) < 1e-3 && Math.abs(colors.getY(i) - ROME_ROLE_COLOR.stone.g) < 1e-3;
    const y = normals.getY(i);
    if (stone ? y < 0.9 : Math.abs(y) > 0.9) continue;
    for (let j = 0; j < 3; j++) {
      keptPositions.push(positions.getX(i + j), positions.getY(i + j), positions.getZ(i + j));
      keptNormals.push(normals.getX(i + j), normals.getY(i + j), normals.getZ(i + j));
      keptColors.push(colors.getX(i + j), colors.getY(i + j), colors.getZ(i + j));
    }
  }
  const result = new BufferGeometry4();
  result.setAttribute("position", new Float32BufferAttribute4(keptPositions, 3));
  result.setAttribute("normal", new Float32BufferAttribute4(keptNormals, 3));
  result.setAttribute("color", new Float32BufferAttribute4(keptColors, 3));
  if (expanded !== source) expanded.dispose();
  source.dispose();
  return result;
}

// src/render/three/ColosseumEnvironment.ts
var ColosseumEnvironment = class {
  group = new Group4();
  ready;
  disposed = false;
  geometries = [];
  materials = [];
  tufts;
  pines;
  pineTrunks;
  cypress;
  housingBatches = [];
  housingFoundations;
  farBlocks;
  palaceRoofs;
  stocks;
  tubs;
  aqueduct;
  urbanContext;
  arenaSand;
  haulRing;
  tivoliRoad;
  cityDetail = [];
  compactCity = false;
  cityBatches = [];
  cityFrustum = new Frustum();
  cityProjection = new Matrix43();
  cityLastProjection = new Matrix43().makeScale(0, 0, 0);
  citySphere = new Sphere();
  constructor(materials) {
    this.group.name = "colosseum-environment";
    const dust = new MeshStandardMaterial5({ color: "#ffffff", roughness: 0.98, vertexColors: true });
    const brick = new MeshStandardMaterial5({ color: "#ffffff", roughness: 0.92, vertexColors: true });
    const farBrick = new MeshStandardMaterial5({ color: "#ffffff", roughness: 0.96, vertexColors: true });
    const tile = new MeshStandardMaterial5({ color: "#ffffff", roughness: 0.88, vertexColors: true });
    const canopy = new MeshStandardMaterial5({ color: "#ffffff", roughness: 0.9, vertexColors: true });
    const cypressMat = new MeshStandardMaterial5({ color: "#ffffff", roughness: 0.92, vertexColors: true });
    const tuftMat = new MeshStandardMaterial5({ color: "#62794d", roughness: 0.9, side: DoubleSide2 });
    const foundationMaterial = new MeshStandardMaterial5({ color: "#a69d87", roughness: 0.98 });
    this.materials.push(foundationMaterial);
    const siteBrick = new MeshStandardMaterial5({ color: "#8a5e4a", roughness: 0.92 });
    injectMaterialRecipe(dust, "compacted-earth");
    injectMaterialRecipe(brick, "mud-brick");
    injectMaterialRecipe(farBrick, "mud-brick");
    injectMaterialRecipe(tile, "mud-brick");
    injectMaterialRecipe(canopy, "foliage");
    injectMaterialRecipe(cypressMat, "foliage");
    injectMaterialRecipe(tuftMat, "foliage");
    injectMaterialRecipe(siteBrick, "mud-brick");
    this.materials.push(dust, brick, farBrick, tile, canopy, cypressMat, tuftMat, siteBrick);
    this.group.add(this.createTerrain(dust));
    this.tivoliRoad = this.createRoad();
    this.tivoliRoad.visible = false;
    this.group.add(this.tivoliRoad);
    this.haulRing = this.createHaulRing();
    this.haulRing.visible = false;
    this.group.add(this.haulRing);
    this.arenaSand = this.createArena();
    this.arenaSand.visible = false;
    this.group.add(this.arenaSand);
    this.group.add(this.createLakeScar());
    const tuftGeometry = new BufferGeometry5();
    const blades = [];
    for (let i = 0; i < 3; i++) {
      const angle = i * Math.PI / 3, dx = Math.cos(angle) * 0.52, dz = Math.sin(angle) * 0.52;
      blades.push(-dx, 0, -dz, dx, 0, dz, dx * 0.25, 1.1 - i * 0.12, dz * 0.25);
    }
    tuftGeometry.setAttribute("position", new Float32BufferAttribute5(blades, 3));
    tuftGeometry.computeVertexNormals();
    const pineGeometry = createProceduralPineCrown();
    const trunkGeometry = createProceduralPineTrunk();
    const cypressGeometry = createProceduralCypress();
    const palaceGeometry = createProceduralPalaceBrick();
    const palaceRoofGeometry = createProceduralPalaceRoof();
    const stockGeometry = new BoxGeometry2(1, 1, 1);
    const tubGeometry = new CylinderGeometry2(0.85, 0.95, 0.7, 8);
    this.geometries.push(
      tuftGeometry,
      pineGeometry,
      trunkGeometry,
      cypressGeometry,
      palaceGeometry,
      palaceRoofGeometry,
      stockGeometry,
      tubGeometry
    );
    const insulae = colosseumRomeLotsOf("insula");
    const palaces = colosseumRomeLotsOf("palace");
    const pines = colosseumRomeLotsOf("pine");
    const cypress = colosseumRomeLotsOf("cypress");
    this.tufts = new InstancedMesh2(tuftGeometry, tuftMat, COLOSSEUM_ENVIRONMENT.ecology.tufts);
    this.pines = new InstancedMesh2(pineGeometry, canopy, Math.max(pines.length, COLOSSEUM_ENVIRONMENT.ecology.pines));
    this.pines.name = "colosseum-umbrella-pines";
    this.pineTrunks = new InstancedMesh2(
      trunkGeometry,
      materials.wood.clone(),
      Math.max(pines.length, COLOSSEUM_ENVIRONMENT.ecology.pines)
    );
    this.cypress = new InstancedMesh2(
      cypressGeometry,
      cypressMat,
      Math.max(cypress.length, COLOSSEUM_ENVIRONMENT.ecology.cypress)
    );
    this.cypress.name = "colosseum-cypress";
    for (const [mesh, kind] of [[this.pines, "pine"], [this.cypress, "cypress"], [this.pineTrunks, "trunk"]]) {
      const compact = this.compactTreeGeometry(mesh.geometry, kind);
      this.geometries.push(compact);
      this.cityDetail.push({ mesh, full: mesh.geometry, compact });
    }
    for (const [index, profile] of COLOSSEUM_HOUSING.entries()) {
      const bodyGeometry = createProceduralHousing(profile.id, "body");
      const roofGeometry = createProceduralHousing(profile.id, "roof");
      this.geometries.push(bodyGeometry, roofGeometry);
      const count = insulae.filter((lot) => (lot.housing ?? "courtyard") === profile.id).length;
      const body = new InstancedMesh2(bodyGeometry, brick, count);
      const roof = new InstancedMesh2(roofGeometry, tile, count);
      body.name = index === 0 ? "colosseum-insulae" : `colosseum-housing-${profile.id}`;
      roof.name = index === 0 ? "colosseum-insulae-roofs" : `colosseum-housing-${profile.id}-roofs`;
      body.userData.housingVariant = profile.id;
      roof.userData.housingVariant = profile.id;
      this.housingBatches.push({ id: profile.id, body, roof });
      const compact = compactHousingBody(createProceduralHousing(profile.id, "body", "compact"));
      this.geometries.push(compact);
      this.cityDetail.push({ mesh: body, full: bodyGeometry, compact });
    }
    const foundationGeometry = new BoxGeometry2(1, 1, 1);
    const foundationIndices = [];
    for (let i = 0; i < foundationGeometry.index.count; i += 3) {
      const a = foundationGeometry.index.getX(i);
      if (foundationGeometry.getAttribute("normal").getY(a) < -0.9) continue;
      for (let j = 0; j < 3; j++) foundationIndices.push(foundationGeometry.index.getX(i + j));
    }
    foundationGeometry.setIndex(foundationIndices);
    this.geometries.push(foundationGeometry);
    this.housingFoundations = new InstancedMesh2(foundationGeometry, foundationMaterial, insulae.length + palaces.length);
    this.housingFoundations.name = "colosseum-housing-foundations";
    this.farBlocks = new InstancedMesh2(
      palaceGeometry,
      farBrick,
      Math.max(palaces.length, COLOSSEUM_ENVIRONMENT.ecology.farBlocks)
    );
    this.farBlocks.name = "colosseum-far-fabric";
    const compactPalace = compactHousingBody(palaceGeometry.clone());
    this.geometries.push(compactPalace);
    this.cityDetail.push({ mesh: this.farBlocks, full: palaceGeometry, compact: compactPalace });
    this.palaceRoofs = new InstancedMesh2(
      palaceRoofGeometry,
      tile,
      Math.max(palaces.length, COLOSSEUM_ENVIRONMENT.ecology.farBlocks)
    );
    this.palaceRoofs.name = "colosseum-palace-roofs";
    this.stocks = new InstancedMesh2(stockGeometry, materials.wood.clone(), COLOSSEUM_ENVIRONMENT.site.timberStocks);
    this.tubs = new InstancedMesh2(tubGeometry, siteBrick, COLOSSEUM_ENVIRONMENT.site.mixingTubs);
    this.aqueduct = new ColosseumAqueduct();
    this.group.add(this.aqueduct.group);
    this.urbanContext = new ColosseumUrbanContext();
    this.group.add(this.urbanContext.group);
    this.materials.push(
      this.stocks.material,
      this.pineTrunks.material
    );
    this.placeScatter();
    this.stocks.visible = false;
    this.tubs.visible = false;
    for (const mesh of [
      this.tufts,
      this.pines,
      this.pineTrunks,
      this.cypress,
      ...this.housingBatches.flatMap((batch) => [batch.body, batch.roof]),
      this.housingFoundations,
      this.farBlocks,
      this.palaceRoofs,
      this.stocks,
      this.tubs
    ]) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      this.group.add(mesh);
    }
    for (const mesh of [...this.housingBatches.flatMap((batch) => [batch.body, batch.roof]), this.housingFoundations, this.farBlocks, this.palaceRoofs, this.pines, this.pineTrunks, this.cypress, this.tufts]) {
      mesh.castShadow = false;
      const matrices = [], colors = [];
      for (let i = 0; i < mesh.count; i++) {
        const matrix = new Matrix43();
        mesh.getMatrixAt(i, matrix);
        matrices.push(matrix);
        if (mesh.instanceColor) {
          const color = new Color6();
          mesh.getColorAt(i, color);
          colors.push(color);
        }
      }
      this.cityBatches.push({ mesh, matrices, colors });
    }
    this.stocks.castShadow = false;
    this.ready = Promise.all([this.upgradeRomeKit(), this.upgradeHousingKit(), this.aqueduct.ready]).then(() => {
    });
  }
  createTerrain(material) {
    const geometry = new PlaneGeometry2(
      COLOSSEUM_ENVIRONMENT.terrain.radius * 2,
      COLOSSEUM_ENVIRONMENT.terrain.radius * 2,
      COLOSSEUM_ENVIRONMENT.terrain.segments,
      COLOSSEUM_ENVIRONMENT.terrain.segments
    );
    geometry.rotateX(-Math.PI / 2);
    const positions = geometry.attributes.position;
    const colors = new Float32Array(positions.count * 3);
    const sand = new Color6("#beb59c");
    const silt = new Color6("#999181");
    const olive = new Color6("#79866a");
    const scrub = new Color6("#60775c");
    const clay = new Color6("#a5977c");
    const scratch = new Color6();
    for (let i = 0; i < positions.count; i += 1) {
      const radius = COLOSSEUM_ENVIRONMENT.terrain.radius;
      const focus = (value) => Math.sign(value) * radius * (Math.abs(value) / radius) ** 1.65;
      const x = focus(positions.getX(i));
      const z2 = focus(positions.getZ(i));
      positions.setX(i, x);
      positions.setZ(i, z2);
      const y = colosseumTerrainHeightAt(x, z2);
      positions.setY(i, y);
      const scar = colosseumLakeScarWeight(x, z2);
      const mottling = (Math.sin(x * 0.053) * Math.sin(z2 * 0.041) + 1) * 0.5;
      let hillness = colosseumWesternReliefAt(x, z2) / 36;
      for (const hill of COLOSSEUM_HILLS) {
        const dx = x - hill.x;
        const dz = z2 - hill.z;
        hillness += Math.exp(-(dx * dx + dz * dz) / (2 * hill.sigma * hill.sigma));
      }
      hillness = Math.min(1, hillness);
      scratch.copy(sand).lerp(silt, scar);
      scratch.lerp(olive, hillness * (1 - scar) * 0.98);
      scratch.lerp(scrub, hillness * (0.35 + mottling * 0.4) * (1 - scar));
      scratch.lerp(clay, mottling * 0.12 * (1 - scar) * (1 - hillness));
      colors[i * 3] = scratch.r;
      colors[i * 3 + 1] = scratch.g;
      colors[i * 3 + 2] = scratch.b;
    }
    geometry.setAttribute("color", new Float32BufferAttribute5(colors, 3));
    geometry.computeVertexNormals();
    this.geometries.push(geometry);
    const mesh = new Mesh5(geometry, material);
    mesh.name = "colosseum-valley-floor";
    mesh.receiveShadow = true;
    return mesh;
  }
  createRoad() {
    const group = new Group4();
    group.name = "colosseum-tivoli-road";
    const material = new MeshStandardMaterial5({ color: "#b39470", roughness: 0.97 });
    injectMaterialRecipe(material, "compacted-earth");
    this.materials.push(material);
    const geometry = new BoxGeometry2(1, 1, 1);
    this.geometries.push(geometry);
    for (let i = 0; i < 14; i += 1) {
      const x = 108 + i * 7.4;
      const z2 = 6.2;
      const y = colosseumTerrainHeightAt(x, z2);
      const mesh = new Mesh5(geometry, material);
      mesh.position.set(x, y + 0.08, z2);
      mesh.scale.set(7.6, 0.16, 5.8);
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    for (let i = 0; i < 8; i += 1) {
      const x = 172 - i * 4.2;
      const z2 = 10 - i * 0.5;
      const y = colosseumTerrainHeightAt(x, z2);
      const mesh = new Mesh5(geometry, material);
      mesh.position.set(x, y + 0.08, z2);
      mesh.scale.set(4.6, 0.14, 4.2);
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    return group;
  }
  createHaulRing() {
    const group = new Group4();
    group.name = "colosseum-outer-haul-ring";
    const material = new MeshStandardMaterial5({ color: "#8a6d4e", roughness: 0.98 });
    injectMaterialRecipe(material, "compacted-earth");
    this.materials.push(material);
    const geometry = new BoxGeometry2(1, 1, 1);
    this.geometries.push(geometry);
    const segments = 36;
    for (let i = 0; i < segments; i += 1) {
      const theta = i / segments * Math.PI * 2;
      const [x, z2] = ellipsePoint(COLOSSEUM_A + 22, COLOSSEUM_B + 18, theta);
      const next = ellipsePoint(COLOSSEUM_A + 22, COLOSSEUM_B + 18, theta + Math.PI * 2 / segments);
      const dx = next[0] - x;
      const dz = next[1] - z2;
      const mesh = new Mesh5(geometry, material);
      mesh.position.set(x, colosseumTerrainHeightAt(x, z2) + 0.07, z2);
      mesh.scale.set(Math.hypot(dx, dz) * 1.12, 0.1, 3.4);
      mesh.rotation.y = Math.atan2(dx, dz);
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    return group;
  }
  createLakeScar() {
    const geometry = new CircleGeometry(1, 48);
    geometry.rotateX(-Math.PI / 2);
    geometry.scale(COLOSSEUM_A + 8, 1, COLOSSEUM_B + 8);
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i += 1) {
      const radius = COLOSSEUM_ENVIRONMENT.terrain.radius;
      const focus = (value) => Math.sign(value) * radius * (Math.abs(value) / radius) ** 1.65;
      const x = focus(positions.getX(i));
      const z2 = focus(positions.getZ(i));
      positions.setX(i, x);
      positions.setZ(i, z2);
      positions.setY(i, colosseumTerrainHeightAt(x, z2) + 0.05);
    }
    geometry.computeVertexNormals();
    this.geometries.push(geometry);
    const material = new MeshStandardMaterial5({ color: "#7d5f42", roughness: 0.99 });
    this.materials.push(material);
    const mesh = new Mesh5(geometry, material);
    mesh.name = "colosseum-lake-scar";
    mesh.receiveShadow = true;
    return mesh;
  }
  createArena() {
    const geometry = new CircleGeometry(1, 32);
    geometry.rotateX(-Math.PI / 2);
    geometry.scale(COLOSSEUM_ARENA_A, 1, COLOSSEUM_ARENA_B);
    this.geometries.push(geometry);
    const material = new MeshStandardMaterial5({ color: "#c9b289", roughness: 0.98 });
    this.materials.push(material);
    const mesh = new Mesh5(geometry, material);
    mesh.name = "colosseum-arena-sand";
    mesh.position.y = 0.1;
    mesh.receiveShadow = true;
    return mesh;
  }
  placeScatter() {
    const rand = mulberry32("colosseum-environment-scatter");
    const matrix = new Matrix43();
    const quaternion = new Quaternion2();
    const position = new Vector33();
    const scale = new Vector33();
    const axis = new Vector33(0, 1, 0);
    let tufts = 0;
    let tuftAttempts = 0;
    while (tufts < COLOSSEUM_ENVIRONMENT.ecology.tufts && tuftAttempts < COLOSSEUM_ENVIRONMENT.ecology.tufts * 24) {
      tuftAttempts += 1;
      const hill = COLOSSEUM_HILLS[tufts % COLOSSEUM_HILLS.length];
      const angle = rand() * Math.PI * 2;
      const radius = hill.sigma * (0.2 + rand() * 0.95);
      const x = hill.x + Math.cos(angle) * radius;
      const z2 = hill.z + Math.sin(angle) * radius * 0.84;
      if (Math.hypot(x / COLOSSEUM_A, z2 / COLOSSEUM_B) < 1.18) continue;
      const ground = colosseumTerrainHeightAt(x, z2);
      if (ground < 2.4) continue;
      position.set(x, ground + 0.18, z2);
      quaternion.identity();
      scale.set(1.1 + rand() * 1.4, 0.4 + rand() * 0.5, 1.1 + rand() * 1.4);
      matrix.compose(position, quaternion, scale);
      this.tufts.setMatrixAt(tufts, matrix);
      tufts += 1;
    }
    this.tufts.count = tufts;
    this.placeRomeLots();
    quaternion.setFromAxisAngle(axis, 0.2);
    for (let i = 0; i < COLOSSEUM_ENVIRONMENT.site.timberStocks; i += 1) {
      const x = 102 + i % 7 * 2.4;
      const z2 = -12 + Math.floor(i / 7) * 2.8;
      position.set(x, colosseumTerrainHeightAt(x, z2) + 0.35, z2);
      scale.set(2.2, 0.7, 0.35);
      matrix.compose(position, quaternion, scale);
      this.stocks.setMatrixAt(i, matrix);
    }
    this.stocks.count = COLOSSEUM_ENVIRONMENT.site.timberStocks;
    quaternion.identity();
    for (let i = 0; i < COLOSSEUM_ENVIRONMENT.site.mixingTubs; i += 1) {
      const x = 114 + i % 4 * 2.8;
      const z2 = -6 + Math.floor(i / 4) * 3.1;
      position.set(x, colosseumTerrainHeightAt(x, z2) + 0.36, z2);
      scale.set(1, 1, 1);
      matrix.compose(position, quaternion, scale);
      this.tubs.setMatrixAt(i, matrix);
    }
    this.tubs.count = COLOSSEUM_ENVIRONMENT.site.mixingTubs;
    this.tufts.instanceMatrix.needsUpdate = true;
    this.pines.instanceMatrix.needsUpdate = true;
    this.pineTrunks.instanceMatrix.needsUpdate = true;
    this.cypress.instanceMatrix.needsUpdate = true;
    for (const batch of this.housingBatches) {
      batch.body.instanceMatrix.needsUpdate = true;
      batch.roof.instanceMatrix.needsUpdate = true;
    }
    this.housingFoundations.instanceMatrix.needsUpdate = true;
    this.farBlocks.instanceMatrix.needsUpdate = true;
    this.palaceRoofs.instanceMatrix.needsUpdate = true;
    this.stocks.instanceMatrix.needsUpdate = true;
    this.tubs.instanceMatrix.needsUpdate = true;
  }
  placeRomeLots() {
    const brickTone = new Color6();
    const tileTone = new Color6();
    const counts = /* @__PURE__ */ new Map();
    const plasterTints = ["#eee7d9", "#d9d3c4", "#f3eddf", "#e5d9c5", "#d0cfc3"];
    const roofTints = ["#eee2d5", "#dac3b0", "#ecd1b9", "#e0d6cb"];
    let foundations = 0;
    const placeFoundation = (lot) => {
      const support = romeHousingFoundation(lot);
      if (lot.district !== "caelian-watercourse") {
        const matrix = new Matrix43().compose(
          new Vector33(lot.x, (support.top + support.bottom) / 2, lot.z),
          new Quaternion2().setFromAxisAngle(new Vector33(0, 1, 0), lot.yaw),
          new Vector33(support.half[0] * 2, support.top - support.bottom, support.half[1] * 2)
        );
        this.housingFoundations.setMatrixAt(foundations++, matrix);
      }
      return support.top;
    };
    let streetIndex = 0;
    for (const lot of colosseumRomeLotsOf("insula")) {
      const id = lot.housing ?? "courtyard";
      const batch = this.housingBatches.find((item) => item.id === id);
      const index = counts.get(id) ?? 0;
      const matrix = lotMatrix(lot.x, placeFoundation(lot), lot.z, lot.yaw, lot.scale);
      batch.body.setMatrixAt(index, matrix);
      batch.roof.setMatrixAt(index, matrix);
      brickTone.set(plasterTints[streetIndex % plasterTints.length]);
      tileTone.set(roofTints[streetIndex * 3 % roofTints.length]);
      batch.body.setColorAt(index, brickTone);
      batch.roof.setColorAt(index, tileTone);
      counts.set(id, index + 1);
      streetIndex++;
    }
    for (const batch of this.housingBatches) {
      batch.body.count = counts.get(batch.id) ?? 0;
      batch.roof.count = batch.body.count;
      if (batch.body.instanceColor) batch.body.instanceColor.needsUpdate = true;
      if (batch.roof.instanceColor) batch.roof.instanceColor.needsUpdate = true;
    }
    let palaces = 0;
    for (const lot of colosseumRomeLotsOf("palace")) {
      const ground = placeFoundation(lot);
      const matrix = lotMatrix(lot.x, ground, lot.z, lot.yaw, lot.scale);
      this.farBlocks.setMatrixAt(palaces, matrix);
      this.palaceRoofs.setMatrixAt(palaces, matrix);
      palaces += 1;
    }
    this.farBlocks.count = palaces;
    this.palaceRoofs.count = palaces;
    this.housingFoundations.count = foundations;
    let pines = 0;
    for (const lot of colosseumRomeLotsOf("pine")) {
      const ground = colosseumTerrainHeightAt(lot.x, lot.z);
      const matrix = lotMatrix(lot.x, ground, lot.z, lot.yaw, lot.scale);
      this.pines.setMatrixAt(pines, matrix);
      this.pineTrunks.setMatrixAt(pines, matrix);
      pines += 1;
    }
    this.pines.count = pines;
    this.pineTrunks.count = pines;
    let cypress = 0;
    for (const lot of colosseumRomeLotsOf("cypress")) {
      const ground = colosseumTerrainHeightAt(lot.x, lot.z);
      this.cypress.setMatrixAt(cypress, lotMatrix(lot.x, ground, lot.z, lot.yaw, lot.scale));
      cypress += 1;
    }
    this.cypress.count = cypress;
  }
  compactTreeGeometry(source, kind) {
    const compact = kind === "pine" ? new IcosahedronGeometry2(1, 0) : kind === "trunk" ? new BoxGeometry2(1, 1, 1) : new ConeGeometry2(1, 2, 5);
    source.computeBoundingBox();
    compact.computeBoundingBox();
    const from = compact.boundingBox, to = source.boundingBox;
    const fs = from.getSize(new Vector33()), ts = to.getSize(new Vector33());
    const center = to.getCenter(new Vector33());
    compact.translate(...from.getCenter(new Vector33()).negate().toArray());
    compact.scale(ts.x / fs.x, ts.y / fs.y, ts.z / fs.z).translate(center.x, center.y, center.z);
    return colorGeometry(compact, kind === "trunk" ? ROME_ROLE_COLOR.timber : ROME_ROLE_COLOR.foliage);
  }
  adoptGeometry(mesh, next, compact) {
    if (!next || this.disposed) {
      next?.dispose();
      compact?.dispose();
      return;
    }
    const tier = this.cityDetail.find((item) => item.mesh === mesh);
    const previous = tier?.full ?? mesh.geometry;
    if (tier) {
      tier.full = next;
      const replacement = compact ?? (mesh === this.pines || mesh === this.cypress || mesh === this.pineTrunks ? this.compactTreeGeometry(next, mesh === this.pines ? "pine" : mesh === this.cypress ? "cypress" : "trunk") : null);
      if (replacement) {
        const index2 = this.geometries.indexOf(tier.compact);
        if (index2 >= 0) this.geometries.splice(index2, 1);
        tier.compact.dispose();
        tier.compact = replacement;
        this.geometries.push(replacement);
      }
    }
    mesh.geometry = tier && this.compactCity ? tier.compact : next;
    this.cityLastProjection.makeScale(0, 0, 0);
    const index = this.geometries.indexOf(previous);
    if (index >= 0) this.geometries.splice(index, 1);
    previous.dispose();
    this.geometries.push(next);
  }
  setCityCompact(compact) {
    if (compact === this.compactCity) return;
    this.compactCity = compact;
    for (const tier of this.cityDetail) tier.mesh.geometry = compact ? tier.compact : tier.full;
    this.cityLastProjection.makeScale(0, 0, 0);
  }
  async upgradeRomeKit() {
    try {
      const kit = await loadColosseumRomeKit();
      if (this.disposed) {
        this.disposeKit({ ...kit });
        return;
      }
      this.adoptGeometry(
        this.farBlocks,
        flattenRomeRoles(kit.palace, ["brick", "void", "stone"]),
        compactHousingBody(flattenRomeRoles(kit.palace, ["brick", "stone"]))
      );
      this.adoptGeometry(this.palaceRoofs, flattenRomeRole(kit.palace, "tile"));
      this.adoptGeometry(this.pines, flattenRomeRole(kit.pine, "foliage"));
      this.adoptGeometry(this.pineTrunks, flattenRomeRole(kit.pine, "timber"));
      this.adoptGeometry(this.cypress, flattenRomeRoles(kit.cypress, ["foliage", "timber"]));
      this.disposeKit({ ...kit });
    } catch {
    }
  }
  async upgradeHousingKit() {
    try {
      const kit = await loadColosseumHousingKit();
      if (this.disposed) {
        this.disposeKit({ ...kit });
        return;
      }
      for (const batch of this.housingBatches) {
        this.adoptGeometry(
          batch.body,
          flattenRomeRoles(kit[batch.id], ["plaster", "brick", "void", "stone"]),
          compactHousingBody(flattenRomeRoles(kit[batch.id], ["plaster", "brick", "stone"]))
        );
        this.adoptGeometry(batch.roof, flattenRomeRole(kit[batch.id], "tile"));
      }
      this.disposeKit({ ...kit });
    } catch {
    }
  }
  disposeKit(kit) {
    const geometries = /* @__PURE__ */ new Set(), materials = /* @__PURE__ */ new Set();
    for (const root of Object.values(kit)) root.traverse((object) => {
      if (!(object instanceof Mesh5)) return;
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
  }
  cullCity(camera) {
    camera.updateMatrixWorld();
    this.cityProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    if (this.cityProjection.equals(this.cityLastProjection)) return;
    this.cityLastProjection.copy(this.cityProjection);
    this.cityFrustum.setFromProjectionMatrix(this.cityProjection);
    for (const { mesh, matrices, colors } of this.cityBatches) {
      mesh.geometry.computeBoundingSphere();
      let count = 0;
      for (let i = 0; i < matrices.length; i++) {
        this.citySphere.copy(mesh.geometry.boundingSphere).applyMatrix4(matrices[i]);
        this.citySphere.radius += 2;
        if (!this.cityFrustum.intersectsSphere(this.citySphere)) continue;
        mesh.setMatrixAt(count, matrices[i]);
        if (colors[i]) mesh.setColorAt(count, colors[i]);
        count++;
      }
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }
  update(t, _light, _sky, camera) {
    if (camera) {
      this.setCityCompact(camera instanceof PerspectiveCamera2 && camera.aspect < 0.72);
      this.cullCity(camera);
    }
    this.aqueduct.update(camera);
    this.tubs.castShadow = !(camera instanceof PerspectiveCamera2 && camera.aspect < 0.72);
    const siteOpen = t >= 0.11;
    this.tivoliRoad.visible = siteOpen;
    this.haulRing.visible = false;
    this.stocks.visible = siteOpen;
    this.tubs.visible = siteOpen;
    this.arenaSand.visible = t >= 0.76;
  }
  dispose() {
    this.disposed = true;
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    this.tufts.dispose();
    this.pines.dispose();
    this.pineTrunks.dispose();
    this.cypress.dispose();
    for (const batch of this.housingBatches) {
      batch.body.dispose();
      batch.roof.dispose();
    }
    this.housingFoundations.dispose();
    this.farBlocks.dispose();
    this.palaceRoofs.dispose();
    this.stocks.dispose();
    this.tubs.dispose();
    this.aqueduct.dispose();
    this.urbanContext.dispose();
  }
};

// src/render/three/ColosseumSkyDome.ts
import {
  BackSide,
  Color as Color9,
  Mesh as Mesh7,
  ShaderMaterial,
  SphereGeometry as SphereGeometry2,
  Vector3 as Vector35
} from "three";

// src/data/colosseumSky.ts
var COLOSSEUM_FOG_NEUTRALIZER = "#bcc5d0";
var COLOSSEUM_SKY = {
  id: "colosseum-valley-sky",
  description: "A Mediterranean valley skyscape over Flavian Rome: Tyrrhenian blue overhead, a pale pearl horizon between Palatine and Caelian, and thin fair-weather cloud.",
  evidenceNote: "The movie plays one authored clear day at about 41.9\xB0N. Weather is not a reconstruction of a dedication-day calendar. Warmth comes from the western sun against cooler valley air.",
  domeRadius: 2200,
  sun: {
    dawnAzimuthDegrees: 14,
    sweepDegrees: -208,
    revealElevationDegrees: 4.8,
    discAngularRadiusDegrees: 1.15,
    noonElevationDegrees: 58,
    description: "An authored clear day: east-northeast dawn, southern noon and west-northwest sunset. The enlarged cinematic disc and low reveal are not a dated solar alignment."
  },
  keyframes: [
    {
      t: 0,
      label: "dawn",
      description: "Cool blue zenith over a thin apricot valley band; hills stay readable.",
      zenith: "#4d8ec8",
      horizon: "#c7c1bd",
      sunTint: "#ffc48a",
      cloudTint: "#f3eadc",
      cloudShadow: "#8aa0b4",
      cloudOpacity: 0.2,
      haze: 0.1,
      fogStretch: 1.42
    },
    {
      t: 0.22,
      label: "morning",
      description: "Dry high blue with thin fair-weather cloud; dust only on the lowest band.",
      zenith: "#3a7eb8",
      horizon: "#bfccd0",
      sunTint: "#ffe0b0",
      cloudTint: "#f6f1e8",
      cloudShadow: "#7e96aa",
      cloudOpacity: 0.24,
      haze: 0.12,
      fogStretch: 1.3
    },
    {
      t: 0.5,
      label: "midday",
      description: "Hard Tyrrhenian blue zenith; horizon paler and warmer than the dome.",
      zenith: "#2f74b0",
      horizon: "#b3c6d0",
      sunTint: "#fff3d6",
      cloudTint: "#f7f3ec",
      cloudShadow: "#8098a8",
      cloudOpacity: 0.22,
      haze: 0.13,
      fogStretch: 1.2
    },
    {
      t: 0.72,
      label: "afternoon",
      description: "Blue remains dominant while brick and travertine bounce warm.",
      zenith: "#3a6c9c",
      horizon: "#b8bbc8",
      sunTint: "#ffd09a",
      cloudTint: "#f0e2d0",
      cloudShadow: "#748a9c",
      cloudOpacity: 0.24,
      haze: 0.15,
      fogStretch: 1.26
    },
    {
      t: 0.9,
      label: "reveal",
      description: "Low warm key on the finished ellipse under a still-blue upper dome.",
      zenith: "#496896",
      horizon: "#bcb2b9",
      sunTint: "#ffca89",
      cloudTint: "#ecd4c0",
      cloudShadow: "#5e7388",
      cloudOpacity: 0.36,
      haze: 0.1,
      fogStretch: 1.36
    }
  ]
};
function mixNumber(a, b, t) {
  return a + (b - a) * t;
}
function sampleFromFrame(frame, t) {
  return {
    t,
    zenith: frame.zenith,
    horizon: frame.horizon,
    sunTint: frame.sunTint,
    cloudTint: frame.cloudTint,
    cloudShadow: frame.cloudShadow,
    cloudOpacity: frame.cloudOpacity,
    haze: frame.haze,
    fogStretch: frame.fogStretch
  };
}
function sampleColosseumSky(rawT) {
  const t = Math.min(clamp(rawT), 0.9);
  const frames = COLOSSEUM_SKY.keyframes;
  const upperIndex = frames.findIndex((frame) => frame.t >= t);
  if (upperIndex <= 0) return sampleFromFrame(frames[0], t);
  if (upperIndex < 0) return sampleFromFrame(frames.at(-1), t);
  const before = frames[upperIndex - 1];
  const after = frames[upperIndex];
  const p = smoothstep((t - before.t) / Math.max(1e-3, after.t - before.t));
  return {
    t,
    zenith: lerpColor(before.zenith, after.zenith, p),
    horizon: lerpColor(before.horizon, after.horizon, p),
    sunTint: lerpColor(before.sunTint, after.sunTint, p),
    cloudTint: lerpColor(before.cloudTint, after.cloudTint, p),
    cloudShadow: lerpColor(before.cloudShadow, after.cloudShadow, p),
    cloudOpacity: mixNumber(before.cloudOpacity, after.cloudOpacity, p),
    haze: mixNumber(before.haze, after.haze, p),
    fogStretch: mixNumber(before.fogStretch, after.fogStretch, p)
  };
}

// src/render/three/RenderPipeline.ts
import {
  ACESFilmicToneMapping,
  Color as Color8,
  DirectionalLight,
  Fog,
  HalfFloatType,
  HemisphereLight,
  Mesh as Mesh6,
  PCFSoftShadowMap,
  PMREMGenerator,
  PerspectiveCamera as PerspectiveCamera3,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3 as Vector34,
  WebGLRenderer,
  WebGLRenderTarget
} from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

// src/engine/eiffelCamera.ts
var DEG = Math.PI / 180;
var ORBIT_START = -75 * DEG;
var ORBIT_SWEEP = 125 * DEG;
var SHOTS = [
  { t: 0, azimuth: ORBIT_START, pitchDeg: 24, radius: 260, target: [0, 24, 0] },
  { t: 0.15466666666666667, azimuth: ORBIT_START + ORBIT_SWEEP * 0.15466666666666667, pitchDeg: 22, radius: 270, target: [0, 30, 0] },
  { t: 0.3152, azimuth: ORBIT_START + ORBIT_SWEEP * 0.3152, pitchDeg: 20, radius: 300, target: [0, 42, 0] },
  { t: 0.4298666666666666, azimuth: ORBIT_START + ORBIT_SWEEP * 0.4298666666666666, pitchDeg: 17, radius: 350, target: [0, 68, 0] },
  { t: 0.6477333333333334, azimuth: ORBIT_START + ORBIT_SWEEP * 0.6477333333333334, pitchDeg: 13, radius: 570, target: [0, 146, 0] },
  { t: 0.9, azimuth: ORBIT_START + ORBIT_SWEEP * 0.9, pitchDeg: 11.5, radius: 608, target: [0, 158, 0] },
  { t: 1, azimuth: ORBIT_START + ORBIT_SWEEP, pitchDeg: 12, radius: 624, target: [0, 158, 0] }
];

// src/render/three/eiffelReflection.ts
import { Color as Color7, DataTexture, EquirectangularReflectionMapping, FloatType, LinearSRGBColorSpace, RGBAFormat } from "three";

// src/render/three/RenderPipeline.ts
var GODRAYS_SHADER = {
  uniforms: {
    tDiffuse: { value: null },
    uSunUV: { value: new Vector2(0.5, 0.5) },
    uIntensity: { value: 0 },
    uStreak: { value: 0 },
    uThreshold: { value: 0.85 }
  },
  vertexShader: (
    /* glsl */
    `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`
  ),
  fragmentShader: (
    /* glsl */
    `
uniform sampler2D tDiffuse;
uniform vec2 uSunUV;
uniform float uIntensity;
uniform float uStreak;
uniform float uThreshold;
varying vec2 vUv;

const int TAPS = 40;
const int STREAK_TAPS = 13;
const float STREAK_STEP = 0.011;

void main() {
  vec4 base = texture2D(tDiffuse, vUv);
  if (uIntensity <= 0.001 && uStreak <= 0.001) {
    gl_FragColor = base;
    return;
  }
  vec2 toSun = uSunUV - vUv;
  vec3 addition = vec3(0.0);
  if (uIntensity > 0.001) {
    vec2 step = toSun / float(TAPS);
    vec2 uv = vUv;
    vec3 shaft = vec3(0.0);
    float weight = 1.0;
    for (int i = 0; i < TAPS; i++) {
      uv += step;
      vec3 sampleColor = texture2D(tDiffuse, uv).rgb;
      float luma = dot(sampleColor, vec3(0.2126, 0.7152, 0.0722));
      shaft += sampleColor * max(0.0, luma - uThreshold) * weight;
      weight *= 0.955;
    }
    // Normalize by tap count; soften near the screen edge opposite the sun so
    // the march never reveals its finite length as banding.
    float edgeFade = smoothstep(1.35, 0.55, length(toSun));
    addition += shaft * (uIntensity * edgeFade / float(TAPS));
  }
  if (uStreak > 0.001) {
    // Anamorphic-style horizontal streak: a thin vertical band around the
    // sun's row, marching the thresholded frame sideways. Sampling the frame
    // (not synthesizing a glow) keeps silhouettes occluding the streak.
    float rowDy = vUv.y - uSunUV.y;
    float band = exp(-rowDy * rowDy * 800.0);
    if (band > 0.004) {
      vec3 streak = vec3(0.0);
      float wsum = 0.0;
      for (int i = -STREAK_TAPS; i <= STREAK_TAPS; i++) {
        float offset = float(i) * STREAK_STEP;
        vec3 sampleColor = texture2D(tDiffuse, vec2(vUv.x + offset, vUv.y)).rgb;
        float luma = dot(sampleColor, vec3(0.2126, 0.7152, 0.0722));
        float w = 1.0 - abs(float(i)) / float(STREAK_TAPS + 1);
        streak += sampleColor * max(0.0, luma - uThreshold) * w;
        wsum += w;
      }
      addition += (streak / wsum) * (uStreak * band);
    }
  }
  gl_FragColor = vec4(base.rgb + addition, base.a);
}
`
  )
};
var GRADE_SHADER = {
  uniforms: {
    tDiffuse: { value: null },
    uGrainTime: { value: 0 },
    uVignette: { value: 0.34 },
    uGrain: { value: 0.028 },
    uSaturation: { value: 1.05 },
    // Time-of-day temperature: the sun's own tint, luminance-normalized so it
    // shifts hue without changing exposure; strength follows the low sun.
    uTint: { value: new Color8("#ffffff") },
    uTintStrength: { value: 0 }
  },
  vertexShader: (
    /* glsl */
    `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`
  ),
  fragmentShader: (
    /* glsl */
    `
uniform sampler2D tDiffuse;
uniform float uGrainTime;
uniform float uVignette;
uniform float uGrain;
uniform float uSaturation;
uniform vec3 uTint;
uniform float uTintStrength;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7)) + uGrainTime * 43.7) * 43758.5453);
}

void main() {
  vec3 color = texture2D(tDiffuse, vUv).rgb;
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = mix(vec3(luma), color, uSaturation);
  color *= mix(vec3(1.0), uTint, uTintStrength);
  vec2 centered = vUv - 0.5;
  color *= 1.0 - uVignette * dot(centered, centered) * 2.0;
  color += (hash(vUv * 913.0) - 0.5) * uGrain * (0.35 + 0.65 * (1.0 - luma));
  gl_FragColor = vec4(color, 1.0);
}
`
  )
};
var FOG_NEUTRALIZER = new Color8("#c7b499");
function deriveSceneFogColor(fog, target, neutralizer = FOG_NEUTRALIZER) {
  return target.set(fog).lerp(neutralizer, 0.28);
}

// src/render/three/ColosseumSkyDome.ts
var VERTEX_SHADER = (
  /* glsl */
  `
varying vec3 vWorldPosition;
varying vec3 vViewRay;

void main() {
  vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  vViewRay = viewPosition.xyz;
  gl_Position = (projectionMatrix * viewPosition).xyww;
}
`
);
var FRAGMENT_SHADER = (
  /* glsl */
  `
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uFogColor;
uniform vec3 uSunDirection;
uniform vec3 uSunTint;
uniform vec3 uCloudTint;
uniform vec3 uCloudShadow;
uniform float uCloudOpacity;
uniform float uHaze;
uniform float uTime;
uniform float uSunDiscCos;

varying vec3 vWorldPosition;
varying vec3 vViewRay;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

float fbm(vec2 p) {
  return noise(p) * 0.58
    + noise(p * 2.07 + vec2(4.1, -2.8)) * 0.29
    + noise(p * 4.13 + vec2(-1.7, 6.2)) * 0.13;
}

void main() {
  vec3 dir = normalize(vWorldPosition - cameraPosition);
  float elevation = dir.y;
  float skyT = smoothstep(-0.02, 0.115, elevation);
  vec3 color = mix(uHorizon, uZenith, skyT);

  vec2 weatherUv = dir.xz * (1.55 / max(0.12, dir.y + 0.38)) + vec2(uTime * 0.12, -uTime * 0.04);
  float broad = fbm(weatherUv + dir.y * vec2(1.1, -0.6));
  float detail = fbm(weatherUv * 3.4 + vec2(5.1, -3.2));
  float cloudField = broad * 0.72 + detail * 0.28;
  float altitudeMask = smoothstep(0.008, 0.07, elevation)
    * (1.0 - smoothstep(0.55, 0.82, elevation));
  float cloudBody = smoothstep(0.46, 0.63, cloudField) * altitudeMask;
  float cloudCore = smoothstep(0.62, 0.76, cloudField) * altitudeMask;
  color = mix(color, uCloudShadow, cloudBody * uCloudOpacity * 0.38);
  color = mix(color, uCloudTint, (cloudBody * 0.58 + cloudCore * 0.42) * uCloudOpacity * 0.85);

  float warmBand = exp(-max(0.0, elevation) * 18.0) * uHaze;
  color = mix(color, uHorizon, warmBand * 0.28);
  color *= 0.985 + (detail - 0.5) * 0.02;

  float cosSun = dot(dir, uSunDirection);
  float halo = pow(max(0.0, cosSun), 540.0);
  float wideHalo = pow(max(0.0, cosSun), 6.0);
  float disc = smoothstep(uSunDiscCos - 0.00016, uSunDiscCos + 0.00016, cosSun);
  float sunlight = halo * 0.48 + wideHalo * 0.10 + disc * 2.9;
  color += uSunTint * sunlight;

  // Blend in linear colour space. Thin valley air must not erase the low sun.
  float fogBlend = (1.0 - smoothstep(-0.008, 0.048, elevation))
    * (1.0 - smoothstep(0.12, 0.7, sunlight));
  color = mix(color, uFogColor, fogBlend);
  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`
);
var VALLEY_FOG_NEUTRALIZER = new Color9(COLOSSEUM_FOG_NEUTRALIZER);
var ColosseumSkyDome = class {
  mesh;
  geometry = new SphereGeometry2(COLOSSEUM_SKY.domeRadius, 24, 12);
  material;
  fogScratch = new Color9();
  constructor() {
    this.material = new ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      side: BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uZenith: { value: new Color9("#3a7eb8") },
        uHorizon: { value: new Color9("#d4b898") },
        uFogColor: { value: new Color9("#c4a882") },
        uSunDirection: { value: new Vector35(0, 1, 0) },
        uSunTint: { value: new Color9("#fff3d6") },
        uCloudTint: { value: new Color9("#f6f1e8") },
        uCloudShadow: { value: new Color9("#7e96aa") },
        uCloudOpacity: { value: 0.22 },
        uHaze: { value: 0.12 },
        uTime: { value: 0 },
        uSunDiscCos: { value: Math.cos(COLOSSEUM_SKY.sun.discAngularRadiusDegrees * Math.PI / 180) }
      }
    });
    this.mesh = new Mesh7(this.geometry, this.material);
    this.mesh.name = "colosseum-world-space-weather-sky";
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -100;
  }
  update(t, sky, sunDirection) {
    const uniforms = this.material.uniforms;
    uniforms.uHorizon.value.set(sky.horizon);
    uniforms.uZenith.value.set(sky.zenith);
    deriveSceneFogColor(sky.horizon, this.fogScratch, VALLEY_FOG_NEUTRALIZER);
    uniforms.uFogColor.value.copy(this.fogScratch);
    uniforms.uSunDirection.value.copy(sunDirection);
    uniforms.uSunTint.value.set(sky.sunTint);
    uniforms.uCloudTint.value.set(sky.cloudTint);
    uniforms.uCloudShadow.value.set(sky.cloudShadow);
    uniforms.uCloudOpacity.value = sky.cloudOpacity;
    uniforms.uHaze.value = sky.haze;
    uniforms.uTime.value = t;
  }
  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
};

// src/render/three/ColosseumStoneSystem.ts
import {
  BoxGeometry as BoxGeometry3,
  Color as Color10,
  Euler,
  ExtrudeGeometry,
  Group as Group5,
  InstancedMesh as InstancedMesh3,
  Matrix4 as Matrix44,
  MeshStandardMaterial as MeshStandardMaterial6,
  Path,
  Quaternion as Quaternion3,
  Shape,
  Vector3 as Vector36
} from "three";

// src/engine/colosseumConstruction.ts
var PHASES = [
  { phase: "quarry", until: 0.14 },
  { phase: "hauled", until: 0.48 },
  { phase: "staged", until: 0.58 },
  { phase: "hoisted", until: 0.9 },
  { phase: "seated", until: 1 }
];
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function colosseumVerticalHalfExtent(dimensions) {
  return dimensions[1] / 2;
}
function localT(part2, t) {
  return clamp((t - part2.start) / part2.duration);
}
function phaseAt(u) {
  let from = 0;
  for (const step of PHASES) {
    if (u <= step.until) {
      const span = step.until - from;
      return { phase: step.phase, local: span <= 0 ? 1 : (u - from) / span, from, until: step.until };
    }
    from = step.until;
  }
  return { phase: "seated", local: 1, from: 0.9, until: 1 };
}
function sourcePose(part2) {
  const scatter = part2.bay % 9 * 1.35 - 6;
  const row = part2.storey + 1;
  const x = COLOSSEUM_QUARRY[0] + (part2.lane - 1) * 3.2;
  const z2 = COLOSSEUM_QUARRY[2] + scatter + row * 0.4;
  return [x, colosseumTerrainHeightAt(x, z2) + colosseumVerticalHalfExtent(part2.dimensions), z2];
}
function stagingPose(part2) {
  const theta = bayTheta(part2.bay);
  const [x, z2] = ellipsePoint(COLOSSEUM_A + 10, COLOSSEUM_B + 8.5, theta);
  const half = colosseumVerticalHalfExtent(part2.dimensions);
  return [x, colosseumTerrainHeightAt(x, z2) + half, z2];
}
function shortestAngleDelta(from, to) {
  let delta = to - from;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}
function outerRingPoint(theta, pad = 22) {
  return ellipsePoint(COLOSSEUM_A + pad, COLOSSEUM_B + pad, theta);
}
var haulPaths = /* @__PURE__ */ new WeakMap();
function haulPath(part2, route, progress) {
  let path = haulPaths.get(part2);
  if (!path) {
    const source = sourcePose(part2), staged = stagingPose(part2);
    const points2 = [[source[0], source[2]], [route.road[0], route.road[2] + (part2.lane - 1) * 2.1]];
    const times2 = [0, 0.25];
    const start = 0.04, delta = shortestAngleDelta(start, bayTheta(part2.bay));
    for (let i2 = 0; i2 <= 12; i2++) {
      const [x, z2] = outerRingPoint(start + delta * i2 / 12);
      points2.push([x, z2 + (part2.lane - 1) * 1.4]);
      times2.push(0.34 + 0.48 * i2 / 12);
    }
    points2.push([staged[0], staged[2]]);
    times2.push(1);
    path = { points: points2, times: times2 };
    haulPaths.set(part2, path);
  }
  const { points, times } = path;
  let i = 0;
  while (i < times.length - 2 && progress > times[i + 1]) i++;
  const span = times[i + 1] - times[i], u = clamp((progress - times[i]) / span);
  const tangent = (at, axis) => {
    const before = Math.max(0, at - 1), after = Math.min(points.length - 1, at + 1);
    return (points[after][axis] - points[before][axis]) / (times[after] - times[before]);
  };
  const values = [0, 1].map((axis) => {
    const a = points[i][axis], b = points[i + 1][axis];
    const m0 = tangent(i, axis) * span, m1 = tangent(i + 1, axis) * span;
    return {
      value: (2 * u ** 3 - 3 * u * u + 1) * a + (u ** 3 - 2 * u * u + u) * m0 + (-2 * u ** 3 + 3 * u * u) * b + (u ** 3 - u * u) * m1,
      slope: (6 * u * u - 6 * u) * a + (3 * u * u - 4 * u + 1) * m0 + (-6 * u * u + 6 * u) * b + (3 * u * u - 2 * u) * m1
    };
  });
  return { x: values[0].value, z: values[1].value, yaw: Math.atan2(values[0].slope, values[1].slope) };
}
function haulPose(part2, route, local) {
  const { x, z: z2, yaw } = haulPath(part2, route, easeInOutQuad(local));
  const ontoWagon = easeInOutQuad(clamp(local / 0.12));
  const offWagon = 1 - easeInOutQuad(clamp((local - 0.86) / 0.14));
  const lift = COLOSSEUM_WAGON_BED * Math.min(ontoWagon, offWagon);
  const departureYaw = shortestAngleDelta(0, yaw) * ontoWagon;
  const alignedYaw = departureYaw + shortestAngleDelta(departureYaw, part2.finalRotation[1]) * (1 - offWagon);
  return { position: [x, colosseumTerrainHeightAt(x, z2) + colosseumVerticalHalfExtent(part2.dimensions) + lift, z2], yaw: alignedYaw };
}
function hoistClearance(part2) {
  if (part2.group === "foundation" || part2.storey < 0) return 1.15;
  return 1.65;
}
function hoistPose(part2, local) {
  const staged = stagingPose(part2);
  const seat = part2.finalPosition;
  const liftY = seat[1] + hoistClearance(part2);
  if (local < 0.42) {
    const up = easeInOutQuad(local / 0.42);
    return [staged[0], lerp(staged[1], liftY, up), staged[2]];
  }
  if (local < 0.76) {
    const over = easeInOutQuad((local - 0.42) / 0.34);
    return [lerp(staged[0], seat[0], over), liftY, lerp(staged[2], seat[2], over)];
  }
  const down = easeInOutQuad((local - 0.76) / 0.24);
  return [seat[0], lerp(liftY, seat[1], down), seat[2]];
}
function colosseumWorkingDeckY(part2, x, z2) {
  if (part2.storey <= 0) return colosseumTerrainHeightAt(x, z2);
  return COLOSSEUM_FOUNDATION_HEIGHT + part2.storey * COLOSSEUM_STOREY_HEIGHT;
}
function colosseumCraneRigAt(part2, state) {
  if (state.mechanism !== "crane") return null;
  const staged = stagingPose(part2);
  const half = colosseumVerticalHalfExtent(part2.dimensions);
  const hook = [state.position[0], state.position[1] + half, state.position[2]];
  const stationYaw = part2.finalRotation[1];
  const baseX = staged[0] + Math.cos(stationYaw) * 6;
  const baseZ = staged[2] - Math.sin(stationYaw) * 6;
  const deckY = Math.max(colosseumTerrainHeightAt(baseX, baseZ) + 0.42, colosseumWorkingDeckY(part2, baseX, baseZ));
  const mastY = Math.max(part2.finalPosition[1] + half + hoistClearance(part2) + 1.2, staged[1] + half + 1.2, deckY + 7.5);
  const base = [baseX, deckY, baseZ];
  const mastTop = [baseX, mastY, baseZ];
  const reach = Math.max(Math.hypot(staged[0] - baseX, staged[2] - baseZ), Math.hypot(part2.finalPosition[0] - baseX, part2.finalPosition[2] - baseZ));
  const jibLength = reach + 1.5;
  const radius = Math.hypot(hook[0] - baseX, hook[2] - baseZ);
  const boomTip = [hook[0], mastY + Math.sqrt(Math.max(0, jibLength ** 2 - radius ** 2)), hook[2]];
  const yaw = Math.atan2(hook[0] - baseX, hook[2] - baseZ);
  const treadwheel = [baseX - Math.sin(stationYaw) * 1.6 + Math.cos(stationYaw) * 1.2, deckY + 2.1, baseZ - Math.cos(stationYaw) * 1.6 - Math.sin(stationYaw) * 1.2];
  return { base, mastTop, boomTip, hook, yaw, treadwheel };
}
var SCAFFOLD_WINDOWS = [
  { storey: 0, raiseFrom: 0.06, raiseUntil: 0.12, strikeFrom: 0.4, strikeUntil: 0.48 },
  { storey: 1, raiseFrom: 0.28, raiseUntil: 0.34, strikeFrom: 0.58, strikeUntil: 0.66 },
  { storey: 2, raiseFrom: 0.49, raiseUntil: 0.55, strikeFrom: 0.76, strikeUntil: 0.84 },
  { storey: 3, raiseFrom: 0.7, raiseUntil: 0.76, strikeFrom: 0.9, strikeUntil: 0.98 }
];
var COLOSSEUM_SCAFFOLD_STATIONS = 20;
var COLOSSEUM_SCAFFOLD_SEGMENT = 2.875;
function envelopeHeight(t, raiseFrom, raiseUntil, strikeFrom, strikeUntil) {
  if (t < raiseFrom || t >= strikeUntil) return 0;
  if (t < raiseUntil) return easeInOutQuad((t - raiseFrom) / (raiseUntil - raiseFrom));
  if (t < strikeFrom) return 1;
  return 1 - easeInOutQuad((t - strikeFrom) / (strikeUntil - strikeFrom));
}
function colosseumScaffoldStackHeightAt(t) {
  let height = 0;
  for (const window2 of SCAFFOLD_WINDOWS) {
    const factor = envelopeHeight(t, window2.raiseFrom, window2.raiseUntil, window2.strikeFrom, window2.strikeUntil);
    if (factor <= 0) continue;
    const rise = window2.storey === 3 ? 8.4 : COLOSSEUM_STOREY_HEIGHT;
    const base = window2.storey <= 0 ? 0 : COLOSSEUM_FOUNDATION_HEIGHT + window2.storey * COLOSSEUM_STOREY_HEIGHT;
    height = Math.max(height, t >= window2.strikeFrom ? (base + rise) * factor : base + rise * factor);
  }
  return height;
}
function colosseumScaffoldWindowAt(t) {
  let raising = null;
  let striking = null;
  let hold = null;
  for (const window2 of SCAFFOLD_WINDOWS) {
    const rise = window2.storey === 3 ? 8.4 : COLOSSEUM_STOREY_HEIGHT;
    const base = window2.storey <= 0 ? 0 : COLOSSEUM_FOUNDATION_HEIGHT + window2.storey * COLOSSEUM_STOREY_HEIGHT;
    const shaped = {
      raiseFrom: window2.raiseFrom,
      raiseUntil: window2.raiseUntil,
      strikeFrom: window2.strikeFrom,
      strikeUntil: window2.strikeUntil,
      base,
      rise
    };
    if (t >= window2.raiseFrom && t < window2.raiseUntil) raising = { kind: "raising", ...shaped };
    else if (t >= window2.strikeFrom && t < window2.strikeUntil) striking = { kind: "striking", ...shaped };
    else if (t >= window2.raiseUntil && t < window2.strikeFrom) hold = { kind: "hold", ...shaped };
  }
  return raising ?? striking ?? hold;
}
function colosseumScaffoldsAt(t) {
  const bays = [];
  for (let station = 0; station < COLOSSEUM_SCAFFOLD_STATIONS; station += 1) {
    const raw = t >= 0.9 ? colosseumScaffoldStackHeightAt(0.899999) * (1 - clamp((t - 0.9 - station * 8e-4) / 0.084)) : colosseumScaffoldStackHeightAt(t);
    const segmentCount = Math.floor(raw / COLOSSEUM_SCAFFOLD_SEGMENT);
    if (segmentCount < 1) continue;
    const height = segmentCount * COLOSSEUM_SCAFFOLD_SEGMENT;
    const theta = station / COLOSSEUM_SCAFFOLD_STATIONS * Math.PI * 2 - Math.PI / 2;
    const [x, z2] = ellipsePoint(COLOSSEUM_A + 7.4, COLOSSEUM_B + 6.6, theta);
    const footY = colosseumTerrainHeightAt(x, z2);
    bays.push({
      station,
      segmentCount,
      segmentLength: COLOSSEUM_SCAFFOLD_SEGMENT,
      height,
      footY,
      deckY: footY + height,
      position: [x, footY + height, z2],
      yaw: ellipseYaw(COLOSSEUM_A, COLOSSEUM_B, theta)
    });
  }
  return bays;
}
function colosseumCenteringAt(t) {
  const bays = [];
  for (const part2 of COLOSSEUM_CONSTRUCTION.parts) {
    if (part2.group !== "vault") continue;
    const raiseFrom = part2.start - 0.018;
    const raiseUntil = part2.start;
    const strikeFrom = part2.start + part2.duration;
    const strikeUntil = strikeFrom + 0.035;
    const heightFactor = envelopeHeight(t, raiseFrom, raiseUntil, strikeFrom, strikeUntil);
    if (heightFactor < 0.04) continue;
    bays.push({
      id: part2.id,
      position: part2.finalPosition,
      yaw: part2.finalRotation[1],
      heightFactor,
      span: part2.dimensions[2]
    });
  }
  return bays;
}
function colosseumPartStateAt(part2, route, t) {
  if (t < part2.start) {
    const source = sourcePose(part2);
    return {
      phase: "quarry",
      visible: false,
      position: source,
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      support: "quarry-yard",
      mechanism: "none",
      wagonLift: 0,
      phaseLocal: 0,
      contactDust: false,
      contactDustAmount: 0
    };
  }
  if (t >= part2.start + part2.duration) {
    return {
      phase: "seated",
      visible: true,
      position: part2.finalPosition,
      rotation: part2.finalRotation,
      scale: [1, 1, 1],
      support: "masonry",
      mechanism: "none",
      wagonLift: 0,
      phaseLocal: 1,
      contactDust: false,
      contactDustAmount: 0
    };
  }
  const u = localT(part2, t);
  const { phase, local } = phaseAt(u);
  const staged = stagingPose(part2);
  if (phase === "quarry") {
    const source = sourcePose(part2);
    return {
      phase,
      visible: true,
      position: source,
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      support: "quarry-yard",
      mechanism: "none",
      wagonLift: 0,
      phaseLocal: local,
      contactDust: false,
      contactDustAmount: 0
    };
  }
  if (phase === "hauled") {
    const { position, yaw } = haulPose(part2, route, local);
    return {
      phase,
      visible: true,
      position,
      rotation: [0, yaw, 0],
      scale: [1, 1, 1],
      support: "wagon-bed",
      mechanism: "wagon",
      wagonLift: COLOSSEUM_WAGON_BED * Math.min(
        easeInOutQuad(clamp(local / 0.12)),
        1 - easeInOutQuad(clamp((local - 0.86) / 0.14))
      ),
      contactDust: true,
      contactDustAmount: 0.45,
      phaseLocal: local
    };
  }
  if (phase === "staged") {
    return {
      phase,
      visible: true,
      position: staged,
      rotation: part2.finalRotation,
      scale: [1, 1, 1],
      support: "working-floor",
      mechanism: "none",
      wagonLift: 0,
      phaseLocal: local,
      contactDust: local > 0.85,
      contactDustAmount: local > 0.85 ? 0.2 : 0
    };
  }
  if (phase === "hoisted") {
    return {
      phase,
      visible: true,
      position: hoistPose(part2, local),
      rotation: part2.finalRotation,
      scale: [1, 1, 1],
      support: "crane-hook",
      mechanism: "crane",
      wagonLift: 0,
      phaseLocal: local,
      contactDust: local > 0.92,
      contactDustAmount: local > 0.92 ? 0.35 : 0
    };
  }
  return {
    phase: "seated",
    visible: true,
    position: part2.finalPosition,
    rotation: part2.finalRotation,
    scale: [1, 1, 1],
    support: "masonry",
    mechanism: "none",
    wagonLift: 0,
    phaseLocal: 1,
    contactDust: false,
    contactDustAmount: 0
  };
}
function activeColosseumOperationsAt(plan, t) {
  const route = plan.routes[0];
  const active = [];
  for (const part2 of plan.parts) {
    if (t < part2.start || t >= part2.start + part2.duration) continue;
    const state = colosseumPartStateAt(part2, route, t);
    if (!state.visible) continue;
    if (state.phase === "seated") continue;
    active.push({ part: part2, state });
  }
  return active;
}

// src/render/three/ColosseumStoneSystem.ts
function setTransform(mesh, index, position, rotation, dimensions, matrix, quaternion) {
  quaternion.setFromEuler(new Euler(rotation[0], rotation[1], rotation[2], "YXZ"));
  matrix.compose(new Vector36(...position), quaternion, new Vector36(...dimensions));
  mesh.setMatrixAt(index, matrix);
}
function stoneColor(material, variation, target) {
  if (material === "tuff") target.set("#a8895c");
  else if (material === "pozzolana") target.set("#8a7a68");
  else if (material === "timber") target.set("#6a4a30");
  else target.set("#d8c4a0");
  target.offsetHSL(variation * 0.01, variation * 0.018, variation * 0.035);
  return target;
}
function createCaveaSeatGeometry(steps = 12) {
  const shape = new Shape();
  shape.moveTo(-0.5, -0.5);
  for (let i = 0; i < steps; i += 1) {
    const x0 = -0.5 + i / steps;
    const x1 = -0.5 + (i + 1) / steps;
    const y1 = -0.5 + (i + 1) / steps;
    shape.lineTo(x0, y1);
    shape.lineTo(x1, y1);
  }
  shape.lineTo(0.5, -0.5);
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, steps: 1, curveSegments: 1 });
  geometry.translate(0, 0, -0.5);
  geometry.rotateY(-Math.PI / 2);
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  geometry.translate(
    -(box.min.x + box.max.x) / 2,
    -(box.min.y + box.max.y) / 2,
    -(box.min.z + box.max.z) / 2
  );
  geometry.scale(
    1 / Math.max(1e-6, box.max.x - box.min.x),
    1 / Math.max(1e-6, box.max.y - box.min.y),
    1 / Math.max(1e-6, box.max.z - box.min.z)
  );
  geometry.computeVertexNormals();
  return geometry;
}
function createColosseumPartGeometry(kind, compact = false) {
  if (kind === "seat") return createCaveaSeatGeometry(compact ? 6 : 12);
  if (kind !== "arch") return new BoxGeometry3(1, 1, 1);
  const shape = new Shape();
  shape.moveTo(-0.5, -0.5);
  shape.lineTo(0.5, -0.5);
  shape.lineTo(0.5, 0.5);
  shape.lineTo(-0.5, 0.5);
  shape.closePath();
  const hole = new Path();
  hole.moveTo(-0.32, -0.5);
  hole.lineTo(-0.32, -0.04);
  hole.absellipse(0, -0.04, 0.32, 0.38, Math.PI, 0, true);
  hole.lineTo(0.32, -0.5);
  hole.closePath();
  shape.holes.push(hole);
  const geometry = new ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, steps: 1, curveSegments: compact ? 4 : 6 });
  geometry.translate(0, 0, -0.5);
  geometry.computeVertexNormals();
  return geometry;
}
var ColosseumStoneSystem = class {
  constructor(plan, _materials) {
    this.plan = plan;
    this.group.name = "colosseum-physical-stone-system";
    const travertine = new MeshStandardMaterial6({ color: "#ffffff", roughness: 0.9, metalness: 0 });
    injectMaterialRecipe(travertine, "travertine");
    this.localMaterials.push(travertine);
    const matrix = new Matrix44();
    const quaternion = new Quaternion3();
    const color = new Color10();
    const kinds = ["block", "arch", "wedge", "seat", "plank"];
    this.batches = kinds.flatMap((kind) => {
      const allParts = plan.parts.filter((part2) => part2.kind === kind);
      const geometry = createColosseumPartGeometry(kind);
      this.geometries.push(geometry);
      const groups = kind === "arch" ? [allParts.filter((part2) => part2.group !== "inner-arcade"), allParts.filter((part2) => part2.group === "inner-arcade")] : [allParts];
      return groups.map((parts, groupIndex) => {
        const mesh = new InstancedMesh3(geometry, travertine, Math.max(1, parts.length));
        mesh.name = `colosseum-parts-${kind}${groupIndex ? "-inner" : ""}`;
        this.registerDetail(mesh, kind);
        mesh.castShadow = kind !== "seat" && groupIndex === 0;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false;
        mesh.count = 0;
        parts.forEach((part2, index) => {
          setTransform(mesh, index, part2.finalPosition, part2.finalRotation, part2.dimensions, matrix, quaternion);
          mesh.setColorAt(index, stoneColor(part2.material, part2.colorVariation, color));
        });
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        this.group.add(mesh);
        return { parts, mesh };
      });
    });
    this.activeMeshes = {
      block: this.createActiveMesh("block", travertine),
      arch: this.createActiveMesh("arch", travertine),
      wedge: this.createActiveMesh("wedge", travertine),
      seat: this.createActiveMesh("seat", travertine),
      plank: this.createActiveMesh("plank", travertine)
    };
  }
  plan;
  group = new Group5();
  geometries = [];
  localMaterials = [];
  detailMeshes = [];
  compactGeometries = /* @__PURE__ */ new Map();
  compactDetail = false;
  batches;
  activeMeshes;
  createActiveMesh(kind, material) {
    const geometry = createColosseumPartGeometry(kind);
    this.geometries.push(geometry);
    const mesh = new InstancedMesh3(geometry, material, this.plan.maxActive);
    mesh.name = `colosseum-active-${kind}`;
    this.registerDetail(mesh, kind);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.count = 0;
    this.group.add(mesh);
    return mesh;
  }
  registerDetail(mesh, kind) {
    if (kind !== "arch" && kind !== "seat") return;
    let compact = this.compactGeometries.get(kind);
    if (!compact) {
      compact = createColosseumPartGeometry(kind, true);
      this.compactGeometries.set(kind, compact);
      this.geometries.push(compact);
    }
    this.detailMeshes.push({ mesh, full: mesh.geometry, compact });
  }
  setCompactDetail(compact) {
    if (compact === this.compactDetail) return;
    this.compactDetail = compact;
    for (const detail of this.detailMeshes) detail.mesh.geometry = compact ? detail.compact : detail.full;
  }
  update(t) {
    const matrix = new Matrix44();
    const quaternion = new Quaternion3();
    const color = new Color10();
    const route = this.plan.routes[0];
    for (const batch of this.batches) {
      let cursor = 0;
      for (const part2 of batch.parts) {
        const state = colosseumPartStateAt(part2, route, t);
        if (!state.visible || state.phase !== "seated") continue;
        setTransform(batch.mesh, cursor, state.position, state.rotation, part2.dimensions, matrix, quaternion);
        batch.mesh.setColorAt(cursor, stoneColor(part2.material, part2.colorVariation, color));
        cursor += 1;
      }
      batch.mesh.count = cursor;
      batch.mesh.instanceMatrix.needsUpdate = true;
      if (batch.mesh.instanceColor) batch.mesh.instanceColor.needsUpdate = true;
    }
    const operations = activeColosseumOperationsAt(this.plan, t);
    const cursors = { block: 0, arch: 0, wedge: 0, seat: 0, plank: 0 };
    for (const operation of operations) {
      const kind = operation.part.kind;
      const mesh = this.activeMeshes[kind];
      const index = cursors[kind];
      setTransform(
        mesh,
        index,
        operation.state.position,
        operation.state.rotation,
        operation.part.dimensions,
        matrix,
        quaternion
      );
      mesh.setColorAt(index, stoneColor(operation.part.material, operation.part.colorVariation, color));
      cursors[kind] += 1;
    }
    for (const kind of ["block", "arch", "wedge", "seat", "plank"]) {
      const mesh = this.activeMeshes[kind];
      mesh.count = cursors[kind];
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    return operations;
  }
  dispose() {
    for (const geometry of this.geometries) geometry.dispose();
    for (const batch of this.batches) batch.mesh.dispose();
    for (const mesh of Object.values(this.activeMeshes)) mesh.dispose();
    for (const material of this.localMaterials) material.dispose();
  }
};

// src/render/three/ColosseumWorkSystem.ts
import {
  BoxGeometry as BoxGeometry4,
  CylinderGeometry as CylinderGeometry3,
  Group as Group6,
  InstancedMesh as InstancedMesh4,
  Matrix4 as Matrix45,
  MeshBasicMaterial,
  Quaternion as Quaternion4,
  SphereGeometry as SphereGeometry3,
  Vector3 as Vector37
} from "three";

// src/engine/colosseumCrew.ts
var TAU = Math.PI * 2;
var STRIDE = 0.9;
var COLOSSEUM_TREADWHEEL_RADIUS = 2.55;
var MIX_FROM = [114, -6];
var MIX_TO = [125, 5];
var TIMBER_FROM = [102, -14];
var TIMBER_TO = [112, -4];
function salt(id) {
  const roll = mulberry32(id);
  return [roll(), roll(), roll(), roll(), roll(), roll()];
}
function pingpong(x) {
  const wrapped = x - Math.floor(x);
  if (wrapped < 0.5) return { u: wrapped * 2, forward: true };
  return { u: 2 - wrapped * 2, forward: false };
}
function treadwheelSpinFromHook(rig) {
  return (rig.hook[1] - rig.base[1]) / COLOSSEUM_TREADWHEEL_RADIUS;
}
function travelMeters(phase, local) {
  if (phase === "quarry") return local * 6;
  if (phase === "hauled") return 6 + local * 48;
  if (phase === "staged") return 54 + local * 4;
  if (phase === "hoisted") return 58 + local * 22;
  return 80;
}
function groundAt(x, z2) {
  return colosseumTerrainHeightAt(x, z2);
}
function pushCrew(crews, id, role, x, z2, yaw, lean, gait, arm, y = groundAt(x, z2)) {
  crews.push({
    id,
    role,
    position: [x, y, z2],
    yaw,
    lean,
    gait,
    arm
  });
}
function labourForOperation(operation, crews, rigs) {
  const { part: part2, state } = operation;
  const [px, , pz] = state.position;
  const yaw = state.rotation[1];
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  const lx = Math.cos(yaw);
  const lz = -Math.sin(yaw);
  const local = state.phaseLocal;
  const travel = travelMeters(state.phase, local);
  const rig = colosseumCraneRigAt(part2, state);
  if (state.phase === "quarry") {
    for (let i = 0; i < 2; i += 1) {
      const id = `${part2.id}-dresser-${i}`;
      const s = salt(id);
      const { u, forward } = pingpong(local * (1.1 + s[0] * 1.6) + s[1]);
      const x = px + (u - 0.5) * (4.2 + s[2] * 4) + lx * (s[3] * 3.2 - 1.6);
      const z2 = pz + (u - 0.5) * (1.6 + s[4] * 2.4) + lz * (i === 0 ? 1.4 : -2.1);
      pushCrew(
        crews,
        id,
        "dresser",
        x,
        z2,
        forward ? yaw + s[5] * 0.4 : yaw + Math.PI - s[5] * 0.4,
        0.08 + s[0] * 0.18,
        travel / STRIDE * (0.6 + s[1]) + s[2] * 8,
        local * (18 + s[3] * 22) + s[4] * 6
      );
    }
  }
  if (state.mechanism === "wagon") {
    const hauls = [
      { along: 7.2, side: 1.1, lean: 0.28, gait: 1.05, yaw: 0 },
      { along: 4.4, side: -2.6, lean: 0.2, gait: 0.62, yaw: 0.18 },
      { along: 2.1, side: 3.2, lean: 0.08, gait: 0.28, yaw: -0.35 },
      { along: 0.4, side: -1.2, lean: 0.32, gait: 0.12, yaw: 0.55 }
    ];
    for (let i = 0; i < hauls.length; i += 1) {
      const id = `${part2.id}-hauler-${i}`;
      const s = salt(id);
      const job = hauls[i];
      const along = job.along + (s[0] - 0.5) * 1.4;
      const side = job.side + (s[1] - 0.5) * 0.9;
      pushCrew(
        crews,
        id,
        "hauler",
        px + fx * along + lx * side,
        pz + fz * along + lz * side,
        yaw + job.yaw + (s[3] - 0.5) * 0.25,
        job.lean + s[4] * 0.08,
        travel / STRIDE * job.gait + s[5] * 13 + i * 3.7,
        travel / STRIDE * (0.2 + s[1] * 0.5) + s[2] * 9
      );
    }
    const driverId = `${part2.id}-driver`;
    const ds = salt(driverId);
    pushCrew(
      crews,
      driverId,
      "driver",
      px + lx * (2.6 + ds[0] * 1.4) + fx * (ds[1] - 0.4) * 1.8,
      pz + lz * (2.6 + ds[0] * 1.4) + fz * (ds[1] - 0.4) * 1.8,
      yaw + (ds[2] - 0.5) * 0.5,
      0.04 + ds[3] * 0.12,
      travel / STRIDE * (0.5 + ds[4] * 0.7) + ds[5] * 5,
      travel / STRIDE * 0.3 + ds[0] * 4
    );
    rigs.push({ partId: part2.id, wagonSpin: travel / 0.55, treadwheelSpin: 0 });
  }
  if (state.phase === "staged") {
    const jobs = [
      { along: 3.2, side: 2.4, walk: true },
      { along: -2.8, side: 3.1, walk: false },
      { along: 0.4, side: -3.4, walk: true }
    ];
    for (let i = 0; i < jobs.length; i += 1) {
      const id = `${part2.id}-slinger-${i}`;
      const s = salt(id);
      const job = jobs[i];
      const { u, forward } = job.walk ? pingpong(local * (0.8 + s[0] * 1.4) + s[1]) : { u: 0.35 + s[0] * 0.3, forward: true };
      const x = px + fx * (job.along + (u - 0.5) * (job.walk ? 2.8 : 0.4)) + lx * job.side * (0.7 + s[2] * 0.5);
      const z2 = pz + fz * (job.along + (u - 0.5) * (job.walk ? 2.8 : 0.4)) + lz * job.side * (0.7 + s[2] * 0.5);
      pushCrew(
        crews,
        id,
        "slinger",
        x,
        z2,
        job.walk ? (forward ? yaw : yaw + Math.PI) + (s[3] - 0.5) * 0.4 : yaw + Math.PI * (s[4] - 0.3),
        job.walk ? 0.12 + s[5] * 0.12 : 0.2 + s[0] * 0.1,
        (job.walk ? travel : local * 8) / STRIDE * (0.5 + s[1]) + s[2] * 9,
        local * (10 + s[3] * 24) + s[4] * 5
      );
    }
  }
  if (rig) {
    const spin = treadwheelSpinFromHook(rig);
    const wfx = Math.sin(rig.yaw);
    const wfz = Math.cos(rig.yaw);
    const wlx = Math.cos(rig.yaw);
    const wlz = -Math.sin(rig.yaw);
    for (let i = 0; i < 2; i += 1) {
      const id = `${part2.id}-wheel-${i}`;
      const s = salt(id);
      const walking = i === 0;
      const along = walking ? Math.sin(spin * (0.7 + s[0] * 0.6) + s[1] * 2) * (0.35 + s[2] * 0.5) : 0.12 + s[0] * 0.22;
      const side = walking ? 0.85 + s[3] * 0.5 : -(1.6 + s[3] * 0.9);
      pushCrew(
        crews,
        id,
        "wheel-walker",
        rig.treadwheel[0] + wfx * along + wlx * side,
        rig.treadwheel[2] + wfz * along + wlz * side,
        rig.yaw + (walking ? 0 : Math.PI * 0.35) + (s[4] - 0.5) * 0.4,
        walking ? 0.18 + s[5] * 0.12 : 0.08 + s[5] * 0.1,
        walking ? spin * COLOSSEUM_TREADWHEEL_RADIUS / STRIDE * (0.6 + s[0]) + s[1] * 8 : spin * 0.4 + s[1] * 11,
        walking ? spin * (2 + s[2] * 4) + s[3] * 5 : s[2] * 14 + spin * 0.25
      );
    }
    if (local > 0.38) {
      for (let i = 0; i < 2; i += 1) {
        const id = `${part2.id}-tag-${i}`;
        const s = salt(id);
        const side = (i === 0 ? 3.4 : -3.8) + (s[0] - 0.5) * 1.6;
        const along = (s[1] - 0.5) * 3.2;
        pushCrew(
          crews,
          id,
          "tag-line",
          px + lx * side + fx * along,
          pz + lz * side + fz * along,
          yaw + (s[2] - 0.5) * 0.8,
          0.12 + s[3] * 0.16,
          travel / STRIDE * (0.5 + s[4]) + s[5] * 6,
          travel / STRIDE * 0.4 + s[0] * 5
        );
      }
    }
    rigs.push({ partId: part2.id, wagonSpin: 0, treadwheelSpin: spin });
  }
}
function yardShuttles(t, crews) {
  if (t <= 0.06 || t >= 0.93) return;
  for (let i = 0; i < 6; i += 1) {
    const id = `mixer-${i}`;
    const s = salt(id);
    if (i > 0 && s[0] < 0.38) {
      const x2 = MIX_FROM[0] + s[1] * 10;
      const z3 = MIX_FROM[1] + s[2] * 8;
      pushCrew(
        crews,
        id,
        "mixer",
        x2,
        z3,
        s[3] * TAU,
        0.1 + s[4] * 0.16,
        t * (9 + s[5] * 18) + s[1] * 12,
        t * (14 + s[0] * 20) + s[2] * 8
      );
      continue;
    }
    const { u, forward } = pingpong(t * (0.7 + s[1] * 2.2) + s[2]);
    const x = MIX_FROM[0] + (MIX_TO[0] - MIX_FROM[0]) * u + (s[3] - 0.5) * 3.4;
    const z2 = MIX_FROM[1] + (MIX_TO[1] - MIX_FROM[1]) * u + (s[4] - 0.5) * 2.8;
    const yaw = Math.atan2(MIX_TO[0] - MIX_FROM[0], MIX_TO[1] - MIX_FROM[1]);
    pushCrew(
      crews,
      id,
      "mixer",
      x,
      z2,
      forward ? yaw + (s[5] - 0.5) * 0.5 : yaw + Math.PI + (s[0] - 0.5) * 0.5,
      0.1 + s[1] * 0.16,
      (t * (22 + s[2] * 28) + s[3] * 9) / STRIDE,
      t * (12 + s[4] * 16) + s[5] * 7
    );
  }
  for (let i = 0; i < 4; i += 1) {
    const id = `bearer-${i}`;
    const s = salt(id);
    const { u, forward } = pingpong(t * (0.6 + s[0] * 1.8) + s[1]);
    const x = TIMBER_FROM[0] + (TIMBER_TO[0] - TIMBER_FROM[0]) * u + (s[2] - 0.5) * 2.4;
    const z2 = TIMBER_FROM[1] + (TIMBER_TO[1] - TIMBER_FROM[1]) * u + (s[3] - 0.5) * 2.2;
    const yaw = Math.atan2(TIMBER_TO[0] - TIMBER_FROM[0], TIMBER_TO[1] - TIMBER_FROM[1]);
    pushCrew(
      crews,
      id,
      "bearer",
      x,
      z2,
      forward ? yaw : yaw + Math.PI,
      0.12 + s[4] * 0.14,
      (t * (18 + s[5] * 24) + s[0] * 8) / STRIDE,
      t * (10 + s[1] * 14) + s[2] * 6
    );
  }
}
function scaffoldCrews(t, crews) {
  const window2 = colosseumScaffoldWindowAt(t);
  if (!window2) return;
  const bays = colosseumScaffoldsAt(t);
  const raw = colosseumScaffoldStackHeightAt(t);
  const visible = Math.floor(raw / COLOSSEUM_SCAFFOLD_SEGMENT) * COLOSSEUM_SCAFFOLD_SEGMENT;
  for (let station = 0; station < COLOSSEUM_SCAFFOLD_STATIONS; station += 1) {
    const id = `climb-${station}`;
    const s = salt(id);
    const bay = bays[station];
    const theta = station / COLOSSEUM_SCAFFOLD_STATIONS * Math.PI * 2 - Math.PI / 2;
    const yaw = bay?.yaw ?? ellipseYaw(COLOSSEUM_A, COLOSSEUM_B, theta);
    const [sx, sz] = ellipsePoint(COLOSSEUM_A + 7.4, COLOSSEUM_B + 6.6, theta);
    const fx = Math.sin(yaw);
    const fz = Math.cos(yaw);
    const lx = Math.cos(yaw);
    const lz = -Math.sin(yaw);
    const bx = bay?.position[0] ?? sx;
    const bz = bay?.position[2] ?? sz;
    const foot = bay?.footY ?? colosseumTerrainHeightAt(bx, bz);
    const stagger = station === 0 ? 0.04 : 0.12 + s[0] * 0.58;
    const poleX = bx + lx * (2.1 + s[1] * 1.2) - fx * (1.1 + s[2] * 1.4);
    const poleZ = bz + lz * (2.1 + s[1] * 1.2) - fz * (1.1 + s[2] * 1.4);
    const cap = foot + Math.max(visible, 0.35);
    const deckY = bay?.deckY ?? foot + visible;
    const keep = station === 0 || station === 1 || station === 3 || station === 17;
    if (!keep) continue;
    if (window2.kind === "raising" || window2.kind === "striking") {
      if (station === 1 || station === 17) {
        const { u: u2, forward } = pingpong(t * (1.1 + s[5] * 1.6) + s[0]);
        pushCrew(
          crews,
          `base-${station}`,
          "climber",
          bx + lx * (3.4 + u2 * 2) + fx * (s[1] - 0.5) * 2,
          bz + lz * (3.4 + u2 * 2) + fz * (s[1] - 0.5) * 2,
          forward ? yaw + 0.4 : yaw + Math.PI,
          0.12,
          t * (14 + s[2] * 16) + s[3] * 9,
          t * (10 + s[4] * 12),
          foot
        );
        continue;
      }
      const span = window2.kind === "raising" ? window2.raiseUntil - window2.raiseFrom : window2.strikeUntil - window2.strikeFrom;
      const local = window2.kind === "raising" ? (t - window2.raiseFrom) / span : (t - window2.strikeFrom) / span;
      const speed = station === 0 ? 0.72 : 0.4 + s[5] * 0.85;
      const u = clamp((local - stagger) / speed);
      const along = window2.kind === "raising" ? u : 1 - u;
      const desired = window2.base + window2.rise * along;
      const y = Math.min(foot + desired, cap);
      pushCrew(
        crews,
        id,
        "climber",
        poleX,
        poleZ,
        yaw + (s[0] - 0.5) * 0.5,
        0.18 + s[1] * 0.18,
        desired / STRIDE * (0.5 + s[2]) + s[3] * 8,
        desired * (1.6 + s[4] * 2.4) + s[5] * 5,
        y
      );
      continue;
    }
    const climbIn = 0.028 + s[0] * 0.02;
    const climbOut = 0.028 + s[1] * 0.02;
    if (t < window2.raiseUntil + climbIn) {
      const u = clamp((t - window2.raiseUntil) / climbIn);
      const y = foot + window2.base + window2.rise * Math.min(1, 0.55 + u * (0.3 + s[2] * 0.2));
      pushCrew(
        crews,
        id,
        "climber",
        poleX,
        poleZ,
        yaw + (s[3] - 0.5) * 0.4,
        0.2,
        window2.rise * u / STRIDE * (0.5 + s[4]) + s[5] * 6,
        t * (18 + s[0] * 20) + station,
        Math.min(y, cap)
      );
      continue;
    }
    if (t > window2.strikeFrom - climbOut) {
      const u = clamp((t - (window2.strikeFrom - climbOut)) / climbOut);
      const y = foot + window2.base + window2.rise * (1 - u * (0.7 + s[2] * 0.3));
      pushCrew(
        crews,
        id,
        "climber",
        poleX,
        poleZ,
        yaw,
        0.2,
        window2.rise * (1 - u) / STRIDE + s[3] * 7,
        t * 22 + s[4] * 9,
        Math.min(Math.max(y, foot), cap)
      );
      continue;
    }
    if (s[5] < 0.34) {
      pushCrew(
        crews,
        `deck-${station}`,
        "deck-mason",
        bx + lx * (s[0] * 2.2 - 1.1) - fx * 0.4,
        bz + lz * (s[0] * 2.2 - 1.1) - fz * 0.4,
        yaw + Math.PI + (s[1] - 0.5) * 0.8,
        0.1 + s[2] * 0.12,
        t * (8 + s[3] * 10) + s[4] * 6,
        t * (22 + s[5] * 18) + s[0] * 9,
        deckY
      );
      continue;
    }
    const rate = 6 + s[0] * 16;
    const pace = Math.sin(t * rate + s[1] * 9);
    const walk = pace * (1.4 + s[2] * 1.8);
    pushCrew(
      crews,
      `deck-${station}`,
      "deck-mason",
      bx + lx * walk - fx * (0.2 + s[3] * 0.5),
      bz + lz * walk - fz * (0.2 + s[3] * 0.5),
      pace >= 0 ? yaw + Math.PI / 2 + s[4] * 0.3 : yaw - Math.PI / 2 - s[4] * 0.3,
      0.08 + s[5] * 0.12,
      t * (10 + s[0] * 18) + s[1] * 8,
      t * (14 + s[2] * 20) + s[3] * 5,
      deckY
    );
  }
}
function colosseumLabourAt(operations, t) {
  const crews = [];
  const rigs = [];
  for (const operation of operations) labourForOperation(operation, crews, rigs);
  scaffoldCrews(t, crews);
  yardShuttles(t, crews);
  return { crews, rigs };
}

// src/render/three/ColosseumWorkSystem.ts
var MAX_OPERATIONS = 24;
var MAX_WORKERS = 256;
var FIGURE = 4.4;
var MAX_SCAFFOLD_POLES = 1280;
var MAX_SCAFFOLD_DECKS = 24;
var MAX_SCAFFOLD_BRACES = 48;
var MAX_CENTERING = 80;
var UP = new Vector37(0, 1, 0);
var YAW_AXIS = new Vector37(0, 1, 0);
var LEAN_AXIS = new Vector37(1, 0, 0);
var ColosseumWorkSystem = class {
  group = new Group6();
  bodyGeometry = new CylinderGeometry3(0.32, 0.42, 0.98, 6);
  headGeometry = new SphereGeometry3(0.28, 7, 5);
  legGeometry = new CylinderGeometry3(0.07, 0.085, 0.62, 5);
  armGeometry = new CylinderGeometry3(0.85, 1, 1, 5, 1, true);
  boxGeometry = new BoxGeometry4(1, 1, 1);
  poleGeometry = new CylinderGeometry3(0.08, 0.1, 1, 6);
  scaffoldGeometry = new CylinderGeometry3(0.08, 0.1, 1, 4, 1, true);
  wheelGeometry = new CylinderGeometry3(1, 1, 0.18, 12);
  dustGeometry = new SphereGeometry3(0.5, 7, 4);
  bodies;
  heads;
  legs;
  arms;
  wagonDecks;
  wagonWheels;
  cranePoles;
  craneBooms;
  cranePlatforms;
  craneSupports;
  treadwheels;
  ropes;
  scaffoldPoles;
  scaffoldShadowPoles;
  // Color/depth writes are disabled only in the main material. Three's shadow
  // pass supplies its own depth material, retaining these column shadows.
  shadowOnlyMaterial = new MeshBasicMaterial({ colorWrite: false, depthWrite: false });
  scaffoldDecks;
  scaffoldBraces;
  centering;
  dust;
  materials = [];
  constructor(materials, _plan) {
    this.group.name = "colosseum-work-system";
    const skin = materials.skin.clone();
    const linen = materials.linen.clone();
    linen.color.set("#c94f3c");
    const timber = materials.wood.clone();
    timber.color.set("#6a4328");
    const ropeMat = materials.rope.clone();
    ropeMat.color.set("#7a5a32");
    const dustMat = materials.sand.clone();
    dustMat.color.set("#c4a882");
    dustMat.transparent = true;
    dustMat.opacity = 0.3;
    dustMat.depthWrite = false;
    this.materials.push(skin, linen, timber, ropeMat, dustMat);
    this.bodies = new InstancedMesh4(this.bodyGeometry, linen, MAX_WORKERS);
    this.heads = new InstancedMesh4(this.headGeometry, skin, MAX_WORKERS);
    this.legs = new InstancedMesh4(this.legGeometry, linen, MAX_WORKERS * 2);
    this.arms = new InstancedMesh4(this.armGeometry, skin, MAX_WORKERS * 2);
    this.wagonDecks = new InstancedMesh4(this.boxGeometry, timber, MAX_OPERATIONS);
    this.wagonWheels = new InstancedMesh4(this.wheelGeometry, timber, MAX_OPERATIONS * 4);
    this.cranePoles = new InstancedMesh4(this.poleGeometry, timber, MAX_OPERATIONS * 2);
    this.craneBooms = new InstancedMesh4(this.boxGeometry, timber, MAX_OPERATIONS);
    this.treadwheels = new InstancedMesh4(this.wheelGeometry, timber, MAX_OPERATIONS);
    this.ropes = new InstancedMesh4(this.armGeometry, ropeMat, MAX_OPERATIONS * 4);
    this.scaffoldPoles = new InstancedMesh4(this.scaffoldGeometry, timber, MAX_SCAFFOLD_POLES);
    this.scaffoldShadowPoles = new InstancedMesh4(this.scaffoldGeometry, this.shadowOnlyMaterial, 80);
    this.scaffoldShadowPoles.name = "colosseum-scaffold-shadow-columns";
    this.bodies.name = "colosseum-crew-bodies";
    this.heads.name = "colosseum-crew-heads";
    this.legs.name = "colosseum-crew-legs";
    this.arms.name = "colosseum-crew-arms";
    this.scaffoldDecks = new InstancedMesh4(this.boxGeometry, timber, MAX_SCAFFOLD_DECKS);
    this.scaffoldBraces = new InstancedMesh4(this.boxGeometry, timber, MAX_SCAFFOLD_BRACES);
    this.centering = new InstancedMesh4(this.boxGeometry, timber, MAX_CENTERING);
    this.dust = new InstancedMesh4(this.dustGeometry, dustMat, MAX_OPERATIONS * 2);
    this.cranePlatforms = new InstancedMesh4(this.boxGeometry, timber, MAX_OPERATIONS);
    this.craneSupports = new InstancedMesh4(this.boxGeometry, timber, MAX_OPERATIONS * 4);
    this.wagonDecks.name = "colosseum-wagon-decks";
    this.wagonWheels.name = "colosseum-wagon-wheels";
    this.cranePoles.name = "colosseum-crane-masts";
    this.craneBooms.name = "colosseum-crane-jibs";
    this.cranePlatforms.name = "colosseum-crane-platforms";
    this.craneSupports.name = "colosseum-crane-supports";
    this.scaffoldPoles.name = "colosseum-scaffold-poles";
    for (const mesh of [
      this.bodies,
      this.heads,
      this.legs,
      this.arms,
      this.wagonDecks,
      this.wagonWheels,
      this.cranePoles,
      this.craneBooms,
      this.cranePlatforms,
      this.craneSupports,
      this.treadwheels,
      this.ropes,
      this.scaffoldPoles,
      this.scaffoldShadowPoles,
      this.scaffoldDecks,
      this.scaffoldBraces,
      this.centering
    ]) {
      mesh.castShadow = true;
      mesh.frustumCulled = false;
      this.group.add(mesh);
    }
    this.scaffoldPoles.castShadow = false;
    this.dust.frustumCulled = false;
    this.group.add(this.dust);
  }
  setCompactDetail(compact) {
    for (const mesh of [this.heads, this.wagonWheels]) mesh.castShadow = !compact;
    this.arms.castShadow = false;
    this.legs.castShadow = false;
  }
  update(operations, t) {
    const matrix = new Matrix45();
    const quaternion = new Quaternion4();
    const leanQuat = new Quaternion4();
    const spinQuat = new Quaternion4();
    const axle = new Vector37();
    const partPos = new Vector37();
    const midpoint = new Vector37();
    const forward = new Vector37();
    const lateral = new Vector37();
    let bodies = 0;
    let legs = 0;
    let arms = 0;
    let decks = 0;
    let wheels = 0;
    let poles = 0;
    let booms = 0;
    let supports = 0;
    let tread = 0;
    let ropes = 0;
    let frames = 0;
    let dust = 0;
    const compose = (pos, yaw, scale, lean = 0) => {
      quaternion.setFromAxisAngle(YAW_AXIS, yaw);
      if (lean !== 0) {
        leanQuat.setFromAxisAngle(LEAN_AXIS, lean);
        quaternion.multiply(leanQuat);
      }
      matrix.compose(pos, quaternion, scale);
    };
    const alongScratch = new Vector37();
    const composeAlong = (from, to, radius) => {
      alongScratch.copy(to).sub(from);
      const length2 = Math.max(0.05, alongScratch.length());
      quaternion.setFromUnitVectors(UP, alongScratch.multiplyScalar(1 / length2));
      midpoint.copy(from).lerp(to, 0.5);
      matrix.compose(midpoint, quaternion, new Vector37(radius, length2, radius));
    };
    const composeWheel = (pos, yaw, spin, radius, thickness) => {
      axle.set(Math.cos(yaw), 0, -Math.sin(yaw));
      spinQuat.setFromAxisAngle(UP, spin);
      quaternion.setFromUnitVectors(UP, axle);
      quaternion.multiply(spinQuat);
      matrix.compose(pos, quaternion, new Vector37(radius, thickness, radius));
    };
    const labour = colosseumLabourAt(operations, t);
    const motion = new Map(labour.rigs.map((rig) => [rig.partId, rig]));
    const placeWorker = (crew) => {
      if (bodies >= MAX_WORKERS) return;
      const [x, footY, z2] = crew.position;
      const yaw = crew.yaw;
      const fx = Math.sin(yaw);
      const fz = Math.cos(yaw);
      const lx = Math.cos(yaw);
      const lz = -Math.sin(yaw);
      const climb = crew.role === "climber";
      const bob = Math.abs(Math.sin(crew.gait)) * (climb ? 0.14 : 0.07) * FIGURE;
      const stride = Math.sin(crew.gait) * (climb ? 0.18 : 0.34) * FIGURE;
      compose(
        new Vector37(x + fx * stride * 0.12, footY + 0.98 * FIGURE + bob, z2 + fz * stride * 0.12),
        yaw,
        new Vector37(FIGURE, FIGURE * 0.92, FIGURE),
        crew.lean
      );
      this.bodies.setMatrixAt(bodies, matrix);
      compose(
        new Vector37(
          x + fx * (crew.lean * 0.45 * FIGURE + stride * 0.12),
          footY + 1.6 * FIGURE + bob,
          z2 + fz * (crew.lean * 0.45 * FIGURE + stride * 0.12)
        ),
        yaw,
        new Vector37(FIGURE, FIGURE, FIGURE)
      );
      this.heads.setMatrixAt(bodies, matrix);
      const hammer = crew.role === "deck-mason" || crew.role === "dresser" || crew.role === "slinger";
      const haul = crew.role === "hauler" || crew.role === "tag-line";
      const reach = climb ? new Vector37(x + fx * 0.2 * FIGURE, footY + (1.85 + Math.abs(Math.sin(crew.arm)) * 0.85) * FIGURE, z2 + fz * 0.2 * FIGURE) : hammer ? new Vector37(x + fx * 0.7 * FIGURE, footY + (1.4 + Math.abs(Math.sin(crew.arm)) * 0.7) * FIGURE, z2 + fz * 0.7 * FIGURE) : haul ? new Vector37(x + fx * 0.95 * FIGURE, footY + 1.05 * FIGURE + bob, z2 + fz * 0.95 * FIGURE) : new Vector37(x + fx * 0.55 * FIGURE, footY + 1.1 * FIGURE + bob, z2 + fz * 0.55 * FIGURE);
      for (const legSide of [-1, 1]) {
        compose(
          new Vector37(
            x + lx * legSide * 0.12 * FIGURE + fx * stride * legSide,
            footY + 0.31 * FIGURE,
            z2 + lz * legSide * 0.12 * FIGURE + fz * stride * legSide
          ),
          yaw,
          new Vector37(FIGURE, FIGURE, FIGURE)
        );
        this.legs.setMatrixAt(legs, matrix);
        legs += 1;
      }
      for (const armSide of [-1, 1]) {
        const swing = haul ? 0.08 : Math.sin(crew.gait + (armSide > 0 ? 0 : Math.PI)) * 0.22 * FIGURE;
        const shoulder = new Vector37(
          x + lx * armSide * 0.2 * FIGURE,
          footY + 1.26 * FIGURE + bob,
          z2 + lz * armSide * 0.2 * FIGURE
        );
        const hand = hammer ? reach : new Vector37(reach.x + lx * swing, reach.y, reach.z + lz * swing);
        composeAlong(shoulder, hand, 0.05 * FIGURE);
        this.arms.setMatrixAt(arms, matrix);
        arms += 1;
      }
      bodies += 1;
    };
    let scaffoldPoles = 0;
    let scaffoldShadowPoles = 0;
    let scaffoldDecks = 0;
    let scaffoldBraces = 0;
    for (const bay of colosseumScaffoldsAt(t)) {
      const yaw = bay.yaw;
      forward.set(Math.sin(yaw), 0, Math.cos(yaw));
      lateral.set(Math.cos(yaw), 0, -Math.sin(yaw));
      const [x, , z2] = bay.position;
      const foot = bay.footY;
      if (scaffoldDecks < MAX_SCAFFOLD_DECKS) {
        compose(new Vector37(x, bay.deckY + 0.16, z2), yaw, new Vector37(8.8, 0.42, 5.4));
        this.scaffoldDecks.setMatrixAt(scaffoldDecks, matrix);
        scaffoldDecks += 1;
      }
      const corners = [[-2.6, -1.6], [2.6, -1.6], [-2.6, 1.6], [2.6, 1.6]];
      for (const [ox, oz] of corners) {
        const px = x + lateral.x * ox + forward.x * oz;
        const pz = z2 + lateral.z * ox + forward.z * oz;
        compose(new Vector37(px, foot + bay.height / 2, pz), yaw, new Vector37(12.5, bay.height, 12.5));
        this.scaffoldShadowPoles.setMatrixAt(scaffoldShadowPoles++, matrix);
      }
      for (let lift = 0; lift < bay.segmentCount; lift += 1) {
        const cy = foot + lift * bay.segmentLength + bay.segmentLength / 2;
        for (const [ox, oz] of corners) {
          if (scaffoldPoles >= MAX_SCAFFOLD_POLES) break;
          const px = x + lateral.x * ox + forward.x * oz;
          const pz = z2 + lateral.z * ox + forward.z * oz;
          compose(new Vector37(px, cy, pz), yaw, new Vector37(12.5, bay.segmentLength, 12.5));
          this.scaffoldPoles.setMatrixAt(scaffoldPoles, matrix);
          scaffoldPoles += 1;
        }
      }
      if (scaffoldBraces < MAX_SCAFFOLD_BRACES - 1) {
        compose(new Vector37(x, foot + bay.height * 0.52, z2), yaw, new Vector37(8.2, 0.32, 0.55));
        this.scaffoldBraces.setMatrixAt(scaffoldBraces, matrix);
        scaffoldBraces += 1;
        compose(new Vector37(x, foot + bay.height * 0.52, z2), yaw, new Vector37(0.55, 0.32, 5));
        this.scaffoldBraces.setMatrixAt(scaffoldBraces, matrix);
        scaffoldBraces += 1;
      }
    }
    for (const bay of colosseumCenteringAt(t)) {
      if (frames + 4 > MAX_CENTERING) break;
      if (bay.heightFactor < 0.2) continue;
      const yaw = bay.yaw;
      forward.set(Math.sin(yaw), 0, Math.cos(yaw));
      const [sx, sy, sz] = bay.position;
      const ribY = sy - 1.7;
      for (let rib = 0; rib < 4; rib += 1) {
        const along = (rib - 1.5) * 2.2;
        compose(
          new Vector37(sx + forward.x * along * 0.12, ribY, sz + forward.z * along * 0.12),
          yaw,
          new Vector37(0.55, 2.6, bay.span * 0.78)
        );
        this.centering.setMatrixAt(frames, matrix);
        frames += 1;
      }
    }
    for (const operation of operations) {
      const { part: part2, state } = operation;
      partPos.set(...state.position);
      const yaw = state.rotation[1];
      forward.set(Math.sin(yaw), 0, Math.cos(yaw));
      lateral.set(Math.cos(yaw), 0, -Math.sin(yaw));
      const halfY = colosseumVerticalHalfExtent(part2.dimensions);
      const bottom = state.position[1] - halfY;
      const hauling = state.mechanism === "wagon";
      const rig = colosseumCraneRigAt(part2, state);
      if (hauling) {
        compose(new Vector37(partPos.x, bottom - 0.19, partPos.z), yaw, new Vector37(
          Math.max(part2.dimensions[0], 2.2) + 1.4,
          0.38,
          Math.max(part2.dimensions[2], 2.4) + 1.6
        ));
        this.wagonDecks.setMatrixAt(decks, matrix);
        decks += 1;
        const wagonSpin = motion.get(part2.id)?.wagonSpin ?? 0;
        const wheelSide = (Math.max(part2.dimensions[0], 2.2) + 1.4) / 2 + 0.3;
        const wheelSpan = Math.max(0.9, part2.dimensions[2] * 0.32);
        for (const along of [-wheelSpan, wheelSpan]) {
          for (const side of [-1, 1]) {
            const wheelX = partPos.x + forward.x * along + lateral.x * side * wheelSide;
            const wheelZ = partPos.z + forward.z * along + lateral.z * side * wheelSide;
            composeWheel(
              new Vector37(
                wheelX,
                colosseumTerrainHeightAt(wheelX, wheelZ) + 0.72,
                wheelZ
              ),
              yaw,
              wagonSpin,
              0.72,
              0.22
            );
            this.wagonWheels.setMatrixAt(wheels, matrix);
            wheels += 1;
          }
        }
        if (ropes < MAX_OPERATIONS * 4) {
          composeAlong(
            new Vector37(partPos.x + forward.x * 1.4, bottom + 0.7, partPos.z + forward.z * 1.4),
            new Vector37(partPos.x + forward.x * 6.2, colosseumTerrainHeightAt(partPos.x, partPos.z) + 1.1 * FIGURE, partPos.z + forward.z * 6.2),
            0.08
          );
          this.ropes.setMatrixAt(ropes, matrix);
          ropes += 1;
        }
      }
      if (rig) {
        const stationYaw = part2.finalRotation[1];
        compose(new Vector37(rig.base[0], rig.base[1] - 0.21, rig.base[2]), stationYaw, new Vector37(7.2, 0.42, 5.8));
        this.cranePlatforms.setMatrixAt(booms, matrix);
        for (const [ox, oz] of [[-2.8, -2.2], [-2.8, 2.2], [2.8, -2.2], [2.8, 2.2]]) {
          const x = rig.base[0] + Math.cos(stationYaw) * ox + Math.sin(stationYaw) * oz;
          const z2 = rig.base[2] - Math.sin(stationYaw) * ox + Math.cos(stationYaw) * oz;
          const foot = colosseumTerrainHeightAt(x, z2);
          const top = rig.base[1] - 0.42;
          if (top > foot + 0.02) {
            compose(new Vector37(x, (top + foot) / 2, z2), stationYaw, new Vector37(0.75, top - foot, 0.75));
            this.craneSupports.setMatrixAt(supports++, matrix);
          }
        }
        const mastHeight = Math.max(0.8, rig.mastTop[1] - rig.base[1]);
        compose(new Vector37(rig.base[0], rig.base[1] + mastHeight / 2, rig.base[2]), rig.yaw, new Vector37(14, mastHeight, 14));
        this.cranePoles.setMatrixAt(poles, matrix);
        poles += 1;
        compose(
          new Vector37(rig.base[0] + Math.cos(stationYaw) * 2.1, rig.base[1] + mastHeight * 0.46, rig.base[2] - Math.sin(stationYaw) * 2.1),
          rig.yaw,
          new Vector37(11, mastHeight * 0.92, 11)
        );
        this.cranePoles.setMatrixAt(poles, matrix);
        poles += 1;
        composeAlong(
          new Vector37(...rig.mastTop),
          new Vector37(...rig.boomTip),
          1.15
        );
        this.craneBooms.setMatrixAt(booms, matrix);
        booms += 1;
        composeAlong(
          new Vector37(...rig.boomTip),
          new Vector37(...rig.hook),
          0.32
        );
        this.ropes.setMatrixAt(ropes, matrix);
        ropes += 1;
        composeWheel(
          new Vector37(...rig.treadwheel),
          rig.yaw,
          motion.get(part2.id)?.treadwheelSpin ?? 0,
          COLOSSEUM_TREADWHEEL_RADIUS,
          0.38
        );
        this.treadwheels.setMatrixAt(tread, matrix);
        tread += 1;
      }
      if (state.contactDust && state.contactDustAmount > 0.08 && dust < MAX_OPERATIONS * 2) {
        compose(
          new Vector37(partPos.x, bottom + 0.06, partPos.z),
          yaw,
          new Vector37(1.2 + state.contactDustAmount, 0.16, 1 + state.contactDustAmount)
        );
        this.dust.setMatrixAt(dust, matrix);
        dust += 1;
      }
    }
    for (const crew of labour.crews) placeWorker(crew);
    const counts = [
      [this.bodies, bodies],
      [this.heads, bodies],
      [this.legs, legs],
      [this.arms, arms],
      [this.wagonDecks, decks],
      [this.wagonWheels, wheels],
      [this.cranePoles, poles],
      [this.craneBooms, booms],
      [this.cranePlatforms, booms],
      [this.craneSupports, supports],
      [this.treadwheels, tread],
      [this.ropes, ropes],
      [this.scaffoldPoles, scaffoldPoles],
      [this.scaffoldShadowPoles, scaffoldShadowPoles],
      [this.scaffoldDecks, scaffoldDecks],
      [this.scaffoldBraces, scaffoldBraces],
      [this.centering, frames],
      [this.dust, dust]
    ];
    for (const [mesh, count] of counts) {
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
    }
  }
  dispose() {
    this.bodyGeometry.dispose();
    this.headGeometry.dispose();
    this.legGeometry.dispose();
    this.armGeometry.dispose();
    this.boxGeometry.dispose();
    this.poleGeometry.dispose();
    this.scaffoldGeometry.dispose();
    this.shadowOnlyMaterial.dispose();
    this.wheelGeometry.dispose();
    this.dustGeometry.dispose();
    for (const mesh of [
      this.bodies,
      this.heads,
      this.legs,
      this.arms,
      this.wagonDecks,
      this.wagonWheels,
      this.cranePoles,
      this.craneBooms,
      this.cranePlatforms,
      this.craneSupports,
      this.treadwheels,
      this.ropes,
      this.scaffoldPoles,
      this.scaffoldShadowPoles,
      this.scaffoldDecks,
      this.scaffoldBraces,
      this.centering,
      this.dust
    ]) mesh.dispose();
    for (const material of this.materials) material.dispose();
  }
};

// src/render/three/ColosseumWorld.ts
var ColosseumWorld = class {
  group = new Group7();
  sky;
  environment;
  stones;
  work;
  constructor(materials) {
    this.group.name = "colosseum-reference-world";
    this.sky = new ColosseumSkyDome();
    this.environment = new ColosseumEnvironment(materials);
    this.stones = new ColosseumStoneSystem(COLOSSEUM_CONSTRUCTION, materials);
    this.work = new ColosseumWorkSystem(materials, COLOSSEUM_CONSTRUCTION);
    this.group.add(this.sky.mesh, this.environment.group, this.stones.group, this.work.group);
  }
  get ready() {
    return this.environment.ready;
  }
  update(t, light2, sunDirection, sky, camera) {
    const compact = camera instanceof PerspectiveCamera4 && camera.aspect < 0.72;
    this.stones.setCompactDetail(compact);
    this.work.setCompactDetail(compact);
    const active = this.stones.update(t);
    this.work.update(active, t);
    this.environment.update(t, light2, sky, camera);
    this.sky.update(t, sky, sunDirection);
  }
  dispose() {
    this.sky.dispose();
    this.environment.dispose();
    this.stones.dispose();
    this.work.dispose();
  }
};

// src/render/three/MaterialLibrary.ts
import {
  Color as Color11,
  MeshStandardMaterial as MeshStandardMaterial8
} from "three";
function standard(color, roughness, metalness = 0) {
  return new MeshStandardMaterial8({ color, roughness, metalness });
}
function createMaterialLibrary(wonder) {
  const core = standard("#cbb07a", 0.94);
  const casing = standard("#ead9ac", 0.82);
  const granite = standard("#9b725d", 0.88);
  const sand = standard("#c99a5f", 0.98);
  const compactedEarth = standard("#9e6e3d", 1);
  const revetment = standard("#93764f", 1);
  const quarryCut = standard("#b98c58", 1);
  const wood = standard("#5b3822", 0.96);
  const rope = standard("#8b6338", 1);
  const foliage = standard("#5b7040", 0.94);
  const water = standard("#3f7f8c", 0.15, 0);
  water.transparent = true;
  water.opacity = 0.82;
  const farmland = standard("#6f7445", 0.99);
  const horizon = standard("#a97949", 1);
  horizon.vertexColors = true;
  const cityRoof = standard("#77513c", 0.98);
  const cityAccent = standard("#c4a16e", 0.91);
  const whitewash = standard("#e9dfc6", 0.92);
  const skin = standard("#8f5e3f", 0.92);
  const linen = standard("#d3bf93", 0.96);
  const city = standard("#ad8a63", 0.98);
  const legacy = {
    primary: standard(wonder.palette.primary, 0.9),
    accent: standard(wonder.palette.accent, 0.86),
    ground: sand,
    foliage,
    water,
    light: standard("#f3c76b", 0.5),
    shadow: standard("#2e251f", 1),
    casing
  };
  legacy.light.emissive = new Color11("#e1a53f");
  legacy.light.emissiveIntensity = 0.35;
  const block = {
    "core-limestone": core,
    "casing-limestone": casing,
    granite
  };
  const library = {
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
    all: Array.from(/* @__PURE__ */ new Set([
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
      ...Object.values(legacy)
    ]))
  };
  applyMaterialDetail(library);
  return library;
}

// src/engine/colosseumCamera.ts
var SHOTS2 = [
  { t: 0, azimuth: 0.55, pitchDeg: 13.8, radius: 336, target: [0, 6, 0] },
  { t: 0.16, azimuth: 0.41, pitchDeg: 14.4, radius: 322, target: [2, 10, 0] },
  { t: 0.32, azimuth: 0.27, pitchDeg: 15.2, radius: 308, target: [2, 16, 0] },
  { t: 0.48, azimuth: 0.11, pitchDeg: 16, radius: 318, target: [1, 22, 0] },
  { t: 0.62, azimuth: -0.05, pitchDeg: 15.2, radius: 338, target: [0, 26, 0] },
  { t: 0.78, azimuth: -0.21, pitchDeg: 11.8, radius: 358, target: [0, 27, 0] },
  { t: 0.9, azimuth: -0.31, pitchDeg: 10.2, radius: 376, target: [0, 25, 0] },
  { t: 1, azimuth: -0.35, pitchDeg: 10.2, radius: 392, target: [0, 24, 0] }
];
var lerp2 = (a, b, t) => a + (b - a) * t;
function colosseumCinematicShotAt(rawT, aspect = 16 / 9) {
  const t = clamp(rawT);
  let from = SHOTS2[0];
  let to = SHOTS2.at(-1);
  for (let index = 1; index < SHOTS2.length; index += 1) {
    if (t <= SHOTS2[index].t) {
      from = SHOTS2[index - 1];
      to = SHOTS2[index];
      break;
    }
  }
  const span = (t - from.t) / (to.t - from.t);
  const local = from === to ? 1 : easeInOutQuad(span);
  const narrow = Math.pow(clamp(1.78 / Math.max(0.3, aspect), 1, 2.05), 0.38);
  const azimuth = lerp2(from.azimuth, to.azimuth, from === to ? 1 : span);
  const fov = aspect < 0.72 ? 42 : 35;
  const projectedHalfWidth = Math.hypot(94 * Math.sin(azimuth), 78 * Math.cos(azimuth));
  const portraitFit = aspect < 0.72 ? projectedHalfWidth * 1.16 / (Math.tan(fov * Math.PI / 360) * Math.max(0.3, aspect)) : 0;
  return {
    azimuth,
    pitch: lerp2(from.pitchDeg, to.pitchDeg, local) * Math.PI / 180,
    radius: Math.max(lerp2(from.radius, to.radius, local) * narrow, portraitFit),
    target: [
      lerp2(from.target[0], to.target[0], local),
      lerp2(from.target[1], to.target[1], local),
      lerp2(from.target[2], to.target[2], local)
    ],
    fov
  };
}

// artifacts/colosseum-sun-city-2026-09-20/sweep.ts
var world = new ColosseumWorld(createMaterialLibrary(getWonder("colosseum")));
await world.ready;
var light = { sun: { azimuth: 0, elevation: 20, color: "#fff", intensity: 1 }, ambient: { skyColor: "#fff", groundColor: "#fff", intensity: 1 }, sky: "#fff", fog: "#fff", emissive: 0 };
var results = [];
for (const aspect of [1.6, 16 / 9, 390 / 844, 320 / 844]) {
  const camera = new PerspectiveCamera5(35, aspect, 0.1, 4e3);
  let peak = 0, peakT = 0;
  for (let frame = 0; frame <= 3600; frame++) {
    const t = frame / 3600, s = colosseumCinematicShotAt(t, aspect), h = Math.cos(s.pitch) * s.radius;
    camera.position.set(s.target[0] + Math.cos(s.azimuth) * h, s.target[1] + Math.sin(s.pitch) * s.radius, s.target[2] + Math.sin(s.azimuth) * h);
    camera.lookAt(new Vector38(...s.target));
    camera.fov = s.fov;
    camera.updateProjectionMatrix();
    world.update(t, light, new Vector38(1, 1, 1), sampleColosseumSky(t), camera);
    let count = 0;
    world.group.traverseVisible((o) => {
      if (o instanceof Mesh8) count += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3 * (o instanceof InstancedMesh5 ? o.count : 1) * (o.castShadow ? 2 : 1);
    });
    if (count > peak) {
      peak = count;
      peakT = t;
    }
  }
  const row = { aspect, samples: 3601, peak, peakT, budget: aspect < 0.72 ? 12e4 : 18e4 };
  results.push(row);
  console.log(JSON.stringify(row));
}
world.dispose();
writeFileSync("artifacts/colosseum-sun-city-2026-09-20/validation/geometry-sweep.json", JSON.stringify(results, null, 2));
if (results.some((r) => r.peak > r.budget)) process.exitCode = 1;
