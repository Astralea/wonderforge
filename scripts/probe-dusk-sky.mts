// Where does the reveal camera look, and where is the sun then?
// gizaSunStateAt returns DEGREES (see gizaSky.ts); shot azimuth is radians.
import { gizaCinematicShotAt } from '../src/engine/gizaCamera';
import { gizaSunStateAt, sampleGizaSky, GIZA_SKY } from '../src/data/gizaSky';

for (const t of [0.12, 0.62, 0.9, 1.0]) {
  const shot = gizaCinematicShotAt(t, 16 / 9);
  const sun = gizaSunStateAt(t);
  const sky = sampleGizaSky(t);
  const horizontal = Math.cos(shot.pitch) * shot.radius;
  const camX = shot.target[0] + Math.cos(shot.azimuth) * horizontal;
  const camZ = shot.target[2] + Math.sin(shot.azimuth) * horizontal;
  const viewAzDeg = (Math.atan2(shot.target[2] - camZ, shot.target[0] - camX) * 180) / Math.PI;
  let diff = Math.abs(sun.azimuth - viewAzDeg) % 360;
  if (diff > 180) diff = 360 - diff;
  console.log(
    `t=${t}: sun az ${sun.azimuth.toFixed(1)}° el ${sun.elevation.toFixed(1)}° | ` +
      `camera looks ${viewAzDeg.toFixed(0)}° (pitch ${(shot.pitch * 180 / Math.PI).toFixed(0)}°) | ` +
      `sun-view offset ${diff.toFixed(0)}° | haze ${sky.haze.toFixed(2)} cloudOp ${sky.cloudOpacity.toFixed(2)} | zenith ${sky.zenith} horizon ${sky.horizon}`,
  );
}
console.log('sunPath:', JSON.stringify(GIZA_SKY.sunPath));
