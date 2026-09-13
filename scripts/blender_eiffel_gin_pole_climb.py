"""Parent-authored supported summit gin pole; run only through actual Blender MCP.

Candidate mechanical source. No asset is admitted merely because it exports.
All construction coordinates below are in the web's X/Y(up)/Z metres.
"""
import bpy,math,json,hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/eiffel-gin-pole-climb-2026-09-08'
scene=bpy.data.scenes.new('WonderForge — supported climbing gin pole');bpy.context.window.scene=scene
V=lambda p:Vector((p[0],-p[2],p[1]))
roles={};report={'schemaVersion':1,'status':'candidate geometry; integration requires actual contact/sweep gates'}
def material(name,color,metal=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes['Principled BSDF'];n.inputs['Base Color'].default_value=(*color,1);n.inputs['Roughness'].default_value=.76;n.inputs['Metallic'].default_value=metal;return m
iron=material('Gin pole — dark wrought iron',(.10,.12,.10),.25);wood=material('Gin pole — seasoned timber',(.29,.20,.10));rope=material('Gin pole — hemp',(.36,.28,.16));brass=material('Gin pole — axle brass',(.31,.23,.10),.35)
def group(name,p=(0,0,0),parent=None):
 o=bpy.data.objects.new(name,None);scene.collection.objects.link(o);o.parent=parent;o.location=V(p);o['wf_role']=name;roles[name]=o;return o
def box(name,p,size,mat=iron,parent=None):
 bpy.ops.mesh.primitive_cube_add(size=1);o=bpy.context.object;o.name=name;o.dimensions=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.location=V(p);o.parent=parent;o.data.materials.append(mat);return o
def bar(name,a,b,r=.02,mat=iron,parent=None,n=10):
 d=V(b)-V(a);bpy.ops.mesh.primitive_cylinder_add(vertices=n,radius=r,depth=d.length);o=bpy.context.object;o.name=name;o.location=(V(a)+V(b))/2;o.rotation_mode='QUATERNION';o.rotation_quaternion=Vector((0,0,1)).rotation_difference(d.normalized());o.parent=parent;o.data.materials.append(mat);return o
def hole(o,center,axis,r,length):
 # Cutter transforms are world coordinates; force dependency evaluation first.
 bpy.context.view_layer.update();a=V(axis).normalized();bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=r,depth=length);c=bpy.context.object;c.location=V(center);c.rotation_mode='QUATERNION';c.rotation_quaternion=Vector((0,0,1)).rotation_difference(a);bpy.context.view_layer.update()
 mod=o.modifiers.new('Actual open machined bore','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=c;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(c,do_unlink=True)
def tube_ring(name,p,axis,outer,inner,depth,mat=iron,parent=None,n=24):
 # Direct annulus, preserving the open bore and exact role hierarchy.
 axis=Vector(axis).normalized();u=axis.cross(Vector((0,1,0)))
 if u.length<.1:u=axis.cross(Vector((1,0,0)))
 u.normalize();w=axis.cross(u);vertices=[]
 for along in (-depth/2,depth/2):
  for radius in (outer,inner):
   for i in range(n):
    q=Vector(p)+axis*along+(u*math.cos(i*math.tau/n)+w*math.sin(i*math.tau/n))*radius;vertices.append(tuple(V(q)))
 faces=[]
 for i in range(n):
  j=(i+1)%n
  faces += [(i,j,2*n+j,2*n+i),(n+i,3*n+i,3*n+j,n+j),(i,n+i,n+j,j),(2*n+i,2*n+j,3*n+j,3*n+i)]
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(vertices,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);scene.collection.objects.link(o);o.parent=parent;o.data.materials.append(mat);return o
rig=group('gin-pole-system')
poleRoot=group('moving-pole',(-.9,300.9,0),rig)
pole=box('timber-six-metre-pole',(0,3,0),(.13,6,.13),wood,poleRoot)
hole(pole,(-.9,302.3,0),(0,0,1),.011,.4)
pole['wf_axial_bore_local_y']=1.4
# The climbing line is tied through a genuine eye, bolted into a split foot band.
for z in (-.081,.081):box('pole-foot-band-return',(0,.08,z),(.21,.12,.032),parent=poleRoot)
for x in (-.089,.089):box('pole-foot-band-cheek',(x,.08,0),(.032,.12,.13),parent=poleRoot)
box('positive-pole-foot-cap',(0,-.014,0),(.21,.028,.21),parent=poleRoot)
for x in (-.089,.089):box('foot-cap-tie',(x,.035,0),(.032,.070,.13),parent=poleRoot)
for x in (-.089,.089):bar('moving-lug-triangular-web',(x,.035,.081),(-.20,.038,.34),.022,iron,poleRoot)
tube_ring('moving-lug-eye',(-.20,.038,.34),(0,0,1),.036,.019,.028,parent=poleRoot)
# Retained hitch passes through the actual eye bore and rests over its top rim.
curve=bpy.data.curves.new('Retained hoist hitch','CURVE');curve.dimensions='3D';curve.bevel_depth=.006;curve.bevel_resolution=2;spline=curve.splines.new('POLY')
hitch=[(-.2,.080,.34),(-.2,.080,.365),(-.2,.045,.365),(-.2,.045,.315),(-.2,.080,.315),(-.2,.080,.34)]
spline.points.add(len(hitch)-1)
for p,q in zip(spline.points,hitch):p.co=(*V(q),1)
h=bpy.data.objects.new('retained-foot-eye-hitch',curve);scene.collection.objects.link(h);h.parent=poleRoot;h.data.materials.append(rope);bpy.ops.object.select_all(action='DESELECT');h.select_set(True);bpy.context.view_layer.objects.active=h;bpy.ops.object.convert(target='MESH')
# Swivelling head and a lightweight timber lattice jib.
yaw=group('jib-yaw',(0,6,0),poleRoot)
tube_ring('head-bearing-lower',(0,-.035,0),(0,1,0),.10,.045,.025,parent=yaw)
bar('head-axle',(0,-.12,0),(0,.10,0),.039,brass,yaw)
pitch=group('jib-pitch',(0,0,0),yaw)
for z in (-.07,.07):box('timber-jib-chord',(1.5,0,z),(3,.055,.055),wood,pitch)
for i in range(6):
 bar('jib-diagonal',(i*.5,0,-.07),((i+1)*.5,0,.07),.016,wood,pitch)
 bar('jib-diagonal',(i*.5,0,.07),((i+1)*.5,0,-.07),.016,wood,pitch)
bar('heel-through-pin',(0,0,-.12),(0,0,.12),.027,brass,pitch)
bar('tip-sheave-pin',(3,0,-.10),(3,0,.10),.022,brass,pitch)
tube_ring('jib-tip-sheave',(3,0,0),(0,0,1),.070,.024,.035,parent=pitch)
# Luff control support is actual geometry, not an invisible pivot.
for z in (-.14,.14):bar('luff-head-stay',(0,-.40,z),(0,1.05,z),.016,iron,yaw)
bar('luff-head-crosspin',(0,1.05,-.17),(0,1.05,.17),.020,brass,yaw)
report['pole']={'base':[-.9,300.9,0],'length':6,'section':.13,'axialBoreY':1.4,'axialBoreDiameter':.022,'jibLength':3,'jibMaterial':'timber lattice; mass must be measured'}
guideYs=[301.85,302.3,305.76666666666665,306.96666666666664]
for i,Y in enumerate(guideYs):
 collar=group(f'guide-{i}-fixed',(0,Y,0),rig)
 for z in (-.11,.11):box('mast-collar-cheek',(0,0,z),(.26,.16,.04),parent=collar)
 for x in (-.11,.11):box('mast-collar-return',(x,0,0),(.04,.16,.18),parent=collar)
 for x in (-.145,.145):
  for z in (-.11,.11):box('clamp-flange',(x,0,z),(.03,.16,.06),parent=collar)
  bar('clamp-bolt',(x,0,-.15),(x,0,.15),.009,brass,collar,n=6)
 # Offset the common hinge from the mast so an open leaf cannot enter its solid.
 for z in (-.13,.13):bar('hinge-outrigger',(-.13,-.12,z),(-.40,-.12,z),.020,iron,collar)
 bar('hinge-outrigger-crosspiece',(-.40,-.12,-.13),(-.40,-.12,.13),.020,iron,collar)
 for side,sgn in [('north',1),('south',-1)]:
  hinge=(-.40,0,0);leaf=group(f'guide-{i}-{side}-leaf',hinge,collar)
  if side=='north':bar('guide-fixed-hinge-pin',(-.40,-.14,0),(-.40,.14,0),.014,brass,collar)
  tube_ring('leaf-hinge-knuckle',(0,sgn*.052,0),(0,1,0),.026,.0145,.080,parent=leaf,n=16)
  # Each half of the split U guide moves away from the pole before swinging.
  # Each fork joins its own bearing level and has a real coaxial shaft bore.
  dogleg=bar('fork-root-dogleg',(0,sgn*.052,0),(-.10,0,sgn*.13),.019,iron,leaf)
  hole(dogleg,(-.40,Y,0),(0,1,0),.0145,.30)
  bar('fork-side',(-.10,0,sgn*.13),(-.50,0,sgn*.105),.019,iron,leaf)
  bar('fork-diagonal',(0,.055,sgn*.13),(-.50,-.035,sgn*.105),.016,iron,leaf)
  for x in (-.585,-.415):box('pole-guide-half-side',(x,0,sgn*.0505),(.032,.12,.101),parent=leaf)
  cap=box('pole-guide-half-return',(-.50,0,sgn*.085),(.138,.12,.032),parent=leaf)
  if i in (1,3):hole(cap,(-.9,Y,sgn*.085),(0,0,1),.0115,.30)
  # A separate lock pin sits in the fixed stop and moving root ear.
  for dy in (-.10,.10):
   bar('fixed-stop-reaction-arm',(-.13,dy,sgn*.11),(-.435,dy,sgn*.13),.016,iron,collar)
   stop=box('hinge-stop-ear',(-.48,dy,sgn*.13),(.09,.035,.07),parent=collar)
   hole(stop,(-.48,Y+dy,sgn*.13),(0,1,0),.008,.07)
  bar('moving-latch-ear-web',(0,.055,sgn*.13),(-.08,.015,sgn*.13),.016,iron,leaf)
  ear=box('moving-latch-ear',(-.08,0,sgn*.13),(.060,.060,.040),parent=leaf)
  hole(ear,(-.48,Y,sgn*.13),(0,1,0),.008,.10)
  latch=group(f'guide-{i}-{side}-latch',(-.08,0,sgn*.13),leaf)
  # The lower keeper pulls DOWN to clear the next collar. Its pull-eye must
  # begin below the ears; translating a top-headed pin down would jam the eye.
  if i==0:latch.rotation_euler.y=math.pi
  latch['wf_withdrawal_direction']=-1 if i==0 else 1
  bar('hinge-keeper-pin',(0,-.14,0),(0,.15,0),.007,brass,latch,n=8)
  tube_ring('hinge-pin-pull-eye',(0,.17,0),(0,0,1),.021,.012,.009,brass,latch,n=12)
  if side=='north' and i in (1,3):
   axial=group(f'guide-{i}-axial-pin',(-.50,0,0),leaf)
   bar('pole-axial-lock-pin',(0,0,-.14),(0,0,.15),.010,iron,axial,n=16)
   bar('axial-pin-head',(0,0,.15),(0,0,.175),.018,brass,axial,n=12)
   tube_ring('axial-control-eye',(0,0,.19),(1,0,0),.02,.011,.010,brass,axial,n=12)
# Vertical load goes through real shoes on the seated 306m crossbar.
fixed=group('climb-drive-fixed',(0,0,0),rig);supportTop=306.0325005054474
for x in (-.20,.20):
 box('drive-crossbar-bearing-shoe',(x,supportTop+.025,0),(.10,.05,.045),parent=fixed)
 box('drive-bearing-column',(x,(supportTop+.05+307.2)/2,0),(.035,307.2-(supportTop+.05),.035),parent=fixed)
 bar('reaction-diagonal',(x,supportTop+.05,0),(x,307.2,.28),.018,iron,fixed)
box('drive-top-crosshead',(-.385,307.20,.44),(1.32,.04,.04),parent=fixed)
# Carry the west sheave reaction behind the entire guide/control envelope.
# A straight diagonal through Z+.13 trapped the new-upper keeper during closing.
bar('west-fairlead-standoff',(-.20,306.20,0),(-.20,306.30,.70),.020,iron,fixed)
bar('west-fairlead-brace',(-.20,306.30,.70),(-1.02,307.18,.70),.020,iron,fixed)
bar('west-fairlead-head-return',(-1.02,307.18,.70),(-1.02,307.18,.44),.020,iron,fixed)
bar('east-crosshead-brace',(.20,307.15,0),(.25,307.20,.44),.020,iron,fixed)
bar('east-drum-frame-stay',(.20,306.08,0),(.25,306.91,-.12),.018,iron,fixed)
box('winch-base',(.25,306.67,-.12),(.30,.05,.33),parent=fixed)
for x in (.15,.35):
 box('drum-bearing-pedestal',(x,306.79,-.12),(.035,.23,.08),parent=fixed)
 bar('drum-bearing-axle',(x-.03,306.91,-.12),(x+.03,306.91,-.12),.025,brass,fixed,n=12)
drum=group('climb-winch-drum',(.25,306.91,-.12),fixed)
bar('winch-rope-core',(-.08,0,0),(.08,0,0),.07,wood,drum,n=24)
for x in (-.09,.09):tube_ring('winch-rope-flange',(x,0,0),(1,0,0),.095,.025,.02,parent=drum)
# Visible paired gears; output rotates at half crank angular velocity.
def gear(name,parent,position,r,teeth,phase=0):
 # Genuine involute flanks with one shared module/pressure angle, not boxes
 # intersecting at their tips. A 20-tooth pinion avoids undercut at20degrees.
 g=group(name,position,parent);module=2*r/teeth;base=r*math.cos(math.radians(20));outer=r+module;root=r-1.25*module
 phi=lambda radius: math.sqrt((radius/base)**2-1)-math.acos(base/radius)
 # 0.30mm circumferential tooth thinning supplies finite backlash at export
 # precision; the zero-backlash V4 polygonal flanks overlapped by0.135mm.
 half=math.pi/(2*teeth)-.00015/r;atPitch=phi(r);outline=[]
 for k in range(teeth):
  center=k*math.tau/teeth+phase;rootA=half+atPitch
  outline.append((root,center-rootA))
  for j in range(7):
   radius=base+(outer-base)*j/6;outline.append((radius,center-half-atPitch+phi(radius)))
  topHalf=half+atPitch-phi(outer)
  for j in range(1,5):outline.append((outer,center-topHalf+2*topHalf*j/4))
  for j in range(1,7):
   radius=outer-(outer-base)*j/6;outline.append((radius,center+half+atPitch-phi(radius)))
  outline.append((root,center+rootA))
  nextA=center+math.tau/teeth-rootA
  for j in range(1,5):outline.append((root,center+rootA+(nextA-center-rootA)*j/5))
 n=len(outline);vertices=[]
 for x in (-.012,.012):
  for ring in ('outer','inner'):
   for radius,angle in outline:
    rr=radius if ring=='outer' else .021;vertices.append(tuple(V((x,rr*math.cos(angle),rr*math.sin(angle)))))
 faces=[]
 for i in range(n):
  j=(i+1)%n;faces += [(i,j,2*n+j,2*n+i),(n+i,3*n+i,3*n+j,n+j),(i,n+i,n+j,j),(2*n+i,2*n+j,3*n+j,3*n+i)]
 mesh=bpy.data.meshes.new(name+'-involute');mesh.from_pydata(vertices,[],faces);mesh.update();o=bpy.data.objects.new(name+'-involute',mesh);scene.collection.objects.link(o);o.parent=g;o.data.materials.append(iron);return g
output=gear('climb-output-gear',fixed,(.37,306.91,-.12),.14,40,math.pi/40)
crank=gear('climb-input-crank',fixed,(.37,306.70,-.12),.07,20)
bar('input-spindle',(0,0,0),(.06,0,0),.018,brass,crank)
bar('hand-crank-arm',(.06,0,0),(.06,.18,0),.016,iron,crank)
bar('hand-crank-grip',(.06,.18,0),(.16,.18,0),.022,wood,crank)
ratchet=gear('climb-ratchet-wheel',fixed,(.13,306.91,-.12),.095,20)
pawl=group('climb-pawl',(.13,307.01,-.18),fixed)
bar('pawl-lever',(0,0,0),(0,-.055,.055),.013,iron,pawl)
bar('pawl-pivot',(-.035,0,0),(.025,0,0),.009,brass,pawl)
# Fairlead sheaves are rendered with genuinely open axle bores.
def grooved_sheave(name,parent,r,axis):
 a=Vector(axis)
 tube_ring(name+'-groove-floor',(0,0,0),axis,r-.006,.018,.018,parent=parent)
 for sign in (-1,1):tube_ring(name+'-flange',tuple(a*(sign*.013)),axis,r+.012,.018,.004,parent=parent)
west=group('climb-west-fairlead',(-1.02,307.20,.34),fixed)
grooved_sheave('west-guide-sheave',west,.08,(0,0,1))
bar('west-guide-axle',(0,0,-.07),(0,0,.13),.016,brass,west)
for z in (-.05,.05):box('west-fairlead-cheek',(0,-.035,z),(.09,.19,.025),parent=west)
east=group('climb-east-fairlead',(.25,307.04,.28),fixed)
grooved_sheave('east-guide-sheave',east,.06,(1,0,0))
bar('east-guide-axle',(-.055,0,0),(.045,0,0),.016,brass,east)
for x in (-.05,.05):box('east-low-cheek',(x,.065,0),(.025,.16,.09),parent=east)
eastHigh=group('climb-east-upper-fairlead',(.19,307.22,.34),fixed)
grooved_sheave('east-upper-guide-sheave',eastHigh,.06,(0,0,1))
bar('east-upper-guide-axle',(0,0,-.055),(0,0,.12),.016,brass,eastHigh)
for z in (-.05,.05):box('east-upper-cheek',(0,-.02,z),(.09,.13,.025),parent=eastHigh)
# Ladder on the south face; two independent shoes land on actual floor spokes.
ladder=group('mast-access-ladder',(0,0,0),rig);floor=300.6700134277344
for x in (-.17320508075688773,.17320508075688773):
 box('ladder-stile',(x,(floor+.04+307.4)/2,-.30),(.040,307.4-floor-.04,.050),wood,ladder)
 shoe=box('ladder-floor-shoe',(x,floor+.02,-.30),(.12,.04,.08),parent=ladder)
 shoe.rotation_euler.z=-math.atan2(-.30,x)
 for Y in guideYs:bar('ladder-collar-tie',(x,Y,-.30),(math.copysign(.11,x),Y,-.13),.014,iron,ladder)
rungs=[]
for k in range(24):
 y=floor+.20+k*.28
 # rungs are on southZ-.30; source crossbars atZ0 cannot intersect them.
 bar('ladder-rung',(-.17320508075688773,y,-.30),(.17320508075688773,y,-.30),.018,wood,ladder,n=10);rungs.append(y)
report['guides']=[{'index':i,'y':Y,'bore':.138,'hinges':[[-.40,Y,0],[-.40,Y,0]],'axialPin':i in(1,3)} for i,Y in enumerate(guideYs)]
report['drive']={'supportPartId':'summit-crown-m075-c000','supportY':supportTop,'shoes':[[-.2,supportTop,0],[.2,supportTop,0]],'drumCenter':[.25,306.91,-.12],'drumAxis':[1,0,0],'drumRadius':.07,'gearRatio':2,'crankCenter':[.43,306.70,-.12],'crankRadius':.18,'fairleadCenters':[[.25,307.04,.28],[.19,307.22,.34],[-1.02,307.20,.34]],'westVerticalTangent':[-1.10,307.20,.34],'movingLug':[-1.10,300.98,.34],'ropeRadius':.006}
report['ladder']={'railX':[-.17320508075688773,.17320508075688773],'z':-.30,'floor':floor,'rungYs':rungs,'rungRadius':.018}
report['manifestSha256']=hashlib.sha256((ROOT/'public/models/eiffel-construction-kit/tower-kit.manifest.json').read_bytes()).hexdigest()
bpy.context.view_layer.update();report['roles']={name:{'position':[float(o.location.x),float(o.location.z),float(-o.location.y)],'parent':o.parent.get('wf_role') if o.parent else None} for name,o in roles.items()}
# Source is exported in neutral articulation. Runtime must apply each named role.
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'model/summit-gin-pole-climb.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_extras=True,export_yup=True,export_animations=False,export_lights=False,export_cameras=False)
bpy.data.libraries.write(str(OUT/'blender/eiffel-summit-gin-pole-climb.blend'),{scene},fake_user=True)
report['objects']=len(scene.objects);report['meshes']=sum(o.type=='MESH' for o in scene.objects)
(OUT/'model/rig-manifest.json').write_text(json.dumps(report,indent=2)+'\n')
# Review context is separate from source. Show the geometry at the start of climb.
pitch.rotation_euler=(0,math.radians(-78),0)
for i in (0,3):
 for side,angle in [('north',90),('south',-90)]:
  leaf=roles[f'guide-{i}-{side}-leaf'];leaf.rotation_euler=(0,0,math.radians(angle))
  roles[f'guide-{i}-{side}-latch'].location.z=-.30 if i==0 else .30
for i in(1,3):roles[f'guide-{i}-axial-pin'].location+=V((0,0,.24))
manifest=json.loads((ROOT/'public/models/eiffel-construction-kit/tower-kit.manifest.json').read_text());ids={p['id'] for p in manifest['parts'] if p['boundsMax'][1]>=299.8 and p['boundsMin'][1]<307.4 and p['id'] not in('summit-crown-m072-c002','summit-crown-m076-c000')}
source=ROOT/'artifacts/eiffel-summit-assembly-2026-09-08/blender/eiffel-tower-mast-joint.blend'
with bpy.data.libraries.load(str(source),link=False) as(src,dst):
 names={n.split('.')[0]:n for n in src.objects};dst.objects=[names[id] for id in sorted(ids.intersection(names))]
for o in dst.objects:scene.collection.objects.link(o)
# Visible initial load line; animation later uses exact fairlead tangent/wrap paths.
bar('review-loaded-lift-line',(-1.10,300.98,.34),(-1.10,307.2,.34),.006,rope,n=8)
scene.world=bpy.data.worlds.new('Climbing gin pole review world');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.20,.25,.31,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.7
sun=bpy.data.lights.new('Soft daylight','SUN');sun.energy=3;sun.angle=.15;light=bpy.data.objects.new(sun.name,sun);scene.collection.objects.link(light);light.rotation_euler=(.6,-.6,-.5)
data=bpy.data.cameras.new('Mechanism review');camera=bpy.data.objects.new(data.name,data);scene.collection.objects.link(camera);scene.camera=camera;camera.location=V((-8,306,-12));camera.rotation_euler=(V((-.25,304.4,0))-camera.location).to_track_quat('-Z','Y').to_euler();data.type='ORTHO';data.ortho_scale=12.2;data.clip_end=1000
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.render.threads_mode='FIXED';scene.render.threads=6;scene.render.resolution_x=950;scene.render.resolution_y=1200;scene.render.resolution_percentage=100
scene.render.filepath=str(OUT/'renders/gin-pole-climb-context.png');bpy.ops.render.render(write_still=True)
bpy.data.libraries.write(str(OUT/'blender/eiffel-summit-gin-pole-climb-review.blend'),{scene},fake_user=True)
result={'status':report['status'],'sourceObjects':report['objects'],'sourceMeshes':report['meshes'],'roles':len(roles),'asset':str(OUT/'model/summit-gin-pole-climb.glb'),'source':str(OUT/'blender/eiffel-summit-gin-pole-climb.blend')}
