"""Parent-authored exact mast preassemblies, run through Blender Lab MCP.

The original kit is never rewritten. Each original unit-box mesh, source tag,
part ID, scale and final world matrix is retained under a rigid assembly root.
"""
import bpy, json, hashlib
from pathlib import Path
from mathutils import Matrix, Vector, Quaternion

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/eiffel-summit-assembly-2026-09-08'
SOURCE=OUT/'blender/eiffel-tower-mast-joint.blend'
MANIFEST=OUT/'kit-joint-revision/model/tower-kit.manifest.json'
parts={p['id']:p for p in json.loads(MANIFEST.read_text())['parts']}
groups=[('summit-crown-m072-c000',['summit-crown-m073-c000']),('summit-crown-m072-c001',['summit-crown-m074-c000','summit-crown-m075-c000']),('summit-crown-m072-c002',['summit-crown-m076-c000'])]
ids={p for owner,children in groups for p in [owner]+children}
scene=bpy.data.scenes.new('WonderForge — exact summit mast preassemblies')
bpy.context.window.scene=scene
with bpy.data.libraries.load(str(SOURCE),link=False) as (src,dst):
    names={name.split('.')[0]:name for name in src.objects}
    assert ids.issubset(names),ids-set(names)
    dst.objects=[names[id] for id in sorted(ids)]
objects={o['wf_part']:o for o in dst.objects}
for o in objects.values():scene.collection.objects.link(o)
def vec(p):return Vector((p[0],-p[2],p[1]))
def pose(p):
    q=p['quaternion'];return Matrix.LocRotScale(vec(p['position']),Quaternion((q[3],q[0],-q[2],q[1])),Vector((1,1,1)))
bpy.context.view_layer.update()
original={name:o.matrix_world.copy() for name,o in objects.items()}
records=[]
for owner,children in groups:
    root=bpy.data.objects.new('preassembled-'+owner,None);scene.collection.objects.link(root)
    root['wf_role']='mast-assembly';root['wf_assembly_owner']=owner
    root.matrix_world=pose(parts[owner]['finalPose'])
    for name in [owner]+children:
        o=objects[name];o.parent=root;o.matrix_parent_inverse=Matrix.Identity(4)
        o.matrix_basis=root.matrix_world.inverted()@original[name]
        o['wf_assembly_owner']=owner
    bpy.context.view_layer.update()
    residual=max((objects[name].matrix_world@v.co-original[name]@v.co).length for name in [owner]+children for v in objects[name].data.vertices)
    assert residual<.0001,(owner,residual)
    records.append({'parentPartId':owner,'childPartIds':children,'maxOriginalVertexResidualMetres':residual,'meshVertices':sum(len(objects[n].data.vertices) for n in [owner]+children)})

bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'model/summit-mast-assemblies.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_extras=True,export_yup=True,export_animations=False,export_lights=False,export_cameras=False)
bpy.data.libraries.write(str(OUT/'blender/eiffel-summit-mast-assemblies.blend'),{scene},fake_user=True)

# Separate overview with both whole assemblies; the saved source above has no
# presentation geometry. The camera is an inspection view, not animation proof.
scene.world=bpy.data.worlds.new('Mast assembly studio');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.10,.13,.17,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.7
sun=bpy.data.lights.new('Assembly soft key','SUN');sun.energy=3;sun.angle=.25
light=bpy.data.objects.new(sun.name,sun);scene.collection.objects.link(light);light.rotation_euler=(.4,-.6,-.6)
data=bpy.data.cameras.new('Assembly review');camera=bpy.data.objects.new(data.name,data);scene.collection.objects.link(camera);scene.camera=camera
camera.location=vec((6,305,9));camera.rotation_euler=(vec((0,305,0))-camera.location).to_track_quat('-Z','Y').to_euler();data.type='ORTHO';data.ortho_scale=16;data.clip_end=1000
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.resolution_x=700;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
scene.render.threads_mode='FIXED';scene.render.threads=6
scene.render.filepath=str(OUT/'renders/mast-assemblies.png');bpy.ops.render.render(write_still=True)
bpy.data.libraries.write(str(OUT/'blender/eiffel-summit-mast-review.blend'),{scene},fake_user=True)
result={'manifestSha256':hashlib.sha256(MANIFEST.read_bytes()).hexdigest(),'assemblies':records,'source':str(OUT/'blender/eiffel-summit-mast-assemblies.blend'),'asset':str(OUT/'model/summit-mast-assemblies.glb')}
(OUT/'assembly-build.json').write_text(json.dumps(result,indent=2)+'\n')
