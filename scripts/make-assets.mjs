import fs from 'node:fs/promises';
await fs.mkdir('public/art',{recursive:true});await fs.mkdir('public/fonts',{recursive:true});
const palettes=[['super-berry',275,75],['white-cheese',205,38],['banana',65,88],['atomic',100,85],['caramel',35,80],['rack',335,82],['sunset',17,85],['cheese',29,93]];
const normalize=a=>{let m=Math.hypot(...a);return a.map(x=>x/m);};const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
for(let idx=0;idx<palettes.length;idx++){
 const [slug,hue,sat]=palettes[idx];let faces=[];const U=100,V=30;
 const curve=u=>{let p=idx===1||idx===4?1:2,q=idx===1?1:idx===4?2:3;let radius=idx===2?1.5:1.7;return [(radius+.4*Math.cos(q*u))*Math.cos(p*u),(radius+.4*Math.cos(q*u))*Math.sin(p*u),.5*Math.sin(q*u)];};
 const point=(u,v)=>{let c=curve(u),d=curve(u+.001),t=normalize(d.map((x,i)=>x-c[i])),n=normalize(cross(t,[0,0,1])),b=cross(t,n);const tube=idx===1?.56:.5;return c.map((x,i)=>x+tube*(n[i]*Math.cos(v)+b[i]*Math.sin(v)));};
 const rotate=p=>{let a=.7+idx*.15,b=.4+idx*.17;let [x,y,z]=p;[y,z]=[y*Math.cos(a)-z*Math.sin(a),y*Math.sin(a)+z*Math.cos(a)];return [x*Math.cos(b)+z*Math.sin(b),y,-x*Math.sin(b)+z*Math.cos(b)];};
 const proj=p=>{let f=7/(7-p[2]);return [320+p[0]*80*f,300+p[1]*80*f];};
 for(let i=0;i<U;i++)for(let j=0;j<V;j++){
  let ps=[[i,j],[i+1,j],[i+1,j+1],[i,j+1]].map(([a,b])=>rotate(point(a/U*Math.PI*2,b/V*Math.PI*2)));
  let ab=ps[1].map((x,k)=>x-ps[0][k]),ac=ps[3].map((x,k)=>x-ps[0][k]),n=normalize(cross(ab,ac));let light=normalize([-1,-1,2]);let diffuse=Math.abs(n.reduce((s,x,k)=>s+x*light[k],0));let spec=Math.pow(diffuse,22)*40;let l=22+diffuse*45+spec;let h=(hue+Math.sin(j/V*7+i/U*4)*20+360)%360;
  faces.push({z:ps.reduce((s,p)=>s+p[2],0)/4,markup:`<path d="M${ps.map(proj).map(p=>p.map(x=>x.toFixed(1)).join(',')).join('L')}Z" fill="hsl(${h.toFixed(0)} ${sat}% ${l.toFixed(0)}%)" stroke="hsl(${h.toFixed(0)} ${sat}% ${l.toFixed(0)}%)" stroke-width=".6" stroke-linejoin="round"/>`});
 }
 faces.sort((a,b)=>a.z-b.z);
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640"><defs><radialGradient id="bg"><stop stop-color="hsl(${hue} 35% 17%)"/><stop offset="1" stop-color="#100e15"/></radialGradient><radialGradient id="halo"><stop stop-color="hsl(${hue} ${sat}% 60%)" stop-opacity=".13"/><stop offset="1" stop-opacity="0"/></radialGradient><filter id="blur"><feGaussianBlur stdDeviation="17"/></filter><linearGradient id="ring"><stop stop-color="hsl(${hue} 60% 60%)" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity=".05"/></linearGradient></defs><path fill="url(#bg)" d="M0 0h640v640H0z"/><circle cx="320" cy="300" r="295" fill="url(#halo)"/><g stroke="#fff" stroke-opacity=".035"><path d="M0 160H640M0 320H640M0 480H640M160 0V640M320 0V640M480 0V640"/></g><ellipse cx="320" cy="526" rx="130" ry="18" fill="hsl(${hue} 80% 50%)" opacity=".18" filter="url(#blur)"/><ellipse cx="320" cy="320" rx="253" ry="205" fill="none" stroke="url(#ring)" stroke-width=".7" transform="rotate(-30 320 320)"/>${faces.map(f=>f.markup).join('')}<g fill="#f5f3df"><circle cx="112" cy="170" r="1.3" opacity=".5"/><circle cx="512" cy="439" r="1.6" opacity=".5"/><circle cx="490" cy="117" r="1" opacity=".5"/></g></svg>`;
 await fs.writeFile(`public/art/${slug}.svg`,svg);
}
await fs.writeFile('public/favicon.svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#0b0911"/><path d="m32 7 7 18 18 7-18 7-7 18-7-18-18-7 18-7Z" fill="#d5ef86"/></svg>');
await fs.writeFile('public/og.svg','<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><defs><radialGradient id="a"><stop stop-color="#544278"/><stop offset="1" stop-color="#0b0911"/></radialGradient></defs><rect width="1200" height="630" fill="url(#a)"/><text x="70" y="120" fill="#d5ef86" font-size="18" font-family="sans-serif" letter-spacing="5">A LITTLE TASTE OF ANOTHER WORLD</text><text x="62" y="345" fill="#f5f3e7" font-size="138" font-weight="900" font-family="sans-serif" letter-spacing="-9">ASTROWORLD</text><text x="70" y="455" fill="#cec6da" font-size="34" font-family="sans-serif">Same planet. Entirely different flavour.</text><text x="70" y="560" fill="#d5ef86" font-size="18" font-family="sans-serif">EIGHT ORIGINALS. INFINITE GOOD ENERGY.</text></svg>');
const downloads=[
 ['https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/175fbbcd-e50a-480c-bab2-ca16d4678322.mp4','public/island.mp4'],
 ['https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/726b168c-da47-4682-a255-cc3e02f89bae.jpg','public/island-poster.jpg'],
];
await Promise.all(downloads.map(async([url,path])=>{const r=await fetch(url);if(!r.ok)throw new Error(`Asset download failed: ${r.status}`);await fs.writeFile(path,new Uint8Array(await r.arrayBuffer()));console.log(`Saved ${path}`);}));
for(const [family,file] of [['Syne:wght@400..800','syne'],['Manrope:wght@400..800','manrope']]){
 const css=await (await fetch(`https://fonts.googleapis.com/css2?family=${family}&display=swap`,{headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36'}})).text();
 const urls=[...css.matchAll(/url\(([^)]+)\)/g)].map(m=>m[1]);if(!urls.length)throw new Error('Font download URL missing');
 const response=await fetch(urls.at(-1));await fs.writeFile(`public/fonts/${file}.woff2`,new Uint8Array(await response.arrayBuffer()));console.log(`Saved ${file} font`);
}

