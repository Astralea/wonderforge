"""Stationary, preassembled cart fastening envelope; actual Blender MCP only."""
import bpy, json, math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/eiffel-cart-fastening-recovered-2026-09-08'
for d in ('model','blender'):(OUT/d).mkdir(exist_ok=True)
scene=bpy.data.scenes.new('WonderForge — cart fastening study');bpy.context.window.scene=scene
# Append copies from existing saved Blender assets, preserving every earlier scene.
def append_tree(path,root_name):
 source_scene={'stock-cart':'WonderForge — first-floor transfer bridge','long-load-carrier':'WonderForge — real long-load lifting carrier'}[root_name]
 with bpy.data.libraries.load(str(path),link=False) as (source,dest):
  if source_scene not in source.scenes:raise RuntimeError('Missing named source scene: '+source_scene)
  dest.scenes=[source_scene]
 objs=list(dest.scenes[0].objects);root=next(o for o in objs if o.get('wf_role')==root_name)
 keep=[root]+list(root.children_recursive)
 for o in keep:scene.collection.objects.link(o)
 return root
cart=append_tree(ROOT/'artifacts/eiffel-first-floor-transfer-2026-09-08/blender/eiffel-first-floor-bridge.blend','stock-cart');cart.location=(0,0,0)
carrier=append_tree(ROOT/'artifacts/eiffel-long-load-carrier-2026-09-08/blender/eiffel-long-load-carrier.blend','long-load-carrier');carrier.location=(0,0,.34)
shoe=next(o for o in carrier.children if o.get('wf_role')=='bottom-shoe');bed=next(o for o in cart.children if o.name.startswith('cart-bed'));bed['wf_role']='cart-bed'
iron=shoe.data.materials[0]
def vec(v):return Vector((v[0],-v[2],v[1]))
def box(name,c,size):
 bpy.ops.mesh.primitive_cube_add(size=1,location=vec(c));o=bpy.context.object;o.name=name;o.dimensions=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(iron);o['wf_role']=name;return o
def cyl(name,c,r,h,segments=48):
 bpy.ops.mesh.primitive_cylinder_add(vertices=segments,radius=r,depth=h,location=vec(c));o=bpy.context.object;o.name=name;o.data.materials.append(iron);o['wf_role']=name;return o
def cut(target,cutter):
 cutter.data.materials.clear();cutter.data.materials.append(target.data.materials[0])
 bpy.context.view_layer.objects.active=target;mod=target.modifiers.new('Actual through bore','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='MANIFOLD';mod.object=cutter;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True)
# Rebuild copied collars: the old .37 outline touched the rod bores tangentially.
for height in (1.25,4.75):
 old=next(o for o in carrier.children if o.get('wf_role')==f'lateral-collar-{height}')
 bpy.data.objects.remove(old,do_unlink=True)
 collar=box(f'lateral-collar-{height}',[0,height+.34,0],[.40,.06,.40])
 payload=next(o for o in carrier.children if o.get('wf_role')=='actual-payload')
 cut(collar,box('payload-bore',[0,height+.34,0],[payload.dimensions.x,.10,payload.dimensions.y]))
 for x in (-.17,.17):
  for z in (-.17,.17):cut(collar,cyl('rod-bore',[x,height+.34,z],.015,.10,32))
 collar.parent=carrier;collar.location.z-=.34
plate=box('underside-spreader',[0,.23,0],[.6,.02,.6]);points=[[-.16,0],[.16,0],[0,-.16],[0,.16]]
for i,(x,z) in enumerate(points):
 for target in (shoe,bed,plate):cut(target,cyl('bore-cutter',[x,.32,z],.010,.4))
 shaft=cyl(f'fastener-shaft-{i}',[x,.31,z],.009,.24)
 for label,y in [('top',.425),('bottom',.215)]:
  washer=cyl(f'{label}-washer-{i}',[x,y,z],.024,.01);cut(washer,cyl('washer-bore',[x,y,z],.010,.04))
 head=cyl(f'bolt-head-{i}',[x,.438,z],.018,.016,6)
 nut=cyl(f'bottom-nut-{i}',[x,.200,z],.019,.020,6);cut(nut,cyl('nut-bore',[x,.2,z],.009,.04))
for o in scene.objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'model/cart-fastening.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_extras=True,export_yup=True,export_animations=False)
bpy.data.libraries.write(str(OUT/'blender/eiffel-cart-fastening.blend'),{scene},fake_user=True)
# Separate corrected carrier for the existing live hoist, without cart hardware.
for o in scene.objects:o.select_set(False)
for o in [carrier]+list(carrier.children_recursive):o.select_set(True)
carrier.location.z=0
bpy.ops.export_scene.gltf(filepath=str(OUT/'model/long-load-carrier-corrected.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_extras=True,export_yup=True,export_animations=False)
carrier.location.z=.34
design={'collarOuterWidth':.40,'collarThickness':.06,'collarRodRadius':.015,'collarRodCenter':.17,'fastenerXZ':points,'shaftRadius':.009,'boreRadius':.010,'cartBed':[.24,.34],'shoe':[.34,.42],'spreader':[.22,.24],'topWasher':[.42,.43],'bottomWasher':[.21,.22],'head':[.43,.446],'nut':[.19,.21],'shaft':[.19,.43],'carrierOrigin':[0,.34,0],'productionReady':False,'limits':['Stationary preassembled geometry only; not a fastening animation.','Smooth shaft and bored nut envelope: threads, preload and strength unresolved.','Cart stability, operator access and release remain unadmitted.']}
(OUT/'design.json').write_text(json.dumps(design,indent=2)+'\n')
result={'scene':scene.name,'objects':len(scene.objects),'blend':str(OUT/'blender/eiffel-cart-fastening.blend'),'productionReady':False}
