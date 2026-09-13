#!/usr/bin/env python3
"""Generate preserved Lyria Pro chapters, then assemble both Eiffel film editions.

Run with uv run --with google-genai python scripts/generate-eiffel-edition-scores.py.
Existing takes are cached; --assemble makes no generation request. No repeated
audio or silent padding is used to fill either delivery.
"""
from __future__ import annotations
import argparse
import concurrent.futures
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts/soundtrack/eiffel-tower/editions-2026-09-08'
SPEC = importlib.util.spec_from_file_location('wonder_score', ROOT / 'scripts/generate-soundtrack.py')
music = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = music
SPEC.loader.exec_module(music)
MODEL = 'lyria-3-pro-preview'
DETAILED_SECONDS = 829.4267707038563
CHAPTERS = [
    ('01-morning', 'Morning on the Champ de Mars. Begin with spacious high strings and woodwind conversation. Over three minutes unfold several contrasting lyrical phrases, with a very gentle walking pulse arriving halfway through. End quietly, open and unresolved, ready for the next chapter.'),
    ('02-hands', 'The craftsmen at work. Chamber strings, pizzicato answering legato viola and clarinet, occasional warm horn. A patient, intimate movement with changing orchestration and alternating quiet passages. Develop new phrases, never an ostinato loop. End delicately without a final cadence.'),
    ('03-pylons', 'Four pylons join into one tower. Broaden from string quartet intimacy into a modest civic ensemble. Warm horns and woodwinds answer rising violins. Include a spacious central release and a renewed lyrical passage. End in a sustained, gentle transition.'),
    ('04-above-paris', 'Above the rooftops of Paris. Aerial lightness, graceful woodwind solos and divided strings. Three contrasting evolving sections, with longer breathing spaces and a restrained sense of height. Keep the final seconds warm and open for a concluding movement.'),
    ('05-lanterns', 'The completed tower and the evening city. Begin with quiet reflective strings, gather into a dignified restrained civic brass melody, then return to an intimate salon cadence. A full three-minute finale whose final twenty seconds resolve gently into a natural decaying chord.'),
    ('06-short-film', 'A complete three-minute miniature: 0–25s dawn and open space; 25–65s intimate craftsmen with evolving string and woodwind phrases; 65–110s broadening pylons and patient modest brass; 110–150s airy upper tower and Paris rooftops; 150–180s a warm restrained completion cadence with a natural decaying final chord. Distinct musical sections, a coherent beginning, development and ending.'),
]
STYLE = '''Create exactly 180 seconds of instrumental music for a cinematic film
of the Eiffel Tower being built in Paris, 1887–1889. Late nineteenth-century
French salon strings, woodwinds, harp or piano as occasional colour, restrained
civic brass. Original respectful speculative scoring, not a historical claim.
Keep a shared warm D-major/B-minor tonal world, roughly 72 BPM where a pulse is
present, natural chamber-hall sound, room for spoken documentary narration.
Continuously develop the music; do not repeat a short loop or the same bar.
No voice, vocals, choir, lyrics, accordion, musette, can-can, cabaret, jazz,
synthesizer, electric guitar, trailer percussion, or hammer-and-anvil beat.
Do not imitate an existing composition or Civilization soundtrack.
'''

def duration(path):
    return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries',
        'format=duration', '-of', 'default=nw=1:nk=1', str(path)], text=True))

def generate(chapter):
    name, brief = chapter
    target = OUT / f'{name}-raw.mp3'
    if target.exists():
        print(f'cached {name}: {duration(target):.3f}s', flush=True)
        return target
    prompt = STYLE + '\n' + brief
    (OUT / f'{name}-prompt.txt').write_text(prompt + '\n')
    print(f'generating {name}', flush=True)
    with music.genai.Client(enterprise=True, project=music.PROJECT, location=music.LOCATION) as client:
        response = client.models.generate_content(model=MODEL, contents=prompt,
            config=music.types.GenerateContentConfig(response_modalities=['AUDIO', 'TEXT']))
    audio, notes = music.extract_audio(response)
    target.write_bytes(audio)
    (OUT / f'{name}-generation.json').write_text(json.dumps({
        'model': MODEL, 'location': music.LOCATION, 'prompt': prompt,
        'model_text': notes, 'duration': duration(target),
        'sha256': hashlib.sha256(audio).hexdigest(),
        'provenance': 'Lyria 3 Pro via Google Gen AI SDK on Vertex AI; raw model response preserved.',
    }, indent=2, ensure_ascii=False)+'\n')
    print(f'completed {name}: {duration(target):.3f}s', flush=True)
    return target

def assemble():
    sources = [OUT / f'{name}-raw.mp3' for name, _ in CHAPTERS]
    if not all(p.exists() for p in sources):
        raise RuntimeError('All six source recordings are required for assembly.')
    # Balance sections before equal-power crossfades. No source is repeated.
    balanced = []
    for source in sources:
        target = OUT / source.name.replace('-raw.mp3', '-balanced.wav')
        if not target.exists():
            gain = -18 - music.measure_lufs(source)
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(source),
                '-af', f'volume={gain:.4f}dB', '-ar', '48000', '-ac', '2', str(target)], check=True)
        balanced.append(target)
    joined_length = sum(duration(p) for p in balanced[:5]) - 4*5
    if joined_length < DETAILED_SECONDS:
        raise RuntimeError(f'Only {joined_length}s of distinct music: do not loop or pad the detailed score.')
    if not .8 <= duration(balanced[5])/180 <= 1.1:
        raise RuntimeError('Short score needs more than the allowed pitch-preserving tempo adjustment.')
    chain = []
    current = '0:a'
    for i in range(1, 5):
        label = f'join{i}'
        chain.append(f'[{current}][{i}:a]acrossfade=d=5:c1=qsin:c2=qsin[{label}]')
        current = label
    # Slightly accelerate/slow the complete long arc so its real ending lands
    # on the film's final frame; preserve pitch and the unique closing cadence.
    rate = joined_length / DETAILED_SECONDS
    chain.append(f'[{current}]atempo={rate:.12f},atrim=0:{DETAILED_SECONDS},afade=t=in:d=1.5,afade=t=out:st={DETAILED_SECONDS-2}:d=2[out]')
    detailed = ROOT / 'public/audio/eiffel-tower-detailed.mp3'
    command = ['ffmpeg', '-v', 'error', '-y']
    for p in balanced[:5]: command += ['-i', str(p)]
    subprocess.run(command + ['-filter_complex', ';'.join(chain), '-map', '[out]',
        '-c:a', 'libmp3lame', '-q:a', '4', str(detailed)], check=True)
    short = ROOT / 'public/audio/eiffel-tower-short.mp3'
    short_rate = duration(balanced[5])/180
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(balanced[5]),
        '-af', f'atempo={short_rate:.12f},atrim=0:180,afade=t=in:d=1.2,afade=t=out:st=178:d=2',
        '-c:a', 'libmp3lame', '-q:a', '4', str(short)], check=True)
    manifest = {'model': MODEL, 'crossfadeSeconds': 5, 'distinctLongSourceSeconds': joined_length,
        'detailedTempoFactor': rate, 'shortTempoFactor': short_rate, 'repeatedSource': False,
        'deliveries': [{'src': '/audio/'+p.name, 'duration': duration(p),
            'bytes': p.stat().st_size, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest(),
            'lufs': music.measure_lufs(p)} for p in [detailed, short]]}
    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
    print(json.dumps(manifest, indent=2), flush=True)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--assemble', action='store_true')
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    if not args.assemble:
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            list(pool.map(generate, CHAPTERS))
    assemble()
