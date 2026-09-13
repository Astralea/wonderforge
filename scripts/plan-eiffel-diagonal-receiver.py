"""Candidate two-portal overhead receiver; geometric study, not rated equipment."""
import json, math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/eiffel-diagonal-receiver-2026-09-08'
L=math.hypot(6.5,2.2);d=(-6.5/L,2.2/L);n=(-d[1],d[0]);floor=116.14
shapes=[]
def point(u,y,v):return [-8.5+d[0]*u+n[0]*v,y,-4+d[1]*u+n[1]*v]
def box(name,u,y,v,su,sy,sv):
 shapes.append({'id':name,'vertices':[point(u+a*su/2,y+b*sy/2,v+c*sv/2) for a in (-1,1) for b in (-1,1) for c in (-1,1)]})
for i,u in enumerate((2.9,L+1.8)):
 for side in (-1,1):
  lateral=-.50 if i==0 and side==-1 else side*.8
  box(f'foot-{i}-{side}',u,floor+.1,lateral,.8,.2,.35)
  box(f'post-{i}-{side}',u,(floor+.2+120.50)/2,lateral,.18,120.50-floor-.2,.18)
 if i==0:
  for side in (-1,1):box(f'portal-head-{i}-{side}',u,120.61,side*.615,.3,.22,.81)
 else:box(f'portal-head-{i}',u,120.61,0,.3,.22,1.95)
for side in (-1,1):
 box(f'rail-{side}',(L+1.15)/2,121.32,side*.35,L+3.05,.12,.12)
 box(f'girder-{side}',(L+1.15)/2,120.99,side*.35,L+3.05,.54,.22)
# Longitudinal stabilizers lie outside cargo/carthandle envelope; diagonal rods
# and real connections remain a subsequent mechanical design gate.
for side in (-1,1):box(f'side-tie-{side}',(2.9+L+1.8)/2,120.75,side*.8,L+1.8-2.9,.16,.12)
design={'label':'candidate-unrated-diagonal-receiver','productionReady':False,'floor':floor,'length':L,'direction':list(d),'lateral':list(n),'shapes':shapes,'pickup':[-8.5,59.18000244140625,-4],'peak':[-8.5,118.7,-4],'overCart':[-15,118.7,-1.8],'received':[-15,117.38,-1.8],'limits':['No strength/stability certification.','Trolley, powered winch, braking, rigging, bracing, anchorage and erection not yet authored.','Candidate replaces compact receiver only after full route and mechanism validation.']}
(OUT/'design.json').write_text(json.dumps(design,indent=2)+'\n')
print(len(shapes),L)
