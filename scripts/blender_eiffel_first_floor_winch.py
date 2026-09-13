"""Actual Blender receiving trolley and supported drum; original interpreted asset."""
import bpy,bmesh,json,math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/eiffel-first-floor-winch-2026-09-08'
design=json.loads((OUT/'design.json').read_text());scene=bpy.data.scenes.new('WonderForge — first-floor receiving winch');bpy.context.window.scene=scene
for name in ('model','blender'):(OUT/name).mkdir(exist_ok=True)
def material(name,color):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=m.diffuse_color;b.inputs['Roughness'].default_value=.75;return m
iron=material('Relay winch iron',(.11,.13,.12));bronze=material('Bearing bronze',(.35,.23,.09));timber=material('Freight crate timber',(.36,.23,.105))
def vec(v):return Vector((v[0],-v[2],v[1]))
def group(name,position,parent=None):
 o=bpy.data.objects.new(name,None);scene.collection.objects.link(o);o.parent=parent;o.location=vec(position);o['wf_role']=name;return o
faces=[[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]]
def meshbox(name,vertices,parent=None,mat=iron):
 mesh=bpy.data.meshes.new(name);mesh.from_pydata([vec(v) for v in vertices],[],faces);mesh.update();bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free();o=bpy.data.objects.new(name,mesh);scene.collection.objects.link(o);o.parent=parent;mesh.materials.append(mat);return o
def box(name,c,size,parent=None,mat=iron):return meshbox(name,[[c[0]+x*size[0]/2,c[1]+y*size[1]/2,c[2]+z*size[2]/2] for x in (-1,1) for y in (-1,1) for z in (-1,1)],parent,mat)
def cylinder(name,c,radius,depth,parent=None,mat=iron):
 bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=radius,depth=depth,location=vec(c));o=bpy.context.object;o.name=name;o.rotation_euler.y=math.pi/2;o.parent=parent;o.data.materials.append(mat);return o
frame=group('frame',[0,197,0])
for s in design['canonicalFrame']:
 o=meshbox(s['id'],[[v[0],v[1]-197,v[2]] for v in s['vertices']],frame);o['wf_source_id']=s['id']
drum=group('drum',design['drum']['center']);cylinder('drum-core',[0,0,0],.292,.95,drum)
for x in (-.49,.49):cylinder('drum-flange',[x,0,0],.36,.035,drum)
cylinder('drum-shaft',[0,0,0],.055,1.4,drum,bronze)
# Recognizable geared drive; articulated shaft, not a static silver mast.
cylinder('drive-wheel',[.69,0,0],.42,.07,drum)
for i in range(24):
 a=i*math.tau/24;box(f'gear-tooth-{i}',[.69,.43*math.sin(a),.43*math.cos(a)],[.07,.055,.055],drum)
trolley=group('trolley',design['sheave']['center'])
for x in (-.35,.35):
 for z in (-.2,.2):cylinder('trolley-wheel',[x,.655,z],.115,.08,trolley,bronze)
for z in (-.2,.2):cylinder('trolley-axle',[0,.655,z],.025,.88,trolley)
box('trolley-crosshead',[0,.78,0],[.92,.10,.56],trolley)
for x in (-.14,.14):box('sheave-hanger',[x,.355,0],[.06,.71,.16],trolley)
sheave=group('sheave',[0,0,0],trolley);cylinder('sheave-groove',[0,0,0],.242,.12,sheave)
for x in (-.075,.075):cylinder('sheave-flange',[x,0,0],.28,.025,sheave)
cylinder('sheave-shaft',[0,0,0],.035,.40,trolley,bronze)
# Bore the fixed supports so shafts do not pass through solid bearing blocks.
for prefix,c,r,depth in [('drum-bearing',design['drum']['center'],.057,1.5),('sheave-hanger',[0,0,0],.037,.5)]:
 cutter=cylinder('temporary shaft bore',c,r,depth,trolley if prefix=='sheave-hanger' else None)
 for target in [o for o in scene.objects if o.name.startswith(prefix)]:
  bpy.context.view_layer.objects.active=target;mod=target.modifiers.new('Shaft bore','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='MANIFOLD';mod.object=cutter;bpy.ops.object.modifier_apply(modifier=mod.name)
 bpy.data.objects.remove(cutter,do_unlink=True)
cargo=group('cargo',[0,197-design['worldFloorY']+.9,-1.8])
box('crate-body',[0,0,0],[.58,1.78,.58],cargo,timber)
for x in (-.22,.22):
 for y in (-.895,.895):box('crate-band-horizontal',[x,y,0],[.035,.01,.60],cargo)
 for z in (-.295,.295):box('crate-band-vertical',[x,0,z],[.035,1.78,.01],cargo)
root=group('first-floor-station',design['transform']['translation'])
root.rotation_euler.z=math.pi/2
for o in list(scene.objects):
 if o!=root and o.parent is None:o.parent=root
for o in scene.objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'model/first-floor-winch.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_extras=True,export_yup=True,export_animations=False,export_lights=False,export_cameras=False)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'blender/eiffel-first-floor-winch.blend'))
result=dict(scene=scene.name,objects=len(scene.objects),blend=str(OUT/'blender/eiffel-first-floor-winch.blend'),productionReady=False)
