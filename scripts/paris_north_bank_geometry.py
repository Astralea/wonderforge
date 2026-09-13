"""Continuous polygonal Paris street blocks. Executed in the Blender builder.
1889 photographs inform street/court massing; coordinates are authored.
"""
import struct
nb=SITE_LAYOUT['northBank']
north_bank_parcels=[];north_bank_streets=[]

def area(poly):return sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(poly,poly[1:]+poly[:1]))/2

def ccw(poly):return poly if area(poly)>0 else list(reversed(poly))

def clip(poly,n,c):
    out=[]
    if not poly:return out
    for a,b in zip(poly,poly[1:]+poly[:1]):
        da=a[0]*n[0]+a[1]*n[1]-c;db=b[0]*n[0]+b[1]*n[1]-c
        if da>=-1e-8:out.append(a)
        if (da>0)!=(db>0):
            t=da/(da-db);out.append((a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])))
    clean=[]
    for p in out:
        if not clean or math.dist(p,clean[-1])>1e-6:clean.append(p)
    if len(clean)>1 and math.dist(clean[0],clean[-1])<1e-6:clean.pop()
    return clean if len(clean)>2 and abs(area(clean))>1e-6 else []

def inset(poly,d):
    result=poly[:]
    for a,b in zip(poly,poly[1:]+poly[:1]):
        length=math.dist(a,b);n=(-(b[1]-a[1])/length,(b[0]-a[0])/length)
        result=clip(result,n,n[0]*a[0]+n[1]*a[1]+d)
    if len(result)==len(poly):
        choices=[result[k:]+result[:k] for k in range(len(result))]
        result=min(choices,key=lambda q:sum(math.dist(a,b)**2 for a,b in zip(poly,q)))
    return result

def exclude_rect(poly,rect):
    # Disjoint convex pieces outside a rectangle; no hidden AABB assumptions.
    x1,z1,x2,z2=rect;inside=poly;pieces=[]
    for n,c in [((1,0),x1),((-1,0),-x2),((0,1),z1),((0,-1),-z2)]:
        outside=clip(inside,(-n[0],-n[1]),-c)
        if outside:pieces.append(outside)
        inside=clip(inside,n,c)
        if not inside:break
    return pieces

def bound(poly):return [min(p[0] for p in poly),min(p[1] for p in poly),max(p[0] for p in poly),max(p[1] for p in poly)]

def emit_surface(poly,key,lift):
    # Triangular grid refines each polygon to shared sampled terrain, so a
    # planar urban layout never flattens or floats above the real land.
    if not poly:return
    a=poly[0]
    def triangle(a,b,c):
        length=max(math.dist(a,b),math.dist(b,c),math.dist(c,a))
        if length>24:
            # Split only the longest edge: uniform four-way subdivision turns
            # a long narrow boulevard into tens of thousands of thin triangles.
            if math.dist(a,b)>=max(math.dist(b,c),math.dist(c,a)):
                mid=tuple((a[i]+b[i])/2 for i in range(2));triangle(a,mid,c);triangle(mid,b,c)
            elif math.dist(b,c)>=math.dist(c,a):
                mid=tuple((b[i]+c[i])/2 for i in range(2));triangle(a,b,mid);triangle(a,mid,c)
            else:
                mid=tuple((c[i]+a[i])/2 for i in range(2));triangle(a,b,mid);triangle(mid,b,c)
        else:
            # GLB coordinates are Float32. Boolean intersection dust smaller
            # than that precision can invert a triangle after export.
            f32=lambda x:struct.unpack('f',struct.pack('f',x))[0]
            points=[(f32(x),f32(z)) for x,z in (a,b,c)]
            if area(points)<=1e-4 or min(math.dist(p,q) for p,q in zip(points,points[1:]+points[:1]))<.001:return
            static.poly(key,[(x,terrain(x,z)+lift,z) for x,z in points],[(2,1,0)])
    for i in range(1,len(poly)-1):triangle(a,poly[i],poly[i+1])

