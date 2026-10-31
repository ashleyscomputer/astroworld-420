import {membershipPricing,type LoungeAccessChoice} from './membership-pricing';
export type Product = { id:string; slug:string; name:string; price:number; tiers:[number,number,number]; glowColor:string; accent:string; shortDescription:string; longDescription:string; stock:number; number:string; image:string; imagePosition?:string; active?:boolean; productRevision?:number; imageRevision?:number; revision?:number; cost?:number|null };
const tierRates:Record<string,[number,number,number]>={'super-berry':[30,20,20],'white-cheese':[70,60,60],banana:[70,60,60],atomic:[100,90,80],caramel:[130,120,110],rack:[140,130,120],sunset:[150,140,130],cheese:[160,150,140]};
const productIds=['super-berry','white-cheese','banana','atomic','caramel','rack','sunset','cheese'];
const catalog = [
 ['Super Berry',30,'#b791ff','#fa62be','A little berry. A whole new universe.',40],
 ['White Cheese',70,'#b6e5ff','#e9e4ff','Cool, creamy, cosmically smooth.',30],
 ['Banana',70,'#e4f071','#ffbd58','Your daily dose of sunshine.',35],
 ['Atomic',100,'#b7f574','#47d9b9','Big flavour. Maximum atmosphere.',20],
 ['Caramel',130,'#f2bb6c','#df8850','Golden hour, in your hands.',25],
 ['Rack',140,'#ff81bd','#ff575b','An original with a little attitude.',8],
 ['Sunset Sherbet',150,'#ffa27e','#ea5cba','Catch a feeling. Chase the glow.',20],
 ['Indoor Cheese',160,'#ffc875','#ff854d','Smooth by nature. Bold by design.',18],
];
export const products:Product[] = catalog.map((p,i)=>{const name=String(p[0]);const slug=productIds[i];return {id:slug,slug,name,price:Number(p[1]),tiers:tierRates[slug],glowColor:String(p[2]),accent:String(p[3]),shortDescription:String(p[4]),longDescription:`${p[4]} Meet ${name}, one of eight Astroworld 420 products. Product images are AI-generated placeholders. Choose 1 g or 0.5 g.`,stock:0,number:String(i+1).padStart(2,'0'),active:true,image:'/art/buds-placeholder-sheet.png',imagePosition:`${(i%4)*100/3}% ${Math.floor(i/4)*100}%`};});
export const settings = {
 brand:'Astroworld 420',currency:'ZAR',demoMode:true,deliveryFee:45,freeDeliveryThreshold:300,
 ageGate:false,codEnabled:false,whatsappNumber:'',contactEmail:'',collectionAddress:'',
 paymentGateway:'yoco',gatewayEnabled:false,eftEnabled:false,
 recipeNotice:'Recipe and allergen details will be confirmed before the store opens. Artwork is illustrative.',
 discounts:{ORBIT10:0.10} as Record<string,number>,
};
export const provinces=['Eastern Cape','Free State','Gauteng','KwaZulu-Natal','Limpopo','Mpumalanga','North West','Northern Cape','Western Cape'];
export const money=(value:number)=>`R${Number(value).toLocaleString('en-ZA',{minimumFractionDigits:Number.isInteger(value)?0:2,maximumFractionDigits:2})}`;
export type CartItem={productId:string;size:'full'|'half';quantity:number};
export function lineTotal(product:Product,size:'full'|'half',quantity:number,fullGramsBefore=0){
 if(!Number.isInteger(quantity)||quantity<1||!Number.isInteger(fullGramsBefore)||fullGramsBefore<0)throw new Error('Quantity must be a positive integer.');
 if(size==='half')return product.price*quantity/2;
 if(size!=='full')throw new Error('Choose a valid portion.');
 let total=0;for(let i=0;i<quantity;i++)total+=product.tiers[Math.min(fullGramsBefore+i,2)];return total;
}
export function calculate(items:CartItem[],method='collection',code='',catalogProducts:Product[]=products,loungeAccess:LoungeAccessChoice='none'){
 if(!Array.isArray(items)||!items.length||items.length>40)throw new Error('Your bag is empty or contains too many items.');
 const aggregate:Record<string,number>={},fullGrams:Record<string,number>={};
 const lines=items.map(item=>{
  const product=catalogProducts.find(p=>p.id===item.productId);
  if(!product||!['full','half'].includes(item.size)||!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>20)throw new Error('Please check the items in your bag.');
  aggregate[product.id]=(aggregate[product.id]||0)+item.quantity*(item.size==='half'?0.5:1);
  if(aggregate[product.id]>product.stock)throw new Error(`${product.name} has insufficient availability. Please reduce your quantity.`);
  const previous=fullGrams[product.id]||0;const total=lineTotal(product,item.size,item.quantity,previous);if(item.size==='full')fullGrams[product.id]=previous+item.quantity;
  return {...item,name:product.name,image:product.image,imagePosition:product.imagePosition,unitPrice:product.price*(item.size==='half'?0.5:1),total};
 });
 if(method!=='collection')throw new Error('Only collection is available in this preview.');
 const normalized=code.trim().toUpperCase();if(normalized&&!settings.discounts[normalized])throw new Error('That discount code is not available.');
 const subtotal=Math.round(lines.reduce((sum,item)=>sum+item.total,0)*100)/100;
 const discount=Math.round(subtotal*(settings.discounts[normalized]||0)*100)/100;
 const delivery=0;
 const lounge=loungeAccess==='none'?null:{plan:loungeAccess,label:membershipPricing[loungeAccess].label,fee:membershipPricing[loungeAccess].fee};
 const loungeAccessFee=lounge?.fee||0;
 return {items:lines,subtotal,discount,delivery,loungeAccess:lounge,loungeAccessFee,total:Math.round((subtotal-discount+delivery+loungeAccessFee)*100)/100,code:normalized};
}
