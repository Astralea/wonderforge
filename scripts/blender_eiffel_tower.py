#!/usr/bin/env python3
"""Author WonderForge's original modular 1889 Eiffel Tower in isolated Blender.

Run: /Applications/Blender.app/Contents/MacOS/Blender --background --python
scripts/blender_eiffel_tower.py

No downloaded geometry or textures are used. Coordinates
in this source and manifest are metres, Y up; Blender receives (x, -z, y).
The saved .blend contains linked beam meshes and individually named erection
assemblies. The GLB preserves wf_part / wf_material extras on every mesh.
"""
import bpy
import json
import math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(globals().get('WF_OUT', ROOT / 'artifacts/eiffel-rebuild/blender'))
MODEL = Path(globals().get('WF_MODEL', ROOT / 'public/models/eiffel'))
OUT.mkdir(parents=True, exist_ok=True)
MODEL.mkdir(parents=True, exist_ok=True)

# MCP may run this in the live app. Preserve every existing scene and object.
scene = bpy.data.scenes.new('WonderForge Eiffel — Blender reconstruction')
bpy.context.window.scene = scene
tower = bpy.data.collections.new('EIFFEL 1889 — prefabricated erection assemblies')
scene.collection.children.link(tower)
parts = []
objects = []
current = None
materials = {}

def material(key, color, metallic, roughness):
    mat = bpy.data.materials.new('wf-' + key)
    mat.use_nodes = True
    node = mat.node_tree.nodes.get('Principled BSDF')
    node.inputs['Base Color'].default_value = (*color, 1)
    node.inputs['Metallic'].default_value = metallic
    node.inputs['Roughness'].default_value = roughness
    mat.diffuse_color = (*color, 1)
    materials[key] = mat
    return mat

material('iron', (0.31, 0.135, 0.064), 0.32, 0.57)
material('dark-iron', (0.16, 0.067, 0.034), 0.28, 0.62)
material('deck', (0.25, 0.13, 0.069), 0.50, 0.50)
material('masonry', (0.52, 0.43, 0.31), 0.0, 0.85)
material('gold', (0.56, 0.34, 0.11), 0.75, 0.31)
material('roof', (0.105, 0.095, 0.085), 0.25, 0.65)
material('window', (0.075, 0.13, 0.16), 0.18, 0.28)

def bvec(p):
    return Vector((p[0], -p[2], p[1]))

def world(p):
    return [float(p.x), float(p.z), float(-p.y)]

def lerp(a, b, t):
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))

# All beams of a material share ONE unit box mesh. Exported transforms retain
# arbitrary section/length; the web consumes the same rigid final transforms.
unit = {}
for key, mat in materials.items():
    mesh = bpy.data.meshes.new('linked-unit-beam-' + key)
    mesh.from_pydata([(-.5,-.5,-.5),(.5,-.5,-.5),(.5,.5,-.5),(-.5,.5,-.5),
                     (-.5,-.5,.5),(.5,-.5,.5),(.5,.5,.5),(-.5,.5,.5)], [],
                    [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)])
    mesh.materials.append(mat)
    mesh.update()
    unit[key] = mesh

def part(id, stage, leg, group):
    global current
    collection = bpy.data.collections.new(id)
    tower.children.link(collection)
    current = {'id': id, 'stage': stage, 'leg': leg, 'group': group,
               '_collection': collection, '_objects': []}
    parts.append(current)

def obj(name, mesh, key):
    o = bpy.data.objects.new(current['id'] + '/' + name, mesh)
    o['wf_part'] = current['id']
    o['wf_material'] = key
    current['_collection'].objects.link(o)
    current['_objects'].append(o)
    objects.append(o)
    return o

def box(name, center, size, key='iron'):
    o = obj(name, unit[key], key)
    o.location = bvec(center)
    o.scale = (size[0], size[2], size[1])
    return o

def beam(name, a, b, width=.23, depth=None, key='iron'):
    aa, bb = bvec(a), bvec(b)
    delta = bb - aa
    if delta.length < 1e-7:
        return
    o = obj(name, unit[key], key)
    o.location = (aa + bb) / 2
    o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = delta.to_track_quat('Z', 'Y')
    o.scale = (width, depth or width, delta.length)
    return o

