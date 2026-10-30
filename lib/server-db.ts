import {env} from 'cloudflare:workers';
export function database(){if(!env.DB)throw new Error('Order storage is unavailable.');return env.DB;}
export const noStore={'Cache-Control':'no-store'};
export function json(data:unknown,status=200){return Response.json(data,{status,headers:noStore});}
export function sameOrigin(request:Request){if(request.headers.get('origin')!==new URL(request.url).origin)throw new Error('Please submit from this website.');}
export function runtime(key:string){return (env as unknown as Record<string,string|undefined>)[key]||process.env[key]||'';}
export interface EmailSendMessage{to:string;from:{email:string;name?:string};subject:string;html:string;text:string}
export interface EmailSender{send(message:EmailSendMessage):Promise<unknown>}
export function emailSender():EmailSender|null{
 const value=(env as unknown as {EMAIL?:unknown}).EMAIL;
 if(!value||typeof value!=='object'||typeof (value as {send?:unknown}).send!=='function')return null;
 return value as EmailSender;
}
