#!/usr/bin/env python3
"""Narrator voice panel: one caption beat through four documentary-grade
voices so the owner picks by ear. Reads the key from .env.local; never
prints it. Output: /tmp/wf-elv-<name>.mp3
"""
from __future__ import annotations

import json
import pathlib
import sys
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
KEY_FILE = ROOT / ".env.local"
OUT = pathlib.Path("/tmp")

TEXT = (
    "The Quarry. Blocks are won from the plateau itself; "
    "the fine white casing crosses the river from Tura."
)

CANDIDATES = {
    "george": "JBFqnCBsd6RMkjVDRZzb",   # Warm, Captivating Storyteller (British M)
    "daniel": "onwK4e9ZLuTAKqWW03F9",   # Steady Broadcaster (British M)
    "bill": "pqHfZKP75CvOlQylNhV4",     # Wise, Mature, Balanced (American M, older)
    "alice": "Xb7hH8MSUJpSbSDYk0k2",    # Clear, Engaging Educator (British F)
}

SETTINGS = {
    "stability": 0.6,
    "similarity_boost": 0.75,
    "style": 0.25,
    "use_speaker_boost": True,
    "speed": 0.92,
}


def api_key() -> str:
    for line in KEY_FILE.read_text().splitlines():
        if line.startswith("ELEVENLABS_API_KEY="):
            return line.split("=", 1)[1].strip()
    raise SystemExit("ELEVENLABS_API_KEY not found in .env.local")


def synthesize(name: str, voice_id: str) -> int:
    body = json.dumps({
        "text": TEXT,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": SETTINGS,
    }).encode()
    request = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128",
        data=body,
        headers={
            "xi-api-key": api_key(),
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            audio = response.read()
    except urllib.error.HTTPError as error:
        print(f"  {name}: HTTP {error.code}: {error.read().decode()[:200]}")
        return 1
    path = OUT / f"wf-elv-{name}.mp3"
    path.write_bytes(audio)
    print(f"  {name}: {path} ({len(audio) / 1000:.0f} KB)")
    return 0


def main() -> int:
    failures = 0
    for name, voice_id in CANDIDATES.items():
        failures += synthesize(name, voice_id)
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
