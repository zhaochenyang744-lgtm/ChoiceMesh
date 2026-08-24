-- Give every pending proposal a deterministic exit path.
-- Supporting one change resolves all competing pending changes, while a
-- proposer can withdraw their own change without waiting for another member.

create or replace function public.support_proposal(p_proposal_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare proposal_row public.proposals%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into proposal_row from public.proposals where id = p_proposal_id for update;
  if proposal_row.id is null or proposal_row.status <> 'pending' then raise exception 'Proposal is not pending'; end if;
  if proposal_row.created_by = auth.uid() then raise exception 'A proposer cannot support their own proposal'; end if;
  if not public.is_room_member(proposal_row.room_id) then raise exception 'Not a room member'; end if;

  insert into public.proposal_supports (proposal_id, user_id)
  values (p_proposal_id, auth.uid())
  on conflict do nothing;

  update public.proposals set status = 'superseded'
    where room_id = proposal_row.room_id and status = 'current';
  update public.proposals set status = 'withdrawn'
    where room_id = proposal_row.room_id and status = 'pending' and id <> p_proposal_id;
  update public.proposals set status = 'current' where id = p_proposal_id;
  update public.rooms set current_proposal_id = p_proposal_id, updated_at = now()
    where id = proposal_row.room_id;
  update public.private_details set confirmed_at = null where room_id = proposal_row.room_id;
end;
$$;

create or replace function public.withdraw_proposal(p_proposal_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare proposal_row public.proposals%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into proposal_row from public.proposals where id = p_proposal_id for update;
  if proposal_row.id is null or proposal_row.status <> 'pending' then raise exception 'Proposal is not pending'; end if;
  if proposal_row.created_by <> auth.uid() then raise exception 'Only the proposer can withdraw this change'; end if;
  if not public.is_room_member(proposal_row.room_id) then raise exception 'Not a room member'; end if;

  update public.proposals set status = 'withdrawn' where id = p_proposal_id;
end;
$$;

revoke execute on function public.withdraw_proposal(uuid) from public, anon;
grant execute on function public.withdraw_proposal(uuid) to authenticated;
