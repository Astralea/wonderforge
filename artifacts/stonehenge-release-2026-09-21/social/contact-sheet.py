from pathlib import Path
from PIL import Image, ImageDraw
import json, struct
root=Path('artifacts/stonehenge-release-2026-09-21/social')
import sys
take=sys.argv[1] if len(sys.argv)>1 else 'take-01'
p=root/take/'export'
r=json.loads((p/'validation.json').read_text())
frames=[f for f in r['frames'] if f['frame']!=555]; w,h=480,270; cols=3; rows=(len(frames)+cols-1)//cols
sheet=Image.new('RGB',(cols*w,rows*(h+28)), '#15191d');draw=ImageDraw.Draw(sheet)
for n,f in enumerate(frames):
 im=Image.open(f['file']).convert('RGB');im.thumbnail((w,h));x=(n%cols)*w;y=(n//cols)*(h+28)
 draw.text((x+8,y+8),f"Montage {f['seconds']:.3f}s",fill='#eee8db');sheet.paste(im,(x,y+28))
sheet.save(p/'contact-sheet.jpg',quality=93)
# Read ISO BMFF top-level atom ordering independently of ffmpeg's command flags.
f=Path(r['final']);size=f.stat().st_size;atoms=[]
with f.open('rb') as b:
 pos=0
 while pos<size:
  b.seek(pos);head=b.read(8)
  if len(head)<8: break
  atomsize,kind=struct.unpack('>I4s',head); kind=kind.decode('ascii','replace')
  if atomsize==1:atomsize=struct.unpack('>Q',b.read(8))[0]
  if atomsize==0:atomsize=size-pos
  atoms.append({'type':kind,'offset':pos,'size':atomsize})
  if atomsize<8:raise RuntimeError('Invalid MP4 atom')
  pos+=atomsize
positions={a['type']:a['offset'] for a in atoms}
faststart=positions.get('moov',size)<positions.get('mdat',0)
capture=json.loads((root/take/'capture-report.json').read_text())
frame_checks=[{'film':s['id'],'count':len(s['frames']),'unique':len({a['sha256'] for a in s['frames']}),'firstSourceSecond':s['frames'][0]['seconds'],'lastSourceSecond':s['frames'][-1]['seconds']} for s in capture['shots']]
extra={'mp4Atoms':atoms,'faststart':faststart,'capturedFrames':frame_checks,'contactSheet':str(p/'contact-sheet.jpg')}
(p/'container-validation.json').write_text(json.dumps(extra,indent=2)+'\n')
print(json.dumps(extra,indent=2))
if not faststart:raise RuntimeError('moov must precede mdat')
