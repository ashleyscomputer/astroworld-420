'use client';
import {useEffect,useRef,useState} from 'react';
import {Pause,Play} from 'lucide-react';

export function OrbitalExperience({inspect:_inspect}:{inspect:()=>void}){
 const section=useRef<HTMLElement>(null),mount=useRef<HTMLDivElement>(null),progress=useRef(0);
 const [playing,setPlaying]=useState(false),[available,setAvailable]=useState(true);
 const controller=useRef<{setPlaying:(value:boolean)=>void;replay:()=>void;dispose:()=>void}|null>(null);
 useEffect(()=>{
  let cancelled=false;const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const update=()=>{const el=section.current;if(!el)return;const rect=el.getBoundingClientRect(),lead=innerHeight*.4;progress.current=Math.max(0,Math.min(1,(lead-rect.top)/(Math.max(1,rect.height-innerHeight)+lead)));};
  update();window.addEventListener('scroll',update,{passive:true});window.addEventListener('resize',update);
  import('@/lib/joint-scene').then(({createJointScene})=>{if(cancelled||!mount.current||!section.current)return;const initial=!reduced.matches;const scene=createJointScene(mount.current,section.current,progress,initial);if(cancelled)scene.dispose();else{controller.current=scene;setPlaying(initial);}}).catch(()=>{if(!cancelled)setAvailable(false);});
  return()=>{cancelled=true;window.removeEventListener('scroll',update);window.removeEventListener('resize',update);controller.current?.dispose();controller.current=null;};
 },[]);
 return <section ref={section} id="orbital-experience" className="joint-experience" aria-label="Illustrated cosmic joint animation">
  <div className="joint-stage"><div className="joint-canvas" ref={mount} aria-hidden="true"/>
   <button type="button" className="joint-hover-target" aria-label="Replay cosmic animation" onClick={()=>controller.current?.replay()} onPointerEnter={e=>{if(e.pointerType==='mouse')controller.current?.replay();}} onFocus={()=>controller.current?.replay()}/>
   {!available&&<div className="joint-fallback" aria-hidden="true"><div className="joint-fallback-object"/></div>}
   <div className="joint-overlay"><span>ASTROWORLD 420</span><h2>A cosmic<br/><em>interlude.</em></h2></div>
   {available&&<button className="joint-motion" onClick={()=>{const next=!playing;setPlaying(next);controller.current?.setPlaying(next);}} aria-label={playing?'Pause animation':'Play animation'} aria-pressed={playing}>{playing?<Pause size={16}/>:<Play size={16}/>}</button>}
  </div>
 </section>;
}
