export function membershipExpiry(start:Date,plan:'day'|'monthly'){
 if(plan==='day')return new Date(start.getTime()+24*60*60*1000);
 const next=new Date(start.getTime()),day=next.getUTCDate();next.setUTCDate(1);next.setUTCMonth(next.getUTCMonth()+1);const last=new Date(Date.UTC(next.getUTCFullYear(),next.getUTCMonth()+1,0)).getUTCDate();next.setUTCDate(Math.min(day,last));return next;
}
