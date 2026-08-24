# Supabase setup

1. Create a Supabase project and enable an email sign-in method in **Authentication**.
2. Open **SQL Editor** and run the files in `migrations/` in numeric order.
3. Add the project URL and publishable key to `.env.local`:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

4. Do not add a service-role key to the browser or this project’s public environment variables.

The migrations keep `private_details.original_reply` and `private_details.parsed_detail` readable only by their owner. Shared UI must use `room_summary(room_id)` for status counts, and server actions/RPCs for proposal support and publishing. Migration `0004_pending_proposal_resolution.sql` adds a proposer-only withdrawal path and makes supporting one proposal close every competing pending proposal in the room, so an abandoned proposal cannot block publishing forever.

Run `npm run check:privacy` for a static structure check. It verifies required RLS declarations, owner-only private-detail policies, member-complete anonymous summaries, proposal-resolution transactions, and explicit RPC grants. This is not a substitute for two-account integration or penetration testing against a configured Supabase project.
