"""Drilled fishplates and independent fasteners, via actual Blender MCP."""
import bpy,json,math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/eiffel-relay-platform-2026-09-08'
# Reuse mesh construction only; never overwrite the previous unit export or .blend.
source=(ROOT/'scripts/blender_eiffel_relay_units.py').read_text().split('bpy.ops.export_scene.gltf')[0].replace('WonderForge — 296 relay construction units','WonderForge — relay drilled web splices')
exec(compile(source,'relay-unit-meshes','exec'),globals())
joints=json.loads((OUT/'platform-splices.json').read_text())['joints']
unitobjects={o.get('wf_unit_id'):o for o in scene.objects}
def pos(v):return Vector((v[0],-v[2],v[1]))
def box(name,c,size):
 bpy.ops.mesh.primitive_cube_add(size=1,location=pos(c));o=bpy.context.object;o.name=name;o.scale=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(materials['iron']);return o
def cylinder(name,c,axis,radius,depth,vertices=24):
 direction=pos([1 if i==axis else 0 for i in range(3)])
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=pos(c));o=bpy.context.object;o.name=name;o.rotation_euler=direction.to_track_quat('Z','Y').to_euler();o.data.materials.append(materials['iron']);return o
def drill(target,cutter):
 bpy.context.view_layer.objects.active=target;m=target.modifiers.new('Real bolt bore','BOOLEAN');m.operation='DIFFERENCE';m.solver='MANIFOLD';m.object=cutter;bpy.ops.object.modifier_apply(modifier=m.name);target.data.validate();target.data.update()
for j in joints:
 plates=[]
 for p in j['plates']:
  o=box(p['id'],p['center'],p['size']);o['wf_splice_id']=j['id'];o['wf_role']='fishplate';plates.append(o)
 for i,b in enumerate(j['bolts']):
  cutter=cylinder('temporary bore',b['center'],b['axis'],b['holeRadius'],.15,32)
  for target in [*plates,*[unitobjects[id] for id in j['unitIds']]]:drill(target,cutter)
  bpy.data.objects.remove(cutter,do_unlink=True)
  bolt=cylinder(f"{j['id']}-bolt-{i}",b['center'],b['axis'],b['shaftRadius'],b['grip']);bolt['wf_role']='bolt-shaft';bolt['wf_splice_id']=j['id']
  for side in (-1,1):
   c=b['center'].copy();c[b['axis']]+=side*(b['grip']/2+b['headDepth']/2)
   head=cylinder(f"{j['id']}-head-{i}-{side}",c,b['axis'],b['headRadius'],b['headDepth'],6);head['wf_role']='bolt-head';head['wf_splice_id']=j['id']
for o in scene.objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'model/platform-spliced.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_extras=True,export_yup=True,export_animations=False,export_lights=False,export_cameras=False)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'blender/eiffel-relay-spliced.blend'))
result={'scene':scene.name,'objects':len(scene.objects),'joints':len(joints),'blend':str(OUT/'blender/eiffel-relay-spliced.blend'),'productionReady':False}
