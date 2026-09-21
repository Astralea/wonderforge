# Production pace/crowd browser review — 2026-09-08

Actual production5589 bundle `main-kkteWCio.js`, SHA256
`a43615d59dbb4558f8de0ec040635892148f48e75c40503ead33a293baac39cc`.
Film669.8802080213959s; final mast wave592.4283191417239–663.8802080213959s.

Both automated profile runs pass. Each records101 full-film samples,7 budget
preflight seeks,43 first-floor phase/pose samples and6 final-wave captures.
Actual HTML range-input readback determines time, including phase neighbors;
these are not synthetic exact-time store updates. Bundle/model response bytes
are hashed and fulfilled unchanged to the actual requests, with local asset
hashes checked before and after each run.

| Actual production profile | Peak triangles | Peak calls | Gate |
|---|---:|---:|---|
|1440×900 DPR1 desktop|346,029|166|450,000 /200 pass|
|390×844 DPR1.35 mobile|295,898|149|300,000 /150 pass|

Actual first-floor role transforms and mobile URL selection pass. Both runs
have a strictly increasing125° orbit, real Space-key playback advancement,
exact reverse-seek central-crop RGB equality, no overflow and no browser errors.

Each profile has157 crowd diagnostic snapshots. Every one reports camera-driven
selection with648 source pedestrian identities,48 distinct selected IDs,
600 silhouettes and fixed18-man/30-woman capacities. All selected IDs belong
to the actual source actor list; minimum readable height12CSS pixels. The maximum
visible detailed count is48 desktop and19 mobile in these views. This diagnostic
identity check does not mean all648 actors or all48 detailed actors are visible
at once, nor does it independently inspect every underlying GPU slot/contact.

## Visual findings — do not conflate with automated passes

Desktop +4/+30/+50 and mobile +30/end-minus5 final-wave images were inspected.
The mast hoist and transfer now take visible time and fit the frame. Two concerns
remain:

1. **The close camera leaves during final lowering.** The source pace record
   assigns660.280208–663.880208s to the final3.6s lower/contact phase. The current
   camera exit is `ease((end-seconds)/4)`, so essentially that entire phase is
   also the pullback. The end screenshot's actual slider time663.851286s is
   already a whole-tower view; the final contact is no longer readable. Hold
   the close shot through seating, then move the4s exit into the post-wave hold.
   The current framing/continuous-orbit gates do not establish contact readability.

2. **Existing summit crane support still looks questionable.** The two tall
   black jibs and the receiving decks dominate the small crown; an outboard pad
   reads as an unsupported ledge. This is a visual concern from real screenshots,
   not a new triangle-intersection or structural-load certificate. The elevated
   starting carriers and omitted ground-to-summit freight chain are still present.
   Slowing this chapter has not supplied the missing provenance or proven the
   crane anchorage/erection lifecycle.

The earlier partial bolt occlusion in the first-floor chapter remains a limit.
The reports are renderer, clock, identity and bounded visual evidence, not a
claim that all Eiffel construction is now physically complete or realistic.

## Evidence

`production-desktop/report.json` and `production-mobile/report.json` include
actual sampled clocks, camera positions, crowd IDs, role poses and response
hashes. Final-wave screenshots are `final-wave-start-plus-{4,12,30,50}.png`,
`final-wave-end-minus-5.png`, and `final-wave-end.png`. Earlier onward evidence
is preserved in its original artifact folder.

Refresh `sampler.mjs` with esbuild against frozen sources before a new build's
QA. Then run `qa-production.mjs desktop` and `qa-production.mjs mobile`, setting
`EXPECTED_BUNDLE=/assets/main-kkteWCio.js` for this admitted build. Preserve these
reports before a later candidate replaces the output folders.
