# Bounded fastening-camera correction

Actual production frame `../qa/desktop/seek-120.png` showed a foreground diagonal crossing the worker's shoulder/forearm region. The camera now smoothly raises the fastening-only view from5° to30° pitch and lowers its minimum radius from12m to11m. It keeps the original5m near plane, real geometry, timelines, azimuth and cart/hoist views unchanged.

`desktop/seek-120.png` and `mobile/seek-120.png` show the delivered plates and hands below the foreground diagonal from above. The worker's head is still partly overlapped in projection. This is a focused improvement to the fastening operation, not a claim that the complete scene is unobstructed or high contrast. The26s thin-load contrast limitation remains.

Validation:4joint-camera tests pass without lowering any framing/projection/continuity/near-clearance thresholds; typecheck passes. Actual mounted main-page5590 desktop/mobile captures at114/117/120/124s plus normal playback from117s are in `report.json` and the video files. Both runs have no browser errors. Recorded local playback advances117.452→118.508s desktop and117.188→118.508s mobile.

Sampled close-frame metrics:desktop175calls/184,352triangles; mobile142calls/130,181triangles. Desktop calls exceed the earlier150call target and remain a renderer-budget issue for parent review. No rendering/material/geometry changes were made in this bounded correction. Parent performs final production build/recapture.
