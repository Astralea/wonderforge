import bpy, math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/eiffel-upper-material-chain-2026-09-08'
with bpy.data.libraries.load(str(OUT/'blender/paris-photo-entrance.blend'),link=False) as (a,b):b.scenes=[a.scenes[0]]
scene=b.scenes[0];bpy.context.window.scene=scene
def v(p):return Vector((p[0],-p[2],p[1]))
world=bpy.data.worlds.new('Entrance daylight');world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Color'].default_value=(.64,.73,.83,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.65;scene.world=world
ground=bpy.data.materials.new('Preview earth');ground.diffuse_color=(.30,.28,.20,1)
bpy.ops.mesh.primitive_plane_add(size=200,location=v([-118,-.24,14]));bpy.context.object.data.materials.append(ground)
data=bpy.data.lights.new('Entrance sun','AREA');data.energy=2100;data.shape='DISK';data.size=9
light=bpy.data.objects.new('Entrance sun',data);scene.collection.objects.link(light);light.location=v([-109,14,23]);light.rotation_euler=(v([-118,0,14])-light.location).to_track_quat('-Z','Y').to_euler()
data=bpy.data.cameras.new('Entrance review camera');camera=bpy.data.objects.new('Entrance review camera',data);scene.collection.objects.link(camera)
camera.location=v([-108,6,26]);camera.rotation_euler=(v([-118,1.3,14])-camera.location).to_track_quat('-Z','Y').to_euler();data.lens=40;scene.camera=camera
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.threads_mode='FIXED';scene.render.threads=2
scene.render.resolution_x=1200;scene.render.resolution_y=750;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG'
scene.render.filepath=str(OUT/'entrance/blender-review.png');bpy.ops.render.render(write_still=True)
result={'render':scene.render.filepath,'source':str(OUT/'blender/paris-photo-entrance.blend')}
