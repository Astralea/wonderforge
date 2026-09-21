# Closed lower sling terminations

Review: http://127.0.0.1:5590/artifacts/eiffel-closed-sling-2026-09-08/review.html
Use **查看總環** and **查看下端連接** to inspect the two connection levels.

The four sling legs now join closed rope eyes around the carrier's existing lifting-eye bars. They no longer terminate at isolated points inside the holes. The master link, its five upper eyes, the carrier and actual5.9925m member keep their prior geometry. Parent used actual Blender MCP after a read-only probe and saved `blender/eiffel-closed-sling.blend` plus `model/closed-sling.glb`.

The assembly contains14 mesh roles: one master link, nine rope eyes, and four straight legs. Each new lower rope eye embraces the24×18mm cross-section above the existing carrier eye bore. Its arc is circumscribed about the corner-clearance circle, allowing an8mm cable radius around the bar. Tangent legs meet a splice apex, and the four connecting strands are shortened to those new apexes. This remains an interpreted fitting with geometric splices, not a measured1889 replica or an engineering load rating.

Reproduce with `scripts/plan-eiffel-closed-sling.py` and `scripts/build-eiffel-closed-sling-via-mcp.py`; Blender generator `scripts/blender_eiffel_closed_sling.py`. Earlier master-link assets remain unchanged.

The existing pure `sampleEiffelMasterLinkHoist` now accepts an optional authored rope geometry. Its default remains the previously tested geometry. The new viewer supplies the closed-loop design. A regression checks that the carrier trajectory and entire hoist rope are identical while the four short strand endpoints follow the new splice positions. No new clock or cargo replacement was introduced. The128-second sequence still ends attached on the cart; it does not show release or onward travel.

Desktop1440x1000 and mobile390x844 each passed11seeks, reverse, playback, overview/follow and pointer orbit checks. Actual payload size and master/carrier poses are verified in the browser. Parent inspected both lower-connection closeups. The actual full assembly bounding box also clears three translated route legs against11386 tower envelopes,449 bridge prisms including the open hatch and21 raised receiving-frame prisms (`environment-audit.json`). This does not establish moving trolley hardware, stress capacity or crew access.

Independent closure/actual-mesh tests pass three gates: exact14 roles and authored endpoints within exported mesh bounds; each loop winds once around its bar with analytical rectangular-section clearance and passes the actual carrier bore-axis ray check; all70 non-splice path pairs clear, excluding only eight named splice joins. Minimum analytical bar clearance is0.290micrometres, bore margin3.009mm, and non-splice rope surface gap55.130mm. These are geometric numerical results, not manufacturing tolerances or capacity evidence. The actual-bore rays do not constitute a full triangle-to-triangle collision audit of every rope surface. Cart anchoring, manual rigging/release, powered/braked drive, equipment erection, later relay changes, broad-panel routes, final member installation, main integration and the other Eiffel/Paris requirements remain open. No next wonder has been started.

Final full verification:738 tests in125 files passed; typecheck/build passed (existing bundle-size warning retained). Browser peak89854 triangles. All MCP, QA and verification jobs for this checkpoint are terminal.


2026-09-08 collar correction: the live review now loads the separate9-mesh
corrected carrier from the cart-fastening-recovered folder. Only the two collar
outlines change (.37→.40m), removing tangent bore/outer-edge defects. Rigging and
engine path stay unchanged. Eleven seeks and playback/reverse/orbit were rerun
on desktop/mobile; copied evidence is in that folder's hoist-web/. The original
review source is preserved as review-before-collar-fix.ts.
