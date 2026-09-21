# Soundtrack speed independent of construction speed

The 1×/2×/4× control changes animation speed only. Every cinematic BGM cue plays
at native playbackRate 1, with no repeated corrections toward the accelerated
film clock. Changing speed must neither seek nor restart the music.

Explicit timeline seeks, replay, wonder changes and edition changes still place
the cue at its corresponding authored position. Pausing, asset loading and film
completion pause music; resuming continues its current position. Catalog and
Play/Replay priming unlock autoplay only — they must not leave the cinematic
cue audible over the loader, and the first ready frame must not seek a silent
bed into an audible restart. Muting does not
reset it. Ambient music and narration keep their existing contracts.

Distinguish intentional transport discontinuities from animation ticks with a
store seek revision. Verify actual transport methods at all three speeds,
forward/backward scrubbing, pause/resume, replay and edition replacement. In a
real browser verify BGM native rate and continuous currentTime at 2× and 4×.

Playback recovery is event-driven. A successful `play()` releases its pending
attempt so a browser pause (including an unmute policy pause) can recover.
Looping ambient must not treat a native loop wrap as that pause: calling
`play()` again while the element is already restarting stacks a second decoder
and sounds like two phrases at once. After that bed has started, pause and
canplay must not call `play()` again either — a title/catalog click can emit
those events, and recovering them stacks another decoder so each Enter/back
adds a layer. Unmute and a return to a visible tab may still resume a paused
loop. One `HTMLAudioElement` exists per wonder, role, and edition; plate
changes reuse it and never construct a second bed. Homepage ambient is Giza's own cue, never another culture's file as a
fallback. Assemble each ambient bed from three distinct Lyria clip takes with
equal-power crossfades so the loop is a longer musical phrase (~90 s), not a
single thirty-second cell. Mid-loop policy pauses
on cinematic (non-looping) cues still recover.
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
