# Lower-pylon fixed-station campaign study — 2026-09-07

The current per-part stations cannot simply be given persistent rig IDs. This offline study finds some real reuse, but **does not produce a complete rig schedule or a relocation mechanism**. Existing production, timing and renderer files were not changed.

## Scope and method

New pure helper: `src/engine/eiffelCampaignCoverage.ts`. Representative domain: the **NE pylon, stages 1–9, 778 bounded parts**. It considers parts in their existing time/id order. It tries to keep one campaign's base, mast, receiver dimensions/position, receiver saddles and bracket fixed for consecutive reachable parts. If reuse fails, it tries the current part's existing station plus the next three existing stations whose support is already complete. This is a first-feasible greedy search, not an optimal station-placement proof.

A seed may move its receiver to a clear location using the prior upper-clearance planner, but its actual supported station base is retained. All assigned loads then use that exact receiver; it does not resize or move between parts. The comparison uses a fixed 3.1 × .3 × 6.5 m receiver, sufficient for the existing bounded cargo envelope. A native-size receiver trial performed worse: 296 parts covered by 220 campaigns, because smaller receivers often cannot serve the next load.

Each assigned rigid cargo route is checked at **97 phase samples**, separating raise, rotate, slew and lower. SAT checks use the actual completed member boxes; authored final joint overlaps are admitted only while lowering, no deeper than their final overlap. Each assignment also checks:

- fixed mast, receiver, both grillage members and bracket members against newly completed geometry;
- receiver saddles and station/bracket anchors on the bounded real support face;
- identical cargo geometry and a clear final seat that does not bury the campaign's equipment;
- horizontal hook reach, positive rope length and fixed mast/jib geometry.

The mast is a conservative .34 m square envelope; round bracket/grillage bars use conservative box envelopes. Own support contact is excluded for attachment members. The receiver itself is checked against all completed solids, including its support. Thus rejection can be conservative; acceptance is still sampled, not a continuous swept-volume or structural-strength certificate. Jib/stay/sling occupancy, crew and inter-rig collisions are not included.

## Historical correction to the reach assumption

CNAM's *Revue technique de l'Exposition universelle de 1889*, architecture volume, printed p.133–134, describes four pillar cranes with **4,000 kg lifting force and horizontal reach varying from 5.5 to 12 m**. It also describes variable reach, pivot leveling and movement along the elevator beams. The old 8.4 m limit was an authored model cap, not that historical specification.

