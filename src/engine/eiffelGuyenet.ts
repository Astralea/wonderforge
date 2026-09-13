import description from '../data/eiffelGuyenet.json';
import type { RigidVec3 } from './eiffelRigid';
export const EIFFEL_GUYENET = description;
export type EiffelGuyenetDescription = typeof description;
const clamp = (t: number) => Math.max(0, Math.min(1, t));
const ease = (t: number) => { const p = clamp(t); return p*p*(3-2*p); };
/** One unloaded, supported screw-climbing stroke. All distances run along the guides. */
export function sampleEiffelGuyenetClimb(rawT: number, config: EiffelGuyenetDescription = description) {
  const t = clamp(rawT), h = config.historical, m = config.model;
  let carriage = 0, head = m.headRest, safetyBase = m.safetyBase;
  let carriageBolted = true, headBolted = true, safetyBaseBolted = true, safetyHeadBolted = false;
  let phase: 'raise-head' | 'raise-carriage' | 'reset-safety' | 'bolted' = 'bolted';
  if (t < .18) {
    phase = 'raise-head'; head += h.climbStroke * ease(t/.18); headBolted = false;
  } else if (t < .98) {
    head += h.climbStroke;
    const cycle = (t-.18)/.16, step = Math.min(4, Math.floor(cycle)), p = cycle-step;
    carriage = step*h.safetyStroke; safetyBase += carriage;
    if (p < .65) {
      phase = 'raise-carriage'; carriage += h.safetyStroke*ease(p/.65); carriageBolted = false;
    } else {
      phase = 'reset-safety'; carriage += h.safetyStroke;
      safetyBase += h.safetyStroke*ease((p-.65)/.35);
      safetyBaseBolted = false; safetyHeadBolted = true;
    }
  } else { carriage=h.climbStroke; head+=h.climbStroke; safetyBase+=h.climbStroke; }
  const safetyHead = m.safetyHead+carriage;
  return {phase,carriage,head,safetyBase,safetyHead,carriageBolted,headBolted,safetyBaseBolted,safetyHeadBolted,
    safetyExtension:safetyHead-safetyBase-(m.safetyHead-m.safetyBase)};
}
export function eiffelGuyenetGuidePoint(s: number, config: EiffelGuyenetDescription = description): RigidVec3 {
  const angle=config.model.railTiltDegrees*Math.PI/180;
  return [0,s*Math.cos(angle),s*Math.sin(angle)];
}
/** Two fixed ties meet a sliding collar; no mast/jib/tie changes length. */
export function sampleEiffelGuyenetLuff(reach: number, config: EiffelGuyenetDescription = description) {
  const {historical:h,model:m}=config;
  if (!Number.isFinite(reach) || reach<h.minReach || reach>h.maxReach) throw new Error('Guyenet reach outside documented5.5–12m range');
  const rise=Math.sqrt(m.boomLength*m.boomLength-reach*reach);
  const slider=rise-Math.sqrt(m.tieLength*m.tieLength-reach*reach);
  return {reach,rise,slider,angle:Math.asin(reach/m.boomLength),tieAngle:Math.asin(reach/m.tieLength)};
}

/** Moving station origin on the outside face of the guide lattice. */
export function eiffelGuyenetStationPoint(s: number, config: EiffelGuyenetDescription = description): RigidVec3 {
 const p=eiffelGuyenetGuidePoint(s,config);return [p[0],p[1],p[2]+config.model.railFaceOffsetZ];
}
