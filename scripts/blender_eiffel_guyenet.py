"""Original Guyenet crane interpretation, built through Blender Lab MCP.
All dimensions are metres; source geometry is Y-up. Existing scenes survive.
"""
import bpy, json, math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=Path(globals().get('WF_GUYENET_OUTPUT',ROOT/'artifacts/eiffel-campaigns-2026-09-07/blender'))
MODEL=Path(globals().get('WF_GUYENET_MODEL',ROOT/'public/models/eiffel-guyenet'))
for p in (OUT,MODEL):p.mkdir(parents=True,exist_ok=True)
D=json.loads(Path(globals().get('WF_GUYENET_SPEC',ROOT/'src/data/eiffelGuyenet.json')).read_text());m=D['model']
scene=bpy.data.scenes.new('WonderForge — Guyenet climbing crane 1889')
bpy.context.window.scene=scene
collection=bpy.data.collections.new('GUYENET — articulated original reconstruction')
scene.collection.children.link(collection)
materials={}
for key,col,rough,metal in [('iron','393f3d',.67,.35),('edge','64675d',.58,.4),('timber','9c7549',.92,0),('timber-dark','6b5033',.95,0),('bronze','a68a51',.56,.5),('steel','76766a',.55,.4),('rope','443c31',1,0)]:
 rgb=[int(col[i:i+2],16)/255 for i in (0,2,4)];rgb=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb]
 mat=bpy.data.materials.new('guyenet-'+key);mat.use_nodes=True;mat.diffuse_color=(*rgb,1)
 bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*rgb,1);bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
 materials[key]=mat
# Reuse only the existing local primitive batch class, without executing its scene builder.
source=(ROOT/'scripts/blender_paris_exposition.py').read_text()
exec(source[source.index('class Batch:'):source.index('\ndef empty(')],globals())
roles={}
def group(role,parent=None,p=(0,0,0)):
 o=bpy.data.objects.new('guyenet-'+role,None);collection.objects.link(o);o.parent=parent;o.location=(p[0],-p[2],p[1]);o['wf_role']=role;o['wf_mechanism']='guyenet';roles[role]=o;return o
def finish(b,role,parent):
 for o in b.finish('guyenet-'+role,collection,parent):
  if 'wf_paris' in o:del o['wf_paris']
  o['wf_mechanism']='guyenet'
def at(s,x=0):return (x,s*math.cos(math.radians(m['railTiltDegrees'])),s*math.sin(math.radians(m['railTiltDegrees'])))
def add(a,b):return tuple(a[i]+b[i] for i in range(3))
def guide_crossbeam(b,key,s,g,r):
 if not m.get('recessedCrossbars',False):
  b.beam(key,at(s,-g),at(s,g),r);return
 b.beam(key,at(s,-1.1),at(s,1.1),r)
 for sign in (-1,1):b.beam(key,at(s,sign*1.1),at(s,sign*g),.055)
def ring(b,key,c,r,t,axis='x',n=16):
 # Hollow wheel with a real rim, hub and spokes.
 for i in range(n):
  a=i*math.tau/n;aa=(i+1)*math.tau/n
  def p(v):return (c[0],c[1]+r*math.cos(v),c[2]+r*math.sin(v)) if axis=='x' else (c[0]+r*math.cos(v),c[1],c[2]+r*math.sin(v))
  b.beam(key,p(a),p(aa),t)
  if i%2==0:b.beam(key,c,p(a),t*.65)
 b.cylinder(key,c,r*.18,.16,axis,12)
root=group('root');root['wf_description']=json.dumps(D);guides=group('guides',root);b=Batch();g=m['railGauge']/2
for x in (-g,g):
 # Paired flanges on 1.3m deep lattice guide girders; bolts and rail shoes.
 for dz in (-.65,.65):
  b.beam('iron',add(at(-6.6,x),(0,0,dz)),add(at(14,x),(0,0,dz)),.09)
  b.beam('edge',add(at(-6.6,x+.13),(0,0,dz)),add(at(14,x+.13),(0,0,dz)),.032)
 for k in range(21):
  s=-6.6+k
  b.beam('iron',add(at(s,x),(0,0,-.65)),add(at(s+1,x),(0,0,.65)),.047)
  b.beam('iron',add(at(s,x),(0,0,.65)),add(at(s+1,x),(0,0,-.65)),.047)
  b.box('edge',add(at(s,x),(0,0,-.66)),(.24,.24,.08))
 # Separate structural display support stays behind the mechanism's swept volume.
 for s in (7,13):
  p=add(at(s,x),(0,0,.66));foot=(x,-6,p[2]+2)
  b.beam('timber-dark',foot,p,.15)
  b.box('timber',(foot[0],-6.1,foot[2]),(.9,.2,1.0))
 b.box('timber',(x,-6.11,at(-6.6)[2]),(.8,.18,1.8))
 b.beam('timber-dark',(x,-6,7.9),add(at(2,x),(0,0,.66)),.12)
