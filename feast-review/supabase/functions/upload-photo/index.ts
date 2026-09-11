// POST /functions/v1/upload-photo
// Content-Type: multipart/form-data
// Fields: session_token (text), photo (file)
//
// Validates jpg/jpeg/png/webp, max 10MB, and a max of 8 photos per review
// (2-photo minimum is enforced client-side, since it's about total count at
// submit time, not any single upload). Writes to the review-photos bucket at
// {restaurant_slug}/{session_id}/{uuid}.{ext} and inserts a review_photos row.
//
// Output:
// { "photo_id": "...", "storage_url": "...", "photo_count": 3 }
//
// Note: "Enhance Photo" (seen in the live flow's Original/Enhanced picker) needs
// a separate image-enhancement service — not part of the original spec, and no
// enhancement API was given, so `enhanced_storage_url` stays null here. Wire that
// in once you pick a provider; `selected_version` already supports 'enhanced'.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, handleOptions, jsonResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_PHOTOS = 8;
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonResponse({ error: "Expected multipart/form-data" }, 400);
  }

  const sessionToken = form.get("session_token");
  const photo = form.get("photo");
  if (typeof sessionToken !== "string" || !sessionToken) {
    return jsonResponse({ error: "session_token is required" }, 400);
  }
  if (!(photo instanceof File)) {
    return jsonResponse({ error: "photo file is required" }, 400);
  }

  const ext = ALLOWED_TYPES[photo.type];
  if (!ext) {
    return jsonResponse({ error: "Only jpg, jpeg, png, and webp images are allowed" }, 400);
  }
  if (photo.size > MAX_BYTES) {
    return jsonResponse({ error: "Photo exceeds the 10MB limit" }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: session, error: sessErr } = await supabase
    .from("review_sessions")
    .select("id, completed_at, restaurants(slug)")
    .eq("session_token", sessionToken)
    .single();
  if (sessErr || !session) return jsonResponse({ error: "Invalid session_token" }, 404);
  if (session.completed_at) return jsonResponse({ error: "This session was already completed" }, 409);

  const { data: review, error: reviewErr } = await supabase
    .from("reviews")
    .select("id")
    .eq("session_id", session.id)
    .single();
  if (reviewErr || !review) return jsonResponse({ error: "No review found for this session" }, 404);

  const { count: existingCount } = await supabase
    .from("review_photos")
    .select("id", { count: "exact", head: true })
    .eq("review_id", review.id);
  if ((existingCount ?? 0) >= MAX_PHOTOS) {
    return jsonResponse({ error: `Maximum of ${MAX_PHOTOS} photos per review` }, 400);
  }

  const restaurantSlug = (session as any).restaurants?.slug ?? "unknown";
  const path = `${restaurantSlug}/${session.id}/${crypto.randomUUID()}.${ext}`;
  const bytes = new Uint8Array(await photo.arrayBuffer());

  const { error: uploadErr } = await supabase.storage
    .from("review-photos")
    .upload(path, bytes, { contentType: photo.type, upsert: false });
  if (uploadErr) return jsonResponse({ error: uploadErr.message }, 500);

  const { data: publicUrlData } = supabase.storage.from("review-photos").getPublicUrl(path);

  const { data: photoRow, error: insertErr } = await supabase
    .from("review_photos")
    .insert({ review_id: review.id, original_storage_url: publicUrlData.publicUrl })
    .select("id")
    .single();
  if (insertErr) return jsonResponse({ error: insertErr.message }, 500);

  return jsonResponse({
    photo_id: photoRow.id,
    storage_url: publicUrlData.publicUrl,
    photo_count: (existingCount ?? 0) + 1,
  });
});