def profile(y):
    # Measured landmark envelope; smooth lower pylons narrow into two landings.
    keys = [(4,51.5,18.5),(16,44.7,17),(30,37,14.8),(44,30.8,12.7),
            (57,26,11.7),(75,21.7,10.1),(94,17.2,8.9),(115,13.9,8.2)]
    for a,b in zip(keys,keys[1:]):
        if y <= b[0]:
            t=max(0,(y-a[0])/(b[0]-a[0]))
            return a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t
    return keys[-1][1:]

LEGS=[('ne',1,-1),('se',1,1),('sw',-1,1),('nw',-1,-1)]

def corners(y, sx, sz):
    c,w=profile(y)
    return [(sx*c+dx*w/2,y,sz*c+dz*w/2) for dx,dz in [(-1,-1),(1,-1),(1,1),(-1,1)]]

def lattice_bay(lo, hi, label, major=.52, minor=.20, fine=True):
    for k in range(4):
        j=(k+1)%4
        beam(label+'-chord'+str(k),lo[k],hi[k],major,major*.78)
        beam(label+'-top'+str(k),hi[k],hi[j],minor)
        beam(label+'-diag-a'+str(k),lo[k],hi[j],minor,minor*.65)
        beam(label+'-diag-b'+str(k),lo[j],hi[k],minor,minor*.65)
        # Fine secondary zigzags and paired chord straps give real open lace.
        if fine:
            m0,m1=lerp(lo[k],hi[k],.5),lerp(lo[j],hi[j],.5)
            beam(label+'-half'+str(k),m0,m1,minor*.43)
            for q in range(2):
                beam(label+'-lace-a'+str(k)+str(q),lerp(lo[k],hi[k],q*.5),
                     lerp(lo[j],hi[j],q*.5+.5),minor*.39)
            # Square gussets form visible dark riveted intersection plates.
            mid=lerp(lerp(lo[k],lo[j],.5),lerp(hi[k],hi[j],.5),.5)
            box(label+'-gusset'+str(k),mid,(minor*2.8,minor*2.8,minor*.7),'dark-iron')

# Four separate stone piers, aligned to the outer 125 m base envelope.
for name,sx,sz in LEGS:
    part('foundation-'+name,0,name,'foundation')
    box('stone-foot',(sx*51.5,1.15,sz*51.5),(22,2.3,22),'masonry')
    box('stone-cap',(sx*51.5,2.75,sz*51.5),(20,0.9,20),'masonry')
    box('sole-plate',(sx*51.5,3.60,sz*51.5),(18.8,.8,18.8),'dark-iron')

# 36 lower and 36 middle pylon assemblies. Each is a rigid final-size truss.
lower=[4,10,16,22,28,34,40,46,52,57]
middle=[57.94,65.4,71.6,77.8,84,90.2,96.4,102.6,108.8,115]
for heights,section,base_stage in [(lower,'lower',1),(middle,'middle',24)]:
    for i,(a,b) in enumerate(zip(heights,heights[1:])):
        for name,sx,sz in LEGS:
            part(f'{section}-{name}-{i:02}',base_stage+i,name,'leg')
            lattice_bay(corners(a,sx,sz),corners(b,sx,sz),section,
                        .64 if section=='lower' else .46,
                        .27 if section=='lower' else .21)
            if i==0:
                cs=corners(a,sx,sz)
                for k in range(4): beam('base-tie'+str(k),cs[k],cs[(k+1)%4],.32)

# Sauvestre's four monumental arches: genuinely open deep trusses, 24
# prefabricated voussoir-like iron segments per face, erected from each foot.
for face in range(4):
    def ap(theta, rail=0, depth=0):
        x=(45.0+rail)*math.cos(theta)
        y=8+(42.3+rail)*math.sin(theta)
        z=49.0-17.2*math.sin(theta)+depth
        return [(x,y,-z),(z,y,x),(-x,y,z),(-z,y,-x)][face]
    for i in range(24):
        t0=math.pi*i/24;t1=math.pi*(i+1)/24
        part(f'arch-{face}-{i:02}',10+min(i,23-i),'axis','arch')
        for d in [-.75,.75]:
            for r in [0,2.0]: beam('arch-chord',ap(t0,r,d),ap(t1,r,d),.27)
            beam('arch-web-a',ap(t0,0,d),ap(t1,2,d),.17)
            beam('arch-web-b',ap(t0,2,d),ap(t1,0,d),.17)
            beam('arch-radial',ap(t0,0,d),ap(t0,2,d),.17)
        beam('arch-depth',ap(t0,1,-.75),ap(t0,1,.75),.15)
        # Apex spandrel struts touch the underside of platform I.
        if 8<=i<=15:
            p=ap((t0+t1)/2,2,0)
            beam('spandrel',p,(p[0],56.5,p[2]),.16)

