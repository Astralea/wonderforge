#!/usr/bin/env python3
"""Sydney Opera House reference model (v3): analytic spherical shells, podium, glass.

One source of truth for the runtime JSON and the Blender scene. The geometry is
computed here in pure Python (no numpy, no bpy), written to
`src/data/generated/sydneyBlenderModel.json`, and the Blender meshes are then
built from the *same rounded arrays*, so the two cannot drift apart.

Usage
  python3 scripts/build-sydney-reference-model.py --json-only
  Blender -b --factory-startup --python scripts/build-sydney-reference-model.py -- [--engine eevee|workbench] [--no-render]
  Blender -b --factory-startup --python scripts/build-sydney-reference-model.py -- --verify

Runtime frame: X east, Y up, Z south, metres, water = 0. Blender frame: X east,
Y north, Z up, so blender = (x, -z, y). glTF export with +Y up restores runtime.

Sources (see artifacts/sydney-reference-rebuild-2026-09-23/delegation/claude-model-report.md):
  S  sphere radius 75 m (Lewis 246 ft = 74.98), highest tip 67 m ASL, footprint 183 x 120.
  D  tip heights / stations traced from CMP 2017 longitudinal sections (Fig 1.7, 1.8),
     hall lengths, axes and widths traced from the NSW SIX aerial and CMP site plan (Fig 1.2).
  P  pedestal laterals, ridge valleys under neighbouring shells, restaurant heights,
     glass projection, podium articulation: photo/plan approximations.
"""
import argparse
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..'))
MODEL_DIR = os.path.join(ROOT, 'artifacts/sydney-reference-rebuild-2026-09-23/model')
JSON_PATH = os.path.join(ROOT, 'src/data/generated/sydneyBlenderModel.json')
BLEND_PATH = os.path.join(MODEL_DIR, 'sydney-reference-model.blend')
GLB_PATH = os.path.join(MODEL_DIR, 'sydney-reference-model.glb')
RENDER_DIR = os.path.join(MODEL_DIR, 'renders')

RADIUS = 75.0
DECK = 14.2
GROUND = 2.2
ROWS, COLS = 65, 33
RIB_COUNT = 10
SHELL_THICKNESS = 0.22
BUILDING_YAW = math.radians(-12.0)  # local frame vs true north; -12 deg puts the north end NNE

# --------------------------------------------------------------------------- vectors

def add(a, b): return (a[0] + b[0], a[1] + b[1], a[2] + b[2])
def sub(a, b): return (a[0] - b[0], a[1] - b[1], a[2] - b[2])
def mul(a, s): return (a[0] * s, a[1] * s, a[2] * s)
def dot(a, b): return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
def cross(a, b): return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])
def length(a): return math.sqrt(dot(a, a))
def norm(a):
    l = length(a)
    return (a[0] / l, a[1] / l, a[2] / l)
def lerp(a, b, t): return add(a, mul(sub(b, a), t))
def mirror(p): return (-p[0], p[1], p[2])


def slerp(a, b, t):
    """Great-circle interpolation between unit vectors."""
    c = max(-1.0, min(1.0, dot(a, b)))
    om = math.acos(c)
    if om < 1e-9:
        return a
    s = math.sin(om)
    return add(mul(a, math.sin((1 - t) * om) / s), mul(b, math.sin(t * om) / s))


def circumcentre(p, a, r):
    u, v = sub(a, p), sub(r, p)
    w = cross(u, v)
    ww = dot(w, w)
    o = add(p, mul(add(mul(cross(w, u), dot(v, v)), mul(cross(v, w), dot(u, u))), 1 / (2 * ww)))
    return o, norm(w)

# --------------------------------------------------------------------------- inventory
# Hall-local frame: x lateral (positive half), y above deck, z along hall (+ south),
# origin at the main (tallest) shell tip station. Halls are placed in the building
# frame, which is then yawed -12 deg. Stations: CMP sections (D) scaled so the
# concert tip-to-tip length is the 121 m traced on the aerial; heights from the
# section at 0.2335 m/px anchored to 67 m ASL highest tip.

HALLS = {
    # origin = building-frame (x, z) of the main tip station; yaw from the CMP site
    # plan axes, which meet near the brass plaque at the foot of the steps (+-11 deg).
    'concert': {'origin': (-26.7, -32.8), 'yaw': 0.197},
    'opera': {'origin': (30.6, -33.0), 'yaw': -0.194},
    'restaurant': {'origin': (-33.9, 60.5), 'yaw': 0.03},
}

# id, group, name, opens, P (pedestal), A (leading apex), R (ridge valley)
SHELL_DEFS = [
    (0, 'concert', 'concert-main', 'north', (23.0, 0.0, 39.5), (0.0, 52.8, 0.0), (0.0, 19.0, 45.4)),
    (1, 'concert', 'concert-south', 'south', (23.0, 0.0, 39.5), (0.0, 29.7, 76.7), (0.0, 19.0, 45.4)),
    (2, 'concert', 'concert-middle', 'north', (26.0, 0.0, 4.0), (0.0, 40.0, -29.1), (0.0, 30.0, 4.0)),
    (3, 'opera', 'opera-main', 'north', (19.5, 0.0, 31.0), (0.0, 47.9, 0.0), (0.0, 14.0, 36.4)),
    (4, 'opera', 'opera-south', 'south', (19.5, 0.0, 31.0), (0.0, 19.8, 65.6), (0.0, 14.0, 36.4)),
    (5, 'opera', 'opera-middle', 'north', (22.5, 0.0, 2.0), (0.0, 35.5, -15.0), (0.0, 27.0, 2.0)),
    (6, 'restaurant', 'restaurant-south', 'south', (12.0, 0.0, 0.0), (0.0, 17.0, 20.0), (0.0, 11.0, 0.0)),
    (7, 'concert', 'concert-north', 'north', (23.0, 0.0, -15.0), (0.0, 28.5, -41.6), (0.0, 24.0, -10.0)),
    (8, 'opera', 'opera-north', 'north', (20.0, 0.0, -12.0), (0.0, 26.1, -34.0), (0.0, 22.0, -8.0)),
    (9, 'restaurant', 'restaurant-north', 'north', (12.0, 0.0, 0.0), (0.0, 16.0, -19.0), (0.0, 11.0, 0.0)),
]
# shell id -> projection (m) of the foyer-glass foot beyond the apex station (P). The foot
# follows the arch in plan and bows outward, so the glass hangs and flares like the photos.
GLAZED = {1: 3.5, 4: 3.0, 6: 2.5, 7: 3.5, 8: 3.5, 9: 2.5}
# (southern shell whose leading arch overhangs, northern neighbour): a white side panel is
# stitched from the southern leading arch to the neighbour's rear edge, full height, with a
# narrow bronze louvre joint tucked under the arch (P, photo-grounded closure of the flanks).
INFILL_PAIRS = [(0, 2), (2, 7), (3, 5), (5, 8)]
LOUVRE_JOINT = 0.06                   # fraction of each side panel read as the bronze joint
PANEL_BULGE = 0.09                    # outward bulge as a fraction of the arch-to-edge span (max 2.4 m)
# back-to-back shells share one pedestal and meet exactly along the intersection circle of
# their two 75 m spheres (rear edge v=0 of both), so they neither cross nor gap.
BACK_PAIRS = [(0, 1), (3, 4), (9, 6)]
REAR_BLEND = lambda v: (1 - v) ** 3
SHORELINE_PATH = os.path.join(ROOT, 'artifacts/sydney-reference-rebuild-2026-09-23/references/near-site-shoreline.json')


def hall_to_building(hall, p):
    h = HALLS[hall]
    c, s = math.cos(h['yaw']), math.sin(h['yaw'])
    return (h['origin'][0] + p[0] * c + p[2] * s, p[1] + DECK, h['origin'][1] - p[0] * s + p[2] * c)


def hall_to_world(hall, p):
    return building_to_world(hall_to_building(hall, p))