surface_queue=[]
def surface(poly,key,lift):surface_queue.append((poly,key,lift))

def subtract_polygon(poly,obstacle):
    inside=poly;pieces=[]
    for a,b in zip(obstacle,obstacle[1:]+obstacle[:1]):
        dx=b[0]-a[0];dz=b[1]-a[1];length=math.hypot(dx,dz)
        n=(-dz/length,dx/length);c=n[0]*a[0]+n[1]*a[1]
        outside=clip(inside,(-n[0],-n[1]),-c)
        if outside:pieces.append(outside)
        inside=clip(inside,n,c)
        if not inside:break
    return pieces

def street(a,b,width,key,kind):
    dx=b[0]-a[0];dz=b[1]-a[1];length=math.hypot(dx,dz);nx=-dz/length*width/2;nz=dx/length*width/2
    poly=ccw([(a[0]+nx,a[1]+nz),(a[0]-nx,a[1]-nz),(b[0]-nx,b[1]-nz),(b[0]+nx,b[1]+nz)])
    for piece in exclude_rect(poly,nb['palaisKeepout']):
        surface(piece,key,.08 if key=='road' else .24)
        north_bank_streets.append({'kind':kind,'bounds':bound(piece),'polygon':piece,'material':key})

def ring_paving(outer,inner):
    # Both polygons have matching corners for street cells before boulevard cut.
    if len(outer)!=len(inner):return
    for i in range(len(outer)):
        j=(i+1)%len(outer)
        for piece in exclude_rect(ccw([outer[i],outer[j],inner[j],inner[i]]),nb['palaisKeepout']):
            surface(piece,'paving',.24)
            north_bank_streets.append({'kind':'sidewalk','bounds':bound(piece),'polygon':piece,'material':'paving'})

# The river-facing cross-street remains the shared128-person circulation route.
# Deeper streets vary in spacing and turn gently instead of repeating a grid.
xcuts=[-875,-801,-716,-623,-518,-405,-315,-245,-176,-82,15,111,195,273,356,467,569,650,724,803,875]
zbase=[-382.5,-474,-569,-680,-790]
def node(i,j):
    x=xcuts[i]
    return (x+(0 if j==0 else 11*math.sin(i*.73+j*.91)),zbase[j]+(0 if j==0 else 9*math.sin(i*.48+j*.6)))
avenueA=(-885,-782);avenueB=(586,-382.5)
avlength=math.dist(avenueA,avenueB);avn=(-(avenueB[1]-avenueA[1])/avlength,(avenueB[0]-avenueA[0])/avlength);avc=sum(avn[i]*avenueA[i] for i in range(2))
for j in range(5):
    for i in range(len(xcuts)-1):street(node(i,j),node(i+1,j),6 if j==0 else 8,'road','cross-street')
for i in range(len(xcuts)):
    for j in range(4):street(node(i,j),node(i,j+1),8,'road','residential-street')
# Boulevard and its uninterrupted footways create real triangular corner plots.
street(avenueA,avenueB,22,'road','diagonal-boulevard')
for sign in (-1,1):
    aa=tuple(avenueA[k]+sign*avn[k]*12.7 for k in range(2));bb=tuple(avenueB[k]+sign*avn[k]*12.7 for k in range(2))
    street(aa,bb,3,'paving','boulevard-sidewalk')
# Retain known first-street footways exactly; tests compare soles to this GLB.
for col in range(nb['columns']):
    x=nb['xStart']+col*nb['xSpacing']
    for side in (-1,1):street((x-29.5,-382.5+side*4),(x+29.5,-382.5+side*4),2,'paving','sidewalk')
for x in nb['connectorsX']:
    quay_z=-175-math.tan(.08)*x-71
    street((x,-382.5),(x,quay_z),6,'road','quay-connector')
    for side in (-1,1):street((x+side*4,-379.5),(x+side*4,quay_z),2,'paving','quay-sidewalk')

