"""Parent-authored upper freight equipment, executed through installed Blender MCP.

This is an interpreted tower-mounted steam freight frame. Its four feet use the
actual 197 m deck; it is an editable candidate until source/motion gates pass.
"""
import bpy, bmesh, json, math
from pathlib import Path
from mathutils import Vector, Matrix

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts/eiffel-upper-material-chain-2026-09-08'
for name in ('model', 'blender', 'mcp'):
    (OUT / name).mkdir(parents=True, exist_ok=True)
scene = bpy.data.scenes.new('WonderForge — upper material chain freight frame')
bpy.context.window.scene = scene

def vec(p):
    return Vector((p[0], -p[2], p[1]))

def material(name, color):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = .84
    return m

iron = material('Upper freight painted iron', (.10, .13, .115))
wood = material('Upper freight worn timber', (.31, .21, .115))
bronze = material('Upper freight bearing bronze', (.38, .26, .13))

def group(role, p=(0, 0, 0), parent=None):
    o = bpy.data.objects.new(role, None)
    scene.collection.objects.link(o)
    o['wf_role'] = role
    o.parent = parent
    o.location = vec(p)
    return o

def box(name, p, size, parent=None, mat=iron):
    bpy.ops.mesh.primitive_cube_add(size=1)
    o = bpy.context.object
    o.name = name
    o.dimensions = (size[0], size[2], size[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.parent = parent
    o.location = vec(p)
    o.data.materials.append(mat)
    return o

def cylinder(name, p, radius, length, axis=(0, 1, 0), parent=None, mat=iron, segments=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=segments, radius=radius, depth=length)
    o = bpy.context.object
    o.name = name
    o.parent = parent
    o.location = vec(p)
    o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(vec(axis))
    o.data.materials.append(mat)
    return o

def brace(name, a, b, radius=.055, parent=None):
    a, b = Vector(a), Vector(b)
    return cylinder(name, (a+b)/2, radius, (b-a).length, (b-a).normalized(), parent, segments=12)

def bore(target, p, radius, length, axis=(0, 1, 0)):
    cutter = cylinder('temporary bore', p, radius, length, axis, target.parent)
    bpy.context.view_layer.update()
    bpy.context.view_layer.objects.active = target
    modifier = target.modifiers.new('Actual bored shaft passage', 'BOOLEAN')
    modifier.operation = 'DIFFERENCE'
    modifier.solver = 'MANIFOLD'
    modifier.object = cutter
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    bpy.data.objects.remove(cutter, do_unlink=True)

def rail_z(name, x, y, z0, z1, parent, depth=.38, width=.22):
    for dy in (-depth/2+.02, depth/2-.02):
        box(name+' flange', [x, y+dy, (z0+z1)/2], [width, .04, z1-z0], parent)
    box(name+' web', [x, y, (z0+z1)/2], [.045, depth-.08, z1-z0], parent)

def rail_x(name, x0, x1, y, z, parent, depth=.30, width=.20):
    for dy in (-depth/2+.018, depth/2-.018):
        box(name+' flange', [(x0+x1)/2, y+dy, z], [x1-x0, .036, width], parent)
    box(name+' web', [(x0+x1)/2, y, z], [x1-x0, depth-.072, .04], parent)

def import_glb(path):
    before = set(scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    return set(scene.objects)-before

def keep_import(objects, keep):
    for o in objects-set(keep):
        bpy.data.objects.remove(o, do_unlink=True)

def export(path):
    bpy.ops.object.select_all(action='DESELECT')
    for o in scene.objects:
        o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', use_selection=True,
        use_active_scene=True, export_extras=True, export_yup=True,
        export_animations=False, export_lights=False, export_cameras=False)

F = 197.0
frame = group('upper-197-fixed-frame')
feet = []
for x in (-3.0, 1.12):
    for z in (-3.6, 3.6):
        feet.append([x, F, z])
        box('deck bearing sole', [x, F+.04, z], [.50, .08, .50], frame)
        # Four short flanged post sections, never a runtime scaling operation.
        for i in range(4):
            y = F+.08+2.025*(i+.5)
            box('riveted upright web', [x, y, z], [.07, 2.025, .20], frame)
            for dx in (-.10, .10):
                box('riveted upright flange', [x+dx, y, z], [.045, 2.025, .24], frame)
            if i:
                box('upright splice collar', [x, F+.08+2.025*i, z], [.31, .18, .31], frame)
        box('post capital', [x, F+8.23, z], [.46, .10, .50], frame)
    rail_z('longitudinal runway', x, F+8.47, -4.15, 4.15, frame)
    rail_z('lower truss chord', x, F+.12, -3.6, 3.6, frame, .20, .18)
    # Braces stay outside the two-metre freight lane between the side frames.
    for z0, z1 in [(-3.6, 0), (0, 3.6)]:
        brace('side X tie', [x,F+.12,z0], [x,F+8.34,z1], .046, frame)
        brace('side X tie', [x,F+8.34,z0], [x,F+.12,z1], .046, frame)
for z in (-3.6,3.6):
    rail_x('fixed portal tie', -3.22, 1.34, F+8.62, z, frame)

# The bridge rolls along Z on the two real runways; a separate trolley rolls X.
bridge = group('upper-197-travel-bridge', [0,0,-1.8])
for z in (-.27,.27):
    rail_x('travelling cross girder', -3.25,1.37,F+9.11,z,bridge,.26,.20)
for x in (-3.0,1.12):
    for z in (-.27,.27):
        pivot=group(f'upper-197-bridge-wheel-{x}-{z}',[x,F+8.805,z],bridge)
        tread=cylinder('bridge rolling tread',[0,0,0],.145,.23,(1,0,0),pivot,segments=24)
        bore(tread,[0,0,0],.026,.40,(1,0,0))
        flange=cylinder('bridge wheel outer flange',[-.135 if x<0 else .135,0,0],.17,.025,(1,0,0),pivot)
        bore(flange,[-.135 if x<0 else .135,0,0],.026,.06,(1,0,0))
        cylinder('fixed bridge axle',[x,F+8.805,z],.025,.44,(1,0,0),bridge,bronze)
        for dx in (-.18,.18):
            hanger=box('bridge axle hanger',[x+dx,F+8.985,z],[.04,.39,.20],bridge)
            bore(hanger,[x+dx,F+8.805,z],.026,.10,(1,0,0))
        # Girder underside205.98 now clears wheel top205.95 by30mm.
trolley = group('upper-197-cross-trolley',[-1.75,0,0],bridge)
for x in (-.22,.22):
    for z in (-.27,.27):
        pivot=group(f'upper-197-cross-wheel-{x}-{z}',[x,F+9.37,z],trolley)
        tread=cylinder('cross trolley tread',[0,0,0],.13,.21,(0,0,1),pivot)
        bore(tread,[0,0,0],.020,.34,(0,0,1))
        cylinder('fixed cross axle',[x,F+9.37,z],.019,.40,(0,0,1),trolley,bronze)
        flange=cylinder('cross wheel outer flange',[0,0,-.125 if z<0 else .125],.152,.025,(0,0,1),pivot)
        bore(flange,[0,0,-.125 if z<0 else .125],.020,.08,(0,0,1))
        for dz in (-.17,.17):
            hanger=box('cross axle hanger',[x,F+9.495,z+dz],[.16,.29,.035],trolley)
            bore(hanger,[x,F+9.37,z+dz],.020,.10,(0,0,1))
for x in (-.30,.30):
    box('cross trolley lower side',[x,F+9.62,0],[.05,.14,.95],trolley)
for z in (-.40,.40):
    box('cross trolley lower end',[0,F+9.62,z],[.75,.14,.05],trolley)
box('cross trolley sheave tie',[0,F+10.26,0],[.75,.14,.95],trolley)
for x in (-.30,.30):
    for z in (-.40,.40):
        box('cross trolley head riser',[x,F+9.94,z],[.075,.64,.075],trolley)
for z in (-.115,.115):
    cheek=box('head sheave cheek',[0,F+9.81,z],[.34,.90,.04],trolley)
    bore(cheek,[0,F+9.57,z],.036,.12,(0,0,1))
cylinder('head sheave shaft',[0,F+9.57,0],.035,.31,(0,0,1),trolley,bronze)
sheave=group('upper-197-head-sheave',[0,F+9.57,0],trolley)
hub=cylinder('head sheave groove',[0,0,0],.242,.09,(0,0,1),sheave)
bore(hub,[0,0,0],.036,.20,(0,0,1))
for z in (-.061,.061):
    flange=cylinder('head sheave flange',[0,0,z],.268,.028,(0,0,1),sheave)
    bore(flange,[0,0,z],.036,.08,(0,0,1))

# Three physical redirects keep the rope on each sheave's plane while the
# bridge traverses. 16mm rope follows the .242m groove at .250m centre radius.
def redirect(role,p,axis,parent):
    pivot=group(role,p,parent)
    hub=cylinder(role+' groove',[0,0,0],.242,.09,axis,pivot)
    bore(hub,[0,0,0],.036,.20,axis)
    for sign in (-1,1):
        c=[sign*.061*v for v in axis]
        flange=cylinder(role+' flange',c,.268,.028,axis,pivot)
        bore(flange,c,.036,.08,axis)
    cylinder(role+' fixed axle',p,.035,.38,axis,parent,bronze)
    return pivot

# A triangulated outboard bracket reacts into the east post at two heights.
# Its end supports the fixed vertical-plane turning sheave above the drum.
fixed_top=[4.45,F+9.57,-4.40]
for dz in (-.35,.35):
    brace('fixed guide upper arm',[1.12,F+8.66,-3.6+dz],[4.45,F+10.08,-4.4+dz],.070,frame)
    brace('fixed guide diagonal',[1.12,F+4.12,-3.6+dz],[4.45,F+10.08,-4.4+dz],.055,frame)
for dz in (-.13,.13):
    cheek=box('fixed guide shaft cheek',[4.45,F+9.80,-4.4+dz],[.23,.68,.045],frame)
    bore(cheek,[4.45,F+9.57,-4.4+dz],.036,.12,(0,0,1))
for y in (F+8.66,F+4.12):
    brace('fixed guide post cross tie',[1.12,y,-3.95],[1.12,y,-3.25],.070,frame)
brace('fixed guide cross tie',[4.45,F+10.08,-4.75],[4.45,F+10.08,-4.05],.060,frame)
redirect('upper-197-fixed-feed-sheave',fixed_top,(0,0,1),frame)
fixed_corner=[1.12,F+9.82,-4.15]
box('fixed corner pedestal',[1.12,F+9.16,-4.10],[.22,1.045,.30],frame)
for y in (F+9.70,F+9.94):
    plate=box('fixed corner bearing plate',[1.12,y,-4.15],[.74,.035,.74],frame)
    bore(plate,[1.12,y,-4.15],.036,.10,(0,1,0))
for x in (.79,1.45):
    box('fixed corner bearing riser',[x,F+9.82,-4.48],[.05,.24,.05],frame)
redirect('upper-197-fixed-corner-sheave',fixed_corner,(0,1,0),frame)
moving_corner=[.62,F+9.82,-.25]
box('bridge corner pedestal',[.62,F+9.47,-.27],[.18,.44,.18],bridge)
for y in (F+9.70,F+9.94):
    plate=box('bridge corner bearing plate',[.62,y,-.25],[.74,.035,.74],bridge)
    bore(plate,[.62,y,-.25],.036,.10,(0,1,0))
for x in (.29,.95):
    box('bridge corner bearing riser',[x,F+9.82,-.58],[.05,.24,.05],bridge)
redirect('upper-197-bridge-corner-sheave',moving_corner,(0,1,0),bridge)

# A distinct receiver retains the actual bored bed, captive nuts and handles.
objects=import_glb(ROOT/'public/models/eiffel-long-load-first-floor/bridge.glb')
cart=next(o for o in objects if o.get('wf_role')=='stock-cart')
keep=[cart]+list(cart.children_recursive)
cart.parent=None
cart.matrix_parent_inverse=Matrix.Identity(4)
cart.location=vec([-2,F,-3.6])
cart['wf_role']='upper-197-receiver-cart'
for i,o in enumerate(p for p in cart.children_recursive if p.get('wf_role')=='cart-wheel'):
    o['wf_role']=f'upper-197-receiver-wheel-{i}'
keep_import(objects,keep)
for x in (-2.354,-1.646):
    for z in (-3.98,-3.22):
        box('receiving cart timber chock',[x,F+.025,z],[.08,.05,.09],frame,wood)

# Source steam engine and its matched drum gear are translated as one assembly.
drive=group('upper-197-steam-drive',[27.85,F-57.94000244140625,-.01])
objects=import_glb(ROOT/'public/models/eiffel-long-load-first-floor/steam-drive.glb')
for o in objects:
    if not o.parent:
        o.parent=drive
    if o.get('wf_role'):
        o['wf_role']='upper-197-'+o['wf_role']
objects=import_glb(ROOT/'public/models/eiffel-long-load-first-floor/receiver-driven.glb')
drum=next(o for o in objects if o.get('wf_role')=='drum')
bpy.context.view_layer.update()
world=drum.matrix_world.copy()
keep=[drum]+list(drum.children_recursive)
drum.parent=drive
drum.matrix_parent_inverse=Matrix.Identity(4)
drum.matrix_basis=world
drum['wf_role']='upper-197-drum'
keep_import(objects,keep)
for z, length in ((-4.59,.10),(-3.41,.14)):
    base=box('drum bearing stand',[4.4,F+.40,z],[.32,.80,length+.015],frame)
    bore(base,[4.4,F+.80,z],.083,length+.08,(0,0,1))
    ring=cylinder('drum bearing bronze sleeve',[4.4,F+.80,z],.083,length,(0,0,1),frame,bronze)
    bore(ring,[4.4,F+.80,z],.056,length+.08,(0,0,1))

# A separate empty fitting belongs to this hoist. It cannot be an alias for
# either lower hoist's retained connector. Runtime connection work is separate.
prepared_master = [-2,116.13999938964844+.16+.34+6.882500305,-1.8]
objects=import_glb(ROOT/'public/models/eiffel-second-floor-relay/relay.glb')
clevis=next(o for o in objects if o.get('wf_role')=='relay-clevis')
keep=[clevis]+list(clevis.children_recursive)
clevis.parent=None
clevis.matrix_parent_inverse=Matrix.Identity(4)
clevis.location=vec(prepared_master)
for o in keep:
    if o.get('wf_role'):
        o['wf_role']=o['wf_role'].replace('relay-', 'upper-197-', 1)
keep_import(objects,keep)

# Editable rest reeving, saved in Blender as well as the browser asset. The
# renderer replaces this single role with the sampled route when it animates.
points=[[4.7,F+.8,-4.40]]
def arc_xy(c,a,b):
    for i in range(25):
        t=a+(b-a)*i/24
        points.append([c[0]+.25*math.cos(t),c[1]+.25*math.sin(t),c[2]])
def arc_xz(c,a,b):
    for i in range(25):
        t=a+(b-a)*i/24
        points.append([c[0]+.25*math.cos(t),c[1],c[2]+.25*math.sin(t)])
arc_xy(fixed_top,0,math.pi/2)
arc_xz(fixed_corner,-math.pi/2,-math.pi)
arc_xz([.62,F+9.82,-2.05],0,math.pi/2)
arc_xy([-1.75,F+9.57,-1.8],math.pi/2,math.pi)
points.append([-2,prepared_master[1]+.325,-1.8])
rope_root=group('upper-197-rest-rope')
rope_mat=material('Upper freight dark wire rope',(.105,.085,.055))
curve=bpy.data.curves.new('Continuous upper hoist reeving','CURVE')
curve.dimensions='3D'
curve.bevel_depth=.008
curve.bevel_resolution=1
curve.use_fill_caps=True
spline=curve.splines.new('POLY')
spline.points.add(len(points)-1)
for point,p in zip(spline.points,points):
    point.co=(*vec(p),1)
rope_object=bpy.data.objects.new('Continuous upper hoist reeving',curve)
scene.collection.objects.link(rope_object)
rope_object.parent=rope_root
curve.materials.append(rope_mat)
bpy.ops.object.select_all(action='DESELECT')
rope_object.select_set(True)
bpy.context.view_layer.objects.active=rope_object
bpy.ops.object.convert(target='MESH')

bpy.context.view_layer.update()
asset_path=OUT/'model/upper-197-freight-frame.glb'
blend_path=OUT/'blender/eiffel-upper-material-chain.blend'
export(asset_path)
bpy.data.libraries.write(str(blend_path),{scene},fake_user=True)
roles=[]
for o in scene.objects:
    if o.get('wf_role'):
        roles.append({'role':o['wf_role'],'parent':o.parent.get('wf_role') if o.parent else None,
            'position':[o.location.x,o.location.z,-o.location.y]})
design={'floor':F,'feet':feet,'soleSize':[.5,.08,.5],'bridgeZ':-1.8,'crossTrolleyX':-1.75,
    'headSheaveY':F+9.57,'headSheaveRadius':.25,'receiverCartOrigin':[-2,F,-3.6],
    'receiverCarrierOrigin':[-2,F+.34,-3.6],'driveTranslation':[27.85,F-57.94000244140625,-.01],
    'reeving':{'ropeRadius':.008,'grooveRadius':.242,'centreRadius':.25,
        'drumCentre':[4.4,F+.8,-4.01],'drumTakeoff':[4.7,F+.8,-4.40],
        'fixedVerticalGuide':fixed_top,'fixedHorizontalGuide':fixed_corner,
        'bridgeHorizontalGuideLocal':moving_corner,'headLocal':[0,F+9.57,0]},
    'preparedEmptyClevisOrigin':prepared_master,'restRopePoints':points,
    'roles':roles,'sourceScene':scene.name,'productionReady':False,
    'limits':['Interpreted tower-mounted freight frame, not a documented exact historic crane.',
        'Candidate geometry only: reaction path, structure clearance, complete reeving, bridge drive and equipment erection still require verification.',
        'No load, braking, steam-pressure or winding capacity claim.']}
(OUT/'freight-design.json').write_text(json.dumps(design,indent=2)+'\n')
result={'scene':scene.name,'objects':len(scene.objects),'meshes':sum(o.type=='MESH' for o in scene.objects),
    'blend':str(blend_path),'model':str(asset_path),'roleCount':len(roles),'productionReady':False}
