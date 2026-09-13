"""Use actual installed MCP with a successful read-only probe before edits."""
import asyncio,json,os,argparse
from pathlib import Path
from mcp import ClientSession,StdioServerParameters
from mcp.client.stdio import stdio_client
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/eiffel-summit-assembly-2026-09-08/mcp'
EXT=Path.home()/'Library/Application Support/Claude/Claude Extensions/local.mcpb.blender-lab.blender'
parser=argparse.ArgumentParser();parser.add_argument('--gin-pole',action='store_true');parser.add_argument('--mast-joint',action='store_true');args=parser.parse_args()
label='mast-joint' if args.mast_joint else 'gin-pole' if args.gin_pole else 'assembly'
def payload(response):return response.structuredContent or json.loads(next(c.text for c in response.content if c.type=='text'))
async def main():
 async with stdio_client(StdioServerParameters(command=str(EXT/'.venv/bin/python'),args=['-m','blmcp'],cwd=str(EXT),env={**os.environ,'BLENDER_MCP_PORT':'9877'})) as (r,w):
  async with ClientSession(r,w) as session:
   await session.initialize()
   probe=await session.call_tool('execute_blender_code',{'code':'import bpy\nresult={"version":bpy.app.version_string,"scene":bpy.context.scene.name,"file":bpy.data.filepath,"objects":len(bpy.context.scene.objects)}'})
   (OUT/f'{label}-readonly-probe.json').write_text(json.dumps(probe.model_dump(mode='json'),indent=2)+'\n')
   if probe.isError or payload(probe).get('status')!='ok':raise RuntimeError('Blender probe failed')
   print(json.dumps(payload(probe)),flush=True)
   source=str(ROOT/'scripts'/('blender_eiffel_mast_joint.py' if args.mast_joint else 'blender_eiffel_summit_gin_pole.py' if args.gin_pole else 'blender_eiffel_summit_assembly.py'))
   code=f'from pathlib import Path\nscope={{"__file__":{source!r}}}\nexec(compile(Path({source!r}).read_text(),{source!r},"exec"),scope)\nresult=scope["result"]'
   response=await session.call_tool('execute_blender_code',{'code':code})
   (OUT/f'{label}-build-response.json').write_text(json.dumps(response.model_dump(mode='json'),indent=2)+'\n')
   p=payload(response)
   if response.isError or p.get('status')!='ok':raise RuntimeError(p)
   print(json.dumps(p.get('result'),indent=2),flush=True)
asyncio.run(main())
