import {z} from 'zod';
import {requireAdmin} from '@/lib/admin-auth';
import {database,json} from '@/lib/server-db';
import {ensureInventory} from '@/lib/commerce';

const fields=z.object({
 name:z.string().trim().min(2).max(80),
 price:z.number().min(0.01).max(100000),
 secondGramPrice:z.number().min(0.01).max(100000),
 thirdGramPrice:z.number().min(0.01).max(100000),
 shortDescription:z.string().trim().max(200).default(''),
 longDescription:z.string().trim().max(1000).default(''),
 image:z.string().min(1).max(370000),
 glowColor:z.string().regex(/^#[0-9a-fA-F]{6}$/),
 accent:z.string().regex(/^#[0-9a-fA-F]{6}$/),
 active:z.boolean().default(true),
});
function validImage(image:string){
 if(image.startsWith('data:'))return /^data:image\/(?:jpeg|png|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(image)&&image.length<=370000;
 if(image.startsWith('/'))return /^\/(?!\/)(?!.*\.\.)[A-Za-z0-9/_?.=&%+:-]+$/.test(image);
 try{return new URL(image).protocol==='https:';}catch{return false;}
}
function slugify(value:string){return value.normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40)||'product';}
function failure(error:unknown){
 const message=error instanceof Error?error.message:'';
 if(message==='ADMIN_AUTH_REQUIRED')return json({error:'Please sign in.'},401);
 if(message==='ADMIN_FORBIDDEN')return json({error:'Only the super admin can manage products.'},403);
 if(error instanceof z.ZodError)return json({error:'Check the product name, three price tiers, colours and image. Uploaded images must be below 256 KB.'},400);
 if(message.includes('catalog_products_slug_unique'))return json({error:'That product URL is already in use. Try a slightly different name.'},409);
 return json({error:'Unable to save the product. Please review the details and try again.'},400);
}
export async function POST(request:Request){
 try{
  const actor=await requireAdmin(request,true,'super_admin');
  await ensureInventory();
  const b=fields.parse(await request.json());
  if(!validImage(b.image))return json({error:'Use an HTTPS image URL, local image path or upload a supported image below 256 KB.'},400);
  const db=database(),duplicate=await db.prepare('SELECT id FROM catalog_products WHERE lower(name)=lower(?)').bind(b.name).first();
  if(duplicate)return json({error:'A product with that name already exists.'},409);
  const id='p-'+crypto.randomUUID().replaceAll('-','').slice(0,12),slug=slugify(b.name)+'-'+id.slice(2,6),now=new Date().toISOString();
  const count=await db.prepare('SELECT COALESCE(MAX(CAST(product_number AS INTEGER)),0) AS count FROM catalog_products').first<{count:number}>();
  const number=String((count?.count||0)+1).padStart(2,'0');
  await db.batch([
   db.prepare('INSERT INTO catalog_products(id,slug,name,price_cents,second_gram_cents,third_gram_cents,glow_color,accent,short_description,long_description,product_number,active,revision,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,0,?,?)').bind(id,slug,b.name,Math.round(b.price*100),Math.round(b.secondGramPrice*100),Math.round(b.thirdGramPrice*100),b.glowColor,b.accent,b.shortDescription,b.longDescription,number,b.active?1:0,now,now),
   db.prepare('INSERT INTO inventory(product_id,half_units,cost_cents,revision,updated_at) VALUES(?,0,NULL,0,?)').bind(id,now),
   db.prepare('INSERT INTO product_media(product_id,image_url,revision,updated_at) VALUES(?,?,0,?)').bind(id,b.image,now),
   db.prepare('INSERT INTO staff_audit_events(id,actor,action,target,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),actor.username,'product_created',id,now),
  ]);
  return json({ok:true,id,slug},201);
 }catch(error){return failure(error);}
}
export async function PATCH(request:Request){
 try{
  const actor=await requireAdmin(request,true,'super_admin');
  await ensureInventory();
  const b=fields.extend({id:z.string().min(3).max(64),revision:z.number().int().min(0)}).parse(await request.json());
  if(!validImage(b.image))return json({error:'Use an HTTPS image URL, local image path or upload a supported image below 256 KB.'},400);
  const db=database(),old=await db.prepare('SELECT id,name,slug,revision FROM catalog_products WHERE id=?').bind(b.id).first<{id:string;name:string;slug:string;revision:number}>();
  if(!old)return json({error:'Product not found.'},404);
  if(old.revision!==b.revision)return json({error:'This product changed. Refresh and review it before saving.'},409);
  const duplicate=await db.prepare('SELECT id FROM catalog_products WHERE lower(name)=lower(?) AND id<>?').bind(b.name,b.id).first();
  if(duplicate)return json({error:'A product with that name already exists.'},409);
  const slug=old.name===b.name?old.slug:slugify(b.name)+'-'+b.id.slice(2,6),now=new Date().toISOString();
  const saved=await db.prepare('UPDATE catalog_products SET slug=?,name=?,price_cents=?,second_gram_cents=?,third_gram_cents=?,glow_color=?,accent=?,short_description=?,long_description=?,active=?,revision=revision+1,updated_at=? WHERE id=? AND revision=? RETURNING id').bind(slug,b.name,Math.round(b.price*100),Math.round(b.secondGramPrice*100),Math.round(b.thirdGramPrice*100),b.glowColor,b.accent,b.shortDescription,b.longDescription,b.active?1:0,now,b.id,b.revision).first();
  if(!saved)return json({error:'This product changed. Refresh and review it before saving.'},409);
  await db.batch([
   db.prepare('INSERT INTO product_media(product_id,image_url,revision,updated_at) VALUES(?,?,0,?) ON CONFLICT(product_id) DO UPDATE SET image_url=excluded.image_url,revision=product_media.revision+1,updated_at=excluded.updated_at').bind(b.id,b.image,now),
   db.prepare('INSERT INTO staff_audit_events(id,actor,action,target,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),actor.username,'product_updated',b.id,now),
  ]);
  return json({ok:true,slug});
 }catch(error){return failure(error);}
}
