import {z} from 'zod';
import agreement from './signup-agreement.json';
import {database} from './server-db';
export {agreement as signupAgreement};
export const acceptanceSchema=z.object({version:z.literal(agreement.version),hash:z.literal(agreement.hash),accepted:z.literal(true),ageConfirmed:z.literal(true)});
export type SignupAcceptance=z.infer<typeof acceptanceSchema>;
export function agreementStatements(memberId:string,name:string,input:unknown){
 acceptanceSchema.parse(input);const db=database(),now=new Date().toISOString();
 return [db.prepare('INSERT OR IGNORE INTO agreement_versions(version,title,body,document_hash,created_at) VALUES(?,?,?,?,?)').bind(agreement.version,agreement.title,agreement.paragraphs.join('\n'),agreement.hash,now),db.prepare('INSERT INTO agreement_acceptances(id,member_id,version,document_hash,signer_name,accepted_at,method) VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(),memberId,agreement.version,agreement.hash,name,now,'click_accept_and_declare')];
}
