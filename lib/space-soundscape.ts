export class SpaceSoundscape{
 private context:AudioContext|null=null;private master:GainNode|null=null;private filter:BiquadFilterNode|null=null;private oscillators:OscillatorNode[]=[];private active=false;private visibility=()=>{if(document.hidden){this.context?.suspend();}else if(this.active){this.context?.resume().catch(()=>{});}};
 async toggle(){
  if(!this.context){this.context=new AudioContext();this.master=this.context.createGain();this.master.gain.value=0;this.master.connect(this.context.destination);this.filter=this.context.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=320;this.filter.Q.value=1.8;this.filter.connect(this.master);for(const [frequency,type,gain] of [[55,'sine',.18],[82.4,'triangle',.07],[165,'sine',.025]] as const){const oscillator=this.context.createOscillator(),level=this.context.createGain();oscillator.frequency.value=frequency;oscillator.type=type;level.gain.value=gain;oscillator.connect(level);level.connect(this.filter);oscillator.start();this.oscillators.push(oscillator);}document.addEventListener('visibilitychange',this.visibility);}
  await this.context.resume();this.active=!this.active;this.master!.gain.setTargetAtTime(this.active?.35:0,this.context.currentTime,.35);return this.active;
 }
 modulate(progress:number){if(this.context&&this.filter&&this.active)this.filter.frequency.setTargetAtTime(260+progress*420,this.context.currentTime,.15);}
 dispose(){document.removeEventListener('visibilitychange',this.visibility);for(const oscillator of this.oscillators){oscillator.stop();oscillator.disconnect();}this.context?.close().catch(()=>{});this.context=null;}
}
