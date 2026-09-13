"""Original Paris setting and articulated period life; execute through Blender MCP.

Metres, authored Y-up converted to Blender Z-up. City plan is a compressed
interpretation, not a survey. No downloaded geometry. Existing scenes survive.
"""
import bpy, json, math, random
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(globals().get('WF_PARIS_OUTPUT', ROOT / 'artifacts/paris-exposition-2026-09-07/blender'))
SITE_LAYOUT = json.loads((ROOT / 'src/data/eiffelSiteLayout.json').read_text())
MODEL = Path(globals().get('WF_PARIS_MODEL_OUTPUT', ROOT / 'public/models/paris-1889'))
OUT.mkdir(parents=True, exist_ok=True)
MODEL.mkdir(parents=True, exist_ok=True)
scene = bpy.data.scenes.new('WonderForge Paris 1889 — photograph-led Exposition')
bpy.context.window.scene = scene
city = bpy.data.collections.new('PARIS — Exposition palaces and varied streets')
life = bpy.data.collections.new('PARIS — articulated period life')
scene.collection.children.link(city)
scene.collection.children.link(life)
rng = random.Random(1889)
materials = {}
palette = {
    'stone': ('c9beaa', .88), 'stone-light': ('e0d5c1', .9),
    'stone-warm': ('baaa91', .94), 'zinc': ('555c60', .68),
    'slate': ('434b53', .78), 'iron': ('262e2d', .65),
    'glass': ('2b404b', .38), 'timber': ('775234', .95),
    'brick': ('8d5540', .96), 'road': ('8b8273', 1),
    'paving': ('c2b9a6', .97), 'awning': ('657466', .94),
    'cloth': ('384353', .96), 'burgundy': ('684137', .94),
    'skin': ('bd8c68', .9), 'horse': ('624432', .98),
    'cream': ('c5bca6', .94), 'hull': ('303e39', .86),
    'gilt': ('b49a56', .65), 'copper': ('657f7d', .78),
    'leaf': ('496641', .95), 'leaf-light': ('72804d', .98),
    'hedge': ('3b583e', .99), 'flower': ('b67867', .94),
    'ochre': ('b89a64', .94), 'red-awning': ('965444', .94),
    'blue-awning': ('526e80', .94), 'white': ('e1dac8', .96),
    'work-earth': ('95836a', 1),
    'courtyard-earth': ('95836a', 1),
}
for key,(hexcol,rough) in palette.items():
    # Hex palette is sRGB; Blender shader expects linear colour.
    rgb=[int(hexcol[i:i+2],16)/255 for i in (0,2,4)]
    rgb=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb]
    m=bpy.data.materials.new('paris-'+key);m.diffuse_color=(*rgb,1);m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*rgb,1)
    bs.inputs['Roughness'].default_value=rough
    if key in ('zinc','iron'): bs.inputs['Metallic'].default_value=.25
    materials[key]=m

# Original generated texture, not historical evidence. Keep it packed so the
# editable Blender source and exported GLB own the same facade appearance.
facade_image=bpy.data.images.load(str(ROOT/'public/models/paris-1889/textures/paris-frontages-v2.png'),check_existing=True)
facade_image.colorspace_settings.name='sRGB';facade_image.pack()
facade_material=bpy.data.materials.new('paris-masonry-facade');facade_material.use_nodes=True
facade_material.diffuse_color=(1,1,1,1)
bs=facade_material.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.88
tex=facade_material.node_tree.nodes.new('ShaderNodeTexImage');tex.image=facade_image
tex.interpolation='Linear';tex.extension='REPEAT'
facade_material.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
materials['masonry-facade']=facade_material

def terrain(x,z):
    champ=math.exp(-(x*x+(z-20)**2)/(2*140**2))*-.35
    relief=champ+max(0,(-z-90)/80)*-1.8+math.exp(-(x*x+(z-280)**2)/(2*90**2))*6.5+math.exp(-(x*x+(z+240)**2)/(2*70**2))*14+math.exp(-((x-150)**2+(z-40)**2)/(2*50**2))*1.4
    edge=max(abs(x),abs(z));blend=max(0,min(1,(edge-66)/20));prepared=relief*blend*blend*(3-2*blend)
    shore=max(0,min(1,(abs(math.sin(.08)*x+math.cos(.08)*(z+175))-54)/18));shore=shore*shore*(3-2*shore)
    return -3.6*(1-shore)+prepared*shore

