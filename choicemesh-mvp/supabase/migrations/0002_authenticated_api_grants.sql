-- The project was created with automatic Data API table exposure disabled.
-- Grant only the operations that the RLS policies already constrain.

grant usage on schema public to authenticated;

grant select on public.rooms, public.room_members, public.proposals,
  public.proposal_supports, public.private_details, public.published_versions to authenticated;

grant insert, update on public.proposals, public.proposal_supports,
  public.private_details to authenticated;

-- Keep shared state fresh for signed-in room members. Realtime still respects RLS.
do $$
declare table_name text;
begin
  foreach table_name in array array['rooms', 'proposals', 'private_details'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end;
$$;
