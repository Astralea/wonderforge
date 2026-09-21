#!/usr/bin/env python3
"""Rebuild Rome's offline ephemeris from archived Horizons responses.

Default: regenerate the Jun21 moonrise, with no network. --fetch fills missing
request/response pairs sequentially. --scenario crescent reproduces the earlier
Jun10 selection; use --data-output /tmp/colosseum-crescent.ts to retain current runtime data.
The runtime never calls Horizons. Explicit AD is mandatory: Horizons interprets
both bare '80' and '0080' as 1980, so headers AND returned JDs are validated.
"""
import argparse
import csv
import hashlib
import json
import math
from pathlib import Path
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts/colosseum-moonrise-2026-09-20/ephemeris'
GENERATED = ROOT / 'src/data/colosseumEphemeris.generated.ts'
START_JD = 1750449.5
END_JD = 1750451.75
START_CAL = '0080-Jun-21'
END_CAL = '0080-Jun-23'
DATE_SLUG = 'jun21-23'
API = 'https://ssd.jpl.nasa.gov/api/horizons.api'
BASE_PARAMS = {
    'format': 'json', 'EPHEM_TYPE': "'OBSERVER'", 'CENTER': "'coord@399'",
    'COORD_TYPE': "'GEODETIC'", 'SITE_COORD': "'12.4922,41.8902,0.025'",
    'QUANTITIES': "'4,10,13,20,23,24,30'", 'APPARENT': "'AIRLESS'",
    'CAL_FORMAT': "'BOTH'", 'CAL_TYPE': "'MIXED'", 'TIME_TYPE': "'UT'",
    'CSV_FORMAT': "'YES'", 'EXTRA_PREC': "'YES'", 'RANGE_UNITS': "'KM'",
    'SUPPRESS_RANGE_RATE': "'YES'", 'TIME_DIGITS': "'FRACSEC'",
}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def request_pair(name, body, oracle=False, fetch=False):
    params = dict(BASE_PARAMS, COMMAND=f"'{body}'")
    params.update({
        'START_TIME': f"'AD {START_CAL} 00:02:30'" if oracle else f"'AD {START_CAL} 00:00'",
        'STOP_TIME': f"'AD {END_CAL} 05:59:30'" if oracle else f"'AD {END_CAL} 06:00'",
        'STEP_SIZE': "'17 m'" if oracle else "'5 m'",
    })
    prefix = 'oracle-off-grid' if oracle else 'grid'
    path = OUT / f'{prefix}-{DATE_SLUG}-{name}'
    request_path = path.with_suffix('.request.json')
    response_path = path.with_suffix('.response.json')
    if request_path.exists():
        assert json.loads(request_path.read_text())['parameters'] == params, f'Request mismatch: {path}'
    if not request_path.exists() or not response_path.exists():
        if not fetch:
            raise RuntimeError(f'Missing archive {path}; use --fetch to query Horizons.')
        url = API + '?' + urllib.parse.urlencode(params)
        request_path.write_text(json.dumps({'url': url, 'parameters': params}, indent=2) + '\n')
        with urllib.request.urlopen(url, timeout=90) as response:
            response_path.write_bytes(response.read())
    payload = json.loads(response_path.read_text())
    if 'error' in payload:
        raise RuntimeError(payload['error'])
    text = payload['result']
    assert f'Start time      : A.D. {START_CAL}' in text, 'Rejected wrong year; do not omit AD.'
    assert '{source: DE441}' in text
    assert 'Atmos refraction: NO (AIRLESS)' in text
    assert 'Calendar mode   : Mixed Julian/Gregorian' in text
    assert 'Center geodetic : 12.4922, 41.8902, .025' in text
    rows = list(csv.reader(text.split('$$SOE\n')[1].split('$$EOE')[0].strip().splitlines()))
    parsed = [{
        'calendarUt1': r[0].strip(), 'jd': float(r[1]), 'azimuthDegrees': float(r[4]),
        'elevationDegrees': float(r[5]), 'illuminatedFraction': float(r[6]) / 100,
        'angularRadiusDegrees': float(r[7]) / 7200, 'distanceKm': float(r[8]),
        'elongationDegrees': float(r[9]), 'waxing': r[10].strip() == '/T',
        'phaseAngleDegrees': float(r[11]), 'deltaTSeconds': float(r[12]),
    } for r in rows]
    assert all(START_JD <= r['jd'] <= END_JD and r['calendarUt1'].startswith('0080-') for r in parsed)
    return parsed, {
        'request': str(request_path.relative_to(ROOT)), 'requestSha256': digest(request_path),
        'response': str(response_path.relative_to(ROOT)), 'responseSha256': digest(response_path),
        'rowCount': len(parsed), 'target': body, 'independentOffGridQuery': oracle,
    }


