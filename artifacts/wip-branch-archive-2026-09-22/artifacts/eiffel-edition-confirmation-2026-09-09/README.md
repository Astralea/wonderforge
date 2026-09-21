# Eiffel editions preserved

The owner's duration preference is confirmed: retain the complete 829.4267707038563-second film (13:49.43) as the default Detailed edition, with the independent 180-second Cinematic edit available in the bottom film-version selector. Edition changes restart the chosen edition. No Eiffel source, models or audio were changed for this confirmation.

Fresh Chromium desktop (1440×900) and portrait (390×844) contexts both opened with Detailed selected, then successfully switched Detailed → Cinematic → Detailed. Each edition was scrubbed to its midpoint, rendered with assets ready, and had no page errors or old fullscreen editorial card. This is a bounded selector/rendering check, not another whole-film playback or listening review.

`report.json` records the actual served `main-CDwvfOaW.js` build, renderer diagnostics and eight source SHA-256 comparisons against the previously verified preservation record; all match. The two PNGs capture the restored Detailed selection.

Focused tests run on 2026-09-09: `eiffel-film-edit.test.ts`, `eiffel-chapter-captions.test.tsx`, `eiffel-film-transition-camera.test.ts` — 12 passed; `playback.test.ts` — 14 passed. No production rebuild was necessary.

Local review: http://127.0.0.1:5589/?review=editions-preserved#/wonder/eiffel-tower

The app open request returned queued; visibility in the owner's window was not confirmed. The local preview process was verified listening on port 5589.
