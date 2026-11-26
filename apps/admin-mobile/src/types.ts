export type AppRole = "staff" | "super_admin";

export type Product = {
  id: string;
  name: string;
  sort_order: number;
  active: boolean;
  low_stock_half_units: number;
  revision: number;
  half_units: number;
  stock_revision: number;
};

export type StockMovement = {
  id: string;
  product_id: string;
  product_name: string;
  kind: "restock" | "adjustment" | "sale" | "sale_cancel" | "sale_refund";
  previous_half: number;
  new_half: number;
  delta_half: number;
  reason: string;
  actor_username: string;
  created_at: string;
};

export type PendingInventoryOperation = {
  requestId: string;
  kind: "restock" | "adjustment";
  productId: string;
  quantityHalf: number;
  revision: number;
  reason: string;
  queuedAt: string;
  lastError?: string | null;
};

export type Profile = {
  id: string;
  username: string;
  full_name: string;
  role: AppRole;
  active: boolean;
};
