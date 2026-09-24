from pathlib import Path
import re, json, subprocess
out=Path('artifacts/colosseum-icon-2026-09-20')
labels={'pyramids-of-giza':'Giza','stonehenge':'Stonehenge','colosseum':'Colosseum','eiffel-tower':'Eiffel Tower','petra':'Petra','chichen-itza':'Chichen Itza','angkor-wat':'Angkor Wat','forbidden-city':'Forbidden City','machu-picchu':'Machu Picchu','sydney-opera-house':'Sydney Opera House'}
ink='#d4a24e'; bg='#122236'
def strokes_from(p):
 s=p.read_text(); data={}
 for id in labels:
  key=repr(id) if '-' in id else id
  chunk=s.split('  '+key+': [')[1].split('\n  ],')[0]
  data[id]=[{'weight':w,'d':d} for w,d in re.findall(r"s\(\s*\d+,\s*'(\w+)',\s*'([^']+)'",chunk)]
 return data
widths={'heavy':1.4,'mid':1.15,'fine':.8}
def draw_strokes(strokes,x,y,size,opacity=.8):
 return f'<g transform="translate({x} {y}) scale({size/32})" fill="none" stroke="{ink}" opacity="{opacity}" stroke-linecap="round" stroke-linejoin="round">'+''.join(f'<path d="{s["d"]}" stroke-width="{widths[s["weight"]]}"/>' for s in strokes)+'</g>'
for phase,p in [('before',out/'WonderGlyph.before.tsx'),('after',Path('src/ui/WonderGlyph.tsx')),('quiet-after',Path('src/ui/WonderGlyph.tsx'))]:
 data=strokes_from(p);svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="560" viewBox="0 0 1200 560"><rect width="1200" height="560" fill="{bg}"/><text x="26" y="32" fill="#f6e9d0" font-family="sans-serif" font-size="18">{phase.upper()} — all ten catalog glyphs · 96 / 24 / 32 / 38.4 px</text>'
 for i,(id,name) in enumerate(labels.items()):
  x=20+(i%5)*237;y=60+(i//5)*250
  svg+=f'<text x="{x}" y="{y+14}" fill="#ccd4db" font-family="sans-serif" font-size="14">{name}</text>'
  svg+=draw_strokes(data[id],x+52,y+24,96,.42 if phase=='quiet-after' else .8)
  for dx,size in [(35,24),(79,32),(131,38.4)]:
   svg+=draw_strokes(data[id],x+dx,y+155-(size-24),size,.42 if phase=='quiet-after' else .8)
   svg+=f'<text x="{x+dx}" y="{y+204}" fill="#8ea0b2" font-family="monospace" font-size="10">{size}</text>'
 svg+='</svg>';path=out/f'catalog-{phase}.svg';path.write_text(svg)
 subprocess.run(['rsvg-convert',str(path),'-o',str(path.with_suffix('.png'))],check=True)
# Source output is bundled once so we inspect exactly the static runtime drawings.
subprocess.run(['node_modules/.bin/esbuild','src/render/three/wonderArrivalDrawings.ts','--bundle','--platform=node','--format=cjs','--outfile=/tmp/wonder-arrival-review.cjs'],check=True)
data=json.loads(subprocess.check_output(['node','-e','process.stdout.write(JSON.stringify(require("/tmp/wonder-arrival-review.cjs").WONDER_ARRIVAL_DRAWINGS))']))
for group,ids in [('a',list(labels)[:5]),('b',list(labels)[5:])]:
 svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1190"><rect width="1000" height="1190" fill="{bg}"/>'
 for row,id in enumerate(ids):
  d=data[id];w,h=d['viewBox'];scale=min(205/w,175/h)
  for col,progress in enumerate([0,50,100]):
   x=28+col*330;y=30+row*234;fy=d['fillTop'] if progress==100 else d['fillBottom']-d['fillSpan']*progress/100
   wy=min(fy,d['waveCap']);clip=f'fill-{row}-{col}';shape=f'shape-{row}-{col}';rule=d.get('fillRule','nonzero')
   svg+=f'<text x="{x}" y="{y}" fill="#ccd4db" font-family="sans-serif" font-size="14">{labels[id]} · {progress}%</text>'
   svg+=f'<g transform="translate({x+40} {y+15}) scale({scale})"><defs><clipPath id="{clip}"><rect x="0" y="{fy}" width="{w}" height="{h}"/></clipPath><clipPath id="{shape}"><path d="{d["outline"]}" clip-rule="{rule}"/></clipPath></defs>'
   paths=''.join(f'<path d="{d[k]}"/>' for k in ['outline','detail','extra'])
   svg+=f'<g fill="none" stroke="#e9c587" stroke-width="1" opacity=".42">{paths}</g>'
   svg+=f'<g clip-path="url(#{clip})"><path d="{d["outline"]}" fill="#e8bd72" fill-opacity=".42" fill-rule="{rule}"/><g fill="none" stroke="#ffe8b7" stroke-width="1.4">{paths}</g></g>'
   if progress<100:
    svg+=f'<g clip-path="url(#{shape})"><rect x="0" y="{wy}" width="{w}" height="6" fill="#e8bd72" fill-opacity=".7"/><path d="M-80 {wy} Q-60 {wy-7} -40 {wy} T0 {wy} T40 {wy} T80 {wy} T120 {wy} T160 {wy} T200 {wy} T240 {wy} T280 {wy}" fill="none" stroke="#fff8d6" stroke-width="2.6"/></g>'
   svg+='</g>'
 svg+='</svg>';path=out/f'arrival-{group}-0-50-100.svg';path.write_text(svg)
 subprocess.run(['rsvg-convert',str(path),'-o',str(path.with_suffix('.png'))],check=True)
