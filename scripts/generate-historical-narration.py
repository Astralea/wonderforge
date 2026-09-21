#!/usr/bin/env python3
"""Generate the reviewed Giza, Stonehenge and Colosseum chapters from typed data.

Uses the approved ElevenLabs generator. Preserves previous audio and raw takes;
only a successful fit writes new runtime metadata. Optional arguments are wonder
IDs (or giza); default regenerates/caches all three. Requires Node 22+ in PATH.
"""
from __future__ import annotations
import concurrent.futures
import hashlib
import importlib.util
import json
import math
import re
from pathlib import Path
import subprocess
import sys
import tempfile
import threading

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts/chapters-history-2026-09-21/narration'
OUT.mkdir(parents=True, exist_ok=True)
spec = importlib.util.spec_from_file_location('approved_narration', ROOT / 'scripts/generate-narration.py')
approved = importlib.util.module_from_spec(spec)
spec.loader.exec_module(approved)
WONDERS = ['pyramids-of-giza', 'stonehenge', 'colosseum']
requested = list(dict.fromkeys({'giza':'pyramids-of-giza'}.get(value, value) for value in sys.argv[1:])) or WONDERS
if any(value not in WONDERS for value in requested):
    raise SystemExit('Expected giza, pyramids-of-giza, stonehenge or colosseum')

# Compile the actual pure TypeScript data instead of parsing or duplicating prose.
entry = """
import { captionsFor } from './src/data/captions';
import { getWonder } from './src/data';
import { HISTORICAL_NARRATION_VOICES, HISTORICAL_NARRATION_SPEED } from './src/data/narration';
console.log(JSON.stringify(Object.entries(HISTORICAL_NARRATION_VOICES)
  .map(([id, voice]) => ({wonderId:id, voice, speed:HISTORICAL_NARRATION_SPEED, beats:captionsFor(getWonder(id))}))));
"""
with tempfile.TemporaryDirectory(prefix='wonder-chapter-export-') as temp:
    bundle = Path(temp)/'chapters.mjs'
    subprocess.run([str(ROOT/'node_modules/.bin/esbuild'), '--bundle', '--platform=node',
                    '--format=esm', '--loader=ts', f'--outfile={bundle}', '--log-level=error'],
                   input=entry, text=True, cwd=ROOT, check=True)
    tracks = json.loads(subprocess.check_output(['node', str(bundle)], text=True))
(OUT/'source-snapshot.json').write_text(json.dumps(tracks, indent=2, ensure_ascii=False)+'\n')

blocked = threading.Event()
MASTER_VERSION = 'measured-limiter-v1'

def loudness(path):
    result = subprocess.run([
        'ffmpeg', '-hide_banner', '-nostats', '-i', str(path),
        '-af', 'loudnorm=I=-16:TP=-1.5:LRA=7:print_format=json',
        '-f', 'null', '-',
    ], capture_output=True, text=True, check=True)
    stats = json.loads(re.search(r'\{\s*"input_i".*?\}', result.stderr, re.S).group())
    measured = {key: float(stats[key]) for key in ['input_i', 'input_tp']}
    if not all(math.isfinite(value) for value in measured.values()):
        raise RuntimeError(f'Non-finite loudness: {path.name}')
    return measured

def master(raw, destination):
    # Work from the original take each time; never cascade lossy encodings.
    gain = -16 - loudness(raw)['input_i']
    with tempfile.TemporaryDirectory(prefix='wonder-voice-master-') as temp:
        candidate = Path(temp)/'master.mp3'
        for _ in range(8):
            # A -2 dB limiter ceiling leaves headroom for MP3 encoding overshoot.
            filters = (f'aresample=192000,volume={gain:.6f}dB,'
                       'alimiter=limit=0.7943282347:level=false:attack=5:release=50:latency=true,'
                       'aresample=44100')
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(raw), '-af', filters,
                            '-c:a', 'libmp3lame', '-b:a', '128k', '-ar', '44100', '-ac', '1',
                            str(candidate)], check=True)
            measured = loudness(candidate)
            if abs(measured['input_i'] + 16) <= .3 and measured['input_tp'] <= -1.5:
                destination.write_bytes(candidate.read_bytes())
                return dict(version=MASTER_VERSION, integratedLufs=measured['input_i'],
                            truePeakDbtp=measured['input_tp'], gainDb=round(gain, 6))
            gain += -16 - measured['input_i']
    raise RuntimeError(f'Master does not meet loudness/peak targets: {raw.name}')

