"""Read the saved parent-authored Blender flag, without changing its source."""
import bpy,json,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/eiffel-historic-flag-2026-09-08'
path=OUT/'blender/eiffel-historic-flag.blend'
with bpy.data.libraries.load(str(path),link=False) as (source,target):
    target.scenes=[source.scenes[0]]
scene=target.scenes[0]
rows=[]
for obj in scene.objects:
    row={'name':obj.name,'type':obj.type}
    if obj.type=='MESH':
        points=[obj.matrix_world@v.co for v in obj.data.vertices]
        row.update(vertices=len(points),triangles=sum(len(p.vertices)-2 for p in obj.data.polygons),
                   boundsBlender=[[min(v[i] for v in points) for i in range(3)],[max(v[i] for v in points) for i in range(3)]],
                   cloth=bool(obj.get('wf_flag_cloth')),uvLayers=list(obj.data.uv_layers.keys()))
    rows.append(row)
result={'source':str(path),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'objects':rows,
        'triangles':sum(row.get('triangles',0) for row in rows)}
assert len(rows)==4 and result['triangles']==720
assert sum(row.get('cloth',False) for row in rows)==3
(OUT/'blender/saved-source-readback.json').write_text(json.dumps(result,indent=2)+'\n')
