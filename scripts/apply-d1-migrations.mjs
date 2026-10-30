import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
process.chdir(root);
const target=process.argv[2];
const targets={
 preview:{
  name:'astroworld-420-release-preview',
  id:'908ed519-2d90-4234-a604-639cf226c7d9'
 },
 production:{
  name:'astroworld-420-production',
  id:'1d469d57-f7f9-4e90-b7f9-3c45deb3d1a6'
 }
};
if(!Object.hasOwn(targets,target)){
 console.error('Usage: node scripts/apply-d1-migrations.mjs <preview|production>');
 process.exit(2);
}
const buildConfig=path.resolve('dist/server/wrangler.json');
try{await fs.access(buildConfig);}catch{
 console.error('Missing dist/server/wrangler.json. Run npm run build before applying remote migrations.');
 process.exit(2);
}
const config=JSON.parse(await fs.readFile(buildConfig,'utf8'));
const database=targets[target];
config.d1_databases=[{
 binding:'DB',
 database_name:database.name,
 database_id:database.id,
 migrations_dir:path.resolve('drizzle'),
 migrations_table:'d1_migrations'
}];
const configPath=path.resolve('dist/server',`wrangler-${target}-migrations.json`);
await fs.writeFile(configPath,JSON.stringify(config,null,2));
console.log(`Applying committed Drizzle migrations to remote D1: ${database.name}`);
console.log('Wrangler will ask you to confirm before applying changes.');
const wrangler=path.resolve('node_modules/wrangler/bin/wrangler.js');
const result=spawnSync(process.execPath,[wrangler,'d1','migrations','apply','DB','--remote','--config',configPath],{stdio:'inherit',env:process.env});
if(result.error){console.error(result.error);process.exit(1);}
process.exit(result.status??1);
