# K3 Visual Director — Eiffel Tower pass 146 review

**Review:** silent score of `artifacts/eiffel-pass-146/` (desktop 1440×900,
mobile 390×844 → drawing buffer 526×1139, confirmed in each `*.json`).
**Comparator:** `artifacts/eiffel-pass-144/` (live tree before this pass).
**Bundle:** `index-B45tcRgA.js`. **Engine state:** 125 calls / 702k tris,
within budget, no console or page errors (`desktop-058/desktop.json`).

**Verdict: NOT AN ACCEPT.** The occupancy experiment partially works —
labour does occupy P2 and the A, support/contact is clean, and nothing
else in frame moved (needle pixel-identical). But the new crews are laid
out as **single ranks of identically-posed figures**: a 14-figure unbroken
muster at the t = 0.32 join capture and a 13-figure unbroken rank across
the P1 deck front at t = 0.58 that persists, still rank-like and still
saturated, into the dusk reveals. That is the chorus-line failure class
transplanted from the Champ onto the A. Pass 144's two separated 4-figure
riveting gangs at the same deck read *better* as labour with a *third* of
the population.

## Checkpoint scores

| Beat | Ask | Score | Notes |
|---|---|---|---|
| t=0.12 | Palais + ticks still punch | **PASS** | Palais colonnade + wing pavilions punch in FG; pylon-position ticks (staged iron heaps, north-gang pairs) present; pngjs flat vs 144, Palais crop byte-equal shares. Same on mobile. |
| t=0.32 | four feet vs two arches vs two legs | **FAIL** (unchanged nest + new crown muster) | Still reads as **two legs** — far pair fully nested, known due-north limitation, equal in 144. **New this pass:** a 14-figure shoulder-to-shoulder rank crowns the frame at the join beat. |
| t=0.58 | A-plus-needle vs coarse truss blob | **PASS** (needle lace) | Needle reads as fine X-bay lace with sky through every bay; distinct chords, tumblehome, belt at P2. Not a blob. See `…/crops/058-shape.png`. |
| t=0.58 | labour reads as people on decks | **PARTIAL → FAIL on kinematics** | Support and placement are correct (feet on deck slab, gangs at arch springing), and pngjs confirms occupation (P2 brown +0.034). But the arrangement is one evenly-spaced rank of identically-posed figures, not crews at work. |
| t=0.78 | campanile | **PASS** (framing) | Apex fully in frame with sky margin; dusk still-blue per Spec 14; lace stages readable. Rank persists at P1 waist as an un-dimming orange fringe (see defect 3). |

## What the evidence shows

### 1. The t=0.32 crown is a muster, not a workforce — the pass's largest new defect

`…/crops/032-crown-zoom.png` (from `eiffel-pass-146/desktop-032/desktop.png`,
crop x 620–840, y 140–210): **fourteen figures, one unbroken rank, identical
upright pose, identical domed heads, identical V-leg stance**, shoulder to
shoulder across the crown, edged on both ends by a dark seated piece. Tunic
colors cycle (red/orange/brown/cream) but the body stamp does not vary.

Same beat in 144 (`…/crops/144-032-crown-zoom.png`): **six figures in two
offset clusters of three**, with lean and spacing variation. The 144 beat
reads as men at the join; the 146 beat reads as a roll-call line at the
literal climax of the movie, silhouetted against open sky where a viewer
cannot miss it.

This is rule 11 ("people work, never pose as a ring") in its naked form.
The brief asked "without a Champ chorus"; the chorus arrived, wearing the
join.

### 2. t=0.58: population doubles, labour legibility regresses vs 144

146 (`…/crops/058-shape.png`, tick `desktop-058/desktop.png`): ~13 figures in
one unbroken rank across the P1 deck front, every figure the same stamp
(forward lean, arms to a shared horizontal rod, even spacing). A second pair
of 4-figure groups at the arch-spring level reads better (two separated
gangs — `…/crops/058-base-ranks.png`) but shares the same single stamp.