class Batch:
    def __init__(self):self.data={};self.uvs={}
    def poly(self,key,verts,faces,uv=None):
        vv,ff=self.data.setdefault(key,([],[]));n=len(vv)
        vv.extend(verts);ff.extend([tuple(n+i for i in face) for face in faces])
        self.uvs.setdefault(key,[]).extend([[uv[i] for i in face] if uv else None for face in faces])
    def box(self,key,c,s):
        x,y,z=c;a,b,d=[v/2 for v in s]
        self.poly(key,[(x-a,y-b,z-d),(x+a,y-b,z-d),(x+a,y+b,z-d),(x-a,y+b,z-d),(x-a,y-b,z+d),(x+a,y-b,z+d),(x+a,y+b,z+d),(x-a,y+b,z+d)],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(0,4,7,3),(1,2,6,5)])
    def facade_box(self,c,s,floor,eave,tone,variant=0):
        # Same six rigid box faces: UV-mapped walls, ordinary top and bottom.
        x,y,z=c;a,b,d=[v/2 for v in s]
        verts=[(x-a,y-b,z-d),(x+a,y-b,z-d),(x+a,y+b,z-d),(x-a,y+b,z-d),(x-a,y-b,z+d),(x+a,y-b,z+d),(x+a,y+b,z+d),(x-a,y+b,z+d)]
        for face,axis,sign in [((0,3,2,1),0,-1),((4,5,6,7),0,1),((0,4,7,3),2,-1),((1,2,6,5),2,1)]:
            span=s[axis];repeats=max(1,round(span/11.4));lo=c[axis]-span/2
            # Each repeat has three bays; complete repeats avoid sliced doors
            # at corners. GLTF stores this UV plus a normal repeat sampler.
            uv=[((variant%4+(p[axis]-lo)/span*repeats*sign)/4,(p[1]-floor)/(eave-floor)) for p in verts]
            self.poly('masonry-facade',verts,[face],uv)
        self.poly(tone,verts,[(0,1,5,4),(3,7,6,2)])
    def panel(self,key,c,w,h,axis='z',sign=1):
        x,y,z=c
        v=[(x-w/2,y-h/2,z),(x+w/2,y-h/2,z),(x+w/2,y+h/2,z),(x-w/2,y+h/2,z)] if axis=='z' else [(x,y-h/2,z+w/2),(x,y-h/2,z-w/2),(x,y+h/2,z-w/2),(x,y+h/2,z+w/2)]
        self.poly(key,v,[(0,1,2,3) if sign>0 else (3,2,1,0)])
    def beam(self,key,a,b,r=.04):
        av,bv=Vector(a),Vector(b);d=(bv-av).normalized();u=d.cross(Vector((0,1,0)))
        if u.length<.01:u=d.cross(Vector((1,0,0)))
        u.normalize();v=d.cross(u).normalized();verts=[]
        for p in (av,bv):
            for i,j in [(-1,-1),(1,-1),(1,1),(-1,1)]:verts.append(tuple(p+u*i*r+v*j*r))
        self.poly(key,verts,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)])
    def cylinder(self,key,c,r,length,axis='y',n=10,r2=None):
        verts=[];r2=r if r2 is None else r2
        for end,rad in [(-1,r),(1,r2)]:
            for i in range(n):
                a=i*math.tau/n;p=[rad*math.cos(a),end*length/2,rad*math.sin(a)]
                if axis=='x':p=[p[1],p[0],p[2]]
                verts.append(tuple(c[j]+p[j] for j in range(3)))
        faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
        self.poly(key,verts,faces if axis=='x' else [tuple(reversed(f)) for f in faces])
    def finish(self,name,collection,parent=None,pivot=(0,0,0)):
        result=[]
        for key,(vv,ff) in self.data.items():
            mesh=bpy.data.meshes.new(name+'-'+key)
            mesh.from_pydata([(x-pivot[0],-(z-pivot[2]),y-pivot[1]) for x,y,z in vv],[],ff)
            mesh.materials.append(materials[key]);mesh.update()
            if key in ('road','paving','work-earth','courtyard-earth'):
                # Blender's Float32 polygon-normal calculation can collapse
                # boolean-intersection dust at kilometre-scale coordinates.
                # Remove only proven near-zero-area bad faces, never visible land.
                bad=[p for p in mesh.polygons if p.normal.z<=.94]
                if bad:
                    if any(p.area>.001 for p in bad):raise ValueError('Nontrivial ground face has an invalid upward normal')
                    keep=[tuple(p.vertices) for p in mesh.polygons if p.normal.z>.94]
                    coords=[tuple(v.co) for v in mesh.vertices]
                    mesh.clear_geometry();mesh.from_pydata(coords,[],keep);mesh.update()
                    if any(p.normal.z<=.94 for p in mesh.polygons):raise ValueError('Ground dust cleanup failed')
            if any(uv is not None for uv in self.uvs[key]):
                layer=mesh.uv_layers.new(name='FacadeUV')
                for polygon,uv in zip(mesh.polygons,self.uvs[key]):
                    for loop,value in zip(polygon.loop_indices,uv or [(0,0)]*len(polygon.loop_indices)):
                        layer.data[loop].uv=value
            o=bpy.data.objects.new(name+'-'+key,mesh);collection.objects.link(o);o.parent=parent
            o['wf_material']=key;o['wf_paris']=True;result.append(o)
        return result

