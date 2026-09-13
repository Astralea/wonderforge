"""Interpreted first-floor steam drive. Execute through the installed Blender MCP."""
import bpy, bmesh, json, math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/eiffel-long-load-main-2026-09-08'
for d in ('model','blender','renders'):(OUT/d).mkdir(parents=True,exist_ok=True)
F=57.94000244140625
scene=bpy.data.scenes.new('WonderForge — first-floor steam winch drive')
bpy.context.window.scene=scene
def vec(v):return Vector((v[0],-v[2],v[1]))
def mat(name,c,roughness=.8):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=roughness;return m
iron=mat('Winch painted iron',(.10,.14,.13));steel=mat('Winch dark steel',(.15,.17,.16));brass=mat('Winch bearing bronze',(.43,.28,.11));cloth=mat('Winch operator blue wool',(.15,.22,.27));skin=mat('Winch operator skin',(.48,.32,.21));leather=mat('Winch operator leather',(.08,.065,.04))
def group(role,c=(0,0,0)):
 o=bpy.data.objects.new(role,None);scene.collection.objects.link(o);o.location=vec(c);o['wf_role']=role;return o
def finish(o,name,material,parent=None):
 o.name=name;o.data.materials.append(material);o['wf_role']=name;o.parent=parent;return o
def box(name,c,size,material=iron,parent=None):
 bpy.ops.mesh.primitive_cube_add(size=1,location=vec(c));o=bpy.context.object;o.dimensions=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return finish(o,name,material,parent)
def cylinder(name,a,b,r,material=steel,parent=None,n=24):
 a,b=vec(a),vec(b);d=b-a;bpy.ops.mesh.primitive_cylinder_add(vertices=n,radius=r,depth=d.length,location=(a+b)/2);o=bpy.context.object;o.rotation_mode='QUATERNION';o.rotation_quaternion=Vector((0,0,1)).rotation_difference(d.normalized());return finish(o,name,material,parent)
def tube(name,a,b,outer,inner,material=steel,parent=None,n=32):
 a,b=vec(a),vec(b);axis=(b-a).normalized();u=axis.cross(Vector((0,0,1)) if abs(axis.z)<.99 else Vector((1,0,0))).normalized();v=axis.cross(u);vs=[]
 for p in (a,b):
  for r in (outer,inner):
   for i in range(n):vs.append(p+r*(math.cos(i*math.tau/n)*u+math.sin(i*math.tau/n)*v))
 fs=[]
 for i in range(n):
  j=(i+1)%n;fs.extend([[i,j,2*n+j,2*n+i],[n+i,3*n+i,3*n+j,n+j],[i,n+i,n+j,j],[2*n+i,2*n+j,3*n+j,3*n+i]])
 me=bpy.data.meshes.new(name);me.from_pydata(vs,[],fs);me.update();bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free();o=bpy.data.objects.new(name,me);scene.collection.objects.link(o);return finish(o,name,material,parent)
O=(-24.08,F+.8,-4.69)
fixed=group('drive-fixed',O);crank=group('drive-crank',O);slider=group('drive-slider',O);rod=group('drive-connecting-rod',O)
# Bed and bored shaft supports bear on the existing deck.
box('engine-bed',[-.475,-.72,-.53],[1.67,.16,.54],parent=fixed)
for z in (-.65,-.34):
 box('bearing-pedestal',[0,-.37,z],[.18,.54,.13],parent=fixed)
 tube('bored-crank-bearing',[0,0,z-.065],[0,0,z+.065],.105,.027,brass,fixed)
cylinder('driven-shaft',[0,0,-.78],[0,0,.12],.025,parent=crank)
# Matched involute gear pair; 25deg pressure angle avoids a low-tooth pinion root.
def gear(name,n,radius,depth,parent=None,phase=0):
 alpha=math.radians(25);module=.035;base=radius*math.cos(alpha);root=radius-1.25*module;tip=radius+module
 inv=math.tan(alpha)-alpha;outline=[]
 def flank(r):
  a=math.acos(min(1,base/r));return math.pi/(2*n)+inv-(math.tan(a)-a)-.0015/radius
 radii=[root]+[base+(tip-base)*i/12 for i in range(13)]
 for tooth in range(n):
  center=phase+tooth*math.tau/n
  for r in radii: outline.append([r*math.cos(center-flank(r)),r*math.sin(center-flank(r))])
  for i in range(1,5):
   a=center-flank(tip)+2*flank(tip)*i/4;outline.append([tip*math.cos(a),tip*math.sin(a)])
  for r in list(reversed(radii))[1:]:outline.append([r*math.cos(center+flank(r)),r*math.sin(center+flank(r))])
  a0=center+flank(root);a1=center+math.tau/n-flank(root)
  for i in range(1,5):
   a=a0+(a1-a0)*i/4;outline.append([root*math.cos(a),root*math.sin(a)])
 N=len(outline);vertices=[vec([p[0],p[1],z]) for z in (-depth/2,depth/2) for p in outline]
 faces=[list(reversed(range(N))),list(range(N,2*N))]+[[i,(i+1)%N,(i+1)%N+N,i+N] for i in range(N)]
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(vertices,[],faces);mesh.update();bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
 o=bpy.data.objects.new(name,mesh);scene.collection.objects.link(o);finish(o,name,steel,parent);return o,outline
