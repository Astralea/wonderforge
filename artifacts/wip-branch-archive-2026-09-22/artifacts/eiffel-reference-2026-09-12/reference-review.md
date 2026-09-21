# Reference review and Eiffel improvements — 12 September 2026

The strongest reference is [Paris / Louvre](https://3dscenes.qualityf2p.workers.dev/paris). Its quality comes from a tightly composed landmark, coherent facade and roof detail, readable warm/cool lighting, believable reflections and a very small control surface. A different renderer alone will not give WonderForge that result.

## What was inspected

All nine visible entries in the [public catalog](https://3dscenes.qualityf2p.workers.dev/scenes.json), plus the Paris WebGL fallback, were opened. Desktop observations are a scene survey, not a full functional or mobile audit of the external site.

| Scene | Observed approach | Relevant lesson for Eiffel |
| --- | --- | --- |
| [Paris / Louvre](https://3dscenes.qualityf2p.workers.dev/paris) | Fine repeated palace bays, articulated roofs, sculpted trees, luminous pyramid, river reflections; compact day/night controls. Inspected noon and night. | Strong landmark hierarchy, controlled material palette, shadows that describe architecture, one arrival illustration tied to the place. |
| [New York](https://3dscenes.qualityf2p.workers.dev/nyc) | Dense tree canopy, terrain/pond/rock variation and tall street-wall silhouettes; exposed technical control panel. | Vary landscape mass and city silhouette; do not assume every scene has the same polished interface. |
| [LAX](https://3dscenes.qualityf2p.workers.dev/lax) | Large airport with aircraft, concourses, roads, floor buttons and camera destinations. | Purposeful camera destinations reveal meaningful detail; floor-by-floor interaction differs from a construction film. |
| [Changi](https://3dscenes.qualityf2p.workers.dev/changi) | Distinct terminal and Jewel forms, roads/aircraft, floor and weather controls. | Recognizable large forms carry the scene before small decoration. |
| [Shibuya](https://3dscenes.qualityf2p.workers.dev/shibuya) | Layered signs, varied street fronts, crossing crowds, trains, strong emissive night identity. | Place-specific details and motion need semantic roles; arbitrary additional detail is less useful. |
| [Dollhouse](https://3dscenes.qualityf2p.workers.dev/home) | Compact house, material separation, landscaping, floor/room/wall controls. | Bounded compositions let authored detail remain readable. |
| [Silo](https://3dscenes.qualityf2p.workers.dev/silo) | Deep cutaway, dense repeated landings, stair and bridge structures, spatial annotations. | Use repeated structural kits with a clear hierarchy and purposeful close views. |
| [White House](https://3dscenes.qualityf2p.workers.dev/whitehouse) | Recognizable architecture, spatial view buttons and an integrated construction timeline. | Clear phase navigation can complement a film without presenting every engineering operation. Its on-page historical/project claims were not independently fact-checked. |
| [BTS / SoFi](https://3dscenes.qualityf2p.workers.dev/bts) | Stadium as a nighttime landmark, restrained arrival UI and seat-view search. | One dominant experience and carefully chosen emissive accents. Seat search was not submitted. |

## Technology, verified from served code

- The `/paris` entry loads `citygpu/assets/index-BsiRzcMG.js`, imports a Three.js core chunk for camera/control-side functionality, and initializes `citygpu_web.js` WebAssembly bindings through `initLouvre`. It checks `navigator.gpu` and redirects unsupported browsers to `/paris-gl`. This is **a custom WASM/WebGPU rendering path**, not evidence that it uses React Three Fiber or the standard Three.js WebGPURenderer. The bindings contain wasm-bindgen signatures, consistent with a Rust toolchain; the repository itself was not available for confirmation.
- Paris fetches a pinned, SHA-256-validated LVGP v1 binary city pack. The served manifest declares **74,540,472 bytes (~71.1 MiB)**. That is the uncompressed pack size, not a measured transfer size or total page size. The code also loads textures/terrain, exposes LOD/contribution thresholds, shadow/reflection resolutions, AO and bloom settings, and separately updates dynamic vehicles/boats.
- The explicit [WebGL fallback](https://3dscenes.qualityf2p.workers.dev/paris-gl) and New York use the `city` bundle. LAX, Changi, Shibuya, Dollhouse, Silo and White House bundles include Three.js WebGLRenderer, geometry/instancing, OrbitControls and EffectComposer paths. Airport loaders explicitly describe OpenStreetMap geometry; this is evidence for data-driven airport layout, not proof that every landmark is generated from OSM.
- The SoFi entry uses a distinct `concert_web.js` WASM runtime and two GLB packs (venue and show). Its options include a GL fallback. It is another renderer, not the Paris pack reused.
- Vite-generated module preloading/chunk loaders are present. Static HTML/CSS and direct DOM control code are visible. The deployed origin is Cloudflare Workers. No backend language, private authoring workflow or repository architecture is assumed from the hosting hostname.
- On-page counters in this browser showed roughly 19.8M triangles/349 calls for New York and thousands of calls for the airport scenes. These are their self-reported instantaneous counters, **not comparable benchmark results**. Copying that detail density wholesale would exceed WonderForge's current mobile budget.

Public source evidence: [Paris HTML](https://3dscenes.qualityf2p.workers.dev/paris), [Paris bootstrap](https://3dscenes.qualityf2p.workers.dev/citygpu/assets/index-BsiRzcMG.js), [pinned pack manifest](https://3dscenes.qualityf2p.workers.dev/citygpu/louvre/louvre-gpu-5d77c9a42ce63c55223e4c0a3e0eb3eba829ac99bb9dbadc525bcc21d48a9bfa.json), [WebAssembly bindings](https://3dscenes.qualityf2p.workers.dev/citygpu/wasm/8f40ada8deec52d1e3f74f0c716a52072d0ee972cb758f6ecb307e66f80ac4cf/citygpu_web.js). Hashed URLs describe the inspected deployment and may change.

## The loading effect

The supplied image is a **landmark-shaped SVG loading overlay**, not the actual scene's buildings streaming from wireframe into solid meshes. Paris keeps the outline and grid visible, raises a clipped warm fill using `--pyramid-waterline`, and displays it over a blurred `loading.jpg`. Its progress combines streamed pack bytes (10–75% of the overall scale) with preparation stages and the rendered arrival. Other surveyed scenes have different loaders; the same skeleton treatment is not universal across the catalog.

For Eiffel, the adaptation is an original iron-tower elevation with splayed legs, the lower arch, platforms and summit. Its gold fill follows the existing real readiness milestones. A softly blurred live scene under a navy wash supplies context, without copying their imagery. The percentage means prepared asset systems, not downloaded bytes. Deferred construction allows the lightweight illustration to paint before the synchronous terrain/model setup.

## Implemented in WonderForge

1. Public Eiffel starts with the **180-second film**. The visible Detailed selector is replaced by `3 min film`. The long edition's internal samplers, assets, source timing and tests remain available for development; other wonder durations are unchanged.
2. Eiffel-specific outline-to-filled loading, current pending preparation category, numeric readiness and existing recovery behavior. The short film's portrait chapter scrollbar uses a thin warm thumb over a transparent track.
3. Short-film directional-shadow coverage follows the actual tower and operation context. Previously, the 277m/300m upper-tower samples were outside the fixed near-ground shadow camera, including its depth range. The fitted light uses the existing one sun and map resolutions, with texel-snapped targeting. Numerical coverage is not itself proof of visual quality; browser cost and framing are checked separately.
4. The saved steam-drive assembly omits its shadow in short-film shots where its projected diameter is at most 12 CSS pixels, restoring it in closer shots and the detailed edition. All source triangles, animated batch transforms and shadow reception remain unchanged. This pays for wider tower-shadow coverage without weakening the existing sampled budgets: eight final frames per profile peak at 162 calls / 444,807 triangles on desktop and 147 calls / 293,222 triangles on mobile. These are sampled submission counts, not an FPS benchmark or proof about every film frame.

No external reference meshes, textures, audio or source implementation were copied into the app. No public deployment or renderer migration was performed.

## What would improve the modeling further

1. **Author the few shapes that dominate actual film frames.** The reference's palace roof breaks, pavilions, courtyards and facade depth are more distinctive than our repeated surrounding blocks. Prioritize the Palais/exhibition halls and two or three foreground Paris blocks using historically appropriate 1889 references. Keep repeatable bays, but vary massing and roofline at block scale. Preserve authored/source assets and the deterministic construction graph.
2. **Separate form, material and lighting problems.** Better shadow coverage helps existing ironwork. It does not repair repetitive roofs, thin distant lattice silhouettes, plain ground, or large featureless distant areas. Review these at the three-minute film's camera distances before spending triangles on bolts that remain subpixel.
3. **Give the final city view a stronger material/light hierarchy.** Our daylight-to-evening setting still loses facade and iron contrast in some views. Evaluate calibrated iron/stone/zinc materials and a less muddy distant ground/sky relationship against the actual film, rather than adding indiscriminate bloom or importing the reference's modern nighttime lighting into 1889 Paris.
4. **Make assets progressively ready, not just progress visibly.** Eiffel's environment currently hides multiple loads behind one readiness promise and constructs fallback buildings before the reviewed Paris assets arrive. Move fallback-only work to the failure path, split environment milestones, and prefetch later machinery by chapter with correct reverse-seek behavior. Do not omit the long-load rigs merely because their detailed UI is hidden: the short edit still passes through those source operations.
5. **Keep Three.js/WebGL for this pass.** Existing batching, culling and facade filtering are useful foundations. Consider a separate WebGPU experiment only after measuring a concrete GPU bottleneck; a migration would also need shadows, material parity, mobile fallback and deterministic seek validation. It would not substitute for authored landmark geometry.

These modeling/streaming recommendations are analysis and future work. This pass improves arrival, short-film presentation and lighting coverage; it is not a claim that Eiffel's assets now match the reference's modeling quality.
