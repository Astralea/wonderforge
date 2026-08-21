// Numeric probe for the Tier 4 fleet motion: does the fleet actually cross
// the camera-near reach during the movie, and how do wakes read in numbers?
import {
  GIZA_ENVIRONMENT,
  riverCraftStateAt,
} from '../src/data/gizaEnvironment';

let globalIndex = 0;
for (const craft of GIZA_ENVIRONMENT.riverCraft) {
  for (let unit = 0; unit < craft.count; unit += 1) {
    const idx = globalIndex;
    let minX = Infinity;
    let maxX = -Infinity;
    let minSpeed = Infinity;
    let maxSpeed = -Infinity;
    let maxRoll = 0;
    let maxPitch = 0;
    let bobMin = Infinity;
    let bobMax = -Infinity;
    let oarMin = Infinity;
    let oarMax = -Infinity;
    for (let i = 0; i <= 200; i += 1) {
      const t = i / 200;
      const s = riverCraftStateAt(craft, idx, t);
      minX = Math.min(minX, s.x);
      maxX = Math.max(maxX, s.x);
      minSpeed = Math.min(minSpeed, s.groundSpeed);
      maxSpeed = Math.max(maxSpeed, s.groundSpeed);
      maxRoll = Math.max(maxRoll, Math.abs(s.roll));
      maxPitch = Math.max(maxPitch, Math.abs(s.pitch));
      bobMin = Math.min(bobMin, s.bobY);
      bobMax = Math.max(bobMax, s.bobY);
      oarMin = Math.min(oarMin, s.oarSweep);
      oarMax = Math.max(oarMax, s.oarSweep);
    }
    console.log(
      `${craft.id}#${unit} idx=${idx}: x∈[${minX.toFixed(1)}, ${maxX.toFixed(1)}] ` +
        `speed∈[${minSpeed.toFixed(1)}, ${maxSpeed.toFixed(1)}] u/movie ` +
        `|roll|≤${maxRoll.toFixed(3)} |pitch|≤${maxPitch.toFixed(3)} ` +
        `bob∈[${bobMin.toFixed(3)}, ${bobMax.toFixed(3)}] oar∈[${oarMin.toFixed(2)}, ${oarMax.toFixed(2)}]`,
    );
    globalIndex += 1;
  }
}

// Camera-near crossings: how many hull-minutes does the fleet spend in
// x ∈ [-40, 40] (the reach the reveal camera looks across)?
let hullSamples = 0;
let nearSamples = 0;
globalIndex = 0;
for (const craft of GIZA_ENVIRONMENT.riverCraft) {
  for (let unit = 0; unit < craft.count; unit += 1) {
    if (craft.kind === 'reed-skiff') { globalIndex += 1; continue; }
    for (let i = 0; i <= 400; i += 1) {
      const s = riverCraftStateAt(craft, globalIndex, i / 400);
      hullSamples += 1;
      if (s.x >= -40 && s.x <= 40) nearSamples += 1;
    }
    globalIndex += 1;
  }
}
console.log(
  `camera-near presence: ${((nearSamples / hullSamples) * 100).toFixed(1)}% of moving-hull samples in x∈[-40,40]`,
);
