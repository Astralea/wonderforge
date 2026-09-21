# Colosseum: Moon rises after the daylight build

The selected authored day is **Julian AD80-Jun21**, at the Colosseum observer
location41.8902°N,12.4922°E,25m altitude. It is a representative reconstruction
date, not a claimed dedication date. The data uses **UT1**, not modern UTC.

JPL Horizons / DE441 gives these airless body-centre horizon crossings:

| Event | UT1 | Compass azimuth |
|---|---|---|
| Sunrise | approximately03:34 | 57.39° NE |
| Sunset | approximately18:39:40 | 302.63° NW |
| Moonrise | approximately19:02:06 | 116.40° ESE |

Moonrise follows sunset by approximately22minutes26seconds. At20:00UT1 the
Moon is8.928° high, at126.282° azimuth, and99.100% illuminated: a nearly full
**waning gibbous**, not the prior evening crescent. Its illuminated hemisphere
and terminator orientation follow the actual Moon-to-Sun range vector. The
Sun is11.476° below the horizon then. A local hill can delay visible moonrise.

Jun20 was rejected because its Moon rises before sunset. Jun22 also qualifies
but rises about66minutes after sunset. Candidate probes and the selection
summary are preserved here alongside the accepted Jun21 data.

The runtime table contains649 samples per body at5-minute intervals, through
Julian Jun23 06:00UT1. Two independently requested off-grid tables provide191
checkpoints per body. Maximum errors against those checks:

| Quantity | Maximum discrepancy |
|---|---|
| Sun direction | 0.001254° |
| Moon direction | 0.001016° |
| Lunar illuminated fraction | 0.0000175 absolute |
| Lunar phase angle | 0.000335° |

These measure interpolation against the JPL model, not absolute historical
accuracy. Ancient Earth rotation is estimated; the model's TDB−UT1 is about
9639.4seconds here. Refraction, weather and local hill obstruction are outside
the ephemeris. Physical angular radii remain unchanged in the data.

Sources: [Horizons API documentation](https://ssd-api.jpl.nasa.gov/doc/horizons.html)
and [Horizons manual](https://ssd.jpl.nasa.gov/horizons/manual.html).
Every accepted request explicitly says `AD 0080`; bare `80` and `0080` are
unsafe because Horizons interprets them as1980.

Run `python3 scripts/generate-colosseum-ephemeris.py` for offline regeneration.
Add `--fetch` only to retrieve missing archives. `manifest.json` records raw
request/response hashes, generated-data and independent-oracle hashes, measured
errors and event times. Astronomy regression tests verify the rise-after-set
ordering, new phase, compass, independent positions, reverse seek and calendar.

All prior Jun10 evidence remains in
`artifacts/colosseum-celestial-2026-09-20/ephemeris/`.
Reproduce that original runtime table without changing current data or old
evidence with:

```sh
python3 scripts/generate-colosseum-ephemeris.py --scenario crescent --data-output /tmp/colosseum-crescent-reproduction.ts
```
