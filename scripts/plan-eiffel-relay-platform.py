"""Authored 197m relay platform geometry; not a structural-capacity certificate."""
import json,math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/eiffel-relay-platform-2026-09-08';OUT.mkdir(exist_ok=True)
manifest=json.loads((ROOT/'public/models/eiffel-construction-kit/tower-kit.manifest.json').read_text());parts={p['id']:p for p in manifest['parts']}
shapes=[];attachments=[]
def add(a,b):return[a[i]+b[i]for i in range(3)]
def sub(a,b):return[a[i]-b[i]for i in range(3)]
def mul(a,t):return[v*t for v in a]
def cross(a,b):return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
def unit(v):return mul(v,1/math.sqrt(sum(x*x for x in v)))
def rotate(q,v):
 u=q[:3];uv=cross(u,v);return add(v,add(mul(uv,2*q[3]),mul(cross(u,uv),2)))
def transform(p,v):return add(p['position'],rotate(p['quaternion'],v))
def prism(id,vertices,role='frame',owner=None):shapes.append({'id':id,'role':role,'owner':owner,'vertices':vertices})
def box(id,c,size,role='frame'):
 prism(id,[add(c,[sx*size[0]/2,sy*size[1]/2,sz*size[2]/2])for sx in(-1,1)for sy in(-1,1)for sz in(-1,1)],role)
def beam(id,a,b,r=.075):
 axis=unit(sub(b,a));u=unit(cross(axis,[0,1,0]));v=cross(axis,u);h=math.sqrt(sum(x*x for x in sub(b,a)))/2;c=mul(add(a,b),.5)
 prism(id,[add(c,add(mul(axis,sx*h),add(mul(u,sy*r),mul(v,sz*r))))for sx in(-1,1)for sy in(-1,1)for sz in(-1,1)])
def girder(id,c,length,axis):
 for sign in(-1,1):box(id+f'-flange-{sign}',add(c,[0,sign*(.21-.0175),0]),[length,.035,.22]if axis=='x'else[.22,.035,length])
 box(id+'-web',c,[length,.35,.025]if axis=='x'else[.025,.35,length])
for member in (0,8,16,24):
 p=parts[f'shaft-10-m{member:03d}-c000'];q=p['finalPose'];a=rotate(q['quaternion'],[0,0,1]);z=(196.1-q['position'][1])/a[1];w=.14;d=.1092;h=.6;t=.025
 for axis in(0,1):
  for sign in(-1,1):
   c=[0,0,z];c[axis]=sign*((w if axis==0 else d)+t/2);size=[t,2*d+2*t,h]if axis==0 else[2*w,t,h]
   prism(f'collar-{member}-{axis}-{sign}',[transform(q,add(c,[sx*size[0]/2,sy*size[1]/2,sz*size[2]/2]))for sx in(-1,1)for sy in(-1,1)for sz in(-1,1)],'collar',p['id'])
 sx=math.copysign(1,p['center'][0]);sz=math.copysign(1,p['center'][2]);end=[sx*6.15,196.71,sz*6.15]
 face=transform(q,[0,-d,z]);attachments.append({'partId':p['id'],'faceCenter':face,'localNormal':[0,-1,0],'collarHeight':h})
 for k,dz in enumerate((-.20,.20)):
  start=transform(q,[0,-d-.08,z+dz]);beam(f'bracket-{member}-{k}',start,end,.075)
 # Full-width tie into the outward collar face, joined with bracket roots.
 c=[0,-d-.075,z];size=[.22,.10,.55]
 prism(f'bracket-{member}-root',[transform(q,add(c,[sx*size[0]/2,sy*size[1]/2,sz*size[2]/2]))for sx in(-1,1)for sy in(-1,1)for sz in(-1,1)])
for sign in(-1,1):
 for a in(3.1,6.15):
  girder(f'x-girder-{sign}-{a}',[0,196.71,sign*a],12.3,'x')
  girder(f'z-girder-{sign}-{a}',[sign*a,196.71,0],6.2 if a==3.1 else 12.3,'z')
 # 80mm deck, bearing on real girder/joist tops at196.92.
 box(f'deck-z-{sign}',[0,196.96,sign*4.75],[12.8,.08,3.3],'deck')
 box(f'deck-x-{sign}',[sign*4.75,196.96,0],[3.3,.08,6.2],'deck')
 for i in range(15):
  x=-5.6+i*.8;box(f'joist-z-{sign}-{i}',[x,196.84,sign*4.65],[.09,.16,3.1])
 for i in range(7):
  z=-2.4+i*.8;box(f'joist-x-{sign}-{i}',[sign*4.65,196.84,z],[3.1,.16,.09])
 # Guardrails; inner freight opening kept open for later gate design.
 for i in range(9):
  v=-6.2+i*1.55;box(f'rail-post-z-{sign}-{i}',[v,197.5,sign*6.25],[.05,1,.05],'rail');box(f'rail-post-x-{sign}-{i}',[sign*6.25,197.5,v],[.05,1,.05],'rail')
 for y in(197.5,198):
  box(f'rail-z-{sign}-{y}',[0,y,sign*6.25],[12.5,.05,.05],'rail');box(f'rail-x-{sign}-{y}',[sign*6.25,y,0],[.05,.05,12.5],'rail')
(OUT/'platform-occupancy.json').write_text(json.dumps(shapes,indent=2)+'\n')
(OUT/'platform-design.json').write_text(json.dumps({'floorY':197,'stage':45,'attachments':attachments,'centralOpening':[-2.99,2.99,-2.99,2.99],'deckOpening':[-3.1,3.1,-3.1,3.1],'stairExclusion':[-1.15,1.15,-.9,.9],'productionReady':False,'limits':['Authored fixed collars; no rated bolt/clamp capacity or erection sequence.','Distinct freight aperture and relay machinery remain to be designed.']},indent=2)+'\n')
print(json.dumps({'prisms':len(shapes),'attachments':len(attachments)}))
