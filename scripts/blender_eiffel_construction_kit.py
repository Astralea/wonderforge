"""Build the bounded Eiffel erection kit through Blender MCP.

An isolated scene and separate export paths preserve the reviewed production
model. Boxes are tiled in their own frames (no rescaling during animation).
The dome is split along its existing panel seams. Full supports/routes remain
an integration gate; exported surface anchors are not a support certificate.
"""
import bpy
import json
import math
from pathlib import Path
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(globals().get('WF_KIT_OUT', ROOT / 'artifacts/eiffel-mechanics-2026-09-06/blender'))
MODEL = Path(globals().get('WF_KIT_MODEL', ROOT / 'public/models/eiffel-construction-kit'))
OUT.mkdir(parents=True, exist_ok=True)
MODEL.mkdir(parents=True, exist_ok=True)
base = ROOT / 'scripts/blender_eiffel_tower.py'
scope = {'__file__': str(base), 'WF_RENDER': False,
         'WF_OUT': OUT / 'source-generation', 'WF_MODEL': OUT / 'source-generation/model'}
exec(compile(base.read_text(), str(base), 'exec'), scope)
scene = scope['scene']
scene.name = 'WonderForge Eiffel — bounded erection kit'
source_parts = scope['parts']
source_objects = scope['objects']
unit = scope['unit']

# Sixteen masonry bearing blocks, one under each pylon chord. Their outward
# edges retain the reviewed 125m footprint. No 22m solid steel sole-plates.
for p in list(source_parts):
    if p['group'] == 'foundation':
        for o in list(p['_objects']):
            source_objects.remove(o)
            bpy.data.objects.remove(o, do_unlink=True)
        source_parts.remove(p)
        bpy.data.collections.remove(p['_collection'])
for leg,sx,sz in scope['LEGS']:
    for k,(x,y,z) in enumerate(scope['corners'](4,sx,sz)):
        scope['part'](f'foundation-{leg}-{k}',0,leg,'foundation')
        scope['box']('masonry-bearing',(x,1.6,z),(3.5,3.2,3.5),'masonry')
        scope['box']('masonry-cap',(x,3.52,z),(3.3,.64,3.3),'masonry')
        scope['box']('bearing-plate',(x,3.92,z),(3,.16,3),'dark-iron')
        for dx,dz in [(-.9,-.9),(.9,-.9),(.9,.9),(-.9,.9)]:
            scope['beam']('holding-down-bolt',(x+dx,3.5,z+dz),(x+dx,4.25,z+dz),.08,key='dark-iron')
bpy.context.view_layer.update()

# Preserve the unsplit members as a second, visually identical seated LOD.
# The web may use a source member only after every one of its child pieces is
# seated. This removes internal subdivision faces without altering the solid.
for o in scene.objects:o.select_set(False)
for p in source_parts:
    for oi,o in enumerate(p['_objects']):
        o['wf_source']=f"{p['id']}/member-{oi:03}"
        o.select_set(True)
bpy.context.view_layer.objects.active=source_objects[0]
source_triangles=sum(sum(len(poly.vertices)-2 for poly in o.data.polygons) for o in source_objects)
bpy.ops.export_scene.gltf(filepath=str(MODEL/'tower-kit-seated.glb'),export_format='GLB',
    use_selection=True,use_active_scene=True,export_extras=True,export_yup=True,
    export_materials='EXPORT',export_cameras=False,export_lights=False)

# Blender (x,y,z) -> web (x,z,-y). Canonical cargo is X=width,Y=height,Z=length.
B2W = Matrix(((1,0,0),(0,0,1),(0,-1,0)))
kit_collection = bpy.data.collections.new('ERECTION KIT — bounded rigid parts')
scene.collection.children.link(kit_collection)
parts = []
objects = []
source_audit = []


def vec(v): return [float(x) for x in v]
def quaternion(r):
    q = r.to_quaternion().normalized()
    return [float(q.x),float(q.y),float(q.z),float(q.w)]
def bounds(points):
    return [min(v[k] for v in points) for k in range(3)], [max(v[k] for v in points) for k in range(3)]
def corners(mn,mx):
    return [Vector((x,y,z)) for x in [mn[0],mx[0]] for y in [mn[1],mx[1]] for z in [mn[2],mx[2]]]