def platform(y, half, opening, segments, stage, name, thickness):
    # Ring quadrants are subdivided into short shop-fabricated girders.
    # Open central court preserves views through the lower levels.
    width=half-opening
    for face in range(4):
        def fp(x, h, z): return [(x,h,-z),(z,h,x),(-x,h,z),(-z,h,-x)][face]
        for i in range(segments):
            x0=-half+2*half*i/segments;x1=-half+2*half*(i+1)/segments
            # Corner overlaps are removed by shortening the perpendicular strips.
            if face%2==1:
                x0=-opening+2*opening*i/segments;x1=-opening+2*opening*(i+1)/segments
            part(f'{name}-{face}-{i:02}',stage,'axis','platform')
            center=fp((x0+x1)/2,y+.22,(half+opening)/2)
            size=(x1-x0,.44,width) if face%2==0 else (width,.44,x1-x0)
            box('floor',center,size,'deck')
            for z in [opening,half]:
                for h in [y-thickness,y-.1]: beam('deck-chord',fp(x0,h,z),fp(x1,h,z),.26)
                for j in range(4):
                    xa=x0+(x1-x0)*j/4;xb=x0+(x1-x0)*(j+1)/4
                    beam('deck-warren',fp(xa,y-thickness,z),fp(xb,y-.1,z),.13)
                    beam('deck-warren-back',fp(xa,y-.1,z),fp(xb,y-thickness,z),.13)
                beam('deck-cross',fp(x0,y-thickness,z),fp(x0,y-.1,z),.20)
            beam('floor-transverse',fp(x0,y-.3,opening),fp(x0,y-.3,half),.22)
            # Historically characteristic balustrade and entablature profile.
            for h in [y+.50,y+1.08,y+1.66]: beam('balustrade-rail',fp(x0,h,half),fp(x1,h,half),.11)
            for j in range(5):
                x=x0+(x1-x0)*j/4
                beam('balustrade-post',fp(x,y+.44,half),fp(x,y+1.7,half),.12)
            beam('cornice',fp(x0,y-.2,half+.28),fp(x1,y-.2,half+.28),.24,.38,'gold')

platform(57.5,35.1,20.3,6,23,'platform-1',2.3)
platform(115.7,20.7,9.0,4,34,'platform-2',2.0)

# Single upper tower with four continuous corner chords; gently curved taper
# is sectioned into real lattice bays rather than scaling a generic prism.
def upperhalf(y):
    ks=[(117,18.0),(136,14.1),(159,10.3),(184,7.7),(212,5.9),(242,4.7),(275,4.1)]
    for a,b in zip(ks,ks[1:]):
        if y<=b[0]: return a[1]+(b[1]-a[1])*(y-a[0])/(b[0]-a[0])
    return ks[-1][1]

upper=[116.14,123,129,136,143,151,159,167,176,184,193,202,212,222,232,242,253,264,275]
for i,(a,b) in enumerate(zip(upper,upper[1:])):
    part(f'shaft-{i:02}',35+i,'axis','shaft')
    def uc(y):
        h=upperhalf(y)
        return [(dx*h,y,dz*h) for dx,dz in [(-1,-1),(1,-1),(1,1),(-1,1)]]
    lattice_bay(uc(a),uc(b),'shaft',.40 if a<170 else .28,.20 if a<170 else .15,True)
    # Narrow internal elevator/stair spine, visibly open instead of solid core.
    h0=.9 if a<200 else .65
    for sign in [-1,1]:
        beam('lift-guide',(sign*h0,a,0),(sign*h0,b,0),.13,'iron' if False else None,'dark-iron')
    for step in range(4):
        y=a+(b-a)*step/4
        beam('stair-flight',(-h0,y,-.65),(h0,y+(b-a)/4,.65),.10,key='dark-iron')

