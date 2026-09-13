"""Second-floor relay, authored in an isolated Blender scene through actual MCP.
Append prior editable parts; preserve every earlier .blend and exported payload.
"""
import bpy, json, math, bmesh
from pathlib import Path
from mathutils import Vector, Matrix
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/eiffel-second-floor-relay-2026-09-08'
F=57.94000244140625;F2=116.13999938964844
for sub in ('model','blender','mcp'):(OUT/sub).mkdir(parents=True,exist_ok=True)
scene=bpy.data.scenes.new('WonderForge — second floor named load relay')
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


def append_all(path):
 with bpy.data.libraries.load(str(path),link=False) as(src,dst):
  names={'eiffel-diagonal-trolley.blend':'WonderForge — diagonal trolley fit','eiffel-diagonal-winch.blend':'WonderForge — diagonal fixed winch','eiffel-long-load-onward.blend':'WonderForge — long-load onward hardware','eiffel-onward-bridge.blend':'WonderForge — onward transfer bridge'}
  desired=names[path.name];matches=[n for n in src.scenes if n.startswith(desired)];assert matches,(desired,src.scenes);dst.scenes=[matches[-1]]
 return dst.scenes[0]
def subtree(o):return [o]+list(o.children_recursive)
def bring(items):
 for o in items:
  if o.name not in scene.objects:scene.collection.objects.link(o)
 bpy.context.window.scene=scene

# Independent new clevis: the old first-floor fitting remains physically behind.
src=append_all(ROOT/'artifacts/eiffel-long-load-onward-2026-09-08/blender/eiffel-long-load-onward.blend')
clevis=next(o for o in src.objects if o.get('wf_role')=='opening-clevis')
bring(subtree(clevis));clevis.location.x+=13
for o in subtree(clevis):
 if o.get('wf_role'):o['wf_role']='relay-'+o['wf_role'].replace('opening-','')
clevis['wf_role']='relay-clevis'
ACCESSDESIGN=json.loads((ROOT/'artifacts/eiffel-long-load-onward-2026-09-08/design.json').read_text())
ACCESSDESIGN['scaffold']['postXZ']=[[-22.0 if abs(x+21.88)<.001 else x,-4+(z+4)*2/3] for x,z in ACCESSDESIGN['scaffold']['postXZ']]
sc=root('release-scaffold')
for x,z in ACCESSDESIGN['scaffold']['postXZ']:
 box('scaffold-upright',[x,F+2.86,z],[.09,5.72,.09],sc,wood)
 box('scaffold-sole',[x,F+.018,z],[.23,.036,.23],sc,wood)
for y in (1.45,2.9,4.35,5.68):
 for z in (-4.40,-3.60):beam('scaffold-transom',[-22.48,F+y,z],[-22.00,F+y,z],.042,sc)
 for x in (-22.48,-22.00):beam('scaffold-longitudinal',[x,F+y,-4-(.6 if y>5.6 else .4)],[x,F+y,-4+(.6 if y>5.6 else .4)],.042,sc)
for x in (-22.48,-22.00):
 for y in (0,2.86):beam('scaffold-diagonal',[x,F+y+.1,-4.4],[x,F+y+2.8,-3.6],.027,sc)
box('scaffold-landing',[-22.2,F+5.77,-4],[.8,.10,1.44],sc,wood)
for z in (-4.67,-3.33):
 for x in (-22.53,-21.87):box('guard-post',[x,F+6.28,z],[.04,.92,.04],sc,wood)
 for y in (6.25,6.74):beam('guard-rail',[-22.53,F+y,z],[-21.87,F+y,z],.022,sc)
for z in (-4.31,-3.69):beam('ladder-stile',[-22.65,F+.03,z],[-22.65,F+6.7,z],.028,sc)
for z in (-4.31,-3.69):
 box('ladder-sole',[-22.65,F+.015,z],[.10,.03,.10],sc,wood)
 beam('ladder-top-tie',[-22.65,F+5.68,z],[-22.48,F+5.68,z],.024,sc)
for y in ACCESSDESIGN['scaffold']['rungHeights']:beam('ladder-rung',[-22.65,F+y,-4.31],[-22.65,F+y,-3.69],.018,sc)

bpy.context.view_layer.update()
# Mirror actual geometry across the cargo station, bake transforms, and
# recalculate normals. No negative scales are used in the runtime model.
mirror=Matrix.Diagonal((-1,1,1,1));mirror.translation=vec([-30,0,0])
for o in subtree(sc):
 if o.type=='MESH':
  transform=mirror@o.matrix_world
  o.data=o.data.copy();o.data.transform(transform);o.parent=None;o.matrix_world=Matrix.Identity(4)
  bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
  o.parent=sc
