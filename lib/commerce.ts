import {z} from 'zod';
import {products,calculate,provinces,settings,type CartItem} from './catalog';
import {database} from './server-db';
export async function ensureInventory(){const db=database(),now=new Date().toISOString();await db.batch(products.map(p=>db.prepare('INSERT OR IGNORE INTO inventory(product_id,half_units,cost_cents,revision,updated_at) VALUES(?,?,NULL,0,?)').bind(p.id,0,now)));}
export async function currentProducts(){await ensureInventory();const rows=await database().prepare('SELECT product_id,half_units FROM inventory').all<{product_id:string;half_units:number}>();const stock=new Map(rows.results.map(r=>[r.product_id,r.half_units/2]));return products.map(p=>({...p,stock:stock.get(p.id)||0}));}
export async function quoteOrder(items:CartItem[],method:string,code:string){return calculate(items,method,code,await currentProducts());}
export const orderSchema=z.object({requestId:z.string().uuid(),items:z.array(z.object({productId:z.string(),size:z.enum(['full','half']),quantity:z.number().int().min(1).max(20)})).min(1).max(40),customer:z.object({name:z.string().trim().min(2).max(100),email:z.string().trim().email().max(200),phone:z.string().trim().regex(/^\+?[\d\s()-]{9,18}$/),street:z.string().max(200).default(''),suburb:z.string().max(100).default(''),city:z.string().max(100).default(''),province:z.string().max(40).default(''),postal:z.string().max(10).default(''),notes:z.string().max(1000).default('')}),method:z.enum(['courier','collection']),code:z.string().max(40).default(''),terms:z.literal(true),privacy:z.literal(true),age:z.boolean().optional(),payment:z.literal('preview')});
export async function placeOrder(input:unknown,source:'customer'|'admin'){
 const b=orderSchema.parse(input),db=database(),email=b.customer.email.toLowerCase();
 const existing=await db.prepare('SELECT id,token,email FROM orders WHERE request_id=?').bind(b.requestId).first<{id:string;token:string;email:string}>();
 if(existing){if(existing.email!==email)throw new Error('Please restart checkout.');return {...existing,duplicate:true};}
 if(!settings.demoMode)throw new Error('Online payments are not connected.');if(settings.ageGate&&!b.age)throw new Error('Please confirm the age requirement.');
 if(b.method==='courier'&&(!b.customer.street.trim()||!b.customer.suburb.trim()||!b.customer.city.trim()||!provinces.includes(b.customer.province)||!/^\d{4}$/.test(b.customer.postal)))throw new Error('Please complete your delivery address and four-digit postal code.');
 let quote:Awaited<ReturnType<typeof quoteOrder>>;try{quote=await quoteOrder(b.items,b.method,b.code);}catch(e){const duplicate=await db.prepare('SELECT id,token,email FROM orders WHERE request_id=?').bind(b.requestId).first<{id:string;token:string;email:string}>();if(duplicate&&duplicate.email===email)return {...duplicate,duplicate:true};throw e;}
 const id='AW-'+crypto.randomUUID().slice(0,8).toUpperCase(),token=crypto.randomUUID()+crypto.randomUUID(),now=new Date().toISOString();
 const costs=await db.prepare('SELECT product_id,cost_cents FROM inventory').all<{product_id:string;cost_cents:number|null}>();const costMap=new Map(costs.results.map(r=>[r.product_id,r.cost_cents]));
 const lines=quote.items.map((item,i)=>{const halfUnits=item.quantity*(item.size==='half'?1:2),cost=costMap.get(item.productId);return {id:`${id}:${i}`,productId:item.productId,halfUnits,costCents:cost==null?null:Math.round(cost*halfUnits/2)};});
 const costCents=lines.some(l=>l.costCents==null)?null:lines.reduce((sum,l)=>sum+(l.costCents||0),0);
 const payload={id,...quote,customer:{...b.customer,email},method:b.method,payment:'Manual confirmation — no online payment collected',status:'pending',demo:true,source,createdAt:now,emailStatus:'not_sent',fulfilment:'Awaiting admin confirmation.'};
 try{await db.batch([
  db.prepare('INSERT INTO orders(id,request_id,email,token,payload,created_at) VALUES(?,?,?,?,?,?)').bind(id,b.requestId,email,token,JSON.stringify(payload),now),
  db.prepare('INSERT INTO sales(order_id,state,payment_state,source,net_cents,cost_cents,total_cents,revision,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(id,'pending','pending',source,Math.round((quote.subtotal-quote.discount)*100),costCents,Math.round(quote.total*100),0,now),
  ...lines.map(l=>db.prepare('INSERT INTO order_lines(id,order_id,product_id,half_units,cost_cents) VALUES(?,?,?,?,?)').bind(l.id,id,l.productId,l.halfUnits,l.costCents)),
  db.prepare("INSERT INTO erp_jobs(id,kind,entity_id,status,updated_at) VALUES(?, 'order', ?, 'pending', ?)").bind('order:'+id,id,now),
 ]);}catch(e){const duplicate=await db.prepare('SELECT id,token,email FROM orders WHERE request_id=?').bind(b.requestId).first<{id:string;token:string;email:string}>();if(duplicate&&duplicate.email===email)return {...duplicate,duplicate:true};if(String(e).includes('INSUFFICIENT_STOCK'))throw new Error('Stock changed while you checked out. Refresh your bag and try again.');throw e;}
 return {id,token,duplicate:false};
}
export async function readOrder(id:string){const row=await database().prepare('SELECT o.*,s.state,s.payment_state,s.revision,s.cost_cents,s.net_cents,s.source FROM orders o LEFT JOIN sales s ON s.order_id=o.id WHERE o.id=?').bind(id).first<any>();if(!row)return null;const value=JSON.parse(row.payload);return {...value,status:row.state||'preview',paymentStatus:row.payment_state||'untracked',source:row.source||value.source||'customer',revision:row.revision??0,legacy:row.state==null,token:row.token,costCents:row.cost_cents,netCents:row.net_cents};}
export const states=['pending','confirmed','preparing','ready','shipped','completed','cancelled','refunded'] as const;
export async function changeOrder(id:string,action:string,revision:number){
 const db=database(),order=await readOrder(id);if(!order||order.legacy)throw new Error('This legacy preview order cannot change inventory.');if(order.revision!==revision)throw new Error('CONFLICT');
 if(['cancelled','refunded'].includes(order.status))throw new Error('This order is closed.');
 let state=order.status,payment=order.paymentStatus;
 if(action==='mark_paid'){if(payment==='paid')return;payment='paid';if(state==='pending')state='confirmed';}
 else if(action==='cancel'){if(payment==='paid')throw new Error('Use Record refund & restock for a paid order.');state='cancelled';}
 else if(action==='refund'){if(payment!=='paid')throw new Error('Only paid orders can be recorded as refunded.');state='refunded';payment='refunded';}
 else{const allowed:Record<string,string[]>={pending:['confirmed'],confirmed:['preparing'],preparing:['ready'],ready:['shipped','completed'],shipped:['completed']};if(!allowed[state]?.includes(action))throw new Error('That status transition is not available.');if(action==='completed'&&payment!=='paid')throw new Error('Record payment before completing the order.');state=action;}
 const now=new Date().toISOString();await db.batch([
  db.prepare('UPDATE sales SET state=?,payment_state=?,revision=CASE WHEN revision=? THEN revision+1 ELSE -1 END,updated_at=? WHERE order_id=?').bind(state,payment,revision,now,id),
  db.prepare("INSERT INTO erp_jobs(id,kind,entity_id,status,updated_at) VALUES(?, 'order', ?, 'pending', ?) ON CONFLICT(id) DO UPDATE SET status='pending',version=erp_jobs.version+1,updated_at=excluded.updated_at,error=NULL").bind('order:'+id,id,now),
 ]);
}
