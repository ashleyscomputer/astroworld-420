import {decodeProtectedHeader,importX509} from 'jose';import {runtime} from './server-db';import {verifyGoogleClaims} from './firebase-verify';
const certificates='https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
let cached:{certs:Record<string,string>;expires:number}|null=null;
export function firebaseConfig(){const apiKey=runtime('FIREBASE_API_KEY'),authDomain=runtime('FIREBASE_AUTH_DOMAIN'),projectId=runtime('FIREBASE_PROJECT_ID'),appId=runtime('FIREBASE_APP_ID');return runtime('FIREBASE_GOOGLE_ENABLED')==='true'&&apiKey&&authDomain&&projectId&&appId?{apiKey,authDomain,projectId,appId}:null;}
export async function verifyFirebaseGoogleToken(token:string){const config=firebaseConfig();if(!config)throw new Error('Google sign-in is not configured yet.');const header=decodeProtectedHeader(token);if(header.alg!=='RS256'||!header.kid)throw new Error('Invalid sign-in token.');
 if(!cached||cached.expires<Date.now()||!cached.certs[header.kid]){const response=await fetch(certificates);if(!response.ok)throw new Error('Google verification is temporarily unavailable.');const certs=await response.json() as Record<string,string>;const seconds=Number(response.headers.get('cache-control')?.match(/max-age=(\d+)/)?.[1]||300);cached={certs,expires:Date.now()+Math.min(seconds,86400)*1000};}
 const certificate=cached.certs[header.kid];if(!certificate)throw new Error('Invalid sign-in token.');const key=await importX509(certificate,'RS256');return verifyGoogleClaims(token,key,config.projectId);
}