# Rear trestle cross-bracing closes the lateral load path between the two legs.
rear=add(at(13),(0,0,.66))
def rear_z(y):return rear[2]+2-2*(y+6)/(rear[1]+6)
for y0,y1 in [(-6,-1),(-1,4),(4,9),(9,rear[1])]:
 b.beam('timber-dark',(-g,y0,rear_z(y0)),(g,y1,rear_z(y1)),.075)
 b.beam('timber-dark',(g,y0,rear_z(y0)),(-g,y1,rear_z(y1)),.075)
 b.beam('timber',(-g,y1,rear_z(y1)),(g,y1,rear_z(y1)),.09)
if globals().get('WF_GUYENET_DISPLAY_GUIDES',True):finish(b,'guides',guides)
if globals().get('WF_GUYENET_STATION'):
 station=json.loads(Path(WF_GUYENET_STATION).read_text())
 r=station['station']['root'];k=math.sqrt(.5)
 def station_local(p):
  dx,dy,dz=p[0]-r[0],p[1]-r[1],p[2]-r[2]
  return (k*(dx+dz),dy,k*(-dx+dz))
 support=Batch()
 for part in station['proposedStructure']:
  key='timber-dark' if 'falsework' in part['kind'] or 'post' in part['kind'] or 'bearer' in part['kind'] else 'iron'
  support.beam(key,station_local(part['a']),station_local(part['b']),part['halfWidth'])
 finish(support,'installed-guides-and-falsework',guides)
 guides['station_geometry_source']=str(WF_GUYENET_STATION)
 guides['prepared_before_review']=True
car=group('carriage',root,(0,0,m['railFaceOffsetZ']));b=Batch()
lower_bearing_half_span=m.get('lowerBearingHalfSpan',g)
for x in (-g,g):
 # Rigid inclined chassis; open hotte holds a level platform.
 b.beam('iron',at(-4,x),at(0,x),.14)
 for s in (-4,-2,0):
  b.beam('edge',at(s-.25,x),at(s+.25,x),.14)
  for dx in (-.12,.12):b.cylinder('bronze',add(at(s,x),(dx,0,-.2)),.045,.08,'y',6)
 p=(x,0,m['platformOffsetZ'])
 b.beam('iron',at(-4,x),p,.105)
 b.beam('iron',at(0,x),p,.09)
 b.beam('iron',at(-2,x),p,.055)
 lower=(math.copysign(lower_bearing_half_span,x),-m['postBelowDeck'],m['platformOffsetZ'])
 b.beam('iron',p,lower,.07)
 if m.get('recessedCrossbars',False):
  elbow=at(-4,math.copysign(lower_bearing_half_span,x))
  b.beam('iron',at(-4,x),elbow,.08);b.beam('iron',elbow,lower,.08)
 else:b.beam('iron',at(-4,x),lower,.08)
 b.beam('iron',lower,(-x,0,m['platformOffsetZ']),.055)
guide_crossbeam(b,'iron',-3.7,g,.12)
b.beam('iron',(-lower_bearing_half_span,-m['postBelowDeck'],m['platformOffsetZ']),(lower_bearing_half_span,-m['postBelowDeck'],m['platformOffsetZ']),.12)
# Deck edges at z -4.0 and +.1. Floor planks with pivot aperture.
for i in range(16):
 x=-2.325+i*.31
 if abs(x)<.36:
  for cz,d in [(-3.2,1.6),(-1.05,.3)]:b.box('timber',(x,.11,cz),(.295,.18,d))
 else:b.box('timber',(x,.11,-2.45),(.295,.18,3.1))
for x in (-2.5,2.5):
 b.beam('iron',(x,-.1,-4),(x,-.1,-.9),.1)
 for z in (-4,-2.65,-1.3,-.9):b.beam('iron',(x,.2,z),(x,1.25,z),.025)
 for y in (.7,1.25):b.beam('iron',(x,y,-4),(x,y,-.9),.027)
for z in (-4,-.9):
 b.beam('iron',(-2.5,-.1,z),(2.5,-.1,z),.1)
 # Keep inward edge open for guide interface and jib sweep.
 if z<-1:
  for y in (.7,1.25):b.beam('iron',(-2.5,y,z),(2.5,y,z),.027)
  for x in (-2.5,-1.25,0,1.25,2.5):b.beam('iron',(x,.2,z),(x,1.25,z),.025)
