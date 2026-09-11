import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/ui";

const PLATFORM_URL_FIELDS: { key: string; label: string }[] = [
  { key: "google_review_url", label: "Google Review" },
  { key: "xhs_url", label: "Xiaohongshu" },
  { key: "instagram_url", label: "Instagram" },
  { key: "facebook_url", label: "Facebook" },
  { key: "tiktok_url", label: "TikTok" },
  { key: "lemon8_url", label: "Lemon8" },
];

export default async function SocialPlatformsPage() {
  const supabase = await createClient();
  const { data: restaurants, error } = await supabase
    .from("restaurants")
    .select("id, name, google_review_url, xhs_url, instagram_url, facebook_url, tiktok_url, lemon8_url")
    .order("name");

  return (
    <div>
      <PageHeader
        title="Social Platforms"
        description="Destination links used when a customer taps 'Post now' after generating a caption. Edit these in Supabase Studio for now — an inline editor is a good next addition."
      />
      {error && <p style={{ color: "var(--admin-brick)" }}>{error.message}</p>}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--admin-ink-muted)", fontSize: 12, textTransform: "uppercase" }}>
              <th style={th}>Restaurant</th>
              {PLATFORM_URL_FIELDS.map((f) => <th key={f.key} style={th}>{f.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {restaurants?.map((r: any) => (
              <tr key={r.id} style={{ borderTop: "1px solid var(--admin-border)" }}>
                <td style={{ ...td, fontWeight: 600 }}>{r.name}</td>
                {PLATFORM_URL_FIELDS.map((f) => (
                  <td key={f.key} style={td}>
                    {r[f.key] ? (
                      <a href={r[f.key]} target="_blank" rel="noreferrer" style={{ color: "var(--admin-primary)" }}>Set</a>
                    ) : (
                      <span style={{ color: "var(--admin-ink-muted)" }}>Not set</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th: React.CSSProperties = { padding: "8px 10px", fontWeight: 600 };
const td: React.CSSProperties = { padding: "10px 10px" };
