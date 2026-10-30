import {database,sameOrigin} from './server-db';
import {digest} from './admin-auth';
import {acceptanceSchema,agreementStatements} from './agreements';
import {authRateLimit,requestEmailVerification,verifyMemberEmail,resetMemberPassword} from './account-emails';
const encoder=new TextEncoder();
const PASSWORD_ITERATIONS=150000;
async function hashPassword(password:string,salt:string){const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);return Array.from(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:encoder.encode(salt),iterations:PASSWORD_ITERATIONS,hash:'SHA-256'},key,256)),b=>b.toString(16).padStart(2,'0')).join('');}
function equal(a:string,b:string){if(a.length!==b.length)return false;let result=0;for(let i=0;i<a.length;i++)result|=a.charCodeAt(i)^b.charCodeAt(i);return result===0;}
function token(){return crypto.randomUUID()+crypto.randomUUID();}
export function memberCookie(request:Request,value:string,maxAge=604800){return `aw_member=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${new URL(request.url).protocol==='https:'?'; Secure':''}`;}
function cookie(request:Request){return request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('aw_member='))?.slice(10)||'';}
export async function memberIdentity(request:Request){
 const value=cookie(request);if(!value)return null;
 const row=await database().prepare('SELECT m.id,m.name,m.email,m.phone,m.status,m.created_at,m.email_verified_at,e.plan,e.expires_at FROM members m JOIN member_sessions s ON s.member_id=m.id LEFT JOIN member_entitlements e ON e.member_id=m.id WHERE s.hash=? AND s.expires>?').bind(await digest(value),Date.now()).first<{id:string;name:string;email:string;phone:string;status:string;created_at:string;email_verified_at:string|null;plan:string|null;expires_at:string|null}>();
 if(!row||!row.email_verified_at)return null;
 return {...row,status:row.status==='active'&&row.expires_at&&Date.parse(row.expires_at)<=Date.now()?'expired':row.status};
}
export async function createMemberSession(memberId:string,duration=604800000){const value=token(),now=Date.now(),db=database();await db.batch([db.prepare('DELETE FROM member_sessions WHERE expires<?').bind(now),db.prepare('INSERT INTO member_sessions(hash,member_id,expires) VALUES(?,?,?)').bind(await digest(value),memberId,now+duration)]);return value;}
export async function register(request:Request,name:string,email:string,phone:string,password:string,acceptance:unknown){
 sameOrigin(request);acceptanceSchema.parse(acceptance);const normalized=email.trim().toLowerCase();
 await authRateLimit(request,'member-register',normalized,10);
 const db=database(),salt=token(),id=crypto.randomUUID(),createdAt=new Date().toISOString();
 try{
  await db.batch([
   db.prepare('INSERT INTO members(id,email,name,phone,salt,password_hash,status,created_at,email_verified_at) VALUES(?,?,?,?,?,?,?,?,NULL)').bind(id,normalized,name.trim(),phone.trim(),salt,await hashPassword(password,salt),'pending',createdAt),
   ...agreementStatements(id,name.trim(),acceptance)
  ]);
 }catch(e){if(String(e).includes('UNIQUE'))throw new Error('An account already exists for that email. Sign in or request another verification email.');throw e;}
 // The account remains pending and cannot authenticate until its one-time email link is used.
 await requestEmailVerification(request,normalized);
}
export async function memberLogin(request:Request,email:string,password:string){
 sameOrigin(request);const normalized=email.trim().toLowerCase();await authRateLimit(request,'member-login',normalized,8);
 const user=await database().prepare('SELECT id,salt,password_hash,email_verified_at FROM members WHERE email=?').bind(normalized).first<{id:string;salt:string;password_hash:string;email_verified_at:string|null}>();
 if(!user||!equal(await hashPassword(password,user.salt),user.password_hash))throw new Error('Email or password is incorrect.');
 if(!user.email_verified_at)throw new Error('EMAIL_NOT_VERIFIED');
 return createMemberSession(user.id);
}
export async function memberLogout(request:Request){sameOrigin(request);const value=cookie(request);if(value)await database().prepare('DELETE FROM member_sessions WHERE hash=?').bind(await digest(value)).run();}
export async function verifyMemberEmailAndCreateSession(tokenValue:string){const ok=await verifyMemberEmail(tokenValue);if(!ok)return null;const row=await database().prepare('SELECT id FROM members WHERE email_verified_at IS NOT NULL AND id=(SELECT member_id FROM email_verification_tokens WHERE token_hash=? AND used_at=?)').bind(await digest(tokenValue),Date.now()).first<{id:string}>();return row?createMemberSession(row.id):null;}
export async function changeMemberPassword(tokenValue:string,password:string){
 const salt=token(),hash=await hashPassword(password,salt);
 return resetMemberPassword(tokenValue,salt,hash);
}
export async function createPass(request:Request){
 sameOrigin(request);const member=await memberIdentity(request);if(!member||member.status!=='active')throw new Error('An active membership is required.');
 const value=token(),db=database(),now=Date.now();
 await db.batch([db.prepare('DELETE FROM member_passes WHERE expires<? OR member_id=?').bind(now,member.id),db.prepare('INSERT INTO member_passes(hash,member_id,expires) VALUES(?,?,?)').bind(await digest(value),member.id,now+120000)]);
 return {value:'AW420:'+value,expires:now+120000};
}
