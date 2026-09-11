import { createClient } from "@/lib/supabase/server";
import { PageHeader, SentimentBadge, RatingStars } from "@/components/admin/ui";

// Filters via query string: ?restaurant=uuid&outlet=uuid&rating=5&sentiment=good&from=2026-08-01&to=2026-09-01
export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("reviews")
    .select(`
      id, rating, review_text, customer_comment, created_at,
      review_sessions!inner (restaurant_id, outlet_id, sentiment, language,
        restaurants (name), outlets (outlet_name))
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  if (params.restaurant) query = query.eq("review_sessions.restaurant_id", params.restaurant);
  if (params.outlet) query = query.eq("review_sessions.outlet_id", params.outlet);
  if (params.rating) query = query.eq("rating", Number(params.rating));
  if (params.sentiment) query = query.eq("review_sessions.sentiment", params.sentiment);
  if (params.from) query = query.gte("created_at", params.from);
  if (params.to) query = query.lte("created_at", params.to);

  const { data: reviews, error } = await query;
  const { data: restaurants } = await supabase.from("restaurants").select("id, name").order("name");

  return (
    <div>
      <PageHeader title="Reviews" description="Every customer review, most recent first." />

      <form style={filterBar}>
        <select name="restaurant" defaultValue={params.restaurant ?? ""} style={selectStyle}>
          <option value="">All restaurants</option>
          {restaurants?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select name="sentiment" defaultValue={params.sentiment ?? ""} style={selectStyle}>
          <option value="">Any sentiment</option>
          <option value="good">Positive</option>
          <option value="bad">Negative</option>
        </select>
        <select name="rating" defaultValue={params.rating ?? ""} style={selectStyle}>
          <option value="">Any rating</option>
          {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star</option>)}
        </select>
        <input type="date" name="from" defaultValue={params.from ?? ""} style={selectStyle} />
        <input type="date" name="to" defaultValue={params.to ?? ""} style={selectStyle} />
        <button type="submit" style={applyBtn}>Apply</button>
      </form>

      {error && <p style={{ color: "var(--admin-brick)" }}>Couldn't load reviews: {error.message}</p>}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--admin-ink-muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.4 }}>
              <th style={th}>Date</th>
              <th style={th}>Restaurant / Outlet</th>
              <th style={th}>Sentiment</th>
              <th style={th}>Rating</th>
              <th style={th}>Note</th>
            </tr>
          </thead>
          <tbody>
            {reviews?.map((r: any) => (
              <tr key={r.id} style={{ borderTop: "1px solid var(--admin-border)" }}>
                <td style={td}>{new Date(r.created_at).toLocaleDateString()}</td>
                <td style={td}>
                  {r.review_sessions?.restaurants?.name}
                  <div style={{ fontSize: 12, color: "var(--admin-ink-muted)" }}>{r.review_sessions?.outlets?.outlet_name}</div>
                </td>
                <td style={td}><SentimentBadge sentiment={r.review_sessions?.sentiment ?? null} /></td>
                <td style={td}><RatingStars rating={r.rating} /></td>
                <td style={{ ...td, maxWidth: 360 }}>
                  {r.review_text || r.customer_comment || <span style={{ color: "var(--admin-ink-muted)" }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {reviews?.length === 0 && <p style={{ color: "var(--admin-ink-muted)", padding: "20px 0" }}>No reviews match these filters yet.</p>}
      </div>
    </div>
  );
}

const filterBar: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 };
const selectStyle: React.CSSProperties = { padding: "7px 10px", borderRadius: 8, border: "1px solid var(--admin-border)", fontSize: 13, fontFamily: "var(--admin-font-ui)", background: "var(--admin-surface)" };
const applyBtn: React.CSSProperties = { padding: "7px 16px", borderRadius: 8, border: "none", background: "var(--admin-primary)", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer" };
const th: React.CSSProperties = { padding: "8px 12px", fontWeight: 600 };
const td: React.CSSProperties = { padding: "10px 12px", verticalAlign: "top" };
