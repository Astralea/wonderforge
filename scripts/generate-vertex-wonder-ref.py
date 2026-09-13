#!/usr/bin/env python3
"""Generate a Vertex AI construction-movie reference via Kilo's Gemini image path.

Uses Application Default Credentials (or GOOGLE_APPLICATION_CREDENTIALS) and
the same Vertex project/model Kilo uses for SOTA stills: gemini-3-pro-image
(Nano Banana Pro). Does not import Kilo's Discord stack or copy API keys.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

from google import genai

KILO_CONFIG = Path("/Users/hina/Documents/kilo/config.json")
DEFAULT_SA = Path("/Users/hina/kilo-sa.json")
OUT_DIR = Path(__file__).resolve().parents[1] / "artifacts" / "vertex-wonder-ref"

PROMPT = """
Draw a photoreal cinematic still from a Civilization VI-style World Wonder construction movie of Stonehenge on Salisbury Plain, Wiltshire, late Neolithic.

High-angle construction orbit, camera about 90 metres out, looking down at roughly 16 degrees so the sky and rolling chalk downs stay in frame. Dusk, humid broken cloud, cool blue zenith, warm low sun.

The monument is under construction, not a tourist ruin: some sarsen uprights already packed in ramp-sided pits, others still recumbent on wooden sleds and rollers on grazed turf. One upright is being raised with an A-frame, ropes, and a heel pivot into a chalk-rubble pit. A lintel sits on a timber crib beside a standing pair, not hovering. Every stone has visible weight and ground or timber contact. No stone floats, levitates, scales, or emerges from underground.

Small human workers (about 1.8 m) give scale. Open chalk grassland, bank and ditch, distant tree line, no modern roads, no visitors, no captions, no UI, no logos, no text.

Materials: grey-brown sarsen with hammerstone dressing, bluestones smaller and darker, warm oak timber, grazed green turf with chalk scars. Documentary realism, not fantasy, not Celtic/Druid stereotype, not bagpipes, not medieval.

Single wide still, 16:9, sharp, natural color.
""".strip()


def load_vertex_client() -> tuple[genai.Client, str, str]:
    if DEFAULT_SA.is_file() and not os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(DEFAULT_SA)
    project = os.environ.get("GOOGLE_CLOUD_PROJECT")
    location = os.environ.get("GOOGLE_CLOUD_LOCATION", "global")
    if not project and KILO_CONFIG.is_file():
        cfg = json.loads(KILO_CONFIG.read_text())
        project = cfg.get("GOOGLE_CLOUD_PROJECT")
        location = cfg.get("GOOGLE_CLOUD_LOCATION", location)
    if not project:
        raise SystemExit("Set GOOGLE_CLOUD_PROJECT or keep Kilo config.json available.")
    client = genai.Client(vertexai=True, project=project, location=location)
    return client, project, location


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    client, project, location = load_vertex_client()
    models = ["gemini-3.1-flash-image", "gemini-3-pro-image"]
    response = None
    model = models[0]
    last_error: Exception | None = None
    for model in models:
        print(f"requesting {model} via Vertex AI ({location})…", flush=True)
        try:
            response = client.models.generate_content(model=model, contents=[PROMPT])
            break
        except Exception as error:
            last_error = error
            print(f"{model} failed: {error}", flush=True)
    if response is None:
        raise SystemExit(last_error or "Vertex returned no response")
    candidates = getattr(response, "candidates", None) or []
    if not candidates:
        raise SystemExit(f"no candidates: {response!r}")
    parts = getattr(candidates[0].content, "parts", None) or []
    wrote = 0
    notes: list[str] = []
    for part in parts:
        inline = getattr(part, "inline_data", None)
        mime = getattr(inline, "mime_type", "") if inline else ""
        data = getattr(inline, "data", None) if inline else None
        if data and mime.startswith("image/"):
            suffix = "png" if "png" in mime else "jpg"
            path = OUT_DIR / f"stonehenge-construction.{suffix}"
            path.write_bytes(data)
            print(f"wrote {path} ({len(data)} bytes)", flush=True)
            wrote += 1
        elif getattr(part, "text", None):
            notes.append(part.text)
    if notes:
        (OUT_DIR / "stonehenge-construction-note.txt").write_text("\n".join(notes))
        print("model note:\n" + "\n".join(notes)[:800], flush=True)
    if wrote == 0:
        raise SystemExit("Vertex returned no image bytes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
