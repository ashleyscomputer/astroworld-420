-- Astroworld 420 internal staff attendance.
-- Employees authenticate with their own account and scan a short-lived workplace QR.
-- QR tokens are random, expire quickly, are stored only as SHA-256 hashes, and can
-- be redeemed once per employee. Timestamps are server-generated timestamptz values.

create table public.attendance_qr_challenges (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  check (expires_at > created_at)
);

create table public.attendance_shifts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id),
  clock_in_at timestamptz not null,
  clock_out_at timestamptz,
  clock_in_challenge_id uuid not null references public.attendance_qr_challenges(id),
  clock_out_challenge_id uuid references public.attendance_qr_challenges(id),
  created_at timestamptz not null default now(),
  check (clock_out_at is null or clock_out_at > clock_in_at),
  check ((clock_out_at is null and clock_out_challenge_id is null)
      or (clock_out_at is not null and clock_out_challenge_id is not null))
);

create unique index attendance_one_open_shift_per_employee
  on public.attendance_shifts(employee_id) where clock_out_at is null;
create index attendance_shifts_employee_date_idx
  on public.attendance_shifts(employee_id, clock_in_at desc);

create table public.attendance_qr_redemptions (
  challenge_id uuid not null references public.attendance_qr_challenges(id),
  employee_id uuid not null references public.profiles(id),
  redeemed_at timestamptz not null default now(),
  primary key (challenge_id, employee_id)
);

create table public.attendance_events (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.attendance_shifts(id),
  employee_id uuid not null references public.profiles(id),
  event_type text not null check (event_type in ('clock_in', 'clock_out')),
  challenge_id uuid not null references public.attendance_qr_challenges(id),
  occurred_at timestamptz not null default now(),
  unique (shift_id, event_type)
);
create index attendance_events_employee_idx
  on public.attendance_events(employee_id, occurred_at desc);

alter table public.attendance_qr_challenges enable row level security;
alter table public.attendance_shifts enable row level security;
alter table public.attendance_qr_redemptions enable row level security;
alter table public.attendance_events enable row level security;

revoke all on public.attendance_qr_challenges, public.attendance_shifts,
  public.attendance_qr_redemptions, public.attendance_events
  from public, anon, authenticated;

create trigger attendance_events_append_only
  before update or delete on public.attendance_events
  for each row execute function app_private.deny_mutation();
create trigger attendance_events_no_truncate
  before truncate on public.attendance_events
  for each statement execute function app_private.deny_mutation();

create or replace function public.issue_attendance_qr()
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_token text;
  v_expires timestamptz := now() + interval '90 seconds';
  v_id uuid;
begin
  perform app_private.require_super();
  perform pg_advisory_xact_lock(hashtext('astroworld420-attendance-qr'));

  update public.attendance_qr_challenges
     set revoked_at = now()
   where revoked_at is null and expires_at > now();

  v_token := 'AW420TIME:' || encode(gen_random_bytes(32), 'hex');
  insert into public.attendance_qr_challenges(token_hash, created_by, expires_at)
  values (encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), auth.uid(), v_expires)
  returning id into v_id;

  perform app_private.audit(
    'attendance_qr_issued','attendance_qr',v_id::text,null,
    jsonb_build_object('expires_at',v_expires)
  );

  return jsonb_build_object('payload',v_token,'expires_at',v_expires,'ttl_seconds',90);
end $$;

create or replace function public.revoke_attendance_qr()
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_count int;
begin
  perform app_private.require_super();
  update public.attendance_qr_challenges
     set revoked_at = now()
   where revoked_at is null and expires_at > now();
  get diagnostics v_count = row_count;
  perform app_private.audit(
    'attendance_qr_revoked','attendance_qr',null,null,
    jsonb_build_object('revoked_count',v_count)
  );
  return jsonb_build_object('revoked_count',v_count);
end $$;

create or replace function public.record_attendance_scan(p_token text)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_challenge public.attendance_qr_challenges%rowtype;
  v_shift public.attendance_shifts%rowtype;
  v_now timestamptz := now();
  v_seconds bigint;
