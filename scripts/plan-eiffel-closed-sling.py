"""Interpreted forged master link and rope eyes, in carrier-hook-local metres."""
import json, math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/eiffel-closed-sling-2026-09-08'
carrier=json.loads((ROOT/'artifacts/eiffel-long-load-carrier-2026-09-08/carrier-design.json').read_text())
R=.13;bar=.018;rope=.008;loop=bar+rope
def add(a,b):return [x+y for x,y in zip(a,b)]
def mul(a,s):return [x*s for x in a]
def sub(a,b):return add(a,mul(b,-1))
def dot(a,b):return sum(x*y for x,y in zip(a,b))
def unit(v):return mul(v,1/math.sqrt(dot(v,v)))
def cross(a,b):return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
def eye(center,axis,direction,distance,contact_radius):
 d=unit(sub(direction,mul(axis,dot(direction,axis))));side=unit(cross(axis,d));apex=add(center,mul(d,distance))
 # Circumscribe the circular bar contact: chord interiors, not only vertices,
 # must stay one cable radius outside the metal surface.
 radius=contact_radius
 for _ in range(12):radius=contact_radius/math.cos((2*math.pi-2*math.acos(radius/distance))/96)
 alpha=math.acos(radius/distance)
 # Outside tangent legs and the far arc embrace the ring's circular bar.
 arc=[add(center,add(mul(d,radius*math.cos(a)),mul(side,radius*math.sin(a)))) for a in [alpha+(2*math.pi-2*alpha)*i/48 for i in range(49)]]
 return {'center':center,'axis':axis,'apex':apex,'arcRadius':radius,'points':[apex,*arc,apex]}

design=json.loads((ROOT/'artifacts/eiffel-master-link-2026-09-08/design.json').read_text())
for s,c in zip(design['strands'],carrier['eyeCenters']):
 hole=[c[0],c[1]-carrier['hookY'],c[2]]
 center=add(hole,[0,(.05+.026)/2,0]);axis=unit([c[0],0,c[2]])
 e=eye(center,axis,sub(s['eye']['apex'],center),.09,math.hypot((.05-.026)/2,.009)+rope)
 s['carrierEye']=e;s['carrierHoleCenter']=hole;s['line']=[s['eye']['apex'],e['apex']]
 s.pop('carrierContact',None)
design['limits']=['Interpreted detail, not a measured1889 fitting.','Rope-eye splices shown geometrically; no woven-wire or strength claim.','Manual rigging, cart anchorage, release, drive and brakes remain incomplete.']
(OUT/'design.json').write_text(json.dumps(design,indent=2)+'\n')
print('Four lower closed rope eyes added; hoist height unchanged.')
