# Edition audio contract checks

Six focused test files, 22 tests passed; TypeScript check exited 0. Source audio
and hooks were owned by the parent; this pass changes tests only.

Actual `ffprobe` durations and SHA256 readback are recorded in
`actual-files.json`. Detailed score: 829.426771 s, 15,156,981 bytes. Short score:
179.978521 s, 3,276,789 bytes. Both match the assembly manifest bytes/hash; the
short score is 21.479 ms shorter than its 180-second film. The hook/clock does
not automatically loop either complete score. The six story clips measure
3.390113–4.318912 s and fit their detailed and cinematic caption windows with
at least the tested 0.4-second margin. All six exact texts, Adam voice/model,
manifest identities and local files agree. The original five fact clips remain.

The jsdom hook test uses a media double: switching edition disposes the old
score, loads the correct new source at the new clock origin, preserves pitch,
seeks forward/backward, pauses/resumes and cleans up on unmount. This proves
application control behavior, not real browser audio decoding or audibility.

Technical metadata only: no listening review was performed. The manifest's
no-repeated-source flag is checked as provenance metadata; these tests do not
independently analyze musical repetition, artistic quality or historical style.
