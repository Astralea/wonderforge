"""Mobile LOD authored via Blender MCP, preserving roles, contacts and full LOD."""
import bpy,bmesh,json,math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/eiffel-long-load-onward-2026-09-08'
d=json.loads((OUT/'design.json').read_text());sling=json.loads((ROOT/'artifacts/eiffel-closed-sling-2026-09-08/design.json').read_text())
def append(path,prefix):
 with bpy.data.libraries.load(str(path),link=False) as(src,dst):
  names=[s for s in src.scenes if s.startswith(prefix)];assert len(names)==1;dst.scenes=names
 return dst.scenes[0]
def save(scene,stem):
 bpy.context.window.scene=scene;bpy.ops.object.select_all(action='SELECT')
 bpy.ops.export_scene.gltf(filepath=str(OUT/'model'/f'{stem}.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_extras=True,export_yup=True,export_animations=False,export_lights=False,export_cameras=False)
 bpy.data.libraries.write(str(OUT/'blender'/f'eiffel-{stem}.blend'),{scene},fake_user=True)
scene=append(OUT/'blender/eiffel-long-load-onward.blend','WonderForge — long-load onward hardware');scene.name='WonderForge — mobile onward hardware';bpy.context.window.scene=scene
parts={f'{prefix}-{p["id"]}':p for prefix in d['workers']['prefixes'] for p in d['workers']['parts']}
replaced=0
for o in scene.objects:
 role=o.parent.get('wf_role') if o.parent else None
 if o.type=='MESH' and role in parts:
  size=parts[role]['size'];m=bpy.data.meshes.new(o.name+' mobile');bm=bmesh.new();bmesh.ops.create_cube(bm,size=1)
  for v in bm.verts:v.co.x*=size[0];v.co.y*=size[2];v.co.z*=size[1]
  bm.to_mesh(m);bm.free()
  for material in o.data.materials:m.materials.append(material)
  o.data=m;replaced+=1
assert replaced==72
save(scene,'onward-mobile')

source=append(OUT/'blender/eiffel-retained-sling.blend','WonderForge — retained lower sling')
iron=next(o.data.materials[0] for o in source.objects if o.get('wf_role')=='master-link');fiber=next(o.data.materials[0] for o in source.objects if o.get('wf_role')=='sling-leg-0')
scene=bpy.data.scenes.new('WonderForge — mobile retained sling');bpy.context.window.scene=scene
root=bpy.data.objects.new('master-link-assembly',None);root['wf_role']='master-link-assembly';scene.collection.objects.link(root)
bpy.ops.mesh.primitive_torus_add(major_segments=32,minor_segments=8,major_radius=sling['ringRadius'],minor_radius=sling['barRadius'],rotation=(math.pi/2,0,0))
o=bpy.context.object;o.name='master-link';o['wf_role']='master-link';o.parent=root;o.data.materials.append(iron)
def curve(name,points):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=sling['ropeRadius'];c.bevel_resolution=1;c.resolution_u=1;c.use_fill_caps=True;p=c.splines.new('POLY');p.points.add(len(points)-1)
 for point,v in zip(p.points,points):point.co=(v[0],-v[2],v[1],1)
 o=bpy.data.objects.new(name,c);scene.collection.objects.link(o);o.parent=root;o['wf_role']=name;c.materials.append(fiber)
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH')
for i,strand in enumerate(sling['strands']):
 curve(f'lower-rope-eye-{i}',strand['eye']['points']);curve(f'sling-leg-{i}',strand['line']);curve(f'carrier-rope-eye-{i}',strand['carrierEye']['points'])
save(scene,'closed-sling-mobile')
result={'mobileWorkerMeshes':replaced,'retainedSlingRoles':13,'ringSegments':[32,8],'ropeCrossSectionVertices':8,'desktopAssetsUnchanged':True,'outputs':['onward-mobile.glb','closed-sling-mobile.glb']}
