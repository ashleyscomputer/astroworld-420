import {currentProducts} from '@/lib/commerce';
export const dynamic='force-dynamic';
export default async function sitemap(){const base='https://astroworld-smoothie-orbit.maritzliam.chatgpt.site',catalogue=await currentProducts();return ['','/shop','/about','/faq','/contact','/delivery-returns','/terms','/privacy',...catalogue.map(p=>`/product/${p.slug}`)].map(path=>({url:base+path,lastModified:new Date('2026-10-30'),changeFrequency:'weekly' as const,priority:path===''?1:.7}));}