sc.location=(0,0,0);sc['wf_role']='relay-access-scaffold'
# Tie the access frame to the two existing 3.8m-tall bridge trusses.
# Truss chords at F+4.06, Z -5.05/-2.95 are actual source solids.
anchor=root('relay-access-anchors')
for x in (-7.52,-8.00):
 for z,edge in [(-4.40,-5.05),(-3.60,-2.95)]:
  beam('frame-to-truss-tie',[x,F+4.06,z+(-.080 if edge<z else .080)],[x,F+4.06,edge+(.155 if edge<-4 else -.155)],.028,anchor,iron)
  # Two clamp plates straddle actual square chord; external bolts do not
  # erase or pretend to bore the already-preserved bridge geometry.
  for zz in (edge-.1375,edge+.1375):
   plate=box('truss-clamp-plate',[x,F+4.06,zz],[.15,.38,.035],anchor)
   for yy in (F+3.905,F+4.215):cut(plate,cyl('clamp-bore',[x,yy,zz],.010,.08,anchor,axis=(0,0,1),n=16))
  for yy in (F+3.905,F+4.215):
   cyl('truss-clamp-bolt',[x,yy,edge],.009,.34,anchor,axis=(0,0,1),n=12)
   for zz in (edge-.178,edge+.178):cyl('clamp-nut',[x,yy,zz],.018,.018,anchor,axis=(0,0,1),n=6)
  # Collar grips the timber upright at the tie endpoint.
  for zz in (z-.0625,z+.0625):
   plate=box('scaffold-collar',[x,F+4.06,zz],[.18,.14,.035],anchor)
   for xx in (x-.065,x+.065):cut(plate,cyl('collar-bore',[xx,F+4.06,zz],.008,.08,anchor,axis=(0,0,1),n=16))
  for xx in (x-.065,x+.065):cyl('scaffold-collar-bolt',[xx,F+4.06,z],.007,.18,anchor,axis=(0,0,1),n=12)

# A genuinely separate second-floor receiving cart, with identical bored bed.
src=append_all(ROOT/'artifacts/eiffel-long-load-onward-2026-09-08/blender/eiffel-onward-bridge.blend')
cart=next(o for o in src.objects if o.get('wf_role')=='stock-cart')
bring(subtree(cart));cart.location=vec([-15,F2,-1.8]);cart['wf_role']='relay-upper-cart'
for i,o in enumerate([o for o in cart.children if o.get('wf_role')=='cart-wheel']):o['wf_role']=f'relay-upper-wheel-{i}'
# Permanently waiting chocks hold the upper cart at reception.
for x in (-15.354,-14.646):
 for z in (-2.18,-1.42):box('receiving-wheel-chock',[x,F2+.025,z],[.08,.05,.09],material=wood)

D=json.loads((OUT/'route/design.json').read_text())
old=json.loads((ROOT/'artifacts/eiffel-diagonal-receiver-2026-09-08/design.json').read_text())
d=old['direction'];lateral=old['lateral'];L=old['length'];angle=math.atan2(-d[1],d[0])
def world(c):return [-8.5+d[0]*c[0]+lateral[0]*c[2],c[1],-4+d[1]*c[0]+lateral[1]*c[2]]
frame=root('relay-frame')
faces=[[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]]
for shape in D['frameShapes']:
 m=bpy.data.meshes.new(shape['id']);m.from_pydata([vec(v) for v in shape['vertices']],[],faces);m.update()
 bm=bmesh.new();bm.from_mesh(m);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(m);bm.free()
 o=bpy.data.objects.new(shape['id'],m);scene.collection.objects.link(o);o.parent=frame;m.materials.append(iron);o['wf_source_id']=shape['id']

src=append_all(ROOT/'artifacts/eiffel-diagonal-trolley-2026-09-08/blender/eiffel-diagonal-trolley.blend')
trolley=next(o for o in src.objects if o.get('wf_role')=='diagonal-trolley')
bring(subtree(trolley));trolley.location=vec(world([.25,125.845,0]));trolley['wf_role']='relay-trolley'
for i,o in enumerate([o for o in trolley.children if o.get('wf_role')=='trolley-wheel']):o['wf_role']=f'relay-wheel-{i}'
sheave=root('relay-moving-sheave',[0,-.145,0],trolley)
for o in list(trolley.children):
 if o.type=='MESH' and o.name.startswith(('sheave-groove','sheave-flange')):
  o.location-=vec([0,-.145,0]);o.parent=sheave;o['wf_role']=''

# Rebuild the shortened support for the same real fixed sheave and drum.
gu,gy,gv=D['guide'];du,dy,dv=D['drum'];dy=F2+.8
rear=D['rearPortalU']
winch=root('relay-fixed-winch',[-8.5,0,-4]);winch.rotation_euler.z=angle
box('winch-bed',[du,F2+.18,dv],[.9,.36,1.65],winch)
for v in (-.62,.62):
 bearing=box('winch-bearing',[du,(F2+.36+dy+.12)/2,dv+v],[.25,dy+.12-F2-.36,.16],winch)
 cut(bearing,cyl('bearing-bore',[du,dy,dv+v],.057,.24,winch,axis=(0,0,1),n=32))
