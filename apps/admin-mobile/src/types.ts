export type AppRole = "staff" | "super_admin";
export type PaymentMethod = "cash" | "card";
export type Product = {
  id:string; name:string; sort_order:number; active:boolean;
  price1_cents:number; price2_cents:number; price3_cents:number;
  low_stock_half_units:number; revision:number; half_units:number; stock_revision:number;
};
export type Sale = {
  id:string; ref:string; customer_name:string; status:"active"|"cancelled"|"refunded";
  payment_status:"unpaid"|"paid"|"refunded"; payment_method:PaymentMethod|null;
  total_cents:number; created_at:string; revision:number;
};
export type Member = {
  id:string; full_name:string; phone:string; email:string;
  status:"pending"|"active"|"disabled"; created_at:string;
};
export type CartLine = {product_id:string;size:"full"|"half";quantity:number};
export type QueuedSale = {
  requestId:string;items:CartLine[];customerName:string;
  paymentMethod:PaymentMethod|null;notes:string;queuedAt:string;lastError?:string|null;
};
export type Profile = {id:string;username:string;full_name:string;role:AppRole;active:boolean};