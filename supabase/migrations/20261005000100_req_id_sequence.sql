-- Atomic REQ-YYYY-NNNN generation (fixes race where concurrent submissions got the same id)

create table if not exists req_id_counters (
    year int primary key,
    last_value int not null
);

alter table req_id_counters enable row level security;
-- No policies: only the service role / security definer function may access this table.

create or replace function next_req_id(p_year int)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
    v_next int;
    v_seed int;
begin
    -- Seed value used only when the counter row is first created:
    -- highest existing number for that year (or 0), plus 1.
    select coalesce(max(nullif(regexp_replace(req_id, '^.*-', ''), '')::int), 0) + 1
      into v_seed
      from requests
     where req_id ~ ('^REQ-' || p_year::text || '-[0-9]+$');

    insert into req_id_counters as c (year, last_value)
    values (p_year, v_seed)
    on conflict (year) do update set last_value = c.last_value + 1
    returning last_value into v_next;

    return 'REQ-' || p_year::text || '-' || lpad(v_next::text, 4, '0');
end;
$$;

revoke all on function next_req_id(int) from public;
revoke all on function next_req_id(int) from anon;
revoke all on function next_req_id(int) from authenticated;
grant execute on function next_req_id(int) to service_role;

do $$
begin
    if exists (select 1 from requests group by req_id having count(*) > 1) then
        raise notice 'Duplicate req_id values exist; skipping unique index requests_req_id_key. Clean up duplicates and create it manually.';
    else
        create unique index if not exists requests_req_id_key on requests(req_id);
    end if;
end
$$;
