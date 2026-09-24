"""Authoring-only expansion of original icon paths; ships static SVG path data."""
from pathlib import Path
import re
source = Path('src/ui/WonderGlyph.tsx').read_text()
profiles = {
'pyramids-of-giza': ('GIZA', 'M2.5 26.8 L7.4 19.3 L12.1 26.8 Z M8.5 26.8 L17 7.4 L25.2 26.8 Z M21 17.5 L24.2 12.1 L30 26.8 H25.2 Z', 4, 7, 'M12.8 20 H19 M14.4 16.5 H18.5 M22 22 H26.5 M3.7 25 H8.8'),
'stonehenge': ('STONEHENGE', 'M4.8 26.3 L5.1 17.7 H7.3 L7.6 26.3 Z M25 26.3 L24.7 17.7 H27 L27.4 26.3 Z M3.7 17.7 L3.9 15.3 L10.2 15.6 V17.8 Z M22 17.8 L21.8 15.6 L28.4 15.3 V17.7 Z M10 27 L10.3 10.5 H12.8 L13.1 27 Z M18.6 27 L18.9 10.5 H21.4 L21.6 27 Z M9.4 10.5 L9.7 7.8 L22 7.5 L22.5 10.5 Z M14.7 25.8 L15 16.5 H16.9 L17.3 25.8 Z M13.9 16.5 H18 V14.6 H14 Z',4,7,'M11.1 24.8 L11.4 12 M19.8 25 L20.1 12 M10.3 8.8 L21.2 8.6 M5.9 23.9 L6.1 19 M26.1 24.3 L26 19'),
'colosseum': ('COLOSSEUM', 'M3.2 25.5 V12.1 Q4 7.9 15.7 6.5 Q21 6.1 24.1 8.1 L24.1 10.4 L22.4 11.2 L25.7 14.6 L24.1 16 L28.7 20.4 L28.7 25.5 Q16 30.1 3.2 25.5 Z M7.5 11.4 Q14.8 7.9 21.7 10.5 Q15.2 13.5 7.5 11.4 Z',3,7,'M4.7 12 L4.7 24.8 M8.8 13.6 V26.5 M14.1 14.4 V27.7 M19.5 14.2 V27.3 M24.4 20.7 V26.4'),
'eiffel-tower': ('EIFFEL', 'M78 16 L82 16 L85 50 L91 108 L99 146 L114 183 L139 224 L111 224 Q100 186 80 186 Q60 186 49 224 L21 224 L46 183 L61 146 L69 108 L75 50 Z',0,1,''),
'petra': ('PETRA','M6 27.6 V17 H4.8 V15.6 H6.4 L7.2 13.6 V8.1 L11.7 5.9 V12 L13.2 11.7 V7.1 Q13 5.3 14.8 4.7 L14.8 3.3 Q16 1.8 17.2 3.3 V4.7 Q19 5.3 18.8 7.1 V11.7 L20.3 12 V5.9 L24.8 8.1 V13.6 L25.6 15.6 H27.2 V17 H26 V27.6 Z M13.8 27.5 V21.3 H18.2 V27.5 Z',0,7,'M7.3 26.9 H9 M10.5 26.9 H12.1 M19.9 26.9 H21.6 M23.2 26.9 H24.9 M14.5 11.1 V7.4 M17.5 11.1 V7.4 M8.9 12.6 V9 M23.1 12.6 V9 M12.5 15.4 H19.5'),
'chichen-itza': ('CHICHEN','M3.4 27.6 L4.8 25 H5.9 V24 L7.4 21.5 H8 V20.5 L9.4 18 H10 V17 L11.3 14.5 H11.8 V13.5 L12.7 11.3 V10.5 H12.4 V5.4 H19.6 V10.5 H19.3 V11.3 L20.2 13.5 V14.5 H20.7 L22 17 V18 H22.6 L24 20.5 V21.5 H24.6 L26.1 24 V25 H27.2 L28.6 27.6 Z M14.7 10.5 V7.1 H17.3 V10.5 Z',2,7,'M12.5 25.8 H19.5 M13.1 22.3 H18.9 M13.6 18.8 H18.4 M14 15.3 H18 M6.8 22.2 H12.9 M19.1 22.2 H25.2 M8.8 18.7 H13.5 M18.5 18.7 H23.2'),
'machu-picchu': ('MACHU','M2.5 28.2 L4 25.8 L5.4 23.4 L5.5 21 V16.8 L9.3 14.9 L12 16.4 L13.4 11.7 L15.9 8.5 L17.8 10.3 L20.5 4.5 L23.8 8.7 L25.8 16.9 L29.4 22.9 L27 28.2 Z',1,7,'M8 18.4 H10.4 M8 20 H10.4 M15.2 20.5 H19.3 M18.2 24.2 H20.2 M6.4 25.7 V23.6 M20.8 9.3 L22.6 12.9 L22.3 17 M25.3 20.2 L27 23.1'),
'angkor-wat': ('ANGKOR','M5 27.1 V22.5 H4.8 V21 H5.3 V19.8 Q4.4 18.8 6.5 15.9 Q8.6 18.8 7.7 19.8 V21 H8.2 V22.5 H8.8 V20.5 H9.3 V18.5 H9.7 V17 Q8.7 15.3 10.8 11.6 Q12.9 15.3 11.9 17 V18.5 H12.3 V20.5 H12.8 V22.5 V20 H13.3 V17.8 H13.8 V15.8 H14.1 V13.8 Q12.8 10.1 16 4.2 Q19.2 10.1 17.9 13.8 V15.8 H18.2 V17.8 H18.7 V20 H19.2 V22.5 V20.5 H19.7 V18.5 H20.1 V17 Q19.1 15.3 21.2 11.6 Q23.3 15.3 22.3 17 V18.5 H22.7 V20.5 H23.2 V22.5 H23.8 V21 H24.3 V19.8 Q23.4 18.8 25.5 15.9 Q27.6 18.8 26.7 19.8 V21 H27.2 V22.5 H27 V27.1 Z',1,7,'M14.8 9.8 H17.2 M14.3 11.8 H17.7 M9.7 17 H11.9 M20.1 17 H22.3 M5.3 19.8 H7.7 M24.3 19.8 H26.7'),
'forbidden-city': ('FORBIDDEN','M4.2 28.6 V26.8 H5.7 V24.8 H8 V19 H4.4 L2.5 17.1 Q5.7 18.9 8.2 16.7 L9.8 15.7 V13.2 H7.9 L6 11.4 Q8.2 13 10.2 10.8 L16 6.8 L21.8 10.8 Q23.8 13 26 11.4 L24.1 13.2 H22.2 V15.7 L23.8 16.7 Q26.3 18.9 29.5 17.1 L27.6 19 H24 V24.8 H26.3 V26.8 H27.8 V28.6 Z',2,7,'M8 26 H13.8 M18.2 26 H24 M15 26 H17 M14.7 27.3 H17.3 M7.2 17.8 L14.7 12.9 M24.8 17.8 L17.3 12.9 M11.6 12.1 L15 8.6 M20.4 12.1 L17 8.6'),
'sydney-opera-house': ('SYDNEY','M3.5 26.4 V24.3 H5.5 L7 22.5 H4.7 Q4.6 17 6.5 13.9 Q9 15 11 17.1 Q12.1 11.1 14.7 7.1 Q14.5 12.8 17.6 18.3 Q20 8.9 23 5.2 Q20.7 16.8 28.2 22.5 H27.1 L28.5 24.3 V26.4 Z',2,7,'M14.7 7.1 Q12.9 16.4 13.5 22.5 M23 5.2 Q19.8 17.2 21.8 22.5 M6.5 13.9 Q6 19 8 22.5 M7 23.4 H26.7 M8.8 24.8 V25.8 M11.5 24.8 V25.8 M14.2 24.8 V25.8 M16.9 24.8 V25.8 M19.6 24.8 V25.8 M22.3 24.8 V25.8')
}
def scale_path(path, scale, offset):
    out=[]
    for m in re.finditer(r'([MLHVQZ])([^MLHVQZ]*)',path):
        command,raw=m.groups()
        numbers=[float(v) for v in re.findall(r'-?\d*\.?\d+',raw)]
        result=[]
        for i,n in enumerate(numbers):
            y=command=='V' or (command in 'MLQ' and i%2==1)
            value=(n-(offset if y else 0))*scale
            result.append(f'{value:.2f}'.rstrip('0').rstrip('.'))
        out.append(command+' '.join(result))
    return ' '.join(out)
