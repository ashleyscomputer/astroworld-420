import {createPass} from '@/lib/members';import {json} from '@/lib/server-db';
export async function POST(request:Request){try{return json(await createPass(request));}catch(e){return json({error:e instanceof Error?e.message:'Pass unavailable.'},403);}}
