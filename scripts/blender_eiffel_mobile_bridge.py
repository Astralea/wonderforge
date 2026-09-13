"""Lossless face partition and coplanar plank union for the mobile bridge."""
import bpy,bmesh,json,math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/eiffel-long-load-onward-2026-09-08'
with bpy.data.libraries.load(str(OUT/'blender/eiffel-onward-bridge.blend'),link=False) as(src,dst):dst.scenes=src.scenes
assert len(dst.scenes)==1
scene=dst.scenes[0];scene.name='WonderForge — mobile onward bridge';bpy.context.window.scene=scene
def components(mesh):
 parents=list(range(len(mesh.vertices)))
 def find(i):
  while parents[i]!=i:parents[i]=parents[parents[i]];i=parents[i]
  return i
 for p in mesh.polygons:
  for i in p.vertices[1:]:parents[find(i)]=find(p.vertices[0])
 groups={}
 for p in mesh.polygons:groups.setdefault(find(p.vertices[0]),[]).append(p.index)
 return list(groups.values())
def vertex_indices(mesh,polys):return sorted({i for p in polys for i in mesh.polygons[p].vertices})
def bounds(mesh,ids):return[[min(mesh.vertices[i].co[k] for i in ids) for k in range(3)],[max(mesh.vertices[i].co[k] for i in ids) for k in range(3)]]
iron=next(o for o in scene.objects if o.get('wf_role')=='bridge-iron');source=iron.data;assert not source.uv_layers and not source.color_attributes
parts=components(source);chunks={}
for polys in parts:
 ids=vertex_indices(source,polys);center=sum((iron.matrix_world@source.vertices[i].co).x for i in ids)/len(ids);chunks.setdefault(math.floor(center/4),[]).extend(polys)
parent=bpy.data.objects.new('bridge-iron spatial source',None);scene.collection.objects.link(parent);parent.parent=iron.parent;parent.matrix_world=iron.matrix_world.copy()
for k,value in iron.items():parent[k]=value
before_triangles=sum(len(p.vertices)-2 for p in source.polygons);after_triangles=0
for key,polys in sorted(chunks.items()):
 ids=vertex_indices(source,polys);mapping={old:new for new,old in enumerate(ids)}
 mesh=bpy.data.meshes.new(f'bridge-iron chunk {key}');mesh.from_pydata([source.vertices[i].co.copy() for i in ids],[],[[mapping[i] for i in source.polygons[p].vertices] for p in polys]);mesh.update()
 for material in source.materials:mesh.materials.append(material)
 for p,old in zip(mesh.polygons,polys):p.use_smooth=source.polygons[old].use_smooth;p.material_index=source.polygons[old].material_index
 o=bpy.data.objects.new(mesh.name,mesh);scene.collection.objects.link(o);o.parent=parent
 after_triangles+=sum(len(p.vertices)-2 for p in mesh.polygons)
assert before_triangles==after_triangles
bpy.data.objects.remove(iron,do_unlink=True)
timber=next(o for o in scene.objects if o.get('wf_role')=='bridge-timber');mesh=timber.data;parts=components(mesh)
boxes=sorted([bounds(mesh,vertex_indices(mesh,p)) for p in parts],key=lambda b:b[0][0]);assert len(boxes)==198
max_gap=max(b[0][0]-a[1][0] for a,b in zip(boxes,boxes[1:]));assert max_gap<.00002
for box in boxes:
 for k in (1,2):
  assert abs(box[0][k]-boxes[0][0][k])<.00002 and abs(box[1][k]-boxes[0][1][k])<.00002
lo,hi=bounds(mesh,list(range(len(mesh.vertices))));new=bpy.data.meshes.new('Continuous fixed plank envelope')
vertices=[(x,y,z) for x in (lo[0],hi[0]) for y in (lo[1],hi[1]) for z in (lo[2],hi[2])]
faces=[[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]]
new.from_pydata(vertices,[],faces);new.update();bm=bmesh.new();bm.from_mesh(new);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(new);bm.free()
for material in mesh.materials:new.materials.append(material)
timber.data=new
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(OUT/'model/bridge-mobile.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_extras=True,export_yup=True,export_animations=False,export_lights=False,export_cameras=False)
bpy.data.libraries.write(str(OUT/'blender/eiffel-bridge-mobile.blend'),{scene},fake_user=True)
report={'ironSourceComponents':len(components(source)),'ironChunks':len(chunks),'ironTrianglesBefore':before_triangles,'ironTrianglesAfter':after_triangles,'fixedPlanksBefore':len(boxes),'fixedPlankEnvelopeAfter':1,'maximumFilledPlankGapMetres':max_gap,'timberLocalBounds':[lo,hi],'objects':len(scene.objects),'desktopUnchanged':True}
(OUT/'mobile-bridge-design.json').write_text(json.dumps(report,indent=2)+'\n');result=report
