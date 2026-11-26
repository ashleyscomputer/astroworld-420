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
  actorId: string;
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

export type AttendanceShift = {
  id: string;
  employee_id: string;
  employee_name: string;
  username: string;
  clock_in_at: string;
  clock_out_at: string | null;
  duration_seconds: number;
  is_open: boolean;
};

export type AttendanceQr = {
  payload: string;
  expires_at: string;
  ttl_seconds: number;
};
