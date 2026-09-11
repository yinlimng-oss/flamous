import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/ui";

export default async function OutletsPage() {
  const supabase = await createClient();
  const { data: outlets, error } = await supabase
    .from("outlets")
    .select("id, outlet_name, location, qr_code, active, restaurants (name)")
    .order("outlet_name");

  return (
    <div>
      <PageHeader title="Outlets" description="Physical locations per restaurant. Each has a unique QR code used to open the review flow." />
      {error && <p style={{ color: "var(--admin-brick)" }}>{error.message}</p>}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--admin-ink-muted)", fontSize: 12, textTransform: "uppercase" }}>
              <th style={th}>Outlet</th>
              <th style={th}>Restaurant</th>
              <th style={th}>Location</th>
              <th style={th}>QR code</th>
              <th style={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {outlets?.map((o: any) => (
              <tr key={o.id} style={{ borderTop: "1px solid var(--admin-border)" }}>
                <td style={td}>{o.outlet_name}</td>
                <td style={td}>{o.restaurants?.name}</td>
                <td style={td}>{o.location || "—"}</td>
                <td style={{ ...td, fontFamily: "monospace", fontSize: 13 }}>{o.qr_code}</td>
                <td style={td}>
                  <span style={{
                    padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                    color: o.active ? "var(--admin-primary)" : "var(--admin-ink-muted)",
                    background: o.active ? "rgba(47,93,80,0.1)" : "var(--admin-paper)",
                  }}>
                    {o.active ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {outlets?.length === 0 && (
          <p style={{ color: "var(--admin-ink-muted)", padding: "20px 0" }}>
            No outlets yet — add one in Supabase Studio (restaurant_id, outlet_name, qr_code) or build the create form here next.
          </p>
        )}
      </div>
    </div>
  );
}

const th: React.CSSProperties = { padding: "8px 12px", fontWeight: 600 };
const td: React.CSSProperties = { padding: "10px 12px" };
