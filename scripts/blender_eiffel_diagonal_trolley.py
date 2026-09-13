"""Empty trolley mechanical fit; no drive or cargo lifting claim."""
import bpy,bmesh,json,math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/eiffel-diagonal-trolley-2026-09-08'
design=json.loads((ROOT/'artifacts/eiffel-diagonal-receiver-2026-09-08/design.json').read_text())
scene=bpy.data.scenes.new('WonderForge — diagonal trolley fit');bpy.context.window.scene=scene
for name in ('model','blender'):(OUT/name).mkdir(exist_ok=True)
def material(name,c):
 m=bpy.data.materials.new(name);m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*c,1);b.inputs['Roughness'].default_value=.75;return m
iron=material('Trolley iron',(.12,.14,.12));bronze=material('Trolley wheel bronze',(.32,.23,.10))
def vec(p):return (p[0],-p[2],p[1])
root=bpy.data.objects.new('diagonal-trolley',None);scene.collection.objects.link(root);root.location=vec([-8.5,121.495,-4]);root.rotation_euler.z=math.atan2(-design['direction'][1],design['direction'][0]);root['wf_role']='diagonal-trolley'
faces=[[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]]
def box(name,c,size):
 m=bpy.data.meshes.new(name);m.from_pydata([vec([c[0]+u*size[0]/2,c[1]+y*size[1]/2,c[2]+v*size[2]/2]) for u in (-1,1) for y in (-1,1) for v in (-1,1)],[],faces);m.update();bm=bmesh.new();bm.from_mesh(m);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(m);bm.free();o=bpy.data.objects.new(name,m);scene.collection.objects.link(o);o.parent=root;m.materials.append(iron);o['wf_part']=name;return o
def cylinder(name,c,r,length,mat=iron):
 bpy.ops.mesh.primitive_cylinder_add(vertices=48,radius=r,depth=length);o=bpy.context.object;o.name=name;o.parent=root;o.location=vec(c);o.rotation_euler.x=math.pi/2;o.data.materials.append(mat);o['wf_part']=name;return o
for u in (-.30,.30):
 axle=cylinder('trolley-axle',[u,0,0],.025,1.02)
 for v in (-.35,.35):
  wheel=cylinder('trolley-wheel',[u,0,v],.115,.08,bronze);wheel['wf_role']='trolley-wheel';wheel['radius']=.115
  cutter=cylinder('wheel bore',[u,0,v],.027,.12)
  bpy.context.view_layer.objects.active=wheel;mod=wheel.modifiers.new('Axle bore','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='MANIFOLD';mod.object=cutter;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True)
 for v in (-.47,.47):
  bearing=box('axle-bearing',[u,.07,v],[.12,.28,.08]);cutter=cylinder('bearing bore',[u,0,v],.027,.15)
  bpy.context.view_layer.objects.active=bearing;mod=bearing.modifiers.new('Axle bearing bore','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='MANIFOLD';mod.object=cutter;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True)
box('trolley-topplate',[0,.21,0],[.72,.06,1.02])
for v in (-.14,.14):
 hanger=box('sheave-hanger',[0,.025,v],[.12,.44,.06]);cutter=cylinder('hanger bore',[0,-.145,v],.037,.12)
 bpy.context.view_layer.objects.active=hanger;mod=hanger.modifiers.new('Sheave shaft bore','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='MANIFOLD';mod.object=cutter;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True)
cylinder('sheave-shaft',[0,-.145,0],.035,.4,bronze)
sheave=cylinder('sheave-groove',[0,-.145,0],.242,.12);sheave['wf_role']='sheave'
for v in (-.075,.075):cylinder('sheave-flange',[0,-.145,v],.28,.025)
for part in [o for o in scene.objects if o.get('wf_part') in ('sheave-groove','sheave-flange')]:
 cutter=cylinder('sheave bore',[0,-.145,0],.037,.24)
 bpy.context.view_layer.objects.active=part;mod=part.modifiers.new('Sheave bore','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='MANIFOLD';mod.object=cutter;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True)
for o in scene.objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'model/diagonal-trolley.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_extras=True,export_yup=True,export_animations=False,export_lights=False,export_cameras=False)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'blender/eiffel-diagonal-trolley.blend'))
result={'scene':scene.name,'objects':len(scene.objects),'blend':str(OUT/'blender/eiffel-diagonal-trolley.blend'),'productionReady':False,'scope':'empty trolley fit; no drive or rope'}
