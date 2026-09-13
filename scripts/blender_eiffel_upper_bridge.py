"""Editable second-floor spanning access bridge, authored by parent via MCP."""
import bpy
import bmesh
import json
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts/eiffel-upper-material-chain-2026-09-08'
scene = bpy.data.scenes.new('WonderForge — second floor freight access bridge')
bpy.context.window.scene = scene
F = 116.13999938964844

def vec(p):
    return Vector((p[0], -p[2], p[1]))

def material(name, color):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = .9
    return mat

iron = material('Bridge dark iron', (.10, .13, .115))
timber = material('Bridge timber deck', (.34, .23, .13))

def root(role):
    obj = bpy.data.objects.new(role, None)
    scene.collection.objects.link(obj)
    obj['wf_role'] = role
    return obj

def box(name, p, size, parent, mat=iron):
    bpy.ops.mesh.primitive_cube_add(size=1)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = (size[0], size[2], size[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.parent = parent
    obj.location = vec(p)
    obj.data.materials.append(mat)
    return obj

def tie(name, a, b, parent):
    direction = Vector(b) - Vector(a)
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=.042, depth=direction.length)
    obj = bpy.context.object
    obj.name = name
    obj.parent = parent
    obj.location = vec((Vector(a) + Vector(b)) / 2)
    obj.rotation_mode = 'QUATERNION'
    obj.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(vec(direction.normalized()))
    obj.data.materials.append(iron)
    return obj

feet = []
for x in (-9.5, 9.5):
    for z in (-1.64, .44):
        group = root(f'upper-bridge-bearing-{x}-{z}')
        box('bridge bearing sole', [x, F+.02, z], [.5, .04, .30], group)
        feet.append([x, F, z])

for index in range(10):
    x0 = -9.75 + index * 1.95
    x1 = x0 + 1.95
    group = root(f'upper-bridge-panel-{index}')
    for z in (-1.64, .44):
        box('bridge bottom chord', [(x0+x1)/2, F+.10, z], [1.95, .12, .12], group)
        box('bridge top chord', [(x0+x1)/2, F+1.82, z], [1.95, .12, .12], group)
        box('bridge vertical', [x0, F+.96, z], [.09, 1.72, .09], group)
        tie('bridge diagonal', [x0, F+.16, z], [x1, F+1.76, z], group)
        if not (index == 5 and z == .44):
            tie('bridge counter diagonal', [x0, F+1.76, z], [x1, F+.16, z], group)
        if index == 9:
            box('bridge end vertical', [x1, F+.96, z], [.09, 1.72, .09], group)
    for j in range(7):
        width = 1.95 / 7
        x = x0 + width * (j+.5)
        box('bridge deck plank', [x, F+.11, -.6], [width, .10, 2.0], group, timber)
    box('bridge deck cross bearer', [x0+.08, F+.05, -.6], [.16, .02, 2.08], group)

# Solid wedge ramps use the same continuous plane as the eventual wheel sampler.
for side in (-1, 1):
    group = root(f'upper-bridge-ramp-{side}')
    inner, outer = side * 9.75, side * 11.75
    vertices = [[outer,F,-1.6], [outer,F,.4], [inner,F,-1.6], [inner,F,.4],
                [inner,F+.16,-1.6], [inner,F+.16,.4]]
    faces = [(0,2,3,1), (0,1,5,4), (0,4,2), (1,3,5), (2,4,5,3)]
    mesh = bpy.data.meshes.new('continuous timber approach')
    mesh.from_pydata([vec(p) for p in vertices], [], faces)
    mesh.update()
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new('continuous timber approach', mesh)
    scene.collection.objects.link(obj)
    obj.parent = group
    mesh.materials.append(timber)

# Real openings around the already erected central shaft. These small cuts are
# beyond the cart's receiving point at X=-2; no load route crosses a cutout.
notches = [(-.985,-.815,-.085,.085), (.815,.985,-.085,.085),
           (-.95260581,-.61648192,-.71294008,-.42029029)]
for plank in list(scene.objects):
    if not plank.name.startswith('bridge deck plank'):
        continue
    for index, (x0,x1,z0,z1) in enumerate(notches):
        if abs(plank.location.x-(x0+x1)/2) > plank.dimensions.x/2+(x1-x0)/2:
            continue
        cutter = box('temporary shaft clearance', [(x0+x1)/2,F+.11,(z0+z1)/2],
                     [x1-x0,.14,z1-z0], None)
        bpy.context.view_layer.update()
        bpy.context.view_layer.objects.active = plank
        modifier = plank.modifiers.new('Existing shaft opening', 'BOOLEAN')
        modifier.operation = 'DIFFERENCE'
        modifier.solver = 'MANIFOLD'
        modifier.object = cutter
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        bpy.data.objects.remove(cutter, do_unlink=True)

bpy.context.view_layer.update()
model = OUT / 'model/second-floor-bridge.glb'
blend = OUT / 'blender/eiffel-second-floor-bridge.blend'
bpy.ops.object.select_all(action='DESELECT')
for obj in scene.objects:
    obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(model), export_format='GLB', use_selection=True,
    use_active_scene=True, export_extras=True, export_yup=True,
    export_animations=False, export_lights=False, export_cameras=False)
bpy.data.libraries.write(str(blend), {scene}, fake_user=True)
design = {'floor': F, 'laneZ': -.6, 'deckTop': F+.16, 'deckX': [-9.75,9.75],
    'deckZ': [-1.6,.4], 'outerRampX': [-11.75,11.75], 'rampLength': 2,
    'bearings': feet, 'soleSize': [.5,.04,.30], 'topRailY': F+1.88,
    'shaftCutoutsXZ': notches, 'northBay5CounterDiagonalOmitted': True,
    'sourceScene': scene.name, 'productionReady': False,
    'limits': ['Prepared access candidate; equipment erection and loaded cart passage not yet animated.',
               'Interpreted temporary bridge, not a reconstruction of an identified historical drawing.']}
(OUT / 'receiver/bridge-design.json').write_text(json.dumps(design, indent=2)+'\n')
result = {'scene': scene.name, 'objects': len(scene.objects),
    'meshes': sum(o.type == 'MESH' for o in scene.objects), 'blend': str(blend), 'model': str(model)}
