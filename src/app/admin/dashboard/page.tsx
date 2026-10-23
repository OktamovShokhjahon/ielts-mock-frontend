"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { DashboardStats } from "@/lib/types";

const icons = [
  <svg key="m" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /></svg>,
  <svg key="a" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  <svg key="p" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
  <svg key="s" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>,
];

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<DashboardStats>("/api/admin/stats").then(setStats).catch((e: Error) => setErr(e.message));
  }, []);

  if (err) return <p className="text-red-600 dark:text-red-400 text-sm p-4">{err}</p>;
  if (!stats) return <div className="flex items-center justify-center py-20 text-sm text-muted-foreground"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2" />Loading...</div>;

  const cards = [
    { label: "Mock tests", value: stats.totalMocks },
    { label: "Total attempts", value: stats.totalAttempts },
    { label: "Unique participants", value: stats.totalParticipants },
    { label: "Avg. band score", value: stats.averageBand != null ? stats.averageBand : "--" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Overview of your mock test platform.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => (
          <div key={c.label} className="group rounded-xl border border-border bg-card p-5 transition hover:border-border-hover hover:shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">{c.label}</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
                {icons[i]}
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold tabular-nums text-foreground">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
