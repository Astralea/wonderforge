"""Parent-authored summit cargo candidate, executed through installed Blender MCP.

Separate editable source; never rewrites the V9 climbing model or public assets.
Web coordinates are metres, Y up. Strength certification is outside this model.
"""
import bpy, math, json, hashlib
from pathlib import Path
from mathutils import Vector, Quaternion, Matrix
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/eiffel-summit-operation-2026-09-08'
old=ROOT/'artifacts/eiffel-gin-pole-climb-2026-09-08/blender/eiffel-summit-gin-pole-climb.blend'
with bpy.data.libraries.load(str(old),link=False) as(src,dst): dst.scenes=src.scenes
scene=dst.scenes[0];scene.name='WonderForge — supported summit cargo candidate'
bpy.context.window.scene=scene
V=lambda p:Vector((p[0],-p[2],p[1]))
roles={o.get('wf_role'):o for o in scene.objects if o.get('wf_role')}
helpers=(ROOT/'scripts/blender_eiffel_gin_pole_climb.py').read_text()
exec(helpers[helpers.index('def material'):helpers.index("rig=group('gin-pole-system')")])
rig=roles['gin-pole-system'];poleRoot=roles['moving-pole']
def tree(o):
 return [o]+[d for c in o.children for d in tree(c)]
for o in reversed(tree(roles['jib-yaw'])):
 roles.pop(o.get('wf_role'),None);bpy.data.objects.remove(o,do_unlink=True)
pole=next(o for o in poleRoot.children if o.name.startswith('timber-six-metre-pole'))
hole(pole,(-.9,306.72,0),(0,1,0),.041,.8)
cap=box('cargo-positive-timber-head-cap',(0,6.018,0),(.54,.036,.54),parent=poleRoot)
hole(cap,(-.9,306.918,0),(0,1,0),.041,.12)
for x in (-.084,.084):
 box('cargo-head-cap-timber-cheek',(x,5.85,0),(.038,.30,.20),parent=poleRoot)
 for y in (5.77,5.94):bar('cargo-head-clamp-through-bolt',(-.115,y,0),(.115,y,0),.009,brass,poleRoot,n=12)
tube_ring('cargo-fixed-thrust-bearing',(0,6.066,0),(0,1,0),.12,.041,.06,brass,poleRoot)
bar('cargo-kingpin',(0,5.62,0),(0,6.12,0),.039,brass,poleRoot,n=24)
yaw=group('cargo-jib-yaw',(0,6.15,0),poleRoot)
tube_ring('cargo-rotating-thrust-ring',(0,-.04,0),(0,1,0),.12,.041,.028,brass,yaw)
base=box('cargo-rotating-head-base',(.15,-.016,0),(.66,.02,.39),parent=yaw)
hole(base,(-.9,307.034,0),(0,1,0),.041,.1)
for z in (-.1625,.1625):
 cheek=box('cargo-heel-positive-clevis',(.30,.050,z),(.17,.152,.035),parent=yaw)
 hole(cheek,(-.60,307.05,z),(0,0,1),.0275,.10)
 bar('cargo-outboard-heel-reaction-web',(.03,-.035,z),(.30,.070,z),.026,iron,yaw)
bar('cargo-heel-axle',(.30,0,-.22),(.30,0,.22),.026,brass,yaw,n=24)
pitch=group('cargo-jib-pitch',(.30,0,0),yaw)
for z in (-.115,.115):
 plate=box('cargo-boom-heel-plate',(.045,.0,z),(.20,.38,.02),parent=pitch)
 hole(plate,(-.60,307.05,z),(0,0,1),.0275,.08)
for y in (-.14,.14):
 for z in (-.10,.10):
  box('cargo-six-metre-timber-chord',(2.925,y,z),(5.55,.06,.06),wood,pitch)
for i in range(12):
 x=.15+i*.4625;nx=.15+(i+1)*.4625
 for z in (-.10,.10):
  bar('cargo-lattice-side-diagonal',(x,-.14,z),(nx,.14,z),.016,wood,pitch)
  bar('cargo-lattice-side-diagonal',(x,.14,z),(nx,-.14,z),.016,wood,pitch)
 for y in (-.14,.14):bar('cargo-lattice-cross-brace',(x,y,-.10),(nx,y,.10),.013,iron,pitch)
 box('cargo-lattice-cross-tie',(x,0,0),(.045,.34,.26),wood,pitch)
# Fixed head frame is positively seated on the cap. Swivel controls are separate.
for z in (-.09,.09):
 box('cargo-head-frame-foot',(0,6.062,z),(.16,.052,.056),parent=poleRoot)
 bar('cargo-fixed-luff-frame-stay',(0,6.088,z),(0,7.20,z),.016,iron,poleRoot)
 bar('cargo-head-frame-triangulation',(-.22,6.036,z),(0,7.20,z),.014,iron,poleRoot)
for za,zb in ((-.105,-.07),(.07,.105)):
 bar('cargo-fixed-luff-frame-stub-crosspin',(0,7.20,za),(0,7.20,zb),.016,brass,poleRoot)
