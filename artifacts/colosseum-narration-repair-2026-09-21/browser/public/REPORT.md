# Colosseum public narration spotcheck

**Pass**, 2026-09-21. Tested `https://wonderforge.pages.dev/#/wonder/colosseum` after root reported deployment `76d1ae23-24fc-444a-88bb-56192c80df08` (immutable URL `https://76d1ae23.wonderforge.pages.dev`). The browser itself verified the stable URL's bundle and the two changed audio assets.

Desktop 1440×900 and portrait 390×844 both use Chromium with Apple M2 Ultra / ANGLE Metal. The public served bundle is byte-identical to the accepted local candidate: `main-DI8gduTV.js`, SHA-256 `1767da5deecd45147c6419f147e3c6e1b4bbd11cba0fe1203b17cdc5bf42c605`, 2,369,355 bytes.

- Both chapter menus have exactly six construction entries, including **Supporting the seating** and **From Vespasian to Titus**. No Moonrise chapter or asset request remains in either tested session.
- Both changed actual live captions match the source snapshot verbatim. Public recordings have the expected Andrea Williams manifest bindings and exact served hashes: seating `f9fb4608abb54a1b0ef0c801b20319565d3d889da1c3c02c34022df06430670a`; Titus `9f41ed66ed4c98b1944dd841c441467b5765912039847fe9c1b58d8c13204034`.
- Four of four chapter-triggered public clip plays produce `playing` and natural `ended` events. Seating leaves 2.58 s in its window on each viewport; Titus leaves 1.80 s on each. Decoded duration matches metadata.
- Separate continuous `.78–1` public closing runs pass on both viewports: closing narration ends before `.94`, no narration `play()` is invoked during `.94–1`, and all voice media is inactive at completion.
- Public screenshots visually retain the accepted composition. The seating caption is readable over the working structure. The closing caption is readable and leaves the Moon and monument unobstructed. The final Moon remains visibly textured in both aspects.
- Zero browser, narration-network, media or rejected-play errors. `../public-run.log` ends with `assetCount: 2`, `clipViewportRuns: 4`, `failures: []`.

This is public transport/decode and visual acceptance. Browser process output was muted; no subjective listening or physical-phone acceptance is claimed. The wider local six-clip and transport review is documented in `../REPORT.md`; root independently owns the full test suite and broader public HTTP asset checks.

Evidence: `results.json`, `play-events.json`, `errors.json`, `bundle.json`, exact served JS, `desktop-colosseum-seating-playing.png`, `mobile-colosseum-seating-playing.png`, `desktop-colosseum-titus-playing.png`, `mobile-colosseum-titus-playing.png`, both `*-closing-0_9.png`, both `*-closing-0_945.png`, and both `*-completed.png`.
