"""Actual Blender transfer bridge and rigid stock cart, separate saved scene."""
import bpy,bmesh,json,math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/eiffel-second-floor-supply-2026-09-08'
design=json.loads((OUT/'bridge-design.json').read_text());scene=bpy.data.scenes.new('WonderForge — second-floor freight bridge');bpy.context.window.scene=scene
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
 o=mesh('bridge-'+role,[[[v[0],v[1]-116.14,v[2]] for v in s['vertices']] for s in design['shapes'] if s['role']==role]);o.location.z=116.14;o.data.materials.append(materials[role]);o['wf_role']='bridge-'+role
cart=bpy.data.objects.new('stock-cart',None);scene.collection.objects.link(cart);cart.location=(-15,1.8,116.14);cart['wf_role']='stock-cart'
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
bpy.ops.export_scene.gltf(filepath=str(OUT/'model/second-floor-bridge.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_extras=True,export_yup=True,export_animations=False,export_lights=False,export_cameras=False)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'blender/eiffel-second-floor-bridge.blend'))
result=dict(scene=scene.name,blend=str(OUT/'blender/eiffel-second-floor-bridge.blend'),objects=len(scene.objects),productionReady=False)
