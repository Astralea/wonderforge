import type {RigidVec3 as V} from './eiffelRigid';
export const EIFFEL_DIAGONAL_LENGTH=Math.hypot(6.5,2.2);
const L=EIFFEL_DIAGONAL_LENGTH,guideU=L+2.8,drumU=L+3.6,guideY=121.35,drumY=117.05;
export const eiffelDiagonalWorld=([u,y,v]:V):V=>[-8.5-6.5/L*u-2.2/L*v,y,-4+2.2/L*u-6.5/L*v];
/** Continuous rope over one fixed and one travelling sheave; geometry only. */
export function eiffelDiagonalRigAt(cargoU:number,cargoY:number,referenceY=59.18000244140625){
 if(![cargoU,cargoY,referenceY].every(Number.isFinite)||cargoU<0||cargoU>L||cargoY+1.45>=guideY)throw Error('Invalid diagonal rig pose');
 const trolleyU=cargoU+.25,hookY=cargoY+1.45;
 const du=guideU-drumU,dy=guideY-drumY,D=Math.hypot(du,dy),ratio=.05/D,side=Math.sqrt(1-ratio*ratio);
 const nu=ratio*du/D+side*dy/D,ny=ratio*dy/D-side*du/D,angle=Math.atan2(ny,nu);
 const rope:V[]=[[drumU+.3*nu,drumY+.3*ny,0]];
 for(let i=0;i<=24;i++){const a=angle+(Math.PI/2-angle)*i/24;rope.push([guideU+.25*Math.cos(a),guideY+.25*Math.sin(a),0]);}
 for(let i=0;i<=24;i++){const a=Math.PI/2+Math.PI/2*i/24;rope.push([trolleyU+.25*Math.cos(a),guideY+.25*Math.sin(a),0]);}
 rope.push([cargoU,hookY,0]);
 const constant=Math.sqrt(D*D-.05*.05)+.25*(Math.PI-angle),deployedLength=constant+guideU-trolleyU+guideY-hookY;
 const referenceLength=constant+guideU-.25+guideY-(referenceY+1.45),travel=deployedLength-referenceLength;
 return{cargo:eiffelDiagonalWorld([cargoU,cargoY,0]),hook:eiffelDiagonalWorld([cargoU,hookY,0]),trolley:eiffelDiagonalWorld([trolleyU,121.495,0]),rope:rope.map(eiffelDiagonalWorld),deployedLength,drumAngle:travel/.3,fixedSheaveAngle:travel/.25,movingSheaveAngle:-(cargoY-referenceY)/.25,wheelAngle:-cargoU/.115,productionReady:false as const};
}