def hall_dir_to_world(hall, n):
    yaw = HALLS[hall]['yaw'] + BUILDING_YAW
    c, s = math.cos(yaw), math.sin(yaw)
    return (n[0] * c + n[2] * s, n[1], -n[0] * s + n[2] * c)


# Registration to the map datum (origin lon 151.215031, lat -33.856974, the origin of
# references/near-site-shoreline.json). Five landmarks traced on the NSW SIX aerial (both hall
# tips, restaurant centre) agree to +-2 m on this pure translation of the building frame.
WORLD_OFFSET = (14.0, 8.2)


def building_to_world(p):
    c, s = math.cos(BUILDING_YAW), math.sin(BUILDING_YAW)
    return (p[0] * c + p[2] * s + WORLD_OFFSET[0], p[1], -p[0] * s + p[2] * c + WORLD_OFFSET[1])

# --------------------------------------------------------------------------- shells

def solve_shell(P, A, R):
    """Sphere (radius 75) through P, A, R with its centre on the inward side."""
    o, n = circumcentre(P, A, R)
    rc = length(sub(P, o))
    if rc >= RADIUS:
        raise ValueError('corner triangle circumradius %.2f exceeds sphere radius' % rc)
    h = math.sqrt(RADIUS ** 2 - rc ** 2)
    c1, c2 = add(o, mul(n, h)), add(o, mul(n, -h))
    C = c1 if c1[0] < c2[0] else c2
    # ridge: small circle where the sphere meets the hall plane x = 0
    rho = math.sqrt(RADIUS ** 2 - C[0] ** 2)
    phR = math.atan2(R[1] - C[1], R[2] - C[2])
    phA = math.atan2(A[1] - C[1], A[2] - C[2])
    d = (phA - phR + math.pi) % (2 * math.pi) - math.pi
    alt = d - math.copysign(2 * math.pi, d)
    def mid_y(delta): return C[1] + rho * math.sin(phR + delta / 2)
    delta = d if mid_y(d) >= mid_y(alt) else alt
    def ridge(v):
        ph = phR + delta * v
        return (0.0, C[1] + rho * math.sin(ph), C[2] + rho * math.cos(ph))
    return C, rho, ridge


def junction_arc(Ca, Cb, P, R):
    """Arc P->R of the circle where two radius-75 spheres meet (lies on both spheres)."""
    d = sub(Cb, Ca)
    L = length(d)
    M = mul(add(Ca, Cb), 0.5)
    nrm = mul(d, 1 / L)
    rho = math.sqrt(RADIUS ** 2 - (L / 2) ** 2)
    e1 = norm(sub(P, M))
    e2 = norm(cross(nrm, e1))
    th = math.atan2(dot(sub(R, M), e2), dot(sub(R, M), e1))
    alt = th - math.copysign(2 * math.pi, th)
    def at(delta, u):
        a = delta * u
        return add(M, add(mul(e1, rho * math.cos(a)), mul(e2, rho * math.sin(a))))
    delta = th if at(th, 0.5)[1] >= at(alt, 0.5)[1] else alt
    return lambda u: at(delta, u)


def shell_grid(P, A, R, solved, rear=None):
    """grid[row u][col v] = (point, unit outward normal) for the positive half.

    Ribs are great circles P -> ridge(v). With a back-to-back neighbour, the rear edge
    (v=0) is the exact spherical-intersection arc and nearby ribs blend toward it by
    direction before re-normalising, so every sample stays on this shell's own sphere."""
    C, rho, ridge = solved
    pn = norm(sub(P, C))
    grid = []
    for i in range(ROWS):
        u = i / (ROWS - 1)
        row = []
        if rear:
            # correction that is exact on the rear edge and vanishes at the pedestal/ridge
            g0 = slerp(pn, norm(sub(ridge(0.0), C)), u)
            delta = sub(norm(sub(rear(u), C)), g0)
        for j in range(COLS):
            v = j / (COLS - 1)
            qn = norm(sub(ridge(v), C))
            n = norm(slerp(pn, qn, u))
            if rear:
                n = norm(add(n, mul(delta, REAR_BLEND(v))))
            row.append((add(C, mul(n, RADIUS)), n))
        grid.append(row)
    return C, grid


def r4(x): return round(x, 4)
def r5(x): return round(x, 5)


def bounds(flat):
    mn = [min(flat[k::3]) for k in range(3)]
    mx = [max(flat[k::3]) for k in range(3)]
    return [r4((mn[k] + mx[k]) / 2) for k in range(3)], [r4(max(0.01, mx[k] - mn[k])) for k in range(3)], mn, mx


def build_shells():
    shells, local = [], {}
    solved = {d[0]: solve_shell(d[4], d[5], d[6]) for d in SHELL_DEFS}
    defs = {d[0]: d for d in SHELL_DEFS}
    rear = {}
    for a, b in BACK_PAIRS:
        assert defs[a][4] == defs[b][4] and defs[a][6] == defs[b][6], 'back pair must share P and R'
        arc = junction_arc(solved[a][0], solved[b][0], defs[a][4], defs[a][6])
        rear[a] = rear[b] = arc
    for sid, group, name, opens, P, A, R in SHELL_DEFS:
        C, grid = shell_grid(P, A, R, solved[sid], rear.get(sid))
        sides = [[[(mirror(p), mirror(n)) for (p, n) in row] for row in grid], grid]
        local[sid] = {'id': sid, 'sides': sides, 'P': P, 'A': A, 'R': R, 'C': C, 'group': group, 'opens': opens, 'name': name}
        pts, nrm = [], []
        for side in sides:
            for row in side:
                for p, n in row:
                    pts.extend(r4(x) for x in hall_to_world(group, p))
                    nrm.extend(r5(x) for x in hall_dir_to_world(group, n))
        pos, dim, mn, mx = bounds(pts)
        zs = [row[j][0][2] for row in grid for j in range(COLS)]
        min_local_y = min(p[1] for row in grid for p, _ in row)
        shells.append({
            'id': sid, 'group': group, 'name': name, 'opens': opens,
            'position': pos, 'rotation': [0, 0, 0], 'dimensions': dim,
            'height': r4(mx[1] - mn[1]), 'topY': r4(mx[1]),
            'yaw': r5(HALLS[group]['yaw'] + BUILDING_YAW),
            'centreX': 0, 'centreY': 0, 'length': r4(max(zs) - min(zs)),
            'ribCount': RIB_COUNT, 'rows': ROWS, 'cols': COLS,
            'points': pts, 'normals': nrm,
            'sphereCenters': [[r4(x) for x in hall_to_world(group, mirror(C))], [r4(x) for x in hall_to_world(group, C)]],
            'corners': {k: [[r4(x) for x in hall_to_world(group, mirror(v))], [r4(x) for x in hall_to_world(group, v)]]
                        for k, v in (('pedestal', P), ('apex', A), ('ridgeValley', R))},
            'minRibHeightAboveDeck': r4(min_local_y),
        })
    return shells, local

# --------------------------------------------------------------------------- primitive builders

def orient_tri(a, b, c, centre, out):
    n = cross(sub(b, a), sub(c, a))
    g = mul(add(add(a, b), c), 1 / 3)
    if dot(n, sub(g, centre)) < 0:
        b, c = c, b
    out.extend((a, b, c))


def beam(p0, p1, w, h, hint, out, lift=0.0):
    """Box of width w, depth h along hint side, from p0 to p1."""
    d = sub(p1, p0)
    if length(d) < 1e-6:
        return
    d = norm(d)
    side = cross(d, hint)
    if length(side) < 1e-4:
        side = cross(d, (1.0, 0.0, 0.0) if abs(d[0]) < 0.9 else (0.0, 0.0, 1.0))
    side = norm(side)
    up = norm(cross(side, d))
    corners = []
    for p in (p0, p1):
        for sx in (-0.5, 0.5):
            for uy in (0.0, 1.0):
                corners.append(add(add(p, mul(side, sx * w)), mul(up, lift + uy * h)))
    centre = mul(add(p0, p1), 0.5)
    centre = add(centre, mul(up, lift + h / 2))
    faces = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    for a, b, c, e in faces:
        orient_tri(corners[a], corners[b], corners[c], centre, out)
        orient_tri(corners[a], corners[c], corners[e], centre, out)


