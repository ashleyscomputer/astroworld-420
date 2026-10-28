import {notFound} from 'next/navigation';import {PolicyPage} from '../content-ui';const pages=['terms','privacy','delivery-returns'];
export async function generateMetadata({params}:{params:Promise<{page:string}>}){const {page}=await params;return {title:page==='delivery-returns'?'Delivery & returns':page==='privacy'?'Privacy notice':'Terms of use'};}
export default async function Page({params}:{params:Promise<{page:string}>}){const {page}=await params;if(!pages.includes(page))notFound();return <PolicyPage kind={page}/>;}
