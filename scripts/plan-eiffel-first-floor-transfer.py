"""Interpreted two-ended transfer bridge; checked against actual second-floor geometry."""
import json,math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/eiffel-first-floor-transfer-2026-09-08'
shapes=[]
def add(a,b):return [a[i]+b[i] for i in range(3)]
def mul(a,s):return [v*s for v in a]
def cross(a,b):return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
def unit(a):return mul(a,1/math.sqrt(sum(x*x for x in a)))
def box(id,c,size,role='iron'):shapes.append(dict(id=id,role=role,vertices=[add(c,[x*size[0]/2,y*size[1]/2,z*size[2]/2]) for x in (-1,1) for y in (-1,1) for z in (-1,1)]))
def beam(id,a,b,r):
 d0=[b[i]-a[i] for i in range(3)];d=unit(d0);u=unit(cross(d,[0,1,0] if abs(d[1])<.99 else [1,0,0]));v=cross(d,u);h=math.sqrt(sum(x*x for x in d0))/2;c=mul(add(a,b),.5)
 shapes.append(dict(id=id,role='iron',vertices=[add(c,add(mul(d,x*h),add(mul(u,y*r),mul(v,z*r)))) for x in (-1,1) for y in (-1,1) for z in (-1,1)]))
floor=57.94000244140625
for z in (-5.05,-2.95):
 for x in (-20.7,20.7):box(f'bearing-{x}-{z}',[x,floor+.07,z],[.5,.14,.4])
 for y in (floor+.26,floor+4.06):box(f'chord-{z}-{y}',[0,y,z],[42,.24,.24])
 for i in range(22):box(f'post-{z}-{i}',[-21+i*2,floor+2.16,z],[.12,3.8,.12])
 for i in range(21):
  x=-21+i*2;beam(f'brace-{z}-{i}',[x,floor+(.26 if i%2==0 else 4.06),z],[x+2,floor+(4.06 if i%2==0 else .26),z],.055)
for i in range(51):
 x=-20+i*.8
 if -20.3<x<-19.3:continue
 box(f'cross-joist-{i}',[x,floor-.44,-4],[.08,.16,2.1])
 for z in (-5.05,-2.95):box(f'hanger-{i}-{z}',[x,floor-.11,z],[.08,.50,.04])
for z in (-4.84,-3.16):box(f'ledger-{z}',[0,floor-.22,z],[40.6,.28,.08])
for i in range(203):
 box(f'plank-{i:03d}',[-20.2+i*.2,floor-.04,-4],[.2,.08,1.8],'timber')
 if i<5:shapes[-1]['hatch']=True
(OUT/'bridge-design.json').write_text(json.dumps(dict(floorY=floor,deckY=floor,shapes=shapes,hatchPivot=[-19.8,floor,-3.05],productionReady=False),indent=2)+'\n')
# Preserve the original first-floor winch; this variant clears the cart handles.
source=json.loads((ROOT/'artifacts/eiffel-first-floor-winch-2026-09-08/design.json').read_text())
source['canonicalFrame']=[p for p in source['canonicalFrame'] if p['id']!='base-cross--4.1']
source['frame']=[dict(id=p['id'],vertices=[[v[2]-17.95,v[1]+floor-197,-v[0]-4] for v in p['vertices']]) for p in source['canonicalFrame']]
(OUT/'design.json').write_text(json.dumps(source,indent=2)+'\n')
print(len(shapes))
