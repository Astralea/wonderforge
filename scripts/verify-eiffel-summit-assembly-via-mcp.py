"""Reload the saved Blender libraries through the installed MCP and record roles."""
import asyncio,json,os,argparse
from pathlib import Path
from mcp import ClientSession,StdioServerParameters
from mcp.client.stdio import stdio_client
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/eiffel-summit-assembly-2026-09-08'
EXT=Path.home()/'Library/Application Support/Claude/Claude Extensions/local.mcpb.blender-lab.blender'
parser=argparse.ArgumentParser();parser.add_argument('--final-floor',action='store_true');args=parser.parse_args()
CODE=r'''
import bpy,json
from pathlib import Path
out=Path(OUT_PATH);records=[]
for name in FILES:
 with bpy.data.libraries.load(str(out/'blender'/name),link=False) as(src,dst):
  assert len(src.scenes)==1,(name,src.scenes)
  dst.scenes=src.scenes
 s=dst.scenes[0]
 bpy.context.window.scene=s;bpy.context.view_layer.update()
 first=next((o for o in s.objects if o.get('wf_part')=='summit-crown-m072-c000'),None)
 bounds=None
 if first:
  from mathutils import Vector
  ys=[(first.matrix_world@Vector(c)).z for c in first.bound_box]
  bounds={'bottom':min(ys),'top':max(ys)}
  if FINAL_FLOOR:assert abs(min(ys)-300.6700083017349)<.0001,bounds
 records.append({'file':name,'scene':s.name,'objects':len(s.objects),'meshes':sum(o.type=='MESH' for o in s.objects),'firstMastVerticalBounds':bounds,'roles':sorted(str(o.get('wf_role')) for o in s.objects if o.get('wf_role')),'partIds':sorted(str(o.get('wf_part')) for o in s.objects if o.get('wf_part'))})
assert records[0]['objects']==10 and records[0]['meshes']==7,records[0]
result={'reloaded':records,'scope':'Saved Blender source readback; not complete mechanism admission'}
(out/'mcp'/('reload-floor-summary.json' if FINAL_FLOOR else 'reload-summary.json')).write_text(json.dumps(result,indent=2)+'\n')
'''
async def main():
 async with stdio_client(StdioServerParameters(command=str(EXT/'.venv/bin/python'),args=['-m','blmcp'],cwd=str(EXT),env={**os.environ,'BLENDER_MCP_PORT':'9877'})) as(r,w):
  async with ClientSession(r,w) as session:
   files=('eiffel-summit-mast-assemblies.blend','eiffel-tower-mast-joint.blend') if args.final_floor else ('eiffel-summit-mast-assemblies.blend','eiffel-summit-gin-pole-candidate.blend','eiffel-summit-gin-pole-context-candidate.blend','eiffel-tower-mast-joint.blend')
   await session.initialize();response=await session.call_tool('execute_blender_code',{'code':'OUT_PATH='+repr(str(OUT))+'\nFILES='+repr(files)+'\nFINAL_FLOOR='+repr(args.final_floor)+'\n'+CODE})
   (OUT/'mcp'/('readback-floor-response.json' if args.final_floor else 'readback-response.json')).write_text(json.dumps(response.model_dump(mode='json'),indent=2)+'\n')
   p=response.structuredContent or json.loads(next(c.text for c in response.content if c.type=='text'))
   if response.isError or p.get('status')!='ok':raise RuntimeError(p)
   print(json.dumps({'status':'ok','files':[{'file':r['file'],'objects':r['objects'],'meshes':r['meshes']} for r in p['result']['reloaded']]},indent=2))
asyncio.run(main())
