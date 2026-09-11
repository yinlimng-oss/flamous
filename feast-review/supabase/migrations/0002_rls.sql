-- ============================================================
-- Row Level Security
-- Model: anonymous customers can INSERT their own review session
-- data (via anon key) but can never SELECT admin data. Admins
-- read/write scoped to their restaurant via restaurant_admins.
-- ============================================================

-- Helper: does the current user administer this restaurant (or all, if group/super admin)?
create or replace function is_restaurant_admin(target_restaurant_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from restaurant_admins ra
    where ra.user_id = auth.uid()
      and (ra.restaurant_id = target_restaurant_id or ra.restaurant_id is null)
  );
$$;

create or replace function is_group_or_super_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from restaurant_admins ra
    where ra.user_id = auth.uid()
      and ra.restaurant_id is null
      and ra.role in ('super_admin', 'group_admin')
  );
$$;

alter table restaurants enable row level security;
alter table outlets enable row level security;
alter table review_categories enable row level security;
alter table visit_types enable row level security;
alter table customers enable row level security;
alter table review_sessions enable row level security;
alter table reviews enable row level security;
alter table review_category_responses enable row level security;
alter table review_photos enable row level security;
alter table social_posts enable row level security;
alter table restaurant_admins enable row level security;

-- restaurants: public can read basic brand info (needed to render the QR landing page),
-- only admins can write
create policy "public read restaurants" on restaurants for select using (true);
create policy "admins write restaurants" on restaurants for all
  using (is_restaurant_admin(id)) with check (is_restaurant_admin(id));

create policy "public read active outlets" on outlets for select using (active = true or is_restaurant_admin(restaurant_id));
create policy "admins write outlets" on outlets for all
  using (is_restaurant_admin(restaurant_id)) with check (is_restaurant_admin(restaurant_id));

create policy "public read categories" on review_categories for select using (true);
create policy "admins write categories" on review_categories for all
  using (restaurant_id is null or is_restaurant_admin(restaurant_id))
  with check (restaurant_id is null or is_restaurant_admin(restaurant_id));

create policy "public read visit_types" on visit_types for select using (true);
create policy "admins write visit_types" on visit_types for all
  using (restaurant_id is null or is_restaurant_admin(restaurant_id))
  with check (restaurant_id is null or is_restaurant_admin(restaurant_id));

-- customers: NEVER readable by anon; a customer can only insert their own row (once,
-- via the edge function using the service role — see note below). Admins can read only
-- customers linked to sessions at their restaurant.
create policy "admins read customers" on customers for select using (
  exists (
    select 1 from review_sessions rs
    where rs.customer_id = customers.id and is_restaurant_admin(rs.restaurant_id)
  )
  or is_group_or_super_admin()
);
-- No anon select/update/delete policy exists => denied by default.
-- Inserts happen server-side (edge function, service role) after validating input.

-- review_sessions: anon may insert a session for an active outlet, and may select/update
-- ONLY the row matching the session_token they hold (passed back from the create call).
-- We do not allow anon SELECT by primary key browsing — the token is the capability.
create policy "anon create session" on review_sessions for insert
  with check (
    exists (select 1 from outlets o where o.id = outlet_id and o.active = true and o.restaurant_id = restaurant_id)
  );
create policy "anon read own session by token" on review_sessions for select
  using (session_token = current_setting('request.jwt.claims', true)::json ->> 'session_token'
         or is_restaurant_admin(restaurant_id) or is_group_or_super_admin());
create policy "anon complete own session" on review_sessions for update
  using (session_token = current_setting('request.jwt.claims', true)::json ->> 'session_token')
  with check (session_token = current_setting('request.jwt.claims', true)::json ->> 'session_token');

-- reviews / responses / photos / social_posts: written by the customer only through the
-- session they own; readable by that session owner (for the "caption ready" step) and by
-- restaurant admins. Recommended: perform customer-side writes through the Edge Function
-- (service role) rather than granting broad anon insert, to keep validation server-side.
create policy "admins read reviews" on reviews for select using (
  exists (select 1 from review_sessions rs where rs.id = session_id and (is_restaurant_admin(rs.restaurant_id) or is_group_or_super_admin()))
);
create policy "session owner read own review" on reviews for select using (
  exists (select 1 from review_sessions rs where rs.id = session_id
    and rs.session_token = current_setting('request.jwt.claims', true)::json ->> 'session_token')
);

create policy "admins read category responses" on review_category_responses for select using (
  exists (select 1 from reviews r join review_sessions rs on rs.id = r.session_id
    where r.id = review_id and (is_restaurant_admin(rs.restaurant_id) or is_group_or_super_admin()))
);

create policy "admins read photos" on review_photos for select using (
  exists (select 1 from reviews r join review_sessions rs on rs.id = r.session_id
    where r.id = review_id and (is_restaurant_admin(rs.restaurant_id) or is_group_or_super_admin()))
);
create policy "session owner read own photos" on review_photos for select using (
  exists (select 1 from reviews r join review_sessions rs on rs.id = r.session_id
    where r.id = review_id and rs.session_token = current_setting('request.jwt.claims', true)::json ->> 'session_token')
);

create policy "admins read social posts" on social_posts for select using (
  exists (select 1 from reviews r join review_sessions rs on rs.id = r.session_id
    where r.id = review_id and (is_restaurant_admin(rs.restaurant_id) or is_group_or_super_admin()))
);
create policy "session owner read own social posts" on social_posts for select using (
  exists (select 1 from reviews r join review_sessions rs on rs.id = r.session_id
    where r.id = review_id and rs.session_token = current_setting('request.jwt.claims', true)::json ->> 'session_token')
);
create policy "session owner mark clicked" on social_posts for update using (
  exists (select 1 from reviews r join review_sessions rs on rs.id = r.session_id
    where r.id = review_id and rs.session_token = current_setting('request.jwt.claims', true)::json ->> 'session_token')
) with check (true);

-- restaurant_admins: users can see their own admin row(s); group/super admins see all
create policy "self read admin row" on restaurant_admins for select using (
  user_id = auth.uid() or is_group_or_super_admin()
);
create policy "super admin manages admins" on restaurant_admins for all using (
  exists (select 1 from restaurant_admins ra where ra.user_id = auth.uid() and ra.restaurant_id is null and ra.role = 'super_admin')
);

-- NOTE ON THE session_token APPROACH:
-- Supabase's anon key has no per-row identity by default. The cleanest, most secure
-- pattern (used above conceptually) is to NOT expose direct table INSERT to anon at all,
-- and instead route every customer-facing write through the `submit-review` Edge Function
-- using the service role key server-side, after validating the session_token the client
-- holds in memory/localStorage. This avoids relying on custom JWT claims (which requires
-- extra Supabase Auth configuration to populate) and keeps all validation in one place.
-- See supabase/functions/README notes for the recommended flow.
