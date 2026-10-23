"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, uploadPartAudio } from "@/lib/api";
import type { QuestionType, ReadingPart, ListeningPart, WritingTask, Question } from "@/lib/types";

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

type Tab = "reading" | "listening" | "writing" | "review";

const inputClass = "w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring";
const btnPrimary = "inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary-hover active:scale-[0.98] disabled:opacity-50";
const btnSecondary = "inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-card-elevated transition";
const btnDanger = "inline-flex items-center gap-1.5 rounded-lg text-sm text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1.5 transition";

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "true_false_ng", label: "True / False / Not Given" },
  { value: "fill_blank", label: "Fill in the Blank" },
  { value: "matching", label: "Match Variants to Definitions" },
];

// ─── Question Editor ──────────────────────────────────────────────
function QuestionEditor({ q, onChange, onRemove }: { q: Question; onChange: (q: Question) => void; onRemove: () => void }) {
  return (
    <div className="rounded-lg border border-border bg-card-elevated p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <select
              value={q.type}
              onChange={(e) => {
                const next = e.target.value as QuestionType;
                onChange({
                  ...q,
                  type: next,
                  prompt: next === "matching" ? "" : q.prompt,
                  options: next === "multiple_choice" ? (q.options?.length ? q.options : ["", "", ""]) : undefined,
                  matchingPairs: next === "matching" ? (q.matchingPairs?.length ? q.matchingPairs : [{ left: "", right: "" }]) : undefined,
                  correctAnswer: next === "matching" ? undefined : (q.correctAnswer ?? ""),
                });
              }}
              className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {QUESTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <button type="button" onClick={onRemove} className={btnDanger}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              Remove
            </button>
          </div>
          {q.type === "matching" ? (
            <p className="text-xs text-muted-foreground leading-relaxed">
              The question text for this type is written in the passage above — only configure the variant ↔ definition pairs below.
            </p>
          ) : (
            <input placeholder={q.type === "fill_blank" ? "e.g. The capital of France is ______ ." : "Question prompt"} value={q.prompt} onChange={(e) => onChange({ ...q, prompt: e.target.value })} className={inputClass} />
          )}
        </div>
      </div>

      {q.type === "multiple_choice" && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Options (click radio to mark correct)</p>
          {(q.options || []).map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="radio" name={`mc-${q.id}`} checked={q.correctAnswer === opt && opt !== ""} onChange={() => onChange({ ...q, correctAnswer: opt })} className="h-4 w-4 text-primary" />
              <input value={opt} onChange={(e) => { const opts = [...(q.options || [])]; opts[i] = e.target.value; onChange({ ...q, options: opts }); }} className={`flex-1 ${inputClass}`} placeholder={`Option ${i + 1}`} />
              {(q.options || []).length > 2 && (
                <button type="button" onClick={() => { const opts = (q.options || []).filter((_, j) => j !== i); onChange({ ...q, options: opts, correctAnswer: q.correctAnswer === opt ? "" : q.correctAnswer }); }} className="text-red-400 hover:text-red-600 text-xs">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => onChange({ ...q, options: [...(q.options || []), ""] })} className="text-xs text-primary hover:text-primary-hover font-medium">+ Add option</button>
        </div>
      )}

      {q.type === "true_false_ng" && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Correct answer</p>
          <div className="flex gap-2">
            {["True", "False", "Not Given"].map((v) => (
              <button key={v} type="button" onClick={() => onChange({ ...q, correctAnswer: v })} className={`rounded-lg px-3.5 py-2 text-xs font-medium border transition ${q.correctAnswer === v ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:bg-card-elevated"}`}>{v}</button>
            ))}
          </div>
        </div>
      )}

      {q.type === "fill_blank" && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Use <code className="bg-card-elevated px-1 py-0.5 rounded text-[11px]">______</code> (underscores) in the prompt to place the blank inline.</p>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Correct answer</p>
            <input value={q.correctAnswer || ""} onChange={(e) => onChange({ ...q, correctAnswer: e.target.value })} className={inputClass} placeholder="Expected answer" />
          </div>
        </div>
      )}

      {q.type === "matching" && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Match pairs (left → right)</p>
          {(q.matchingPairs || []).map((pair, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={pair.left} onChange={(e) => { const pairs = [...(q.matchingPairs || [])]; pairs[i] = { ...pairs[i], left: e.target.value }; onChange({ ...q, matchingPairs: pairs }); }} className={`flex-1 ${inputClass}`} placeholder="Term" />
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted-foreground"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              <input value={pair.right} onChange={(e) => { const pairs = [...(q.matchingPairs || [])]; pairs[i] = { ...pairs[i], right: e.target.value }; onChange({ ...q, matchingPairs: pairs }); }} className={`flex-1 ${inputClass}`} placeholder="Definition" />
              {(q.matchingPairs || []).length > 1 && (
                <button type="button" onClick={() => onChange({ ...q, matchingPairs: (q.matchingPairs || []).filter((_, j) => j !== i) })} className="text-red-400 hover:text-red-600">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => onChange({ ...q, matchingPairs: [...(q.matchingPairs || []), { left: "", right: "" }] })} className="text-xs text-primary hover:text-primary-hover font-medium">+ Add pair</button>
        </div>
      )}
    </div>
  );
}

// ─── Reading Tab ──────────────────────────────────────────────────
function ReadingTab({ parts, setParts }: { parts: ReadingPart[]; setParts: (p: ReadingPart[]) => void }) {
  const [editingPart, setEditingPart] = useState<ReadingPart | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const savePart = () => {
    if (!editingPart) return;
    const idx = parts.findIndex((p) => p.id === editingPart.id);
    if (idx >= 0) { const copy = [...parts]; copy[idx] = editingPart; setParts(copy); }
    else setParts([...parts, editingPart]);
    setModalOpen(false);
    setEditingPart(null);
  };

  const deletePart = (id: string) => setParts(parts.filter((p) => p.id !== id));

  const addQuestion = () => {
    if (!editingPart) return;
    setEditingPart({
      ...editingPart,
      questions: [...editingPart.questions, { id: uid("rq"), type: "multiple_choice", prompt: "", options: ["", "", ""], correctAnswer: "" }],
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{parts.length} part(s) created</p>
        <button type="button" onClick={() => { setEditingPart({ id: uid("rp"), title: `Part ${parts.length + 1}`, passage: "", questions: [] }); setModalOpen(true); }} className={btnSecondary}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
          Create Part
        </button>
      </div>

      {parts.map((p) => (
        <div key={p.id} className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-foreground">{p.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{p.questions.length} question(s) · {p.passage.length > 0 ? "Passage added" : "No passage"}</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setEditingPart({ ...p }); setModalOpen(true); }} className={btnSecondary}>Edit</button>
              <button type="button" onClick={() => deletePart(p.id)} className={btnDanger}>Delete</button>
            </div>
          </div>
        </div>
      ))}

      {modalOpen && editingPart && (
        <Modal title={editingPart.title || "Edit Part"} onClose={() => { setModalOpen(false); setEditingPart(null); }}>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Part title</label>
              <input value={editingPart.title} onChange={(e) => setEditingPart({ ...editingPart, title: e.target.value })} className={`mt-1.5 ${inputClass}`} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Passage text</label>
              <textarea value={editingPart.passage} onChange={(e) => setEditingPart({ ...editingPart, passage: e.target.value })} rows={6} className={`mt-1.5 ${inputClass}`} placeholder="Enter the reading passage..." />
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-foreground">Questions ({editingPart.questions.length})</p>
                <button type="button" onClick={addQuestion} className="text-xs text-primary hover:text-primary-hover font-semibold">+ Add Question</button>
              </div>
              <div className="space-y-3">
                {editingPart.questions.map((q, qi) => (
                  <QuestionEditor
                    key={q.id}
                    q={q}
                    onChange={(updated) => { const qs = [...editingPart.questions]; qs[qi] = updated; setEditingPart({ ...editingPart, questions: qs }); }}
                    onRemove={() => setEditingPart({ ...editingPart, questions: editingPart.questions.filter((_, j) => j !== qi) })}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-6 pt-4 border-t border-border">
            <button type="button" onClick={savePart} className={btnPrimary}>Save Part</button>
            <button type="button" onClick={() => { setModalOpen(false); setEditingPart(null); }} className={btnSecondary}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Listening Tab ────────────────────────────────────────────────
function ListeningTab({ parts, setParts, pendingAudioFiles, setPendingAudioFiles }: { parts: ListeningPart[]; setParts: (p: ListeningPart[]) => void; pendingAudioFiles: Record<string, File>; setPendingAudioFiles: (fn: (prev: Record<string, File>) => Record<string, File>) => void }) {
  const [editingPart, setEditingPart] = useState<ListeningPart | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const savePart = () => {
    if (!editingPart) return;
    const idx = parts.findIndex((p) => p.id === editingPart.id);
    if (idx >= 0) { const copy = [...parts]; copy[idx] = editingPart; setParts(copy); }
    else setParts([...parts, editingPart]);
    setModalOpen(false);
    setEditingPart(null);
  };

  const deletePart = (id: string) => setParts(parts.filter((p) => p.id !== id));

  const addQuestion = () => {
    if (!editingPart) return;
    setEditingPart({
      ...editingPart,
      questions: [...editingPart.questions, { id: uid("lq"), type: "fill_blank", prompt: "", correctAnswer: "" }],
    });
  };

  const handleAudioFile = (partId: string, file: File | null) => {
    if (!file) return;
    setPendingAudioFiles((prev) => ({ ...prev, [partId]: file }));
    if (editingPart && editingPart.id === partId) {
      setEditingPart({ ...editingPart, audioFile: file.name });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{parts.length} part(s) created</p>
        <button type="button" onClick={() => { setEditingPart({ id: uid("lp"), title: `Part ${parts.length + 1}`, audioFile: null, questions: [] }); setModalOpen(true); }} className={btnSecondary}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
          Create Part
        </button>
      </div>

      {parts.map((p) => (
        <div key={p.id} className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-foreground">{p.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {p.questions.length} question(s) · {p.audioFile || pendingAudioFiles[p.id] ? "Audio attached" : "No audio"}
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setEditingPart({ ...p }); setModalOpen(true); }} className={btnSecondary}>Edit</button>
              <button type="button" onClick={() => deletePart(p.id)} className={btnDanger}>Delete</button>
            </div>
          </div>
        </div>
      ))}

      {modalOpen && editingPart && (
        <Modal title={editingPart.title || "Edit Part"} onClose={() => { setModalOpen(false); setEditingPart(null); }}>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Part title</label>
              <input value={editingPart.title} onChange={(e) => setEditingPart({ ...editingPart, title: e.target.value })} className={`mt-1.5 ${inputClass}`} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Audio file (MP3)</label>
              <div className="mt-1.5 flex items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-card-elevated transition">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  Upload
                  <input type="file" accept=".mp3,audio/mpeg" onChange={(e) => handleAudioFile(editingPart.id, e.target.files?.[0] ?? null)} className="hidden" />
                </label>
                <span className="text-xs text-muted-foreground truncate">{pendingAudioFiles[editingPart.id]?.name || editingPart.audioFile || "No file selected"}</span>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-foreground">Questions ({editingPart.questions.length})</p>
                <button type="button" onClick={addQuestion} className="text-xs text-primary hover:text-primary-hover font-semibold">+ Add Question</button>
              </div>
              <div className="space-y-3">
                {editingPart.questions.map((q, qi) => (
                  <QuestionEditor
                    key={q.id}
                    q={q}
                    onChange={(updated) => { const qs = [...editingPart.questions]; qs[qi] = updated; setEditingPart({ ...editingPart, questions: qs }); }}
                    onRemove={() => setEditingPart({ ...editingPart, questions: editingPart.questions.filter((_, j) => j !== qi) })}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-6 pt-4 border-t border-border">
            <button type="button" onClick={savePart} className={btnPrimary}>Save Part</button>
            <button type="button" onClick={() => { setModalOpen(false); setEditingPart(null); }} className={btnSecondary}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Writing Tab ──────────────────────────────────────────────────
function WritingTab({ tasks, setTasks }: { tasks: WritingTask[]; setTasks: (t: WritingTask[]) => void }) {
  const addTask = () => setTasks([...tasks, { id: uid("wt"), prompt: "" }]);
  const updateTask = (i: number, prompt: string) => { const copy = [...tasks]; copy[i] = { ...copy[i], prompt }; setTasks(copy); };
  const removeTask = (i: number) => setTasks(tasks.filter((_, j) => j !== i));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{tasks.length} task(s)</p>
        <button type="button" onClick={addTask} className={btnSecondary}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
          Add Task
        </button>
      </div>
      {tasks.map((t, i) => (
        <div key={t.id} className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Task {i + 1}</p>
            <button type="button" onClick={() => removeTask(i)} className={btnDanger}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              Remove
            </button>
          </div>
          <textarea value={t.prompt} onChange={(e) => updateTask(i, e.target.value)} rows={4} className={inputClass} placeholder="Enter the writing task prompt. Students will type their response here." />
        </div>
      ))}
    </div>
  );
}

// ─── Review Tab ───────────────────────────────────────────────────
function ReviewTab({ title, timeLimits, readingParts, listeningParts, writingTasks }: {
  title: string;
  timeLimits: { listeningSec: number; readingSec: number; writingSec: number };
  readingParts: ReadingPart[];
  listeningParts: ListeningPart[];
  writingTasks: WritingTask[];
}) {
  const fmt = (s: number) => `${Math.floor(s / 60)}m ${s % 60}s`;
  const rqCount = readingParts.reduce((s, p) => s + p.questions.length, 0);
  const lqCount = listeningParts.reduce((s, p) => s + p.questions.length, 0);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-xs font-medium text-muted-foreground mb-1">Title</p>
        <p className="text-lg font-semibold text-foreground">{title || "Untitled"}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Listening", time: fmt(timeLimits.listeningSec), parts: listeningParts.length, qs: lqCount },
          { label: "Reading", time: fmt(timeLimits.readingSec), parts: readingParts.length, qs: rqCount },
          { label: "Writing", time: fmt(timeLimits.writingSec), parts: writingTasks.length, qs: 0 },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
            <p className="text-lg font-bold text-foreground mt-1">{s.parts} {s.label === "Writing" ? "task(s)" : "part(s)"}</p>
            {s.qs > 0 && <p className="text-xs text-muted-foreground mt-0.5">{s.qs} question(s)</p>}
            <p className="text-xs text-primary mt-1 font-medium">{s.time}</p>
          </div>
        ))}
      </div>

      {readingParts.length > 0 && (
        <Section title="Reading Parts">
          {readingParts.map((p) => (
            <div key={p.id} className="rounded-lg border border-border bg-card-elevated p-4 mb-2">
              <p className="text-sm font-semibold text-foreground">{p.title}</p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.passage || "No passage"}</p>
              <p className="text-xs text-muted-foreground mt-1">{p.questions.length} question(s): {p.questions.map((q) => q.type.replace("_", " ")).join(", ")}</p>
            </div>
          ))}
        </Section>
      )}

      {listeningParts.length > 0 && (
        <Section title="Listening Parts">
          {listeningParts.map((p) => (
            <div key={p.id} className="rounded-lg border border-border bg-card-elevated p-4 mb-2">
              <p className="text-sm font-semibold text-foreground">{p.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{p.audioFile ? "Audio: " + p.audioFile : "No audio"} · {p.questions.length} question(s)</p>
            </div>
          ))}
        </Section>
      )}

      {writingTasks.length > 0 && (
        <Section title="Writing Tasks">
          {writingTasks.map((t, i) => (
            <div key={t.id} className="rounded-lg border border-border bg-card-elevated p-4 mb-2">
              <p className="text-sm font-semibold text-foreground">Task {i + 1}</p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{t.prompt || "No prompt"}</p>
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-semibold text-foreground mb-2">{title}</p>
      {children}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh] bg-black/50 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div className="bg-card rounded-xl max-w-2xl w-full shadow-xl border border-border" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────
export default function NewMockPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [listeningSec, setListeningSec] = useState(1800);
  const [readingSec, setReadingSec] = useState(3600);
  const [writingSec, setWritingSec] = useState(3600);
  const [readingParts, setReadingParts] = useState<ReadingPart[]>([]);
  const [listeningParts, setListeningParts] = useState<ListeningPart[]>([]);
  const [writingTasks, setWritingTasks] = useState<WritingTask[]>([]);
  const [tab, setTab] = useState<Tab>("reading");
  const [createdPin, setCreatedPin] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [savedMockId, setSavedMockId] = useState<string | null>(null);
  const [pendingAudioFiles, setPendingAudioFiles] = useState<Record<string, File>>({});

  const saveDraft = useCallback(async (): Promise<boolean> => {
    setErr(null);
    if (!title.trim()) { setErr("Please enter a title."); return false; }
    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        status: "draft",
        timeLimits: { listeningSec, readingSec, writingSec },
        sections: {
          reading: { parts: readingParts },
          listening: { parts: listeningParts.map((p) => ({ ...p, audioFile: p.audioFile && !p.audioFile.includes(".") ? null : p.audioFile })) },
          writing: { tasks: writingTasks },
        },
      };

      let id = savedMockId;
      if (id) {
        await apiFetch(`/api/admin/mocks/${id}`, { method: "PATCH", json: payload });
      } else {
        const doc = await apiFetch<{ _id: string; pinCode: string }>("/api/admin/mocks", { method: "POST", json: payload });
        id = doc._id;
        setSavedMockId(id);
        setCreatedPin(doc.pinCode);
      }

      const uploadedPartIds: string[] = [];
      for (const part of listeningParts) {
        const file = pendingAudioFiles[part.id];
        if (file && id) {
          const result = await uploadPartAudio(id, part.id, file);
          if (result.filename) {
            setListeningParts((prev) => prev.map((p) => p.id === part.id ? { ...p, audioFile: result.filename } : p));
          }
          uploadedPartIds.push(part.id);
        }
      }
      if (uploadedPartIds.length > 0) {
        setPendingAudioFiles((prev) => {
          const next = { ...prev };
          for (const pid of uploadedPartIds) delete next[pid];
          return next;
        });
      }
      return true;
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : "Failed to save"); return false; }
    finally { setLoading(false); }
  }, [title, listeningSec, readingSec, writingSec, readingParts, listeningParts, writingTasks, savedMockId, pendingAudioFiles]);

  const finalSave = async () => {
    const ok = await saveDraft();
    if (ok) router.push("/admin/mocks");
  };

  if (createdPin && tab !== "review") {
    // After first save, show pin briefly
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "reading", label: "Reading", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> },
    { key: "listening", label: "Listening", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg> },
    { key: "writing", label: "Writing", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg> },
    { key: "review", label: "Review", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
  ];

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Create mock test</h1>
        <p className="mt-1 text-sm text-muted-foreground">Build your test section by section, then review and save.</p>
      </div>

      {/* Title & time limits */}
      <div className="rounded-xl border border-border bg-card p-5 mb-6 space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Mock title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={`mt-1.5 ${inputClass}`} placeholder="e.g. IELTS Practice Test 1" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">Time limits</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Listening (min)", val: listeningSec, set: setListeningSec },
              { label: "Reading (min)", val: readingSec, set: setReadingSec },
              { label: "Writing (min)", val: writingSec, set: setWritingSec },
            ].map((f) => (
              <div key={f.label}>
                <p className="text-[11px] text-muted-foreground mb-1">{f.label}</p>
                <input type="number" min={1} value={Math.round(f.val / 60)} onChange={(e) => f.set(Number(e.target.value) * 60)} className={inputClass} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 p-1 rounded-lg bg-card-elevated border border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition ${
              tab === t.key ? "bg-card text-primary shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "reading" && <ReadingTab parts={readingParts} setParts={setReadingParts} />}
      {tab === "listening" && <ListeningTab parts={listeningParts} setParts={setListeningParts} pendingAudioFiles={pendingAudioFiles} setPendingAudioFiles={setPendingAudioFiles} />}
      {tab === "writing" && <WritingTab tasks={writingTasks} setTasks={setWritingTasks} />}
      {tab === "review" && <ReviewTab title={title} timeLimits={{ listeningSec, readingSec, writingSec }} readingParts={readingParts} listeningParts={listeningParts} writingTasks={writingTasks} />}

      {/* Footer actions */}
      {err && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {err}
        </div>
      )}

      {createdPin && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-success-border bg-success-bg p-3 text-sm text-success-text">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          Draft saved! PIN: <span className="font-mono font-bold tracking-widest">{createdPin}</span>
        </div>
      )}

      <div className="flex items-center gap-3 mt-6 pt-6 border-t border-border">
        <button type="button" disabled={loading} onClick={() => void saveDraft()} className={btnSecondary}>
          {loading ? "Saving..." : savedMockId ? "Update Draft" : "Save as Draft"}
        </button>
        {tab === "review" && (
          <button type="button" disabled={loading} onClick={() => void finalSave()} className={btnPrimary}>
            {loading ? "Saving..." : "Save & Go to Mocks"}
          </button>
        )}
      </div>
    </div>
  );
}
