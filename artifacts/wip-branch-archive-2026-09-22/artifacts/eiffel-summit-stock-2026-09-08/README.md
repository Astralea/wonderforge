# Summit stock prefetch — 2026-09-08

This is a Blender geometry and logistics study, not a promoted main-film sequence.
The main local preview remains Paris v15 with its existing 264-second construction.

## Why prefetch

All 247 stage 61–63 components lacked routes through the old upper supply stations.
Before stage 57 closes the apartment and before the later central stairs are built,
all 247 have an unobstructed fixed-orientation cargo-envelope sweep from ground
pickup to world Y=287 through the central shaft. Production freeze is
0.7035504929004187, the end of stage 56. Eight upright yaw choices and X/Z offsets
up to 1.6 m were searched against all completed component envelopes.

The original upright-only probe cleared 223/247; yaw/offset search cleared 247/247.
Sources and exact per-part poses are in ../eiffel-ground-supply-2026-09-08/
probe-central-shaft-rotated.ts and central-shaft-rotated-probe.json.
These are cargo envelopes only: lifting tackle, crane, loading access, rotation,
handoff and travel to the racks have not passed this gate.

## Actual rack model

scripts/blender_eiffel_summit_stock.py builds eight timber racks on the third
terrace, with foot bottoms at Y=280.59 and shelf tops 280.95 / 283.30. Editable
source prisms are retained alongside joined rack meshes. The installed Blender
Lab MCP is used by scripts/build-eiffel-summit-stock-via-mcp.py, starting with a
read-only connection probe. The saved file includes the actual compact tower
kit through stage 56 as context. Planned cargo envelopes are named wireframes
and intentionally hidden in the render: curved pieces do not yet have fitted
cradles or restraints.

stock-plan.json comes from scripts/plan-eiffel-summit-stock.ts and the pure
src/engine/eiffelSummitStock.ts planner. Independent tests check all 247 identities,
actual transformed bounds, shelf contact and at least 0.08 m same-shelf separation.

## Remaining admission gates

Rack strength and erection, curved-cargo cradles and restraints, crane anchorage,
rigging clearance, ground loading, shaft-to-rack handoff, extraction order and
final installation are unresolved. An envelope that fits is not proof of stable
storage. No floating stock, rack or crane has been added to the main film.

## Verification completed

615 tests / 87 files pass (`npm run test -- --maxWorkers=4`), typecheck and build
pass. The initial unrestricted run timed out one existing foundation-crew test
while Blender was active; the complete four-worker rerun passed.

All 128 authored foot corners hit actual stage56 kit surfaces; 128 inset foot
corner rays also hit exported rack undersides. 240 shelf rays hit exported top
surfaces. All176 source prisms clear final stage54+ kit envelopes, and all247
stock envelopes clear the rack geometry. Exported mesh bounds contain the source
prism vertices; this is not a watertightness or structural-capacity certificate.
The first export warned about two mesh caches; explicit mesh validation/update
and re-export produced no warnings (`mcp-repair.log`, zero topology repairs).

Actual render reviewed: `renders/terrace-racks.png`. Actual saved scene:
`blender/eiffel-summit-stock.blend`. SHA256 provenance is in verification.json.
No main-film or desktop/mobile browser visual change is claimed by this study.
