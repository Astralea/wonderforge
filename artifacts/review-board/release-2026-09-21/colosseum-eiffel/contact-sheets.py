from PIL import Image,ImageOps,ImageDraw
from pathlib import Path
root=Path('artifacts/review-board/release-2026-09-21/colosseum-eiffel')
for mode in ['desktop','mobile']:
 for wonder in ['colosseum','eiffel-tower']:
  files=sorted((root/mode/wonder).glob('frame-*.png'))
  cols,thumb=(3,(480,300)) if mode=='desktop' else (6,(195,422))
  per=cols*4
  for start in range(0,len(files),per):
   items=files[start:start+per]
   rows=(len(items)+cols-1)//cols
   sheet=Image.new('RGB',(cols*thumb[0],rows*(thumb[1]+27)), '#16191e')
   draw=ImageDraw.Draw(sheet)
   for idx,path in enumerate(items):
    x=(idx%cols)*thumb[0];y=(idx//cols)*(thumb[1]+27)
    im=Image.open(path);im.thumbnail(thumb)
    sheet.paste(im,(x,y+27))
    draw.text((x+7,y+7),f'{mode} {wonder} {int(path.stem[6:])/100:.2f}s', fill='white')
   dest=root/mode/wonder/f'contact-{start//per+1}.jpg'
   sheet.save(dest,quality=90)
   print(dest)
