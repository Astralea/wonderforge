"""Build and save Paris through the installed Blender Lab MCP SDK."""
import asyncio,json,os
from pathlib import Path
from mcp import ClientSession,StdioServerParameters
from mcp.client.stdio import stdio_client
ROOT=Path(__file__).resolve().parents[1]
EXT=Path.home()/'Library/Application Support/Claude/Claude Extensions/local.mcpb.blender-lab.blender'
async def main():
 async with stdio_client(StdioServerParameters(command=str(EXT/'.venv/bin/python'),args=['-m','blmcp'],cwd=str(EXT))) as (r,w):
  async with ClientSession(r,w) as s:
   await s.initialize()
   source=str(ROOT/'scripts/blender_paris_exposition.py')
   out=Path(os.environ.get('WF_PARIS_OUTPUT',str(ROOT/'artifacts/paris-exposition-2026-09-07/blender')))
   out.mkdir(parents=True,exist_ok=True)
   probe=await s.call_tool('execute_blender_code',{'code':'import bpy\nresult={"version":bpy.app.version_string,"scene":bpy.context.scene.name,"file":bpy.data.filepath,"objects":len(bpy.context.scene.objects)}'})
   (out/'mcp-readonly-probe.json').write_text(json.dumps(probe.model_dump(mode='json'),indent=2)+'\n')
   if probe.isError:raise RuntimeError('Blender read-only probe failed')
   result=await s.call_tool('execute_blender_code',{'code':f'from pathlib import Path\nscope={{"__file__":{source!r},"WF_PARIS_OUTPUT":{str(out)!r}}}\nexec(compile(Path({source!r}).read_text(),{source!r},"exec"),scope)\nresult=scope["result"]'})
   out.mkdir(parents=True,exist_ok=True)
   (out/'mcp-build-result.json').write_text(json.dumps(result.model_dump(mode='json'),indent=2)+'\n')
   payload=result.structuredContent
   if not payload:
    payload=json.loads(next(block.text for block in result.content if block.type=='text'))
   print(json.dumps({'status':payload.get('status'),'result':payload.get('result'),'evidence':str(out/'mcp-build-result.json')},indent=2))
   if result.isError or payload.get('status')!='ok':raise RuntimeError('MCP error; inspect saved evidence')
asyncio.run(main())
