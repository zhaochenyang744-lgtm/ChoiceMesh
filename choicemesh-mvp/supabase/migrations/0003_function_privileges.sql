-- Keep the RPC surface explicit. PostgreSQL grants EXECUTE on new functions to
-- PUBLIC by default, so remove that implicit grant and allow signed-in users only.

revoke execute on function public.is_room_member(uuid) from public, anon;
revoke execute on function public.create_room(text, timestamptz, smallint, text) from public, anon;
revoke execute on function public.join_room(text) from public, anon;
revoke execute on function public.support_proposal(uuid) from public, anon;
revoke execute on function public.room_summary(uuid) from public, anon;
revoke execute on function public.publish_room(uuid) from public, anon;

grant execute on function public.is_room_member(uuid) to authenticated;
grant execute on function public.create_room(text, timestamptz, smallint, text) to authenticated;
grant execute on function public.join_room(text) to authenticated;
grant execute on function public.support_proposal(uuid) to authenticated;
grant execute on function public.room_summary(uuid) to authenticated;
grant execute on function public.publish_room(uuid) to authenticated;
