# Spec 14 — Eiffel Tower Replication Scene

## Owner refinement goal — 2026-09-06

The owner accepts the broad animation direction and requests these additional
requirements before Eiffel is complete: mechanically plausible construction,
a richer 1889 Paris, substantial camera rotation comparable to Giza, realistic
sky/surroundings, and a summit checked against historical images. Afterwards,
randomly select one still-unfinished catalog wonder and repeat the complete
Blender → manifest → physical animation → browser-review pipeline. Save every
Blender source in this repository and update the handoff/evidence documents.
Blender/MCP work is performed by the parent agent; lower-cost agents may own
bounded code tasks. This remains one full goal, not just a summit/camera patch.

- Camera: continuous substantial orbit (target 125°), immediate azimuth motion,
  near framing of current construction early and full tower containment late.
  Do not fit a complete invisible tower at the opening just to pass tests.
  The orbit is measured over the complete visible film clock. Inserted ground
  lifts, joint campaigns and their transition cuts must inherit the same
  monotonic azimuth; a detail shot may change target, pitch and fitted radius,
  but it must not freeze, reverse or jump the orbit at a chapter boundary.
  Orbit speed is composition-aware: the long close construction chapters must
  still traverse a visibly meaningful clear outboard sector, while the shorter
  wide completion may carry more of the arc. Constant angular speed is not a
  goal when it turns a working load end-on or hides it behind completed iron.
- Summit: reconstruct enclosed public gallery, upper apartment/terrace,
  curved open campanile, cylindrical lantern with a domed cap, small upper
  balcony, and flagstaff. Rouillard's 1889 section is the visual authority;
  Eiffel's account gives 276.13 m third floor and 300.51 m upper lantern
  platform. Preserve the documented 312 m flagstaff envelope. Smaller details
  inferred from the engraving remain an authored approximation.
- Logistics: remove complete tower tiers on huge carts and unbounded jibs.
  Use connected, bounded shop assemblies, tower-mounted small steam cranes,
  real support/attachment points, temporary wooden support of the lower
  pylons/first-floor join, and paths clear of completed iron and scenery.
  Treat final geometry, physical contact, occupancy and crane reach as distinct
  checks; scalar bounding boxes do not prove all of them.
- River: water level and carved channel use shared pure data; the rotated
  water footprint must not overlap dry hillside. Bridge banks and tree
  clearances follow the same river coordinates.
- Paris: richer layered streets, enclosed courtyard blocks, varied period
  roofs, quays, bridges and the exposition setting around the camera orbit.
  Preserve monument legibility and the existing workload budgets.
- Weather: use neutral blue-grey daytime river haze, with blue sky above
  roughly 3 degrees elevation. Keep mist near the horizon; avoid an opaque
  beige/pink sky band. Plane trees need full deciduous crowns rather than
  flat parasol silhouettes. Preserve dated before/after browser captures.
- Retain dated pre-change model exports/renders; save a new version of the
  `.blend` and reproducible source script at each meaningful model revision.

