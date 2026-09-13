import {writeFileSync} from 'node:fs';
import {sampleEiffelSupplyPusher} from '../src/engine/eiffelSupplyPusher';
writeFileSync('artifacts/eiffel-supply-crew-2026-09-08/worker-design.json',JSON.stringify(sampleEiffelSupplyPusher(0),null,2)+'\n');
