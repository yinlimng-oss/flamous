"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ALL_PLATFORMS,
  DEFAULT_LANGUAGE,
  GOOD_SENTIMENT_MIN_RATING,
  ISSUE_TAGS,
  LANGUAGE_LABELS,
  MAX_PHOTOS,
  MIN_RECOMMENDED_PHOTOS,
  PLATFORM_LABELS,
  type Platform,
} from "@/lib/review/constants";

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  languages: string[];
  google_review_url: string | null;
  xhs_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  lemon8_url: string | null;
}

interface Outlet {
  id: string;
  outlet_name: string;
}

interface NamedRow {
  id: string;
  name: string;
}

interface ReviewFlowProps {
  restaurant: Restaurant;
  outlet: Outlet;
  outletCode: string;
  visitTypes: NamedRow[];
  categories: NamedRow[];
}

type Step =
  | "connecting"
  | "connect-error"
  | "rating"
  | "good-details"
  | "good-photos"
  | "good-share"
  | "bad-details"
  | "done-good"
  | "done-bad";

type Captions = Record<
  Platform,
  { short: string; natural: string; detailed: string }
>;
type CaptionStyle = "short" | "natural" | "detailed";

function getPlatformUrl(restaurant: Restaurant, platform: Platform): string | null {
  switch (platform) {
    case "google":
      return restaurant.google_review_url;
    case "xhs":
      return restaurant.xhs_url;
    case "instagram":
      return restaurant.instagram_url;
    case "facebook":
      return restaurant.facebook_url;
    case "tiktok":
      return restaurant.tiktok_url;
    case "lemon8":
      return restaurant.lemon8_url;
  }
}

const btnPrimary =
  "inline-flex items-center justify-center rounded-admin bg-primary px-5 py-2.5 font-medium text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40";
const btnSecondary =
  "inline-flex items-center justify-center rounded-admin border border-border bg-surface px-5 py-2.5 font-medium text-ink transition hover:bg-paper";
const chipBase =
  "inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm transition cursor-pointer select-none";
const chipOn = `${chipBase} border-primary bg-primary text-white`;
const chipOff = `${chipBase} border-border bg-surface text-ink hover:border-primary`;

