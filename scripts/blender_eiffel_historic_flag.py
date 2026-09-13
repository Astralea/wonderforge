"""Parent-owned 1889 summit furnishing, executed through Blender Lab MCP."""
import bpy, math, json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/eiffel-historic-flag-2026-09-08'
MODEL=OUT/'model'; MODEL.mkdir(parents=True,exist_ok=True)
(OUT/'blender').mkdir(exist_ok=True)
scene=bpy.data.scenes.new('Eiffel 1889 — summit tricolor')
bpy.context.window.scene=scene
collection=bpy.data.collections.new('Original cloth — mast attached')
scene.collection.children.link(collection)
root=bpy.data.objects.new('eiffel-historic-tricolor',None);collection.objects.link(root)
root['wf_anchor_y_up']=[.09,310.9,0]
root['wf_scope']='Authored 8 by 5 m interpretation of the flag shown in Rouillard 1889; not a measured historical size.'
objects=[]
for stripe,(name,color) in enumerate([('blue',(0.014,0.047,.22,1)),('white',(.8,.77,.68,1)),('red',(.55,.024,.031,1))]):
    material=bpy.data.materials.new('woven-'+name);material.diffuse_color=color;material.use_nodes=True
    bsdf=material.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Base Color'].default_value=color;bsdf.inputs['Roughness'].default_value=.93
    material.use_backface_culling=False
    verts=[];uv=[];faces=[]
    for j in range(16):
        for i in range(9):
            x=(stripe*8+i)/24*8;y=-j/15*5
            z=.24*(x/8)*math.sin(x*.9+j*.21)
            verts.append((x,-z,y));uv.append((x/8,j/15))
    for j in range(15):
        for i in range(8):
            a=j*9+i;faces.append((a,a+1,a+10,a+9))
    mesh=bpy.data.meshes.new('cloth-'+name);mesh.from_pydata(verts,[],faces);mesh.materials.append(material);mesh.update()
    layer=mesh.uv_layers.new(name='ClothUV')
    for polygon in mesh.polygons:
        polygon.use_smooth=True
        for loop in polygon.loop_indices:layer.data[loop].uv=uv[mesh.loops[loop].vertex_index]
    obj=bpy.data.objects.new('tricolor-'+name,mesh);collection.objects.link(obj);obj.parent=root
    obj['wf_flag_cloth']=True;objects.append(obj)
bpy.ops.object.select_all(action='DESELECT')
for obj in [root,*objects]:obj.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=str(MODEL/'flag.glb'),export_format='GLB',use_selection=True,export_extras=True,export_yup=True)
bpy.data.libraries.write(str(OUT/'blender/eiffel-historic-flag.blend'),{scene},fake_user=True)
manifest={'version':1,'asset':'flag.glb','coordinates':'metres, Y up, local hoist top at origin','anchor':[.09,310.9,0],'width':8,'height':5,'triangles':720,'stripes':['blue','white','red'],'windAxis':'local Z','fixedHoistX':0,'interpretation':root['wf_scope'],'source':'https://www.toureiffel.paris/en/news/history-and-culture/french-flag-eiffel-tower-powerful-symbol'}
(MODEL/'flag.manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
result={'blend':str(OUT/'blender/eiffel-historic-flag.blend'),'model':str(MODEL/'flag.glb'),'objects':len(scene.objects),'manifest':manifest}
