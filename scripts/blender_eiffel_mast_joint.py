"""Fix the solid mast/central-column overlap in actual Blender, preserving IDs.

Keep the original GLB binary chunks and every unrelated node byte value; only
the two changed primitive node transforms are encoded from edited Blender
objects. This prevents unrelated exporter round trips from moving old members.
"""
import bpy,json,struct,hashlib,copy
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/eiffel-summit-assembly-2026-09-08';WORK=OUT/'kit-joint-revision'
BEFORE=WORK/'before';MODEL=WORK/'model'
def glb(path):
 b=path.read_bytes();size=struct.unpack_from('<I',b,12)[0];return json.loads(b[20:20+size]),b[20+size:]
def write_glb(path,data,tail):
 chunk=json.dumps(data,separators=(',',':')).encode();chunk+=b' '*((-len(chunk))%4)
 path.write_bytes(struct.pack('<III',0x46546c67,2,20+len(chunk)+len(tail))+struct.pack('<II',len(chunk),0x4e4f534a)+chunk+tail)
kit,kitBinary=glb(BEFORE/'tower-kit.glb');compact,compactBinary=glb(BEFORE/'tower-kit-seated.glb')
find=lambda g,k,val:next(n for n in g['nodes'] if n.get('extras',{}).get(k)==val)
lower=find(kit,'wf_part','summit-access-stair-m000-c003');upper=find(kit,'wf_part','summit-crown-m072-c001')
manifest=json.loads((BEFORE/'tower-kit.manifest.json').read_text())
columnTop=lower['translation'][1]+lower['scale'][1]/2
floorIds={f'summit-crown-m{i:03}-c000' for i in range(49,72,2)}
bottom=max(p['boundsMax'][1] for p in manifest['parts'] if p['id'] in floorIds)
top=upper['translation'][1]-upper['scale'][1]/2
scene=bpy.data.scenes.new('WonderForge — corrected summit mast butt joint');bpy.context.window.scene=scene
ids={p['id'] for p in manifest['parts']}
with bpy.data.libraries.load(str(ROOT/'artifacts/eiffel-summit-revision-2026-09-08/blender/eiffel-tower.blend'),link=False) as(src,dst):dst.objects=[n for n in src.objects if n in ids]
for o in dst.objects:scene.collection.objects.link(o)
objects={o['wf_part']:o for o in dst.objects};assert len(objects)==len(ids)
o=objects['summit-crown-m072-c000'];axis=max(range(3),key=lambda i:o.scale[i])
o.location.z=(bottom+top)/2;o.scale[axis]=top-bottom
bpy.context.view_layer.update()
center=float(o.location.z);length=float(o.scale[axis]);actualBottom=center-length/2;actualTop=center+length/2
assert abs(actualBottom-bottom)<.0001 and abs(actualTop-top)<.0001
part=next(p for p in manifest['parts'] if p['id']=='summit-crown-m072-c000')
part['center'][1]=part['finalPose']['position'][1]=center
part['localBounds']['min'][2]=-length/2;part['localBounds']['max'][2]=length/2;part['transportSize'][2]=length
part['boundsMin'][1]=actualBottom;part['boundsMax'][1]=actualTop
part['pickupLugs']=[[0,part['localBounds']['max'][1],-length*.22],[0,part['localBounds']['max'][1],length*.22]]
part['connectionAnchors']=[[0,0,-length/2],[0,0,length/2]]
node=find(kit,'wf_part',part['id']);node['translation'][1]=center;node['scale'][1]=length
originalCompact=find(compact,'wf_source','summit-crown/member-072')
compactTop=originalCompact['translation'][1]+originalCompact['scale'][1]/2
# A separate edited Blender primitive records the shortened completed member.
bpy.ops.mesh.primitive_cube_add(size=1);co=bpy.context.object;co.name='corrected-completed-flagstaff'
co.location=(0,0,(actualBottom+compactTop)/2);co.scale=(.18,.18,compactTop-actualBottom);co.data.materials.append(o.data.materials[0]);co['wf_source']='summit-crown/member-072'
compactCenter=float(co.location.z);compactLength=float(co.scale.z)
originalCompact['translation'][1]=compactCenter;originalCompact['scale'][1]=compactLength
co.hide_render=True;co.hide_set(True)
bpy.data.libraries.write(str(OUT/'blender/eiffel-tower-mast-joint.blend'),{scene},fake_user=True)
write_glb(MODEL/'tower-kit.glb',kit,kitBinary);write_glb(MODEL/'tower-kit-seated.glb',compact,compactBinary)
manifest['metadata']['mastJointRevision']={'partId':part['id'],'supportPartIds':sorted(floorIds),'source':'scripts/blender_eiffel_mast_joint.py','interpretation':'Mast foot seated above the existing crown floor hub; removes solid overlap. No historic connection detail claim.'}
(MODEL/'tower-kit.manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
result={'partId':part['id'],'sourceColumnTop':columnTop,'sourceFloorTop':bottom,'nextMastBottom':top,'editedBottom':actualBottom,'editedTop':actualTop,'length':length,'removedOverlap':bottom-298,'onlyChangedKitNode':part['id'],'onlyChangedCompactNode':'summit-crown/member-072','source':str(OUT/'blender/eiffel-tower-mast-joint.blend'),'binaryChunksPreserved':True}
(WORK/'result.json').write_text(json.dumps(result,indent=2)+'\n')
