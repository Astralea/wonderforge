# Eiffel living finale and verified compass — 2026-09-14

Owner requested wind in the French flag, a few birds, and confirmation of palace/sun/shadow directions. See specs/48-eiffel-living-finale-and-compass.md. This work preserves the preceding controller-position correction and running local preview.

## Geographic correction

The final shot looks toward the Champ-de-Mars exposition ensemble on the southeast side of the tower: Palais des Beaux-Arts, Palais des Arts Libéraux, Dôme central and Galerie des Machines. These are authored at x=±142,z=230, z=392 and z=478 in scripts/paris_exposition_geometry.py. Old Trocadéro is across the Seine on the opposite northwest side (z≈-266), behind the ending camera.

The City of Paris site map establishes the NW–SE axis. The diorama now documents an approximate compass frame: +Z geographic135°, -Z315°, +X45°, -X225°. This is an interpretation of the site plan, not a surveyed georeference. Existing engineering part IDs keep their local directional names.

The old coda used engine azimuth-30°, which meant geographic15° (NNE) in this frame. Corrected coda uses latitude48.858° and illustrative late-autumn solar declination-14°, with solar bearing calculated from geometric elevation. At the horizon:111.574° geographic (east-southeast); at14° elevation:131.632° (southeast). A100m vertical witness projects its ground shadow in geographic311.632° (northwest). Sunset is on the opposite evening branch, and the sun moves to the next dawn while its light/disc are fully hidden. All light through162s is unchanged. No exact1889 date, sunrise time, refraction or weather reconstruction is claimed.

Sources:
- City of Paris site map, PDF p6: https://cdn.paris.fr/paris/2019/07/24/377148e093cc4988f3610326e4ca3fa5.pdf
- Musée Carnavalet1889 panorama: https://www.parismuseescollections.paris.fr/fr/musee-carnavalet/oeuvres/vue-d-ensemble-des-palais-du-champs-de-mars
- IMCCE/Paris Observatory solar rise/set geometry: https://promenade.imcce.fr/fr/pages3/367.html
- IMCCE winter-solstice table demonstrating seasonal SE sunrise (its azimuth uses a different south-origin convention): https://www.imcce.fr/newsletter/medias/2024/12/docs/lever_coucher_soleil.pdf

## Motion

The unchanged8x5m authored flag asset now bends along a24-segment arc-length curve. Broad travelling bends and gentle vertical lift replace the almost invisible20cm depth-only offset. The blue hoist remains at its exact mast attachment; three stripes remain joined, and each span segment retains its length. The source GLB and actual support-seat gate are unchanged.

Five gull-like birds have1.18–1.38m wingspans, tapered wings, head/body/tail geometry, glide phases and wingbeats. A single445-triangle mesh follows deterministic48s loops. At least three birds remain framed in the sampled loop; their routes avoid the tower silhouette and retain >3m flock separation. No bird lights or shadows. Hidden frames skip vertex deformation, normal and bounds work entirely.

The initial wide bounding boxes concealed an edge-on wing problem: actual projected triangles filled only0.94–1.63square pixels at178s. Banked poses, fuller wing chords, a foreground route and gray upper wings now yield5.19–7.50square pixels per bird on desktop and3.69–5.81in portrait at180s, at unchanged wingspans. A supersampled triangle-union check guards visible area rather than just bounding width. These are projected geometry measurements; the final browser captures verify the rendered result.

During the cinematic film, decorations use viewer seconds. Pause freezes them, reverse seeks/replay reset the completed elapsed time, and reduced motion retains a still. After normal completion, the existing render loop continues flag/birds only. A dedicated WorldScene.updateEiffelFinale path bypasses construction and light/camera sampling; the timeline, seated source count, camera and sunlight remain fixed. Resize refreshes final framing without restarting the decorative phase. No new render loop or Blender modification.

## Verification

- focused.log:31 focused tests passed (motion, real cloth vertices and mast contact, bird geometry, geography, actual key/sky/shadow-camera agreement, completion/pause/reverse/reduced motion).
- First full tests.log identified five failures in two legacy prototype-based test fixtures missing the new decorative subsystem stubs. Updated those fixtures without weakening their construction assertions; integration.log passes11tests.
- final-tests.log:216files/1136tests passed. final-typecheck.log and final-build.log passed.
- qa.mjs checks served HTML hash, paused night/dawn/final frames, real playback to completion, continuing flag/birds after completion, static construction/camera/light, pause freeze and actual geographic sun-vector bearing.
- browser/ contains the first verified build (main-C3pcDtvJ.js) with the initial more distant birds. final-browser/ verifies main-CyTff_bV.js after the foreground route polish: both viewports have zero browser errors, real sun bearing131.632263 degrees, and continuing decorative motion with static construction/camera/light. Visual review found the wide wing bounds still yielded thin, edge-on silhouettes; the final bank/filled-area correction is verified separately below.
- Actual sun.position-minus-target, shadow-camera direction and flag/bird samples are exposed read-only in browser diagnostics. Engine tests also verify the actual directional-light target after shadow fitting and the sky shader's uniform, rather than only inspecting configuration numbers.
- After the final bird-only polish, bird-polish-focused.log passes16tests across bird geometry/coverage, real cloth and completion-clock integration; bird-polish-typecheck.log and bird-polish-build.log pass. Final bundle:main-imnyjcla.js; CSS:main-DnBJ2EJl.css. accepted-browser/ is the preceding banked build main-B9xkkqLi.js; verified-browser/ and verified-qa.log check the final build after moving the route10m closer.

Desktop/mobile QA is Chromium browser emulation, not a physical-phone claim. Flight/wind are authored plausible animation, not recorded1889 weather or observed individual birds. Existing bundle-size warning remains. Local preview: https://wonderforge.localhost/#/wonder/eiffel-tower .

## Skill and review evidence

Applied project threejs-animation, threejs-lighting and scene-physical-plausibility guidance: deterministic time/paths, fixed attachment/contact, real dimensions, honest moving bounds, disposal, projected visibility, source/bundle verification. Parent owned integration/flag/clocks and final review; bounded agents supplied bird meshes/paths and the geographic audit/helpers. Existing Three.js/WebGL runtime retained.
