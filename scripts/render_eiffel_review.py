"""Render the MCP-built saved model in a separate Blender process."""
import bpy
import json
import os
from pathlib import Path
from mathutils import Vector
ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(os.environ.get('EIFFEL_RENDER_SOURCE', str(ROOT / 'artifacts/eiffel-rebuild/blender')))
OUT = Path(os.environ.get('EIFFEL_RENDER_OUT', str(SOURCE)))
OUT.mkdir(parents=True, exist_ok=True)
evidence = json.loads((SOURCE / 'mcp-build-result.json').read_text())
scene = bpy.data.scenes[evidence['structuredContent']['result']['scene']]
bpy.context.window.scene = scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 16
scene.cycles.use_denoising = True
scene.render.threads_mode = 'FIXED'
scene.render.threads = 12
cam = scene.camera
def view(position, target, scale, width, height, filename):
    def v(p): return Vector((p[0], -p[2], p[1]))
    cam.location = v(position)
    cam.rotation_euler = (v(target) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam.data.ortho_scale = scale
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.filepath = str(OUT / filename)
    bpy.ops.render.render(write_still=True)
view((390,230,560),(0,149,0),355,1050,1200,'eiffel-tower-beauty.png')
view((180,97,248),(0,40,0),150,1200,900,'eiffel-tower-lower-detail.png')
view((115,220,174),(0,182,0),195,825,1200,'eiffel-tower-shaft-detail.png')
