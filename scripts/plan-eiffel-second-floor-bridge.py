"""Interpreted two-ended transfer bridge; checked against actual second-floor geometry."""
import json,math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/eiffel-second-floor-supply-2026-09-08'
shapes=[]
def add(a,b):return [a[i]+b[i] for i in range(3)]
def mul(a,s):return [v*s for v in a]
def cross(a,b):return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
def unit(a):return mul(a,1/math.sqrt(sum(x*x for x in a)))
def box(id,c,size,role='iron'):shapes.append(dict(id=id,role=role,vertices=[add(c,[x*size[0]/2,y*size[1]/2,z*size[2]/2]) for x in (-1,1) for y in (-1,1) for z in (-1,1)]))
def beam(id,a,b,r):
 d0=[b[i]-a[i] for i in range(3)];d=unit(d0);u=unit(cross(d,[0,1,0] if abs(d[1])<.99 else [1,0,0]));v=cross(d,u);h=math.sqrt(sum(x*x for x in d0))/2;c=mul(add(a,b),.5)
 shapes.append(dict(id=id,role='iron',vertices=[add(c,add(mul(d,x*h),add(mul(u,y*r),mul(v,z*r)))) for x in (-1,1) for y in (-1,1) for z in (-1,1)]))
for z in (-2.45,-1.15):
 for x in (-9.7,9.7):box(f'bearing-{x}-{z}',[x,116.21,z],[.4,.14,.4])
 for y in (116.36,118.36):box(f'chord-{z}-{y}',[0,y,z],[20.8,.16,.16])
 for i in range(11):box(f'post-{z}-{i}',[-10+i*2,117.36,z],[.10,2,.10])
 for i in range(10):
  x=-10+i*2;beam(f'brace-{z}-{i}',[x,116.36 if i%2==0 else 118.36,z],[x+2,118.36 if i%2==0 else 116.36,z],.05)
# Hanging cross-joists keep the freight deck flush with the existing floor.
for i in range(23):
 x=-8.8+i*.8
 box(f'cross-joist-{i}',[x,115.70,-1.8],[.08,.16,1.3])
 for z in (-2.45,-1.15):box(f'hanger-{i}-{z}',[x,116.03,z],[.08,.50,.04])
for z in (-2.36,-1.24):box(f'ledger-{z}',[0,115.92,z],[18,.28,.08])
for i in range(90):box(f'plank-{i:03d}',[-8.9+i*.2,116.10,-1.8],[.2,.08,1.2],'timber')
(OUT/'bridge-design.json').write_text(json.dumps(dict(floorY=116.13999938964844,deckY=116.14,shapes=shapes,productionReady=False),indent=2)+'\n');print(len(shapes))
