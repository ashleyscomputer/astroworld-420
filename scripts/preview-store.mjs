import fs from 'node:fs/promises';import path from 'node:path';import {parseEnv} from 'node:util';import {spawn} from 'node:child_process';
// Keep local credentials out of the deployable dist/server configuration.
const root=process.cwd(),config=JSON.parse(await fs.readFile('dist/server/wrangler.json','utf8'));
const vars=await fs.readFile('.dev.vars','utf8').then(parseEnv).catch(()=>({}));
config.main=path.resolve('dist/server',config.main);config.base_dir=path.resolve('dist/server');config.build={watch_dir:path.resolve('dist/server')};config.assets={...config.assets,directory:path.resolve('dist/server',config.assets.directory)};config.vars={...config.vars,...vars};
await fs.mkdir('.sites-runtime',{recursive:true});const configPath=path.resolve('.sites-runtime/store-preview.json');await fs.writeFile(configPath,JSON.stringify(config));
console.log('Starting local store preview at http://127.0.0.1:'+(process.env.PORT||'5180'));
const child=spawn(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','dev','--config',configPath,'--local','--persist-to',path.resolve('.wrangler/state'),'--ip','127.0.0.1','--inspector-port','0','--port',process.env.PORT||'5180','--log-level','warn'],{cwd:root,stdio:'inherit'});
process.on('SIGINT',()=>child.kill('SIGINT'));child.on('exit',code=>process.exit(code||0));
