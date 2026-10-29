'use client';
export function ProductMedia({image,position='50% 50%',name='',className=''}:{image:string;position?:string;name?:string;className?:string}){
 const sheet=image.split('?')[0]==='/art/buds-placeholder-sheet.png';
 return <span className={`product-media ${className}`} style={{backgroundImage:sheet?`url("${image}")`:'none',backgroundSize:sheet?'400% 200%':undefined,backgroundPosition:position}}>{sheet?<span className="sr-only">{name} illustrative product image</span>:<img src={image} alt={name} loading="lazy" onError={e=>{if(!e.currentTarget.src.endsWith('/astroworld-official-logo.jpeg'))e.currentTarget.src='/astroworld-official-logo.jpeg';}}/>}</span>;
}
