# Soundtrack speed independent of construction speed

The 1×/2×/4× control changes animation speed only. Every cinematic BGM cue plays
at native playbackRate 1, with no repeated corrections toward the accelerated
film clock. Changing speed must neither seek nor restart the music.

Explicit timeline seeks, replay, wonder changes and edition changes still place
the cue at its corresponding authored position. Pausing, asset loading and film
completion pause music; resuming continues its current position. Muting does not
reset it. Ambient music and narration keep their existing contracts.

Distinguish intentional transport discontinuities from animation ticks with a
store seek revision. Verify actual transport methods at all three speeds,
forward/backward scrubbing, pause/resume, replay and edition replacement. In a
real browser verify BGM native rate and continuous currentTime at 2× and 4×.

Playback recovery is event-driven. A successful `play()` releases its pending
attempt so a browser pause (including an unmute policy pause) can recover.
Only `NotAllowedError` waits for a user gesture; network failures or stalled loading without playable data reload at most
twice per active transport session, preserving the native music position.
Interrupted playback retries on readiness, with a bounded retry when already
ready. Browsers may report an interrupted initial request as unsupported media
(code 4 / NotSupportedError) before metadata arrives: these bundled-source
failures use the same two-reload budget, including errors received before scene
assets are ready. Persistent unsupported sources exhaust that budget; decoded
media failures stay silent. Neither becomes an animation-tick retry loop. Pause, loading, edition replacement and disposal cancel
pending promises, readiness recovery and gesture listeners. Unmuting may resume
an interrupted cue but must not seek or restart it.