def empty(name,collection,parent=None,p=(0,0,0)):
    o=bpy.data.objects.new(name,None);collection.objects.link(o);o.parent=parent;o.location=(p[0],-p[2],p[1]);return o

static=Batch();blocks=[]
def building(cx,cz,w,d,h,tone,detail=True,variant=0):
    corners=[terrain(cx+sx*w/2,cz+sz*d/2) for sx in (-1,1) for sz in (-1,1)]
    floor=max(corners)+.24;bottom=min(corners)-.3
    static.box('stone-warm',(cx,(floor+bottom)/2,cz),(w+.6,floor-bottom,d+.6))
    static.facade_box((cx,floor+h/2,cz),(w,h,d),floor,floor+h,tone,variant)
    static.box('stone-light',(cx,floor+h*.325,cz),(w+.4,.20,d+.4))
    static.box('stone-light',(cx,floor+h+.12,cz),(w+.8,.34,d+.8))
    # Four sloped zinc faces, with a shallow upper roof. No corner turrets.
    hh=floor+h+.3;roofH=[3.5,4.2,2.5,5.0][variant%4];inset=min(w,d)*[.16,.30,.12,.42][variant%4]
    static.poly(['zinc','slate','zinc','slate'][variant%4],[(cx-w/2,hh,cz-d/2),(cx+w/2,hh,cz-d/2),(cx+w/2,hh,cz+d/2),(cx-w/2,hh,cz+d/2),(cx-w/2+inset,hh+roofH,cz-d/2+inset),(cx+w/2-inset,hh+roofH,cz-d/2+inset),(cx+w/2-inset,hh+roofH,cz+d/2-inset),(cx-w/2+inset,hh+roofH,cz+d/2-inset)],[(4,5,1,0),(5,6,2,1),(6,7,3,2),(7,4,0,3),(7,6,5,4)])
    for xx in ((-.3,.3) if w>25 else (0,)):
        static.box('brick',(cx+xx*w,hh+roofH+1.0,cz),(1.25,2.0,.72))
        static.box('stone-light',(cx+xx*w,hh+roofH+2.04,cz),(1.5,.18,.94))
    # Openings/ironwork are in the shared atlas. Broad canvas awnings and
    # near roof dormers remain geometry; no second window grid floats above it.
    if detail:
        for sign in (-1,1):
            bays=max(1,round(w/11.4))
            for i in range(bays):
                x=cx+(i+.5)/bays*w-w/2;z=cz+sign*(d/2+.4)
                if (i+variant)%3==0:
                    static.box(['awning','red-awning','blue-awning'][variant%3],(x,floor+h*.31,z),(min(3.0,w/bays*.7),.12,1.0))
                if (i+variant)%2==0:
                    dz=cz+sign*(d/2-.65)
                    static.box('stone-light',(x,hh+.92,dz),(1.55,1.55,.94))
                    static.panel('glass',(x,hh+.94,dz+sign*.49),1.02,1.15,'z',sign)
                    static.box('slate',(x,hh+1.77,dz),(1.75,.15,1.14))

exec(compile((ROOT/'scripts/paris_south_bank_geometry.py').read_text(),str(ROOT/'scripts/paris_south_bank_geometry.py'),'exec'),globals())
# Opposite-bank fragments retain skyline depth without repeating a complete block.
for side in (-1,1):
    for col in range(4):
        x=side*(242+104*col)
        for k in range(3):building(x-30+k*28,-345+6*(k%2),28,18,14+(col+k)%5*1.1,['stone','stone-warm','stone-light'][k],False,col+k)

