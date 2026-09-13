"""Photograph-led Champ de Mars volumes. Executed in the Paris Blender builder.
CNAM Rapport general 1889, vol II: paired domed galleries, central dome,
Galerie des Machines, fountains and garden promenades. Distances compressed.
"""
landmarks=[];plantings=[];promenades=[]

def plinth(x,z,w,d,top):
    bottom=min(terrain(x+sx*w/2,z+sz*d/2) for sx in (-1,1) for sz in (-1,1))-.12
    if top>bottom:static.box('stone-warm',(x,(top+bottom)/2,z),(w,top-bottom,d))

def mark(name,c,size,kind):landmarks.append({'id':name,'center':list(c),'size':list(size),'kind':kind})
def ground_rect(cx,cz,w,d,key='paving',lift=.24):
    # Terrain-tessellated paving preserves contact across the sloping Champ.
    steps=max(1,math.ceil(w/4))
    for i in range(steps):strip(cx-w/2+(i+.5)*w/steps,cz-d/2,cx-w/2+(i+.5)*w/steps,cz+d/2,w/steps,key,lift)

def dome(cx,cz,y,r,h,key='copper',n=20,ribs=True):
    rings=6;verts=[]
    for j in range(rings+1):
        a=j/rings*math.pi/2
        for i in range(n):
            t=i/n*math.tau;verts.append((cx+r*math.cos(a)*math.cos(t),y+h*math.sin(a),cz+r*math.cos(a)*math.sin(t)))
    faces=[]
    for j in range(rings):
        for i in range(n):a=j*n+i;b=j*n+(i+1)%n;faces.append((a,b,b+n,a+n))
    static.poly(key,verts,[tuple(reversed(f)) for f in faces])
    if ribs:
        for i in range(0,n,2):
            t=i/n*math.tau
            for j in range(rings):
                a=j/rings*math.pi/2;b=(j+1)/rings*math.pi/2
                static.beam('gilt',(cx+(r+.13)*math.cos(a)*math.cos(t),y+(h+.13)*math.sin(a),cz+(r+.13)*math.cos(a)*math.sin(t)),(cx+(r+.13)*math.cos(b)*math.cos(t),y+(h+.13)*math.sin(b),cz+(r+.13)*math.cos(b)*math.sin(t)),.10)
    static.cylinder('gilt',(cx,y+h+.8,cz),.48,1.6,n=8)

def arch_panel(cx,y,cz,w,h,axis,sign,key='glass'):
    # A dark recessed opening capped by a half-circle, with pale stone voussoirs.
    radius=w/2;spring=y+h-radius
    def point(along,yy,out=.0):return (cx+along,yy,cz+sign*out) if axis=='z' else (cx+sign*out,yy,cz+along)
    steps=6 if w<=6 else 10
    verts=[point(-radius,y),point(radius,y)]+[point(math.cos(i*math.pi/steps)*radius,spring+math.sin(i*math.pi/steps)*radius) for i in range(steps+1)]
    face=tuple(range(len(verts)))
    if (axis=='x' and sign==1) or (axis=='z' and sign==-1):face=tuple(reversed(face))
    static.poly(key,verts,[face])
    for i in range(steps):
        a=i*math.pi/steps;b=(i+1)*math.pi/steps
        static.beam('stone-light',point(math.cos(a)*(radius+.18),spring+math.sin(a)*(radius+.18),.03),point(math.cos(b)*(radius+.18),spring+math.sin(b)*(radius+.18),.03),.17)
    for edge in (-1,1):static.beam('stone-light',point(edge*(radius+.18),y,.03),point(edge*(radius+.18),spring,.03),.17)

def flag(cx,y,cz,scale=1):
    static.beam('iron',(cx,y,cz),(cx,y+5*scale,cz),.035*scale)
    for i,key in enumerate(['blue-awning','white','red-awning']):
        static.panel(key,(cx+(.45+i*.65)*scale,y+4.2*scale,cz),.65*scale,1.15*scale,'z',1)
        static.panel(key,(cx+(.45+i*.65)*scale,y+4.2*scale,cz-.008),.65*scale,1.15*scale,'z',-1)

