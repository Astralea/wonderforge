"""Actual installed Blender Lab MCP for parent-only source generation/readback."""
import argparse,asyncio,json,os
from pathlib import Path
from mcp import ClientSession,StdioServerParameters
from mcp.client.stdio import stdio_client
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/eiffel-second-floor-relay-2026-09-08'
EXT=Path.home()/'Library/Application Support/Claude/Claude Extensions/local.mcpb.blender-lab.blender'
a=argparse.ArgumentParser();a.add_argument('--port',default='9877');a.add_argument('--probe-only',action='store_true');a.add_argument('--verify',action='store_true');a.add_argument('--code-file');a.add_argument('--label',default='build');args=a.parse_args()
def payload(r):return r.structuredContent or json.loads(next(c.text for c in r.content if c.type=='text'))
async def main():
 async with stdio_client(StdioServerParameters(command=str(EXT/'.venv/bin/python'),args=['-m','blmcp'],cwd=str(EXT),env={**os.environ,'BLENDER_MCP_PORT':args.port})) as(r,w):
  async with ClientSession(r,w) as s:
   await s.initialize();probe=await s.call_tool('execute_blender_code',{'code':'import bpy\nresult={"version":bpy.app.version_string,"scene":bpy.context.scene.name,"file":bpy.data.filepath,"objects":len(bpy.context.scene.objects)}'})
   (OUT/f'mcp/readonly-{args.port}.json').write_text(json.dumps(probe.model_dump(mode='json'),indent=2)+'\n')
   if probe.isError or payload(probe).get('status')!='ok':raise RuntimeError('Read-only connection probe failed')
   print(json.dumps(payload(probe)),flush=True)
   if args.probe_only:return
   if args.verify:
    code='import bpy\nsource='+repr(str(OUT/'blender/eiffel-second-floor-relay.blend'))+'\nwith bpy.data.libraries.load(source,link=False) as(src,dst): dst.scenes=src.scenes\ns=dst.scenes[0]\nresult={"file":source,"objects":len(s.objects),"meshes":sum(o.type=="MESH" for o in s.objects),"roles":sorted(o.get("wf_role") for o in s.objects if o.get("wf_role"))}'
   elif args.code_file:
    code=Path(args.code_file).read_text()
   else:
    source=str(ROOT/'scripts/blender_eiffel_second_floor_relay.py');code=f'from pathlib import Path\nscope={{"__file__":{source!r}}}\nexec(compile(Path({source!r}).read_text(),{source!r},"exec"),scope)\nresult=scope["result"]'
   response=await s.call_tool('execute_blender_code',{'code':code});label='readback' if args.verify else args.label
   (OUT/f'mcp/{label}-response.json').write_text(json.dumps(response.model_dump(mode='json'),indent=2)+'\n');p=payload(response)
   if response.isError or p.get('status')!='ok':raise RuntimeError(p)
   print(json.dumps(p['result'],indent=2),flush=True)
asyncio.run(main())