tube_ring('cargo-luff-swivel-bearing',(0,7.20,0),(0,1,0),.07,.032,.07,brass,poleRoot)
luff=group('cargo-luff-swivel',(0,1.05,0),yaw)
bar('cargo-luff-block-spindle',(0,-.035,0),(0,.10,0),.030,brass,luff)
def sheave(name,parent,p,r,axis):
 g=group(name,p,parent);a=Vector(axis)
 tube_ring(name+'-groove',(0,0,0),axis,r-.006,.018,.018,iron,g)
 for s in (-1,1):tube_ring(name+'-flange',tuple(a*(s*.015)),axis,r+.013,.018,.005,iron,g)
 bar(name+'-axle',tuple(-a*.065),tuple(a*.065),.016,brass,g,n=16)
 return g
side=math.hypot(.36,.34);ringR=math.sqrt(side*side-.06*.06)
tip=sheave('cargo-tip-sheave',pitch,(5.70,0,side),.10,(0,0,1))
for z in (side-.05,side+.05):box('cargo-tip-sheave-cheek',(5.64,0,z),(.28,.27,.025),parent=pitch)
box('cargo-tip-positive-crosshead',(5.60,0,side/2),(.09,.34,side+.12),parent=pitch)
bar('cargo-tip-becket',(5.60,-.13,side-.04),(5.60,-.13,side+.04),.012,iron,pitch)
# The cargo feed turns around the outside of the pole, away from the luffing
# boom. Real grooved ring/entry/exit sheaves replace an unsupported air corner.
ring=group('cargo-annular-feed',(0,5.97,0),poleRoot)
tube_ring('cargo-annular-groove',(0,0,0),(0,1,0),ringR-.006,ringR-.045,.018,iron,ring,n=64)
for y in (-.014,.014):tube_ring('cargo-annular-flange',(0,y,0),(0,1,0),ringR+.013,ringR-.045,.005,iron,ring,n=64)
tube_ring('cargo-annular-bearing-hub',(0,0,0),(0,1,0),.13,.10,.06,brass,ring,n=32)
for k in range(8):
 a=k*math.tau/8
 bar('cargo-annular-positive-spoke',(.12*math.cos(a),0,.12*math.sin(a)),((ringR-.04)*math.cos(a),0,(ringR-.04)*math.sin(a)),.012,iron,ring)
tube_ring('cargo-annular-support-shoulder',(0,5.925,0),(0,1,0),.145,.10,.03,iron,poleRoot,n=32)
for z in (-.092,.092):box('cargo-annular-pole-bearing-cheek',(0,5.87,z),(.20,.08,.05),parent=poleRoot)
for x in (-.092,.092):box('cargo-annular-pole-bearing-return',(x,5.87,0),(.05,.08,.134),parent=poleRoot)
entry=sheave('cargo-fixed-head-entry',poleRoot,(-.39560838447632,5.91,-.291708769378010),.06,(-.804853843699840,0,-.593473074605405))
entryMount=Vector((-.39560838447632,5.91,-.291708769378010))+Vector((-.804853843699840,0,-.593473074605405))*.060
bar('cargo-fixed-entry-support',(-.092,5.84,-.09),tuple(entryMount),.018,iron,poleRoot)
bar('cargo-fixed-entry-diagonal',(-.092,5.60,-.09),tuple(entryMount),.016,iron,poleRoot)
exitGuide=sheave('cargo-yaw-head-exit',yaw,(-.06*ringR/side,-.12,ringR*ringR/side),.06,(-.06/side,0,ringR/side))
bar('cargo-yaw-exit-positive-arm',(0,-.015,.18),(-.07,-.12,.46),.018,iron,yaw)
heelGuide=sheave('cargo-heel-feed',yaw,(.06,.30,side),.06,(0,0,1))
for z in (side-.05,side+.05):
 box('cargo-heel-feed-cheek',(.06,.30,z),(.16,.18,.025),parent=yaw)
bar('cargo-heel-feed-upright',(.06,-.01,side+.05),(.06,.30,side+.05),.022,iron,yaw)
bar('cargo-heel-feed-positive-arm',(0,-.016,.18),(.06,-.01,side+.05),.022,iron,yaw)
bar('cargo-heel-feed-diagonal',(0,-.016,.18),(.06,.30,side+.05),.016,iron,yaw)
for x in (5.05,5.5):
 for z in (-.14,.14):tube_ring('cargo-boom-luff-eye',(x,.19,z),(0,0,1),.037,.018,.024,iron,pitch)
sheave('cargo-luff-head-sheave',luff,(-.20,.08,0),.08,(0,0,1))
for z in (-.05,.05):
 bar('cargo-luff-head-positive-fork',(0,.045,z),(-.20,.08,z),.020,iron,luff)