# River-facing attached houses fill the bare band ahead of the north-bank grid.
# Their alignment follows the rotated Seine, outside the Palais grounds and
# river bank. Compressed authored frontage, not identified cadastral buildings.
riverfront_buildings=[]
for side in (-1,1):
    for col in range(4):
        for k in range(3):
            cx=side*(242+104*col)-28+k*28
            cz=-175+(-92-math.sin(.08)*cx)/math.cos(.08)
            h=13.5+((col*3+k+(side+1))%6)*.85;variant=(col+k+(side+1))%4
            building(cx,cz,27.4,13.5,h,'stone',False,variant)
            riverfront_buildings.append({'center':[cx,cz],'size':[27.4,13.5,h],'bounds':[cx-13.7,cz-6.75,cx+13.7,cz+6.75],'facadeAtlasStart':variant,'riverDistance':92})

def strip(x1,z1,x2,z2,width,key,lift,step=4):
    length=math.hypot(x2-x1,z2-z1);nx=-(z2-z1)/length*width/2;nz=(x2-x1)/length*width/2
    n=math.ceil(length/step)
    for i in range(n):
        ax=x1+(x2-x1)*i/n;az=z1+(z2-z1)*i/n;bx=x1+(x2-x1)*(i+1)/n;bz=z1+(z2-z1)*(i+1)/n
        p=[(ax+nx,az+nz),(ax-nx,az-nz),(bx-nx,bz-nz),(bx+nx,bz+nz)]
        static.poly(key,[(x,terrain(x,z)+lift,z) for x,z in p],[(3,2,1,0)])

exec(compile((ROOT/'scripts/paris_south_bank_streets.py').read_text(),str(ROOT/'scripts/paris_south_bank_streets.py'),'exec'),globals())
for side in (-1,1):
    # Gas lamp standards placed outside intersections and aligned to sidewalks.
    for z in range(28,490,52):
        x=side*181.5;y=terrain(x,z)+.24
        static.cylinder('iron',(x,y+1.9,z),.08,3.8,n=6)
        static.box('cream',(x,y+4.1,z),(.45,.55,.45))
        static.box('iron',(x,y+4.43,z),(.6,.12,.6))

exec(compile((ROOT/'scripts/paris_exposition_geometry.py').read_text(),str(ROOT/'scripts/paris_exposition_geometry.py'),'exec'),globals())
exec(compile((ROOT/'scripts/paris_workyard_geometry.py').read_text(),str(ROOT/'scripts/paris_workyard_geometry.py'),'exec'),globals())
city_objects=static.finish('Paris Exposition architecture and streets',city)
exec(compile((ROOT/'scripts/paris_roof_detail_geometry.py').read_text(),str(ROOT/'scripts/paris_roof_detail_geometry.py'),'exec'),globals())
city_objects.extend(roof_detail_objects)

# Local articulated prototypes. Skin, clothing, wheels and hooves are geometry,
# not billboard illustrations. Small parts are merged by material under pivots.
actors=[]
def human(kind):
    root=empty(kind,life);actors.append(root);body=Batch();female=kind.endswith('woman')
    body.box('burgundy' if female else 'cloth',(0,1.19,0),(.42,.53,.23))
    body.cylinder('skin',(0,1.61,0),.115,.23,n=10)
    body.cylinder('iron',(0,1.76,0),.18,.045,n=10)
    body.cylinder('burgundy' if female else 'iron',(0,1.81,0),.12,.1,n=10)
    body.finish('body',life,root)
    for sign in (-1,1):
        pivot=(sign*.11,.91,0);joint=empty('leg-'+('left' if sign<0 else 'right'),life,root,pivot);b=Batch()
        b.box('burgundy' if female else 'cloth',(pivot[0],.48,0),(.16,.8,.18));b.box('iron',(pivot[0],.065,.065),(.19,.13,.32));b.finish('leg',life,joint,pivot)
        pivot=(sign*.25,1.4,0);joint=empty('arm-'+('left' if sign<0 else 'right'),life,root,pivot);b=Batch()
        b.box('burgundy' if female else 'cloth',(pivot[0],1.16,0),(.12,.44,.15));b.box('skin',(pivot[0],.9,.015),(.105,.13,.105));b.finish('arm',life,joint,pivot)
    if female:
        # Two separated skirt panels follow the legs, leaving a visible walking slit.
        for child in list(root.children):
            if child.name.startswith('leg-'):
                b=Batch();px=child.location.x
                b.cylinder('burgundy',(px,.62,0),.16,.57,n=6,r2=.105);b.finish('skirt',life,child,(px,.91,0))
    return root

