# Sun/Moon lighting implementation and direct visual check

Owned changes: `src/engine/daynight.ts`, `src/engine/colosseumLighting.ts`,
`src/render/three/RenderPipeline.ts`, and
`tests/colosseum-celestial-lighting.test.ts`. Root owns sky/camera/world integration.

One existing shadow-casting DirectionalLight remains. Its optional `keyLight`
state follows the Moon only after the Sun's physical horizon visibility is
zero. Lunar strength starts at solar elevation−1° and completes at−6°, and is
gated by real lunar horizon visibility and illuminated fraction. Returned solar
direction, solar warm grade, shafts and streak remain tied to the actual Sun.
Night fill is an explicit photographic adaptation, not measured lux. There are
no added point lights, floodlights or emissive windows.

Night fill was raised after the initial `dev/desktop-moon.png` showed nearly
black architecture. Current sky fill is `#93a9c5`, ground fill`#536078`, with
intensity0.28; root matched the pipeline neutralizers. This retains a dark sky
while distinguishing the main arcade, rim, road and nearer roof silhouettes.

The optional `setLensStreakEnabled(false)` disables the sampled horizontal
streak for Colosseum's analytic discs. The original streak produced a row of
sun copies in `dev/desktop-sunset.png`. It remains enabled by default for other
wonders. Solar shafts are a separate, unchanged control.

## Captured dev review

- `moon/desktop.png`: t=.88,1440×900, real Apple M2 Ultra Metal,84calls and
  143,678submitted triangles. Sun elevation−21.59°, actual Moon elevation5.97°,
  lunar illuminated fraction.266. Night facade is subdued but legible; the
  crescent and key remain coherent. Accepted for this scoped fill correction.
- `sunset/desktop.png`: t=.702,1440×900, same real GPU,104calls and141,837triangles.
  One clean Sun remains; the replicated horizontal disks are absent. Accepted.
- Both JSON diagnostics contain zero console and page errors. These captures
  review development output, not the later frozen production bundle, phone
  hardware performance or sustained playback.

Focused command passed26tests across4files:

`npm run test -- tests/colosseum-celestial-lighting.test.ts tests/render-pipeline.test.ts tests/eiffel-sunrise-rendering.test.ts tests/daynight.test.ts`

The new10-test suite covers lunar horizon/phase gating, distinct physical Sun
and Moon vectors, zero hidden-Sun grade/shafts/streak, one directional source,
default-wonder formula compatibility, reverse seeking and streak opt-out.
Typecheck passed before the final literal fill/streak refinement; root owns
the final complete suite/typecheck/build and production acceptance.
