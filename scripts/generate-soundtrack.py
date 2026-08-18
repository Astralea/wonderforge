#!/usr/bin/env python3
"""Regenerate the WonderForge soundtrack with Lyria 002 on Vertex AI.

Pipeline: generate candidate cues -> assemble the 60 s cinematic arc and the
seamless ambient loop with ffmpeg -> level-match -> encode to MP3 into
`public/audio/`. Track metadata (durations, volumes, prompts) lives in
`src/data/soundtrack.ts`; a contract test keeps the cinematic cue's length
pinned to the movie's `durationMs`.

Requirements:
  - Application Default Credentials for a project with Vertex AI enabled
    (`gcloud auth application-default login`), the same auth kilo uses.
  - ffmpeg on PATH.

Usage:
  python3 scripts/generate-soundtrack.py            # full pipeline
  python3 scripts/generate-soundtrack.py --assemble # re-assemble from cached WAVs

Note: Lyria takes no seed here, so each generation differs. Cached candidate
WAVs are kept under `artifacts/soundtrack/` so assembly stays reproducible.
"""

from __future__ import annotations

import argparse
import base64
import json
import pathlib
import subprocess
import sys
import urllib.request

PROJECT = "project-8b7cf02e-3e1c-451c-9be"
LOCATION = "us-central1"
MODEL = "lyria-002"

ROOT = pathlib.Path(__file__).resolve().parent.parent
CANDIDATES = ROOT / "artifacts" / "soundtrack"
PUBLIC_AUDIO = ROOT / "public" / "audio"

# Lyria returns ~32.77 s clips, so the 60 s movie is two cues crossfaded.
CLIP_SECONDS = 32.768
MOVIE_SECONDS = 60.0
LOOP_CROSSFADE = 3.0

NEGATIVE = (
    "vocals, singing, choir, lyrics, spoken word, electric guitar, distorted guitar, "
    "electronic synthesizer, EDM, drum machine, modern pop drums, lo-fi hiss"
)

PROMPTS = {
    "build": (
        "Cinematic ancient Egyptian orchestral score for a monument construction montage. "
        "Low sustained string drone, arched harp ostinato in a modal minor scale, "
        "breathy end-blown reed flute melody, steady frame drum and wooden clapper rhythm "
        "evoking coordinated stone-hauling labor. Hypnotic, purposeful, patient, "
        "gradually building momentum and density. Instrumental only, warm and organic."
    ),
    "reveal": (
        "Triumphant cinematic ancient Egyptian orchestral finale at golden sunset. "
        "Soaring reed flute over a full warm string swell, arched harp glissando, "
        "deep frame drums and noble low brass, wide majestic chords resolving to major. "
        "Awe, grandeur, completion after long labor. Slow stately tempo. "
        "Instrumental only, cinematic film score."
    ),
    "ambient": (
        "Calm ambient ancient Egyptian desert atmosphere for a slowly orbiting title screen. "
        "Sparse arched harp arpeggios, soft sustained warm strings, a distant lonely reed flute, "
        "gentle air and space. Meditative, spacious, unhurried, seamless and continuous "
        "with no strong beat and no dramatic swells. Instrumental only."
    ),
}

# Loudness targets. A static gain is used rather than dynamic loudnorm so the
# cinematic crescendo survives and the loop seam keeps a constant level.
TARGET_LUFS = {"cinematic": -18.0, "ambient": -21.0}


def run(args: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(args, capture_output=True, text=True, check=True)


def access_token() -> str:
    return run(["gcloud", "auth", "application-default", "print-access-token"]).stdout.strip()


def generate(name: str, prompt: str, token: str) -> pathlib.Path:
    url = (
        f"https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT}"
        f"/locations/{LOCATION}/publishers/google/models/{MODEL}:predict"
    )
    body = json.dumps({
        "instances": [{"prompt": prompt, "negative_prompt": NEGATIVE}],
        "parameters": {"sample_count": 1},
    }).encode()
    request = urllib.request.Request(
        url, data=body,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=600) as response:
        payload = json.load(response)

    prediction = payload["predictions"][0]
    path = CANDIDATES / f"{name}.wav"
    # Lyria's WAV header declares a data size twice the real payload; ffmpeg
    # rewrites a correct header downstream, so never hand these to a decoder
    # that trusts the header (Python's `wave` reports double the duration).
    path.write_bytes(base64.b64decode(prediction["bytesBase64Encoded"]))
    print(f"  {path.name}  {path.stat().st_size / 1_000_000:.2f} MB")
    return path


def measure_lufs(path: pathlib.Path) -> float:
    result = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", str(path), "-af", "ebur128=peak=true", "-f", "null", "-"],
        capture_output=True, text=True,
    )
    # Per-frame lines are prefixed with "[Parsed_ebur128...]"; only the summary
    # block starts with a bare "I:". The last match is the integrated value.
    measured: float | None = None
    for line in result.stderr.splitlines():
        stripped = line.strip()
        if stripped.startswith("I:") and "LUFS" in stripped:
            measured = float(stripped.split()[1])
    if measured is None:
        sys.exit(f"could not measure loudness of {path}")
    return measured