def prism(poly, y0, y1, out):
    """Vertical prism over plan polygon [(x, z)] (star-shaped about its centroid)."""
    n = len(poly)
    cx = sum(p[0] for p in poly) / n
    cz = sum(p[1] for p in poly) / n
    centre = (cx, (y0 + y1) / 2, cz)
    for k in range(n):
        a, b = poly[k], poly[(k + 1) % n]
        orient_tri((cx, y1, cz), (a[0], y1, a[1]), (b[0], y1, b[1]), centre, out)
        orient_tri((cx, y0, cz), (b[0], y0, b[1]), (a[0], y0, a[1]), centre, out)
        orient_tri((a[0], y0, a[1]), (b[0], y0, b[1]), (b[0], y1, b[1]), centre, out)
        orient_tri((a[0], y0, a[1]), (b[0], y1, b[1]), (a[0], y1, a[1]), centre, out)


def box(x0, x1, y0, y1, z0, z1, out):
    prism([(x0, z0), (x1, z0), (x1, z1), (x0, z1)], y0, y1, out)


def profile_x(profile, x0, x1, out):
    """Prism along x over a convex (z, y) profile."""
    n = len(profile)
    cz = sum(p[0] for p in profile) / n
    cy = sum(p[1] for p in profile) / n
    centre = ((x0 + x1) / 2, cy, cz)
    for x in (x0, x1):
        for k in range(1, n - 1):
            orient_tri((x, profile[0][1], profile[0][0]), (x, profile[k][1], profile[k][0]),
                       (x, profile[k + 1][1], profile[k + 1][0]), centre, out)
    for k in range(n):
        a, b = profile[k], profile[(k + 1) % n]
        orient_tri((x0, a[1], a[0]), (x1, a[1], a[0]), (x1, b[1], b[0]), centre, out)
        orient_tri((x0, a[1], a[0]), (x1, b[1], b[0]), (x0, b[1], b[0]), centre, out)


def surface(grid2d, out):
    """Two-sided-agnostic triangulation of a [i][j] point grid."""
    for i in range(len(grid2d) - 1):
        for j in range(len(grid2d[0]) - 1):
            a, b, c, d = grid2d[i][j], grid2d[i + 1][j], grid2d[i + 1][j + 1], grid2d[i][j + 1]
            for tri in ((a, b, c), (a, c, d)):
                if length(cross(sub(tri[1], tri[0]), sub(tri[2], tri[0]))) > 1e-6:
                    out.extend(tri)


def flat(tris, fn=None):
    res = []
    for p in tris:
        q = fn(p) if fn else p
        res.extend(r4(x) for x in q)
    return res

# --------------------------------------------------------------------------- podium (building frame)

X_EDGES = [-56, -42, -28, -14, 0, 14, 28, 42, 56]
Z_EDGES = [-62, -46, -30, -14, 2, 18, 34, 50]
NORTH_EDGE = Z_EDGES[0]               # straight north face of the deck between the two foyer wings
PLATFORM_X = [-56, -42, -29, -16]
PLATFORM_Z = [50, 64, 78, 91.5]
STAIR_X = [-16, 2, 20, 38, 56]
STAIR_Z0, STAIR_Z1, STAIR_RISERS = 50.0, 91.5, 32
WING_MARGIN = 2.2                     # granite landing between the foyer-glass foot and the wing face
WING_ROWS = list(range(0, ROWS, 4))
# facade courses of the northern foyer wings (P, from the harbour aerial photograph):
# granite plinth / bands / coping (proud 0.35 m) and three dark window strips (proud 0.08 m)
WING_BANDS = [(GROUND, 3.0), (6.0, 6.6), (9.6, 10.2), (13.5, 14.6)]
WING_WINDOWS = [(3.4, 5.7), (6.9, 9.3), (10.5, 13.1)]
GAP = 0.03


def wall_panel(axis, face, lo, hi, outward, out):
    """Pink granite cladding with two projecting bands and a coping; axis 'x' faces +-x."""
    t = 0.6
    layers = [(0.0, t, GROUND, DECK), (t, t + 0.35, 6.0, 6.6), (t, t + 0.35, 10.0, 10.6), (0.0, t + 0.35, DECK - 0.4, DECK + 0.35)]
    for d0, d1, y0, y1 in layers:
        a, b = face + outward * d0, face + outward * d1
        if axis == 'x':
            box(min(a, b), max(a, b), y0, y1, lo, hi, out)
        else:
            box(lo, hi, y0, y1, min(a, b), max(a, b), out)


EAST_MARGIN = 2.5                     # broadwalk/seawall strip kept between the east wall face and the shore
_SHORE_B = None


def world_to_building(x, z):
    c, s = math.cos(BUILDING_YAW), math.sin(BUILDING_YAW)
    xw, zw = x - WORLD_OFFSET[0], z - WORLD_OFFSET[1]
    return (c * xw - s * zw, s * xw + c * zw)


def east_edge(zb):
    """Deck edge x (building frame) so the banded east wall stays EAST_MARGIN inside the
    traced near-site shoreline (references/near-site-shoreline.json, authoritative)."""
    global _SHORE_B
    if _SHORE_B is None:
        with open(SHORELINE_PATH) as f:
            _SHORE_B = [world_to_building(p[0], p[1]) for p in json.load(f)['points']]
    xs = []
    for k in range(len(_SHORE_B)):
        (x1, z1), (x2, z2) = _SHORE_B[k], _SHORE_B[(k + 1) % len(_SHORE_B)]
        if (z1 - zb) * (z2 - zb) <= 0 and z1 != z2:
            xs.append(x1 + (zb - z1) * (x2 - x1) / (z2 - z1))
    east = max(x for x in xs if x > 0)
    return min(56.0, east - EAST_MARGIN - 0.95)


def wall_run(a, b, outward, out):
    """Banded granite cladding along plan segment a->b (building frame), outward unit normal."""
    nx, nz = outward
    def strip(d0, d1):
        return [(a[0] + nx * d0, a[1] + nz * d0), (b[0] + nx * d0, b[1] + nz * d0),
                (b[0] + nx * d1, b[1] + nz * d1), (a[0] + nx * d1, a[1] + nz * d1)]
    t = 0.6
    for d0, d1, y0, y1 in [(0.0, t, GROUND, DECK), (t, t + 0.35, 6.0, 6.6), (t, t + 0.35, 10.0, 10.6),
                           (0.0, t + 0.35, DECK - 0.4, DECK + 0.35)]:
        prism(strip(d0, d1), y0, y1, out)


def seg_normal(a, b):
    ex, ez = b[0] - a[0], b[1] - a[1]
    l = math.hypot(ex, ez)
    return (ez / l, -ex / l)


def glass_foot(sh, side, row):
    """Deck point under a leading-arch sample: follows the arch in plan, bowed outward
    and projected beyond the apex station, so the glass hangs and then flares."""
    u = row / (ROWS - 1)
    a = sh['sides'][side][row][COLS - 1][0]
    direction = -1.0 if sh['opens'] == 'north' else 1.0
    sign = -1.0 if side == 0 else 1.0
    proj = GLAZED[sh['id']]
    return (a[0] + sign * 1.4 * math.sin(math.pi * u), 0.0, a[2] + direction * proj * math.sin(math.pi / 2 * u))


