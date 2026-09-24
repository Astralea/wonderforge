"""Read-only external evidence; writes only this research directory."""
from pathlib import Path
import hashlib
import json
import urllib.parse
import urllib.request

out = Path(__file__).parent
sources = [
    ('lroc_color_2k.jpg', 'https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_2k.jpg'),
    ('lroc_color_poles_1k.jpg', 'https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_poles_1k.jpg'),
]
inventory = []
for name, url in sources:
    path = out / name
    if not path.exists():
        with urllib.request.urlopen(url, timeout=45) as response:
            path.write_bytes(response.read())
    inventory.append({'file': name, 'url': url, 'bytes': path.stat().st_size, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})

params = {
    'format': 'json', 'COMMAND': "'301'", 'EPHEM_TYPE': "'OBSERVER'", 'CENTER': "'coord@399'",
    'COORD_TYPE': "'GEODETIC'", 'SITE_COORD': "'12.4922,41.8902,0.025'",
    'QUANTITIES': "'2,4,14,17,32'", 'APPARENT': "'AIRLESS'", 'ANG_FORMAT': "'DEG'",
    'CAL_FORMAT': "'BOTH'", 'CAL_TYPE': "'MIXED'", 'TIME_TYPE': "'UT'",
    'CSV_FORMAT': "'YES'", 'EXTRA_PREC': "'YES'", 'TIME_DIGITS': "'FRACSEC'",
    'START_TIME': "'AD 0080-Jun-21 19:00'", 'STOP_TIME': "'AD 0080-Jun-21 20:15'", 'STEP_SIZE': "'15 m'",
}
endpoint = dict(params, START_TIME="'AD 0080-Jun-21 20:09'", STOP_TIME="'AD 0080-Jun-21 20:10'", STEP_SIZE="'1 m'")
for name, query in [('moon-orientation', params), ('moon-endpoint', endpoint)]:
    url = 'https://ssd.jpl.nasa.gov/api/horizons.api?' + urllib.parse.urlencode(query)
    request = out / f'{name}.request.json'
    response = out / f'{name}.response.json'
    if not request.exists():
        request.write_text(json.dumps({'url': url, 'parameters': query}, indent=2) + '\n')
    if not response.exists():
        with urllib.request.urlopen(url, timeout=60) as incoming:
            response.write_bytes(incoming.read())
    payload = json.loads(response.read_text())
    text = payload.get('result', payload.get('error', 'Missing result'))
    if 'Start time      : A.D. 0080-Jun-21' not in text or '$$SOE' not in text:
        raise RuntimeError('Orientation probe did not return the explicitly requested AD80 epoch.')
    (out / f'{name}.txt').write_text(text)
    for path in [request, response]:
        inventory.append({'file': path.name, 'bytes': path.stat().st_size, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
    print(text[text.index('$$SOE'):text.index('$$EOE') + 5])
(out / 'provenance.json').write_text(json.dumps(inventory, indent=2) + '\n')
print(json.dumps(inventory, indent=2))
