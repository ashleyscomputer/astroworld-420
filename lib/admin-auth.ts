import {database,runtime,sameOrigin} from './server-db';
const encoder=new TextEncoder();
export async function digest(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
async function passwordHash(password:string,salt:string){const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);return Array.from(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:encoder.encode(salt),iterations:100000,hash:'SHA-256'},key,256)),b=>b.toString(16).padStart(2,'0')).join('');}
function equal(a:string,b:string){if(a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0;}
export async function adminIdentity(request:Request){const token=request.headers.get('cookie')?.split(';').map(c=>c.trim()).find(c=>c.startsWith('aw_admin='))?.slice(9);if(!token)return null;return database().prepare('SELECT username FROM admin_sessions WHERE hash=? AND expires>?').bind(await digest(token),Date.now()).first<{username:string}>();}
export async function requireAdmin(request:Request,write=false){if(write)sameOrigin(request);const who=await adminIdentity(request);if(!who){if(write&&request.body){const reader=request.body.getReader();let size=0;try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>16384){await reader.cancel();break;}}}finally{reader.releaseLock();}}throw new Error('ADMIN_AUTH_REQUIRED');}return who;}
export async function login(request:Request,username:string,password:string){
 sameOrigin(request);const db=database(),now=Date.now();const key=await digest((request.headers.get('cf-connecting-ip')||'local')+':'+username.toLowerCase());
 await db.prepare('INSERT INTO login_attempts(key,count,reset_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN reset_at<? THEN 1 ELSE count+1 END,reset_at=CASE WHEN reset_at<? THEN excluded.reset_at ELSE reset_at END').bind(key,now+900000,now,now).run();
 const attempts=await db.prepare('SELECT count FROM login_attempts WHERE key=?').bind(key).first<{count:number}>();if((attempts?.count||0)>8)throw new Error('Too many attempts. Try again in 15 minutes.');
 const initial=runtime('ADMIN_INITIAL_PASSWORD');const adminName=runtime('ADMIN_USERNAME')||'admin';
 if(username===adminName&&initial){const salt=crypto.randomUUID();await db.prepare('INSERT OR IGNORE INTO admin_users(username,salt,password_hash) VALUES(?,?,?)').bind(adminName,salt,await passwordHash(initial,salt)).run();}
 const user=await db.prepare('SELECT * FROM admin_users WHERE username=?').bind(username).first<{salt:string;password_hash:string}>();
 if(!user||!equal(await passwordHash(password,user.salt),user.password_hash))throw new Error('Username or password is incorrect.');
 await db.prepare('DELETE FROM login_attempts WHERE key=?').bind(key).run();await db.prepare('DELETE FROM admin_sessions WHERE expires<?').bind(now).run();
 const token=crypto.randomUUID()+crypto.randomUUID();await db.prepare('INSERT INTO admin_sessions(hash,username,expires) VALUES(?,?,?)').bind(await digest(token),username,now+8*3600000).run();return token;
}
export function sessionCookie(request:Request,token:string,maxAge=28800){return `aw_admin=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${new URL(request.url).protocol==='https:'?'; Secure':''}`;}
export async function logout(request:Request){await requireAdmin(request,true);const token=request.headers.get('cookie')?.split(';').map(c=>c.trim()).find(c=>c.startsWith('aw_admin='))?.slice(9);if(token)await database().prepare('DELETE FROM admin_sessions WHERE hash=?').bind(await digest(token)).run();}