def clipped_vertices(half, corner):
    return [(corner,-half),(half,-corner),(half,corner),(corner,half),
            (-corner,half),(-half,corner),(-half,-corner),(-corner,-half)]

def clipped_floor(name,y,half,corner,opening,depth=.44):
    # Rectangular shop boards end UNDER the diagonal perimeter girder. No
    # coplanar overlaid polygon, filled central opening, or unsupported corner.
    breaks=sorted(set([-half,-corner,-opening,opening,corner,half]))
    for lo,hi in zip(breaks,breaks[1:]):
        # Flat middle bands have constant X extents. Coalesce them before kit
        # partitioning: the occupied solid is identical and internal board
        # faces disappear from the seated LOD. Only clipped corners need steps.
        straight=lo>=-corner-1e-9 and hi<=corner+1e-9
        count=1 if straight else max(1,math.ceil((hi-lo)/.18))
        for j in range(count):
            z0=lo+(hi-lo)*j/count;z1=lo+(hi-lo)*(j+1)/count
            extent=half-max(0,max(abs(z0),abs(z1))-corner)
            intervals=[(-extent,extent)]
            if z0>=-opening-1e-8 and z1<=opening+1e-8:
                intervals=[(-extent,-opening),(opening,extent)]
            for x0,x1 in intervals:
                if x1-x0>1e-6:
                    box(name,((x0+x1)/2,y-depth/2,(z0+z1)/2),(x1-x0,depth,z1-z0),'deck')

def clipped_platform(y,half,corner,opening,stage,name,thickness):
    part(name+'-deck',stage,'axis','platform')
    clipped_floor('floor',y+.44,half,corner,opening)
    vertices=clipped_vertices(half,corner)
    for face,(a,b) in enumerate(zip(vertices,vertices[1:]+vertices[:1])):
        part(f'{name}-edge-{face}',stage,'axis','platform')
        p=lambda t,h:(a[0]+(b[0]-a[0])*t,h,a[1]+(b[1]-a[1])*t)
        count=max(1,math.ceil(math.dist(a,b)/1.5))
        for h in [y-thickness,y-.1]:beam('edge-chord',p(0,h),p(1,h),.26)
        for j in range(count):
            u=j/count;v=(j+1)/count
            beam('edge-warren',p(u,y-thickness),p(v,y-.1),.13)
            beam('edge-warren-back',p(u,y-.1),p(v,y-thickness),.13)
            beam('edge-post',p(u,y-thickness),p(u,y+1.7),.12)
        for h in [y+.5,y+1.08,y+1.66]:beam('balustrade',p(0,h),p(1,h),.11)
        beam('corner-cover-girder',p(0,y+.31),p(1,y+.31),.24,.36)
        beam('cornice',p(0,y-.2),p(1,y-.2),.24,.38,'gold')
    part(name+'-bearers',stage,'axis','platform')
    for sign in [-1,1]:
        for h in [y-thickness,y-.12]:
            beam('opening-edge',(-opening,h,sign*opening),(opening,h,sign*opening),.24)
            beam('opening-edge',(sign*opening,h,-opening),(sign*opening,h,opening),.24)
        for cross in [-corner,-opening,opening,corner]:
            beam('radial-bearer',(cross,y-.12,sign*opening),(cross,y-.12,sign*half),.24)
            beam('radial-bearer',(sign*opening,y-.12,cross),(sign*half,y-.12,cross),.24)

clipped_platform(276.1,7.8,6.35,2.4,54,'platform-3',1.3)

# 1889 summit from Rouillard's section: enclosed public gallery, apartment,
# curved campanile and cylindrical domed beacon, not a stack of lattice cones.
# The exact minor proportions are an authored reading of the period engraving.
gallery_vertices=clipped_vertices(6+math.sqrt(2),6)
for face,(a,b) in enumerate(zip(gallery_vertices,gallery_vertices[1:]+gallery_vertices[:1])):
    count=1 if face%2==0 else 6
    length=math.dist(a,b); angle=math.atan2(b[1]-a[1],b[0]-a[0])
    def fp(t,y):return (a[0]+(b[0]-a[0])*t,y,a[1]+(b[1]-a[1])*t)
    for i in range(count):
        u=i/count;v=(i+1)/count
        part(f'summit-gallery-{face}-{i}',55,'axis','lantern')
        for t in [u,v]:beam('gallery-post',fp(t,276.54),fp(t,280.1),.15)
        for y in [276.7,277.35,279.75,280.05]:
            beam('gallery-transom',fp(u,y),fp(v,y),.10)
        for name,y,height,key in [('gallery-glazing',278.52,2.20,'window'),('gallery-panel',276.96,.52,'iron')]:
            o=box(name,fp((u+v)/2,y),(length/count-.16,height,.06),key)
            o.rotation_euler.z=-angle