def palace(side):
    cx=side*142;cz=230;w=52;d=206;floor=max(terrain(cx+sx*w/2,cz+sz*d/2) for sx in (-1,1) for sz in (-1,1))+.3
    plinth(cx,cz,w,d,floor)
    mark('palais-beaux-arts' if side<0 else 'palais-arts-liberaux',(cx,cz),(w,d,47),'arcaded-palace')
    static.box('stone-warm',(cx,floor+9,cz),(w,18,d))
    static.box('stone-light',(cx,floor+18.3,cz),(w+1,.8,d+1))
    # Low long iron-and-glass roofs carry raised central and end pavilions.
    static.poly('slate',[(cx-w/2,floor+19,cz-d/2),(cx+w/2,floor+19,cz-d/2),(cx+w/2,floor+19,cz+d/2),(cx-w/2,floor+19,cz+d/2),(cx,floor+25,cz-d/2),(cx,floor+25,cz+d/2)],[(3,5,4,0),(5,2,1,4)])
    for sign in (-1,1):
        x=cx+sign*(w/2+.07)
        for k in range(25):
            z=cz-d/2+4+k*8.25
            if abs(z-(cz-18))<17:continue # projecting entrance replaces these bays
            arch_panel(x,floor+1,z,5.2,12.8,'x',sign)
            # Photograph-visible crossbars; actual surfaces, kept outside glazing.
            static.panel('stone-light',(x+sign*.12,floor+6,z),5.2,.22,'x',sign)
            static.panel('iron',(x+sign*.14,floor+6.5,z),.14,10.6,'x',sign)
            static.box('stone-light',(x,floor+7,z-3.7),(.6,14,.7))
            static.box('stone-light',(x,floor+15.7,z),(.6,.8,7.5))
            static.panel('glass',(x+sign*.02,floor+17.2,z),4.2,1.7,'x',sign)
        for k in range(13):
            z=cz-d/2+k*d/12;static.box('stone-light',(x,floor+20,z),(.85,3,.85))
            if k%3==0:flag(x,floor+21.5,z,.7)
    for z in (cz-91,cz+91):
        static.box('stone',(cx,floor+12,z),(w+4,24,24))
        for face in (-1,1):
            for x in (cx-17,cx,cx+17):arch_panel(x,floor+1,z+face*12.12,9,19,'z',face)
        for x in (cx-25,cx-8.5,cx+8.5,cx+25):
            for face in (-1,1):static.box('stone-light',(x,floor+11.5,z+face*12.2),(1.1,23,.75))
        static.box('stone-light',(cx,floor+24,z),(w+5,1,25))
        for face in (-1,1):
            zz=z+face*12.55;verts=[(cx-14,floor+24.5,zz),(cx+14,floor+24.5,zz),(cx,floor+30,zz)]
            static.poly('stone-light',verts,[(0,1,2) if face>0 else (2,1,0)])
            static.beam('gilt',verts[0],verts[2],.2);static.beam('gilt',verts[2],verts[1],.2)
    # Central three-arch risalit visible in LoC92519631 / CarnavaletG.30823.
    entrance_z=cz-18
    static.box('stone-warm',(cx,floor+13,entrance_z),(w+2,26,34))
    for sign in (-1,1):
        xx=cx+sign*(w/2+1.18)
        for dz in (-10,0,10):
            arch_panel(xx,floor+1,entrance_z+dz,7.0,20,'x',sign)
            static.panel('stone-light',(xx+sign*.10,floor+8,entrance_z+dz),7,.3,'x',sign)
            static.panel('iron',(xx+sign*.12,floor+9,entrance_z+dz),.18,16,'x',sign)
        for dz in (-16,-5,5,16):
            static.box('stone-light',(xx,floor+12,entrance_z+dz),(.8,24,1.0))
            static.box('stone-light',(xx,floor+23.7,entrance_z+dz),(1.2,.9,1.6))
        static.box('stone-light',(xx,floor+26.3,entrance_z),(1.3,.8,35))
        # Triangular pediment, thick enough to remain distinct in the orbit.
        verts=[(xx,floor+26.8,entrance_z-17),(xx,floor+26.8,entrance_z+17),(xx,floor+32,entrance_z)]
        static.poly('stone-light',verts,[(0,1,2) if sign<0 else (2,1,0)])
    # Drum, round windows and ribs reproduce the dominant photo silhouettes.
    static.cylinder('stone',(cx,floor+23,cz-18),21,8,n=20)
    for k in range(20):
        a=(k+.5)*math.tau/20;normal=Vector((math.cos(a),0,math.sin(a)))
        tangent=Vector((-math.sin(a),0,math.cos(a)))
        center=Vector((cx,floor+24,cz-18))+normal*(21*math.cos(math.pi/20)+.04)
        vv=[tuple(center+tangent*(math.cos(j*math.tau/8)*1.15)+Vector((0,math.sin(j*math.tau/8)*1.15,0))) for j in range(8)]
        static.poly('glass',vv,[tuple(reversed(range(8)))])
        outer=[center+tangent*(math.cos(j*math.tau/8)*1.43)+Vector((0,math.sin(j*math.tau/8)*1.43,0)) for j in range(8)]
        static.poly('stone-light',vv+[tuple(v) for v in outer],[(j,(j+1)%8,(j+1)%8+8,j+8) for j in range(8)])
    for k in range(16):
        a=k*math.tau/16
        static.beam('stone-light',(cx+21.2*math.cos(a),floor+19,cz-18+21.2*math.sin(a)),(cx+21.2*math.cos(a),floor+27,cz-18+21.2*math.sin(a)),.22)
    dome(cx,cz-18,floor+27,21,17,'copper' if side<0 else 'slate')
    flag(cx,floor+45,cz-18,.75)

