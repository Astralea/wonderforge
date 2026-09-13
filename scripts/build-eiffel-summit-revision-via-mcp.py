"""Parent-run actual Blender Lab MCP summit build; preserve existing scenes."""
import asyncio, json, os
from pathlib import Path
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/eiffel-summit-revision-2026-09-08'
EXT=Path.home()/'Library/Application Support/Claude/Claude Extensions/local.mcpb.blender-lab.blender'
def payload(response):
    return response.structuredContent or json.loads(next(c.text for c in response.content if c.type=='text'))
async def main():
    evidence=OUT/'mcp';evidence.mkdir(parents=True,exist_ok=True)
    async with stdio_client(StdioServerParameters(command=str(EXT/'.venv/bin/python'),args=['-m','blmcp'],cwd=str(EXT),env={**os.environ,'BLENDER_MCP_PORT':'9877'})) as (r,w):
        async with ClientSession(r,w) as session:
            await session.initialize()
            probe=await session.call_tool('execute_blender_code',{'code':'import bpy\nresult={"version":bpy.app.version_string,"scene":bpy.context.scene.name,"file":bpy.data.filepath,"objects":len(bpy.context.scene.objects)}'})
            (evidence/'mcp-readonly-probe.json').write_text(json.dumps(probe.model_dump(mode='json'),indent=2)+'\n')
            if probe.isError or payload(probe).get('status')!='ok':raise RuntimeError('Read-only Blender probe failed')
            print(json.dumps(payload(probe)),flush=True)
            source=str(ROOT/'scripts/blender_eiffel_construction_kit.py')
            scope={'__file__':source,'WF_KIT_OUT':str(OUT/'blender'),'WF_KIT_MODEL':str(OUT/'model')}
            code=f'from pathlib import Path\nscope={scope!r}\nexec(compile(Path({source!r}).read_text(),{source!r},"exec"),scope)\nresult=scope["summary"]'
            response=await session.call_tool('execute_blender_code',{'code':code})
            (evidence/'mcp-build-result.json').write_text(json.dumps(response.model_dump(mode='json'),indent=2)+'\n')
            if response.isError or payload(response).get('status')!='ok':raise RuntimeError('Build failed; inspect MCP evidence')
            print(json.dumps(payload(response),indent=2),flush=True)
asyncio.run(main())
