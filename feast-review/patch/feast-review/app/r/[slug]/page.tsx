import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ReviewFlow from "./ReviewFlow";

// This page is reached by scanning a table QR code:
//   /r/{restaurant-slug}?outlet={outlet-code}
// It must always hit the database (never be statically cached), since new
// restaurants/outlets are added through the admin dashboard at any time.
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ outlet?: string }>;
}

export default async function ReviewPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { outlet: outletCode } = await searchParams;

  if (!outletCode) notFound();

  const supabase = await createClient();

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select(
      "id, name, slug, logo, languages, google_review_url, xhs_url, instagram_url, facebook_url, tiktok_url, lemon8_url"
    )
    .eq("slug", slug)
    .single();

  if (!restaurant) notFound();

  // qr_code is stored as "{restaurant_slug}/{outlet_code}" — see
  // supabase/functions/create-session/index.ts and app/admin/qr-codes/page.tsx.
  const { data: outlet } = await supabase
    .from("outlets")
    .select("id, outlet_name")
    .eq("qr_code", `${slug}/${outletCode}`)
    .eq("restaurant_id", restaurant.id)
    .eq("active", true)
    .single();

  if (!outlet) notFound();

  const [{ data: visitTypes }, { data: categories }] = await Promise.all([
    supabase
      .from("visit_types")
      .select("id, name")
      .eq("restaurant_id", restaurant.id)
      .eq("active", true)
      .order("sort_order"),
    supabase
      .from("review_categories")
      .select("id, name")
      .eq("restaurant_id", restaurant.id)
      .eq("category_type", "compliment")
      .eq("active", true)
      .order("sort_order"),
  ]);

  return (
    <ReviewFlow
      restaurant={restaurant}
      outlet={outlet}
      outletCode={outletCode}
      visitTypes={visitTypes ?? []}
      categories={categories ?? []}
    />
  );
}
