import * as THREE from 'three';

export type SceneController={dispose:()=>void;setPlaying:(value:boolean)=>void};
type Progress={current:number};
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const smooth=(a:number,b:number,n:number)=>{const t=clamp((n-a)/(b-a));return t*t*(3-2*t);};
function seeded(){let n=420;return()=>{n=(1664525*n+1013904223)>>>0;return n/4294967296;};}
function planetMap(){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;const ctx=canvas.getContext('2d')!;
 ctx.fillStyle='#063b79';ctx.fillRect(0,0,1024,512);
 // Authored continent silhouettes keep the globe recognisable without remote assets.
 const continents=[[[.08,.2],[.16,.13],[.27,.18],[.31,.29],[.24,.38],[.22,.5],[.17,.44],[.14,.32]],[[.25,.49],[.32,.48],[.36,.58],[.32,.76],[.27,.88],[.26,.68]],[[.44,.24],[.51,.18],[.55,.24],[.53,.33],[.48,.35]],[[.46,.36],[.57,.34],[.61,.48],[.56,.67],[.52,.73],[.47,.54]],[[.53,.19],[.66,.12],[.83,.19],[.88,.31],[.78,.44],[.71,.38],[.66,.51],[.61,.34]],[[.77,.66],[.86,.63],[.91,.72],[.85,.79],[.78,.77]],[[.04,.91],[.24,.89],[.49,.93],[.7,.89],[.95,.92],[1,1],[0,1]]];
 ctx.shadowColor='#3db8a2';ctx.shadowBlur=12;ctx.fillStyle='#327a62';
 for(const points of continents){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x*1024,y*512):ctx.moveTo(x*1024,y*512));ctx.closePath();ctx.fill();}
 ctx.shadowBlur=0;const rand=seeded();for(let i=0;i<28000;i++){const x=rand()*1024,y=rand()*512;ctx.fillStyle=`rgba(162,209,156,${rand()*.12})`;ctx.fillRect(x,y,1.5,1.5);}
 ctx.fillStyle='#d4e8ee';ctx.fillRect(0,0,1024,15);ctx.fillRect(0,493,1024,19);
 return canvas;
}
function cloudMap(){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const ctx=canvas.getContext('2d')!,rand=seeded();for(let i=0;i<80;i++){const x=rand()*512,y=rand()*256;ctx.save();ctx.translate(x,y);ctx.rotate(rand()*2);const g=ctx.createRadialGradient(0,0,0,0,0,35);g.addColorStop(0,'#ffffffa0');g.addColorStop(1,'#ffffff00');ctx.scale(2,.3+rand()*.5);ctx.fillStyle=g;ctx.fillRect(-35,-35,70,70);ctx.restore();}return canvas;}
function berryPoint(theta:number,phi:number){const y=Math.cos(theta),r=Math.sin(theta)*(0.82+0.27*y);return new THREE.Vector3(r*Math.cos(phi),y*1.28,r*Math.sin(phi));}