palace(-1);palace(1)
# The central dome and lateral industrial galleries terminate the garden axis.
cx=0;cz=392;floor=terrain(cx,cz)+.3
plinth(0,392,48,44,floor)
mark('dome-central',(0,392),(52,46,65),'industrial-dome')
for side in (-1,1):
    x=side*82
    plinth(x,cz,108,36,floor)
    static.box('stone',(x,floor+10,cz),(108,20,36))
    static.box('stone-light',(x,floor+20.3,cz),(110,.8,37))
    for k in range(12):arch_panel(x-49+k*9,floor+1,cz-18.08,5.8,16,'z',-1)
    static.poly('slate',[(x-54,floor+21,cz-18),(x+54,floor+21,cz-18),(x+54,floor+21,cz+18),(x-54,floor+21,cz+18),(x-54,floor+26,cz),(x+54,floor+26,cz)],[(0,4,5,1),(4,3,2,5)])
static.box('stone-light',(0,floor+15,cz),(48,30,44))
arch_panel(0,floor+1,cz-22.1,21,25,'z',-1)
for side in (-1,1):
    static.box('ochre',(side*18,floor+15,cz-22.3),(2.2,30,1.6))
    flag(side*22,floor+31,cz-21,1)
static.cylinder('ochre',(0,floor+33,cz),21,10,n=20)
dome(0,cz,floor+38,21,21,'copper')
static.cylinder('stone-light',(0,floor+61,cz),1.8,4,n=8)
static.box('gilt',(0,floor+64,cz),(1.2,3,.9))
# Galerie des Machines: broad single barrel vault, repetitive iron ribs and glazing.
cx=0;cz=478;floor=terrain(0,478)+.3;w=300;d=94;n=18
plinth(cx,cz,w,d,floor)
mark('galerie-des-machines',(0,478),(w,d,37),'barrel-vault-hall')
static.box('stone-warm',(cx,floor+7,cz),(w,14,d))
verts=[]
for x in (-w/2,w/2):
    for i in range(n+1):
        a=i*math.pi/n;verts.append((x,floor+14+23*math.sin(a),cz-d/2*math.cos(a)))
static.poly('glass',verts,[(i+1,i+n+2,i+n+1,i) for i in range(n)])
for x in range(-150,151,15):
    for i in range(n):
        a=i*math.pi/n;b=(i+1)*math.pi/n
        static.beam('stone-light',(x,floor+14+23*math.sin(a),cz-d/2*math.cos(a)),(x,floor+14+23*math.sin(b),cz-d/2*math.cos(b)),.16)
for z in (cz-d/2-.07,cz+d/2+.07):
    for x in range(-144,150,12):arch_panel(x,floor+.8,z,8.5,12.4,'z',-1 if z<cz else 1)
# Distant Ecole: long horizontal range and central classical pavilion.
ecole_y=terrain(0,582)+.3
plinth(0,582,240,38,ecole_y)
mark('ecole-militaire',(0,582),(240,38,27),'classical-range')
static.box('stone',(0,ecole_y+8,582),(240,16,32))
static.box('slate',(0,ecole_y+17,582),(242,2,34))
static.box('stone-light',(0,ecole_y+11,580),(42,22,38))
for x in range(-114,115,6):static.panel('glass',(x,ecole_y+9,565.93),2.2,7,'z',-1)
dome(0,580,ecole_y+22,12,8,'slate',12,False)
# Exact walking lanes shared with pure traffic data.
for x in (-100,100):
    ground_rect(x,126,10,452);promenades.append({'center':[x,126],'size':[10,452]})
