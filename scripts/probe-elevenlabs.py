#!/usr/bin/env python3
"""Read-only ElevenLabs probe: list available voices + models.

Reads the key from .env.local (gitignored). Never prints it.
"""
from __future__ import annotations

import json
import pathlib
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
KEY_FILE = ROOT / ".env.local"


def api_key() -> str:
    for line in KEY_FILE.read_text().splitlines():
        if line.startswith("ELEVENLABS_API_KEY="):
            return line.split("=", 1)[1].strip()
    raise SystemExit("ELEVENLABS_API_KEY not found in .env.local")


def get(path: str) -> object:
    request = urllib.request.Request(
        f"https://api.elevenlabs.io{path}",
        headers={"xi-api-key": api_key()},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def main() -> int:
    models = get("/v1/models")
    print("models:")
    for model in models:
        print(f"  {model['model_id']}  ({model.get('name', '')})")
    voices = get("/v1/voices")
    print(f"\nvoices ({len(voices['voices'])}):")
    for voice in voices["voices"]:
        labels = voice.get("labels") or {}
        label = ", ".join(f"{k}={v}" for k, v in labels.items())
        print(f"  {voice['voice_id']}  {voice['name']}  [{voice.get('category')}] {label}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
