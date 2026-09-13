"""Parent-owned MCP correction of the existing second-floor machinery bay.

Preserves the previous .blend and all fixed tower, cart, worker and guide poses.
Only the matched engine/drum assembly moves outward along its authored axis.
"""
import bpy
import json
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts/eiffel-upper-material-chain-2026-09-08'
PRIOR = ROOT / 'artifacts/eiffel-second-floor-relay-2026-09-08'
with bpy.data.libraries.load(str(PRIOR / 'blender/eiffel-second-floor-relay.blend'), link=False) as (source, target):
    matches = [name for name in source.scenes if name.startswith('WonderForge — second floor named load relay')]
    target.scenes = [matches[-1]]
scene = target.scenes[0]
scene.name = 'WonderForge — second floor clear machinery bay'
bpy.context.window.scene = scene

design = json.loads((PRIOR / 'asset-design.json').read_text())
distance = 2.3
direction = design['direction']
delta = [direction[0] * distance, 0, direction[1] * distance]
engine = next(o for o in scene.objects if o.get('wf_role') == 'relay-steam-drive')
engine.location += Vector((delta[0], -delta[2], delta[1]))
winch = next(o for o in scene.objects if o.get('wf_role') == 'relay-fixed-winch')
moved = [engine.name]
for obj in winch.children:
    if obj.get('wf_role') == 'relay-drum' or obj.name.startswith(('winch-bed', 'winch-bearing', 'drum-shaft')):
        obj.location.x += distance
        moved.append(obj.name)
assert len(moved) == 6, moved
bpy.context.view_layer.update()

model = OUT / 'model/second-floor-clearance.glb'
blend = OUT / 'blender/eiffel-second-floor-clearance.blend'
bpy.ops.object.select_all(action='DESELECT')
for obj in scene.objects:
    obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(model), export_format='GLB', use_selection=True,
    use_active_scene=True, export_extras=True, export_yup=True,
    export_animations=False, export_lights=False, export_cameras=False)
bpy.data.libraries.write(str(blend), {scene}, fake_user=True)
design['drum'][0] += distance
design['steam']['rootPosition'] = [a + b for a, b in zip(design['steam']['rootPosition'], delta)]
design['sourceScene'] = scene.name
design['clearanceCorrection'] = {'distanceU': distance, 'worldDelta': delta, 'movedRoots': moved}
design['productionReady'] = False
(OUT / 'receiver/relay-clearance-design.json').write_text(json.dumps(design, indent=2) + '\n')
result = {'scene': scene.name, 'objects': len(scene.objects),
    'meshes': sum(o.type == 'MESH' for o in scene.objects),
    'blend': str(blend), 'model': str(model), 'worldDelta': delta, 'movedRoots': moved}