Source: [CNAM architecture volume](https://cnum.cnam.fr/pgi/redir.php?ident=8XAE353.1&onglet=c). Independently corroborated by the contemporary [L'Exposition universelle de 1889, tower account](https://cnum.cnam.fr/pgi/redir.php?ident=8XAE879&onglet=c), which describes 12 m reach and 4,000 kg force.

For the 12 m comparisons only, the helper uses an **assumed 13.416 m physical jib**, derived as sqrt(12² + 6²): a 6 m vertical rise above its pivot at maximum horizontal reach. This is an explicit modelling assumption, not a measured historical jib length. The existing 22 m mast cap is also retained as an authored comparison parameter. Existing production crane code and its 8.4 m cap are untouched.

## Measured comparison

| Reach policy | Covered / 778 | Uncovered | Campaigns | Relocation boundaries without paths | Longest chain | Singleton campaigns |
|---|---:|---:|---:|---:|---:|---:|
| Current 0–8.4 m envelope | 313 | 465 | 216 | 215 | 6 parts | 152 |
| 0–12 m outer-envelope comparison | 344 | 434 | 177 | 176 | 12 parts | 106 |
| Historical 5.5–12 m annulus | 118 | 660 | 82 | 81 | 3 parts | 55 |

The 12 m outer envelope allows 31 more parts and 39 fewer campaigns, but still leaves most of this pylon uncovered. It deliberately relaxes the historical inner radius to isolate the effect of outer reach; it is not a historically complete crane model or an optimal coverage bound.

The strict annulus is worse with current station locations because they were authored close to individual loads under the old short-jib policy. In the strict trial receivers are placed initially 6.5 m from the pivot, but many final seats still lie inside the 5.5 m inner limit. This does not show the historical cranes were inadequate. It shows the current nearest-part support stations are the wrong starting arrangement for them. The historical rail-supported station geometry needs to be authored and tested.

Seed placement still uses the existing 8.4 m-capable upper-route search before applying the comparison crane to campaign reuse. The strict run is therefore a bounded reuse study over existing seeds, not an exhaustive 12 m station search. It must not be cited as the maximum achievable historical coverage.

The main failure categories in the outer-envelope comparison are: 1,604 seed attempts without a clear supported receiver/route, 103 bracket-occupancy rejections, 87 mast-occupancy rejections, and 141 reuse failures from reach/headroom. Larger reach helps but does not remove the support/occupancy problem. Detailed diagnostic counts are attempt counts, not unique parts.

## Time and relocation remain unimplemented

The covered assignments still use their original operation intervals. There are **45 overlapping successive assignments** within the current-cap campaigns, **69** in the outer-12 m campaigns, and **16** in the strict-annulus campaigns. One crane cannot perform those overlapping jobs. A real campaign schedule must serialize them, account for changed completed-member occupancy, and rerun clearance. Current coverage is a geometric feasibility screen against the existing schedule, not approval of a sequential production schedule.

Every relocation record has `hasAuthoredPath: false`. The 176 outer-12 m boundaries total about **2,338 m of straight-line station displacement**, with a maximum of **22.32 m**. These sums are lower-bound point distances, not usable paths. There are no rails, jacking contacts, component disassembly/lifts, installation/removal intervals or helper-rig capacity reservations in this new helper.

The six-part current-cap example `campaign-ne-126` has base **(37.81624, 26.72901, -33.95374)** and receiver center **(40.02744, 28.36583, -36.56624)**. It serves `lower-ne-03-m009-c002`, `m017-c000/c001/c002` and `m025-c000/c001`. Its original assignments occupy only two short waves, with three simultaneous loads in each. This is a useful candidate for deliberate rescheduling, not a ready six-load animation.

## The 4,000 kg capacity also needs a model check

At an explicitly assumed solid-iron density of 7,800 kg/m³, **68 of these 778 exported boxes exceed 4,000 kg**; the largest is approximately 14.38 tonnes. Of the geometrically covered loads, 20 in the current-cap case, 26 in the outer-12 m case and 2 in the strict-annulus case exceed that estimate. Mass was not silently filtered from the reach comparison.

This is a rendered solid-volume estimate, not a claim that the historical members were solid rectangular sections. Real built-up/hollow sections require measured section geometry or a mass model; otherwise the kit needs further subdivision. A six-metre dimension cap alone does not establish compatibility with a four-tonne crane.

## Evidence and next step

Four focused tests pass, including actual fixed-station reuse, later receiver blockage, unsupported/out-of-range rejection and the distinction between a 12 m outer envelope and the 5.5 m inner limit. Typecheck passes. No Blender, production build, server or browser run was performed by this subagent.

- `campaign-comparison.json`: compact counts, diagnostics, observed source hashes and mass estimates.
- `campaign-authored8.4.json`, `campaign-historical12-envelope.json`, `campaign-historical5.5-12.json`: every candidate campaign/assignment, uncovered ID and relocation gap.
- `campaign-coverage-comparison.ts` / `.mjs`: reproducible source and captured executable; the executable preserves the inspected production logic even if other agents subsequently change it.
- `campaign-executable-SHA256.txt`: captured-executable and manifest hashes.

Run the captured census from repository root with `node artifacts/eiffel-resume-2026-09-07/campaign-coverage-comparison.mjs`. Rebundle its TS source using local esbuild to measure a later engine revision. The three searches took about 26, 24 and 35 seconds offline; this helper is not imported into the production renderer.

Next, build a small real rail-supported station chain from the historical pillar/elevator geometry, centered to cover multiple chords with the 5.5–12 m annulus. Fit the payload mass model, receivers and support contacts first. Then serialize one covered campaign, author its physical transition to the next support, reserve that rig's time, and rerun occupancy after retiming. Holding the last per-part crane mesh or merely increasing its jib length cannot satisfy these gates.
