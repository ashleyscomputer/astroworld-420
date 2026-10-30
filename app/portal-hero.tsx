'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {useReducedMotion} from 'framer-motion';
import {ArrowUpRight,Play} from 'lucide-react';

export function PillHero(){
 const root=useRef<HTMLElement>(null),pill=useRef<HTMLButtonElement>(null),row=useRef<HTMLDivElement>(null),logo=useRef<HTMLImageElement>(null),shade=useRef<HTMLSpanElement>(null),animations=useRef<Animation[]>([]);
 const reduced=useReducedMotion(),[override,setOverride]=useState(false);const still=!!reduced&&!override;
 const reveal=useCallback(()=>{
  const el=pill.current,image=logo.current;if(!el||!image)return;animations.current.forEach(a=>a.cancel());
  if(still){el.dataset.reveal='static';return;}
  el.dataset.reveal='opening';
  const diameter=parseFloat(getComputedStyle(image).width);
  const timing={duration:2100,easing:'cubic-bezier(.45,0,.2,1)'};
  const opening=el.animate([
   {width:'1.5px',clipPath:'inset(50% 0 round 999px)',offset:0},
   {width:'1.5px',clipPath:'inset(0 round 999px)',offset:.14},
   {width:`${diameter*.12}px`,clipPath:'inset(0 round 999px)',offset:.3},
   {width:`${diameter}px`,clipPath:'inset(0 round 999px)',offset:.7},
   {width:`${diameter}px`,clipPath:'inset(0 round 999px)',offset:1},
  ],timing);
  const line=shade.current?.animate([{opacity:1,offset:0},{opacity:1,offset:.14},{opacity:0,offset:.3},{opacity:0,offset:1}],timing);
  const gap=row.current?.animate([{gap:'2px',offset:0},{gap:'2px',offset:.14},{gap:'5px',offset:.7},{gap:'6px',offset:1}],timing);
  animations.current=[opening,...(line?[line]:[]),...(gap?[gap]:[])];opening.onfinish=()=>{el.dataset.reveal='open';};
 },[still]);
 useEffect(()=>{
  let active=true,observer:IntersectionObserver|undefined;
  document.fonts.ready.then(()=>{if(!active)return;reveal();let initial=true,visible=true;observer=new IntersectionObserver(entries=>{const next=entries[0].isIntersecting;if(initial){initial=false;visible=next;return;}if(next&&!visible)reveal();visible=next;},{threshold:.45});if(root.current)observer.observe(root.current);});
  const resize=()=>{animations.current.forEach(a=>a.cancel());if(pill.current)pill.current.dataset.reveal=still?'static':'open';};window.addEventListener('resize',resize);
  return()=>{active=false;observer?.disconnect();window.removeEventListener('resize',resize);animations.current.forEach(a=>a.cancel());};
 },[reveal,still]);
 return <section ref={root} className="hero pill-hero logo-hero" aria-label="Astroworld 420 animated logo">
  <svg className="portal-field" viewBox="0 0 1440 960" preserveAspectRatio="none" aria-hidden="true">{Array.from({length:15},(_,i)=><path key={i} d={`M${i*130-350} 1060 C${i*90-200} 550 ${i*90+150} 400 ${i*120+400} -100`}/>)}</svg>
  <div className="ambient ambient-one"/><div className="ambient ambient-two"/>
  <div className="hero-heading"><h1 className="sr-only">Astroworld 420 — products</h1><div ref={row} className="hero-wordline portal-wordline" onPointerEnter={e=>{if(e.pointerType==='mouse')reveal();}}>
   <span className="word-left">ASTR</span><button type="button" ref={pill} className="portal-shell portal-window logo-window" data-reveal="waiting" aria-label="Animate the Astroworld logo O" onClick={reveal} onFocus={reveal}><img ref={logo} className="hero-logo-o" src="/astroworld-official-logo.jpeg" alt="" width="1254" height="1254" fetchPriority="high"/><span ref={shade} className="portal-hairline"/></button><span className="word-right">WORLD<sup className="hero-420">420</sup></span>
  </div></div>
  <div className="hero-bottom"><div className="hero-cta"><a href="#collection" className="button primary">Shop the collection<ArrowUpRight size={20}/></a></div></div>
  {still&&<button className="portal-play" onClick={()=>setOverride(true)}><Play size={13}/>Enable animation</button>}
 </section>;
}
