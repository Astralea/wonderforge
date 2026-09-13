"""Ground-loaded carrier study; not production admission or a lift simulation."""
import bpy, bmesh, json, math, hashlib
from pathlib import Path
from mathutils import Vector, Matrix, Quaternion
ROOT=Path(__file__).resolve().parents[1]
DESIGN=ROOT/'artifacts/eiffel-face-joint-2026-09-07'
OUT=ROOT/'artifacts/eiffel-face-carrier-2026-09-07'
for child in ['model','blender','renders']:(OUT/child).mkdir(parents=True,exist_ok=True)
d=json.loads((DESIGN/'design.json').read_text())
c=json.loads((DESIGN/'carrier-design.json').read_text())['candidate']
routes=json.loads((ROOT/'artifacts/eiffel-joint-campaign-2026-09-07/campaign-routes.json').read_text())
if c['findings']:raise ValueError('Carrier final geometry is not clear')
j=d['joint'];n=d['normal'];scene=bpy.data.scenes.new('WonderForge — ground-loaded face-joint carrier');bpy.context.window.scene=scene
scene['wf_production_admitted']=False
def web(v):return (v[0],-v[2],v[1])
def collection(name):
    c=bpy.data.collections.new(name);scene.collection.children.link(c);return c
def material(name,color):
    rgb=[int(color[i:i+2],16)/255 for i in (0,2,4)];rgb=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb]
    m=bpy.data.materials.new(name);m.diffuse_color=(*rgb,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*rgb,1);p.inputs['Metallic'].default_value=.25;p.inputs['Roughness'].default_value=.78;return m
steel=material('Carrier — iron angles','4e554e');iron=material('Carrier — delivered iron','716557')
frame=collection('Carrier — reusable angle frame and split clamps');load=collection('Ground — delivered beam and face-joint parts')
faces=[[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]]
def mesh(name,vertices,polygons,col,mat):
    m=bpy.data.meshes.new(name);m.from_pydata([web(tuple(v[k]-j[k] for k in range(3))) for v in vertices],[],polygons);m.update()
    bm=bmesh.new();bm.from_mesh(m);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(m);bm.free()
    o=bpy.data.objects.new(name,m);col.objects.link(o);o.location=web(j);m.materials.append(mat);return o
def box_vertices(box):
    return [[box['center'][k]+sum(box['axes'][i][k]*box['half'][i]*s[i] for i in range(3)) for k in range(3)] for s in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
frame_objects=[]
for item in c['boxes']:
    b=item['box'];h=b['half']
    if item['id'].startswith('clamp'):
        o=mesh(item['id'],box_vertices(b),faces,frame,steel);o['wf_profile']='solid-clamp';frame_objects.append(o)
    else:
        # Six mm angle iron, not a filled square beam. The two solid legs meet
        # along faces; the empty inside corner remains empty in the GLB.
        thickness=.006
        for role,half,offset in [('flange',[h[0],thickness/2,h[2]],[0,h[1]-thickness/2,0]),('web',[thickness/2,h[1]-thickness/2,h[2]],[h[0]-thickness/2,-thickness/2,0])]:
            center=[b['center'][k]+sum(b['axes'][i][k]*offset[i] for i in range(3)) for k in range(3)]
            o=mesh(item['id']+'-'+role,box_vertices({'center':center,'half':half,'axes':b['axes']}),faces,frame,steel)
            o['wf_profile']='angle-leg';frame_objects.append(o)
    for o in frame_objects:
        if 'wf_member' not in o:o['wf_member']=item['id'];o['wf_material']='iron'

# Import the already verified plate and pads. Their four centimetre-scale
# contacts remain real geometry; this study adds no invented internal bolts.
before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(DESIGN/'model/face-joint.glb'));plate_objects=[o for o in set(bpy.data.objects)-before if o.type=='MESH']
for o in plate_objects:o.location+=Vector(web([x*.4 for x in n]))
part=routes['loads'][0]['part'];p=part['finalPose'];q=p['quaternion'];q=Quaternion((q[3],q[0],q[1],q[2]))
mn=part['localBounds']['min'];mx=part['localBounds']['max'];verts=[]
for s in [(0,0,0),(1,0,0),(1,1,0),(0,1,0),(0,0,1),(1,0,1),(1,1,1),(0,1,1)]:
    v=q@Vector([mx[k] if s[k] else mn[k] for k in range(3)])
    verts.append([p['position'][k]+v[k] for k in range(3)])
beam=mesh(part['id'],verts,faces,load,iron);beam['wf_part']=part['id']

def export(objects,name):
    for o in scene.objects:o.select_set(False)
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=next(o for o in objects if o.type=='MESH')
    bpy.ops.export_scene.gltf(filepath=str(OUT/'model'/name),export_format='GLB',use_selection=True,use_active_scene=True,export_extras=True,export_yup=True,export_animations=False,export_lights=False,export_cameras=False)
export(frame_objects,'face-carrier.glb')

