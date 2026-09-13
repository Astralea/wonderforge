"""Use the installed Blender Lab MCP; probe live Blender before any scene edit."""
import asyncio, json
from pathlib import Path
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/eiffel-face-package-2026-09-08/blender'
EXT=Path.home()/'Library/Application Support/Claude/Claude Extensions/local.mcpb.blender-lab.blender'
def payload(response):
    return response.structuredContent or json.loads(next(c.text for c in response.content if c.type=='text'))
async def main():
    OUT.mkdir(parents=True,exist_ok=True)
    async with stdio_client(StdioServerParameters(command=str(EXT/'.venv/bin/python'),args=['-m','blmcp'],cwd=str(EXT))) as (r,w):
        async with ClientSession(r,w) as session:
            await session.initialize()
            probe=await session.call_tool('execute_blender_code',{'code':'import bpy\nresult={"version":bpy.app.version_string,"scene":bpy.context.scene.name,"file":bpy.data.filepath,"objects":len(bpy.context.scene.objects)}'})
            (OUT/'mcp-readonly-probe.json').write_text(json.dumps(probe.model_dump(mode='json'),indent=2)+'\n')
            if probe.isError or payload(probe).get('status')!='ok': raise RuntimeError('Read-only Blender probe failed')
            print(json.dumps(payload(probe)),flush=True)
            source=str(ROOT/'scripts/blender_eiffel_face_package.py')
            response=await session.call_tool('execute_blender_code',{'code':f'from pathlib import Path\nscope={{"__file__":{source!r}}}\nexec(compile(Path({source!r}).read_text(),{source!r},"exec"),scope)\nresult=scope["result"]'})
            (OUT/'mcp-build-result.json').write_text(json.dumps(response.model_dump(mode='json'),indent=2)+'\n')
            if response.isError or payload(response).get('status')!='ok':raise RuntimeError('Build failed; inspect MCP evidence')
            print(json.dumps(payload(response),indent=2))
asyncio.run(main())
