# Eiffel timing and persistent crane proposal

Read-only proposal, 2026-09-07. Based on the current production plan, renderer and a fresh computed census in `timing-capacity.json`. No source edits were made for this proposal. The executable `timing-capacity.mjs` preserves the inspected implementation; recompile its adjacent TS file to census later revisions.

## Decision

Replace per-part crane appearances with **four identified rigs scheduled through explicit station campaigns**. Allocate four 2.4-second signature operations inside the existing camera height milestones. These are coupled planner changes: merely lengthening a few part windows or leaving the last drawn crane visible would preserve the current physical discontinuities.

This can improve the 60-second film while retaining substantial time compression. It cannot make every one of 13,814 operations individually readable. Do not claim that outcome or hide the contradiction in a renderer.

## Current measured capacity

| Current production measure | Result |
|---|---:|
| Individual cargo operations | 13,814 |
| Four-or-fewer-operation waves | 3,574 |
| Distinct station bases, rounded to 1 mm | 12,358 |
| Shortest operation at 1× | 3.481 ms |
| Median operation at 1× | 8.810 ms |
| Operations shorter than one 60 fps frame | 9,114 (66.0%) |
| Operations shorter than one 30 fps frame | 13,278 (96.1%) |
| Current hero operations / waves | 58 / 15 |
| Maximum current hero duration | 350 ms |
| Total construction interval | 51.9 seconds (.035–.9) |

`eiffelConstructionTiming.ts:74–82` chooses the wave at 28% of selected stages, regardless of visibility or payload size, and caps it at .35 seconds or 42% of the stage. For example stage9 has only .516 seconds in total; stage23/P1 has 1.812 seconds for1,296 parts/421 waves; stage34/P2 has1.192 seconds; stage54/P3 has1.064 seconds. A 2.4-second lift cannot fit those existing stage windows.

`EiffelWorld.ts:58–61` passes only currently active part operations to the work renderer. `EiffelProductionWorks.ts:133–134` assigns them to the next of four array slots; lines204–206 hide unused slots. `sampleEiffelProductionOperation` returns no crane before/after the individual lift and during staging. Therefore the four mesh instances are renderer storage, not four continuous physical crane identities. A hold-last-state patch would either leave obsolete equipment at old supports or teleport it to the next base. Interpolating those bases would drag the mast, stays and feet through unsupported space.

Even an average .25-second readable cycle for every current wave needs893.5 seconds (14.9 minutes), before relocation. At2.4 seconds/wave, it needs8,577.6 seconds (143 minutes). The source-member compaction in `EiffelKitSystem.ts` is a rendering optimization after every child has seated; it cannot reduce these operations by pretending a disconnected tower tier is one delivered load.

## Proposed 60-second signature allocation

Preserve the exact camera function `eiffelCinematicShotAt(t)` and its height milestone times: .1546667, .3152, .4298667, .6477333 and .9. Do not freeze or retime camera azimuth. Repartition internal stage spans within those milestone intervals, keeping stage barriers and dependency order.

| Signature | Proposed normalized window | Screen time | Required internal change |
|---|---|---:|---|
| Near-facing lower-pylon bounded member | .090–.130 |2.4s|Reserve one lower stage; redistribute other lower stages within .065–.1546667|
| First-floor deck/member at the visible work face | .265–.305 |2.4s|Finish arches before .265; begin stage23 earlier; keep P1 complete at .3152|
| Clear silhouette shaft member with visible receiving handoff | .540–.580 |2.4s|Reserve one shaft stage; redistribute other shaft stages before stage54 and .6477333|
| Large campanile/summit member, not a tiny repeated flange | .780–.820 |2.4s|Reserve the chosen summit stage; preserve final completion at .9|

These are **budget reservations, not already validated part choices**. Use the current camera projection to choose a near-facing cargo that is large enough to read, its route is collision-cleared, its support dependencies are complete, and a persistent campaign rig can actually serve it. Do not keep the current arbitrary 28%-wave picks: several are thin rods, duplicate-center layers or back-facing members. Target at least12px projected long dimension on desktop and7px on mobile at the signature's actual camera time; inspect the result in browser because this geometric threshold does not prove legibility.

Each2.4-second operation can allocate roughly .4s staged hook attachment, .45s vertical hoist, .55s rotation/transfer, .6s lowering/alignment, .4s seating/unhook. A preceding visible freight arrival belongs to the same signature scene and needs separate time; the existing upper pickup already at height is not a complete ground-to-seat journey.

