# Upper material chain: source corridor proposal

This is a model-design gate, not production admission. No production source or Blender asset was changed. `verified-route.json` records actual public tower/relay and candidate platform hashes, the exact production freeze, all swept segments and support rays. Run `node route/verify.mjs` from the repository using its full artifact path. The check passes twelve complete translation segments and 48 source support corners, and deliberately retains the blocked direct route, missing floor and final joint intersection.

## Continuous full carrier corridor

Coordinates are **carrier bottom origins**, with a constant occupied envelope .44 × 7.030500327 × .44m. Starting from the actual second-floor received pose:

1. `[-15,116.47999939,-1.8] → [-15,116.47999939,-1] → [-2,116.47999939,-1] → [-2,116.47999939,-1.8]`.
2. Rise to `[-2,198,-1.8]`; traverse to `[-2,198,-3.6]`; receive at `[-2,197.34,-3.6]` on a proposed .34m cart over the actual197m deck.
3. Lift back to198; move through `[-2,198,-1.8] → [-2,198,+.6] → [0,198,+.6]`.
4. Rise to `[0,276.88,+.6]`, then traverse to `[0,276.88,0]` for a proposed supported extraction receiver.

Each listed segment is an exact axis-aligned whole-envelope swept box checked against actual source surface triangles. Frozen productionT is0.8054955483449447:13263 seated parts, plus the other currently staged member transformed to its actual sampled pose. Only the transported member itself is excluded. The initial conservative stage≤59.55 audit remains in `initial-route.json`; final verification uses the actual frozen state, not future parts installed prematurely.

The positive-Z+.6 upper lane passes the actual apartment floor/roof aperture (X/Z±1.05). The X−2,Z−1.8 vertical lane instead strikes the apartment floor near the top. Direct external X−15 ascent strikes shaft02; direct second-floor inward travel atZ−1.8 strikes the receiving rig side brace.

## Required stations and contacts

- **Second floor:** actual ring deck top is116.139998m. Along Z−1.43 it ends at inner X−9; points X−8.5..−2 have no floor between115 and116.5. Opposed deck bearing locations X±9.25/±9.75,Z−1.2/0 have actual source contact at116.139998m. A true spanning bridge needs both sides, not a seven-metre cantilever into the opening. Existing inner-perimeter iron chords run atX±9, top about115.73; attachments/ramp levels need actual authoring. A bed at least1.2m wide accommodates the .86m cart wheel envelope with .17m each side, but does not independently establish worker or turn clearance.
- **Cart route remains blocked/unadmitted:** the .44m carrier can use the first dogleg, but the wider cart clips the receiver foot atZ−1; Z−.6 clears the straight inward run. The starting swept cart proxy also intersects the nearby engine bed and its own source hardware. These are not asserted as actual cart triangle collisions: a proper moving-source cart exclusion, actual wheel/handle turning sweep, chock removal and bridge support are required. Do not animate the carrier-only path as an already verified cart rollout.
- **197m receiving rig:** four .50m square sole centres atX−3/−1,Z−3.6/+3.6 have all16 corners on actual candidate relay-deckY197.0. Four .18m proposed upright corridors and two top crossbeam corridors were clear in the source probe, but complete rig geometry/brace/load path still needs authoring. Carrier transit bottom198 puts the envelope top205.0305 and hook apex205.2075; propose sheave centre205.6. A proposed .70×.86m cart centred[-2,197,-3.6] has all four footprint corners on197m deck. Existing platform collars tie to shaft10 at(±6.845,196.090,±6.845); platform erection/strength are not proved.
- **Third-floor receiving bridge:** actual deck top276.540007m, not276.14. Four .40m sole centresX±3.2,Z±.6 have all16 corners on real platform-3 deck members m010-c001/m011-c001. Central X−2..0,Z±1.8 has no floor. A receiver spanning this opening must be modeled, with its final seat adjusted to its actual build-up height. The276.88 carrier origin above assumes only .34m above the permanent deck, not a completed new bridge design.
- **Upper hoist:** four .40m square roof sole centresX/Z±1.6 have all16 source corners at283.350000±.000001m. These are roof slabs, **not iron girders**. Actual wall-top iron rails are nearX/Z±5,Y283.09..283.23 (for example summit-apartment-0-1/0-2-m003). Author a real spreader/anchor reaction path to those rails. Sheave centre284.5 gives .4125m above the clevis apex for carrier bottom276.88. New rig/rope/crew sweeps are still required.

## Extraction and final placement

The carrier payload bottom is carrier origin+.08. From a receiver at276.88 the payload starts at276.96 and must lower .41996475m after independent support and actual carrier opening/removal. Final payload centre is[0,279.5362854,0]. The final32.47mm of lowering intersects the already seated bottom stair member `summit-access-stair-m001-c000` (sourceY276.5075..276.5725). This authored joint overlap is preserved as a finding; the audit does not silently exempt it or admit the connection.

Existing rope tangent math and payload-owner renderer may be reused after new station geometry is checked. No existing Guyenet/generic summit crane is established by this audit as reaching the proposed284.5m head with a verified reaction path. Do not infer that reach from a generic crane sampler or station label.

Scope limits: swept surface-triangle tests shrink the envelope10micrometres to separate touching surfaces; they do not certify arbitrary containment inside a giant solid. Source support rays are corner contacts, not capacity certification. Unmodeled carts, bridges, receivers, hoists, guide ropes, worker access, restraint release and extraction remain required. Earlier sealed evidence remains unchanged.