tube_ring('cargo-luff-fixed-becket',(.16,-.05,0),(0,0,1),.033,.018,.022,iron,luff)
bar('cargo-luff-becket-positive-arm',(0,.02,0),(.16,-.05,0),.020,iron,luff)
loadLuff=sheave('cargo-luff-moving-block',pitch,(5.25,.34,0),.07,(0,0,1))
for z in (-.05,.05):
 box('cargo-luff-moving-block-cheek',(5.25,.285,z),(.17,.27,.022),parent=pitch)
bar('cargo-luff-block-positive-pin',(5.25,.19,-.145),(5.25,.19,.145),.014,brass,pitch)
box('cargo-luff-block-boom-cross-tie',(5.25,.14,0),(.11,.06,.26),wood,pitch)
# Cargo drive bears on m073 throughout both lifts. The new positive-Z frame
# is authored directly: the former mirrored climbing drive cut through the
# ladder. Outboard western return stays outside both climber and climbing rope.
fixed=group('cargo-drive-fixed',(0,0,0),rig);supportTop=302.0325005054474
for x in (-.20,.20):
 box('cargo-crossbar-bearing-shoe',(x,supportTop+.025,0),(.10,.05,.045),parent=fixed)
 box('cargo-positive-support-column',(x,(supportTop+.05+303.25)/2,0),(.035,303.25-supportTop-.05,.035),parent=fixed)
 bar('cargo-rear-frame-foot',(x,supportTop+.08,0),(x,supportTop+.08,.70),.023,iron,fixed)
 bar('cargo-rear-frame-diagonal',(x,supportTop+.08,.70),(x,303.25,0),.022,iron,fixed)
 bar('cargo-rear-frame-upright',(x,supportTop+.08,.70),(x,303.38,.70),.023,iron,fixed)
bar('cargo-rear-crosshead',(-1.38,303.38,.70),(.34,303.38,.70),.022,iron,fixed)
bar('cargo-west-rear-diagonal',(-.20,supportTop+.08,.70),(-1.38,303.38,.70),.025,iron,fixed)
bar('cargo-west-outboard-bridge',(-1.38,303.38,.70),(-1.38,303.46,-.26),.022,iron,fixed)
bar('cargo-west-outboard-diagonal',(-1.38,303.10,.70),(-1.38,303.46,-.26),.020,iron,fixed)
bar('cargo-west-diagonal-foot',(-.20,supportTop+.08,.70),(-1.38,303.10,.70),.025,iron,fixed)

g1=sheave('cargo-east-fairlead',fixed,(.25,303.14,.58),.06,(1,0,0))
g2=sheave('cargo-east-upper-fairlead',fixed,(.19,303.32,.64),.06,(0,0,1))
g3=sheave('cargo-west-horizontal-fairlead',fixed,(-1.18,303.38,.56),.08,(0,1,0))
g4=sheave('cargo-west-fairlead',fixed,(-1.26,303.46,-.26),.08,(1,0,0))
bar('cargo-east-low-bearing-support',(.30,303.14,.58),(.30,303.38,.70),.022,iron,fixed)
bar('cargo-east-high-bearing-support',(.19,303.32,.70),(.19,303.38,.70),.022,iron,fixed)
bar('cargo-west-horizontal-bearing-support',(-1.18,303.32,.56),(-1.38,303.32,.56),.022,iron,fixed)
bar('cargo-west-horizontal-support-return',(-1.38,303.32,.56),(-1.38,303.38,.70),.022,iron,fixed)
bar('cargo-west-upturn-bearing-support',(-1.32,303.46,-.26),(-1.38,303.46,-.26),.022,iron,fixed)

# Sliding keyed drum: a translating barrel keeps the winding's live take-off
# at X=.25 instead of making the first fairlead accept an excessive fleet angle.
box('cargo-drive-bed',(.225,302.56,.22),(.69,.05,.50),wood,fixed)
for x in (-.05,.50):
 bar('cargo-bed-to-crossbar-support',(x,302.56,.12),(.20 if x>0 else -.20,supportTop+.05,0),.028,iron,fixed)
 box('cargo-drum-bearing-pedestal',(x,302.775,.12),(.050,.38,.08),parent=fixed)
 tube_ring('cargo-drum-journal-bearing',(x,303.01,.12),(1,0,0),.05,.025,.06,brass,fixed)
shaft=group('cargo-output-shaft',(.25,303.01,.12),fixed)
bar('cargo-keyed-drum-spindle',(-.30,0,0),(.25,0,0),.024,brass,shaft,n=24)
bar('cargo-stepped-gear-spindle',(.25,0,0),(.50,0,0),.020,brass,shaft,n=24)
box('cargo-positive-sliding-spindle-key',(-.005,.025,0),(.34,.009,.010),brass,shaft)
drum=group('cargo-winch-drum',(.25,303.01,.12),fixed)
core=tube_ring('cargo-storage-drum-core',(0,0,0),(1,0,0),.10,.0275,.16,wood,drum,n=48)
# Open longitudinal keyway, with finite clearance around the moving shaft key.
bpy.context.view_layer.update()
cutter=box('temporary-drum-keyway-cutter',(.25,303.041,.12),(.20,.024,.012),parent=None)
modifier=core.modifiers.new('Open positive spindle keyway','BOOLEAN');modifier.operation='DIFFERENCE';modifier.solver='EXACT';modifier.object=cutter
bpy.context.view_layer.objects.active=core;bpy.ops.object.modifier_apply(modifier=modifier.name);bpy.data.objects.remove(cutter,do_unlink=True)
for x in (-.09,.09):tube_ring('cargo-storage-drum-flange',(x,0,0),(1,0,0),.24,.034,.02,iron,drum,n=48)
carriage=group('cargo-drum-carriage',(.25,303.01,.12),fixed)
for x in (-.115,.115):
 tube_ring('cargo-drum-thrust-yoke',(x,0,0),(1,0,0),.053,.029,.022,brass,carriage)
 bar('cargo-traverse-yoke-arm',(x,-.050,0),(x,-.28,.30),.012,iron,carriage)
