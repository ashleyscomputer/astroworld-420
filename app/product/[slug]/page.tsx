import {notFound} from 'next/navigation';import {currentProducts} from '@/lib/commerce';import {ProductPage} from '../../storefront';
export const dynamic='force-dynamic';
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const p=(await currentProducts()).find(p=>p.slug===slug);return {title:p?.name||'Product not found',description:p?.shortDescription};}
export default async function Page({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const product=(await currentProducts()).find(p=>p.slug===slug);if(!product)notFound();return <ProductPage product={product}/>;}
