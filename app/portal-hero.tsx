'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {useReducedMotion} from 'framer-motion';
import {ArrowDown,ArrowUpRight,Play} from 'lucide-react';
import {EarthLetter} from './earth-wordmark';

export function PillHero(){
 const root=useRef<HTMLElement>(null),pill=useRef<HTMLDivElement>(null),row=useRef<HTMLDivElement>(null),video=useRef<HTMLVideoElement>(null),shade=useRef<HTMLDivElement>(null),animations=useRef<Animation[]>([]);
 const reduced=useReducedMotion(),[override,setOverride]=useState(false),[blocked,setBlocked]=useState(false);const still=!!reduced&&!override;
 const reveal=useCallback(()=>{
  const el=pill.current,media=video.current;if(!el||!media)return;animations.current.forEach(a=>a.cancel());
  if(still){el.dataset.reveal='static';media.pause();return;}
  const mobile=window.matchMedia('(max-width:760px)').matches;
  const width=parseFloat(getComputedStyle(media).width),height=parseFloat(getComputedStyle(media).height),axis=mobile?'height':'width',end=mobile?height:width;
  el.dataset.reveal='opening';
  const timing={duration:2100,fill:'forwards' as const,easing:'cubic-bezier(.45,0,.2,1)'};
  const opening=el.animate([
   {[axis]:'1.5px',clipPath:mobile?'inset(0 50%)':'inset(50% 0)',offset:0},
   {[axis]:'1.5px',clipPath:'inset(0)',offset:.14},
   {[axis]:`${end*.065}px`,clipPath:'inset(0)',offset:.3},
   {[axis]:`${mobile?height*.55:height}px`,clipPath:'inset(0)',offset:.58},
   {[axis]:`${end}px`,clipPath:'inset(0)',offset:1},
  ],timing);
  const gap=row.current?.animate([{gap:'3px',offset:0},{gap:'3px',offset:.14},{gap:'9px',offset:.58},{gap:mobile?'17px':'18px',offset:1}],timing);
  const line=shade.current?.animate([{opacity:1,offset:0},{opacity:1,offset:.14},{opacity:0,offset:.3},{opacity:0,offset:1}],timing);
  animations.current=[opening,...(gap?[gap]:[]),...(line?[line]:[])];opening.onfinish=()=>{el.dataset.reveal='open';};
  media.play().then(()=>setBlocked(false)).catch(()=>setBlocked(true));
 },[still]);
 useEffect(()=>{
  let active=true,observer:IntersectionObserver|undefined;
  document.fonts.ready.then(()=>{if(!active)return;reveal();let initial=true,visible=true;observer=new IntersectionObserver(entries=>{const next=entries[0].isIntersecting;if(initial){initial=false;visible=next;return;}if(next&&!visible)reveal();if(!next)video.current?.pause();visible=next;},{threshold:.45});if(root.current)observer.observe(root.current);});
  const resize=()=>{animations.current.forEach(a=>a.cancel());if(pill.current)pill.current.dataset.reveal=still?'static':'open';};window.addEventListener('resize',resize);
  return()=>{active=false;observer?.disconnect();window.removeEventListener('resize',resize);animations.current.forEach(a=>a.cancel());};
 },[reveal,still]);
 return <section ref={root} className="hero pill-hero" aria-label="Astroworld 420 animated island portal">
  <svg className="portal-field" viewBox="0 0 1440 960" preserveAspectRatio="none" aria-hidden="true">{Array.from({length:15},(_,i)=><path key={i} d={`M${i*130-350} 1060 C${i*90-200} 550 ${i*90+150} 400 ${i*120+400} -100`}/>)}</svg>
  <div className="ambient ambient-one"/><div className="ambient ambient-two"/>
  <div className="hero-heading"><h1 className="sr-only">Astroworld 420 — smoothies</h1><div ref={row} className="hero-wordline portal-wordline" aria-hidden="true">
   <span className="word-left">ASTR<EarthLetter/></span><div ref={pill} className="portal-shell portal-window" data-reveal="waiting"><video ref={video} muted loop playsInline autoPlay={!still} poster="/island-poster.jpg" preload="auto" aria-label="Floating island, moving clouds and a flowing waterfall"><source src="/island.mp4" type="video/mp4"/></video><div className="portal-tint"/><div ref={shade} className="portal-hairline"/></div><span className="word-right">WORLD<sup className="hero-420">420</sup></span>
  </div></div>
  <div className="hero-bottom"><div className="hero-cta"><a href="#collection" className="button primary">Shop the collection<ArrowUpRight size={20}/></a></div><a href="#collection" className="scroll-cue"><span>SCROLL TO EXPLORE</span><span className="scroll-circle"><ArrowDown size={18}/></span></a></div>
  {(still||blocked)&&<button className="portal-play" onClick={()=>{setOverride(true);video.current?.play().then(()=>setBlocked(false)).catch(()=>{});}}><Play size={13}/>{still?'Enable animation':'Play island scene'}</button>}
 </section>;
}
