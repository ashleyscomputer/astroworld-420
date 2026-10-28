import fs from 'node:fs/promises';
import path from 'node:path';
import {parseEnv} from 'node:util';
export async function localConfig(){
 const config=JSON.parse(await fs.readFile('dist/server/wrangler.json','utf8'));
 const vars=await fs.readFile('.dev.vars','utf8').then(parseEnv).catch(()=>({}));
 config.main=path.resolve('dist/server',config.main);config.base_dir=path.resolve('dist/server');config.build={watch_dir:path.resolve('dist/server')};
 config.assets={...config.assets,directory:path.resolve('dist/server',config.assets.directory)};config.vars={...config.vars,...vars};
 config.d1_databases=config.d1_databases.map(db=>({...db,migrations_dir:path.resolve('drizzle'),migrations_table:'d1_migrations'}));
 await fs.mkdir('.sites-runtime',{recursive:true});const configPath=path.resolve('.sites-runtime/store-preview.json');await fs.writeFile(configPath,JSON.stringify(config));return configPath;
}
