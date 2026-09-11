import { createClient } from "@/lib/supabase/server";
import { PageHeader, StatCard } from "@/components/admin/ui";

async function fetchAnalytics(accessToken: string, filters: Record<string, string | undefined>) {
  const body: Record<string, string> = {};
  if (filters.restaurant) body.restaurant_id = filters.restaurant;
  if (filters.outlet) body.outlet_id = filters.outlet;
  if (filters.from) body.date_from = filters.from;
  if (filters.to) body.date_to = filters.to;

  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-analytics`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const { data: restaurants } = await supabase.from("restaurants").select("id, name").order("name");
  const analytics = session ? await fetchAnalytics(session.access_token, params) : null;

  return (
    <div>
      <PageHeader title="Analytics" description="Breakdown by restaurant, outlet, and platform, with date filtering." />

      <form style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
        <select name="restaurant" defaultValue={params.restaurant ?? ""} style={selectStyle}>
          <option value="">All restaurants</option>
          {restaurants?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <input type="date" name="from" defaultValue={params.from ?? ""} style={selectStyle} />
        <input type="date" name="to" defaultValue={params.to ?? ""} style={selectStyle} />
        <button type="submit" style={applyBtn}>Apply</button>
      </form>

      {!analytics ? (
        <p style={{ color: "var(--admin-ink-muted)" }}>Couldn't load analytics.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
          <section style={panel}>
            <h2 style={panelTitle}>Reviews by restaurant</h2>
            <BreakdownList
              data={analytics.reviews_by_restaurant}
              nameLookup={Object.fromEntries((restaurants ?? []).map((r) => [r.id, r.name]))}
            />
          </section>
          <section style={panel}>
            <h2 style={panelTitle}>Reviews by platform</h2>
            <BreakdownList data={analytics.reviews_by_platform} />
          </section>
          <section style={panel}>
            <h2 style={panelTitle}>Click-through rate by platform</h2>
            <BreakdownList data={analytics.social_click_through_rate_pct} suffix="%" />
          </section>
          <section style={panel}>
            <h2 style={panelTitle}>Top categories</h2>
            {analytics.most_selected_categories?.length ? (
              <BreakdownList
                data={Object.fromEntries(analytics.most_selected_categories.map((c: any) => [c.name, c.count]))}
              />
            ) : <p style={{ color: "var(--admin-ink-muted)", fontSize: 13 }}>No data yet.</p>}
          </section>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginTop: 24 }}>
        <StatCard label="Photo upload rate" value={`${analytics?.photo_upload_rate_pct ?? 0}%`} />
        <StatCard label="Average rating" value={analytics?.average_rating ?? "—"} />
      </div>
    </div>
  );
}

function BreakdownList({ data, nameLookup, suffix = "" }: { data: Record<string, number> | undefined; nameLookup?: Record<string, string>; suffix?: string }) {
  const entries = Object.entries(data ?? {}).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return <p style={{ color: "var(--admin-ink-muted)", fontSize: 13 }}>No data yet.</p>;
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {entries.map(([key, value]) => (
        <li key={key} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 14, borderBottom: "1px solid var(--admin-border)", textTransform: nameLookup ? "none" : "capitalize" }}>
          <span>{nameLookup?.[key] ?? key}</span>
          <span style={{ color: "var(--admin-ink-muted)" }}>{value}{suffix}</span>
        </li>
      ))}
    </ul>
  );
}

const selectStyle: React.CSSProperties = { padding: "7px 10px", borderRadius: 8, border: "1px solid var(--admin-border)", fontSize: 13, background: "var(--admin-surface)" };
const applyBtn: React.CSSProperties = { padding: "7px 16px", borderRadius: 8, border: "none", background: "var(--admin-primary)", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer" };
const panel: React.CSSProperties = { background: "var(--admin-surface)", border: "1px solid var(--admin-border)", borderRadius: "var(--admin-radius)", padding: 20 };
const panelTitle: React.CSSProperties = { fontFamily: "var(--admin-font-display)", fontSize: 17, margin: "0 0 12px 0" };
