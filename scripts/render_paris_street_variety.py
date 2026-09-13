import bpy,json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/paris-street-variety-2026-09-08'
with bpy.data.libraries.load(str(OUT/'blender/paris-1889.blend'),link=False) as (source,target):
    target.scenes=[source.scenes[0]]
scene=target.scenes[0];bpy.context.window.scene=scene
objects=[o for o in scene.objects if o.type=='MESH']
readback={'source':str(OUT/'blender/paris-1889.blend'),'objects':len(scene.objects),'meshes':len(objects),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in objects),'packedImages':[im.name for im in bpy.data.images if im.packed_file]}
(OUT/'blender/saved-source-readback.json').write_text(json.dumps(readback,indent=2)+'\n')
def v(p):return Vector((p[0],-p[2],p[1]))
scene.camera.location=v([455,190,-60]);scene.camera.rotation_euler=(v([337,10,148])-scene.camera.location).to_track_quat('-Z','Y').to_euler()
scene.camera.data.type='ORTHO';scene.camera.data.ortho_scale=320
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.threads_mode='FIXED';scene.render.threads=2
scene.render.resolution_x=1400;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.filepath=str(OUT/'blender/near-city-review.png')
bpy.ops.render.render(write_still=True)
# Keep the reviewed camera as a separate editable view of the saved source.
bpy.data.libraries.write(str(OUT/'blender/paris-street-review.blend'),{scene},fake_user=True)
result={**readback,'render':scene.render.filepath}
