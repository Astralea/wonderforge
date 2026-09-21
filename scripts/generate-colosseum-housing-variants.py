#!/usr/bin/env python3
"""Original Roman housing silhouettes, authored without external model inputs.

Run: /Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/generate-colosseum-housing-variants.py
Shared dimensions live in src/data/colosseumHousing.ts. No archaeological
survey or exact AD 80 building elevations are asserted by this kit.
"""
from pathlib import Path
import hashlib
import json
import re
import bpy
import bmesh
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts/colosseum-sun-city-2026-09-20/blender'
GLB = ROOT / 'public/models/colosseum-rome/housing-variants.glb'
SOURCE = ROOT / 'src/data/colosseumHousing.ts'
PROFILES = json.loads(re.search(r'COLOSSEUM_HOUSING = (\[.*?\]) as const;', SOURCE.read_text(), re.S).group(1))

bpy.ops.wm.read_factory_settings(use_empty=True)
OUT.mkdir(parents=True, exist_ok=True)
GLB.parent.mkdir(parents=True, exist_ok=True)

COLORS = {'plaster': (0.62, 0.55, 0.43), 'brick': (0.39, 0.24, 0.15), 'tile': (0.40, 0.15, 0.08), 'stone': (0.44, 0.40, 0.31), 'void': (0.032, 0.030, 0.027)}
MATS = {}
for key, rgb in COLORS.items():
    mat = bpy.data.materials.new(key)
    mat.diffuse_color = (*rgb, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*rgb, 1)
    bsdf.inputs['Roughness'].default_value = .92
    MATS[key] = mat

def mesh_object(name, verts, faces, role, root):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(MATS[role])
    obj.parent = root
    return obj

def box(name, x, z, y, w, d, h, role, root):
    # Blender Z up; glTF exporter converts to the runtime Y-up basis.
    verts = [(x+sx*w/2, -z+sz*d/2, y+sy*h/2) for sy in [-1,1] for sz in [-1,1] for sx in [-1,1]]
    faces = [(0,2,3,1),(4,5,7,6),(0,1,5,4),(2,6,7,3),(0,4,6,2),(1,3,7,5)]
    return mesh_object(name, verts, faces, role, root)

def hip(name, wing, root):
    x,z,h=wing['x'],-wing['z'],wing['height']
    w,d=(wing['width']+.42)/2,(wing['depth']+.42)/2
    ridge=min(w,d)*.42
    verts=[(x-w,z-d,h),(x+w,z-d,h),(x+w,z+d,h),(x-w,z+d,h),(x-ridge,z,h+wing['roof']),(x+ridge,z,h+wing['roof'])]
    mesh_object(name, verts, [(0,1,5,4),(1,2,5),(2,3,4,5),(3,0,4)], 'tile', root)

def front_opening(name, x, z, y, w, h, root):
    # Both sides visible as outward-facing polygon pairs, no hidden box faces.
    for sign in [-1,1]:
        zz=-sign*z
        verts=[(x-w/2,zz,y-h/2),(x+w/2,zz,y-h/2),(x+w/2,zz,y+h/2),(x-w/2,zz,y+h/2)]
        if sign < 0: verts.reverse()
        mesh_object(f'{name}-{sign}',verts,[(0,1,2,3)],'void',root)

for profile in PROFILES:
    root = bpy.data.objects.new('housing-'+profile['id'],None)
    bpy.context.collection.objects.link(root)
    box(profile['id']+'-plinth-stone',0,0,.12,10.5,8.45,.24,'stone',root)
    for i, wing in enumerate(profile['wings']):
        role = 'brick' if profile['id']=='corner' and i==0 else 'plaster'
        box(f"{profile['id']}-{role}-wing-{i}",wing['x'],wing['z'],wing['height']/2,wing['width'],wing['depth'],wing['height'],role,root)
        hip(f"{profile['id']}-roof-{i}",wing,root)
        # Readable storey marks only on genuinely external north/south faces.
        for side in [-1,1]:
            face_z=wing['z']+side*(wing['depth']/2+.015)
            if abs(face_z) < 3.85: continue
            levels=max(1,round(wing['height']/3))
            for level in range(levels):
                for offset in [-.24,.24]:
                    x=wing['x']+wing['width']*offset
                    y=1.25+level*2.7
                    hh=1.3 if level else (2.25 if profile['id']=='frontage' else 1.5)
                    ww=1.2 if profile['id']=='frontage' and level==0 else .75
                    z=-face_z
                    verts=[(x-ww/2,z,y-hh/2),(x+ww/2,z,y-hh/2),(x+ww/2,z,y+hh/2),(x-ww/2,z,y+hh/2)]
                    if side<0: verts.reverse()
                    mesh_object(f"{profile['id']}-window-{i}-{side}-{level}-{offset}",verts,[(0,1,2,3)],'void',root)

# Save editable source, then export only the four named asset roots and their children.
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'colosseum-housing-variants-v1.blend'))
bpy.ops.export_scene.gltf(filepath=str(GLB),export_format='GLB',export_apply=True,export_yup=True,export_materials='EXPORT',export_cameras=False,export_lights=False)
manifest={'asset':str(GLB.relative_to(ROOT)),'source':str((OUT/'colosseum-housing-variants-v1.blend').relative_to(ROOT)),'script':str(Path(__file__).relative_to(ROOT)),'shared_dimensions':str(SOURCE.relative_to(ROOT)),'provenance':'Original authored Blender meshes; no downloads, image generation or external models. Schematic compressed residential forms, not surveyed ancient Rome.','blender':bpy.app.version_string,'runtime_axes':'+X east, +Y up, +Z north; one unit is one metre','footprint':{'half_width':5.5,'half_depth':4.6,'clearance_radius':7.4},'variants':[]}
for profile in PROFILES:
    root=bpy.data.objects['housing-'+profile['id']]
    verts=[obj.matrix_world@v.co for obj in root.children if obj.type=='MESH' for v in obj.data.vertices]
    tris=sum(sum(len(p.vertices)-2 for p in obj.data.polygons) for obj in root.children if obj.type=='MESH')
    manifest['variants'].append({'id':profile['id'],'label':profile['label'],'triangles':tris,'runtime_bounds':{'min':[min(v.x for v in verts),min(v.z for v in verts),-max(v.y for v in verts)],'max':[max(v.x for v in verts),max(v.z for v in verts),-min(v.y for v in verts)]},'wings':profile['wings']})
manifest['bytes']=GLB.stat().st_size
manifest['sha256']=hashlib.sha256(GLB.read_bytes()).hexdigest()
(OUT.parent/'housing.manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest,indent=2))
