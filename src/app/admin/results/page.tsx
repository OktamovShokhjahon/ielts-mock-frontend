"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Attempt, MockTest, WritingTask, Question, ReadingPart, ListeningPart } from "@/lib/types";

const inputClass = "mt-1.5 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring";

type DetailTab = "listening" | "reading" | "writing";

function participantLabel(p: Attempt["participant"]): string {
  const name = p.fullName?.trim();
  if (name) return name;
  const legacy = [p.firstName, p.lastName].filter(Boolean).join(" ").trim();
  return legacy || "—";
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function isCorrect(q: Question, userAnswer: string | undefined): boolean {
  if (!userAnswer || userAnswer === "") return false;
  if (q.type === "matching") {
    if (!q.matchingPairs?.length) return false;
    try {
      const parsed = JSON.parse(userAnswer) as Record<string, string>;
      return q.matchingPairs.every((p) => normalize(parsed[p.left] || "") === normalize(p.right ?? ""));
    } catch { return false; }
  }
  const correct = q.correctAnswer ?? "";
  if (q.type === "true_false_ng") {
    const c = normalize(correct);
    const g = normalize(userAnswer);
    return c === g || (c === "not given" && g === "ng") || (c === "ng" && g === "not given");
  }
  return normalize(correct) === normalize(userAnswer);
}

function QuestionResult({ q, userAnswer, num }: { q: Question; userAnswer: string | undefined; num: number }) {
  const answered = userAnswer !== undefined && userAnswer !== "";
  const correct = isCorrect(q, userAnswer);

  return (
    <div className={`rounded-lg border p-4 ${correct ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
      <div className="flex items-start gap-3">
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${correct ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {num}
        </span>
        <div className="flex-1 min-w-0">
          {q.type !== "matching" && <p className="text-sm text-foreground font-medium mb-2">{q.prompt}</p>}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              {correct ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><polyline points="20 6 9 17 4 12"/></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-600"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              )}
              <span className={correct ? "text-green-700 font-medium" : "text-red-700 font-medium"}>
                {correct ? "Correct" : "Incorrect"}
              </span>
            </div>
          </div>
          <div className="mt-2 grid gap-1 text-xs">
            <div className="flex gap-2">
              <span className="text-muted-foreground shrink-0 w-20">User said:</span>
              <span className={`font-medium ${correct ? "text-green-700" : "text-red-700"}`}>
                {answered ? (q.type === "matching" ? formatMatchAnswer(userAnswer!) : userAnswer) : <span className="italic text-muted-foreground">No answer</span>}
              </span>
            </div>
            {!correct && (
              <div className="flex gap-2">
                <span className="text-muted-foreground shrink-0 w-20">Correct:</span>
                <span className="font-medium text-green-700">
                  {q.type === "matching" ? q.matchingPairs?.map((p) => `${p.left} → ${p.right}`).join(", ") : q.correctAnswer}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatMatchAnswer(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return Object.entries(parsed).map(([k, v]) => `${k} → ${v}`).join(", ");
  } catch { return raw; }
}

export default function AdminResultsPage() {
  const [mocks, setMocks] = useState<MockTest[]>([]);
  const [mockId, setMockId] = useState("");
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [selected, setSelected] = useState<Attempt | null>(null);
  const [bandEdit, setBandEdit] = useState("");
  const [listenEdit, setListenEdit] = useState("");
  const [readEdit, setReadEdit] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [currentMock, setCurrentMock] = useState<MockTest | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("listening");

  useEffect(() => {
    apiFetch<MockTest[]>("/api/admin/mocks").then((m) => { setMocks(m); if (m[0]) setMockId(m[0]._id); }).catch((e: Error) => setErr(e.message));
  }, []);

  useEffect(() => {
    if (!mockId) return;
    apiFetch<Attempt[]>(`/api/admin/mocks/${mockId}/attempts`).then(setAttempts).catch((e: Error) => setErr(e.message));
    apiFetch<MockTest>(`/api/admin/mocks/${mockId}`).then(setCurrentMock).catch(() => {});
  }, [mockId, mocks]);

  useEffect(() => {
    if (!selected) return;
    setBandEdit(selected.bandScore != null ? String(selected.bandScore) : "");
    setListenEdit(selected.scores?.listening != null ? String(selected.scores.listening) : "");
    setReadEdit(selected.scores?.reading != null ? String(selected.scores.reading) : "");
    setDetailTab("listening");
  }, [selected]);

  const saveScores = async () => {
    if (!selected) return;
    setErr(null);
    setSaving(true);
    try {
      await apiFetch(`/api/admin/attempts/${selected._id}`, {
        method: "PATCH",
        json: {
          bandScore: bandEdit === "" ? null : Number(bandEdit),
          scores: { listening: listenEdit === "" ? null : Number(listenEdit), reading: readEdit === "" ? null : Number(readEdit) },
        },
      });
      const list = await apiFetch<Attempt[]>(`/api/admin/mocks/${mockId}/attempts`);
      setAttempts(list);
      const upd = list.find((a) => a._id === selected._id);
      if (upd) setSelected(upd);
    } catch (e) { setErr(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  };

  const writingTasks: WritingTask[] = currentMock?.sections?.writing?.tasks || [];
  const listeningParts: ListeningPart[] = currentMock?.sections?.listening?.parts || [];
  const readingParts: ReadingPart[] = currentMock?.sections?.reading?.parts || [];

  const allListeningQs = listeningParts.flatMap((p) => p.questions);
  const allReadingQs = readingParts.flatMap((p) => p.questions);

  const listeningCorrectCount = selected ? allListeningQs.filter((q) => isCorrect(q, selected.answers?.listening?.[q.id])).length : 0;
  const readingCorrectCount = selected ? allReadingQs.filter((q) => isCorrect(q, selected.answers?.reading?.[q.id])).length : 0;

  const detailTabs: { key: DetailTab; label: string; count?: string }[] = [
    { key: "listening", label: "Listening", count: selected ? `${listeningCorrectCount}/${allListeningQs.length}` : undefined },
    { key: "reading", label: "Reading", count: selected ? `${readingCorrectCount}/${allReadingQs.length}` : undefined },
    { key: "writing", label: "Writing" },
  ];

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Results</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review scores, answers, and writing responses.</p>
      </div>

      {err && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {err}
        </div>
      )}

      <div className="mb-8">
        <label className="text-xs font-medium text-muted-foreground">Select mock</label>
        <select value={mockId} onChange={(e) => { setMockId(e.target.value); setSelected(null); }} className="mt-1.5 block w-full max-w-sm rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring">
          {mocks.map((m) => <option key={m._id} value={m._id}>{m.title} {m.status === "draft" ? "(draft)" : ""}</option>)}
        </select>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        {/* Participants list */}
        <div className="rounded-xl border border-border bg-card overflow-hidden h-fit">
          <div className="border-b border-border bg-card-elevated px-4 py-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Participants</p>
          </div>
          {attempts.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">No attempts yet.</p>
          ) : (
            <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
              {attempts.map((a) => (
                <button
                  key={a._id}
                  type="button"
                  className={`w-full text-left px-4 py-3.5 flex items-center justify-between gap-3 transition hover:bg-card-elevated ${selected?._id === a._id ? "bg-primary-soft" : ""}`}
                  onClick={() => setSelected(a)}
                >
                  <div>
                    <p className={`text-sm font-medium ${selected?._id === a._id ? "text-primary" : "text-foreground"}`}>
                      {participantLabel(a.participant)}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(a.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-sm font-semibold text-primary tabular-nums">{a.bandScore ?? "--"}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="rounded-xl border border-border bg-card">
          {!selected ? (
            <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
              <div className="text-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 text-muted-foreground/40"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Select a participant to view details.
              </div>
            </div>
          ) : (
            <div>
              {/* Header */}
              <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-foreground">{participantLabel(selected.participant)}</h2>
                  <span className="text-xs text-muted-foreground">{selected.completedAt ? "Completed" : "In progress"}</span>
                </div>

                <div className="grid sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Listening (%)</label>
                    <input value={listenEdit} onChange={(e) => setListenEdit(e.target.value)} className={inputClass} placeholder="0-100" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Reading (%)</label>
                    <input value={readEdit} onChange={(e) => setReadEdit(e.target.value)} className={inputClass} placeholder="0-100" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">IELTS band</label>
                    <input value={bandEdit} onChange={(e) => setBandEdit(e.target.value)} className={inputClass} placeholder="0-9" />
                  </div>
                  <div className="flex items-end">
                    <button type="button" onClick={() => void saveScores()} disabled={saving} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary-hover active:scale-[0.98] disabled:opacity-50">
                      {saving ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Section tabs */}
              <div className="flex gap-1 p-2 border-b border-border bg-card-elevated">
                {detailTabs.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setDetailTab(t.key)}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                      detailTab === t.key ? "bg-card text-primary shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t.label}
                    {t.count && (
                      <span className={`text-[11px] font-mono tabular-nums ${detailTab === t.key ? "text-primary" : "text-muted-foreground"}`}>
                        ({t.count})
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="p-6 max-h-[600px] overflow-y-auto">
                {detailTab === "listening" && (
                  <div className="space-y-3">
                    {allListeningQs.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No listening questions.</p>
                    ) : (
                      <>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            {listeningCorrectCount} correct
                          </div>
                          <div className="flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-full px-2.5 py-1">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            {allListeningQs.length - listeningCorrectCount} incorrect
                          </div>
                        </div>
                        {allListeningQs.map((q, i) => (
                          <QuestionResult key={q.id} q={q} userAnswer={selected.answers?.listening?.[q.id]} num={i + 1} />
                        ))}
                      </>
                    )}
                  </div>
                )}

                {detailTab === "reading" && (
                  <div className="space-y-3">
                    {allReadingQs.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No reading questions.</p>
                    ) : (
                      <>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            {readingCorrectCount} correct
                          </div>
                          <div className="flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-full px-2.5 py-1">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            {allReadingQs.length - readingCorrectCount} incorrect
                          </div>
                        </div>
                        {allReadingQs.map((q, i) => (
                          <QuestionResult key={q.id} q={q} userAnswer={selected.answers?.reading?.[q.id]} num={i + 1} />
                        ))}
                      </>
                    )}
                  </div>
                )}

                {detailTab === "writing" && (
                  <div className="space-y-4">
                    {writingTasks.length > 0 ? writingTasks.map((task, i) => (
                      <div key={task.id}>
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">Task {i + 1}</p>
                        <p className="text-[11px] text-muted-foreground mb-2 italic">{task.prompt}</p>
                        <div className="rounded-lg border border-border bg-background p-4 text-sm whitespace-pre-wrap leading-relaxed min-h-[80px] text-foreground">
                          {selected.answers?.writing?.[task.id] || <span className="text-muted-foreground italic">No response</span>}
                        </div>
                      </div>
                    )) : (
                      <p className="text-sm text-muted-foreground text-center py-8">No writing tasks configured.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
