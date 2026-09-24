"""Non-exporting studio inspection of the preserved original Blender source."""
from pathlib import Path
import bpy
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[3]
OUT=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(OUT/'colosseum-housing-variants-v1.blend'))
for i,key in enumerate(['courtyard','stepped','frontage','corner']):
    bpy.data.objects['housing-'+key].location.x=(i-1.5)*16
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.02))
ground=bpy.context.object
mat=bpy.data.materials.new('inspection-floor');mat.diffuse_color=(.34,.38,.36,1);ground.data.materials.append(mat)
bpy.ops.object.light_add(type='AREA',location=(-12,-12,30))
key=bpy.context.object;key.data.energy=5200;key.data.shape='DISK';key.data.size=30
key.rotation_euler=(Vector((0,0,0))-key.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(23,-50,40))
camera=bpy.context.object;camera.rotation_euler=(Vector((0,0,4))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=67
scene=bpy.context.scene;scene.camera=camera;scene.world=bpy.data.worlds.new('inspection-world');scene.world.color=(.5,.5,.5);scene.render.engine='CYCLES';scene.cycles.samples=48
scene.render.resolution_x=2048;scene.render.resolution_y=850;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG';scene.render.filepath=str(OUT/'housing-variants-inspection.png')
bpy.ops.render.render(write_still=True)
