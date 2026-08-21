// Which placement batch has fewer allocated matrix floats than count*16?
import { InstancedMesh } from 'three';
import { GIZA_CONSTRUCTION } from '../src/data/gizaConstruction';
import { GizaEnvironment } from '../src/render/three/Environment';
import { createMaterialLibrary } from '../src/render/three/MaterialLibrary';
import type { Wonder } from '../src/data/types';

const wonder = {
  id: 'probe', name: 'p', location: 'l', region: 'r', era: 'ancient',
  completedYear: 1, endsAtNight: false, quote: { text: 'q', author: 'a' },
  description: 'd', facts: [], palette: { ground: '#000', primary: '#000', accent: '#000', sky: '#000' },
  structure: { stages: [] },
} as unknown as Wonder;

const environment = new GizaEnvironment(GIZA_CONSTRUCTION, createMaterialLibrary(wonder));
environment.group.traverse((child) => {
  if (child instanceof InstancedMesh && child.name) {
    const allocated = child.instanceMatrix.array.length / 16;
    if (child.count > allocated || child.count !== Math.floor(child.count)) {
      console.log(`BAD ${child.name}: count=${child.count} allocated=${allocated}`);
    }
  }
});
console.log('scan done');
environment.dispose();
