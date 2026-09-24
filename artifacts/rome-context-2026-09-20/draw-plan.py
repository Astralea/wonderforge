import json,html,subprocess
from pathlib import Path
p=Path('artifacts/rome-context-2026-09-20');m=json.loads((p/'context.manifest.json').read_text())
body=['<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="870" viewBox="0 0 1000 870"><rect width="1000" height="870" fill="#122236"/><g font-family="sans-serif" fill="#e9dfcb"><text x="36" y="40" font-size="24">Rome: connected context plan</text><text x="36" y="67" font-size="14">Authored compressed AD 70–80 setting · north up · metres</text></g>']
def xy(x,z):return 450+x*.9,420-z*.9
body.append('<g fill="none" stroke="#304459" stroke-width="1">')
for v in range(-700,701,100):
 x,z=xy(v,0);body.append(f'<path d="M{x} 85 V815"/>');x,z=xy(0,v);body.append(f'<path d="M35 {z} H965"/>')
body.append('</g>')
for l in m['lots']:
 x,z=xy(l['x'],l['z']);r=(4 if l['kind'] in ['insula','palace'] else 1.3)*l['scale'];color='#956d50' if l['kind'] in ['insula','palace'] else '#547154';body.append(f'<circle cx="{x}" cy="{z}" r="{r}" fill="{color}"/>')
x,z=xy(0,0);body.append(f'<ellipse cx="{x}" cy="{z}" rx="{94*.9}" ry="{78*.9}" fill="#d0b68a"/><text x="{x}" y="{z}" fill="#122236" text-anchor="middle" font-family="sans-serif" font-size="15">Colosseum</text>')
for s in m['streets']:
 pts=' '.join(','.join(map(str,xy(*q))) for q in s['points']);body.append(f'<polyline points="{pts}" fill="none" stroke="#cbb790" stroke-width="{s["width"]*.9}"/>')
a=m['aqueduct'];start=a['start'];end=[start[i]+a['direction'][i]*a['length'] for i in range(2)];v=xy(*start);w=xy(*end);body.append(f'<path d="M{v[0]} {v[1]} L{w[0]} {w[1]}" stroke="#ec9565" stroke-width="5"/>')
pd=m['precinct'];x,z=xy(pd['center'][0]-pd['width']/2,pd['center'][1]+pd['depth']/2);body.append(f'<rect x="{x}" y="{z}" width="{pd["width"]*.9}" height="{pd["depth"]*.9}" fill="#b69564"/>')
for txt,point in [('Claudian precinct',pd['center']),('Neronian arcade',[210,-286]),('N',[0,315])]:
 x,z=xy(*point);body.append(f'<text x="{x}" y="{z-12}" fill="#f0debd" font-family="sans-serif" text-anchor="middle" font-size="14">{html.escape(txt)}</text>')
body.append('<text x="36" y="845" fill="#aab8c5" font-family="sans-serif" font-size="13">Precinct / streets / watercourse / full-footprint exclusion use the same typed source.</text></svg>')
(p/'context-plan.svg').write_text(''.join(body));subprocess.run(['rsvg-convert',str(p/'context-plan.svg'),'-o',str(p/'context-plan.png')],check=True)
