import {database,digest} from './admin-auth';
import {emailSender,runtime} from './server-db';

function randomToken(){const bytes=crypto.getRandomValues(new Uint8Array(32));return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');}
function escapeHtml(value:string){return value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]||char));}
function appUrl(request:Request,path:string,token:string){
 const configured=runtime('AUTH_BASE_URL'),base=configured||new URL(request.url).origin,url=new URL(path,base);
 if(url.protocol!=='https:'&&url.hostname!=='localhost'&&url.hostname!=='127.0.0.1')throw new Error('AUTH_BASE_URL must use HTTPS.');
 url.hash=new URLSearchParams({token}).toString();return url.toString();
}
async function send(to:string,subject:string,heading:string,description:string,url:string,button:string){
 const sender=emailSender(),from=runtime('AUTH_EMAIL_FROM');if(!sender||!from)throw new Error('EMAIL_DELIVERY_UNAVAILABLE');
 const safeUrl=escapeHtml(url),safeHeading=escapeHtml(heading),safeDescription=escapeHtml(description),safeButton=escapeHtml(button);
 await sender.send({to,from:{email:from,name:'Astroworld 420'},subject,html:`<!doctype html><html><body style="margin:0;background:#090810;color:#f7f3ff;font-family:Arial,sans-serif"><main style="max-width:560px;margin:40px auto;padding:32px;background:#171321;border:1px solid #413254;border-radius:18px"><p style="letter-spacing:.2em;color:#c69cff;font-size:12px">ASTROWORLD 420</p><h1 style="font-size:26px">${safeHeading}</h1><p style="line-height:1.6;color:#d6cfe2">${safeDescription}</p><p style="margin:30px 0"><a href="${safeUrl}" style="display:inline-block;padding:14px 22px;border-radius:10px;background:#a66cff;color:#fff;text-decoration:none;font-weight:bold">${safeButton}</a></p><p style="font-size:12px;color:#a99eb8">If you did not request this, you can ignore this email. This link is single-use and expires automatically.</p></main></body></html>`,text:`Astroworld 420\n\n${heading}\n\n${description}\n\n${url}\n\nIf you did not request this, ignore this email.`});
}
async function rateLimit(request:Request,kind:string,identity:string,max:number){
 const now=Date.now(),ip=request.headers.get('cf-connecting-ip')||'unknown',key=await digest(`${kind}:${ip}:${identity.toLowerCase()}`),db=database();
 await db.prepare('INSERT INTO login_attempts(key,count,reset_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN reset_at<=? THEN 1 ELSE count+1 END,reset_at=CASE WHEN reset_at<=? THEN excluded.reset_at ELSE reset_at END').bind(key,1,now+900000,now,now).run();
 const row=await db.prepare('SELECT count FROM login_attempts WHERE key=?').bind(key).first<{count:number}>();if((row?.count||0)>max)throw new Error('AUTH_RATE_LIMITED');
}
export async function authRateLimit(request:Request,kind:string,identity:string,max:number){await rateLimit(request,kind,identity,max);}
export async function sendVerificationEmail(request:Request,memberId:string,email:string,name:string){
 const db=database(),token=randomToken(),now=Date.now(),hash=await digest(token);
 await db.batch([db.prepare('DELETE FROM email_verification_tokens WHERE member_id=? OR expires_at<=?').bind(memberId,now),db.prepare('INSERT INTO email_verification_tokens(token_hash,member_id,expires_at,created_at,used_at) VALUES(?,?,?,?,NULL)').bind(hash,memberId,now+86400000,now)]);
 try{await send(email,'Verify your Astroworld 420 account',`Welcome, ${name}`,'Confirm your email address to finish creating your account.',appUrl(request,'/verify-email',token),'Verify email');}
 catch(error){await db.prepare('DELETE FROM email_verification_tokens WHERE token_hash=?').bind(hash).run();throw error;}
}
export async function sendPasswordResetEmail(request:Request,memberId:string,email:string,name:string){
 const db=database(),token=randomToken(),now=Date.now(),hash=await digest(token);
 await db.batch([db.prepare('DELETE FROM password_reset_tokens WHERE member_id=? OR expires_at<=?').bind(memberId,now),db.prepare('INSERT INTO password_reset_tokens(token_hash,member_id,expires_at,created_at,used_at) VALUES(?,?,?,?,NULL)').bind(hash,memberId,now+1800000,now)]);
 try{await send(email,'Reset your Astroworld 420 password','Password reset requested',`Hi ${name}, use the link below to choose a new password. It expires in 30 minutes.`,appUrl(request,'/reset-password',token),'Reset password');}
 catch(error){await db.prepare('DELETE FROM password_reset_tokens WHERE token_hash=?').bind(hash).run();throw error;}
}
export async function requestEmailVerification(request:Request,email:string){
 await rateLimit(request,'verify',email,5);const normalized=email.trim().toLowerCase();
 const member=await database().prepare('SELECT id,email,name,email_verified_at FROM members WHERE email=?').bind(normalized).first<{id:string;email:string;name:string;email_verified_at:string|null}>();
 if(member&&!member.email_verified_at)await sendVerificationEmail(request,member.id,member.email,member.name);
}
export async function requestMemberPasswordReset(request:Request,email:string){
 await rateLimit(request,'password-reset',email,5);const normalized=email.trim().toLowerCase();
 const member=await database().prepare('SELECT id,email,name,email_verified_at FROM members WHERE email=?').bind(normalized).first<{id:string;email:string;name:string;email_verified_at:string|null}>();
 if(member?.email_verified_at)await sendPasswordResetEmail(request,member.id,member.email,member.name);
}
export async function verifyMemberEmail(token:string){
 const db=database(),now=Date.now(),hash=await digest(token),verifiedAt=new Date(now).toISOString();
 const candidate=await db.prepare('SELECT member_id FROM email_verification_tokens WHERE token_hash=? AND expires_at>? AND used_at IS NULL').bind(hash,now).first<{member_id:string}>();
 if(!candidate)return null;
 const results=await db.batch([
  db.prepare('UPDATE email_verification_tokens SET used_at=? WHERE token_hash=? AND expires_at>? AND used_at IS NULL').bind(now,hash,now),
  db.prepare('UPDATE members SET email_verified_at=? WHERE id=? AND email_verified_at IS NULL').bind(verifiedAt,candidate.member_id),
  db.prepare('DELETE FROM email_verification_tokens WHERE member_id=? AND token_hash<>?').bind(candidate.member_id,hash)
 ]);
 return results[0]?.meta.changes===1&&results[1]?.meta.changes===1?candidate.member_id:null;
}
export async function resetMemberPassword(token:string,salt:string,passwordHash:string){
 const db=database(),now=Date.now(),hash=await digest(token);
 const candidate=await db.prepare('SELECT member_id FROM password_reset_tokens WHERE token_hash=? AND expires_at>? AND used_at IS NULL').bind(hash,now).first<{member_id:string}>();
 if(!candidate)return false;
 const results=await db.batch([
  db.prepare('UPDATE password_reset_tokens SET used_at=? WHERE token_hash=? AND expires_at>? AND used_at IS NULL').bind(now,hash,now),
  db.prepare('UPDATE members SET salt=?,password_hash=? WHERE id=? AND EXISTS (SELECT 1 FROM password_reset_tokens WHERE token_hash=? AND used_at=?)').bind(salt,passwordHash,candidate.member_id,hash,now),
  db.prepare('DELETE FROM member_sessions WHERE member_id=?').bind(candidate.member_id),
  db.prepare('DELETE FROM password_reset_tokens WHERE member_id=?').bind(candidate.member_id)
 ]);
 return results[0]?.meta.changes===1&&results[1]?.meta.changes===1;
}
