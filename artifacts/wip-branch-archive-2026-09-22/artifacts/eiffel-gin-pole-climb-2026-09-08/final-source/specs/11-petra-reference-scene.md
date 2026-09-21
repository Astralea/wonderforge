# Spec 11 — Petra Replication Scene

Petra is the second forward test of the Giza pipeline and of
`.agents/skills/wonderforge-scene-builder/`. It preserves the stable `petra`
ID but replaces the legacy silhouette with typed, deterministic **subtractive**
construction: Al-Khazneh (the Treasury) is carved from living sandstone, not
assembled from hauled blocks.

Giza remains the quality bar. Stonehenge remains the first additive
replication. This scene transfers **contracts** (determinism, final-size
solids, shared support sampling, contact residuals, target-owned sky, unique
soundtrack lookup) and does **not** transfer Giza ramps, Stonehenge pits, or
A-frames.

## Evidence and authored interpretation

Authoritative anchors:

- UNESCO World Heritage List no. 326: Petra is a Nabataean rock-cut capital
  reached through the Siq; Al-Khazneh is carved directly into the sandstone
  cliff, not stacked masonry.
- Judith McKenzie, *The Architecture of Petra* (1990): facade about 24.9 m
  wide and about 39 m tall; a two-storey Hellenistic composition (hexastyle
  portico, broken pediment, central tholos) cut into Jabal al-Khubtha.
- Jordan Department of Antiquities / site literature: the Siq is a natural
  gorge on the order of 1.2 km.
- Shaher Rababeh, work on Nabataean facade carving: masons typically worked
  **top-down**, using the unexcavated rock beneath their feet as a bench so
  full-height ground falsework was not required.

Dating is not settled. This movie authors the Treasury during Petra's
Nabataean floruit around the late first century BC to early first century AD
(often associated with Aretas IV) and labels that as a compression, not a
proof. Hellenistic versus later Roman-period readings remain open in the
notes; the movie does not claim a single reign as fact.

The exact scaffold and spoil-handling kit is thinly evidenced. This movie
authors one coherent interpretation: iron picks and claw chisels cut a
descending working face; timber benches, side chutes, and fibre-rope baskets
lower spoil; drag-sleds take cells along the Siq floor to a wadi dump. That
kit is a plausible reconstruction, not proven archaeology. No gunpowder,
cranes, concrete vaults, or tourist infrastructure appear.

The movie compresses years of carving into one minute. It constructs the
intended complete facade rather than the weathered modern monument.

## Subtractive physical contract

One world unit is approximately one metre.

Two populations:

- **Remaining-rock members** (`PetraRockMember`): urn, tholos, pediment
  wings, entablature, hexastyle columns, doorway, podium, and side aediculae.
  Each is authored at final size and final transform. Members **never
  translate, rotate, or scale**. They are unmasked in place when the working
  face has descended through their top **and** their covering spoil cells
  have been cut free. This is the subtractive analogue of Spec 02's "seated
  stones never move"; it is **not** permission for additive parts to pop in
  at their destination.
- **Spoil cells** (`PetraSpoilCell`): the traveling solids. Each cell keeps
  `[1,1,1]` scale and its authored dimensions from the cliff envelope to the
  dump. No cell first appears at the dump. Phase boundaries share endpoints.
  During haul, the transformed bottom meets the shared Siq terrain sampler
  plus engine-owned sled height within 3 cm. Carrier height is applied once.

Working-face height is a pure function of `t`. Upper envelope rows start
before lower rows. Active haul concurrency stays within an authored cap
(≤12). Dust exists only at cut and runner contacts.

## Experience and art direction

Subject: Nabataean masons carving Al-Khazneh from the rose-red cliff at the
mouth of the Siq. Audience: a viewer who should understand that the monument
is **released from the mountain**, not stacked in front of it.

Visual tokens:

| Role | Color | Use |
|---|---|---|
| Sunlit Disi rose | `#c77b4f` | dressed facade and remaining members |
| Strata shadow | `#a35c38` | bedding, recesses, freshly cut faces |
| Siq shade | `#4a2e2b` | gorge walls and deep canyon fill |
| Plaza ochre | `#c9a06a` | trampled floor and spoil chips |
| Juniper timber | `#6e472a` | benches, chutes, sled decks |
| Dry rift sky | `#6fa3c8` | high blue dome; not a sealed studio grey |

The sky is a subject. Petra owns a typed Wadi Musa / rift-margin sky: a dry
blue zenith, a warm sandstone-bounce horizon, thin high cloud, and raking
sun that can enter the Siq mouth. At desktop and portrait checkpoints a
readable strip of blue must survive above the massif and in the gorge slot;
fog may not collapse cliff, timber, and sky into one brown family.

Avoid a generic "orange box in a canyon." Ground identity comes from the Siq
floor, stratified wall bedding, a spoil fan, timber benches hung from the
working face, and human-scale crews. Weight is visible before ornament:
baskets sag, sled runners sit in the gravel, and a column is the rock that
remained after its covering cells left.

Signature shot: from inside the Siq mouth, dark walls frame a sunlit working
face at the tholos while a loaded sled leaves toward the camera's flank.

Desktop composition:

```text
dry blue sky / massif crown / high cloud
     working face + timber bench
Siq wall     TREASURY RELIEF     Siq wall
     haul sled on gravel floor
```

Portrait composition:

```text
sky slot above the cliff
tholos / urn
descending bench + crews
Siq floor and sled
```

## Typed inventory

- Facade envelope about 24.9 m × 38.8 m, facing −Z, plaza at y = 0, cliff
  mass in +Z.
- Remaining members for the two-storey Hellenistic composition, each with a
  stable ID, dimensions, final transform, covering spoil IDs, and seeded
  colour variation.
- Spoil grid covering the front envelope, scheduled top-down.
- One Siq haul route with source ledge, plaza chute apron, gorge floor, and
  dump fan.
- Layers: dry-rift sky, sandstone massif, Siq gorge, treasury facade, work
  systems, foreground floor.

Camera checkpoints are co-authored with the descending face. Pitch stays
below `fov / 2` so the dome can enter the frame. Portrait widens FOV and
radius without exposing a horizon edge.

## Soundtrack and captions

Petra uses wonder-keyed cues only. Missing or unreviewed audio is silence,
never Giza's reeds or Stonehenge's hide drum. Captions name top-down
carving, the Siq, the living sandstone, and the authored spoil haul without
presenting the timber kit as proven fact.

## Render and budgets

Production dispatch selects `PetraWorld`. Giza, Stonehenge, and remaining
fallback IDs stay unchanged. Target: ≤120 desktop / ≤95 mobile draw calls,
≤180k / ≤120k triangles, ≤80 / ≤60 geometries, ≤16 textures, DPR as Spec 03.

## Acceptance

See Spec 04 §Petra replication acceptance and
`.agents/skills/wonderforge-scene-builder/references/acceptance.md`.
The movie is not done when the finished facade looks correct. Scrubbing must
keep the descending face, covering-cell removal, and Siq haul causally
legible.