export async function createCosmicScene(host:HTMLDivElement,progress:Progress,initialPlaying:boolean,onMode:(mode:string)=>void):Promise<SceneController>{
 let renderer:THREE.WebGLRenderer;
 try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});}catch{return canvasScene(host,progress,initialPlaying,onMode);}
 const canvas=renderer.domElement;canvas.setAttribute('aria-hidden','true');host.appendChild(canvas);onMode('webgl');
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(40,1,.1,150);camera.position.set(0,0,12);
 scene.add(new THREE.AmbientLight('#627eae',1.6));const sun=new THREE.DirectionalLight('#e1f5ff',4);sun.position.set(-5,5,7);scene.add(sun);
 const rim=new THREE.PointLight('#32c4ff',18);rim.position.set(4,-1,2);scene.add(rim);const red=new THREE.PointLight('#ff3067',20);red.position.set(-3,1,3);scene.add(red);
 const planet=new THREE.Group();scene.add(planet);const map=new THREE.CanvasTexture(planetMap());map.colorSpace=THREE.SRGBColorSpace;
 const globe=new THREE.Mesh(new THREE.SphereGeometry(2.65,80,64),new THREE.MeshStandardMaterial({map,roughness:1,metalness:0}));planet.add(globe);globe.rotation.z=.12;
 const cloudsMap=new THREE.CanvasTexture(cloudMap());const clouds=new THREE.Mesh(new THREE.SphereGeometry(2.69,64,48),new THREE.MeshStandardMaterial({map:cloudsMap,transparent:true,opacity:.5,depthWrite:false,roughness:1}));planet.add(clouds);
 const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(2.82,64,48),new THREE.ShaderMaterial({transparent:true,side:THREE.BackSide,depthWrite:false,blending:THREE.AdditiveBlending,vertexShader:'varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',fragmentShader:'varying vec3 n;varying vec3 v;void main(){float f=pow(1.-abs(dot(normalize(n),normalize(v))),3.);gl_FragColor=vec4(.03,.45,1.,f*.65);}'}));planet.add(atmosphere);
 const berry=new THREE.Group();scene.add(berry);
 const geometry=new THREE.SphereGeometry(1,80,64),position=geometry.attributes.position;
 for(let i=0;i<position.count;i++){const original=new THREE.Vector3().fromBufferAttribute(position,i);const p=berryPoint(Math.acos(Math.max(-1,Math.min(1,original.y))),Math.atan2(original.z,original.x));position.setXYZ(i,p.x,p.y,p.z);}geometry.computeVertexNormals();
 const flesh=new THREE.Mesh(geometry,new THREE.MeshPhysicalMaterial({color:'#e91c43',roughness:.3,metalness:.05,clearcoat:.8,clearcoatRoughness:.24}));berry.add(flesh);
 const seedGeometry=new THREE.SphereGeometry(1,8,6),seeds=new THREE.InstancedMesh(seedGeometry,new THREE.MeshStandardMaterial({color:'#f2bd70',roughness:.7}),168),dummy=new THREE.Object3D();
 for(let i=0;i<168;i++){const y=1-2*(i+.5)/168,theta=Math.acos(y),phi=i*2.399963,point=berryPoint(theta,phi),normal=new THREE.Vector3(point.x,point.y*.55,point.z).normalize();dummy.position.copy(point).addScaledVector(normal,.007);dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);dummy.scale.set(.021,.042,.012);dummy.updateMatrix();seeds.setMatrixAt(i,dummy.matrix);}berry.add(seeds);
 const leafMaterial=new THREE.MeshStandardMaterial({color:'#409546',roughness:.65,side:THREE.DoubleSide});
 for(let i=0;i<7;i++){const shape=new THREE.Shape();shape.moveTo(0,0);shape.bezierCurveTo(-.22,.25,-.2,.55,0,.91);shape.bezierCurveTo(.2,.55,.22,.25,0,0);const leaf=new THREE.Mesh(new THREE.ShapeGeometry(shape,16),leafMaterial);leaf.rotation.x=-Math.PI/2+.3;const group=new THREE.Group();group.rotation.y=i*Math.PI*2/7;group.add(leaf);group.position.y=1.19;berry.add(group);}
 const stem=new THREE.Mesh(new THREE.CylinderGeometry(.045,.065,.35,10),leafMaterial);stem.position.set(.04,1.38,0);stem.rotation.z=-.2;berry.add(stem);

 let playing=initialPlaying,disposed=false,visible=true,raf=0,clock=0,previous=performance.now(),frames=0;const pointer=new THREE.Vector2();
 const resize=()=>{const {width,height}=host.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();};const observer=new ResizeObserver(resize);observer.observe(host);resize();
 const pointerMove=(e:PointerEvent)=>{const box=host.getBoundingClientRect();pointer.set((e.clientX-box.left)/box.width-.5,(e.clientY-box.top)/box.height-.5);};window.addEventListener('pointermove',pointerMove,{passive:true});
 const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;});intersection.observe(host);
 const draw=(now:number)=>{if(disposed)return;raf=requestAnimationFrame(draw);const delta=Math.min(.05,(now-previous)/1000);previous=now;if(!visible||document.hidden)return;if(playing)clock+=delta;
  const p=progress.current,mobile=camera.aspect<.85,departure=smooth(.22,.55,p),arrival=smooth(.48,.78,p),side=mobile?0:2.25;
  planet.visible=p<.62;planet.position.set(side-departure*3,mobile?1.3:.1,-departure*18);planet.scale.setScalar((mobile?.58:1)*(1+departure*.6));globe.rotation.y=clock*.055+.9+p*.9;clouds.rotation.y=clock*.075+.9+p*.9;
  berry.visible=p>.4;berry.position.set(side+(1-arrival)*3,mobile?1.3:0,-(1-arrival)*12);berry.scale.setScalar(mobile?1.25:1.9);berry.rotation.set(.12+Math.sin(clock*.25)*.06,clock*.16+p*1.5,-.16);
  camera.position.x+=(pointer.x*.35-camera.position.x)*.035;camera.position.y+=(-pointer.y*.2-camera.position.y)*.035;
  renderer.render(scene,camera);if(++frames%20===0){canvas.dataset.frame=String(frames);canvas.dataset.phase=p<.36?'planet':p<.6?'transit':'berry';}
 };raf=requestAnimationFrame(draw);
 let fallback:SceneController|undefined;
 const lost=(e:Event)=>{e.preventDefault();dispose();host.replaceChildren();fallback=canvasScene(host,progress,playing,onMode);};canvas.addEventListener('webglcontextlost',lost);
 const dispose=()=>{if(disposed)return;disposed=true;cancelAnimationFrame(raf);observer.disconnect();intersection.disconnect();window.removeEventListener('pointermove',pointerMove);canvas.removeEventListener('webglcontextlost',lost);const materials=new Set<THREE.Material>();scene.traverse(object=>{if(object instanceof THREE.Mesh||object instanceof THREE.Points){object.geometry.dispose();(Array.isArray(object.material)?object.material:[object.material]).forEach(m=>materials.add(m));}});materials.forEach(m=>m.dispose());map.dispose();cloudsMap.dispose();renderer.dispose();canvas.remove();};
 return {dispose:()=>{dispose();fallback?.dispose();},setPlaying:value=>{playing=value;fallback?.setPlaying(value);}};
}

