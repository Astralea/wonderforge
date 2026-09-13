"""Blender candidate frame only; deliberately not an operational crane."""
import bpy,bmesh,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/eiffel-diagonal-receiver-2026-09-08'
design=json.loads((OUT/'design.json').read_text())
scene=bpy.data.scenes.new('WonderForge — diagonal receiver frame candidate');bpy.context.window.scene=scene
for name in ('model','blender'):(OUT/name).mkdir(exist_ok=True)
material=bpy.data.materials.new('Receiver painted iron');material.use_nodes=True
bs=material.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.18,.19,.15,1);bs.inputs['Roughness'].default_value=.8
faces=[[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]]
for shape in design['shapes']:
 m=bpy.data.meshes.new(shape['id']);m.from_pydata([(v[0],-v[2],v[1]) for v in shape['vertices']],[],faces);m.update()
 bm=bmesh.new();bm.from_mesh(m);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(m);bm.free()
 o=bpy.data.objects.new(shape['id'],m);scene.collection.objects.link(o);m.materials.append(material);o['wf_source_id']=shape['id'];o['wf_role']='candidate-frame';o['productionReady']=False
for o in scene.objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'model/diagonal-receiver-frame.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_extras=True,export_yup=True,export_animations=False,export_lights=False,export_cameras=False)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'blender/eiffel-diagonal-receiver-frame.blend'))
result={'scene':scene.name,'objects':len(scene.objects),'blend':str(OUT/'blender/eiffel-diagonal-receiver-frame.blend'),'productionReady':False,'scope':'frame only; no trolley/hoist/drive/rigging'}
