"""blender --background --python scripts/blender-export-sydney-overhaul.py
Rebuild a separate original inspection scene from the exact runtime export.
Never replaces the user's active Blender scene or old asset evidence.
"""
import json,math
from pathlib import Path
import bpy
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/sydney-overhaul-2026-09-23/model'
bpy.ops.wm.read_factory_settings(use_empty=True)
materials={}
for role,color in [('granite',(.55,.43,.35,1)),('concrete',(.66,.64,.58,1)),('tile',(.87,.86,.8,1))]:
 m=bpy.data.materials.new(role);m.diffuse_color=color;materials[role]=m
for group in json.loads((OUT/'geometry.json').read_text()):
 raw=group['vertices'];vertices=[(raw[i],-raw[i+2],raw[i+1]) for i in range(0,len(raw),3)]
 mesh=bpy.data.meshes.new(group['name']);mesh.from_pydata(vertices,[],[(i,i+1,i+2) for i in range(0,len(vertices),3)]);mesh.update()
 obj=bpy.data.objects.new(group['name'],mesh);bpy.context.collection.objects.link(obj);obj.data.materials.append(materials[group['material']])
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'sydney-overhaul.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'sydney-overhaul.glb'),export_format='GLB',export_yup=True)
# Inspection image is separate from runtime film acceptance.
bpy.ops.object.camera_add(location=(250,-225,160));camera=bpy.context.object
camera.rotation_euler=(Vector((0,0,30))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=235
bpy.context.scene.camera=camera
bpy.ops.object.light_add(type='AREA',location=(100,-70,180));bpy.context.object.data.energy=250000;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=100
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16
if scene.world is None: scene.world=bpy.data.worlds.new('Sydney inspection world')
scene.world.color=(.3,.3,.3);scene.render.resolution_x=1200;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.render.filepath=str(OUT/'inspection.png');bpy.ops.render.render(write_still=True)
