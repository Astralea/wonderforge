import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import type {EiffelKitManifest} from '../src/data/eiffelKitTypes';
import {planEiffelSummitStock} from '../src/engine/eiffelSummitStock';
const manifest=JSON.parse(readFileSync('public/models/eiffel-construction-kit/tower-kit.manifest.json','utf8')) as EiffelKitManifest;
const plan=planEiffelSummitStock(manifest),folder='artifacts/eiffel-summit-stock-2026-09-08';mkdirSync(folder,{recursive:true});writeFileSync(`${folder}/stock-plan.json`,JSON.stringify(plan,null,2)+'\n');console.log(JSON.stringify({racks:plan.racks.length,placements:plan.placements.length,freeze:plan.freeze,productionReady:plan.productionReady}));
