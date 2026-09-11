import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/ui";

export default async function RestaurantsPage() {
  const supabase = await createClient();
  const { data: restaurants, error } = await supabase
    .from("restaurants")
    .select("id, name, slug, logo, google_review_url, instagram_url, facebook_url, tiktok_url, xhs_url, lemon8_url")
    .order("name");

  return (
    <div>
      <PageHeader title="Restaurants" description="Brands in the group. Full editing (logo upload, URLs) is a follow-up — this view is read-only for now." />
      {error && <p style={{ color: "var(--admin-brick)" }}>{error.message}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
        {restaurants?.map((r) => (
          <div key={r.id} style={{ background: "var(--admin-surface)", border: "1px solid var(--admin-border)", borderRadius: "var(--admin-radius)", padding: 18 }}>
            <div style={{ fontFamily: "var(--admin-font-display)", fontSize: 18, marginBottom: 4 }}>{r.name}</div>
            <div style={{ fontSize: 13, color: "var(--admin-ink-muted)", marginBottom: 10 }}>/{r.slug}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, fontSize: 12 }}>
              {["google_review_url", "instagram_url", "facebook_url", "tiktok_url", "xhs_url", "lemon8_url"].map((key) => {
                const url = (r as any)[key];
                const label = key.replace("_url", "").replace("_", " ");
                return (
                  <span key={key} style={{
                    padding: "2px 8px", borderRadius: 999, textTransform: "capitalize",
                    background: url ? "rgba(47,93,80,0.1)" : "var(--admin-paper)",
                    color: url ? "var(--admin-primary)" : "var(--admin-ink-muted)",
                  }}>
                    {label}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
