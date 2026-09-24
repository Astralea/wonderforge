from pathlib import Path
from PIL import Image,ImageDraw
import sys,json
root=Path('artifacts/colosseum-moon-surface-2026-09-21/social');take=sys.argv[1] if len(sys.argv)>1 else 'take-01'
out=root/take/'export';old=Path('artifacts/stonehenge-release-2026-09-21/social/take-01/export')
# Find the old bright lunar disc in its known upper-sky region. Its unchanged
# screen position gives the same crop for the new encoded frame, without
# using a texture-dependent threshold that would bias the comparison.
rows=[]
for frame in [300,375,449]:
 before=Image.open(old/f'frame-{frame:04d}.png').convert('RGB');after=Image.open(out/f'frame-{frame:04d}.png').convert('RGB')
 pix=before.load();pts=[]
 for y in range(50,550):
  for x in range(500,1450):
   r,g,b=pix[x,y]
   if .2126*r+.7152*g+.0722*b>210:pts.append((x,y))
 if not pts:raise RuntimeError('Old Moon detection empty')
 cx=round(sum(x for x,y in pts)/len(pts));cy=round(sum(y for x,y in pts)/len(pts));box=(cx-42,cy-42,cx+42,cy+42)
 rows.append((frame,box,before.crop(box),after.crop(box)))
scale=5;cell=84*scale;top=38;sheet=Image.new('RGB',(2*cell,len(rows)*(cell+top)),'#15191d');draw=ImageDraw.Draw(sheet)
for n,(frame,box,a,b) in enumerate(rows):
 y=n*(cell+top);draw.text((9,y+7),f'Original encoded frame {frame}, {frame/30:.3f}s',fill='white');draw.text((cell+9,y+7),f'Moon v2 encoded frame {frame} / 5x nearest',fill='white')
 sheet.paste(a.resize((cell,cell),Image.Resampling.NEAREST),(0,y+top));sheet.paste(b.resize((cell,cell),Image.Resampling.NEAREST),(cell,y+top))
sheet.save(out/'moon-comparison.jpg',quality=96)
(out/'moon-comparison.json').write_text(json.dumps({'scope':'Same-position crops of decoded H264 frames, nearest-neighbor5x display; no added image detail.','frames':[{'frame':f,'seconds':f/30,'crop':box} for f,box,a,b in rows]},indent=2)+'\n')
print(out/'moon-comparison.jpg')
