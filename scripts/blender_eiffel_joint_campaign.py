"""Original temporary joint support, handcart and steel splice, Y-up metres.
Run through Blender Lab MCP. Existing scenes and original assets survive.
"""
import bpy,json,math,hashlib
from pathlib import Path
from mathutils import Vector,Quaternion
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/eiffel-joint-campaign-2026-09-07/blender'
MODEL=ROOT/'public/models/eiffel-joint-campaign'
source_path=OUT.parent/'joint-support.json';S=json.loads(source_path.read_text())
scene=bpy.data.scenes.new('WonderForge — supported iron splice campaign');bpy.context.window.scene=scene
materials={}
for key,color,rough,metal in [('timber','967249',.94,0),('timber-dark','6c5135',.96,0),('iron','42453e',.74,.25),('rivet','69695c',.68,.3)]:
 rgb=[int(color[i:i+2],16)/255 for i in (0,2,4)];rgb=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb]
 m=bpy.data.materials.new('joint-campaign-'+key);m.diffuse_color=(*rgb,1);m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*rgb,1);bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal;materials[key]=m
source=(ROOT/'scripts/blender_paris_exposition.py').read_text();exec(source[source.index('class Batch:'):source.index('\ndef empty(')],globals())
def collection(name):
 c=bpy.data.collections.new(name);scene.collection.children.link(c);return c
def root(name,c,p=(0,0,0),role=None):
 o=bpy.data.objects.new(name,None);c.objects.link(o);o.location=(p[0],-p[2],p[1]);o['wf_role']=role or name;return o
def export(c,name):
 bpy.ops.object.select_all(action='DESELECT')
 for o in c.all_objects:o.select_set(True)
 bpy.ops.export_scene.gltf(filepath=str(MODEL/name),export_format='GLB',use_selection=True,use_active_scene=True,export_extras=True,export_yup=True,export_apply=False)
 return sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in c.all_objects if o.type=='MESH')
# Static support remains individually editable. Rendering may batch by material.
support=collection('Joint — temporary support');sr=root('joint-support',support)
for beam in S['beams']:
 b=Batch();b.beam('timber-dark' if 'raker' in beam['kind'] or 'knee' in beam['kind'] else 'timber',beam['a'],beam['b'],beam['halfWidth'])
 for o in b.finish(beam['id'],support,sr):o['wf_member_id']=beam['id']
for box in S['boxes']:
 b=Batch();b.box('iron' if 'saddle' in box['kind'] else 'timber',box['center'],box['size'])
 for o in b.finish(box['id'],support,sr):o['wf_member_id']=box['id']
sr['wf_source_sha256']=hashlib.sha256(source_path.read_bytes()).hexdigest()
support_triangles=export(support,'support.glb')
# Payload-specific cart: fixed plank bed with independent rolling wheel groups.
cart=collection('Joint — reusable material cart');cr=root('joint-cart',cart)
length=5.509524027506511+.4;width=1.8;top=1.2-.0580499991774559;thickness=.24
cr['wf_bed_size']=json.dumps([width,thickness,length]);cr['wf_bed_top']=top;cr['wf_wheel_radius']=.4
b=Batch();planks=7
for i in range(planks):
 x=-width/2+(i+.5)*width/planks
 # Full-width sling channels clear the load-bearing underside of both basket
 # hitches; first-load stations account for its captive steel hardware mass.
 cuts=[(-1.28,-1.06,.05),(1.13,1.35,.05)]+([(2,2.71,.045)] if i==3 else [])
 edges=sorted(set([-length/2,length/2]+[e for lo,hi,d in cuts for e in (lo,hi)]))
 for lo,hi in zip(edges,edges[1:]):
  mid=(lo+hi)/2;depth=max([d for a,c,d in cuts if a<mid<c]+[0])
  b.box('timber',(x,top-thickness/2-depth/2,mid),(width/planks-.007,thickness-depth,hi-lo))
for x in (-.62,.62):b.box('timber-dark',(x,top-thickness-.095,0),(.14,.2,length-.15))
wheel_z=length*.325
for z in (-wheel_z,wheel_z):
 b.box('iron',(0,.4,z),(1.72,.12,.13))
 for x in (-.7,.7):b.box('timber-dark',(x,.6,z),(.15,.4,.2))
for x in (-.55,.55):b.box('timber',(x,.98,-length/2-.4),(.085,.085,1.2))
b.box('timber',(0,1.05,-length/2-.42),(1.28,.085,.085))
for z in (-length/2+.1,length/2-.1):b.box('iron',(0,top+.012,z),(width,.024,.065))
b.finish('joint-cart-body',cart,cr)
# Linked wheel meshes share geometry for instanced rendering in the web.
base=None
for i,(x,z) in enumerate(( (x,z) for x in (-.79,.79) for z in (-wheel_z,wheel_z) )):
 wr=root('joint-cart-wheel-'+str(i),cart,(x,.4,z),'cart-wheel-'+str(i));wr.parent=cr
 if base is None:
  w=Batch();verts=[];n=24
  for a in (-.05,.05):
   for r in (.35,.4):
    for j in range(n):verts.append((a,r*math.cos(j*math.tau/n),r*math.sin(j*math.tau/n)))
  faces=[]
  for j in range(n):
   k=(j+1)%n
   faces.extend([(j,k,n+k,n+j),(2*n+j,3*n+j,3*n+k,2*n+k),(j,2*n+j,2*n+k,k),(n+j,n+k,3*n+k,3*n+j)])
  w.poly('iron',verts,faces);w.cylinder('iron',(0,0,0),.095,.14,'x',12)
  for j in range(10):
   a=j*math.tau/10;w.beam('timber',(0,.075*math.cos(a),.075*math.sin(a)),(0,.352*math.cos(a),.352*math.sin(a)),.022)
  base=w.finish('joint-cart-wheel',cart,wr)
 else:
  for model in base:
   o=model.copy();o.data=model.data;cart.objects.link(o);o.parent=wr
