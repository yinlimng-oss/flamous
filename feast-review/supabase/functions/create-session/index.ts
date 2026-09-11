// POST /functions/v1/create-session
//
// First call of the flow — fired when the QR landing page loads (or once the
// customer picks a language, whichever the frontend prefers). Creates the
// review_sessions row AND an empty reviews row up front (1:1, linked by session_id),
// so photos can be attached (upload-photo) before the review's own text/rating/
// captions exist — matching the live flow's order: photos are uploaded BEFORE
// caption generation.
//
// Input:
// { "restaurant_slug": "napa-refined", "outlet_qr_code": "trx", "language": "en" }
//
// Output:
// { "session_token": "...", "session_id": "...", "review_id": "...",
//   "restaurant": { "id", "name", "logo", ... }, "outlet": { "id", "outlet_name" } }

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, handleOptions, jsonResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VALID_LANGUAGES = ["en", "zh", "ms", "zh-Hant"];

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  let body: { restaurant_slug?: string; outlet_qr_code?: string; language?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  if (!body.restaurant_slug || !body.outlet_qr_code) {
    return jsonResponse({ error: "restaurant_slug and outlet_qr_code are required" }, 400);
  }
  const language = VALID_LANGUAGES.includes(body.language ?? "") ? body.language! : "en";

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: restaurant, error: restErr } = await supabase
    .from("restaurants")
    .select("id, name, logo, google_review_url, xhs_url, instagram_url, facebook_url, tiktok_url, lemon8_url")
    .eq("slug", body.restaurant_slug)
    .single();
  if (restErr || !restaurant) return jsonResponse({ error: "Unknown restaurant" }, 404);

  const { data: outlet, error: outletErr } = await supabase
    .from("outlets")
    .select("id, outlet_name")
    .eq("qr_code", `${body.restaurant_slug}/${body.outlet_qr_code}`)
    .eq("restaurant_id", restaurant.id)
    .eq("active", true)
    .single();
  if (outletErr || !outlet) return jsonResponse({ error: "Unknown or inactive outlet" }, 404);

  const { data: session, error: sessErr } = await supabase
    .from("review_sessions")
    .insert({ restaurant_id: restaurant.id, outlet_id: outlet.id, language })
    .select("id, session_token")
    .single();
  if (sessErr) return jsonResponse({ error: sessErr.message }, 500);

  const { data: review, error: revErr } = await supabase
    .from("reviews")
    .insert({ session_id: session.id })
    .select("id")
    .single();
  if (revErr) return jsonResponse({ error: revErr.message }, 500);

  return jsonResponse({
    session_token: session.session_token,
    session_id: session.id,
    review_id: review.id,
    restaurant,
    outlet,
  });
});
