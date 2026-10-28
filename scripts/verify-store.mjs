await import('./verify-admin.mjs');
await import('./verify-erp-contract.mjs');
const base='http://127.0.0.1:5180';
for(const path of ['/','/admin','/shop','/about','/faq','/contact','/terms','/privacy','/delivery-returns','/cart','/checkout','/tracking','/astroworld-420-brand.jpg','/sitemap.xml']){const r=await fetch(base+path);if(r.status!==200)throw new Error(path+' failed: '+r.status);}
const missing=await fetch(base+'/not-a-page');if(missing.status!==404)throw new Error('404 routing failed.');
console.log('PASS: storefront/admin routes, artwork delivery, sitemap and 404.');
