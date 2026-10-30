'use client';
import {useEffect,useState} from 'react';
import {ArrowRight,CheckCircle2,LoaderCircle} from 'lucide-react';
export function VerifyEmail(){
 const [state,setState]=useState<'loading'|'success'|'error'>('loading'),[message,setMessage]=useState('Verifying your email address…');
 useEffect(()=>{
  const token=new URLSearchParams(window.location.hash.slice(1)).get('token');
  window.history.replaceState(null,'',window.location.pathname);
  if(!token){setState('error');setMessage('This verification link is incomplete. Request a new email from the sign-in screen.');return;}
  let active=true;
  fetch('/api/member/verify-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})})
   .then(async response=>{const data=await response.json() as {error?:string};if(!response.ok)throw new Error(data.error||'Could not verify your email.');if(active){setState('success');setMessage('Your email address is verified. You can now sign in; membership approval is still handled by store staff.');window.setTimeout(()=>window.location.assign('/member'),1200);}})
   .catch(error=>{if(active){setState('error');setMessage(error instanceof Error?error.message:'Could not verify your email.');}});
  return()=>{active=false;};
 },[]);
 return <main id="main" className="section-wrap interior auth-page"><section className="panel universal-auth"><span className="eyebrow">ASTROWORLD 420 / ACCOUNT</span>{state==='loading'?<LoaderCircle className="spinning" size={30}/>:state==='success'?<CheckCircle2 size={32}/>:null}<h1>{state==='success'?'Email verified':state==='error'?'Verification link unavailable':'Verifying email'}</h1><p role="status">{message}</p><a className="button primary" href="/member">Continue to membership <ArrowRight size={16}/></a></section></main>;
}