human('pedestrian-man');human('pedestrian-woman')
horse=empty('horse',life);actors.append(horse);b=Batch()
b.box('horse',(0,1.25,0),(.55,.6,1.5))
b.beam('horse',(0,1.4,.57),(0,1.98,.96),.23)
b.box('horse',(0,1.95,1.15),(.34,.33,.6))
for side in (-1,1):
    b.box('horse',(side*.13,2.18,1.05),(.07,.25,.13))
    b.box('iron',(side*.185,2.0,1.29),(.025,.045,.045))
    b.beam('iron',(side*.30,1.35,.35),(side*.23,1.35,-.75),.035)
b.beam('iron',(0,1.5,-.73),(0,.78,-1.14),.07)
b.finish('body',life,horse)
for sx in (-1,1):
    for sz in (-1,1):
        pivot=(sx*.2,1.15,sz*.53);joint=empty(f'leg-{sx}-{sz}',life,horse,pivot);b=Batch()
        b.beam('horse',(pivot[0],1.15,pivot[2]),(pivot[0],.22,pivot[2]+.07),.065)
        b.box('iron',(pivot[0],.09,pivot[2]+.095),(.18,.18,.25));b.finish('leg',life,joint,pivot)

def vehicle(kind):
    root=empty(kind,life);actors.append(root);b=Batch();carriage=kind=='carriage'
    b.box('timber',(0,.91,0),(1.7,.18,3.25))
    for side in (-1,1):
        b.box('burgundy' if carriage else 'timber',(side*.81,1.35,0),(.14,.75,3.1))
        b.beam('timber',(side*.53,.9,1.2),(side*.53,1.0,4.3),.05)
    b.box('timber',(0,1.35,-1.5),(1.6,.7,.13))
    b.box('timber',(0,1.5,1.0),(1.5,.16,.5))
    if carriage:
        for sx in (-1,1):
            for sz in (-1,1):b.beam('iron',(sx*.7,1.6,sz*1.13),(sx*.7,2.3,sz*1.13),.04)
        b.box('cloth',(0,2.33,0),(1.75,.17,2.7))
        for z in (-.8,.2):b.box('burgundy',(0,1.22,z),(1.42,.15,.48))
    else:
        for x in (-.45,0,.45):b.box('stone-warm',(x,1.3,-.3),(.4,.55,1.0))
    # A seated driver with torso/head/arms and supported boots.
    b.box('cloth',(0,1.86,1.05),(.43,.53,.23));b.cylinder('skin',(0,2.22,1.05),.115,.23,n=8)
    b.cylinder('iron',(0,2.38,1.05),.17,.05,n=8)
    for sx in (-1,1):
        b.beam('cloth',(sx*.12,1.62,1.0),(sx*.12,1.62,1.42),.09)
        b.beam('cloth',(sx*.12,1.62,1.42),(sx*.12,1.06,1.47),.08)
        b.box('iron',(sx*.12,1.02,1.53),(.2,.13,.3))
        b.beam('cloth',(sx*.25,2.02,1.02),(sx*.2,1.9,1.48),.065)
        b.beam('iron',(sx*.2,1.9,1.48),(sx*.18,1.75,4.18),.015)
    for z in (-1.12,1.12):b.beam('iron',(-1.0,.63,z),(1.0,.63,z),.075)
    b.finish('body',life,root)
    for sx in (-1,1):
        for sz in (-1,1):
            pivot=(sx*.98,.63,sz*1.12);wheel=empty(f'wheel-{sx}-{sz}',life,root,pivot);wb=Batch()
            # Annular rim, hollow centre, twelve individual spokes.
            n=16;verts=[]
            for xx in (-.055,.055):
                for radius in (.63,.56):
                    for i in range(n):a=i*math.tau/n;verts.append((pivot[0]+xx,pivot[1]+radius*math.cos(a),pivot[2]+radius*math.sin(a)))
            faces=[]
            for i in range(n):
                j=(i+1)%n;faces.extend([(i,j,32+j,32+i),(16+j,16+i,48+i,48+j),(i,16+i,16+j,j),(32+j,48+j,48+i,32+i)])
            wb.poly('iron',verts,faces)
            for i in range(12):a=i*math.tau/12;wb.beam('timber',pivot,(pivot[0],pivot[1]+.56*math.cos(a),pivot[2]+.56*math.sin(a)),.028)
            wb.cylinder('iron',pivot,.11,.2,'x',8);wb.finish('wheel',life,wheel,pivot)
    return root

