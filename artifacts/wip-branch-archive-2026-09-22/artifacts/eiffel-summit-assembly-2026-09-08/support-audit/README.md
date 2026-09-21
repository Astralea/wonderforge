# Summit handling support proposal — read-only source audit

Use ONE fixed-size climbing gin pole, supported by two clamps on the already
seated central mast. Do not reuse the generic balcony-sized crane pad.
Parent exclusively authors and validates Blender hardware. No production files
were modified by this audit.

## Frozen candidate coordinates (world metres)

| Element | c001 installation | c002 installation |
|---|---|---|
| Existing supporting member | summit-crown-m072-c000 | summit-crown-m072-c001 |
| Supporting mast vertical bounds | 298..302.666687 | 302.666656..307.333344 |
| Gin pole base | [-.90,300.90,0] | [-.90,305.566667,0] |
| Pole length / section envelope | 6m / .13m | same physical pole |
| Two mast clamp centres | [0,301.10,0], [0,302.30,0] | [0,305.766667,0], [0,306.966667,0] |
| Jib length | 3m | 3m |

Clamp bore .18002m accommodates the actual .18000004m mast cross-section with
~10 micrometres nominal clearance per face; use .04m walls and positively closed
hardware. Clamping contact, not a floating deck beneath the pole, carries its
load. This geometry alone is not a load-capacity certification.

At each clamp elevation use TWO fork braces: mast-side endpoints
[-.13,Y,+/-.13], pole-side endpoints[-.90,Y,+/-.065], .05m section envelope.
A single centreline brace would cross the already-seated west summit-platform
post m060. The .90m pole offset also avoids the existing upper platform ring;
the earlier .65m offset was rejected for collision.

Incoming upright assemblies use unchanged final mast orientation. Let Y be the
mast final centre (305 or309.666656494):

1. Receive already-suspended cargo at[-2.2,Y-1.9,-1.2].
2. Hoist to[-2.2,Y+.6,-1.2].
3. Move to[0,Y+.6,-1.2], then[0,Y+.6,0].
4. Lower to[0,Y,0].

The Z offset bypasses the pole; a direct west-to-axis translation does not.
This local receipt deliberately does NOT claim how material reached the summit.
The existing elevated stock chain remains unresolved.

Carry m074 AND m075 with c001 (crossbars at304/306); carry m076 with c002
(crossbar at308). Leaving m074 seated before c001 would leave a floating rung.
Each .6m crossbar retains its exact rigid transform relative to its mast.

New lifting-band lug coordinates in the source mast's LOCAL frame:
[[.14,-.13,-1.25],[.14,.13,1.65]]. They lie on +world-Z side after the existing
final quaternion. Band heights avoid the attached crossbars, and separated
lateral offsets keep two sling legs distinct. Original +world-X-face lugs place
ropes through the .6m crossbars and must not be reused. Sling rise1.5m.

## Actual numeric evidence

proposal.ts/mjs and proposal.json test4,004 poses per assembly against the
actual manifest-oriented part boxes. Broad-phase excludes only parts entirely
below300.7m (all candidate solids start above300.766m) and genuinely future
mast/crossbar identities. No same-source exemption is used.

- Max tower overlap10.173micrometres at final mast butt: export rounding.
- Cargo vs .13m pole, .24m boom envelope and .028m sling envelopes: zero overlap.
- Pole and four fork braces vs already-seated tower: zero overlap.
- Minimum hook cable .637247m; maximum horizontal reach1.677379m on3m jib.
- Exact source member dimensions and manifest hash: support-members.json.

These are sampled conservative oriented-box results, not a continuous proof or
final Blender triangle/contact test. New collar solids, tackle blocks, worker
hands, operating ropes and moving-clamp transfer still need authored-geometry
checks. The pole must climb through a supported clamp-transfer mechanism; changing
its baseY instantly between deliveries is not acceptable.

## Balcony and production-renderer constraints

Upper balcony floor top295.000m; west perimeter member m036 top295.010010m,
centreX-1.524401m, width.18m. South perimeter m044 has the same top and centreZ.
Annular floor has a +/- .65m opening; lantern radius1.15m leaves a narrow walkway.
These are genuine floor/ring members for a separately reviewed compact operator
and winch, not permission to place a wide machine anywhere atY295.

EiffelCraneRig.ts:52 hardcodes a3.4x2.8m pad; :54 adds+/-1.3m supports;
:75 fixes guy feet+/-1.45,+/-1.15; :78 puts its operator on that synthetic pad.
The entire upper structural ring spans only3.2288m on X. A new compact authored
rig and remote-drive layout must replace these assumptions. sampleEiffelCrane
can supply the tested boom/hook kinematics, but supplies no clamp or support
proof (eiffelCrane.ts:33–35).

Do not yet promote the remote295m winch/lead-rope proposal: a straight lead to a
climbing pole can intersect the cupola. Its guide supports and route remain
outside this bounded frozen static pole/cargo design.
