import {settings} from '@/lib/catalog';import {currentProducts} from '@/lib/commerce';import {json} from '@/lib/server-db';
export async function GET(){try{return json({products:await currentProducts(),settings});}catch{return json({error:'Inventory is temporarily unavailable.'},503);}}