bar('cargo-traverse-yoke-bottom',(-.115,-.28,.30),(.115,-.28,.30),.012,iron,carriage)
bar('cargo-retained-follower-pivot',(0,-.28,.30),(0,-.327,.30),.008,brass,carriage,n=12)
follower=group('cargo-traverse-follower',(0,-.337,.30),carriage)
box('cargo-positive-cam-follower',(0,0,0),(.003,.005,.009),brass,follower)
bar('cargo-follower-retaining-neck',(0,.0025,0),(0,.010,0),.0025,brass,follower,n=8)
# The moving yoke is constrained by two guide rods; its follower engages the
# barrel-cam groove authored from the same traverse law as the web winding.
for z in (-.03,.39):
 bar('cargo-traverse-guide-rod',(-.05,302.75,z),(.50,302.75,z),.012,brass,fixed)
 for x in (-.05,.50):
  box('cargo-guide-rod-seated-pedestal',(x,302.655,z),(.035,.140,.035),parent=fixed)
  tube_ring('cargo-guide-rod-end-socket',(x,302.75,z),(1,0,0),.026,.0125,.04,brass,fixed)
 for x in (-.115,.115):
  tube_ring('cargo-carriage-slide-bearing',(x,-.26,z-.12),(1,0,0),.023,.0125,.038,brass,carriage)
  bar('cargo-slide-bearing-web',(x,-.26,z-.12),(x,-.28,.30),.010,iron,carriage)

exec(helpers[helpers.index('def gear('):helpers.index("output=gear('climb-output-gear'")])
output=gear('cargo-output-gear',fixed,(.59,303.01,.12),.14,40,math.pi/40)
crank=gear('cargo-input-crank',fixed,(.59,302.80,.12),.07,20)
bar('cargo-input-spindle',(-.11,0,0),(.19,0,0),.018,brass,crank)
bar('cargo-hand-crank-arm',(.19,0,0),(.19,.16,0),.016,iron,crank)
bar('cargo-hand-crank-grip',(.19,.16,0),(.29,.16,0),.022,wood,crank)
for y in (302.80,303.01):
 tube_ring('cargo-gear-journal',(.71,y,.12),(1,0,0),.042,.0205 if y>302.9 else .019,.042,brass,fixed)
gearColumn=bar('cargo-outboard-gear-bearing-column',(.71,302.58,.12),(.71,302.975,.12),.025,iron,fixed)
hole(gearColumn,(.71,302.80,.12),(1,0,0),.0195,.12)
bar('cargo-outboard-bearing-bed-return',(.71,302.58,.12),(.45,302.58,.12),.025,iron,fixed)
ratchet=gear('cargo-ratchet-wheel',fixed,(.65,303.01,.12),.095,20)
pawl=group('cargo-pawl',(.65,303.11,.06),fixed)
bar('cargo-pawl-lever',(0,0,0),(0,-.055,.055),.013,iron,pawl)
bar('cargo-pawl-pivot',(-.035,0,0),(.025,0,0),.009,brass,pawl)
bar('cargo-pawl-fixed-pivot-support',(.62,303.11,.06),(.50,303.01,.12),.016,iron,fixed)

# The winding inventory is supplied by the conservation solver, not ten full
# reference layers duplicated on screen. An empty named anchor is exported.
inventory=group('cargo-drum-rope-inventory',(0,0,0),drum)
cam=group('cargo-traverse-cam',(.25,302.64,.42),fixed)
bar('cargo-traverse-cam-shaft',(-.30,0,0),(.25,0,0),.012,brass,cam,n=16)
for x in (-.05,.50):
 tube_ring('cargo-cam-bearing',(x,302.64,.42),(1,0,0),.028,.0125,.045,brass,fixed)
 box('cargo-cam-bearing-support',(x,302.60,.42),(.045,.08,.055),parent=fixed)
def poly_tube(name,points,radius,parent,mat,closed=False):
 curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.bevel_depth=radius;curve.bevel_resolution=1
 spline=curve.splines.new('POLY');spline.points.add(len(points)-1);spline.use_cyclic_u=closed
 for p,q in zip(spline.points,points):p.co=(*V(q),1)
 o=bpy.data.objects.new(name,curve);scene.collection.objects.link(o);o.parent=parent;o.data.materials.append(mat)
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH')
 return bpy.context.object
