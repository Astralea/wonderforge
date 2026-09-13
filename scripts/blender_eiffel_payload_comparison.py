"""Unscaled box members from the actual manifest beside the transport proxy."""
import bpy, json, math
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/eiffel-payload-admission-2026-09-08'
report=json.loads((OUT/'inventory.json').read_text())
manifest=json.loads((ROOT/report['manifest']).read_text())
parts={p['id']:p for p in manifest['parts']}
scene=bpy.data.scenes.new('WonderForge — actual payload size comparison')
bpy.context.window.scene=scene
for folder in ('blender','model','renders'):(OUT/folder).mkdir(exist_ok=True)

def material(name,color):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=.8
    return m
iron=material('Historical iron size samples',(.27,.12,.055))
wood=material('Existing transport proxy',(.46,.31,.12))
floor=material('Neutral floor',(.25,.29,.3));ink=material('Labels',(.85,.88,.86))

def box(name,x,size,mat):
    bpy.ops.mesh.primitive_cube_add(size=1,location=(x,0,size[2]/2))
    o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(mat);o['productionAdmitted']=False;return o

def label(text,x,z,size=.13):
    curve=bpy.data.curves.new('Label','FONT');curve.body=text;curve.size=size;curve.align_x='CENTER'
    o=bpy.data.objects.new('Label',curve);scene.collection.objects.link(o);o.location=(x,-.4,z);o.rotation_euler=(math.pi/2,0,0);curve.materials.append(ink)

box('Current solid proxy',-4,(.58,.58,1.78),wood)
label('PROXY\n1.78 m',-4,2.05)
for x,(role,part_id) in zip((-2.5,-.8,1,3.5),report['representatives'].items()):
    p=parts[part_id]
    if p['shape']!='box':raise ValueError('Do not replace curved geometry with its bounds')
    dims=[b-a for a,b in zip(p['localBounds']['min'],p['localBounds']['max'])]
    o=box(part_id,x,(dims[0],dims[1],dims[2]),iron)
    o['wf_part_id']=part_id;o['wf_role']='actual-member-size-comparison';o['manifest_sha256']=report['sha256']
    label(f'{role.upper()}\n{dims[2]:.2f} m',x,dims[2]+.25)
label('ACTUAL EIFFEL MEMBERS — NO GEOMETRY SCALING',0,7,.22)
label('Size comparison only. Existing box transport cannot deliver these members.',0,-.5,.16)

meshes=[o for o in scene.objects if o.type=='MESH']
for o in scene.objects:o.select_set(o in meshes)
bpy.ops.export_scene.gltf(filepath=str(OUT/'model/payload-size-comparison.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_extras=True,export_yup=True,export_animations=False)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.02));bpy.context.object.data.materials.append(floor)
world=bpy.data.worlds.new('Neutral studio');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.3,.35,.4,1);world.node_tree.nodes['Background'].inputs[1].default_value=.5;scene.world=world
bpy.ops.object.light_add(type='AREA',location=(-4,-6,10));bpy.context.object.data.energy=1800;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=8
bpy.ops.object.camera_add(location=(0,-20,7));camera=bpy.context.object;camera.rotation_euler=(Vector((0,0,3.2))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=12;scene.camera=camera
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.render.resolution_x=1500;scene.render.resolution_y=1050;scene.render.resolution_percentage=100
scene.render.filepath=str(OUT/'renders/payload-size-comparison.png')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'blender/eiffel-payload-size-comparison.blend'))
bpy.ops.render.render(write_still=True)
result={'scene':scene.name,'actualMemberIds':list(report['representatives'].values()),'blend':str(OUT/'blender/eiffel-payload-size-comparison.blend'),'render':scene.render.filepath,'productionAdmitted':False}
