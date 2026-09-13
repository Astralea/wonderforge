"""Actual independent rigid meshes; deliberately no unsupported erection animation."""
import bpy,bmesh,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/eiffel-relay-platform-2026-09-08'
data=json.loads((OUT/'platform-units.json').read_text())
scene=bpy.data.scenes.new('WonderForge — 296 relay construction units');bpy.context.window.scene=scene
materials={}
for name,color in [('iron',(.075,.09,.085,1)),('timber',(.29,.20,.10,1))]:
 m=bpy.data.materials.new('Relay units '+name);m.diffuse_color=color;m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=color;bs.inputs['Roughness'].default_value=.85;materials[name]=m
faces=[[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]]
for u in data['units']:
 vs=[];fs=[]
 center=[sum(v[a] for p in u['prisms'] for v in p['vertices'])/(8*len(u['prisms'])) for a in range(3)]
 for p in u['prisms']:
  offset=len(vs);vs.extend((v[0]-center[0],-v[2]+center[2],v[1]-center[1]) for v in p['vertices']);fs.extend([[i+offset for i in f] for f in faces])
 mesh=bpy.data.meshes.new(u['id']);mesh.from_pydata(vs,[],fs);mesh.update();bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
 obj=bpy.data.objects.new(u['id'],mesh);scene.collection.objects.link(obj);obj.location=(center[0],-center[2],center[1]);mesh.materials.append(materials['timber' if u['kind']=='board' else 'iron'])
 obj['wf_unit_id']=u['id'];obj['wf_kind']=u['kind'];obj['wf_production_ready']=False;obj['wf_support_requirement']=u['supportRequirement'];obj.select_set(True)
bpy.context.view_layer.objects.active=obj
bpy.ops.export_scene.gltf(filepath=str(OUT/'model/platform-units.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_extras=True,export_yup=True,export_animations=False,export_lights=False,export_cameras=False)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'blender/eiffel-relay-units.blend'))
result={'scene':scene.name,'objects':len(scene.objects),'blend':str(OUT/'blender/eiffel-relay-units.blend'),'glb':str(OUT/'model/platform-units.glb'),'productionReady':False}