cyl('drum-shaft',[du,dy,dv+.1375],.055,1.825,winch,axis=(0,0,1),n=32)
src=append_all(ROOT/'artifacts/eiffel-diagonal-winch-2026-09-08/blender/eiffel-diagonal-winch.blend')
drum=next(o for o in src.objects if o.get('wf_role')=='drum');bring(subtree(drum));drum.parent=winch;drum.location=vec([du,dy,dv]);drum['wf_role']='relay-drum'
fixed=next(o for o in src.objects if o.get('wf_role')=='fixed-sheave');bring(subtree(fixed));fixed.parent=winch;fixed.location=vec([gu,gy,gv]);fixed['wf_role']='relay-fixed-sheave'
for v in (-.6,.6):
 box('guide-riser',[rear,125.57,v],[.18,1,.18],winch)
 box('guide-outrigger',[(rear+gu)/2,126.17,v],[(gu-rear)+.18,.20,.18],winch)
box('guide-cap',[gu,126.17,0],[.25,.20,1.55],winch)
for v in (-.14,.14):
 support=box('guide-hanger',[gu,(126.07+gy-.13)/2,gv+v],[.12,126.07-gy+.13,.06],winch)
 cut(support,cyl('guide-bearing-bore',[gu,gy,gv+v],.037,.12,winch,axis=(0,0,1),n=32))
cyl('guide-shaft',[gu,gy,gv],.035,.4,winch,axis=(0,0,1),n=32)

# Reuse the actual saved steam engine, pipework and supported operator. Its
# 12-tooth pinion mates the preserved 24-tooth gear on this drum's end.
before=set(scene.objects)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/models/eiffel-long-load-first-floor/steam-drive.glb'))
engine_objects=set(scene.objects)-before
engine=root('relay-steam-drive',world([du+23.45,F2-F,4.69+.95]));engine.rotation_euler.z=angle
for o in engine_objects:
 if not o.parent:o.parent=engine
 if o.get('wf_role'):o['wf_role']='relay-'+o['wf_role']
before=set(scene.objects)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/models/eiffel-long-load-first-floor/receiver-driven.glb'))
imported=set(scene.objects)-before
gear=next(o for o in imported if o.name.startswith('involute-drum-24'))
# The gear source mesh is centred and phase-matched to the 12-tooth source.
bpy.context.view_layer.update()
source_matrix=gear.matrix_world.copy()
source_center=vec([-23.45,F+.8,-4.69])
map_matrix=Matrix.Translation(vec(world([du,dy,.95])))@Matrix.Rotation(angle,4,'Z')@Matrix.Translation(-source_center)
gear.parent=drum;gear.matrix_parent_inverse=Matrix.Identity(4);gear.matrix_world=map_matrix@source_matrix;gear['wf_role']='relay-drum-gear'
for o in imported:
 if o!=gear:bpy.data.objects.remove(o,do_unlink=True)

# Local tool/tray arrive as distinct equipment; four cargo bolts stay unique.
src=append_all(ROOT/'artifacts/eiffel-long-load-onward-2026-09-08/blender/eiffel-long-load-onward.blend')
tray=next(o for o in src.objects if o.get('wf_role')=='bolt-tray');bring(subtree(tray));tray.location.x+=12.75;tray.location.y-=1.25;tray['wf_role']='relay-bolt-tray'
wrench=next(o for o in src.objects if o.get('wf_role')=='fastening-wrench');bring(subtree(wrench));wrench.location=vec([-9.25,F+.32,-3.36]);wrench['wf_role']='relay-wrench'
bpy.context.window.scene=scene;bpy.context.view_layer.update()
export('second-floor-relay.glb')
bpy.data.libraries.write(str(OUT/'blender/eiffel-second-floor-relay.blend'),{scene},fake_user=True)
roles=[]
for o in scene.objects:
 if o.get('wf_role'):roles.append({'role':o['wf_role'],'name':o.name,'parent':o.parent.get('wf_role') if o.parent else None,'position':[o.location.x,o.location.z,-o.location.y],'quaternion':[o.rotation_quaternion.x,o.rotation_quaternion.z,-o.rotation_quaternion.y,o.rotation_quaternion.w] if o.rotation_mode=='QUATERNION' else None})
asset={'partId':'summit-access-stair-m000-c000','floor':F2,'direction':d,'lateral':lateral,'origin':[-8.5,0,-4],'yaw':angle,'length':L,'guide':[gu,gy,gv],'drum':[du,dy,dv],'trolleyYOffset':.145,'sheaveRadius':.25,'drumRadius':.30,'wheelRadius':.115,'roles':roles,'steam':{'rootPosition':world([du+23.45,F2-F,4.69+.95]),'yaw':angle,'originalCrankOrigin':[-24.08,F+.8,-4.69],'ratio':2,'crankRadius':.1,'rodLength':.5,'rodPlaneZ':-.51},'productionReady':False}
(OUT/'asset-design.json').write_text(json.dumps(asset,indent=2)+'\n')
result={'scene':scene.name,'objects':len(scene.objects),'meshes':sum(o.type=='MESH' for o in scene.objects),'roles':len(roles),'blend':str(OUT/'blender/eiffel-second-floor-relay.blend'),'model':str(OUT/'model/second-floor-relay.glb'),'geometryGate':D.get('ropeLaneClear',False),'productionReady':False}
