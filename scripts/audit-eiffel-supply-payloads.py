"""Optimistic size screen only: the current solid cargo proxy has no loadable interior."""
import hashlib
import itertools
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENVELOPE = (.58, 1.78, .58)


def screen(part):
    sizes = tuple(hi - lo for lo, hi in zip(part['localBounds']['min'], part['localBounds']['max']))
    if not all(math.isfinite(x) and x > 0 for x in sizes):
        raise ValueError(f"Invalid bounds: {part['id']}")
    assignments = [list(order) for order in itertools.permutations(range(3))
                   if all(sizes[axis] <= limit + 1e-7 for axis, limit in zip(order, ENVELOPE))]
    # A box has real edges of these lengths. A curved object's bounding-box
    # edges need not belong to the object, so cannot support this rejection.
    impossible = part['shape'] == 'box' and max(sizes) > math.dist((0, 0, 0), ENVELOPE) + 1e-7
    return dict(id=part['id'], group=part['group'], stage=part['stage'], shape=part['shape'],
                lowestInstalledY=part['boundsMin'][1], size=sizes,
                axisAssignments=assignments, axisAlignedEnvelopeFit=bool(assignments),
                provenTooLongAtAnyRotation=impossible, productionAdmitted=False)


def main():
    source = ROOT / 'public/models/eiffel-construction-kit/tower-kit.manifest.json'
    raw = source.read_bytes()
    manifest = json.loads(raw)
    parts = [screen(p) for p in manifest['parts'] if p['material'] != 'masonry']
    cohorts = []
    for floor in (0, 57.94, 116.14, 197):
        cohort = [p for p in parts if p['lowestInstalledY'] >= floor]
        cohorts.append(dict(minimumInstalledY=floor, total=len(cohort),
                            axisAlignedEnvelopeFits=sum(p['axisAlignedEnvelopeFit'] for p in cohort),
                            provenTooLongAtAnyRotation=sum(p['provenTooLongAtAnyRotation'] for p in cohort)))
    upper = [p for p in parts if p['lowestInstalledY'] >= 197]
    representatives = {group: max((p for p in upper if p['group'] == group), key=lambda p: max(p['size']))['id']
                       for group in ('shaft', 'platform', 'lantern')}
    representatives['widestPanel'] = max((p for p in upper if p['shape'] == 'box'), key=lambda p: sorted(p['size'])[1])['id']
    report = dict(manifest=str(source.relative_to(ROOT)), sha256=hashlib.sha256(raw).hexdigest(),
                  envelope=ENVELOPE, envelopeMeaning='Exterior of solid proxy, not usable packing space',
                  productionAdmitted=False, cohorts=cohorts, representatives=representatives,
                  remainingGates=['real carrier and restraint', 'drive and braking', 'supported swept routes',
                                  'equipment erection', 'unloading and onward delivery', 'actual final member installation'],
                  parts=parts)
    out = ROOT / 'artifacts/eiffel-payload-admission-2026-09-08'
    out.mkdir(exist_ok=True)
    (out / 'inventory.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({k: v for k, v in report.items() if k != 'parts'}, indent=2))


if __name__ == '__main__':
    main()
