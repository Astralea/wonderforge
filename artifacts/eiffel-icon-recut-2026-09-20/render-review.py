from pathlib import Path
import re
import subprocess

OUT = Path(__file__).parent
BG = '#122236'
WIDTHS = {'heavy': 1.4, 'mid': 1.15, 'fine': .8}


def strokes(path):
    text = path.read_text().split("  'eiffel-tower': [")[1].split('\n  ],')[0]
    return re.findall(r"s\(\s*\d+,\s*'(\w+)',\s*'([^']+)'", text)


def arrival(path):
    text = path.read_text().split('const EIFFEL: WonderArrivalDrawing = {')[1].split('\n};')[0]
    data = {key: re.search(key + r": '([^']+)'", text).group(1) for key in ['outline', 'detail', 'extra']}
    data['rule'] = 'evenodd' if "fillRule: 'evenodd'" in text else 'nonzero'
    return data


def save(name, contents, width, height):
    path = OUT / f'{name}.svg'
    path.write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}"><rect width="100%" height="100%" fill="{BG}"/>{contents}</svg>')
    subprocess.run(['rsvg-convert', str(path), '-o', str(path.with_suffix('.png'))], check=True)


def label(x, y, text, size=15):
    return f'<text x="{x}" y="{y}" fill="#ccd4db" font-family="sans-serif" font-size="{size}">{text}</text>'


def glyph(data, x, y, size):
    paths = ''.join(f'<path d="{d}" stroke-width="{WIDTHS[w]}"/>' for w, d in data)
    return f'<g transform="translate({x} {y}) scale({size / 32})" fill="none" stroke="#d4a24e" opacity=".8" stroke-linecap="round" stroke-linejoin="round">{paths}</g>'


phases = [
    ('Before', OUT / 'WonderGlyph.before.tsx', OUT / 'wonderArrivalDrawings.before.ts'),
    ('After', Path('src/ui/WonderGlyph.tsx'), Path('src/render/three/wonderArrivalDrawings.ts')),
]
body = label(28, 32, 'Eiffel Tower · summit redraw', 21)
for i, (name, small, _) in enumerate(phases):
    y = 68 + i * 225
    data = strokes(small)
    body += label(28, y + 20, name, 18)
    for x, size in [(132, 128), (350, 24), (455, 32), (560, 38.4)]:
        body += glyph(data, x, y + 48 + 128 - size, size)
        body += label(x, y + 203, f'{size:g} px', 13)
save('catalog-before-after', body, 720, 536)

body = label(28, 32, 'Eiffel arrival · 0% / 50% / 100%', 21)
for row, (name, _, large) in enumerate(phases):
    data = arrival(large)
    y = 68 + row * 340
    body += label(28, y + 18, name, 18)
    for col, percent in enumerate([0, 50, 100]):
        x = 142 + col * 268
        fill_y = 0 if percent == 100 else 224 - 208 * percent / 100
        wave_y = min(fill_y, 198)
        fill_id, shape_id = f'f{row}{col}', f's{row}{col}'
        paths = ''.join(f'<path d="{data[key]}"/>' for key in ['outline', 'detail', 'extra'])
        body += f'<g transform="translate({x} {y}) scale(1.15)"><defs><clipPath id="{fill_id}"><rect x="0" y="{fill_y}" width="160" height="246"/></clipPath><clipPath id="{shape_id}"><path d="{data["outline"]}" clip-rule="{data["rule"]}"/></clipPath></defs>'
        body += f'<g fill="none" stroke="#e9c587" stroke-width="1" opacity=".42">{paths}</g>'
        body += f'<g clip-path="url(#{fill_id})"><path d="{data["outline"]}" fill="#e8bd72" fill-opacity=".42" fill-rule="{data["rule"]}"/><g fill="none" stroke="#ffe8b7" stroke-width="1.4">{paths}</g></g>'
        if percent < 100:
            body += f'<g clip-path="url(#{shape_id})"><rect x="0" y="{wave_y}" width="160" height="6" fill="#e8bd72" fill-opacity=".7"/><path d="M-80 {wave_y} Q-60 {wave_y-7} -40 {wave_y} T0 {wave_y} T40 {wave_y} T80 {wave_y} T120 {wave_y} T160 {wave_y} T200 {wave_y}" fill="none" stroke="#fff8d6" stroke-width="2.6"/></g>'
        body += '</g>' + label(x + 70, y + 309, f'{percent}%')
save('arrival-before-after', body, 980, 770)

body = label(28, 32, '1889 summit · enlarged inspection', 21)
for col, (name, _, large) in enumerate(phases):
    data = arrival(large)
    x = 32 + col * 360
    paths = ''.join(f'<path d="{data[key]}"/>' for key in ['outline', 'detail', 'extra'])
    body += label(x, 74, name, 18)
    body += f'<svg x="{x}" y="100" width="300" height="330" viewBox="60 0 40 44"><g fill="none" stroke="#e9c587" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">{paths}</g></svg>'
save('summit-before-after', body, 752, 470)
