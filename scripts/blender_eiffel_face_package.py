"""Compact independent face-joint load: loose parts in a shaped packing tray."""
import bpy, bmesh, math, json, hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];SOURCE=ROOT/'artifacts/eiffel-face-joint-2026-09-07'
OUT=ROOT/'artifacts/eiffel-face-package-2026-09-08'
for p in ['model','blender','renders']:(OUT/p).mkdir(parents=True,exist_ok=True)
d=json.loads((SOURCE/'design.json').read_text());origin=[d['joint'][0]+.14,d['joint'][1]+.065,d['joint'][2]-.15]
scene=bpy.data.scenes.new('WonderForge — independent face-joint packing tray');bpy.context.window.scene=scene
scene['wf_production_admitted']=False
def web(v):return (v[0],-v[2],v[1])
def collection(name):
    c=bpy.data.collections.new(name);scene.collection.children.link(c);return c
def material(name,color,metal=0):
    rgb=[int(color[i:i+2],16)/255 for i in (0,2,4)];rgb=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb]
    m=bpy.data.materials.new(name);m.diffuse_color=(*rgb,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*rgb,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=.8;return m
materials={'timber':material('Package timber','997d55'),'timber-dark':material('Package cart frame','65563e'),'iron':material('Package lifting bands','454a44',.25),'plate':material('Package oxide plate','985b3d',.25)}
source=(ROOT/'scripts/blender_paris_exposition.py').read_text();exec(source[source.index('class Batch:'):source.index('\ndef empty(')],globals())
payload=collection('Payload — tray, bearing bands and five loose parts');cart=collection('Ground — compact handcart');cutters=collection('Packing form tools — excluded')
def mesh(name,vertices,faces,col,mat=None):
    m=bpy.data.meshes.new(name);m.from_pydata([web(v) for v in vertices],[],faces);m.update()
    bm=bmesh.new();bm.from_mesh(m);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(m);bm.free()
    o=bpy.data.objects.new(name,m);col.objects.link(o)
    if mat:m.materials.append(mat)
    return o
parts=[];tools=[]
for p in d['components']:
    vertices=[[v[k]-origin[k] for k in range(3)] for v in p['vertices']]
    o=mesh(p['id'],vertices,p['faces'],payload,materials['plate']);o['wf_part']=p['id'];o['wf_material']='iron';o['wf_role']='loose-joint-part';parts.append(o)
    # An upward convex extrusion cuts an open-top nest, so parts can be lifted
    # out vertically instead of being trapped in a closed cavity.
    m=bpy.data.meshes.new('packing-cut-'+p['id']);bm=bmesh.new()
    for v in vertices+[ [v[0],v[1]+2,v[2]] for v in vertices]:bm.verts.new(web(v))
    bmesh.ops.convex_hull(bm,input=list(bm.verts),use_existing_faces=False);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(m);bm.free()
    tool=bpy.data.objects.new('packing-cut-'+p['id'],m);cutters.objects.link(tool);tool.hide_render=True;tools.append(tool)
b=Batch();b.box('timber',(0,-.2675,0),(.48,.025,1.08));floor=b.finish('tray-floor',payload)
for o in floor:o['wf_role']='tray-floor'
cleats=[]
for i,c in enumerate(d['contacts']):
    z=c['center'][2]-origin[2];b=Batch();b.box('timber',(0,(-.255+.10)/2,z),(.44,.355,.07));made=b.finish('fitted-packing-cleat-'+str(i),payload)
    for o in made:
        # Batch produces unindexed corner faces. Weld before exact solid cuts.
        bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-7);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
        bpy.context.view_layer.objects.active=o
        for tool in tools:
            mod=o.modifiers.new('Open-top shaped nest','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=tool;bpy.ops.object.modifier_apply(modifier=mod.name)
        o['wf_role']='packing-cleat';o['wf_supports_part']=d['components'][i+1]['id'];o['wf_bearing_alignment_beam']=c['partId'];cleats.append(o)
for tool in tools:bpy.data.objects.remove(tool,do_unlink=True)
b=Batch()
for x in (-.23,.23):
    b.box('timber',(x,.19,0),(.02,.025,1.0))
    for z in (-.52,.52):b.box('timber',(x,(-.255+.1775)/2,z),(.02,.4325,.04))
for z in (-.52,.52):b.box('timber',(0,.19,z),(.48,.025,.04))
for o in b.finish('tray-open-frame',payload):o['wf_role']='tray-frame'

# Four steel bands bear underneath the pallet, so the eyes are not merely
# floating over it. Their inside faces touch wood; no wood volume is hidden.
b=Batch();eyes=[]
for x in (-.244,.244):
    for z in (-.50,.50):
        sign=1 if x>0 else -1
        b.box('iron',(sign*.211,-.284,z),(.066,.008,.04))
        b.box('iron',(x,(-.288+.24)/2,z),(.008,.528,.04))
        # Ring in the YZ plane, a continuous closed tube with an open eye.
        verts=[];ring=.018;tube=.006;cy=.258
        for i in range(16):
            a=i*math.tau/16
            for k in range(6):
                angle=k*math.tau/6;r=ring+tube*math.cos(angle)
                verts.append((x+tube*math.sin(angle),cy+r*math.cos(a),z+r*math.sin(a)))
        faces=[(i*6+k,((i+1)%16)*6+k,((i+1)%16)*6+(k+1)%6,i*6+(k+1)%6) for i in range(16) for k in range(6)]
        b.poly('iron',verts,faces);eyes.append([x,.276,z])
for o in b.finish('tray-bearing-bands-and-eyes',payload):o['wf_role']='bearing-bands'

# Small four-wheel cart, bed top .57 m. The tray bearing bands rest on it,
# giving a payload origin .858 m (band underside -.288 m).
cart_root=bpy.data.objects.new('package-handcart',None);cart.objects.link(cart_root);cart_root['wf_role']='package-cart'
b=Batch()
for i in range(5):b.box('timber',(-.37+(i+.5)*.74/5,.535,0),(.74/5-.005,.07,1.34))
for x in (-.29,.29):b.box('timber-dark',(x,.405,0),(.085,.19,1.26))
for z in (-.46,.46):b.box('iron',(0,.22,z),(.88,.075,.075))
for x in (-.27,.27):b.box('timber-dark',(x,.66,-.9),(.05,.05,.8))
b.box('timber-dark',(0,.66,-1.27),(.6,.055,.055));b.finish('package-cart-body',cart,cart_root)
base=None
for i,(x,z) in enumerate(( (x,z) for x in (-.415,.415) for z in (-.46,.46) )):
    root=bpy.data.objects.new('package-wheel-'+str(i),None);cart.objects.link(root);root.parent=cart_root;root.location=web((x,.22,z));root['wf_role']='package-wheel-'+str(i)
    if base is None:
        w=Batch();verts=[];N=20
        for xx in (-.03,.03):
            for r in (.185,.22):
                for k in range(N):a=k*math.tau/N;verts.append((xx,r*math.cos(a),r*math.sin(a)))
        faces=[]
        for k in range(N):
            j=(k+1)%N;faces.extend([(k,j,N+j,N+k),(2*N+k,3*N+k,3*N+j,2*N+j),(k,2*N+k,2*N+j,j),(N+k,N+j,3*N+j,3*N+k)])
        w.poly('iron',verts,faces);w.cylinder('iron',(0,0,0),.045,.085,'x',10)
        for k in range(8):a=k*math.tau/8;w.beam('timber',(0,.035*math.cos(a),.035*math.sin(a)),(0,.19*math.cos(a),.19*math.sin(a)),.012)
        base=w.finish('package-wheel',cart,root)
    else:
        for old in base:o=old.copy();o.data=old.data;cart.objects.link(o);o.parent=root

def export(objects,name):
    for o in scene.objects:o.select_set(False)
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=next(o for o in objects if o.type=='MESH')
    bpy.ops.export_scene.gltf(filepath=str(OUT/'model'/name),export_format='GLB',use_selection=True,use_active_scene=True,export_extras=True,export_yup=True,export_animations=False,export_lights=False,export_cameras=False)
export(list(payload.objects),'face-package.glb');export(list(cart.all_objects),'package-cart.glb')

for o in payload.objects:o.location.z+=.858
export(list(payload.objects)+list(cart.all_objects),'ground-package.glb')
studio=collection('Review studio — excluded');b=Batch();b.box('timber',(0,-.025,0),(10,.05,10));b.finish('ground',studio)
world=bpy.data.worlds.new('Package daylight');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.27,.31,.35,1);world.node_tree.nodes['Background'].inputs[1].default_value=.8;scene.world=world
sun=bpy.data.lights.new('Package sun','SUN');sun.energy=2;sun.angle=.15;o=bpy.data.objects.new('Package sun',sun);scene.collection.objects.link(o);o.rotation_euler=(.5,-.55,-.6)
cam=bpy.data.cameras.new('Package ground review');o=bpy.data.objects.new('Package ground review',cam);scene.collection.objects.link(o);scene.camera=o;o.location=(2.2,2.8,2.1);o.rotation_euler=(Vector((0,0,.8))-o.location).to_track_quat('-Z','Y').to_euler();cam.type='ORTHO';cam.ortho_scale=2.7
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.render.resolution_x=1100;scene.render.resolution_y=1100;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX';scene.render.filepath=str(OUT/'renders/ground-package.png');bpy.ops.render.render(write_still=True)
result={'scene':scene.name,'blend':str(OUT/'blender/eiffel-face-package.blend'),'productionAdmitted':False,'sourceCandidateSHA256':hashlib.sha256((SOURCE/'design.json').read_bytes()).hexdigest(),'sourceOrigin':origin,'payloadOriginOnCartY':.858,'cartBedTopY':.57,'liftingEyes':eyes,'densitiesKgM3':{'timber':600,'iron':7800},'limits':['Independent packing geometry; no lift or installation admission.','Measure actual support, mass/COM, bridle, crane and path before use.','Parts remain loose in the shaped tray; permanent fastening and unloading are not yet modelled.']}
(OUT/'model/manifest.json').write_text(json.dumps(result,indent=2)+'\n');bpy.ops.wm.save_as_mainfile(filepath=result['blend'])
