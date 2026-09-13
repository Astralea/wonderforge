"""Render the saved MCP-built summit without altering the editable source file."""
import bpy, json
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[1]
source=root/'artifacts/eiffel-rebuild/blender'
out=root/'artifacts/eiffel-refinement-2026-09-06'
meta=json.loads((source/'mcp-build-result.json').read_text())
scene=bpy.data.scenes[meta['structuredContent']['result']['scene']]
bpy.context.window.scene=scene
cam=scene.camera
v=lambda p: Vector((p[0],-p[2],p[1]))
cam.location=v((36,296,51));cam.rotation_euler=(v((0,291,0))-cam.location).to_track_quat('-Z','Y').to_euler()
cam.data.type='ORTHO';cam.data.ortho_scale=44
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.threads_mode='FIXED';scene.render.threads=12
scene.render.resolution_x=1000;scene.render.resolution_y=1200;scene.render.resolution_percentage=100
scene.render.filepath=str(out/'summit-blender-review.png')
bpy.ops.render.render(write_still=True)
