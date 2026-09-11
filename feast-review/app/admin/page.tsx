import { createClient } from "@/lib/supabase/server";
import { PageHeader, StatCard } from "@/components/admin/ui";

async function fetchAnalytics(accessToken: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-analytics`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({}),
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const analytics = session ? await fetchAnalytics(session.access_token) : null;

  return (
    <div>
      <PageHeader title="Dashboard" description="Review activity across every restaurant you manage." />

      {!analytics ? (
        <p style={{ color: "var(--admin-ink-muted)", fontSize: 14 }}>
          Couldn't load live metrics — check that the <code>admin-analytics</code> function is deployed and reachable.
        </p>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 28 }}>
            <StatCard label="Total reviews" value={analytics.total_reviews} />
            <StatCard label="Today" value={analytics.reviews_today} />
            <StatCard label="This week" value={analytics.reviews_this_week} />
            <StatCard label="This month" value={analytics.reviews_this_month} />
            <StatCard label="Average rating" value={analytics.average_rating ?? "—"} sub="out of 5" />
            <StatCard label="Positive" value={`${analytics.positive_review_pct}%`} />
            <StatCard label="Negative" value={`${analytics.negative_review_pct}%`} />
            <StatCard label="Photo upload rate" value={`${analytics.photo_upload_rate_pct}%`} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <section style={panel}>
              <h2 style={panelTitle}>Most-selected categories</h2>
              {analytics.most_selected_categories?.length ? (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {analytics.most_selected_categories.map((c: { name: string; count: number }) => (
                    <li key={c.name} style={rowStyle}>
                      <span>{c.name}</span>
                      <span style={{ color: "var(--admin-ink-muted)" }}>{c.count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyNote text="No category data yet." />
              )}
            </section>

            <section style={panel}>
              <h2 style={panelTitle}>Social click-through rate</h2>
              {Object.keys(analytics.social_click_through_rate_pct ?? {}).length ? (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {Object.entries(analytics.social_click_through_rate_pct).map(([platform, pct]) => (
                    <li key={platform} style={rowStyle}>
                      <span style={{ textTransform: "capitalize" }}>{platform}</span>
                      <span style={{ color: "var(--admin-ink-muted)" }}>{pct as number}%</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyNote text="No posts shared yet." />
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return <p style={{ color: "var(--admin-ink-muted)", fontSize: 13 }}>{text}</p>;
}

const panel: React.CSSProperties = {
  background: "var(--admin-surface)", border: "1px solid var(--admin-border)", borderRadius: "var(--admin-radius)", padding: 20,
};
const panelTitle: React.CSSProperties = {
  fontFamily: "var(--admin-font-display)", fontSize: 17, margin: "0 0 12px 0", color: "var(--admin-ink)",
};
const rowStyle: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 14, borderBottom: "1px solid var(--admin-border)",
};