cart_triangles=export(cart,'cart.glb')
# Real two-sided plates bridge the original segment IDs; delivered separately
# to the joint by the prepared fastening crew. Keep roles independently movable.
splice=collection('Joint — permanent splice plates');pr=root('joint-splice',splice)
joint=S['joint'];plates=[]
for i,sign in enumerate((-1,1)):
 center=(joint[0]+sign*(.0580499991774559+.009),joint[1],joint[2]);size=(.018,.11,.65)
 plate=root('joint-splice-plate-'+str(i),splice,center,'splice-plate-'+str(i));plate.parent=pr
 b=Batch()
 # A captive longitudinal slot lets the delivered plate slide over the joint.
 for y in (-.03375,.03375):b.box('iron',(0,y,0),(.018,.0425,.65))
 b.box('iron',(0,0,-.315),(.018,.025,.02));b.box('iron',(0,0,.2225),(.018,.025,.205))
 for z in (-.24,-.12,.12,.24):
  for y in (-.035,.035):b.cylinder('rivet',(sign*.013,y,z),.012,.008,'x',8)
 b.finish('joint-splice-plate-'+str(i),splice,plate);plates.append({'role':'splice-plate-'+str(i),'center':center,'size':size})
 retainer=root('joint-splice-retainer-'+str(i),splice,(center[0],joint[1],joint[2]-.3),'splice-retainer-'+str(i));retainer.parent=pr
 b=Batch();b.cylinder('iron',(0,0,0),.009,.034,'x',10);b.cylinder('rivet',(sign*.016,0,0),.025,.008,'x',12);b.finish('joint-splice-retainer-'+str(i),splice,retainer)
splice_triangles=export(splice,'splice.glb')
# Show the inherited grounded support path in Blender only, not in new exports.
context=collection('Joint — existing grounded frame context');old=json.loads((ROOT/'artifacts/eiffel-integration-2026-09-07/guyenet-ne-station.json').read_text());b=Batch()
for beam in old['proposedStructure']:b.beam('timber-dark',beam['a'],beam['b'],beam['halfWidth'])
b.finish('inherited-frame',context)
kit=json.loads((ROOT/'public/models/eiffel-construction-kit/tower-kit.manifest.json').read_text())
b=Batch()
for part in kit['parts']:
 if part['id'] not in S['partIds']:continue
 p=part['finalPose'];q=p['quaternion'];q=Quaternion((q[3],q[0],q[1],q[2]));a,c,d=[v/2 for v in part['transportSize']]
 vertices=[tuple(Vector(p['position'])+q@Vector(v)) for v in [(-a,-c,-d),(a,-c,-d),(a,c,-d),(-a,c,-d),(-a,-c,d),(a,-c,d),(a,c,d),(-a,c,d)]]
 b.poly('iron',vertices,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(0,4,7,3),(1,2,6,5)])
b.finish('seated-iron-context',context)
# Move display cart into the real bay; reusable exported cart stays at origin.
cr.location=(53,45,0)
studio=collection('Joint — studio, excluded from exports');b=Batch();b.box('timber-dark',(49,-.06,-45),(60,.1,60));b.finish('review-ground',studio)
world=bpy.data.worlds.new('Joint daylight');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.35,.43,.5,1);world.node_tree.nodes['Background'].inputs[1].default_value=.65;scene.world=world
light=bpy.data.lights.new('Joint sun','SUN');light.energy=3;light.angle=.1;o=bpy.data.objects.new('Joint sun',light);scene.collection.objects.link(o);o.rotation_euler=(.45,-.6,-.5)
cam=bpy.data.cameras.new('Joint support review');o=bpy.data.objects.new('Joint support review',cam);scene.collection.objects.link(o);o.location=(80,71,36);o.rotation_euler=(Vector((48,45,10))-o.location).to_track_quat('-Z','Y').to_euler();cam.type='ORTHO';cam.ortho_scale=29;scene.camera=o
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=1200;scene.render.resolution_y=1100;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX'
manifest={'supportSourceSHA256':sr['wf_source_sha256'],'supportTriangles':support_triangles,'cartTriangles':cart_triangles,'spliceTriangles':splice_triangles,'bed':{'size':[width,thickness,length],'topY':top,'centerY':top-thickness/2},'wheelRadius':.4,'wheelZ':wheel_z,'plates':plates,'limits':['Original authored interpretation; no historical dimensions claimed for this added support/cart/splice.','Grounded support context is not duplicated in support.glb.','Campaign paths and fastening/lifecycle need separate runtime verification.']}
(MODEL/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');(OUT/'build-summary.json').write_text(json.dumps(manifest,indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'eiffel-joint-campaign.blend'))
scene.render.filepath=str(OUT/'joint-support.png');bpy.ops.render.render(write_still=True)
result={'scene':scene.name,'blend':bpy.data.filepath,'manifest':manifest}
