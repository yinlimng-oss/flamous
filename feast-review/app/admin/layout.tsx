import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/supabase/server";
import { Sidebar } from "@/components/admin/Sidebar";
import "./tokens.css";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAdminContext();

  // getAdminContext returns null both when signed out (middleware already handles that)
  // and when signed in but not present in restaurant_admins — that second case lands here.
  if (!ctx) {
    redirect("/admin/login?error=not_an_admin");
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--admin-paper)", fontFamily: "var(--admin-font-ui)" }}>
      <Sidebar email={ctx.user.email ?? ""} />
      <main style={{ flex: 1, padding: "28px 32px", paddingBottom: 80, minWidth: 0 }}>
        {children}
      </main>
    </div>
  );
}
