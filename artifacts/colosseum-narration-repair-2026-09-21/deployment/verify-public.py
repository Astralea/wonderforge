"""Verify the deployed build and selected narration bytes using public HTTP."""
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
from pathlib import Path
import json
import re
import subprocess

OUT = Path(__file__).resolve().parent
BASE = 'https://wonderforge.pages.dev'

def fetch(path, name):
    destination = OUT / name
    headers = destination.with_suffix(destination.suffix + '.headers')
    result = subprocess.run([
        'curl', '--fail', '--silent', '--show-error', '--location',
        '--retry', '2', '--max-time', '90', '--dump-header', str(headers),
        '--output', str(destination), BASE + path,
    ], check=True, capture_output=True)
    data = destination.read_bytes()
    raw_headers = headers.read_text()
    parsed_headers = dict((key.lower(), value.strip()) for key, value in
        re.findall(r'^([^:\r\n]+):\s*([^\r\n]*)', raw_headers, re.M))
    return data, parsed_headers

expected_html = Path('dist/index.html').read_text()
bundle = re.search(r'/assets/main-[^" ]+\.js', expected_html).group()
html, home_headers = fetch('/', 'live-index.html')
assert bundle in html.decode(), 'Production still serves a different bundle'
for marker in ['og:title', 'og:image', 'twitter:card', 'summary_large_image']:
    assert marker in html.decode(), f'Missing social metadata: {marker}'
js, js_headers = fetch(bundle, 'live-main.js')
assert js == Path('dist' + bundle).read_bytes(), 'Bundle byte mismatch'
assert 'immutable' in js_headers.get('cache-control', '')
assert 'nosniff' == js_headers.get('x-content-type-options')

source = Path('src/data/historicalNarration.generated.ts').read_text()
assets = json.loads(source[source.index('[\n'):source.rfind(']') + 1])
assert len(assets) == 18
assert not any(asset['captionId'] == 'colosseum-moonrise' for asset in assets)
assert b'After sunset, a nearly full Moon rises over Rome.' not in js
assert b'Moonrise over Rome' not in js
assert b'Construction began under Vespasian. Titus opened the amphitheatre in AD 80.' in js
assert b'Vaulted passages support the tiers of seating.' in js

def verify_audio(asset):
    data, headers = fetch(asset['src'], Path(asset['src']).name)
    digest = sha256(data).hexdigest()
    assert digest == asset['sha256'], f"Wrong audio bytes: {asset['src']}"
    assert len(data) == asset['bytes']
    assert headers.get('content-type', '').startswith('audio/')
    assert 'must-revalidate' in headers.get('cache-control', '')
    assert asset['voiceId'] in js.decode()
    return {key: asset[key] for key in ['wonderId', 'captionId', 'src', 'voiceName', 'voiceId', 'sha256', 'bytes']}

with ThreadPoolExecutor(max_workers=4) as pool:
    checked_audio = list(pool.map(verify_audio, assets))

image, image_headers = fetch('/brand/wonderforge-wordmark.png', 'live-social.png')
assert image == Path('dist/brand/wonderforge-wordmark.png').read_bytes()
assert image_headers.get('content-type', '').startswith('image/png')
assert 'must-revalidate' in image_headers.get('cache-control', '')

model = sorted(Path('dist/models').rglob('*.glb'), key=lambda p: p.stat().st_size)[0]
model_path = '/' + str(model.relative_to('dist'))
model_data, model_headers = fetch(model_path, 'live-model.glb')
assert model_data == model.read_bytes()
assert 'must-revalidate' in model_headers.get('cache-control', '')

result = {
    'url': BASE + '/', 'bundle': bundle, 'bundleSha256': sha256(js).hexdigest(),
    'bundleBytesMatch': True, 'narrationAssetsVerified': len(checked_audio),
    'narration': checked_audio, 'socialMetadataVerified': True,
    'socialImageBytesMatch': True, 'sampleModel': model_path,
    'sampleModelBytesMatch': True, 'homeHeaders': home_headers,
    'bundleHeaders': js_headers, 'socialImageHeaders': image_headers,
    'modelHeaders': model_headers,
}
lunar = next(Path('dist/assets').glob('lroc-color-poles-1k-*.jpg'))
lunar_path = '/' + str(lunar.relative_to('dist'))
lunar_data, lunar_headers = fetch(lunar_path, 'live-moon.jpg')
assert lunar_path in js.decode(), 'Lunar image is not referenced by public bundle'
assert lunar_data == lunar.read_bytes()
assert len(lunar_data) == 139068
assert sha256(lunar_data).hexdigest() == 'b246064f217f8d479df78c49c7c8595a8f5fbda008a72fd539978d2e121e0109'
assert lunar_headers.get('content-type', '').startswith('image/jpeg')
assert 'immutable' in lunar_headers.get('cache-control', '')
assert "NASA's Scientific Visualization Studio" in js.decode()
result.update({'lunarImage': lunar_path, 'lunarImageSha256': sha256(lunar_data).hexdigest(),
    'lunarImageBytesMatch': True, 'lunarImageBytes': len(lunar_data),
    'lunarCreditIncluded': True, 'lunarImageHeaders': lunar_headers})
(OUT / 'public-verification.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({key: result[key] for key in ['url', 'bundle', 'bundleBytesMatch', 'narrationAssetsVerified', 'socialMetadataVerified', 'socialImageBytesMatch', 'sampleModelBytesMatch']}, indent=2))