clipped_platform(280.15,7.8,6.35,5.0,56,'summit-terrace',.55)
part('summit-apartment-floor',57,'axis','lantern')
clipped_floor('apartment-floor',280.59,5.0,5.0,1.05,.44)
for face in range(4):
    def fp(x, y, z): return [(x,y,-z),(z,y,x),(-x,y,z),(-z,y,-x)][face]
    for i in range(4):
        x=-4.95+(i+.5)*9.9/4
        part(f'summit-apartment-{face}-{i}',57,'axis','lantern')
        box('apartment-wall',fp(x,281.76,4.95),(2.475,2.7,.13) if face%2==0 else (.13,2.7,2.475),'deck')
        box('apartment-window',fp(x,282.0,5.03),(1.25,1.6,.04) if face%2==0 else (.04,1.6,1.25),'window')
        beam('apartment-frame',fp(x,281.18,5.06),fp(x,282.8,5.06),.07)
        beam('apartment-lintel',fp(x-1.237,283.16,5.0),fp(x+1.237,283.16,5.0),.14)
part('summit-apartment-roof',57,'axis','lantern')
for sx in [-1,1]:
    box('roof-side',(sx*3.125,283.25,0),(4.15,.20,10.4),'roof')
for sz in [-1,1]:
    box('roof-cross',(0,283.25,sz*3.125),(2.1,.20,4.15),'roof')

# A deep balustraded band above the apartment carries the curved campanile.
for face in range(4):
    def fp(x, y, z): return [(x,y,-z),(z,y,x),(-x,y,z),(-z,y,-x)][face]
    part(f'campanile-base-{face}',58,'axis','lantern')
    for y in [283.4,285.4]: beam('campanile-band',fp(-5.3,y,5.3),fp(5.3,y,5.3),.19)
    for j in range(10):
        x=-5.3+j*1.06
        beam('band-lace-a',fp(x,283.4,5.3),fp(x+1.06,285.4,5.3),.09)
        beam('band-lace-b',fp(x,285.4,5.3),fp(x+1.06,283.4,5.3),.09)

# Four curved corner trusses converge onto the narrow lantern support.
for k,(sx,sz) in enumerate([(-1,-1),(1,-1),(1,1),(-1,1)]):
    def cp(t,r=0):
        h=1.15+(5.3-1.15)*math.cos(t)
        return (sx*(h+r),285.4+6.6*math.sin(t),sz*(h+r))
    for j in range(12):
        a=j*math.pi/24;b=(j+1)*math.pi/24
        part(f'campanile-rib-{k}-{j:02}',59+j/20,'axis','lantern')
        for r in [-.20,.20]: beam('curved-chord',cp(a,r),cp(b,r),.13)
        beam('curved-web-a',cp(a,-.20),cp(b,.20),.085)
        beam('curved-web-b',cp(a,.20),cp(b,-.20),.085)
        beam('curved-radial',cp(a,-.20),cp(a,.20),.09)

# The central access spiral is visible through the open campanile.
part('summit-access-stair',59.55,'axis','lantern')
beam('stair-newel',(0,276.54,0),(0,300.51,0),.15,key='dark-iron')
for j in range(51):
    y=276.54+j*(286.6-276.54)/50
    a=j*math.pi/6
    o=box('stair-tread',(.43*math.cos(a),y,.43*math.sin(a)),(.94,.065,.30),'deck')
    o.rotation_euler.z=-a
    if j<50:
        b=(j+1)*math.pi/6
        beam('stair-handrail',(.94*math.cos(a),y+1,.94*math.sin(a)),
             (.94*math.cos(b),y+(286.6-276.54)/50+1,.94*math.sin(b)),.045)

