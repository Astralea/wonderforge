import bpy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/eiffel-upper-material-chain-2026-09-08'
source=OUT/'blender/paris-photo-entrance.blend'
with bpy.data.libraries.load(str(source),link=False) as (a,b):b.scenes=[a.scenes[0]]
scene=b.scenes[0]
result={'source':str(source),'scene':scene.name,'objects':len(scene.objects),
    'meshes':sum(o.type=='MESH' for o in scene.objects),'blender':bpy.app.version_string}
assert result['objects']==145
(OUT/'entrance/saved-source-readback.json').write_text(json.dumps(result,indent=2)+'\n')
