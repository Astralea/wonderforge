import {sydneyTerrainHeightAt} from '../../src/engine/sydneyTerrain';
import {sydneyFalseworkAt} from '../../src/engine/sydneyConstruction';
console.log([46,52,58,-52].map(x=>[x,...[100,110,120,130,140].map(z=>sydneyTerrainHeightAt(x,z))]));
console.log(sydneyFalseworkAt(.58).map(b=>({station:b.station,group:b.group,position:b.position,height:b.height,yaw:b.yaw})));
