"""Save the four-leg bridle as an actual Blender/GLB asset at payload origin."""
import bpy,bmesh,json,math,hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/eiffel-face-package-2026-09-08'
meta=json.loads((OUT/'model/manifest.json').read_text());mass=json.loads((OUT/'package-measurements.json').read_text())
if hashlib.sha256((OUT/'model/face-package.glb').read_bytes()).hexdigest()!=mass['sourceGLBSHA256']:raise ValueError('Stale mass properties')
scene=bpy.data.scenes.new('WonderForge — independent package bridle');bpy.context.window.scene=scene
collection=bpy.data.collections.new('Four-leg bridle — payload local coordinates');scene.collection.children.link(collection)
rope=bpy.data.materials.new('Package hemp bridle');rope.diffuse_color=(.075,.064,.044,1);rope.use_nodes=True;node=rope.node_tree.nodes.get('Principled BSDF');node.inputs['Base Color'].default_value=rope.diffuse_color;node.inputs['Roughness'].default_value=.98
def web(v):return Vector((v[0],-v[2],v[1]))
def move_collection(o):
    for c in list(o.users_collection):c.objects.unlink(o)
    collection.objects.link(o);o.data.materials.append(rope)
master=[mass['centerOfMass'][0],1.35,mass['centerOfMass'][2]];lengths=[]
for i,eye in enumerate(meta['liftingEyes']):
    vertices=[];faces=[];N=24;M=8
    for a in range(N):
        angle=a*math.tau/N
        for b in range(M):
            tube=b*math.tau/M;r=.020+.006*math.cos(tube)
            vertices.append(web((eye[0]+r*math.cos(angle),.284+r*math.sin(angle),eye[2]+.006*math.sin(tube))))
    for a in range(N):
        for b in range(M):faces.append((a*M+b,((a+1)%N)*M+b,((a+1)%N)*M+(b+1)%M,a*M+(b+1)%M))
    mesh=bpy.data.meshes.new('rope-eye-'+str(i));mesh.from_pydata(vertices,[],faces);mesh.update();bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
    o=bpy.data.objects.new('rope-eye-'+str(i),mesh);collection.objects.link(o);mesh.materials.append(rope);o['wf_role']='rope-eye-'+str(i)
    end=[eye[0],.304,eye[2]];a=web(master);b=web(end);delta=b-a;lengths.append(delta.length)
    bpy.ops.mesh.primitive_cylinder_add(vertices=8,radius=.012,depth=delta.length,location=(a+b)/2);o=bpy.context.object;o.name='lifting-leg-'+str(i);o.rotation_euler=delta.to_track_quat('Z','Y').to_euler();move_collection(o);o['wf_role']='lifting-leg-'+str(i)
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=.025,location=web(master));o=bpy.context.object;o.name='master-rope-knot';move_collection(o);o['wf_role']='master-knot'
for o in scene.objects:o.select_set(False)
for o in collection.objects:o.select_set(True)
bpy.context.view_layer.objects.active=o
bpy.ops.export_scene.gltf(filepath=str(OUT/'model/package-bridle.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_extras=True,export_yup=True,export_animations=False,export_lights=False,export_cameras=False)
# Payload at the same canonical origin for editable alignment inspection.
bpy.ops.import_scene.gltf(filepath=str(OUT/'model/face-package.glb'))
result={'scene':scene.name,'blend':str(OUT/'blender/eiffel-face-package-bridle.blend'),'payloadSHA256':mass['sourceGLBSHA256'],'masterLocal':master,'legLengths':lengths,'ropeRadius':.012,'eyeTubeRadius':.006,'productionAdmitted':False,'limits':['Canonical rigging alignment asset, not a complete construction scene.','Loose-part support, end-eye contacts and full delivery admission remain separately verified.']}
(OUT/'model/bridle.manifest.json').write_text(json.dumps(result,indent=2)+'\n');bpy.ops.wm.save_as_mainfile(filepath=result['blend'])
