"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { MockTest } from "@/lib/types";

type Summary = { attempts: number; participants: number; averageScore: number | null };

export default function AdminMocksPage() {
  const [mocks, setMocks] = useState<MockTest[]>([]);
  const [modal, setModal] = useState<{ mock: MockTest; summary: Summary } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [newPin, setNewPin] = useState<string | null>(null);

  const load = () => {
    apiFetch<MockTest[]>("/api/admin/mocks").then(setMocks).catch((e: Error) => setErr(e.message));
  };

  useEffect(() => { load(); }, []);

  const openModal = async (m: MockTest) => {
    setNewPin(null);
    try {
      const summary = await apiFetch<Summary>(`/api/admin/mocks/${m._id}/summary`);
      setModal({ mock: m, summary });
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed to load summary"); }
  };

  const activate = async (id: string) => {
    try {
      const updated = await apiFetch<MockTest>(`/api/admin/mocks/${id}/activate`, { method: "POST" });
      setNewPin(updated.pinCode);
      load();
      if (modal) {
        const summary = await apiFetch<Summary>(`/api/admin/mocks/${id}/summary`);
        setModal({ mock: updated, summary });
      }
    } catch (e) { setErr(e instanceof Error ? e.message : "Activate failed"); }
  };

  const deactivate = async (id: string) => {
    try {
      const updated = await apiFetch<MockTest>(`/api/admin/mocks/${id}/deactivate`, { method: "POST" });
      setNewPin(null);
      load();
      if (modal) {
        const summary = await apiFetch<Summary>(`/api/admin/mocks/${id}/summary`);
        setModal({ mock: updated, summary });
      }
    } catch (e) { setErr(e instanceof Error ? e.message : "Deactivate failed"); }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Mock tests</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage and activate exams.</p>
        </div>
        <Link
          href="/admin/mocks/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary-hover active:scale-[0.98]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
          Create new
        </Link>
      </div>

      {err && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          {err}
        </div>
      )}

      {mocks.length === 0 && !err && (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground">No mocks created yet.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mocks.map((m) => (
          <button
            key={m._id}
            type="button"
            onClick={() => void openModal(m)}
            className="group text-left rounded-xl border border-border bg-card p-5 transition hover:border-border-hover hover:shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{m.title}</p>
              <span className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                m.isActive
                  ? "bg-success-bg text-success-text border border-success-border"
                  : m.status === "draft"
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-card-elevated text-muted-foreground border border-border"
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${m.isActive ? "bg-success-text" : m.status === "draft" ? "bg-amber-500" : "bg-muted-foreground/50"}`} />
                {m.isActive ? "Active" : m.status === "draft" ? "Draft" : "Inactive"}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {new Date(m.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
            </p>
          </button>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => { setModal(null); setNewPin(null); }}>
          <div className="bg-card rounded-xl max-w-md w-full shadow-xl border border-border" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-foreground">{modal.mock.title}</h2>
                <span className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                  modal.mock.isActive
                    ? "bg-success-bg text-success-text border border-success-border"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${modal.mock.isActive ? "bg-success-text" : "bg-amber-500"}`} />
                  {modal.mock.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Created {new Date(modal.mock.createdAt).toLocaleDateString()}
              </p>
            </div>

            <div className="p-6 space-y-3">
              {[
                { l: "Attempts", v: modal.summary.attempts },
                { l: "Participants", v: modal.summary.participants },
                { l: "Average score", v: modal.summary.averageScore != null ? modal.summary.averageScore : "--" },
              ].map((row) => (
                <div key={row.l} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{row.l}</span>
                  <span className="font-semibold tabular-nums text-foreground">{row.v}</span>
                </div>
              ))}
              <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                <span className="text-muted-foreground">Current PIN</span>
                <span className="font-mono font-bold tracking-widest text-primary">{modal.mock.pinCode}</span>
              </div>
            </div>

            {newPin && (
              <div className="mx-6 mb-4 rounded-lg border border-success-border bg-success-bg p-4 text-center">
                <p className="text-xs text-success-text font-medium mb-1">New PIN generated</p>
                <p className="text-2xl font-mono font-bold tracking-[0.3em] text-success-text">{newPin}</p>
                <p className="text-[11px] text-success-text/70 mt-1">Share this PIN with your candidates</p>
              </div>
            )}

            <div className="flex items-center gap-3 p-6 pt-0">
              {!modal.mock.isActive ? (
                <button
                  type="button"
                  onClick={() => void activate(modal.mock._id)}
                  className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary-hover active:scale-[0.98]"
                >
                  Activate mock
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void deactivate(modal.mock._id)}
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 active:scale-[0.98]"
                >
                  Deactivate mock
                </button>
              )}
              <button
                type="button"
                onClick={() => { setModal(null); setNewPin(null); }}
                className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-card-elevated transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