pinion,pinion_outline=gear('involute-pinion-12',12,.21,.07,crank,math.pi/12)
cylinder('crank-web',[0,0,-.455],[0,0,-.395],.135,parent=crank)
cylinder('crank-pin',[.1,0,-.56],[.1,0,-.36],.022,brass,crank)
tube('flywheel-rim',[0,0,-.78],[0,0,-.72],.30,.26,steel,crank)
for i in range(6):
 a=math.tau*i/6;cylinder('flywheel-spoke',[0,0,-.75],[.278*math.cos(a),.278*math.sin(a),-.75],.016,parent=crank)
# Rod is authored at its invariant .5 m center distance. Its pose is sampled.
tube('connecting-rod-big-end',[.25,0,-.037],[.25,0,.037],.04,.023,brass,rod)
tube('connecting-rod-small-end',[-.25,0,-.037],[-.25,0,.037],.035,.018,brass,rod)
box('connecting-rod-shank',[0,0,0],[.43,.042,.042],parent=rod)
# Slider/crosshead at x=-.4 at angle zero, with actual guide clearance.
box('crosshead',[0,0,0],[.075,.105,.09],parent=slider)
cylinder('crosshead-pin',[0,0,-.065],[0,0,.065],.017,brass,slider)
cylinder('piston-rod',[-.55,0,0],[0,0,0],.014,steel,slider)
for y in (-.066,.066):box('crosshead-guide',[-.5,y,-.51],[.4,.026,.12],parent=fixed)
tube('steam-cylinder',[-1.28,0,-.51],[-.70,0,-.51],.13,.091,iron,fixed)
cylinder('cylinder-back-cap',[-1.31,0,-.51],[-1.28,0,-.51],.145,iron,fixed)
tube('cylinder-gland',[-.7,0,-.51],[-.67,0,-.51],.145,.016,brass,fixed)
for x in (-1.23,-.75):box('cylinder-foot',[x,-.385,-.51],[.13,.51,.25],parent=fixed)
# Vertical fire-tube boiler silhouette with firebox, water gauge and connected pipe.
B=(-25.4,F,-3.55);boiler=group('steam-boiler',B)
box('boiler-foot',[0,.09,0],[.86,.18,.86],parent=boiler)
cylinder('boiler-shell',[0,.18,0],[0,1.43,0],.38,iron,boiler,48)
for y in (.24,1.36):tube('boiler-band',[0,y-.025,0],[0,y+.025,0],.394,.379,steel,boiler)
cylinder('boiler-chimney',[0,1.42,0],[0,2.2,0],.085,steel,boiler)
box('fire-door',[.28,.39,.29],[.22,.26,.065],material=steel,parent=boiler)
for y in (.58,1.02):cylinder('gauge-connection',[.19,y,.3],[.19,y,.43],.02,brass,boiler)
cylinder('boiler-water-gauge',[.19,.58,.43],[.19,1.02,.43],.018,brass,boiler)
# Main steam line reaches the fixed cylinder inlet; elbows have common endpoints.
pipe=[[-25.4,F+1.4,-3.55],[-24.9,F+1.4,-3.55],[-24.9,F+1.0,-3.55],[-25.1,F+1.0,-3.55],[-25.1,F+1.0,-5.2],[-25.1,F+.92,-5.2]]
for i in range(len(pipe)-1):cylinder('steam-pipe',pipe[i],pipe[i+1],.024,brass)
valve=[-24.9,F+1.2,-3.55]
cylinder('steam-valve-stem',valve,[-24.9,F+1.2,-3.11],.018,brass)
tube('steam-control-wheel',[-24.9,F+1.2,-3.12],[-24.9,F+1.2,-3.10],.13,.112,brass)
for i in range(4):
 a=i*math.tau/4;cylinder('steam-wheel-spoke',[-24.9,F+1.2,-3.11],[-24.9+.12*math.cos(a),F+1.2+.12*math.sin(a),-3.11],.009,brass)
# Operator stands clear of the rotating shaft and holds the steam control rim.
P=(-24.7,F,-2.65);operator=group('winch-operator',P)
for x in (-.13,.13):
 box('operator-boot',[x,.065,-.045],[.14,.13,.29],leather,operator)
 cylinder('operator-trouser',[x,.10,0],[x*.8,.94,0],.083,cloth,operator,12)
