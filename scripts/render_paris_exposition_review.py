"""Offline reviews of the saved, MCP-authored Paris scene."""
import bpy,json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/paris-exposition-2026-09-07/renders';OUT.mkdir(parents=True,exist_ok=True)
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
view((260,220,-30),(0,18,285),530,'exposition-overview.png')
view((0,85,72),(0,23,300),350,'cnam-comparison.png')
view((-58,90,-60),(-135,3,10),165,'market-promenade.png')
view((335,105,70),(242,10,144),170,'varied-parcels.png')
