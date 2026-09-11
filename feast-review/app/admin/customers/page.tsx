import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/ui";

export default async function CustomersPage() {
  const supabase = await createClient();
  const { data: customers, error } = await supabase
    .from("customers")
    .select("id, name, phone, email, consent_marketing, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <PageHeader title="Customers" description="Customers who left contact details, most recent first." />
      {error && <p style={{ color: "var(--admin-brick)" }}>{error.message}</p>}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--admin-ink-muted)", fontSize: 12, textTransform: "uppercase" }}>
              <th style={th}>Name</th>
              <th style={th}>Phone</th>
              <th style={th}>Email</th>
              <th style={th}>Marketing consent</th>
              <th style={th}>Joined</th>
            </tr>
          </thead>
          <tbody>
            {customers?.map((c) => (
              <tr key={c.id} style={{ borderTop: "1px solid var(--admin-border)" }}>
                <td style={td}>{c.name || "—"}</td>
                <td style={td}>{c.phone || "—"}</td>
                <td style={td}>{c.email || "—"}</td>
                <td style={td}>{c.consent_marketing ? "Yes" : "No"}</td>
                <td style={td}>{new Date(c.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {customers?.length === 0 && <p style={{ color: "var(--admin-ink-muted)", padding: "20px 0" }}>No customer records yet.</p>}
      </div>
    </div>
  );
}

const th: React.CSSProperties = { padding: "8px 12px", fontWeight: 600 };
const td: React.CSSProperties = { padding: "10px 12px" };
