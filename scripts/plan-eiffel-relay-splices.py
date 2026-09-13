"""Authored web fishplates for the fourteen relay girder seams."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/eiffel-relay-platform-2026-09-08'
data=json.loads((OUT/'platform-units.json').read_text());groups={}
for u in data['units']:
 if u['kind']=='girder':groups.setdefault(u['id'].rsplit('-segment-',1)[0],[]).append(u)
joints=[]
for name,units in sorted(groups.items()):
 axis=0 if name.startswith('x-') else 2;across=2-axis
 units.sort(key=lambda u:min(v[axis] for v in u['prisms'][0]['vertices']))
 for left,right in zip(units,units[1:]):
  seam=max(v[axis] for v in left['prisms'][0]['vertices']);center=[0,196.62,0];center[axis]=seam
  center[across]=sum(v[across] for v in left['prisms'][0]['vertices'])/8
  plates=[];bolts=[]
  for side in (-1,1):
   c=center.copy();c[across]+=side*.0225;size=[.35,.14,.02] if axis==0 else [.02,.14,.35]
   plates.append(dict(id=f'{name}-seam-{seam:.3f}-plate-{side}',center=c,size=size))
  for along in (-.10,.10):
   for vertical in (-.035,.035):
    c=center.copy();c[axis]+=along;c[1]+=vertical;bolts.append(dict(center=c,axis=across,shaftRadius=.010,holeRadius=.012,grip=.065,headRadius=.018,headDepth=.012))
  joints.append(dict(id=f'{name}-seam-{seam:.3f}',unitIds=[left['id'],right['id']],axis=axis,plates=plates,bolts=bolts))
(OUT/'platform-splices.json').write_text(json.dumps(dict(joints=joints,productionReady=False,limits=['Authored geometry; fastening sequence and temporary suspension remain required.']),indent=2)+'\n')
print(len(joints))
