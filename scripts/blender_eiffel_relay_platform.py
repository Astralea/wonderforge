"""Build the checked receiver prisms in a separate Blender scene via MCP."""
import bpy,bmesh,json,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/eiffel-relay-platform-2026-09-08'
shapes=json.loads((OUT/'platform-occupancy.json').read_text());design=json.loads((OUT/'platform-design.json').read_text())
context_scene=bpy.context.scene
scene=bpy.data.scenes.new('WonderForge — supported 197m relay platform');bpy.context.window.scene=scene
collection=bpy.data.collections.new('Relay platform — source and export');scene.collection.children.link(collection)
mat=bpy.data.materials.new('Receiving deck timber');mat.diffuse_color=(.29,.20,.10,1);mat.use_nodes=True;node=mat.node_tree.nodes.get('Principled BSDF');node.inputs['Base Color'].default_value=mat.diffuse_color;node.inputs['Roughness'].default_value=.92
# Source corners use x/y/z sign order; face winding is recomputed after Y-up conversion.
faces=[[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]]
objects=[];seen=set()
for shape in shapes:
 key=json.dumps(shape['vertices'])
 if key in seen:continue
 seen.add(key);verts=[(v[0],-v[2],v[1]-197) for v in shape['vertices']]
 mesh=bpy.data.meshes.new(shape['id']);mesh.from_pydata(verts,[],faces);mesh.update();bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
 o=bpy.data.objects.new(shape['id'],mesh);collection.objects.link(o);o.location.z=197;mesh.materials.append(mat);o['wf_role']=shape['role'];o['wf_source_role']=shape['role'];o['wf_source_id']=shape['id'];objects.append(o)
iron=bpy.data.materials.new('Relay platform iron');iron.use_nodes=True
bs=iron.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.075,.09,.085,1);bs.inputs['Metallic'].default_value=.45;bs.inputs['Roughness'].default_value=.7
exports=[]
for group in ('deck','structure'):
 members=[o for o in objects if (o['wf_source_role']=='deck')==(group=='deck')]
 if group=='structure':
  for o in members:o.data.materials.clear();o.data.materials.append(iron)
 base=members[0];bpy.context.view_layer.objects.active=base
 for other in members[1:]:
  mod=base.modifiers.new('Joined platform joints','BOOLEAN');mod.operation='UNION';mod.solver='MANIFOLD';mod.object=other
  bpy.ops.object.modifier_apply(modifier=mod.name);other.hide_render=True;other.hide_set(True)
 base.data.validate(verbose=True);base.data.update();base.name='relay-platform-'+group;base['wf_role']='relay-'+group;exports.append(base)
for o in scene.objects:o.select_set(False)
for o in exports:o.select_set(True)
bpy.context.view_layer.objects.active=exports[0]
for f in ('model','blender','renders'):(OUT/f).mkdir(exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'model/platform.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_extras=True,export_yup=True,export_animations=False,export_lights=False,export_cameras=False)
# Actual kit context, completed through the support bay.
manifest=json.loads((ROOT/'public/models/eiffel-construction-kit/tower-kit.manifest.json').read_text())
source_stages={p['sourceMember']:p['stage']for p in manifest['parts']}
if context_scene.name.startswith('WonderForge — supported 197m relay platform'):
 context_objects={o for o in context_scene.objects if o.get('wf_source') in source_stages and source_stages[o.get('wf_source')]<=45}
 for o in list(context_objects):
  parent=o.parent
  while parent:context_objects.add(parent);parent=parent.parent
 for o in context_objects:scene.collection.objects.link(o)
else:
 before=set(bpy.data.objects)
 bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/models/eiffel-construction-kit/tower-kit-seated.glb'))
 for o in set(bpy.data.objects)-before:
  if o.type=='MESH' and source_stages.get(o.get('wf_source'),999)>45:bpy.data.objects.remove(o,do_unlink=True)
from mathutils import Vector
world=bpy.data.worlds.new('Relay daylight');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.3,.38,.44,1);world.node_tree.nodes['Background'].inputs[1].default_value=.6;scene.world=world
light=bpy.data.lights.new('Relay sun','SUN');light.energy=3;light.angle=.12
sun=bpy.data.objects.new('Relay sun',light);scene.collection.objects.link(sun);sun.rotation_euler=(.5,-.6,-.5)
camera=bpy.data.cameras.new('Relay platform review');cam=bpy.data.objects.new('Relay platform review',camera);scene.collection.objects.link(cam);scene.camera=cam
cam.location=(24,-28,215);cam.rotation_euler=(Vector((0,0,197))-cam.location).to_track_quat('-Z','Y').to_euler();camera.type='ORTHO';camera.ortho_scale=25
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.render.threads_mode='FIXED';scene.render.threads=12;scene.render.resolution_x=1500;scene.render.resolution_y=1200;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX'
result={'scene':scene.name,'blend':str(OUT/'blender/eiffel-relay-platform.blend'),'floorY':197,'sourcePrisms':len(shapes),'productionReady':False,'limits':['Authored fitted collars, not rated anchor/bolt capacity.','Erection, central guide support, winch mounting and cargo/rope lifecycle not admitted.']}
(OUT/'model/manifest.json').write_text(json.dumps(result,indent=2)+'\n');bpy.ops.wm.save_as_mainfile(filepath=result['blend'])
scene.render.filepath=str(OUT/'renders/platform.png');bpy.ops.render.render(write_still=True)
