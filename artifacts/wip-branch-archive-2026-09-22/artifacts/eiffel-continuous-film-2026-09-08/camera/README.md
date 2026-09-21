# Continuous cameras and optional three-minute edit

Source frozen after focused checks, 2026-09-08.

- `eiffelFilm.ts` SHA256 `7a344c704de8ddf8742e86e73a6f4bd5f155ea09d82893b67c43060e919a1753`.
- `eiffelFilmEdit.ts` SHA256 `a027ebc042845cb9484b5ef79ba9ec9e1504418a860d96562551dd597eab1100`.
- `focused.log`: four files, 25 tests passed. `typecheck.log`: exit 0.

The detailed 829.4267707038563-second source clock and operation-interior camera
functions are preserved. Six previously hidden preparation/recovery intervals
now interpolate target, pitch, FOV and radius continuously. The first-floor
ground approach temporarily turns through the north opening: a straight 38°
approach failed the actual tower test at 254.9297 s, with 1.202 m clearance
against a required 6.263 m near-plane-corner sphere. The corrected path passes
every .05 s through all six windows on desktop 1.6 and portrait 390/844.
The global orbit remains monotone; this local clearance detour turns back to
its exact accepted operation angle, so the old all-shot monotonicity assertion
now applies to the unchanged base orbit. Join and geometry tests cover the
actual detour separately.

The optional 180-second edit maps all source time continuously with monotone
cubic rate changes. Ground operation seconds 14–46 receive 24 edit seconds;
the first-floor ascent receives 20. Other handling and final construction use
the wide camera. During the first-floor passage the camera withdraws before
the load reaches the first-floor deck, through the same north opening. Trying
to withdraw later crossed that deck; the final path passes actual tower OBB
clearance checks every .1 edit seconds during both selected close-up passages.
All six short-edition caption windows last at least eight seconds.

Limits: these are pure clock/camera and conservative geometry checks. Browser
playback, edition switching, captions, GPU budgets and narration are separate
composed QA owned by the parent/UI agent. No new geometry, cargo route, worker
claim, machinery installation or removal is admitted by this camera work.