# The period section separates a spiral, enclosed twenty-step access shaft,
# octagonal lodge and lantern ladders. No full-height exposed corkscrew.
for x in [.68]:
    for z in [-.27,.27]:beam('service-ladder-rail',(x,286.6,z),(x,292.5,z),.045,key='dark-iron')
    for j in range(20):beam('service-ladder-rung',(x,286.88+j*.28,-.27),(x,286.88+j*.28,.27),.035,key='dark-iron')
for j in range(12):
    a=2*math.pi*j/12;b=2*math.pi*(j+1)/12;mid=(a+b)/2
    # One low opening faces the upper spiral landing.
    bottom=288.5 if j in [1,2] else 286.6
    o=box('iron-access-shaft',(.9*math.cos(mid),(bottom+292.2)/2,.9*math.sin(mid)),
          (2*.9*math.sin(math.pi/12),292.2-bottom,.055),'dark-iron')
    o.rotation_euler.z=-mid-math.pi/2
for lo,hi,x in [(292.2,295.0,.72),(295.0,300.51,.55)]:
    count=round((hi-lo)/.28)
    for z in [-.24,.24]:beam('upper-access-rail',(x,lo,z),(x,hi+.7,z),.04,key='dark-iron')
    for j in range(count):beam('upper-access-rung',(x,lo+(j+1)*(hi-lo)/count,-.24),(x,lo+(j+1)*(hi-lo)/count,.24),.035,key='dark-iron')

# The circular lantern and its annular balcony. Short chords are facets of a
# ring, retaining inexpensive linked meshes rather than opaque cylinders.
def ring(name,y,r,width=.1,count=24):
    for j in range(count):
        a=2*math.pi*j/count;b=2*math.pi*(j+1)/count
        beam(name,(r*math.cos(a),y,r*math.sin(a)),(r*math.cos(b),y,r*math.sin(b)),width)

def small_balcony(name,y,r,stage,opening):
    part(name,stage,'axis','lantern')
    h=r*math.cos(math.pi/8);c=r*math.sin(math.pi/8)
    clipped_floor('balcony-floor',y,h,c,opening,.18)
    vertices=clipped_vertices(h,c)
    for a,b in zip(vertices,vertices[1:]+vertices[:1]):
        for level,width in [(y-.08,.18),(y+.52,.055),(y+1.08,.06)]:
            beam('balcony-edge',(a[0],level,a[1]),(b[0],level,b[1]),width)
        beam('balcony-post',(a[0],y,a[1]),(a[0],y+1.1,a[1]),.065)

small_balcony('beacon-lower-balcony',292.2,2.5,60,.72)
for j in range(8):
    a=2*math.pi*j/8;b=2*math.pi*(j+1)/8;mid=(a+b)/2
    part(f'beacon-lodge-{j:02}',60.2,'axis','lantern')
    for y in [292.2,293.2,294.95]:ring('lodge-ring',y,1.25,.075,8) if j==0 else None
    beam('lodge-post',(1.25*math.cos(a),292.2,1.25*math.sin(a)),(1.25*math.cos(a),295,1.25*math.sin(a)),.085)
    for name,y,height,key in [('lodge-panel',292.7,1,'iron'),('lodge-window',294.0,1.5,'window')]:
        o=box(name,(1.25*math.cos(math.pi/8)*math.cos(mid),y,1.25*math.cos(math.pi/8)*math.sin(mid)),
              (2*1.25*math.sin(math.pi/8)-.09,height,.065),key)
        o.rotation_euler.z=-mid-math.pi/2
small_balcony('beacon-upper-balcony',295,1.65,60.4,.65)
for j in range(16):
    a=2*math.pi*j/16;b=2*math.pi*(j+1)/16
    part(f'beacon-window-{j:02}',61,'axis','lantern')
    beam('lantern-post',(1.15*math.cos(a),295,1.15*math.sin(a)),(1.15*math.cos(a),298.25,1.15*math.sin(a)),.075)
    beam('lantern-sill',(1.15*math.cos(a),295.4,1.15*math.sin(a)),(1.15*math.cos(b),295.4,1.15*math.sin(b)),.085)
    o=box('lantern-glass',(1.15*math.cos(math.pi/16)*math.cos((a+b)/2),296.76,1.15*math.cos(math.pi/16)*math.sin((a+b)/2)),
          (2*1.15*math.sin(math.pi/16)-.075,2.64,.045),'window')
    o.rotation_euler.z=-(a+b)/2-math.pi/2

