# 34 — Eiffel: a continuous construction film

## User direction and scope

The animation remains visible throughout. Preparation and later-work beats use
short floating captions with the existing optional Adam narration, like the
other wonders. They never cover the viewport or pause playback. Representative
close views explain the work; wider views return to the construction story.

This supersedes the opaque-screen presentation in earlier Eiffel insertion
specifications. It does not add physical operations to those insertions: frame
erection, initial stock/rigging preparation, temporary-equipment removal and the
unimplemented upper material chain remain omitted as recorded in Specs 32–33.
The existing authored explanatory `cutText` stays in the film metadata for those
technical boundaries. Product captions tell the construction story instead of
reciting that audit record.

## Floating captions and voice

- Remove the fullscreen editorial card and the corresponding Eiffel world-group
  visibility suppression. Sky, city and construction remain rendered during
  every existing transition. Preserve object ownership and construction times.
  Ground and joint apparatus remain visible for their whole insertion, with
  the existing zero/end poses held during preparation/exit, so the camera does
  not enter an empty station and then reveal its fixtures in one frame.
- Show one small parchment-and-gold caption at the lower right, above the
  transport controls, with a local translucent backing only. On a narrow screen
  it uses the available inset width; short landscape screens use compact type.
  The caption does not take pointer input and remains a polite, atomic live
  announcement. It never forces a playback pause.
  Its 0.6-second fades derive from absolute selected-edit time, so pausing,
  scrubbing and reversing reproduce the same opacity without a CSS timer.
- Keep the current 829.4267707038563-second clock in this bounded change.
  Caption windows derive from the insertion schedule, not duplicated timestamps.
  Preparation cues run from preparation start through six seconds of the
  operation. Later-work cues run from four seconds before operation end through
  the existing four-second transition. These nine/eight-second windows preserve
  the spoken sentence across chapter boundaries without overlapping one another.
- At 1×, the selected chapter cue takes precedence over the normal fact caption
  and the ground/joint phase heading. At 2×/4× it is hidden and silent, following
  the existing caption policy. Pausing retains the text and stops the voice;
  resuming uses elapsed film time. Seeking/reversing selects the same cue from
  absolute time. Reduced motion still uses the completed scene.
- Reuse the one existing caption voice hook, passing absolute film seconds
  divided by 60 and the cue's start seconds divided by 60. The production clock
  is held during insertions and must not drive these six clips. A clip must fit
  its cue with at least 0.4 seconds spare. Missing local audio remains silence;
  no browser speech synthesis or runtime voice request.
- On first entering Eiffel with no saved narration choice, narration defaults
  on. A saved explicit off/on choice always wins, and other wonders keep their
  previous off default. This contextual default does not write a user preference.
  Gallery entry, Play, Replay and their keyboard gestures prime the local clips;
  a direct-link browser may still require that gesture to permit audio. The
  preference label does not itself prove autoplay succeeded.

| Caption ID | Kicker | Spoken and displayed sentence |
| --- | --- | --- |
| `eiffel-lift-prepared` | At the foot of the tower | At the foot of each pylon, a lifting frame takes the weight of the iron. |
| `eiffel-lift-later` | Work around the tower | One member settles into place, while the other crews continue around the tower. |
| `eiffel-joint-prepared` | An iron joint | Up close, workers align the plates and tighten the bolts that hold the joint. |
| `eiffel-joint-later` | Four pylons, one tower | Around them, many hands repeat the work, joining the four pylons into one tower. |
| `eiffel-relay-prepared` | From platform to platform | Winches lift the longer members from platform to platform, toward the narrowing summit. |
| `eiffel-relay-later` | Above Paris | The work rises above Paris, until the tower’s iron lattice reaches the sky. |

These are representative construction-story cues, not claims that the film
shows every crew or every mechanical step. Existing detailed artifact seals
remain unchanged.

## Verification

Test actual UI selection, caption precedence, continued playback, pause/reverse
behavior and the film-clock voice inputs. Exercise the real world update with
subsystem spies in both directions to ensure transitions never hide the group.
Desktop and mobile browser captures must show the animation, readable captions
and unobstructed transport controls. Tests do not establish audibility or physical
completeness; local clip identity/duration and actual browser playback are separate
checks. Camera verification is recorded in Spec 35 by its owning agent.

## Two editions

Keep **Detailed · 14 min** as the initial default and offer **Cinematic · 3 min**
in the Eiffel transport controls. Both remain available. The short edition uses
the representative-work mapping and overview camera in Spec 35; it does not
apply one speed multiplier to every action.

Playback `t`, duration, scrubber and soundtrack use the selected edition's clock.
At the ThreeCanvas boundary, convert that time to the detailed source clock for
construction and light; pass the selected edit to the camera override separately.
The short edition's six floating-caption/voice windows and beat-index jumps use
its own clock. Its compressed passages do not play the five detailed fact clips.
The detailed edition retains those existing captions and their navigation.

Changing edition restarts its movie at zero while retaining playing/paused state;
a completed film becomes paused at the beginning. Reduced motion remains the
completed still. The choice persists for this session when visiting another
wonder, whose clock and controls are unchanged. Caption and scene changes must
be atomic with that selection. Test both rendering clocks, inverse beat jumps,
caption elapsed time, and uninterrupted playback in addition to the UI label.
