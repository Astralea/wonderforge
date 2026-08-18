import { z } from 'zod';

/** Spec 07 — JSON scene document schema. */

const vec2 = z.tuple([z.number(), z.number()]);
const vec3 = z.tuple([z.number(), z.number(), z.number()]);

export const shapeSchema = z.enum([
  'box',
  'cylinder',
  'cone',
  'pyramid',
  'prism',
  'sphere',
  'torus',
  'ramp',
  'sail',
]);

export const materialSchema = z.enum([
  'primary',
  'accent',
  'ground',
  'foliage',
  'water',
  'light',
  'shadow',
  'casing',
]);

export const partSchema = z.object({
  shape: shapeSchema,
  material: materialSchema.optional(),
  position: vec3,
  scale: vec3,
  rotation: vec3.optional(),
  entrance: z.enum(['place', 'stack', 'carve', 'fade', 'scaffold', 'none']).optional(),
  order: z.number().optional(),
  jitter: z.number().optional(),
});

const componentSchema = z
  .object({
    id: z.string().min(1),
    /** Components sharing a stage build together; stages build in list order. */
    stage: z.string().min(1),
    generator: z
      .enum([
        'steppedPyramid',
        'masonryPyramid',
        'ring',
        'row',
        'arcade',
        'tieredTower',
        'trilithonArc',
      ])
      .optional(),
    params: z.record(z.string(), z.unknown()).optional(),
    material: materialSchema.optional(),
    parts: z.array(partSchema).optional(),
    /** Default entrance for generated parts. */
    entrance: z.enum(['place', 'stack', 'carve', 'fade', 'scaffold', 'none']).optional(),
  })
  .refine((c) => c.generator || c.parts, {
    message: 'component needs a generator or explicit parts',
  });

const backdropLayerSchema = z.object({
  kind: z.enum(['dunes', 'cliffs', 'hills', 'city', 'jungle', 'mountains', 'harbor']),
  /** Horizon distance as a multiple of the structure footprint radius. */
  distance: z.number().min(1.5).max(6),
  /** Silhouette height as a fraction of footprint radius. */
  height: z.number().min(0.1).max(2.5),
  tint: z.string().regex(/^#[0-9a-f]{6}$/i),
  /** Optional detail dressing the layer's foot (Spec 08). */
  details: z.array(z.enum(['palms', 'river'])).optional(),
});

export const sceneDocSchema = z.object({
  wonder: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  style: z.object({ notes: z.string() }).optional(),
  camera: z
    .object({
      startAzimuth: z.number().optional(),
      turns: z.number().min(0.5).max(2).optional(),
      framing: z.number().min(0.7).max(1.4).optional(),
    })
    .optional(),
  lighting: z.object({ endsAtNight: z.boolean() }).optional(),
  background: z.object({
    terrain: z.enum(['desert', 'plain', 'cliff', 'city', 'jungle', 'mountain', 'harbor']),
    layers: z.array(backdropLayerSchema).max(3),
  }),
  mainObject: z.object({
    components: z.array(componentSchema).min(1),
    /** Rhythm weights per stage name (Spec 02): heavier stages linger. */
    stageWeights: z.record(z.string(), z.number().min(0.2).max(5)).optional(),
  }),
  foreground: z
    .object({
      workers: z
        .union([
          z.object({
            count: z.number().int().min(1).max(24),
            path: z.enum(['perimeter', 'road', 'ramp']),
            carry: z.boolean().optional(),
          }),
          z.array(
            z.object({
              count: z.number().int().min(1).max(24),
              path: z.enum(['perimeter', 'road', 'ramp']),
              carry: z.boolean().optional(),
            }),
          ),
        ])
        .optional(),
      /** Packed-dirt site roads (decals + worker routes): from → to. */
      roads: z
        .array(
          z.object({
            from: vec2,
            to: vec2,
            width: z.number().min(0.5).max(4).optional(),
          }),
        )
        .max(2)
        .optional(),
      /** Construction ramps: earthen inclines leaning on a stage's structure,
       *  climbed by `ramp` crews while that stage is being built (Spec 08). */
      ramps: z
        .array(
          z.object({
            from: vec2,
            to: vec2,
            height: z.number().min(0.5).max(30),
            stage: z.string(),
          }),
        )
        .max(2)
        .optional(),
      scaffolding: z
        .object({
          style: z.enum(['wood-frame']),
          aroundStages: z.array(z.string()),
        })
        .optional(),
      dust: z.boolean().optional(),
      /** Disable generic scatter when the scene authors its own site debris. */
      scatter: z.boolean().optional(),
      fauna: z
        .object({ kind: z.enum(['birds']), count: z.number().int().min(1).max(8) })
        .optional(),
    })
    .optional(),
});

export type SceneDoc = z.infer<typeof sceneDocSchema>;
export type ScenePart = z.infer<typeof partSchema>;
export type BackdropLayer = z.infer<typeof backdropLayerSchema>;
