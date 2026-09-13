"""Author floor-supported summit stock racks through the installed Blender MCP."""
import bpy,bmesh,json,math,hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/eiffel-summit-stock-2026-09-08'
plan=json.loads((OUT/'stock-plan.json').read_text())
for folder in ['model','blender','renders']:(OUT/folder).mkdir(parents=True,exist_ok=True)
scene=bpy.data.scenes.new('WonderForge — summit terrace stock racks')
bpy.context.window.scene=scene
collection=bpy.data.collections.new('Stock racks — editable source and joined exports')
scene.collection.children.link(collection)
mat=bpy.data.materials.new('Summit rack timber');mat.use_nodes=True
bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.30,.205,.115,1);bs.inputs['Roughness'].default_value=.9
faces=[[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]]
shapes=[];exported=[]
def xyz(p):return(p[0],-p[2],p[1])
for rack in plan['racks']:
    rid=rack['id'];cx,cz=rack['center'];L,D=rack['length'],rack['depth'];floor=rack['floorY'];levels=rack['shelfTops']
    def point(a,y,b):return(cx+a,y,cz+b)if rack['axis']=='x' else(cx+b,y,cz+a)
    items=[]
    def prism(name,verts,role):
        shape={'id':rid+'-'+name,'rackId':rid,'role':role,'vertices':[list(v) for v in verts]};shapes.append(shape)
        mesh=bpy.data.meshes.new(shape['id']);mesh.from_pydata([xyz(v) for v in verts],[],faces);mesh.update()
        bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
        obj=bpy.data.objects.new(shape['id'],mesh);collection.objects.link(obj);mesh.materials.append(mat)
        obj['wf_role']=role;obj['wf_rack']=rid;items.append(obj)
    def box(name,a,y,b,w,h,d,role='frame'):
        prism(name,[point(a+sx*w/2,y+sy*h/2,b+sz*d/2)for sx in(-1,1)for sy in(-1,1)for sz in(-1,1)],role)
    def beam(name,a,b,r=.04):
        av,bv=Vector(a),Vector(b);direction=(bv-av).normalized();u=direction.cross(Vector((0,1,0)))
        if u.length<1e-7:u=direction.cross(Vector((1,0,0)))
        u.normalize();v=direction.cross(u).normalized();center=(av+bv)/2;half=(bv-av).length/2
        prism(name,[tuple(center+direction*x*half+u*y*r+v*z*r)for x in(-1,1)for y in(-1,1)for z in(-1,1)],'brace')
    for a in(-1,1):
        for b in(-1,1):
            box(f'foot-{a}-{b}',a*L/2,floor+.05,b*D/2,.18,.1,.18,'bearing-foot')
            top=levels[1]+.22;bottom=floor+.1
            box(f'post-{a}-{b}',a*L/2,(top+bottom)/2,b*D/2,.12,top-bottom,.12)
    for i,level in enumerate(levels):
        box(f'shelf-{i}',0,level-.05,0,L,.10,D,'shelf')
        for side in(-1,1):
            box(f'long-rail-{i}-{side}',0,level-.2,side*D/2,L+.12,.2,.12)
            box(f'end-rail-{i}-{side}',side*L/2,level-.2,0,.12,.2,D+.12)
    outer=math.copysign(1,cz if rack['axis']=='x' else cx)
    for a in(-1,1):
        beam(f'back-brace-{a}',point(a*L/2,floor+.25,outer*(D/2+.06)),point(-a*L/2,levels[1]-.2,outer*(D/2+.06)))
        beam(f'end-brace-{a}',point(a*(L/2+.06),floor+.25,-D/2),point(a*(L/2+.06),levels[1]-.2,D/2))
    # Keep source prisms for editing; export their joined occupied union.
    base=items[0];bpy.context.view_layer.objects.active=base
    for obj in items[1:]:
        modifier=base.modifiers.new('Joined rack joints','BOOLEAN');modifier.operation='UNION';modifier.solver='EXACT';modifier.object=obj
        bpy.ops.object.modifier_apply(modifier=modifier.name);obj.hide_render=True;obj.hide_set(True)
    base.data.validate(verbose=True);base.data.update()
    base.name=rid+'-joined';base['wf_role']='rack';exported.append(base)