result=[]
for id,(name,outline,offset,scale,extra) in profiles.items():
    if id=='eiffel-tower':
        result.append('''const EIFFEL: WonderArrivalDrawing = {
  viewBox: [160, 246],
  outline: 'M78 16 L82 16 L85 50 L91 108 L99 146 L114 183 L139 224 L111 224 Q100 186 80 186 Q60 186 49 224 L21 224 L46 183 L61 146 L69 108 L75 50 Z',
  detail: 'M75 50 H85 M72 78 H88 M69 108 H91 M65 127 H95 M61 146 H99 M54 164 H106 M46 183 H114 M33 204 H55 M105 204 H127 M75 50 L88 78 L69 108 L95 127 L61 146 L106 164 L46 183 M85 50 L72 78 L91 108 L65 127 L99 146 L54 164 L114 183 M46 183 L55 204 L33 204 L49 224 M114 183 L105 204 L127 204 L111 224',
  extra: 'M80 4 V16 M74 16 H86 M64 107 H96 V113 H64 Z M51 161 H109 V167 H51 Z M72 48 H88 V53 H72 Z M24 220 H50 M110 220 H136 M77 24 H83 M76 34 H84',
  fillBottom: 224, fillSpan: 208, fillTop: 0, waveCap: 198,
  ground: { cx: 80, cy: 231, rx: 62, ry: 3 },
};''')
        continue
    key=id if '-' not in id else repr(id)
    chunk=source.split('  '+key+': [')[1].split('\n  ],')[0]
    paths=re.findall(r"s\(\d+, '[^']+', '([^']+)'\)",chunk)
    details=' '.join(paths[1:])
    if id=='colosseum':
        # Close the three front arcade rows into real negative-space openings.
        for row in paths[3:6]:
            for arch in re.split(r' (?=M)',row):
                if arch.count('Q') and arch.count('V')>=2:
                    outline+=' '+arch+' Z'
        rule="\n  fillRule: 'evenodd',"
    elif id in ('petra','chichen-itza'):
        rule="\n  fillRule: 'evenodd',"
    else: rule=''
    floor={'stonehenge':27,'colosseum':28,'forbidden-city':28.6,'petra':27.6,'chichen-itza':27.6,'machu-picchu':28.2,'angkor-wat':27.1,'sydney-opera-house':26.4}.get(id,26.8)
    top={'pyramids-of-giza':7.4,'stonehenge':7.5,'colosseum':6.1,'petra':1.8,'chichen-itza':5.4,'machu-picchu':4.5,'angkor-wat':4.2,'forbidden-city':4.8,'sydney-opera-house':5.2}[id]
    bottom=(floor-offset)*scale
    height=(31-offset)*scale
    result.append(f'''const {name}: WonderArrivalDrawing = {{
  viewBox: [224, {height}],
  outline: '{scale_path(outline,scale,offset)}',
  detail: '{scale_path(details,scale,offset)}',
  extra: '{scale_path(extra,scale,offset)}',{rule}
  fillBottom: {bottom:.2f}, fillSpan: {(floor-top)*scale:.2f}, fillTop: 0, waveCap: {bottom-6:.2f},
  ground: {{ cx: 112, cy: {(29.7-offset)*scale:.2f}, rx: 96, ry: 2.5 }},
}};''')
p=Path('src/render/three/wonderArrivalDrawings.ts');text=p.read_text()
start=text.index('const ')
end=text.index('export const WONDER_ARRIVAL_DRAWINGS:',start)
text=text[:start]+'\n\n'.join(result)+'\n\n'+text[end:]
text=text.replace("  /** Architectural openings stay hollow in the filled silhouette and wave clip. */\n  fillRule?: 'evenodd';\n", '')
text=text.replace('  outline: string;','  outline: string;\n  /** Architectural openings stay hollow in the filled silhouette and wave clip. */\n  fillRule?: \'evenodd\';')
p.write_text(text)
