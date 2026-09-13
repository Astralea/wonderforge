"""Connected streets and construction yard, authored in the live Blender scene.
The workshop arrangement is an interpretation, not a surveyed 1889 site plan.
"""

workyard_props=[]
def yard_prop(name,x,z,w,d):
    workyard_props.append({'id':name,'bounds':[x-w/2,z-d/2,x+w/2,z+d/2]})
def earth(bounds,step=8):
    x1,z1,x2,z2=bounds
    n=math.ceil((x2-x1)/step)
    for i in range(n):
        x=x1+(i+.5)*(x2-x1)/n
        strip(x,z1,x,z2,(x2-x1)/n,'work-earth',.025,step)

# The construction surface is deliberately unobstructed. It does not invent
# static loads in the pure engine's curved haul lanes or completed bearings.
earth(SITE_LAYOUT['constructionGround']['bounds'])
yard=SITE_LAYOUT['workyard'];earth(yard['bounds'],4)
a,b=yard['connector'];strip(*a,*b,yard['connectorWidth'],'work-earth',.025)

for entry in yard['buildings']:
    x,z=entry['center'];w,d,h=entry['size']
    y=max(terrain(x+sx*w/2,z+sz*d/2) for sx in (-1,1) for sz in (-1,1))+.12
    plinth(x,z,w,d,y);yard_prop(entry['id'],x,z,w+.8,d+.8)
    static.box('brick' if entry['id']=='iron-workshop' else 'timber',(x,y+h/2,z),(w,h,d))
    # Two pitched zinc planes, gables and repeated clerestory windows.
    static.poly('zinc',[(x-w/2-.4,y+h,z-d/2-.4),(x+w/2+.4,y+h,z-d/2-.4),(x+w/2+.4,y+h,z+d/2+.4),(x-w/2-.4,y+h,z+d/2+.4),(x,y+h+3,z-d/2-.4),(x,y+h+3,z+d/2+.4)],[(3,5,4,0),(5,2,1,4)])
    for sign in (-1,1):
        static.poly('timber',[(x-w/2,y+h,z+sign*d/2),(x+w/2,y+h,z+sign*d/2),(x,y+h+3,z+sign*d/2)],[(0,1,2) if sign<0 else (2,1,0)])
        for k in (-2,-1,1,2):static.panel('glass',(x+k*w/6,y+h*.66,z+sign*(d/2+.03)),2.4,1.7,'z',sign)
    static.panel('iron',(x-w/2-.03,y+1.65,z),4,3.3,'x',-1)
    for zz in (-d*.32,d*.32):static.panel('glass',(x-w/2-.03,y+h*.69,z+zz),2.7,1.8,'x',-1)
    if entry['id']=='iron-workshop':
        static.box('brick',(x+7,y+h+2,z-6),(1.2,6,1.2))
        static.box('iron',(x+7,y+h+5.06,z-6),(1.4,.16,1.4))

for index,(x,z) in enumerate(yard['racks']):
    # Human-scale prefabricated angles resting on timber trestles.
    y=max(terrain(x+sx*3.3,z+sz*2) for sx in (-1,1) for sz in (-1,1))+.05
    yard_prop(f'iron-rack-{index}',x,z,6.6,4)
    for dx in (-2.4,2.4):
        for dz in (-1.4,1.4):
            bottom=terrain(x+dx,z+dz)+.025
            static.box('timber',(x+dx,(bottom+y+.7)/2,z+dz),(.24,y+.7-bottom,.24))
        static.box('timber',(x+dx,y+.8,z),(.32,.2,3.6))
    for k in range(6):
        zz=z-1.4+k*.56
        static.box('iron',(x,y+1,zz),(6.4,.12,.22))
        static.box('iron',(x,y+1.13,zz+.09),(6.4,.26,.05))

sx,sz=yard['masonryStock']
for row in range(3):
    for col in range(4):
        x=sx+(col-1.5)*1.6;z=sz+(row-1)*2
        y=terrain(x,z)+.025
        layers=2+(row+col)%2
        yard_prop(f'stone-stack-{row}-{col}',x,z,1.2,1.35)
        for layer in range(layers):static.box('stone-warm' if layer%2 else 'stone-light',(x,y+.3+layer*.6,z),(1.2,.6,1.35))
# Timber dunnage at a separate low stock bay, with supported boards.
for row in range(3):
    x=126;z=48+row*4;y=max(terrain(x+dx,z+dz) for dx in (-3,3) for dz in (-1,1))+.08
    yard_prop(f'timber-stock-{row}',x,z,6,2)
    for dx in (-2,2):
        bottom=terrain(x+dx,z)+.025
        static.box('timber',(x+dx,(bottom+y+.16)/2,z),(.3,y+.16-bottom,2))
    for layer in range(4):
        for k in range(4):static.box('timber',(x,y+.22+layer*.14,z-.72+k*.48),(6,.14,.4))
# Low perimeter rails explain the work yard boundary. West gate is 8 m wide.
x1,z1,x2,z2=yard['bounds'];gatez=yard['gate'][1]
for ax,az,bx,bz in [(x1,z1,x2,z1),(x2,z1,x2,z2),(x2,z2,x1,z2),(x1,z1,x1,gatez-4),(x1,gatez+4,x1,z2)]:
    length=math.hypot(bx-ax,bz-az);n=max(1,math.ceil(length/5))
    for i in range(n+1):
        x=ax+(bx-ax)*i/n;z=az+(bz-az)*i/n;y=terrain(x,z)+.025
        static.box('timber',(x,y+.7,z),(.16,1.4,.16))
        if i<n:
            xx=ax+(bx-ax)*(i+1)/n;zz=az+(bz-az)*(i+1)/n;yy=terrain(xx,zz)+.025
            for h in (.5,1.15):static.beam('timber',(x,y+h,z),(xx,yy+h,zz),.055)
    yard_prop(f'fence-{ax}-{az}',(ax+bx)/2,(az+bz)/2,abs(bx-ax)+.16,abs(bz-az)+.16)
