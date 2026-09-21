// artifacts/colosseum-celestial-2026-09-20/review/phone-budget-sweep.ts
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
  const body2 = colorGeometry(new BoxGeometry(w, h, d).translate(0, h / 2, 0), ROME_ROLE_COLOR.brick);
  const plinth = colorGeometry(new BoxGeometry(w + 0.8, 0.7, d + 0.8).translate(0, 0.35, 0), ROME_ROLE_COLOR.stone);
  const cornice = colorGeometry(new BoxGeometry(w + 0.55, 0.28, d + 0.55).translate(0, h - 0.1, 0), ROME_ROLE_COLOR.stone);
  const voids = [-5.4, -1.8, 1.8, 5.4].map(
    (x) => colorGeometry(new BoxGeometry(1.6, 2.4, 0.22).translate(x, 2.4, d * 0.5 + 0.08), ROME_ROLE_COLOR.void)
  );
  return mergeColored([body2, plinth, cornice, ...voids]);
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
      const body2 = new InstancedMesh2(bodyGeometry, brick, count);
      const roof = new InstancedMesh2(roofGeometry, tile, count);
      body2.name = index === 0 ? "colosseum-insulae" : `colosseum-housing-${profile.id}`;
      roof.name = index === 0 ? "colosseum-insulae-roofs" : `colosseum-housing-${profile.id}-roofs`;
      body2.userData.housingVariant = profile.id;
      roof.userData.housingVariant = profile.id;
      this.housingBatches.push({ id: profile.id, body: body2, roof });
      const compact = compactHousingBody(createProceduralHousing(profile.id, "body", "compact"));
      this.geometries.push(compact);
      this.cityDetail.push({ mesh: body2, full: bodyGeometry, compact });
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
    this.group.updateWorldMatrix(true, true);
    this.cityProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    if (this.cityProjection.equals(this.cityLastProjection)) return;
    this.cityLastProjection.copy(this.cityProjection);
    this.cityFrustum.setFromProjectionMatrix(this.cityProjection);
    for (const { mesh, matrices, colors } of this.cityBatches) {
      mesh.geometry.computeBoundingSphere();
      let count = 0;
      for (let i = 0; i < matrices.length; i++) {
        this.citySphere.copy(mesh.geometry.boundingSphere).applyMatrix4(matrices[i]).applyMatrix4(mesh.matrixWorld);
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

// src/data/colosseumEphemeris.generated.ts
var COLOSSEUM_EPHEMERIS_ROWS = [
  [13.909978519, -23.855828234, 15219737979e-2, 0.261902083, 318.727536552, -23.300351336, 367470.578, 0.270895278, 0.1809514, 129.6537, 50.24, 1, 9639.714621],
  [15.140519474, -23.622147703, 15219733535e-2, 0.261902222, 319.808112281, -23.888374458, 367546.393, 0.270839444, 0.1813516, 129.5942, 50.2994, 1, 9639.714524],
  [16.364236524, -23.369233249, 15219728889e-2, 0.261902222, 320.901671155, -24.463502784, 367620.637, 0.270784722, 0.1817533, 129.5344, 50.359, 1, 9639.714427],
  [17.580685091, -23.097310278, 15219724043e-2, 0.261902361, 322.008311933, -25.025380607, 367693.286, 0.27073125, 0.1821564, 129.4746, 50.4188, 1, 9639.71433],
  [18.789446212, -22.806617387, 15219718996e-2, 0.261902361, 323.128110553, -25.573648687, 367764.315, 0.270678889, 0.1825608, 129.4146, 50.4787, 1, 9639.714233],
  [19.990127133, -22.497405492, 15219713752e-2, 0.2619025, 324.261118182, -26.107944668, 367833.701, 0.270627917, 0.1829665, 129.3544, 50.5387, 1, 9639.714136],
  [21.182362131, -22.16993685, 1521970831e-1, 0.261902639, 325.407359746, -26.627903777, 367901.42, 0.270578056, 0.1833735, 129.2941, 50.5989, 1, 9639.714039],
  [22.365812901, -21.824484123, 15219702674e-2, 0.261902639, 326.566832295, -27.133159497, 367967.451, 0.270529583, 0.1837817, 129.2337, 50.6592, 1, 9639.713942],
  [23.540169019, -21.461329371, 15219696844e-2, 0.261902778, 327.73950349, -27.623344364, 368031.772, 0.270482222, 0.1841911, 129.1732, 50.7196, 1, 9639.713845],
  [24.705147831, -21.080763164, 15219690823e-2, 0.261902917, 328.925309816, -28.098090681, 368094.362, 0.27043625, 0.1846016, 129.1125, 50.7802, 1, 9639.713748],
  [25.860494588, -20.683083592, 15219684612e-2, 0.261903056, 330.124155216, -28.557031466, 368155.201, 0.270391528, 0.1850133, 129.0517, 50.8408, 1, 9639.713652],
  [27.005982226, -20.268595344, 15219678213e-2, 0.261903056, 331.33590969, -28.999801387, 368214.27, 0.270348194, 0.1854261, 128.9909, 50.9016, 1, 9639.713555],
  [28.141411021, -19.837608808, 15219671628e-2, 0.261903194, 332.56040785, -29.426037733, 368271.55, 0.270306111, 0.1858399, 128.9299, 50.9625, 1, 9639.713458],
  [29.266608304, -19.390439132, 1521966486e-1, 0.261903333, 333.797447913, -29.835381538, 368327.024, 0.270265417, 0.1862547, 128.8688, 51.0234, 1, 9639.713361],
  [30.381427686, -18.927405449, 15219657911e-2, 0.261903472, 335.046790388, -30.227478605, 368380.675, 0.270226111, 0.1866705, 128.8076, 51.0845, 1, 9639.713264],
  [31.485748563, -18.44883, 15219650783e-2, 0.261903611, 336.308157332, -30.601980722, 368432.487, 0.270188056, 0.1870872, 128.7464, 51.1456, 1, 9639.713167],
  [32.579475313, -17.955037376, 15219643478e-2, 0.26190375, 337.581231649, -30.958546855, 368482.443, 0.270151389, 0.1875048, 128.685, 51.2069, 1, 9639.71307],
  [33.662536632, -17.446353703, 15219635999e-2, 0.261903889, 338.865656731, -31.296844422, 368530.531, 0.270116111, 0.1879232, 128.6236, 51.2682, 1, 9639.712973],
  [34.734884455, -16.92310603, 15219628349e-2, 0.261904028, 340.161035978, -31.616550501, 368576.735, 0.270082361, 0.1883424, 128.5622, 51.3295, 1, 9639.712876],
  [35.796493183, -16.385621601, 15219620529e-2, 0.261904167, 341.466933023, -31.91735316, 368621.043, 0.270049861, 0.1887624, 128.5007, 51.3909, 1, 9639.712779],
  [36.847358697, -15.834227244, 15219612544e-2, 0.261904306, 342.782871972, -32.198952752, 368663.443, 0.27001875, 0.1891832, 128.4391, 51.4524, 1, 9639.712682],
  [37.887497344, -15.269248809, 15219604395e-2, 0.261904444, 344.10833806, -32.461063204, 368703.923, 0.269989167, 0.1896046, 128.3775, 51.5139, 1, 9639.712585],
  [38.916945083, -14.691010556, 15219596086e-2, 0.261904583, 345.442778681, -32.703413334, 368742.473, 0.269960972, 0.1900266, 128.3158, 51.5755, 1, 9639.712488],
  [39.935756268, -14.09983477, 15219587619e-2, 0.261904722, 346.785604388, -32.925748064, 368779.083, 0.269934167, 0.1904492, 128.2541, 51.6371, 1, 9639.712391],
  [40.944002789, -13.496041237, 15219578998e-2, 0.261904861, 348.136190655, -33.127829674, 368813.745, 0.26990875, 0.1908724, 128.1924, 51.6987, 1, 9639.712295],
  [41.941773009, -12.879946871, 15219570226e-2, 0.261905, 349.493879672, -33.30943897, 368846.45, 0.269884861, 0.1912961, 128.1306, 51.7604, 1, 9639.712198],
  [42.92917092, -12.251865258, 15219561305e-2, 0.261905139, 350.857982755, -33.470376414, 368877.19, 0.269862361, 0.1917203, 128.0688, 51.822, 1, 9639.712101],
  [43.906314981, -11.612106453, 1521955224e-1, 0.261905278, 352.227782561, -33.610463125, 368905.961, 0.26984125, 0.1921449, 128.0071, 51.8837, 1, 9639.712004],
  [44.873337325, -10.960976599, 15219543033e-2, 0.261905417, 353.602536164, -33.729541852, 368932.756, 0.269821667, 0.1925698, 127.9453, 51.9454, 1, 9639.711907],
  [45.830382822, -10.298777689, 15219533688e-2, 0.261905556, 354.981478019, -33.827477822, 368957.57, 0.269803472, 0.1929951, 127.8835, 52.007, 1, 9639.71181],
  [46.777608181, -9.625807371, 15219524208e-2, 0.261905833, 356.363823257, -33.904159474, 368980.4, 0.269786806, 0.1934208, 127.8217, 52.0687, 1, 9639.711713],
  [47.715181252, -8.942358659, 15219514597e-2, 0.261905972, 357.748771432, -33.959499089, 369001.243, 0.269771667, 0.1938466, 127.76, 52.1304, 1, 9639.711616],
  [48.643280043, -8.248719913, 15219504858e-2, 0.261906111, 359.135509925, -33.993433277, 369020.096, 0.269757778, 0.1942727, 127.6982, 52.192, 1, 9639.711519],
  [49.562092101, -7.545174615, 15219494995e-2, 0.26190625, 0.523217993, -34.005923341, 369036.958, 0.269745556, 0.1946989, 127.6365, 52.2536, 1, 9639.711422],
  [50.471813753, -6.832001314, 15219485012e-2, 0.261906389, 1.911070597, -33.996955508, 369051.83, 0.269734583, 0.1951252, 127.5749, 52.3152, 1, 9639.711325],
  [51.372649565, -6.109473448, 15219474912e-2, 0.261906667, 3.298242665, -33.966540991, 369064.71, 0.269725139, 0.1955516, 127.5132, 52.3767, 1, 9639.711228],
  [52.264811548, -5.377859437, 152194647, 0.261906806, 4.683912638, -33.914715957, 369075.601, 0.269717222, 0.1959781, 127.4517, 52.4382, 1, 9639.711131],
  [53.148518717, -4.63742255, 15219454379e-2, 0.261906944, 6.067266776, -33.841541302, 369084.505, 0.269710694, 0.1964045, 127.3901, 52.4996, 1, 9639.711034],
  [54.023996538, -3.888420921, 15219443952e-2, 0.261907222, 7.447502886, -33.747102319, 369091.424, 0.269705694, 0.1968309, 127.3287, 52.561, 1, 9639.710937],
  [54.891476425, -3.131107578, 15219433425e-2, 0.261907361, 8.823834022, -33.631508232, 369096.362, 0.269702083, 0.1972572, 127.2673, 52.6223, 1, 9639.710841],
  [55.75119543, -2.365730367, 15219422801e-2, 0.2619075, 10.195492224, -33.494891579, 369099.325, 0.269699861, 0.1976833, 127.2059, 52.6836, 1, 9639.710744],
  [56.603395684, -1.592532143, 15219412084e-2, 0.261907639, 11.561731687, -33.337407488, 369100.316, 0.269699167, 0.1981093, 127.1447, 52.7447, 1, 9639.710647],
  [57.448324173, -0.811750723, 15219401278e-2, 0.261907917, 12.921831903, -33.159232875, 369099.344, 0.269699861, 0.198535, 127.0835, 52.8058, 1, 9639.71055],
  [58.286232388, -0.023619008, 15219390387e-2, 0.261908056, 14.275100608, -32.960565469, 369096.415, 0.269702083, 0.1989604, 127.0224, 52.8668, 1, 9639.710453],
  [59.117376185, 0.771635045, 15219379416e-2, 0.261908333, 15.620876361, -32.741622814, 369091.536, 0.269705556, 0.1993855, 126.9614, 52.9277, 1, 9639.710356],
  [59.942015408, 1.573788173, 15219368368e-2, 0.261908472, 16.958530675, -32.502641159, 369084.718, 0.269710556, 0.1998103, 126.9005, 52.9885, 1, 9639.710259],
  [60.760413829, 2.382621807, 15219357248e-2, 0.261908611, 18.287470061, -32.243874301, 369075.969, 0.269716944, 0.2002346, 126.8397, 53.0492, 1, 9639.710162],
  [61.572838998, 3.197921942, 15219346061e-2, 0.261908889, 19.607137604, -31.965592371, 369065.3, 0.269724722, 0.2006585, 126.779, 53.1098, 1, 9639.710065],
  [62.379562127, 4.019478981, 1521933481e-1, 0.261909028, 20.917014302, -31.668080562, 369052.722, 0.269734028, 0.2010819, 126.7185, 53.1703, 1, 9639.709968],
  [63.180858151, 4.847087725, 152193235, 0.261909167, 22.21662007, -31.351637855, 369038.248, 0.269744583, 0.2015048, 126.6581, 53.2306, 1, 9639.709871],
  [63.977005556, 5.68054707, 15219312135e-2, 0.261909444, 23.505514278, -31.016575737, 369021.89, 0.269756528, 0.2019271, 126.5978, 53.2909, 1, 9639.709774],
  [64.768286519, 6.519659974, 1521930072e-1, 0.261909583, 24.783296221, -30.663216888, 369003.663, 0.269769861, 0.2023488, 126.5376, 53.3509, 1, 9639.709677],
  [65.554986924, 7.364233259, 15219289259e-2, 0.261909861, 26.049605116, -30.291893912, 368983.58, 0.269784444, 0.2027698, 126.4776, 53.4109, 1, 9639.70958],
  [66.337396575, 8.214077564, 15219277757e-2, 0.26191, 27.304120096, -29.902948006, 368961.658, 0.269800556, 0.2031901, 126.4177, 53.4707, 1, 9639.709483],
  [67.115809178, 9.069007024, 15219266217e-2, 0.261910278, 28.546559492, -29.496727811, 368937.912, 0.269817917, 0.2036097, 126.358, 53.5303, 1, 9639.709387],
  [67.890522639, 9.928839212, 15219254646e-2, 0.261910417, 29.776680415, -29.073588115, 368912.359, 0.269836528, 0.2040284, 126.2984, 53.5898, 1, 9639.70929],
  [68.661839251, 10.793394947, 15219243046e-2, 0.261910556, 30.994277789, -28.633888735, 368885.018, 0.269856528, 0.2044464, 126.239, 53.6491, 1, 9639.709193],
  [69.430065936, 11.662498086, 15219231422e-2, 0.261910833, 32.199183299, -28.177993402, 368855.906, 0.269877917, 0.2048634, 126.1798, 53.7083, 1, 9639.709096],
  [70.195514649, 12.535975466, 1521921978e-1, 0.261910972, 33.391264367, -27.706268643, 368825.043, 0.269900417, 0.2052796, 126.1207, 53.7673, 1, 9639.708999],
  [70.958502563, 13.413656542, 15219208123e-2, 0.26191125, 34.570422648, -27.219082826, 368792.448, 0.269924306, 0.2056948, 126.0618, 53.8261, 1, 9639.708902],
  [71.719352562, 14.295373313, 15219196456e-2, 0.261911389, 35.736592671, -26.71680523, 368758.144, 0.269949444, 0.206109, 126.0031, 53.8847, 1, 9639.708805],
  [72.478393612, 15.180960071, 15219184784e-2, 0.261911667, 36.889740363, -26.199805126, 368722.151, 0.269975833, 0.2065222, 125.9446, 53.9431, 1, 9639.708708],
  [73.235961346, 16.070253316, 15219173111e-2, 0.261911806, 38.029861654, -25.668450879, 368684.492, 0.270003333, 0.2069344, 125.8863, 54.0014, 1, 9639.708611],
  [73.992398424, 16.963091375, 15219161442e-2, 0.261912083, 39.156980536, -25.123109374, 368645.189, 0.270032222, 0.2073454, 125.8282, 54.0594, 1, 9639.708514],
  [74.748055212, 17.859314303, 15219149781e-2, 0.261912222, 40.271147725, -24.564145173, 368604.267, 0.270062083, 0.2077553, 125.7703, 54.1173, 1, 9639.708417],
  [75.50329038, 18.758763633, 15219138133e-2, 0.261912361, 41.372438912, -23.991919954, 368561.75, 0.270093333, 0.208164, 125.7126, 54.1749, 1, 9639.70832],
  [76.258471552, 19.661282118, 15219126502e-2, 0.261912639, 42.460953185, -23.406791911, 368517.662, 0.270125556, 0.2085714, 125.6551, 54.2323, 1, 9639.708223],
  [77.013976155, 20.566713618, 15219114893e-2, 0.261912778, 43.536811475, -22.809115248, 368472.03, 0.270159028, 0.2089777, 125.5978, 54.2895, 1, 9639.708126],
  [77.770192058, 21.474902666, 1521910331e-1, 0.261913056, 44.600154861, -22.199239777, 368424.881, 0.270193611, 0.2093826, 125.5407, 54.3465, 1, 9639.70803],
  [78.527518551, 22.385694335, 15219091759e-2, 0.261913194, 45.651143196, -21.577510447, 368376.241, 0.270229306, 0.2097862, 125.4839, 54.4033, 1, 9639.707933],
  [79.286367232, 23.298933908, 15219080242e-2, 0.261913472, 46.689953454, -20.944267133, 368326.139, 0.270266111, 0.2101885, 125.4273, 54.4598, 1, 9639.707836],
  [80.04716313, 24.214466718, 15219068765e-2, 0.261913611, 47.716778629, -20.299844114, 368274.603, 0.270303889, 0.2105893, 125.371, 54.5161, 1, 9639.707739],
  [80.810345651, 25.132137672, 15219057333e-2, 0.26191375, 48.731825998, -19.64457011, 368221.662, 0.270342778, 0.2109888, 125.3149, 54.5721, 1, 9639.707642],
  [81.576369878, 26.051791058, 15219045949e-2, 0.261914028, 49.735316101, -18.978767887, 368167.345, 0.270382639, 0.2113867, 125.259, 54.628, 1, 9639.707545],
  [82.345707834, 26.973270187, 15219034618e-2, 0.261914167, 50.727481409, -18.302754193, 368111.684, 0.270423472, 0.2117832, 125.2034, 54.6835, 1, 9639.707448],
  [83.118849853, 27.896417014, 15219023345e-2, 0.261914444, 51.708565212, -17.616839606, 368054.709, 0.270465417, 0.2121782, 125.148, 54.7388, 1, 9639.707351],
  [83.896306197, 28.821071893, 15219012134e-2, 0.261914583, 52.678820627, -16.921328401, 367996.452, 0.270508194, 0.2125716, 125.0929, 54.7939, 1, 9639.707254],
  [84.678608535, 29.747072995, 15219000988e-2, 0.261914722, 53.638509404, -16.216518639, 367936.945, 0.270551944, 0.2129634, 125.038, 54.8487, 1, 9639.707157],
  [85.466311821, 30.674256013, 15218989913e-2, 0.261915, 54.58790116, -15.502702029, 367876.221, 0.270596667, 0.2133536, 124.9834, 54.9032, 1, 9639.70706],
  [86.259996163, 31.602453649, 15218978913e-2, 0.261915139, 55.527272455, -14.780163984, 367814.313, 0.270642083, 0.2137421, 124.9291, 54.9575, 1, 9639.706963],
  [87.060269006, 32.531495255, 15218967991e-2, 0.261915278, 56.456906111, -14.04918358, 367751.255, 0.270688611, 0.214129, 124.875, 55.0115, 1, 9639.706866],
  [87.867767233, 33.461206127, 15218957152e-2, 0.261915556, 57.377090302, -13.310033765, 367687.081, 0.270735833, 0.2145142, 124.8212, 55.0652, 1, 9639.706769],
  [88.683159717, 34.391407068, 15218946401e-2, 0.261915694, 58.288118067, -12.562981303, 367621.826, 0.270783889, 0.2148976, 124.7677, 55.1187, 1, 9639.706672],
  [89.507149949, 35.321913749, 15218935741e-2, 0.261915833, 59.190286682, -11.808286897, 367555.526, 0.270832639, 0.2152793, 124.7145, 55.1719, 1, 9639.706576],
  [90.340478894, 36.252536022, 15218925176e-2, 0.261916111, 60.083897092, -11.046205358, 367488.216, 0.270882361, 0.2156593, 124.6616, 55.2247, 1, 9639.706479],
  [91.18392823, 37.183077328, 1521891471e-1, 0.26191625, 60.969253576, -10.276985613, 367419.933, 0.270932639, 0.2160374, 124.6089, 55.2774, 1, 9639.706382],
  [92.038323577, 38.113333737, 15218904348e-2, 0.261916389, 61.846663173, -9.500870991, 367350.714, 0.27098375, 0.2164137, 124.5565, 55.3297, 1, 9639.706285],
  [92.904538304, 39.04309322, 15218894093e-2, 0.261916667, 62.716435466, -8.718099252, 367280.595, 0.271035417, 0.2167881, 124.5044, 55.3817, 1, 9639.706188],
  [93.78349747, 39.972134662, 15218883948e-2, 0.261916806, 63.578882186, -7.928902857, 367209.614, 0.271087778, 0.2171607, 124.4526, 55.4335, 1, 9639.706091],
  [94.676182304, 40.900226973, 15218873919e-2, 0.261916944, 64.434317129, -7.133508975, 367137.81, 0.271140833, 0.2175314, 124.4011, 55.4849, 1, 9639.705994],
  [95.583634742, 41.827127789, 15218864008e-2, 0.261917083, 65.283055765, -6.33213983, 367065.221, 0.271194444, 0.2179001, 124.3499, 55.5361, 1, 9639.705897],
  [96.506962679, 42.752582374, 15218854219e-2, 0.261917361, 66.125415188, -5.525012823, 366991.886, 0.271248611, 0.218267, 124.299, 55.5869, 1, 9639.7058],
  [97.447345492, 43.676322246, 15218844557e-2, 0.2619175, 66.961714002, -4.712340697, 366917.844, 0.271303333, 0.2186318, 124.2484, 55.6375, 1, 9639.705703],
  [98.40604003, 44.598063668, 15218835023e-2, 0.261917639, 67.792272227, -3.89433177, 366843.134, 0.271358611, 0.2189948, 124.1981, 55.6877, 1, 9639.705606],
  [99.384387256, 45.517506135, 15218825623e-2, 0.261917778, 68.617411354, -3.071190064, 366767.796, 0.271414444, 0.2193557, 124.1481, 55.7377, 1, 9639.705509],
  [100.383819089, 46.434330395, 15218816359e-2, 0.261917917, 69.43745422, -2.243115632, 366691.872, 0.271470556, 0.2197146, 124.0984, 55.7873, 1, 9639.705412],
  [101.405866112, 47.348196575, 15218807235e-2, 0.261918056, 70.252725149, -1.410304674, 366615.4, 0.271527222, 0.2200715, 124.0491, 55.8367, 1, 9639.705315],
  [102.452165646, 48.258741922, 15218798254e-2, 0.261918333, 71.063549994, -0.572949791, 366538.422, 0.271584306, 0.2204264, 124, 55.8857, 1, 9639.705219],
  [103.524470623, 49.165578492, 15218789419e-2, 0.261918472, 71.870256331, 0.268759875, 366460.979, 0.271641667, 0.2207793, 123.9512, 55.9344, 1, 9639.705122],
  [104.624658664, 50.068290266, 15218780734e-2, 0.261918611, 72.673173464, 1.114638292, 366383.112, 0.271699306, 0.2211301, 123.9028, 55.9828, 1, 9639.705025],
  [105.754742082, 50.966430291, 15218772201e-2, 0.26191875, 73.47263271, 1.964502411, 366304.863, 0.271757361, 0.2214788, 123.8546, 56.0309, 1, 9639.704928],
  [106.916878223, 51.859517344, 15218763825e-2, 0.261918889, 74.268967582, 2.818171938, 366226.273, 0.271815694, 0.2218254, 123.8068, 56.0787, 1, 9639.704831],
  [108.113380243, 52.747032252, 15218755606e-2, 0.261919028, 75.062513963, 3.675469009, 366147.385, 0.271874306, 0.22217, 123.7593, 56.1262, 1, 9639.704734],
  [109.346728419, 53.628413967, 15218747549e-2, 0.261919167, 75.85361055, 4.536218189, 366068.24, 0.271933056, 0.2225125, 123.7121, 56.1733, 1, 9639.704637],
  [110.619581217, 54.503054928, 15218739657e-2, 0.261919306, 76.642598904, 5.400245937, 365988.88, 0.271992083, 0.2228529, 123.6652, 56.2202, 1, 9639.70454],
  [111.934786667, 55.370296269, 15218731931e-2, 0.261919444, 77.42982396, 6.267380609, 365909.349, 0.272051111, 0.2231911, 123.6187, 56.2667, 1, 9639.704443],
  [113.29539307, 56.22942236, 15218724375e-2, 0.261919583, 78.215634262, 7.137452053, 365829.688, 0.272110417, 0.2235273, 123.5724, 56.3129, 1, 9639.704346],
  [114.704659077, 57.079655002, 15218716991e-2, 0.261919722, 79.00038248, 8.010291546, 365749.94, 0.272169722, 0.2238613, 123.5265, 56.3588, 1, 9639.704249],
  [116.166061804, 57.92014681, 15218709782e-2, 0.261919722, 79.784425651, 8.885731345, 365670.148, 0.272229167, 0.2241933, 123.4809, 56.4044, 1, 9639.704152],
  [117.683303089, 58.749974335, 1521870275e-1, 0.261919861, 80.568125725, 9.763604559, 365590.354, 0.272288472, 0.2245231, 123.4356, 56.4496, 1, 9639.704055],
  [119.260312146, 59.568130504, 15218695897e-2, 0.26192, 81.351849992, 10.643744841, 365510.602, 0.272347917, 0.2248508, 123.3906, 56.4946, 1, 9639.703958],
  [120.901243512, 60.373516571, 15218689226e-2, 0.261920139, 82.135971588, 11.525986149, 365430.934, 0.272407361, 0.2251763, 123.3459, 56.5392, 1, 9639.703861],
  [122.610468888, 61.164933783, 15218682739e-2, 0.261920278, 82.920870078, 12.410162516, 365351.393, 0.272466667, 0.2254998, 123.3015, 56.5836, 1, 9639.703765],
  [124.392559965, 61.941074459, 15218676437e-2, 0.261920417, 83.706931882, 13.296107633, 365272.021, 0.272525833, 0.2258211, 123.2575, 56.6276, 1, 9639.703668],
  [126.252260817, 62.700513247, 15218670323e-2, 0.261920417, 84.494550961, 14.183654659, 365192.863, 0.272584861, 0.2261403, 123.2138, 56.6713, 1, 9639.703571],
  [128.194445979, 63.441698371, 15218664399e-2, 0.261920556, 85.284129422, 15.072635924, 365113.959, 0.27264375, 0.2264575, 123.1703, 56.7147, 1, 9639.703474],
  [130.224061488, 64.162943582, 15218658666e-2, 0.261920694, 86.076078219, 15.96288264, 365035.353, 0.2727025, 0.2267725, 123.1272, 56.7578, 1, 9639.703377],
  [132.346043987, 64.862420926, 15218653127e-2, 0.261920833, 86.870817749, 16.854224495, 364957.088, 0.272760972, 0.2270854, 123.0844, 56.8005, 1, 9639.70328],
  [134.565215143, 65.538155498, 15218647781e-2, 0.261920833, 87.668778655, 17.74648939, 364879.206, 0.272819167, 0.2273962, 123.0419, 56.843, 1, 9639.703183],
  [136.886146408, 66.18802267, 15218642633e-2, 0.261920972, 88.47040258, 18.63950308, 364801.749, 0.272877222, 0.227705, 122.9997, 56.8852, 1, 9639.703086],
  [139.312991002, 66.809748955, 15218637681e-2, 0.261920972, 89.276142947, 19.533088778, 364724.76, 0.272934722, 0.2280116, 122.9578, 56.927, 1, 9639.702989],
  [141.849281393, 67.400917847, 15218632929e-2, 0.261921111, 90.08646591, 20.427066891, 364648.28, 0.272991944, 0.2283162, 122.9162, 56.9686, 1, 9639.702892],
  [144.49769112, 67.958981683, 15218628377e-2, 0.26192125, 90.901851123, 21.3212545, 364572.351, 0.273048889, 0.2286188, 122.8749, 57.0099, 1, 9639.702795],
  [147.259766053, 68.481281408, 15218624026e-2, 0.26192125, 91.722792719, 22.215464968, 364497.016, 0.273105278, 0.2289193, 122.8339, 57.0508, 1, 9639.702698],
  [150.135631944, 68.965075283, 15218619877e-2, 0.261921389, 92.549800295, 23.109507529, 364422.315, 0.27316125, 0.2292178, 122.7932, 57.0915, 1, 9639.702601],
  [153.123693416, 69.407577896, 15218615931e-2, 0.261921389, 93.383400054, 24.003186961, 364348.29, 0.273216806, 0.2295143, 122.7528, 57.1319, 1, 9639.702504],
  [156.220343575, 69.806009826, 1521861219e-1, 0.261921528, 94.224135659, 24.896302826, 364274.981, 0.273271806, 0.2298089, 122.7127, 57.172, 1, 9639.702408],
  [159.419713461, 70.157658106, 15218608653e-2, 0.261921528, 95.072569522, 25.788649175, 364202.429, 0.27332625, 0.2301014, 122.6728, 57.2118, 1, 9639.702311],
  [162.713492211, 70.459945958, 15218605322e-2, 0.261921528, 95.929283953, 26.680013981, 364130.675, 0.27338, 0.230392, 122.6333, 57.2513, 1, 9639.702214],
  [166.090852444, 70.710509274, 15218602196e-2, 0.261921667, 96.794882296, 27.570178452, 364059.759, 0.273433333, 0.2306806, 122.594, 57.2906, 1, 9639.702117],
  [169.538512261, 70.907275903, 15218599277e-2, 0.261921667, 97.66999037, 28.458916638, 363989.72, 0.273485972, 0.2309673, 122.555, 57.3295, 1, 9639.70202],
  [173.040953448, 71.048542395, 15218596565e-2, 0.261921806, 98.55525761, 29.345994611, 363920.597, 0.273537917, 0.2312522, 122.5163, 57.3682, 1, 9639.701923],
  [176.580803824, 71.133042413, 1521859406e-1, 0.261921806, 99.451358472, 30.231169801, 363852.43, 0.273589167, 0.2315351, 122.4779, 57.4066, 1, 9639.701826],
  [180.139367502, 71.160000677, 15218591762e-2, 0.261921806, 100.358993889, 31.114190391, 363785.257, 0.273639583, 0.2318162, 122.4397, 57.4448, 1, 9639.701729],
  [183.697269115, 71.129167333, 15218589671e-2, 0.261921806, 101.278892708, 31.9947945, 363719.116, 0.273689444, 0.2320955, 122.4018, 57.4827, 1, 9639.701632],
  [187.235157264, 71.040829243, 15218587787e-2, 0.261921944, 102.211813044, 32.872709297, 363654.045, 0.273738333, 0.232373, 122.3641, 57.5203, 1, 9639.701535],
  [190.734406969, 70.895797045, 1521858611e-1, 0.261921944, 103.158543882, 33.747650248, 363590.082, 0.273786528, 0.2326487, 122.3267, 57.5577, 1, 9639.701438],
  [194.177757098, 70.695369315, 15218584639e-2, 0.261921944, 104.119906512, 34.619320137, 363527.262, 0.273833889, 0.2329227, 122.2896, 57.5948, 1, 9639.701341],
  [197.549831512, 70.441277453, 15218583376e-2, 0.261921944, 105.096755986, 35.487408063, 363465.623, 0.273880278, 0.2331949, 122.2527, 57.6317, 1, 9639.701244],
  [200.837510518, 70.135616494, 15218582318e-2, 0.261921944, 106.089982745, 36.351588561, 363405.201, 0.273925833, 0.2334654, 122.216, 57.6683, 1, 9639.701147],
  [204.030137966, 69.780768011, 15218581465e-2, 0.261921944, 107.100513849, 37.211520325, 363346.03, 0.273970417, 0.2337343, 122.1796, 57.7047, 1, 9639.70105],
  [207.119573153, 69.37932086, 15218580817e-2, 0.261921944, 108.129314427, 38.066845122, 363288.145, 0.274014028, 0.2340016, 122.1434, 57.7408, 1, 9639.700954],
  [210.100107895, 68.933995063, 15218580373e-2, 0.261922083, 109.177388925, 38.917186565, 363231.581, 0.274056806, 0.2342672, 122.1075, 57.7767, 1, 9639.700857],
  [212.968281241, 68.447572562, 15218580132e-2, 0.261922083, 110.245782323, 39.762148885, 363176.371, 0.274098472, 0.2345313, 122.0718, 57.8124, 1, 9639.70076],
  [215.72262431, 67.922837617, 15218580093e-2, 0.261922083, 111.335580915, 40.601315432, 363122.549, 0.274139028, 0.2347939, 122.0363, 57.8479, 1, 9639.700663],
  [218.363369297, 67.362527723, 15218580256e-2, 0.261922083, 112.447913099, 41.434247296, 363070.146, 0.274178611, 0.2350549, 122.001, 57.8832, 1, 9639.700566],
  [220.892148017, 66.769295408, 15218580618e-2, 0.261921944, 113.583949867, 42.260481894, 363019.196, 0.274217083, 0.2353145, 121.9659, 57.9182, 1, 9639.700469],
  [223.311700754, 66.145680166, 1521858118e-1, 0.261921944, 114.744904659, 43.079531203, 362969.728, 0.274254444, 0.2355727, 121.931, 57.9531, 1, 9639.700372],
  [225.625609469, 65.494089265, 15218581938e-2, 0.261921944, 115.932033261, 43.890880417, 362921.774, 0.274290694, 0.2358294, 121.8964, 57.9877, 1, 9639.700275],
  [227.838061922, 64.816786361, 15218582893e-2, 0.261921944, 117.146632509, 44.693985985, 362875.364, 0.274325833, 0.2360848, 121.8619, 58.0221, 1, 9639.700178],
  [229.953651569, 64.115886032, 15218584042e-2, 0.261921944, 118.390038811, 45.488274008, 362830.526, 0.274359722, 0.2363389, 121.8276, 58.0564, 1, 9639.700081],
  [231.977211796, 63.393353226, 15218585385e-2, 0.261921944, 119.663625706, 46.273138511, 362787.29, 0.274392361, 0.2365917, 121.7935, 58.0904, 1, 9639.699984],
  [233.913683128, 62.651006121, 15218586918e-2, 0.261921944, 120.968800561, 47.047939691, 362745.683, 0.274423889, 0.2368433, 121.7596, 58.1243, 1, 9639.699887],
  [235.768008842, 61.890521763, 15218588641e-2, 0.261921806, 122.306999884, 47.812002074, 362705.732, 0.274454028, 0.2370937, 121.7259, 58.158, 1, 9639.69979],
  [237.545056311, 61.113443143, 15218590552e-2, 0.261921806, 123.679683615, 48.564612838, 362667.465, 0.274483056, 0.2373429, 121.6923, 58.1916, 1, 9639.699693],
  [239.24955902, 60.321187428, 15218592648e-2, 0.261921806, 125.088327911, 49.305020249, 362630.906, 0.274510694, 0.237591, 121.6589, 58.225, 1, 9639.699596],
  [240.886075768, 59.515054706, 15218594927e-2, 0.261921806, 126.534415988, 50.032432043, 362596.08, 0.274537083, 0.2378381, 121.6256, 58.2582, 1, 9639.6995],
  [242.458963897, 58.69623674, 15218597388e-2, 0.261921667, 128.019427376, 50.746014178, 362563.011, 0.274562083, 0.2380841, 121.5925, 58.2913, 1, 9639.699403],
  [243.972362772, 57.865825862, 15218600028e-2, 0.261921667, 129.544824615, 51.444889659, 362531.724, 0.274585833, 0.2383291, 121.5596, 58.3242, 1, 9639.699306],
  [245.430186115, 57.024823292, 15218602845e-2, 0.261921667, 131.112037822, 52.128137738, 362502.24, 0.274608194, 0.2385732, 121.5267, 58.357, 1, 9639.699209],
  [246.836120278, 56.174147182, 15218605837e-2, 0.261921528, 132.722446547, 52.794793509, 362474.581, 0.274629167, 0.2388164, 121.4941, 58.3896, 1, 9639.699112],
  [248.193627396, 55.314639998, 152186090, 0.261921528, 134.377359062, 53.443848058, 362448.769, 0.274648611, 0.2390587, 121.4615, 58.4222, 1, 9639.699015],
  [249.505951371, 54.447075642, 15218612333e-2, 0.261921528, 136.077988214, 54.074248984, 362424.823, 0.274666806, 0.2393003, 121.429, 58.4546, 1, 9639.698918],
  [250.77612657, 53.572165759, 15218615833e-2, 0.261921389, 137.82542473, 54.684901819, 362402.762, 0.274683472, 0.239541, 121.3967, 58.4869, 1, 9639.698821],
  [252.006987759, 52.690565638, 15218619496e-2, 0.261921389, 139.620607509, 55.274672261, 362382.605, 0.27469875, 0.2397811, 121.3645, 58.5191, 1, 9639.698724],
  [253.201180893, 51.802879614, 15218623321e-2, 0.26192125, 141.464290796, 55.84238921, 362364.37, 0.274712639, 0.2400205, 121.3324, 58.5512, 1, 9639.698627],
  [254.361174507, 50.909665827, 15218627304e-2, 0.26192125, 143.357009442, 56.386849108, 362348.073, 0.274725, 0.2402593, 121.3003, 58.5832, 1, 9639.69853],
  [255.489270782, 50.011440833, 15218631443e-2, 0.261921111, 145.299041433, 56.906821217, 362333.73, 0.274735833, 0.2404975, 121.2684, 58.6151, 1, 9639.698433],
  [256.587616839, 49.108683496, 15218635734e-2, 0.261921111, 147.290369859, 57.401054406, 362321.356, 0.274745278, 0.2407352, 121.2365, 58.6469, 1, 9639.698336],
  [257.658215448, 48.20183868, 15218640174e-2, 0.261920972, 149.330644111, 57.868285172, 362310.965, 0.274753056, 0.2409724, 121.2047, 58.6787, 1, 9639.698239],
  [258.70293552, 47.291320408, 1521864476e-1, 0.261920972, 151.41914277, 58.307247283, 362302.571, 0.274759444, 0.2412092, 121.173, 58.7103, 1, 9639.698143],
  [259.723521711, 46.377515004, 15218649489e-2, 0.261920833, 153.554737865, 58.716682547, 362296.185, 0.274764306, 0.2414456, 121.1414, 58.742, 1, 9639.698046],
  [260.721603822, 45.460783657, 15218654357e-2, 0.261920694, 155.735864319, 59.095353222, 362291.818, 0.274767639, 0.2416817, 121.1098, 58.7735, 1, 9639.697949],
  [261.698705451, 44.54146486, 15218659362e-2, 0.261920694, 157.96049495, 59.442055532, 362289.482, 0.274769444, 0.2419175, 121.0782, 58.8051, 1, 9639.697852],
  [262.656252063, 43.619876635, 15218664499e-2, 0.261920556, 160.226123464, 59.755634227, 362289.186, 0.274769583, 0.2421532, 121.0467, 58.8365, 1, 9639.697755],
  [263.595578664, 42.696318384, 15218669765e-2, 0.261920417, 162.529757748, 60.034997943, 362290.938, 0.274768333, 0.2423886, 121.0152, 58.868, 1, 9639.697658],
  [264.5179366, 41.77107286, 15218675157e-2, 0.261920417, 164.867923945, 60.279134829, 362294.746, 0.274765417, 0.2426239, 120.9837, 58.8994, 1, 9639.697561],
  [265.424500172, 40.84440767, 15218680671e-2, 0.261920278, 167.236684317, 60.487128234, 362300.616, 0.274760972, 0.2428592, 120.9523, 58.9308, 1, 9639.697464],
  [266.316372555, 39.916576803, 15218686303e-2, 0.261920139, 169.631668233, 60.658171731, 362308.555, 0.274755, 0.2430944, 120.9209, 58.9622, 1, 9639.697367],
  [267.19459145, 38.987821841, 15218692049e-2, 0.261920139, 172.048117981, 60.791583169, 362318.567, 0.274747361, 0.2433296, 120.8894, 58.9936, 1, 9639.69727],
  [268.060133996, 38.058373361, 15218697906e-2, 0.26192, 174.480946691, 60.88681695, 362330.656, 0.274738194, 0.243565, 120.858, 59.025, 1, 9639.697173],
  [268.913921591, 37.128451913, 1521870387e-1, 0.261919861, 176.924809397, 60.943474305, 362344.825, 0.2747275, 0.2438004, 120.8266, 59.0564, 1, 9639.697076],
  [269.756824191, 36.198269062, 15218709937e-2, 0.261919722, 179.374183332, 60.961310932, 362361.077, 0.274715139, 0.2440361, 120.7951, 59.0878, 1, 9639.696979],
  [270.589664261, 35.268028336, 15218716103e-2, 0.261919722, 181.823455348, 60.940241761, 362379.411, 0.27470125, 0.244272, 120.7637, 59.1192, 1, 9639.696882],
  [271.413220559, 34.33792595, 15218722363e-2, 0.261919583, 184.267013047, 60.880342538, 362399.828, 0.274685694, 0.2445082, 120.7322, 59.1506, 1, 9639.696785],
  [272.228231347, 33.408151761, 15218728715e-2, 0.261919444, 186.699335366, 60.781848259, 362422.328, 0.27466875, 0.2447447, 120.7007, 59.1821, 1, 9639.696689],
  [273.035397612, 32.478889855, 15218735153e-2, 0.261919306, 189.115080076, 60.645148439, 362446.908, 0.274650139, 0.2449816, 120.6691, 59.2136, 1, 9639.696592],
  [273.835385879, 31.550319263, 15218741674e-2, 0.261919306, 191.509164137, 60.4707795, 362473.565, 0.274629861, 0.245219, 120.6375, 59.2452, 1, 9639.696495],
  [274.628830956, 30.622614441, 15218748274e-2, 0.261919167, 193.876834393, 60.25941454, 362502.297, 0.274608056, 0.2454568, 120.6058, 59.2768, 1, 9639.696398],
  [275.416338208, 29.695946015, 15218754948e-2, 0.261919028, 196.213725439, 60.01185103, 362533.098, 0.274584722, 0.2456952, 120.5741, 59.3085, 1, 9639.696301],
  [276.198485908, 28.770481172, 15218761691e-2, 0.261918889, 198.51590528, 59.728996844, 362565.962, 0.274559861, 0.2459341, 120.5423, 59.3403, 1, 9639.696204],
  [276.975827277, 27.846384173, 15218768501e-2, 0.26191875, 200.779906099, 59.411855212, 362600.884, 0.274533472, 0.2461738, 120.5104, 59.3721, 1, 9639.696107],
  [277.748892371, 26.923816832, 15218775372e-2, 0.261918611, 203.002741617, 59.061509122, 362637.855, 0.274505417, 0.2464141, 120.4784, 59.404, 1, 9639.69601],
  [278.518189944, 26.002938813, 152187823, 0.261918472, 205.1819119, 58.679105591, 362676.868, 0.274475972, 0.2466551, 120.4464, 59.436, 1, 9639.695913],
  [279.284208921, 25.083908204, 1521878928e-1, 0.261918472, 207.31539552, 58.265840445, 362717.912, 0.274444861, 0.2468969, 120.4142, 59.4681, 1, 9639.695816],
  [280.047420005, 24.166881763, 15218796309e-2, 0.261918333, 209.401632994, 57.822943702, 362760.977, 0.274412222, 0.2471396, 120.382, 59.5003, 1, 9639.695719],
  [280.808277013, 23.252015327, 15218803382e-2, 0.261918194, 211.439501476, 57.351666086, 362806.054, 0.274378194, 0.2473832, 120.3497, 59.5326, 1, 9639.695622],
  [281.567218266, 22.339464018, 15218810494e-2, 0.261918056, 213.428284229, 56.853266645, 362853.128, 0.274342639, 0.2476277, 120.3172, 59.565, 1, 9639.695525],
  [282.324667616, 21.429382732, 15218817641e-2, 0.261917917, 215.36763492, 56.329001919, 362902.187, 0.274305556, 0.2478731, 120.2846, 59.5975, 1, 9639.695428],
  [283.081035647, 20.521926318, 15218824819e-2, 0.261917778, 217.257540251, 55.780116375, 362953.218, 0.274266944, 0.2481196, 120.2519, 59.6302, 1, 9639.695332],
  [283.836720665, 19.617249883, 15218832023e-2, 0.261917639, 219.098281376, 55.207834326, 363006.205, 0.274226944, 0.2483672, 120.2191, 59.663, 1, 9639.695235],
  [284.592109603, 18.715509093, 15218839248e-2, 0.2619175, 220.890395638, 54.613353223, 363061.133, 0.274185417, 0.2486159, 120.1861, 59.6959, 1, 9639.695138],
  [285.34757899, 17.816860307, 1521884649e-1, 0.2619175, 222.634639614, 53.997838178, 363117.985, 0.2741425, 0.2488658, 120.153, 59.7289, 1, 9639.695041],
  [286.103495596, 16.921461005, 15218853744e-2, 0.261917361, 224.331953695, 53.362417873, 363176.743, 0.274098194, 0.2491169, 120.1197, 59.7622, 1, 9639.694944],
  [286.860217262, 16.029469904, 15218861006e-2, 0.261917222, 225.983429906, 52.708181296, 363237.39, 0.274052361, 0.2493693, 120.0863, 59.7955, 1, 9639.694847],
  [287.618093532, 15.141047242, 15218868272e-2, 0.261917083, 227.59028193, 52.03617561, 363299.906, 0.274005278, 0.2496229, 120.0527, 59.8291, 1, 9639.69475],
  [288.377466365, 14.256354884, 15218875536e-2, 0.261916944, 229.153818496, 51.347404693, 363364.271, 0.273956667, 0.249878, 120.0189, 59.8628, 1, 9639.694653],
  [289.138670557, 13.375556711, 15218882795e-2, 0.261916806, 230.675419327, 50.642828585, 363430.464, 0.273906806, 0.2501344, 119.985, 59.8966, 1, 9639.694556],
  [289.902034359, 12.498818706, 15218890044e-2, 0.261916667, 232.156514457, 49.923363324, 363498.464, 0.273855556, 0.2503922, 119.9509, 59.9307, 1, 9639.694459],
  [290.667879917, 11.626309184, 15218897277e-2, 0.261916528, 233.598566124, 49.189881352, 363568.247, 0.273802917, 0.2506515, 119.9166, 59.9649, 1, 9639.694362],
  [291.436523674, 10.75819902, 15218904492e-2, 0.261916389, 235.003053161, 48.443212361, 363639.792, 0.273749167, 0.2509124, 119.8821, 59.9993, 1, 9639.694265],
  [292.208276856, 9.894661712, 15218911682e-2, 0.26191625, 236.37145827, 47.684144234, 363713.073, 0.273693889, 0.2511748, 119.8474, 60.0339, 1, 9639.694168],
  [292.983445652, 9.035873749, 15218918844e-2, 0.26191625, 237.705256672, 46.913424567, 363788.065, 0.2736375, 0.2514387, 119.8126, 60.0687, 1, 9639.694071],
  [293.762331618, 8.182014666, 15218925974e-2, 0.261916111, 239.00590733, 46.131762075, 363864.744, 0.273579861, 0.2517044, 119.7775, 60.1037, 1, 9639.693974],
  [294.545231881, 7.333267277, 15218933066e-2, 0.261915972, 240.27484572, 45.339828209, 363943.082, 0.273520972, 0.2519717, 119.7422, 60.139, 1, 9639.693878],
  [295.332439464, 6.489817729, 15218940116e-2, 0.261915833, 241.513478069, 44.538258813, 364023.053, 0.273460833, 0.2522407, 119.7067, 60.1744, 1, 9639.693781],
  [296.124243307, 5.651855839, 1521894712e-1, 0.261915694, 242.723176701, 43.727655985, 364104.629, 0.273399583, 0.2525115, 119.671, 60.21, 1, 9639.693684],
  [296.920928514, 4.819575131, 15218954073e-2, 0.261915556, 243.905276844, 42.90858972, 364187.78, 0.273337222, 0.2527841, 119.635, 60.2459, 1, 9639.693587],
  [297.722776431, 3.993173021, 15218960971e-2, 0.261915417, 245.061074102, 42.081599714, 364272.478, 0.273273611, 0.2530585, 119.5989, 60.282, 1, 9639.69349],
  [298.530064681, 3.172850993, 1521896781e-1, 0.261915417, 246.191822852, 41.24719707, 364358.694, 0.273209028, 0.2533347, 119.5625, 60.3184, 1, 9639.693393],
  [299.3430673, 2.358814622, 15218974585e-2, 0.261915278, 247.298735443, 40.405865859, 364446.395, 0.273143194, 0.2536128, 119.5258, 60.3549, 1, 9639.693296],
  [300.162054564, 1.551273878, 15218981292e-2, 0.261915139, 248.382981514, 39.558064933, 364535.551, 0.273076389, 0.2538929, 119.4889, 60.3917, 1, 9639.693199],
  [300.987293046, 0.750443139, 15218987926e-2, 0.261915, 249.445688248, 38.70422935, 364626.13, 0.273008611, 0.2541749, 119.4518, 60.4288, 1, 9639.693102],
  [301.819045467, -0.043458637, 15218994484e-2, 0.261914861, 250.487940726, 37.844771918, 364718.099, 0.272939722, 0.254459, 119.4145, 60.4661, 1, 9639.693005],
  [302.657570679, -0.830207907, 15219000962e-2, 0.261914722, 251.510782745, 36.980084535, 364811.425, 0.272869861, 0.254745, 119.3768, 60.5036, 1, 9639.692908],
  [303.503123326, -1.609576287, 15219007354e-2, 0.261914722, 252.515217611, 36.110539688, 364906.075, 0.272799167, 0.2550331, 119.339, 60.5414, 1, 9639.692811],
  [304.35595374, -2.381330567, 15219013657e-2, 0.261914583, 253.502209353, 35.236491658, 365002.014, 0.2727275, 0.2553232, 119.3008, 60.5795, 1, 9639.692714],
  [305.216307662, -3.145232607, 15219019867e-2, 0.261914444, 254.472684008, 34.358277744, 365099.206, 0.272654861, 0.2556155, 119.2624, 60.6178, 1, 9639.692617],
  [306.084425908, -3.901039244, 15219025979e-2, 0.261914306, 255.427530954, 33.476219445, 365197.618, 0.272581389, 0.2559099, 119.2238, 60.6564, 1, 9639.692521],
  [306.960544148, -4.648502347, 1521903199e-1, 0.261914306, 256.367604439, 32.590623449, 365297.212, 0.272507083, 0.2562064, 119.1848, 60.6952, 1, 9639.692424],
  [307.844892343, -5.38736862, 15219037896e-2, 0.261914167, 257.293724861, 31.70178284, 365397.952, 0.272431944, 0.2565052, 119.1456, 60.7344, 1, 9639.692327],
  [308.737694428, -6.117379689, 15219043693e-2, 0.261914028, 258.206680432, 30.809977926, 365499.802, 0.272355972, 0.2568061, 119.1061, 60.7738, 1, 9639.69223],
  [309.63916778, -6.838272045, 15219049377e-2, 0.261913889, 259.107228608, 29.915477212, 365602.723, 0.272279306, 0.2571093, 119.0664, 60.8134, 1, 9639.692133],
  [310.549522811, -7.549777159, 15219054944e-2, 0.261913889, 259.99609768, 29.018538153, 365706.678, 0.272201944, 0.2574147, 119.0264, 60.8534, 1, 9639.692036],
  [311.468962221, -8.251621369, 15219060391e-2, 0.26191375, 260.873988058, 28.119408144, 365811.628, 0.272123889, 0.2577224, 118.986, 60.8936, 1, 9639.691939],
  [312.397680508, -8.94352604, 15219065713e-2, 0.261913611, 261.741573881, 27.218325132, 365917.535, 0.272045139, 0.2580324, 118.9454, 60.9342, 1, 9639.691842],
  [313.33586327, -9.625207617, 15219070908e-2, 0.261913611, 262.599504337, 26.315518396, 366024.359, 0.271965694, 0.2583447, 118.9045, 60.975, 1, 9639.691745],
  [314.283686479, -10.296377715, 15219075971e-2, 0.261913472, 263.448405059, 25.411209218, 366132.062, 0.271885694, 0.2586593, 118.8634, 61.0161, 1, 9639.691648],
  [315.241315856, -10.95674334, 15219080899e-2, 0.261913333, 264.288879518, 24.505611428, 366240.602, 0.271805139, 0.2589763, 118.8219, 61.0574, 1, 9639.691551],
  [316.208905894, -11.60600692, 15219085689e-2, 0.261913333, 265.121510172, 23.598932153, 366349.94, 0.271724028, 0.2592956, 118.7801, 61.0991, 1, 9639.691454],
  [317.186599154, -12.243866592, 15219090337e-2, 0.261913194, 265.946859783, 22.691372291, 366460.035, 0.271642361, 0.2596173, 118.7381, 61.1411, 1, 9639.691357],
  [318.17452534, -12.870016382, 1521909484e-1, 0.261913194, 266.765472559, 21.78312709, 366570.846, 0.271560278, 0.2599414, 118.6957, 61.1834, 1, 9639.69126],
  [319.172800531, -13.484146557, 15219099195e-2, 0.261913056, 267.577875393, 20.874386546, 366682.332, 0.271477639, 0.2602679, 118.6531, 61.2259, 1, 9639.691163],
  [320.181526051, -14.08594379, 15219103398e-2, 0.261913056, 268.384578821, 19.965336041, 366794.452, 0.271394722, 0.2605969, 118.6102, 61.2688, 1, 9639.691067],
  [321.200787652, -14.675091587, 15219107447e-2, 0.261912917, 269.186078147, 19.056156697, 366907.163, 0.27131125, 0.2609282, 118.5669, 61.3119, 1, 9639.69097],
  [322.230654505, -15.251270637, 15219111338e-2, 0.261912917, 269.982854411, 18.147025841, 367020.424, 0.271227639, 0.261262, 118.5234, 61.3554, 1, 9639.690873],
  [323.271178177, -15.814159209, 15219115069e-2, 0.261912778, 270.775375373, 17.238117417, 367134.192, 0.271143472, 0.2615982, 118.4795, 61.3991, 1, 9639.690776],
  [324.322391774, -16.363433684, 15219118636e-2, 0.261912778, 271.564096443, 16.329602313, 367248.426, 0.271059167, 0.2619369, 118.4354, 61.4432, 1, 9639.690679],
  [325.384308743, -16.89876894, 15219122037e-2, 0.261912639, 272.34946148, 15.421648858, 367363.082, 0.270974583, 0.262278, 118.3909, 61.4876, 1, 9639.690582],
  [326.456922019, -17.419838971, 15219125268e-2, 0.261912639, 273.13190367, 14.514423113, 367478.118, 0.270889722, 0.2626216, 118.3462, 61.5322, 1, 9639.690485],
  [327.540202988, -17.92631743, 15219128329e-2, 0.261912639, 273.911846327, 13.608089221, 367593.491, 0.270804722, 0.2629677, 118.3011, 61.5772, 1, 9639.690388],
  [328.634100696, -18.417878331, 15219131215e-2, 0.2619125, 274.68970368, 12.70280969, 367709.158, 0.270719583, 0.2633162, 118.2558, 61.6224, 1, 9639.690291],
  [329.738540726, -18.894196611, 15219133925e-2, 0.2619125, 275.465881516, 11.798745819, 367825.076, 0.270634167, 0.2636673, 118.2101, 61.668, 1, 9639.690194],
  [330.853424495, -19.354948909, 15219136455e-2, 0.2619125, 276.24077789, 10.896057964, 367941.202, 0.27054875, 0.2640208, 118.1642, 61.7139, 1, 9639.690097],
  [331.978628428, -19.799814302, 15219138804e-2, 0.261912361, 277.014783834, 9.994905803, 368057.493, 0.270463333, 0.2643767, 118.1179, 61.7601, 1, 9639.69],
  [333.114003204, -20.228475077, 1521914097e-1, 0.261912361, 277.78828391, 9.095448693, 368173.905, 0.270377778, 0.2647352, 118.0713, 61.8065, 1, 9639.689903],
  [334.259373284, -20.640617613, 1521914295e-1, 0.261912361, 278.561656917, 8.197845826, 368290.395, 0.270292361, 0.2650961, 118.0245, 61.8533, 1, 9639.689806],
  [335.414536152, -21.035933148, 15219144742e-2, 0.261912361, 279.335276295, 7.302256693, 368406.92, 0.270206806, 0.2654595, 117.9773, 61.9004, 1, 9639.68971],
  [336.579262053, -21.414118724, 15219146344e-2, 0.261912222, 280.109510775, 6.408841227, 368523.437, 0.270121389, 0.2658254, 117.9298, 61.9477, 1, 9639.689613],
  [337.753293625, -21.774878069, 15219147755e-2, 0.261912222, 280.884724825, 5.517760138, 368639.902, 0.270035972, 0.2661937, 117.8821, 61.9954, 1, 9639.689516],
  [338.9363459, -22.117922573, 15219148973e-2, 0.261912222, 281.661279249, 4.629175049, 368756.272, 0.269950833, 0.2665645, 117.834, 62.0434, 1, 9639.689419],
  [340.128106066, -22.44297216, 15219149995e-2, 0.261912222, 282.439531482, 3.74324893, 368872.505, 0.269865694, 0.2669377, 117.7857, 62.0916, 1, 9639.689322],
  [341.328233773, -22.749756286, 15219150821e-2, 0.261912222, 283.219836092, 2.860146267, 368988.556, 0.269780833, 0.2673134, 117.737, 62.1402, 1, 9639.689225],
  [342.536361413, -23.038014884, 15219151449e-2, 0.261912222, 284.002545219, 1.980033292, 369104.384, 0.26969625, 0.2676915, 117.6881, 62.1891, 1, 9639.689128],
  [343.752094577, -23.307499301, 15219151877e-2, 0.261912222, 284.788008894, 1.10307829, 369219.945, 0.269611806, 0.2680721, 117.6388, 62.2382, 1, 9639.689031],
  [344.975012888, -23.557973271, 15219152105e-2, 0.261912222, 285.576575474, 0.229451752, 369335.198, 0.269527639, 0.268455, 117.5893, 62.2876, 1, 9639.688934],
  [346.204670616, -23.789213782, 1521915213e-1, 0.261912222, 286.368591874, -0.640673255, 369450.098, 0.269443889, 0.2688404, 117.5395, 62.3374, 1, 9639.688837],
  [347.440597887, -24.001011999, 15219151952e-2, 0.261912222, 287.164403907, -1.507120905, 369564.605, 0.269360417, 0.2692281, 117.4894, 62.3874, 1, 9639.68874],
  [348.682301829, -24.193174109, 1521915157e-1, 0.261912222, 287.964356549, -2.369712343, 369678.676, 0.269277222, 0.2696183, 117.439, 62.4377, 1, 9639.688643],
  [349.929268147, -24.365522153, 15219150982e-2, 0.261912222, 288.768794283, -3.228265547, 369792.27, 0.269194583, 0.2700107, 117.3883, 62.4882, 1, 9639.688546],
  [351.180962465, -24.517894759, 15219150189e-2, 0.261912222, 289.57806117, -4.082594921, 369905.344, 0.269112222, 0.2704056, 117.3374, 62.5391, 1, 9639.688449],
  [352.436832246, -24.650147865, 15219149189e-2, 0.261912222, 290.392501109, -4.932511139, 370017.857, 0.269030417, 0.2708027, 117.2862, 62.5902, 1, 9639.688352],
  [353.696308658, -24.762155359, 15219147981e-2, 0.261912222, 291.212458012, -5.777820903, 370129.769, 0.268949028, 0.2712022, 117.2347, 62.6416, 1, 9639.688256],
  [354.958808593, -24.853809641, 15219146566e-2, 0.261912222, 292.038275886, -6.618326661, 370241.039, 0.268868194, 0.271604, 117.1829, 62.6933, 1, 9639.688159],
  [356.223737016, -24.92502213, 15219144942e-2, 0.261912361, 292.870299059, -7.453826493, 370351.625, 0.268787917, 0.272008, 117.1309, 62.7452, 1, 9639.688062],
  [357.490489002, -24.975723653, 1521914311e-1, 0.261912361, 293.708872031, -8.28411367, 370461.489, 0.268708194, 0.2724143, 117.0786, 62.7974, 1, 9639.687965],
  [358.758452291, -25.005864779, 15219141068e-2, 0.261912361, 294.554339643, -9.108976557, 370570.59, 0.268629167, 0.2728229, 117.026, 62.8499, 1, 9639.687868],
  [0.027009653, -25.01541605, 15219138818e-2, 0.261912361, 295.407047002, -9.92819832, 370678.888, 0.268550694, 0.2732336, 116.9732, 62.9026, 1, 9639.687771],
  [1.295541555, -25.004368119, 15219136358e-2, 0.2619125, 296.267339508, -10.741556783, 370786.346, 0.268472778, 0.2736465, 116.9201, 62.9556, 1, 9639.687674],
  [2.563428426, -24.972731792, 15219133689e-2, 0.2619125, 297.135562599, -11.548824048, 370892.923, 0.268395694, 0.2740616, 116.8667, 63.0089, 1, 9639.687577],
  [3.830053348, -24.920537979, 15219130812e-2, 0.2619125, 298.012061721, -12.349766381, 370998.583, 0.268319167, 0.2744788, 116.8132, 63.0624, 1, 9639.68748],
  [5.094804507, -24.847837546, 15219127725e-2, 0.261912639, 298.897182049, -13.144143944, 371103.286, 0.268243472, 0.2748982, 116.7593, 63.1161, 1, 9639.687383],
  [6.357077599, -24.754701086, 15219124431e-2, 0.261912639, 299.791268255, -13.931710578, 371206.996, 0.268168611, 0.2753196, 116.7052, 63.1701, 1, 9639.687286],
  [7.616278372, -24.641218568, 15219120928e-2, 0.261912778, 300.694664255, -14.712213674, 371309.676, 0.268094444, 0.2757431, 116.6509, 63.2243, 1, 9639.687189],
  [8.871824664, -24.507498949, 15219117218e-2, 0.261912778, 301.607712693, -15.48539384, 371411.288, 0.268021111, 0.2761687, 116.5964, 63.2788, 1, 9639.687092],
  [10.123148741, -24.353669658, 15219113302e-2, 0.261912778, 302.530754574, -16.250984793, 371511.798, 0.267948611, 0.2765962, 116.5416, 63.3334, 1, 9639.686995],
  [11.369699257, -24.179876035, 15219109179e-2, 0.261912917, 303.464128711, -17.008713146, 371611.17, 0.267876944, 0.2770257, 116.4866, 63.3883, 1, 9639.686898],
  [12.610943327, -23.986280657, 15219104851e-2, 0.261913056, 304.40817127, -17.758298352, 371709.369, 0.267806111, 0.2774572, 116.4314, 63.4435, 1, 9639.686802],
  [13.846368017, -23.773062668, 1521910032e-1, 0.261913056, 305.363214879, -18.499452382, 371806.36, 0.26773625, 0.2778905, 116.3759, 63.4988, 1, 9639.686705],
  [15.075482084, -23.540416986, 15219095585e-2, 0.261913194, 306.329588004, -19.231879707, 371902.109, 0.267667361, 0.2783258, 116.3203, 63.5544, 1, 9639.686608],
  [16.297817332, -23.288553494, 15219090648e-2, 0.261913194, 307.307614117, -19.955277178, 371996.584, 0.267599306, 0.2787629, 116.2644, 63.6102, 1, 9639.686511],
  [17.512929792, -23.017696187, 1521908551e-1, 0.261913333, 308.297610677, -20.669333894, 372089.75, 0.267532361, 0.2792018, 116.2083, 63.6662, 1, 9639.686414],
  [18.72040091, -22.728082247, 15219080173e-2, 0.261913472, 309.29988831, -21.373731268, 372181.577, 0.267466389, 0.2796425, 116.152, 63.7223, 1, 9639.686317],
  [19.919838149, -22.419961174, 15219074638e-2, 0.261913472, 310.314749414, -22.068142828, 372272.033, 0.267401389, 0.2800849, 116.0956, 63.7787, 1, 9639.68622],
  [21.110875817, -22.093593816, 15219068906e-2, 0.261913611, 311.34248714, -22.752234346, 372361.086, 0.267337361, 0.2805291, 116.0389, 63.8353, 1, 9639.686123],
  [22.293175459, -21.749251434, 15219062979e-2, 0.26191375, 312.383383962, -23.425663819, 372448.707, 0.267274583, 0.2809749, 115.9821, 63.8921, 1, 9639.686026],
  [23.466426332, -21.387214707, 15219056859e-2, 0.26191375, 313.437710394, -24.088081643, 372534.865, 0.267212639, 0.2814224, 115.925, 63.949, 1, 9639.685929],
  [24.6303453, -21.007772846, 15219050548e-2, 0.261913889, 314.50572329, -24.739130623, 372619.531, 0.267151944, 0.2818715, 115.8678, 64.0061, 1, 9639.685832],
  [25.784676978, -20.611222609, 15219044047e-2, 0.261914028, 315.587664317, -25.378446228, 372702.677, 0.267092361, 0.2823221, 115.8104, 64.0634, 1, 9639.685735],
  [26.929193529, -20.197867384, 15219037358e-2, 0.261914167, 316.683758196, -26.005656806, 372784.276, 0.267033889, 0.2827743, 115.7529, 64.1209, 1, 9639.685638],
  [28.063694322, -19.768016293, 15219030484e-2, 0.261914306, 317.794210874, -26.62038386, 372864.3, 0.266976667, 0.2832279, 115.6952, 64.1785, 1, 9639.685541],
  [29.188005666, -19.321983257, 15219023426e-2, 0.261914444, 318.919207724, -27.222242481, 372942.722, 0.266920417, 0.283683, 115.6373, 64.2362, 1, 9639.685445],
  [30.301980038, -18.860086223, 15219016187e-2, 0.261914583, 320.058911316, -27.810841632, 373019.518, 0.266865556, 0.2841395, 115.5793, 64.2942, 1, 9639.685348],
  [31.405495608, -18.38264629, 1521900877e-1, 0.261914583, 321.213459551, -28.385784747, 373094.661, 0.266811806, 0.2845974, 115.5212, 64.3522, 1, 9639.685251],
  [32.49845544, -17.889986951, 15219001176e-2, 0.261914722, 322.382963329, -28.946670218, 373168.129, 0.266759306, 0.2850566, 115.4629, 64.4105, 1, 9639.685154],
  [33.580786845, -17.382433281, 15218993407e-2, 0.261914861, 323.567504694, -29.493092158, 373239.896, 0.266707917, 0.2855171, 115.4044, 64.4688, 1, 9639.685057],
  [34.652440308, -16.860311328, 15218985468e-2, 0.261915, 324.767134209, -30.024640968, 373309.941, 0.266657917, 0.2859788, 115.3459, 64.5273, 1, 9639.68496],
  [35.713388727, -16.323947383, 1521897736e-1, 0.261915139, 325.981869021, -30.540904256, 373378.242, 0.266609167, 0.2864417, 115.2872, 64.5859, 1, 9639.684863],
  [36.763626437, -15.773667368, 15218969085e-2, 0.261915278, 327.211690482, -31.041467675, 373444.776, 0.266561667, 0.2869058, 115.2284, 64.6446, 1, 9639.684766],
  [37.803168204, -15.209796278, 15218960648e-2, 0.261915417, 328.456542021, -31.525915914, 373509.525, 0.266515417, 0.287371, 115.1695, 64.7034, 1, 9639.684669],
  [38.832048381, -14.632657564, 15218952049e-2, 0.261915556, 329.716327191, -31.993833826, 373572.466, 0.266470556, 0.2878373, 115.1104, 64.7624, 1, 9639.684572],
  [39.850319697, -14.042572753, 15218943294e-2, 0.261915833, 330.990907288, -32.444807461, 373633.583, 0.266426944, 0.2883046, 115.0513, 64.8214, 1, 9639.684475],
  [40.858052408, -13.439860919, 15218934384e-2, 0.261915972, 332.280099743, -32.878425389, 373692.857, 0.266384722, 0.2887728, 114.9921, 64.8805, 1, 9639.684378],
  [41.855333237, -12.824838308, 15218925323e-2, 0.261916111, 333.583676218, -33.294279977, 373750.27, 0.26634375, 0.289242, 114.9328, 64.9398, 1, 9639.684281],
  [42.842264538, -12.197817885, 15218916114e-2, 0.26191625, 334.901361271, -33.691968837, 373805.805, 0.266304167, 0.2897121, 114.8734, 64.9991, 1, 9639.684184],
  [43.81896314, -11.559109126, 1521890676e-1, 0.261916389, 336.232830747, -34.071096203, 373859.448, 0.266265972, 0.290183, 114.8139, 65.0585, 1, 9639.684087],
  [44.785559558, -10.909017637, 15218897264e-2, 0.261916528, 337.577710996, -34.431274516, 373911.182, 0.266229167, 0.2906547, 114.7544, 65.1179, 1, 9639.683991],
  [45.742197057, -10.247844916, 15218887631e-2, 0.261916667, 338.935577975, -34.772125977, 373960.994, 0.266193611, 0.2911272, 114.6948, 65.1775, 1, 9639.683894],
  [46.689030766, -9.575888149, 15218877862e-2, 0.261916944, 340.305956922, -35.093284162, 374008.87, 0.266159583, 0.2916004, 114.6351, 65.2371, 1, 9639.683797],
  [47.626226972, -8.893439931, 15218867963e-2, 0.261917083, 341.68832248, -35.394395702, 374054.798, 0.266126944, 0.2920742, 114.5754, 65.2967, 1, 9639.6837],
  [48.553962145, -8.200788233, 15218857935e-2, 0.261917222, 343.082098803, -35.675121885, 374098.767, 0.266095694, 0.2925486, 114.5156, 65.3564, 1, 9639.683603],
  [49.472422326, -7.498216182, 15218847784e-2, 0.261917361, 344.486660557, -35.935140355, 374140.765, 0.266065694, 0.2930236, 114.4558, 65.4161, 1, 9639.683506],
  [50.381802357, -6.786002003, 15218837513e-2, 0.261917639, 345.901334159, -36.174146738, 374180.782, 0.266037361, 0.2934991, 114.3959, 65.4759, 1, 9639.683409],
  [51.282305354, -6.064418839, 15218827125e-2, 0.261917778, 347.325399591, -36.391856278, 374218.81, 0.266010278, 0.2939751, 114.3361, 65.5357, 1, 9639.683312],
  [52.174141905, -5.333734839, 15218816624e-2, 0.261917917, 348.758092416, -36.588005345, 374254.839, 0.265984722, 0.2944515, 114.2762, 65.5955, 1, 9639.683215],
  [53.057529633, -4.59421303, 15218806014e-2, 0.261918194, 350.198606575, -36.76235295, 374288.864, 0.265960417, 0.2949282, 114.2162, 65.6554, 1, 9639.683118],
  [53.932692641, -3.846111325, 15218795299e-2, 0.261918333, 351.646097487, -36.91468213, 374320.876, 0.265937778, 0.2954053, 114.1563, 65.7152, 1, 9639.683021],
  [54.799861014, -3.089682551, 15218784484e-2, 0.261918472, 353.099685541, -37.04480123, 374350.871, 0.265916389, 0.2958827, 114.0964, 65.7751, 1, 9639.682924],
  [55.6592705, -2.325174373, 15218773571e-2, 0.26191875, 354.558460279, -37.152545077, 374378.843, 0.265896528, 0.2963602, 114.0364, 65.835, 1, 9639.682827],
  [56.511161957, -1.552829483, 15218762565e-2, 0.261918889, 356.021484433, -37.23777598, 374404.788, 0.265878194, 0.296838, 113.9765, 65.8948, 1, 9639.68273],
  [57.355781124, -0.772885551, 15218751471e-2, 0.261919028, 357.487798767, -37.300384607, 374428.704, 0.265861111, 0.2973158, 113.9166, 65.9547, 1, 9639.682634],
  [58.193378273, 0.014424656, 15218740291e-2, 0.261919306, 358.956426993, -37.34029067, 374450.588, 0.265845556, 0.2977937, 113.8567, 66.0145, 1, 9639.682537],
  [59.024208068, 0.808873305, 15218729031e-2, 0.261919444, 0.426381017, -37.357443463, 374470.439, 0.265831528, 0.2982717, 113.7968, 66.0743, 1, 9639.68244],
  [59.848529178, 1.610237242, 15218717695e-2, 0.261919722, 1.896666058, -37.351822168, 374488.256, 0.265818889, 0.2987496, 113.7369, 66.1341, 1, 9639.682343],
  [60.666604228, 2.418298001, 15218706287e-2, 0.261919861, 3.366286183, -37.323436015, 374504.039, 0.265807639, 0.2992275, 113.6771, 66.1939, 1, 9639.682246],
  [61.47869964, 3.232841672, 15218694811e-2, 0.26192, 4.834249682, -37.272324221, 374517.791, 0.265797917, 0.2997052, 113.6174, 66.2536, 1, 9639.682149],
  [62.285085514, 4.053658747, 15218683271e-2, 0.261920278, 6.299574388, -37.198555753, 374529.512, 0.265789583, 0.3001828, 113.5576, 66.3132, 1, 9639.682052],
  [63.086035691, 4.880544111, 15218671672e-2, 0.261920417, 7.761293103, -37.102228878, 374539.206, 0.265782639, 0.3006602, 113.498, 66.3728, 1, 9639.681955],
  [63.881827575, 5.713296741, 15218660019e-2, 0.261920694, 9.218458347, -36.983470574, 374546.877, 0.265777222, 0.3011372, 113.4384, 66.4324, 1, 9639.681858],
  [64.672742277, 6.551719677, 15218648315e-2, 0.261920833, 10.670147355, -36.842435727, 374552.529, 0.265773194, 0.301614, 113.3788, 66.4918, 1, 9639.681761],
  [65.459064621, 7.395619818, 15218636565e-2, 0.261921111, 12.115466521, -36.679306176, 374556.168, 0.265770694, 0.3020904, 113.3194, 66.5512, 1, 9639.681664],
  [66.241083359, 8.244807887, 15218624773e-2, 0.26192125, 13.553555643, -36.494289627, 374557.801, 0.265769444, 0.3025664, 113.26, 66.6106, 1, 9639.681567],
  [67.019091153, 9.099098099, 15218612944e-2, 0.261921389, 14.983591476, -36.287618422, 374557.434, 0.265769722, 0.3030419, 113.2007, 66.6698, 1, 9639.68147],
  [67.793384864, 9.958308117, 15218601083e-2, 0.261921667, 16.404791204, -36.059548192, 374555.076, 0.265771389, 0.3035169, 113.1415, 66.729, 1, 9639.681373],
  [68.564265743, 10.82225885, 15218589194e-2, 0.261921806, 17.816415277, -35.810356415, 374550.736, 0.265774583, 0.3039914, 113.0824, 66.788, 1, 9639.681276],
  [69.332039667, 11.690774254, 15218577281e-2, 0.261922083, 19.217769779, -35.540340905, 374544.424, 0.265779028, 0.3044652, 113.0233, 66.847, 1, 9639.68118],
  [70.09701754, 12.563681272, 15218565349e-2, 0.261922222, 20.60820856, -35.249818191, 374536.15, 0.265784861, 0.3049384, 112.9644, 66.9058, 1, 9639.681083],
  [70.859515479, 13.440809473, 15218553403e-2, 0.2619225, 21.987134474, -34.939121929, 374525.926, 0.265792083, 0.3054109, 112.9056, 66.9646, 1, 9639.680986],
  [71.6198553, 14.321990981, 15218541446e-2, 0.261922639, 23.354000507, -34.608601252, 374513.764, 0.265800694, 0.3058826, 112.847, 67.0232, 1, 9639.680889],
  [72.378364892, 15.207060225, 15218529484e-2, 0.261922917, 24.70831036, -34.258619092, 374499.678, 0.265810694, 0.3063536, 112.7884, 67.0817, 1, 9639.680792],
  [73.13537879, 16.095853854, 15218517522e-2, 0.261923056, 26.049618758, -33.889550497, 374483.681, 0.265822083, 0.3068237, 112.73, 67.1401, 1, 9639.680695],
  [73.891238544, 16.988210357, 15218505562e-2, 0.261923333, 27.377530951, -33.501781079, 374465.789, 0.265834861, 0.3072929, 112.6717, 67.1983, 1, 9639.680598],
  [74.646293385, 17.883969967, 15218493611e-2, 0.261923472, 28.691702333, -33.095705366, 374446.016, 0.265848889, 0.3077612, 112.6135, 67.2564, 1, 9639.680501],
  [75.400900826, 18.782974414, 15218481673e-2, 0.26192375, 29.991837484, -32.671725272, 374424.381, 0.265864167, 0.3082285, 112.5555, 67.3144, 1, 9639.680404],
  [76.155427309, 19.685066665, 15218469752e-2, 0.261923889, 31.277688976, -32.230248607, 374400.899, 0.265880833, 0.3086948, 112.4977, 67.3722, 1, 9639.680307],
  [76.910249044, 20.590090812, 15218457852e-2, 0.261924167, 32.549056034, -31.771687633, 374375.59, 0.265898889, 0.30916, 112.44, 67.4298, 1, 9639.68021],
  [77.665752657, 21.497891644, 15218445979e-2, 0.261924306, 33.805782691, -31.29645777, 374348.471, 0.265918194, 0.3096241, 112.3825, 67.4873, 1, 9639.680113],
  [78.422336157, 22.408314512, 15218434136e-2, 0.261924583, 35.047756131, -30.804976262, 374319.563, 0.265938611, 0.310087, 112.3251, 67.5446, 1, 9639.680016],
  [79.180409821, 23.321205002, 15218422329e-2, 0.261924722, 36.274904567, -30.297661074, 374288.887, 0.265960417, 0.3105488, 112.2679, 67.6018, 1, 9639.679919],
  [79.940397316, 24.236408777, 15218410561e-2, 0.261925, 37.487195419, -29.774929649, 374256.462, 0.265983472, 0.3110093, 112.2109, 67.6587, 1, 9639.679823],
  [80.702736643, 25.153771103, 15218398838e-2, 0.261925139, 38.684632824, -29.237198068, 374222.312, 0.266007778, 0.3114685, 112.1541, 67.7155, 1, 9639.679726],
  [81.467881429, 26.073136655, 15218387163e-2, 0.261925278, 39.867255661, -28.684880004, 374186.459, 0.266033333, 0.3119264, 112.0974, 67.7721, 1, 9639.679629],
  [82.236302193, 26.994349169, 15218375541e-2, 0.261925556, 41.035135289, -28.118385895, 374148.926, 0.26606, 0.3123829, 112.041, 67.8285, 1, 9639.679532],
  [83.00848771, 27.917251055, 15218363976e-2, 0.261925694, 42.188373225, -27.538122258, 374109.739, 0.266087778, 0.312838, 111.9847, 67.8848, 1, 9639.679435],
  [83.784946624, 28.841683164, 15218352472e-2, 0.261925972, 43.327099175, -26.944490873, 374068.921, 0.266116806, 0.3132917, 111.9286, 67.9408, 1, 9639.679338],
  [84.566208928, 29.767484201, 15218341035e-2, 0.261926111, 44.451468587, -26.337888354, 374026.499, 0.266147083, 0.3137438, 111.8728, 67.9966, 1, 9639.679241],
  [85.352827838, 30.694490439, 15218329668e-2, 0.261926389, 45.561660756, -25.718705518, 373982.499, 0.266178333, 0.3141945, 111.8172, 68.0522, 1, 9639.679144],
  [86.145381655, 31.622535205, 15218318376e-2, 0.261926528, 46.657876682, -25.087326996, 373936.948, 0.266210833, 0.3146436, 111.7617, 68.1076, 1, 9639.679047],
  [86.944475954, 32.551448525, 15218307162e-2, 0.261926667, 47.74033728, -24.444130768, 373889.874, 0.266244306, 0.315091, 111.7065, 68.1628, 1, 9639.67895],
  [87.750745676, 33.481056425, 15218296031e-2, 0.261926944, 48.809281284, -23.789487988, 373841.305, 0.266278889, 0.3155369, 111.6515, 68.2177, 1, 9639.678853],
  [88.56485768, 34.411180491, 15218284987e-2, 0.261927083, 49.864963659, -23.123762611, 373791.27, 0.266314583, 0.315981, 111.5968, 68.2724, 1, 9639.678756],
  [89.387513374, 35.341637241, 15218274034e-2, 0.261927222, 50.907653861, -22.447311249, 373739.8, 0.26635125, 0.3164235, 111.5423, 68.3269, 1, 9639.678659],
  [90.219451566, 36.272237438, 15218263176e-2, 0.2619275, 51.937634237, -21.760483046, 373686.924, 0.266388889, 0.3168642, 111.488, 68.3812, 1, 9639.678562],
  [91.061451707, 37.202785506, 15218252417e-2, 0.261927639, 52.955198724, -21.063619461, 373632.674, 0.266427639, 0.3173031, 111.4339, 68.4352, 1, 9639.678465],
  [91.914337124, 38.133078569, 15218241762e-2, 0.261927778, 53.960651273, -20.357054353, 373577.081, 0.266467222, 0.3177402, 111.3801, 68.489, 1, 9639.678369],
  [92.778978821, 39.062905736, 15218231213e-2, 0.261928056, 54.954304689, -19.641113918, 373520.178, 0.266507778, 0.3181754, 111.3266, 68.5425, 1, 9639.678272],
  [93.656299441, 39.992047115, 15218220776e-2, 0.261928194, 55.936479451, -18.916116703, 373461.997, 0.266549306, 0.3186088, 111.2733, 68.5958, 1, 9639.678175],
  [94.547277738, 40.920272933, 15218210453e-2, 0.261928333, 56.907502776, -18.18237356, 373402.572, 0.266591806, 0.3190403, 111.2202, 68.6488, 1, 9639.678078],
  [95.452953138, 41.847342239, 15218200248e-2, 0.261928611, 57.86770743, -17.440187915, 373341.937, 0.266635, 0.3194698, 111.1674, 68.7016, 1, 9639.677981],
  [96.374430996, 42.773001817, 15218190165e-2, 0.26192875, 58.817431027, -16.689855714, 373280.127, 0.266679167, 0.3198973, 111.1149, 68.7541, 1, 9639.677884],
  [97.312888141, 43.696984819, 15218180209e-2, 0.261928889, 59.757015156, -15.931665651, 373217.176, 0.266724167, 0.3203229, 111.0626, 68.8063, 1, 9639.677787],
  [98.269578892, 44.619009262, 15218170381e-2, 0.261929028, 60.686804711, -15.165899258, 373153.12, 0.26677, 0.3207464, 111.0106, 68.8583, 1, 9639.67769],
  [99.245841726, 45.538776527, 15218160686e-2, 0.261929306, 61.607147362, -14.392831015, 373087.996, 0.266816528, 0.3211678, 110.9589, 68.91, 1, 9639.677593],
  [100.243106159, 46.45596938, 15218151128e-2, 0.261929444, 62.518392808, -13.612728701, 373021.84, 0.266863889, 0.3215872, 110.9074, 68.9614, 1, 9639.677496],
  [101.262900503, 47.370250118, 15218141709e-2, 0.261929583, 63.420892491, -12.825853405, 372954.689, 0.266911944, 0.3220045, 110.8562, 69.0126, 1, 9639.677399],
  [102.306859997, 48.281258311, 15218132433e-2, 0.261929722, 64.314999057, -12.032459886, 372886.581, 0.266960694, 0.3224196, 110.8053, 69.0635, 1, 9639.677302],
  [103.37673575, 49.1886085, 15218123304e-2, 0.261929861, 65.201066185, -11.232796608, 372817.553, 0.267010139, 0.3228326, 110.7547, 69.1141, 1, 9639.677205],
  [104.474403912, 50.091887325, 15218114323e-2, 0.26193, 66.07944812, -10.427106144, 372747.645, 0.267060139, 0.3232434, 110.7044, 69.1644, 1, 9639.677108],
  [105.601875784, 50.990650672, 15218105495e-2, 0.261930139, 66.950499565, -9.615625292, 372676.895, 0.267110833, 0.323652, 110.6543, 69.2144, 1, 9639.677012],
  [106.761308288, 51.884420347, 15218096823e-2, 0.261930278, 67.81457548, -8.798585353, 372605.342, 0.267162222, 0.3240583, 110.6046, 69.2642, 1, 9639.676915],
  [107.955014906, 52.772680396, 15218088309e-2, 0.261930417, 68.672030927, -7.976212404, 372533.027, 0.267214028, 0.3244625, 110.5551, 69.3136, 1, 9639.676818],
  [109.185477186, 53.654873189, 15218079956e-2, 0.261930694, 69.523221144, -7.148727382, 372459.988, 0.267266389, 0.3248643, 110.5059, 69.3628, 1, 9639.676721],
  [110.455356043, 54.530394782, 15218071768e-2, 0.261930833, 70.368501302, -6.316346561, 372386.267, 0.267319306, 0.3252639, 110.457, 69.4116, 1, 9639.676624],
  [111.767503411, 55.398590119, 15218063746e-2, 0.261930972, 71.208226664, -5.479281645, 372311.904, 0.267372778, 0.3256613, 110.4084, 69.4602, 1, 9639.676527],
  [113.12497329, 56.258747567, 15218055894e-2, 0.261931111, 72.042752555, -4.637740112, 372236.94, 0.267426528, 0.3260562, 110.3601, 69.5085, 1, 9639.67643],
  [114.531032215, 57.110093099, 15218048213e-2, 0.261931111, 72.872434578, -3.791925326, 372161.417, 0.267480833, 0.3264489, 110.3122, 69.5565, 1, 9639.676333],
  [115.989167846, 57.951783648, 15218040708e-2, 0.26193125, 73.697628559, -2.942036981, 372085.377, 0.267535556, 0.3268393, 110.2645, 69.6042, 1, 9639.676236],
  [117.503095768, 58.782900196, 15218033379e-2, 0.261931389, 74.518690815, -2.088271232, 372008.86, 0.267590556, 0.3272272, 110.2171, 69.6515, 1, 9639.676139],
  [119.076762786, 59.602440166, 15218026229e-2, 0.261931528, 75.335978316, -1.230820984, 371931.91, 0.267645833, 0.3276129, 110.17, 69.6986, 1, 9639.676042],
  [120.714345601, 60.409309304, 15218019261e-2, 0.261931667, 76.149848852, -0.369876207, 371854.569, 0.267701528, 0.3279961, 110.1232, 69.7454, 1, 9639.675945],
  [122.420243476, 61.202313251, 15218012477e-2, 0.261931806, 76.960661401, 0.494375951, 371776.879, 0.2677575, 0.328377, 110.0767, 69.7918, 1, 9639.675848],
  [124.199061979, 61.980148517, 15218005878e-2, 0.261931944, 77.768776229, 1.361750715, 371698.883, 0.26781375, 0.3287555, 110.0305, 69.838, 1, 9639.675751],
  [126.055586373, 62.741393575, 15217999467e-2, 0.261932083, 78.574555292, 2.232065532, 371620.624, 0.267870139, 0.3291315, 109.9847, 69.8839, 1, 9639.675654],
  [127.994740737, 63.484499931, 15217993245e-2, 0.261932083, 79.378362499, 3.105139743, 371542.145, 0.267926667, 0.3295052, 109.9391, 69.9294, 1, 9639.675558],
  [130.021530043, 64.207783844, 15217987215e-2, 0.261932222, 80.180564173, 3.980794452, 371463.49, 0.267983472, 0.3298765, 109.8939, 69.9747, 1, 9639.675461],
  [132.14096023, 64.909418813, 15217981377e-2, 0.261932361, 80.981529233, 4.858852028, 371384.702, 0.268040278, 0.3302453, 109.8489, 70.0196, 1, 9639.675364],
  [134.357933394, 65.587430011, 15217975734e-2, 0.261932361, 81.781629726, 5.739136015, 371305.824, 0.268097222, 0.3306118, 109.8043, 70.0642, 1, 9639.675267],
  [136.677112992, 66.239691131, 15217970287e-2, 0.2619325, 82.581241181, 6.621470758, 371226.9, 0.268154167, 0.3309758, 109.7599, 70.1086, 1, 9639.67517],
  [139.102755724, 66.86392484, 15217965038e-2, 0.261932639, 83.380743052, 7.50568115, 371147.973, 0.26821125, 0.3313374, 109.7159, 70.1526, 1, 9639.675073],
  [141.638508144, 67.457708157, 15217959987e-2, 0.261932639, 84.180519255, 8.391592403, 371069.088, 0.268268194, 0.3316966, 109.6722, 70.1963, 1, 9639.674976],
  [144.287166561, 68.018483877, 15217955137e-2, 0.261932778, 84.980958521, 9.279029642, 370990.287, 0.268325278, 0.3320533, 109.6288, 70.2397, 1, 9639.674879],
  [147.050405058, 68.543579896, 15217950487e-2, 0.261932917, 85.782454978, 10.167817652, 370911.615, 0.268382083, 0.3324077, 109.5857, 70.2828, 1, 9639.674782],
  [149.928478243, 69.030237575, 1521794604e-1, 0.261932917, 86.58540866, 11.057780579, 370833.116, 0.268438889, 0.3327596, 109.5429, 70.3256, 1, 9639.674685],
  [152.919913747, 69.475650537, 15217941796e-2, 0.261933056, 87.390226156, 11.948741706, 370754.832, 0.268495694, 0.3331092, 109.5004, 70.3681, 1, 9639.674588],
  [156.021213733, 69.877014318, 15217937755e-2, 0.261933056, 88.197321011, 12.840522925, 370676.808, 0.268552083, 0.3334563, 109.4582, 70.4103, 1, 9639.674491],
  [159.226594976, 70.231587104, 1521793392e-1, 0.261933194, 89.007114469, 13.732944576, 370599.086, 0.268608472, 0.333801, 109.4163, 70.4522, 1, 9639.674394],
  [162.527799076, 70.536760058, 15217930289e-2, 0.261933194, 89.820036048, 14.625825044, 370521.712, 0.268664583, 0.3341434, 109.3747, 70.4938, 1, 9639.674297],
  [165.914008384, 70.790134764, 15217926865e-2, 0.261933333, 90.636524174, 15.518980369, 370444.727, 0.268720417, 0.3344834, 109.3334, 70.535, 1, 9639.6742],
  [169.371900366, 70.989603816, 15217923647e-2, 0.261933333, 91.457026983, 16.412224043, 370368.175, 0.268775972, 0.334821, 109.2924, 70.576, 1, 9639.674104],
  [172.885861381, 71.133429153, 15217920635e-2, 0.261933333, 92.282002825, 17.305366378, 370292.099, 0.268831111, 0.3351563, 109.2517, 70.6167, 1, 9639.674007],
  [176.438369022, 71.220312203, 15217917831e-2, 0.261933472, 93.111921136, 18.1982143, 370216.542, 0.268885972, 0.3354892, 109.2112, 70.6571, 1, 9639.67391],
  [180.010527475, 71.249449548, 15217915233e-2, 0.261933472, 93.947263122, 19.090570838, 370141.546, 0.268940556, 0.3358198, 109.1711, 70.6973, 1, 9639.673813],
  [183.582721799, 71.220568799, 15217912842e-2, 0.261933472, 94.788522642, 19.982234823, 370067.154, 0.268994583, 0.3361481, 109.1313, 70.7371, 1, 9639.673716],
  [187.135335429, 71.133941, 15217910659e-2, 0.261933611, 95.636206865, 20.87300028, 369993.409, 0.269048194, 0.3364742, 109.0918, 70.7766, 1, 9639.673619],
  [190.649468999, 70.990368301, 15217908682e-2, 0.261933611, 96.490837166, 21.762656026, 369920.351, 0.26910125, 0.3367979, 109.0525, 70.8159, 1, 9639.673522],
  [194.107594347, 70.791148151, 15217906912e-2, 0.261933611, 97.352950004, 22.650985236, 369848.024, 0.269153889, 0.3371194, 109.0135, 70.8548, 1, 9639.673425],
  [197.494090475, 70.538017691, 15217905349e-2, 0.261933611, 98.223097696, 23.537764803, 369776.468, 0.269205972, 0.3374386, 108.9748, 70.8935, 1, 9639.673328],
  [200.795626453, 70.233083637, 15217903991e-2, 0.261933611, 99.101849467, 24.422764995, 369705.724, 0.2692575, 0.3377556, 108.9364, 70.9319, 1, 9639.673231],
  [204.001375787, 69.878743967, 15217902838e-2, 0.261933611, 99.989792148, 25.305748671, 369635.833, 0.269308472, 0.3380704, 108.8983, 70.9701, 1, 9639.673134],
  [207.103071296, 69.477607324, 1521790189e-1, 0.26193375, 100.887531201, 26.186470801, 369566.836, 0.26935875, 0.3383831, 108.8604, 71.0079, 1, 9639.673037],
  [210.094921368, 69.032415568, 15217901146e-2, 0.26193375, 101.79569159, 27.064677817, 369498.772, 0.269408333, 0.3386936, 108.8228, 71.0455, 1, 9639.67294],
  [212.973420972, 68.545973341, 15217900605e-2, 0.26193375, 102.714918797, 27.940107039, 369431.682, 0.269457222, 0.339002, 108.7855, 71.0829, 1, 9639.672843],
  [215.737090942, 68.021087453, 15217900267e-2, 0.26193375, 103.645879561, 28.812485837, 369365.605, 0.269505417, 0.3393083, 108.7484, 71.1199, 1, 9639.672747],
  [218.386180539, 67.460517037, 15217900129e-2, 0.26193375, 104.589262868, 29.68153099, 369300.578, 0.269552917, 0.3396125, 108.7116, 71.1567, 1, 9639.67265],
  [220.922359462, 66.866934794, 15217900191e-2, 0.26193375, 105.545780804, 30.546947939, 369236.642, 0.269599583, 0.3399147, 108.675, 71.1933, 1, 9639.672553],
  [223.348420627, 66.242898585, 15217900453e-2, 0.26193375, 106.516169322, 31.408429922, 369173.833, 0.269645417, 0.3402148, 108.6387, 71.2296, 1, 9639.672456],
  [225.668008082, 65.590832075, 15217900911e-2, 0.26193375, 107.501189139, 32.26565726, 369112.19, 0.269690556, 0.340513, 108.6027, 71.2656, 1, 9639.672359],
  [227.885376792, 64.913013292, 15217901566e-2, 0.26193375, 108.501626235, 33.118296316, 369051.749, 0.269734722, 0.3408092, 108.5668, 71.3015, 1, 9639.672262],
  [230.005189119, 64.211569229, 15217902415e-2, 0.26193375, 109.518292585, 33.965998701, 368992.546, 0.269777917, 0.3411035, 108.5313, 71.337, 1, 9639.672165],
  [232.032346522, 63.488475405, 15217903457e-2, 0.261933611, 110.552026537, 34.808400222, 368934.619, 0.269820278, 0.3413959, 108.4959, 71.3724, 1, 9639.672068],
  [233.971854981, 62.745558884, 1521790469e-1, 0.261933611, 111.603693311, 35.645120042, 368878.001, 0.269861667, 0.3416865, 108.4608, 71.4075, 1, 9639.671971],
  [235.828719428, 61.984504087, 15217906113e-2, 0.261933611, 112.6741849, 36.475759437, 368822.727, 0.269902222, 0.3419753, 108.4259, 71.4423, 1, 9639.671874],
  [237.607864402, 61.206860052, 15217907723e-2, 0.261933611, 113.764420161, 37.299900863, 368768.833, 0.269941667, 0.3422622, 108.3913, 71.477, 1, 9639.671777],
  [239.314075729, 60.414048834, 15217909519e-2, 0.261933611, 114.875344411, 38.117106801, 368716.352, 0.26998, 0.3425475, 108.3568, 71.5114, 1, 9639.67168],
  [240.951959657, 59.607374419, 15217911498e-2, 0.261933472, 116.007928752, 38.926918607, 368665.316, 0.270017361, 0.342831, 108.3226, 71.5457, 1, 9639.671583],
  [242.525916201, 58.788031623, 15217913659e-2, 0.261933472, 117.163169204, 39.728855483, 368615.758, 0.27005375, 0.3431128, 108.2886, 71.5797, 1, 9639.671486],
  [244.040122851, 57.957115122, 15217915999e-2, 0.261933472, 118.34208499, 40.522413096, 368567.709, 0.270088889, 0.343393, 108.2548, 71.6135, 1, 9639.671389],
  [245.498527215, 57.115627885, 15217918516e-2, 0.261933472, 119.545716748, 41.307062546, 368521.202, 0.270123056, 0.3436717, 108.2211, 71.6471, 1, 9639.671293],
  [246.904845633, 56.26448932, 15217921208e-2, 0.261933333, 120.775123907, 42.082249145, 368476.266, 0.270155972, 0.3439488, 108.1877, 71.6805, 1, 9639.671196],
  [248.262566684, 55.404542743, 15217924071e-2, 0.261933333, 122.031381619, 42.847391347, 368432.93, 0.270187778, 0.3442244, 108.1545, 71.7138, 1, 9639.671099],
  [249.574957518, 54.536562576, 15217927104e-2, 0.261933194, 123.315576551, 43.601879505, 368391.225, 0.270218333, 0.3444985, 108.1214, 71.7468, 1, 9639.671002],
  [250.845072899, 53.661260713, 15217930304e-2, 0.261933194, 124.62880223, 44.345074941, 368351.177, 0.270247639, 0.3447712, 108.0885, 71.7797, 1, 9639.670905],
  [252.075765443, 52.779292477, 15217933668e-2, 0.261933194, 125.972153157, 45.076308922, 368312.815, 0.270275833, 0.3450425, 108.0558, 71.8124, 1, 9639.670808],
  [253.269696705, 51.891262062, 15217937193e-2, 0.261933056, 127.346717958, 45.794881862, 368276.165, 0.270302778, 0.3453125, 108.0233, 71.8449, 1, 9639.670711],
  [254.429348833, 50.997727332, 15217940876e-2, 0.261933056, 128.753571464, 46.500062687, 368241.254, 0.270328333, 0.3455812, 107.9909, 71.8773, 1, 9639.670614],
  [255.55703587, 50.099204461, 15217944715e-2, 0.261932917, 130.193765096, 47.191088199, 368208.106, 0.270352639, 0.3458487, 107.9587, 71.9095, 1, 9639.670517],
  [256.654915257, 49.196171853, 15217948706e-2, 0.261932917, 131.668316375, 47.86716297, 368176.746, 0.270375694, 0.346115, 107.9266, 71.9416, 1, 9639.67042],
  [257.724998739, 48.289073849, 15217952847e-2, 0.261932778, 133.178196569, 48.527459283, 368147.198, 0.2703975, 0.3463802, 107.8946, 71.9735, 1, 9639.670323],
  [258.769163018, 47.378323903, 15217957133e-2, 0.261932778, 134.724317211, 49.171117643, 368119.484, 0.270417778, 0.3466442, 107.8629, 72.0053, 1, 9639.670226],
  [259.789159505, 46.464307745, 15217961563e-2, 0.261932639, 136.307514475, 49.79724742, 368093.626, 0.270436806, 0.3469072, 107.8312, 72.0369, 1, 9639.670129],
  [260.786623853, 45.547385947, 15217966132e-2, 0.261932639, 137.928532525, 50.404928218, 368069.646, 0.270454444, 0.3471692, 107.7996, 72.0684, 1, 9639.670032],
  [261.763084717, 44.627896379, 15217970837e-2, 0.2619325, 139.588005045, 50.99321162, 368047.564, 0.270470694, 0.3474303, 107.7682, 72.0998, 1, 9639.669936],
  [262.71997193, 43.706156433, 15217975675e-2, 0.261932361, 141.286435483, 51.561123633, 368027.399, 0.270485417, 0.3476905, 107.7369, 72.1311, 1, 9639.669839],
  [263.658624258, 42.782464883, 15217980643e-2, 0.261932361, 143.024176229, 52.107667788, 368009.169, 0.270498889, 0.3479498, 107.7057, 72.1623, 1, 9639.669742],
  [264.58029628, 41.857103864, 15217985736e-2, 0.261932222, 144.801406414, 52.63182886, 367992.893, 0.270510833, 0.3482084, 107.6746, 72.1934, 1, 9639.669645],
  [265.486165066, 40.930340374, 15217990951e-2, 0.261932222, 146.618109691, 53.132577543, 367978.587, 0.270521389, 0.3484662, 107.6436, 72.2244, 1, 9639.669548],
  [266.377336156, 40.002427803, 15217996284e-2, 0.261932083, 148.474051625, 53.608875829, 367966.267, 0.270530417, 0.3487233, 107.6127, 72.2553, 1, 9639.669451],
  [267.25484926, 39.073607152, 15218001732e-2, 0.261931944, 150.368757928, 54.059683323, 367955.949, 0.270537917, 0.3489797, 107.5819, 72.2861, 1, 9639.669354],
  [268.119683216, 38.14410843, 15218007291e-2, 0.261931944, 152.301493443, 54.483964298, 367947.645, 0.270544028, 0.3492356, 107.5511, 72.3169, 1, 9639.669257],
  [268.972760851, 37.214151636, 15218012957e-2, 0.261931806, 154.271243591, 54.880695654, 367941.37, 0.27054875, 0.349491, 107.5204, 72.3475, 1, 9639.66916],
  [269.814953309, 36.283947802, 15218018725e-2, 0.261931667, 156.276698553, 55.24887562, 367937.135, 0.270551806, 0.3497459, 107.4898, 72.3781, 1, 9639.669063],
  [270.647084034, 35.353699939, 15218024593e-2, 0.261931528, 158.316241169, 55.587533092, 367934.953, 0.270553472, 0.3500004, 107.4592, 72.4087, 1, 9639.668966],
  [271.469932581, 34.423603762, 15218030556e-2, 0.261931528, 160.387940019, 55.895737597, 367934.832, 0.270553472, 0.3502545, 107.4287, 72.4392, 1, 9639.668869],
  [272.284237846, 33.493848644, 1521803661e-1, 0.261931389, 162.489547147, 56.172609411, 367936.783, 0.270552083, 0.3505082, 107.3982, 72.4697, 1, 9639.668772],
  [273.090701309, 32.564618205, 15218042751e-2, 0.26193125, 164.618503133, 56.417330058, 367940.813, 0.270549167, 0.3507618, 107.3678, 72.5001, 1, 9639.668675],
  [273.88998986, 31.636091026, 15218048975e-2, 0.261931111, 166.771948447, 56.629152555, 367946.932, 0.270544583, 0.3510151, 107.3373, 72.5305, 1, 9639.668578],
  [274.682738563, 30.708441125, 15218055277e-2, 0.261931111, 168.946742602, 56.807411377, 367955.144, 0.270538611, 0.3512683, 107.3069, 72.5608, 1, 9639.668482],
  [275.469552943, 29.781838708, 15218061654e-2, 0.261930972, 171.139489814, 56.951531672, 367965.457, 0.270530972, 0.3515214, 107.2766, 72.5912, 1, 9639.668385],
  [276.251011343, 28.856450552, 15218068101e-2, 0.261930833, 173.346572669, 57.061037656, 367977.873, 0.270521806, 0.3517744, 107.2462, 72.6215, 1, 9639.668288],
  [277.02766698, 27.932440525, 15218074614e-2, 0.261930694, 175.564191612, 57.135559703, 367992.397, 0.270511111, 0.3520275, 107.2158, 72.6519, 1, 9639.668191],
  [277.800049835, 27.009970058, 15218081188e-2, 0.261930556, 177.788410256, 57.174840041, 368009.032, 0.270498889, 0.3522806, 107.1855, 72.6822, 1, 9639.668094],
  [278.568668527, 26.089198442, 1521808782e-1, 0.261930556, 180.015205088, 57.178736752, 368027.78, 0.270485139, 0.3525339, 107.1551, 72.7126, 1, 9639.667997],
  [279.334011793, 25.170283404, 15218094504e-2, 0.261930417, 182.240517383, 57.147225979, 368048.64, 0.270469861, 0.3527873, 107.1247, 72.7429, 1, 9639.6679],
  [280.096550097, 24.253381351, 15218101238e-2, 0.261930278, 184.460306917, 57.080402251, 368071.613, 0.270452917, 0.353041, 107.0943, 72.7733, 1, 9639.667803],
  [280.856736974, 23.338647777, 15218108015e-2, 0.261930139, 186.670604658, 56.978476908, 368096.698, 0.270434583, 0.3532949, 107.0638, 72.8037, 1, 9639.667706],
  [281.615010422, 22.426237466, 15218114831e-2, 0.26193, 188.86756363, 56.841774666, 368123.892, 0.270414583, 0.3535493, 107.0333, 72.8342, 1, 9639.667609],
  [282.371793934, 21.516304988, 15218121683e-2, 0.261929861, 191.047505153, 56.670728508, 368153.193, 0.270393056, 0.353804, 107.0028, 72.8647, 1, 9639.667512],
  [283.127497704, 20.609004868, 15218128566e-2, 0.261929861, 193.2069607, 56.465873011, 368184.596, 0.27037, 0.3540591, 106.9722, 72.8952, 1, 9639.667415],
  [283.882519614, 19.704491896, 15218135475e-2, 0.261929722, 195.342707162, 56.227836396, 368218.095, 0.270345417, 0.3543148, 106.9416, 72.9258, 1, 9639.667318],
  [284.637246148, 18.802921424, 15218142405e-2, 0.261929583, 197.451795127, 55.957331555, 368253.686, 0.270319306, 0.3545711, 106.9109, 72.9565, 1, 9639.667221],
  [285.392053359, 17.904449503, 15218149353e-2, 0.261929444, 199.531570392, 55.655146283, 368291.361, 0.270291528, 0.3548279, 106.8802, 72.9872, 1, 9639.667125],
  [286.147307515, 17.009233304, 15218156313e-2, 0.261929306, 201.579687186, 55.322133148, 368331.112, 0.270262361, 0.3550855, 106.8493, 73.018, 1, 9639.667028],
  [286.903365935, 16.117431238, 15218163281e-2, 0.261929167, 203.594115344, 54.959199075, 368372.931, 0.270231667, 0.3553437, 106.8184, 73.0489, 1, 9639.666931],
  [287.660577617, 15.22920324, 15218170253e-2, 0.261929028, 205.573140223, 54.567295064, 368416.806, 0.270199583, 0.3556028, 106.7874, 73.0799, 1, 9639.666834],
  [288.419283955, 14.344710869, 15218177224e-2, 0.261928889, 207.515357421, 54.147406121, 368462.728, 0.270165833, 0.3558627, 106.7563, 73.111, 1, 9639.666737],
  [289.179819161, 13.4641177, 1521818419e-1, 0.261928889, 209.419661708, 53.700541794, 368510.685, 0.270130694, 0.3561234, 106.7251, 73.1421, 1, 9639.66664],
  [289.942510881, 12.587589409, 15218191145e-2, 0.26192875, 211.285232571, 53.227727202, 368560.664, 0.270094028, 0.3563851, 106.6938, 73.1734, 1, 9639.666543],
  [290.707680639, 11.715294002, 15218198086e-2, 0.261928611, 213.111516242, 52.729994864, 368612.651, 0.270055972, 0.3566478, 106.6623, 73.2048, 1, 9639.666446],
  [291.47564424, 10.847402037, 15218205008e-2, 0.261928472, 214.898205457, 52.208377325, 368666.633, 0.270016389, 0.3569115, 106.6308, 73.2363, 1, 9639.666349],
  [292.246712252, 9.984086698, 15218211906e-2, 0.261928333, 216.645217995, 51.66390055, 368722.592, 0.269975417, 0.3571763, 106.5991, 73.2679, 1, 9639.666252],
  [293.021190194, 9.125524148, 15218218776e-2, 0.261928194, 218.35267398, 51.097578319, 368780.514, 0.269933056, 0.3574422, 106.5673, 73.2997, 1, 9639.666155],
  [293.799378931, 8.271893593, 15218225614e-2, 0.261928056, 220.020873533, 50.510407308, 368840.381, 0.269889306, 0.3577093, 106.5354, 73.3316, 1, 9639.666058],
  [294.581574887, 7.423377513, 15218232414e-2, 0.261928056, 221.650274596, 49.903363043, 368902.174, 0.269844028, 0.3579777, 106.5033, 73.3636, 1, 9639.665961],
  [295.368070366, 6.58016171, 15218239173e-2, 0.261927917, 223.241471844, 49.277396513, 368965.875, 0.2697975, 0.3582473, 106.4711, 73.3958, 1, 9639.665864],
  [296.159153575, 5.742435647, 15218245886e-2, 0.261927778, 224.795176177, 48.633431655, 369031.464, 0.269749444, 0.3585182, 106.4387, 73.4281, 1, 9639.665767],
  [296.955108869, 4.910392487, 15218252548e-2, 0.261927639, 226.312196133, 47.97236327, 369098.92, 0.269700139, 0.3587906, 106.4062, 73.4606, 1, 9639.665671],
  [297.756216833, 4.084229275, 15218259156e-2, 0.2619275, 227.793420443, 47.295055613, 369168.222, 0.269649583, 0.3590643, 106.3735, 73.4933, 1, 9639.665574],
  [298.562754316, 3.264147108, 15218265705e-2, 0.2619275, 229.239802272, 46.602341443, 369239.347, 0.269597639, 0.3593396, 106.3406, 73.5261, 1, 9639.665477],
  [299.374994569, 2.450351167, 1521827219e-1, 0.261927361, 230.652345125, 45.895021422, 369312.271, 0.269544444, 0.3596163, 106.3076, 73.5591, 1, 9639.66538],
  [300.193207069, 1.643051012, 15218278607e-2, 0.261927222, 232.032089943, 45.173864082, 369386.971, 0.269489861, 0.3598946, 106.2743, 73.5923, 1, 9639.665283],
  [301.017657581, 0.842460599, 15218284952e-2, 0.261927083, 233.380104073, 44.4396059, 369463.423, 0.269434167, 0.3601745, 106.2409, 73.6256, 1, 9639.665186],
  [301.848608009, 0.048798448, 15218291221e-2, 0.261926944, 234.697471497, 43.692951718, 369541.599, 0.269377083, 0.360456, 106.2073, 73.6592, 1, 9639.665089],
  [302.686316379, -0.737712351, 15218297409e-2, 0.261926944, 235.985284503, 42.934575283, 369621.474, 0.269318889, 0.3607392, 106.1735, 73.6929, 1, 9639.664992],
  [303.531036503, -1.516843884, 15218303513e-2, 0.261926806, 237.24463622, 42.165120161, 369703.02, 0.269259444, 0.3610242, 106.1395, 73.7269, 1, 9639.664895],
  [304.383017877, -2.288363425, 15218309527e-2, 0.261926667, 238.476614695, 41.385200543, 369786.21, 0.269198889, 0.3613109, 106.1053, 73.761, 1, 9639.664798],
  [305.242505398, -3.052033339, 15218315449e-2, 0.261926528, 239.682297687, 40.595402292, 369871.015, 0.269137222, 0.3615994, 106.0709, 73.7954, 1, 9639.664701],
  [306.109739042, -3.807610988, 15218321274e-2, 0.261926528, 240.862748443, 39.79628403, 369957.406, 0.269074306, 0.3618898, 106.0363, 73.8299, 1, 9639.664604],
  [306.984953637, -4.554848779, 15218326998e-2, 0.261926389, 242.01901241, 38.988378155, 370045.351, 0.269010417, 0.362182, 106.0014, 73.8647, 1, 9639.664507],
  [307.868378303, -5.29349398, 15218332616e-2, 0.26192625, 243.152114224, 38.172192173, 370134.821, 0.268945417, 0.3624762, 105.9664, 73.8997, 1, 9639.66441],
  [308.760236146, -6.023288797, 15218338126e-2, 0.26192625, 244.263055779, 37.348209739, 370225.784, 0.268879306, 0.3627723, 105.9311, 73.935, 1, 9639.664314],
  [309.660743716, -6.743970325, 15218343524e-2, 0.261926111, 245.352814522, 36.516891882, 370318.208, 0.268812222, 0.3630704, 105.8956, 73.9704, 1, 9639.664217],
  [310.570110616, -7.455270656, 15218348804e-2, 0.261925972, 246.422342473, 35.678678038, 370412.06, 0.268744028, 0.3633705, 105.8598, 74.0061, 1, 9639.66412],
  [311.488538749, -8.156916774, 15218353965e-2, 0.261925972, 247.472565212, 34.833987368, 370507.306, 0.268675, 0.3636726, 105.8238, 74.0421, 1, 9639.664023],
  [312.416221834, -8.84863071, 15218359001e-2, 0.261925833, 248.504381611, 33.983219741, 370603.912, 0.268605, 0.3639769, 105.7876, 74.0783, 1, 9639.663926],
  [313.353344722, -9.530129596, 1521836391e-1, 0.261925694, 249.518663654, 33.126756838, 370701.845, 0.268534028, 0.3642833, 105.7511, 74.1147, 1, 9639.663829],
  [314.300082656, -10.201125755, 15218368688e-2, 0.261925694, 250.51625648, 32.264963223, 370801.068, 0.268462083, 0.3645918, 105.7144, 74.1514, 1, 9639.663732],
  [315.256600669, -10.861326925, 15218373331e-2, 0.261925556, 251.497978817, 31.39818722, 370901.545, 0.268389444, 0.3649025, 105.6774, 74.1883, 1, 9639.663635],
  [316.2230526, -11.510436284, 15218377837e-2, 0.261925556, 252.464623176, 30.526762066, 371003.241, 0.268315833, 0.3652154, 105.6401, 74.2255, 1, 9639.663538],
  [317.199580403, -12.148152739, 152183822, 0.261925417, 253.416956566, 29.651006718, 371106.118, 0.268241528, 0.3655305, 105.6026, 74.2629, 1, 9639.663441],
  [318.186313222, -12.774171107, 15218386419e-2, 0.261925417, 254.35572112, 28.771226777, 371210.139, 0.26816625, 0.3658479, 105.5649, 74.3006, 1, 9639.663344],
  [319.183366634, -13.388182463, 1521839049e-1, 0.261925278, 255.281634939, 27.887715235, 371315.266, 0.268090417, 0.3661676, 105.5269, 74.3386, 1, 9639.663247],
  [320.190841523, -13.989874306, 1521839441e-1, 0.261925278, 256.195392731, 27.000753448, 371421.461, 0.26801375, 0.3664895, 105.4886, 74.3768, 1, 9639.66315],
  [321.208823268, -14.578930985, 15218398175e-2, 0.261925139, 257.0976668, 26.110611777, 371528.685, 0.267936389, 0.3668138, 105.45, 74.4153, 1, 9639.663053],
  [322.237380744, -15.155034043, 15218401783e-2, 0.261925139, 257.989107887, 25.217550362, 371636.898, 0.267858333, 0.3671405, 105.4112, 74.4541, 1, 9639.662956],
  [323.276565303, -15.717862617, 15218405231e-2, 0.261925, 258.870346051, 24.321819849, 371746.061, 0.267779722, 0.3674695, 105.3721, 74.4931, 1, 9639.66286],
  [324.326409928, -16.267093966, 15218408515e-2, 0.261925, 259.741991732, 23.42366191, 371856.134, 0.267700417, 0.3678009, 105.3327, 74.5324, 1, 9639.662763],
  [325.386928036, -16.802403853, 15218411634e-2, 0.261924861, 260.604636477, 22.523310073, 371967.076, 0.267620556, 0.3681347, 105.293, 74.572, 1, 9639.662666],
  [326.458112637, -17.323467161, 15218414584e-2, 0.261924861, 261.458853979, 21.620990201, 372078.847, 0.267540139, 0.368471, 105.2531, 74.6119, 1, 9639.662569],
  [327.539935302, -17.829958435, 15218417363e-2, 0.261924861, 262.305200959, 20.716921104, 372191.404, 0.267459306, 0.3688097, 105.2128, 74.6521, 1, 9639.662472],
  [328.63234538, -18.321552578, 15218419967e-2, 0.261924722, 263.144218157, 19.81131498, 372304.708, 0.267377917, 0.3691508, 105.1723, 74.6925, 1, 9639.662375],
  [329.735268875, -18.79792541, 15218422396e-2, 0.261924722, 263.97643107, 18.904378097, 372418.715, 0.267296111, 0.3694944, 105.1315, 74.7332, 1, 9639.662278],
  [330.848607759, -19.258754445, 15218424646e-2, 0.261924722, 264.802350919, 17.996311183, 372533.384, 0.26721375, 0.3698405, 105.0905, 74.7742, 1, 9639.662181],
  [331.972239143, -19.703719622, 15218426714e-2, 0.261924722, 265.622475476, 17.087309914, 372648.672, 0.267131111, 0.3701891, 105.0491, 74.8155, 1, 9639.662084],
  [333.10601453, -20.132504071, 15218428599e-2, 0.261924583, 266.437289863, 16.177565409, 372764.537, 0.267048056, 0.3705402, 105.0074, 74.8571, 1, 9639.661987],
  [334.249759349, -20.54479499, 15218430299e-2, 0.261924583, 267.247267485, 15.267264516, 372880.935, 0.266964722, 0.3708938, 104.9655, 74.899, 1, 9639.66189],
  [335.403272195, -20.94028441, 15218431812e-2, 0.261924583, 268.052870626, 14.356590435, 372997.824, 0.266880972, 0.37125, 104.9232, 74.9412, 1, 9639.661793],
  [336.566324573, -21.318670135, 15218433135e-2, 0.261924583, 268.854551334, 13.445722975, 373115.161, 0.266797083, 0.3716086, 104.8807, 74.9837, 1, 9639.661696],
  [337.738660526, -21.679656616, 15218434266e-2, 0.261924583, 269.652752086, 12.534839017, 373232.901, 0.266712917, 0.3719698, 104.8379, 75.0264, 1, 9639.661599],
  [338.919996641, -22.022955922, 15218435205e-2, 0.261924583, 270.44790665, 11.624112726, 373351.002, 0.266628611, 0.3723336, 104.7948, 75.0695, 1, 9639.661503],
  [340.110021806, -22.348288611, 15218435948e-2, 0.261924444, 271.240440552, 10.713716136, 373469.42, 0.266544028, 0.3726999, 104.7513, 75.1128, 1, 9639.661406],
  [341.30839751, -22.655384719, 15218436496e-2, 0.261924444, 272.030771914, 9.803819334, 373588.11, 0.266459306, 0.3730687, 104.7076, 75.1564, 1, 9639.661309],
  [342.514758127, -22.943984698, 15218436845e-2, 0.261924444, 272.819312034, 8.894590845, 373707.03, 0.266374583, 0.3734401, 104.6636, 75.2004, 1, 9639.661212],
  [343.728711356, -23.213840355, 15218436995e-2, 0.261924444, 273.606465993, 7.986197984, 373826.134, 0.266289722, 0.373814, 104.6194, 75.2446, 1, 9639.661115],
  [344.949839055, -23.464715814, 15218436945e-2, 0.261924444, 274.392633373, 7.078807048, 373945.379, 0.266204722, 0.3741905, 104.5748, 75.2891, 1, 9639.661018],
  [346.177697843, -23.696388381, 15218436692e-2, 0.261924444, 275.178208658, 6.172583819, 374064.721, 0.266119861, 0.3745696, 104.5299, 75.3339, 1, 9639.660921],
  [347.411820296, -23.908649463, 15218436237e-2, 0.261924444, 275.963581933, 5.267693724, 374184.116, 0.266034861, 0.3749512, 104.4847, 75.379, 1, 9639.660824],
  [348.651716087, -24.101305406, 15218435578e-2, 0.261924444, 276.749139338, 4.364302221, 374303.519, 0.26595, 0.3753353, 104.4393, 75.4244, 1, 9639.660727],
  [349.896873541, -24.274178333, 15218434713e-2, 0.261924583, 277.535263715, 3.462574955, 374422.887, 0.265865278, 0.375722, 104.3935, 75.4701, 1, 9639.66063],
  [351.146760969, -24.427106859, 15218433643e-2, 0.261924583, 278.322334942, 2.562678233, 374542.175, 0.265780556, 0.3761112, 104.3475, 75.516, 1, 9639.660533],
  [352.400828561, -24.559946828, 15218432367e-2, 0.261924583, 279.110730526, 1.664779191, 374661.341, 0.265696111, 0.3765029, 104.3011, 75.5623, 1, 9639.660436],
  [353.658510252, -24.672571941, 15218430883e-2, 0.261924583, 279.900826039, 0.769046105, 374780.339, 0.265611667, 0.3768971, 104.2545, 75.6089, 1, 9639.660339],
  [354.919225706, -24.76487432, 15218429192e-2, 0.261924583, 280.692995526, -0.124351294, 374899.126, 0.2655275, 0.3772939, 104.2076, 75.6557, 1, 9639.660242],
  [356.182382657, -24.836765016, 15218427292e-2, 0.261924583, 281.487612051, -1.015241661, 375017.658, 0.265443611, 0.3776931, 104.1604, 75.7028, 1, 9639.660145],
  [357.447378927, -24.888174396, 15218425184e-2, 0.261924722, 282.285047928, -1.903451573, 375135.893, 0.26536, 0.3780948, 104.1129, 75.7502, 1, 9639.660049],
  [358.713604961, -24.919052482, 15218422867e-2, 0.261924722, 283.085675223, -2.788805379, 375253.786, 0.265276528, 0.378499, 104.0652, 75.7979, 1, 9639.659952],
  [359.98044617, -24.92936918, 15218420342e-2, 0.261924722, 283.889866039, -3.671124836, 375371.295, 0.265193472, 0.3789057, 104.0172, 75.8459, 1, 9639.659855],
  [1.247285587, -24.91911442, 15218417607e-2, 0.261924861, 284.697993011, -4.550228984, 375488.376, 0.265110833, 0.3793148, 103.9688, 75.8941, 1, 9639.659758],
  [2.513506112, -24.888298208, 15218414663e-2, 0.261924861, 285.510429423, -5.42593365, 375604.987, 0.265028611, 0.3797263, 103.9202, 75.9426, 1, 9639.659661],
  [3.778493185, -24.836950573, 15218411511e-2, 0.261924861, 286.327549629, -6.298051303, 375721.085, 0.264946667, 0.3801402, 103.8714, 75.9914, 1, 9639.659564],
  [5.041637222, -24.76512143, 1521840815e-1, 0.261925, 287.149729305, -7.166390739, 375836.629, 0.264865139, 0.3805566, 103.8222, 76.0405, 1, 9639.659467],
  [6.302336012, -24.672880348, 15218404582e-2, 0.261925, 287.97734565, -8.030756753, 375951.576, 0.264784167, 0.3809753, 103.7728, 76.0898, 1, 9639.65937],
  [7.559997241, -24.560316215, 15218400805e-2, 0.261925139, 288.810777732, -8.890949979, 376065.884, 0.26470375, 0.3813963, 103.7232, 76.1394, 1, 9639.659273],
  [8.814040521, -24.427536845, 15218396821e-2, 0.261925139, 289.650406501, -9.746766419, 376179.513, 0.26462375, 0.3818197, 103.6732, 76.1893, 1, 9639.659176],
  [10.063899718, -24.274668479, 15218392631e-2, 0.261925278, 290.496615064, -10.597997275, 376292.421, 0.264544306, 0.3822454, 103.623, 76.2394, 1, 9639.659079],
  [11.309024912, -24.10185522, 15218388235e-2, 0.261925278, 291.349788726, -11.444428577, 376404.567, 0.264465556, 0.3826734, 103.5725, 76.2898, 1, 9639.658982],
  [12.548884451, -23.909258375, 15218383634e-2, 0.261925417, 292.210315237, -12.285841034, 376515.911, 0.264387361, 0.3831037, 103.5218, 76.3405, 1, 9639.658885],
  [13.782966451, -23.697055785, 15218378829e-2, 0.261925417, 293.078584594, -13.122009526, 376626.414, 0.264309722, 0.3835362, 103.4709, 76.3914, 1, 9639.658788],
  [15.010780523, -23.465441043, 15218373821e-2, 0.261925556, 293.954989228, -13.952702964, 376736.035, 0.264232917, 0.3839709, 103.4196, 76.4425, 1, 9639.658692],
  [16.231859141, -23.214622688, 15218368611e-2, 0.261925694, 294.839923852, -14.777683919, 376844.736, 0.264156667, 0.3844079, 103.3682, 76.4939, 1, 9639.658595],
  [17.445758811, -22.944823364, 152183632, 0.261925694, 295.73378539, -15.596708336, 376952.478, 0.264081111, 0.384847, 103.3164, 76.5456, 1, 9639.658498],
  [18.652061273, -22.656278896, 15218357591e-2, 0.261925833, 296.636972903, -16.409525329, 377059.222, 0.264006389, 0.3852882, 103.2645, 76.5975, 1, 9639.658401],
  [19.850374101, -22.349237431, 15218351783e-2, 0.261925972, 297.549887198, -17.215876727, 377164.931, 0.263932361, 0.3857315, 103.2123, 76.6496, 1, 9639.658304],
  [21.040331537, -22.02395847, 15218345779e-2, 0.261926111, 298.472930645, -18.015496893, 377269.567, 0.263859167, 0.3861769, 103.1599, 76.7019, 1, 9639.658207],
  [22.221594899, -21.680711943, 1521833958e-1, 0.261926111, 299.406506775, -18.808112394, 377373.093, 0.263786806, 0.3866244, 103.1072, 76.7545, 1, 9639.65811],
  [23.393853053, -21.319777217, 15218333188e-2, 0.26192625, 300.351019946, -19.593441822, 377475.474, 0.263715278, 0.3870738, 103.0543, 76.8073, 1, 9639.658013],
  [24.556822321, -20.941442214, 15218326604e-2, 0.261926389, 301.306874639, -20.371195376, 377576.673, 0.263644583, 0.3875253, 103.0012, 76.8604, 1, 9639.657916],
  [25.710246639, -20.546002434, 15218319831e-2, 0.261926528, 302.274474944, -21.141074704, 377676.655, 0.263574722, 0.3879787, 102.9479, 76.9136, 1, 9639.657819],
  [26.85389736, -20.133760034, 15218312871e-2, 0.261926667, 303.254223846, -21.902772647, 377775.386, 0.263505833, 0.388434, 102.8944, 76.9671, 1, 9639.657722],
  [27.987572925, -19.705022945, 15218305725e-2, 0.261926806, 304.246522328, -22.655972976, 377872.83, 0.263437917, 0.3888912, 102.8406, 77.0208, 1, 9639.657625],
  [29.111098601, -19.260103934, 15218298396e-2, 0.261926806, 305.251768588, -23.400350292, 377968.955, 0.263370972, 0.3893503, 102.7867, 77.0747, 1, 9639.657528],
  [30.224325732, -18.799319834, 15218290886e-2, 0.261926944, 306.27035678, -24.135569698, 378063.727, 0.263304861, 0.3898111, 102.7325, 77.1288, 1, 9639.657431],
  [31.327131265, -18.322990675, 15218283196e-2, 0.261927083, 307.302675964, -24.861286744, 378157.114, 0.263239861, 0.3902738, 102.6782, 77.183, 1, 9639.657334],
  [32.419416964, -17.831438925, 15218275331e-2, 0.261927222, 308.349108707, -25.57714725, 378249.085, 0.263175833, 0.3907381, 102.6236, 77.2375, 1, 9639.657238],
  [33.501108777, -17.324988679, 15218267292e-2, 0.261927361, 309.410029766, -26.282787317, 378339.608, 0.263112917, 0.3912042, 102.5689, 77.2922, 1, 9639.657141],
  [34.572155767, -16.803965053, 15218259081e-2, 0.2619275, 310.485804291, -26.977833145, 378428.652, 0.263050972, 0.391672, 102.514, 77.347, 1, 9639.657044],
  [35.632529366, -16.268693452, 15218250701e-2, 0.261927639, 311.576786156, -27.661901107, 378516.187, 0.262990139, 0.3921413, 102.4589, 77.4021, 1, 9639.656947],
  [36.682222405, -15.71949896, 15218242156e-2, 0.261927778, 312.68331608, -28.33459781, 378602.185, 0.262930417, 0.3926122, 102.4036, 77.4573, 1, 9639.65685],
  [37.721248119, -15.156705782, 15218233447e-2, 0.261928056, 313.805719451, -28.995520153, 378686.617, 0.262871806, 0.3930847, 102.3482, 77.5126, 1, 9639.656753],
  [38.749639305, -14.580636626, 15218224579e-2, 0.261928194, 314.944304294, -29.644255607, 378769.455, 0.262814306, 0.3935587, 102.2926, 77.5682, 1, 9639.656656],
  [39.767447126, -13.991612319, 15218215552e-2, 0.261928333, 316.099358616, -30.280382317, 378850.672, 0.262757917, 0.3940341, 102.2368, 77.6239, 1, 9639.656559],
  [40.774740265, -13.389951283, 15218206372e-2, 0.261928472, 317.271148052, -30.903469519, 378930.242, 0.262702778, 0.394511, 102.1809, 77.6797, 1, 9639.656462],
  [41.77160387, -12.775969155, 1521819704e-1, 0.261928611, 318.459913058, -31.513077901, 379008.138, 0.26264875, 0.3949892, 102.1249, 77.7357, 1, 9639.656365],
  [42.758138726, -12.149978336, 1521818756e-1, 0.26192875, 319.665866261, -32.108760176, 379084.336, 0.262595972, 0.3954687, 102.0687, 77.7919, 1, 9639.656268],
  [43.734460101, -11.512287774, 15218177935e-2, 0.261928889, 320.88918924, -32.690061557, 379158.811, 0.262544444, 0.3959495, 102.0123, 77.8481, 1, 9639.656171],
  [44.700696965, -10.863202591, 15218168169e-2, 0.261929167, 322.130029652, -33.25652054, 379231.54, 0.262494028, 0.3964316, 101.9559, 77.9046, 1, 9639.656074],
  [45.656991054, -10.203023838, 15218158265e-2, 0.261929306, 323.388497973, -33.807669675, 379302.501, 0.262445, 0.3969149, 101.8993, 77.9611, 1, 9639.655977],
  [46.603495988, -9.532048291, 15218148226e-2, 0.261929444, 324.66466431, -34.343036491, 379371.671, 0.262397083, 0.3973993, 101.8425, 78.0178, 1, 9639.655881],
  [47.54037657, -8.850568167, 15218138055e-2, 0.261929583, 325.95855526, -34.862144587, 379439.029, 0.262350556, 0.3978848, 101.7857, 78.0746, 1, 9639.655784],
  [48.467807811, -8.158871094, 15218127758e-2, 0.261929861, 327.270150409, -35.364514699, 379504.555, 0.262305278, 0.3983713, 101.7287, 78.1315, 1, 9639.655687],
  [49.385974319, -7.457239887, 15218117336e-2, 0.26193, 328.599379321, -35.849666057, 379568.228, 0.26226125, 0.3988589, 101.6717, 78.1885, 1, 9639.65559],
  [50.295069533, -6.745952484, 15218106794e-2, 0.261930139, 329.946118303, -36.317117764, 379630.031, 0.262218611, 0.3993474, 101.6145, 78.2456, 1, 9639.655493],
  [51.195295194, -6.025281772, 15218096135e-2, 0.261930417, 331.310187621, -36.766390398, 379689.946, 0.262177222, 0.3998369, 101.5572, 78.3028, 1, 9639.655396],
  [52.086860544, -5.295495669, 15218085364e-2, 0.261930556, 332.691348424, -37.197007576, 379747.954, 0.262137083, 0.4003272, 101.4999, 78.3601, 1, 9639.655299],
  [52.969981892, -4.556856992, 15218074483e-2, 0.261930694, 334.089300389, -37.608497796, 379804.04, 0.262098472, 0.4008183, 101.4425, 78.4175, 1, 9639.655202],
  [53.844882057, -3.809623466, 15218063498e-2, 0.261930972, 335.503679483, -38.000396304, 379858.188, 0.262061111, 0.4013102, 101.385, 78.4749, 1, 9639.655105],
  [54.711789864, -3.05404775, 15218052411e-2, 0.261931111, 336.934055999, -38.372247067, 379910.384, 0.262025, 0.4018028, 101.3274, 78.5325, 1, 9639.655008],
  [55.570939837, -2.290377359, 15218041228e-2, 0.26193125, 338.3799334, -38.723604895, 379960.614, 0.261990417, 0.4022961, 101.2697, 78.5901, 1, 9639.654911],
  [56.422571631, -1.518854851, 15218029952e-2, 0.261931528, 339.840747075, -39.054037506, 380008.864, 0.261957083, 0.4027901, 101.212, 78.6477, 1, 9639.654814],
  [57.266929815, -0.739717776, 15218018586e-2, 0.261931667, 341.315864172, -39.363127773, 380055.123, 0.261925278, 0.4032845, 101.1542, 78.7054, 1, 9639.654717],
  [58.104263513, 0.046801208, 15218007136e-2, 0.261931944, 342.804583775, -39.650475927, 380099.378, 0.261894722, 0.4037795, 101.0964, 78.7632, 1, 9639.65462],
  [58.934826263, 0.840474361, 15217995605e-2, 0.261932083, 344.306137972, -39.915701834, 380141.62, 0.261865694, 0.404275, 101.0386, 78.821, 1, 9639.654523],
  [59.758875634, 1.641078617, 15217983998e-2, 0.261932222, 345.819693167, -40.158447155, 380181.84, 0.261837917, 0.4047709, 100.9807, 78.8789, 1, 9639.654427],
  [60.576673172, 2.44839559, 15217972319e-2, 0.2619325, 347.344352603, -40.378377566, 380220.028, 0.261811667, 0.4052672, 100.9228, 78.9368, 1, 9639.65433],
  [61.388484235, 3.262211438, 15217960572e-2, 0.261932639, 348.879159351, -40.575184856, 380256.176, 0.261786806, 0.4057638, 100.8648, 78.9947, 1, 9639.654233],
  [62.19457788, 4.082316724, 15217948761e-2, 0.261932917, 350.423100013, -40.748588926, 380290.278, 0.261763333, 0.4062606, 100.8068, 79.0526, 1, 9639.654136],
  [62.995226916, 4.908506394, 15217936891e-2, 0.261933056, 351.975109466, -40.898339696, 380322.328, 0.26174125, 0.4067577, 100.7488, 79.1106, 1, 9639.654039],
  [63.790707735, 5.740579487, 15217924966e-2, 0.261933333, 353.534075684, -41.024218793, 380352.32, 0.261720556, 0.4072549, 100.6908, 79.1685, 1, 9639.653942],
  [64.581300439, 6.578339101, 15217912991e-2, 0.261933472, 355.098845801, -41.126041114, 380380.249, 0.261701389, 0.4077523, 100.6328, 79.2265, 1, 9639.653845],
  [65.367288857, 7.421592196, 1521790097e-1, 0.26193375, 356.668232349, -41.203656151, 380406.114, 0.261683611, 0.4082497, 100.5748, 79.2844, 1, 9639.653748],
  [66.14896075, 8.270149555, 15217888907e-2, 0.261933889, 358.241020376, -41.256949107, 380429.91, 0.261667222, 0.4087472, 100.5169, 79.3424, 1, 9639.653651],
  [66.926607793, 9.123825458, 15217876807e-2, 0.261934167, 359.815974393, -41.285841732, 380451.636, 0.261652222, 0.4092446, 100.4589, 79.4003, 1, 9639.653554],
  [67.700525864, 9.982437636, 15217864674e-2, 0.261934306, 1.391846201, -41.290292927, 380471.292, 0.26163875, 0.4097419, 100.4009, 79.4582, 1, 9639.653457],
  [68.471015228, 10.84580707, 15217852513e-2, 0.261934583, 2.96738259, -41.270299056, 380488.877, 0.261626667, 0.410239, 100.343, 79.5161, 1, 9639.65336],
  [69.238380775, 11.713757797, 15217840328e-2, 0.261934722, 4.541333122, -41.225893999, 380504.393, 0.261615972, 0.410736, 100.2851, 79.574, 1, 9639.653263],
  [70.002932415, 12.586116847, 15217828125e-2, 0.261935, 6.112458205, -41.157148885, 380517.842, 0.261606806, 0.4112328, 100.2273, 79.6318, 1, 9639.653166],
  [70.764985263, 13.462713883, 15217815906e-2, 0.261935139, 7.679536379, -41.064171606, 380529.225, 0.261598889, 0.4117292, 100.1695, 79.6896, 1, 9639.65307],
  [71.524860122, 14.343381137, 15217803678e-2, 0.261935417, 9.241371928, -40.947106017, 380538.548, 0.2615925, 0.4122253, 100.1117, 79.7473, 1, 9639.652973],
  [72.282883856, 15.227953153, 15217791444e-2, 0.261935556, 10.796801782, -40.806130911, 380545.813, 0.2615875, 0.412721, 100.054, 79.805, 1, 9639.652876],
  [73.03938996, 16.116266711, 15217779208e-2, 0.261935833, 12.344702268, -40.641458727, 380551.028, 0.261583889, 0.4132163, 99.9964, 79.8626, 1, 9639.652779],
  [73.79471892, 17.008160442, 15217766977e-2, 0.261935972, 13.88399476, -40.453334102, 380554.197, 0.261581806, 0.4137111, 99.9388, 79.9201, 1, 9639.652682],
  [74.549218888, 17.903474738, 15217754753e-2, 0.26193625, 15.413651292, -40.242032163, 380555.329, 0.261580972, 0.4142053, 99.8813, 79.9776, 1, 9639.652585],
  [75.303246268, 18.802051502, 15217742542e-2, 0.261936389, 16.93269916, -40.007856711, 380554.431, 0.261581528, 0.4146989, 99.8239, 80.035, 1, 9639.652488],
  [76.05716637, 19.703733895, 15217730348e-2, 0.261936667, 18.440224892, -39.751138241, 380551.512, 0.261583611, 0.4151919, 99.7665, 80.0923, 1, 9639.652391],
  [76.811354239, 20.608366219, 15217718176e-2, 0.261936806, 19.935377698, -39.472231829, 380546.581, 0.261586944, 0.4156842, 99.7093, 80.1495, 1, 9639.652294],
  [77.566195304, 21.515793495, 1521770603e-1, 0.261937083, 21.417371671, -39.171515032, 380539.651, 0.261591806, 0.4161758, 99.6521, 80.2066, 1, 9639.652197],
  [78.322086339, 22.425861328, 15217693914e-2, 0.261937222, 22.885487826, -38.849385634, 380530.732, 0.261597917, 0.4166665, 99.5951, 80.2637, 1, 9639.6521],
  [79.079436348, 23.338415583, 15217681833e-2, 0.2619375, 24.339075093, -38.506259432, 380519.836, 0.261605417, 0.4171564, 99.5382, 80.3206, 1, 9639.652003],
  [79.838667682, 24.253302227, 15217669792e-2, 0.261937639, 25.77755093, -38.142567966, 380506.976, 0.261614167, 0.4176455, 99.4813, 80.3774, 1, 9639.651906],
  [80.600216977, 25.170366855, 15217657795e-2, 0.261937917, 27.20040085, -37.758756385, 380492.168, 0.261624444, 0.4181336, 99.4246, 80.4341, 1, 9639.651809]
];

// src/data/colosseumEphemeris.ts
var COLOSSEUM_EPHEMERIS = {
  id: "colosseum-jpl-de441-ad80-june",
  source: "JPL Horizons / DE441",
  observer: { latitudeDegrees: 41.8902, longitudeDegrees: 12.4922, altitudeMetres: 25 },
  axes: "+X east, +Y up, +Z north",
  azimuthConvention: "clockwise from north: 0 north, 90 east, 180 south, 270 west",
  calendar: "Julian",
  timeScale: "UT1",
  apparentCoordinates: "AIRLESS",
  startDate: "AD 0080-Jun-10 00:00:00 UT1 (Julian)",
  endDate: "AD 0080-Jun-12 06:00:00 UT1 (Julian)",
  startJulianDay: 17504385e-1,
  endJulianDay: 175044075e-2,
  stepMinutes: 5,
  rows: COLOSSEUM_EPHEMERIS_ROWS,
  interpretation: "Representative authored dates during the construction era, not a dedication-date claim. Horizons reconstructs ancient Earth rotation through an estimated TDB\u2212UT1 model; interpolation error is measured against that model, not against an ancient observation. Apparent directions include topocentric parallax and light-time/aberration, but no atmospheric refraction, local terrain horizon or weather extinction. No modern UTC or daylight saving is implied.",
  sources: [
    "https://ssd-api.jpl.nasa.gov/doc/horizons.html",
    "https://ssd.jpl.nasa.gov/horizons/manual.html#observer-table",
    "https://ssd.jpl.nasa.gov/horizons/manual.html#long-term-ephemerides"
  ],
  provenance: "artifacts/colosseum-celestial-2026-09-20/ephemeris/manifest.json"
};

// src/engine/colosseumAstronomy.ts
var DEG = Math.PI / 180;
var RAD = 180 / Math.PI;
var clamp2 = (n, low, high) => Math.min(high, Math.max(low, n));
var lerp = (a, b, t) => a + (b - a) * t;
var dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
function normalize(x, y, z2) {
  const length2 = Math.hypot(x, y, z2);
  return [x / length2, y / length2, z2 / length2];
}
function horizontalDirection(azimuthDegrees, elevationDegrees) {
  const az = azimuthDegrees * DEG;
  const el = elevationDegrees * DEG;
  const horizontal = Math.cos(el);
  return [Math.sin(az) * horizontal, Math.sin(el), Math.cos(az) * horizontal];
}
function interpolateDirection(aAz, aEl, bAz, bEl, t) {
  const a = horizontalDirection(aAz, aEl);
  const b = horizontalDirection(bAz, bEl);
  return normalize(lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t));
}
function discFractionAboveHorizon(elevation, radius) {
  const h = clamp2(elevation / radius, -1, 1);
  return 0.5 + (Math.asin(h) + h * Math.sqrt(Math.max(0, 1 - h * h))) / Math.PI;
}
function body(direction, distanceKm, angularRadiusDegrees) {
  const azimuthDegrees = (Math.atan2(direction[0], direction[2]) * RAD + 360) % 360;
  const elevationDegrees = Math.asin(clamp2(direction[1], -1, 1)) * RAD;
  return {
    direction,
    azimuthDegrees,
    authoringAzimuthDegrees: 90 - azimuthDegrees,
    elevationDegrees,
    distanceKm,
    angularRadiusDegrees,
    aboveHorizon: elevationDegrees > 0,
    upperLimbAboveHorizon: elevationDegrees + angularRadiusDegrees > 0,
    horizonVisibility: discFractionAboveHorizon(elevationDegrees, angularRadiusDegrees)
  };
}
function colosseumAstronomyAtJulianDay(requestedJulianDayUt1) {
  if (!Number.isFinite(requestedJulianDayUt1)) throw new RangeError("A finite Julian day in UT1 is required.");
  const { startJulianDay, endJulianDay, stepMinutes, rows } = COLOSSEUM_EPHEMERIS;
  const julianDayUt1 = clamp2(requestedJulianDayUt1, startJulianDay, endJulianDay);
  const position = (julianDayUt1 - startJulianDay) * 1440 / stepMinutes;
  const index = Math.min(rows.length - 2, Math.floor(position));
  const t = clamp2(position - index, 0, 1);
  const a = rows[index];
  const b = rows[index + 1];
  const sun = body(
    interpolateDirection(a[0], a[1], b[0], b[1], t),
    lerp(a[2], b[2], t),
    lerp(a[3], b[3], t)
  );
  const moonBody = body(
    interpolateDirection(a[4], a[5], b[4], b[5], t),
    lerp(a[6], b[6], t),
    lerp(a[7], b[7], t)
  );
  const lightDirection = normalize(
    sun.direction[0] * sun.distanceKm - moonBody.direction[0] * moonBody.distanceKm,
    sun.direction[1] * sun.distanceKm - moonBody.direction[1] * moonBody.distanceKm,
    sun.direction[2] * sun.distanceKm - moonBody.direction[2] * moonBody.distanceKm
  );
  const phaseCosine = clamp2(-dot(lightDirection, moonBody.direction), -1, 1);
  return {
    julianDayUt1,
    clamped: julianDayUt1 !== requestedJulianDayUt1,
    deltaTSeconds: lerp(a[12], b[12], t),
    sun,
    moon: {
      ...moonBody,
      lightDirection,
      illuminatedFraction: (1 + phaseCosine) / 2,
      referenceIlluminatedFraction: lerp(a[8], b[8], t),
      phaseAngleDegrees: Math.acos(phaseCosine) * RAD,
      referencePhaseAngleDegrees: lerp(a[9], b[9], t),
      elongationDegrees: Math.acos(clamp2(dot(sun.direction, moonBody.direction), -1, 1)) * RAD,
      waxing: (t < 0.5 ? a[11] : b[11]) === 1
    }
  };
}

// src/engine/colosseumCelestialClock.ts
var COLOSSEUM_CELESTIAL_CLOCK = {
  calendar: "Julian",
  date: "AD 0080-Jun-10",
  timeScale: "UT1",
  knots: [[0, 3], [0.47, 11.5], [0.72, 18.7], [0.83, 21], [1, 22.25]]
};
var KNOTS = COLOSSEUM_CELESTIAL_CLOCK.knots;
var WIDTHS = KNOTS.slice(1).map((knot, i) => knot[0] - KNOTS[i][0]);
var SECANTS = WIDTHS.map((width, i) => (KNOTS[i + 1][1] - KNOTS[i][1]) / width);
function endpointTangent(h0, h1, d0, d1) {
  const tangent = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1);
  if (Math.sign(tangent) !== Math.sign(d0)) return 0;
  if (Math.sign(d0) !== Math.sign(d1) && Math.abs(tangent) > Math.abs(3 * d0)) return 3 * d0;
  return tangent;
}
var TANGENTS = KNOTS.map((_, i) => {
  if (i === 0) return endpointTangent(WIDTHS[0], WIDTHS[1], SECANTS[0], SECANTS[1]);
  if (i === KNOTS.length - 1) {
    const last = WIDTHS.length - 1;
    return endpointTangent(WIDTHS[last], WIDTHS[last - 1], SECANTS[last], SECANTS[last - 1]);
  }
  const before = SECANTS[i - 1], after = SECANTS[i];
  if (before * after <= 0) return 0;
  const w1 = 2 * WIDTHS[i] + WIDTHS[i - 1];
  const w2 = WIDTHS[i] + 2 * WIDTHS[i - 1];
  return (w1 + w2) / (w1 / before + w2 / after);
});
function celestialClockAt(rawT) {
  if (!Number.isFinite(rawT)) throw new RangeError("Finite normalized film time is required.");
  const t = Math.min(1, Math.max(0, rawT));
  let index = 0;
  while (index < WIDTHS.length - 1 && t > KNOTS[index + 1][0]) index++;
  const h = WIDTHS[index];
  const p = (t - KNOTS[index][0]) / h;
  const p2 = p * p, p3 = p2 * p;
  const y0 = KNOTS[index][1], y1 = KNOTS[index + 1][1];
  const m0 = TANGENTS[index], m1 = TANGENTS[index + 1];
  const hoursUt1 = (2 * p3 - 3 * p2 + 1) * y0 + (p3 - 2 * p2 + p) * h * m0 + (-2 * p3 + 3 * p2) * y1 + (p3 - p2) * h * m1;
  const derivative = ((6 * p2 - 6 * p) * y0 + (3 * p2 - 4 * p + 1) * h * m0 + (-6 * p2 + 6 * p) * y1 + (3 * p2 - 2 * p) * h * m1) / h;
  return {
    t,
    hoursUt1,
    julianDayUt1: COLOSSEUM_EPHEMERIS.startJulianDay + hoursUt1 / 24,
    hoursPerFilmUnit: rawT < 0 || rawT > 1 ? 0 : Math.max(0, derivative)
  };
}

