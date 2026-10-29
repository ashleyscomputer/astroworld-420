import assert from 'node:assert/strict';
import {products,calculate,lineTotal} from '../lib/catalog.ts';
const expected={
 'super-berry':[30,50,70,90], 'white-cheese':[70,130,190,250],banana:[70,130,190,250],
 atomic:[100,190,270,350],caramel:[130,250,360,470],rack:[140,270,390,510],
 sunset:[150,290,420,550],cheese:[160,310,450,590],
};
const available=products.map(p=>({...p,stock:100}));
for(const p of available){for(let quantity=1;quantity<=4;quantity++){
 const price=expected[p.id][quantity-1];assert.equal(lineTotal(p,'full',quantity),price,`${p.name} ${quantity} g`);
 assert.equal(calculate([{productId:p.id,size:'full',quantity}],'collection','',available).total,price);
 }
 assert.equal(calculate([{productId:p.id,size:'half',quantity:4}],'collection','',available).total,p.price*2);
 const mixed=calculate([{productId:p.id,size:'full',quantity:1},{productId:p.id,size:'half',quantity:2},{productId:p.id,size:'full',quantity:2}],'collection','',available);
 assert.equal(mixed.total,expected[p.id][2]+p.price,`${p.name} mixed sizes`);assert.equal(mixed.items.reduce((sum,item)=>sum+item.total,0),mixed.subtotal);
 const split=calculate([{productId:p.id,size:'full',quantity:1},{productId:p.id,size:'full',quantity:3}],'collection','',available);assert.equal(split.total,expected[p.id][3]);
}
const atomic=available.find(p=>p.id==='atomic');assert.throws(()=>lineTotal(atomic,'full',0));assert.throws(()=>lineTotal(atomic,'full',1.5));
assert.equal(calculate([{productId:'atomic',size:'full',quantity:3}],'collection','ORBIT10',available).total,243);
console.log('PASS: all 8 tier schedules (1–4 g), split lines, half portions, mixed portions, invalid quantities and discount code.');