def north_wings(local):
    """Two projecting foyer wings (building frame) under the concert/opera north shells."""
    wings = []
    for sid, hall in ((7, 'concert'), (8, 'opera')):
        sh = local[sid]
        hub = (0.0, 0.0, sh['P'][2])
        curve = []
        for side, rows in ((0, WING_ROWS), (1, WING_ROWS[::-1][1:])):
            for r in rows:
                f = glass_foot(sh, side, r)
                if side == 0 and r == WING_ROWS[-1]:
                    pass
                d = (f[0] - hub[0], 0.0, f[2] - hub[2])
                l = math.hypot(d[0], d[2]) or 1.0
                q = (f[0] + d[0] / l * WING_MARGIN, 0.0, f[2] + d[2] / l * WING_MARGIN)
                b = hall_to_building(hall, q)
                curve.append((b[0], b[2]))
        # clip to the part north of the deck face
        poly = []
        for k in range(len(curve) - 1):
            a, b = curve[k], curve[k + 1]
            ina, inb = a[1] < NORTH_EDGE, b[1] < NORTH_EDGE
            if ina:
                poly.append(a)
            if ina != inb:
                t = (NORTH_EDGE - a[1]) / (b[1] - a[1])
                poly.append((a[0] + (b[0] - a[0]) * t, NORTH_EDGE))
        if curve[-1][1] < NORTH_EDGE:
            poly.append(curve[-1])
        xs = [p[0] for p in poly if abs(p[1] - NORTH_EDGE) < 1e-9]
        wings.append({'hall': hall, 'shellId': sid, 'poly': poly, 'chord': (min(xs), max(xs))})
    return wings


def build_podium(local):
    pieces = []
    seq = [0]

    def add_piece(pid, kind, material, tris, stage):
        verts = flat(tris, building_to_world)
        pos, dim, _, _ = bounds(verts)
        pieces.append({'id': pid, 'kind': kind, 'material': material, 'stage': stage, 'sequence': seq[0],
                       'vertices': verts, 'position': pos, 'dimensions': dim})
        seq[0] += 1

    # 1 deck bays (north to south, west to east)
    last = len(X_EDGES) - 2
    for zi in range(len(Z_EDGES) - 1):
        z0, z1 = Z_EDGES[zi] + GAP, Z_EDGES[zi + 1] - GAP
        for xi in range(len(X_EDGES) - 1):
            t = []
            x0 = X_EDGES[xi] + GAP
            if xi == last:
                e0, e1 = east_edge(Z_EDGES[zi]), east_edge(Z_EDGES[zi + 1])
                prism([(x0, z0), (e0 - GAP, z0), (e1 - GAP, z1), (x0, z1)], GROUND, DECK, t)
            else:
                box(x0, X_EDGES[xi + 1] - GAP, GROUND, DECK, z0, z1, t)
            add_piece('bay-r%02d-c%02d' % (zi, xi), 'deck-bay', 'granite', t, 'podium-bays')
    for zi in range(len(PLATFORM_Z) - 1):
        for xi in range(len(PLATFORM_X) - 1):
            t = []
            box(PLATFORM_X[xi] + GAP, PLATFORM_X[xi + 1] - GAP, GROUND, DECK, PLATFORM_Z[zi] + GAP, PLATFORM_Z[zi + 1] - GAP, t)
            add_piece('restaurant-platform-r%02d-c%02d' % (zi, xi), 'deck-bay', 'granite', t, 'podium-bays')
    # 2 northern foyer wings: segmented curved slabs projecting under each north arch
    wings = north_wings(local)
    for w in wings:
        poly = w['poly']
        hub = ((w['chord'][0] + w['chord'][1]) / 2, NORTH_EDGE + GAP)
        for k in range(len(poly) - 1):
            a, b = poly[k], poly[k + 1]
            t = []
            prism([hub, a, b], GROUND, DECK, t)
            # facade courses on the curved outer face
            if abs(a[1] - NORTH_EDGE) < 1e-9 and abs(b[1] - NORTH_EDGE) < 1e-9:
                add_piece('%s-foyer-wing-s%02d' % (w['hall'], k), 'foyer-wing', 'granite', t, 'north-foyer-wings')
                continue
            ex, ez = b[0] - a[0], b[1] - a[1]
            l = math.hypot(ex, ez)
            nx, nz = ez / l, -ex / l
            if (a[0] - hub[0]) * nx + (a[1] - hub[1]) * nz < 0:
                nx, nz = -nx, -nz
            band = [a, b, (b[0] + nx * 0.35, b[1] + nz * 0.35), (a[0] + nx * 0.35, a[1] + nz * 0.35)]
            for y0, y1 in WING_BANDS:
                prism(band, y0, y1, t)
            add_piece('%s-foyer-wing-s%02d' % (w['hall'], k), 'foyer-wing', 'granite', t, 'north-foyer-wings')
    # 3 west / east vertical walls with banding, and the straight north face between the wings
    for zi in range(len(Z_EDGES) - 1):
        t = []
        wall_panel('x', -56.0, Z_EDGES[zi], Z_EDGES[zi + 1], -1, t)
        add_piece('wall-west-%02d' % zi, 'wall', 'granite', t, 'podium-walls')
        a, b = (east_edge(Z_EDGES[zi]), Z_EDGES[zi]), (east_edge(Z_EDGES[zi + 1]), Z_EDGES[zi + 1])
        n = seg_normal(a, b)
        n = n if n[0] > 0 else (-n[0], -n[1])
        t = []
        wall_run(a, b, n, t)
        add_piece('wall-east-%02d' % zi, 'wall', 'granite', t, 'podium-walls')
    free = [(-56.95, wings[0]['chord'][0] - 0.2), (wings[0]['chord'][1] + 0.2, wings[1]['chord'][0] - 0.2),
            (wings[1]['chord'][1] + 0.2, east_edge(NORTH_EDGE))]
    for fi, (lo, hi) in enumerate(free):
        if hi - lo < 0.5:
            continue
        nseg = max(1, int(math.ceil((hi - lo) / 14.0)))
        for k in range(nseg):
            t = []
            wall_panel('z', NORTH_EDGE, lo + (hi - lo) * k / nseg, lo + (hi - lo) * (k + 1) / nseg, -1, t)
            add_piece('wall-north-%d-%d' % (fi, k), 'wall', 'granite', t, 'podium-walls')
    for zi in range(len(PLATFORM_Z) - 1):
        t = []
        wall_panel('x', -56.0, PLATFORM_Z[zi], PLATFORM_Z[zi + 1], -1, t)
        add_piece('wall-west-platform-%02d' % zi, 'wall', 'granite', t, 'podium-walls')
    t = []
    wall_panel('z', 91.5, -56.0 - 0.95, -16.0, 1, t)
    add_piece('wall-south-platform', 'wall', 'granite', t, 'podium-walls')
    # 4 monumental steps (south), deck 14.2 down to 2.2
    rise = (DECK - GROUND) / STAIR_RISERS
    tread = (STAIR_Z1 - STAIR_Z0) / STAIR_RISERS
    for i in range(STAIR_RISERS - 1):
        top = DECK - (i + 1) * rise
        z0, z1 = STAIR_Z0 + i * tread, STAIR_Z0 + (i + 1) * tread
        e0, e1 = east_edge(z0), east_edge(z1)
        for xi in range(len(STAIR_X) - 1):
            t = []
            x0 = STAIR_X[xi] + GAP
            if xi == len(STAIR_X) - 2:
                prism([(x0, z0), (e0 - GAP, z0), (e1 - GAP, z1), (x0, z1)], GROUND, top, t)
            else:
                box(x0, STAIR_X[xi + 1] - GAP, GROUND, top, z0, z1, t)
            add_piece('step-%02d-b%d' % (i, xi), 'step', 'granite', t, 'monumental-steps')
    t = []
    for i in range(STAIR_RISERS - 1):
        z0, z1 = STAIR_Z0 + i * tread, STAIR_Z0 + (i + 1) * tread
        e0, e1 = east_edge(z0), east_edge(z1)
        prism([(e0, z0), (e0 + 1.2, z0), (e1 + 1.2, z1), (e1, z1)], GROUND, DECK - (i + 1) * rise + 0.7, t)
    add_piece('stair-cheek-east', 'wall', 'granite', t, 'monumental-steps')
    t = []
    profile_x([(STAIR_Z0, GROUND), (STAIR_Z1, GROUND), (STAIR_Z1, DECK + 0.35), (STAIR_Z0, DECK + 0.35)], -16.6, -16.0, t)
    add_piece('stair-cheek-west', 'wall', 'granite', t, 'monumental-steps')
    return pieces, wings

