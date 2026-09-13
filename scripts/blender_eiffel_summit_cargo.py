"""Parent-authored summit cargo candidate, executed through installed Blender MCP.

Separate editable source; never rewrites the V9 climbing model or public assets.
Web coordinates are metres, Y up. Strength certification is outside this model.
"""
import bpy, math, json, hashlib
from pathlib import Path
from mathutils import Vector, Quaternion, Matrix
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/eiffel-summit-cargo-2026-09-08'
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
for z in (-.24,.24):
 box('cargo-head-frame-foot',(0,6.062,z),(.16,.052,.056),parent=poleRoot)
 bar('cargo-fixed-luff-frame-stay',(0,6.088,z),(0,7.20,z),.022,iron,poleRoot)
 bar('cargo-head-frame-triangulation',(-.22,6.036,z),(0,7.20,z),.016,iron,poleRoot)
bar('cargo-fixed-luff-frame-crosspin',(0,7.20,-.28),(0,7.20,.28),.025,brass,poleRoot)
tube_ring('cargo-luff-swivel-bearing',(0,7.20,0),(0,1,0),.07,.032,.07,brass,poleRoot)
luff=group('cargo-luff-swivel',(0,1.05,0),yaw)
bar('cargo-luff-block-spindle',(0,-.035,0),(0,.10,0),.030,brass,luff)
def sheave(name,parent,p,r,axis):
 g=group(name,p,parent);a=Vector(axis)
 tube_ring(name+'-groove',(0,0,0),axis,r-.006,.018,.018,iron,g)
 for s in (-1,1):tube_ring(name+'-flange',tuple(a*(s*.015)),axis,r+.013,.018,.005,iron,g)
 bar(name+'-axle',tuple(-a*.065),tuple(a*.065),.016,brass,g,n=16)
 return g
side=.39446165846632;ringR=.38987177379236
tip=sheave('cargo-tip-sheave',pitch,(5.70,0,side),.10,(0,0,1))
for z in (side-.05,side+.05):box('cargo-tip-sheave-cheek',(5.64,0,z),(.28,.27,.025),parent=pitch)
box('cargo-tip-positive-crosshead',(5.60,0,side/2),(.09,.34,side+.12),parent=pitch)
bar('cargo-tip-becket',(5.60,-.13,side-.04),(5.60,-.13,side+.04),.012,iron,pitch)
# The cargo feed turns around the outside of the pole, away from the luffing
# boom. Real grooved ring/entry/exit sheaves replace an unsupported air corner.
ring=group('cargo-annular-feed',(0,5.97,0),poleRoot)
tube_ring('cargo-annular-groove',(0,0,0),(0,1,0),ringR-.006,.33,.018,iron,ring,n=64)
for y in (-.014,.014):tube_ring('cargo-annular-flange',(0,y,0),(0,1,0),ringR+.013,.33,.005,iron,ring,n=64)
tube_ring('cargo-annular-bearing-hub',(0,0,0),(0,1,0),.13,.10,.06,brass,ring,n=32)
for k in range(8):
 a=k*math.tau/8
 bar('cargo-annular-positive-spoke',(.12*math.cos(a),0,.12*math.sin(a)),(.335*math.cos(a),0,.335*math.sin(a)),.012,iron,ring)
tube_ring('cargo-annular-support-shoulder',(0,5.925,0),(0,1,0),.145,.10,.03,iron,poleRoot,n=32)
for z in (-.092,.092):box('cargo-annular-pole-bearing-cheek',(0,5.87,z),(.20,.08,.05),parent=poleRoot)
for x in (-.092,.092):box('cargo-annular-pole-bearing-return',(x,5.87,0),(.05,.08,.134),parent=poleRoot)
entry=sheave('cargo-fixed-head-entry',poleRoot,(-.24648704489309,5.91,-.30206644418054),.06,(-.63222593032437,0,-.77478408155143))
bar('cargo-fixed-entry-support',(-.092,5.84,-.09),(-.28758173,5.91,-.35242741),.018,iron,poleRoot)
bar('cargo-fixed-entry-diagonal',(-.092,5.60,-.09),(-.28758173,5.91,-.35242741),.016,iron,poleRoot)
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
sheave('cargo-luff-head-sheave',luff,(.12,.08,0),.08,(0,0,1))
# Initial drive sits on c000's existing crossbar, not the future c001 crossbar.
oldFixed=roles['climb-drive-fixed'];mapping={}
for original in tree(oldFixed):
 copied=original.copy()
 if original.data:copied.data=original.data.copy()
 copied.name='initial-cargo-'+original.name
 scene.collection.objects.link(copied);mapping[original]=copied
 if original.get('wf_role'):
  role=original['wf_role'].replace('climb-','cargo-');copied['wf_role']=role;roles[role]=copied
