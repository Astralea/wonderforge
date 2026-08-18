Task ID: db427c65-5f9a-4798-b7c8-fbf940df95d6
Subagent Type: Worker
Description: Frontend UX review
Status: completed
Duration: 202.8s

I have all the evidence I need. Let me also double check the scrubber touch target claim: `h-1` in Tailwind = 0.25rem = 4px. Yes.

And the speed buttons: `min-h-8 min-w-8` = 2rem = 32px. Yes.

Let me verify the reduced-motion "dead playing" path once more:
- `ui.ts` openWonder: reduced motion → `playback.seek(1)` → status stays 'idle' (seek only changes 'complete'→'paused'), t=1.
- TransportBar: status 'idle' → renders Play button (the else branch).
- User presses Play → `play()` from idle → status 'playing'.
- ThreeCanvas paint: `if (!reducedMotion && before.status === 'playing') before.tick(delta);` → tick never called under reduced motion → t frozen at 1, status stays 'playing' forever.
- Chrome auto-hide: status 'playing' → hides after 2.5s.
- Also the requestFrame loop: `if ((mode === 'ambient' && !reducedMotion) || usePlaybackStore.getState().status === 'playing')` → requestFrame() — so under reduced motion with status 'playing', it keeps scheduling rAF frames continuously (busy loop rendering a static frame). That's a minor perf/battery waste too. Actually wait — under reduced motion, if the user never presses play, status is 'idle', so no continuous loop — only paints on store changes. But if they press play, continuous rAF loop with a static frame, forever. Part of the same finding.

Also Space under reduced motion: 'idle' → play() → same dead-playing state.

One more check on the "seek while complete parks paused" — tested ✓.