Sources: [Rouillard, 1889](https://commons.wikimedia.org/wiki/File:Le_sommet_de_la_Tour_Eiffel._Coupe_dessin%C3%A9ee_par_M._Rouillard.jpg),
[Eiffel, La Tour Eiffel en 1900, p.18](https://fr.wikisource.org/wiki/Page:Eiffel_-_La_tour_Eiffel_en_1900,_1902.djvu/40),
[official construction account](https://www.toureiffel.paris/en/news/130-years/construction-eiffel-tower-exemplary-project).

### Second-floor receiving route redesign — 2026-09-08

Test a diagonal overhead receiver from the first-floor pickup column at
(-8.5,-4) to the existing upper-relay stock cart at (-15,-1.8), on the116.14m
floor. This avoids adding an unsupported lateral slide to a fixed-axle cart.
The candidate must have real deck bearings, substantial rail-support girders,
a continuously supported trolley and a connected powered hoist before admission.
Check full cargo translation sweeps, actual foot corners, worker/cart clearance
and tower/bridge occupancy. A clearance-only frame is not an operating crane;
stability, anchorage, erection, drive, braking and rigging remain required.
Preserve earlier receiver artifacts and the main animation until replacement
has a complete, verified lifecycle. Save any Blender candidate as a new file.

The diagonal receiver trolley uses four bored wheels on the two actual rails,
fixed axles and bored hanger supports for a separate sheave. Its entire moving
mesh must clear the frame, bridges and completed tower; named rail contacts
must retain wheel-radius contact through the full6.862215m travel. Wheel angular
motion follows distance/radius. A kinematic fit viewer may show an empty trolley,
but cannot imply powered cargo delivery until the drive and full rope are authored.
Keep the parked cart/cargo static in that fit viewer and label its scope clearly.

The diagonal hoist rope shall run from a deck-supported drum through a fixed
redirect sheave and the travelling sheave to the same cargo hook. Use tangent
segments and sheave arcs; account for both horizontal trolley travel and vertical
cargo travel in deployed length and drum rotation. The travelling sheave center
sits0.25m beyond the cargo column so its vertical tangent meets that column.
Verify the shifted trolley sweep, actual drum/guide supports and the complete
rope path before joining the first-floor and upper-relay supply clocks.

The302s continuous diagonal supply review retains the ground cargo under its
original scene parent through first-cart handoff, secondlift166–272s, diagonal
transfer272–288s, landing288–292s and unrigging292–296s. The empty hook retracts
only after release; the cargo remains on the original upper-relay stock cart.
Retain both carts and workers on reverse seeking. Treat this as transport/rope
validation until power, braking, restraint, riggers and erection are admitted.

The full three-floor transport review extends the same cargo to the197m receiver.
After the diagonal hook is detached and retracted, the waiting second-floor
worker must visibly regrip the cart over302–306s before it rolls. Then reuse the
182s second-floor-to197m sequence, ending488s. Keep all earlier stations/carts
present, and adapt upper sling attachment to the actual retained cargo bands.
Check the onward cart/worker against newly added receiver hardware and retain
continuous poses at both clock joins; no cargo replacement or hand teleport.

### Admission of actual construction payloads — 2026-09-08

The 488 s crate sequence is a transport proxy, not delivery of a named tower
member. Before production integration, inventory all actual kit members against
its .58 x 1.78 x .58 m body envelope. Treat this exterior envelope as an optimistic
size screen, never an empty usable crate interior. Check all six axis assignments
without scaling or cutting geometry. Separate axis-aligned failures from proven
all-orientation failures: a real box edge longer than the envelope diagonal cannot
fit at any rotation; a cupola bounding box alone does not establish that proof.
Record all part IDs, manifest digest, size cohorts, and actual limiting members.
No size-screen result admits rigging, load capacity, packing, unloading, onward
transport or final installation. Long and broad members require their own real
carriers and clearance checks, not replacement with a generic box or shortened
geometry. Use the complete inventory to size the next Blender transport revision.

For the first-floor long-member candidate, preserve physical member dimensions
and test both upright and horizontal attitudes against completed tower and bridge
solids. If a taller head is required, recompute mast/backstay/head-brace endpoints
at canonical205.4 m while keeping the existing deck bearings; do not scale or
translate the whole station off its supports. Test the resulting actual frame
against the tower and its bearings before Blender export. This candidate remains
unrated until bracing, anchorage, drive and the complete loaded lifecycle pass.

A real long-load lifting carrier must retain the actual member mesh dimensions.
Its bottom shoe bears the member; four continuous tension rods connect shoe to
head plate; two collars restrain the member laterally; lifting eyes have real
holes and the sling contacts their inside surfaces. Check the complete carrier
and sling envelope, not just the slender member. Keep the hook attached after
landing until the cart has an authored restraint. A clear envelope and positive
contacts do not establish rated load capacity or a completed equipment lifecycle.

Replace the long-load hoist's zero-volume sling apex with a closed master link.
Use one continuous forged ring and separately routed rope eyes that pass around
its material, with distinct lower strand attachments. Raise the hoist rope end
by the actual upper eye/splice height and recompute deployed rope length; do not
leave the old rope running through the new link. Preserve the carrier pose and
all previous receiving contact points. Validate actual link/rope occupancy and
remaining sheave headroom. This interpreted detail does not establish an1889
replica or resolve the lower rope terminations and cart-release lifecycle.

Close the four lower sling terminations around the existing carrier eye bars.
Use explicit rope loops that embrace the material above the bore, with distinct
splice apexes joined to the four master-link strands. Keep the actual carrier
and master-link dimensions unchanged. Check complete curved rope paths against
actual head/eye geometry and other strands, and preserve master-link height and
receiving contacts. These loops start already rigged; manual rigging, release,
cart anchorage and operational load capacity remain separate requirements.

### Seated deck seam stability — 2026-09-08

For rigid merged review geometry, remove a shared interior box face only when
an exact, oppositely oriented rectangular face covers it completely. Preserve
exterior faces, partial contacts, vertex attributes and separately moving parts.
Keep normal antialiasing enabled; disabling it is a diagnostic, not acceptance.
Compare the original and cleaned geometry at the same camera/time and exercise
moving-camera desktop/mobile rendering. This cleanup must not close openings,
change support surfaces, or imply construction completion. Production geometry
with independently moving members needs its own lifecycle-aware admission.

### Paris background and period life — 2026-09-07

#### Owner visual correction: photograph-led Exposition setting

September 7 follow-up: use Alphonse Liébert's 1889 balloon photograph,
LoC 92514593 / cph.3b40739, to study the unequal roof heights, narrow attached
houses, interrupted courtyards and mixed roof directions visible around the
fair. Replace the north bank's identical four-wing silhouette with authored
street-front, L-shaped, split-front and double-court ensembles inside the
existing clear street reservations. These are photo-informed typologies, not
identified building-by-building replicas. Pack the actual photo in the saved
Blender file, and retain the prior GLB and manifest for comparison.

Eiffel's display grade must not add animated film grain: a motionless surface
must remain unchanged when only the grade clock advances. Keep the existing
filtered moving water and 5m near plane. Measure the grain change independently
of camera, lighting and water motion, then review real desktop/mobile orbit
playback. This does not imply all subpixel edges or depth conflicts are solved.

The facade pass must put actual UV-mapped base-color material into Blender's
north-bank wall meshes and embedded GLB, replacing the Web-only window grid on
those faces. An explicitly labeled generated1880s limestone facade texture is
an authored art asset, never historical evidence. Preserve horizontal tile scale
and ground-to-eave vertical mapping. The city loader preserves source UVs and
the sRGB texture through its single multi-draw batch, uses trilinear mipmaps and
anisotropy, and owns/disposes the texture. Untextured architecture retains its
palette. No extra geometry or render passes. Compare Blender and Web renders,
test embedded image/UV bytes and texture lifetime, and verify moving desktop/
mobile views for aliasing and the existing GPU budgets.

September 8 full-supply correction: elevated receiver stock is not ground
provenance. Audit every upper operation against the actual completed kit at its
start time. A ground-feed proposal must include ground pickup, a clear ascent
outside the receiving deck, transfer above the receiver and descent to the same
stock pose. Test whole fixed-orientation swept cargo volumes, including the
receiver deck and its support beams. Preserve rejected part IDs and blockers.
An envelope-only route is not production admission: ground access, loading,
carrier supports, rigging, persistent machinery and final installation still
require their own geometry and lifecycle checks. A direct vertical lift through
the receiver deck must never be treated as a valid shortcut.

Measure a reversible readable clock across all original operation intervals;
four visible frames is a lower-bound timing study, not a real-time mechanical
speed or proof of a readable complete lifting sequence. Preserve the currently
admitted chapters and their original route fingerprints during this study.

Summit prefetch study: use the completed third terrace before stage 57 closes
the apartment, at production coordinate 0.7035504929004187. Test stage 61–63
stock through the central shaft in fixed, upright transport orientations. Store
named pieces in nonoverlapping shelf slots on eight two-level racks supported
by the actual 280.59 m terrace. Preserve the inner walking strip and the central
opening. Author the rack geometry in Blender, retain editable source and verify
all bearing feet against the exported terrace. A packed box envelope is not
stable storage of a curved part: fitted cradles/restraints, crane and rigging,
handoff rotation and stock extraction remain admission gates.

Historical relay correction (Watson, report on the 1889 Exposition, published
GPO1892, printed pp823–824 §§345–346, Fig239 and PlateXVI): upper erection
used successive steam winches on the first floor, second floor (115m in this
account), and the Edoux intermediate floor (197m), feeding two back-to-back
cranes fixed to vertical central elevator guide pillars. Three3m auxiliary
frames form a9m climbing road, with temporary beams and backup jacks. Preserve
this distinction between freight hoisting and final erection. The current kit
has no modeled197m transfer deck or central guide support assembly; these are
missing architecture, not permission to place a floating winch at197m. Add and
verify real supporting geometry before showing those mechanisms.

Relay-platform geometry study: author a 197m intermediate platform with a
central freight aperture, seated decking, substantial frame girders, inward
brackets and fitted collars on the four actual stage45 main uprights. Do not
carry it on the thin decorative lacing. Collar contact is an interpreted fixed
connection, not certified bolt/clamp capacity. Keep the current column geometry
and reject any unintended intersections with other completed iron. Preserve
source vertices, named attachment members, Blender source and independent GLB
surface checks. Erection sequence, complete anchorage mechanics and operational
cargo/rope clearance remain separate gates before main-film admission.

Relay erection inventory: retain individually addressable rigid units in the
Blender export. Partition the deck into 220mm boards with interior end joints
on existing joists; retain the existing 140mm perimeter overhang explicitly.
Split I-girders into at most 4.5m segments, keeping each web and both flanges
in one load. Girder segment ends require splices and temporary suspension;
partitioning alone must not imply a supported erection sequence. Split long
rails at existing posts, preserve four separate collar plates per upright,
and preserve the final occupied volume. This inventory remains a model study
until supported transport, connections and installation are animated.

Relay splice study: connect the fourteen girder partition seams using paired
web fishplates and four through bolts per seam. Keep the web plates below the
joist undersides; drill real holes in plates and girder webs instead of hiding
solid bolt/iron intersections. Retain independent fasteners and rigid beam units
in Blender. This interpreted connection is not a load rating or permission to
release an unsupported beam before both its bearings and connections exist.

Relay receiving mechanism study: use a compact fixed braced head-frame with
skids bearing over the inner/outer girders, a winding drum and a real traveling
sheave trolley. The checked freight lane is x0,z-1.8. A0.6x1.8x0.6m crate must
remain on its rope during hoisting and lateral travel, then make bottom contact
with the197m deck. Fixed crossmembers must not obstruct the hanging trolley;
wheel bottoms must meet rail tops. Preserve the same rigid cargo throughout.
This demonstrates a receiving station only, not the complete historical ground
supply chain. The winch dimensions and head-frame are interpreted, not measured
from the historical account. Do not promote this excerpt as full-film completion.

Second-floor supply extension: the current deck top is116.14m, with a central
opening approximately18m wide. Never place the197m receiver skids at x0 on this
opening. An interpreted two-ended transfer bridge may span from actual west to
east deck bearings; preserve a free central cargo lane and stair exclusion.
It must carry a wheeled stock cart to the hoist pickup with actual wheel/deck
contact, then retain that cart as the same crate is lifted to the197m receiver.
This extends the lower source of the excerpt, but does not replace the missing
ground/first-floor delivery, drive, workers or equipment erection.

Stock approach and pushing crew: make the temporary bridge deck flush with the
existing116.14m second-floor surface. Suspend cross-joists from the side trusses,
seat longitudinal ledgers on those joists and seat planks on the ledgers; do not
let the cart step up by0.38m. Start the loaded cart on real west deck at x-15.
A visible worker pushes real handles while feet plant on the floor; fixed-length
limbs and hand contacts must follow the same cart state used by the renderer.
After stopping, the worker releases the handles and stays present. Other riggers,
operators, power and preceding floor logistics remain separate incomplete work.

Lower relay continuation: revalidate freight routes against the current bridge,
not only the tower and the197m platform. The flush bridge obstructs the earlier
x0,z-1.8 ground lane. Keep the documented ground-to-first-floor,
first-to-second-floor and second-to197m hoists as separate supported transfers.
A collision-free vertical line is insufficient evidence of that supply chain.
For each inter-floor handoff, show a supported receiving surface, a reachable
operator position and continuous load ownership between the old and new hooks.
Validate the load, slings, rope, carrier and operator against the completed
geometry at the relevant stage. A preliminary crate-only dogleg must not be
animated as an operational route until those mechanisms exist. Preserve the
same load identity through staging and deliver it to the existing second-floor
cart without spawning a replacement crate.

First-floor receiving mechanism: use the verified west-floor landing near
x-21.5,z-4, with floor top57.94000244140625m. An interpreted skid-supported
head-frame and traveling sheave lift from the adjacent x-19.75,z-4 shaft,
then move the same crate above the inner floor edge and lower it onto the
real deck. Raise the head sufficiently to keep the hook below the sheave at
maximum cargo height; do not stretch the old rig at runtime. Verify all skid
corners against the actual floor and all fixed/moving solids against the tower.
This adds the first relay, but powered drive, operating crew, equipment erection
and the supported cross-floor transfer to the next hoist remain required.

First-floor transfer bridge: span the existing aperture between four real
floor bearings atx±20.7,z-4±1.05 with a flush57.94000244140625m deck. Use deep
side trusses and suspended joists/ledgers, not an unsupported cantilever.
Keep a hinged opening atx[-20.3,-19.3] for the ground lift atx-19.75,z-4;
fixed joists must not obstruct that opening. Close it only after the entire
crate clears its swept volume. The first hoist lowers the same crate onto a
waiting cart; retain the original standalone floor-landing study separately.
The cart then carries the load to the next pickup atx-8.5,z-4 with a visible
pusher and planted footsteps. Verify the winch frame, cart handles and worker
clear each other. Preserve old Blender assets when changing the receiving rig.
This interpreted bridge still requires connection, capacity and erection work;
it does not prove the subsequent second-floor hoist exists.

Second-floor receiver continuation: preserve the original first-floor empty
cart, worker and parked rig while the same cargo transfers to the next winch.
Use the clear pickup atx-8.5,z-4 above the first bridge and land on a waiting
cart atx-10.25,z-4 on the real116.14m second-floor deck. Keep the unloaded
second hook parked until the cart arrives, then attach before lifting. Cargo
must remain continuously supported by cart or tensioned rig, with no duplicate
cargo displayed in either station. Validate the whole ascent and trolley travel
against completed tower iron and both bridges, plus exported skid and cart
wheel contact. This does not complete the lateral second-floor transfer to the
existing197m hoist; that connection remains explicit unfinished work.

The central-shaft/rack prefetch study is an authored geometric proposal, not a
historical reconstruction of this relay. Keep its reusable clearances and reject
unproven handoffs. Do not promote a single uninterrupted ground-to-summit lift
as the documented method, or invent a giant summit gantry to close the gap.
A rack insertion may use multiple fixed-orientation waypoints to clear corner
posts; check every whole translation sweep against racks, completed iron and
previously stored loads. Horizontal shelf movement still needs rollers or a
supported handling mechanism before production admission.

September 8 variation pass: replace the single repeated three-bay facade with
one shared four-frontage atlas, preserving horizontal frontage scale. Adjacent
frontages may differ in opening shapes, stone tone and shop treatment. Record
the selected atlas start per wing and preserve the same UVs/image in Blender
and Web without extra material passes. Original generated texture artwork is
not a historical photo. Retain the old texture and before assets. Keep the
240k static-city and 300k mobile-frame budgets while improving skyline variety
and occupied river-bank streets; verify the actual production camera frames.

Populate the existing first north-bank sidewalk sections with 128 additional
walking visitors. Keep their complete footprint on the exported paving and
outside buildings; use the existing economical distant-person geometry.
This is background street activity, not a surveyed 1889 population count.

September 7 photo-detail pass: compare the paired palaces against LoC photograph
92519631 (1889 Trocadéro view) and Carnavalet G.30823 (1889 photomechanical
print, not an original photographic print). Model projecting three-arch central
entrances, drum oculi, divided glazing and cornice bands as actual geometry.
Save these source images and their catalog metadata beside the new Blender
checkpoint. Visible features are reference-led; dimensions, hidden elevations
and colors remain authored. Do not describe this as automatic image-to-3D or
photogrammetric reconstruction. Retain the 240k static-city / 300k mobile-frame
budgets by reducing invisible-scale arch segmentation before adding detail.

Rotating-camera QA must also cover palace glazing and fountain water: surface
depth separation must survive the cinematic viewing distance, and procedural
water frequencies must filter out as they become smaller than a screen pixel.
Test motion at desktop and mobile sizes, not only isolated paused images.
The confirmed depth-buffer correction uses a 5 m near plane for Eiffel's
cinematic camera (other wonders retain their settings); verify the closest
visible tower vertices remain outside that plane throughout the orbit. Water
uses Eiffel-only derivative-based filtering of procedural noise octaves and
normal frequencies, preserving broad waves without distant pixel-scale chop.

The repeated courtyard blocks and sparse distant actors were rejected. Rebuild
the background from the CNAM 1889 photograph, *Vue d'ensemble des palais du
Champ de Mars* (Rapport général, tome II, 8 Xae 349 (2)): two elongated arcaded
palaces with prominent ribbed domes, the central industrial dome, the broad
iron/glass Galerie des Machines behind it, axial fountains, formal gardens,
tree groups and busy promenades. This is an original model interpreting the
photograph's visible volumes and spatial hierarchy, not single-image metric
reconstruction. Hidden elevations, colors and compressed distances are authored.

Retain a clear tower work perimeter. Exhibition architecture occupies the
southern background and small distinct pavilions/market stalls the western
foreground. Replace uniform residential blocks with individually proportioned
parcels, roof profiles, heights and facades along the existing street grid.
The scene depicts the exhibition setting around the compressed tower erection;
it does not claim every neighboring pavilion was complete throughout 1887.

Use Anno 1800's public Pedestrian Zone and City Lights imagery for readable
street activity, market props, grouped vegetation and occupied plazas. Never
import game assets. Populate the near promenades with hundreds of distinct,
human-scale pedestrians and substantially more horse-drawn traffic. Actor count
alone is not acceptance: people and vehicles must be visible in the actual
cinematic framing. Preserve clear lanes, contact and mobile GPU budgets using
spatial culling and economical distant actors. The old long-jib construction
defect remains a separate mandatory correction; do not conceal it cosmetically.

The fair and south-bank population is **520 people**; the September 8 pass adds
128 north-bank walkers for **648 people** across the city. The fair includes 60–100 added
market visitors around the fourteen stalls and restaurant seating, plus about
80 visitors on the garden walk and palace-entry promenades. A count is not a
marching column: combine strolling lanes with standing pairs and short milling
loops, use bounded lateral offsets inside the paving, and preserve clearance
from tables, trees, pavilion walls, pools, vehicles and the tower work zone.
Foreground representatives retain articulated feet and real human scale; the
majority use two-tone, per-object-culled distant geometry so the complete mobile
frame remains at or below 300,000 triangles and 150 calls.

References: [CNAM photograph and identification](https://cnum.cnam.fr/expo_virtuelle/expositions_universelles/1798_1900/page_cartel/cartel.php?id=Paris_1889&num=3),
[Carnavalet G.30823](https://www.parismuseescollections.paris.fr/fr/musee-carnavalet/oeuvres/vue-d-ensemble-des-palais-du-champs-de-mars),
[Anno art-team notes](https://www.anno-union.com/devblog-pedestrian-zone-pack/).

The owner specifically requests a new background model built in Blender,
with pedestrians, carts, period vehicles and river craft. Author an original
Haussmann-inspired city with enclosed courtyard blocks, varied floor and attic heights,
continuous stone cornices, zinc mansards, dormers, chimneys, balcony rails,
shopfronts and connected paved streets. Save a separate editable `.blend`
and export static geometry batched by material plus articulated life assets.
The street layout is an authored compressed Paris setting, not a cadastral
reconstruction of the 1889 Exposition. Retain the 1878 Palais and École.

Use pedestrians, horse-drawn carts/carriages and steam passenger boats/barges.
Ordinary motor-car traffic is excluded: Peugeot's own history records an
uncommercialized steam tricycle exhibited in 1889, not a normal urban fleet.
Motion uses deterministic distance, wheel rotation, foot/hoof support and
separate road/sidewalk/river lanes. Roads share the terrain sampler; boats use
the actual rotated Seine channel and waterline. No recycling across visible
route endpoints, no traffic through tower foundations or the east works yard.

Sources: [Peugeot history](https://www.peugeot.es/marca/universo-peugeot/historia-y-cultura.html),
[1889 Seine photograph, Carnavalet](https://www.parismuseescollections.paris.fr/en/node/179673),
[official Eiffel steam cranes and staged freight lifts](https://www.toureiffel.paris/en/news/history-and-culture/eiffel-tower-and-its-steam-engines).

### Resumed physical and setting correction — 2026-09-07

A fresh exact-box audit found cargo penetration into completed platform iron,
foundation hauling through completed bearings, and receiving decks intersecting
arches. Existing mast-only checks do not establish clear construction routes.
Correct occupancy against already seated geometry, including the full receiver,
while retaining rigid final shapes, finite jibs and real support-face anchors.
Foundation haul follows rounded clear corridors around all complete bearing
footprints, with cargo/carrier/hauler extents and shared terrain contact.

The visible east work yard uses `src/data/eiffelSiteLayout.json`: dirt apron,
workshop and tool store, low steel racks, timber and masonry stocks, fencing and
an open gate linked to the delivery pads. The interior x[-88,90], z[-84,85]
remains free of static props and receives worn construction ground, not uniform
lawn. Pure foundation routes drive the material-delivery corridors; scenery
must not occupy them. These are authored workshop details, not claims that a
particular photographed shed stood at a surveyed coordinate.

Far north-bank parcels have connected roads and sidewalks through their gaps,
with approach streets outside the 1878 Palais. Parcel rectangles, street strips
and work-yard footprints are exported for overlap/contact validation. Keep the
normal cinematic camera, 648-person city crowd, saved Blender source and
mobile budget (300,000 submitted triangles and 150 draw calls); the complete
city source may use up to 240,000 triangles because spatial culling submits only
visible districts. A setting is not complete just because a distant roof row exists.

Sky refinement keeps a deterministic world-space cloud field with legible
soft cloud bodies, shaded cores and a lighter low blue atmosphere. Preserve
the fog-matched horizon and real apparent solar radius; this is authored
weather, not a claim about conditions on a particular 1889 date.

### Persistent equipment campaigns

Use stable physical rig identities rather than assigning identity by an active
array index. Foundation work groups complete bearing courses into four parallel
quadrant campaigns: a fixed, ground-supported derrick serves each bearing,
parks its hook while a carrier arrives, and travels along a clear rounded ground
route before working at the next bearing. The same rigid mast and jib persist
through loading, lifting, unloading, parking and relocation. Foundation course
order applies within each bearing; all foundation work completes before iron
assembly. Upper erection still observes global stage barriers.

A complete campaign implementation must also supply supported relocation onto
and between upper stations, including stationary receivers and their removal.
The original source describes a bolted sliding chassis on the future elevator
girders, and an articulated bracket keeping its platform level. Record any
unimplemented ground-to-climber handoff or upper campaign as unresolved; a
foundation pilot does not satisfy the complete rig lifecycle.

Sources: [1889 Revue technique, crane construction pp.134–136](https://cnum.cnam.fr/pgi/redir.php?ident=8XAE353.1&onglet=c),
[Eiffel steam cranes and staged freight](https://www.toureiffel.paris/en/news/history-and-culture/eiffel-tower-and-its-steam-engines).

### Guyenet crane reconstruction milestone

Build an isolated editable Blender crane from the 1889 technical account and
atlas plate 55–56, figure 23. Documented constraints are a 4,000 kg capacity,
5.5–12 m horizontal reach, a 2.5 m main climbing stroke and 0.5 m safety-jack
strokes. These supersede the historical interpretation of the earlier authored
8.4 m jib cap; the existing production rig remains an interim implementation.
Unlabelled dimensions and proportions must be explicitly identified as authored.

Export separate rigid guide, chassis, level bracket/platform, pivot, lattice
jib, sliding tie collar, fixed ties, upper anchor/screw, and safety-jack groups.
A web mechanism review must use the actual Blender export and the shared pure
sampler. Show an unloaded climb with the jib aligned along the guides and
supported transfers between bolted anchors; never stretch structural members.
Operational luffing is reviewed perpendicular to the guides, separately from
climbing. Verify transformed endpoints, contact and clearance in the real asset.
The isolated review is a component milestone; production integration still
requires rail installation, payload mass, a serialized supported lifting
campaign, relocations and removal. Do not claim the whole movie cleared.

### Construction kit revision

#### Continuous ground-delivery chapter — September 7 correction

The owner's latest physical objection supersedes acceptance of high receiving
decks as an adequate supply chain. Those legacy routes remain unfinished until
their cargo origins and connected delivery are visible. Do not describe the
full movie as physically resolved because the following chapter passes.

Insert a 55-second continuous passage in the MAIN Eiffel movie at original
production t=0.09025741777108326, for lower-ne-02-m013-c003. Preserve old plan
coordinates/caches through a pure film-clock mapping: original60s + preparation
cut3s + visible lift55s + later-work cut4s =122s. Freeze ordinary construction at
the exact wave boundary; do not seat or drop the three other members in that
wave. One kit sampler owns the selected cargo throughout; it remains seated
after the passage and is not handled again by the old rig.

Show a loaded ground cart arriving, two pushing workers with grounded gait,
wheel travel, slings attaching while the load is supported, vertical hoist,
rigid rotation, slew, seating, unrigging and empty-hook recovery. A closer
camera first establishes the complete supported rig, then dollies smoothly to
an outboard cart/rigging view. Follow the rising load with its slings and a
visible hoist line leading back to the established rig; show final joint seating,
then return wide during empty-hook recovery. Framing contracts are phase-specific:
all ground support is visible in establishing/recovery views; the working view
prioritizes the actual cart, workers, slings, load and local joint, without scaling
or hiding structural geometry. Check foreground-lattice occlusion against
completed solids and actual rig geometry. Preserve human scale, continuous
camera motion, near-plane clearance and the original outer orbit. Environment
motion continues while the old construction clock is held. Remap narration/caption beats to production time;
use silent written phase descriptions during the added passage.
Ground rigging needs visible slingers beside the cart. Their hands must reach
the actual loose sling ends and pickup lugs, with fixed human-scale arm lengths
and planted feet clear of the cart bed and wheels. Reach only once the lowered
hook brings the ends within reach; release before the suspended load leaves
their reach. Do not stretch arms, let torsos intersect the bed, or imply that
these ground workers also perform the unfinished high-level unrigging work.
The ground arrival covers10m in10s, with a1.5m/s maximum eased speed. Do not
reuse the earlier27m/10s run. Hold playback and soundtrack clocks until the
scene assets are ready; loading must never consume the opening. The longer
movie repeats Eiffel's own bundled cue at native pitch and speed, without
per-frame backward seeks. Other normal-duration wonder cues retain their timing.

The crane uses the actual NE Blender variant with37.87640024degree guide tilt,
derived flange-contact shoes, six-post ground support and219 bounded members.
Recess the heavy crossbars between rails with narrow shoe connections; lower
hotte struts turn inward before passing the rail plane. The specific route's
reviewed working sector is60–121.65degrees; the generic component remains60–120.
Retain actual source/GLB equivalence and sampled hooked-rig clearance evidence.

The frame/guide installation and eventual dismantling are editorial omissions,
not animated or mechanically verified. Fully opaque, plainly worded cards
must explicitly disclose these elapsed-time cuts before equipment changes.
Never make that change in a continuous visible shot. The station clears before
ordinary construction resumes, preventing known stage10arch conflicts. An
honest omission does not satisfy the still-open full equipment lifecycle goal.

The following receiver behavior describes the remaining legacy implementation,
not the accepted final construction contract:

#### Supported splice campaign

The next main-movie delivery campaign seats `lower-ne-02-m012-c001` and
`lower-ne-02-m012-c002` separately at the original production freeze
0.09193744785606445. Keep their independent mesh identities and final sizes;
do not merge them into the rejected eleven-metre load. The two external
supports (`m012-c000` and `m016-c000`) must already be seated. Their common
splice needs an actual temporary bearing beneath the transformed lower faces,
with a braced path to ground or established falsework. Author and save this
support in Blender, export it to the web, and verify its actual geometry.

Each admitted load must arrive from the ground on a carrier, attach to fixed
length slings, travel through a checked crane route and remain at its final
pose after seating. Show the first member resting on its temporary support
while the second arrives. Seated identities persist across backward/forward
queries and cannot be delivered again by legacy operations. Use visible time
for both deliveries, independently of the compressed original production
schedule. Failed support or swept-route candidates must not be enabled by the
film mapper. Disclose any still-omitted equipment preparation/removal with the
existing editorial treatment; such omissions remain unfinished lifecycle work.
When two editorial cards surround less than a quarter-second of compressed
production, keep the picture covered through that interval. Preserve the
production clock and handoffs, but do not flash one bright construction frame
between the cards or play an ordinary caption voice over the cover.

The permanent cheek plates travel captive on the first delivered member,
initially 0.4 m short of the splice. Their fixed retaining pins and visible
longitudinal slots preserve attachment during transport and a supported slide
after the second member seats. Two positive basket hitches wrap under each
member and travel with its ground stock. Their eyes and the upper hook align
over the combined iron/hardware centre of mass; rotating the load must not
introduce an unsupported roll constraint. The cart has 50 mm deep sling
channels, while the remaining deck continues supporting the iron. The
fastening worker stands on the braced platform with grounded feet
and fixed 0.38/0.40 m arm links. Both plates must bridge the joint and be
fastened before the temporary bearing can disappear. These added cart,
support and captive details are authored mechanical interpretations, not
claims of exact historical hardware or certified load capacity.

The preceding behavior is a new campaign requirement. The following paragraph
continues the legacy receiving-deck description and is not an acceptance gate
for ground provenance.

Full-film timing keeps the existing camera's first/second/third-floor milestones.
Each iron stage completes before the next begins. Repetitive small members are
compressed into short erection waves; selected camera-readable waves have a
longer continuous lift of roughly 0.35 seconds. Dependency-linked members never
share a wave. No more than four full cranes operate concurrently. Temporary
triangulated brackets may extend up to 4 m from two authored saddles on completed
iron; these are a diorama interpretation, not structural-capacity certification.
Foundation loads remain on visible ground-following carriers until a short
derrick attaches. Elevated loading points use receiving decks whose grillage
terminates at two authored saddles on completed iron. Arrival from the lower
freight lift is a deliberate compressed handoff: cargo first becomes visible
resting on that receiver, then the local crane attaches and follows a continuous
rigid route. The film does not depict the full ground-to-floor elevator journey.

The first-floor erection route must check actual oriented member solids against
already seated iron. Separate vertical lift from cargo rotation, place receiving
decks in clear space, and validate deck/grillage occupancy as well as crane
reach. Authored final joint overlaps may be admitted only during seating and
never exceed their final penetration; they are not a blanket route exemption.
Record unresolved routes explicitly rather than claiming clearance from mast-only
checks. First-floor crane feet may use already completed deck faces up to 4 m
above the load underside; a crane can lower into its destination. Receiver
saddles may move along that same real support face to avoid crossing other
members. Bake validated routes offline and fingerprint the complete kit and
operation inputs; a changed kit must not silently reuse stale geometry checks.

The next Blender export replaces whole tiers with independently handled short
members/panels. Canonical cargo axes are width, height, length; the longest
dimension is at most 6 m and transverse dimensions at most 2.6 m. Final member
orientation is exported as a rigid quaternion, allowing horizontal haul and
rotation during erection without scaling or replacing the moving shape.
Separate sixteen stepped masonry bearings under the four chords of each
pylon; build them from courses instead of carrying four enormous monoliths.

Keep this version in `public/models/eiffel-construction-kit/` and a dated
editable Blender file until its support/crane/routes and browser performance
are validated. This is a migration artifact, not permission to call the old
logistics complete. The canonical export supplies lift/contact anchors and
source-member provenance; anchors alone do not prove crane support or clear
routes. Those remain mandatory before production promotion.

## Blender reconstruction — current implementation contract (2026-09-06)

The owner rejected the pass-149 tower and requested a new Blender-authored
model before rebuilding its web construction movie. This section supersedes
the older tower silhouette, 197 m footprint, face-brace omissions, and camera
workarounds below. Those older sections record prior experiments only.

- Author and save an original, complete 1889 tower in Blender, approximately
  125 m across its feet and 312 m high, with four curved lattice pylons,
  open Sauvestre arches, platform belts at 57/115/276 m, a tapered upper
  shaft and period summit. Use real open ironwork and detailed joints.
- Export a local GLB plus a serializable construction manifest. The Blender
  model is the geometry authority; stable part IDs join the two artifacts.
  Separate bounded prefabricated assemblies into independent lifting events.
  Repeated member meshes are shared and instanced in Three.js.
- Keep final-size geometry throughout yard, wagon haul, staging, vertical
  hoist, transfer, and seating. The moving and seated shape must be identical.
  Manifest bounds and attachment points govern contact and crane placement.
  Seating proceeds from supported lower work to platforms and upper shaft.
- Pure TypeScript samplers own absolute-time motion. No runtime Blender or
  network generation. Asset readiness triggers a repaint during paused or
  reduced-motion viewing; late loads after disposal are safely released.
- Compose a new three-quarter construction camera around the corrected
  proportions. Retain Champ de Mars, Seine, the 1878 Palais, original Eiffel
  narration and reviewed score. Human labour must remain visible and causal.
- Giza is the visual comparison: dense place, readable construction, coherent
  dawn/day/dusk light, tactile materials and composed desktop/mobile frames.
  Review the Blender model before integration and compare actual browser
  captures after integration. In-session sub-agents are authorized; older
  model-specific delegation rules do not apply to this session.
- Keep the terrain horizon outside the camera frustum and fog distant city
  blocks before they compete with the tower. Avoid multiplying lawn tint twice.
  Night illumination belongs to the summit beacon and windows, not glowing walls.
- Target <=150 calls and <=300k triangles on mobile, <=200 calls and <=450k
  triangles desktop including scene context; record actual frame budgets.
  Test all phase boundaries, geometry continuity, source/wagon contact,
  deterministic seeks, readiness and lifecycle. Run full tests, typecheck,
  build, and desktop/mobile QA before reporting completion.

The schedule compresses prefabrication and erection into sixty seconds. It is
an authored construction interpretation, not a reproduction of every shop
drawing, rivet or temporary scaffold.

The Eiffel Tower is the fifth forward test of the Giza pipeline and of
`.agents/skills/wonderforge-scene-builder/`. It preserves the stable
`eiffel-tower` ID but replaces the legacy stacked-box silhouette with typed,
deterministic **additive industrial construction**: four masonry piers, four
inward-leaning puddled-iron lattice pylons that meet at the first platform,
then a single shaft to the lantern, raised with creeper cranes and rivet gangs
on the Champ de Mars.

Giza remains the quality bar. Stonehenge, Petra, Colosseum, and Sydney remain
prior replications. This scene transfers **contracts** (determinism, final-size
solids, shared support sampling, contact residuals, target-owned sky, unique
soundtrack lookup or silence) and never transfers Giza ramps, Stonehenge pits,
Petra unmasking, Colosseum treadwheels, or Sydney spherical sails.

The visual bar is the Giza movie: a dense identifiable place, human-scale
pieces in motion, dawn-to-night light, and a silhouette that reads as the
Eiffel Tower from the cinematic hold — not a growing brown stick or four
rotated boxes.

## Evidence and authored interpretation

Authoritative anchors:

- Construction 28 January 1887 – 31 March 1889 for the Exposition Universelle,
  Champ de Mars, Paris; engineers Maurice Koechlin and Émile Nouguier;
  architect Stephen Sauvestre; contractor Gustave Eiffel's company.
- Original height 312 m to the flagpole (later antennas raise the modern
  figure to about 330 m). The movie builds the 1889 tower, not later
  broadcast masts.
- About 18,038 puddled-iron pieces joined by roughly 2.5 million rivets,
  prefabricated at Levallois-Perret and hauled to the Champ de Mars.
- Four masonry piers on a square about 125 m on a side; first platform about
  57 m; second about 115 m; third/lantern about 276 m.
- Creeper cranes climbed each pylon; hydraulic jacks closed the first-platform
  join. That plant is documented industrial practice for this job.

The movie cannot instance eighteen thousand unique shop drawings. It authors
**lattice bays** (chords, horizontals, diagonals, arch segments, deck girders)
at final size as the human-scale structural part. That compression is labelled
as cinematic, never as a claim that each historical member is present.

Authored kit (plausible compression): four yellow-brown creeper cranes (one
per leg **through the join capture**, then a shaft climber joins them once
the needle rises). Axis arches and platform girders **do not** collapse
those four stations into one mast. The renderer draws **those stations**,
never a mast per hoist — a mast per active part
is a pole forest at the 520 m opening. Wagons from an east-bank iron yard,
rivet forges on the working face, timber falsework **under the north arch
only while it goes up** (hidden at t = 0.12 so four pylons read; struck
before the join so t = 0.32 is open iron). No 21st-century tower cranes, no
glass lifts as the hero, no 1889 exposition fireworks, no Trocadéro palace
of 1937 (use the 1878 Palais du Trocadéro across the Seine, which stood
during construction).

The movie compresses twenty-six months into sixty seconds and builds the
intended complete 1889 tower, including night electric beacons on the reveal.

## Additive physical contract

One world unit is approximately one metre.

Every structural part (`EiffelPart`) is authored at final size and keeps
scale `[1,1,1]`. The pure state graph is:

`yard → hauled → staged → hoisted → seated`

- `yard` occupies the eastern Champ de Mars iron-delivery yard.
- `hauled` keeps the part and a timber wagon as one assembly. Transformed
  bottoms meet the shared Champ sampler plus engine-owned wagon-bed height
  within 3 cm. Carrier height is applied once.
- `staged` rests on the **working floor beside that leg or shaft**, never
  inside the lattice volume of a seated bay.
- `hoisted` climbs a creeper-crane rope **vertically at staging xz**, then
  slews to the seat, then lowers. Never a chord through seated iron. A
  visible cable joins jib tip to the part.
- Creeper masts are **ground- or deck-rooted** segments of authored length.
  `composeAlong`'s third argument is **radius**, not stroke: masts **0.55 m**
  and gold jibs **0.72 m**. Parked **and active** jibs reach **≤ 8.4 m**
  toward the pylon — an uncapped boom to a slewing mid-leg piece is a
  Champ-spanning gold light-bar. Mast height stays within **~22 m of
  staging** so a parked creeper on a mid-leg chord is not a 100 m gold
  pole. Each station carries a **puddled-iron cabin** (~12 × 8 × 10 m) and
  **counterweight** (~8.4 × 5.8 × 7.2 m) at the mast-top, offset outward
  so they occupy pixels at the 452–520 m hold. Masts, cabins, and counters
  are **dark iron plant** (no gold emissive). **Jibs stay gold** so the boom
  still reads against sky. Uniform gold mast+cabin+counter is a streetlamp
  at the hold. A 5.4 × 3.6 × 4.8 m house is
  ~11 px at BUILD and reads as a lamppost. A 2.6 m / 2.15 m radius with
  a boom to the chord spans the Champ as a gold light-bar — cabins are not
  that. Never fake climb by scaling Y. Crews climb onto a deck that already exists.
  **Rivet crews stand on that already-seated working floor** beside the bay
  being hoisted — never at 15% of destination height on the Champ grass.
  Worker linen is still cloth with **instance tunic colours** and **no cream
  emissive wash**. A 0.42 `#ffd090` emissive turns every figure into a white
  meeple at the hold, so riveters cannot read against iron. Riveter tunics
  stay `#e07028`. **After t > 0.36**, each Seine pylon carries the same
  **seven mixed jobs** as **2–4-man stations** at distinct girder segments
  with working gaps — never one evenly-spaced rank. A **P1 pair-of-pairs**
  starts after t > 0.40 so the join capture is not a 14-figure skyline
  muster. Opening still keeps three north-gang figures per Seine pylon.
  Tunics **dim with dusk** (same sky clock as the Paris fill). Never a
  chorus ring.
- `seated` is identical to the authored final transform forever.

Piers seat before that leg's first lattice bay. Arch segments cannot hoist
until both adjacent legs have seated the storey that carries the springing.
First-platform girders cannot start until all four legs have seated their last
lower-storey bay. Shaft bays cannot start until the last mid-leg storey is
seated. **Second-platform girders cannot start until that same last mid-leg
storey is seated, and they must themselves be seated before t = 0.58** so
the BUILD capture shows the needle rising from a visible P2 ring, not from
empty air. **Mid-leg storeys begin immediately after the last lower bay
(~0.12) with span ~0.15** so the A is up to P2 by t = 0.32. Origin 0.20
left the upper join as a 9% dark tick. The P1 deck ring still waits until
t > 0.32 (a P1 square lid is retired). **P2 girders wait until t > 0.32**
as well so they do not lid the top of that A. **Far-pylon mid-leg (ne/nw)
waits until after the join capture** so the nested second A cannot form;
Seine pylons (se/sw) still reach P2 by t = 0.32. Shaft origin stays **~0.48** (not pulled
forward with mid) so BUILD still shows a climbing needle, not a finished
campanile. A solid P2 floor plate is not used. The **t = 0.58 capture
already has the iron needle rising** — a P2-complete truncated A with no
shaft reads as a brown stick. Lantern bays
cannot start until the shaft has reached the third platform, and they
**must themselves be seated before t = 0.78** so the dusk Beacon beat
shows the campanile, not a chopped shaft. A 0.9 lantern origin leaves
t = 0.78 bare.

No part first appears at its destination. Phase boundaries share endpoints.
Active hoist/haul concurrency stays within `EIFFEL_MAX_ACTIVE` (96) so
mid-leg and Sauvestre arches can run together during the join hold. Dust
exists only at wagon contact and seating.

## Experience and art direction

Subject: 1887–1889 ironworkers raising four lattice pylons that become one
tower over the Champ de Mars. Audience: a viewer who should understand that
the monument is **riveted iron lace**, not a solid obelisk that grows.

Visual tokens:

| Role | Color | Use |
|---|---|---|
| Puddled iron | `#8a6a4e` | chords, diagonals, shaft |
| Darker iron | `#5c4330` | rivet plates, arches |
| Masonry pier | `#9a8a78` | four feet |
| Champ grass | `#6a7d4a` | parade ground |
| Seine | `#5a7a8c` | north water, shared Giza recipe |
| Paris roof | `#8a4a38` | Haussmann zinc/tile |
| Paris sky | `#6a92b8` | temperate blue zenith |

The sky is a subject. Eiffel owns a typed Paris Champ-de-Mars sky: a cooler
northern temperate blue than Giza or Sydney, a soft urban horizon, thin
stratiform cloud, and a **night reveal** (catalog `endsAtNight`). Dawn haze is
river mist, not desert dust. The dome reaches temperate blue by **~5°
elevation** (`skyT` hi ≈ 0.085) so opening pylons sit in sky, not a **10°
apricot slab** (`skyT` hi 0.18). Night is electric beacons on iron, not a postcard
of modern LED sparkle mapped onto the whole shaft.

Avoid a generic “brown stick on a green plane.” Ground identity comes from the
Champ de Mars, the Seine to the north, the 1878 Palais du Trocadéro across the
water, the École Militaire to the south, plane trees, Haussmann blocks, and
the eastern iron yard. Monument identity comes from **four leaning lattice
legs that meet**, the first-platform belt, and the needle shaft.

Signature shot: mid-BUILD, the camera looks from the Seine while a creeper
crane seats a lower-leg chord on the north-east pylon; the other three legs
are already a readable incomplete lace. The reveal is the complete tower
against a still-blue dusk that goes to night with lantern light.

Desktop composition:

```text
Paris sky / Trocadéro across the Seine
     iron yard → wagon → creeper crane on NE leg
foreground grass     FOUR LATTICE PYLONS      École Militaire south
```

Portrait composition:

```text
weather sky + low sun
NE pylon + crane
Champ working floor
Seine / grass foreground
```

Camera opens from the **north** (Seine / Trocadéro bank) so water and the four
feet read first; École Militaire stays southern backdrop. Opening azimuth is
due north (`-π/2`) so the 1878 Palais towers flank the Champ instead of
clipping off-axis. Once lower pylons fill their authored AABB they are
~3° wide; from exact due north the far pair sits **inside** the near
pair's angular span and the opening reads as two legs. Opening stays
**on-axis due north**. The join also stays on-axis. A ~7° eastward turn
by the join nests N–S. A **22° three-quarter join paired with skipping
east-facing leg braces** separates the feet in azimuth but reads as a
**girder heap** (open pylons, lost Palais postcard) and is retired. The
north-east arc begins **after** the first-platform join. Azimuth interpolates
**linearly** from the first frame — never a frozen intro hold, never
easeInOutQuad on azimuth. Opening stays inside a 0.03 cosine cap. A slow
north-to-north-east arc (~50–80°) with later ease on radius/pitch. Opening
and night are
Giza-like panoramas (about 520–590 m desktop). **BUILD dollies in to
~450 m at the join** so **four feet** read through the north portal. The
join look height stays **~40 m** and join pitch stays **~6.5°**. Raising
look to 50 m or 72 m, or flattening pitch to 5.6°, looks through the open
portal at south-Champ cream (same family as z ≈ 78). A 54 m look on a
P1-only silhouette was a deck look and stays retired. 8.4° join pitch was
a roof-plan. The
join look goes **through the portal to the far pair (z ≈ 29 m)** — z ≈ 18 m
stopped on the near lintel and hid the far feet once near iron filled its
AABB. A **z ≈ 78 m** look (far-pair plane) overshoots: the portal fills
with south-Champ cream/sky and join-gap brown drops. Do not restore z ≈ 78.
A 438 m hold can still fill the frame with the two near pylons;
a 398 m hold hides the far pair behind the arch; a 520 m hold at t = 0.32
leaves a park trellis.
Portrait uses **~56° vertical FOV** so a 390×844 frame still has
**~27° of horizontal coverage** for four feet. Three.js fov is vertical:
38–42° on that aspect is only ~18–20° wide, so the 16° pylon square
fills the phone and nests as two legs; 50° is ~24° wide and still crops
the far pair. **62° vFOV shrinks the feet into a courtyard plan** — extra
vertical coverage is Palais roofs and Champ grass, not four-leg width.
**Opening and join do not widen radius on portrait** — a 4–8% pull-back
shrinks parallax and nests the far feet. Radius widens ~6% only after the
join so the rising shaft still fits. Opening and join sit **on-axis due
north** (shared desktop/portrait). A **28 m east look offset** at the join
slid the tower into two off-center arches (one pair punched, one
compressed) and is retired — it is not a substitute for the burned 7° yaw.
A **22° 3/4 plus skipped east-face braces** made a girder heap, not four
lattice feet, and is retired. At 452 m a 16.8 m pylon is ~2.7° half-wide
and needs **> 61 m of lateral separation** to un-nest; the 155 m square only
gave ~56 m on-axis, so the far pair sat inside the near silhouette (two
arches). A **~197 m diorama square** (ground offset 90 m) clears that
threshold on-axis. A **ground trapezoid** (near ~76 m / far ~128 m) cannot
un-nest the join because P1 is still a square — the join silhouette is the
meeting, not the Champ footprint — and it punched BUILD lace with Champ
cream. Do not restore it. The 0.04–0.08 cosine cap that forced ~3° east was for
the old 125 m square and now parks the camera toward the east row. A 9–16°
portrait east bias on a wide square stacks each north–south pair. Do not
restore a 125 m or 155 m pier square that nested at the join, that cosine
cap, or a portrait-only east bias.
On portrait the opening pitch is **~4.5°** and the look sits a few metres
higher so four feet read as columns against sky. Do not restore a
portrait Z look-push into the courtyard.
**Opening pitch is ~5.4°** so the 520 m hold is a postcard: Palais facades
in the foreground, four lattice feet rising behind them into the sky. An
8.2° opening looks down onto Palais roofs and shrinks each 12 m pylon to
a 1.5° needle. **Join pitch is ~6.5°** so the look ray threads **under the arch crown**
through the north portal. Join `target.z` stays **≈ 29 m**. A **z ≈ 78 m**
far-plane aim overshoots into the south Champ (portal cream up, gap brown
down) and is retired. A **z ≈ 50 m** mid-courtyard aim is the same defect
class, milder (gap cream up, gap brown flat-to-down). Do not restore
`z ≈ 18` (too north), `z ≈ 50`, or `z ≈ 78`, or a portrait-only Z look-push.
An 8.4° join aims at the crown
and hides the far feet behind the Sauvestre ribbon. **BUILD pitch is
8–10°** once the shaft is up so the Seine hold reads the north-face X-bays
in elevation. An 11°+ mid-BUILD look reads the needle as a roof-plan stick.
**BUILD holds ~318–408 m** after the join so north-face X occupies the Seine
postcard; a 380–460 m mid-BUILD hold still leaves the A a mid-size lace
against sky. A 468–528 m hold is smaller still.
Pitch eases toward ~13° only as the lanterned reveal pulls out. **Dusk
looks at ~150 m** so the 312 m campanile stays in the 35° frustum; a 124 m
dusk look clips the lantern. Radius eases back toward ~548–572 m; a 700 m+
pull-out
turns the finished tower into a wire needle. The join look aims at the
**arch belly (~40 m) and through the portal to the far pair (z ≈ 29 m)** so the
Sauvestre curve stays face-on while four feet read. A look that stops at
z ≈ 18 m hides the far pair once near iron is opaque. **z ≈ 50 m** and
**z ≈ 78 m** look past the far pair into south-Champ cream. A 24–32 m courtyard look flattens
the curve into two unconnected legs; a 54 m deck look foreshortens the
arches into beams on the grass. A **50 m** or **72 m** look on the
P2-height A looks through the open portal at south-Champ cream — same
family as z ≈ 78. Flattening join pitch to **5.6°** does the same. Palais stays under the look ray. The
**opening look aims at the lower pylon (~38 m)** so four lattice feet rise
into the dawn sky above the Palais crescent. A **46 m** look parked the
crowns on the peach horizon; a 52 m look is worse. A 26 m look puts Palais
in the middle of the 520 m hold and loses the pylons as specks. The night hold is the first
time the 312 m silhouette fills the frame.

## Typed construction inventory

- Height 312 m; pier square is a **diorama ~197 m** so four feet un-nest
  on-axis at the 452 m join (16.8 m pylons need > 61 m of lateral
  separation). Historical 125 m is 13.7° and nests on the phone; 155 m still
  nests the far pair at the join. A ground trapezoid that still meets a
  square P1 cannot un-nest that join. Platforms 57 / 115 / 276 m.
- Four masonry piers as **coursed battered plinths** (three solids each:
  plinth, course, cap). The **plan matches the ~17 m lower pylon** so each
  foot holds ~3° at 520 m; a 12 m pylon is a 1.5° needle behind Palais.
  Course **height stays ~3 m**. An 18 m-*tall* warehouse cube swallows the
  lattice at the opening — that height is not used.
- Lower legs: **five** lattice storeys per pylon (~9.4 m), **~16.8 m
  wide at the pier** tapering toward P1. **All five
  storeys are seated by Spec 04's t = 0.12 capture** so the pylons reach
  nearly to the first-platform line as leaning lattice, not a handful of
  sticks. At the ~450 m
  join (~5.1 px/m) each square X holds ~48 px — three 15.7 m bays still
  silhouette as a pavilion. Each **outward
  wall** is a grid of roughly square open X-bays (**two columns**).
  **Seine-side pylons only** densify their north wall as **one large
  square X-bay on even lower storeys** (two diagonals plus a storey-top
  belt). Odd lower storeys keep **posts and the storey belt only** so the
  camera face punches storey-sized holes at 520 m — 0.6 px stroke thins
  do not. A
  **mid-bay horizontal is not used** on that camera face — a 1.26 m rail
  through the diamond fills it at 520 m the same way knees did. Mid-leg
  Seine horizontals at the ~318 m BUILD hold were also silhouette noise
  (north-X dark 0.505 → 0.506). Do not restore either. The
  camera-facing stroke is **~1.26 m dark iron**. 0.5 m
  bars read as hairline wire; **~1.05 m still reads as twigs at the 520 m
  opening (~4.4 px/m, ~4.6 px per bar)**. A 1.38 m Seine stroke plus 1.72 m
  posts filled the camera face to ~64% dark at 520 m. Two columns on that camera face
  shrink each bay below a readable X. **The inner south wall of those same
  pylons has no face X** — a second X 12 m behind the camera face stacks
  into a dark trellis. **Far-pylon north walls have no face X either** —
  from due north that second trellis sits inside the near portal and the
  opening reads as two arches. Far feet punch as **~1.58 m corner posts**
  through the open near diamonds. **Seine-side pylons omit east–west inner
  face X** (`face.sx === -pylon.sx`) so the portal’s inner edge is corner
  posts, not a second trellis that fattens each near foot into the gap.
  Far-pylon east–west inner walls stay one column. Three columns shrink each bay below readable
  X size and collapse to a coarse truss. Two stacked X-bays on
  a short storey are squat (~14°) and read as stacked beams. At the **520 m
  opening (~4.4 px/m)** every lower-leg brace is **dark iron**; bars that
  are not Seine-facing are **~1.18 m** (0.6 m light iron and 0.88 m dark
  both wash to wire against Champ grass). Seine-facing stays **~1.26 m**.
  Lower-leg **corner posts are ~1.58 m** so the four feet hold ~7 px at
  opening — 1.16 m posts were 5 px twigs; 1.72 m posts plus 1.38 m diagonals
  silhouetted as a mass. Still an open diamond — never a
  lace panel and never a 3-col truss. **Seine-facing mid-leg braces are
  ~1.18 m**; other mid-leg and lower-shaft braces stay **~0.94 m dark iron**
  so they hold pixels at the ~450 m mid-BUILD hold; 0.6 m light iron washes
  to a brown stick against sky. **Upper-shaft braces are the same ~0.94 m
  dark iron** so the needle is a stack of X-bays against Paris blue, not a
  0.6 m wire. Lantern stays ~0.6 m light iron. **Mid-leg storeys are one open X-bay** — two stacked mid bays squat
  into a tapering blob. Shaft storeys that are tall enough may still hold
  **two stacked open X-bays** separated by a heavier storey belt. Dense two-column
  faces include a **mid-face mullion** (a full-storey chord inset from the
  wall) so the pair of X-bays reads as a grid, not two floating trusses. A column-width X
  stays a diamond. Corner chords on mid-leg are heavier posts (~1.40 m);
  shaft stays ~1.16 m; lower-leg posts are the heavier ~1.58 m. **Mid-leg
  face diagonals are ~1.18 m on every authored face**, not only the Seine
  wall — 0.94 m east/west X at the 3/4 BUILD hold reads as twigs between
  the 1.40 m posts. Shaft diagonals stay ~0.94 m dark iron. Lower-leg
  diagonals follow the ~1.18 m / ~1.26 m strokes above. Corner chords are **lattice
  box-columns** (authored envelope): four **~0.22** angle-irons inset
  **~0.38** with belts inside the authored AABB so the core punches. A face X inside the chord envelope is **not** used — it
  stacks with the wall braces and fills the post. That adapter is not a
  second nested tower and not a face-local lace panel. Inset
  inner-chord squares are **not** used: at 520–780 m they read as a
  second frame inside the first. Face-local lace panels (a second mesh on
  each outward wall) are **not** used: two such faces stack in depth at
  520–780 m and fill into a dark mesh. Density stays in the chord adapters
  and X-braces; the living-site budget goes to Champ trees and **courtyard
  Haussmann îlots behind the allées** (|x| ≳ 190, first street wall
  **south of the Seine approach** so the north Champ stays a lawn to the
  Palais). A pack at |x| ≈ 150 / z ≈ -40 walls the parade ground into a
  U-courtyard of cream boxes.   East inner columns **clear the Levallois yard**
  (128–198). Rows keep **boulevard rues** between them and leave lawn to
  the École; this is not a skip-every-third toy park and not a 12 m housing
  grid. Îlots **align to the Champ axis** (yaw near 0); random ±0.22 rad
  rotation reads as a housing estate. **Zinc mansards are a third of the street wall** so roofs
  read as Paris, not a 1 m lid on a cream box. Zinc and tile are **dark**
  (not mid-grey or pale cream) so the roofscape silhouettes against the
  façade at 520 m. Street-facing **dormer punches** sit in the mansard so it
  is a Paris roof, not a second cream storey.   Haussmann windows are
  **punched bays** on the park-facing and camera-facing walls, not
  full-width zebra stripes that read as CAD slabs. Each street wall has a
  **rusticated ground plinth** and a **stone eave cornice** (not a wrapping
  glass stripe). Lower-leg Seine-facing X-bays are **one open diamond per
  storey** — **knee braces are not used**. At 520 m a 6 m knee pair fills
  the hole into a trellis the same way extra ladder rails did. Extra ladder
  rails through that diamond are **not** used. Each lower-leg
  storey is capped by a **storey-top belt**
  (a heavier rail on each working face at the storey join) so five storeys
  read as a stack of bays, not one coarse pylon. **Mid-leg storeys get the
  same belt** so P1–P2 is a stack of bays, not one tapering blob. **Shaft
  storeys get the same belt** so the rising needle is a stack of X-bays, not
  a brown stick. Lantern storeys stay unbelted. The 1878 Palais terrace
  carries a **row of stone figures**. Haussmann street walls have
  **balcony slabs** on the camera-facing facade.
- Renderer adapters: arch segments are a **lattice girder** (four
  angle-irons, belts, and an open X inside the authored envelope) aligned
  **Y to the chord tangent**. A solid cylinder reads as a cartoon tube at
  the ~450 m join. Braces are a **single flanged rectangular bar** (not
  paired tubes that fill the X-hole) whose unit mesh is an **I-section**:
  flanges fill the authored AABB, the web is **~0.40 in the wall-plane and
  ~0.28 in depth** on **lower-leg** braces so the X-diamond punches at
  520 m. **Mid-leg and shaft braces use a ~0.62 wall-plane web** so BUILD
  X occupies at ~318 m without putting 0.55 on the opening feet. A 0.55-wide
  web **on lower-leg braces** still strokes the hole shut at 520 m; a
  0.9-square bar fills the hole into a truss. A
  0.9-wide I-web is still a fat stroke at 520 m. A 0.38-unit bar scaled by
  1.38 m rendered as a 0.5 m hairline at 520 m. Chords are lattice
  box-columns whose **angle-irons are ~0.22 of the envelope** on
  **lower-leg** posts, **inset ~0.38**, with **five thin lace belts**
  (~0.04 of the length) so a 1.58 m post reads as a laced column with sky
  through the core, not a solid pier and not four 0.12-unit wires. **Mid-leg
  and shaft chords use ~0.29 angle-irons** so BUILD posts occupy at ~318 m
  without putting 0.34 on the opening feet. A 0.34 post almost fills the envelope and
  the camera-facing feet silhouette as masonry. Piers and girders stay boxes.
  Instance scale remains `[1,1,1]`; the adapter is not a growing solid.
  Puddled-iron is a **metal** (metalness ~0.7, roughness ~0.26) so sun-facing
  flanges glint against sky in the X-holes. Dark-iron **posts and girders**
  stay a **dark rust** (`#5a3824`), not wash `#6a4a32` and not ink `#5c4330`.
  Face **braces** are a **lighter rust** (`#8a5a36`) so X-bays read against
  the box-columns at 520 m. **Far-pylon iron** (ne/nw, south of the portal)
  is a **still lighter rust** (`#b88858`) so the second pair reads through
  the near X as a separate plane. Uniform dark-iron on posts and braces silhouettes
  as one mass even when the I-web is already ~0.40. A 0.48-rough
  dielectric brown plus a 0.98 ambient wash turns the lattice into a mass.
  Paris hemisphere fill stays **under ~0.56 by day** and **under ~0.72 at
  dusk**; dawn fill must not kill the key.
- Four great arches as **paired lattice chords** (outer + inner, not a
  torus and not a single bar buried inside the pylon). They **spring from
  just above the masonry piers (~14 m) and crown under the first platform**,
  sitting on the **outward face** (outer radial **~12 m**, inner **~8 m** —
  beyond the pylon half-width) so the north arch punches in the Seine
  hold. A 5.6 m radial sits **inside** the north face and the join reads as
  two pylons with no Sauvestre curve. The join capture seats the **north-arch springing (the outer thirds)
  plus the east and west ribs** so four feet read through an open portal.
  The **north crown waits until after t = 0.32** — a complete north rainbow
  at the join silhouettes as one gateway and hides the far pair. The
  **south arch waits until after t = 0.32** — on a due-north hold it stacks
  into the north portal the same way a back-wall X fills a trellis. East/west
  sit on the outer flanks, not in the Seine hole. The curve is a **circular arc**, not a half-sine
  (a sine in a tapering span silhouettes as a triangle). Bars ~1.4–1.8 m
  so the lower-leg ~1.58 m posts still read as legs. Twelve segments per chord;
  radial webs between the pair. Arch segment adapters align **Y to the
  chord tangent**. Timber falsework under the arches follows the same
  circular spring so cribs do not float off the iron.
- First-platform **slim deck ring** (~3 m deep, ~2 m tall) plus an **outer
  girder belt** seat **after the join capture (t > 0.32)**. If they land at
  t = 0.32 they silhouette as a square lid and hide the Sauvestre curve. An
  inner 52 m **deck plate is not used**. Second-platform girder belt only —
  no solid plate. Platform girders are **dark iron**.
- Mid legs: **ten** storeys per pylon between platforms, each a **single
  open X-bay**, **origin immediately after the last lower bay (~0.12),
  span ~0.15** so they fill the join hold up to P2. Origin 0.20 left the
  upper join at 9% dark. A 0.28 span left it as sky. Nine 2-stack
  squat mid storeys filled into a tapering blob. **Far-pylon (ne/nw) mid
  waits until after t = 0.32** so the join postcard is two tall Seine legs
  plus two shorter far feet through the portal, not a nested second A.
  Far mid uses a shorter span so it still finishes before the shaft at
  ~0.48.
- Shaft: **one on-axis needle**, **eighteen** storeys (not four overlapping
  pylons), **origin ~0.48 after the last mid-leg** and **span
  ~0.16** so the needle is a readable X-stack by t = 0.58, not a stub on
  the A. Do not pull the shaft forward when mid starts earlier — that
  finishes the campanile at BUILD. A 0.51 / 0.24 schedule only seats ~five storeys at the BUILD hold.
  Wide shaft faces keep two columns. **Lantern/campanile: four storeys on
  the same axis, origin immediately after shaft end, span ~0.08** so dusk
  t = 0.78 already has the campanile. A 0.9 / 0.06 lantern origin leaves
  The Beacon caption over a chopped shaft.
- One eastern delivery route; four creeper-crane stations on the pylons
  through t = 0.32 (parked at the highest seated chord when that leg has
  no active hoist). A fifth shaft climber may join after mid-legs.

## World layers

1. Playback-driven Paris sky; dawn to night. Dawn azimuth is **~-30°** so
   the key rakes across Seine-facing X-bays from the east. A -58° dawn sits
   north of the camera and front-fills the lattice into a mass. The azimuth
   **holds east-dominant through BUILD (t ≤ 0.62)** so north-face X still
   models at the A-plus-needle hold. Opening (t ≤ 0.18) keeps the linear
   dawn rake (~-8° at t = 0.12); slowing the whole morning pulled dawn
   back toward north and front-filled the feet. A linear `sweep * t` puts
   t = 0.58 at ~77° and backlights the Seine lace into a mass. Afternoon
   then rushes south-to-west for the lantern/night reveal. Elevation still
   peaks near mid-movie; the hold is cinematic, not a reconstruction of
   solar noon.
2. Seine (shared Giza water recipe; `WorldScene` feeds `updateWaterSky` from
   the Paris sky). The 1878 Palais du Trocadéro sits on the **north bank in
   the opening shot**, immediately across the water: a **wide low crescent
   inside the 35° hold FOV** (wings near |x| ≈ 74–78 m, **~20 m tall** so
   they do not out-mass the 17 m iron feet). Corner towers sit
   at **|x| ≈ 64–68 m** and wing height (~18 m), not as eighty-metre pillars
   the 13° hold looks over. Wings at |x| ≈ 54 m stacked on the near pylons;
   towers at |x| ≈ 38 m stacked on the far pylons — both mask the four feet
   as cream. Wings parked at |x| > 100 m clip off-frame. **Camera-facing window
   bands** (dark glass on the north facades of wings, hall, and towers)
   plus a darker arcade colonnade with **round-headed stone arches that
   span the bay** (half-cylinders springing from the posts, lintel *above*
   the crown, dark glass in the opening — not a slab covering the arches)
  keep the crescent from reading as a CAD slab. The 1878 Palais is a
  **Blender-authored GLB** (`public/models/eiffel/palais-trocadero.glb`) so
  the opening bank is a crescent with punched round bays, not stacked
  warehouse boxes. The colonnade sits on the
  **camera-facing north plane** (z ≲ −270), in front of the receded hall, so
  the opening looks *through* round arches to the Champ and four feet. An
  arcade parked on the south (Champ) face of the wings stays hidden behind
  the hall. **Wings yaw ~16°** so the outer pavilions step toward the
  camera and the arcade sits in a hollow —   parallel axis-aligned boxes
  read as warehouses. **Wings, towers, hall, and terrace are ochre stone**
  (`#a89070`), not the Haussmann cream `#e8ddd0` — cream Palais masses read
  as warehouse boxes even when yawed. Arcade posts stay darker (`#7a6a58`).
  Wing roofs are **four-sided pavilion pyramids**, not
  flat zinc lids. Each outer corner carries a **round turret with a cone cap**.
  Camera-facing wing bays are **round-headed arches**, not rectangular
  zebra stripes. Wings and towers sit on a
  **rusticated ground course**. Corner towers are **round drums** (~14 m
  diameter) with **hemispherical cupolas**, not square boxes with pavilion
  cones — square ochre towers still read as warehouses. The
  **esplanade is a slim plaza** (~12 m deep) so it does not fill
  the 35° hold as a warehouse roof. The **central hall is receded north of
  the wings, narrow (~16 m), and low (~8 m)** so it sits *behind* that
  colonnade as a pavilion, not a 28×16 m warehouse lid on the camera side
  of the gap. Wings and towers are the crescent silhouette.
   3. Champ de Mars grass, plane-tree **allées** (umbrella canopies on the
   flanks, no random city fill, **no hedge across the Seine hold**). Trees
   on the north bank stay off the camera axis (`|x| ≳ 90 m`) so the four
   feet and their X-bays read against Champ grass, not against a canopy
   wall. The Champ is a **parade ground**, not a U-courtyard: Haussmann
   îlots sit **behind the allées** and **south of the Seine approach**.
   École Militaire, **courtyard Haussmann îlots** (street
   walls around an open court, not a 12 m housing grid), punched window
   bays, rusticated plinths, stone eave cornices, **shopfront punches on
   the ground floor**, chimneys, steep zinc mansards, and a **parish chapel with a zinc
   cone spire on the east Champ flank (~120 m)** so it sits inside the
   cinematic hold — a chapel at ~180 m clips off a 390×844 frame. Seine barges on the north water.
4. Iron yard on the east Champ, **north-allée timber beds** on the flanks
   of the Seine approach (center grass stays open so four feet read), wagons,
   falsework under the north arch (slender timber cribs, not solid 3 m boxes
   that fill the lace). Hidden at t = 0.12; up while that arch hoists;
   struck as the first-platform girders seat, around t = 0.30, so the join
   shot is open iron.
5. Piers, lattice, platforms, shaft.
6. Creeper cranes, cables, rivet crews, dust.
7. Foreground yard beds and rivet forges — including the north-allée apron
   the Seine hold actually sees.

## Soundtrack and captions

Soundtrack selection is `(eiffel-tower, role) -> reviewed local cue | silence`.
Never fall back to Giza, Colosseum, or Sydney. The reviewed Lyria 3 cue is
1889 Paris exposition — salon strings and restrained brass, never accordion
pastiche, never a generic construction-site pulse. Files:
`/audio/eiffel-tower-cinematic.mp3` (60 s) and
`/audio/eiffel-tower-ambient-loop.mp3` (27 s loop). Brief, raw takes, and
Lyria captions: `artifacts/soundtrack/eiffel-tower/`. Generate with
`scripts/generate-soundtrack.py --wonder eiffel-tower`. Lyria has no seed;
`--assemble` re-encodes cached takes. Home-hero ambient remains Giza.

Caption beats are five authored lines (The Champ, The Iron, The Legs, The
Join, The Beacon). Caption voice is ElevenLabs only: Adam
(`pNInz6obpgDQGcFmaJgB`, `eleven_multilingual_v2`), distinct from George,
Daniel, Bill, and Alice. Clips live under `/audio/narration/eiffel-adam-*.mp3`.
Generate with `python3 scripts/generate-narration.py eiffel` and pin
durations in `src/data/narration.ts`. Missing clips are silence. Never use
browser `speechSynthesis`, Vertex Gemini TTS, or a runtime ElevenLabs request.


## Acceptance

### Face-joint correction gate (2026-09-07)

The source `lower-ne-02/member-015` currently cuts through a crossing beam.
Its replacement must be authored in Blender as a thin face plate and fitted
solid pads, with the actual convex pieces exported for collision checking.
A bounding box enclosing the gaps is not occupied material. Preserve its
source identity and the other members' identities in both construction and
seated exports when promoting it.

The candidate may have a separate local review, but must not replace the live
joint solely because its final pose is clear. Verify the incoming beam with
the plate installed, and the plate's insertion after the beam is seated.
Ground transport, support while positioning, fastening and the resulting
schedule/cache must pass before production promotion. Candidate Blender files,
GLB and measured insertion evidence are saved separately from admitted assets.
Geometric contact is not a claim of structural capacity or a historically
documented joint design.

The transport study must include an actual carrier with positive contact to
the delivered iron and to the plate. Test its complete carried volume through
the ground-hoist route; final clearance alone is insufficient. Carrier clamps
that project below the iron require actual slots in the cart bed. Changes to
payload mass or transverse centre of gravity require a revised lifting bridle,
not merely an offset hook. Keep this study separate until those gates pass.

The rejected co-carried frame is superseded by an independent compact load
study. A real tray must support each loose plate/pad from below; shaped packing
cleats must leave the actual occupied iron clear. Lifting eyes must connect to
the tray through bearing straps, and a four-leg bridle must place the master
hook above the measured payload centre of gravity with positive leg tensions.
The ground cart, packed load and full hoist rope require separate clearance
checks. A clear payload column does not authorize a previously unchecked crane
yaw. Keep installation and the production kit replacement unadmitted until
supported placement, fastening and both LOD exports are coherent.

The independent package review shall play a 46 s isolated vertical lift:
0–2 s parked and already rigged, 2–42 s hoisting at fixed orientation, then
held for transfer. The same actual Blender payload and bridle persist from
cart contact to the upper hold, with no structural scaling or visibility swap.
The rope unwinds from the actual articulated crane tip. Seeking and reverse
seeking must reproduce the same pose. This is a partial delivery study, not a
claim of stock loading, rigging, onward transfer or completed installation.
Desktop/mobile QA must exercise playback, seeking and real pointer orbit.

The next receiver study extends that continuous load into a high-level transfer
and descent onto a visible timber receiving deck. Its knees and bearing posts
must connect to existing supported frame members; validate added supports
against tower occupancy and the moving crane/load. A seated package remains
the same packed load, not an installed joint. Stock extraction, worker access,
fastening and production admission remain separate unfinished work.

A prepositioned receiving worker may guide the tray only when its actual rail
is within arm reach. Soles must meet a separate supported standing platform;
arms use fixed human limb lengths and hands meet the rail's exterior face.
Do not animate the 38 kg plate as a one-person lift, or extract fitted pads
through the still-packed plate. Keep those installation steps unfinished until
a workable handling order is authored.

At desktop 1440×900 and mobile 390×844, capture
`t = 0.12, 0.32, 0.58, 0.78, 0.92, 1.0` on
`#/debug/wonder/eiffel-tower/<t>`.

Each sweep must show the Champ de Mars, Seine glitter to the north, four
lattice legs (not solid tapers), creeper-crane labour during BUILD, and a
night lantern at t = 1. Browser diagnostics must name `eiffel-tower-reference`.
Parts keep `[1,1,1]` scale; none first appear at the seat. Haul contact
within 3 cm of the shared sampler plus wagon bed.


### First-floor cart fastening study — 2026-09-08

Create an isolated Blender assembly of the existing upright carrier seated on
the existing cart. Four 18 mm shafts at local X/Z (±.16,0),(0,±.16) pass through
real 20 mm bores in the 80 mm shoe, 100 mm timber bed and a 20 mm underside
spreader plate. The plate is .60 m square; it bears against the bed underside
and clears the wheel bearings and axles. Washers bear against the shoe top and
spreader underside. Keep payload dimensions and all bearing heights unchanged.
This is a preassembled, stationary connection study: smooth shafts and bored
nuts represent the fastener envelope, not resolved thread/preload or capacity.
Do not show bolts appearing in the hoist timeline or release the attached load.
Transport admission still requires cart stability, restraint strength, manual
fastening/access, release hardware and a supported onward route. Export and
save new files, preserve the prior assets, verify actual bore/contact geometry
and provide desktop/mobile orbit views of the top and underside connection.


The cart/carrier review shall replace the two pinched collars with .40 m square
plates at the same height and thickness, keeping the actual payload opening and
four rod bores unchanged. The old .185 m outer half-width equals the .17 m rod
center plus .015 m bore radius and leaves zero-thickness tangent contacts.
Require a continuous outer ligament and a watertight actual exported triangle
mesh. The updated collars remain within the existing .44 m carrier envelope;
do not infer strength or transport admission from this topology correction.

The same corrected carrier shall also be exported separately at bottom-origin
zero and used by the existing closed-sling ground-to-first-floor hoist review.
Keep its actual payload, eyes, hook height and trajectory unchanged; retain the
combined seated cart asset separately. No cart fasteners may travel with the
carrier in this hoist export. Recheck desktop/mobile seeks and sling alignment.

### Eiffel terrain sampling stability — 2026-09-08

The rebuilt Eiffel terrain's compacted-earth grain and mottle must retire
unresolved procedural noise octaves using their screen-space footprint. Keep
resolved near detail, the authored mean color, and the existing bump fade;
filtering must add no animated noise, geometry, or render pass. Scope is the
rebuilt Eiffel terrain material only. Other wonders and imported Paris facade
materials retain their existing recipes.

Use the largest singular value of the noise-coordinate screen Jacobian so
camera roll or the orientation of a stretched pixel footprint does not change
the filtering decision. Fade each octave smoothly between 0.15 and 0.5 noise
cells per pixel toward its expected mean of 0.5. Retain a material-local uniform
for matched frozen-time before/after captures. Focused shader composition tests
are a contract gate; desktop/mobile orbit A/B is required before claiming a
visible flicker improvement. Existing water/glass fixes remain independent.

The bump-height derivative must use the original unfiltered recipe height,
with its existing distance fade. The color/roughness height may use footprint
weights, but must never feed a subsequent dFdx/dFdy: that would imply undefined
higher-order GLSL derivatives. Derive the bump-only expression from the actual
injected recipe so grain/mottle constants cannot drift between paths.

### North-bank urban fabric reconstruction (2026-09-08)

Replace detached, repeated rectangular reservations on the far north bank with
continuous street-facing perimeter buildings around varied courts. Historical
1889 photograph references guide density, connected roof bands and street/court
rhythm; authored compressed coordinates and hidden elevations are explicitly
interpretation. Use unequal block widths and street alignments plus a diagonal
boulevard to create actual trapezoidal and triangular parcels. Do not fake
variation by rotating identical freestanding buildings over unchanged roads.

Blender authors/export the polygon footprints, split frontages, masonry plinths,
hipped/mansard roofs, paved sidewalks and connected carriageways. Every building
has ground support and is outside the Palais grounds, river and street surfaces.
Existing near-site construction and north-bank pedestrian sidewalks remain
accessible. Polygon intersections, rather than AABB overlap alone, verify angled
parcels and roads; tests inspect exported wall/roof geometry and existing walker
foot contact. Save a new editable .blend and candidate exports before promotion;
retain the previous assets. Verify desktop/mobile actual main film and rendering
budgets. The richer layout alone does not complete construction or photographic
fidelity requirements.

Street junctions must emit the union of each material's planar footprint, not
overlaid strips with competing tessellations. North-bank ground is tessellated
to24m maximum edges, sampled from the shared terrain; existing walking contact
checks still apply. Sparse city culling cells may merge only within the same
104m parent and within40m horizontal union radius. Preserve every triangle,
normal, color, material-role value and UV; keep existing mobile budgets and
actual exported geometry checks.

### Actual long-load main-film insertion (2026-09-08)

Insert the reviewed 128-second ground-to-first-floor lift of
`summit-access-stair-m000-c000` at that member's actual production-operation
start. The same actual 5.992500305 m member, corrected upright carrier, closed
lower rope eyes, master link and hoist rope persist continuously from the
ground through bearing on the first-floor cart. The chapter renderer owns the
sole visible payload copy; withhold that identity from the tower kit throughout
the preparation card, visible lift and exit card. Cart landing is a transported
state, not final tower seating.

The exit remains an opaque `Later work` omission. It must state that sling
release, supported cart relays and final installation are not shown. Only after
that opaque interval may the identity leave transported state and appear in its
final seated pose. No visible teleport, duplicate legacy pickup or simultaneous
production crane is permitted. Reverse seeking derives all ownership from the
absolute film clock.

The chapter camera follows the current carrier rather than fitting the full
60 m route history. Show a useful lower portion of the working hoist line during
ascent and include the complete raised receiver as the load arrives. Preserve
the continuous positive 125 degree global orbit across the longer film, with no
overshoot or reversal. Desktop and portrait framing must contain the actual
carrier, closed sling, visible rope segment and late receiver, while the 5 m
near frustum remains outside final tower solids. This insertion does not claim
releasable lower eyes, onward physical transport, structural capacity, or full
production replacement.
