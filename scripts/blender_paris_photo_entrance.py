"""PH76865-inspired exposition entrance; parent-authored through Blender MCP.

The photograph establishes the booth, deep eaves, glazed panels, pointed fence
and gate. Colour, unseen sides, dimensions and placement are interpretations.
"""
import bpy, bmesh, json, math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts/eiffel-upper-material-chain-2026-09-08'
terrain = json.loads((OUT/'entrance/terrain.json').read_text())
scene = bpy.data.scenes.new('WonderForge — Paris 1889 photographed entrance')
bpy.context.window.scene = scene
contacts = []

def h(x,z):
    u=max(0,min(56,(x+7)/.25)); v=max(0,min(20,(z+2.5)/.25))
    i=min(55,int(u)); j=min(19,int(v)); a=u-i; b=v-j; g=terrain['heights']
    return (g[i][j]*(1-a)+g[i+1][j]*a)*(1-b)+(g[i][j+1]*(1-a)+g[i+1][j+1]*a)*b

def world(p):
    # +90 degrees about web Y, then the surveyed placement.
    return (-118+p[2], terrain['center'][1]+p[1], 14-p[0])

def vec(p):
    x,y,z=world(p)
    return Vector((x,-z,y))

def mat(name,hexcolor,rough=.9):
    m=bpy.data.materials.new(name);m.use_nodes=True
    rgb=[int(hexcolor[i:i+2],16)/255 for i in (0,2,4)]
    rgb=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb]
    bsdf=m.node_tree.nodes['Principled BSDF'];bsdf.inputs['Base Color'].default_value=(*rgb,1)
    bsdf.inputs['Roughness'].default_value=rough
    return m

wood=mat('Entrance weathered chestnut','6d6250')
paint=mat('Entrance faded sage paint','7a8071')
paint2=mat('Entrance worn sage variation','878878')
dark=mat('Entrance exposed timber','3c3b32')
stone=mat('Entrance limestone thresholds','b0a58e')
roof=mat('Entrance weathered zinc roof','555e61')
glass=mat('Entrance quiet opaque glazing','6d7b79',.66)
coat=mat('Entrance attendant wool coat','343d48')
skin=mat('Entrance attendant skin','b08e6e')
boot=mat('Entrance attendant leather','37352f')

def mesh(name,points,faces,material):
    data=bpy.data.meshes.new(name);data.from_pydata([vec(p) for p in points],[],faces);data.update()
    bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(data);bm.free()
    obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);data.materials.append(material)
    obj['codex_generated']=True;obj['wf_role']='paris-photo-entrance'
    return obj

FACES=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
def box(name,p,size,material):
    x,y,z=p;a,b,c=[v/2 for v in size]
    return mesh(name,[(x-a,y-b,z-c),(x+a,y-b,z-c),(x+a,y-b,z+c),(x-a,y-b,z+c),
        (x-a,y+b,z-c),(x+a,y+b,z-c),(x+a,y+b,z+c),(x-a,y+b,z+c)],FACES,material)

def grounded(name,x,z,sx,sz,top,material):
    corners=[(x-sx/2,z-sz/2),(x+sx/2,z-sz/2),(x+sx/2,z+sz/2),(x-sx/2,z+sz/2)]
    points=[(a,h(a,b),b) for a,b in corners]+[(a,top,b) for a,b in corners]
    contacts.extend(world(p) for p in points[:4])
    return mesh(name,points,FACES,material)

def beam(name,a,b,width,material):
    a=Vector(a);b=Vector(b);d=(b-a).normalized();n=d.cross(Vector((0,1,0)))
    if n.length<.01:n=d.cross(Vector((1,0,0)))
    n.normalize();q=d.cross(n).normalized();r=width/2
    points=[a-n*r-q*r,a+n*r-q*r,a+n*r+q*r,a-n*r+q*r,b-n*r-q*r,b+n*r-q*r,b+n*r+q*r,b-n*r+q*r]
    return mesh(name,points,FACES,material)

# Booth has a real low plinth, three stairs, recessed glazing and broad eaves.
grounded('Photographed booth plinth',-4.7,-.15,3.35,3.15,.32,stone)
for j in range(3):grounded('Entrance threshold step',-4.7,1.52+j*.22,1.50,.24,.30-j*.09,stone)
box('Booth timber floor',[-4.7,.37,-.15],[3.15,.10,2.95],wood)
for side in (-1,1):
    x=-4.7+side*1.55
    box('Booth solid side',[x,1.48,-.15],[.13,2.15,2.95],paint)
    for j in range(13):box('Side board joint',[x+side*.073,1.48,-1.48+j*.22],[.026,2.12,.024],wood)
box('Booth back wall',[-4.7,1.48,-1.61],[3.10,2.15,.12],paint2)
for x in (-6.25,-5.72,-5.20,-4.70,-4.20,-3.68,-3.15):
    box('Glazed front mullion',[x,1.57,1.29],[.085,2.28,.14],dark)
for x in (-5.99,-5.46,-4.95,-4.45,-3.94,-3.41):
    box('Recessed front pane',[x,1.78,1.24],[.43,1.48,.055],glass)
    box('Painted lower panel',[x,.79,1.26],[.43,.46,.08],paint)
for y in (.51,1.04,2.54):box('Front horizontal frame',[-4.7,y,1.30],[3.20,.09,.15],dark)
for x in (-6.23,-3.17):
    box('Front porch post',[x,1.58,1.45],[.14,2.42,.14],wood)
    beam('Projecting eave bracket',[x,2.02,1.44],[x,2.66,1.98],.12,dark)
