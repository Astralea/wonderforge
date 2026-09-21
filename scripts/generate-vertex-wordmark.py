#!/usr/bin/env python3
"""Generate a WonderForge wordmark via Vertex Gemini image.

Each letter of WONDERFORGE is a Civ V world wonder chosen for letter
silhouette, not catalog membership. Same Vertex client as
scripts/generate-vertex-wonder-ref.py.
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from google import genai
from google.genai import types

KILO_CONFIG = Path("/Users/hina/Documents/kilo/config.json")
DEFAULT_SA = Path("/Users/hina/kilo-sa.json")
OUT_DIR = Path(__file__).resolve().parents[1] / "artifacts" / "vertex-wordmark"

PROMPT = """
A single cinematic title lockup of the word WONDERFORGE.
Spell it correctly: two lines, WONDER on top (six letters) and FORGE below
(five letters). Never WONDE over FORGE — that drops the first R.
Eleven letters total, shared cap-height, one baseline per line.
Each letter is a Civilization V world wonder whose SILHOUETTE is that Latin
letter first. The monument is how the letter is built. If the outline is not
clearly W, O, N, D, E, R, F, O, R, G, E from across a room, the image fails.

Hard bans (these read as A or two A's — never use them as letters):
- Pyramids of Giza, any Egyptian pyramid, Chichen Itza / El Castillo
- Eiffel Tower, Louvre pyramid, any tapering lattice or tripod that meets at a point
Do not put the Eiffel Tower anywhere in this picture.

Letter map. Line 1 is W O N D E R. Line 2 is F O R G E.

W — Great Wall of China. The wall itself traces a W: up a ridge, down to a
watchtower that TOUCHES THE BASELINE in the center, up a second ridge, down,
up a third. Three peaks, two valleys, center valley reaches the ground.
A zigzag wall, not two pyramids, not two mountain A's.

O — Colosseum from slightly above: the elliptical arcade, arena as the counter.
Keep this letter as the Colosseum.

N — Machu Picchu: two stone uprights and a terrace staircase as the diagonal
stroke of N. Huayna Picchu is the right stem, not a pyramid in the middle.

D — Petra, Al-Khazneh: rose-sandstone Treasury facade; the carved doorway is
the D's bowl. Vertical cliff on the left.

E — Porcelain Tower of Nanjing, STRICT side elevation. A vertical shaft on the
LEFT only. Three tiled hexagonal eaves cantilever to the RIGHT as the three
bars of a capital E (top, middle, bottom). Same left spine. Must look like E,
never like A, never like a pointed pagoda spire, never like a lone tower.
The letter is wider than it is tall.

R — Hagia Sophia: left minaret is the vertical spine; the dome is the R's
bowl; a flying buttress or staircase is the R's diagonal leg. Not a pyramid.

F — Forbidden Palace, STRICT side elevation. Left masonry wall as the spine.
ONLY TWO yellow hip roofs cantilever right (top bar and middle bar). No third
bottom bar (that would be E). Not a cluster of halls.

O — Stonehenge: closed sarsen ring with lintels, grass as the counter.

R — Notre Dame de Paris west front: left tower is the spine; the rose window
is the R's bowl; a flying buttress is the diagonal leg.

G — Sydney Opera House: white shells curl into a G; the podium is the inward
spur of G. Open on the right like a G, not a closed O.

E — Hanging Gardens of Babylon, STRICT side elevation. Left retaining wall as
the spine. Three planted stone terraces stacked as the three bars of E,
cantilevering right, greenery on each bar. Must read as E, never as a
ziggurat triangle or as A.

Art direction: Firaxis / Civilization title card. Stone, brick, tile, timber,
gold raking light on dark umber ground. Thin dust. No tourists, flags, UI,
slogans, or extra words. No Celtic ornament, no gladiator pastiche.

Wide 16:9 still, sharp, natural color.
""".strip()

MODELS = ["gemini-3-pro-image", "gemini-3.1-flash-image"]


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
    response = None
    used_model = MODELS[0]
    last_error: Exception | None = None
    config = types.GenerateContentConfig(
        response_modalities=["IMAGE", "TEXT"],
        image_config=types.ImageConfig(aspect_ratio="16:9"),
    )
    for used_model in MODELS:
        print(f"requesting {used_model} via Vertex AI ({location})…", flush=True)
        try:
            response = client.models.generate_content(
                model=used_model,
                contents=[PROMPT],
                config=config,
            )
            break
        except Exception as error:
            last_error = error
            print(f"{used_model} failed: {error}", flush=True)
    if response is None:
        raise SystemExit(last_error or "Vertex returned no response")
    candidates = getattr(response, "candidates", None) or []
    if not candidates:
        raise SystemExit(f"no candidates: {response!r}")
    parts = getattr(candidates[0].content, "parts", None) or []
    wrote: list[str] = []
    notes: list[str] = []
    for part in parts:
        inline = getattr(part, "inline_data", None)
        mime = getattr(inline, "mime_type", "") if inline else ""
        data = getattr(inline, "data", None) if inline else None
        if data and mime.startswith("image/"):
            suffix = "png" if "png" in mime else "jpg"
            path = OUT_DIR / f"wonderforge-wonders-v3.{suffix}"
            path.write_bytes(data)
            print(f"wrote {path} ({len(data)} bytes)", flush=True)
            wrote.append(str(path))
        elif getattr(part, "text", None):
            notes.append(part.text)
    if notes:
        (OUT_DIR / "wonderforge-wonders-v3-note.txt").write_text("\n".join(notes))
        print("model note:\n" + "\n".join(notes)[:800], flush=True)
    if not wrote:
        raise SystemExit("Vertex returned no image bytes")
    (OUT_DIR / "wonderforge-wonders-v3.json").write_text(
        json.dumps(
            {
                "model": used_model,
                "project": project,
                "location": location,
                "aspectRatio": "16:9",
                "prompt": PROMPT,
                "files": wrote,
                "generatedAt": datetime.now(timezone.utc).isoformat(),
                "provenance": "Google Gemini image on Vertex AI via google-genai.",
            },
            indent=2,
        )
        + "\n"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
