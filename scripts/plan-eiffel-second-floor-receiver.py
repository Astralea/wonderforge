"""Second-floor relay receiver, with a real deck-supported destination cart."""
import json,math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/eiffel-second-floor-receiver-2026-09-08'
design=json.loads((ROOT/'artifacts/eiffel-first-floor-transfer-2026-09-08/design.json').read_text())
design['worldFloorY']=116.14
design['transform']={'translation':[-6.7,116.14-197,-4],'rotationY':math.pi/2}
design['frame']=[dict(id=p['id'],vertices=[[v[2]-6.7,v[1]+116.14-197,-v[0]-4] for v in p['vertices']]) for p in design['canonicalFrame']]
design['sourceCargo']=[0,57.94000244140625+1.24+197-116.14,-1.8]
design['cart']=[-10.25,116.14,-4]
design['limits']=['Interpreted second-floor receiving frame; not a measured historical replica.','Real deck contacts and geometric clearance do not certify capacity, power, anchorage or erection.','Second-floor cart transfer to the existing upper relay remains incomplete.']
(OUT/'design.json').write_text(json.dumps(design,indent=2)+'\n')
print(len(design['frame']))