# --------------------------------------------------------------------------- details (hall local, then world)

def side_panel(s, n, side):
    """Grid [row][t] from the southern shell's leading arch (t=0) to the northern
    neighbour's rear edge (t=1), bulged outward; returns (grid, t values)."""
    ts = [0.0, LOUVRE_JOINT / 2, LOUVRE_JOINT] + [LOUVRE_JOINT + (1 - LOUVRE_JOINT) * k / 10 for k in range(1, 11)]
    g2 = []
    for i in range(0, ROWS, 2):
        u = i / (ROWS - 1)
        a, na = s['sides'][side][i][COLS - 1]
        b, nb = n['sides'][side][i][0]
        a = sub(a, mul(na, 0.25))          # tuck the joint under the arch edge
        bd = norm(add(na, nb)) if length(add(na, nb)) > 1e-6 else na
        amp = min(2.4, PANEL_BULGE * length(sub(b, a))) * min(1.0, u / 0.15) * min(1.0, (1 - u) / 0.15)
        g2.append([add(lerp(a, b, t), mul(bd, amp * math.sin(math.pi * t))) for t in ts])
    return g2, ts


def build_details(local, wings):
    details = []

    def add_detail(name, material, tris, reveal, hall, **extra):
        fn = (lambda p: hall_to_world(hall, p)) if hall else building_to_world
        rec = {'name': name, 'material': material, 'reveal': reveal, 'vertices': flat(tris, fn)}
        rec.update(extra)
        details.append(rec)

    secondary = {b for _, b in BACK_PAIRS}
    for sid, sh in sorted(local.items()):
        hall, sides = sh['group'], sh['sides']
        # ridge cap (concrete)
        caps = []
        ridge = [(sides[1][ROWS - 1][j][0], norm(add(sides[0][ROWS - 1][j][1], sides[1][ROWS - 1][j][1]))) for j in range(COLS)]
        for j in range(0, COLS - 1, 2):
            beam(ridge[j][0], ridge[j + 2][0], 0.8, 0.32, ridge[j][1], caps, lift=0.02)
        add_detail('%s-ridge-cap' % sh['name'], 'concrete', caps, 0.84, hall, shellId=sid, approximation=False)
        if sid in secondary:
            continue                           # shares its pedestal footing with the back-to-back partner
        foot = []
        for side in (0, 1):
            P = sides[side][0][0][0]
            box(P[0] - 1.1, P[0] + 1.1, -0.05, 0.9, P[2] - 1.1, P[2] + 1.1, foot)
        add_detail('%s-pedestals' % sh['name'], 'concrete', foot, 0.82, hall, shellId=sid, approximation=True)

    for sid in sorted(GLAZED):
        sh = local[sid]
        hall, sides, A = sh['group'], sh['sides'], sh['A']
        direction = -1.0 if sh['opens'] == 'north' else 1.0
        glass, frame = [], []
        rows = list(range(0, ROWS, 4))
        tsteps = 8
        for side in (0, 1):
            arch = [sides[side][r][COLS - 1][0] for r in rows]
            base = [glass_foot(sh, side, r) for r in rows]
            g2 = [[lerp(arch[k], base[k], t / tsteps) for t in range(tsteps + 1)] for k in range(len(rows))]
            surface(g2, glass)
            hint = (0.0, 0.0, direction)
            for k in range(1, len(rows) - 1):
                beam(arch[k], base[k], 0.16, 0.4, hint, frame)
            for tt in (0.2, 0.4, 0.6, 0.8):
                line = [lerp(arch[k], base[k], tt) for k in range(len(rows))]
                for k in range(1, len(line) - 1):
                    beam(line[k], line[k + 1], 0.14, 0.3, (0.0, 1.0, 0.0), frame)
            for k in range(len(rows) - 1):     # bronze sill along the bowed foot
                beam(base[k], base[k + 1], 0.3, 0.35, (0.0, 1.0, 0.0), frame)
        beam(A, glass_foot(sh, 1, ROWS - 1), 0.3, 0.45, (0.0, 0.0, direction), frame)
        add_detail('%s-foyer-glass' % sh['name'], 'glass', glass, 0.9, hall, shellId=sid, approximation=True)
        add_detail('%s-foyer-mullions' % sh['name'], 'bronze', frame, 0.91, hall, shellId=sid, approximation=True)

    for south, north in INFILL_PAIRS:
        s, n = local[south], local[north]
        hall = s['group']
        for side, label in ((0, 'west'), (1, 'east')):
            g2, ts = side_panel(s, n, side)
            joint, tile = [], []
            surface([col[:3] for col in g2], joint)
            surface([col[2:] for col in g2], tile)
            key = s['name'].split('-')[-1] + '-' + n['name'].split('-')[-1]
            add_detail('%s-side-infill-%s-%s' % (hall, key, label), 'tile', tile, 0.86, hall,
                       shellId=south, neighbourShellId=north, approximation=True)
            add_detail('%s-louvre-joint-%s-%s' % (hall, key, label), 'bronze', joint, 0.87, hall,
                       shellId=south, neighbourShellId=north, approximation=True)

    for w in wings:
        win = []
        poly = w['poly']
        hub = ((w['chord'][0] + w['chord'][1]) / 2, NORTH_EDGE)
        for k in range(len(poly) - 1):
            a, b = poly[k], poly[k + 1]
            if abs(a[1] - NORTH_EDGE) < 1e-9 and abs(b[1] - NORTH_EDGE) < 1e-9:
                continue
            ex, ez = b[0] - a[0], b[1] - a[1]
            l = math.hypot(ex, ez)
            nx, nz = ez / l, -ex / l
            if (a[0] - hub[0]) * nx + (a[1] - hub[1]) * nz < 0:
                nx, nz = -nx, -nz
            strip = [a, b, (b[0] + nx * 0.08, b[1] + nz * 0.08), (a[0] + nx * 0.08, a[1] + nz * 0.08)]
            for y0, y1 in WING_WINDOWS:
                prism(strip, y0, y1, win)
        add_detail('%s-north-wing-windows' % w['hall'], 'glass', win, 0.82, None, shellId=w['shellId'], approximation=True)
    return details

# --------------------------------------------------------------------------- checks + JSON

def _shell_world(s):
    P, n = s['points'], ROWS * COLS
    return [[[(P[3 * ((side * ROWS + i) * COLS + j)], P[3 * ((side * ROWS + i) * COLS + j) + 1],
               P[3 * ((side * ROWS + i) * COLS + j) + 2]) for j in range(COLS)] for i in range(ROWS)] for side in (0, 1)]


