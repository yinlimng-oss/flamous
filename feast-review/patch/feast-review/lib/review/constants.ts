// Shared constants for the public /r/[slug] review flow. These mirror the
// validation lists hard-coded in the Supabase Edge Functions
// (supabase/functions/submit-feedback, generate-review) — keep them in sync
// if those functions change.

export const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  zh: "中文",
  ms: "Bahasa Melayu",
  "zh-Hant": "繁體中文",
};

export const DEFAULT_LANGUAGE = "en";

// Must match VALID_ISSUE_TAGS in supabase/functions/submit-feedback/index.ts
export const ISSUE_TAGS = [
  "Food issue",
  "Service issue",
  "Waiting time",
  "Cleanliness",
  "Wrong order",
  "Others",
];

export type Platform =
  | "google"
  | "xhs"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "lemon8";

export const PLATFORM_LABELS: Record<Platform, string> = {
  google: "Google",
  xhs: "小红书 Xiaohongshu",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  lemon8: "Lemon8",
};

// Restaurant table column that holds each platform's outbound share/post URL.
export const PLATFORM_URL_FIELD: Record<Platform, string> = {
  google: "google_review_url",
  xhs: "xhs_url",
  instagram: "instagram_url",
  facebook: "facebook_url",
  tiktok: "tiktok_url",
  lemon8: "lemon8_url",
};

export const ALL_PLATFORMS = Object.keys(PLATFORM_LABELS) as Platform[];

// Rating threshold that routes the customer down the "good" (public social
// share) path vs the "bad" (private feedback only) path.
export const GOOD_SENTIMENT_MIN_RATING = 4;

export const MIN_RECOMMENDED_PHOTOS = 2;
export const MAX_PHOTOS = 8;
