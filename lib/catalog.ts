export type Product = { id:string; slug:string; name:string; price:number; glowColor:string; accent:string; shortDescription:string; longDescription:string; stock:number; number:string; image:string };
const catalog = [
 ['Super Berry',30,'#b791ff','#fa62be','A little berry. A whole new universe.',40],
 ['White Cheese',70,'#b6e5ff','#e9e4ff','Cool, creamy, cosmically smooth.',30],
 ['Banana',70,'#e4f071','#ffbd58','Your daily dose of sunshine.',35],
 ['Atomic',100,'#b7f574','#47d9b9','Big flavour. Maximum atmosphere.',20],
 ['Caramel',130,'#f2bb6c','#df8850','Golden hour, in your hands.',25],
 ['Rack',140,'#ff81bd','#ff575b','An original with a little attitude.',8],
 ['Sunset',150,'#ffa27e','#ea5cba','Catch a feeling. Chase the glow.',20],
 ['Cheese',160,'#ffc875','#ff854d','Smooth by nature. Bold by design.',18],
];
export const products:Product[] = catalog.map((p,i)=>{const name=String(p[0]);const slug=name.toLowerCase().replaceAll(' ','-');return {id:slug,slug,name,price:Number(p[1]),glowColor:String(p[2]),accent:String(p[3]),shortDescription:String(p[4]),longDescription:`${p[4]} Meet ${name}, one of eight expressive Astroworld 420 smoothie originals. A colourful escape from the everyday, with a portion that suits your orbit. Choose 1 g or 0.5 g.`,stock:0,number:String(i+1).padStart(2,'0'),image:`/art/${slug}.svg?v=2`};});
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
export function calculate(items:CartItem[],method='courier',code='',catalogProducts:Product[]=products){
 if(!Array.isArray(items)||!items.length||items.length>40)throw new Error('Your bag is empty or contains too many items.');
 const aggregate:Record<string,number>={};
 const lines=items.map(item=>{
  const product=catalogProducts.find(p=>p.id===item.productId);
  if(!product||!['full','half'].includes(item.size)||!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>20)throw new Error('Please check the items in your bag.');
  aggregate[product.id]=(aggregate[product.id]||0)+item.quantity*(item.size==='half'?0.5:1);
  if(aggregate[product.id]>product.stock)throw new Error(`${product.name} has insufficient availability. Please reduce your quantity.`);
  const unitPrice=product.price*(item.size==='half'?0.5:1);
  return {...item,name:product.name,image:product.image,unitPrice,total:Math.round(unitPrice*item.quantity*100)/100};
 });
 if(!['courier','collection'].includes(method))throw new Error('Choose a valid delivery option.');
 const normalized=code.trim().toUpperCase();if(normalized&&!settings.discounts[normalized])throw new Error('That discount code is not available.');
 const subtotal=Math.round(lines.reduce((sum,item)=>sum+item.total,0)*100)/100;
 const discount=Math.round(subtotal*(settings.discounts[normalized]||0)*100)/100;
 const delivery=method==='collection'||subtotal-discount>=settings.freeDeliveryThreshold?0:settings.deliveryFee;
 return {items:lines,subtotal,discount,delivery,total:Math.round((subtotal-discount+delivery)*100)/100,code:normalized};
}