camProfile=json.loads((OUT/'rope/traverse-cam.json').read_text())
assert camProfile['spindleTurnsPerCamRevolution']==1,'Use the mechanically direct diamond groove, not an unauthored reducer'
# A self-crossing helical Boolean cutter can erase the whole barrel. Generate
# the actual closed radial surface instead. Each angular column shares the
# exact96-samples/turn source profile; intersecting grooves take the deepest
# round-bottom cut. The open shaft bore and end faces are explicit topology.
angular=96;axial=192;vertices=[];faces=[]
assert len(camProfile['points'])==24*angular+1
for ix in range(axial+1):
 x=-.10+.20*ix/axial
 for ia in range(angular):
  a=ia*math.tau/angular
  distance=min(abs(x-camProfile['points'][turn*angular+ia][0]) for turn in range(24))
  depth=math.sqrt(max(0,.005**2-distance**2));radius=.035-depth
  vertices.append(tuple(V((x,radius*math.cos(a),radius*math.sin(a)))))
for ix in range(axial):
 for ia in range(angular):
  j=(ia+1)%angular;faces.append((ix*angular+ia,ix*angular+j,(ix+1)*angular+j,(ix+1)*angular+ia))
innerStart=len(vertices)
for x in (-.10,.10):
 for ia in range(angular):
  a=ia*math.tau/angular;vertices.append(tuple(V((x,.0125*math.cos(a),.0125*math.sin(a)))))
for ia in range(angular):
 j=(ia+1)%angular;faces.extend([(innerStart+ia,innerStart+angular+ia,innerStart+angular+j,innerStart+j),(ia,innerStart+ia,innerStart+j,j),(axial*angular+ia,axial*angular+j,innerStart+angular+j,innerStart+angular+ia)])
mesh=bpy.data.meshes.new('cargo-closed-diamond-traverse-barrel');mesh.from_pydata(vertices,[],faces);mesh.update()
camBody=bpy.data.objects.new('cargo-closed-diamond-traverse-barrel',mesh);scene.collection.objects.link(camBody);camBody.parent=cam;camBody.data.materials.append(iron)
assert len(camBody.data.polygons)>18000
# Equal sprockets couple the output shaft and traverse barrel at1:1. Their
# retained roller chain runs beyond the sliding drum's maximum flange travel.
chainR=.055;chainX=.45;drumYZ=Vector((303.01,.12));camYZ=Vector((302.64,.42));delta=camYZ-drumYZ;lead=delta.normalized();normal=Vector((-lead.y,lead.x));angle=math.atan2(normal.y,normal.x)
for role,parent,p in [('cargo-traverse-drive-sprocket',shaft,(.20,0,0)),('cargo-traverse-cam-sprocket',cam,(.20,0,0))]:
 g=group(role,p,parent);tube_ring(role+'-rim',(0,0,0),(1,0,0),.050,.017,.018,iron,g,n=32)
 for k in range(20):
  a=k*math.tau/20
  bar(role+'-tooth',(0,.045*math.cos(a),.045*math.sin(a)),(0,.057*math.cos(a),.057*math.sin(a)),.003,iron,g,n=6)
  if k%4==0:bar(role+'-spoke',(0,0,0),(0,.050*math.cos(a),.050*math.sin(a)),.008,iron,g,n=8)
chainPoints=[]
for k in range(20):
 a=angle+k*math.pi/20;p=drumYZ+Vector((math.cos(a),math.sin(a)))*chainR;chainPoints.append((chainX,p.x,p.y))
for k in range(30):
 p=drumYZ-normal*chainR+delta*(k/30);chainPoints.append((chainX,p.x,p.y))
for k in range(20):
 a=angle+math.pi+k*math.pi/20;p=camYZ+Vector((math.cos(a),math.sin(a)))*chainR;chainPoints.append((chainX,p.x,p.y))
for k in range(30):
 p=camYZ+normal*chainR-delta*(k/30);chainPoints.append((chainX,p.x,p.y))
for i,p in enumerate(chainPoints):
 q=chainPoints[(i+1)%len(chainPoints)];bar('cargo-traverse-chain-roller',(p[0]-.013,p[1],p[2]),(p[0]+.013,p[1],p[2]),.0035,brass,fixed,n=8)
 for dx in (-.011,.011):bar('cargo-traverse-chain-link',(p[0]+dx,p[1],p[2]),(q[0]+dx,q[1],q[2]),.0028,iron,fixed,n=6)