def vertical_order(sa, sb, step=2, tol=0.05):
    """Sample shell a; for each XZ hit on shell b's triangles, record y_b - y_a."""
    ga, gb = _shell_world(sa), _shell_world(sb)
    bins = {}
    tris = []
    for side in (0, 1):
        g = gb[side]
        for i in range(ROWS - 1):
            for j in range(COLS - 1):
                for t in ((g[i][j], g[i + 1][j], g[i + 1][j + 1]), (g[i][j], g[i + 1][j + 1], g[i][j + 1])):
                    k = len(tris)
                    tris.append(t)
                    x0, x1 = min(p[0] for p in t), max(p[0] for p in t)
                    z0, z1 = min(p[2] for p in t), max(p[2] for p in t)
                    for bx in range(int(math.floor(x0 / 3)), int(math.floor(x1 / 3)) + 1):
                        for bz in range(int(math.floor(z0 / 3)), int(math.floor(z1 / 3)) + 1):
                            bins.setdefault((bx, bz), []).append(k)
    above, below = [], []
    for side in (0, 1):
        for i in range(1, ROWS, step):
            for j in range(0, COLS, step):
                p = ga[side][i][j]
                for k in bins.get((int(math.floor(p[0] / 3)), int(math.floor(p[2] / 3))), ()):
                    a, b, c = tris[k]
                    d = (b[0] - a[0]) * (c[2] - a[2]) - (c[0] - a[0]) * (b[2] - a[2])
                    if abs(d) < 1e-12:
                        continue
                    l1 = ((p[0] - a[0]) * (c[2] - a[2]) - (c[0] - a[0]) * (p[2] - a[2])) / d
                    l2 = ((b[0] - a[0]) * (p[2] - a[2]) - (p[0] - a[0]) * (b[2] - a[2])) / d
                    if l1 < -1e-9 or l2 < -1e-9 or l1 + l2 > 1 + 1e-9:
                        continue
                    dy = a[1] + l1 * (b[1] - a[1]) + l2 * (c[1] - a[1]) - p[1]
                    if dy > tol:
                        above.append(dy)
                    elif dy < -tol:
                        below.append(dy)
    return {'bAboveA': len(above), 'bBelowA': len(below),
            'maxAbove': round(max(above), 3) if above else 0.0, 'maxBelow': round(min(below), 3) if below else 0.0,
            'crossing': bool(above) and bool(below)}


def point_in_poly(x, z, poly):
    inside = False
    for k in range(len(poly)):
        (x1, z1), (x2, z2) = poly[k], poly[(k + 1) % len(poly)]
        if (z1 > z) != (z2 > z) and x < x1 + (z - z1) * (x2 - x1) / (z2 - z1):
            inside = not inside
    return inside


def seg_dist(x, z, a, b):
    ex, ez = b[0] - a[0], b[1] - a[1]
    t = max(0.0, min(1.0, ((x - a[0]) * ex + (z - a[1]) * ez) / (ex * ex + ez * ez)))
    return math.hypot(x - a[0] - ex * t, z - a[1] - ez * t)


def checks(shells, local, podium, details):
    report = {'shells': []}
    for s in shells:
        loc = local[s['id']]
        C = loc['C']
        worst = 0.0
        for side in (0, 1):
            c = mirror(C) if side == 0 else C
            for row in loc['sides'][side]:
                for p, _ in row:
                    worst = max(worst, abs(length(sub(p, c)) - RADIUS))
        ped_spread = max(length(sub(loc['sides'][1][0][j][0], loc['P'])) for j in range(COLS))
        ridge_x = max(abs(loc['sides'][1][ROWS - 1][j][0][0]) for j in range(COLS))
        report['shells'].append({'id': s['id'], 'name': s['name'], 'topY': s['topY'], 'height': s['height'],
                                 'sphereError': worst, 'pedestalSpread': ped_spread, 'ridgeMaxAbsX': ridge_x,
                                 'minRibHeightAboveDeck': s['minRibHeightAboveDeck'],
                                 'sphereCentreLocal': [round(x, 3) for x in C]})
    # back-to-back junctions: shared rear edge, and each shell wholly on one side of the other sphere
    report['backJunctions'] = []
    for a, b in BACK_PAIRS:
        la, lb = local[a], local[b]
        edge = max(length(sub(la['sides'][1][i][0][0], lb['sides'][1][i][0][0])) for i in range(ROWS))
        def side_range(x, y):
            vals = [length(sub(p, y['C'])) - RADIUS for row in x['sides'][1] for (p, _) in row[1:]]
            return round(min(vals), 4), round(max(vals), 4)
        report['backJunctions'].append({'pair': [a, b], 'sharedRearEdgeMaxGap': edge,
                                        'aVsSphereB': side_range(la, lb), 'bVsSphereA': side_range(lb, la)})
    # vertical ordering for every same-group shell pair
    report['verticalOrder'] = []
    for i, sa in enumerate(shells):
        for sb in shells[i + 1:]:
            if sa['group'] != sb['group']:
                continue
            r = vertical_order(sa, sb)
            if r['bAboveA'] or r['bBelowA']:
                r['pair'] = [sa['id'], sb['id']]
                report['verticalOrder'].append(r)
    report['crossingPairs'] = [r['pair'] for r in report['verticalOrder'] if r['crossing']]
    # side panels must stay outside the neighbour's sphere (never cut its roof)
    report['sidePanels'] = []
    for south, north in INFILL_PAIRS:
        n = local[north]
        for side in (0, 1):
            g2, ts = side_panel(local[south], n, side)
            C = mirror(n['C']) if side == 0 else n['C']
            vals = [length(sub(col[k], C)) - RADIUS for col in g2[1:-1] for k in range(3, len(ts) - 1)]
            report['sidePanels'].append({'pair': [south, north], 'side': side, 'minDistOutsideNeighbourSphere': round(min(vals), 3)})
    # pedestals physically supported by a deck-top podium triangle at y = 14.2
    tops = []
    for pc in podium:
        V = pc['vertices']
        for k in range(0, len(V), 9):
            ys = (V[k + 1], V[k + 4], V[k + 7])
            if all(abs(y - DECK) < 1e-3 for y in ys):
                tops.append(((V[k], V[k + 2]), (V[k + 3], V[k + 5]), (V[k + 6], V[k + 8])))
    unsupported = []
    for s in shells:
        for side in (0, 1):
            x, y, z = s['corners']['pedestal'][side]
            if not any(point_in_poly(x, z, list(t)) for t in tops):
                unsupported.append([s['id'], side, x, z])
    report['unsupportedPedestals'] = unsupported
    # shoreline: every podium/detail vertex inside the traced near-site polygon, with margin
    with open(SHORELINE_PATH) as f:
        shore = json.load(f)['points']
    worst = (1e9, None)
    for label, recs, key in (('podium', podium, 'vertices'), ('details', details, 'vertices')):
        for r in recs:
            V = r[key]
            for k in range(0, len(V), 3):
                x, z = V[k], V[k + 2]
                d = min(seg_dist(x, z, shore[i], shore[(i + 1) % len(shore)]) for i in range(len(shore)))
                d = d if point_in_poly(x, z, shore) else -d
                if d < worst[0]:
                    worst = (d, r.get('id', r.get('name')), [round(x, 2), round(z, 2)])
    for s in shells:
        V = s['points']
        for k in range(0, len(V), 3 * 7):
            x, z = V[k], V[k + 2]
            d = min(seg_dist(x, z, shore[i], shore[(i + 1) % len(shore)]) for i in range(len(shore)))
            d = d if point_in_poly(x, z, shore) else -d
            if d < worst[0]:
                worst = (d, s['name'], [round(x, 2), round(z, 2)])
    report['shorelineMinMargin'] = {'metres': round(worst[0], 2), 'part': worst[1], 'at': worst[2]}
    def pts(g):
        return [(s['points'][k], s['points'][k + 1], s['points'][k + 2]) for s in shells if s['group'] == g
                for k in range(0, len(s['points']), 9)]
    cp, op = pts('concert'), pts('opera')
    report['concertOperaMinDistance'] = round(min(length(sub(a, b)) for a in cp[::3] for b in op[::3]), 3)
    return report