part('beacon-dome',62,'axis','lantern')
# A shallow metal cupola of 24 ribs and curved roof panels.
verts=[];faces=[]
for i in range(9):
    theta=i*math.pi/16
    radius=1.4*math.cos(theta)
    y=298.25+2.05*math.sin(theta)
    for j in range(24):
        a=2*math.pi*j/24
        verts.append(tuple(bvec((radius*math.cos(a),y,radius*math.sin(a)))))
for i in range(8):
    for j in range(24): faces.append((i*24+j,i*24+(j+1)%24,(i+1)*24+(j+1)%24,(i+1)*24+j))
mesh=bpy.data.meshes.new('1889-curved-beacon-cupola');mesh.from_pydata(verts,[],faces);mesh.materials.append(materials['roof']);mesh.update()
obj('cupola',mesh,'roof')
for j in range(12):
    a=2*math.pi*j/12
    for i in range(8):
        u=i*math.pi/16;v=(i+1)*math.pi/16
        beam('cupola-rib',(1.42*math.cos(u)*math.cos(a),298.25+2.07*math.sin(u),1.42*math.cos(u)*math.sin(a)),
             (1.42*math.cos(v)*math.cos(a),298.25+2.07*math.sin(v),1.42*math.cos(v)*math.sin(a)),.045)

part('summit-crown',63,'axis','lantern')
ring('upper-platform',300.51,.7,.10)
ring('upper-handrail',301.65,.7,.06)
for j in range(12):
    a=j*math.pi/6
    beam('upper-post',(.7*math.cos(a),300.51,.7*math.sin(a)),(.7*math.cos(a),301.65,.7*math.sin(a)),.06)
    beam('upper-floor',(0,300.51,0),(.7*math.cos(a),300.51,.7*math.sin(a)),.1,.32,'deck')
beam('flagstaff',(0,298.0,0),(0,312.0,0),.18)
for y in [302,304,306,308]: beam('staff-rung',(-.3,y,0),(.3,y,0),.065)


# Export ONLY structural objects. Root is identity; no nested parent transform.
bpy.context.view_layer.update()
manifest=[]
for p in parts:
    ps=[o.matrix_world @ Vector(v) for o in p['_objects'] for v in o.bound_box]
    ws=[world(v) for v in ps]
    mn=[min(v[k] for v in ws) for k in range(3)]
    mx=[max(v[k] for v in ws) for k in range(3)]
    manifest.append({k:p[k] for k in ['id','stage','leg','group']} | {
        'center':[(mn[k]+mx[k])/2 for k in range(3)],'boundsMin':mn,'boundsMax':mx,
        'meshCount':len(p['_objects'])})
manifest.sort(key=lambda p:(p['stage'],p['id']))
triangles=sum(sum(len(poly.vertices)-2 for poly in o.data.polygons) for o in objects)
doc={'schemaVersion':1,'height':312,'base':125,'parts':manifest,
     'metadata':{'author':'WonderForge original procedural Blender model',
      'period':'1889','units':'metres','coordinates':'Y up; x/y/z',
      'triangles':triangles,'meshNodes':len(objects),'sharedMeshes':len(unit),
      'construction':'Rigid prefabricated lattice assemblies; cinematic interpretation',
      'landmarks':{'firstPlatform':57.5,'secondPlatform':115.7,'thirdPlatform':276.1}}}
(MODEL/'tower-rebuilt.manifest.json').write_text(json.dumps(doc,indent=2)+'\n')
for o in objects:o.select_set(True)
bpy.context.view_layer.objects.active=objects[0]
bpy.ops.export_scene.gltf(filepath=str(MODEL/'tower-rebuilt.glb'),export_format='GLB',
                         use_selection=True,use_active_scene=True,export_extras=True,export_yup=True,
                         export_materials='EXPORT',export_cameras=False,export_lights=False)

