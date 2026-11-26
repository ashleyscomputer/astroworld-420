-- Preserve the existing customer/site integration surface.
-- Step 1 explicitly granted these authenticated RPCs. Migration 0005 hardened
-- the mobile route, but the customer-facing system is a separate application.
-- Restore its original authenticated function permissions unchanged.

grant execute on function
  public.record_sale(uuid, jsonb, text, uuid, boolean, text),
  public.mark_sale_paid(uuid, int)
to authenticated;
