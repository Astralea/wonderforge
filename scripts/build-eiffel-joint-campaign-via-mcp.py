"""Run the joint-support/cart/splice builder through installed Blender Lab MCP."""
import asyncio,json
from pathlib import Path
from mcp import ClientSession,StdioServerParameters
from mcp.client.stdio import stdio_client
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/eiffel-joint-campaign-2026-09-07/blender'
EXT=Path.home()/'Library/Application Support/Claude/Claude Extensions/local.mcpb.blender-lab.blender'
async def main():
 OUT.mkdir(parents=True,exist_ok=True)
 async with stdio_client(StdioServerParameters(command=str(EXT/'.venv/bin/python'),args=['-m','blmcp'],cwd=str(EXT))) as (r,w):
  async with ClientSession(r,w) as session:
   await session.initialize()
   probe=await session.call_tool('execute_blender_code',{'code':'import bpy\nresult={"version":bpy.app.version_string,"scene":bpy.context.scene.name,"file":bpy.data.filepath,"objectCount":len(bpy.context.scene.objects)}'})
   (OUT/'mcp-readonly-probe.json').write_text(json.dumps(probe.model_dump(mode='json'),indent=2))
   if probe.isError:raise RuntimeError('Blender read-only probe failed')
   source=str(ROOT/'scripts/blender_eiffel_joint_campaign.py')
   result=await session.call_tool('execute_blender_code',{'code':f'from pathlib import Path\nscope={{"__file__":{source!r}}}\nexec(compile(Path({source!r}).read_text(),{source!r},"exec"),scope)\nresult=scope["result"]'})
   (OUT/'mcp-build-result.json').write_text(json.dumps(result.model_dump(mode='json'),indent=2))
   structured=result.structuredContent
   if not structured:structured=json.loads(next(c.text for c in result.content if c.type=='text'))
   if result.isError or structured.get('status')!='ok':raise RuntimeError('MCP build failed; inspect result')
   print(json.dumps(structured,indent=2))
asyncio.run(main())
