"""Original Paris setting and articulated period life; execute through Blender MCP.

Metres, authored Y-up converted to Blender Z-up. City plan is a compressed
interpretation, not a survey. No downloaded geometry. Existing scenes survive.
"""
import bpy, json, math, random
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts/paris-1889-2026-09-07/blender'
MODEL = ROOT / 'public/models/paris-1889'
OUT.mkdir(parents=True, exist_ok=True)
MODEL.mkdir(parents=True, exist_ok=True)
scene = bpy.data.scenes.new('WonderForge Paris 1889 — city and street life')
bpy.context.window.scene = scene
city = bpy.data.collections.new('PARIS — courtyard streets')
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

def terrain(x,z):
    champ=math.exp(-(x*x+(z-20)**2)/(2*140**2))*-.35
    relief=champ+max(0,(-z-90)/80)*-1.8+math.exp(-(x*x+(z-280)**2)/(2*90**2))*6.5+math.exp(-(x*x+(z+240)**2)/(2*70**2))*14+math.exp(-((x-150)**2+(z-40)**2)/(2*50**2))*1.4
    edge=max(abs(x),abs(z));blend=max(0,min(1,(edge-66)/20));prepared=relief*blend*blend*(3-2*blend)
    shore=max(0,min(1,(abs(math.sin(.08)*x+math.cos(.08)*(z+175))-54)/18));shore=shore*shore*(3-2*shore)
    return -3.6*(1-shore)+prepared*shore

class Batch:
    def __init__(self):self.data={}
    def poly(self,key,verts,faces):
        vv,ff=self.data.setdefault(key,([],[]));n=len(vv)
        vv.extend(verts);ff.extend([tuple(n+i for i in face) for face in faces])
    def box(self,key,c,s):
        x,y,z=c;a,b,d=[v/2 for v in s]
        self.poly(key,[(x-a,y-b,z-d),(x+a,y-b,z-d),(x+a,y+b,z-d),(x-a,y+b,z-d),(x-a,y-b,z+d),(x+a,y-b,z+d),(x+a,y+b,z+d),(x-a,y+b,z+d)],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(0,4,7,3),(1,2,6,5)])
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
            o=bpy.data.objects.new(name+'-'+key,mesh);collection.objects.link(o);o.parent=parent
            o['wf_material']=key;o['wf_paris']=True;result.append(o)
        return result

def empty(name,collection,parent=None,p=(0,0,0)):
    o=bpy.data.objects.new(name,None);collection.objects.link(o);o.parent=parent;o.location=(p[0],-p[2],p[1]);return o

static=Batch();blocks=[]
def building(cx,cz,w,d,h,tone,detail=True):
    corners=[terrain(cx+sx*w/2,cz+sz*d/2) for sx in (-1,1) for sz in (-1,1)]
    floor=max(corners)+.24;bottom=min(corners)-.3
    static.box('stone-warm',(cx,(floor+bottom)/2,cz),(w+.6,floor-bottom,d+.6))
    static.box(tone,(cx,floor+h/2,cz),(w,h,d))
    static.box('stone-light',(cx,floor+3.6,cz),(w+.4,.28,d+.4))
    static.box('stone-light',(cx,floor+h+.12,cz),(w+.8,.34,d+.8))
    # Four sloped zinc faces, with a shallow upper roof. No corner turrets.
    hh=floor+h+.3;roofH=3.5;inset=1.9
    static.poly('zinc',[(cx-w/2,hh,cz-d/2),(cx+w/2,hh,cz-d/2),(cx+w/2,hh,cz+d/2),(cx-w/2,hh,cz+d/2),(cx-w/2+inset,hh+roofH,cz-d/2+inset),(cx+w/2-inset,hh+roofH,cz-d/2+inset),(cx+w/2-inset,hh+roofH,cz+d/2-inset),(cx-w/2+inset,hh+roofH,cz+d/2-inset)],[(4,5,1,0),(5,6,2,1),(6,7,3,2),(7,4,0,3),(7,6,5,4)])
    for xx in (-.3,.3):
        static.box('brick',(cx+xx*w,hh+roofH+1.0,cz),(1.25,2.0,.72))
        static.box('stone-light',(cx+xx*w,hh+roofH+2.04,cz),(1.5,.18,.94))
    floors=max(4,round((h-3.8)/3.15)) if detail else 3;spacing=(h-4)/floors
    for axis,extent,depth in [('z',w,d),('x',d,w)]:
        bays=max(2,round(extent/(4.1 if detail else 6.5)))
        for sign in (-1,1):
            for i in range(bays):
                along=(i+.5)/bays*extent-extent/2
                x=cx+along if axis=='z' else cx+sign*(w/2+.12)
                z=cz+sign*(d/2+.12) if axis=='z' else cz+along
                for f in range(floors):
                    y=floor+4.7+f*spacing
                    static.panel('glass',(x,y,z),1.35,2.05,axis,sign)
                    if detail and (f==0 or f==floors-1):
                        # Thin limestone lintels/sills and continuous iron balcony rails.
                        size=(1.65,.12,.25) if axis=='z' else (.25,.12,1.65)
                        static.panel('stone-light',(x,y-1.08,z+sign*.012 if axis=='z' else z),1.65,.14,axis,sign)
                # Ground level shop glazing, cream fascia and modest canvas awning.
                static.panel('glass',(x,floor+1.6,z),2.4,2.65,axis,sign)
                if detail and i%3==1:
                    size=(2.9,.14,1.2) if axis=='z' else (1.2,.14,2.9)
                    static.box('awning',(x+(sign*.45 if axis=='x' else 0),floor+3.05,z+(sign*.45 if axis=='z' else 0)),size)
                if detail and i%4==0:
                    # Dormer cheeks, dark inset glazing and zinc cap.
                    dx=x-(sign*.6 if axis=='x' else 0);dz=z-(sign*.6 if axis=='z' else 0)
                    ds=(1.65,1.7,1.0) if axis=='z' else (1.0,1.7,1.65)
                    static.box('stone-light',(dx,hh+1.05,dz),ds)
                    static.panel('glass',(dx+(sign*.56 if axis=='x' else 0),hh+1.07,dz+(sign*.56 if axis=='z' else 0)),1.07,1.3,axis,sign)
                    static.box('slate',(dx,hh+1.99,dz),(ds[0]+.2,.18,ds[2]+.2))
            if detail:
                for fy in [floor+4.05, floor+4.05+(floors-1)*spacing]:
                    a=(cx-extent/2,fy,cz+sign*(d/2+.5)) if axis=='z' else (cx+sign*(w/2+.5),fy,cz-extent/2)
                    b=(cx+extent/2,fy,cz+sign*(d/2+.5)) if axis=='z' else (cx+sign*(w/2+.5),fy,cz+extent/2)
                    mid=tuple((a[j]+b[j])/2 for j in range(3))
                    for dy in (0,.8):static.panel('iron',(mid[0],fy+dy,mid[2]),extent,.075,axis,sign)
                    for k in range(0,int(extent),2):
                        u=k/extent;p=tuple(a[j]+(b[j]-a[j])*u for j in range(3));static.panel('iron',(p[0],fy+.4,p[2]),.055,.8,axis,sign)

