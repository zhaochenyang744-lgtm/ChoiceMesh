-- ChoiceMesh core schema. Run in the Supabase SQL Editor before connecting the app.
-- Raw member replies and parsed conditions stay in private_details; shared screens use room_summary().

create extension if not exists pgcrypto;

create type public.attendance_status as enum ('attending', 'uncertain', 'cannot_attend', 'not_specified');
create type public.proposal_status as enum ('current', 'pending', 'superseded', 'withdrawn');

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 160),
  starts_at timestamptz,
  minimum_confirmations smallint not null default 3 check (minimum_confirmations > 0),
  invite_code text not null unique default encode(gen_random_bytes(8), 'hex'),
  created_by uuid not null references auth.users(id) on delete cascade,
  current_proposal_id uuid,
  published_version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.room_members (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 180),
  starts_at timestamptz,
  estimated_cost numeric(10,2) check (estimated_cost is null or estimated_cost >= 0),
  note text,
  status public.proposal_status not null default 'pending',
  created_by uuid not null references auth.users(id) on delete cascade,
  base_proposal_id uuid references public.proposals(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.rooms
  add constraint rooms_current_proposal_fkey
  foreign key (current_proposal_id) references public.proposals(id) on delete set null;

create table public.proposal_supports (
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (proposal_id, user_id)
);

create table public.private_details (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  original_reply text,
  parsed_detail jsonb not null default '{}'::jsonb,
  attendance public.attendance_status not null default 'not_specified',
  confirmed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (room_id, user_id),
  check (original_reply is null or char_length(original_reply) <= 4000)
);

create table public.published_versions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  version integer not null,
  proposal_snapshot jsonb not null,
  published_by uuid not null references auth.users(id) on delete restrict,
  published_at timestamptz not null default now(),
  unique (room_id, version)
);

create index proposals_room_status_idx on public.proposals(room_id, status);
create index private_details_room_idx on public.private_details(room_id);

-- Security-definer membership test prevents RLS recursion in policies.
create or replace function public.is_room_member(target_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.room_members
    where room_id = target_room_id and user_id = auth.uid()
  );
$$;

alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.proposals enable row level security;
alter table public.proposal_supports enable row level security;
alter table public.private_details enable row level security;
alter table public.published_versions enable row level security;

create policy "room members can read rooms" on public.rooms
for select to authenticated using (public.is_room_member(id));

create policy "room members can read member list" on public.room_members
for select to authenticated using (public.is_room_member(room_id));

create policy "room members can read proposals" on public.proposals
for select to authenticated using (public.is_room_member(room_id));

create policy "members can add pending proposals" on public.proposals
for insert to authenticated with check (
  public.is_room_member(room_id)
  and created_by = auth.uid()
  and status = 'pending'
);

create policy "members can withdraw their pending proposal" on public.proposals
for update to authenticated using (
  public.is_room_member(room_id)
  and created_by = auth.uid()
  and status = 'pending'
) with check (status = 'withdrawn');

create policy "members can read proposal supports" on public.proposal_supports
for select to authenticated using (
  exists (select 1 from public.proposals p where p.id = proposal_id and public.is_room_member(p.room_id))
);

create policy "members can support another proposal" on public.proposal_supports
for insert to authenticated with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.proposals p
    where p.id = proposal_id
      and p.status = 'pending'
      and p.created_by <> auth.uid()
      and public.is_room_member(p.room_id)
  )
);

-- This is the strict privacy boundary: no member can select another member's row.
create policy "members can read their own private details" on public.private_details
for select to authenticated using (user_id = auth.uid());

create policy "members can insert their own private details" on public.private_details
for insert to authenticated with check (user_id = auth.uid() and public.is_room_member(room_id));

create policy "members can update their own private details" on public.private_details
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "room members can read published versions" on public.published_versions
for select to authenticated using (public.is_room_member(room_id));

