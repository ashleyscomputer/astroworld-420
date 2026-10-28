import {products,settings} from '@/lib/catalog';
export async function GET(){return Response.json({products,settings});}
