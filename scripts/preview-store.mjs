import path from 'node:path';import {spawn} from 'node:child_process';import {localConfig} from './local-config.mjs';
const configPath=await localConfig(),port=process.env.PORT||'3000';
console.log('Astroworld 420 is starting at http://localhost:'+port);
const child=spawn(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','dev','--config',configPath,'--local','--persist-to',path.resolve(process.env.ASTROWORLD_STATE||'.wrangler/state'),'--ip','127.0.0.1','--inspector-port','0','--port',port,'--log-level','warn'],{stdio:'inherit'});
process.on('SIGINT',()=>child.kill('SIGINT'));process.on('SIGTERM',()=>child.kill('SIGTERM'));child.on('exit',code=>process.exit(code||0));
