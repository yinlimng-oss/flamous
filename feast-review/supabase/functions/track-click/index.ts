// POST /functions/v1/track-click
//
// Fired when the customer taps "Post now" on the "Caption ready" screen.
// Marks that platform's social_posts row as clicked, and marks the session
// completed (this is the last step of the good-sentiment flow).
//
// Input:
// { "session_token": "...", "platform": "instagram" }
//
// Output:
// { "success": true }

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, handleOptions, jsonResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VALID_PLATFORMS = ["google", "xhs", "instagram", "facebook", "tiktok", "lemon8"];

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  let body: { session_token?: string; platform?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  if (!body.session_token || !VALID_PLATFORMS.includes(body.platform ?? "")) {
    return jsonResponse({ error: "session_token and a valid platform are required" }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: session, error: sessErr } = await supabase
    .from("review_sessions")
    .select("id")
    .eq("session_token", body.session_token)
    .single();
  if (sessErr || !session) return jsonResponse({ error: "Invalid session_token" }, 404);

  const { data: review, error: reviewErr } = await supabase
    .from("reviews")
    .select("id")
    .eq("session_id", session.id)
    .single();
  if (reviewErr || !review) return jsonResponse({ error: "No review found for this session" }, 404);

  const { error: postErr } = await supabase
    .from("social_posts")
    .update({ clicked_post: true, clicked_at: new Date().toISOString() })
    .eq("review_id", review.id)
    .eq("platform", body.platform);
  if (postErr) return jsonResponse({ error: postErr.message }, 500);

  await supabase
    .from("review_sessions")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", session.id)
    .is("completed_at", null);

  return jsonResponse({ success: true });
});
