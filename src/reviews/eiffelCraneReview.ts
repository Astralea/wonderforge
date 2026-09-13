import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EiffelGuyenetRig } from '../render/three/EiffelGuyenetRig';
import { EIFFEL_GUYENET as D } from '../engine/eiffelGuyenet';
import './eiffelCraneReview.css';

const main=document.querySelector<HTMLElement>('#review')!;
main.innerHTML=`<div class="viewport" aria-label="Interactive model of the 1889 Eiffel climbing crane"></div>
<header><a href="/#/wonder/eiffel-tower">← Eiffel Tower</a><p>BLENDER MODEL · MECHANISM STUDY</p><h1>The crane that climbed.</h1><p>A reconstruction of the Guyenet crane described in 1889.</p></header>
<section class="controls"><div class="modes" role="group" aria-label="Mechanism"><button data-mode="lift" aria-pressed="true">Hoist</button><button data-mode="luff" aria-pressed="false">Jib reach</button><button data-mode="climb" aria-pressed="false">Climb guides</button></div><p id="phase" role="status">Loading Blender model…</p><div class="scrub"><button id="play" aria-label="Play mechanism">Play</button><input id="progress" aria-label="Mechanism progress" type="range" min="0" max="1" step="0.001" value="0.5"></div><p id="detail"></p><small>Component study; the tower movie still uses the previous rig. Unlabelled proportions are interpreted from the drawing. Drag to orbit.</small><a href="https://cnum.cnam.fr/pgi/fpage.php?4XAE43.1/79/100/265/5/265=" target="_blank" rel="noreferrer">View the 1889 drawing ↗</a></section>`;
const viewport=main.querySelector<HTMLDivElement>('.viewport')!;
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
viewport.append(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#b8c6ca');scene.fog=new THREE.Fog('#b8c6ca',65,130);
const camera=new THREE.PerspectiveCamera(38,1,.1,180);camera.position.set(30,23,31);
const orbit=new OrbitControls(camera,renderer.domElement);orbit.target.set(2,10,1);orbit.minDistance=15;orbit.maxDistance=80;orbit.maxPolarAngle=Math.PI*.48;
scene.add(new THREE.HemisphereLight('#deebef','#70634d',2.3));
const sun=new THREE.DirectionalLight('#fff1d3',3.1);sun.position.set(16,30,22);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-25,right:25,top:25,bottom:-25,near:1,far:85});sun.shadow.normalBias=.035;scene.add(sun);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#a99c82',roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.02;ground.receiveShadow=true;scene.add(ground);
const iron=new THREE.MeshStandardMaterial({color:'#454a44',roughness:.72,metalness:.3});
const wood=new THREE.MeshStandardMaterial({color:'#745b3a',roughness:.9});
const workingZ=D.model.platformOffsetZ+D.model.railFaceOffsetZ;
const cargo=new THREE.Group();
function box(parent:THREE.Object3D,size:[number,number,number],p:[number,number,number],material:THREE.Material){const o=new THREE.Mesh(new THREE.BoxGeometry(...size),material);o.position.set(...p);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
// 4.6m open I-section; 25mm flanges and 16mm web, about 825 kg at7800kg/m³.
box(cargo,[.3,.025,4.6],[0,.2625,0],iron);box(cargo,[.3,.025,4.6],[0,-.2625,0],iron);box(cargo,[.016,.5,4.6],[0,0,0],iron);scene.add(cargo);
const staging=new THREE.Group();scene.add(staging);
for(const z of [workingZ-1.5,workingZ+1.5])box(staging,[1.2,.3,.5],[8.5,.15,z],wood);
const cableMaterial=new THREE.MeshStandardMaterial({color:'#39372c',roughness:1});
const cables=Array.from({length:5},()=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,1,6),cableMaterial);scene.add(o);return o;});
const hook=new THREE.Mesh(new THREE.BoxGeometry(.23,.32,.22),iron);scene.add(hook);
const up=new THREE.Vector3(0,1,0),tmp=new THREE.Vector3();
function cable(o:THREE.Mesh,a:THREE.Vector3,b:THREE.Vector3){o.position.copy(a).add(b).multiplyScalar(.5);tmp.copy(b).sub(a);o.scale.set(1,tmp.length(),1);o.quaternion.setFromUnitVectors(up,tmp.normalize());}
let rig:EiffelGuyenetRig|undefined,mode='lift',progress=.5,playing=false,last=performance.now();
const phase=main.querySelector<HTMLElement>('#phase')!,detail=main.querySelector<HTMLElement>('#detail')!,slider=main.querySelector<HTMLInputElement>('#progress')!,play=main.querySelector<HTMLButtonElement>('#play')!;
const ease=(t:number)=>{const p=Math.max(0,Math.min(1,t));return p*p*(3-2*p);};
function draw(){
 if(!rig)return;
 const reach=mode==='luff'?5.5+6.5*progress:mode==='climb'?5.5:8.5;
 const c=rig.update(mode==='climb'?progress:0,reach,mode==='climb'?0:Math.PI/2);
 const tip=rig.tip();
 const travel=progress<.5?ease(progress*2):1-ease((progress-.5)*2);
 const loadY=.575+8*travel;
 cargo.position.set(8.5,loadY,workingZ);
 cargo.visible=mode==='lift';staging.visible=mode==='lift';
 const hookPosition=tip.clone();hookPosition.y=mode==='lift'?loadY+1.6:tip.y-1.1;hook.position.copy(hookPosition);rig.setHoistLength(tip.y-hookPosition.y);
 cable(cables[0],tip,hookPosition);
 for(let i=1;i<5;i++){
  cables[i].visible=mode==='lift';const side=i<3?-1:1,z=i%2?-1.5:1.5;
  cable(cables[i],hookPosition,new THREE.Vector3(8.5+side*.15,loadY+.275,workingZ+z));
 }
 phase.textContent=mode==='climb'?({'raise-head':'Raise and fasten the upper anchor','raise-carriage':'Draw the carriage up the guides','reset-safety':'Reset the safety jacks','bolted':'Carriage fastened at the new station'}[c.phase]):mode==='luff'?`Working reach · ${reach.toFixed(1)} m`:travel<.002?'Load resting on timber bearers':progress<.5?'Hoist the iron section':'Lower the section onto its bearers';
 detail.textContent=mode==='climb'?`${c.carriage.toFixed(2)} / 2.50 m climbed · safety stroke ${(c.safetyExtension*100).toFixed(0)} / 50 cm`:mode==='luff'?'Fixed-length jib and ties · the collar changes the working reach':'4.6 m open iron section · estimated 825 kg · 4,000 kg documented crane capacity';
 orbit.update();renderer.render(scene,camera);
}
function resize(){const w=viewport.clientWidth,h=viewport.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();if(w<650){camera.position.set(30,22,33);orbit.target.set(4.5,10,1);}draw();}
window.addEventListener('resize',resize);orbit.addEventListener('change',()=>{if(rig)renderer.render(scene,camera);});
slider.addEventListener('input',()=>{progress=Number(slider.value);playing=false;play.textContent='Play';play.setAttribute('aria-label','Play mechanism');draw();});
for(const button of main.querySelectorAll<HTMLButtonElement>('[data-mode]'))button.addEventListener('click',()=>{mode=button.dataset.mode!;progress=0;slider.value='0';for(const b of main.querySelectorAll('[data-mode]'))b.setAttribute('aria-pressed',String(b===button));draw();});
play.addEventListener('click',()=>{playing=!playing;if(playing&&progress>=1)progress=0;play.textContent=playing?'Pause':'Play';play.setAttribute('aria-label',playing?'Pause mechanism':'Play mechanism');});
function frame(now:number){const dt=Math.min((now-last)/1000,.1);last=now;if(playing&&rig){progress=Math.min(1,progress+dt/(mode==='climb'?24:14));slider.value=String(progress);if(progress>=1){playing=false;play.textContent='Play';play.setAttribute('aria-label','Play mechanism');}draw();}requestAnimationFrame(frame);}requestAnimationFrame(frame);
new GLTFLoader().load('/models/eiffel-guyenet/crane.glb',gltf=>{rig=new EiffelGuyenetRig(gltf.scene);rig.group.position.y=6.2;scene.add(rig.group);resize();document.body.dataset.ready='true';},undefined,error=>{phase.textContent='The crane model could not be loaded.';console.error(error);});
resize();
function framing(){
 const max={x:0,y:0};if(!rig)return max;
 for(const group of [rig.group,...(mode==='lift'?[cargo]:[])])group.traverse(o=>{if(o instanceof THREE.Mesh){const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){const p=new THREE.Vector3(a.getX(i),a.getY(i),a.getZ(i)).applyMatrix4(o.matrixWorld).project(camera);max.x=Math.max(max.x,Math.abs(p.x));max.y=Math.max(max.y,Math.abs(p.y));}}});return max;
}
// Review automation reads the same real matrices used for the visible frame.
Object.assign(window,{__GUYENET_REVIEW__:{setState:(m:string,t:number)=>{if(!['lift','luff','climb'].includes(m))throw Error('Unknown mode');mode=m;progress=t;slider.value=String(t);playing=false;for(const b of main.querySelectorAll<HTMLButtonElement>('[data-mode]'))b.setAttribute('aria-pressed',String(b.dataset.mode===m));draw();},snapshot:()=>({mode,progress,framing:framing(),tip:rig?.tip().toArray(),carriage:rig?.node('carriage').getWorldPosition(new THREE.Vector3()).toArray(),triangles:renderer.info.render.triangles,calls:renderer.info.render.calls,roles:rig?[...rig.roles.keys()]:[]})}});