def direction(azimuth, elevation):
    az, el = math.radians(azimuth), math.radians(elevation)
    return [math.sin(az) * math.cos(el), math.sin(el), math.cos(az) * math.cos(el)]


def normalize(v):
    length = math.hypot(*v)
    return [x / length for x in v]


def interpolate_body(a, b, t):
    da = direction(a['azimuthDegrees'], a['elevationDegrees'])
    db = direction(b['azimuthDegrees'], b['elevationDegrees'])
    return normalize([x + (y - x) * t for x, y in zip(da, db)])


def angular_error(a, b):
    # atan2 avoids losing sub-arcsecond precision near acos(1).
    cross = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
    return math.degrees(math.atan2(math.hypot(*cross), sum(x * y for x, y in zip(a, b))))


def accuracy(grid_sun, grid_moon, oracle_sun, oracle_moon):
    peaks = dict(sunDirectionDegrees=0, moonDirectionDegrees=0,
                 illuminatedFractionAbsolute=0, phaseAngleDegrees=0)
    cases = []
    for os, om in zip(oracle_sun, oracle_moon):
        assert os['jd'] == om['jd']
        position = (os['jd'] - START_JD) * 1440 / 5
        i = min(len(grid_sun) - 2, int(position))
        t = position - i
        sd = interpolate_body(grid_sun[i], grid_sun[i + 1], t)
        md = interpolate_body(grid_moon[i], grid_moon[i + 1], t)
        sr = grid_sun[i]['distanceKm'] + (grid_sun[i + 1]['distanceKm'] - grid_sun[i]['distanceKm']) * t
        mr = grid_moon[i]['distanceKm'] + (grid_moon[i + 1]['distanceKm'] - grid_moon[i]['distanceKm']) * t
        light = normalize([s * sr - m * mr for s, m in zip(sd, md)])
        cosine = max(-1, min(1, -sum(m * l for m, l in zip(md, light))))
        errors = {
            'sunDirectionDegrees': angular_error(sd, direction(os['azimuthDegrees'], os['elevationDegrees'])),
            'moonDirectionDegrees': angular_error(md, direction(om['azimuthDegrees'], om['elevationDegrees'])),
            'illuminatedFractionAbsolute': abs((1 + cosine) / 2 - om['illuminatedFraction']),
            'phaseAngleDegrees': abs(math.degrees(math.acos(cosine)) - om['phaseAngleDegrees']),
        }
        for key, value in errors.items():
            peaks[key] = max(peaks[key], value)
        cases.append({'julianDayUt1': os['jd'], 'sun': os, 'moon': om})
    assert peaks['sunDirectionDegrees'] < 0.002
    assert peaks['moonDirectionDegrees'] < 0.003
    assert peaks['illuminatedFractionAbsolute'] < 0.0001
    assert peaks['phaseAngleDegrees'] < 0.015
    return peaks, cases


def horizon_events(rows):
    events = []
    for a, b in zip(rows, rows[1:]):
        x, y = a['elevationDegrees'], b['elevationDegrees']
        if x * y < 0:
            t = -x / (y - x)
            jd = a['jd'] + (b['jd'] - a['jd']) * t
            az = (a['azimuthDegrees'] + ((b['azimuthDegrees'] - a['azimuthDegrees'] + 180) % 360 - 180) * t) % 360
            events.append({'event': 'rise' if y > x else 'set', 'julianDayUt1': jd,
                           'hoursFromStartMidnightUt1': (jd - START_JD) * 24,
                           'azimuthDegrees': az})
    return events


