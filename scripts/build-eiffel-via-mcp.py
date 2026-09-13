"""Build the editable Eiffel model through the installed Blender Lab MCP."""
import asyncio
import json
import sys
from pathlib import Path
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

ROOT = Path(__file__).resolve().parents[1]
EXT = Path.home() / 'Library/Application Support/Claude/Claude Extensions/local.mcpb.blender-lab.blender'
KIT = '--kit' in sys.argv
OUT = ROOT / ('artifacts/eiffel-mechanics-2026-09-06/blender' if KIT else 'artifacts/eiffel-rebuild/blender')

async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    server = StdioServerParameters(command=str(EXT / '.venv/bin/python'), args=['-m', 'blmcp'], cwd=str(EXT))
    async with stdio_client(server) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            script = str(ROOT / ('scripts/blender_eiffel_construction_kit.py' if KIT else 'scripts/blender_eiffel_tower.py'))
            code = f'''from pathlib import Path
scope = {{"__file__": {script!r}, "WF_RENDER": False}}
exec(compile(Path({script!r}).read_text(), {script!r}, "exec"), scope)
result = {{"scene": scope["scene"].name, "assemblies": len(scope["parts"]), "meshes": len(scope["objects"]), "triangles": scope["triangles"], "blend": str(scope["OUT"] / "eiffel-tower.blend")}}
'''
            result = await session.call_tool('execute_blender_code', {'code': code})
            evidence = result.model_dump(mode='json')
            (OUT / 'mcp-build-result.json').write_text(json.dumps(evidence, indent=2) + '\n')
            print(json.dumps(evidence, indent=2))
            if result.isError or (result.structuredContent or {}).get('status') == 'error':
                raise RuntimeError('Blender MCP build failed; inspect evidence')

if __name__ == '__main__':
    asyncio.run(main())
