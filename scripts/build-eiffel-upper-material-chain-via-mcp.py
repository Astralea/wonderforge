"""Parent-owned installed Blender MCP calls; never overwrite prior pass receipts."""
import argparse, asyncio, json, os
from pathlib import Path
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts/eiffel-upper-material-chain-2026-09-08'
EXT = Path.home() / 'Library/Application Support/Claude/Claude Extensions/local.mcpb.blender-lab.blender'
parser = argparse.ArgumentParser()
parser.add_argument('--port', default='9877')
parser.add_argument('--probe-only', action='store_true')
parser.add_argument('--code-file')
parser.add_argument('--label', default='build')
parser.add_argument('--out-dir', type=Path)
args = parser.parse_args()
if args.out_dir:
    OUT = args.out_dir

def payload(response):
    return response.structuredContent or json.loads(next(c.text for c in response.content if c.type == 'text'))

async def main():
    (OUT / 'mcp').mkdir(parents=True, exist_ok=True)
    params = StdioServerParameters(command=str(EXT / '.venv/bin/python'), args=['-m', 'blmcp'], cwd=str(EXT), env={**os.environ, 'BLENDER_MCP_PORT':args.port})
    async with stdio_client(params) as (r, w):
        async with ClientSession(r, w) as session:
            await session.initialize()
            probe = await session.call_tool('execute_blender_code', {'code':'import bpy\nresult={"version":bpy.app.version_string,"scene":bpy.context.scene.name,"file":bpy.data.filepath,"objects":len(bpy.context.scene.objects)}'})
            (OUT / f'mcp/readonly-{args.port}-{args.label}.json').write_text(json.dumps(probe.model_dump(mode='json'), indent=2)+'\n')
            if probe.isError or payload(probe).get('status') != 'ok':
                raise RuntimeError(payload(probe))
            print(json.dumps(payload(probe)), flush=True)
            if args.probe_only:
                return
            source = Path(args.code_file) if args.code_file else ROOT / 'scripts/blender_eiffel_upper_material_chain.py'
            code = f'from pathlib import Path\nscope={{"__file__":{str(source)!r}}}\nexec(compile(Path({str(source)!r}).read_text(),{str(source)!r},"exec"),scope)\nresult=scope["result"]'
            response = await session.call_tool('execute_blender_code', {'code':code})
            (OUT / f'mcp/{args.label}-response.json').write_text(json.dumps(response.model_dump(mode='json'), indent=2)+'\n')
            if response.isError or payload(response).get('status') != 'ok':
                raise RuntimeError(payload(response))
            print(json.dumps(payload(response)['result'], indent=2), flush=True)

asyncio.run(main())