b.cylinder('bronze',(0,-m['postBelowDeck'],m['platformOffsetZ']),.3,.25,n=16)
# Fixed bearing and two ties connect the haul nut to the sliding chassis.
for x in (-g,g):b.beam('iron',(-.8,0,0),at(0,x),.085)
ring(b,'iron',(-.8,0,0),.27,.055,'y',16)
finish(b,'carriage',car)
nut=group('haul-nut',car,(-.8,0,0));nut.rotation_euler.x=math.radians(m['railTiltDegrees']);b=Batch()
b.cylinder('bronze',(0,0,0),.17,.32,n=16)
ring(b,'iron',(0,.25,0),.48,.027,'y',20)
finish(b,'haul-nut',nut)
skates=group('rail-skates',car);b=Batch()
for x in (-g,g):
 for s in (-3.7,-2,0):
  b.beam('bronze',add(at(s-.28,x),(0,0,m.get('skateOffsetZ',.14))),add(at(s+.28,x),(0,0,m.get('skateOffsetZ',.14))),.055)
finish(b,'rail-skates',skates)
rotor=group('rotor',car,(0,m['hingeY'],m['platformOffsetZ']));b=Batch()
# Hollow lattice pivot rather than an impossibly tall pole.
for x in (-.18,.18):
 for z in (-.18,.18):b.beam('iron',(x,-4.5,z),(x,4.5,z),.035)
for y in [i*.5-4.5 for i in range(19)]:
 for x in (-.18,.18):b.beam('edge',(x,y,-.18),(x,y,.18),.03)
 for z in (-.18,.18):b.beam('edge',(-.18,y,z),(.18,y,z),.03)
b.cylinder('iron',(0,-.1,0),.46,.2,n=24);ring(b,'bronze',(0,-.21,0),.5,.045,'y',24)
b.cylinder('steel',(0,0,0),.13,.9,'x',16)
# Luffing spindle alongside mast; the collar moves along it.
b.cylinder('steel',(-.28,2.25,0),.055,4.5,n=12)
for y in [i*.12 for i in range(38)]:b.cylinder('edge',(-.28,y,0),.066,.025,n=8)
finish(b,'rotor',rotor)
jib=group('jib',rotor);b=Batch();L=m['boomLength']
for x in (-.26,.26):
 for z in (-.18,.18):b.beam('iron',(x,0,z),(x,L,z),.033)
for k in range(20):
 y=k*L/20;yy=(k+1)*L/20
 for z in (-.18,.18):
  b.beam('edge',(-.26,y,z),(.26,yy,z),.025)
  b.beam('iron',(.26,y,z),(-.26,yy,z),.025)
 for x in (-.26,.26):b.beam('iron',(x,y,-.18),(x,yy,.18),.023)
 b.beam('iron',(-.28,y,-.18),(.28,y,-.18),.032)
ring(b,'bronze',(0,L,0),.27,.035,'x',20)
b.cylinder('steel',(0,L,0),.07,.8,'x',12)
# Geared hoist at heel. Steam supply is external in this component model.
drum=group('hoist-drum',jib,(0,.65,-.4));hb=Batch()
hb.cylinder('iron',(0,0,0),.26,.7,'x',20)
ring(hb,'bronze',(.44,0,0),.43,.03,'x',20)
finish(hb,'hoist-drum',drum)
b.beam('rope',(0,.65,-.4),(0,L,-.24),.018)
b.box('iron',(0,.18,-.4),(1,.16,.7))
finish(b,'jib',jib)
slider=group('slider',rotor);b=Batch()
b.box('bronze',(0,0,0),(.52,.25,.53));ring(b,'iron',(-.38,0,0),.32,.024,'x',16)
b.cylinder('steel',(0,0,0),.075,.85,'x',12)
finish(b,'slider',slider)
for side in (-1,1):
 tie=group('tie-left' if side<0 else 'tie-right',rotor,(side*.26,0,0));b=Batch()
 b.beam('iron',(0,0,0),(0,m['tieLength'],0),.035)
 for y in (0,m['tieLength']):b.cylinder('bronze',(0,y,0),.07,.12,'x',12)
 finish(b,'tie',tie)
head=group('head-anchor',root,add(at(m['headRest']),(0,0,m['railFaceOffsetZ'])));b=Batch()
guide_crossbeam(b,'iron',0,g,.13)
for x in (-g,g):
 b.beam('edge',at(-.25,x),at(.25,x),.14)
 b.beam('bronze',add(at(-.25,x),(0,0,m.get('skateOffsetZ',.14))),add(at(.25,x),(0,0,m.get('skateOffsetZ',.14))),.055)