for side in (-1,1):
    for col in range(4):
        for row in range(5):
            x=side*(242+104*col);z=40+104*row
            tone=['stone','stone-light','stone-warm'][(col+row+(side==1))%3]
            h=19.8+((col*7+row*3)%4)*1.1;near=col<2 and row<3
            # Four full wings surround an open 58 by 46 m court.
            building(x,z-29,82,12,h,tone,near)
            building(x,z+29,82,12,h-1.0,tone,near)
            building(x-35,z,12,46,h-.5,tone,near)
            building(x+35,z,12,46,h-.5,tone,near)
            blocks.append({'id':f'block-{side}-{col}-{row}','center':[x,z],'bounds':[x-41,z-35,x+41,z+35],'courtyard':[x-29,z-23,x+29,z+23]})

# Sparse lower-detail opposite bank forms a skyline behind the 1878 Palais.
for side in (-1,1):
    for col in range(4):
        x=side*(242+104*col);z=-345
        building(x,z-23,82,12,20+col%3,'stone',False)
        building(x-35,z+5,12,44,19+col%3,'stone-warm',False)
        building(x+35,z+5,12,44,20+col%2,'stone-light',False)

def strip(x1,z1,x2,z2,width,key,lift):
    length=math.hypot(x2-x1,z2-z1);nx=-(z2-z1)/length*width/2;nz=(x2-x1)/length*width/2
    n=math.ceil(length/4)
    for i in range(n):
        ax=x1+(x2-x1)*i/n;az=z1+(z2-z1)*i/n;bx=x1+(x2-x1)*(i+1)/n;bz=z1+(z2-z1)*(i+1)/n
        p=[(ax+nx,az+nz),(ax-nx,az-nz),(bx-nx,bz-nz),(bx+nx,bz+nz)]
        static.poly(key,[(x,terrain(x,z)+lift,z) for x,z in p],[(3,2,1,0)])

for side in (-1,1):
    for col in range(5):
        x=side*(190+104*col)
        strip(x,-24,x,520,14,'road',.08)
        for offset in (-8.5,8.5):
            for row in range(5):strip(x+offset,-5+104*row,x+offset,85+104*row,3,'paving',.24)
    for row in range(6):
        z=-12+104*row;strip(side*178,z,side*618,z,14,'road',.08)
        for offset in (-8.5,8.5):
            for col in range(4):strip(side*(197+104*col),z+offset,side*(287+104*col),z+offset,3,'paving',.24)
    # Gas lamp standards placed outside intersections and aligned to sidewalks.
    for z in range(28,490,52):
        x=side*181.5;y=terrain(x,z)+.24
        static.cylinder('iron',(x,y+1.9,z),.08,3.8,n=6)
        static.box('cream',(x,y+4.1,z),(.45,.55,.45))
        static.box('iron',(x,y+4.43,z),(.6,.12,.6))

city_objects=static.finish('Paris streets and courtyard architecture',city)

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
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'paris-1889.blend'))
triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in city_objects)
actor_stats={root.name:sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in root.children_recursive if o.type=='MESH') for root in actors}
manifest={'version':1,'coordinates':'metres, Y up, +Z forward','cityTriangles':triangles,'blocks':blocks,'actors':actor_stats,'roadLift':.08,'sidewalkLift':.24,'wheelRadius':.63,'boatWaterline':0,'sources':['https://gallica.bnf.fr/accueil/fr/html/lexposition-universelle-de-1867-la-bibliotheque-imperiale?mode=desktop','https://www.peugeot.es/marca/universo-peugeot/historia-y-cultura.html'],'interpretation':'Original compressed Haussmann-inspired setting; not a surveyed 1889 street reconstruction.'}
(MODEL/'paris.manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
(OUT/'build-summary.json').write_text(json.dumps(manifest,indent=2)+'\n')
result={'scene':scene.name,'blend':str(OUT/'paris-1889.blend'),'cityTriangles':triangles,'actors':actor_stats,'cityBytes':(MODEL/'paris-city.glb').stat().st_size,'lifeBytes':(MODEL/'paris-life.glb').stat().st_size}
print(json.dumps(result))