-- A signed-in user can create a room and becomes its first member.
create or replace function public.create_room(
  p_title text,
  p_starts_at timestamptz,
  p_minimum_confirmations smallint,
  p_proposal_title text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_room_id uuid;
  new_proposal_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.rooms (title, starts_at, minimum_confirmations, created_by)
  values (p_title, p_starts_at, p_minimum_confirmations, auth.uid())
  returning id into new_room_id;

  insert into public.room_members (room_id, user_id) values (new_room_id, auth.uid());
  insert into public.proposals (room_id, title, status, created_by)
  values (new_room_id, p_proposal_title, 'current', auth.uid())
  returning id into new_proposal_id;
  update public.rooms set current_proposal_id = new_proposal_id where id = new_room_id;
  return new_room_id;
end;
$$;

-- Invite codes only add the current account; they do not disclose private member data.
create or replace function public.join_room(p_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare target_room_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select id into target_room_id from public.rooms where invite_code = lower(p_invite_code);
  if target_room_id is null then raise exception 'Invite not found'; end if;
  insert into public.room_members (room_id, user_id)
  values (target_room_id, auth.uid())
  on conflict do nothing;
  return target_room_id;
end;
$$;

-- A pending proposal becomes current only with support from a different member.
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

  insert into public.proposal_supports (proposal_id, user_id) values (p_proposal_id, auth.uid()) on conflict do nothing;
  update public.proposals set status = 'superseded'
    where room_id = proposal_row.room_id and status = 'current';
  update public.proposals set status = 'current' where id = p_proposal_id;
  update public.rooms set current_proposal_id = p_proposal_id, updated_at = now() where id = proposal_row.room_id;
  -- A new current proposal always requires each member to reconfirm their own details.
  update public.private_details set confirmed_at = null where room_id = proposal_row.room_id;
end;
$$;

-- Anonymous data only. This function never returns an identity, reply, travel limit, or budget limit.
create or replace function public.room_summary(p_room_id uuid)
returns table (
  response_count bigint,
  confirmed_count bigint,
  cannot_attend_count bigint,
  uncertain_count bigint,
  boundary_risk_count bigint,
  minimum_required smallint,
  can_publish boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with current_room as (
    select r.*, p.estimated_cost
    from public.rooms r left join public.proposals p on p.id = r.current_proposal_id
    where r.id = p_room_id
  ), detail_counts as (
    select
      count(*) filter (where d.confirmed_at is not null) as response_count,
      count(*) filter (where d.confirmed_at is not null and d.attendance = 'attending') as confirmed_count,
      count(*) filter (where d.confirmed_at is not null and d.attendance = 'cannot_attend') as cannot_attend_count,
      count(*) filter (where d.confirmed_at is null or d.attendance in ('uncertain', 'not_specified')) as uncertain_count,
      count(*) filter (
        where d.confirmed_at is not null
          and c.estimated_cost is not null
          and nullif(d.parsed_detail ->> 'budget_limit', '')::numeric <= c.estimated_cost
      ) as boundary_risk_count
    from current_room c
    left join public.private_details d on d.room_id = c.id
  )
  select d.response_count, d.confirmed_count, d.cannot_attend_count, d.uncertain_count,
    d.boundary_risk_count, c.minimum_confirmations,
    (d.confirmed_count >= c.minimum_confirmations and not exists (
      select 1 from public.proposals p where p.room_id = c.id and p.status = 'pending'
    )) as can_publish
  from current_room c cross join detail_counts d
  where public.is_room_member(c.id);
$$;

-- Any room member may publish once the explicit shared rule is met.
create or replace function public.publish_room(p_room_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare next_version integer; proposal_snapshot jsonb; summary record;
begin
  if auth.uid() is null or not public.is_room_member(p_room_id) then raise exception 'Not a room member'; end if;
  select * into summary from public.room_summary(p_room_id);
  if not summary.can_publish then raise exception 'The room is not ready to publish'; end if;
  select jsonb_build_object('id', p.id, 'title', p.title, 'starts_at', p.starts_at, 'estimated_cost', p.estimated_cost)
    into proposal_snapshot
    from public.rooms r join public.proposals p on p.id = r.current_proposal_id where r.id = p_room_id;
  update public.rooms set published_version = published_version + 1, updated_at = now()
    where id = p_room_id returning published_version into next_version;
  insert into public.published_versions (room_id, version, proposal_snapshot, published_by)
    values (p_room_id, next_version, proposal_snapshot, auth.uid());
  return next_version;
end;
$$;

grant execute on function public.create_room(text, timestamptz, smallint, text) to authenticated;
grant execute on function public.join_room(text) to authenticated;
grant execute on function public.support_proposal(uuid) to authenticated;
grant execute on function public.room_summary(uuid) to authenticated;
grant execute on function public.publish_room(uuid) to authenticated;

-- RLS decides which rows are visible. These grants only allow the Data API to
-- reach tables for signed-in users when automatic table exposure is disabled.
grant usage on schema public to authenticated;
grant select on public.rooms, public.room_members, public.proposals,
  public.proposal_supports, public.private_details, public.published_versions to authenticated;
grant insert, update on public.proposals, public.proposal_supports,
  public.private_details to authenticated;
