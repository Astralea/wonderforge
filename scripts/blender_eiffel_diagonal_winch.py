"""Fixed redirect and supported drum; power/erection are separate gates."""
import bpy,bmesh,json,math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/eiffel-diagonal-winch-2026-09-08';design=json.loads((OUT/'design.json').read_text())
scene=bpy.data.scenes.new('WonderForge — diagonal fixed winch');bpy.context.window.scene=scene
for name in ('model','blender'):(OUT/name).mkdir(exist_ok=True)
def mat(name,c):
 m=bpy.data.materials.new(name);m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*c,1);b.inputs['Roughness'].default_value=.78;return m
iron=mat('Winch iron',(.12,.14,.12));bronze=mat('Winch shaft bronze',(.33,.24,.10))
def vec(p):return (p[0],-p[2],p[1])
def group(name,p,parent=None):
 o=bpy.data.objects.new(name,None);scene.collection.objects.link(o);o.parent=parent;o.location=vec(p);o['wf_role']=name;return o
root=group('fixed-winch',[-8.5,0,-4]);root.rotation_euler.z=math.atan2(-design['direction'][1],design['direction'][0])
faces=[[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]]
def box(name,c,size,parent=root):
 m=bpy.data.meshes.new(name);m.from_pydata([vec([c[0]+u*size[0]/2,c[1]+y*size[1]/2,c[2]+v*size[2]/2]) for u in (-1,1) for y in (-1,1) for v in (-1,1)],[],faces);m.update();bm=bmesh.new();bm.from_mesh(m);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(m);bm.free();o=bpy.data.objects.new(name,m);scene.collection.objects.link(o);o.parent=parent;m.materials.append(iron);o['wf_part']=name;return o
def cylinder(name,c,r,length,parent=root,material=iron):
 bpy.ops.mesh.primitive_cylinder_add(vertices=48,radius=r,depth=length);o=bpy.context.object;o.name=name;o.parent=parent;o.location=vec(c);o.rotation_euler.x=math.pi/2;o.data.materials.append(material);o['wf_part']=name;return o
def bore(o,c,r,length,parent=root):
 cutter=cylinder('bore cutter',c,r,length,parent);bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Shaft bore','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='MANIFOLD';mod.object=cutter;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True)
for shape in design['shapes']:
 o=box(shape['id'],shape['localCenter'],shape['size']);o['wf_source_id']=shape['id']
 if shape['id'].startswith('winch-bearing'):bore(o,[design['drum'][0],design['drum'][1],shape['localCenter'][2]],.057,.24)
drum=group('drum',design['drum'],root);cylinder('drum-core',[0,0,0],.292,.95,drum)
for v in (-.49,.49):cylinder('drum-flange',[0,0,v],.36,.035,drum)
cylinder('drum-shaft',design['drum'],.055,1.55,root,bronze)
fixed=group('fixed-sheave',design['guide'],root)
for name,c,r,depth in [('guide-groove',[0,0,0],.242,.12),('guide-flange',[0,0,-.075],.28,.025),('guide-flange',[0,0,.075],.28,.025)]:
 o=cylinder(name,c,r,depth,fixed);bore(o,[0,0,0],.037,.25,fixed)
for v in (-.14,.14):
 c=[design['guide'][0],121.52,v];hanger=box('guide-hanger',c,[.12,.60,.06]);bore(hanger,[c[0],121.35,v],.037,.15)
cylinder('guide-shaft',design['guide'],.035,.4,root,bronze)
for o in scene.objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'model/diagonal-winch.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_extras=True,export_yup=True,export_animations=False,export_lights=False,export_cameras=False)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'blender/eiffel-diagonal-winch.blend'))
result={'scene':scene.name,'objects':len(scene.objects),'blend':str(OUT/'blender/eiffel-diagonal-winch.blend'),'productionReady':False,'scope':'fixed guide/drum geometry; no power/brake/anchorage'}
