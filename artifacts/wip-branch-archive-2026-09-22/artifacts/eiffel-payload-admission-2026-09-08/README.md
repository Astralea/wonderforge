# Actual payload admission audit

The 488-second three-floor animation transports a solid proxy. It does not yet deliver a named member of the Eiffel construction kit. This audit determines the carrier redesign scope before that sequence can be integrated honestly into production.

`python3 scripts/audit-eiffel-supply-payloads.py` regenerates `inventory.json`, containing every non-masonry member ID and a SHA-256 digest of the current kit manifest. Sizes come from local bounds. All six axis assignments are tested against the proxy body's exterior dimensions, 0.58 × 1.78 × 0.58 m. This deliberately optimistic screen includes no crate wall thickness, padding or restraint allowance; it is not usable cargo space. The existing generator makes a solid box, not an authored loadable container.

| Minimum installed height | Members | Axis-aligned envelope fits | Proven too long at any rotation |
| --- | ---: | ---: | ---: |
| 0 m | 13,046 | 1,551 | 11,071 |
| 57.94 m | 6,878 | 1,271 | 5,391 |
| 116.14 m | 3,859 | 1,191 | 2,628 |
| 197 m | 2,484 | 1,151 | 1,293 |

Rows are overlapping height cohorts, not delivery allocations. An axis-aligned failure is not automatically proof against arbitrary angled packing. The all-rotation rejection applies only to box geometry with an actual edge longer than the envelope's space diagonal. Curved cupola bounding-box edges do not establish that proof. Every inventory entry remains `productionAdmitted: false`.

## Actual Blender size comparison

Parent used the installed Blender MCP after a read-only probe to generate `blender/eiffel-payload-size-comparison.blend`, `model/payload-size-comparison.glb` and `renders/payload-size-comparison.png`. Four actual box-member dimensions are displayed upright beside the existing proxy, without shortening or scaling their physical sizes:

- Shaft member `shaft-13-m005-c000`: 5.95147 m long.
- Platform member `platform-3-0-00-m023-c000`: 5.40000 m long.
- Summit stair member `summit-access-stair-m000-c000`: 5.99250 m long.
- Gallery panel `summit-gallery-0-0-m006-c000`: 2.20 × 2.32333 m broad face.

These are canonical kit box geometries, not new historical surface-detail reconstructions. Export verification independently reads GLB accessor bounds, checks all four against the manifest dimensions and confirms unit node scales. Evidence: `export-verification.json`. Parent inspected the saved render. No production or web renderer changed in this turn; the image is a Blender studio comparison.

## Consequence for the next model revision

The replacement must handle roughly six-metre long members and a separate broad-panel envelope. It must not silently select only small decorative parts to stand in for tower construction. The existing receiving heights also need revision: with the retained 0.55 m hook-above-load allowance, a 5.9925 m upright member on the existing cart would require hook Y about64.8225 at the first floor and123.0225 at the second floor, already above sheave centres63.0000 and121.35. At the197 m platform, even a seated member needs hook203.5425, above the200.46 centre. These are necessary headroom bounds only, excluding transit lift margin and restraint design; they are not clearance or stability approval.

Next author actual long-member carriers/receivers and broad-panel handling, verify their ground-to-platform sweeps and support, then connect onward handling to final installed member IDs. Drive, braking, anchorage, equipment erection and riggers remain open. Main animation, Paris and the complete goal remain unfinished.

Verification: four Python tests cover axis reassignment, distinguishing axis failure from an all-rotation proof, curved-bound rejection limits and real long/wide kit members. Run `python3 -m unittest discover -s tests -p test_eiffel_supply_payloads.py`. Full project verification logs are retained alongside this report.

Final project verification:720 tests in119 files passed; typecheck and build passed. Existing bundle-size warning remains. No running MCP or verification jobs remain for this checkpoint.
