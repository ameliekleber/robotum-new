-- Per-area permissions in the database (RLS), driven by public.access_grants.
--
-- Run AFTER 0006_access_control.sql (needs can_access / access_area).
-- Safe to re-run.
--
-- Area -> tables:
--   events    : events
--   faqs      : faqs
--   partners  : partners
--   projects  : projects
--   inventory : inventory_items, inventory_loans, inventory_loan_requests
--   members   : members_personal, member_memberships, member_projects
--   storage   : bucket "assets", by folder (events/, projects/, partners/,
--               members/; "others/" needs write on any area)
--
-- How it works (Postgres OR's permissive policies and AND's restrictive ones):
--   * PERMISSIVE "Area readers/writers ..." policies GRANT access to anyone
--     with can_access(area, level). is_admin is included in can_access, so
--     full admins keep working exactly as before.
--   * RESTRICTIVE "Area write guard ..." policies CAP writes by signed-in
--     users at can_access(area, 'write'). They make sure no older, looser
--     policy (several of these tables got policies in the dashboard, not in
--     migrations) still lets any signed-in user write.
--   Public SELECT policies (the public website) are not touched; the guards
--   only cover INSERT / UPDATE / DELETE.
--   Edge Functions (service_role) and SECURITY DEFINER triggers bypass RLS,
--   so member automation keeps working.
--
-- inventory_loan_requests gets no write guard: members must still be able to
-- create their own loan requests (policy "Members create own inventory requests").
--
-- After running, review what is left with the audit query at the bottom.

-- ---------------------------------------------------------------------------
-- 1) Tables
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
  v_read  text;
  v_write text;
begin
  for r in
    select * from (values
      ('events',                  'events',    true),
      ('faqs',                    'faqs',      true),
      ('partners',                'partners',  true),
      ('projects',                'projects',  true),
      ('inventory_items',         'inventory', true),
      ('inventory_loans',         'inventory', true),
      ('inventory_loan_requests', 'inventory', false),
      ('members_personal',        'members',   true),
      ('member_memberships',      'members',   true),
      ('member_projects',         'members',   true)
    ) as t(tbl, area, guard)
  loop
    -- (select ...) makes Postgres evaluate the check once per statement, not per row.
    v_read  := format('(select public.can_access(%L, %L))', r.area, 'read');
    v_write := format('(select public.can_access(%L, %L))', r.area, 'write');

    execute format('alter table public.%I enable row level security', r.tbl);

    -- Permissive: who may read / write this area.
    execute format('drop policy if exists "Area readers select" on public.%I', r.tbl);
    execute format('create policy "Area readers select" on public.%I
                    for select to authenticated using (%s)', r.tbl, v_read);

    execute format('drop policy if exists "Area writers insert" on public.%I', r.tbl);
    execute format('create policy "Area writers insert" on public.%I
                    for insert to authenticated with check (%s)', r.tbl, v_write);

    execute format('drop policy if exists "Area writers update" on public.%I', r.tbl);
    execute format('create policy "Area writers update" on public.%I
                    for update to authenticated using (%s) with check (%s)', r.tbl, v_write, v_write);

    execute format('drop policy if exists "Area writers delete" on public.%I', r.tbl);
    execute format('create policy "Area writers delete" on public.%I
                    for delete to authenticated using (%s)', r.tbl, v_write);

    -- Restrictive: signed-in users can never write without the grant.
    execute format('drop policy if exists "Area write guard insert" on public.%I', r.tbl);
    execute format('drop policy if exists "Area write guard update" on public.%I', r.tbl);
    execute format('drop policy if exists "Area write guard delete" on public.%I', r.tbl);
    if r.guard then
      execute format('create policy "Area write guard insert" on public.%I
                      as restrictive for insert to authenticated with check (%s)', r.tbl, v_write);
      execute format('create policy "Area write guard update" on public.%I
                      as restrictive for update to authenticated using (%s) with check (%s)', r.tbl, v_write, v_write);
      execute format('create policy "Area write guard delete" on public.%I
                      as restrictive for delete to authenticated using (%s)', r.tbl, v_write);
    end if;
  end loop;
end $$;

-- The old is_admin-only policies are fully covered by the ones above
-- (can_access includes is_admin), so remove them to keep one source of truth.
drop policy if exists "Admins manage inventory items"    on public.inventory_items;
drop policy if exists "Admins manage inventory loans"    on public.inventory_loans;
drop policy if exists "Admins manage inventory requests" on public.inventory_loan_requests;
drop policy if exists "Admins manage member memberships" on public.member_memberships;
drop policy if exists "Admins manage member projects"    on public.member_projects;

-- ---------------------------------------------------------------------------
-- 2) Storage: bucket "assets" (cover images / logos uploaded from /admin)
-- ---------------------------------------------------------------------------

-- Which admin area owns a file in the "assets" bucket (null = any area).
create or replace function public.asset_path_area(p_name text)
returns public.access_area
language sql
immutable
set search_path = ''
as $$
  select case split_part(p_name, '/', 1)
    when 'events'   then 'events'::public.access_area
    when 'projects' then 'projects'::public.access_area
    when 'partners' then 'partners'::public.access_area
    when 'members'  then 'members'::public.access_area
    else null
  end;
$$;

grant execute on function public.asset_path_area(text) to authenticated;

drop policy if exists "Area writers upload assets" on storage.objects;
create policy "Area writers upload assets" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'assets'
              and public.can_access(public.asset_path_area(name), 'write'));

drop policy if exists "Area writers update assets" on storage.objects;
create policy "Area writers update assets" on storage.objects
  for update to authenticated
  using (bucket_id = 'assets'
         and public.can_access(public.asset_path_area(name), 'write'))
  with check (bucket_id = 'assets'
              and public.can_access(public.asset_path_area(name), 'write'));

drop policy if exists "Area writers delete assets" on storage.objects;
create policy "Area writers delete assets" on storage.objects
  for delete to authenticated
  using (bucket_id = 'assets'
         and public.can_access(public.asset_path_area(name), 'write'));

-- Guards only apply inside the "assets" bucket; other buckets are unaffected.
drop policy if exists "Area write guard insert assets" on storage.objects;
create policy "Area write guard insert assets" on storage.objects
  as restrictive for insert to authenticated
  with check (bucket_id <> 'assets'
              or public.can_access(public.asset_path_area(name), 'write'));

drop policy if exists "Area write guard update assets" on storage.objects;
create policy "Area write guard update assets" on storage.objects
  as restrictive for update to authenticated
  using (bucket_id <> 'assets'
         or public.can_access(public.asset_path_area(name), 'write'))
  with check (bucket_id <> 'assets'
              or public.can_access(public.asset_path_area(name), 'write'));

drop policy if exists "Area write guard delete assets" on storage.objects;
create policy "Area write guard delete assets" on storage.objects
  as restrictive for delete to authenticated
  using (bucket_id <> 'assets'
         or public.can_access(public.asset_path_area(name), 'write'));

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- 3) Audit (run by hand, read the result):
--    every policy on these tables that is NOT from this migration. Look for
--    anything granting INSERT/UPDATE/DELETE/ALL to `anon` or `public` - the
--    guards above only cover signed-in users.
-- ---------------------------------------------------------------------------
-- select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- from pg_policies
-- where (schemaname = 'public' and tablename in (
--          'events','faqs','partners','projects',
--          'inventory_items','inventory_loans','inventory_loan_requests',
--          'members_personal','member_memberships','member_projects'))
--    or (schemaname = 'storage' and tablename = 'objects')
-- order by tablename, policyname;
