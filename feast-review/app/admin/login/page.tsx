"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      setError("Couldn't sign you in — check your email and password.");
      return;
    }
    router.replace(searchParams.get("next") ?? "/admin");
  }

  return (
    <div style={{ background: "var(--admin-paper)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <form
        onSubmit={handleSubmit}
        style={{ background: "var(--admin-surface)", border: "1px solid var(--admin-border)", borderRadius: "var(--admin-radius)", padding: 32, width: "100%", maxWidth: 360 }}
      >
        <h1 style={{ fontFamily: "var(--admin-font-display)", fontSize: 26, marginBottom: 4, color: "var(--admin-ink)" }}>
          Feast Dining Group
        </h1>
        <p style={{ fontFamily: "var(--admin-font-ui)", color: "var(--admin-ink-muted)", fontSize: 14, marginBottom: 24 }}>
          Sign in to the review dashboard
        </p>

        <label style={fieldLabel}>Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={fieldInput}
        />

        <label style={{ ...fieldLabel, marginTop: 16 }}>Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={fieldInput}
        />

        {error && <p style={{ color: "var(--admin-brick)", fontSize: 13, marginTop: 12 }}>{error}</p>}

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 24, width: "100%", padding: "10px 16px", borderRadius: 8, border: "none",
            background: "var(--admin-primary)", color: "white", fontFamily: "var(--admin-font-ui)",
            fontWeight: 600, cursor: "pointer", opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

const fieldLabel: React.CSSProperties = {
  display: "block", fontFamily: "var(--admin-font-ui)", fontSize: 13, color: "var(--admin-ink-muted)", marginBottom: 6,
};
const fieldInput: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--admin-border)", fontSize: 14, fontFamily: "var(--admin-font-ui)",
};
