# Actual exported second-floor clearance correction

Read-back source: `model/second-floor-clearance.glb`, SHA256`e5e4998d8b35310dff7e6a39f356bd9a309653917fd9dc9ec0a76b94779a5da8`. Scripts `actual-clearance.mjs`/`actual-support.mjs` load this new file directly and apply **zero additional translation**. Proxy relocation results remain separate.

Actual checks pass:41 sampled original-cart/handle turning poses with no fixed-equipment intersection; relocated machinery versus actual frozen tower/unchanged frame has no occupied-bound/triangle conflict;20 actual bottom vertices from machinery beds/boiler foot/operator boots retain source deck support. Grounded S-turn source steering remains a future fixture requirement.

The recalculated8mm drum-to-fixed-guide straight rope envelope clears actual corrected model triangles. The first/last20mm are excluded as intended terminal contact zones; fixed-guide wrap and the remainder of the prior tackle are unchanged, not newly certified by this bounded test. `rope-audit.json` records endpoints and scope.

Spec33 records the source correction. Production route default drumU is now10.85; all other rig datums remain unchanged. Eight focused calibration/route/handoff tests pass, including actual design agreement, tangent perpendicularity and unchanged carrier/master/payload/old rope/drive angular travel. Typecheck passes. Public asset promotion and browser/build gates are parent-owned. See `calibration-tests.log` and `calibration-typecheck.log`.

One first attempt to rewrite the helper path failed at shell substitution, so its intermediate output was not treated as actual-source evidence. The corrected helper was immediately read back, then the actual model checks rerun; final JSON explicitly names the new source path and zero extra translation.
