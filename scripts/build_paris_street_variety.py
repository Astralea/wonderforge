from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'scripts/blender_paris_exposition.py'
scope={'__file__':str(source),'WF_PARIS_OUTPUT':str(ROOT/'artifacts/paris-street-variety-2026-09-08/blender'),'WF_PARIS_MODEL_OUTPUT':str(ROOT/'artifacts/paris-street-variety-2026-09-08/model')}
exec(compile(source.read_text(),str(source),'exec'),scope)
result=scope['result']
