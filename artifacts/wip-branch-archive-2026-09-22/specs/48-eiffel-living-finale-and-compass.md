# Eiffel living finale and geographic dawn — 2026-09-14

Owner asks for a visibly wind-blown French flag, a few flying birds, and verified palace/sun/shadow directions in the final sunrise.

## Geographic frame

The diorama garden axis +Z points approximately southeast (geographic135°);
-X is southwest, +X northeast, -Z northwest. The ending view looks toward the
Champ-de-Mars exposition palaces (+Z), while old Trocadéro lies beyond the Seine
on -Z, behind the camera. Engineering part names such as north/south remain
local labels. This is an explicit approximate site frame, not a surveyed model.

The renderer's sun azimuth starts at +X and increases toward +Z; convert it to
geographic bearing by adding45°. The previous -30° ending key was therefore
north-northeast15°, and must be corrected. Use an illustrative late-autumn
Paris morning (latitude48.858°, solar declination-14°), not an exact1889 weather
reconstruction. Solar bearing follows elevation: roughly111.6° at the horizon,
131.6° at14° elevation. This is an east-southeast to southeast sunrise, with
shadows extending in the opposite west-northwest/northwest direction toward
Seine/Trocadéro. The sky disc, halo, lighting, water reflection and actual shadow
camera all consume the same sun vector. Preserve pre162s construction lighting;
correct the independent ending sunset/night/dawn only. Do not rotate buildings
or the accepted construction camera to disguise a lighting-direction error.

Sources: City of Paris site map p6,
https://cdn.paris.fr/paris/2019/07/24/377148e093cc4988f3610326e4ca3fa5.pdf ;
Musée Carnavalet1889 panorama,
https://www.parismuseescollections.paris.fr/fr/musee-carnavalet/oeuvres/vue-d-ensemble-des-palais-du-champs-de-mars ;
IMCCE rise/set geometry, https://promenade.imcce.fr/fr/pages3/367.html .

## Wind and birds

Keep the existing authored8x5m tricolor, its blue hoist edge fixed to the actual
mast, and the supported-after-mast gate. Give its cloth broad visible billowing
and gentle lift, not a rigid whole-flag rotation. Preserve span lengths through
a sampled bending curve; stripes stay joined. Source GLB remains unchanged.

Add five small gull-like birds with plausible wingspans, gliding and gentle
wingbeats, in clear sky away from structures. No giant symbolic V marks, flock
teleporting through the tower, per-bird lights or shadow passes. Fade them into
the dawn over174–177s. Use deterministic closed paths, bounded batch cost,
honest bounds and disposal. Keep tower/flag the main subject on desktop/mobile.

The cinematic decorative clock uses viewer seconds during playback and freezes
on pause. After normal completion it may continue for flag/birds only while
construction, camera, lighting and timeline remain at180s. Reverse seeking and
replay reset this extra elapsed time; reduced motion leaves the final still.
Do not add another render loop. An idle finale updates decorative meshes without
resampling the expensive construction graph every frame.

Verify actual mast contact, cloth continuity and meaningful projected motion;
loop/reverse bird paths and actual triangles; completed-film clock isolation,
pause/replay/reduced-motion behavior; geographic bearings and sun/shadow vector
opposition; desktop/mobile final-night/dawn/live-completion captures and errors.
Run full test/typecheck/build and verify the served asset hash. Preserve the
running local preview and the newly fixed controller position.