# Separate luff winch and positive two-fall attachment. Control crew and
# inventory admission remain explicit work; its source does not imply them.
luffDrum=group('cargo-luff-drum',(-.15,.60,0),yaw)
tube_ring('cargo-luff-rope-core',(0,0,0),(0,0,1),.054,.018,.16,wood,luffDrum,n=32)
for z in (-.09,.09):tube_ring('cargo-luff-drum-flange',(0,0,z),(0,0,1),.10,.018,.018,iron,luffDrum)
bar('cargo-luff-drum-spindle',(0,0,-.20),(0,0,.20),.017,brass,luffDrum,n=16)
lg=gear('cargo-luff-output-wheel',luffDrum,(0,0,.13),.12,40,math.pi/40);lg.rotation_euler.z=-math.pi/2
luffInput=group('cargo-luff-input',(.03,.60,0),yaw)
li=gear('cargo-luff-input-wheel',luffInput,(0,0,.13),.06,20);li.rotation_euler.z=-math.pi/2
bar('cargo-luff-input-spindle',(0,0,-.18),(0,0,.20),.016,brass,luffInput)
bar('cargo-luff-hand-crank-arm',(0,0,-.18),(.15,0,-.18),.013,iron,luffInput)
bar('cargo-luff-hand-crank-grip',(.15,0,-.18),(.15,0,-.28),.020,wood,luffInput)
for x in (-.15,.03):
 for z in (-.13,.18):
  tube_ring('cargo-luff-winch-bearing',(x,.60,z),(0,0,1),.033,.018,.025,brass,yaw)
  bar('cargo-luff-positive-winch-column',(x,.02,z),(x,.60,z),.020,iron,yaw)
  bar('cargo-luff-winch-reaction-diagonal',(.24,.02,z),(x,.60,z),.016,iron,yaw)
lr=gear('cargo-luff-ratchet',luffDrum,(0,0,-.16),.095,20);lr.rotation_euler.z=-math.pi/2
luffPawl=group('cargo-luff-pawl',(-.21,.70,-.16),yaw)
bar('cargo-luff-pawl-lever',(0,0,0),(.055,-.055,0),.012,iron,luffPawl)
bar('cargo-luff-pawl-fixed-pivot',(0,0,-.025),(0,0,.025),.008,brass,luffPawl)
bar('cargo-luff-pawl-support',(-.21,.70,-.13),(-.15,.60,-.13),.016,iron,yaw)
# Neutral source pose seats the retained follower in the phase-zero cam groove.
# Web animation sets both translations from its conserved winding phase.
drum.location=V((.3171,303.01,.12));carriage.location=V((.3171,303.01,.12))
# A longer control shaft separates the operator's head from the output gear.
crank=roles['climb-input-crank']
for o in list(crank.children):
 if any(n in o.name for n in ('input-spindle','hand-crank-arm','hand-crank-grip')):bpy.data.objects.remove(o,do_unlink=True)
bar('extended-climb-control-spindle',(0,0,0),(.31,0,0),.018,brass,crank)
bar('extended-climb-control-arm',(.31,0,0),(.31,.16,0),.016,iron,crank)
bar('extended-climb-control-grip',(.31,.16,0),(.41,.16,0),.022,wood,crank)
ladder=roles['mast-access-ladder'];stileX=.17320508075688773
for y in (306.40,306.75):
 for x in (stileX-.028,stileX+.028):box('outboard-grabrail-stile-clamp',(x,y,-.30),(.014,.065,.080),parent=ladder)
 for z in (-.335,-.265):box('outboard-grabrail-clamp-return',(stileX,y,z),(.042,.065,.014),parent=ladder)
 bar('outboard-grabrail-positive-bracket',(stileX+.028,y,-.30),(.30,y,-.43),.016,iron,ladder)
bar('outboard-worker-grabrail',(.30,306.40,-.43),(.30,306.75,-.43),.016,iron,ladder,n=16)
# Wheeled terrace cradle, with a real hinge pin for one-axis upending.
floor=280.5899952;stock=(-6.4701368053,281.0400000036,0)
cart=group('terrace-cargo-cart',(stock[0],floor,0),rig)
for x in (-.26,.26):box('terrace-cart-longitudinal-sill',(x,.20,0),(.10,.10,5.27),wood,cart)
for z in (-2.45,0,2.45):box('terrace-cart-cross-member',(0,.22,z),(.78,.12,.10),wood,cart)
for z in (-2.45,2.45):
 bar('terrace-cart-axle',(-.42,.16,z),(.42,.16,z),.030,iron,cart,n=16)
 for x in (-.30,.30):
  wheel=group('cargo-cart-wheel-'+str(x)+'-'+str(z),(x,.16,z),cart)
  tube_ring('terrace-wheel-iron-tyre',(0,0,0),(1,0,0),.16,.145,.055,iron,wheel,n=24)
  bar('terrace-wheel-hub',(-.04,0,0),(.04,0,0),.046,wood,wheel,n=16)
  for k in range(8):
   a=k*math.tau/8;bar('terrace-wheel-spoke',(0,0,0),(0,.147*math.cos(a),.147*math.sin(a)),.015,wood,wheel,n=8)
  for dz in (-.19,.19):box('terrace-wheel-positive-chock',(x,.044,z+dz),(.14,.088,.10),wood,cart)
