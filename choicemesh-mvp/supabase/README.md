# Supabase setup

1. Create a Supabase project and enable an email sign-in method in **Authentication**.
2. Open **SQL Editor** and run `migrations/0001_choicemesh_core.sql` once.
3. Add the project URL and publishable key to `.env.local`:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

4. Do not add a service-role key to the browser or this project’s public environment variables.

The migration keeps `private_details.original_reply` and `private_details.parsed_detail` readable only by their owner. Shared UI must use `room_summary(room_id)` for status counts, and server actions/RPCs for proposal support and publishing.
