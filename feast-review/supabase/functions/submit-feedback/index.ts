// POST /functions/v1/submit-feedback
//
// The "bad" sentiment path: private feedback only. No AI captions, no photos,
// nothing posted to social platforms — matches the live flow's "Tell us what
// happened" screen (issue tags + free text, then straight to "Submit feedback").
//
// Input:
// { "session_token": "...", "issue_tags": ["Food issue","Waiting time"], "customer_comment": "..." }
//
// Output:
// { "review_id": "..." }

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, handleOptions, jsonResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VALID_ISSUE_TAGS = ["Food issue", "Service issue", "Waiting time", "Cleanliness", "Wrong order", "Others"];

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  let body: { session_token?: string; issue_tags?: string[]; customer_comment?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  if (!body.session_token || !body.customer_comment?.trim()) {
    return jsonResponse({ error: "session_token and customer_comment are required" }, 400);
  }
  const issueTags = (body.issue_tags ?? []).filter((t) => VALID_ISSUE_TAGS.includes(t));

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: session, error: sessErr } = await supabase
    .from("review_sessions")
    .select("id, completed_at")
    .eq("session_token", body.session_token)
    .single();
  if (sessErr || !session) return jsonResponse({ error: "Invalid session_token" }, 404);
  if (session.completed_at) return jsonResponse({ error: "This session was already completed" }, 409);

  const { data: review, error: revErr } = await supabase
    .from("reviews")
    .update({ customer_comment: body.customer_comment.trim(), issue_tags: issueTags })
    .eq("session_id", session.id)
    .select("id")
    .single();
  if (revErr) return jsonResponse({ error: revErr.message }, 500);

  const { error: updateErr } = await supabase
    .from("review_sessions")
    .update({ sentiment: "bad", completed_at: new Date().toISOString() })
    .eq("id", session.id);
  if (updateErr) return jsonResponse({ error: updateErr.message }, 500);

  return jsonResponse({ review_id: review.id });
});