def build_model():
    shells, local = build_shells()
    podium, wings = build_podium(local)
    details = build_details(local, wings)
    tri = lambda recs, key: sum(len(r[key]) // 9 for r in recs)
    shell_tris = len(shells) * 2 * (ROWS - 1) * (COLS - 1) * 2
    all_pts = [x for s in shells for x in s['points']] + [x for p in podium for x in p['vertices']] + \
              [x for d in details for x in d['vertices']]
    pos, dim, mn, mx = bounds(all_pts)
    model = {
        'version': 3,
        'authoring': 'Blender 5.2 via scripts/build-sydney-reference-model.py (analytic 75 m sphere shells; CMP 2017 sections + NSW aerial fit)',
        'units': 'metres',
        'frame': 'runtime: +X east, +Y up, +Z south; water 0; map datum origin (near-site-shoreline.json); building yaw -12 deg then offset [14.0, 8.2]',
        'worldOffset': list(WORLD_OFFSET),
        'radius': RADIUS, 'deck': DECK, 'ground': GROUND,
        'rows': ROWS, 'cols': COLS, 'shellThickness': SHELL_THICKNESS,
        'pointLayout': 'index(side,row,col)=((side*rows+row)*cols+col)*3; side0 negative (-x local), side1 positive; row u0 pedestal..u1 ridge; col v0 rear/valley..v1 leading arch',
        'heroShellId': 3,
        'bounds': {'min': [r4(x) for x in mn], 'max': [r4(x) for x in mx]},
        'counts': {'shells': len(shells), 'podium': len(podium), 'details': len(details),
                   'shellTriangles': shell_tris, 'podiumTriangles': tri(podium, 'vertices'),
                   'detailTriangles': tri(details, 'vertices')},
        'shells': shells, 'podium': podium, 'details': details,
    }
    model['counts']['totalTriangles'] = shell_tris + model['counts']['podiumTriangles'] + model['counts']['detailTriangles']
    return model, local


def write_json(model):
    os.makedirs(os.path.dirname(JSON_PATH), exist_ok=True)
    with open(JSON_PATH, 'w') as f:
        json.dump(model, f, separators=(',', ':'))
    return JSON_PATH

# --------------------------------------------------------------------------- Blender

def to_bl(x, y, z): return (x, -z, y)


def blender_build(model, engine, render):
    import bpy
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    col_model = bpy.data.collections.new('SOH_Model')
    col_aids = bpy.data.collections.new('SOH_RenderAids_not_exported')
    scene.collection.children.link(col_model)
    scene.collection.children.link(col_aids)

    def mat(name, rgb, rough, metal=0.0, alpha=1.0, emit=None):
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        b = m.node_tree.nodes.get('Principled BSDF')
        b.inputs['Base Color'].default_value = (*rgb, 1.0)
        b.inputs['Roughness'].default_value = rough
        b.inputs['Metallic'].default_value = metal
        if alpha < 1.0:
            b.inputs['Alpha'].default_value = alpha
        m.diffuse_color = (*rgb, alpha)
        return m

    mats = {
        'tile': mat('SOH_tile', (0.86, 0.84, 0.78), 0.32),
        'glass': mat('SOH_glass_topaz', (0.075, 0.045, 0.02), 0.06, 0.55),
        'bronze': mat('SOH_bronze', (0.16, 0.10, 0.05), 0.4, 0.9),
        'concrete': mat('SOH_concrete', (0.70, 0.68, 0.63), 0.7),
        'granite': mat('SOH_granite_pink', (0.66, 0.50, 0.43), 0.75),
    }

    def make_obj(name, verts, faces, material, coll, props=None, normals=None, smooth=False):
        me = bpy.data.meshes.new(name)
        me.from_pydata(verts, [], faces)
        me.validate(clean_customdata=False)
        me.update()
        if smooth:
            me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
        if normals is not None:
            me.normals_split_custom_set_from_vertices(normals)
        me.materials.append(mats[material])
        ob = bpy.data.objects.new(name, me)
        coll.objects.link(ob)
        for k, v in (props or {}).items():
            ob[k] = v
        return ob

    def tri_obj(name, flatv, material, coll, props):
        verts = [to_bl(flatv[k], flatv[k + 1], flatv[k + 2]) for k in range(0, len(flatv), 3)]
        faces = [(k, k + 1, k + 2) for k in range(0, len(verts), 3)]
        return make_obj(name, verts, faces, material, coll, props)

    shell_objs = []
    for s in model['shells']:
        P, N = s['points'], s['normals']
        verts = [to_bl(P[k], P[k + 1], P[k + 2]) for k in range(0, len(P), 3)]
        nrms = [to_bl(N[k], N[k + 1], N[k + 2]) for k in range(0, len(N), 3)]
        faces = []
        for side in (0, 1):
            base = side * ROWS * COLS
            for i in range(ROWS - 1):
                for j in range(COLS - 1):
                    a = base + i * COLS + j
                    b, c, d = a + COLS, a + COLS + 1, a + 1
                    # wind so the face normal agrees with the radial normal
                    pa, pb, pc = verts[a], verts[b], verts[c]
                    fn = cross(sub(pb, pa), sub(pc, pa))
                    if dot(fn, nrms[a]) + dot(fn, nrms[c]) < 0:
                        faces.append((a, d, c, b))
                    else:
                        faces.append((a, b, c, d))
        ob = make_obj('shell_%02d_%s' % (s['id'], s['name']), verts, faces, 'tile', col_model,
                      {'soh_kind': 'shell', 'soh_id': s['id'], 'soh_group': s['group'], 'soh_opens': s['opens']},
                      normals=nrms, smooth=True)
        mod = ob.modifiers.new('thickness_0p22_display', 'SOLIDIFY')
        mod.thickness = SHELL_THICKNESS
        mod.offset = -1.0
        mod.use_even_offset = True
        shell_objs.append(ob)
    for p in model['podium']:
        tri_obj('podium_%s' % p['id'], p['vertices'], p['material'], col_model,
                {'soh_kind': 'podium', 'soh_id': p['id'], 'soh_stage': p['stage'], 'soh_sequence': p['sequence']})
    for d in model['details']:
        ob = tri_obj('detail_%s' % d['name'], d['vertices'], d['material'], col_model,
                     {'soh_kind': 'detail', 'soh_reveal': d['reveal']})
        if d['material'] == 'tile':
            mod = ob.modifiers.new('thickness_0p22_display', 'SOLIDIFY')
            mod.thickness = SHELL_THICKNESS

    # ---- render aids (not exported): water, forecourt/broadwalk stand-in, light, cameras
    def aid_plane(name, x0, x1, z0, z1, y, rgb, rough=0.2):
        m = mat('AID_' + name, rgb, rough)
        verts = [to_bl(x0, y, z0), to_bl(x1, y, z0), to_bl(x1, y, z1), to_bl(x0, y, z1)]
        me = bpy.data.meshes.new(name)
        me.from_pydata(verts, [], [(0, 1, 2, 3)])
        me.materials.append(m)
        ob = bpy.data.objects.new(name, me)
        col_aids.objects.link(ob)
        return ob
    aid_plane('aid_water', -1500, 1500, -1500, 1500, 0.0, (0.03, 0.12, 0.16), 0.08)
    # neutral broadwalk/forecourt slab so the podium does not float over water in renders
    me = bpy.data.meshes.new('aid_broadwalk')
    with open(SHORELINE_PATH) as f:
        ring = [(q[0], 0.0, q[1]) for q in json.load(f)['points']]   # traced near-site shoreline (render aid)
    nr = len(ring)
    verts = [to_bl(p[0], 2.2, p[2]) for p in ring] + [to_bl(p[0], 0.0, p[2]) for p in ring]
    faces = [tuple(range(nr))] + [(k, (k + 1) % nr, nr + (k + 1) % nr, nr + k) for k in range(nr)]
    me.from_pydata(verts, [], faces)
    me.materials.append(mat('AID_broadwalk', (0.62, 0.58, 0.53), 0.8))
    ob = bpy.data.objects.new('aid_broadwalk', me)
    col_aids.objects.link(ob)

    world = bpy.data.worlds.new('SOH_daylight')
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get('Background')
    bg.inputs['Color'].default_value = (0.42, 0.60, 0.86, 1.0)
    bg.inputs['Strength'].default_value = 0.6
    sun_data = bpy.data.lights.new('SOH_sun', 'SUN')
    sun_data.energy = 4.2
    sun_data.angle = math.radians(1.5)
    sun = bpy.data.objects.new('SOH_sun', sun_data)
    col_aids.objects.link(sun)
    sun.rotation_euler = (math.radians(-48), 0, math.radians(35))  # afternoon sun from the NW (southern hemisphere)

    def camera(name, eye, target, lens=50, ortho=None):
        cd = bpy.data.cameras.new(name)
        cd.lens = lens
        cd.clip_end = 5000
        if ortho:
            cd.type = 'ORTHO'
            cd.ortho_scale = ortho
        cam = bpy.data.objects.new(name, cd)
        col_aids.objects.link(cam)
        eye = (eye[0] + WORLD_OFFSET[0], eye[1], eye[2] + WORLD_OFFSET[1])
        target = (target[0] + WORLD_OFFSET[0], target[1], target[2] + WORLD_OFFSET[1])
        e, t = to_bl(*eye), to_bl(*target)
        cam.location = e
        from mathutils import Vector
        cam.rotation_euler = (Vector(t) - Vector(e)).to_track_quat('-Z', 'Y').to_euler()
        return cam

    cams = {
        'aerialNW': camera('cam_aerialNW', (-300, 175, -150), (0, 22, 5), 55),
        'lowW': camera('cam_lowW', (-520, 12, -40), (0, 30, 0), 85),
        'north': camera('cam_north', (60, 40, -330), (0, 26, 0), 50),
        'top': camera('cam_top', (0, 600, 0.01), (0, 0, 0), 50, ortho=215),
        'south': camera('cam_south', (-20, 30, 330), (0, 28, 0), 45),
        'eastLow': camera('cam_eastLow', (420, 20, 60), (0, 28, 0), 70),
    }
    scene.camera = cams['aerialNW']

    os.makedirs(MODEL_DIR, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)

    # ---- GLB (model collection only; shells exported as authored single surfaces)
    bpy.ops.object.select_all(action='DESELECT')
    for ob in col_model.objects:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = shell_objs[0]
    bpy.ops.export_scene.gltf(filepath=GLB_PATH, export_format='GLB', use_selection=True,
                              export_apply=False, export_yup=True, export_extras=True,
                              export_materials='EXPORT', export_normals=True)

    if render:
        os.makedirs(RENDER_DIR, exist_ok=True)
        engines = {'eevee': ['BLENDER_EEVEE', 'BLENDER_EEVEE_NEXT'], 'workbench': ['BLENDER_WORKBENCH'],
                   'cycles': ['CYCLES']}[engine]
        for e in engines:
            try:
                scene.render.engine = e
                break
            except TypeError:
                continue
        if scene.render.engine == 'BLENDER_WORKBENCH':
            scene.display.shading.light = 'STUDIO'
            scene.display.shading.color_type = 'MATERIAL'
            scene.display.shading.show_shadows = True
            scene.display.shading.show_cavity = True
        elif scene.render.engine == 'CYCLES':
            scene.cycles.samples = 48
            scene.cycles.use_denoising = True
        else:
            try:
                scene.eevee.taa_render_samples = 48
                scene.eevee.use_shadows = True
            except AttributeError:
                pass
        scene.render.image_settings.file_format = 'PNG'
        for key, cam in cams.items():
            scene.camera = cam
            scene.render.resolution_x = 1400 if key != 'top' else 1100
            scene.render.resolution_y = 900 if key != 'top' else 1300
            scene.render.filepath = os.path.join(RENDER_DIR, '%s-%s.png' % (key, engine))
            bpy.ops.render.render(write_still=True)
        scene.camera = cams['aerialNW']
        bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)


