import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import agreement from '../lib/signup-agreement.json' with {type:'json'};

const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3001';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw new Error('Membership verification must use an isolated local database.');
const acceptance={version:agreement.version,hash:agreement.hash,accepted:true,ageConfirmed:true};

async function req(path,method='GET',body,cookie='',status=200){
 const response=await fetch(base+path,{method,headers:{Origin:base,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const data=await response.json();
 assert.equal(response.status,status,`${path}: ${JSON.stringify(data)}`);
 return {data,response};
}
async function registerAndVerify({name,email,phone,token,password}){
 const created=await req('/api/member','POST',{action:'register',name,email,phone,password,acceptance},'',201);
 assert.equal(created.data.verificationRequired,true);
 assert.equal(created.response.headers.get('set-cookie'),null,'Registration must not create a session before email verification.');
 assert.equal((await req('/api/member','GET')).data.member,null);
 await req('/api/auth/session','POST',{identifier:email,password},'',401);
 assert.ok(token,'Set the matching TEST_VERIFICATION_TOKEN_* from the local simulated verification email.');
 const verified=await req('/api/member/verify-email','POST',{token});
 const cookie=verified.response.headers.get('set-cookie')?.split(';')[0];
 assert.ok(cookie,'Verification must issue a member session.');
 return cookie;
}

const suffix=crypto.randomUUID().slice(0,8),password='correct horse battery 420';
await req('/api/admin/members','GET',undefined,'',401);
const memberEmail=`member-${suffix}@example.invalid`;
const memberCookie=await registerAndVerify({
 name:'QR test member',email:memberEmail,phone:'0820000000',password,
 token:process.env.TEST_VERIFICATION_TOKEN_1
});
let member=(await req('/api/member','GET',undefined,memberCookie)).data.member;
assert.equal(member.status,'pending');
await req('/api/member/pass','POST',undefined,memberCookie,403);

const admin=(await req('/api/admin/session','POST',{username:'admin',password:'admin'})).response.headers.get('set-cookie').split(';')[0];
await req('/api/admin/members','PATCH',{id:member.id,status:'active',plan:'day'},admin);
member=(await req('/api/member','GET',undefined,memberCookie)).data.member;
assert.equal(member.plan,'day');
assert.ok(Date.parse(member.expires_at)-Date.now()>23*3600000);

const pass=(await req('/api/member/pass','POST',undefined,memberCookie)).data.value;
assert.match(pass,/^AW420:/);
await req('/api/admin/members','POST',{pass},'',401);
let scan=(await req('/api/admin/members','POST',{pass},admin)).data;
assert.equal(scan.member.email,memberEmail);
assert.equal(scan.ready.length,0);

const otherEmail=`other-${suffix}@example.invalid`;
const otherCookie=await registerAndVerify({
 name:'Other member',email:otherEmail,phone:'0820000001',password,
 token:process.env.TEST_VERIFICATION_TOKEN_2
});
const other=(await req('/api/member','GET',undefined,otherCookie)).data.member;

const orderBody={requestId:crypto.randomUUID(),items:[{productId:'banana',size:'half',quantity:1}],customer:{name:member.name,email:memberEmail,phone:'0820000000'},method:'collection',code:'',terms:true,privacy:true,payment:'preview'};
const placed=(await req('/api/orders','POST',orderBody,memberCookie,201)).data;
let board=(await req('/api/admin','GET',undefined,admin)).data;
let order=board.orders.find(x=>x.id===placed.id);
for(const action of ['confirmed','preparing','ready']){
 await req('/api/admin/orders','PATCH',{id:order.id,action,revision:order.revision},admin);
 board=(await req('/api/admin','GET',undefined,admin)).data;
 order=board.orders.find(x=>x.id===placed.id);
}
scan=(await req('/api/admin/members','POST',{pass},admin)).data;
assert.equal(scan.ready[0].id,placed.id);
assert.equal(scan.orders[0].status,'ready');
assert.equal((await req('/api/member','GET',undefined,memberCookie)).data.orders[0].id,placed.id);
assert.equal((await req('/api/member','GET',undefined,otherCookie)).data.orders.length,0);

await req('/api/admin/members','PATCH',{id:other.id,status:'active',plan:'day'},admin);
const otherPass=(await req('/api/member/pass','POST',undefined,otherCookie)).data.value;
assert.equal((await req('/api/admin/members','POST',{pass:otherPass},admin)).data.orders.length,0);
const guest=(await req('/api/orders','POST',{...orderBody,requestId:crypto.randomUUID()},'',201)).data;
await req('/api/admin/members','PATCH',{id:other.id,orderId:guest.id},admin);
assert.equal((await req('/api/admin/members','POST',{pass:otherPass},admin)).data.orders[0].id,guest.id);
await req('/api/admin/members','PATCH',{id:member.id,orderId:guest.id},admin,409);
await req('/api/admin/members','PATCH',{id:other.id,orderId:'AW-00000000'},admin,404);

const refreshed=(await req('/api/member/pass','POST',undefined,memberCookie)).data.value;
await req('/api/admin/members','POST',{pass},admin,404);
await req('/api/admin/members','PATCH',{id:member.id,status:'disabled'},admin);
await req('/api/admin/members','POST',{pass:refreshed},admin,404);
await req('/api/member/pass','POST',undefined,memberCookie,403);

await req('/api/member/password-reset','POST',{email:memberEmail},'',202);
if(process.env.TEST_PASSWORD_RESET_TOKEN){
 const replacement='correct battery 420 astroworld secure';
 await req('/api/member/password-reset/confirm','POST',{token:process.env.TEST_PASSWORD_RESET_TOKEN,password:replacement});
 assert.equal((await req('/api/member','GET',undefined,memberCookie)).data.member,null,'Password reset must revoke existing sessions.');
 const signedIn=await req('/api/auth/session','POST',{identifier:memberEmail,password:replacement});
 assert.ok(signedIn.response.headers.get('set-cookie'),'New password must authenticate after reset.');
}else{
 console.log('NOTE: Set TEST_PASSWORD_RESET_TOKEN from the local simulated password-reset email to exercise the one-time reset and session-revocation assertions.');
}

await req('/api/member','DELETE',undefined,otherCookie);
assert.equal((await req('/api/member','GET',undefined,otherCookie)).data.member,null);
await req('/api/auth/session','POST',{identifier:memberEmail,password:'incorrect'},'',401);
console.log('PASS: verified registration gating, approval, QR scanning, linked orders, ready collection, member isolation, pass refresh/revocation, sign-in and password recovery request.');
