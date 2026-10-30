'use client';
import {useState} from 'react';
import {ArrowRight,Mail,RefreshCw} from 'lucide-react';
import agreement from '@/lib/signup-agreement.json';

type Mode='login'|'signup'|'forgot'|'verify';
export function UniversalAuth(){
 const [mode,setMode]=useState<Mode>('login');
 const [name,setName]=useState(''),[phone,setPhone]=useState(''),[identifier,setIdentifier]=useState(''),[password,setPassword]=useState('');
 const [accepted,setAccepted]=useState(false),[age,setAge]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const signup=mode==='signup';
 const acceptance={version:agreement.version,hash:agreement.hash,accepted,ageConfirmed:age};
 const resetState=(next:Mode)=>{setMode(next);setPassword('');setError('');setNotice('');};
 const validate=()=>{if(signup){if(name.trim().length<2||!/^\+?[\d\s()-]{9,18}$/.test(phone))return 'Enter your full name and phone number.';if(!accepted||!age)return 'Confirm your age and accept the agreement first.';}if((mode==='forgot'||signup)&&!/^\S+@\S+\.\S+$/.test(identifier.trim()))return 'Enter a valid email address.';return null;};
 const resend=async()=>{
  if(!identifier.includes('@')){setError('Enter the email address used to create your account.');return;}
  setBusy(true);setError('');setNotice('');
  try{const r=await fetch('/api/member/verification',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:identifier})}),d=await r.json() as {error?:string;message?:string};if(!r.ok)throw new Error(d.error||'Could not send the email.');setNotice(d.message||'Check your inbox for a verification link.');}
  catch(e){setError(e instanceof Error?e.message:'Could not send the email.');}
  finally{setBusy(false);}
 };
 const submit=async(e:React.FormEvent<HTMLFormElement>)=>{
  e.preventDefault();if(busy)return;const invalid=validate();if(invalid){setError(invalid);return;}setBusy(true);setError('');setNotice('');
  try{
   const endpoint=signup?'/api/member':mode==='forgot'?'/api/member/password-reset':'/api/auth/session';
   const body=signup?{action:'register',name,email:identifier,phone,password,acceptance}:mode==='forgot'?{email:identifier}:{identifier,password};
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   const result=await response.json() as {error?:string;message?:string;redirect?:string};
   if(!response.ok){
    if(signup&&response.status===503&&result.error?.includes('account details were saved')){setMode('verify');setNotice(result.error);return;}
    if(!signup&&mode==='login'&&response.status===403&&result.error?.includes('verify your email')){setMode('verify');setNotice(result.error);return;}
    throw new Error(result.error||'Unable to continue.');
   }
   if(signup){setMode('verify');setNotice('Your account has been created. Check your email and use the verification link before signing in.');setPassword('');return;}
   if(mode==='forgot'){setNotice(result.message||'If a verified account exists, a reset link has been sent.');return;}
   window.location.assign(result.redirect||'/member');
  }catch(e){setError(e instanceof Error?e.message:'Unable to continue.');}
  finally{setBusy(false);}
 };
 return <div className="universal-auth">
  <span className="eyebrow">ASTROWORLD 420</span>
  <h2>{signup?'Create account':mode==='forgot'?'Reset your password':mode==='verify'?'Verify your email':'Welcome back'}</h2>
  {mode==='verify'?<div className="auth-feedback">
   <Mail size={28}/><p>{notice||'Check your inbox for a verification link.'}</p>
   <p className="auth-note">Your membership remains pending until staff approve it. Email verification does not automatically activate membership.</p>
   {error&&<p className="error" role="alert">{error}</p>}
   <button type="button" className="button primary" disabled={busy||!identifier.includes('@')} onClick={resend}>{busy?'Sending…':'Resend verification email'} <RefreshCw size={16}/></button>
   <button type="button" className="text-link" onClick={()=>resetState('login')}>Back to sign in</button>
  </div>:<>
   {mode!=='forgot'&&<div className="auth-tabs" aria-label="Account access">
    <button type="button" aria-pressed={mode==='login'} disabled={busy} onClick={()=>resetState('login')}>Sign in</button>
    <button type="button" aria-pressed={signup} disabled={busy} onClick={()=>resetState('signup')}>Sign up</button>
   </div>}
   <form onSubmit={submit}>
    {signup&&<><label className="form-field"><span>Full name</span><input value={name} onChange={e=>setName(e.target.value)} required minLength={2} maxLength={100} autoComplete="name"/></label><label className="form-field"><span>Phone number</span><input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} required pattern="[+0-9 ()-]{9,18}" maxLength={18} autoComplete="tel"/></label></>}
    <label className="form-field"><span>{signup||mode==='forgot'?'Email address':'Email or staff username'}</span><input type={signup||mode==='forgot'?'email':'text'} value={identifier} onChange={e=>setIdentifier(e.target.value)} required maxLength={200} autoComplete="username"/></label>
    {mode!=='forgot'&&<label className="form-field"><span>{signup?'Password · at least 12 characters':'Password'}</span><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={signup?12:1} maxLength={128} autoComplete={signup?'new-password':'current-password'}/></label>}
    {signup&&<><details className="signup-agreement"><summary>Read Shared Terms & Conditions</summary><div className="agreement-text" role="region" aria-label="Shared Terms and Conditions" tabIndex={0}>{agreement.paragraphs.map((p,i)=><p key={i}>{p}</p>)}</div><a href={agreement.download} target="_blank" rel="noopener noreferrer">Download agreement</a></details><label className="checkbox"><input type="checkbox" checked={age} onChange={e=>setAge(e.target.checked)} required/><span>I confirm that I am 18 or older.</span></label><label className="checkbox"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} required/><span>I accept & declare that I have read and agree to the Shared Terms & Conditions. My acceptance is recorded under my full name.</span></label></>}
    {mode==='login'&&<div className="auth-actions"><button type="button" className="text-link" onClick={()=>resetState('forgot')}>Forgot password?</button></div>}
    {notice&&<p className="auth-note" role="status">{notice}</p>}
    {error&&<p className="error" role="alert">{error}</p>}
    <button className="button primary" disabled={busy}>{busy?'Please wait…':signup?'Create account':mode==='forgot'?'Send password-reset link':'Sign in'}<ArrowRight size={17}/></button>
   </form>
   {mode==='forgot'&&<button type="button" className="text-link" onClick={()=>resetState('login')}>Back to sign in</button>}
   {signup&&<small className="auth-note">Email verification is required before sign-in. Membership access is reviewed separately by store staff.</small>}
  </>}
 </div>;
}
