'use client';
import {useEffect,useState} from 'react';
import type {Auth,GoogleAuthProvider,UserCredential} from 'firebase/auth';
type Config={apiKey:string;authDomain:string;projectId:string;appId:string};
type GoogleDetails={name?:string;phone?:string;acceptance?:{version:string;hash:string;accepted:boolean;ageConfirmed:boolean}};
type Ready={auth:Auth;Provider:typeof GoogleAuthProvider;popup:(auth:Auth,provider:GoogleAuthProvider)=>Promise<UserCredential>;signOut:(auth:Auth)=>Promise<void>};
export function GoogleSignIn({details,completed,label='Continue with Google',validate}:{details:()=>GoogleDetails;completed:()=>Promise<void>;label?:string;validate?:()=>string|null}){
 const [ready,setReady]=useState<Ready|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[checked,setChecked]=useState(false);
 useEffect(()=>{let active=true;fetch('/api/member/firebase',{cache:'no-store'}).then(r=>r.json() as Promise<{enabled?:boolean;config?:Config}>).then(async(d)=>{if(!d.enabled||!d.config)return;const config=d.config;const [apps,auths]=await Promise.all([import('firebase/app'),import('firebase/auth')]);const app=apps.getApps().length?apps.getApp():apps.initializeApp(config),auth=auths.getAuth(app);await auths.setPersistence(auth,auths.inMemoryPersistence);if(active)setReady({auth,Provider:auths.GoogleAuthProvider,popup:auths.signInWithPopup,signOut:auths.signOut});}).catch(()=>{}).finally(()=>{if(active)setChecked(true);});return()=>{active=false;};},[]);
 if(!ready)return <div className="google-signin"><button type="button" className="button secondary" disabled>{checked?'Google sign-in unavailable':'Loading Google…'}</button></div>;
 const signIn=async()=>{const invalid=validate?.();if(invalid){setError(invalid);return;}setBusy(true);setError('');try{const result=await ready.popup(ready.auth,new ready.Provider());const idToken=await result.user.getIdToken();const r=await fetch('/api/member/firebase',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken,...details()})}),d=await r.json() as {error?:string};await ready.signOut(ready.auth);if(!r.ok)throw new Error(d.error||'Could not sign in.');await completed();}catch(e){setError(e instanceof Error?e.message:'Google sign-in failed.');await ready.signOut(ready.auth).catch(()=>{});}finally{setBusy(false);}};
 return <div className="google-signin"><button type="button" className="button secondary" disabled={busy} onClick={signIn}>{busy?'Connecting…':label}</button>{error&&<p className="error" role="alert">{error}</p>}</div>;
}
