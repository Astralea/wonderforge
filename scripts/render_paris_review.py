"""Offline reviews of the saved, MCP-authored Paris scene."""
import bpy,json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/paris-1889-2026-09-07/renders';OUT.mkdir(parents=True,exist_ok=True)
e=json.loads((OUT.parent/'blender/mcp-build-result.json').read_text())
info=e.get('structuredContent')
if not info:info=json.loads(next(c['text'] for c in e['content'] if c['type']=='text'))
scene=bpy.data.scenes[info['result']['scene']];bpy.context.window.scene=scene
scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True
scene.render.threads_mode='FIXED';scene.render.threads=12
cam=scene.camera

def view(p,target,scale,name,w=1440,h=1000):
 def v(p):return Vector((p[0],-p[2],p[1]))
 cam.location=v(p);cam.rotation_euler=(v(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale
 scene.render.resolution_x=w;scene.render.resolution_y=h;scene.render.filepath=str(OUT/name)
 bpy.ops.render.render(write_still=True)
view((345,85,220),(242,8,144),147,'city-courtyard.png')
view((320,105,5),(240,10,112),72,'city-street.png')
# Review exported actor prototypes together at real relative scale.
life=next(c for c in scene.collection.children if c.name.startswith('PARIS — articulated'))
for o in life.objects:
 if o.parent is None and o.type=='EMPTY':o.location.z=0
# Ground under the tray, only in this review process.
bpy.ops.mesh.primitive_plane_add(size=180,location=(0,70,-.025))
view((15,15,-35),(0,1,-70),72,'period-life.png',1600,700)
