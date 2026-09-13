"""Parent-authored upper receiving tools/bolts/worker; actual Blender MCP only."""
import bpy,json,math
from pathlib import Path
from mathutils import Vector,Matrix,Quaternion
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/eiffel-upper-material-chain-2026-09-08'
pose=json.loads((OUT/'receiver/initial-pose.json').read_text())
sample=pose['sample'];F=116.13999938964844
scene=bpy.data.scenes.new('WonderForge — second-floor receiving fixtures')
bpy.context.window.scene=scene
def vec(p):return Vector((p[0],-p[2],p[1]))
def quat(q):return Quaternion((q[3],q[0],-q[2],q[1]))
def load_scene(path,prefix):
 with bpy.data.libraries.load(str(path),link=False)as(src,dst):
  matches=[n for n in src.scenes if n.startswith(prefix)];assert matches,(prefix,src.scenes)
  dst.scenes=[matches[0]]
 return dst.scenes[0]
def bring(root,role,position,quaternion):
 objects=[root]+list(root.children_recursive)
 for o in objects:
  scene.collection.objects.link(o)
 root.parent=None;root.matrix_parent_inverse=Matrix.Identity(4)
 root['wf_role']=role;root.location=vec(position)
 root.rotation_mode='QUATERNION';root.rotation_quaternion=quat(quaternion)
 return root
source=load_scene(ROOT/'artifacts/eiffel-long-load-onward-2026-09-08/blender/eiffel-long-load-onward.blend','WonderForge — long-load onward hardware')
byrole={o.get('wf_role'):o for o in source.objects if o.get('wf_role')}
for b in sample['bolts']:
 original=byrole['cart-bolt-'+b['role'].rsplit('-',1)[1]]
 bring(original,b['role'],b['position'],b['quaternion'])
bring(byrole['fastening-wrench'],'upper-receiver-wrench',sample['wrench']['position'],sample['wrench']['quaternion'])
for r in sample['worker']['roles']:
 original=byrole[r['role'].replace('upper-receiver-rigger-','deck-rigger-')]
 bring(original,r['role'],r['position'],r['quaternion'])
oldtray=byrole['bolt-tray']
tray=bpy.data.objects.new('upper-receiver-bolt-tray',None)
tray['wf_role']='upper-receiver-bolt-tray';scene.collection.objects.link(tray)
tray.location=vec([-14.60,F+.29,-2.555])
bpy.context.window.scene=source;bpy.context.view_layer.update()
transform=Matrix.Translation(vec([-14.60,F+.29,-2.555]))@Matrix.Rotation(math.pi,4,'Z')@Matrix.Translation(-vec([-22,57.94000244140625+.29,-4.695]))
matrices={o:transform@o.matrix_world.copy() for o in oldtray.children_recursive}
bpy.context.window.scene=scene;bpy.context.view_layer.update()
for o,m in matrices.items():
 scene.collection.objects.link(o);o.parent=tray;o.matrix_parent_inverse=Matrix.Identity(4);o.matrix_world=m
bpy.context.view_layer.update()
objects=list(scene.objects)
bpy.ops.object.select_all(action='DESELECT')
for o in objects:o.select_set(True)
model=OUT/'model/upper-receiver.glb'
bpy.ops.export_scene.gltf(filepath=str(model),export_format='GLB',use_selection=True,use_active_scene=True,export_extras=True,export_yup=True,export_animations=False,export_lights=False,export_cameras=False)
blend=OUT/'blender/eiffel-upper-receiver.blend'
bpy.data.libraries.write(str(blend),{scene},fake_user=True)
design={'scene':scene.name,'floor':F,'yaw':math.pi,'cartOrigin':[-15,F,-1.8],
 'trayCenter':[-14.60,F+.29,-2.555],'trayTop':F+.31,'traySize':[.34,.04,.36],
 'bolts':[{'role':b['role'],'storedCenter':b['position'],'seatedCenter':b['seatedPosition'],'shaftRadius':.009,'shaftLength':.24}for b in sample['bolts']],
 'wrench':sample['wrench'],'workerRoles':[r['role']for r in sample['worker']['roles']],
 'samplerDesign':pose['design'],'productionReady':False,
 'limits':['Actual authored receiving fixtures. Final worker detour and source support/body/tool checks are separate.',
 'Upper access scaffold and second-hook unloading/release are not yet present.']}
(OUT/'receiver/fixture-design.json').write_text(json.dumps(design,indent=2)+'\n')
result={'scene':scene.name,'objects':len(objects),'meshes':sum(o.type=='MESH'for o in objects),'blend':str(blend),'model':str(model),'productionReady':False}