144 (`…/crops/144-058-shape.png`): **two gangs of four**, each leaning into
the girder with tools, separated by working gaps — unmistakably "men riveting"
rather than "measured persons". With ~8 figures, 144 communicates riveting
labour more clearly than 146 does with ~13 + lower pairs. Count is not the
currency; pose-to-station binding is.

Support/contact itself is clean at 4× zoom: feet terminate on the deck slab
top, no floaters, no calf-burial beyond slab shadow; lower gangs stand on the
belt beam. The failure is arrangement and gait-uniformity, not placement.
Per the still, "seven mixed jobs, unique gaits" (Spec 14 §evidence/labour)
is not visible — one gait's stride and lean repeats across the rank.

### 3. The rank never leaves, and it never dims — t=0.78 / 0.92 / 1.0

At t=0.78 (`desktop-078/desktop.png`, `…/crops/078-full-mid.png`) theP1 front
keeps the full orange rank while the rest of the scene has gone to dusk
near-silhouette; the tunics hold daylight saturation, so the A wears a
glowing red-orange necklace against a darkening iron bonfire. At t=0.92
(`…/crops/092-waist.png`) the same rank reads as a string of red pennants
beside a blown-hot lantern ball, plus **white speckle clusters** on the lower
A lattice (also present but weaker in 144's same-region crop
`…/crops/144-092-waist.png` — pre-existing class, mildly amplified). At
t = 1.0 the night reveal and searchlight read well; the rank motif sits
under the warm decks.

Lighting consistency claim: if the world's fill drops, labour under the same
sky must dim with it. It does not. (Related known issue: lit `#e07028`
tunics classify as brown, not orange, in the day histograms — they are
neither honest orange in day nor honest dark at dusk; they are a fixed
saturated red constant across light.)

### 4. What did not move — verified independently

