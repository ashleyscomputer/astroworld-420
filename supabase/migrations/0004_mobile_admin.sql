-- Astroworld Admin mobile additions.
-- Additive only: never rewrite the already-applied Step 1 migrations.
-- Money remains integer cents (ZAR); inventory remains integer half-gram units.

do $$
begin
  create type public.payment_method as enum ('cash', 'card');
exception
  when duplicate_object then null;
end $$;

alter table public.sales
  add column if not exists payment_method public.payment_method;

-- Historical paid rows remain NULL because their original payment method is unknown.
create or replace function public.record_sale_payment(
  p_sale_id uuid,
  p_revision int,
  p_payment_method public.payment_method
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v public.sales%rowtype;
begin
  perform app_private.require_staff();
  if p_payment_method is null then raise exception 'INVALID_PAYMENT_METHOD'; end if;

  select * into v from public.sales where id = p_sale_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v.revision <> p_revision then raise exception 'CONFLICT'; end if;
  if v.status <> 'active' or v.payment_status <> 'unpaid' then raise exception 'INVALID_TRANSITION'; end if;

  update public.sales
     set payment_status = 'paid',
         payment_method = p_payment_method,
         paid_at = now(),
         revision = revision + 1,
         updated_at = now()
   where id = p_sale_id;

  perform app_private.audit(
    'sale_marked_paid','sale',p_sale_id::text,
    jsonb_build_object('payment_status','unpaid'),
    jsonb_build_object('payment_status','paid','payment_method',p_payment_method)
  );
  return jsonb_build_object('ok',true,'revision',v.revision+1,'payment_method',p_payment_method);
end $$;

-- Sale creation and optional cash/card capture occur in one Postgres transaction.
-- The original Step 1 record_sale function remains the pricing and stock authority.
create or replace function public.record_sale_with_payment(
  p_request_id uuid,
  p_items jsonb,
  p_customer_name text default '',
  p_member_id uuid default null,
  p_payment_method public.payment_method default null,
  p_notes text default ''
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_result jsonb;
  v_id uuid;
  v_revision int;
  v_status public.payment_status;
  v_existing_method public.payment_method;
begin
  perform app_private.require_staff();

  v_result := public.record_sale(
    p_request_id,p_items,p_customer_name,p_member_id,false,p_notes
  );
  v_id := (v_result ->> 'id')::uuid;

  select revision,payment_status,payment_method
    into v_revision,v_status,v_existing_method
    from public.sales where id = v_id for update;

  if p_payment_method is not null then
    if v_status = 'unpaid' then
      perform public.record_sale_payment(v_id,v_revision,p_payment_method);
    elsif v_status = 'paid' and v_existing_method = p_payment_method then
      null; -- Safe idempotent retry of the same paid request.
    else
      raise exception 'DUPLICATE_REQUEST';
    end if;
  end if;

  return v_result || jsonb_build_object(
    'payment_method',p_payment_method,
    'paid',p_payment_method is not null
  );
end $$;

create or replace function public.set_low_stock_threshold(
  p_product_id text,
  p_threshold_half int,
  p_revision int
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v public.products%rowtype;
begin
  perform app_private.require_super();
  if p_threshold_half is null or p_threshold_half < 0 or p_threshold_half > 10000000 then
    raise exception 'INVALID_QUANTITY';
  end if;

  select * into v from public.products where id = p_product_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v.revision <> p_revision then raise exception 'CONFLICT'; end if;

  update public.products
     set low_stock_half_units = p_threshold_half,
         revision = revision + 1,
         updated_at = now()
   where id = p_product_id;

  perform app_private.audit(
    'low_stock_threshold_updated','product',p_product_id,
    jsonb_build_object('half_units',v.low_stock_half_units),
    jsonb_build_object('half_units',p_threshold_half)
  );
  return jsonb_build_object('ok',true,'revision',v.revision+1);
end $$;

create or replace function public.create_product(
  p_product_id text,
  p_name text,
  p_sort_order int,
  p_price1_cents int,
  p_price2_cents int,
  p_price3_cents int,
  p_low_stock_half_units int default 20
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id text := lower(btrim(coalesce(p_product_id,'')));
begin
  perform app_private.require_super();
  if v_id !~ '^[a-z0-9-]{2,40}$' then raise exception 'INVALID_PRODUCT_ID'; end if;
  if char_length(btrim(coalesce(p_name,''))) not between 2 and 100 then
    raise exception 'INVALID_PRODUCT_NAME';
  end if;
  if p_price1_cents is null or p_price2_cents is null or p_price3_cents is null
     or p_price1_cents <= 0 or p_price2_cents <= 0 or p_price3_cents <= 0
     or p_price1_cents % 2 <> 0 then raise exception 'INVALID_PRICE'; end if;
  if p_low_stock_half_units is null or p_low_stock_half_units < 0 then
    raise exception 'INVALID_QUANTITY';
  end if;
  if exists(select 1 from public.products where id = v_id) then
    raise exception 'DUPLICATE_PRODUCT';
  end if;

  insert into public.products(
    id,name,sort_order,price1_cents,price2_cents,price3_cents,low_stock_half_units
  ) values(
    v_id,btrim(p_name),coalesce(p_sort_order,0),
    p_price1_cents,p_price2_cents,p_price3_cents,p_low_stock_half_units
  );
  insert into public.stock(product_id,half_units) values(v_id,0);
  insert into public.product_costs(product_id,cost_per_gram_cents) values(v_id,null);

  perform app_private.audit(
    'product_created','product',v_id,null,
    jsonb_build_object('name',btrim(p_name),'sort_order',coalesce(p_sort_order,0))
  );
  return jsonb_build_object('ok',true,'product_id',v_id);
end $$;

create or replace function public.retire_product(
  p_product_id text,
  p_revision int
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v public.products%rowtype; v_stock int;
begin
  perform app_private.require_super();
  select * into v from public.products where id = p_product_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v.revision <> p_revision then raise exception 'CONFLICT'; end if;
  if not v.active then raise exception 'INVALID_TRANSITION'; end if;

  select half_units into v_stock from public.stock where product_id = p_product_id for update;
  if coalesce(v_stock,0) <> 0 then raise exception 'STOCK_NOT_ZERO'; end if;

  update public.products set active = false,revision = revision + 1,updated_at = now()
   where id = p_product_id;
  perform app_private.audit(
    'product_retired','product',p_product_id,
    jsonb_build_object('active',true),jsonb_build_object('active',false)
  );
  return jsonb_build_object('ok',true,'revision',v.revision+1);
end $$;

-- Step 1 removed PUBLIC execution defaults; explicitly expose only these authenticated RPCs.
revoke all on function public.record_sale_payment(uuid,int,public.payment_method) from public,anon,authenticated;
revoke all on function public.record_sale_with_payment(uuid,jsonb,text,uuid,public.payment_method,text) from public,anon,authenticated;
revoke all on function public.set_low_stock_threshold(text,int,int) from public,anon,authenticated;
revoke all on function public.create_product(text,text,int,int,int,int,int) from public,anon,authenticated;
revoke all on function public.retire_product(text,int) from public,anon,authenticated;

grant execute on function public.record_sale_payment(uuid,int,public.payment_method) to authenticated;
grant execute on function public.record_sale_with_payment(uuid,jsonb,text,uuid,public.payment_method,text) to authenticated;
grant execute on function public.set_low_stock_threshold(text,int,int) to authenticated;
grant execute on function public.create_product(text,text,int,int,int,int,int) to authenticated;
grant execute on function public.retire_product(text,int) to authenticated;