vehicle('cart');vehicle('carriage')
def boat(kind):
    root=empty(kind,life);actors.append(root);b=Batch();steam=kind=='steam-boat';length=23 if steam else 19;width=4.5 if steam else 5.1
    # Raked pointed ends, flat keel below authored waterline and gunwale above.
    ring=[(-width/2,-length/2+2),(0,-length/2),(width/2,-length/2+2),(width/2,length/2-3),(0,length/2),(-width/2,length/2-3)]
    verts=[(x*.78,-.65,z*.94) for x,z in ring]+[(x,.7,z) for x,z in ring]
    b.poly('hull',verts,[tuple(range(6)),tuple(reversed(range(6,12)))]+[(i+6,(i+1)%6+6,(i+1)%6,i) for i in range(6)])
    b.box('timber',(0,.77,0),(width-.4,.15,length-4.8))
    if steam:
        b.box('cream',(0,1.55,-.6),(3.6,1.45,12.0))
        for side in (-1,1):
            for z in range(-5,6,2):b.panel('glass',(side*1.81,1.65,z),1.35,.85,'x',side)
        b.box('cream',(0,2.34,-.6),(4.0,.15,12.6))
        b.cylinder('iron',(0,3.05,1.0),.36,1.35,n=10)
        b.cylinder('burgundy',(0,3.32,1.0),.37,.35,n=10)
        b.box('timber',(0,1.65,6.6),(2.0,1.4,1.7))
        for side in (-1,1):
            b.beam('iron',(side*1.8,1.65,-9),(side*1.8,1.65,8),.035)
            for z in range(-9,9,2):b.beam('iron',(side*1.8,.85,z),(side*1.8,1.65,z),.025)
    else:
        for z in (-5,-2,1,4):b.box('timber',(0,1.25,z),(3.7,.9,2.5))
        b.box('cream',(0,1.52,-6.6),(3.2,1.5,2.3));b.box('slate',(0,2.36,-6.6),(3.6,.18,2.6))
    b.finish('body',life,root)
boat('steam-boat');boat('barge')

def export(path,collection):
    bpy.ops.object.select_all(action='DESELECT')
    for o in collection.all_objects:o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,use_active_scene=True,export_extras=True,export_yup=True,export_apply=False)

export(MODEL/'paris-city.glb',city)
export(MODEL/'paris-life.glb',life)
# Separate asset tray from the city for an editable, readable Blender scene.
for i,root in enumerate(actors):root.location=(i*9-27,70,1)
world=bpy.data.worlds.new('Paris blue overcast studio');world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.38,.48,.6,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.65;scene.world=world
sun=bpy.data.lights.new('Paris afternoon sun','SUN');sun.energy=3;sun.angle=.08
so=bpy.data.objects.new('Paris afternoon sun',sun);scene.collection.objects.link(so);so.rotation_euler=(.5,-.4,-.6)
cam=bpy.data.cameras.new('Paris courtyard review');co=bpy.data.objects.new('Paris courtyard review',cam);scene.collection.objects.link(co)
co.location=(360,65,95);target=Vector((260,-100,10));co.rotation_euler=(target-co.location).to_track_quat('-Z','Y').to_euler();cam.type='ORTHO';cam.ortho_scale=210;scene.camera=co
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=1600;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
# Pack the unmodified historical references in the editable source, outside the
# export collection. These are reference-board images, never scenery billboards.
photo_references=[
    ('loc-1889-trocadero.jpg','https://www.loc.gov/pictures/item/92519631/','1889 albumen photograph'),
    ('carnavalet-g30823.jpg','https://www.parismuseescollections.paris.fr/fr/musee-carnavalet/oeuvres/vue-d-ensemble-des-palais-du-champs-de-mars','1889 photomechanical print, G.30823, CC0'),
]
reference_collection=bpy.data.collections.new('REFERENCES — 1889 photographs and prints')
scene.collection.children.link(reference_collection)
for i,(filename,url,kind) in enumerate(photo_references):
    path=ROOT/'artifacts/paris-photo-study-2026-09-07/references'/filename
    if not path.exists():raise FileNotFoundError(path)
    im=bpy.data.images.load(str(path),check_existing=True);im.pack()
    board=bpy.data.objects.new(kind,None);board.empty_display_type='IMAGE';board.data=im
    board.empty_display_size=150;board.location=(-1000,i*170,50);board.hide_render=True
    board['source_url']=url;board['interpretation']='Visible reference; hidden geometry and colors authored'
    reference_collection.objects.link(board)
