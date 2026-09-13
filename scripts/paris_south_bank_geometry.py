"""Photo-guided near-city massing inside the unchanged forty street cells.
Executed by the parent Blender builder; all dimensions are metres, Y up.
"""
building_records=[]
south_bank_parcels=[]

def near_roof(cx,cz,w,d,eave,kind,key,wall_key):
    def ring(inset,y):
        return [(cx-w/2+inset,y,cz-d/2+inset),(cx+w/2-inset,y,cz-d/2+inset),
                (cx+w/2-inset,y,cz+d/2-inset),(cx-w/2+inset,y,cz+d/2-inset)]
    low=ring(0,eave)
    if kind=='gable':
        height=3.1 if d<14 else 4.2
        verts=low+[(cx-w/2,eave+height,cz),(cx+w/2,eave+height,cz)]
        static.poly(key,verts,[(4,5,1,0),(3,2,5,4)])
        static.poly(wall_key,verts,[(0,3,4),(1,5,2)])
    elif kind=='mansard':
        height=4.8;knee=min(1.45,min(w,d)*.13)
        upper=min(min(w,d)*.43,knee+3.2)
        verts=low+ring(knee,eave+2.9)+ring(upper,eave+height)
        faces=[]
        for level in (0,4):
            faces += [(i+level+4,(i+1)%4+level+4,(i+1)%4+level,i+level) for i in range(4)]
        static.poly(key,verts,faces+[(11,10,9,8)])
    else:
        height=2.7 if kind=='low-hip' else 4.0
        inset=min(w,d)*(.32 if kind=='low-hip' else .43)
        static.poly(key,low+ring(inset,eave+height),[(4,5,1,0),(5,6,2,1),(6,7,3,2),(7,4,0,3),(7,6,5,4)])
    return eave+height

def near_house(record,cx,cz,w,d,h,seed,kind='mansard',service=False):
    # Eaves/plinths stay inside this declared footprint, including party edges.
    corners=[(cx+sx*w/2,cz+sz*d/2) for sx in (-1,1) for sz in (-1,1)]
    ground=[terrain(x,z) for x,z in corners];floor=max(ground)+.24;bottom=min(ground)-.16
    static.box('stone-warm',(cx,(floor+bottom)/2,cz),(w,floor-bottom,d))
    if service:
        static.box('brick',(cx,floor+h/2,cz),(w,h,d))
        for sign in (-1,1):
            for k in range(max(1,int(w/7))):
                xx=cx-w/2+(k+.5)*w/max(1,int(w/7))
                static.panel('glass',(xx,floor+h*.62,cz+sign*(d/2+.025)),1.8,min(2.3,h*.32),'z',sign)
    else:
        static.facade_box((cx,floor+h/2,cz),(w,h,d),floor,floor+h,'stone',seed%4)
    static.box('stone-light',(cx,floor+h-.12,cz),(w,.24,d))
    eave=floor+h
    ridge=near_roof(cx,cz,w,d,eave,kind,'slate' if seed%3 else 'zinc','brick' if service else 'stone')
    # Off-centre party-wall stacks reinforce the varied ridge silhouette.
    static.box('brick',(cx-w*.06,ridge-.5,cz),(.72,3.0,.6))
    wing={'id':f"{record['id']}-wing-{len(record['wings'])}",'block':record['id'],
          'center':[cx,cz],'size':[w,d,h],'bounds':[cx-w/2,cz-d/2,cx+w/2,cz+d/2],
          'supportY':floor,'baseY':bottom,'eaveY':eave,'ridgeY':ridge,'roof':kind,
          'role':'service' if service else 'residential','facadeAtlasStart':seed%4}
    record['wings'].append(wing);building_records.append(wing)

names=['rear-workshop','paired-courts','open-service-court','stepped-frontage','mixed-low-rear']
for side in (-1,1):
    for col in range(4):
        for row in range(5):
            x=side*(242+104*col);z=40+104*row
            seed=1889+col*131+row*47+(side+1)*17;pr=random.Random(seed)
            style=(col*3+row+(2 if side==1 else 0))%5
            record={'id':f'block-{side}-{col}-{row}','center':[x,z],
                    'bounds':[x-41,z-35,x+41,z+35],'typology':names[style],'wings':[],
                    'courtyardFixtures':'retained tree at local [10,0] for inner two columns',
                    'interpretation':'Authored massing informed by Liebert 1889; existing traffic reservations preserved'}
            # Unequal town-house parcels meet at party walls. Lower rear ranges
            # and staggered front edges change whole-block silhouettes.
            for edge in (-1,1):
                count=3 if style in (1,3) else 4
                widths=[pr.uniform(.82,1.18) for _ in range(count)];total=sum(widths);cursor=x-41
                depth=15 if edge<0 else (18 if style==0 else 14)
                for k,value in enumerate(widths):
                    w=value/total*82;setback=(2.4 if k%2 else 0) if style==3 and edge<0 else 0
                    h=12.8+((seed+k*3+(4 if edge>0 else 0))%9)*1.12
                    service=style==4 and edge>0
                    if service:h=6.4+(k%3)*1.15
                    kind='low-hip' if service else ('gable' if (k+style+edge)%4==0 else ('hip' if (k+seed)%5==0 else 'mansard'))
                    near_house(record,cursor+w/2,z+edge*(35-depth/2-setback),w,depth,h,seed+k+(10 if edge>0 else 0),kind,service)
                    cursor+=w
            # Side ranges end before the front/back walls; no intersecting
            # corner solids or roofs hidden beneath a neighbouring house.
            for edge in (-1,1):
                d=25 if style==0 else 30
                cz=z
                if style==2 and edge==1:d=18;cz=z-6
                h=12.2+((seed+edge*3)%7)*1.1
                service=style==4 and edge==1
                if service:h=8.2
                near_house(record,x+edge*(41-5.5),cz,11,d,h,seed+20+edge,'gable' if service else 'mansard',service)
            # Internal lower ranges divide yards asymmetrically instead of
            # repeating a tiny isolated shed in every grass rectangle.
            if style==1:
                near_house(record,x-9,z,8,39,6.6,seed+31,'gable',True)
            elif style==2:
                near_house(record,x-11,z+5,19,14,5.8,seed+32,'low-hip',True)
            elif style==0:
                near_house(record,x-12,z,13,22,7.1,seed+33,'gable',True)
            elif style==4:
                near_house(record,x-11,z+2,16,17,5.4,seed+34,'low-hip',True)
            # A subdued courtyard surface replaces grass without extending
            # beyond this block's occupied reservation. It follows shared land.
            for ix in range(14):
                for iz in range(9):
                    x1=x-28+ix*4;z1=z-18+iz*4;x2=x1+4;z2=z1+4
                    static.poly('courtyard-earth',[(xx,terrain(xx,zz)+.06,zz) for xx,zz in [(x1,z1),(x2,z1),(x2,z2),(x1,z2)]],[(3,2,1,0)])
            blocks.append(record);south_bank_parcels.append(record)
