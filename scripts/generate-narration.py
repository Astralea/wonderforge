#!/usr/bin/env python3
"""Generate locally bundled caption-narration clips with ElevenLabs.

This is the only approved caption-voice path. Do not use browser
speechSynthesis or Vertex Gemini TTS.

Each authored reference scene keeps a distinct narrator:
  Giza             Charles
  Stonehenge       Oliver
  Colosseum        Andrea Williams
  Sydney Opera House Alice
  Eiffel Tower     Adam

The API key is read from `.env.local` and is never printed.
Each clip is normalized to -16 LUFS under `public/audio/narration/`;
the browser serves these assets and makes no runtime API request.

Usage:
  python3 scripts/generate-narration.py            # all authored tracks
  python3 scripts/generate-narration.py sydney
  python3 scripts/generate-narration.py sydney-opera-house
  python3 scripts/generate-narration.py eiffel
  python3 scripts/generate-narration.py colosseum
  python3 scripts/generate-narration.py stonehenge
  python3 scripts/generate-narration.py giza
"""
from __future__ import annotations

import json
import pathlib
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
KEY_FILE = ROOT / ".env.local"
OUT = ROOT / "public" / "audio" / "narration"

MODEL_ID = "eleven_multilingual_v2"
BASE_SETTINGS = {
    "stability": 0.6,
    "similarity_boost": 0.75,
    "style": 0.25,
    "use_speaker_boost": True,
}

TRACKS = {
    "sydney": {
        "voice_id": "Xb7hH8MSUJpSbSDYk0k2",  # Alice: Clear Engaging Educator
        "prefix": "sydney-alice",
        "speed": 0.92,
        "beats": {
            "point": (
                "The Point. The podium of reconstituted granite is finished "
                "on Bennelong Point before any sail is raised."
            ),
            "ribs": (
                "The Ribs. Precast concrete ribs — sections of Utzon's "
                "75-metre sphere — wait in the on-site yard."
            ),
            "cranes": (
                "The Cranes. Favelle Favco tower cranes, developed for this "
                "job, lift each rib onto steel falsework."
            ),
            "tiles": (
                "The Tiles. More than one million Höganäs ceramic tiles clad "
                "the sails only after those ribs are seated."
            ),
        },
    },
    "eiffel": {
        "voice_id": "pNInz6obpgDQGcFmaJgB",  # Adam
        "prefix": "eiffel-adam",
        "speed": 1.2,
        "beats": {
            "champ": (
                "The Champ. The Champ de Mars is a parade ground; four masonry "
                "piers mark the tower's 125-metre square."
            ),
            "iron": (
                "The Iron. Puddled-iron members arrive prefabricated from "
                "Levallois-Perret and ride wagons to each pylon."
            ),
            "legs": (
                "The Legs. Four lattice pylons lean inward on creeper cranes "
                "until they meet at the first platform."
            ),
            "join": (
                "The Join. Hydraulic jacks close the first-platform join; "
                "the four legs become one tower."
            ),
            "beacon": (
                "The Beacon. Electric lanterns crown the 312-metre iron lace "
                "on the 1889 opening night."
            ),
            "lift-prepared": "A lifting frame raises an iron section from the ground.",
            "lift-later": "Crews work on all four legs of the tower.",
            "joint-prepared": "A crane turns the next iron section and lowers it into position.",
            "joint-later": "The four legs will meet at the first platform.",
            "relay-prepared": "An iron section arrives at the first platform, ready for the next lift.",
            "relay-later": "The frame narrows above the second platform.",
        },
    },
}

ALIASES = {
    "pyramids-of-giza": "giza",
    "sydney-opera-house": "sydney",
    "eiffel-tower": "eiffel",
}


def api_key() -> str:
    for line in KEY_FILE.read_text().splitlines():
        if line.startswith("ELEVENLABS_API_KEY="):
            return line.split("=", 1)[1].strip()
    raise SystemExit("ELEVENLABS_API_KEY not found in .env.local")


def synthesize(voice_id: str, text: str, speed: float) -> bytes:
    body = json.dumps({
        "text": text,
        "model_id": MODEL_ID,
        "voice_settings": {**BASE_SETTINGS, "speed": speed},
    }).encode()
    request = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
        "?output_format=mp3_44100_128",
        data=body,
        headers={
            "xi-api-key": api_key(),
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            return response.read()
    except urllib.error.HTTPError as error:
        detail = error.read().decode(errors="replace")[:240]
        raise SystemExit(f"ElevenLabs returned HTTP {error.code}: {detail}") from error


def normalize(source: pathlib.Path, destination: pathlib.Path) -> None:
    subprocess.run(
        [
            "ffmpeg", "-v", "error", "-y", "-i", str(source),
            "-af", "loudnorm=I=-16:TP=-1.5:LRA=7",
            "-c:a", "libmp3lame", "-b:a", "128k", "-ar", "44100", "-ac", "1",
            str(destination),
        ],
        check=True,
    )


def duration(path: pathlib.Path) -> float:
    result = subprocess.run(
        [
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=nw=1:nk=1", str(path),
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    return float(result.stdout.strip())


def generate_track(name: str) -> None:
    track = TRACKS[name]
    OUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="wonderforge-narration-") as temp:
        temp_dir = pathlib.Path(temp)
        for beat, text in track["beats"].items():
            raw = temp_dir / f"{name}-{beat}-raw.mp3"
            destination = OUT / f"{track['prefix']}-{beat}.mp3"
            raw.write_bytes(synthesize(track["voice_id"], text, track["speed"]))
            normalize(raw, destination)
            print(
                f"{name}/{beat}: {duration(destination):.6f}s, "
                f"{destination.stat().st_size} bytes"
            )


def resolve_name(name: str) -> str:
    return ALIASES.get(name, name)


def main() -> None:
    historical = {"giza", "stonehenge", "colosseum"}
    requested = [resolve_name(name) for name in (sys.argv[1:] or ["giza", "stonehenge", "colosseum", *TRACKS])]
    unknown = [name for name in requested if name not in TRACKS and name not in historical]
    if unknown:
        raise SystemExit(f"unknown track(s): {', '.join(unknown)}")
    reviewed = [name for name in requested if name in historical]
    if reviewed:
        subprocess.run([sys.executable, str(ROOT / "scripts/generate-historical-narration.py"), *reviewed], check=True)
    for name in requested:
        if name not in historical:
            generate_track(name)


if __name__ == "__main__":
    main()
