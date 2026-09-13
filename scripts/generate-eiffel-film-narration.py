"""Generate only the six new cinematic story beats using the approved provider."""
import concurrent.futures
import hashlib
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('approved_narration', ROOT/'scripts/generate-narration.py')
narration = importlib.util.module_from_spec(spec)
spec.loader.exec_module(narration)
OUT = ROOT/'artifacts/eiffel-upper-material-chain-2026-09-08/narration'
OUT.mkdir(parents=True, exist_ok=True)
track = narration.TRACKS['eiffel']
BEATS = ['lift-prepared','lift-later','joint-prepared','joint-later','relay-prepared','relay-later']

def generate(beat):
    text = track['beats'][beat]
    raw = OUT/f'{beat}-raw.mp3'
    metadata = OUT/f'{beat}.json'
    if raw.exists() and metadata.exists():
        assert json.loads(metadata.read_text())['text'] == text, 'Cached text differs; preserve the old take separately.'
    else:
        raw.write_bytes(narration.synthesize(track['voice_id'], text, track['speed']))
    destination = narration.OUT/f"{track['prefix']}-{beat}.mp3"
    narration.normalize(raw, destination)
    row = {'captionId': 'eiffel-'+beat, 'text': text, 'voiceId': track['voice_id'],
        'model': narration.MODEL_ID, 'speed': track['speed'],
        'src': '/audio/narration/'+destination.name, 'duration': narration.duration(destination),
        'sha256': hashlib.sha256(destination.read_bytes()).hexdigest(), 'bytes': destination.stat().st_size}
    metadata.write_text(json.dumps(row, indent=2, ensure_ascii=False)+'\n')
    if row['duration'] > 7.5:
        raise RuntimeError(f'{beat}: generated speech exceeds its7.5s story window')
    print(f"{beat}: {row['duration']:.3f}s", flush=True)
    return row

with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    rows = list(pool.map(generate, BEATS))
(OUT/'manifest.json').write_text(json.dumps(rows, indent=2, ensure_ascii=False)+'\n')