def generate(item):
    track, beat = item
    settings = dict(approved.BASE_SETTINGS, speed=track['speed'])
    request = dict(text=beat['text'], provider='ElevenLabs', voiceId=track['voice']['voiceId'],
                   model=approved.MODEL_ID, settings=settings)
    digest = hashlib.sha256(json.dumps(request,sort_keys=True).encode()).hexdigest()[:12]
    voice_slug = re.sub(r"[^a-z0-9]+", "-", track["voice"]["name"].lower()).strip("-")
    raw_name = f"{beat['id']}-{voice_slug}-{digest}"
    raw = OUT/f'{raw_name}-raw.mp3'
    request_path = OUT/f'{raw_name}-request.json'
    master_digest = hashlib.sha256(json.dumps(dict(request=request, mastering=MASTER_VERSION), sort_keys=True).encode()).hexdigest()[:12]
    name = f"{beat['id']}-{voice_slug}-{master_digest}"
    if raw.exists():
        if not request_path.exists() or json.loads(request_path.read_text()) != request:
            raise RuntimeError(f'Unverified raw cache: {name}')
    else:
        if blocked.is_set():
            raise RuntimeError('Provider stopped; cached takes preserved')
        try:
            data = approved.synthesize(request['voiceId'], request['text'], settings['speed'])
        except SystemExit as error:
            blocked.set()
            raise RuntimeError(str(error)) from error
        raw.write_bytes(data)
        request_path.write_text(json.dumps(request,indent=2,ensure_ascii=False)+'\n')
    destination = approved.OUT/f'{name}.mp3'
    prior_metadata = OUT/f'{name}.json'
    if destination.exists() and prior_metadata.exists():
        metadata = json.loads(prior_metadata.read_text())
        expected_hash = metadata['sha256']
        if hashlib.sha256(destination.read_bytes()).hexdigest() != expected_hash:
            raise RuntimeError(f'Existing normalized audio changed: {name}; preserve and inspect it')
        mastering = metadata['mastering']
    elif destination.exists():
        raise RuntimeError(f'Unverified normalized audio: {name}; preserve and inspect it')
    else:
        mastering = master(raw, destination)
    measured = approved.duration(destination)
    window = (beat['until']-beat['from'])*60
    row = dict(wonderId=track['wonderId'], captionId=beat['id'], captionText=beat['text'],
               src='/audio/narration/'+destination.name, duration=measured, volume=1,
               voiceName=track['voice']['name'], voiceId=request['voiceId'],
               provider=request['provider'], model=request['model'], settings=settings,
               windowSeconds=round(window,6), sha256=hashlib.sha256(destination.read_bytes()).hexdigest(),
               bytes=destination.stat().st_size, mastering=mastering)
    (OUT/f'{name}.json').write_text(json.dumps(row,indent=2,ensure_ascii=False)+'\n')
    print(f"{beat['id']}: {measured:.3f}s / {window:.3f}s", flush=True)
    if measured + .4 > window + 1e-8:
        raise RuntimeError(f"{beat['id']}: needs {measured+.4:.3f}s including tail; window {window:.3f}s")
    return row

items = [(track,beat) for track in tracks if track['wonderId'] in requested for beat in track['beats']]
generated = []
failures = []
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    futures = {pool.submit(generate, item): item[1]['id'] for item in items}
    for future in concurrent.futures.as_completed(futures):
        try:
            generated.append(future.result())
        except Exception as error:
            failures.append({'captionId': futures[future], 'reason': str(error)})
manifest = OUT/'manifest.json'
previous = json.loads(manifest.read_text()) if manifest.exists() else []
completed = {row['captionId'] for row in generated}
current = {beat['id']: dict(beat, voiceId=track['voice']['voiceId'], model=track['voice']['model'], settings=dict(approved.BASE_SETTINGS, speed=track['speed'])) for track in tracks for beat in track['beats']}
def still_valid(row):
    beat = current.get(row['captionId'])
    return beat is not None and beat['text'] == row['captionText'] and beat['voiceId'] == row['voiceId'] and beat['model'] == row['model'] and beat['settings'] == row['settings'] and row.get('mastering', {}).get('version') == MASTER_VERSION and row['duration'] + .4 <= (beat['until']-beat['from'])*60 + 1e-8
rows = [row for row in previous if row['captionId'] not in completed and still_valid(row)]+generated
order = {beat['id']:i for i,beat in enumerate(beat for track in tracks for beat in track['beats'])}
rows.sort(key=lambda row:order[row['captionId']])
manifest.write_text(json.dumps(rows,indent=2,ensure_ascii=False)+'\n')
(ROOT/'src/data/historicalNarration.generated.ts').write_text(
    '/** Generated by scripts/generate-historical-narration.py; do not edit. */\n'
    "import type { HistoricalNarrationAsset } from './historicalNarrationAssets';\n"
    'export const HISTORICAL_NARRATION_ASSETS: readonly HistoricalNarrationAsset[] = '+json.dumps(rows,indent=2,ensure_ascii=False)+';\n')
print(f'Bound {len(rows)} measured clips; previous assets preserved.',flush=True)

(OUT/'generation-status.json').write_text(json.dumps({'generated':len(rows), 'expected':sum(len(track['beats']) for track in tracks), 'failures':failures},indent=2)+'\n')
if failures:
    raise SystemExit(f'{len(failures)} clips remain unavailable; see generation-status.json. No stale narration was bound.')
