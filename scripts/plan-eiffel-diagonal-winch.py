"""Deck-mounted winch and fixed redirect frame, interpreted geometry."""
import json,math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/eiffel-diagonal-winch-2026-09-08'
base=json.loads((ROOT/'artifacts/eiffel-diagonal-receiver-2026-09-08/design.json').read_text());L=base['length'];d=base['direction'];n=base['lateral'];floor=116.14;shapes=[]
def world(u,y,v):return [-8.5+d[0]*u+n[0]*v,y,-4+d[1]*u+n[1]*v]
def box(id,u,y,v,su,sy,sv):shapes.append({'id':id,'localCenter':[u,y,v],'size':[su,sy,sv],'vertices':[world(u+a*su/2,y+b*sy/2,v+c*sv/2) for a in (-1,1) for b in (-1,1) for c in (-1,1)]})
guideU=L+2.8;drumU=L+3.6
for v in (-.6,.6):
 box('guide-riser'+str(v),L+1.8,121.22,v,.18,1.0,.18)
 box('guide-outrigger'+str(v),L+2.3,121.82,v,1.18,.2,.18)
box('guide-cap',guideU,121.82,0,.25,.2,1.55)
box('winch-bed',drumU,floor+.18,0,.9,.36,1.65)
for v in (-.62,.62):box('winch-bearing'+str(v),drumU,(floor+.36+117.17)/2,v,.25,117.17-floor-.36,.16)
design={'label':'candidate-diagonal-winch','productionReady':False,'length':L,'direction':d,'lateral':n,'floor':floor,'shapes':shapes,'guide':[guideU,121.35,0],'drum':[drumU,117.05,0],'limits':['No power, braking, stability/anchorage or erection admission.','Support geometry must clear tower, bridges and waiting worker.']}
(OUT/'design.json').write_text(json.dumps(design,indent=2)+'\n');print(len(shapes))