(OUT/'rack-occupancy.json').write_text(json.dumps(shapes,indent=2)+'\n')
for obj in scene.objects:obj.select_set(False)
for obj in exported:obj.select_set(True)
bpy.context.view_layer.objects.active=exported[0]
bpy.ops.export_scene.gltf(filepath=str(OUT/'model/summit-stock-racks.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_extras=True,export_yup=True,export_animations=False,export_lights=False,export_cameras=False)
# Actual compact Blender kit is retained as context through the terrace stage.
manifest=json.loads((ROOT/'public/models/eiffel-construction-kit/tower-kit.manifest.json').read_text())
source_stages={p['sourceMember']:p['stage'] for p in manifest['parts']}
before=set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/models/eiffel-construction-kit/tower-kit-seated.glb'))
context=[]
for obj in set(bpy.data.objects)-before:
    if obj.type!='MESH':continue
    if source_stages.get(obj.get('wf_source'),999)>56:bpy.data.objects.remove(obj,do_unlink=True)
    else:context.append(obj)
# The stock layout is recorded as named non-rendering boxes. Curved cargo has
# not yet received fitted cradles, so do not render it as stable stored freight.
stock_collection=bpy.data.collections.new('PLANNING ONLY — stock envelopes, not stable cargo')
scene.collection.children.link(stock_collection)
parts={p['id']:p for p in manifest['parts']}
from mathutils import Quaternion
for slot in plan['placements']:
    part=parts[slot['partId']];p=slot['pose'];q=p['quaternion'];rotation=Quaternion((q[3],q[0],q[1],q[2]));origin=Vector(p['position'])
    verts=[]
    for x in part['localBounds']['min'][0],part['localBounds']['max'][0]:
        for y in part['localBounds']['min'][1],part['localBounds']['max'][1]:
            for z in part['localBounds']['min'][2],part['localBounds']['max'][2]:verts.append(xyz(rotation@Vector((x,y,z))+origin))
    mesh=bpy.data.meshes.new(slot['partId']+' envelope');mesh.from_pydata(verts,[],faces)
    obj=bpy.data.objects.new(slot['partId']+' — envelope only',mesh);stock_collection.objects.link(obj)
    obj.display_type='WIRE';obj.hide_render=True;obj['wf_part']=slot['partId'];obj['production_ready']=False
world=bpy.data.worlds.new('Summit study daylight');world.use_nodes=True;world.node_tree.nodes.get('Background').inputs[0].default_value=(.22,.27,.34,1);world.node_tree.nodes.get('Background').inputs[1].default_value=.55;scene.world=world
light=bpy.data.lights.new('Summit sun','SUN');light.energy=2.2;sun=bpy.data.objects.new('Summit sun',light);scene.collection.objects.link(sun);sun.rotation_euler=(.48,-.38,-.6)
camdata=bpy.data.cameras.new('Terrace stock review');cam=bpy.data.objects.new('Terrace stock review',camdata);scene.collection.objects.link(cam);scene.camera=cam;camdata.type='ORTHO';camdata.ortho_scale=27
cam.location=xyz((22,301,25));target=Vector(xyz((0,282,0)));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True;scene.render.threads_mode='FIXED';scene.render.threads=12
scene.render.resolution_x=1440;scene.render.resolution_y=1050;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
result={'scene':scene.name,'blend':str(OUT/'blender/eiffel-summit-stock.blend'),'racks':len(exported),'sourcePrisms':len(shapes),'plannedStock':len(plan['placements']),'productionReady':False,'limits':['Stock envelopes are hidden in renders; fitted cradles/restraints and extraction remain unresolved.','Bearing geometry is not a rated-capacity calculation; rack erection and crane lifecycle are not animated.']}
(OUT/'model/manifest.json').write_text(json.dumps(result,indent=2)+'\n');bpy.ops.wm.save_as_mainfile(filepath=result['blend'])
scene.render.filepath=str(OUT/'renders/terrace-racks.png');bpy.ops.render.render(write_still=True)
