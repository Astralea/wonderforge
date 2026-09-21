# Colosseum Sun and Moon ephemeris

Offline JPL Horizons / DE441 observer tables at 41.8902°N, 12.4922°E,
25m altitude. Positions are apparent **AIRLESS** topocentric azimuth and
elevation. Runtime vectors use +X east, +Y up, +Z north. The primary sources are
[Horizons API](https://ssd-api.jpl.nasa.gov/doc/horizons.html) and the
[Horizons manual](https://ssd.jpl.nasa.gov/horizons/manual.html).

The selected film day is **Julian AD80-Jun10**, an authored representative date,
not a proposed dedication date. Input and output use **UT1**, not modern UTC or
Roman civil clock time. The table also covers Jun11 and early Jun12, allowing
continuous sampling and validation across midnight.

Each body has649 five-minute samples over54hours. The runtime normalizes
interpolated direction vectors, avoiding azimuth wrap errors. It derives
Moon-to-Sun illumination from apparent range vectors, so the crescent rotates
with the real relative sky directions. Physical angular radii are returned;
any cinematic enlargement is a separate presentation decision.

## Selected day

These crossings are for body centres at a flat airless horizon; local hills
can occult the bodies sooner, and refraction is not included.

| Body/event | UT1 on Julian AD80-Jun10 | Compass azimuth |
|---|---|---|
| Sun rise | approximately03:35 | 58.31° NE |
| Moon rise | approximately08:08 | 71.61° ENE |
| Sun set | approximately18:35 | 301.77° NW |
| Moon set | approximately22:06 | 285.79° WNW |

At20:00UT1 the Sun is12.24° below the horizon; the waxing crescent Moon is
22.69° high at265.95° azimuth, approximately25.96% illuminated. Its centre
darkness and bright-limb direction follow that geometry, not a fixed graphic
or an antipodal day/night arrangement.

## Numerical evidence and limits

Two additional Horizons queries provide191 independent off-grid times per
body, offset2.5minutes with17minute stepping. Compared with those requests:

| Quantity | Maximum discrepancy |
|---|---|
| Sun direction | 0.001235° |
| Moon direction | 0.000754° |
| Lunar illuminated fraction | 0.000025 absolute |
| Lunar phase angle | 0.000324° |

These errors measure interpolation and the apparent-range phase construction
against the same JPL model. They **do not** establish comparable absolute
historical accuracy. Horizons estimates ancient Earth rotation; its TDB−UT1
offset is about9639.7seconds here. Weather, atmospheric refraction and actual
Roman terrain-horizon obstruction are outside these tables.

## Reproduction

Run `python3 scripts/generate-colosseum-ephemeris.py` from the repository root.
This uses preserved responses and needs no network. `--fetch` retrieves missing
responses sequentially. The generator validates the returned year, JD range,
observer, calendar, refraction setting and DE441 source before emitting data.

`manifest.json` records each request/response hash, generated-data hash,
independent-oracle hash, errors and horizon events. The source CSV-style rows
remain embedded in the raw `.response.json` archives. The current pure sampler
passes all7 tests in `tests/colosseum-astronomy.test.ts`.

Two exploratory requests are deliberately retained as rejected evidence:
`probe-june-moon` and `probe-ad80-june-moon` requested bare `80` and `0080`;
Horizons silently interpreted both as1980. Neither contributes runtime data.
**Explicit `AD 0080` is required.** The valid month-selection probe starts with
`probe-explicit-ad80-june-moon`.
