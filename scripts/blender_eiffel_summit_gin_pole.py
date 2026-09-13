"""Compact mast-clamped erection rig: actual Blender candidate, not admitted.

Source geometry is fixed. A supported climbing sequence and initial freight
handoff remain necessary before replacing production equipment with this asset.
"""
import bpy, math, json
from pathlib import Path
from mathutils import Vector, Quaternion
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/eiffel-summit-assembly-2026-09-08'
scene=bpy.data.scenes.new('WonderForge — compact mast-clamped gin pole')
bpy.context.window.scene=scene
def v(p):return Vector((p[0],-p[2],p[1]))
def mat(name,color,metal=0):
 m=bpy.data.materials.new('Gin pole '+name);m.use_nodes=True;p=m.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=.78;p.inputs['Metallic'].default_value=metal;return m
iron=mat('wrought iron',(.095,.105,.089),.3);timber=mat('seasoned timber',(.28,.19,.095));ropeMat=mat('hemp rope',(.32,.27,.18))
def root(name,p=(0,0,0),parent=None):
 o=bpy.data.objects.new(name,None);scene.collection.objects.link(o);o['wf_role']=name;o.location=v(p);o.parent=parent;return o
def box(name,p,size,material=iron,parent=None):
 bpy.ops.mesh.primitive_cube_add(size=1);o=bpy.context.object;o.name=name;o.dimensions=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.location=v(p);o.parent=parent;o.data.materials.append(material);return o
def beam(name,a,b,r=.02,material=iron,parent=None,n=10):
 delta=v(b)-v(a);bpy.ops.mesh.primitive_cylinder_add(vertices=n,radius=r,depth=delta.length);o=bpy.context.object;o.name=name;o.location=(v(a)+v(b))/2;o.rotation_mode='QUATERNION';o.rotation_quaternion=Vector((0,0,1)).rotation_difference(delta.normalized());o.parent=parent;o.data.materials.append(material);return o
rig=root('gin-pole-station')
pole=box('fixed-six-metre-pole',(-.9,3,0),(.13,6,.13),timber,rig)
for y in (.2,1.4):
 collar=root('mast-collar-'+str(y),(0,y,0),rig)
 # Four solid strips make an open square bore, never a block through the mast.
 for z in (-.11,.11):box('collar-cheek',(0,0,z),(.26,.16,.04),parent=collar)
 for x in (-.11,.11):box('collar-return',(x,0,0),(.04,.16,.18),parent=collar)
 for x in (-.145,.145):
  for z in (-.11,.11):
   box('split-clamp-flange',(x,0,z),(.03,.16,.06),parent=collar)
  beam('clamp-bolt',(x,0,-.15),(x,0,.15),.009,parent=collar,n=6)
 for z in (-.13,.13):
  beam('forked-collar-stay',(-.13,0,z),(-.9,0,math.copysign(.065,z)),.02,parent=collar)
  beam('forked-collar-diagonal',(-.13,.065,z),(-.9,-.16,math.copysign(.065,z)),.016,parent=collar)
 # Pole straps are closed bands attached to the same forked support frame.
 for x in (-.985,-.815):box('pole-strap',(x,0,0),(.04,.12,.21),parent=collar)
 for z in (-.085,.085):box('pole-strap-return',(-.9,0,z),(.13,.12,.04),parent=collar)
jib=root('gin-pole-jib',(-.9,6,0),rig)
for z in (-.06,.06):beam('fixed-jib-chord',(0,0,z),(3,0,z),.028,parent=jib)
for i in range(6):
 beam('jib-web',(i*.5,0,-.06),((i+1)*.5,0,.06),.014,parent=jib)
 beam('jib-web',(i*.5,0,.06),((i+1)*.5,0,-.06),.014,parent=jib)
beam('jib-head-pin',(3,0,-.085),(3,0,.085),.04,parent=jib)
beam('jib-heel-pin',(0,0,-.085),(0,0,.085),.05,parent=jib)

bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'model/summit-gin-pole-candidate.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_extras=True,export_yup=True,export_animations=False,export_lights=False,export_cameras=False)
bpy.data.libraries.write(str(OUT/'blender/eiffel-summit-gin-pole-candidate.blend'),{scene},fake_user=True)

# Contextual second-mast review: fixed collars on the already seated first mast.
baseY=300.9;rig.location=v((0,baseY,0))
manifest=json.loads((ROOT/'public/models/eiffel-construction-kit/tower-kit.manifest.json').read_text())
ids={p['id'] for p in manifest['parts'] if p['boundsMax'][1]>=297.5 and p['boundsMin'][1]<303 and p['id'] not in ('summit-crown-m074-c000','summit-crown-m075-c000','summit-crown-m076-c000','summit-crown-m072-c001','summit-crown-m072-c002')}
source=OUT/'blender/eiffel-tower-mast-joint.blend'
with bpy.data.libraries.load(str(source),link=False) as(src,dst):
 names={n.split('.')[0]:n for n in src.objects}
 dst.objects=[names[id] for id in sorted(ids.intersection(names))]
for o in dst.objects:scene.collection.objects.link(o)
# Bring in the exact preassembled cargo, parked on the inspected approach.
with bpy.data.libraries.load(str(OUT/'blender/eiffel-summit-mast-assemblies.blend'),link=False) as(src,dst):dst.scenes=[n for n in src.scenes if n.startswith('WonderForge — exact summit mast preassemblies')]
assembly=next(o for o in dst.scenes[0].objects if o.type=='EMPTY' and o.get('wf_assembly_owner')=='summit-crown-m072-c001')
for o in [assembly]+list(assembly.children_recursive):scene.collection.objects.link(o)
assembly.location+=v((0,.6,-1.2))
# Actual engine proposal's hook geometry, expressed in the web coordinate frame.
hook=Vector((0,305+.6+1.65+1.5,-1.2+.14));pivot=Vector((-.9,baseY+6,0));reach=math.hypot(hook.x-pivot.x,hook.z-pivot.z)
tip=Vector((hook.x,pivot.y+math.sqrt(9-reach*reach),hook.z));delta=tip-pivot
jib.rotation_mode='QUATERNION';jib.rotation_quaternion=Vector((1,0,0)).rotation_difference(v(delta).normalized())
beam('review-hoist-rope',tip,hook,.014,ropeMat)
for lug in ((-.13,305+.6-1.25,-1.2+.14),(.13,305+.6+1.65,-1.2+.14)):beam('review-lifting-sling',hook,lug,.012,ropeMat)
scene.world=bpy.data.worlds.new('Gin pole studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.22,.27,.32,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.7
sun=bpy.data.lights.new('Gin pole key','SUN');sun.energy=3;sun.angle=.15;light=bpy.data.objects.new(sun.name,sun);scene.collection.objects.link(light);light.rotation_euler=(.5,-.7,-.5)
data=bpy.data.cameras.new('Gin pole review');camera=bpy.data.objects.new(data.name,data);scene.collection.objects.link(camera);scene.camera=camera
camera.location=v((-8,306,-13));camera.rotation_euler=(v((-.2,303.8,0))-camera.location).to_track_quat('-Z','Y').to_euler();data.type='ORTHO';data.ortho_scale=13;data.clip_end=1000
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.render.threads_mode='FIXED';scene.render.threads=6
scene.render.resolution_x=850;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
scene.render.filepath=str(OUT/'renders/gin-pole-context-candidate.png');bpy.ops.render.render(write_still=True)
bpy.data.libraries.write(str(OUT/'blender/eiffel-summit-gin-pole-context-candidate.blend'),{scene},fake_user=True)
result={'status':'candidate-only','poleMetres':6,'jibMetres':3,'collarBoreMetres':.18,'baseY':baseY,'source':str(OUT/'blender/eiffel-summit-gin-pole-candidate.blend'),'remaining':['final-source collar and route contact proof','rope drive and bands','supported climbing transition','initial freight handoff']}
(OUT/'gin-pole-build.json').write_text(json.dumps(result,indent=2)+'\n')
