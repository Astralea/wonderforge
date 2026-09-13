"""Interpreted forged master link and rope eyes, in carrier-hook-local metres."""
import json, math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/eiffel-master-link-2026-09-08'
carrier=json.loads((ROOT/'artifacts/eiffel-long-load-carrier-2026-09-08/carrier-design.json').read_text())
R=.13;bar=.018;rope=.008;loop=bar+rope
def add(a,b):return [x+y for x,y in zip(a,b)]
def mul(a,s):return [x*s for x in a]
def sub(a,b):return add(a,mul(b,-1))
def dot(a,b):return sum(x*y for x,y in zip(a,b))
def unit(v):return mul(v,1/math.sqrt(dot(v,v)))
def cross(a,b):return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
def eye(center,axis,direction,distance):
 d=unit(sub(direction,mul(axis,dot(direction,axis))));side=unit(cross(axis,d));apex=add(center,mul(d,distance))
 # Circumscribe the circular bar contact: chord interiors, not only vertices,
 # must stay one cable radius outside the metal surface.
 radius=loop
 for _ in range(12):radius=loop/math.cos((2*math.pi-2*math.acos(radius/distance))/96)
 alpha=math.acos(radius/distance)
 # Outside tangent legs and the far arc embrace the ring's circular bar.
 arc=[add(center,add(mul(d,radius*math.cos(a)),mul(side,radius*math.sin(a)))) for a in [alpha+(2*math.pi-2*alpha)*i/48 for i in range(49)]]
 return {'center':center,'axis':axis,'apex':apex,'arcRadius':radius,'points':[apex,*arc,apex]}
upper=eye([0,R,0],[1,0,0],[0,1,0],.12)
strands=[]
for c in carrier['eyeCenters']:
 target=[c[0],c[1]-carrier['hookY'],c[2]]
 degrees=(120 if c[2]<0 else 160) if c[0]>0 else (240 if c[2]<0 else 200)
 a=math.radians(degrees);center=[R*math.sin(a),R*math.cos(a),0];axis=[math.cos(a),-math.sin(a),0]
 e=eye(center,axis,sub(target,center),.10)
 toward=unit(sub(e['apex'],target));contact=add(target,mul(toward,carrier['eyeInnerRadius']-rope))
 strands.append({'eye':e,'carrierContact':contact,'line':[e['apex'],contact]})
design={'ringRadius':R,'barRadius':bar,'ropeRadius':rope,'upperEye':upper,'strands':strands,'hoistEnd':upper['apex'],'productionReady':False,'limits':['Interpreted detail; period-specific form not established.','Lower carrier-eye terminations retain the preceding contact approximation.','Rope-eye splices are geometric junctions, not individually woven wires.']}
(OUT/'design.json').write_text(json.dumps(design,indent=2)+'\n')
print('Hoist-end offset:',upper['apex'])
