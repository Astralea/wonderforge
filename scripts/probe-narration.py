#!/usr/bin/env python3
"""Forbidden. Caption narration is ElevenLabs only.

Vertex Gemini TTS is not an approved voice path. Generate bundled clips with:

    python3 scripts/generate-narration.py <wonder>

See specs/05-ui.md §Caption voice.
"""
from __future__ import annotations

import sys

sys.exit(
    "Vertex Gemini TTS is forbidden for caption narration. "
    "Use: python3 scripts/generate-narration.py <wonder>"
)
