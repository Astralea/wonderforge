"""Build and save Guyenet crane through the installed Blender Lab MCP SDK."""
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
   source=str(ROOT/'scripts/blender_eiffel_guyenet.py')
   out=Path(os.environ.get('WF_GUYENET_OUTPUT',str(ROOT/'artifacts/eiffel-campaigns-2026-09-07/blender')))
   scope={'__file__':source,'WF_GUYENET_OUTPUT':str(out)}
   for key in ('WF_GUYENET_SPEC','WF_GUYENET_MODEL','WF_GUYENET_STATION'):
    if key in os.environ:scope[key]=os.environ[key]
   if 'WF_GUYENET_DISPLAY_GUIDES' in os.environ:scope['WF_GUYENET_DISPLAY_GUIDES']=os.environ['WF_GUYENET_DISPLAY_GUIDES']!='0'
   result=await s.call_tool('execute_blender_code',{'code':f'from pathlib import Path\nscope={scope!r}\nexec(compile(Path({source!r}).read_text(),{source!r},"exec"),scope)\nresult=scope["result"]'})
   out.mkdir(parents=True,exist_ok=True)
   (out/'mcp-build-result.json').write_text(json.dumps(result.model_dump(mode='json'),indent=2)+'\n')
   payload=result.structuredContent
   if not payload:
    payload=json.loads(next(block.text for block in result.content if block.type=='text'))
   print(json.dumps({'status':payload.get('status'),'result':payload.get('result'),'evidence':str(out/'mcp-build-result.json')},indent=2))
   if result.isError or payload.get('status')!='ok':raise RuntimeError('MCP error; inspect saved evidence')
asyncio.run(main())
