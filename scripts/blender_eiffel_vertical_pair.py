"""Photo/engraving-led vertical Guyenet pair study, authored via actual MCP.
Reuses the existing articulated crane components, not a production admission.
"""
import bpy,json,math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/eiffel-summit-rigging-2026-09-08'
for f in ('blender','model','renders'):(OUT/f).mkdir(parents=True,exist_ok=True)
# Reuse only the geometry stage; avoid its standalone export/studio/save.
source=ROOT/'scripts/blender_eiffel_guyenet.py'
scope={'__file__':str(source),'WF_GUYENET_OUTPUT':str(OUT/'blender'),
 'WF_GUYENET_MODEL':str(OUT/'model'),'WF_GUYENET_SPEC':str(OUT/'vertical-pair-spec.json'),
 'WF_GUYENET_DISPLAY_GUIDES':False}
exec(compile(source.read_text().split('# Export clean reusable asset')[0],str(source),'exec'),scope)
scene=scope['scene'];collection=scope['collection'];roles=scope['roles'];root=scope['root'];Batch=scope['Batch']
scene.name='WonderForge — vertical paired cranes after Watson'
roles['rotor'].rotation_euler.z=math.pi
original=list(collection.all_objects);copies={}
for obj in original:
 copied=obj.copy();copied.name=obj.name+' — opposite crane';collection.objects.link(copied);copies[obj]=copied
for obj,copied in copies.items():copied.parent=copies.get(obj.parent)
copies[root].rotation_euler.z=math.pi
root['wf_crane_side']='south';copies[root]['wf_crane_side']='north'
root['wf_production_ready']=False;copies[root]['wf_production_ready']=False
# Central vertical guide pillars. The lower stub is a studio boundary, not an
# assertion that an elevator pillar can stand independently on a timber pad.
b=Batch()
for x in (-1.4,1.4):
 for z in (-.65,.65):b.beam('iron',(x,-7,z),(x,13,z),.09)
 for i in range(20):
  y=-7+i
  b.beam('iron',(x,y,-.65),(x,y+1,.65),.045)
  b.beam('iron',(x,y,.65),(x,y+1,-.65),.045)
for y in (-7,-4,-1,2,5,8,11,13):
 for z in (-.65,.65):b.beam('iron',(-1.4,y,z),(1.4,y,z),.075)
scope['finish'](b,'shared-vertical-guide-pillars',None)
# Three auxiliary rectangular frames, each 3 m high, form the 9 m climbing road.
for i in range(3):
 y=-6+3*i;b=Batch()
 for x in (-1.62,1.62):
  for z in (-.86,.86):b.beam('edge',(x,y,z),(x,y+3,z),.065)
 for h in (y,y+3):
  for z in (-.86,.86):b.beam('iron',(-1.62,h,z),(1.62,h,z),.085)
  for x in (-1.62,1.62):b.beam('iron',(x,h,-.86),(x,h,.86),.085)
 for x in (-1.62,1.62):
  b.beam('iron',(x,y,-.86),(x,y+3,.86),.04)
  b.beam('iron',(x,y,.86),(x,y+3,-.86),.04)
 scope['finish'](b,f'auxiliary-frame-{i}',None)
# Pack the actual reference pages, with explicit source identifiers.
for page in (345,347):
 ref=bpy.data.images.load(str(OUT/f'watson-{page}.png'),check_existing=False);ref.pack()
 ref['source']='William Watson, Civil engineering... Paris Universal Exposition1889, GPO1892, pp823–824/Fig239/PlateXVI'
scene['reference']='https://archive.org/details/civilengineering00wats'
scene['production_ready']=False
scene['limits']='Mechanism study only. No installed tower support, climbing lifecycle, load, rope or clearance admission.'
for obj in scene.objects:obj.select_set(False)
for obj in collection.all_objects:obj.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=str(OUT/'model/vertical-pair.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_extras=True,export_yup=True,export_animations=False,export_lights=False,export_cameras=False)
world=bpy.data.worlds.new('Vertical pair studio');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.29,.34,.4,1);world.node_tree.nodes['Background'].inputs[1].default_value=.65;scene.world=world
light=bpy.data.lights.new('Pair key light','SUN');light.energy=3;light.angle=.1
sun=bpy.data.objects.new('Pair key light',light);scene.collection.objects.link(sun);sun.rotation_euler=(.6,-.5,-.6)
camera=bpy.data.cameras.new('Watson pair review');cam=bpy.data.objects.new('Watson pair review',camera);scene.collection.objects.link(cam);scene.camera=cam
cam.location=(24,-32,21);cam.rotation_euler=(Vector((0,0,3))-cam.location).to_track_quat('-Z','Y').to_euler();camera.type='ORTHO';camera.ortho_scale=32
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.render.threads_mode='FIXED';scene.render.threads=12
scene.render.resolution_x=1500;scene.render.resolution_y=1200;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX'
result={'scene':scene.name,'blend':str(OUT/'blender/eiffel-vertical-pair.blend'),'cranes':2,'auxiliaryFrames':3,'frameHeight':3,'productionReady':False,'source':'Watson GPO1892 pp823–824, Fig239 and PlateXVI','limits':scene['limits']}
(OUT/'model/vertical-pair.manifest.json').write_text(json.dumps(result,indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=result['blend'])
scene.render.filepath=str(OUT/'renders/vertical-pair.png');bpy.ops.render.render(write_still=True)