def main():
    global OUT, GENERATED, START_JD, END_JD, START_CAL, END_CAL, DATE_SLUG
    args = argparse.ArgumentParser(description=__doc__)
    args.add_argument('--fetch', action='store_true', help='Fetch missing archives, sequentially.')
    args.add_argument('--scenario', choices=['moonrise', 'crescent'], default='moonrise')
    args.add_argument('--data-output', type=Path, help='Optional generated-data destination for reproducing an old scenario.')
    options = args.parse_args()
    if options.scenario == 'crescent':
        OUT = ROOT / 'artifacts/colosseum-celestial-2026-09-20/ephemeris'
        START_JD, END_JD = 1750438.5, 1750440.75
        START_CAL, END_CAL, DATE_SLUG = '0080-Jun-10', '0080-Jun-12', 'jun10-12'
    if options.data_output:
        GENERATED = options.data_output.resolve()
    OUT.mkdir(parents=True, exist_ok=True)
    sun, sun_source = request_pair('sun', '10', fetch=options.fetch)
    moon, moon_source = request_pair('moon', '301', fetch=options.fetch)
    oracle_sun, oracle_sun_source = request_pair('sun', '10', oracle=True, fetch=options.fetch)
    oracle_moon, oracle_moon_source = request_pair('moon', '301', oracle=True, fetch=options.fetch)
    assert len(sun) == len(moon) == 649
    for i, (s, m) in enumerate(zip(sun, moon)):
        assert abs(s['jd'] - (START_JD + i * 5 / 1440)) < 1e-8
        assert s['jd'] == m['jd']
    lines = []
    for s, m in zip(sun, moon):
        row = [s['azimuthDegrees'], s['elevationDegrees'], round(s['distanceKm'], 3),
               round(s['angularRadiusDegrees'], 9), m['azimuthDegrees'], m['elevationDegrees'],
               round(m['distanceKm'], 3), round(m['angularRadiusDegrees'], 9),
               round(m['illuminatedFraction'], 8), m['phaseAngleDegrees'], m['elongationDegrees'],
               int(m['waxing']), m['deltaTSeconds']]
        lines.append('  ' + json.dumps(row, separators=(',', ':')) + ',')
    GENERATED.write_text(
        '// Generated by scripts/generate-colosseum-ephemeris.py; do not hand edit.\n'
        f'// JPL Horizons DE441, Rome, Julian AD80-Jun{START_CAL[-2:]} 00:00 to Jun{END_CAL[-2:]} 06:00 UT1, 5-minute spacing.\n'
        "import type { ColosseumEphemerisRow } from './colosseumEphemeris';\n\n"
        'export const COLOSSEUM_EPHEMERIS_ROWS: readonly ColosseumEphemerisRow[] = [\n'
        + '\n'.join(lines) + '\n];\n')
    peaks, cases = accuracy(sun, moon, oracle_sun, oracle_moon)
    if options.data_output:
        # An old-scenario reproduction must not rewrite accepted evidence or
        # redirect its manifest to a temporary generated-data destination.
        print(json.dumps({'generated': str(GENERATED), 'sha256': digest(GENERATED),
                          'maximumErrors': peaks, 'evidencePreserved': True}, indent=2))
        return
    oracle_path = OUT / 'off-grid-oracle.json'
    oracle_path.write_text(json.dumps({'description': 'Independently requested times, not derived from the runtime grid.',
                                      'cases': cases}, indent=2) + '\n')
    manifest = {
        'source': 'JPL Horizons / DE441', 'api': API, 'scenario': options.scenario,
        'documentation': ['https://ssd-api.jpl.nasa.gov/doc/horizons.html', 'https://ssd.jpl.nasa.gov/horizons/manual.html'],
        'observer': {'latitudeDegrees': 41.8902, 'longitudeDegreesEast': 12.4922, 'altitudeMetres': 25},
        'calendar': 'Julian (Horizons MIXED before1582)', 'timeScale': 'UT1, not UTC',
        'coordinates': 'Apparent AIRLESS topocentric azimuth/elevation; east/up/north world vectors',
        'startJulianDay': START_JD, 'endJulianDay': END_JD, 'stepMinutes': 5, 'rowCount': len(sun),
        'limitations': [
            'Authored representative dates; no dedication date or observed historical weather claim.',
            f'Ancient Earth rotation is reconstructed; JPL TDB-UT1 around{sun[0]["deltaTSeconds"]:.1f}seconds is an estimate. Interpolation accuracy is not absolute historical accuracy.',
            'No atmospheric refraction, terrain-horizon obstruction or weather extinction in the ephemeris.',
            'Moon lightDirection uses apparent range vectors at observer time; few-arcsecond difference from Horizons reflection-time phase is measured below.',
            'Physical angular radii are preserved in data; any presentation enlargement must be declared separately.',
        ],
        'archives': [sun_source, moon_source, oracle_sun_source, oracle_moon_source],
        'runtimeData': str(GENERATED.relative_to(ROOT)) if GENERATED.is_relative_to(ROOT) else str(GENERATED),
        'runtimeDataSha256': digest(GENERATED),
        'oracle': str(oracle_path.relative_to(ROOT)), 'oracleSha256': digest(oracle_path),
        'validation': {'independentOffGridSamplesPerBody': len(cases), 'maximumErrors': peaks},
        'events': {'definition': 'Airless centre crosses flat astronomical horizon; interpolated within5min rows.',
                   'sun': horizon_events(sun), 'moon': horizon_events(moon)},
        'dateParsingEvidence': 'artifacts/colosseum-celestial-2026-09-20/ephemeris/manifest.json records the rejected bare80/0080 probes. All accepted requests use explicit AD0080.',
    }
    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps({'generated': str(GENERATED), 'bytes': GENERATED.stat().st_size,
                      'maximumErrors': peaks, 'events': manifest['events']}, indent=2))


if __name__ == '__main__':
    main()
