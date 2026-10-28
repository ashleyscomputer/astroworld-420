import assert from 'node:assert/strict';import {generateKeyPair,SignJWT} from 'jose';import {verifyGoogleClaims} from '../lib/firebase-verify.ts';
const {privateKey,publicKey}=await generateKeyPair('RS256'),now=Math.floor(Date.now()/1000),project='astroworld-test';
async function sign(claims={},options={}){return new SignJWT({email:'TEST@example.invalid',email_verified:true,auth_time:now,firebase:{sign_in_provider:'google.com'},...claims}).setProtectedHeader({alg:'RS256'}).setIssuer(options.issuer||`https://securetoken.google.com/${project}`).setAudience(options.audience||project).setSubject('test-user').setIssuedAt(now).setExpirationTime(options.expires||now+300).sign(privateKey);}
assert.equal((await verifyGoogleClaims(await sign(),publicKey,project)).email,'test@example.invalid');
for(const invalid of [await sign({email_verified:false}),await sign({auth_time:now-301}),await sign({firebase:{sign_in_provider:'password'}}),await sign({}, {audience:'other'}),await sign({}, {issuer:'https://wrong.example'}),await sign({}, {expires:now-1})])await assert.rejects(()=>verifyGoogleClaims(invalid,publicKey,project));
const other=await generateKeyPair('RS256');await assert.rejects(async()=>verifyGoogleClaims(await sign(),other.publicKey,project));
console.log('PASS: Firebase token signature, project, issuer, expiry, recent authentication and verified Google identity checks.');
