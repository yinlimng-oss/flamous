// GET/POST /functions/v1/admin-analytics
//
// Auth: requires a valid Supabase Auth JWT (admin user). Uses the caller's own JWT
// (not the service role) so Postgres RLS + is_restaurant_admin() naturally scope
// results to what that admin is allowed to see — group/super admins see everything.
//
// Body (all optional filters):
// {
//   "restaurant_id": "uuid",
//   "outlet_id": "uuid",
//   "date_from": "2026-08-01",
//   "date_to": "2026-09-01",
//   "platform": "instagram",
//   "rating": 5,
//   "sentiment": "good" | "bad"
// }
//
// Response: aggregate metrics used by the Dashboard + Analytics pages.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, handleOptions, jsonResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

interface Filters {
  restaurant_id?: string;
  outlet_id?: string;
  date_from?: string;
  date_to?: string;
  platform?: string;
  rating?: number;
  sentiment?: "good" | "bad";
}

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse({ error: "Missing Authorization header" }, 401);

  // Use the caller's JWT so RLS scopes every query to their admin permissions.
  const supabase = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  let filters: Filters = {};
  if (req.method === "POST") {
    try { filters = await req.json(); } catch { /* no body is fine */ }
  }

  // Base query joining sessions -> reviews, filtered per request
  let q = supabase
    .from("reviews")
    .select("id, rating, created_at, session_id, review_sessions!inner(restaurant_id, outlet_id, sentiment, created_at)");

  if (filters.restaurant_id) q = q.eq("review_sessions.restaurant_id", filters.restaurant_id);
  if (filters.outlet_id) q = q.eq("review_sessions.outlet_id", filters.outlet_id);
  if (filters.sentiment) q = q.eq("review_sessions.sentiment", filters.sentiment);
  if (filters.rating) q = q.eq("rating", filters.rating);
  if (filters.date_from) q = q.gte("created_at", filters.date_from);
  if (filters.date_to) q = q.lte("created_at", filters.date_to);

  const { data: reviews, error } = await q;
  if (error) return jsonResponse({ error: error.message }, 500);

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay); startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const total = reviews?.length ?? 0;
  const today = reviews?.filter((r) => new Date(r.created_at) >= startOfDay).length ?? 0;
  const thisWeek = reviews?.filter((r) => new Date(r.created_at) >= startOfWeek).length ?? 0;
  const thisMonth = reviews?.filter((r) => new Date(r.created_at) >= startOfMonth).length ?? 0;

  const good = reviews?.filter((r: any) => r.review_sessions?.sentiment === "good").length ?? 0;
  const bad = reviews?.filter((r: any) => r.review_sessions?.sentiment === "bad").length ?? 0;
  const sentimentTotal = good + bad;
  const positivePct = sentimentTotal ? Math.round((good / sentimentTotal) * 1000) / 10 : 0;
  const negativePct = sentimentTotal ? Math.round((bad / sentimentTotal) * 1000) / 10 : 0;

  const ratedReviews = reviews?.filter((r) => r.rating != null) ?? [];
  const avgRating = ratedReviews.length
    ? Math.round((ratedReviews.reduce((s, r) => s + (r.rating ?? 0), 0) / ratedReviews.length) * 100) / 100
    : null;

  const byRestaurant: Record<string, number> = {};
  const byOutlet: Record<string, number> = {};
  for (const r of (reviews ?? []) as any[]) {
    const rid = r.review_sessions?.restaurant_id;
    const oid = r.review_sessions?.outlet_id;
    if (rid) byRestaurant[rid] = (byRestaurant[rid] ?? 0) + 1;
    if (oid) byOutlet[oid] = (byOutlet[oid] ?? 0) + 1;
  }

  // Categories: most-selected compliments and (from the bad path) most common issue tags
  const reviewIds = (reviews ?? []).map((r) => r.id);
  let mostSelectedCategories: { name: string; count: number }[] = [];
  if (reviewIds.length) {
    const { data: catResponses } = await supabase
      .from("review_category_responses")
      .select("category_id, review_categories(name, category_type)")
      .in("review_id", reviewIds)
      .eq("selected", true);
    const counts: Record<string, number> = {};
    for (const cr of (catResponses ?? []) as any[]) {
      const name = cr.review_categories?.name;
      if (name) counts[name] = (counts[name] ?? 0) + 1;
    }
    mostSelectedCategories = Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  // Photo upload rate: reviews with >=1 photo / total reviews
  let photoUploadRate = 0;
  if (reviewIds.length) {
    const { data: photoRows } = await supabase
      .from("review_photos")
      .select("review_id")
      .in("review_id", reviewIds);
    const withPhotos = new Set((photoRows ?? []).map((p) => p.review_id)).size;
    photoUploadRate = total ? Math.round((withPhotos / total) * 1000) / 10 : 0;
  }

  // Social platform breakdown + click-through rate
  let byPlatform: Record<string, number> = {};
  let ctr: Record<string, number> = {};
  if (reviewIds.length) {
    let sq = supabase.from("social_posts").select("platform, clicked_post").in("review_id", reviewIds);
    if (filters.platform) sq = sq.eq("platform", filters.platform);
    const { data: posts } = await sq;
    const totals: Record<string, { shown: number; clicked: number }> = {};
    for (const p of (posts ?? []) as any[]) {
      totals[p.platform] ??= { shown: 0, clicked: 0 };
      totals[p.platform].shown += 1;
      if (p.clicked_post) totals[p.platform].clicked += 1;
    }
    for (const [platform, t] of Object.entries(totals)) {
      byPlatform[platform] = t.shown;
      ctr[platform] = t.shown ? Math.round((t.clicked / t.shown) * 1000) / 10 : 0;
    }
  }

  return jsonResponse({
    total_reviews: total,
    reviews_today: today,
    reviews_this_week: thisWeek,
    reviews_this_month: thisMonth,
    positive_review_pct: positivePct,
    negative_review_pct: negativePct,
    average_rating: avgRating,
    reviews_by_restaurant: byRestaurant,
    reviews_by_outlet: byOutlet,
    reviews_by_platform: byPlatform,
    most_selected_categories: mostSelectedCategories,
    photo_upload_rate_pct: photoUploadRate,
    social_click_through_rate_pct: ctr,
  });
});