# Existing period cart, with actual shallow clearance channels for both new
# underside clamps. Export it at the original reusable cart coordinates.
before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/models/eiffel-joint-campaign/cart.glb'));cart_objects=list(set(bpy.data.objects)-before)
bedtop=routes['cart']['bedTopY'] if 'bedTopY' in routes['cart'] else 1.141950000822544
slots=[{'centerZ':v*math.cos(math.pi/30),'width':.20,'depth':.035} for v in c['ends']]
# Rebuild the independently closed planks by intervals. A Boolean across the
# imported touching plank solids removed unrelated faces in the first render.
body=next(o for o in cart_objects if o.type=='MESH' and 'joint-cart-body-timber.' in o.name)
materials={'timber':body.data.materials[0]}
source=(ROOT/'scripts/blender_paris_exposition.py').read_text();exec(source[source.index('class Batch:'):source.index('\ndef empty(')],globals())
replacement=collection('Cart — retained planks with clamp channels');b=Batch();length=5.909524027506511;width=1.8;thickness=.24
for i in range(7):
    x=-width/2+(i+.5)*width/7
    cuts=[(-1.28,-1.06,.05),(1.13,1.35,.05)]+([(2,2.71,.045)] if i==3 else [])
    cuts += [(s['centerZ']-s['width']/2,s['centerZ']+s['width']/2,s['depth']) for s in slots]
    edges=sorted(set([-length/2,length/2]+[v for lo,hi,depth in cuts for v in (lo,hi)]))
    for lo,hi in zip(edges,edges[1:]):
        middle=(lo+hi)/2;depth=max([depth for a,c,depth in cuts if a<middle<c]+[0])
        b.box('timber',(x,bedtop-thickness/2-depth/2,middle),(width/7-.007,thickness-depth,hi-lo))
for x in (-.55,.55):b.box('timber',(x,.98,-length/2-.4),(.085,.085,1.2))
b.box('timber',(0,1.05,-length/2-.42),(1.28,.085,.085))
new_body=b.finish('carrier-cart-body',replacement,body.parent)
cart_objects.remove(body);bpy.data.objects.remove(body,do_unlink=True);cart_objects.extend(new_body)
export(cart_objects,'carrier-cart.glb')

def pose_matrix(p):
    q=p['quaternion'];return Matrix.LocRotScale(Vector(p['position']),Quaternion((q[3],q[0],q[1],q[2])),Vector((1,1,1)))
convert=Matrix(((1,0,0,0),(0,0,-1,0),(0,1,0,0),(0,0,0,1)))
delta=convert@pose_matrix(routes['loads'][0]['route']['pickup'])@pose_matrix(p).inverted()@convert.inverted()
for o in frame_objects+plate_objects+[beam]:o.matrix_world=delta@o.matrix_world
pickup=routes['loads'][0]['route']['pickup']['position']
for o in cart_objects:
    if o.parent not in cart_objects:o.location+=Vector(web([pickup[0]+.06,0,pickup[2]]))
export(frame_objects+plate_objects+[beam]+cart_objects,'ground-loaded-carrier.glb')

world=bpy.data.worlds.new('Carrier daylight');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.25,.3,.35,1);world.node_tree.nodes['Background'].inputs[1].default_value=.8;scene.world=world
ground=collection('Review ground — excluded from export');g=mesh('ground',[[pickup[0]+x,-.01,pickup[2]+z] for x,z in [(-8,-8),(8,-8),(8,8),(-8,8)]],[[0,1,2,3]],ground,material('Carrier ground','ad9d7c'))
light=bpy.data.lights.new('Carrier sun','SUN');light.energy=2;light.angle=.15;o=bpy.data.objects.new('Carrier sun',light);scene.collection.objects.link(o);o.rotation_euler=(.4,-.6,-.5)
cam=bpy.data.cameras.new('Carrier ground review');o=bpy.data.objects.new('Carrier ground review',cam);scene.collection.objects.link(o);scene.camera=o
target=Vector(web([pickup[0],1,pickup[2]]));o.location=target+Vector((5,-6,4));o.rotation_euler=(target-o.location).to_track_quat('-Z','Y').to_euler();cam.type='ORTHO';cam.ortho_scale=7.7
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.render.resolution_x=1400;scene.render.resolution_y=1000;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX'
scene.render.filepath=str(OUT/'renders/ground-loaded-carrier.png');bpy.ops.render.render(write_still=True)
result={'scene':scene.name,'blend':str(OUT/'blender/eiffel-face-carrier.blend'),'productionAdmitted':False,'clampEnds':c['ends'],'cartSlots':slots,'frameMeshes':len(frame_objects),'plateMeshes':len(plate_objects),'sourceCarrierSHA256':hashlib.sha256((DESIGN/'carrier-design.json').read_bytes()).hexdigest(),'limits':['Ground-load and carrier geometry study. No lift or fastening admission.','Plate-to-pad manufacturing fasteners remain unmodelled.','Changed mass and transverse COM require a new supported lifting bridle; the original two slings are not admitted for this load.','Carrier release, grounded crew and placement sequence remain to be authored.']}
(OUT/'model/manifest.json').write_text(json.dumps(result,indent=2)+'\n');bpy.ops.wm.save_as_mainfile(filepath=result['blend'])
