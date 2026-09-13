"""Build the checked receiver prisms in a separate Blender scene via MCP."""
import bpy,bmesh,json,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/eiffel-face-installation-2026-09-08'
shapes=json.loads((OUT/'worker-platform-occupancy.json').read_text());design=json.loads((OUT/'worker-platform-design.json').read_text())
scene=bpy.data.scenes.new('WonderForge — receiving worker platform');bpy.context.window.scene=scene
collection=bpy.data.collections.new('Supported receiving worker platform');scene.collection.children.link(collection)
mat=bpy.data.materials.new('Receiving deck timber');mat.diffuse_color=(.29,.20,.10,1);mat.use_nodes=True;node=mat.node_tree.nodes.get('Principled BSDF');node.inputs['Base Color'].default_value=mat.diffuse_color;node.inputs['Roughness'].default_value=.92
# Source corners use x/y/z sign order; face winding is recomputed after Y-up conversion.
faces=[[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]]
objects=[];seen=set()
for shape in shapes:
 key=json.dumps(shape['vertices'])
 if key in seen:continue
 seen.add(key);verts=[(v[0],-v[2],v[1]) for v in shape['vertices']]
 mesh=bpy.data.meshes.new(shape['id']);mesh.from_pydata(verts,[],faces);mesh.update();bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
 o=bpy.data.objects.new(shape['id'],mesh);collection.objects.link(o);mesh.materials.append(mat);o['wf_role']=shape['id'];objects.append(o)
# Union the intersecting bearing joints; exported wood occupies their union,
# rather than retaining multiple intersecting interior surfaces.
base=objects[0];bpy.context.view_layer.objects.active=base
for other in objects[1:]:
 mod=base.modifiers.new('Joined timber bearing','BOOLEAN');mod.operation='UNION';mod.solver='EXACT';mod.object=other
 bpy.ops.object.modifier_apply(modifier=mod.name);other.hide_render=True;other.hide_set(True)
base.name='worker-platform-joined-timber';base['wf_role']='worker-platform';base['wf_source_occupancy_sha256']=hashlib.sha256((OUT/'worker-platform-occupancy.json').read_bytes()).hexdigest()
for o in scene.objects:o.select_set(False)
base.select_set(True);bpy.context.view_layer.objects.active=base
(OUT/'model').mkdir(exist_ok=True);(OUT/'blender').mkdir(exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'model/worker-platform.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_extras=True,export_yup=True,export_animations=False,export_lights=False,export_cameras=False)
result={'scene':scene.name,'blend':str(OUT/'blender/eiffel-face-worker-platform.blend'),'sourceOccupancySHA256':base['wf_source_occupancy_sha256'],'productionAdmitted':False,'limits':['Timber bearing geometry study. Fixings, rated strength, worker access and erection are not reconstructed.','Hidden source prisms are retained for editing; exported joined mesh is the visible union.']}
(OUT/'model/manifest.json').write_text(json.dumps(result,indent=2)+'\n');bpy.ops.wm.save_as_mainfile(filepath=result['blend'])
