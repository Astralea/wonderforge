"""Parent-authored onward hardware; executed through the installed Blender MCP.

Copies named source scenes, preserves all earlier .blend files, and exports rigid
roles. The simulation owns the poses; geometry never scales to indicate work.
"""
import bpy, json, math, bmesh
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/eiffel-long-load-onward-2026-09-08'
D=json.loads((OUT/'design.json').read_text());F=D['floorY']
for sub in ('model','blender','mcp'):(OUT/sub).mkdir(exist_ok=True)
scene=bpy.data.scenes.new('WonderForge — long-load onward hardware')
bpy.context.window.scene=scene
def vec(v):return Vector((v[0],-v[2],v[1]))
def mat(name,color):
 m=bpy.data.materials.new('Onward '+name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=.87;return m
iron=mat('forged iron',(.105,.115,.098));wood=mat('timber',(.32,.21,.10));cloth=mat('work clothes',(.14,.20,.22));skin=mat('skin',(.58,.37,.23));fiber=iron
def root(role,c=(0,0,0),parent=None):
 o=bpy.data.objects.new(role,None);scene.collection.objects.link(o);o['wf_role']=role;o.parent=parent;o.location=vec(c);return o
def attach(o,name,c,parent,material):
 o.name=name;o.parent=parent;o.location=vec(c);o.data.materials.append(material);return o
def box(name,c,size,parent=None,material=iron,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1);o=bpy.context.object;o.dimensions=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  mod=o.modifiers.new('Soft worked edge','BEVEL');mod.width=bevel;mod.segments=1;bpy.ops.object.modifier_apply(modifier=mod.name)
 return attach(o,name,c,parent,material)
def cyl(name,c,r,length,parent=None,material=iron,axis=(0,1,0),n=16):
 bpy.ops.mesh.primitive_cylinder_add(vertices=n,radius=r,depth=length);o=bpy.context.object;o.rotation_mode='QUATERNION';o.rotation_quaternion=Vector((0,0,1)).rotation_difference(vec(axis));return attach(o,name,c,parent,material)
def beam(name,a,b,r,parent=None,material=wood):
 delta=Vector(b)-Vector(a);return cyl(name,(Vector(a)+Vector(b))/2,r,delta.length,parent,material,delta.normalized(),12)
def cut(target,cutter):
 cutter.data.materials.clear();cutter.data.materials.append(target.data.materials[0]);bpy.context.view_layer.update();bpy.context.view_layer.objects.active=target;mod=target.modifiers.new('Through bore','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='MANIFOLD';mod.object=cutter;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True)
def rope(name,points,parent):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=.008;c.bevel_resolution=1;c.resolution_u=1;c.use_fill_caps=True;s=c.splines.new('POLY');s.points.add(len(points)-1)
 for p,v in zip(s.points,points):p.co=(*vec(v),1)
 o=bpy.data.objects.new(name,c);scene.collection.objects.link(o);o.parent=parent;c.materials.append(fiber)
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');return o
def append_scene(path,name):
 with bpy.data.libraries.load(str(path),link=False) as (src,dst):
  assert name in src.scenes,name;dst.scenes=[name]
 return dst.scenes[0]
def export(target,objects=None):
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects or list(scene.objects):o.select_set(True)
 bpy.ops.export_scene.gltf(filepath=str(OUT/'model'/target),export_format='GLB',use_selection=True,use_active_scene=True,export_extras=True,export_yup=True,export_animations=False,export_lights=False,export_cameras=False)

# Actual opening upper fitting. The original master ring and lower slings are
# retained in a separate exact-source export below.
M=[-21.5,F+.34+D['masterOffset'][1],-4]
head=root('opening-clevis',M);C=D['clevis']
for z in C['cheekCentersZ']:
 cheek=box('clevis-cheek',[0,C['cheekCenterY'],z],C['cheekSize'],head)
 cutter=cyl('clevis-bore',[0,C['boreCenterY'],z],C['boreRadius'],.06,head,axis=(0,0,1),n=32);cut(cheek,cutter)
cyl('clevis-crossbar',[0,.205,0],.012,.08,head,axis=(0,0,1),n=24)
pin=root('clevis-pin',C['pinCenter'],head)
cyl('clevis-pin-shaft',[0,0,0],.008,.084,pin,axis=(0,0,1),n=24)
cyl('clevis-pin-head',[0,0,.048],.014,.012,pin,axis=(0,0,1),n=6)
# Captive tail guide extends beyond the withdrawn head, physically retaining it.
for x in (-.018,.018):box('pin-slide-guide',[x,.104,.085],[.006,.028,.112],head)
box('pin-guide-stop',[0,.104,.144],[.042,.028,.006],head)
keeper=root('clevis-keeper',C['keeperPivot'],head)
cyl('keeper-hinge',[0,0,0],.003,.032,keeper,n=16)
box('keeper-blade',[-.017,0,0],[.038,.014,.006],keeper)
box('keeper-thumb-lever',[0,.020,0],[.009,.036,.009],keeper)
theta=math.acos(.020/.120)
points=[[0,.325,0]]+[[.020*math.sin(theta+(math.tau-2*theta)*i/36),.205+.020*math.cos(theta+(math.tau-2*theta)*i/36),0] for i in range(37)]+[[0,.325,0]]
rope('replacement-upper-rope-eye',points,head)

# A carrier-mounted rest supports the retained sling after release.
saddle=root('sling-parking-saddle',[-21.5,F+.34,-4]);S=D['saddle']
box('saddle-post',[0,(S['bottomY']+S['topY']-.01)/2,0],[.022,S['topY']-.01-S['bottomY'],.022],saddle)
box('saddle-pad',[0,S['topY']-.005,0],S['padSize'],saddle)
for z in (-.032,.032):box('saddle-side-guide',[0,S['topY']+.011,z],[.05,.022,.006],saddle)

# Permanent narrow work scaffold, with real support posts, braces and ladder.
sc=root('release-scaffold')
for x,z in D['scaffold']['postXZ']:
 box('scaffold-upright',[x,F+2.86,z],[.09,5.72,.09],sc,wood)
 box('scaffold-sole',[x,F+.018,z],[.23,.036,.23],sc,wood)
for y in (1.45,2.9,4.35,5.68):
 for z in (-4.60,-3.40):beam('scaffold-transom',[-22.48,F+y,z],[-21.88,F+y,z],.042,sc)
 for x in (-22.48,-21.88):beam('scaffold-longitudinal',[x,F+y,-4.60],[x,F+y,-3.40],.042,sc)
for x in (-22.48,-21.88):
 for y in (0,2.86):beam('scaffold-diagonal',[x,F+y+.1,-4.6],[x,F+y+2.8,-3.4],.027,sc)
box('scaffold-landing',[-22.2,F+5.77,-4],[.8,.10,1.44],sc,wood)
for z in (-4.67,-3.33):
 for x in (-22.53,-21.87):box('guard-post',[x,F+6.28,z],[.04,.92,.04],sc,wood)
 for y in (6.25,6.74):beam('guard-rail',[-22.53,F+y,z],[-21.87,F+y,z],.022,sc)
for z in (-4.31,-3.69):beam('ladder-stile',[-22.65,F+.03,z],[-22.65,F+6.7,z],.028,sc)
for z in (-4.31,-3.69):
 box('ladder-sole',[-22.65,F+.015,z],[.10,.03,.10],sc,wood)
 beam('ladder-top-tie',[-22.65,F+5.68,z],[-22.48,F+5.68,z],.024,sc)
for y in D['scaffold']['rungHeights']:beam('ladder-rung',[-22.65,F+y,-4.31],[-22.65,F+y,-3.69],.018,sc)

# Bolts start supported in the deck tray. The head and captive top washer are
# one rigid assembly. Lower nuts and cages are attached to the cart below.
tray=root('bolt-tray')
box('tray',[-22,F+.29,-4.695],[.34,.04,.36],tray,wood)
for x in (-22.12,-21.88):
 for z in (-4.815,-4.575):box('tray-leg',[x,F+.135,z],[.03,.27,.03],tray,wood)
for i,c in enumerate(D['bolts']['storedCenters']):
 bolt=root(f'cart-bolt-{i}',c)
 cyl('bolt-shaft',[0,0,0],.009,.24,bolt,n=24)
 cyl('bolt-head',[0,.128,0],.018,.016,bolt,n=6)
 washer=cyl('captive-top-washer',[0,.115,0],.024,.01,bolt,n=24)
 cut(washer,cyl('washer-bore',[0,.115,0],.010,.04,bolt,n=24))
wrench=root('fastening-wrench',[-22,F+.34,-4.61])
box('wrench-shank',[.08,0,0],[.16,.012,.018],wrench)
for z in (-.024,.024):box('wrench-jaw',[0,0,z],[.052,.018,.015],wrench)
box('wrench-heel',[-.028,0,0],[.012,.018,.06],wrench)
chock=root('cart-chock',[-21.146,F,-4.38]);vs=[(0,-z,y) for x,y,z in []]
vs=[(x,-z,y) for z in (-.045,.045) for x,y in ((0,0),(0,.06),(.1,0))]
m=bpy.data.meshes.new('chock wedge');m.from_pydata(vs,[],[(0,2,1),(3,4,5),(0,1,4,3),(1,2,5,4),(2,0,3,5)]);m.update();o=bpy.data.objects.new('timber wheel chock',m);scene.collection.objects.link(o);o.parent=chock;m.materials.append(wood)
hatch=root('hatch-handle',D['hatch']['pivot']);hatch.rotation_euler.x=math.pi/2
for z in (-1.77,-1.53):box('hatch-handle-leg',[-.43,.09,z],[.035,.18,.035],hatch)
cyl('hatch-handle-grip',D['hatch']['handleCenter'],.022,.32,hatch,axis=(0,0,1))

# Each body part has its own rigid pivot, fixed authored dimensions and a role.
palette={'cloth':cloth,'pants':cloth,'boot':iron,'skin':skin}
for prefix in D['workers']['prefixes']:
 for p in D['workers']['parts']:
  pivot=root(prefix+'-'+p['id']);box(prefix+' '+p['id'],[0,0,0],p['size'],pivot,palette[p['material']],.009)
export('onward.glb')
bpy.data.libraries.write(str(OUT/'blender/eiffel-long-load-onward.blend'),{scene},fake_user=True)
addon_objects=len(scene.objects)

# Save a new sling assembly with the old closed upper rope eye removed only
# from this copied scene. All thirteen retained source meshes are unchanged.
source=append_scene(ROOT/'artifacts/eiffel-closed-sling-2026-09-08/blender/eiffel-closed-sling.blend','WonderForge — closed long-load sling assembly')
scene=bpy.data.scenes.new('WonderForge — retained lower sling');bpy.context.window.scene=scene
for o in source.objects:
 if o.get('wf_role')!='upper-rope-eye':scene.collection.objects.link(o)
export('closed-sling.glb');bpy.data.libraries.write(str(OUT/'blender/eiffel-retained-sling.blend'),{scene},fake_user=True)

# Copy the bridge; physically bore the original cart bed, then add spreader,
# captive nuts and bottom washers. No overlapping replacement bed is exported.
source=append_scene(ROOT/'artifacts/eiffel-first-floor-transfer-2026-09-08/blender/eiffel-first-floor-bridge.blend','WonderForge — first-floor transfer bridge')
scene=bpy.data.scenes.new('WonderForge — onward transfer bridge');bpy.context.window.scene=scene
for o in source.objects:scene.collection.objects.link(o)
cart=next(o for o in scene.objects if o.get('wf_role')=='stock-cart')
bed=next(o for o in cart.children if o.name.startswith('cart-bed'))
plate=box('underside-spreader',[0,.23,0],[.6,.02,.6],cart)
for i,(x,z) in enumerate(D['bolts']['pointsXZ']):
 for target in (bed,plate):cut(target,cyl('cart-bore',[x,.32,z],.010,.4,cart,n=24))
 washer=cyl('bottom-washer',[x,.215,z],.024,.01,cart,n=24);cut(washer,cyl('washer-hole',[x,.215,z],.010,.04,cart,n=24))
 nut=cyl('captive-bottom-nut',[x,.2,z],.019,.02,cart,n=6);cut(nut,cyl('nut-hole',[x,.2,z],.009,.04,cart,n=24))
 # Cage holds the nut and prevents its turning; center remains open for shaft.
 for dx in (-.022,.022):box('nut-cage-side',[x+dx,.204,z],[.006,.028,.045],cart)
 for dz in (-.015,.015):box('nut-cage-lip',[x,.187,z+dz],[.038,.006,.011],cart)
bridge_iron=next(o.data.materials[0] for o in cart.children if o.get('wf_role')=='cart-wheel')
for o in scene.objects:
 if o.type=='MESH':
  for i,m in enumerate(o.data.materials):
   if m==iron:o.data.materials[i]=bridge_iron
export('bridge.glb');bpy.data.libraries.write(str(OUT/'blender/eiffel-onward-bridge.blend'),{scene},fake_user=True)
result={'scene':scene.name,'addonObjects':addon_objects,'bridgeObjects':len(scene.objects),'output':str(OUT),'editableScenesSaved':3,'status':'candidate; motion and mesh contracts require verification'}
