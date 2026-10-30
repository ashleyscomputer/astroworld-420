'use client';
import {useEffect,useState,type FormEvent} from 'react';
import {ArrowRight,CheckCircle2} from 'lucide-react';
export function ResetPassword(){
 const [password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[token,setToken]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState(false);
 useEffect(()=>{const value=new URLSearchParams(window.location.hash.slice(1)).get('token')||'';window.history.replaceState(null,'',window.location.pathname);setToken(value);},[]);
 const submit=async(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();if(busy)return;setError('');
  if(password.length<12){setError('Use at least 12 characters.');return;}
  if(password!==confirm){setError('The passwords do not match.');return;}
  if(!token){setError('This reset link is incomplete. Request another one.');return;}
  setBusy(true);
  try{const response=await fetch('/api/member/password-reset/confirm',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,password})});const data=await response.json() as {error?:string};if(!response.ok)throw new Error(data.error||'Could not reset your password.');setSuccess(true);setPassword('');setConfirm('');}
  catch(error){setError(error instanceof Error?error.message:'Could not reset your password.');}
  finally{setBusy(false);}
 };
 return <main id="main" className="section-wrap interior auth-page"><section className="panel universal-auth"><span className="eyebrow">ASTROWORLD 420 / ACCOUNT</span><h1>Choose a new password</h1>{success?<><CheckCircle2 size={32}/><p role="status">Your password has been changed. Other active member sessions have been signed out.</p><a className="button primary" href="/member">Continue to sign in <ArrowRight size={16}/></a></>:<form onSubmit={submit}><label className="form-field"><span>New password</span><input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={12} maxLength={128} autoComplete="new-password" required/></label><label className="form-field"><span>Confirm new password</span><input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} minLength={12} maxLength={128} autoComplete="new-password" required/></label><small className="auth-note">Use at least 12 characters. This reset link expires after 30 minutes and can only be used once.</small>{error&&<p className="error" role="alert">{error}</p>}<button className="button primary" disabled={busy||!token}>{busy?'Saving…':'Update password'} <ArrowRight size={16}/></button></form>}</section></main>;
}
