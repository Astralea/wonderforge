"""Original Neronian arch kit. Run with Blender --background --factory-startup.

Reads the pure project plan via Bun, exports the reusable glTF kit, saves an
editable .blend and renders a four-bay asset inspection (not browser evidence).
Never touches the owner's connected desktop Blender scene.
"""
import bpy
import json
import math
import subprocess
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts/colosseum-aqueduct-2026-09-20'
OUT.mkdir(parents=True, exist_ok=True)
A = json.loads(subprocess.check_output(['bun', '-e',
    'import {COLOSSEUM_AQUEDUCT as A} from "./src/data/colosseumAqueduct.ts"; console.log(JSON.stringify(A));'], cwd=ROOT))
PITCH = A['clearSpan'] + A['pierWidth']
LENGTH = (A['pierCount'] - 1) * PITCH

def linear(value):
    return value / 12.92 if value <= .04045 else ((value + .055) / 1.055) ** 2.4

def color(hex_value):
    return tuple(linear(int(hex_value[i:i+2], 16) / 255) for i in (0, 2, 4))

BRICK, ARCH, CAP = color('a67156'), color('bd8967'), color('b79b7d')
for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
bpy.context.scene.unit_settings.system = 'METRIC'
mat = bpy.data.materials.new('Neronian fired brick and conduit cap')
mat.diffuse_color = (*BRICK, 1)
mat.use_nodes = True
bsdf = mat.node_tree.nodes.get('Principled BSDF')
bsdf.inputs['Roughness'].default_value = .94
vertex_color = mat.node_tree.nodes.new('ShaderNodeVertexColor')
vertex_color.layer_name = 'Color'
mat.node_tree.links.new(vertex_color.outputs['Color'], bsdf.inputs['Base Color'])

class Builder:
    def __init__(self):
        self.vertices, self.faces, self.colors = [], [], []

    def face(self, points, shade):
        start = len(self.vertices)
        # Three X/Y/Z -> Blender X/-Z/Y, so exported glTF recovers exact axes.
        self.vertices.extend((x, -z, y) for x, y, z in points)
        self.faces.append(tuple(range(start, start + len(points))))
        self.colors.append(shade)

    def box(self, width, bottom, height, depth, shade, offset_x=0):
        x, z, top = width / 2, depth / 2, bottom + height
        p = [(-x,bottom,z),(x,bottom,z),(x,top,z),(-x,top,z),
             (-x,bottom,-z),(x,bottom,-z),(x,top,-z),(-x,top,-z)]
        p = [(px+offset_x,py,pz) for px,py,pz in p]
        for ids in ((0,1,2,3),(5,4,7,6),(4,0,3,7),(1,5,6,2),(3,2,6,7),(4,5,1,0)):
            self.face([p[i] for i in ids], shade)

    def object(self, name):
        mesh = bpy.data.meshes.new(name)
        mesh.from_pydata(self.vertices, [], self.faces)
        mesh.update()
        attr = mesh.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='CORNER')
        for polygon, shade in zip(mesh.polygons, self.colors):
            for loop in polygon.loop_indices:
                attr.data[loop].color = (*shade, 1)
        obj = bpy.data.objects.new(name, mesh)
        bpy.context.collection.objects.link(obj)
        mesh.materials.append(mat)
        obj['authoring'] = 'Original WonderForge Blender mesh; Neronian proportions, authored conduit'
        return obj

