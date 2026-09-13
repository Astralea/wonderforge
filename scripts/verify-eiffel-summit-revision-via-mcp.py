"""Reload precisely the two saved scenes through MCP and render the source."""
import asyncio,json,os,sys
from pathlib import Path
from mcp import ClientSession,StdioServerParameters
from mcp.client.stdio import stdio_client
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/eiffel-summit-revision-2026-09-08'
EXT=Path.home()/'Library/Application Support/Claude/Claude Extensions/local.mcpb.blender-lab.blender'
CODE=r'''
import bpy,json
from pathlib import Path
from mathutils import Vector
out=Path(OUT_PATH)
(out/'renders').mkdir(exist_ok=True)
records=[]
for relative,scene_name in [('blender/source-generation/eiffel-tower.blend','WonderForge Eiffel — Blender reconstruction'),('blender/eiffel-tower.blend','WonderForge Eiffel — bounded erection kit')]:
    path=out/relative
    with bpy.data.libraries.load(str(path),link=False) as (source,target):
        if scene_name not in source.scenes:raise ValueError('Missing exact named scene')
        target.scenes=[scene_name]
    scene=target.scenes[0]
    bpy.context.window.scene=scene
    refs=[o.data for o in scene.objects if o.type=='EMPTY' and o.empty_display_type=='IMAGE']
    record={'path':str(path),'scene':scene.name,'objects':len(scene.objects),'meshes':sum(o.type=='MESH' for o in scene.objects),
       'packedReferences':[{'name':im.name,'size':list(im.size),'packed':im.packed_file is not None} for im in refs]}
    if len(refs)!=1 or not refs[0].packed_file:raise ValueError('Historical reference not packed')
    if 'source-generation' in relative:
        studio=next(c for c in scene.collection.children if c.name.startswith('STUDIO'))
        data=bpy.data.cameras.new('Summit review — Rouillard 1889')
        cam=bpy.data.objects.new(data.name,data);studio.objects.link(cam);scene.camera=cam
        v=lambda p:Vector((p[0],-p[2],p[1]))
        def aim(position,target,scale):
            cam.location=v(position);cam.rotation_euler=(v(target)-cam.location).to_track_quat('-Z','Y').to_euler()
            data.type='ORTHO';data.ortho_scale=scale;data.clip_end=5000
        scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
        scene.render.threads_mode='FIXED';scene.render.threads=10
        scene.render.resolution_x=1000;scene.render.resolution_y=1400;scene.render.resolution_percentage=100
        for name,position,target,scale in [('summit-three-quarter',(36,296,51),(0,291,0),47),('summit-front',(0,291,65),(0,291,0),47)]:
            aim(position,target,scale)
            scene.render.filepath=str(out/'renders'/f'{name}.png')
            bpy.ops.render.render(write_still=True)
        aim((36,296,51),(0,291,0),47)
        # An additional saved review camera leaves the original whole-tower camera.
        bpy.data.libraries.write(str(out/'blender/eiffel-tower-summit-review.blend'),{scene},fake_user=True)
    records.append(record)
(out/'mcp'/'reload-summary.json').write_text(json.dumps(records,indent=2)+'\n')
result={'reloadedScenes':records}
'''
async def main():
    async with stdio_client(StdioServerParameters(command=str(EXT/'.venv/bin/python'),args=['-m','blmcp'],cwd=str(EXT),env={**os.environ,'BLENDER_MCP_PORT':'9877'})) as (r,w):
        async with ClientSession(r,w) as session:
            await session.initialize()
            readback='--readback' in sys.argv
            code=CODE if not readback else '''
import bpy,json
from pathlib import Path
result={'savedReloadSummary':json.loads((Path(OUT_PATH)/'mcp/reload-summary.json').read_text()),
        'currentScene':bpy.context.scene.name,'currentObjects':len(bpy.context.scene.objects),
        'currentPackedReferences':[o.data.name for o in bpy.context.scene.objects if o.type=='EMPTY' and o.empty_display_type=='IMAGE' and o.data.packed_file]}
'''
            response=await session.call_tool('execute_blender_code',{'code':'OUT_PATH='+repr(str(OUT))+'\n'+code})
            (OUT/('mcp/mcp-reload-readback-result.json' if readback else 'mcp/mcp-reload-render-result.json')).write_text(json.dumps(response.model_dump(mode='json'),indent=2)+'\n')
            payload=response.structuredContent or json.loads(next(c.text for c in response.content if c.type=='text'))
            if response.isError or payload.get('status')!='ok':raise RuntimeError('Reload/render failed')
            print(json.dumps(payload,indent=2))
asyncio.run(main())