def encode(source: pathlib.Path, destination: pathlib.Path, role: str) -> None:
    gain = TARGET_LUFS[role] - measure_lufs(source)
    destination.parent.mkdir(parents=True, exist_ok=True)
    run([
        "ffmpeg", "-v", "error", "-y", "-i", str(source),
        "-af", f"volume={gain:.2f}dB",
        "-c:a", "libmp3lame", "-q:a", "4", "-ar", "48000", "-ac", "2",
        str(destination),
    ])
    print(f"  {destination.name}  {gain:+.2f} dB  "
          f"{destination.stat().st_size / 1_000_000:.2f} MB")


def assemble() -> None:
    build = CANDIDATES / "build.wav"
    reveal = CANDIDATES / "reveal.wav"
    ambient = CANDIDATES / "ambient.wav"
    for path in (build, reveal, ambient):
        if not path.exists():
            sys.exit(f"missing candidate {path}; run without --assemble first")

    # Cinematic: a 2.5 s dawn fade-in, an equal-power crossfade into the finale
    # placed so its climax lands on the reveal beat (t = 0.92 -> 55.2 s), then a
    # tail fade. Equal-power (qsin) curves keep the level constant through the
    # crossfade; a linear one would dip.
    movie_raw = CANDIDATES / "movie-raw.wav"
    run([
        "ffmpeg", "-v", "error", "-y", "-i", str(build), "-i", str(reveal),
        "-filter_complex",
        "[0:a]afade=t=in:st=0:d=2.5[a];"
        "[a][1:a]acrossfade=d=5:c1=qsin:c2=qsin[x];"
        f"[x]atrim=0:{MOVIE_SECONDS},asetpts=PTS-STARTPTS,"
        f"afade=t=out:st={MOVIE_SECONDS - 1.4}:d=1.4[out]",
        "-map", "[out]", "-ar", "48000", "-ac", "2", str(movie_raw),
    ])

    # Ambient: fold the tail back over the head so the file loops on itself.
    # The output's first sample is the source at `loop_point`, which is also
    # its last sample — continuous waveform, no click.
    loop_point = CLIP_SECONDS - LOOP_CROSSFADE
    ambient_raw = CANDIDATES / "ambient-raw.wav"
    run([
        "ffmpeg", "-v", "error", "-y", "-i", str(ambient),
        "-filter_complex",
        f"[0:a]atrim={loop_point},asetpts=PTS-STARTPTS[tail];"
        f"[0:a]atrim=0:{LOOP_CROSSFADE},asetpts=PTS-STARTPTS[head];"
        f"[tail][head]acrossfade=d={LOOP_CROSSFADE}:c1=qsin:c2=qsin[xf];"
        f"[0:a]atrim={LOOP_CROSSFADE}:{loop_point},asetpts=PTS-STARTPTS[mid];"
        "[xf][mid]concat=n=2:v=0:a=1[out]",
        "-map", "[out]", "-ar", "48000", "-ac", "2", str(ambient_raw),
    ])

    print("encoding:")
    encode(movie_raw, PUBLIC_AUDIO / "giza-cinematic.mp3", "cinematic")
    encode(ambient_raw, PUBLIC_AUDIO / "giza-ambient-loop.mp3", "ambient")
    print("\nIf durations changed, update src/data/soundtrack.ts to match "
          "(tests/soundtrack.test.ts pins the cinematic cue to the movie length).")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--assemble", action="store_true",
                        help="skip generation and rebuild from cached candidates")
    args = parser.parse_args()

    CANDIDATES.mkdir(parents=True, exist_ok=True)
    if not args.assemble:
        token = access_token()
        print("generating cues with Lyria:")
        for name, prompt in PROMPTS.items():
            generate(name, prompt, token)
    assemble()


if __name__ == "__main__":
    main()
