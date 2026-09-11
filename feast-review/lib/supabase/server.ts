import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Uses the anon key + the signed-in admin's cookies, so every query is scoped
// by RLS to whatever that admin is allowed to see (see supabase/migrations/0002_rls.sql).
// Never use the service role key here.
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // called from a Server Component with no write access — middleware refreshes the session instead
          }
        },
      },
    }
  );
}

// Fetch the signed-in user's admin scope (role + restaurant_id, or null restaurant_id
// for group/super admins who see everything). Returns null if not an admin.
export async function getAdminContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: adminRows } = await supabase
    .from("restaurant_admins")
    .select("restaurant_id, role")
    .eq("user_id", user.id);

  if (!adminRows?.length) return null;

  const isGroupOrSuper = adminRows.some((r) => r.restaurant_id === null);
  return {
    user,
    isGroupOrSuper,
    // restricted admins may hold rows for more than one restaurant
    restaurantIds: adminRows.filter((r) => r.restaurant_id !== null).map((r) => r.restaurant_id as string),
    role: adminRows[0].role,
  };
}