# Additional aerial reference explains the changed north-bank roof typologies.
aerial_path=ROOT/'artifacts/paris-stability-followup-2026-09-07/references/loc-balloon-paris-large.jpg'
im=bpy.data.images.load(str(aerial_path),check_existing=True);im.pack()
board=bpy.data.objects.new('Liebert1889 balloon photograph — roofscape reference',None)
board.empty_display_type='IMAGE';board.data=im;board.empty_display_size=180
board.location=(-1000,360,50);board.hide_render=True
board['source_url']='https://www.loc.gov/item/92514593/'
board['interpretation']='Roof and court typologies only; compressed placement and hidden geometry authored'
reference_collection.objects.link(board)
photo_references.append(('loc-balloon-paris-large.jpg','https://www.loc.gov/item/92514593/','1889 albumen aerial photograph by Alphonse Liebert'))
bpy.data.libraries.write(str(OUT/'paris-1889.blend'), {scene}, fake_user=True)
triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in city_objects)
actor_stats={root.name:sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in root.children_recursive if o.type=='MESH') for root in actors}
manifest={'version':3,'southBankStreets':south_bank_streets,'southBankSurfacePieces':south_bank_surface_pieces,'siteLayout':SITE_LAYOUT,'riverfrontBuildings':riverfront_buildings,'northBankParcels':north_bank_parcels,'northBankStreets':north_bank_streets,'northBankSurfacePieces':north_bank_surface_pieces,'workyardProps':workyard_props,'buildings':building_records,'landmarks':landmarks,'plantings':plantings,'promenades':promenades,'coordinates':'metres, Y up, +Z forward','cityTriangles':triangles,'blocks':blocks,'actors':actor_stats,'roadLift':.08,'sidewalkLift':.24,'wheelRadius':.63,'boatWaterline':0,'sources':['https://cnum.cnam.fr/expo_virtuelle/expositions_universelles/1798_1900/page_cartel/cartel.php?id=Paris_1889&num=3','https://www.anno-union.com/devblog-pedestrian-zone-pack/','https://gallica.bnf.fr/accueil/fr/html/lexposition-universelle-de-1867-la-bibliotheque-imperiale?mode=desktop','https://www.peugeot.es/marca/universo-peugeot/historia-y-cultura.html'],'interpretation':'Original model interpreting CNAM 1889 Champ de Mars photograph; facade colors, hidden elevations and compressed distances authored. Anno imagery informs activity density only.'}
manifest['photoReferences']=[{'image':filename,'url':url,'type':kind} for filename,url,kind in photo_references]
manifest['southBankParcels']=south_bank_parcels
manifest['roofDetail']=roof_detail_summary
manifest['photoDetail']={'palaceEntranceCenters':[[-142,212],[142,212]],'portalArchesPerFacade':3,'drumOculiPerPalace':20,'scope':'Visible silhouettes and fenestration; authored scale and hidden elevations'}
manifest['facadeMaterial']={'file':'textures/paris-frontages-v2.png','embedded':True,'width':facade_image.size[0],'height':facade_image.size[1],'tileBays':3,'atlasFrontages':4,'storeys':4,'idealTileWidthMetres':11.4,'provenance':'Original AI-generated1880s limestone facade art asset, not a historical photograph','mapping':'Each quarter is a complete three-bay frontage; quarter-aligned UV repeats alternate styles. Ground-to-eave vertical UV, same embedded image in Blender and GLB'}
(MODEL/'paris.manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
(OUT/'build-summary.json').write_text(json.dumps(manifest,indent=2)+'\n')
result={'scene':scene.name,'blend':str(OUT/'paris-1889.blend'),'cityTriangles':triangles,'actors':actor_stats,'cityBytes':(MODEL/'paris-city.glb').stat().st_size,'lifeBytes':(MODEL/'paris-life.glb').stat().st_size}
print(json.dumps(result))
