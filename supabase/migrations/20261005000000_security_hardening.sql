-- Security hardening: persistent rate limiting, OTP attempt counter, approval tokens

create table if not exists rate_limits (
    key text primary key,
    count int not null,
    window_start timestamptz not null
);

alter table rate_limits enable row level security;
-- No policies: only the service role (which bypasses RLS) may access this table.

create or replace function rate_limit_hit(p_key text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    v_count int;
begin
    insert into rate_limits as rl (key, count, window_start)
    values (p_key, 1, now())
    on conflict (key) do update
        set count = case
                when rl.window_start < now() - make_interval(secs => p_window_seconds) then 1
                else rl.count + 1
            end,
            window_start = case
                when rl.window_start < now() - make_interval(secs => p_window_seconds) then now()
                else rl.window_start
            end
    returning count into v_count;

    return v_count <= p_limit;
end;
$$;

revoke all on function rate_limit_hit(text, int, int) from public, anon, authenticated;

alter table otp_codes add column if not exists attempts int not null default 0;

alter table requests
    add column if not exists approval_token text,
    add column if not exists approval_token_expiry timestamptz;

create unique index if not exists requests_approval_token_key
    on requests (approval_token) where approval_token is not null;