export default function ReviewFlow({
  restaurant,
  outlet,
  outletCode,
  visitTypes,
  categories,
}: ReviewFlowProps) {
  const [language, setLanguage] = useState(
    restaurant.languages?.includes(DEFAULT_LANGUAGE)
      ? DEFAULT_LANGUAGE
      : restaurant.languages?.[0] ?? DEFAULT_LANGUAGE
  );
  const [step, setStep] = useState<Step>("connecting");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [rating, setRating] = useState(0);
  const [selectedVisitTypes, setSelectedVisitTypes] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [issueTags, setIssueTags] = useState<string[]>([]);

  const [photoCount, setPhotoCount] = useState(0);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [captions, setCaptions] = useState<Captions | null>(null);
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>("natural");
  const [postedPlatforms, setPostedPlatforms] = useState<Set<Platform>>(new Set());

  const availablePlatforms = useMemo(
    () => ALL_PLATFORMS.filter((p) => Boolean(getPlatformUrl(restaurant, p))),
    [restaurant]
  );

  async function startSession() {
    setStep("connecting");
    setError(null);
    try {
      const resp = await fetch("/api/review/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_slug: restaurant.slug,
          outlet_qr_code: outletCode,
          language,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.session_token) {
        setError(data.error ?? "Could not start your review session.");
        setStep("connect-error");
        return;
      }
      setSessionToken(data.session_token);
      setStep("rating");
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setStep("connect-error");
    }
  }

  // Fired once, as soon as the QR landing page loads.
  useEffect(() => {
    startSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(list: string[], value: string, setList: (v: string[]) => void) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function continueFromRating() {
    if (rating === 0) return;
    setStep(rating >= GOOD_SENTIMENT_MIN_RATING ? "good-details" : "bad-details");
  }

  async function handlePhotoSelect(files: FileList | null) {
    if (!files || !files.length || !sessionToken) return;
    setPhotoError(null);
    setUploadingPhoto(true);
    try {
      for (const file of Array.from(files)) {
        if (photoCount >= MAX_PHOTOS) break;
        const form = new FormData();
        form.append("session_token", sessionToken);
        form.append("photo", file);
        const resp = await fetch("/api/review/upload-photo", {
          method: "POST",
          body: form,
        });
        const data = await resp.json();
        if (!resp.ok) {
          setPhotoError(data.error ?? "That photo couldn't be uploaded.");
          continue;
        }
        setPhotoCount(data.photo_count ?? photoCount + 1);
      }
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function submitGoodReview() {
    if (!sessionToken || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const resp = await fetch("/api/review/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_token: sessionToken,
          restaurant_slug: restaurant.slug,
          language,
          sentiment: "good",
          visit_types: selectedVisitTypes,
          categories: selectedCategories,
          customer_comment: comment.trim(),
          rating,
          platforms: availablePlatforms,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error ?? "Something went wrong generating your review.");
        return;
      }
      setCaptions(data.captions);
      setStep("good-share");
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitBadFeedback() {
    if (!sessionToken || submitting || !comment.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const resp = await fetch("/api/review/submit-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_token: sessionToken,
          issue_tags: issueTags,
          customer_comment: comment.trim(),
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error ?? "Something went wrong submitting your feedback.");
        return;
      }
      setStep("done-bad");
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function postToPlatform(platform: Platform) {
    if (!sessionToken || !captions) return;
    const caption = captions[platform]?.[captionStyle] ?? "";
    try {
      await navigator.clipboard?.writeText(caption);
    } catch {
      // clipboard access denied — not fatal, the caption is still shown on screen
    }
    const url = getPlatformUrl(restaurant, platform);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    try {
      await fetch("/api/review/track-click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_token: sessionToken, platform }),
      });
    } catch {
      // best-effort — a failed click-tracking call shouldn't block the customer
    }
    setPostedPlatforms((prev) => new Set(prev).add(platform));
  }

  const showLanguagePicker = step === "connecting" || step === "connect-error" || step === "rating";
  const showInlineError =
    error &&
    step !== "connect-error" &&
    (step === "good-details" || step === "good-photos" || step === "bad-details" || step === "good-share");

  return (
    <main className="min-h-screen bg-paper text-ink font-ui flex items-start justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center">
          {restaurant.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={restaurant.logo}
              alt={restaurant.name}
              className="mx-auto mb-3 h-14 w-14 rounded-full object-cover"
            />
          )}
          <h1 className="font-display text-2xl">{restaurant.name}</h1>
          <p className="text-ink-muted text-sm mt-1">{outlet.outlet_name}</p>

          {showLanguagePicker && restaurant.languages?.length > 1 && (
            <div className="flex justify-center gap-2 mt-4 flex-wrap">
              {restaurant.languages.map((code) => (
                <button
                  key={code}
                  onClick={() => setLanguage(code)}
                  className={language === code ? chipOn : chipOff}
                >
                  {LANGUAGE_LABELS[code] ?? code}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 bg-surface border border-border rounded-admin p-6 shadow-sm">
          {step === "connecting" && (
            <Centered>Getting things ready…</Centered>
          )}

          {step === "connect-error" && (
            <div className="text-center space-y-4">
              <p className="text-brick">{error}</p>
              <button className={btnPrimary} onClick={startSession}>
                Try again
              </button>
            </div>
          )}

          {step === "rating" && (
            <RatingStep rating={rating} onRate={setRating} onContinue={continueFromRating} />
          )}

          {step === "good-details" && (
            <GoodDetailsStep
              visitTypes={visitTypes}
              categories={categories}
              selectedVisitTypes={selectedVisitTypes}
              selectedCategories={selectedCategories}
              comment={comment}
              onToggleVisitType={(v) => toggle(selectedVisitTypes, v, setSelectedVisitTypes)}
              onToggleCategory={(v) => toggle(selectedCategories, v, setSelectedCategories)}
              onCommentChange={setComment}
              onBack={() => setStep("rating")}
              onContinue={() => setStep("good-photos")}
            />
          )}

          {step === "good-photos" && (
            <GoodPhotosStep
              photoCount={photoCount}
              uploading={uploadingPhoto}
              error={photoError}
              onSelect={handlePhotoSelect}
              onBack={() => setStep("good-details")}
              onContinue={submitGoodReview}
              submitting={submitting}
            />
          )}

          {step === "good-share" && captions && (
            <ShareStep
              platforms={availablePlatforms}
              captions={captions}
              style={captionStyle}
              onStyleChange={setCaptionStyle}
              posted={postedPlatforms}
              onPost={postToPlatform}
              onFinish={() => setStep("done-good")}
            />
          )}

          {step === "bad-details" && (
            <BadDetailsStep
              issueTags={issueTags}
              comment={comment}
              onToggleTag={(v) => toggle(issueTags, v, setIssueTags)}
              onCommentChange={setComment}
              onBack={() => setStep("rating")}
              onSubmit={submitBadFeedback}
              submitting={submitting}
            />
          )}

          {step === "done-good" && (
            <Centered>
              <p className="font-display text-xl mb-2">Thank you!</p>
              <p className="text-ink-muted">
                We really appreciate you sharing your experience.
              </p>
            </Centered>
          )}

          {step === "done-bad" && (
            <Centered>
              <p className="font-display text-xl mb-2">Thanks for letting us know</p>
              <p className="text-ink-muted">
                Your feedback goes straight to the restaurant team — we&apos;ll use it to do
                better.
              </p>
            </Centered>
          )}

          {showInlineError && <p className="text-brick text-sm mt-4">{error}</p>}
        </div>
      </div>
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="text-center py-6">{children}</div>;
}

function RatingStep({
  rating,
  onRate,
  onContinue,
}: {
  rating: number;
  onRate: (n: number) => void;
  onContinue: () => void;
}) {
  return (
    <div className="text-center">
      <p className="font-display text-lg mb-4">How was your visit?</p>
      <div className="flex justify-center gap-2 mb-6">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => onRate(n)}
            className="text-4xl leading-none transition"
          >
            <span className={n <= rating ? "text-gold" : "text-border"}>★</span>
          </button>
        ))}
      </div>
      <button className={btnPrimary} disabled={rating === 0} onClick={onContinue}>
        Continue
      </button>
    </div>
  );
}

function GoodDetailsStep({
  visitTypes,
  categories,
  selectedVisitTypes,
  selectedCategories,
  comment,
  onToggleVisitType,
  onToggleCategory,
  onCommentChange,
  onBack,
  onContinue,
}: {
  visitTypes: NamedRow[];
  categories: NamedRow[];
  selectedVisitTypes: string[];
  selectedCategories: string[];
  comment: string;
  onToggleVisitType: (name: string) => void;
  onToggleCategory: (name: string) => void;
  onCommentChange: (v: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-6">
      <p className="font-display text-lg text-center">
        Wonderful! Tell us a little more.
      </p>

      {visitTypes.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">What brought you in?</p>
          <div className="flex flex-wrap gap-2">
            {visitTypes.map((v) => (
              <button
                key={v.id}
                onClick={() => onToggleVisitType(v.name)}
                className={selectedVisitTypes.includes(v.name) ? chipOn : chipOff}
              >
                {v.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {categories.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">What did you enjoy?</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => onToggleCategory(c.name)}
                className={selectedCategories.includes(c.name) ? chipOn : chipOff}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-sm font-medium mb-2">Tell us more (required)</p>
        <textarea
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
          rows={4}
          placeholder="What made your visit great?"
          className="w-full rounded-admin border border-border bg-paper p-3 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="flex justify-between">
        <button className={btnSecondary} onClick={onBack}>
          Back
        </button>
        <button className={btnPrimary} disabled={!comment.trim()} onClick={onContinue}>
          Continue
        </button>
      </div>
    </div>
  );
}

function GoodPhotosStep({
  photoCount,
  uploading,
  error,
  onSelect,
  onBack,
  onContinue,
  submitting,
}: {
  photoCount: number;
  uploading: boolean;
  error: string | null;
  onSelect: (files: FileList | null) => void;
  onBack: () => void;
  onContinue: () => void;
  submitting: boolean;
}) {
  const enoughPhotos = photoCount >= MIN_RECOMMENDED_PHOTOS;
  return (
    <div className="space-y-5 text-center">
      <p className="font-display text-lg">Add a few photos</p>
      <p className="text-ink-muted text-sm">
        Reviews with photos get noticed more. Add at least {MIN_RECOMMENDED_PHOTOS} if you can.
      </p>

      <label className="block cursor-pointer rounded-admin border-2 border-dashed border-border p-8 hover:border-primary transition">
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="hidden"
          onChange={(e) => onSelect(e.target.files)}
        />
        <span className="text-ink-muted text-sm">
          {uploading ? "Uploading…" : "Tap to choose photos"}
        </span>
      </label>

      <p className="text-sm text-ink-muted">
        {photoCount} photo{photoCount === 1 ? "" : "s"} added
      </p>
      {error && <p className="text-brick text-sm">{error}</p>}

      <div className="flex justify-between pt-2">
        <button className={btnSecondary} onClick={onBack}>
          Back
        </button>
        <button className={btnPrimary} disabled={submitting} onClick={onContinue}>
          {submitting ? "Submitting…" : enoughPhotos ? "Continue" : "Skip for now"}
        </button>
      </div>
    </div>
  );
}

function ShareStep({
  platforms,
  captions,
  style,
  onStyleChange,
  posted,
  onPost,
  onFinish,
}: {
  platforms: Platform[];
  captions: Captions;
  style: CaptionStyle;
  onStyleChange: (s: CaptionStyle) => void;
  posted: Set<Platform>;
  onPost: (p: Platform) => void;
  onFinish: () => void;
}) {
  const styles: CaptionStyle[] = ["short", "natural", "detailed"];
  return (
    <div className="space-y-5">
      <p className="font-display text-lg text-center">Share the love</p>
      <p className="text-ink-muted text-sm text-center">
        We wrote a caption for you — tap a platform to copy it and post.
      </p>

      <div className="flex justify-center gap-2">
        {styles.map((s) => (
          <button
            key={s}
            onClick={() => onStyleChange(s)}
            className={style === s ? chipOn : chipOff}
          >
            {s[0].toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {platforms.map((p) => (
          <div key={p} className="rounded-admin border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm">{PLATFORM_LABELS[p]}</span>
              {posted.has(p) && <span className="text-xs text-primary">Posted ✓</span>}
            </div>
            <p className="text-sm text-ink-muted mb-3">{captions[p]?.[style]}</p>
            <button className={btnPrimary} onClick={() => onPost(p)}>
              {posted.has(p) ? "Post again" : `Post to ${PLATFORM_LABELS[p]}`}
            </button>
          </div>
        ))}
      </div>

      <div className="text-center pt-2">
        <button className={btnSecondary} onClick={onFinish}>
          I&apos;m done
        </button>
      </div>
    </div>
  );
}

function BadDetailsStep({
  issueTags,
  comment,
  onToggleTag,
  onCommentChange,
  onBack,
  onSubmit,
  submitting,
}: {
  issueTags: string[];
  comment: string;
  onToggleTag: (tag: string) => void;
  onCommentChange: (v: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  return (
    <div className="space-y-6">
      <p className="font-display text-lg text-center">We&apos;re sorry to hear that</p>
      <p className="text-ink-muted text-sm text-center">
        This goes straight to the restaurant team, privately — not posted anywhere public.
      </p>

      <div>
        <p className="text-sm font-medium mb-2">What went wrong?</p>
        <div className="flex flex-wrap gap-2">
          {ISSUE_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => onToggleTag(tag)}
              className={issueTags.includes(tag) ? chipOn : chipOff}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Tell us what happened (required)</p>
        <textarea
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
          rows={4}
          placeholder="What can we do better?"
          className="w-full rounded-admin border border-border bg-paper p-3 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="flex justify-between">
        <button className={btnSecondary} onClick={onBack}>
          Back
        </button>
        <button
          className={btnPrimary}
          disabled={!comment.trim() || submitting}
          onClick={onSubmit}
        >
          {submitting ? "Sending…" : "Submit feedback"}
        </button>
      </div>
    </div>
  );
}
