"use client";

import { useState, useEffect } from "react";
import type { Question } from "@/lib/types";

type Props = {
  q: Question;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  questionNumber?: number;
};

const fieldClass = "rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring";

function FillBlankPrompt({ prompt, value, onChange, disabled }: { prompt: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const blankPattern = /_{2,}|______/;
  const match = blankPattern.exec(prompt);

  if (!match) {
    return (
      <div className="min-w-0">
        <p className="mb-3 break-words text-sm font-medium leading-relaxed text-foreground">{prompt}</p>
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className={`w-full min-w-0 max-w-full ${fieldClass}`} placeholder="Type your answer..." />
      </div>
    );
  }

  const before = prompt.slice(0, match.index);
  const after = prompt.slice(match.index + match[0].length);

  return (
    <div className="min-w-0 break-words text-sm font-medium leading-loose text-foreground">
      {before}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="mx-1 inline-block min-w-0 max-w-[min(12rem,100%)] rounded-md border-b-2 border-primary/40 bg-primary-soft px-2 py-1 text-center text-sm text-foreground transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
        placeholder="..."
      />
      {after}
    </div>
  );
}

export function QuestionBlock({ q, value, onChange, disabled, questionNumber }: Props) {
  const [matchAnswers, setMatchAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (q.type === "matching" && value) {
      try { setMatchAnswers(JSON.parse(value)); } catch { /* ignore */ }
    }
  }, [q.type, value]);

  const updateMatch = (left: string, right: string) => {
    const next = { ...matchAnswers, [left]: right };
    setMatchAnswers(next);
    onChange(JSON.stringify(next));
  };

  return (
    <div className="mb-3 w-full min-w-0 max-w-full overflow-x-hidden rounded-xl border border-border bg-card p-5">
      <div className="flex min-w-0 gap-3">
        {questionNumber != null && (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary-soft text-xs font-bold text-primary mt-0.5">
            {questionNumber}
          </span>
        )}
        <div className="min-w-0 flex-1">
          {q.type !== "fill_blank" && q.type !== "matching" && (
            <p className="mb-3 break-words text-sm font-medium leading-relaxed text-foreground">{q.prompt}</p>
          )}

          {q.type === "multiple_choice" && q.options && (
            <div className="space-y-1.5">
              {q.options.map((opt) => (
                <label
                  key={opt}
                  className={`flex min-w-0 cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition ${
                    value === opt ? "border-primary/30 bg-primary-soft text-foreground" : "border-transparent hover:bg-card-elevated text-foreground"
                  }`}
                >
                  <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition ${value === opt ? "border-primary bg-primary" : "border-border"}`}>
                    {value === opt && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                  <input type="radio" name={q.id} value={opt} checked={value === opt} onChange={() => onChange(opt)} disabled={disabled} className="sr-only" />
                  <span className="min-w-0 flex-1 break-words">{opt}</span>
                </label>
              ))}
            </div>
          )}

          {q.type === "true_false_ng" && (
            <div className="flex flex-wrap gap-2">
              {["True", "False", "Not Given"].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => !disabled && onChange(opt)}
                  disabled={disabled}
                  className={`rounded-lg px-4 py-2 text-sm font-medium border transition ${
                    value === opt ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:bg-card-elevated"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {q.type === "fill_blank" && (
            <FillBlankPrompt prompt={q.prompt} value={value} onChange={onChange} disabled={disabled} />
          )}

          {q.type === "matching" && q.matchingPairs && (
            <div className="min-w-0 space-y-2">
              <p className="mb-2 break-words text-xs text-muted-foreground">Match each term on the left with the correct definition.</p>
              {q.matchingPairs.map((pair) => (
                <div key={pair.left} className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <span className="min-w-0 shrink-0 break-words text-sm font-medium text-foreground sm:max-w-[42%]">{pair.left}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="hidden shrink-0 text-muted-foreground sm:block"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  <input
                    type="text"
                    value={matchAnswers[pair.left] || ""}
                    onChange={(e) => updateMatch(pair.left, e.target.value)}
                    disabled={disabled}
                    className={`min-w-0 flex-1 ${fieldClass}`}
                    placeholder="Your answer"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
