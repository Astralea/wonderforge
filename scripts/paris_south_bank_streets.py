"""One terrain surface per near-city street or footway, including junctions.

Rectangle footprints preserve the former strips exactly. A shared boundary grid
removes positive-area self-overlap and ensures adjacent faces share vertices.
Executed by the parent Blender builder, after strip() is available.
"""
south_bank_streets = []

def near_street(x1, z1, x2, z2, width, key):
    if x1 == x2:
        bounds = [x1-width/2, min(z1,z2), x1+width/2, max(z1,z2)]
    elif z1 == z2:
        bounds = [min(x1,x2), z1-width/2, max(x1,x2), z1+width/2]
    else:
        raise ValueError('Near street reservations must remain axis aligned')
    south_bank_streets.append({'material': key, 'bounds': bounds})

for side in (-1, 1):
    for col in range(5):
        x = side*(190+104*col)
        near_street(x,-24,x,520,14,'road')
        for offset in (-8.5,8.5):
            for row in range(5):
                near_street(x+offset,-5+104*row,x+offset,85+104*row,3,'paving')
    for row in range(6):
        z = -12+104*row
        near_street(side*178,z,side*618,z,14,'road')
        for offset in (-8.5,8.5):
            for col in range(4):
                near_street(side*(197+104*col),z+offset,side*(287+104*col),z+offset,3,'paving')

def near_axis(axis):
    boundaries = sorted({r['bounds'][i] for r in south_bank_streets for i in (axis,axis+2)})
    values = set(boundaries)
    for a,b in zip(boundaries,boundaries[1:]):
        count = math.ceil((b-a)/8)
        values.update(a+(b-a)*i/count for i in range(1,count))
    return sorted(values)

south_bank_surface_pieces = []
xx,zz = near_axis(0),near_axis(1)
for key,lift in (('road',.08),('paving',.24)):
    reservations = [r['bounds'] for r in south_bank_streets if r['material']==key]
    for x1,x2 in zip(xx,xx[1:]):
        mx = (x1+x2)/2
        for z1,z2 in zip(zz,zz[1:]):
            mz = (z1+z2)/2
            if not any(a<mx<c and b<mz<d for a,b,c,d in reservations):
                continue
            points = [(x1,z1),(x2,z1),(x2,z2),(x1,z2)]
            static.poly(key,[(x,terrain(x,z)+lift,z) for x,z in points],[(3,2,1,0)])
            south_bank_surface_pieces.append({'material':key,'bounds':[x1,z1,x2,z2]})
