-- Astroworld Admin mobile RPC hardening.
-- All client sale creation/payment must use record_sale_with_payment so paid
-- sales cannot bypass cash/card capture. SECURITY DEFINER wrappers still call
-- these functions as their owner; authenticated clients do not need direct access.

revoke all on function public.record_sale(uuid, jsonb, text, uuid, boolean, text)
  from public, anon, authenticated;

revoke all on function public.mark_sale_paid(uuid, int)
  from public, anon, authenticated;

comment on function public.record_sale(uuid, jsonb, text, uuid, boolean, text)
  is 'Internal sale primitive. Client applications must call record_sale_with_payment.';

comment on function public.mark_sale_paid(uuid, int)
  is 'Deprecated client RPC. Use record_sale_payment with an explicit cash/card method.';
