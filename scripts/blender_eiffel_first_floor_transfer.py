"""Actual Blender transfer bridge and rigid stock cart, separate saved scene."""
import bpy,bmesh,json,math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/eiffel-first-floor-transfer-2026-09-08'
design=json.loads((OUT/'bridge-design.json').read_text());scene=bpy.data.scenes.new('WonderForge — first-floor transfer bridge');bpy.context.window.scene=scene
for d in ('model','blender'):(OUT/d).mkdir(exist_ok=True)
faces=[[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]]
materials={}
for role,c in [('iron',(.13,.14,.12)),('timber',(.37,.25,.12))]:
 m=bpy.data.materials.new('Freight bridge '+role);m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*c,1);bs.inputs['Roughness'].default_value=.85;materials[role]=m
def mesh(name,shapes,parent=None):
 vs=[];fs=[]
 for vertices in shapes:
  offset=len(vs);vs.extend((v[0],-v[2],v[1]) for v in vertices);fs.extend([[i+offset for i in f] for f in faces])
 m=bpy.data.meshes.new(name);m.from_pydata(vs,[],fs);m.update();bm=bmesh.new();bm.from_mesh(m);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(m);bm.free();o=bpy.data.objects.new(name,m);scene.collection.objects.link(o);o.parent=parent;return o
def box(name,c,size,parent,role='iron'):
 o=mesh(name,[[[c[0]+x*size[0]/2,c[1]+y*size[1]/2,c[2]+z*size[2]/2] for x in (-1,1) for y in (-1,1) for z in (-1,1)]],parent);o.data.materials.append(materials[role]);return o
for role in ('iron','timber'):
 o=mesh('bridge-'+role,[[[v[0],v[1]-design['floorY'],v[2]] for v in s['vertices']] for s in design['shapes'] if s['role']==role and not s.get('hatch')]);o.location.z=design['floorY'];o.data.materials.append(materials[role]);o['wf_role']='bridge-'+role
pivot=design['hatchPivot']
hatch=bpy.data.objects.new('freight-hatch',None);scene.collection.objects.link(hatch);hatch.location=(pivot[0],-pivot[2],pivot[1]);hatch.rotation_euler.x=math.pi/2;hatch['wf_role']='freight-hatch'
for item in design['shapes']:
 if item.get('hatch'):
  o=mesh(item['id'],[[[v[k]-pivot[k] for k in range(3)] for v in item['vertices']]],hatch);o.data.materials.append(materials['timber'])
# Real pin/knuckle hinges; the hinge axis sits outside the timber edge.
def tube(name,c,outer,inner,length,parent=None):
 vs=[]
 for x in (-length/2,length/2):
  for r in (outer,inner):
   for i in range(32):
    angle=i*math.tau/32;v=[c[0]+x,c[1]+r*math.cos(angle),c[2]+r*math.sin(angle)];vs.append((v[0],-v[2],v[1]))
 fs=[]
 for i in range(32):
  j=(i+1)%32
  fs.extend([[i,j,64+j,64+i],[32+i,96+i,96+j,32+j],[i,32+i,32+j,j],[64+i,64+j,96+j,96+i]])
 m=bpy.data.meshes.new(name);m.from_pydata(vs,[],fs);m.update();bm=bmesh.new();bm.from_mesh(m);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(m);bm.free();o=bpy.data.objects.new(name,m);scene.collection.objects.link(o);o.parent=parent;m.materials.append(materials['iron']);o['wf_role']='hatch-knuckle';return o
for x in (-20.1,-19.5):
 box('hinge-seat',[x,pivot[1]-.06,pivot[2]-.07],[.18,.04,.14],None)
 for dx in (-.055,.055):tube('fixed-hinge-knuckle',[x+dx,pivot[1],pivot[2]],.04,.026,.05)
 tube('moving-hinge-knuckle',[x-pivot[0],0,0],.04,.026,.04,hatch)
 box('moving-hinge-leaf',[x-pivot[0],.006,-.11],[.04,.012,.18],hatch)
 bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=.025,depth=.2,location=(x,-pivot[2],pivot[1]));o=bpy.context.object;o.name='hatch-hinge-pin';o.rotation_euler.y=math.pi/2;o.data.materials.append(materials['iron']);o['wf_role']='hatch-hinge-pin'
cart=bpy.data.objects.new('stock-cart',None);scene.collection.objects.link(cart);cart.location=(-21.5,4,design['floorY']);cart['wf_role']='stock-cart'
box('cart-bed',[0,.29,0],[.8,.10,.8],cart,'timber')
for x in (-.25,.25):
 for z in (-.38,.38):
  bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=.12,depth=.07);o=bpy.context.object;o.name='cart-wheel';o.parent=cart;o.location=(x,-z,.12);o.rotation_euler.x=math.pi/2;o.data.materials.append(materials['iron']);o['wf_role']='cart-wheel'
  box('axle-bearing',[x,.18,z],[.08,.12,.07],cart)
 box('cart-axle',[x,.12,0],[.055,.055,.84],cart)
for z in (-.26,.26):
 box('push-handle-upright',[-.8,.615,z],[.03,.67,.03],cart)
 box('push-handle-tie',[-.60,.29,z],[.40,.03,.03],cart)
box('push-handle-bar',[-.8,.95,0],[.03,.03,.60],cart)
for o in scene.objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'model/first-floor-bridge.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_extras=True,export_yup=True,export_animations=False,export_lights=False,export_cameras=False)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'blender/eiffel-first-floor-bridge.blend'))
result=dict(scene=scene.name,blend=str(OUT/'blender/eiffel-first-floor-bridge.blend'),objects=len(scene.objects),productionReady=False)
