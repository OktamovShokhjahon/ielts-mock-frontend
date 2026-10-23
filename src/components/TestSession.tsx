"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getApiUrl } from "@/lib/api";
import type { Attempt, MockTest, ListeningPart, ReadingPart, WritingTask } from "@/lib/types";
import { QuestionBlock } from "./QuestionBlock";

type Phase = "listening" | "reading" | "writing" | "done";

const STORAGE_PREFIX = "ielts_timer_";
const LISTEN_COUNTDOWN_SEC = 5;

type Props = { attemptId: string };

export function TestSession({ attemptId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [mock, setMock] = useState<MockTest | null>(null);
  const [phase, setPhase] = useState<Phase>("listening");
  const [remaining, setRemaining] = useState(0);
  const [blurWarn, setBlurWarn] = useState(0);
  const [listenAns, setListenAns] = useState<Record<string, string>>({});
  const [readAns, setReadAns] = useState<Record<string, string>>({});
  const [writingAns, setWritingAns] = useState<Record<string, string>>({});
  /** Active part/task within reading & writing — user can switch freely. */
  const [readingPartIndex, setReadingPartIndex] = useState(0);
  const [writingTaskIndex, setWritingTaskIndex] = useState(0);
  const [listeningPartIndex, setListeningPartIndex] = useState(0);
  /** 5…1 then 0 triggers play; null = no overlay. */
  const [listenCountdown, setListenCountdown] = useState<number | null>(null);
  const listenAudioRef = useRef<HTMLAudioElement | null>(null);
  const advancing = useRef(false);
  const [listenAudioProgress, setListenAudioProgress] = useState({ current: 0, duration: 0 });
  const [listenContinueConfirm, setListenContinueConfirm] = useState(false);
  /** Each listening part's audio may play only once per attempt. */
  const [listenPartAudioFinished, setListenPartAudioFinished] = useState<Record<string, boolean>>({});
  const [listenPartStoredDuration, setListenPartStoredDuration] = useState<Record<string, number>>({});
  const [listenAudioPlaying, setListenAudioPlaying] = useState(false);
  const listenRef = useRef(listenAns);
  const readRef = useRef(readAns);
  const writingRef = useRef(writingAns);
  listenRef.current = listenAns;
  readRef.current = readAns;
  writingRef.current = writingAns;
  /** Latest mock for listening effects without re-running when PATCH replaces mock by reference. */
  const mockRef = useRef(mock);
  mockRef.current = mock;

  const endsKey = `${STORAGE_PREFIX}${attemptId}`;

  const patchAttempt = useCallback(
    async (body: Record<string, unknown>) => {
      const data = await apiFetch<{ attempt: Attempt; mock: MockTest | null }>(`/api/attempts/${attemptId}`, { method: "PATCH", json: body });
      setAttempt(data.attempt);
      if (data.mock) setMock(data.mock as MockTest);
    },
    [attemptId]
  );

  const load = useCallback(async () => {
    const data = await apiFetch<{ attempt: Attempt; mock: MockTest }>(`/api/attempts/${attemptId}`);
    setAttempt(data.attempt);
    setMock(data.mock);
    setListenAns({ ...(data.attempt.answers?.listening || {}) });
    setReadAns({ ...(data.attempt.answers?.reading || {}) });
    setWritingAns({ ...(data.attempt.answers?.writing || {}) });
    setBlurWarn(data.attempt.visibilityBlurCount || 0);
    const cs = data.attempt.currentSection;
    if (data.attempt.completedAt || cs === "done") setPhase("done");
    else if (cs === "reading" || cs === "writing") setPhase(cs);
    else setPhase("listening");
    setLoading(false);
  }, [attemptId]);

  useEffect(() => { load().catch((e: Error) => { setErr(e.message); setLoading(false); }); }, [load]);

  /** Listening: 5s countdown when entering a part with audio that has not been played yet; then autoplay once. */
  useEffect(() => {
    if (phase !== "listening") {
      setListenCountdown(null);
      setListenAudioPlaying(false);
      const a = listenAudioRef.current;
      if (a) {
        a.pause();
        a.currentTime = 0;
      }
      return;
    }
    const parts = mockRef.current?.sections?.listening?.parts ?? [];
    const idx = parts.length ? Math.min(listeningPartIndex, parts.length - 1) : 0;
    const part = parts[idx];
    if (!part?.audioFile) {
      setListenCountdown(null);
      return;
    }
    if (listenPartAudioFinished[part.id]) {
      setListenCountdown(null);
      return;
    }
    const a = listenAudioRef.current;
    if (a) {
      a.pause();
      a.currentTime = 0;
    }
    setListenCountdown(LISTEN_COUNTDOWN_SEC);
  }, [phase, listeningPartIndex, listenPartAudioFinished, mock?._id]);

  useEffect(() => {
    if (listenCountdown === null || listenCountdown <= 0) return;
    const id = window.setTimeout(() => {
      setListenCountdown((c) => {
        if (c === null) return null;
        return c <= 1 ? 0 : c - 1;
      });
    }, 1000);
    return () => clearTimeout(id);
  }, [listenCountdown]);

  useEffect(() => {
    if (listenCountdown !== 0) return;
    setListenCountdown(null);
    const a = listenAudioRef.current;
    if (!a?.src) return;
    const parts = mockRef.current?.sections?.listening?.parts ?? [];
    const idx = parts.length ? Math.min(listeningPartIndex, parts.length - 1) : 0;
    const part = parts[idx];
    if (part?.id && listenPartAudioFinished[part.id]) return;
    setListenAudioPlaying(true);
    const tryPlay = () =>
      void a.play().catch(() => {
        setListenAudioPlaying(false);
      });
    if (a.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) tryPlay();
    else a.addEventListener("canplay", tryPlay, { once: true });
  }, [listenCountdown, listeningPartIndex, listenPartAudioFinished]);

  useEffect(() => {
    if (phase !== "listening") return;
    const parts = mockRef.current?.sections?.listening?.parts ?? [];
    const idx = parts.length ? Math.min(listeningPartIndex, parts.length - 1) : 0;
    const part = parts[idx];
    if (part?.id && listenPartAudioFinished[part.id]) {
      const d = listenPartStoredDuration[part.id] ?? 0;
      setListenAudioProgress({ current: d, duration: d });
      return;
    }
    setListenAudioProgress({ current: 0, duration: 0 });
  }, [listeningPartIndex, phase, listenPartAudioFinished, listenPartStoredDuration, mock?._id]);

  const timeLimits = mock?.timeLimits;

  const scheduleEndsAt = useCallback((nextPhase: Phase, sec: number) => {
    const ends = new Date(Date.now() + sec * 1000).toISOString();
    try { localStorage.setItem(endsKey, JSON.stringify({ phase: nextPhase, endsAt: ends })); } catch { /* ignore */ }
    return ends;
  }, [endsKey]);

  const advancePhase = useCallback(async (from: Phase) => {
    if (advancing.current) return;
    advancing.current = true;
    try {
      if (!timeLimits || !mock) return;
      if (from === "listening") {
        const ends = scheduleEndsAt("reading", timeLimits.readingSec);
        await patchAttempt({ currentSection: "reading", sectionEndsAt: ends, answers: { listening: { ...listenRef.current } } });
        setPhase("reading");
        return;
      }
      if (from === "reading") {
        const ends = scheduleEndsAt("writing", timeLimits.writingSec);
        await patchAttempt({ currentSection: "writing", sectionEndsAt: ends, answers: { listening: { ...listenRef.current }, reading: { ...readRef.current } } });
        setPhase("writing");
        return;
      }
      if (from === "writing") {
        await apiFetch(`/api/attempts/${attemptId}/complete`, { method: "POST", json: { answers: { listening: { ...listenRef.current }, reading: { ...readRef.current }, writing: { ...writingRef.current } } } });
        try { localStorage.removeItem(endsKey); } catch { /* ignore */ }
        setPhase("done");
      }
    } finally { advancing.current = false; }
  }, [attemptId, mock, patchAttempt, scheduleEndsAt, timeLimits, endsKey]);

  useEffect(() => {
    if (!attempt || !mock || !timeLimits || phase === "done") return;
    let endsAtMs: number;
    try {
      const raw = localStorage.getItem(endsKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { phase?: Phase; endsAt?: string };
        if (parsed.phase === phase && parsed.endsAt) endsAtMs = new Date(parsed.endsAt).getTime();
        else throw new Error("no match");
      } else throw new Error("no storage");
    } catch {
      if (attempt.sectionEndsAt) endsAtMs = new Date(attempt.sectionEndsAt).getTime();
      else {
        const sec = phase === "listening" ? timeLimits.listeningSec : phase === "reading" ? timeLimits.readingSec : timeLimits.writingSec;
        endsAtMs = new Date(scheduleEndsAt(phase, sec)).getTime();
      }
    }
    const tick = () => {
      const left = Math.max(0, Math.floor((endsAtMs - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0 && !advancing.current) void advancePhase(phase);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [attempt, mock, timeLimits, phase, advancePhase, scheduleEndsAt, endsKey]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== "hidden") return;
      setBlurWarn((prev) => {
        const n = prev + 1;
        void apiFetch(`/api/attempts/${attemptId}`, { method: "PATCH", json: { visibilityBlurCount: n } }).catch(() => {});
        return n;
      });
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [attemptId]);

  useEffect(() => {
    history.pushState(null, "", window.location.href);
    const trap = () => history.go(1);
    window.addEventListener("popstate", trap);
    return () => window.removeEventListener("popstate", trap);
  }, []);

  const setListen = (id: string, v: string) => {
    setListenAns((prev) => { const next = { ...prev, [id]: v }; void patchAttempt({ answers: { listening: next } }); return next; });
  };
  const setRead = (id: string, v: string) => {
    setReadAns((prev) => { const next = { ...prev, [id]: v }; void patchAttempt({ answers: { reading: next } }); return next; });
  };
  const setWriting = (taskId: string, v: string) => {
    setWritingAns((prev) => { const next = { ...prev, [taskId]: v }; void patchAttempt({ answers: { writing: next } }); return next; });
  };

  const listeningParts: ListeningPart[] = mock?.sections?.listening?.parts || [];
  const listenIdx = listeningParts.length ? Math.min(listeningPartIndex, listeningParts.length - 1) : 0;
  const activeListenPart = listeningParts[listenIdx];
  const listenAudioSrc =
    activeListenPart?.audioFile &&
    phase === "listening" &&
    activeListenPart.id &&
    !listenPartAudioFinished[activeListenPart.id]
      ? `${getApiUrl()}/uploads/${activeListenPart.audioFile}`
      : undefined;
  const readingParts: ReadingPart[] = mock?.sections?.reading?.parts || [];
  const writingTasks: WritingTask[] = mock?.sections?.writing?.tasks || [];

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (err || !mock || !attempt) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 text-red-500"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <p className="text-sm text-red-600">{err || "Unable to load test."}</p>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="max-w-lg mx-auto py-20 px-4 text-center">
        <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-success-bg border border-success-border">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-success-text"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h2 className="text-xl font-bold text-foreground">Test completed!</h2>
          <p className="mt-2 text-sm text-muted-foreground">Congratulations! Your answers have been submitted.</p>
          <button type="button" onClick={() => router.push("/")} className="mt-6 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary-hover active:scale-[0.98]">
            Back to home
          </button>
        </div>
      </div>
    );
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const fmtAudioClock = (sec: number) => {
    if (!Number.isFinite(sec) || sec < 0) return "—";
    const s = Math.floor(sec);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, "0")}`;
  };
  const isLow = remaining <= 120;

  const sectionLabels: Record<string, string> = { listening: "Listening", reading: "Reading", writing: "Writing" };
  const nextLabels: Record<string, string> = { listening: "Continue to Reading", reading: "Continue to Writing", writing: "Submit test" };

  const readingIdx = readingParts.length ? Math.min(readingPartIndex, readingParts.length - 1) : 0;
  const activeReadingPart = readingParts[readingIdx];
  const writingIdx = writingTasks.length ? Math.min(writingTaskIndex, writingTasks.length - 1) : 0;
  const activeWritingTask = writingTasks[writingIdx];

  const shellWide = phase === "reading" || phase === "writing";

  const activeListenAudioDone = !!(activeListenPart?.id && listenPartAudioFinished[activeListenPart.id]);
  const listenInteractLocked =
    phase === "listening" &&
    ((listenCountdown !== null && listenCountdown > 0) || listenAudioPlaying);

  return (
    <div
      className={`mx-auto flex w-full min-h-0 flex-1 flex-col px-4 py-3 ${
        shellWide ? "max-w-[1600px] overflow-hidden pb-2" : "max-w-3xl overflow-y-auto py-6 pb-24"
      }`}
    >
      {blurWarn > 0 && (
        <div className="mb-3 flex shrink-0 items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          Tab switch detected ({blurWarn}). This is being recorded.
        </div>
      )}

      <div className={`flex shrink-0 items-center justify-between rounded-xl border border-border bg-card px-5 py-4 shadow-sm ${shellWide ? "mb-3" : "mb-6"}`}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
            {phase === "listening" && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>}
            {phase === "reading" && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>}
            {phase === "writing" && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Section</p>
            <p className="text-sm font-semibold text-foreground">{sectionLabels[phase]}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Time remaining</p>
          <p className={`text-xl font-mono font-bold tabular-nums ${isLow ? "text-red-500" : "text-foreground"}`}>{fmt(remaining)}</p>
        </div>
      </div>

      {phase === "listening" && (
        <section className="relative min-h-0 flex-1 space-y-4 overflow-y-auto">
          {listenCountdown !== null && listenCountdown > 0 && (
            <div
              className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-background/70 backdrop-blur-md"
              aria-live="polite"
              aria-atomic="true"
            >
              <p className="text-sm font-medium text-muted-foreground">Listening starts in</p>
              <p className="text-7xl font-bold tabular-nums tracking-tight text-foreground sm:text-8xl">{listenCountdown}</p>
            </div>
          )}

          {listeningParts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No listening parts in this test.</p>
          ) : (
            <>
              {listeningParts.length > 1 && (
                <div className="flex shrink-0 flex-wrap gap-2" role="tablist" aria-label="Listening parts">
                  {listeningParts.map((part, i) => (
                    <button
                      key={part.id}
                      type="button"
                      role="tab"
                      aria-selected={listenIdx === i}
                      disabled={listenInteractLocked}
                      onClick={() => setListeningPartIndex(i)}
                      className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        listenIdx === i
                          ? "border-primary bg-primary-soft text-primary shadow-sm"
                          : "border-border bg-card text-foreground hover:bg-card-elevated"
                      }`}
                    >
                      {part.title?.trim() || `Part ${i + 1}`}
                    </button>
                  ))}
                </div>
              )}

              <audio
                key={activeListenPart?.id ?? "listen"}
                ref={listenAudioRef}
                src={listenAudioSrc}
                preload="auto"
                playsInline
                className="hidden"
                controls={false}
                onLoadedMetadata={(e) => {
                  const el = e.currentTarget;
                  const d = el.duration;
                  setListenAudioProgress((p) => ({ ...p, duration: Number.isFinite(d) ? d : 0 }));
                }}
                onDurationChange={(e) => {
                  const el = e.currentTarget;
                  const d = el.duration;
                  setListenAudioProgress((p) => ({ ...p, duration: Number.isFinite(d) ? d : 0 }));
                }}
                onTimeUpdate={(e) => {
                  const el = e.currentTarget;
                  setListenAudioProgress((p) => ({
                    current: el.currentTime,
                    duration: Number.isFinite(el.duration) ? el.duration : p.duration,
                  }));
                }}
                onPlay={() => setListenAudioPlaying(true)}
                onEnded={(e) => {
                  const el = e.currentTarget;
                  const dur = Number.isFinite(el.duration) ? el.duration : 0;
                  setListenAudioProgress({ current: dur, duration: dur });
                  setListenAudioPlaying(false);
                  const pid = activeListenPart?.id;
                  if (pid) {
                    setListenPartAudioFinished((prev) => ({ ...prev, [pid]: true }));
                    setListenPartStoredDuration((prev) => ({ ...prev, [pid]: dur }));
                  }
                }}
                onPause={(e) => {
                  const el = e.currentTarget;
                  if (!el.ended) void el.play().catch(() => {});
                }}
              >
                Your browser does not support audio.
              </audio>

              <div className="rounded-xl border border-border bg-card p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold text-foreground">{activeListenPart?.title?.trim() || `Part ${listenIdx + 1}`}</h3>
                  {activeListenPart?.audioFile ? (
                    <span className="text-xs font-medium text-muted-foreground">
                      {listenCountdown !== null && listenCountdown > 0
                        ? "Starting soon…"
                        : activeListenAudioDone
                          ? "Played once — cannot replay"
                          : listenAudioPlaying
                            ? "Playing — pause disabled"
                            : "Ready"}
                    </span>
                  ) : null}
                </div>
                {activeListenPart?.audioFile && listenCountdown === null && (
                  <div className="mb-3 space-y-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs tabular-nums text-muted-foreground sm:text-sm">
                      <span>
                        <span className="font-medium text-foreground">{fmtAudioClock(listenAudioProgress.current)}</span>
                        <span className="mx-1">/</span>
                        <span>{fmtAudioClock(listenAudioProgress.duration)}</span>
                        <span className="ml-2 text-muted-foreground">total</span>
                      </span>
                      <span>
                        <span className="font-medium text-foreground">
                          {fmtAudioClock(Math.max(0, listenAudioProgress.duration - listenAudioProgress.current))}
                        </span>
                        <span className="ml-1.5 text-muted-foreground">left</span>
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-[width] duration-300 ease-linear"
                        style={{
                          width:
                            activeListenAudioDone || listenAudioProgress.duration > 0
                              ? `${Math.min(100, activeListenAudioDone ? 100 : (listenAudioProgress.current / listenAudioProgress.duration) * 100)}%`
                              : "0%",
                        }}
                      />
                    </div>
                  </div>
                )}
                {!activeListenPart?.audioFile && (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                    No audio file for this part.
                  </div>
                )}
              </div>

              {(activeListenPart?.questions ?? []).map((q, qIdx) => {
                const qNum = listeningParts.slice(0, listenIdx).reduce((s, p) => s + p.questions.length, 0) + qIdx + 1;
                return (
                  <QuestionBlock key={q.id} q={q} value={listenAns[q.id] || ""} onChange={(v) => setListen(q.id, v)} questionNumber={qNum} />
                );
              })}
            </>
          )}
          <button
            type="button"
            onClick={() => setListenContinueConfirm(true)}
            disabled={listenInteractLocked}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {nextLabels.listening}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>

          {listenContinueConfirm && (
            <div
              className="fixed inset-0 z-[90] flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm"
              role="dialog"
              aria-modal="true"
              aria-labelledby="listen-confirm-title"
            >
              <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg">
                <h2 id="listen-confirm-title" className="text-lg font-semibold text-foreground">
                  Are you sure?
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">You will move on to the Reading section. You cannot return to Listening.</p>
                <div className="mt-6 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setListenContinueConfirm(false)}
                    className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-card-elevated"
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setListenContinueConfirm(false);
                      void advancePhase("listening");
                    }}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
                  >
                    Yes
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {phase === "reading" && (
        <section className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
          {readingParts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reading parts in this test.</p>
          ) : (
            <>
              <div className="flex shrink-0 flex-wrap gap-2" role="tablist" aria-label="Reading parts">
                {readingParts.map((part, i) => (
                  <button
                    key={part.id}
                    type="button"
                    role="tab"
                    aria-selected={readingIdx === i}
                    onClick={() => setReadingPartIndex(i)}
                    className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
                      readingIdx === i
                        ? "border-primary bg-primary-soft text-primary shadow-sm"
                        : "border-border bg-card text-foreground hover:bg-card-elevated"
                    }`}
                  >
                    {part.title?.trim() || `Part ${i + 1}`}
                  </button>
                ))}
              </div>

              <div className="grid min-h-0 min-w-0 w-full flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-4 lg:grid-cols-2 lg:grid-rows-1 lg:gap-6">
                <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card-elevated shadow-sm lg:min-h-0">
                  <div className="shrink-0 border-b border-border bg-card px-4 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Passage</p>
                    <p className="text-sm font-semibold text-foreground break-words">{activeReadingPart?.title || `Part ${readingIdx + 1}`}</p>
                  </div>
                  <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-4 sm:p-5">
                    {activeReadingPart?.passage ? (
                      <div className="text-sm whitespace-pre-wrap break-words text-foreground leading-relaxed">{activeReadingPart.passage}</div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No passage text for this part.</p>
                    )}
                  </div>
                </div>

                <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm lg:min-h-0">
                  <div className="shrink-0 border-b border-border bg-card-elevated px-4 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Questions</p>
                    <p className="text-sm text-foreground break-words">
                      {activeReadingPart?.questions.length ?? 0} question{(activeReadingPart?.questions.length ?? 0) === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-3 sm:p-4 [scrollbar-gutter:stable]">
                    {(activeReadingPart?.questions ?? []).map((q, qIdx) => {
                      const qNum =
                        readingParts.slice(0, readingIdx).reduce((s, p) => s + p.questions.length, 0) + qIdx + 1;
                      return (
                        <QuestionBlock key={q.id} q={q} value={readAns[q.id] || ""} onChange={(v) => setRead(q.id, v)} questionNumber={qNum} />
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
          <button type="button" onClick={() => void advancePhase("reading")} className="mt-2 inline-flex w-fit shrink-0 items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary-hover active:scale-[0.98]">
            {nextLabels.reading}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </section>
      )}

      {phase === "writing" && (
        <section className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
          {writingTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No writing tasks in this test.</p>
          ) : (
            <>
              <div className="flex shrink-0 flex-wrap gap-2" role="tablist" aria-label="Writing tasks">
                {writingTasks.map((task, i) => (
                  <button
                    key={task.id}
                    type="button"
                    role="tab"
                    aria-selected={writingIdx === i}
                    onClick={() => setWritingTaskIndex(i)}
                    className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
                      writingIdx === i
                        ? "border-primary bg-primary-soft text-primary shadow-sm"
                        : "border-border bg-card text-foreground hover:bg-card-elevated"
                    }`}
                  >
                    Task {i + 1}
                  </button>
                ))}
              </div>

              <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-4 lg:grid-cols-2 lg:grid-rows-1 lg:gap-6">
                <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card-elevated shadow-sm lg:min-h-0">
                  <div className="shrink-0 border-b border-border bg-card px-4 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Task</p>
                    <p className="text-sm font-semibold text-foreground">Task {writingIdx + 1}</p>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{activeWritingTask?.prompt || "—"}</p>
                  </div>
                </div>

                <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm lg:min-h-0">
                  <div className="shrink-0 border-b border-border bg-card-elevated px-4 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your answer</p>
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 sm:p-4">
                    <textarea
                      value={activeWritingTask ? (writingAns[activeWritingTask.id] || "") : ""}
                      onChange={(e) => activeWritingTask && setWriting(activeWritingTask.id, e.target.value)}
                      onCopy={(e) => e.preventDefault()}
                      onPaste={(e) => e.preventDefault()}
                      onCut={(e) => e.preventDefault()}
                      disabled={!activeWritingTask}
                      className="min-h-0 w-full flex-1 resize-none rounded-lg border border-border bg-background p-4 text-sm text-foreground leading-relaxed focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Write your response here..."
                    />
                  </div>
                </div>
              </div>
            </>
          )}
          <button type="button" onClick={() => void advancePhase("writing")} className="mt-2 inline-flex w-fit shrink-0 items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary-hover active:scale-[0.98]">
            {nextLabels.writing}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </button>
        </section>
      )}
    </div>
  );
}