box('operator-pelvis',[0,.96,0],[.30,.25,.23],cloth,operator)
box('operator-coat',[0,1.26,-.03],[.38,.43,.25],cloth,operator)
cylinder('operator-neck',[0,1.45,-.04],[0,1.55,-.04],.06,skin,operator,12)
bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,radius=1,location=vec([0,1.67,-.055]));o=bpy.context.object;o.scale=(.12,.115,.15);finish(o,'operator-head',skin,operator)
box('operator-cap',[0,1.81,-.06],[.27,.06,.26],leather,operator)
hands=[[-.20,1.33,-.46],[-.07,1.20,-.46]]
for i,x in enumerate((-.19,.19)):
 shoulder=[x,1.43,-.06];elbow=[x*1.4,1.20,-.20];hand=hands[i]
 cylinder('operator-upper-arm',shoulder,elbow,.055,cloth,operator,12);cylinder('operator-forearm',elbow,hand,.047,cloth,operator,12);box('operator-hand',hand,[.065,.07,.07],skin,operator)
# Initial articulated pose, mirrored by the pure web sampler.
slider.location=vec([O[0]-.4,O[1],O[2]-.51])
rod.location=vec([O[0]-.15,O[1],O[2]-.51])
for o in scene.objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'model/steam-drive.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_extras=True,export_yup=True,export_animations=False,export_lights=False,export_cameras=False)
design={'floorY':F,'origin':list(O),'gearRatio':2,'crankRadius':.1,'rodLength':.5,'crankPlaneZ':-.51,'boiler':list(B),'operator':list(P),'operatorHands':[[P[k]+h[k] for k in range(3)] for h in hands],'pinionOutline':pinion_outline,'interpretation':True,'limits':['Steam-driven construction is historically sourced; this arrangement is interpreted.','No brake capacity, power or boiler internals claim.']}
(OUT/'drive-design.json').write_text(json.dumps(design,indent=2)+'\n')
# Context uses only the two bounded review GLBs, never a broad library append.
before=set(scene.objects)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/models/eiffel-long-load-first-floor/receiver.glb'))
receiver_objects=set(scene.objects)-before
# Replace only the prototype drum disc and teeth, retaining shaft/bearings/frame.
drum=next(o for o in receiver_objects if o.get('wf_role')=='drum')
for o in list(receiver_objects):
 if o.name.startswith('drive-wheel') or o.name.startswith('gear-tooth-'):
  receiver_objects.remove(o);bpy.data.objects.remove(o,do_unlink=True)
biggear,big_outline=gear('involute-drum-24',24,.42,.07)
# Authored in world XY at the current drum phase, then parent with inverse bind.
biggear.location=vec([-23.45,F+.8,-4.69]);bpy.context.view_layer.update()
world_matrix=biggear.matrix_world.copy();biggear.parent=drum;biggear.matrix_world=world_matrix
receiver_objects.add(biggear)
for o in scene.objects:o.select_set(o in receiver_objects)
bpy.ops.export_scene.gltf(filepath=str(OUT/'model/receiver-driven.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_extras=True,export_yup=True,export_animations=False,export_lights=False,export_cameras=False)
design['drumOutline']=big_outline
(OUT/'drive-design.json').write_text(json.dumps(design,indent=2)+'\n')
bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/models/eiffel-long-load-first-floor/bridge.glb'))
# A small review deck makes the support plane readable in the saved source.
deckmat=mat('Review deck only',(.32,.20,.10));deck=box('review-only-deck',[-24.7,F-.08,-4],[5,.16,5],deckmat);deck['wf_review_only']=True
world=bpy.data.worlds.new('Steam drive daylight');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.52,.62,.71,1);world.node_tree.nodes['Background'].inputs[1].default_value=.5;scene.world=world
light=bpy.data.lights.new('Review area','AREA');light.energy=1800;light.shape='DISK';light.size=8;lo=bpy.data.objects.new('Review area',light);scene.collection.objects.link(lo);lo.location=vec([-28,F+8,1])
camd=bpy.data.cameras.new('Steam drive review');cam=bpy.data.objects.new('Steam drive review',camd);scene.collection.objects.link(cam);cam.location=vec([-29,F+4,2]);cam.rotation_euler=(vec([-24,F+1,-4])-cam.location).to_track_quat('-Z','Y').to_euler();camd.lens=52;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=48;scene.render.resolution_x=1400;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
bpy.data.libraries.write(str(OUT/'blender/eiffel-first-floor-steam-drive.blend'),{scene},fake_user=True)
scene.render.filepath=str(OUT/'renders/steam-drive.png');bpy.ops.render.render(write_still=True)
result={'scene':scene.name,'objects':len(scene.objects),'blend':str(OUT/'blender/eiffel-first-floor-steam-drive.blend'),'export':str(OUT/'model/steam-drive.glb')}