I re-derived the brief's pngjs claims with my own classifier and crops
(script: `…/crops/hist-check-058.mjs`; crop boxes are VD-authored proxies, so
absolute shares differ slightly from the FEE's, directions must hold):

| Region (my crop) | Metric | 144 | 146 | Brief claim | Match |
|---|---|---|---|---|---|
| needle (x675 y10 120×220) | dark / sky / brown | 0.491 / 0.505 / 0.003 | **0.491 / 0.505 / 0.003** | flat 0.783 | ✓ pixel-identical |
| P2 deck band (x630 y290 260×110) | brown | 0.058 | **0.092** | 0.053 → 0.092 | ✓ 146 exact |
| same | cream | 0.028 | **0.006** | 0.031 → 0.005 | ✓ |
| same | orange | 0.000 | **0.001** | (noted: tunics miss orange, read brown) | ✓ confirmed |
| north-X legs (x620 y410 280×150) | brown | 0.015 | **0.035** | 0.015 → 0.029 | ✓ direction, similar magnitude |
| same | dark / green | 0.621 / 0.255 | 0.620 / 0.239 | dark/green flat | ✓ |
| join gap (x640 y560 240×120) | brown / green | 0.088 / 0.293 | 0.124 / 0.278 | (felt: more brown at gap feet) | new brown = lower gangs/iron |
| t=0.12 near-X (x600 y330 260×140) | all | brown 0.192 dark 0.299 sky 0.438 | 0.187 / 0.301 / 0.444 | opening flat | ✓ |
| t=0.12 Palais (x250 y600 900×120) | all | brown 0.162 dark 0.682 | **identical** | opening flat | ✓ |

Occupancy is real — the brown lift at P2 and the legs is placed labour and
iron. The mechanism works; the choreography does not.

### 5. Mobile (390×844, buffer 526×1139 ✓)

- t=0.12: Palais arcade + Seine + ticks punch on the small frame. PASS.
- t=0.32: two legs; the crown double-rank is even denser on portrait
  (~24 compressed bodies across the belt+belt-behind) — the nesting that
  compresses the four pylons also compresses their crews into one band.
- t=0.58: lace + deck rank same as desktop; creeper gold jib reads at left
  of needle. PARTIAL/FAIL on chorus as above.
- t=0.78: still-blue dusk confirmed on portrait (dispels a determinism
  scare: identical sky state to desktop at same t; luminance 49.8 vs 56.9 is
  framing, not light difference).

## Defects (physical claims, with coordinates in the 1440×900 frame)

1. **Chorus rank at the join beat.** `desktop-032/desktop.png`, x 635–840,
   y 145–205: 14 identically-posed labour instances in one evenly-spaced
   rank against open sky. New in 146 (144 had 6 in two clusters).
2. **Chorus rank at P1 across BUILD and dusk.** `desktop-058/desktop.png`,
   x 610–870, y 300–365: 13 figures, one stamp, even pitch — persists at
   0.78/0.92 with daylight saturation under dusk fill. Same stamp at the
   arch-spring gangs (x 645–905, y 525–585) and on mobile.
3. **Luminous tunics at dusk.** The crews' tunic material does not respond
   to dusk fill: the only saturated objects at t=0.78/0.92 are the labour
   ranks (plus lanterns). A deck figure at y≈300 desktop-078 holds day-red
   while the grass beneath its legs is near-black.
4. (Pre-existing, amplified) **white speckle clusters on the night A** —
   `desktop-092/desktop.png` x ~840–960, y ~480–600. Present in 144 weaker.
   Not this pass's introduction; note for a future pass.
5. (Not a defect; scoping note) **Due-north nest unchanged**: t=0.32 desktop
   still reads two legs; far pair nested. Equal to 144; the pass neither
   fixed nor regressed it.

## Preserved (do not regress while fixing)

- Needle lace is pixel-identical 144→146 (my needle crop: dark 0.491, sky
  0.505, brown 0.003 in both) — the pass-144 chord split (0.22 lower-leg /
  0.29 mid) and 0.62 climb I-web survive; the A reads lace, not blob.
- Opening punch: Palais crop shares byte-identical; ticks present on both
  form factors.
- Creeper silhouette: iron mast/cabin family (done in 142) with gold jib
  reads at deck height (desktop-058 x≈1080–1140, y≈270–420); cable + empty
  hook descend into frame at x≈80–120 — the crane reads as plant, not
  streetlamp.
- Mobile drawing buffer 526×1139 (1.35 cap) on all six mobile captures.
- Budget: 125 calls / 702k tris / 36 geo within limits; zero console errors.

## Direction for pass 147 (layout, not numbers)

The 256-cap composition is fine; the *distribution* is the failure. What
would make the same population read as labour:

1. **Break ranks into stations.** Crews of 2–4 clustered at distinct girder
   segments / hoist drop points along the deck, with visible working gaps
   between clusters (the t=0.58 arch-spring pairs at x 645–905 already
   approach this; 144's 4+4 was correct in form). The nest compresses four
   pylons along one view axis — stagger gang Z and station so nested crews
   don't sum into one band at due north.
2. **Pose per station, not per deck.** Figures lean toward the joint they
   work (mixed facing), knees/stride varied per id-salt; no shared forward
   rod-lean across a 13-man rank.
3. **Dim with the sky.** Route tunic albedo through the same day/dusk
   response as iron, or the dusk reads as decorative bunting.
4. **Keep the counts.** The P2 brown +0.034 and north-X brown +0.020 lifts
   are real occupancy wins; retain the population once arrangement reads.

None of the pass-146 "do not restore" list needs touching for this: the fix
is gang clustering and per-station pose, applied to the same crew budget.

## Evidence manifest

- Captures: `artifacts/eiffel-pass-146/{desktop,mobile}-{012,032,058,078,092,10}/`
- Comparator: `artifacts/eiffel-pass-144/` same indices
- Review crops + histogram script: `artifacts/review-board/reports/k3-eiffel-pass-146-crops/`
  (`032-crown-zoom.png`, `144-032-crown-zoom.png`, `058-shape.png`,
  `144-058-shape.png`, `058-rank-zoom.png`, `058-base-ranks.png`,
  `092-waist.png`, `144-092-waist.png`, `078-apex.png`, `078-full-mid.png`,
  `hist-check-058.mjs`)
- Brief: `artifacts/review-board/briefs/k3-eiffel-pass-146.md`

*Silent score per process; in-session screenshots are not sign-off.*
