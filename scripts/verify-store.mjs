import assert from 'node:assert/strict';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:5180';
async function post(path,body,status=200){const r=await fetch(base+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const d=await r.json();assert.equal(r.status,status,`${path}: ${JSON.stringify(d)}`);return d;}
let checks=0;
for(const path of ['/','/shop','/about','/faq','/contact','/delivery-returns','/terms','/privacy','/cart','/checkout','/tracking','/sitemap.xml','/robots.txt','/favicon.svg','/island.mp4','/fonts/syne.woff2']){const r=await fetch(base+path);assert.equal(r.status,200,path);checks++;}
const {products}=await (await fetch(base+'/api/products')).json();assert.deepEqual(products.map(p=>p.price),[30,70,70,100,130,140,150,160]);checks++;
for(const p of products){assert.equal((await fetch(base+`/product/${p.slug}`)).status,200);assert.equal((await fetch(base+p.image)).status,200);for(const size of ['full','half']){const q=await post('/api/quote',{items:[{productId:p.id,size,quantity:1}],method:'collection'});assert.equal(q.total,p.price*(size==='half'?.5:1));checks++;}}
const items=[{productId:'super-berry',size:'half',quantity:2},{productId:'atomic',size:'full',quantity:1}];
let q=await post('/api/quote',{items,method:'courier',code:'orbit10'});assert.deepEqual([q.subtotal,q.discount,q.delivery,q.total],[130,13,45,162]);checks++;
q=await post('/api/quote',{items:[{productId:'cheese',size:'full',quantity:2}],method:'courier'});assert.equal(q.delivery,0);checks++;
await post('/api/quote',{items,code:'FAKE'},400);await post('/api/quote',{items:[{productId:'rack',size:'full',quantity:9}]},400);await post('/api/quote',{items:[{productId:'cheese',size:'full',quantity:-1}]},400);await post('/api/quote',{items:[{productId:'super-berry',size:'bogus',quantity:1}]},400);checks+=4;
const body={requestId:crypto.randomUUID(),items,customer:{name:'Preview Test',email:'preview-test@example.invalid',phone:'0820000000'},method:'collection',code:'ORBIT10',terms:true,privacy:true,payment:'preview',total:.01};
const order=await post('/api/orders',body,201);const duplicate=await post('/api/orders',body);assert.equal(order.id,duplicate.id);checks++;
const result=await (await fetch(base+`/api/orders?id=${order.id}&token=${order.token}`)).json();assert.equal(result.total,117);assert.equal(result.status,'preview');assert.equal(result.emailStatus,'not_sent');checks++;
assert.equal((await fetch(base+`/api/orders?id=${order.id}&token=wrong`)).status,404);checks++;
const tracking=await post('/api/track',{id:order.id,email:'PREVIEW-TEST@EXAMPLE.INVALID'});assert.equal(tracking.id,order.id);assert.equal(tracking.demo,true);checks++;
await post('/api/track',{id:order.id,email:'other@example.invalid'},404);await post('/api/orders',{...body,requestId:crypto.randomUUID(),terms:false},400);checks+=2;
await post('/api/contact',{name:'Preview QA',email:'preview-test@example.invalid',message:'Synthetic verification message for the preview.'});await post('/api/newsletter',{email:'preview-test@example.invalid',consent:true});await post('/api/newsletter',{email:'bad',consent:true},400);checks+=3;
assert.equal((await fetch(base+'/not-a-real-page')).status,404);assert.equal((await fetch(base+'/product/not-a-smoothie')).status,404);checks+=2;
console.log(`PASS: ${checks} route, pricing, stock-validation, discount, persistence, idempotency, privacy and form checks. Synthetic preview order: ${order.id}`);