for z in (-100,100):
    ground_rect(0,z,210,10);promenades.append({'center':[0,z],'size':[210,10]})
for x in (-80,80):ground_rect(x,230,10,180)
for z in (145,315):ground_rect(0,z,170,10)
ground_rect(0,350,216,12);ground_rect(0,364,52,22)
# Near-site apron and exhibition garden links leave all foundation/haul corridors open.
for x in (-114,114):ground_rect(x,236,12,212)
for z in (172,287):ground_rect(0,z,156,7)
for z,length,width in [(230,68,20),(310,24,18)]:
    y=terrain(0,z)
    static.box('stone-warm',(0,y+.03,z),(width+.9,.14,length+.9))
    for sx in (-1,1):static.box('stone-light',(sx*(width/2+.35),y+.35,z),(.7,.4,length+1.4))
    for sz in (-1,1):static.box('stone-light',(0,y+.35,z+sz*(length/2+.35)),(width+1.4,.4,.7))
    if z==230:
        for zz in (z-24,z+24):
            static.cylinder('stone-light',(0,y+.9,zz),2.7,1.0,n=12)
            static.cylinder('stone-light',(0,y+1.7,zz),.55,1.2,n=10)
            static.cylinder('stone-light',(0,y+2.5,zz),1.4,.35,n=12)

# Shaped parterres, taller trees in groups, benches and compact pavilion silhouettes.
def tree(x,z,r=3.7,h=8):
    y=terrain(x,z);static.cylinder('timber',(x,y+h*.38,z),.19,h*.76,n=6)
    for ox,oz,rr in [(-r*.35,0,r*.75),(r*.3,r*.16,r*.72),(0,-r*.32,r*.78)]:
        # Octagonal rounded crown rings; substantially fuller than parasol trees.
        verts=[];n=7
        for yy,rad in [(h*.53,rr*.45),(h*.72,rr),(h*.96,rr*.65),(h*1.06,0)]:
            for i in range(n):a=i*math.tau/n;verts.append((x+ox+rad*math.cos(a),y+yy,z+oz+rad*math.sin(a)))
        static.poly('leaf' if int(x+z)%2 else 'leaf-light',verts,[((j+1)*n+i,(j+1)*n+(i+1)%n,j*n+(i+1)%n,j*n+i) for j in range(3) for i in range(n)])
    plantings.append({'x':x,'z':z,'radius':r,'height':h})
for side in (-1,1):
    for z in (194,266):
        x=side*44;y=terrain(x,z)
        static.cylinder('hedge',(x,y+.35,z),19,.55,n=24,r2=18.6)
        # Sunken color border and oval lawn enclosed by hedge.
        static.cylinder('flower',(x,y+.65,z),17.7,.10,n=24)
        static.cylinder('leaf-light',(x,y+.72,z),15.9,.10,n=24)
    for z in range(160,311,25):tree(side*66,z,3.8,8.2+(z%3))
    for zz in (194,266):
        for dx,dz in [(-13,-5),(-7,12),(9,-12),(14,5)]:tree(side*44+dx,zz+dz,3.2,7.4)
    for z in range(146,343,28):tree(side*110,z,3.7,8.5)
    for x,z in [(side*45,130),(side*66,340),(side*27,337)]:tree(x,z,4.6,9.2)
    for z in range(-70,81,30):
        if side<0:tree(side*111,z,3.4,7.6)
    for z in range(152,316,22):
        x=side*87;y=terrain(x,z)+.24
        static.box('timber',(x,y+.48,z),(1.5,.13,.52));static.box('timber',(x,y+.83,z+.28),(1.5,.52,.09))
        for dx in (-.55,.55):static.box('iron',(x+dx,y+.22,z),(.08,.44,.4))
    for z in range(-80,347,26):
        x=side*94;y=terrain(x,z)+.24
        static.cylinder('iron',(x,y+2,z),.07,4,n=6)
        static.box('cream',(x,y+4.15,z),(.48,.6,.48));static.box('iron',(x,y+4.52,z),(.65,.14,.65))

