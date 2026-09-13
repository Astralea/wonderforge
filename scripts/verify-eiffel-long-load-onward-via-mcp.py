"""Reload saved editable scenes and render actual fitting geometry via MCP."""
import asyncio,json,os
from pathlib import Path
from mcp import ClientSession,StdioServerParameters
from mcp.client.stdio import stdio_client
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/eiffel-long-load-onward-2026-09-08'
EXT=Path.home()/'Library/Application Support/Claude/Claude Extensions/local.mcpb.blender-lab.blender'
CODE=r'''
import bpy,json,math
from pathlib import Path
from mathutils import Vector,Quaternion
out=Path(OUT_PATH);root=out.parents[1];d=json.loads((out/'design.json').read_text());F=d['floorY'];v=lambda p:Vector((p[0],-p[2],p[1]))
(out/'renders').mkdir(exist_ok=True)
def append(path,prefix):
 with bpy.data.libraries.load(str(path),link=False) as (source,target):
  names=[s for s in source.scenes if s.startswith(prefix)]
  if len(names)!=1:raise ValueError(names)
  target.scenes=names
 return target.scenes[0]
records=[];scenes=[]
for filename,prefix in [('eiffel-long-load-onward.blend','WonderForge — long-load onward hardware'),('eiffel-retained-sling.blend','WonderForge — retained lower sling'),('eiffel-onward-bridge.blend','WonderForge — onward transfer bridge')]:
 s=append(out/'blender'/filename,prefix);scenes.append(s)
 records.append({'file':filename,'scene':s.name,'objects':len(s.objects),'meshes':sum(o.type=='MESH' for o in s.objects),'roles':sorted(o.get('wf_role') for o in s.objects if o.get('wf_role'))})
scene=bpy.data.scenes.new('WonderForge — onward mechanism review');bpy.context.window.scene=scene
for s in scenes:
 for o in s.objects:scene.collection.objects.link(o)
source=append(root/'artifacts/eiffel-cart-fastening-recovered-2026-09-08/blender/eiffel-cart-fastening.blend','WonderForge — cart fastening study')
carrier=next(o for o in source.objects if o.get('wf_role')=='long-load-carrier')
for o in [carrier]+list(carrier.children_recursive):scene.collection.objects.link(o)
carrier.location=v([-21.5,F+.34,-4])
sling=next(o for o in scene.objects if o.get('wf_role')=='master-link-assembly');sling.location=v([-21.5,F+.34+d['masterOffset'][1],-4])
# A later engine pose file, if present, provides actual fixed worker transforms.
posefile=out/'review-poses.json'
if posefile.exists():
 poses=json.loads(posefile.read_text());roles={o.get('wf_role'):o for o in scene.objects if o.get('wf_role')}
 for p in poses['roles']:
  if p['role'] in roles:
   o=roles[p['role']]
   if 'position' in p:o.location=v(p['position'])
   if 'quaternion' in p:
    q=p['quaternion'];o.rotation_mode='QUATERNION';o.rotation_quaternion=Quaternion((q[3],q[0],-q[2],q[1]))
 for key in ('carrierOrigin','masterOrigin'):
  (carrier if key=='carrierOrigin' else sling).location=v(poses[key])
# The cutaway review includes real first-floor parts under every worker station.
manifest=json.loads((root/'public/models/eiffel-construction-kit/tower-kit.manifest.json').read_text())
ids={p['id'] for p in manifest['parts'] if p['id'].startswith('platform-1-') and -29<p['finalPose']['position'][0]<-18 and -8<p['finalPose']['position'][2]<1}
with bpy.data.libraries.load(str(root/'artifacts/eiffel-summit-revision-2026-09-08/blender/eiffel-tower.blend'),link=False) as(src,dst):dst.objects=[name for name in src.objects if name in ids]
for o in dst.objects:scene.collection.objects.link(o)
scene.world=bpy.data.worlds.new('Onward warm studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.19,.23,.28,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.45
for name,pos,power,size in [('Key',[-23,F+10,-8],1800,5),('Fill',[-19,F+8,0],1200,4)]:
 data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;o=bpy.data.objects.new(name,data);scene.collection.objects.link(o);o.location=v(pos);o.rotation_euler=(v([-21.5,F+6.8,-4])-o.location).to_track_quat('-Z','Y').to_euler()
data=bpy.data.cameras.new('Onward review camera');cam=bpy.data.objects.new(data.name,data);scene.collection.objects.link(cam);scene.camera=cam;data.type='ORTHO';data.clip_end=1000
scene.render.engine='CYCLES';scene.cycles.samples=20;scene.cycles.use_denoising=True;scene.render.threads_mode='FIXED';scene.render.threads=8;scene.render.resolution_x=1000;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
def render(name,position,target,scale):
 cam.location=v(position);cam.rotation_euler=(v(target)-cam.location).to_track_quat('-Z','Y').to_euler();data.ortho_scale=scale;scene.render.filepath=str(out/'renders'/name);bpy.ops.render.render(write_still=True)
render('opening-clevis.png',[-20.7,F+7.7,-2.9],[-21.5,F+7.27,-4],.78)
render('onward-operation-cutaway.png',[-29,F+6,-11],[-21.8,F+3.8,-4],9.5)
bpy.data.libraries.write(str(out/'blender/eiffel-onward-mechanism-review.blend'),{scene},fake_user=True)
(out/'mcp/reload-summary.json').write_text(json.dumps(records,indent=2)+'\n')
result={'reloaded':[{'file':r['file'],'objects':r['objects'],'meshes':r['meshes']} for r in records],'render':str(out/'renders/opening-clevis.png'),'reviewBlend':str(out/'blender/eiffel-onward-mechanism-review.blend')}
'''
async def main():
 async with stdio_client(StdioServerParameters(command=str(EXT/'.venv/bin/python'),args=['-m','blmcp'],cwd=str(EXT),env={**os.environ,'BLENDER_MCP_PORT':'9877'})) as (r,w):
  async with ClientSession(r,w) as session:
   await session.initialize();response=await session.call_tool('execute_blender_code',{'code':'OUT_PATH='+repr(str(OUT))+'\n'+CODE})
   (OUT/'mcp/mcp-reload-render-result.json').write_text(json.dumps(response.model_dump(mode='json'),indent=2)+'\n')
   p=response.structuredContent or json.loads(next(c.text for c in response.content if c.type=='text'))
   if response.isError or p.get('status')!='ok':raise RuntimeError(p)
   print(json.dumps({'status':p['status'],'result':p.get('result')},indent=2))
asyncio.run(main())
