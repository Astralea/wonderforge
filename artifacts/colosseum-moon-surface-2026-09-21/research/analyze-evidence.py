"""Recompute independent scalar horizon-roll oracles from preserved Horizons text.

This uses a horizontal-coordinate formula, independently of the runtime helper's
cross-product construction. It makes no runtime/library ephemeris calls.
"""
from pathlib import Path
import csv
import json
import math

out = Path(__file__).parent
phi = math.radians(41.8902)
rows = []
for filename in ['moon-orientation.txt', 'moon-endpoint.txt']:
    raw = (out / filename).read_text()
    assert 'Start time      : A.D. 0080-Jun-21' in raw
    for fields in csv.reader(raw.split('$$SOE')[1].split('$$EOE')[0].strip().splitlines()):
        az, el = map(float, fields[6:8])
        a, h = map(math.radians, [az, el])
        # Angle of true celestial north clockwise from the local vertical.
        north_roll = math.degrees(math.atan2(
            -math.cos(phi) * math.sin(a),
            math.sin(phi) * math.cos(h) - math.cos(phi) * math.cos(a) * math.sin(h),
        ))
        p = (float(fields[10]) + 180) % 360 - 180
        rows.append({
            'sourceFile': filename,
            'calendarUt1': fields[0].strip(),
            'julianDayUt1': float(fields[1]),
            'azimuthDegrees': az,
            'elevationDegrees': el,
            'subObserverLongitudeEastDegrees': float(fields[8]),
            'subObserverLatitudeDegrees': float(fields[9]),
            'northPolePositionAngleDegrees': p,
            'lunarNorthClockwiseFromLocalUpDegrees': north_roll - p,
            'fixedBasisClockwiseFromLocalUpDegrees': north_roll + 3.85,
            'fixedPositionAngleAbsoluteErrorDegrees': abs(p + 3.85),
        })
result = {
    'axes': 'renderer: east/up/south',
    'northPoleOfDate': [0, math.sin(phi), -math.cos(phi)],
    'method': 'Scalar horizontal-coordinate projection of the true celestial pole, minus Horizons NP.ang.',
    'maxSampledFixedPositionAngleAbsoluteErrorDegrees': max(row['fixedPositionAngleAbsoluteErrorDegrees'] for row in rows),
    'rows': sorted(rows, key=lambda row: row['julianDayUt1']),
}
(out / 'orientation-analysis.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
