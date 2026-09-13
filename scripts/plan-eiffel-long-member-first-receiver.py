"""Interpreted compact freight head-frame; not a measured historical replica."""
import json,math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/eiffel-real-payload-route-2026-09-08';OUT.mkdir(exist_ok=True)
shapes=[]
def add(a,b):return [a[i]+b[i] for i in range(3)]
def mul(a,s):return [v*s for v in a]
def cross(a,b):return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
def unit(a):return mul(a,1/math.sqrt(sum(x*x for x in a)))
def box(id,c,size):shapes.append(dict(id=id,vertices=[add(c,[x*size[0]/2,y*size[1]/2,z*size[2]/2]) for x in (-1,1) for y in (-1,1) for z in (-1,1)]))
def beam(id,a,b,r):
 delta=[b[i]-a[i] for i in range(3)];d=unit(delta);u=unit(cross(d,[0,1,0] if abs(d[1])<.99 else [1,0,0]));v=cross(d,u);h=math.sqrt(sum(x*x for x in delta))/2;c=mul(add(a,b),.5)
 shapes.append(dict(id=id,vertices=[add(c,add(mul(d,x*h),add(mul(u,y*r),mul(v,z*r)))) for x in (-1,1) for y in (-1,1) for z in (-1,1)]))
for x in (-.8,.8):
 box(f'skid-{x}',[x,197.08,-4.625],[.16,.16,3.05])
 beam(f'mast-{x}',[x,197.16,-3.4],[x,205.4,-3.4],.085)
 beam(f'back-stay-{x}',[x,197.24,-5.9],[x,205.4,-3.4],.07)
 beam(f'head-arm-{x}',[x,205.4,-3.4],[x,205.4,-2.05],.085)
 beam(f'head-brace-{x}',[x,198.9,-3.4],[x,205.4,-2.05],.07)
for z in (-5.9,-5.15,-4.1):box(f'base-cross-{z}',[0,197.24,z],[1.76,.16,.16])
for z in (-3.4,-2.05):
 for sign in (-1,1):box(f'rail-outrigger-{z}-{sign}',[sign*.6075,205.4,z],[.555,.16,.17])
for x in (-.35,.35):box(f'trolley-rail-{x}',[x,205.54,-2.95],[.10,.12,2.50])
box('winch-bed',[0,197.39,-5.5],[1.5,.14,.85])
for x in (-.55,.55):box(f'drum-bearing-{x}',[x,197.73,-5.5],[.12,.54,.2])
design=dict(floorY=197,productionReady=False,frame=shapes,drum=dict(center=[0,197.8,-5.5],radius=.30,width=.95,axis=0),sheave=dict(center=[0,205.06,-2.05],radius=.25,width=.16,axis=0),cargoLane=[0,-1.8],trolley=dict(startZ=-2.05,endZ=-3.85,railTop=205.6,wheelRadius=.115,wheelAxisY=205.715),limits=['Interpreted first-floor freight head-frame; canonical coordinates are transformed rigidly to the verified first-floor landing.','Skids contact the actual first-floor deck; capacity, hold-down fastening and erection remain unverified.','Steam drive and operational cargo handoff are not yet modeled.'])
design['canonicalFrame']=design['frame']
design['worldFloorY']=57.94000244140625
design['transform']={'translation':[-17.95,57.94000244140625-197,-4],'rotationY':math.pi/2}
design['frame']=[dict(id=s['id'],vertices=[[v[2]-17.95,v[1]+57.94000244140625-197,-v[0]-4] for v in s['vertices']]) for s in shapes]
design['canonicalFrame']=[s for s in design['canonicalFrame'] if s['id']!='base-cross--4.1']
design['frame']=[s for s in design['frame'] if s['id']!='base-cross--4.1']
design['scope']='Long-member first-floor candidate; recomputed taller frame on original bearings, not operational admission'
(OUT/'design.json').write_text(json.dumps(design,indent=2)+'\n');print(len(shapes))