def blender_verify(model):
    """Reopen the saved .blend and the GLB; compare with the JSON arrays."""
    import bpy
    out = {}
    bpy.ops.wm.open_mainfile(filepath=BLEND_PATH)
    worst = 0.0
    for s in model['shells']:
        ob = bpy.data.objects['shell_%02d_%s' % (s['id'], s['name'])]
        vs = ob.data.vertices
        P = s['points']
        assert len(vs) * 3 == len(P), s['name']
        for k, v in enumerate(vs):
            x, y, z = P[3 * k], P[3 * k + 1], P[3 * k + 2]
            worst = max(worst, abs(v.co.x - x), abs(v.co.y + z), abs(v.co.z - y))
    out['blendShellMaxAbsError'] = worst
    worst = 0.0
    for p in model['podium']:
        vs = bpy.data.objects['podium_%s' % p['id']].data.vertices
        V = p['vertices']
        assert len(vs) * 3 == len(V)
        for k, v in enumerate(vs):
            worst = max(worst, abs(v.co.x - V[3 * k]), abs(v.co.y + V[3 * k + 2]), abs(v.co.z - V[3 * k + 1]))
    out['blendPodiumMaxAbsError'] = worst
    worst = 0.0
    for d in model['details']:
        vs = bpy.data.objects['detail_%s' % d['name']].data.vertices
        V = d['vertices']
        assert len(vs) * 3 == len(V), d['name']
        for k, v in enumerate(vs):
            worst = max(worst, abs(v.co.x - V[3 * k]), abs(v.co.y + V[3 * k + 2]), abs(v.co.z - V[3 * k + 1]))
    out['blendDetailMaxAbsError'] = worst
    out['blendObjects'] = {k: sum(1 for o in bpy.data.collections['SOH_Model'].objects if o.get('soh_kind') == k)
                           for k in ('shell', 'podium', 'detail')}
    out['blendCameras'] = sorted(o.name for o in bpy.data.objects if o.type == 'CAMERA')
    out['blendMaterials'] = sorted(m.name for m in bpy.data.materials if m.name.startswith('SOH_'))
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=GLB_PATH)
    tris = 0
    worst = 0.0
    names = {'shell_%02d_%s' % (s['id'], s['name']): s for s in model['shells']}
    for ob in bpy.context.scene.objects:
        if ob.type != 'MESH':
            continue
        me = ob.data
        me.calc_loop_triangles()
        tris += len(me.loop_triangles)
        s = names.get(ob.name)
        if s:
            mw = ob.matrix_world
            ys = [(mw @ v.co).z for v in me.vertices]
            worst = max(worst, abs(max(ys) - s['topY']))
    out['glbTriangles'] = tris
    out['glbShellTopYMaxError'] = worst
    out['glbMeshObjects'] = sum(1 for o in bpy.context.scene.objects if o.type == 'MESH')
    return out


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    ap = argparse.ArgumentParser()
    ap.add_argument('--json-only', action='store_true')
    ap.add_argument('--verify', action='store_true')
    ap.add_argument('--no-render', action='store_true')
    ap.add_argument('--engine', default='eevee', choices=['eevee', 'workbench', 'cycles'])
    args = ap.parse_args(argv)
    model, local = build_model()
    os.makedirs(MODEL_DIR, exist_ok=True)
    if args.verify:
        res = blender_verify(model)
        with open(os.path.join(MODEL_DIR, 'verify.json'), 'w') as f:
            json.dump(res, f, indent=2)
        print('VERIFY', json.dumps(res))
        return
    path = write_json(model)
    rep = checks(model['shells'], local, model['podium'], model['details'])
    rep['counts'] = model['counts']
    rep['bounds'] = model['bounds']
    with open(os.path.join(MODEL_DIR, 'build-report.json'), 'w') as f:
        json.dump(rep, f, indent=2)
    print('JSON', path, json.dumps(model['counts']))
    print('BOUNDS', model['bounds'])
    for s in rep['shells']:
        print('SHELL', json.dumps(s))
    for k in ('backJunctions', 'crossingPairs', 'sidePanels', 'unsupportedPedestals', 'shorelineMinMargin', 'concertOperaMinDistance'):
        print('CHECK', k, json.dumps(rep[k]))
    for r in rep['verticalOrder']:
        print('ORDER', json.dumps(r))
    if args.json_only:
        return
    blender_build(model, args.engine, not args.no_render)
    print('SAVED', BLEND_PATH, GLB_PATH)


if __name__ == '__main__':
    main()