# Neutral studio presentation remains editable in .blend but outside the GLB.
studio=bpy.data.collections.new('STUDIO — presentation only, excluded from GLB')
scene.collection.children.link(studio)
reference_path=ROOT/'artifacts/eiffel-summit-revision-2026-09-08/references/rouillard-1889.jpg'
if reference_path.exists():
    reference=bpy.data.images.load(str(reference_path),check_existing=False)
    reference.name='Rouillard 1889 — public-domain summit section'
    reference.pack()
    reference_empty=bpy.data.objects.new('REFERENCE — Rouillard 1889 (not exported)',None)
    studio.objects.link(reference_empty)
    reference_empty.empty_display_type='IMAGE';reference_empty.data=reference
    reference_empty.location=bvec((35,287,0));reference_empty.empty_display_size=42
    reference_empty.hide_render=True
    reference_empty['source']='https://commons.wikimedia.org/wiki/File:Le_sommet_de_la_Tour_Eiffel._Coupe_dessin%C3%A9ee_par_M._Rouillard.jpg'
mat=material('studio-limestone',(.58,.52,.43),0,.9)
mesh=bpy.data.meshes.new('studio-ground')
mesh.from_pydata([(-2000,-2000,-.03),(2000,-2000,-.03),(2000,2000,-.03),(-2000,2000,-.03)],[],[(0,1,2,3)])
mesh.materials.append(mat)
ground=bpy.data.objects.new('studio-ground',mesh);studio.objects.link(ground)

def light(name,position,energy,size,color):
    data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.shape='DISK';data.size=size;data.color=color
    o=bpy.data.objects.new(name,data);studio.objects.link(o);o.location=bvec(position)
    o.rotation_euler=(bvec((0,120,0))-o.location).to_track_quat('-Z','Y').to_euler()

light('large warm key',(-180,350,180),3500000,180,(1,.80,.61))
light('soft cool fill',(170,220,100),2300000,160,(.71,.83,1))
light('rim',(40,290,-190),4500000,130,(1,.91,.75))
worlddata=bpy.data.worlds.new('Warm studio world');scene.world=worlddata;worlddata.use_nodes=True
worlddata.node_tree.nodes['Background'].inputs[0].default_value=(.38,.42,.49,1)
worlddata.node_tree.nodes['Background'].inputs[1].default_value=.5

data=bpy.data.cameras.new('Review camera');cam=bpy.data.objects.new('Review camera',data)
studio.objects.link(cam);scene.camera=cam
def camera(position,target,scale):
    cam.location=bvec(position);cam.rotation_euler=(bvec(target)-cam.location).to_track_quat('-Z','Y').to_euler()
    data.type='ORTHO';data.ortho_scale=scale;data.clip_end=5000

scene.render.engine='CYCLES'
scene.cycles.samples=32
scene.cycles.use_denoising=True
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.view_settings.view_transform='AgX'
scene.render.film_transparent=False
camera((390,230,560),(0,149,0),355)
scene.render.resolution_x=1400;scene.render.resolution_y=1600
scene.render.filepath=str(OUT/'eiffel-tower-beauty.png')
bpy.data.libraries.write(str(OUT/'eiffel-tower.blend'), {scene}, fake_user=True)
if globals().get('WF_RENDER', True): bpy.ops.render.render(write_still=True)
camera((180,97,248),(0,40,0),150)
scene.render.resolution_x=1600;scene.render.resolution_y=1200
scene.render.filepath=str(OUT/'eiffel-tower-lower-detail.png')
if globals().get('WF_RENDER', True): bpy.ops.render.render(write_still=True)
camera((115,220,174),(0,182,0),195)
scene.render.resolution_x=1100;scene.render.resolution_y=1600
scene.render.filepath=str(OUT/'eiffel-tower-shaft-detail.png')
if globals().get('WF_RENDER', True): bpy.ops.render.render(write_still=True)
camera((390,230,560),(0,149,0),355)
scene.render.resolution_x=1400;scene.render.resolution_y=1600
bpy.data.libraries.write(str(OUT/'eiffel-tower.blend'), {scene}, fake_user=True)
(OUT/'build-summary.json').write_text(json.dumps({
    'blender':bpy.app.version_string,'parts':len(parts),'meshNodes':len(objects),
    'triangles':triangles,'glbBytes':(MODEL/'tower-rebuilt.glb').stat().st_size,
    'manifest':str(MODEL/'tower-rebuilt.manifest.json')},indent=2)+'\n')
print('EIFFEL BUILD COMPLETE',len(parts),'parts',len(objects),'mesh nodes',triangles,'triangles')
