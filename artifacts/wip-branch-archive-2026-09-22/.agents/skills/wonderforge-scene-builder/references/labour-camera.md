# Labour kinematics and camera honesty

WonderForge movies fail when masonry grows around posed spectators, when every figure does the same orbit, or when the camera is authored to move but the first seconds are frozen. This note records the Colosseum/Stonehenge/Giza failures and the contracts that replace them.

## Labour is engine-owned state

Put poses in `src/engine/<target>Crew.ts` (or the target's construction sampler). The renderer instances bodies, heads, arms, and tools from that state. It never invents jobs, gait, or occupancy.

Bind every visible person to an operation or a named site job (quarry dresser, hauler, slinger, wheel-walker, tag-line, climber, mixer). Gait, lean, arm, and wheel spin are functions of the same phase progress as the stone. A planted cluster with a bob is a failed shot.

Use `mulberry32(id)` (or the scene seed) for per-person offsets. Never `Math.random()` at runtime. Scrubbing the same `t` must reproduce the same poses.

## Unique jobs, never a chorus line

A ring of identical motion reads as ritual, not work. These patterns are failures even when they are deterministic:

- Occupying every scaffold/bay station around an oval or circle.
- `sin(t * k + station * phase)` so the whole ring walks the same sinusoid out of phase.
- Slingers at `local * TAU + i / n * TAU` orbiting a staged block.
- Four haulers in a rank with one shared travel-scaled gait.
- Mixers on one shared ping-pong clock.

Replace them with mixed jobs and sparse occupancy:

- Distinct authored jobs (walk a chord, dress a corner, stand off, climb, hand timber at the foot).
- Occupancy on the camera-facing arc only; most stations stay empty.
- Unique stride, lean, yaw jitter, and ping-pong rates from the per-id salt.
- Contract tests: slinger radii/angles are never a regular n-gon; climber count is far below station count; gait spread among peers exceeds a documented threshold.

Crews must read at the cinematic hold. At 490–630 m a 1.8 m linen figure on valley dirt is invisible. Use a documented diorama scale and a tunic that contrasts the ground. Spec 12 pins this for Colosseum; other long-hold scenes need the same honesty.

## Never ride a rising platform

Gluing a worker's Y to `deckY` while the stack grows is a magician elevator. The physical claim is: people climb onto a deck that already exists.

- During raise/strike, climbers follow pole corners. Desired height is staggered; actual Y is `min(desired, visibleStackCap)`.
- After the hold begins they pace or hammer a *stationary* deck, then climb down before strike.
- Scaffold windows distinguish `raising | hold | striking`; raising wins over hold when both could apply.
- Tests: a named climber exists during raise, Y increases, the climber is not on deck center; during hold some `deck-mason` exist and climbers are gone.

Poles, decks, and braces are ground-rooted segments of authored length (`COLOSSEUM_SCAFFOLD_SEGMENT` and peers). Never scale pole height on Y to fake growth. Add or remove segments. Upper-storey feet sit on the segment below, never in mid-air.

## Rigs follow the load

- Wagon wheel spin is haul travel over wheel radius.
- Treadwheel spin is hook vertical travel over wheel radius: `(hookY - baseY) / radius`. During a pure slew the hook Y is constant, so the wheel and its walkers freeze. Tests must pin lift gait changing and slew gait holding.
- Engine-owned lift belongs in `position` once. The renderer never applies a second sled/crib/deck lift.

## Camera moves when the keys say it moves

Shot math stays in `src/engine/<target>Camera.ts`. Pitch stays under half the vertical FOV. Radius widens for portrait.

Frozen intros happen two ways, often together:

1. Consecutive keys share the same azimuth, so the first span is a hold.
2. Azimuth uses `easeInOutQuad`, whose derivative is zero at the start of every span, so even a new heading feels parked.

If the spec promises motion from the first frame, azimuth lerps **linearly** across the opening span. Radius, pitch, and target may still ease. Never duplicate the opening azimuth to "settle" the shot.

Co-author the path with the operation wave. Opening geography is historical, never a convenient south slope: Colosseum opens from the east along the Tivoli road so Palatine and Caelian stay backdrop. Hills that belong a few hundred metres off the working floor never fill the first frame.

A close hold that leaves the finished monument outside the frustum is the same defect class as "not rendered". Contract-test NDC bounds on beats that promise the subject. Assert azimuth at an early `t` (for example 0.12) has already left the opening heading when the spec forbids a hold.

After `npm run build`, confirm the preview HTML hash matches the new bundle. A typecheck failure leaves stale `dist/` and the capture shows the old camera.

## Caption and audio identity

Beat windows are authored per wonder. Never assume five beats because Giza has five.

Soundtrack and narration lookup is `(wonderId, role)`. Never fall back to another wonder's cue. Missing audio is silence.

Caption narration is ElevenLabs only (`scripts/generate-narration.py`, bundled MP3s). Never `window.speechSynthesis`, never Vertex Gemini TTS, never a runtime ElevenLabs request. Each reference scene needs its own voice.
