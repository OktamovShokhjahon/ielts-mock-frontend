"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!username.trim()) { setErr("Username is required."); return; }
    if (!password) { setErr("Password is required."); return; }
    setLoading(true);
    try {
      await apiFetch("/api/admin/login", { method: "POST", json: { username: username.trim(), password } });
      router.push("/admin/dashboard");
      router.refresh();
    } catch { setErr("Invalid credentials."); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gradient-start to-gradient-end px-4">
      <form onSubmit={submit} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground text-lg font-bold shadow-lg shadow-primary/20">
            I
          </div>
          <h1 className="text-xl font-semibold text-foreground">Admin sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">Enter your credentials to continue</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" className={inputClass} placeholder="admin" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className={inputClass} placeholder="Enter password" />
          </div>
          {err && (
            <p className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              {err}
            </p>
          )}
          <button type="submit" disabled={loading} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary-hover active:scale-[0.98] disabled:opacity-50">
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </div>
      </form>
    </div>
  );
}
