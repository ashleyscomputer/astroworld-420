-- Run after migrations 0001-0008 with: supabase test db
-- Permission and schema checks for the private inventory/attendance app.

begin;
select plan(24);

select ok(to_regclass('public.attendance_shifts') is not null, 'attendance shifts table exists');
select ok(to_regclass('public.attendance_qr_challenges') is not null, 'attendance QR challenges table exists');
select ok(to_regclass('public.attendance_events') is not null, 'attendance event ledger exists');
select ok(to_regclass('app_private.inventory_operation_requests') is not null, 'inventory idempotency table is private');

select ok((select relrowsecurity from pg_class where oid = 'public.attendance_shifts'::regclass), 'attendance shifts has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.attendance_qr_challenges'::regclass), 'attendance QR challenges has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.attendance_events'::regclass), 'attendance event ledger has RLS enabled');

select ok(not has_table_privilege('anon', 'public.attendance_shifts', 'SELECT'), 'anon cannot read attendance shifts');
select ok(not has_table_privilege('authenticated', 'public.attendance_shifts', 'SELECT'), 'clients cannot directly read attendance shifts');
select ok(not has_table_privilege('authenticated', 'public.attendance_qr_challenges', 'SELECT'), 'clients cannot read QR token hashes');
select ok(not has_table_privilege('authenticated', 'public.attendance_qr_redemptions', 'SELECT'), 'clients cannot read QR redemption records');
select ok(not has_table_privilege('authenticated', 'public.attendance_events', 'SELECT'), 'clients cannot directly read attendance event ledger');
select ok(not has_table_privilege('authenticated', 'app_private.inventory_operation_requests', 'SELECT'), 'clients cannot read idempotency payloads');
select ok(not has_schema_privilege('authenticated', 'app_private', 'USAGE'), 'private schema is not exposed to authenticated clients');

select ok(has_function_privilege('authenticated', 'public.issue_attendance_qr()', 'EXECUTE'), 'authenticated can call the Super Admin-gated QR issuer');
select ok(has_function_privilege('authenticated', 'public.record_attendance_scan(text)', 'EXECUTE'), 'authenticated staff can call attendance scan');
select ok(has_function_privilege('authenticated', 'public.attendance_history(integer)', 'EXECUTE'), 'authenticated staff can call role-filtered attendance history');
select ok(not has_function_privilege('anon', 'public.record_attendance_scan(text)', 'EXECUTE'), 'anonymous users cannot record attendance');

select ok(has_function_privilege('authenticated', 'public.restock_inventory_idempotent(uuid,text,integer,text)', 'EXECUTE'), 'authenticated role can call the role-gated idempotent restock RPC');
select ok(has_function_privilege('authenticated', 'public.adjust_inventory_idempotent(uuid,text,integer,integer,text)', 'EXECUTE'), 'authenticated role can call the role-gated idempotent adjustment RPC');
select ok(not has_function_privilege('authenticated', 'public.restock_product(text,integer,text)', 'EXECUTE'), 'clients cannot bypass idempotent restock wrapper');
select ok(not has_function_privilege('authenticated', 'public.adjust_stock(text,integer,integer,text)', 'EXECUTE'), 'clients cannot bypass idempotent adjustment wrapper');

select ok(has_function_privilege('authenticated', 'public.record_sale(uuid,jsonb,text,uuid,boolean,text)', 'EXECUTE'), 'legacy customer system sale RPC grant is preserved');
select ok(has_function_privilege('authenticated', 'public.mark_sale_paid(uuid,integer)', 'EXECUTE'), 'legacy customer system payment RPC grant is preserved');

select * from finish();
rollback;