for z in (-1.3,1.3):
 box('terrace-mast-bearing-saddle',(0,(stock[1]-.09-floor+.28)/2,z),(.30,stock[1]-.09-floor-.28,.20),wood,cart)
tailZ=-2.0333333333;upperZ=2.0333333333;tailY=stock[1]-floor
for x in (-.215,.215):
 cheek=box('terrace-tail-hinge-cheek',(x,(.28+tailY+.12)/2,tailZ),(.035,tailY+.12-.28,.28),parent=cart)
 hole(cheek,(stock[0]+x,stock[1],tailZ),(1,0,0),.022,.10)
tailpin=group('cargo-tail-pin',(0,tailY,tailZ),cart)
bar('cargo-removable-tail-hinge-pin',(.112,0,0),(.27,0,0),.020,brass,tailpin,n=24)
tube_ring('cargo-tail-pin-pull-eye',(.30,0,0),(0,0,1),.042,.025,.018,brass,tailpin,n=16)
negativePin=group('cargo-tail-pin-negative',(0,tailY,tailZ),cart)
bar('cargo-opposite-tail-stub-pin',(-.27,0,0),(-.112,0,0),.020,brass,negativePin,n=24)
tube_ring('cargo-opposite-tail-pin-pull-eye',(-.30,0,0),(0,0,1),.042,.025,.018,brass,negativePin,n=16)
for name,z in [('cargo-tail-collar',tailZ),('cargo-upper-collar',upperZ)]:
 collar=group(name,(0,0,0),rig)
 for x in (-.102,.102):box(name+'-side',(x,0,z),(.020,.224,.10),parent=collar)
 for y in (-.102,.102):box(name+'-return',(0,y,z),(.184,.020,.10),parent=collar)
 for x in (-.14,.14):
  if name=='cargo-tail-collar':tube_ring(name+'-pivot-ear',(x,0,z),(1,0,0),.046,.022,.07,iron,collar)
  else:tube_ring(name+'-sling-eye',(x,0,z),(1,0,0),.038,.019,.055,iron,collar)
block=group('cargo-travelling-block',(0,0,0),rig)
sheave('cargo-lower-load-sheave',block,(0,0,0),.08,(0,0,1))
for z in (-.06,.06):box('cargo-lower-block-cheek',(0,-.05,z),(.20,.29,.025),parent=block)
tube_ring('cargo-lower-block-bridle-eye',(0,-.19,0),(0,0,1),.037,.020,.028,iron,block)
report={'schemaVersion':1,'status':'separate Blender mechanical candidate; rope feed and contact admission pending',
 'sourceV9':str(old.relative_to(ROOT)),'coordinates':'metres Y up',
 'head':{'poleBase':[-.9,300.9,0],'heelY':307.05,'jibLength':5.70,'heelOffsetX':.30,'maximumPlanarReach':6,'fixedFrameHalfWidth':.09,'tipSheaveLocal':[5.70,0,side],'annularPitchRadius':ringR,'sideFeed':side,'heelGuideLocal':[.06,.30,side]},
 'cargoDrive':{'supportPartId':'summit-crown-m073-c000','shoeBottomY':302.0325005054474,'drumCenter':[.25,303.01,.12],'coreRadius':.10,'flangeRadius':.24,'clearWindingWidth':.16,'ropeDiameter':.012,'windingPitch':.0122,'turnsPerLayer':12,'maximumTraverse':.0732,'inventoryRole':'dynamic conserved winding only; no full reference rings','traverseCamSource':'rope/traverse-cam.json','westRiser':[-1.26,303.46,-.34]},
 'cart':{'floorY':floor,'parentPose':list(stock),'tailPivot':[stock[0],stock[1],tailZ],'wheelRadius':.16,'wheelOffsets':[[-.30,-2.45],[-.30,2.45],[.30,-2.45],[.30,2.45]],'saddleTopY':stock[1]-.09,'tailPin':'two opposed retractable stub axles, each outside the solid mast; no central through-pin'},
 'worker':{'futureClimbCrankGripCenter':[.73,306.86,-.12],'crankAxisCenter':[.73,306.70,-.12],'crankRadius':.16,'grabrailGrip':[.30,306.55,-.43]},
 'luff':{'drumYawLocal':[-.15,.60,0],'topGuideYawLocal':[-.20,1.13,0],'blockPitchLocal':[5.25,.34,0],'becketYawLocal':[.16,1.,0],'controlStatus':'positive winch and ratchet authored; visible crew and inventory not admitted'},
 'limits':['No structural load certification','New head feed reeving awaits geometric admission','Cart fixture and full cargo sweep require exported mesh checks','Not a photogrammetric reconstruction or certified historical crane']}
