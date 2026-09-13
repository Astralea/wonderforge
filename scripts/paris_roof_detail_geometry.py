"""Original near-roof detail over the existing 1889 city kit.

Carnavalet G.30823 informs gallery roof rhythm; Liebert's1889 aerial informs
mansards and chimney clusters. These details and dimensions are authored, not
photogrammetric reconstruction. Runs inside the existing Blender builder.
"""
roof_detail_records=[]
detail=Batch()
for role in ('stone-light','zinc','glass','brick'):
    key='detail-'+role
    material=materials[role].copy();material.name='paris-'+key
    if role=='glass':
        # Opaque approximation for roof glazing, without a transparent pass.
        rgb=(.26,.36,.38,1)
        material.diffuse_color=rgb
        bs=material.node_tree.nodes.get('Principled BSDF')
        bs.inputs['Base Color'].default_value=rgb
        bs.inputs['Roughness'].default_value=.34
    materials[key]=material

# Broad roof lights with solid flashing, above the sloped iron gallery roof.
# Leave both domed central pavilions and end risalits clear.
for side in (-1,1):
    cx=side*142;cz=230;w=52;d=206
    floor=max(terrain(cx+sx*w/2,cz+sz*d/2) for sx in (-1,1) for sz in (-1,1))+.3
    for z in (151,173,258,280,302):
        for sign in (-1,1):
            x1=cx+sign*5;x2=cx+sign*13
            y1=floor+25-abs(x1-cx)*6/26+.11
            y2=floor+25-abs(x2-cx)*6/26+.11
            points=[(x1,y1,z-7),(x2,y2,z-7),(x2,y2,z+7),(x1,y1,z+7)]
            detail.poly('detail-glass',points,[(0,1,2,3) if sign<0 else (3,2,1,0)])
            for a,b in zip(points,points[1:]+points[:1]):
                detail.beam('detail-zinc',a,b,.12)
            for dz in (-3.5,0,3.5):
                detail.beam('detail-zinc',(x1,y1+.02,z+dz),(x2,y2+.02,z+dz),.055)
            roof_detail_records.append({'kind':'gallery-rooflight','center':[cx+sign*9,z],
                                        'support':'existing sloped gallery roof','bounds':points})

# Two camera-facing city blocks gain genuine dormer silhouettes and grouped
# chimney pots. One repeats a mansard vocabulary; frontage widths stay varied.
for record in south_bank_parcels:
    if record['center'] not in ([242,40],[-242,40]):continue
    for wing in record['wings']:
        if wing['roof']!='mansard' or wing['role']!='residential':continue
        cx,cz=wing['center'];w,d,h=wing['size'];eave=wing['eaveY']
        # Place dormers on long front/back ranges only. Side party walls stay bare.
        if w<14 or d>20:continue
        knee=min(1.45,min(w,d)*.13)
        for sign in (-1,1):
            for offset in (-.27,.27):
                x=cx+offset*w;z=cz+sign*(d/2-.55)
                base=eave+.4;top=eave+2.5;depth=1.3
                # Dormer penetrates the supporting mansard, never floats over it.
                detail.box('detail-stone-light',(x,(base+top)/2,z),(1.65,top-base,depth))
                detail.panel('detail-glass',(x,eave+1.55,z+sign*(depth/2+.025)),1.05,1.35,'z',sign)
                detail.box('detail-zinc',(x,top+.1,z),(1.95,.2,depth+.24))
                roof_detail_records.append({'kind':'mansard-dormer','wing':wing['id'],
                                            'center':[x,z],'baseY':base,'topY':top+.2})
        # Terracotta chimney pots have actual open dark mouths and collars.
        x=cx-w*.06;ridge=wing['ridgeY']
        for offset in (-.19,.19):
            detail.cylinder('detail-brick',(x+offset,ridge+1.35,cz),.13,.7,n=6)
            detail.cylinder('detail-zinc',(x+offset,ridge+1.705,cz),.085,.015,n=6)
        roof_detail_records.append({'kind':'chimney-pots','wing':wing['id'],'center':[x,cz]})

roof_detail_objects=detail.finish('Paris authored roof detail',city)
for obj in roof_detail_objects:obj['wf_roof_detail']=True
roof_detail_summary={'referenceImages':['carnavalet-g30823.jpg','loc-balloon-paris-large.jpg'],
 'interpretation':'Authored rooflights and mansard/chimney details; existing footprints and source solids retained',
 'features':roof_detail_records,
 'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in roof_detail_objects)}
