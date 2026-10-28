'use client';
import {useEffect,useState} from 'react';
import type {Auth,GoogleAuthProvider,UserCredential} from 'firebase/auth';
type Config={apiKey:string;authDomain:string;projectId:string;appId:string};
type Ready={auth:Auth;Provider:typeof GoogleAuthProvider;popup:(auth:Auth,provider:GoogleAuthProvider)=>Promise<UserCredential>;signOut:(auth:Auth)=>Promise<void>};
export function GoogleSignIn({details,completed,label='Continue with Google'}:{details:()=>{name?:string;phone?:string};completed:()=>Promise<void>;label?:string}){
 const [ready,setReady]=useState<Ready|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let active=true;fetch('/api/member/firebase',{cache:'no-store'}).then(r=>r.json()).then(async(d:any)=>{if(!d.enabled)return;const config=d.config as Config;const [apps,auths]=await Promise.all([import('firebase/app'),import('firebase/auth')]);const app=apps.getApps().length?apps.getApp():apps.initializeApp(config),auth=auths.getAuth(app);await auths.setPersistence(auth,auths.inMemoryPersistence);if(active)setReady({auth,Provider:auths.GoogleAuthProvider,popup:auths.signInWithPopup,signOut:auths.signOut});}).catch(()=>{});return()=>{active=false;};},[]);
 if(!ready)return null;
 const signIn=async()=>{setBusy(true);setError('');try{const result=await ready.popup(ready.auth,new ready.Provider());const idToken=await result.user.getIdToken();const r=await fetch('/api/member/firebase',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken,...details()})}),d:any=await r.json();await ready.signOut(ready.auth);if(!r.ok)throw new Error(d.error||'Could not sign in.');await completed();}catch(e){setError(e instanceof Error?e.message:'Google sign-in failed.');await ready.signOut(ready.auth).catch(()=>{});}finally{setBusy(false);}};
 return <div className="google-signin"><button type="button" className="button secondary" disabled={busy} onClick={signIn}>{busy?'Connecting…':label}</button>{error&&<p className="error" role="alert">{error}</p>}</div>;
}