Four signature intervals use9.6 of51.9 construction seconds. If the four waves each carry four pieces, the remaining13,798 pieces have at most169.2 crane-seconds (four cranes ×42.3s), averaging12.3ms each before relocation. Thus the repetitive work still reads as time lapse. Let the other rigs park during a signature where competing motion would obscure it; account for that lost capacity explicitly rather than overlapping five rigs. Do not represent the non-signature pieces as spontaneous final geometry: retain their continuous rigid operation records and correct source/support relationships.

An Eiffel-specific120-second duration is an alternative if longer signatures and relocation need breathing room. It preserves normalized camera/milestone positions but changes wall-clock pacing, requires `src/store/playback.ts:38,84` to select a per-wonder duration, and requires revisiting the existing60-second music/narration pacing. It only doubles the8.81ms median, so duration alone is not the solution. The recommended first implementation keeps60 seconds and measures its result before changing this product behavior.

## Persistent station campaigns and physical relocation

Add pure data rather than renderer guesses:

- `RigId = rig-ne | rig-nw | rig-se | rig-sw` identifies four physical assemblies throughout the film.
- `RigCampaign {rigId, stationId, station, supportPartIds, installedFrom, workFrom, workUntil, removedAt, operationIds, parkedHookPose}`. Several consecutive reachable operations use one fixed station. A campaign requires a single actual supported base and clear receiver/boom/load envelope; do not cluster by nearest coordinates alone.
- `RigTransition {rigId, fromStationId, toStationId, start, end, mode, rigidComponentPaths, supportContacts}` gives physical relocation. Ground equipment can travel on a supported rolling chassis with the jib parked; climbing rigs need authored rails/jacking contacts tied to already completed members. Where those paths do not exist, disassemble into rigid bounded components and have another of the same four rigs lift them. A fifth helper crane would violate the cap.
- A pure `sampleEiffelRigPlan(t)` returns each rig in `parked | working | relocating | dismantled` state, independently of which cargo is active. Parked hooks and slack/retracted ropes need explicit geometry/poses rather than a fake invisible load.

First solve campaign coverage for a narrow complete band around the lower pylon, then extend the same planner to all bands before promotion. For each candidate station, test *every assigned pickup/hoist/transfer/seat trajectory* against the8.4m reach and completed occupancy. Retain stable stations where they cover a useful sequence. The12,358 current bases show why simply attaching a rig ID to the existing per-part stations will not work.

Relocation must be scheduled before the next campaign and consume that rig's capacity. Another rig helping a dismantled rig is also unavailable for cargo at that time. Keep at most four physical crane assemblies, including parked ones, not just four active hooks. Equipment cannot vanish when a cargo operation ends. Its rails, temporary deck and brackets stay until a supported removal operation; those objects also need occupancy checks and must not intersect later structural members.

`EiffelWorld.updateConstruction` should sample the cargo plan and rig plan separately. `EiffelProductionWorks` should update a fixed map by `RigId`; it must never assign rig identity by active-array order. `EiffelKitSystem` should remain a renderer of supplied cargo phases/rigid poses. Do not embed rig scheduling or skipped-work rules there.

## Safe sequencing and acceptance

1. Freeze the corrected upper geometry/routes before timing work. The current upper input includes `start/end` (`eiffelUpperClearance.ts:158–159`), and `eiffelUpperInputHash` fingerprints that complete input. Retiming invalidates baked routes even if their visible geometry appears unchanged. Any altered completed-member order requires rebaking and rechecking occupancy.
2. Add a campaign coverage report: supported stations, assigned operations, reach failures, collision failures, relocation gaps and time demand. Uncovered operations are an explicit gate, not a silent return to per-part teleports.
3. Implement one campaign and its real relocation with persistent rig identity. Test fixed station pose during work/idle, phase-boundary component continuity, all support contacts and no fifth physical rig. A successful pilot proves only its band.
4. Reserve the four signature budgets while preserving camera milestone endpoints and topological dependencies. Recompute throughput including parked/relocating rigs; do not just stretch operations into each other.
5. Rebake upper routes using the new schedule; run dense cargo, receiver, rig, sling and transition occupancy checks. Stale cached geometry is not acceptance.
6. Fresh desktop/mobile true1× playback must show at least one complete visible handoff/hoist/seat and a crane remaining physically present between adjacent operations. Capture .1s-spaced frames around signatures and one complete relocation, plus existing debug milestones. Check reverse seeking, replay and reduced motion against the pure plans.

The main unresolved engineering question is not how to keep a mesh visible. It is how many supported campaigns cover the whole tower with four persistent8.4m rigs and how those rigs reach their next stations. Resolve that physical station graph before promising a final timing duration.
