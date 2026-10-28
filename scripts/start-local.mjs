import fs from 'node:fs/promises';import path from 'node:path';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';import net from 'node:net';import {localConfig} from './local-config.mjs';
process.chdir(fileURLToPath(new URL('../',import.meta.url)));
const port=Number(process.env.PORT||3000);if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Choose a port between 1024 and 65535.');
await new Promise((resolve,reject)=>{const socket=net.createConnection({host:'127.0.0.1',port});socket.once('connect',()=>{socket.destroy();reject(new Error(`Port ${port} is already in use. Close the existing server before starting Astroworld.`));});socket.once('error',()=>resolve());});
function run(args){const result=spawnSync(process.execPath,args,{stdio:'inherit',env:process.env});if(result.error)throw result.error;if(result.status!==0)process.exit(result.status||1);}
try{await fs.access('node_modules/vinext');}catch{run(['scripts/install-ci.mjs']);}
try{await fs.access('.dev.vars');}catch{await fs.writeFile('.dev.vars','ADMIN_USERNAME=admin\nADMIN_INITIAL_PASSWORD=admin\n');}
if(process.env.ASTROWORLD_SKIP_BUILD!=='1')run(['scripts/run-framework.mjs','build']);
const configPath=await localConfig(),state=path.resolve(process.env.ASTROWORLD_STATE||'.wrangler/state');
const cli=['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js'];
run([...cli,'d1','migrations','apply','DB','--local','--config',configPath,'--persist-to',state]);
// Seed each product once on a fresh local database. Production stock is never seeded.
const seed=path.resolve('.sites-runtime/local-demo-stock.sql');
const names=['super-berry','white-cheese','banana','atomic','caramel','rack','sunset','cheese'];
await fs.writeFile(seed,names.map(id=>`INSERT OR IGNORE INTO inventory(product_id,half_units,cost_cents,revision,updated_at) VALUES('${id}',200,2000,0,datetime('now'));`).join('\n'));
run([...cli,'d1','execute','DB','--local','--config',configPath,'--persist-to',state,'--file',seed]);
console.log('Local demo: each new product starts at 100 g with R20 example cost per gram. Admin changes and orders persist.');
await import('./preview-store.mjs');
