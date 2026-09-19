#!/usr/bin/env python3
"""Generate wonder-owned music with Google Gen AI SDK and Lyria 3 on Vertex.

Each scored wonder receives a separate cinematic cue and ambient loop. Raw
model outputs and their prompts remain under `artifacts/soundtrack/<wonder>/`;
ffmpeg makes duration-pinned, level-matched delivery files in `public/audio/`.

Requirements:
  - Application Default Credentials with Vertex AI access.
  - `google-genai` and ffmpeg. Without a project venv, run via:
    uv run --with google-genai python scripts/generate-soundtrack.py \
      --wonder stonehenge

Lyria 3 has no seed control. Preserve raw outputs instead of regenerating when
only local assembly changes:
    uv run --with google-genai python scripts/generate-soundtrack.py \
      --wonder stonehenge --assemble
"""

from __future__ import annotations

import argparse
import json
import pathlib
import subprocess
import sys
from dataclasses import dataclass

try:
    from google import genai
    from google.genai import types
except ImportError:  # pragma: no cover - environment preflight
    sys.exit("google-genai is required; run with `uv run --with google-genai ...`")

PROJECT = "project-8b7cf02e-3e1c-451c-9be"
LOCATION = "global"
MOVIE_SECONDS = 60.0
AMBIENT_SOURCE_SECONDS = 30.0
LOOP_CROSSFADE = 3.0
AMBIENT_TAKES = 3

ROOT = pathlib.Path(__file__).resolve().parent.parent
ARTIFACT_ROOT = ROOT / "artifacts" / "soundtrack"
PUBLIC_AUDIO = ROOT / "public" / "audio"
TARGET_LUFS = {"cinematic": -18.0, "ambient": -21.0}


@dataclass(frozen=True)
class WonderBrief:
    slug: str
    cinematic_prompt: str
    ambient_prompt: str


