import bpy,json,math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/eiffel-closed-sling-2026-09-08'
d=json.loads((OUT/'design.json').read_text());scene=bpy.data.scenes.new('WonderForge — closed long-load sling assembly');bpy.context.window.scene=scene
for p in ('model','blender'):(OUT/p).mkdir(exist_ok=True)
def material(name,c):
 m=bpy.data.materials.new(name);m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*c,1);b.inputs['Roughness'].default_value=.85;return m
iron=material('Forged master link',(.16,.17,.13));fiber=material('Rope eyes',(.085,.072,.05))
bpy.ops.mesh.primitive_torus_add(major_segments=96,minor_segments=24,major_radius=d['ringRadius'],minor_radius=d['barRadius'],location=(0,0,0),rotation=(math.pi/2,0,0));ring=bpy.context.object;ring.name='master-link';ring['wf_role']='master-link';ring.data.materials.append(iron)
def curve(name,points):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=d['ropeRadius'];c.bevel_resolution=2;c.resolution_u=1;c.use_fill_caps=True;s=c.splines.new('POLY');s.points.add(len(points)-1)
 for p,v in zip(s.points,points):p.co=(v[0],-v[2],v[1],1)
 o=bpy.data.objects.new(name,c);scene.collection.objects.link(o);c.materials.append(fiber);o['wf_role']=name
 bpy.context.view_layer.objects.active=o;o.select_set(True);ring.select_set(False);bpy.ops.object.convert(target='MESH');o.select_set(False)
curve('upper-rope-eye',d['upperEye']['points'])
for i,s in enumerate(d['strands']):curve(f'lower-rope-eye-{i}',s['eye']['points']);curve(f'sling-leg-{i}',s['line']);curve(f'carrier-rope-eye-{i}',s['carrierEye']['points'])
root=bpy.data.objects.new('master-link-assembly',None);root['wf_role']='master-link-assembly';root['productionReady']=False;scene.collection.objects.link(root)
for o in list(scene.objects):
 if o!=root:o.parent=root
for o in scene.objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'model/closed-sling.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_extras=True,export_yup=True,export_animations=False)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'blender/eiffel-closed-sling.blend'))
result={'scene':scene.name,'objects':len(scene.objects),'blend':str(OUT/'blender/eiffel-closed-sling.blend'),'productionReady':False}