def solid(poly,bottom,top,key):
    n=len(poly);v=[(x,y,z) for y in (bottom,top) for x,z in poly]
    static.poly(key,v,[tuple(range(n)),tuple(reversed(range(n,2*n)))]+[(i+n,(i+1)%n+n,(i+1)%n,i) for i in range(n)])

def house(poly,seed,record):
    pr=random.Random(seed);poly=ccw(poly);n=len(poly)
    heights=[terrain(x,z) for x,z in poly];floor=max(heights)+.24;bottom=min(heights)-.16
    h=13.5+pr.uniform(0,7);eave=floor+h;roofh=pr.uniform(2.7,4.9);variant=seed%4
    solid(poly,bottom,floor,'stone-warm')
    # One whole quarter-atlas frontage per edge repeat; walls remain real3D.
    for i,(a,b) in enumerate(zip(poly,poly[1:]+poly[:1])):
        repeat=max(1,round(math.dist(a,b)/11.4));u0=variant/4;u1=(variant+repeat)/4
        vv=[(a[0],floor,a[1]),(b[0],floor,b[1]),(b[0],eave,b[1]),(a[0],eave,a[1])]
        static.poly('masonry-facade',vv,[(3,2,1,0)],[(u0,0),(u1,0),(u1,1),(u0,1)])
    top=inset(poly,min(2.3,math.sqrt(abs(area(poly)))*.105))
    if len(top)==n:
        v=[(x,eave,z) for x,z in poly]+[(x,eave+roofh,z) for x,z in top]
        static.poly('slate' if seed%3==1 else 'zinc',v,[(i+n,(i+1)%n+n,(i+1)%n,i) for i in range(n)]+[tuple(reversed(range(n,2*n)))])
    else:
        cx=sum(p[0] for p in poly)/n;cz=sum(p[1] for p in poly)/n
        static.poly('slate',[(x,eave,z) for x,z in poly]+[(cx,eave+roofh,cz)],[(n,(i+1)%n,i) for i in range(n)])
    # Individual chimney stacks break rooflines, not a repeat of corner towers.
    cx=sum(p[0] for p in top or poly)/len(top or poly);cz=sum(p[1] for p in top or poly)/len(top or poly)
    static.box('brick',(cx,eave+roofh+.6,cz),(.85,1.35,.65))
    record['wings'].append({'polygon':poly,'bounds':bound(poly),'eaveY':eave,'ridgeY':eave+roofh,'supportY':floor,'baseY':bottom,'roof':seed%3,'facadeAtlasStart':variant})

