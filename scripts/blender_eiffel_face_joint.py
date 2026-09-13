"""Editable face-joint candidate, built through Blender Lab MCP.

This is an isolated geometry review, not an admitted construction operation.
The live kit and its route/cache evidence are deliberately not overwritten.
"""
import bpy, bmesh, json, hashlib, math
from pathlib import Path
from mathutils import Vector, Quaternion

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts/eiffel-face-joint-2026-09-07'
MODEL = OUT / 'model'
MODEL.mkdir(parents=True, exist_ok=True)
(OUT / 'blender').mkdir(exist_ok=True)
(OUT / 'renders').mkdir(exist_ok=True)
design = json.loads((OUT / 'design.json').read_text())
audit = json.loads((OUT / 'placement-audit.json').read_text())
manifest_path = ROOT / 'public/models/eiffel-construction-kit/tower-kit.manifest.json'
if hashlib.sha256(manifest_path.read_bytes()).hexdigest() != design['sourceManifestSHA256']:
    raise ValueError('The candidate belongs to another source manifest')
if not audit['geometryAccepted'] or audit['candidateSHA256'] != hashlib.sha256((OUT / 'design.json').read_bytes()).hexdigest():
    raise ValueError('Candidate geometry audit is missing or stale')
manifest = json.loads(manifest_path.read_text())
joint = Vector(design['joint'])
scene = bpy.data.scenes.new('WonderForge — face joint geometry review')
bpy.context.window.scene = scene
scene['wf_production_admitted'] = False
scene['wf_scope'] = 'Geometry and final insertion only; ground transport and fastening remain unadmitted.'

def web(v): return Vector((v[0], -v[2], v[1]))
def collection(name):
    c = bpy.data.collections.new(name); scene.collection.children.link(c); return c
def material(name, color, roughness=.7):
    rgb = [int(color[i:i+2], 16)/255 for i in (0, 2, 4)]
    rgb = [v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in rgb]
    m = bpy.data.materials.new(name); m.diffuse_color = (*rgb, 1); m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*rgb, 1)
    bs.inputs['Metallic'].default_value = .25
    bs.inputs['Roughness'].default_value = roughness
    return m
iron = material('Face joint — existing iron', '6c655b')
plate_material = material('Face joint — oxide plate', '9e593c')
pad_material = material('Face joint — fitted pads', '796b4e')

def mesh(name, vertices, faces, c, mat):
    # Small local vertices retain the 14 mm plate in Float32 web export.
    m = bpy.data.meshes.new(name)
    # Subtract in Python double precision BEFORE mathutils converts to Float32.
    m.from_pydata([web(tuple(v[k]-design['joint'][k] for k in range(3))) for v in vertices], [], faces); m.update()
    bm = bmesh.new(); bm.from_mesh(m); bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces)); bm.to_mesh(m); bm.free()
    o = bpy.data.objects.new(name, m); c.objects.link(o); o.location = web(joint); m.materials.append(mat)
    return o
new = collection('Candidate — actual occupied plate and pads')
old = collection('Original — intersecting slab for comparison only')
context = collection('Context — unchanged incoming and adjacent iron')
parts = []
for c in design['components']:
    o = mesh(c['id'], c['vertices'], c['faces'], new, plate_material if c['role']=='face-plate' else pad_material)
    o['wf_part'] = c['id']; o['wf_source'] = design['sourceMember']; o['wf_role'] = c['role']
    o['wf_material'] = 'dark-iron'; o['wf_shape'] = 'convex-polyhedron'; o['wf_mass_kg'] = c['massKg']
    parts.append(o)