Speed change while paused: setSpeed works regardless of status ✓. While complete: works; then Replay restarts at that speed ✓ (replay doesn't touch speed).

Deep links: tested ✓.

Now, the arrow-key/scrubber conflict — let me be careful about whether the slider's native behavior + window handler both fire. Yes: keydown on the input bubbles to window; handler doesn't check e.target. Native default action adjusts the slider (not prevented for arrows). So both happen. Also Space while a button is focused: handler preventDefaults keydown, which suppresses the button's space-activation (click on keyup), so Space always toggles global playback instead of activating the focused button. Enter still activates buttons. This is worth including in the same finding.

Severity calibration:
1. Keyboard handler conflicts with focused controls (scrubber arrows → wonder switch; Space on focused button → global toggle instead of activation). Keyboard seeking is effectively impossible. Per the role's severity defs, this is an a11y blocker for keyboard scrubbing → I'll call it **critical**? or **major**? The definition: critical = broken control / a11y blocker. The scrubber IS broken for keyboard users. I'll say critical. Hmm, let me think about how a review board would see it. The global shortcuts work exactly as spec'd; the defect is the missing target guard. A keyboard user pressing → on the scrubber gets navigated away — that's a broken control experience. I'll file as critical with clear evidence. Actually — one nuance: is it truly impossible to seek via keyboard? The user could press R to restart, Space to pause... no way to scrub. Right, keyboard scrubbing is impossible without side effects. Critical.

Wait, but I should double-check: does the window keydown handler fire before or after the input's default action? Default actions happen after event dispatch completes. So go(1) runs first (during dispatch), then the slider increments and fires change → seek on the new wonder. Either way, the user is yanked. Confirmed.

2. Speed toggle buttons 32px < 44px convention (TransportBar.tsx:79). Checklist explicitly requires ≥44px. **major**.

3. Scrubber hit area 4px tall (TransportBar.tsx:65, h-1). Way below 44px; on touch devices very hard to grab. **major**. (Pre-existing, but in scope.)

4. Mobile crowding: at 320–360px the scrubber is squeezed to ~30–70px by the fixed 44px×3 buttons + ~110px speed group (TransportBar.tsx:26, 68–88). **minor** (degraded but operable; overlaps with finding 3's hit-area issue).

5. Reduced-motion dead 'playing' state: Play/Space/R under reduced motion set status 'playing' but ThreeCanvas never ticks (ThreeCanvas.tsx:40), so nothing advances, chrome auto-hides, and rAF spins on a static frame (ThreeCanvas.tsx:47). **minor** (edge; primary RM path works).

6. CinematicView uses `<section>` not `<main>` — no main landmark in watch view (CinematicView.tsx:92). Spec 05 §Accessibility lists landmarks header/main/footer. **note** (home view has them).

7. Note: replay swaps with play/pause rather than appearing alongside (TransportBar.tsx:31–46) — spec lists both, but play() from 'complete' is a no-op (playback.ts:54–57), so the swap is the sensible reading and matches Space→replay. **note**, no action needed.

8. Canvas has role="img" + aria-label but spec says canvas is aria-hidden; both usages wrap it in aria-hidden divs so it's moot. **note** — skip? It's harmless. I could include as a note for spec alignment. Eh — it's conveyed by overlay text per spec; the role="img" is dead code given ancestors are aria-hidden. I'll include as a brief note.

Positive confirmations (checklist items that pass):
- Controls completeness: prev/play-pause/next/scrubber/phase label/replay/speed group all present; phase labels match spec (Site preparation/Construction/Complete via phaseAt).
- aria-pressed on active speed ✓, group aria-label ✓, per-button aria-labels ✓.
- All icon buttons have accessible names; focus-visible gold outline everywhere except scrubber relies on UA default (minor note — I'll fold into finding 3 or list separately as note).
- Keyboard map matches spec (Space/←/→/R/Esc) — implemented at CinematicView.tsx:61–84.
- Chrome auto-hide ~2.5s, wake on pointer/key, restore on complete ✓ (CinematicView.tsx:30–56).
- Reduced motion: no auto-play, static complete frame, scrubbable, CSS transitions killed (index.css) ✓ — primary path works.
- State edges: seek-while-complete → paused ✓ (playback.ts:64–67, tested); replay keeps speed ✓ (playback.ts:87); setSpeed throws on unsupported ✓ (playback.ts:69–74); speed change while paused/complete safe ✓; deep links + unknown ids ✓ (ui.ts:36–47, tested).
- Copy: Hero "in one minute" matches 60s durationMs 60_000 ✓ (Hero.tsx:24–26, playback.ts:34).
- Tests: 190 pass, including speed toggle UI contract test (ui.test.tsx:86–104).

Scrubber focus-visible: no explicit focus style on the range input (TransportBar.tsx:57–66). UA default focus ring on range thumbs is subtle/inconsistent. I'll fold this into finding 3 as an additional note or make it a separate note. I'll make it a note.

Let me now also double-check the mobile math for the finding: viewport 360px, px-4 → 328px content. Fixed: 3×44=132; speed group: px-1(8) + border(2) + 3×32 + 2×2(gap-0.5=2px each) = 8+2+96+4=110; gaps gap-1=4px × 4 = 16. Total 258. Scrubber ≈ 70px. At 320px: 288−258 = 30px. Good.

Verdict paragraph: solid pass overall with the new speed group well-integrated (aria-pressed, labels, store semantics, tests), but one critical keyboard conflict, two touch-target violations, and minor reduced-motion/responsive polish items.

Format: findings list with severity, evidence (file:line), then verdict. Keep it self-sufficient.
All checks complete. Here is my review.

---

# Frontend Experience Review — playback speed toggle pass

**Scope reviewed:** `src/ui/**`, `src/store/**`, `src/App.tsx`, reduced-motion path in `src/render/three/ThreeCanvas.tsx`, against `specs/05-ui.md`. **Tests:** `npm run test` → 18 files, 190 tests, all passing (includes the speed-toggle contract test at `tests/ui.test.tsx:86`).

## Findings

### Critical

**1. Global keyboard handler fights focused controls — keyboard scrubbing is effectively broken.**
`src/ui/CinematicView.tsx:61-84` — the `onKey` handler on `window` switches on `Space`/`ArrowLeft`/`ArrowRight`/`R`/`Escape` with no `e.target` filtering. Two concrete conflicts:
- When the scrubber (`<input type="range">`, `src/ui/TransportBar.tsx:57-66`) has focus, pressing `←`/`→` performs the native slider seek **and** bubbles to the window handler, which calls `go(±1)` → `openWonder()` → `select()` resets `t` to 0. A keyboard user cannot seek: every arrow press yanks them to another wonder. There is no alternative keyboard seek path.
- When any transport button has focus, `Space` is `preventDefault`'d at `CinematicView.tsx:65`, which suppresses the focused button's native space-activation — so `Space` on the focused "2× speed" button toggles global play/pause instead of activating it (Enter still works).

Standard fix: ignore events whose target is an input/button, or scope the global map to non-interactive targets. The spec'd keyboard map (Spec 05 §Keyboard) is otherwise correctly implemented.

### Major

**2. Speed toggle buttons are 32px — below the project's 44px touch-target convention.**
`src/ui/TransportBar.tsx:79` — `min-h-8 min-w-8` (32px), while every other control uses `min-h-11 min-w-11` (`TransportBar.tsx:12`, `CinematicView.tsx:116,123`). The checklist's ≥44px convention is violated on the newest controls. (Passes WCAG 2.5.8 AA's 24px floor, but breaks the house standard and is a small target on touch.)

**3. Scrubber hit area is 4px tall.**
`src/ui/TransportBar.tsx:65` — `h-1` on the `<input type="range">` makes the entire clickable/touchable band 4px high, far below 44px. On touch devices the primary continuous control is very hard to grab. Related: the scrubber has no explicit `focus-visible` style (all buttons have `focus-visible:outline-gold`; the range input relies on the subtle UA default ring).

### Minor

**4. Speed group crowds the scrubber on narrow viewports.**
`src/ui/TransportBar.tsx:26,68-88` — the bar is a single non-wrapping flex row: 3×44px nav buttons + ~110px speed group + gaps ≈ 258px fixed. At 360px viewport the scrubber gets ~70px; at 320px, ~30px. Operable but severely degraded; consider stacking the phase label row, hiding the group behind a menu, or allowing wrap below `md`.

**5. Reduced-motion users can enter a dead "playing" state.**
`src/store/ui.ts:22-26` correctly avoids auto-play under `prefers-reduced-motion` (seeks to `t=1`, status stays `idle`). But the Play button, `Space`, and `R` remain live: `play()`/`replay()` set `status: 'playing'`, while `src/render/three/ThreeCanvas.tsx:40` suppresses `tick()` under reduced motion — so `t` never advances, the Pause button shows, chrome auto-hides after 2.5s over a static frame, and `ThreeCanvas.tsx:47` keeps a rAF loop spinning on an unchanging image. Consider disabling play/replay (or allowing a one-shot static render) in the reduced-motion path.

### Notes

**6.** Watch view renders as `<section>` (`CinematicView.tsx:92`); Spec 05 §Accessibility lists `header`/`main`/`footer` landmarks — the cinematic view has no `main` landmark. Home view is compliant.

**7.** Replay **replaces** play/pause when `status === 'complete'` (`TransportBar.tsx:31-46`) rather than appearing alongside it as the spec's list literally reads. Since `play()` from `complete` is a no-op (`src/store/playback.ts:54-57`) and `Space` also maps complete→replay (`CinematicView.tsx:66-68`), the swap is the sensible, internally consistent reading — flagging only as a spec-wording ambiguity.

**8.** The canvas carries `role="img"` + `aria-label` (`ThreeCanvas.tsx:84-88`) while Spec 05 says the canvas is `aria-hidden`; both call sites wrap it in an `aria-hidden` div (`CinematicView.tsx:95`, `Hero.tsx:10`), so this is dead but harmless markup.

## Verified clean (no findings)

- **Controls completeness/state:** prev/play-pause/next/scrubber/phase label/replay/speed group all present; phase labels match spec via `phaseAt` (`TransportBar.tsx:6-10`); `aria-pressed` on active speed, `role="group" aria-label="Playback speed"`, per-button `aria-label="2× speed"` (`TransportBar.tsx:69-82`).
- **State edges:** seek-while-complete parks paused (`playback.ts:64-67`, tested); replay resets `t` and keeps `speed` (`playback.ts:87`); `setSpeed` throws on unsupported values (`playback.ts:69-74`); speed change while paused/complete is safe (speed only read in `tick`); deep links and unknown-id fallback work (`ui.ts:36-47`, `App.tsx:22-24`; tested).
- **Chrome auto-hide:** 2.5s idle, wake on pointer/key, restore on completion (`CinematicView.tsx:30-56`).
- **Reduced-motion primary path:** no auto-play, static complete frame, scrubbable via store-subscription repaint (`ThreeCanvas.tsx:60-63`), CSS transitions/animations killed (`src/index.css` `@media (prefers-reduced-motion: reduce)`).
- **Copy:** Hero "from bare ground to glory in one minute" matches `durationMs: 60_000` (`Hero.tsx:24-26`, `playback.ts:34`); hero content budget, gallery index, and footer disclaimer all match spec.

## Verdict

The speed-toggle pass is well-executed: the store semantics are exactly right (speed as a wall-clock multiplier with `t` as the single source of truth, replay preserving speed, guarded `setSpeed`), the ARIA wiring (`aria-pressed`, labeled group, named buttons) is textbook, and the contract tests cover the new behavior — the UI layer is cohesive, on-spec in copy and chrome behavior, and fully green. Ship-blocking, however, is the unfiltered global keyboard handler, which makes the scrubber unusable by keyboard and hijacks Space from focused buttons (Finding 1); the two touch-target violations on the new speed buttons and the scrubber (Findings 2-3) should also be fixed before this passes an accessibility bar, with the mobile crowding and reduced-motion dead-play state as worthwhile follow-ups.