def arch(name, segments, facing):
    b = Builder()
    r, half, depth, top = A['archRise'], PITCH / 2, A['depth'] / 2, A['spandrelTop']
    bottom = [(-half, 0)] + [(math.cos(math.pi * (1-i/segments))*r,
              math.sin(math.pi * (1-i/segments))*r) for i in range(segments+1)] + [(half, 0)]
    for i, ((x0,y0),(x1,y1)) in enumerate(zip(bottom, bottom[1:])):
        shade = tuple(c * (1 + ((i * 7) % 5 - 2) * .018) for c in BRICK)
        b.face([(x0,y0,depth),(x1,y1,depth),(x1,top,depth),(x0,top,depth)], shade)
        b.face([(x1,y1,-depth),(x0,y0,-depth),(x0,top,-depth),(x1,top,-depth)], shade)
        b.face([(x0,y0,depth),(x0,y0,-depth),(x1,y1,-depth),(x1,y1,depth)], ARCH)
    b.face([(-half,top,depth),(half,top,depth),(half,top,-depth),(-half,top,-depth)], BRICK)
    b.face([(-half,0,depth),(-half,top,depth),(-half,top,-depth),(-half,0,-depth)], BRICK)
    b.face([(half,0,-depth),(half,top,-depth),(half,top,depth),(half,0,depth)], BRICK)
    if facing:
        for i in range(segments):
            # Individual radial brick-faced sectors, with restrained joints.
            a0, a1 = i * math.pi / segments + .003, (i+1) * math.pi / segments - .003
            shade = tuple(c * (1 + (i % 3 - 1) * .04) for c in ARCH)
            for sign in (1, -1):
                z = sign * (depth + .008)
                points = [(math.cos(a0)*r,math.sin(a0)*r,z),
                          (math.cos(a0)*(r+.61),math.sin(a0)*(r+.61),z),
                          (math.cos(a1)*(r+.61),math.sin(a1)*(r+.61),z),
                          (math.cos(a1)*r,math.sin(a1)*r,z)]
                b.face(points if sign > 0 else list(reversed(points)), shade)
    return b.object(name)

def channel(name, length):
    b = Builder()
    b.box(length, 0, A['channelHeight'], A['depth'], BRICK)
    b.box(length, A['channelHeight'], A['capHeight'], A['capDepth'], CAP)
    for sign in (-1, 1):
        b.box(A['pierWidth']/2, -A['spandrelTop'], A['spandrelTop'], A['depth'], BRICK,
              sign*((length-A['pierWidth'])/2 + A['pierWidth']/4))
    return b.object(name)

b = Builder(); b.box(A['pierWidth'], 0, 1, A['depth'], BRICK)
pier = b.object('aqueduct-pier')
b = Builder(); b.box(A['pierWidth']+.2, -.2, .2, A['depth']+.2, ARCH)
impost = b.object('aqueduct-impost')
high = arch('aqueduct-arch', A['desktopSegments'], True)
low = arch('aqueduct-archPortrait', A['portraitSegments'], False)
conduit = channel('aqueduct-channel', LENGTH + A['pierWidth'])
kit = [pier, impost, high, low, conduit]
bpy.ops.object.select_all(action='DESELECT')
for obj in kit: obj.select_set(True)
glb = ROOT / 'public' / A['glb'].lstrip('/')
glb.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(glb), export_format='GLB', use_selection=True,
    export_apply=True, export_texcoords=False, export_normals=True, export_yup=True,
    export_materials='EXPORT', export_attributes=True)

stats = {}
for obj in kit:
    obj.data.calc_loop_triangles()
    stats[obj.name] = {'triangles': len(obj.data.loop_triangles), 'vertices': len(obj.data.vertices)}
    obj.hide_render = True
    obj.hide_set(True)

def copy_for_view(obj, name, x, elevation, height=1):
    copy = obj.copy(); copy.data = obj.data
    bpy.context.collection.objects.link(copy)
    copy.name = name; copy.hide_render = False; copy.hide_set(False)
    copy.location = (x, 0, elevation); copy.scale.z = height
    return copy

for i in range(5):
    x = (i-2)*PITCH
    copy_for_view(pier, f'Inspection pier {i}', x, 0, 14)
    copy_for_view(impost, f'Inspection springing {i}', x, 14)
    if i < 4: copy_for_view(high, f'Inspection arch {i}', x+PITCH/2, 14)
