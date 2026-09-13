"""Blender-authored work clothes and separate fixed-size body parts for IK poses."""
import bpy,bmesh,json
from pathlib import Path
from mathutils import Quaternion
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/eiffel-supply-crew-2026-09-08';design=json.loads((OUT/'worker-design.json').read_text())
scene=bpy.data.scenes.new('WonderForge — freight cart pusher');bpy.context.window.scene=scene
for d in ('model','blender'):(OUT/d).mkdir(exist_ok=True)
mats={}
for name,c in [('cloth',(.15,.21,.23)),('pants',(.19,.13,.085)),('skin',(.58,.37,.23)),('boot',(.045,.04,.033))]:
 m=bpy.data.materials.new('Pusher '+name);m.use_nodes=True;m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(*c,1);m.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.9;mats[name]=m
for p in design['parts']:
 bpy.ops.mesh.primitive_cube_add(size=1);o=bpy.context.object;o.name='pusher-'+p['id'];o.scale=(p['size'][0],p['size'][2],p['size'][1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 o.data.materials.append(mats[p['material']]);mod=o.modifiers.new('Rounded clothing edges','BEVEL');mod.width=.012 if p['material']!='skin' else .018;mod.segments=2;bpy.ops.object.modifier_apply(modifier=mod.name)
 v=p['center'];q=p['quaternion'];o.location=(v[0],-v[2],v[1]);o.rotation_mode='QUATERNION';o.rotation_quaternion=Quaternion((q[3],q[0],-q[2],q[1]));o['wf_worker_part']=p['id'];o['wf_part_size']=p['size']
for o in scene.objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'model/supply-pusher.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_extras=True,export_yup=True,export_animations=False,export_lights=False,export_cameras=False)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'blender/eiffel-supply-pusher.blend'))
result=dict(scene=scene.name,parts=len(design['parts']),blend=str(OUT/'blender/eiffel-supply-pusher.blend'))