bpy.context.view_layer.update()
report['roles']={name:{'position':[float(o.location.x),float(o.location.z),float(-o.location.y)],'parent':o.parent.get('wf_role') if o.parent else None} for name,o in roles.items()}
report['objects']=len(scene.objects);report['meshes']=sum(o.type=='MESH' for o in scene.objects)
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:o.select_set(True)
asset=OUT/'model/summit-operation-rig.glb';source=OUT/'blender/eiffel-summit-operation-rig.blend'
bpy.ops.export_scene.gltf(filepath=str(asset),export_format='GLB',use_selection=True,use_active_scene=True,export_extras=True,export_yup=True,export_animations=False,export_lights=False,export_cameras=False)
bpy.data.libraries.write(str(source),{scene},fake_user=True)
report['assetSHA256']=hashlib.sha256(asset.read_bytes()).hexdigest()
(OUT/'model/rig-manifest.json').write_text(json.dumps(report,indent=2)+'\n')
# Review scene has actual stock/support context, distinct from the neutral asset.
for name in ('cargo-tail-collar','cargo-upper-collar'):roles[name].location=V(stock)
block.location=V((stock[0],stock[1]+1.80,upperZ))
dx=stock[0]+.9;dz=upperZ;radius=math.hypot(dx,dz);projected=math.sqrt(radius*radius-side*side)
yaw.rotation_euler.z=-(math.atan2(dz,dx)-math.atan2(side,projected));pitch.rotation_euler.y=-math.acos((projected-.30)/5.70)
for i in (2,3):
 for o in tree(roles[f'guide-{i}-fixed']):o.hide_render=True
for o in tree(roles['climb-drive-fixed']):o.hide_render=True
manifest=json.loads((ROOT/'public/models/eiffel-construction-kit/tower-kit.manifest.json').read_text())
ids={p['id'] for p in manifest['parts'] if p['boundsMax'][1]>=279.8 and p['boundsMin'][1]<303 and p['id'] not in ('summit-crown-m072-c001','summit-crown-m072-c002','summit-crown-m074-c000','summit-crown-m075-c000','summit-crown-m076-c000')}
tower=ROOT/'artifacts/eiffel-summit-assembly-2026-09-08/blender/eiffel-tower-mast-joint.blend'
with bpy.data.libraries.load(str(tower),link=False) as(src,dst):
 names={n.split('.')[0]:n for n in src.objects};dst.objects=[names[i] for i in sorted(ids.intersection(names))]
for o in dst.objects:scene.collection.objects.link(o)
# Exact rigid assembly in the supported stock pose, for the Blender review.
payloadIds=['summit-crown-m072-c001','summit-crown-m074-c000','summit-crown-m075-c000']
with bpy.data.libraries.load(str(tower),link=False) as(src,dst):
 names={n.split('.')[0]:n for n in src.objects};dst.objects=[names[i] for i in payloadIds]
parentPart=next(p for p in manifest['parts'] if p['id']==payloadIds[0]);f=parentPart['finalPose'];q=f['quaternion']
finalMatrix=Matrix.Translation(V(f['position']))@Quaternion((q[3],q[0],-q[2],q[1])).to_matrix().to_4x4()
stockDelta=Matrix.Translation(V(stock))@finalMatrix.inverted()
for o in dst.objects:scene.collection.objects.link(o)
bpy.context.view_layer.update()
for o in dst.objects:o.matrix_world=stockDelta@o.matrix_world
scene.world=bpy.data.worlds.new('Summit cargo daylight');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.26,.32,.39,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.8
sun=bpy.data.lights.new('Cargo review sunlight','SUN');sun.energy=3;sun.angle=.2
lamp=bpy.data.objects.new(sun.name,sun);scene.collection.objects.link(lamp);lamp.rotation_euler=(.6,-.6,-.5)
data=bpy.data.cameras.new('Cargo overview camera');camera=bpy.data.objects.new(data.name,data);scene.collection.objects.link(camera);scene.camera=camera
camera.location=V((-19,304,-24));camera.rotation_euler=(V((-2,295,0))-camera.location).to_track_quat('-Z','Y').to_euler();data.type='ORTHO';data.ortho_scale=35;data.clip_end=1000
scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True;scene.render.threads_mode='FIXED';scene.render.threads=6
scene.render.resolution_x=950;scene.render.resolution_y=1200;scene.render.resolution_percentage=100
scene.render.filepath=str(OUT/'renders/cargo-rig-context.png');bpy.ops.render.render(write_still=True)
camera.location=V((-5,309.5,-8));camera.rotation_euler=(V((-1.2,306.1,0))-camera.location).to_track_quat('-Z','Y').to_euler();data.ortho_scale=8.5
scene.render.filepath=str(OUT/'renders/cargo-head-detail.png');bpy.ops.render.render(write_still=True)
camera.location=V((-11,284,-6));camera.rotation_euler=(V((stock[0],281.1,0))-camera.location).to_track_quat('-Z','Y').to_euler();data.ortho_scale=6.4
scene.render.filepath=str(OUT/'renders/cargo-cart-detail.png');bpy.ops.render.render(write_still=True)
bpy.data.libraries.write(str(OUT/'blender/eiffel-summit-operation-rig-review.blend'),{scene},fake_user=True)
result={'status':report['status'],'source':str(source),'asset':str(asset),'sha256':report['assetSHA256'],'objects':report['objects'],'meshes':report['meshes'],'roles':len(roles)}