// src/data/colosseumSky.ts
var COLOSSEUM_CELESTIAL_ANGULAR_SCALE = 2.4;
var COLOSSEUM_FOG_NEUTRALIZER = "#bcc5d0";
var COLOSSEUM_SKY = {
  id: "colosseum-valley-sky",
  description: "A Roman valley under a continuous astronomical day: pale dawn, high Mediterranean blue, a western sunset and a descending waxing crescent over slate-blue hills.",
  evidenceNote: "JPL Horizons DE441 apparent AIRLESS Sun and Moon positions at the amphitheatre, Julian AD80-Jun10, 03:00\u201322:15 UT1. The representative date and weather are authored, not a dedication-date claim. Ancient Earth rotation is estimated. The 2.4\xD7 common angular enlargement improves legibility without moving either body or changing lunar phase.",
  domeRadius: 2200,
  sun: {
    ephemerisId: COLOSSEUM_EPHEMERIS.id,
    discAngularRadiusDegrees: COLOSSEUM_EPHEMERIS.rows[0][3] * COLOSSEUM_CELESTIAL_ANGULAR_SCALE,
    description: "Ephemeris-driven direction and changing apparent radius; no held elevation or authored azimuth sweep."
  },
  // Stops use actual solar altitude, so dawn/dusk agree at the same altitude
  // and palette transitions cannot drift from the shared astronomical clock.
  keyframes: [
    {
      sunElevationDegrees: -18,
      label: "night",
      description: "Readable slate-blue night; no daylight beige survives in the fog.",
      zenith: "#13213a",
      horizon: "#303f58",
      sunTint: "#b78a76",
      cloudTint: "#52617a",
      cloudShadow: "#25364f",
      cloudOpacity: 0.22,
      haze: 0.035,
      fogStretch: 1.42,
      fogNeutralizer: "#33445d"
    },
    {
      sunElevationDegrees: -12,
      label: "nautical-twilight",
      description: "Deep upper blue with a dim lavender western horizon.",
      zenith: "#1c3157",
      horizon: "#495472",
      sunTint: "#d69b79",
      cloudTint: "#6d7794",
      cloudShadow: "#344660",
      cloudOpacity: 0.24,
      haze: 0.05,
      fogStretch: 1.42,
      fogNeutralizer: "#4b5971"
    },
    {
      sunElevationDegrees: -6,
      label: "civil-twilight",
      description: "A cool valley beneath a restrained rose horizon after the direct sun has gone.",
      zenith: "#2a4a75",
      horizon: "#8e8194",
      sunTint: "#ffc294",
      cloudTint: "#b3a1af",
      cloudShadow: "#52647e",
      cloudOpacity: 0.28,
      haze: 0.075,
      fogStretch: 1.42,
      fogNeutralizer: "#748199"
    },
    {
      sunElevationDegrees: -1,
      label: "horizon",
      description: "A thin warm horizon under blue air, tied to the true setting/rising Sun.",
      zenith: "#3b5d87",
      horizon: "#b59caa",
      sunTint: "#ffbd82",
      cloudTint: "#ddbac1",
      cloudShadow: "#6b7d97",
      cloudOpacity: 0.3,
      haze: 0.1,
      fogStretch: 1.4,
      fogNeutralizer: "#a3aebe"
    },
    {
      sunElevationDegrees: 6,
      label: "low-sun",
      description: "Warm stone edges and pearl distance beneath a clearly blue dome.",
      zenith: "#476f9e",
      horizon: "#c4bcc2",
      sunTint: "#ffcf99",
      cloudTint: "#eddbce",
      cloudShadow: "#788da3",
      cloudOpacity: 0.28,
      haze: 0.11,
      fogStretch: 1.36,
      fogNeutralizer: COLOSSEUM_FOG_NEUTRALIZER
    },
    {
      sunElevationDegrees: 22,
      label: "daylight",
      description: "Dry blue air with thin fair-weather cloud and separated urban hills.",
      zenith: "#397bb2",
      horizon: "#bfccd0",
      sunTint: "#ffe4bc",
      cloudTint: "#f3ece2",
      cloudShadow: "#7e96aa",
      cloudOpacity: 0.24,
      haze: 0.12,
      fogStretch: 1.3,
      fogNeutralizer: COLOSSEUM_FOG_NEUTRALIZER
    },
    {
      sunElevationDegrees: 60,
      label: "midday",
      description: "High Mediterranean blue and pale distance around the sunlit amphitheatre.",
      zenith: "#2f74b0",
      horizon: "#b3c6d0",
      sunTint: "#fff3d6",
      cloudTint: "#f7f3ec",
      cloudShadow: "#8098a8",
      cloudOpacity: 0.22,
      haze: 0.13,
      fogStretch: 1.2,
      fogNeutralizer: COLOSSEUM_FOG_NEUTRALIZER
    }
  ]
};
function paletteAtSolarElevation(elevation) {
  const frames = COLOSSEUM_SKY.keyframes;
  let upper = frames.findIndex((frame) => frame.sunElevationDegrees >= elevation);
  if (upper < 0) upper = frames.length - 1;
  const before = frames[Math.max(0, upper - 1)], after = frames[upper];
  const p = smoothstep((elevation - before.sunElevationDegrees) / Math.max(1e-3, after.sunElevationDegrees - before.sunElevationDegrees));
  const number = (a, b) => a + (b - a) * p;
  return {
    zenith: lerpColor(before.zenith, after.zenith, p),
    horizon: lerpColor(before.horizon, after.horizon, p),
    sunTint: lerpColor(before.sunTint, after.sunTint, p),
    cloudTint: lerpColor(before.cloudTint, after.cloudTint, p),
    cloudShadow: lerpColor(before.cloudShadow, after.cloudShadow, p),
    fogNeutralizer: lerpColor(before.fogNeutralizer, after.fogNeutralizer, p),
    cloudOpacity: number(before.cloudOpacity, after.cloudOpacity),
    haze: number(before.haze, after.haze),
    fogStretch: number(before.fogStretch, after.fogStretch)
  };
}
function sampleColosseumSky(rawT) {
  const clock = celestialClockAt(rawT);
  const astronomy = colosseumAstronomyAtJulianDay(clock.julianDayUt1);
  const altitude = astronomy.sun.elevationDegrees;
  const daylight = smoothstep((altitude + 1) / 10);
  const night = 1 - smoothstep((altitude + 18) / 12);
  return {
    ...paletteAtSolarElevation(altitude),
    t: clock.t,
    astronomy,
    daylight,
    night,
    twilight: clamp(1 - daylight - night)
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
var DEG2 = Math.PI / 180;
var ORBIT_START = -75 * DEG2;
var ORBIT_SWEEP = 125 * DEG2;
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
uniform float uSunVisibility;
uniform vec3 uMoonDirection;
uniform vec3 uMoonLightDirection;
uniform float uMoonDiscSin;
uniform float uMoonVisibility;
uniform float uNight;

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
  float sunAA = max(fwidth(cosSun), 0.000001);
  float horizonMask = smoothstep(-0.0003, 0.0003, elevation);
  float disc = smoothstep(uSunDiscCos - sunAA, uSunDiscCos + sunAA, cosSun);
  // The body is horizon-clipped; light scattered in air has no hard zero-
  // altitude edge. Clipping the halo too made a rectangle beneath the Sun.
  float scatteredHalo = (halo * 0.48 + wideHalo * 0.10)
    * smoothstep(-0.055, 0.025, elevation);
  float sunlight = (scatteredHalo + disc * 2.9 * horizonMask) * uSunVisibility;
  color += uSunTint * sunlight;

  // Project an illuminated sphere onto the sky. The observer-facing centre
  // normal is -Moon, not +Moon. This same Moon-to-Sun vector determines both
  // phase area and the bright limb's rotation; there is no screen-space flip.
  vec3 moonRight = normalize(cross(uMoonDirection, vec3(0.0, 1.0, 0.0)));
  vec3 moonUp = cross(moonRight, uMoonDirection);
  vec2 moonUv = vec2(dot(dir, moonRight), dot(dir, moonUp)) / uMoonDiscSin;
  float r2 = dot(moonUv, moonUv);
  float moonAA = max(fwidth(r2), 0.001);
  float moonDisc = (1.0 - smoothstep(1.0 - moonAA, 1.0 + moonAA, r2))
    * step(0.0, dot(dir, uMoonDirection)) * uMoonVisibility * horizonMask;
  vec3 moonNormal = moonUv.x * moonRight + moonUv.y * moonUp
    - sqrt(max(0.0, 1.0 - r2)) * uMoonDirection;
  float incidence = dot(moonNormal, uMoonLightDirection);
  float terminator = smoothstep(-0.012, 0.012, incidence);
  // Restrained albedo texture is illustrative, not a claimed libration map.
  float lunarAlbedo = 0.86 + noise(moonUv * 5.0) * 0.14;
  float moonRadiance = terminator * (0.32 + 0.68 * sqrt(max(0.0, incidence)));
  float transmission = 1.0 - cloudBody * uCloudOpacity * 0.8;
  vec3 lunarColor = vec3(0.83, 0.87, 0.92) * lunarAlbedo
    * (moonRadiance * mix(0.62, 1.9, uNight) + 0.008 * uNight);
  // Atmospheric scattering lies in front of the distant Moon. Preserve that
  // radiance across its unlit hemisphere instead of cutting a black disc out
  // of the local sky; the lit surface and faint earthshine add their radiance.
  color += lunarColor * moonDisc * transmission;

  // Blend in linear colour space. Thin valley air must not erase the low sun.
  float fogBlend = (1.0 - smoothstep(-0.008, 0.048, elevation))
    * (1.0 - smoothstep(0.12, 0.7, max(sunlight, moonDisc * moonRadiance)));
  color = mix(color, uFogColor, fogBlend);
  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`
);
var ColosseumSkyDome = class {
  mesh;
  geometry = new SphereGeometry2(COLOSSEUM_SKY.domeRadius, 24, 12);
  material;
  fogScratch = new Color9();
  fogNeutralizer = new Color9();
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
        uSunDiscCos: { value: 1 },
        uSunVisibility: { value: 0 },
        uMoonDirection: { value: new Vector35(0, 0, -1) },
        uMoonLightDirection: { value: new Vector35(1, 0, 0) },
        uMoonDiscSin: { value: 0.01 },
        uMoonVisibility: { value: 0 },
        uNight: { value: 0 }
      }
    });
    this.mesh = new Mesh7(this.geometry, this.material);
    this.mesh.name = "colosseum-world-space-weather-sky";
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -100;
  }
  update(_t, sky, sunDirection) {
    const uniforms = this.material.uniforms;
    uniforms.uHorizon.value.set(sky.horizon);
    uniforms.uZenith.value.set(sky.zenith);
    deriveSceneFogColor(sky.horizon, this.fogScratch, this.fogNeutralizer.set(sky.fogNeutralizer));
    uniforms.uFogColor.value.copy(this.fogScratch);
    uniforms.uSunDirection.value.copy(sunDirection);
    uniforms.uSunTint.value.set(sky.sunTint);
    uniforms.uCloudTint.value.set(sky.cloudTint);
    uniforms.uCloudShadow.value.set(sky.cloudShadow);
    uniforms.uCloudOpacity.value = sky.cloudOpacity;
    uniforms.uHaze.value = sky.haze;
    uniforms.uTime.value = sky.t;
    const { sun, moon } = sky.astronomy;
    const radians = Math.PI / 180 * COLOSSEUM_CELESTIAL_ANGULAR_SCALE;
    uniforms.uSunDiscCos.value = Math.cos(sun.angularRadiusDegrees * radians);
    uniforms.uSunVisibility.value = sun.horizonVisibility;
    uniforms.uMoonDirection.value.set(moon.direction[0], moon.direction[1], -moon.direction[2]);
    uniforms.uMoonLightDirection.value.set(moon.lightDirection[0], moon.lightDirection[1], -moon.lightDirection[2]);
    uniforms.uMoonDiscSin.value = Math.sin(moon.angularRadiusDegrees * radians);
    uniforms.uMoonVisibility.value = moon.horizonVisibility;
    uniforms.uNight.value = Math.max(0, Math.min(1, -sun.elevationDegrees / 12));
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
function lerp2(a, b, t) {
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
    return [staged[0], lerp2(staged[1], liftY, up), staged[2]];
  }
  if (local < 0.76) {
    const over = easeInOutQuad((local - 0.42) / 0.34);
    return [lerp2(staged[0], seat[0], over), liftY, lerp2(staged[2], seat[2], over)];
  }
  const down = easeInOutQuad((local - 0.76) / 0.24);
  return [seat[0], lerp2(liftY, seat[1], down), seat[2]];
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
  if (kind === "seat") return createCaveaSeatGeometry(compact ? 4 : 12);
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
  BufferGeometry as BufferGeometry6,
  CylinderGeometry as CylinderGeometry3,
  DoubleSide as DoubleSide3,
  Float32BufferAttribute as Float32BufferAttribute6,
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
  const bays = new Map(colosseumScaffoldsAt(t).map((bay) => [bay.station, bay]));
  for (let station = 0; station < COLOSSEUM_SCAFFOLD_STATIONS; station += 1) {
    const id = `climb-${station}`;
    const s = salt(id);
    const bay = bays.get(station);
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
    const cap = bay?.deckY ?? foot;
    const deckY = cap;
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
      const closingStrike = window2.kind === "striking" && window2.strikeFrom >= 0.9;
      const startingHeight = window2.base + window2.rise * (1 - (0.7 + s[2] * 0.3));
      const supportedHeight = closingStrike ? startingHeight * (1 - clamp(local / 0.75)) : desired;
      const y = Math.min(foot + supportedHeight, cap);
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
      const groundHandoff = window2.strikeFrom >= 0.9 && (station === 1 || station === 17);
      const y = foot + (groundHandoff ? (window2.base + window2.rise) * (1 - u) : window2.base + window2.rise * (1 - u * (0.7 + s[2] * 0.3)));
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
  // Two crossed triangles per leg: a direction-independent foot-to-hip shadow
  // silhouette, not a flat ground decal. Keeping the feet separate preserves
  // gait gaps. Four triangles per worker cost eight submissions including the
  // invisible main pass, versus resubmitting both detailed cylinder legs.
  crewContactGeometry = new BufferGeometry6().setAttribute("position", new Float32BufferAttribute6([
    -1,
    0,
    0,
    1,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    -1,
    0,
    0,
    1,
    0,
    1,
    0
  ], 3));
  crewContactMaterial = new MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: DoubleSide3, shadowSide: DoubleSide3 });
  bodies;
  heads;
  legs;
  crewContactShadows;
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
    this.crewContactGeometry.computeVertexNormals();
    this.crewContactShadows = new InstancedMesh4(this.crewContactGeometry, this.crewContactMaterial, MAX_WORKERS * 2);
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
    this.crewContactShadows.name = "colosseum-crew-contact-shadows";
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
      this.crewContactShadows,
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
      const hip = new Vector37(0, -0.3, 0).applyMatrix4(matrix);
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
        const foot = new Vector37(0, -0.31, 0).applyMatrix4(matrix);
        const footRadius = 0.065 * FIGURE;
        matrix.set(
          lx * footRadius,
          hip.x - foot.x,
          fx * footRadius,
          foot.x,
          0,
          hip.y - foot.y,
          0,
          foot.y,
          lz * footRadius,
          hip.z - foot.z,
          fz * footRadius,
          foot.z,
          0,
          0,
          0,
          1
        );
        this.crewContactShadows.setMatrixAt(legs, matrix);
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
      [this.crewContactShadows, legs],
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
    this.crewContactGeometry.dispose();
    this.crewContactMaterial.dispose();
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
      this.crewContactShadows,
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
  content = new Group7();
  environment;
  stones;
  work;
  constructor(materials) {
    this.group.name = "colosseum-reference-world";
    this.sky = new ColosseumSkyDome();
    this.environment = new ColosseumEnvironment(materials);
    this.stones = new ColosseumStoneSystem(COLOSSEUM_CONSTRUCTION, materials);
    this.work = new ColosseumWorkSystem(materials, COLOSSEUM_CONSTRUCTION);
    this.content.name = "colosseum-geographic-content";
    this.content.scale.z = -1;
    this.content.add(this.environment.group, this.stones.group, this.work.group);
    this.group.add(this.sky.mesh, this.content);
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
  { t: 0, azimuth: 3.55, pitchDeg: 10, radius: 336, target: [0, 6, 0] },
  { t: 0.16, azimuth: 3.84, pitchDeg: 14.4, radius: 322, target: [2, 10, 0] },
  { t: 0.32, azimuth: 4.2, pitchDeg: 15.2, radius: 308, target: [2, 16, 0] },
  { t: 0.48, azimuth: 4.65, pitchDeg: 16, radius: 318, target: [1, 22, 0] },
  { t: 0.62, azimuth: 5.35, pitchDeg: 13, radius: 338, target: [0, 26, 0] },
  { t: 0.7, azimuth: 5.76, pitchDeg: 9, radius: 350, target: [0, 27, 0] },
  { t: 0.78, azimuth: 5.97, pitchDeg: 7.2, radius: 358, target: [0, 27, 0] },
  { t: 0.86, azimuth: 6.08, pitchDeg: 6, radius: 370, target: [0, 25, 0] },
  { t: 1, azimuth: 6.08, pitchDeg: 6, radius: 392, target: [0, 24, 0] }
];
var lerp3 = (a, b, t) => a + (b - a) * t;
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
  const azimuth = lerp3(from.azimuth, to.azimuth, from === to ? 1 : span);
  const fov = aspect < 0.72 ? 42 : 35;
  const projectedHalfWidth = Math.hypot(94 * Math.sin(azimuth), 78 * Math.cos(azimuth));
  const portraitFit = aspect < 0.72 ? projectedHalfWidth * 1.16 / (Math.tan(fov * Math.PI / 360) * Math.max(0.3, aspect)) : 0;
  return {
    azimuth,
    pitch: lerp3(from.pitchDeg, to.pitchDeg, local) * Math.PI / 180,
    radius: Math.max(lerp3(from.radius, to.radius, local) * narrow, portraitFit),
    target: [
      lerp3(from.target[0], to.target[0], local),
      lerp3(from.target[1], to.target[1], local),
      lerp3(from.target[2], to.target[2], local)
    ],
    fov
  };
}

// artifacts/colosseum-celestial-2026-09-20/review/phone-budget-sweep.ts
var world = new ColosseumWorld(createMaterialLibrary(getWonder("colosseum")));
await world.ready;
var light = { sun: { azimuth: 0, elevation: 20, color: "#fff", intensity: 1 }, ambient: { skyColor: "#fff", groundColor: "#fff", intensity: 1 }, sky: "#fff", fog: "#fff", emissive: 0 };
var results = [];
for (const aspect of [375 / 667, 0.6, 0.71]) {
  const camera = new PerspectiveCamera5(35, aspect, 0.1, 4e3);
  let peak = 0, peakT = 0;
  for (let frame = 0; frame <= 3600; frame++) {
    const t = frame / 3600, shot = colosseumCinematicShotAt(t, aspect), horizontal = Math.cos(shot.pitch) * shot.radius;
    camera.position.set(shot.target[0] + Math.cos(shot.azimuth) * horizontal, shot.target[1] + Math.sin(shot.pitch) * shot.radius, -shot.target[2] - Math.sin(shot.azimuth) * horizontal);
    camera.lookAt(shot.target[0], shot.target[1], -shot.target[2]);
    camera.fov = shot.fov;
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
writeFileSync("artifacts/colosseum-celestial-2026-09-20/review/phone-budget-sweep.json", JSON.stringify(results, null, 2));
if (results.some((r) => r.peak > r.budget)) process.exitCode = 1;
