import { createClient, getAdminContext } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/ui";

export default async function SettingsPage() {
  const ctx = await getAdminContext();
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("review_categories")
    .select("name, category_type, active")
    .order("category_type")
    .order("sort_order");

  return (
    <div>
      <PageHeader title="Settings" description="Account and review-flow configuration." />

      <section style={panel}>
        <h2 style={panelTitle}>Account</h2>
        <p style={{ fontSize: 14 }}>{ctx?.user.email}</p>
        <p style={{ fontSize: 13, color: "var(--admin-ink-muted)", textTransform: "capitalize" }}>
          Role: {ctx?.role} {ctx?.isGroupOrSuper ? "(all restaurants)" : ""}
        </p>
      </section>

      <section style={{ ...panel, marginTop: 16 }}>
        <h2 style={panelTitle}>Review categories &amp; issue tags</h2>
        <p style={{ fontSize: 13, color: "var(--admin-ink-muted)", marginBottom: 12 }}>
          These power the "what did you enjoy" and "what happened" tag pickers in the review flow.
          Editing here is a good follow-up build — for now, manage rows in Supabase Studio's
          <code> review_categories</code> table.
        </p>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {categories?.map((c, i) => (
            <li key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 14, borderBottom: "1px solid var(--admin-border)" }}>
              <span>{c.name}</span>
              <span style={{ fontSize: 12, color: "var(--admin-ink-muted)", textTransform: "capitalize" }}>{c.category_type}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

const panel: React.CSSProperties = { background: "var(--admin-surface)", border: "1px solid var(--admin-border)", borderRadius: "var(--admin-radius)", padding: 20 };
const panelTitle: React.CSSProperties = { fontFamily: "var(--admin-font-display)", fontSize: 17, margin: "0 0 12px 0" };
