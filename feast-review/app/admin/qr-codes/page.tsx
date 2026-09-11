import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/ui";

const FRONTEND_BASE = process.env.NEXT_PUBLIC_FRONTEND_URL || "https://review.feastdininggroup.com";

export default async function QrCodesPage() {
  const supabase = await createClient();
  const { data: outlets, error } = await supabase
    .from("outlets")
    .select("id, outlet_name, qr_code, restaurants (slug, name)")
    .eq("active", true)
    .order("outlet_name");

  return (
    <div>
      <PageHeader
        title="QR Codes"
        description="Each outlet's review URL, rendered as a scannable code you can download and print."
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
        {outlets?.map((o: any) => {
          const url = `${FRONTEND_BASE}/r/${o.restaurants?.slug}?outlet=${o.qr_code?.split("/").pop() ?? o.qr_code}`;
          const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(url)}`;
          return (
            <div key={o.id} style={{ background: "var(--admin-surface)", border: "1px solid var(--admin-border)", borderRadius: "var(--admin-radius)", padding: 16, textAlign: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrImg} alt={`QR code for ${o.outlet_name}`} style={{ width: "100%", maxWidth: 200, margin: "0 auto 10px" }} />
              <div style={{ fontFamily: "var(--admin-font-display)", fontSize: 16 }}>{o.restaurants?.name}</div>
              <div style={{ fontSize: 13, color: "var(--admin-ink-muted)", marginBottom: 8 }}>{o.outlet_name}</div>
              <div style={{ fontSize: 11, color: "var(--admin-ink-muted)", wordBreak: "break-all", marginBottom: 10 }}>{url}</div>
              <a href={qrImg} download={`${o.restaurants?.slug}-${o.outlet_name}-qr.png`} style={downloadLink}>Download PNG</a>
            </div>
          );
        })}
      </div>
      {error && <p style={{ color: "var(--admin-brick)" }}>{error.message}</p>}
      {outlets?.length === 0 && <p style={{ color: "var(--admin-ink-muted)" }}>No active outlets yet.</p>}
      <p style={{ fontSize: 12, color: "var(--admin-ink-muted)", marginTop: 24 }}>
        Codes are rendered via a public QR image API for convenience — swap for a self-hosted generator
        (e.g. the <code>qrcode</code> npm package) if you'd rather not depend on a third party for this.
      </p>
    </div>
  );
}

const downloadLink: React.CSSProperties = {
  fontSize: 13, color: "var(--admin-primary)", fontWeight: 600, textDecoration: "none",
};