// A moving canvas scene also works on devices where WebGL is disabled.
function canvasScene(host:HTMLDivElement,progress:Progress,initialPlaying:boolean,onMode:(mode:string)=>void):SceneController{
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');if(!ctx){onMode('unavailable');return {dispose(){},setPlaying(){}};}host.appendChild(canvas);onMode('canvas');const map=planetMap(),clouds=cloudMap();
 let playing=initialPlaying,disposed=false,raf=0,clock=0,previous=performance.now(),frames=0,width=1,height=1;const resize=()=>{const box=host.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,1.5);width=box.width;height=box.height;canvas.width=width*dpr;canvas.height=height*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);};const observer=new ResizeObserver(resize);observer.observe(host);resize();
 const draw=(now:number)=>{if(disposed)return;raf=requestAnimationFrame(draw);const delta=Math.min(.05,(now-previous)/1000);previous=now;const bounds=host.getBoundingClientRect();if(document.hidden||bounds.bottom<0||bounds.top>innerHeight)return;if(playing)clock+=delta;ctx.clearRect(0,0,width,height);
  const p=progress.current,mobile=width<760,x=width*(mobile?.5:.71),y=height*(mobile?.4:.5),r=Math.min(width*(mobile?.31:.23),height*.35);
  const depart=smooth(.22,.55,p),arrive=smooth(.48,.78,p);if(p<.62){ctx.save();ctx.globalAlpha=1-depart;const radius=r*(1+depart);ctx.translate(x-depart*width*.2,y);const halo=ctx.createRadialGradient(0,0,radius*.9,0,0,radius*1.15);halo.addColorStop(0,'#28bfff44');halo.addColorStop(.8,'#1c77ff33');halo.addColorStop(1,'#00000000');ctx.fillStyle=halo;ctx.fillRect(-radius*1.2,-radius*1.2,radius*2.4,radius*2.4);ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.clip();ctx.fillStyle='#063b79';ctx.fillRect(-radius,-radius,radius*2,radius*2);const shift=((clock*.018+p*.3)%1)*radius*4;for(let i=-1;i<2;i++)ctx.drawImage(map,-radius-shift+i*radius*4,-radius,radius*4,radius*2);ctx.globalAlpha=(1-depart)*.45;for(let i=-1;i<2;i++)ctx.drawImage(clouds,-radius-shift*1.2+i*radius*4,-radius,radius*4,radius*2);ctx.globalAlpha=1-depart;const shade=ctx.createRadialGradient(-radius*.4,-radius*.35,0,radius*.3,radius*.2,radius*1.25);shade.addColorStop(0,'#76c9ff08');shade.addColorStop(.52,'#00051b15');shade.addColorStop(1,'#00040df5');ctx.fillStyle=shade;ctx.fillRect(-radius,-radius,radius*2,radius*2);ctx.restore();}
  if(p>.4){ctx.save();ctx.globalAlpha=arrive;ctx.translate(x+(1-arrive)*width*.2,y);ctx.rotate(-.16+Math.sin(clock*.3)*.04);const scale=r*.72;ctx.scale(scale,scale);ctx.beginPath();ctx.moveTo(0,-1.18);ctx.bezierCurveTo(1.42,-1.4,1.12,.26,0,1.43);ctx.bezierCurveTo(-1.12,.26,-1.42,-1.4,0,-1.18);const fill=ctx.createRadialGradient(-.4,-.6,0,.2,.2,1.65);fill.addColorStop(0,'#ff6683');fill.addColorStop(.5,'#e91c43');fill.addColorStop(1,'#460b28');ctx.fillStyle=fill;ctx.fill();ctx.save();ctx.clip();for(let i=0;i<168;i++){const v=1-2*(i+.5)/168,theta=Math.acos(v),phi=i*2.399963+clock*.18+p;const point=berryPoint(theta,phi);if(point.z<0)continue;ctx.fillStyle=point.z>.5?'#f4c487':'#bd684c';ctx.beginPath();ctx.ellipse(point.x,-point.y,.018,.035,-point.x*.3,0,Math.PI*2);ctx.fill();}ctx.restore();ctx.fillStyle='#358445';for(let i=0;i<7;i++){ctx.save();ctx.translate(0,-1.12);ctx.rotate((i-3)*.4);ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(-.22,-.4,0,-.7);ctx.quadraticCurveTo(.25,-.32,0,0);ctx.fill();ctx.restore();}ctx.restore();}
  if(++frames%20===0){canvas.dataset.frame=String(frames);canvas.dataset.phase=p<.36?'planet':p<.6?'transit':'berry';}
 };raf=requestAnimationFrame(draw);return {dispose(){disposed=true;cancelAnimationFrame(raf);observer.disconnect();canvas.remove();},setPlaying(value){playing=value;}};
}
