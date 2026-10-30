import {z} from 'zod';
import {database,json} from '@/lib/server-db';
import {memberIdentity,memberCookie,register,memberLogout} from '@/lib/members';
export async function GET(request:Request){
 try{const member=await memberIdentity(request);if(!member)return json({member:null,orders:[]});const rows=await database().prepare('SELECT o.payload,s.state,s.payment_state FROM member_orders mo JOIN orders o ON o.id=mo.order_id LEFT JOIN sales s ON s.order_id=o.id WHERE mo.member_id=? ORDER BY o.created_at DESC LIMIT 100').bind(member.id).all<any>();const orders=rows.results.map(row=>{const o=JSON.parse(row.payload);return {id:o.id,createdAt:o.createdAt,method:o.method,total:o.total,status:row.state||'preview',paymentStatus:row.payment_state||'untracked'};});return json({member,orders});}
 catch{return json({error:'Membership is temporarily unavailable.'},503);}
}
export async function POST(request:Request){
 try{
  const b=z.object({action:z.literal('register'),name:z.string().trim().min(2).max(100),email:z.string().trim().email().max(200),phone:z.string().trim().regex(/^\+?[\d\s()-]{9,18}$/).refine(value=>(value.match(/\d/g)||[]).length>=9&&(value.match(/\d/g)||[]).length<=15),password:z.string().min(12).max(128),acceptance:z.object({version:z.string(),hash:z.string(),accepted:z.literal(true),ageConfirmed:z.literal(true)})}).parse(await request.json());
  await register(request,b.name,b.email,b.phone,b.password,b.acceptance);
  return json({ok:true,verificationRequired:true},201);
 }catch(e){
  const message=e instanceof Error?e.message:'Could not create account.';
  if(message==='EMAIL_DELIVERY_UNAVAILABLE')return json({error:'Your account details were saved, but email delivery is not configured yet. Please try resending your verification email later.'},503);
  if(message==='AUTH_RATE_LIMITED')return json({error:'Too many attempts. Please try again later.'},429);
  return json({error:e instanceof z.ZodError?'Check your details. Use a password with at least 12 characters and provide a valid phone number.':message},400);
 }
}
export async function DELETE(request:Request){
 try{await memberLogout(request);return Response.json({ok:true},{headers:{'Cache-Control':'no-store','Set-Cookie':memberCookie(request,'',0)}});}
 catch{return json({error:'Could not sign out.'},400);}
}
