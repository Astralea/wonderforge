"""Partition the authored platform into rigid loads, never an erection schedule."""
import json, math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/eiffel-relay-platform-2026-09-08'
shapes=json.loads((OUT/'platform-occupancy.json').read_text())
units=[]
def bounds(s):return [[min(v[a] for v in s['vertices']) for a in range(3)],[max(v[a] for v in s['vertices']) for a in range(3)]]
def volume(s):
 v=s['vertices'];a=[v[4][i]-v[0][i] for i in range(3)];b=[v[2][i]-v[0][i] for i in range(3)];c=[v[1][i]-v[0][i] for i in range(3)]
 return abs(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))
def cut(s,axis,low,high):
 lo,hi=bounds(s)
 if not lo[axis]-1e-8<=low<high<=hi[axis]+1e-8:raise ValueError(s['id'])
 # Only axis-aligned source boxes may be sliced with this operation.
 for v in s['vertices']:
  if any(min(abs(v[a]-lo[a]),abs(v[a]-hi[a]))>1e-8 for a in range(3)):raise ValueError('Oriented prism cannot be axis sliced')
 vs=[list(v) for v in s['vertices']]
 for v in vs:v[axis]=low if abs(v[axis]-lo[axis])<1e-8 else high
 return dict(s,vertices=vs)
def add(id,prisms,kind,requirement):
 units.append(dict(id=id,kind=kind,sourceIds=sorted(set(p['id'] for p in prisms)),prisms=prisms,supportRequirement=requirement,productionReady=False,estimatedMassKg=sum(volume(p)*(600 if p['role']=='deck' else 7800) for p in prisms)))
groups={}
for s in shapes:
 id=s['id']
 if '-girder-' in id:
  key=id.split('-flange')[0].split('-web')[0];groups.setdefault(key,[]).append(s)
 elif id.startswith('bracket-'):
  groups.setdefault('-'.join(id.split('-')[:2]),[]).append(s)
 elif s['role']=='deck':
  longaxis,widthaxis=(0,2) if id.startswith('deck-z') else (2,0)
  lo,hi=bounds(s);cuts=[-6.4,-2.4,1.6,6.4] if longaxis==0 else [-3.1,0,3.1]
  for j in range(15):
   strip=cut(s,widthaxis,lo[widthaxis]+j*.22,lo[widthaxis]+(j+1)*.22)
   for k in range(len(cuts)-1):add(f'{id}-board-{j:02d}-{k}',[cut(strip,longaxis,cuts[k],cuts[k+1])],'board','Seat on existing joists/flanges; outer edge retains 140mm overhang')
 elif id.startswith('rail-') and not id.startswith('rail-post'):
  axis=0 if id.startswith('rail-z') else 2;cuts=[-6.25,-1.55,3.1,6.25]
  for k in range(3):add(f'{id}-segment-{k}',[cut(s,axis,cuts[k],cuts[k+1])],'rail','Fasten to existing posts before release')
 else:add(id,[s],s['role'] if s['role']=='collar' else 'post' if id.startswith('rail-post') else 'joist','Fasten to supporting assembly before release')
for id,ps in groups.items():
 if id.startswith('bracket'):add(id,ps,'bracket','Fasten open bracket to fitted collar before release');continue
 axis=0 if id.startswith('x-') else 2;lo,hi=bounds(ps[0]);n=math.ceil((hi[axis]-lo[axis])/4.5)
 for k in range(n):
  a=lo[axis]+(hi[axis]-lo[axis])*k/n;b=lo[axis]+(hi[axis]-lo[axis])*(k+1)/n
  add(f'{id}-segment-{k}',[cut(p,axis,a,b) for p in ps],'girder','Maintain temporary suspension until splices and bearing supports are secured')
result=dict(productionReady=False,units=units,assumptions=['Iron density 7800 kg/m3; timber 600 kg/m3; authored estimates, not historical load ratings.','Summed primitive volume includes existing bracket joint overlaps.','Girder cuts are transport partitions, not unsupported cantilever erection steps.'])
if __name__=='__main__':
 (OUT/'platform-units.json').write_text(json.dumps(result,indent=2)+'\n')
 print(json.dumps({'units':len(units),'maxEstimatedMassKg':max(u['estimatedMassKg'] for u in units),'sourceVolume':sum(map(volume,shapes)),'partitionVolume':sum(volume(p) for u in units for p in u['prisms'])}))