for original,copied in mapping.items():copied.parent=mapping.get(original.parent,rig)
fixed=roles['cargo-drive-fixed'];fixed.location=V((0,-4,0));fixed.scale=(1,-1,1)
for role in ('cargo-winch-drum','cargo-output-gear','cargo-input-crank','cargo-ratchet-wheel','cargo-pawl','cargo-east-fairlead','cargo-east-upper-fairlead'):
 roles[role].location.z+=.10
roles['cargo-west-fairlead'].location.z+=.26
for o in list(fixed.children):
 if 'drum-bearing-pedestal' in o.name:o.location.z+=.05;o.scale.z*=.33/.23
 if 'drum-bearing-axle' in o.name:o.location.z+=.10
drum=roles['cargo-winch-drum']
for o in list(drum.children):bpy.data.objects.remove(o,do_unlink=True)
bar('cargo-storage-drum-core',(-.08,0,0),(.08,0,0),.10,wood,drum,n=32)
for x in (-.09,.09):tube_ring('cargo-storage-drum-flange',(x,0,0),(1,0,0),.24,.025,.02,iron,drum,n=32)
box('cargo-west-fairlead-raised-support',(-1.02,307.32,.44),(.07,.28,.04),parent=fixed)
# Park a measured inventory winding on the enlarged storage drum.
inventory=group('cargo-drum-rope-inventory',(0,0,0),drum)
for layer in range(10):
 radius=.106+layer*.012
 for turn in range(13):
  tube_ring('cargo-stored-rope-turn',(-.072+turn*.012,0,0),(1,0,0),radius+.0055,radius-.0055,.011,rope,inventory,n=24)
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
 'head':{'poleBase':[-.9,300.9,0],'heelY':307.05,'jibLength':5.70,'heelOffsetX':.30,'maximumPlanarReach':6,'fixedFrameHalfWidth':.24,'tipSheaveLocal':[5.70,0,side],'annularPitchRadius':ringR,'sideFeed':side,'heelGuideLocal':[.06,.30,side]},
 'cargoDrive':{'supportPartId':'summit-crown-m073-c000','shoeBottomY':302.0325005054474,'drumCenter':[.25,303.01,.12],'coreRadius':.10,'flangeRadius':.24,'clearWindingWidth':.16,'ropeDiameter':.012,'referenceCapacityLayers':10,'turnsPerLayer':13,'referenceCapacityLength':sum(13*math.tau*(.106+k*.012) for k in range(10)),'inventoryRole':'reference full capacity only; renderer must use actual conserved winding length','westRiser':[-1.10,303.46,-.34]},
 'cart':{'floorY':floor,'parentPose':list(stock),'tailPivot':[stock[0],stock[1],tailZ],'wheelRadius':.16,'wheelOffsets':[[-.30,-2.45],[-.30,2.45],[.30,-2.45],[.30,2.45]],'saddleTopY':stock[1]-.09,'tailPin':'two opposed retractable stub axles, each outside the solid mast; no central through-pin'},
 'worker':{'futureClimbCrankGripCenter':[.73,306.86,-.12],'crankAxisCenter':[.73,306.70,-.12],'crankRadius':.16,'grabrailGrip':[.30,306.55,-.43]},
 'limits':['No structural load certification','New head feed reeving awaits geometric admission','Cart fixture and full cargo sweep require exported mesh checks','Not a photogrammetric reconstruction or certified historical crane']}
bpy.context.view_layer.update()
report['roles']={name:{'position':[float(o.location.x),float(o.location.z),float(-o.location.y)],'parent':o.parent.get('wf_role') if o.parent else None} for name,o in roles.items()}
report['objects']=len(scene.objects);report['meshes']=sum(o.type=='MESH' for o in scene.objects)
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:o.select_set(True)
asset=OUT/'model/summit-cargo-rig.glb';source=OUT/'blender/eiffel-summit-cargo-rig.blend'
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
bpy.data.libraries.write(str(OUT/'blender/eiffel-summit-cargo-rig-review.blend'),{scene},fake_user=True)
result={'status':report['status'],'source':str(source),'asset':str(asset),'sha256':report['assetSHA256'],'objects':report['objects'],'meshes':report['meshes'],'roles':len(roles)}