begin
  perform app_private.require_staff();

  if p_token is null or p_token !~ '^AW420TIME:[0-9a-f]{64}$' then
    raise exception 'INVALID_ATTENDANCE_QR';
  end if;

  select * into v_challenge
    from public.attendance_qr_challenges
   where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
     and revoked_at is null
     and expires_at > v_now
   for share;
  if not found then raise exception 'ATTENDANCE_QR_EXPIRED_OR_INVALID'; end if;

  -- Serialize each employee's check-in/check-out transitions.
  perform 1 from public.profiles where id = auth.uid() and active for update;
  if not found then raise exception 'NOT_AUTHENTICATED'; end if;

  insert into public.attendance_qr_redemptions(challenge_id, employee_id)
  values (v_challenge.id, auth.uid())
  on conflict do nothing;
  if not found then raise exception 'ATTENDANCE_QR_ALREADY_USED'; end if;

  select * into v_shift
    from public.attendance_shifts
   where employee_id = auth.uid() and clock_out_at is null
   for update;

  if found then
    update public.attendance_shifts
       set clock_out_at = v_now, clock_out_challenge_id = v_challenge.id
     where id = v_shift.id;

    insert into public.attendance_events(shift_id,employee_id,event_type,challenge_id,occurred_at)
    values (v_shift.id,auth.uid(),'clock_out',v_challenge.id,v_now);

    v_seconds := greatest(0, extract(epoch from (v_now - v_shift.clock_in_at))::bigint);
    perform app_private.audit(
      'employee_clocked_out','attendance_shift',v_shift.id::text,
      jsonb_build_object('clock_in_at',v_shift.clock_in_at),
      jsonb_build_object('clock_out_at',v_now,'duration_seconds',v_seconds)
    );

    return jsonb_build_object(
      'event','clock_out','shift_id',v_shift.id,
      'recorded_at',v_now,'duration_seconds',v_seconds
    );
  end if;

  insert into public.attendance_shifts(employee_id,clock_in_at,clock_in_challenge_id)
  values (auth.uid(),v_now,v_challenge.id)
  returning * into v_shift;

  insert into public.attendance_events(shift_id,employee_id,event_type,challenge_id,occurred_at)
  values (v_shift.id,auth.uid(),'clock_in',v_challenge.id,v_now);

  perform app_private.audit(
    'employee_clocked_in','attendance_shift',v_shift.id::text,null,
    jsonb_build_object('clock_in_at',v_now)
  );

  return jsonb_build_object(
    'event','clock_in','shift_id',v_shift.id,
    'recorded_at',v_now,'duration_seconds',0
  );
end $$;

create or replace function public.attendance_history(p_days int default 31)
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_role public.app_role;
  v_result jsonb;
begin
  v_role := app_private.require_staff();
  if p_days is null or p_days < 1 or p_days > 90 then
    raise exception 'INVALID_ATTENDANCE_RANGE';
  end if;

  select coalesce(jsonb_agg(row_to_json(t) order by t.clock_in_at desc), '[]'::jsonb)
    into v_result
    from (
      select s.id, s.employee_id, p.full_name as employee_name, p.username,
             s.clock_in_at, s.clock_out_at,
             greatest(0, extract(epoch from (coalesce(s.clock_out_at,now()) - s.clock_in_at))::bigint) as duration_seconds,
             (s.clock_out_at is null) as is_open
        from public.attendance_shifts s
        join public.profiles p on p.id = s.employee_id
       where s.clock_in_at >= now() - make_interval(days => p_days)
         and (v_role = 'super_admin' or s.employee_id = auth.uid())
       order by s.clock_in_at desc
       limit 500
    ) t;
  return v_result;
end $$;

revoke all on function public.issue_attendance_qr() from public, anon, authenticated;
revoke all on function public.revoke_attendance_qr() from public, anon, authenticated;
revoke all on function public.record_attendance_scan(text) from public, anon, authenticated;
revoke all on function public.attendance_history(int) from public, anon, authenticated;

grant execute on function public.issue_attendance_qr() to authenticated;
grant execute on function public.revoke_attendance_qr() to authenticated;
grant execute on function public.record_attendance_scan(text) to authenticated;
grant execute on function public.attendance_history(int) to authenticated;
