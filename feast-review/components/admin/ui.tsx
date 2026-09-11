export function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{
      background: "var(--admin-surface)", border: "1px solid var(--admin-border)", borderRadius: "var(--admin-radius)",
      padding: "18px 20px", minWidth: 0,
    }}>
      <div style={{ fontFamily: "var(--admin-font-ui)", fontSize: 13, color: "var(--admin-ink-muted)", marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: "var(--admin-font-display)", fontSize: 30, color: "var(--admin-ink)", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontFamily: "var(--admin-font-ui)", fontSize: 12, color: "var(--admin-ink-muted)", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

export function SentimentBadge({ sentiment }: { sentiment: "good" | "bad" | null }) {
  if (!sentiment) return null;
  const positive = sentiment === "good";
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 999, fontSize: 12, fontFamily: "var(--admin-font-ui)", fontWeight: 600,
      color: positive ? "var(--admin-primary)" : "var(--admin-brick)",
      background: positive ? "rgba(47,93,80,0.1)" : "rgba(179,65,44,0.1)",
    }}>
      {positive ? "Positive" : "Negative"}
    </span>
  );
}

export function RatingStars({ rating }: { rating: number | null }) {
  if (rating == null) return <span style={{ color: "var(--admin-ink-muted)", fontSize: 13 }}>—</span>;
  return (
    <span style={{ color: "var(--admin-gold)", fontSize: 14, letterSpacing: 1 }}>
      {"★".repeat(rating)}
      <span style={{ color: "var(--admin-border)" }}>{"★".repeat(5 - rating)}</span>
    </span>
  );
}

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h1 style={{ fontFamily: "var(--admin-font-display)", fontSize: 28, color: "var(--admin-ink)", margin: 0 }}>{title}</h1>
      {description && <p style={{ fontFamily: "var(--admin-font-ui)", fontSize: 14, color: "var(--admin-ink-muted)", marginTop: 6 }}>{description}</p>}
    </div>
  );
}
