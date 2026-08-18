import { Matrix4 } from 'three';
import { GIZA_CONSTRUCTION } from '../src/data/gizaConstruction.ts';
import { GizaEnvironment } from '../src/render/three/Environment.ts';
import { createMaterialLibrary } from '../src/render/three/MaterialLibrary.ts';

const wonder = { id:'w', name:'w', location:'l', region:'r', era:'ancient', completedYear:1, endsAtNight:false,
  quote:{text:'q',author:'a'}, description:'d', facts:['a','b','c'],
  palette:{ground:'#7a6a55',primary:'#c9b18a',accent:'#8a6f4d',sky:'#87b5d6'},
  structure:{stages:[{name:'s',parts:[]}] } };
const env = new GizaEnvironment(GIZA_CONSTRUCTION, createMaterialLibrary(wonder));
const byName = (n) => { let m=null; env.group.traverse(c=>{ if(c.name===n) m=c; }); return m; };
const show = (name) => {
  const mesh = byName(name);
  const m = new Matrix4();
  for (let i=0;i<mesh.count;i+=1) {
    mesh.getMatrixAt(i,m);
    const e=m.elements;
    const sy=Math.hypot(e[4],e[5],e[6]);
    console.log(name, i, 'pos', e[12].toFixed(2), e[13].toFixed(2), e[14].toFixed(2), 'yScale', sy.toFixed(2));
  }
};
show('nile-papyrus-skiff-hulls');
show('nile-skiff-reed-bundle-cargo');
show('nile-quarter-steering-oars');
show('nile-bipod-mast-legs');
env.dispose();
