'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowDown,ArrowUpRight,Pause,Play,Volume2,VolumeX} from 'lucide-react';
import {SpaceSoundscape} from '@/lib/space-soundscape';
import type {SceneController} from '@/lib/cosmic-scene';

export function OrbitalExperience({inspect}:{inspect:()=>void}){
 const section=useRef<HTMLElement>(null),mount=useRef<HTMLDivElement>(null),progress=useRef(0),scene=useRef<SceneController|null>(null),sound=useRef<SpaceSoundscape|null>(null);
 const [phase,setPhase]=useState(0),[playing,setPlaying]=useState(true),[audible,setAudible]=useState(false),[mode,setMode]=useState('loading'),[error,setError]=useState('');
 useEffect(()=>{
  let cancelled=false;const motion=window.matchMedia('(prefers-reduced-motion: reduce)');setPlaying(!motion.matches);
  const update=()=>{const el=section.current;if(!el)return;const bounds=el.getBoundingClientRect(),range=Math.max(1,el.offsetHeight-window.innerHeight);progress.current=Math.max(0,Math.min(1,-bounds.top/range));setPhase(progress.current<.36?0:progress.current<.6?1:2);sound.current?.modulate(progress.current);};
  update();window.addEventListener('scroll',update,{passive:true});window.addEventListener('resize',update);
  import('@/lib/cosmic-scene').then(async module=>{if(cancelled||!mount.current)return;const controller=await module.createCosmicScene(mount.current,progress,!motion.matches,next=>{if(!cancelled)setMode(next);});if(cancelled)controller.dispose();else scene.current=controller;}).catch(()=>{if(!cancelled)setMode('unavailable');});
  return()=>{cancelled=true;window.removeEventListener('scroll',update);window.removeEventListener('resize',update);scene.current?.dispose();sound.current?.dispose();};
 },[]);
 const toggleMotion=()=>{const next=!playing;setPlaying(next);scene.current?.setPlaying(next);};
 const toggleSound=async()=>{try{if(!sound.current)sound.current=new SpaceSoundscape();const active=await sound.current.toggle();setAudible(active);setError('');}catch{setError('Sound is unavailable in this browser.');}};
 return <section ref={section} id="orbital-experience" className="orbital-experience" aria-label="Scroll through the planetary orbit and strawberry scene">
  <div className="orbital-stage" data-phase={phase} data-renderer={mode}>
   <div className="cosmic-mount" ref={mount} aria-hidden="true"/>
   {mode==='unavailable'&&<div className="cosmic-static-fallback"><div className="css-earth"/><span>Astroworld 420</span></div>}
   <div className="orbital-vignette"/>
   <div className="orbital-controls"><span className="orbital-index">{phase===0?'01 / PLANETARY ORBIT':phase===1?'02 / DEEP SPACE':'03 / SUPER BERRY'}</span><div><button onClick={toggleMotion} className="icon-button" aria-label={playing?'Pause animation':'Play animation'} aria-pressed={playing}>{playing?<Pause size={16}/>:<Play size={16}/>}</button><button onClick={toggleSound} className="icon-button" aria-label={audible?'Mute ambient sound':'Enable ambient sound'} aria-pressed={audible}>{audible?<Volume2 size={16}/>:<VolumeX size={16}/>}</button></div></div>
   <div className={`orbital-copy orbit-copy ${phase===0?'is-visible':''}`} aria-hidden={phase!==0} inert={phase!==0}><span className="eyebrow">ASTROWORLD 420</span><h2>A universe<br/> of our <em>own.</em></h2><p>Scroll into the orbit.</p><a href="#specimen-marker" className="text-link">Explore <ArrowDown size={15}/></a></div>
   <div className={`orbital-copy transit-copy ${phase===1?'is-visible':''}`} aria-hidden={phase!==1} inert={phase!==1}><span className="eyebrow">IN TRANSIT</span><h2>Keep<br/> <em>exploring.</em></h2></div>
   <div className={`orbital-copy specimen-copy ${phase===2?'is-visible':''}`} aria-hidden={phase!==2} inert={phase!==2}><span className="eyebrow">SUPER BERRY / 01</span><h2>The first<br/> <em>object.</em></h2><p>A strawberry study in zero gravity.</p><button onClick={inspect} className="button primary">Inspect Super Berry<ArrowUpRight size={16}/></button><small>Illustrative 3D artwork</small></div>
   <div className="orbital-progress" aria-hidden="true"><span className={phase===0?'active':''}/><span className={phase===1?'active':''}/><span className={phase===2?'active':''}/></div>
   <span className="sr-only" role="status">{mode==='loading'?'Loading scene':playing?'Animation playing':'Animation paused'} · {phase===0?'Planetary orbit':phase===1?'Deep space':'Strawberry specimen'}</span>
   {error&&<p className="orbital-audio-error" role="status">{error}</p>}
  </div><span id="specimen-marker" className="specimen-marker"/>
 </section>;
}
