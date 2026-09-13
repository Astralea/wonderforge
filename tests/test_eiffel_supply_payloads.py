import importlib.util
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('payload_audit', ROOT / 'scripts/audit-eiffel-supply-payloads.py')
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)


def part(size, shape='box'):
    return dict(id='fixture', group='shaft', stage=45, shape=shape,
                boundsMin=[0, 197, 0], localBounds=dict(min=[0, 0, 0], max=size))


class PayloadSizeEvidence(unittest.TestCase):
    def test_long_axis_can_be_vertical_without_scaling(self):
        result = audit.screen(part([.1, .1, 1.7]))
        self.assertTrue(result['axisAlignedEnvelopeFit'])
        self.assertTrue(all(order[1] == 2 for order in result['axisAssignments']))
        self.assertFalse(result['productionAdmitted'])

    def test_axis_failure_is_not_an_all_orientation_proof(self):
        result = audit.screen(part([.01, .01, 1.9]))
        self.assertFalse(result['axisAlignedEnvelopeFit'])
        self.assertFalse(result['provenTooLongAtAnyRotation'])

    def test_only_actual_box_edges_support_impossibility_claim(self):
        self.assertTrue(audit.screen(part([.1, .1, 6]))['provenTooLongAtAnyRotation'])
        self.assertFalse(audit.screen(part([.1, .1, 6], 'cupola-gore'))['provenTooLongAtAnyRotation'])

    def test_real_upper_shaft_and_gallery_need_new_carriers(self):
        manifest = json.loads((ROOT / 'public/models/eiffel-construction-kit/tower-kit.manifest.json').read_text())
        parts = {p['id']: p for p in manifest['parts']}
        for name in ('shaft-13-m005-c000', 'summit-gallery-0-0-m006-c000'):
            result = audit.screen(parts[name])
            self.assertFalse(result['axisAlignedEnvelopeFit'])
            self.assertTrue(result['provenTooLongAtAnyRotation'])
        report = json.loads((ROOT / 'artifacts/eiffel-payload-admission-2026-09-08/inventory.json').read_text())
        self.assertEqual(len(report['parts']), len([p for p in manifest['parts'] if p['material'] != 'masonry']))
        self.assertEqual(len({p['id'] for p in report['parts']}), len(report['parts']))
        self.assertTrue(all(not p['productionAdmitted'] for p in report['parts']))


if __name__ == '__main__':
    unittest.main()