box('Upper fascia',[-4.7,2.75,-.15],[4.10,.15,4.04],wood)
mesh('Shallow hipped zinc roof',[(-6.85,2.83,-2.25),(-2.55,2.83,-2.25),(-2.55,2.83,1.95),(-6.85,2.83,1.95),
    (-5.35,3.35,-.15),(-4.05,3.35,-.15)],[(0,1,5,4),(1,2,5),(2,3,4,5),(3,0,4)],roof)
# Deep eaves with substantial seams, not coplanar thin overlay rectangles.
for x in (-6.62,-6.12,-5.62,-5.12,-4.62,-4.12,-3.62,-3.12,-2.78):
    xr=max(-5.35,min(-4.05,x));beam('Raised roof standing seam',[x,2.85,1.95],[xr,3.37,-.15],.035,roof)
for x in (-6.17,-3.23):
    for z in (-1.45,1.15):box('Corner post',[x,1.48,z],[.14,2.15,.14],wood)

# Pointed palisade. The 2.8m gateway remains genuinely open.
def picket(x,z,top=2.15,base=None):
    y=h(x,z) if base is None else base;w=.18;d=.07
    pts=[(x-w/2,y,z-d),(x+w/2,y,z-d),(x+w/2,top-.23,z-d),(x,top,z-d),(x-w/2,top-.23,z-d)]
    pts+= [(a,b,z+d) for a,b,_ in pts]
    ob=mesh('Pointed timber pale',pts,[(0,4,3,2,1),(5,6,7,8,9),(0,1,6,5),(1,2,7,6),(2,3,8,7),(3,4,9,8),(4,0,5,9)],paint if int((x+10)*100)%3 else paint2)
    if base is None:contacts.extend([world((x-w/2,h(x-w/2,z-d),z-d)),world((x+w/2,h(x+w/2,z+d),z+d))])
    return ob
for a,b in [(-7,-6.4),(-3.0,-1.4),(1.4,7)]:
    n=max(2,round((b-a)/.235))
    for i in range(n):picket(a+(b-a)*(i+.5)/n,.84)
    for y in (.60,1.53):box('Fence crossrail',[(a+b)/2,y,.70],[b-a,.13,.13],wood)
    for x in (a,b):grounded('Fence square post',x,.75,.21,.21,2.23,wood)
# One braced gate leaf is parked open away from the clear lane.
hinge=Vector((1.4,0,.78));end=hinge+Vector((.36,0,-1.26))
for y in (.48,1.45):beam('Open gate rail',hinge+Vector((0,y,0)),end+Vector((0,y,0)),.12,dark)
beam('Open gate diagonal',hinge+Vector((0,.48,0)),end+Vector((0,1.45,0)),.11,wood)
for i in range(8):
    p=hinge.lerp(end,i/7);beam('Open gate board',p+Vector((0,.14,0)),p+Vector((0,1.77,0)),.105,paint)

# Attendant supplies the scale and the human destination visible in PH76865.
ax,az=-2.55,1.38;ay=h(ax,az)
for dx in (-.13,.13):
    grounded('Attendant boot sole',ax+dx,az,.18,.34,ay+.12,boot)
    beam('Attendant trouser leg',[ax+dx,ay+.12,az],[ax+dx,ay+.85,az],.19,coat)
box('Attendant long coat',[ax,ay+1.06,az],[.51,.69,.29],coat)
for side in (-1,1):
    beam('Attendant coat sleeve',[ax+side*.24,ay+1.30,az],[ax+side*.30,ay+.94,az+.07],.16,coat)
    box('Attendant hand',[ax+side*.30,ay+.90,az+.07],[.12,.15,.11],skin)
box('Attendant neck',[ax,ay+1.44,az],[.12,.12,.12],skin)
bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=6,radius=1,location=vec([ax,ay+1.62,az]))
head=bpy.context.object;head.name='Attendant head';head.scale=(.125,.115,.17);head.data.materials.append(skin)
box('Attendant cap',[ax,ay+1.79,az],[.28,.09,.25],coat)
box('Attendant cap visor',[ax,ay+1.765,az+.12],[.25,.035,.16],boot)

bpy.context.view_layer.update()
model=OUT/'model/paris-photo-entrance.glb';blend=OUT/'blender/paris-photo-entrance.blend'
bpy.ops.object.select_all(action='DESELECT')
for obj in scene.objects:obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(model),export_format='GLB',use_selection=True,use_active_scene=True,
    export_extras=True,export_yup=True,export_animations=False,export_lights=False,export_cameras=False)
bpy.data.libraries.write(str(blend),{scene},fake_user=True)
manifest={'source':'Paris Musées / Musée Carnavalet PH76865, Hippolyte Blancard, 1889',
    'referenceUrl':'https://www.parismuseescollections.paris.fr/fr/musee-carnavalet/oeuvres/exposition-universelle-de-1889-petite-entree-de-l-exposition-avec-gardien',
    'interpretations':['Dimensions, colours, hidden faces, attendant details and placement; not photogrammetry.'],
    'center':terrain['center'],'yaw':terrain['yaw'],'worldBaked':True,'groundContacts':contacts,
    'objects':len(scene.objects),'scene':scene.name,'model':str(model),'blend':str(blend)}
(OUT/'entrance/model.json').write_text(json.dumps(manifest,indent=2)+'\n')
result=manifest
