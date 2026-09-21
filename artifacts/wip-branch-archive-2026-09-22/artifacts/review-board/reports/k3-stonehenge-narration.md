# K3 — Stonehenge narration live verify (bundled ElevenLabs Daniel)

- **Date:** 2026-08-27
- **Target:** http://127.0.0.1:5589/#/wonder/stonehenge (player route, not the debug chrome-free route)
- **Build:** `index-DhxqlVMF.js` confirmed served (matches the rebuilt dist hash in the task)
- **Browser:** real Chrome 151.0.7922.174 (`headless=new`), driven over raw CDP; trusted input events; `--enable-unsafe-swiftshader` for WebGL; fresh profile
- **Mode:** read-only. No app code touched; no ElevenLabs clips regenerated.

## Verdict: PASS

Stonehenge narration plays exclusively from the five bundled `stonehenge-daniel-*.mp3`
clips. Browser `speechSynthesis` never fired, no `giza-george` source was loaded or
requested, and no runtime request went to `api.elevenlabs.io`.

## Evidence

### 1. Narration enabled by a real user click

- Pre-click state: toggle read **"Narration off"** (`aria-label="Enable narration"`),
  movie autoplaying at 1× (`prefers-reduced-motion: no-preference`).
- Trusted CDP mouse press/release on the toggle (the autoplay-qualifying gesture).
- Post-click: **"Narration on"** (`aria-label="Disable narration"`).

### 2. Five local audio elements primed by the enabling click

All five elements were constructed inside the click (`new Audio(src)` tracked via an
injected constructor wrapper), each fully buffered after priming
(`readyState 4 HAVE_ENOUGH_DATA`, `networkState 1 NETWORK_IDLE`, `volume 1`, reset to
`currentTime 0`, `paused` — exactly the prime-then-reset contract in
`src/ui/narrationAudio.ts`):

| # | src | currentSrc (observed) | duration |
|---|-----|-----------------------|----------|
| 1 | /audio/narration/stonehenge-daniel-sarsens.mp3 | http://127.0.0.1:5589/audio/narration/stonehenge-daniel-sarsens.mp3 | 6.269 s |
| 2 | /audio/narration/stonehenge-daniel-bluestones.mp3 | http://127.0.0.1:5589/audio/narration/stonehenge-daniel-bluestones.mp3 | 8.638 s |
| 3 | /audio/narration/stonehenge-daniel-pits.mp3 | http://127.0.0.1:5589/audio/narration/stonehenge-daniel-pits.mp3 | 7.709 s |
| 4 | /audio/narration/stonehenge-daniel-lintels.mp3 | http://127.0.0.1:5589/audio/narration/stonehenge-daniel-lintels.mp3 | 5.573 s |
| 5 | /audio/narration/stonehenge-daniel-axis.mp3 | http://127.0.0.1:5589/audio/narration/stonehenge-daniel-axis.mp3 | 6.084 s |

Clip durations match `STONEHENGE_NARRATION` metadata in `src/data/narration.ts` exactly.

### 3. Beat 1 — The Sarsens (seek t≈0.22)

- Waited ~3.1 s of input silence at 1× (chrome idle-hides at 2.5 s; caption layer only
  renders with chrome hidden, 1×, playing).
- Caption observed: kicker **"The Sarsens"**, body "Sarsen faces were dressed with
  hammerstones before the haul.", opacity 1.
- Audio element: `paused === false`, `currentTime = 3.051 s`,
  `currentSrc = http://127.0.0.1:5589/audio/narration/stonehenge-daniel-sarsens.mp3`.
- Movie t at observation: 0.272 (inside the 0.18–0.286 window). 1× button `aria-pressed="true"`.
- Screenshot: `artifacts/review-board/k3-stonehenge-narration/sarsens-beat.png`
  (chrome hidden, letterbox, lower-right caption).

### 4. Beat 2 — The Bluestones (seek t≈0.38)

- Caption observed: kicker **"The Bluestones"**, body "The smaller bluestones were
  transported from the Preseli Hills in Wales, over 200 km away.", opacity 1.
- Audio element: `paused === false`, `currentTime = 3.052 s`,
  `currentSrc = http://127.0.0.1:5589/audio/narration/stonehenge-daniel-bluestones.mp3`.
- Movie t at observation: 0.432 (inside the 0.316–0.462 window).
- Screenshot: `artifacts/review-board/k3-stonehenge-narration/bluestones-beat.png`.

### 5. Hard-fail checks — all clean

| Check | Result |
|-------|--------|
| `window.speechSynthesis.speak` used | **No** — wrapped recorder captured 0 calls across the whole session (both beats included) |
| Any audio src / request containing `giza-george` | **None** — tracked elements, fetch/XHR log, CDP network log, and resource-timing entries all clean |
| Runtime request to `api.elevenlabs.io` | **None** — full network log: local bundle/CSS, 5 narration MP3s, `/audio/stonehenge-cinematic.mp3`, favicon, Google Fonts only |

## Session notes

- The gstack `/browse` skill is not registered in this Devin CLI session, so per the
  spirit of the standing rule (real browser, and never `mcp__claude-in-chrome__*`) the
  check ran in real Chrome via the DevTools Protocol directly.
- The pre-existing `chrome-devtools` MCP browser proved unusable for this app: it is
  launched with `--disable-gpu` and no SwiftShader escape hatch, so WebGL context
  creation fails (`canvas.getContext('webgl2'/'webgl')` → null) and the WonderForge
  bundle never mounts (`#root` stays empty); its page registry also desynced
  ("No page found" for a listed page), and it carries an unrelated weibo.cn tab that
  was left untouched. A dedicated Chrome instance (fresh profile, fixed debug port,
  `--enable-unsafe-swiftshader`, `--mute-audio`) was launched for the verification and
  torn down afterwards. No state in the user's other browser/profile was modified.
- The fresh profile also guaranteed the intended start state: narration preference
  defaults to OFF (`wonderforge:caption-voice` unset), so the priming click was the
  session's one true enabling gesture.
- Playback was kept at 1× throughout; seeks used the scrubber's native value setter +
  `input` event (no synthetic speed change, no pointermove, so chrome-hide timing was
  authentic).
- No playback blocking occurred, so no fallback path was exercised — the
  `speakWithBrowser` fallback in `src/ui/useCaptionVoice.ts` stayed dormant, which is
  precisely the behavior the fix intends.
- Raw machine-readable log of the run: probe/result JSON retained from the session
  (`/tmp/k3-narration-result.json`, ephemeral); screenshots persisted under
  `artifacts/review-board/k3-stonehenge-narration/`.