# Western exhibition village: distinct restaurant, market hall, kiosks and stalls.
ground_rect(-142,14,66,202)
for zz in (-65,0,75):ground_rect(-107,zz,22,6)
def pavilion(x,z,w,d,kind,index):
    y=terrain(x,z)+.25;h=5.5+(index%3)*1.4
    plinth(x,z,w,d,y)
    mark(f'pavilion-{index}',(x,z),(w,d,h+5),kind)
    static.box('stone-light' if index%2 else 'brick',(x,y+h/2,z),(w,h,d))
    if kind=='kiosk':dome(x,z,y+h,min(w,d)*.68,3.6,'copper',12,False)
    else:
        static.poly('red-awning' if index%2 else 'slate',[(x-w/2-.5,y+h,z-d/2-.5),(x+w/2+.5,y+h,z-d/2-.5),(x+w/2+.5,y+h,z+d/2+.5),(x-w/2-.5,y+h,z+d/2+.5),(x,y+h+4,z-d/2-.5),(x,y+h+4,z+d/2+.5)],[(3,5,4,0),(5,2,1,4)])
    for zz in range(3):arch_panel(x+w/2+.08,y+.4,z-d*.3+zz*d*.3,2.4,h-1,'x',1)
    for zz in range(3):
        static.panel('glass',(x-w/2-.02,y+h*.51,z-d*.3+zz*d*.3),2.1,h*.56,'x',-1)
    for face in (-1,1):
        for xx in range(5):
            px=x-w*.4+xx*w*.2
            static.panel('glass',(px,y+h*.51,z+face*(d/2+.02)),max(1.1,w*.1),h*.56,'z',face)
            static.box('ochre',(px,y+h*.18,z+face*(d/2+.05)),(max(1.3,w*.11),.16,.16))
    static.box('ochre',(x+w/2+.2,y+h-.4,z),(.25,.9,d*.8));flag(x,y+h+3,z,.6)
for i,(x,z,w,d,kind) in enumerate([(-147,-54,30,24,'restaurant'),(-144,4,39,35,'market-hall'),(-148,73,30,27,'timber-pavilion'),(-127,103,10,10,'kiosk'),(-162,110,9,9,'kiosk')]):pavilion(x,z,w,d,kind,i)
for i in range(14):
    x=-120 if i<7 else -167;z=-78+(i%7)*26;y=terrain(x,z)+.24
    static.box('timber',(x,y+.8,z),(4,.25,2.2))
    for sx in (-1,1):
        for sz in (-1,1):static.box('timber',(x+sx*1.9,y+1.4,z+sz*.9),(.08,2.8,.08))
    for stripe in range(4):static.box(['white','red-awning' if i%2 else 'blue-awning'][stripe%2],(x-1.65+stripe*1.1,y+2.8,z),(1.1,.12,3.1))
    for k in range(3):static.box(['ochre','flower','leaf-light'][k],(x-1.2+k*1.2,y+1.12,z),(.95,.4,1.6))
# Compact small courtyards get service sheds rather than identical empty grass squares.
for b in blocks:
    x,z=b['center'];v=int(abs(x)+z)%4
    if v!=0 and 'typology' not in b:
        static.box('brick',(x-8,terrain(x-8,z)+2,z),(12,4,13))
        static.box('slate',(x-8,terrain(x-8,z)+4.2,z),(12.5,.4,13.5))
    if abs(x)<360:tree(x+10,z,3.1,6.7)

exec(compile((ROOT/'scripts/paris_north_bank_geometry.py').read_text(),str(ROOT/'scripts/paris_north_bank_geometry.py'),'exec'),globals())

# Cafe terraces occupy the paved gaps between pavilions, clear of traffic lanes.
for z in (-29,-22,35,44):
    for x in (-152,-144,-136):
        y=terrain(x,z)+.24
        static.cylinder('cream',(x,y+.76,z),.72,.10,n=8)
        static.cylinder('iron',(x,y+.36,z),.07,.72,n=6)
        for dx,dz in ((-1.2,0),(1.2,0),(0,-1.2),(0,1.2)):
            xx=x+dx;zz=z+dz;yy=terrain(xx,zz)+.24
            static.box('timber',(xx,yy+.44,zz),(.48,.10,.48))
            static.box('timber',(xx,yy+.72,zz+.24),(.48,.5,.07))
            for sign in (-1,1):static.box('iron',(xx+sign*.17,yy+.21,zz),(.06,.42,.38))