def register(o, id, p, source_id, role, center, r, mn, mx, shape='box', local_vertices=None, pickup=None):
    o['wf_part'] = id
    o['wf_material'] = role
    o['wf_source'] = source_id
    objects.append(o)
    pts = local_vertices if local_vertices is not None else corners(mn,mx)
    wb = bounds([r @ Vector(v) + center for v in pts])
    size = [mx[k]-mn[k] for k in range(3)]
    if max(size[0],size[1]) > 2.60001 or size[2] > 6.00001:
        raise ValueError(f'Oversize kit piece {id}: {size}')
    if pickup is None:
        pickup = [[0,mx[1],-size[2]*.22],[0,mx[1],size[2]*.22]]
    stage = p['stage']
    if p['group'] == 'foundation':
        stage = min(.98,round(wb[0][1]/4*.9,5)) if role == 'masonry' else .98
    parts.append({'id':id,'stage':stage,'leg':p['leg'],'group':p['group'],
        'sourceMember':source_id,'sourceGroup':p['id'],'material':role,
        'shape':shape,'handling':'protective-cradle' if role == 'window' else 'two-leg-sling',
        'center':vec(center),'boundsMin':wb[0],'boundsMax':wb[1],
        'finalPose':{'position':vec(center),'quaternion':quaternion(r)},
        'localBounds':{'min':vec(mn),'max':vec(mx)},'transportSize':size,
        'pickupLugs':pickup,
        'connectionAnchors': [[0,0,mn[2]],[0,0,mx[2]]] if role != 'masonry' else
            [[mn[0],mn[1],mn[2]],[mx[0],mn[1],mn[2]],[mx[0],mn[1],mx[2]],[mn[0],mn[1],mx[2]]],
        'connectionKind':'bearing' if role == 'masonry' else 'bolted-joint',
        'requiresAuthoredSupportAndRoute':True})

for p in source_parts:
    for oi, old in enumerate(list(p['_objects'])):
        source_id = f"{p['id']}/member-{oi:03}"
        role = old['wf_material']
        if old.data in unit.values():
            dims = [abs(float(v)) for v in old.scale]
            order = sorted(range(3),key=lambda k:(dims[k],k))
            h,w,l = order
            limits = [0,0,0]
            limits[h]=2.4;limits[w]=2.4;limits[l]=6.0
            if role == 'masonry':
                # Canonical blocks <=1.75 x .8 x .875m: at most ~3 tonnes
                # at a representative 2400 kg/m3 masonry density.
                limits=[1.75,.875,.8] # source box axes are X,Z,Y in Blender
            if p['group']=='foundation' and role!='masonry':
                limits=[1.5,1.5,1.0]
            divisions = [max(1,math.ceil(dims[k]/limits[k]-1e-9)) for k in range(3)]
            d = [dims[k]/divisions[k] for k in range(3)]
            # Reorder again after subdivision so horizontal transport uses
            # the longest actual piece axis, not the uncut source member.
            h,w,l = sorted(range(3),key=lambda k:(d[k],k))
            original_rotation = old.matrix_world.to_quaternion().to_matrix()
            r_b = Matrix([original_rotation.col[w],original_rotation.col[h],original_rotation.col[l]]).transposed()
            if r_b.determinant()<0: r_b.col[1] = -r_b.col[1]
            r_w = B2W @ r_b
            size = [d[w],d[h],d[l]]
            n=0
            for ix in range(divisions[0]):
                for iy in range(divisions[1]):
                    for iz in range(divisions[2]):
                        indices=[ix,iy,iz]
                        uv=Vector([(indices[k]+.5)/divisions[k]-.5 for k in range(3)])
                        center_b=old.matrix_world @ uv
                        id=f"{p['id']}-m{oi:03}-c{n:03}"
                        o=bpy.data.objects.new(id,unit[role]);kit_collection.objects.link(o)
                        o.location=center_b;o.rotation_mode='QUATERNION';o.rotation_quaternion=r_b.to_quaternion();o.scale=size
                        mn=[-v/2 for v in size];mx=[v/2 for v in size]
                        register(o,id,p,source_id,role,B2W@center_b,r_w,mn,mx)
                        n+=1
            source_volume=math.prod(dims)
            tiled_volume=math.prod(d)*n
            if abs(source_volume-tiled_volume)>1e-7*max(1,source_volume):
                raise ValueError(f'Tiling changed volume: {source_id}')
            source_audit.append({'source':source_id,'pieces':n,'sourceVolume':source_volume,
                'tiledVolume':tiled_volume,'divisions':divisions,'partition':'disjoint local-axis intervals'})
        else:
            # The only non-box source is the 24-gore cupola. Partition its
            # existing quad faces, retaining each face exactly once.
            if len(old.data.polygons)!=192:
                raise ValueError(f'Unexpected custom source topology: {old.name}')
            covered=[]
            for j in range(24):
                poly_indices=[i*24+j for i in range(8)]
                covered+=poly_indices
                ids=sorted({v for pi in poly_indices for v in old.data.polygons[pi].vertices})
                lookup={v:i for i,v in enumerate(ids)}
                webpts=[B2W@(old.matrix_world@old.data.vertices[i].co) for i in ids]
                angle=(j+.5)*math.pi/12
                r_w=Matrix(((math.sin(angle),0,math.cos(angle)),(0,1,0),(-math.cos(angle),0,math.sin(angle))))
                local=[r_w.transposed()@v for v in webpts]
                mn0,mx0=bounds(local);offset=Vector([(a+b)/2 for a,b in zip(mn0,mx0)])
                center=r_w@offset
                local=[v-offset for v in local];mn,mx=bounds(local)
                # Radial extent is length; vertical extent remains cargo height.
                mesh=bpy.data.meshes.new(f'cupola-gore-{j:02}')
                mesh.from_pydata([vec(B2W.transposed()@v) for v in webpts],[],
                    [tuple(lookup[v] for v in old.data.polygons[pi].vertices) for pi in poly_indices])
                mesh.materials.append(scope['materials'][role]);mesh.update()
                id=f"{p['id']}-m{oi:03}-g{j:02}"
                o=bpy.data.objects.new(id,mesh);kit_collection.objects.link(o)
                register(o,id,p,source_id,role,center,r_w,mn,mx,'cupola-gore',local,
                    [vec(local[0]),vec(local[1])])
            if sorted(covered)!=list(range(len(old.data.polygons))):
                raise ValueError('Cupola face partition is incomplete or duplicated')
            source_audit.append({'source':source_id,'pieces':24,'faces':len(covered),'partition':'original quad faces exactly once'})
        bpy.data.objects.remove(old,do_unlink=True)

