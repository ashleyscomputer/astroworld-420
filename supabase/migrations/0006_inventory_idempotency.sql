-- Astroworld Admin inventory-only hardening.
-- Stock is stored as integer half-gram units. This migration does not modify
-- the public website, client application, product pricing, sales, or member data.

create table if not exists app_private.inventory_operation_requests (
  request_id uuid primary key,
  actor uuid not null references public.profiles(id),
  operation text not null check (operation in ('restock', 'adjustment')),
  payload jsonb not null,
  result jsonb,
  created_at timestamptz not null default now()
);

revoke all on table app_private.inventory_operation_requests from public, anon, authenticated;

-- Client devices must use request-id keyed wrappers. Revoke direct access to
-- the primitive functions so a retry cannot accidentally apply stock twice.
revoke all on function public.restock_product(text, int, text) from public, anon, authenticated;
revoke all on function public.adjust_stock(text, int, int, text) from public, anon, authenticated;

create or replace function public.restock_inventory_idempotent(
  p_request_id uuid,
  p_product_id text,
  p_add_half int,
  p_reason text default 'Restock'
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_payload jsonb;
  v_result jsonb;
  v_inserted uuid;
  v_existing app_private.inventory_operation_requests%rowtype;
begin
  perform app_private.require_super();
  if p_request_id is null then raise exception 'INVALID_REQUEST_ID'; end if;
  if p_add_half is null or p_add_half < 1 or p_add_half > 1000000 then
    raise exception 'INVALID_QUANTITY';
  end if;

  v_payload := jsonb_build_object(
    'product_id', p_product_id,
    'add_half', p_add_half,
    'reason', coalesce(nullif(btrim(p_reason), ''), 'Restock')
  );

  insert into app_private.inventory_operation_requests(request_id, actor, operation, payload)
  values (p_request_id, auth.uid(), 'restock', v_payload)
  on conflict (request_id) do nothing
  returning request_id into v_inserted;

  if v_inserted is null then
    select * into v_existing
      from app_private.inventory_operation_requests
     where request_id = p_request_id
     for update;
    if not found
       or v_existing.actor <> auth.uid()
       or v_existing.operation <> 'restock'
       or v_existing.payload <> v_payload then
      raise exception 'IDEMPOTENCY_KEY_REUSED';
    end if;
    if v_existing.result is null then raise exception 'OPERATION_INCOMPLETE'; end if;
    return v_existing.result || jsonb_build_object('duplicate', true);
  end if;

  v_result := public.restock_product(p_product_id, p_add_half, p_reason);
  update app_private.inventory_operation_requests
     set result = v_result
   where request_id = p_request_id;
  return v_result || jsonb_build_object('duplicate', false);
end $$;

create or replace function public.adjust_inventory_idempotent(
  p_request_id uuid,
  p_product_id text,
  p_new_half int,
  p_revision int,
  p_reason text
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_payload jsonb;
  v_result jsonb;
  v_inserted uuid;
  v_existing app_private.inventory_operation_requests%rowtype;
begin
  perform app_private.require_super();
  if p_request_id is null then raise exception 'INVALID_REQUEST_ID'; end if;

  v_payload := jsonb_build_object(
    'product_id', p_product_id,
    'new_half', p_new_half,
    'revision', p_revision,
    'reason', p_reason
  );

  insert into app_private.inventory_operation_requests(request_id, actor, operation, payload)
  values (p_request_id, auth.uid(), 'adjustment', v_payload)
  on conflict (request_id) do nothing
  returning request_id into v_inserted;

  if v_inserted is null then
    select * into v_existing
      from app_private.inventory_operation_requests
     where request_id = p_request_id
     for update;
    if not found
       or v_existing.actor <> auth.uid()
       or v_existing.operation <> 'adjustment'
       or v_existing.payload <> v_payload then
      raise exception 'IDEMPOTENCY_KEY_REUSED';
    end if;
    if v_existing.result is null then raise exception 'OPERATION_INCOMPLETE'; end if;
    return v_existing.result || jsonb_build_object('duplicate', true);
  end if;

  v_result := public.adjust_stock(p_product_id, p_new_half, p_revision, p_reason);
  update app_private.inventory_operation_requests
     set result = v_result
   where request_id = p_request_id;
  return v_result || jsonb_build_object('duplicate', false);
end $$;

-- Sanitised movement feed for authenticated inventory staff. It intentionally
-- contains no product costs, sales totals, member details, or payment data.
create or replace function public.inventory_movement_history(
  p_limit int default 50,
  p_product_id text default null
) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_result jsonb;
begin
  perform app_private.require_staff();
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'INVALID_LIMIT';
  end if;

  select coalesce(jsonb_agg(row_to_json(t) order by t.created_at desc), '[]'::jsonb)
    into v_result
    from (
      select m.id, m.product_id, p.name as product_name, m.kind,
             m.previous_half, m.new_half, m.delta_half, m.reason,
             pr.username as actor_username, m.created_at
        from public.stock_movements m
        join public.products p on p.id = m.product_id
        join public.profiles pr on pr.id = m.actor
       where p_product_id is null or m.product_id = p_product_id
       order by m.created_at desc
       limit p_limit
    ) t;
  return v_result;
end $$;

revoke all on function public.restock_inventory_idempotent(uuid, text, int, text)
  from public, anon, authenticated;
revoke all on function public.adjust_inventory_idempotent(uuid, text, int, int, text)
  from public, anon, authenticated;
revoke all on function public.inventory_movement_history(int, text)
  from public, anon, authenticated;

grant execute on function public.restock_inventory_idempotent(uuid, text, int, text)
  to authenticated;
grant execute on function public.adjust_inventory_idempotent(uuid, text, int, int, text)
  to authenticated;
grant execute on function public.inventory_movement_history(int, text)
  to authenticated;
