import Link from "next/link";
import { apiFetch } from "@/lib/api";

export const dynamic = "force-dynamic";

type Row = { _id: string; title: string; createdAt: string; isActive: boolean };

export default async function HomePage() {
  let mocks: Row[] = [];
  let error: string | null = null;
  try {
    mocks = await apiFetch<Row[]>("/api/mocks?active=true");
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load mocks";
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gradient-start to-gradient-end">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">
              I
            </div>
            <span className="font-semibold tracking-tight text-foreground">IELTS Mock Tests</span>
          </div>
          {/* header actions slot */}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6">
        <section className="pt-16 pb-12 sm:pt-24 sm:pb-16">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Practice makes <span className="text-primary">perfect.</span>
          </h1>
          <p className="mt-4 text-base text-muted-foreground max-w-lg leading-relaxed">
            Choose a mock test below to simulate the real IELTS experience. You&apos;ll need the PIN from your test centre to begin.
          </p>
        </section>

        {error && (
          <div className="mb-8 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-red-500">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              {error} &mdash; ensure the API is running and <code className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-mono dark:bg-red-900/40">NEXT_PUBLIC_API_URL</code> is set.
            </div>
          </div>
        )}

        {!error && mocks.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <path d="M12 9v6" />
                <path d="M9 12h6" />
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground">No active mocks yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Ask your administrator to create and activate one.</p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 pb-16">
          {mocks.map((m) => (
            <Link
              key={m._id}
              href={`/mock/${m._id}`}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-lg hover:shadow-primary/[0.03] hover:border-primary/30 hover:-translate-y-0.5"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <h2 className="font-semibold text-foreground group-hover:text-primary transition-colors">{m.title}</h2>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-1 shrink-0 text-muted-foreground/50 group-hover:text-primary transition-colors">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  {new Date(m.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