parcel_index=0
for j in range(4):
    for i in range(len(xcuts)-1):
        cell=ccw([node(i,j),node(i+1,j),node(i+1,j+1),node(i,j+1)])
        # Corner-aligned street pavement, no grass moat around each house.
        outer=inset(cell,4.2);inner=inset(cell,7.2)
        if j>0:ring_paving(outer,inner)
        else:
            # Skip front ring to preserve route's exact2m material footprint.
            for k in range(len(outer)):
                q=(k+1)%len(outer)
                if (outer[k][1]+outer[q][1])/2> -395:continue
                piece=ccw([outer[k],outer[q],inner[q],inner[k]])
                for p in exclude_rect(piece,nb['palaisKeepout']):
                    surface(p,'paving',.24);north_bank_streets.append({'kind':'sidewalk','bounds':bound(p),'polygon':p,'material':'paving'})
        pieces=exclude_rect(inset(cell,8.2),nb['palaisKeepout'])
        for piece in pieces:
            for side in (-1,1):
                poly=clip(piece,(side*avn[0],side*avn[1]),side*avc+15)
                if not poly or area(poly)<650:continue
                # Deep perimeter walls leave inward courts; narrow wedge plots
                # use a single hipped volume instead of self-crossing offset.
                depth=10.3+((i+j*7)%5)*.7;court=inset(poly,depth)
                if court and area(court)>90 and len(court)!=len(poly):
                    # A clipped corner may disappear under a constant offset.
                    # Keep the court by a homothetic inset, not a warehouse-sized
                    # solid filling the whole street block.
                    center=(sum(p[0] for p in poly)/len(poly),sum(p[1] for p in poly)/len(poly))
                    bb=bound(poly);ratio=min(.64,2*depth/min(bb[2]-bb[0],bb[3]-bb[1]))
                    court=[tuple(p[k]+ratio*(center[k]-p[k]) for k in range(2)) for p in poly]
                if court and area(court)>90 and len(court)==len(poly):
                    typology='triangular-court' if len(poly)==3 else 'angled-court' if len(poly)>4 else 'street-court'
                else:typology='corner-house';court=[]
                record={'id':f'urban-{j}-{i}-{side}-{parcel_index}','bounds':bound(poly),'polygon':poly,'typology':typology,'courtyardPolygon':court,'wings':[]}
                if not court:house(poly,18890+parcel_index*127,record)
                else:
                    for edge,(a,b) in enumerate(zip(poly,poly[1:]+poly[:1])):
                        c=court[(edge+1)%len(court)];d=court[edge]
                        length=math.dist(a,b);count=max(1,round(length/(20+(i+edge)%7)))
                        weights=[1+((edge*7+k*3+i)%7)*.08 for k in range(count)];cursor=0
                        for k,weight in enumerate(weights):
                            t0=cursor/sum(weights);cursor+=weight;t1=cursor/sum(weights)
                            mix=lambda p,q,t:tuple(p[v]+t*(q[v]-p[v]) for v in range(2))
                            part=ccw([mix(a,b,t0),mix(a,b,t1),mix(d,c,t1),mix(d,c,t0)])
                            house(part,18890+parcel_index*127+edge*19+k,record)
                if court and (i+j)%3==0 and area(court)>600:
                    # A narrow rear workshop attaches to the inner street wall;
                    # it occupies one side of the court and leaves two open yards.
                    k=max(range(len(court)),key=lambda k:math.dist(court[k],court[(k+1)%len(court)]))
                    a=court[k];b=court[(k+1)%len(court)];center=(sum(p[0] for p in court)/len(court),sum(p[1] for p in court)/len(court))
                    mix=lambda p,q,t:tuple(p[v]+t*(q[v]-p[v]) for v in range(2))
                    aa=mix(a,b,.37);bb=mix(a,b,.57);cc=mix(bb,center,.74);dd=mix(aa,center,.74)
                    house(ccw([aa,bb,cc,dd]),97000+parcel_index,record)
                    record['typology']='rear-workshop-court'
                record['height']=max(w['ridgeY'] for w in record['wings'])-min(w['supportY'] for w in record['wings'])
                north_bank_parcels.append(record);parcel_index+=1

# Street junctions share one surface. Different tessellations of overlapping
# coplanar strips otherwise self-intersect/shadow each other during orbit.
north_bank_surface_pieces=[]
accepted={'road':[],'paving':[]}
for poly,key,lift in surface_queue:
    remaining=[poly]
    pb=bound(poly)
    for previous,bb in accepted[key]:
        if min(pb[2],bb[2])-max(pb[0],bb[0])<1e-7 or min(pb[3],bb[3])-max(pb[1],bb[1])<1e-7:continue
        remaining=[part for candidate in remaining for part in subtract_polygon(candidate,previous)]
        if not remaining:break
    for part in remaining:
        if area(part)<=1e-4:continue
        emit_surface(part,key,lift)
        north_bank_surface_pieces.append({'material':key,'polygon':part})
    # The union of original polygons equals the retained fragments; using the
    # originals as future cutters keeps clipping cost bounded.
    accepted[key].append((poly,pb))