inspection_channel = channel('Inspection covered conduit', 4*PITCH+A['pierWidth'])
inspection_channel.location.z = 14 + A['spandrelTop']
bpy.ops.mesh.primitive_plane_add(size=200, location=(0,0,-.02))
floor = bpy.context.object; floor.name = 'Inspection ground'
ground = bpy.data.materials.new('Inspection warm limestone'); ground.diffuse_color=(.24,.20,.15,1)
floor.data.materials.append(ground)
bpy.ops.object.light_add(type='AREA', location=(-15,-22,36))
light = bpy.context.object; light.data.energy=12000; light.data.shape='DISK'; light.data.size=22
light.rotation_euler=(Vector((0,0,10))-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.light_add(type='SUN', location=(0,0,30))
bpy.context.object.rotation_euler=(.45,-.3,-.5); bpy.context.object.data.energy=2.2
scene = bpy.context.scene
scene.world.color=(.28,.32,.4)
bpy.ops.object.camera_add(location=(39,-67,31))
camera=bpy.context.object; camera.name='Aqueduct inspection camera'
camera.rotation_euler=(Vector((0,0,10))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO'; camera.data.ortho_scale=54
scene.camera=camera
# Inspection material mirrors the web material's course/radial vocabulary.
# glTF retains the portable vertex color; the browser adds filtered brickwork.
nodes, links = mat.node_tree.nodes, mat.node_tree.links
def math_node(operation, a, b=None):
    node=nodes.new('ShaderNodeMath'); node.operation=operation
    for i,value in enumerate((a,b)):
        if value is None: continue
        if isinstance(value,(int,float)): node.inputs[i].default_value=value
        else: links.new(value,node.inputs[i])
    return node.outputs[0]
geo=nodes.new('ShaderNodeNewGeometry')
xyz=nodes.new('ShaderNodeSeparateXYZ'); links.new(geo.outputs['Position'],xyz.inputs[0])
local_x=math_node('SUBTRACT',math_node('FLOORED_MODULO',xyz.outputs['X'],PITCH),PITCH/2)
height=math_node('SUBTRACT',xyz.outputs['Z'],14)
radius=math_node('SQRT',math_node('ADD',math_node('MULTIPLY',local_x,local_x),math_node('MULTIPLY',height,height)))
ring=math_node('MULTIPLY',math_node('GREATER_THAN',height,0),math_node('MULTIPLY',math_node('GREATER_THAN',radius,A['archRise']-.02),math_node('LESS_THAN',radius,A['archRise']+.66)))
straight=nodes.new('ShaderNodeCombineXYZ'); links.new(xyz.outputs['X'],straight.inputs['X']); links.new(xyz.outputs['Z'],straight.inputs['Y'])
radial=nodes.new('ShaderNodeCombineXYZ'); links.new(math_node('MULTIPLY',math_node('ARCTAN2',height,local_x),A['archRise']),radial.inputs['X']); links.new(radius,radial.inputs['Y'])
mix=nodes.new('ShaderNodeMixRGB'); links.new(ring,mix.inputs[0]); links.new(straight.outputs[0],mix.inputs[1]); links.new(radial.outputs[0],mix.inputs[2])
brick=nodes.new('ShaderNodeTexBrick'); links.new(mix.outputs[0],brick.inputs['Vector'])
brick.inputs['Scale'].default_value=1; brick.inputs['Brick Width'].default_value=.48; brick.inputs['Row Height'].default_value=.10
brick.inputs['Mortar Size'].default_value=.008; brick.inputs['Mortar Smooth'].default_value=.003
brick.inputs['Color1'].default_value=(.98,.95,.91,1); brick.inputs['Color2'].default_value=(.86,.87,.88,1); brick.inputs['Mortar'].default_value=(.68,.68,.65,1)
multiply=nodes.new('ShaderNodeMixRGB'); multiply.blend_type='MULTIPLY'; multiply.inputs[0].default_value=.5
links.new(vertex_color.outputs['Color'],multiply.inputs[1]); links.new(brick.outputs['Color'],multiply.inputs[2]); links.new(multiply.outputs[0],bsdf.inputs['Base Color'])
scene.render.engine='CYCLES'; scene.cycles.samples=32
scene.render.resolution_x=1440; scene.render.resolution_y=900; scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
scene.render.image_settings.file_format='PNG'
scene.render.filepath=str(OUT/'aqueduct-blender-inspection.png')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'neronian-aqueduct.blend'))
bpy.ops.render.render(write_still=True)
result={'blend':str(OUT/'neronian-aqueduct.blend'),'glb':str(glb),'bytes':glb.stat().st_size,
        'parts':stats,'plan':A,'render':scene.render.filepath}
(OUT/'blender-export.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))