BRIEFS = {
    "colosseum": WonderBrief(
        slug="colosseum",
        cinematic_prompt="""
Create an exactly 60-second instrumental cinematic acoustic score for Flavian
builders raising the Colosseum in the drained valley of Rome. This is respectful
speculative scoring, not reconstructed Roman music. Open valley air, timber
wagons on a stone road, treadwheel cranes, then a restrained four-storey
ellipse cadence at dusk.

Instrumental only: no voice, vocals, chant, choir, or lyrics. No orchestra,
synthesizer, electric guitar, or trailer percussion. Avoid Gregorian chant,
opera, tarantella, Hollywood gladiator brass, and later Italian folk shorthand.
Tibia/aulos-like double pipe, cithara/lyre, a restrained frame-drum labour
pulse, timber and stone contact, sober documentary tone.
""".strip(),
        ambient_prompt="""
A 30-second instrumental ambient bed for the Flavian amphitheatre valley:
warm dusty air, distant timber and stone, no beat and no climax so it can
sequence with other quiet variations of the same place. Instrumental only;
no vocals; no Gregorian, operatic, or gladiator-epic shorthand. Make this
take melodically distinct from a previous pass of the same brief.
""".strip(),
    ),
    "petra": WonderBrief(
        slug="petra",
        cinematic_prompt="""
Create an exactly 60-second instrumental cinematic acoustic score for Nabataean
masons carving Al-Khazneh from living sandstone at the mouth of the Siq in
Petra. This is respectful speculative scoring, not reconstructed Nabataean
music. Dry gorge air, stone-on-stone and iron-on-sandstone work, a patient
haul pulse, then a restrained sunlit-facade cadence.

Instrumental only: no voice, vocals, chant, choir, or lyrics. No orchestra,
synthesizer, electric guitar, or trailer percussion. Avoid Egyptian harp/ney
ensembles, Bedouin-cliche percussion-as-theme-park, Ottoman/Turkish military
band, and modern Jordanian pop. Dry stone canyon acoustic, short natural
reflections, sober documentary tone.
""".strip(),
        ambient_prompt="""
A 30-second instrumental ambient bed for the Siq mouth at Petra: dry wind in a
narrow sandstone gorge, distant iron-on-stone, no beat and no climax so it can
loop. Instrumental only; no vocals; no Egyptian, Ottoman, or tourist-market
shorthand.
""".strip(),
    ),
    "stonehenge": WonderBrief(
        slug="stonehenge",
        cinematic_prompt="""
Create an exactly 60-second instrumental cinematic acoustic score for a late-
Neolithic monument construction movie on exposed chalk downland in southern
Britain. This is archaeologically cautious speculative scoring, not a claim of
reconstructed ritual music. Keep the sound raw, spacious, wind-exposed, and
human rather than polished or orchestral.

[00:00-00:10] Open dawn air, one breathy raw wood-or-bone-flute-like tone and a
low resonant stone strike, with long quiet space between gestures.
[00:10-00:36] Add a restrained stretched-hide hand-drum pulse, struck wood and
stone resonance. The rhythm should feel like coordinated hauling and levering:
patient, weighty, asymmetrical, around 68 BPM, gradually gathering density.
[00:36-00:52] Broaden the acoustic field as lintels rise; deepen the drum and
interlocking wood pulse without becoming heroic fantasy music.
[00:52-01:00] A clear but restrained completion cadence under open wind. Let
the final stone resonance breathe and fade naturally.

Instrumental only: no voice, vocals, chant, choir, lyrics or spoken word. No
modern orchestra, strings section, brass, piano, guitar, synthesizer, cinematic
trailer percussion, Egyptian harp or reed ensemble. Avoid later regional
shorthand: no bagpipes, fiddle, tin whistle, bodhran, Celtic, Druidic,
Anglo-Saxon or medieval style. Organic close-miked materials in a dry,
wind-exposed field acoustic with only short natural reflections; no cavern,
cathedral, hall, or fantasy-scale reverb. Sober documentary tone.
""".strip(),
        ambient_prompt="""
A 30-second instrumental ambient acoustic bed for Stonehenge on open chalk
grassland. Archaeologically cautious speculative atmosphere: low natural wind,
unpitched breath passing across a rough hollow wood-or-bone tube, occasional
struck wood, and a quiet rounded stone resonance. Do not turn the breath into a
recognizable flute melody or imitate a ney, shakuhachi, pan flute, or any named
regional instrument. Very spacious, even, meditative, no strong beat, no build
and no climax so it can become a seamless loop. Instrumental only: no voice,
vocals, chant, choir, lyrics, orchestra, synthesizer, bagpipes, fiddle, tin
whistle, Celtic, Druidic, Anglo-Saxon, medieval or Egyptian styling.
        """.strip(),
    ),
    "sydney-opera-house": WonderBrief(
        slug="sydney-opera-house",
        cinematic_prompt="""
Create an exactly 60-second instrumental cinematic score for the Sydney Opera
House on Bennelong Point. The identity is a modern Australian harbour concert
house: southern coastal light, Pacific air, civic pride in a 20th-century
performing-arts monument. It should feel like a bright concert hall by the
water — Sydney, never a 19th-century Paris opera overture, never Outback
tourism, and never a generic construction-site pulse as the hero.

[00:00-00:14] Dawn over Farm Cove: high strings and a clear woodwind or harp
figure, airy, coastal, major-mode.
[00:14-00:42] The white shells rise: luminous civic orchestra, patient not
martial. Distant work may tint the texture; steel-clank labour rhythm must
not lead.
[00:42-01:00] Night reveal: warm concert-hall cadence under the lit house.
Let the last chord breathe in a hall, not a trailer.

Instrumental only: no voice, vocals, choir, lyrics, spoken word, or opera
singing. No didgeridoo-as-tourism-shorthand, clapstick cliche, surf-rock,
fireworks fanfare, baroque French overture, synthesizer trailer music, or
copy of Civilization / Christopher Tin themes. Colours: concert-hall strings,
woodwinds, harp, restrained brass, piano as colour not hero.
""".strip(),
        ambient_prompt="""
A 30-second instrumental ambient bed for Sydney Harbour around Bennelong Point
at concert hour: open water, distant city hush, faint concert-hall warmth
(strings and harp), no beat and no climax so it can loop. Instrumental only;
no vocals; no didgeridoo-as-tourism-shorthand, surf-rock, baroque overture,
or trailer synth.
""".strip(),
    ),
    "eiffel-tower": WonderBrief(
        slug="eiffel-tower",
        cinematic_prompt="""
Create an exactly 60-second instrumental cinematic score for the Eiffel Tower
rising on the Champ de Mars in Paris, 1887 to 31 March 1889, for the Exposition
Universelle. This is respectful speculative scoring of a Third-Republic
industrial civic monument, not reconstructed street music and not a tourist
postcard of later Paris.

The identity is 1889 exposition: salon strings and restrained brass, iron lace
against a temperate Paris sky, puddled-iron workshop as distant colour not as
the beat. Dawn over a military parade ground, four lattice legs meeting, then
electric lanterns on opening night.

[00:00-00:14] Cool Champ-de-Mars morning: high salon strings, a spare piano
or harp figure, airy major-mode civic warmth. Distant iron contact may tint
the texture; it must not become a labour ostinato.
[00:14-00:42] The pylons lean and join: patient strings, modest republican
brass (orphéon / civic wind-band colour, never Hollywood fanfare). No
construction-site pulse as the hero.
[00:42-01:00] 1889 opening night: restrained brass cadence under electric
lanterns. Let the last chord breathe in a salon, not a trailer.

Instrumental only: no voice, vocals, choir, lyrics, or spoken word. No
accordion, musette, can-can, cabaret, jazz, Edith Piaf-era chanson,
synthesizer, electric guitar, or cinematic trailer percussion. No copy of
Civilization / Christopher Tin themes. No generic hammer-and-anvil loop
driving the cue. Colours: salon strings, piano as colour not hero,
restrained brass, woodwinds; workshop iron only as far atmosphere.
""".strip(),
        ambient_prompt="""
A 30-second instrumental ambient bed for the Champ de Mars beside the Seine
in 1889: temperate Paris air, salon-string warmth, faint civic brass far
off, no beat and no climax so it can loop. Instrumental only; no vocals; no
accordion, musette, can-can, jazz, chanson, or construction-site pulse.
""".strip(),
    ),
    "pyramids-of-giza": WonderBrief(
        slug="giza",
        cinematic_prompt="""
Create an exactly 60-second instrumental cinematic acoustic score for the
construction of Khufu's pyramid at Giza. Begin with sparse breathy reed tone
and arched harp, establish a patient frame-drum and wooden-clapper hauling
pulse, then broaden into a stately warm completion cadence at 55 seconds.
Instrumental only, no vocals or lyrics; avoid electronic and modern pop sounds.
""".strip(),
        ambient_prompt="""
A 30-second calm instrumental ambient bed for the Giza plateau: dry wind,
sparse arched harp, a distant breathy reed tone and low sustained warmth. Even,
spacious, no strong beat and no climax for a seamless loop. No vocals, lyrics,
electronics or modern pop percussion.
""".strip(),
    ),
}