finish(b,'head-anchor',head)
# Main screw offset laterally from the jib's narrow centre plane.
screw=group('main-screw',head,(-.8,0,0));b=Batch()
p=at(-m['screwLength']);b.beam('steel',(0,0,0),p,.06)
for i in range(math.floor(m['screwLength']/.1)+1):
 c=at(-i*.1)
 b.beam('edge',add(c,(-.085,0,0)),add(c,(.085,0,0)),.018)
finish(b,'main-screw',screw)
base=group('safety-base',root,add(at(m['safetyBase']),(0,0,m['railFaceOffsetZ'])));b=Batch()
guide_crossbeam(b,'iron',0,g,.13)
for x in (-g,g):
 b.beam('iron',(x,0,0),add(at(-.9),(x,0,0)),.11)
 b.beam('edge',at(-.25,x),at(.25,x),.14)
 b.beam('bronze',add(at(-.25,x),(0,0,m.get('skateOffsetZ',.14))),add(at(.25,x),(0,0,m.get('skateOffsetZ',.14))),.055)
for i in range(10):b.box('timber',(-1.6+i*.36,-.15,-.6),(.34,.16,1.1))
for x in (-1.8,1.8):
 b.beam('iron',(x,0,-1.1),(x,1,-1.1),.025)
b.beam('iron',(-1.8,1,-1.1),(1.8,1,-1.1),.025)
finish(b,'safety-base',base)
heads=group('safety-heads',root,add(at(m['safetyHead']),(0,0,m['railFaceOffsetZ'])));b=Batch()
for x in (-g,g):
 b.beam('steel',(x,0,0),add(at(-1.25),(x,0,0)),.054)
 b.beam('bronze',at(-.1,x),at(0,x),.14)
finish(b,'safety-heads',heads)
# Authored rest pose: 8.5m operating reach perpendicular to the guides.
r=8.5;rise=math.sqrt(L*L-r*r);h=rise-math.sqrt(m['tieLength']**2-r*r)
# Three Y-up rotations map to Blender: X unchanged, Y -> Z.
rotor.rotation_euler.z=math.pi/2
jib.rotation_euler.x=math.asin(r/L)
slider.location.z=h
for role in ('tie-left','tie-right'):
 roles[role].location.z=h;roles[role].rotation_euler.x=math.asin(r/m['tieLength'])
# Export clean reusable asset before placing the studio.
bpy.ops.object.select_all(action='DESELECT')
for o in collection.all_objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(MODEL/'crane.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_extras=True,export_yup=True,export_apply=False)
studio=bpy.data.collections.new('GUYENET — studio only, not exported');scene.collection.children.link(studio)
ground=Batch();ground.box('timber-dark',(0,-6.25,0),(150,.1,150));ground.finish('studio-floor',studio)
world=bpy.data.worlds.new('Guyenet soft daylight');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.32,.4,.48,1);world.node_tree.nodes['Background'].inputs[1].default_value=.6;scene.world=world
light=bpy.data.lights.new('Guyenet sun','SUN');light.energy=3;light.angle=.12
o=bpy.data.objects.new('Guyenet sun',light);scene.collection.objects.link(o);o.rotation_euler=(.5,-.6,-.5)
cam=bpy.data.cameras.new('Guyenet mechanism review');o=bpy.data.objects.new('Guyenet mechanism review',cam);scene.collection.objects.link(o);o.location=(25,-28,17);target=Vector((2,-2,3));o.rotation_euler=(target-o.location).to_track_quat('-Z','Y').to_euler();cam.type='ORTHO';cam.ortho_scale=30;scene.camera=o
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=1500;scene.render.resolution_y=1200;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX'
triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in collection.all_objects if o.type=='MESH')
manifest={'description':D,'triangles':triangles,'roles':list(roles),'coordinates':'metres, Y-up; root deck at y=0','operatingReviewSlewDegrees':90,'climbingReviewReach':5.5,'knownLimits':['Full swept-volume clearance and installed elevator rail support not yet certified.','Steam feed and bolt insertion are not animated; screw lead is an authored visual parameter.','Operational luff reviewed perpendicular to guides; climb unloaded along guides.']}
(MODEL/'crane.manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
(OUT/'build-summary.json').write_text(json.dumps(manifest,indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'eiffel-guyenet.blend'))
result={'scene':scene.name,'blend':str(OUT/'eiffel-guyenet.blend'),'triangles':triangles,'roles':list(roles),'glbBytes':(MODEL/'crane.glb').stat().st_size}
scene.render.filepath=str(OUT/'eiffel-guyenet.png')
bpy.ops.render.render(write_still=True)
print(json.dumps(result))