faces = [[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]]
context_ids = [c['partId'] for c in design['contacts']]
context_ids += ['lower-ne-02-m012-c000', 'lower-ne-02-m012-c002']
for p in manifest['parts']:
    if p['id'] not in context_ids+[design['replaces']]: continue
    mn, mx = p['localBounds']['min'], p['localBounds']['max']
    local = [(mn[0],mn[1],mn[2]),(mx[0],mn[1],mn[2]),(mx[0],mx[1],mn[2]),(mn[0],mx[1],mn[2]),
             (mn[0],mn[1],mx[2]),(mx[0],mn[1],mx[2]),(mx[0],mx[1],mx[2]),(mn[0],mx[1],mx[2])]
    q = p['finalPose']['quaternion']; q = Quaternion((q[3], q[0], q[1], q[2]))
    vertices = [Vector(p['finalPose']['position'])+q@Vector(v) for v in local]
    original = p['id']==design['replaces']
    o = mesh(p['id']+('-original' if original else '-context'), vertices, faces, old if original else context, plate_material if original else iron)
    o['wf_part'] = p['id']; o['wf_source'] = p['sourceMember']

def export(objects, path):
    for o in scene.objects: o.select_set(False)
    for o in objects: o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', use_selection=True,
        use_active_scene=True, export_extras=True, export_yup=True, export_animations=False,
        export_cameras=False, export_lights=False)
export(parts, MODEL / 'face-joint.glb')
export(list(context.objects)+list(old.objects), MODEL / 'joint-context.glb')

# Editable insertion preview with fixed geometry. It is intentionally labelled
# as an insertion study, not as a suspended/ground-delivered construction load.
normal = web(design['normal'])
for o in parts:
    o.location = web(joint)+normal*.4; o.keyframe_insert(data_path='location', frame=1)
    o.location = web(joint); o.keyframe_insert(data_path='location', frame=61)
scene.frame_start=1; scene.frame_end=61; scene.frame_set(61)
world = bpy.data.worlds.new('Face joint review daylight'); world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.22,.25,.3,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.65; scene.world=world
for name, offset, energy, size in [('key',(2,3,2),750,3),('fill',(-1,2,-3),350,2),('rim',(-2,1,1),450,2)]:
    light = bpy.data.lights.new(name,'AREA'); light.energy=energy; light.shape='DISK'; light.size=size
    o = bpy.data.objects.new('Face joint '+name,light); scene.collection.objects.link(o)
    o.location=web(joint+Vector(offset)); o.rotation_euler=(web(joint)-o.location).to_track_quat('-Z','Y').to_euler()
camera=bpy.data.cameras.new('Face joint comparison'); cam=bpy.data.objects.new('Face joint comparison',camera); scene.collection.objects.link(cam); scene.camera=cam
camera.type='ORTHO'; camera.ortho_scale=2.1; camera.lens=55; camera.clip_start=.01; camera.clip_end=1000
def aim(offset):
    cam.location=web(joint+Vector(offset)); cam.rotation_euler=(web(joint)-cam.location).to_track_quat('-Z','Y').to_euler()
aim((2.4,1.25,1.8))
scene.render.engine='CYCLES'; scene.cycles.samples=32
scene.render.resolution_x=1200; scene.render.resolution_y=900; scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
def render(name):
    scene.render.filepath=str(OUT/'renders'/name); bpy.ops.render.render(write_still=True)
for o in new.objects:o.hide_render=True
render('original.png')
for o in new.objects:o.hide_render=False
for o in old.objects:o.hide_render=True; o.hide_set(True)
render('candidate.png')
aim((-2,1.5,1.8)); render('candidate-back.png')
aim((2.4,1.25,1.8))
for o in scene.objects:o.select_set(False)
parts[0].select_set(True); bpy.context.view_layer.objects.active=parts[0]
result={'scene':scene.name,'productionAdmitted':False,'blend':str(OUT/'blender/eiffel-face-joint.blend'),
        'sourceManifestSHA256':design['sourceManifestSHA256'],'candidateSHA256':audit['candidateSHA256'],
        'pieces':len(parts),'triangles':sum(len(p.vertices)-2 for o in parts for p in o.data.polygons),
        'massKg':design['totalMassKg'],'contextIds':context_ids,
        'limits':audit['limits'],'geometryAsset':str(MODEL/'face-joint.glb')}
(MODEL/'manifest.json').write_text(json.dumps(result,indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=result['blend'])