def run(args: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(args, capture_output=True, text=True, check=True)


def extract_audio(response: object) -> tuple[bytes, list[str]]:
    audio: bytes | None = None
    text_parts: list[str] = []
    for part in response.parts:  # type: ignore[attr-defined]
        if part.text:
            text_parts.append(part.text)
        if part.inline_data and part.inline_data.data:
            audio = bytes(part.inline_data.data)
    if audio is None:
        sys.exit("Lyria response contained no audio part")
    return audio, text_parts


def generate(brief: WonderBrief, role: str, client: genai.Client, dest: pathlib.Path) -> pathlib.Path:
    model = "lyria-3-pro-preview" if role == "cinematic" else "lyria-3-clip-preview"
    prompt = brief.cinematic_prompt if role == "cinematic" else brief.ambient_prompt
    print(f"generating {brief.slug} {role} -> {dest.name} with {model}:", flush=True)
    response = client.models.generate_content(
        model=model,
        contents=prompt,
        config=types.GenerateContentConfig(response_modalities=["AUDIO", "TEXT"]),
    )
    audio, notes = extract_audio(response)
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(audio)
    metadata = {
        "wonder": brief.slug,
        "role": role,
        "model": model,
        "location": LOCATION,
        "prompt": prompt,
        "model_text": notes,
        "file": dest.name,
        "provenance": "Google Lyria 3 via Gen AI SDK on Vertex AI; SynthID and C2PA enabled by model default.",
    }
    dest.with_suffix(".json").write_text(
        json.dumps(metadata, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"  {dest}  {dest.stat().st_size / 1_000_000:.2f} MB", flush=True)
    return dest


def measure_lufs(path: pathlib.Path) -> float:
    result = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", str(path), "-af", "ebur128=peak=true", "-f", "null", "-"],
        capture_output=True,
        text=True,
    )
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
    print(
        f"  {destination.name}  {gain:+.2f} dB  "
        f"{destination.stat().st_size / 1_000_000:.2f} MB",
        flush=True,
    )


def duration_seconds(path: pathlib.Path) -> float:
    result = run([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", str(path),
    ])
    return float(result.stdout.strip())


def ambient_take_paths(directory: pathlib.Path) -> list[pathlib.Path]:
    numbered = sorted(directory.glob("ambient-generated-[0-9][0-9].mp3"))
    if numbered:
        return numbered
    legacy = directory / "ambient-generated.mp3"
    return [legacy] if legacy.exists() else []


def concat_ambient_takes(takes: list[pathlib.Path], dest: pathlib.Path) -> None:
    if len(takes) == 1:
        run([
            "ffmpeg", "-v", "error", "-y", "-i", str(takes[0]),
            "-ar", "48000", "-ac", "2", str(dest),
        ])
        return
    inputs: list[str] = []
    for take in takes:
        inputs.extend(["-i", str(take)])
    filters: list[str] = []
    current = "[0:a]"
    for index in range(1, len(takes)):
        label = f"[a{index}]"
        filters.append(
            f"{current}[{index}:a]acrossfade=d={LOOP_CROSSFADE}:c1=tri:c2=tri{label}"
        )
        current = label
    run([
        "ffmpeg", "-v", "error", "-y", *inputs,
        "-filter_complex", ";".join(filters),
        "-map", current, "-ar", "48000", "-ac", "2", str(dest),
    ])


def assemble(brief: WonderBrief, directory: pathlib.Path) -> None:
    cinematic = directory / "cinematic-generated.mp3"
    takes = ambient_take_paths(directory)
    if cinematic.exists():
        movie_raw = directory / "cinematic-delivery.wav"
        run([
            "ffmpeg", "-v", "error", "-y", "-i", str(cinematic),
            "-af",
            f"afade=t=in:st=0:d=1.8,apad=whole_dur={MOVIE_SECONDS},"
            f"atrim=0:{MOVIE_SECONDS},afade=t=out:st={MOVIE_SECONDS - 1.4}:d=1.4",
            "-ar", "48000", "-ac", "2", str(movie_raw),
        ])
        print("encoding cinematic delivery:", flush=True)
        encode(movie_raw, PUBLIC_AUDIO / f"{brief.slug}-cinematic.mp3", "cinematic")
    if not takes:
        if not cinematic.exists():
            sys.exit(f"missing ambient takes in {directory}")
        return

    joined = directory / "ambient-joined.wav"
    concat_ambient_takes(takes, joined)
    source_seconds = duration_seconds(joined)
    loop_point = max(source_seconds - LOOP_CROSSFADE, LOOP_CROSSFADE + 1)
    ambient_raw = directory / "ambient-delivery.wav"
    run([
        "ffmpeg", "-v", "error", "-y", "-i", str(joined),
        "-filter_complex",
        f"[0:a]atrim={loop_point}:{source_seconds},asetpts=PTS-STARTPTS[tail];"
        f"[0:a]atrim=0:{LOOP_CROSSFADE},asetpts=PTS-STARTPTS[head];"
        f"[tail][head]acrossfade=d={LOOP_CROSSFADE}:c1=qsin:c2=qsin[xf];"
        f"[0:a]atrim={LOOP_CROSSFADE}:{loop_point},asetpts=PTS-STARTPTS[mid];"
        "[xf][mid]concat=n=2:v=0:a=1[out]",
        "-map", "[out]", "-ar", "48000", "-ac", "2", str(ambient_raw),
    ])

    print("encoding ambient delivery:", flush=True)
    dest = PUBLIC_AUDIO / f"{brief.slug}-ambient-loop.mp3"
    encode(ambient_raw, dest, "ambient")
    print(f"  ambient loop {duration_seconds(dest):.3f}s from {len(takes)} takes", flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--wonder", choices=sorted(BRIEFS), default="stonehenge")
    parser.add_argument("--role", choices=("all", "cinematic", "ambient"), default="all")
    parser.add_argument("--takes", type=int, default=AMBIENT_TAKES, help="Lyria clip takes for the ambient bed")
    parser.add_argument("--assemble", action="store_true", help="reuse cached generated MP3s")
    args = parser.parse_args()

    brief = BRIEFS[args.wonder]
    directory = ARTIFACT_ROOT / args.wonder
    directory.mkdir(parents=True, exist_ok=True)
    if not args.assemble:
        with genai.Client(enterprise=True, project=PROJECT, location=LOCATION) as client:
            if args.role in ("all", "cinematic"):
                generate(brief, "cinematic", client, directory / "cinematic-generated.mp3")
            if args.role in ("all", "ambient"):
                for index in range(1, max(1, args.takes) + 1):
                    generate(
                        brief,
                        "ambient",
                        client,
                        directory / f"ambient-generated-{index:02d}.mp3",
                    )
    assemble(brief, directory)


if __name__ == "__main__":
    main()
