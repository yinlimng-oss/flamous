"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/restaurants", label: "Restaurants" },
  { href: "/admin/outlets", label: "Outlets" },
  { href: "/admin/qr-codes", label: "QR Codes" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/social-platforms", label: "Social Platforms" },
  { href: "/admin/settings", label: "Settings" },
];

export function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="admin-sidebar-desktop" style={desktopNav}>
        <div style={{ fontFamily: "var(--admin-font-display)", fontSize: 20, color: "var(--admin-ink)", marginBottom: 28 }}>
          Feast Dining Group
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  padding: "9px 12px", borderRadius: 8, fontSize: 14, fontFamily: "var(--admin-font-ui)",
                  color: active ? "white" : "var(--admin-ink)",
                  background: active ? "var(--admin-primary)" : "transparent",
                  textDecoration: "none", fontWeight: active ? 600 : 500,
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
        <div style={{ borderTop: "1px solid var(--admin-border)", paddingTop: 12 }}>
          <div style={{ fontSize: 12, color: "var(--admin-ink-muted)", marginBottom: 8, wordBreak: "break-all" }}>{email}</div>
          <button onClick={signOut} style={signOutBtn}>Sign out</button>
        </div>
      </nav>

      {/* Mobile bottom bar — shows the 5 most-used sections; rest live under Settings > More on small screens */}
      <nav className="admin-nav-mobile" style={mobileNav}>
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                flex: 1, textAlign: "center", padding: "8px 4px", fontSize: 11,
                fontFamily: "var(--admin-font-ui)", textDecoration: "none",
                color: active ? "var(--admin-primary)" : "var(--admin-ink-muted)",
                fontWeight: active ? 600 : 500,
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <style>{`
        @media (max-width: 860px) {
          .admin-sidebar-desktop { display: none !important; }
          .admin-nav-mobile { display: flex !important; }
        }
      `}</style>
    </>
  );
}

const desktopNav: React.CSSProperties = {
  width: 220, minWidth: 220, borderRight: "1px solid var(--admin-border)", background: "var(--admin-surface)",
  padding: 20, display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh",
};
const mobileNav: React.CSSProperties = {
  display: "none", position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--admin-surface)",
  borderTop: "1px solid var(--admin-border)", zIndex: 20, paddingBottom: "env(safe-area-inset-bottom)",
};
const signOutBtn: React.CSSProperties = {
  fontSize: 13, color: "var(--admin-brick)", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "var(--admin-font-ui)",
};