bpy.context.view_layer.update()
for o in scene.objects:o.select_set(False)
for o in objects:o.select_set(True)
bpy.context.view_layer.objects.active=objects[0]
parts.sort(key=lambda p:(p['stage'],p['id']))
triangles=sum(sum(len(poly.vertices)-2 for poly in o.data.polygons) for o in objects)
manifest={'schemaVersion':2,'height':312,'base':125,'parts':parts,
    'metadata':{'author':'WonderForge original Blender construction kit','period':'1889',
      'units':'metres','coordinates':'Y up; canonical cargo X width, Y height, Z length',
      'triangles':triangles,'meshNodes':len(objects),'maxTransportSize':[2.6,2.6,6],
      'seatedAsset':'tower-kit-seated.glb','seatedTriangles':source_triangles,
      'foundationBearings':16,'constructionReady':False,
      'remainingGates':['authored structural dependencies','supported crane stations','clear rigid routes','browser performance'],
      'sourceScript':'scripts/blender_eiffel_construction_kit.py'}}
(MODEL/'tower-kit.manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
bpy.ops.export_scene.gltf(filepath=str(MODEL/'tower-kit.glb'),export_format='GLB',
    use_selection=True,use_active_scene=True,export_extras=True,export_yup=True,
    export_materials='EXPORT',export_cameras=False,export_lights=False)
bpy.data.libraries.write(str(OUT/'eiffel-tower.blend'), {scene}, fake_user=True)
(OUT/'partition-audit.json').write_text(json.dumps(source_audit,indent=2)+'\n')
summary={'scene':scene.name,'assemblies':len(parts),'meshNodes':len(objects),'triangles':triangles,
    'seatedTriangles':source_triangles,
    'glbBytes':(MODEL/'tower-kit.glb').stat().st_size,'foundationBearings':16,
    'maxTransportSize':[max(p['transportSize'][k] for p in parts) for k in range(3)],
    'blender':bpy.app.version_string,'constructionReady':False}
(OUT/'build-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
print('BOUNDED EIFFEL KIT COMPLETE',json.dumps(summary))
