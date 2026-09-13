"""Actual long kit member in an interpreted, unrated lifting carrier."""
import bpy, bmesh, json, math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/eiffel-long-load-carrier-2026-09-08'
manifest=json.loads((ROOT/'public/models/eiffel-construction-kit/tower-kit.manifest.json').read_text())
part=next(p for p in manifest['parts'] if p['id']=='summit-access-stair-m000-c000')
width,depth,length=part['transportSize'];H=.08+length+.16
scene=bpy.data.scenes.new('WonderForge — real long-load lifting carrier');bpy.context.window.scene=scene
for name in ('model','blender'):(OUT/name).mkdir(exist_ok=True)
def material(name,color):
 m=bpy.data.materials.new(name);m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*color,1);b.inputs['Roughness'].default_value=.82;return m
iron=material('Carrier dark iron',(.12,.145,.12));loadmat=material('Actual tower member',(.34,.16,.065))
def vec(v):return Vector((v[0],-v[2],v[1]))
def box(name,c,size,mat=iron):
 bpy.ops.mesh.primitive_cube_add(size=1,location=vec(c));o=bpy.context.object;o.name=name;o.dimensions=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat);o['wf_role']=name;return o
def cylinder(name,c,r,h):
 bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=r,depth=h,location=vec(c));o=bpy.context.object;o.name=name;o.data.materials.append(iron);o['wf_role']=name;return o
def boolean(target,cutter,op):
 bpy.context.view_layer.objects.active=target;mod=target.modifiers.new('Real material connection or hole','BOOLEAN');mod.operation=op;mod.solver='MANIFOLD';mod.object=cutter;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True)
shoe=box('bottom-shoe',[0,.04,0],[.44,.08,.44]);head=box('head-plate',[0,H-.03,0],[.44,.06,.44])
for x in (-.17,.17):
 for z in (-.17,.17):cylinder(f'tension-rod-{x}-{z}',[x,(.08+H-.06)/2,z],.015,H-.06-.08)
for y in (1.25,4.75):
 collar=box(f'lateral-collar-{y}',[0,y,0],[.37,.06,.37]);boolean(collar,box('cargo-opening',[0,y,0],[width,.10,depth]),'DIFFERENCE')
 for x in (-.17,.17):
  for z in (-.17,.17):boolean(collar,cylinder('rod-opening',[x,y,z],.015,.10),'DIFFERENCE')
eye_centres=[]
for x in (-.17,.17):
 for z in (-.17,.17):
  c=Vector((x,H+.035,z));radial=Vector((x,0,z)).normalized();normal=Vector((-radial.z,0,radial.x));up=Vector((0,1,0));verts=[]
  for offset,r in ((-.009,.05),(.009,.05),(-.009,.026),(.009,.026)):
   for i in range(48):
    a=i*math.tau/48;verts.append(vec(c+normal*offset+radial*(math.cos(a)*r)+up*(math.sin(a)*r)))
  faces=[]
  for i in range(48):
   j=(i+1)%48;faces.extend([(i,j,48+j,48+i),(96+i,144+i,144+j,96+j),(i,96+i,96+j,j),(48+i,48+j,144+j,144+i)])
  mesh=bpy.data.meshes.new('Bored lifting eye');mesh.from_pydata(verts,[],faces);mesh.update();bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free();eye=bpy.data.objects.new('Lifting eye',mesh);scene.collection.objects.link(eye);boolean(head,eye,'UNION');eye_centres.append(list(c))
payload=box('actual-payload',[0,.08+length/2,0],[width,length,depth],loadmat);payload['wf_part_id']=part['id'];payload['wf_transport_axis_assignment']='0,2,1';payload['productionAdmitted']=False
root=bpy.data.objects.new('long-load-carrier',None);root['wf_role']='long-load-carrier';root['productionAdmitted']=False;scene.collection.objects.link(root)
for o in list(scene.objects):
 if o!=root:o.parent=root
for o in scene.objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'model/long-load-carrier.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_extras=True,export_yup=True,export_animations=False)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'blender/eiffel-long-load-carrier.blend'))
design={'partId':part['id'],'payloadSize':[width,length,depth],'payloadBottom':.08,'headPlateTop':H,'carrierTop':H+.085,'hookY':H+.65,'eyeCenters':eye_centres,'eyeInnerRadius':.026,'slingRadius':.008,'productionReady':False,'limits':['Unrated interpreted carrier; no structural capacity claim.','Hook stays attached after landing; cart anchorage and unloading are not authored.','Equipment drive, braking and erection remain incomplete.']}
(OUT/'carrier-design.json').write_text(json.dumps(design,indent=2)+'\n')
result={'scene':scene.name,'partId':part['id'],'blend':str(OUT/'blender/eiffel-long-load-carrier.blend'),'objects':len(scene.objects),'productionReady':False}
