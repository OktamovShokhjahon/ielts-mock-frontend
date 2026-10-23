"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

type Step = "start" | "pin" | "name";

const inputClass = "mt-1.5 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring";

export default function MockEntryPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [step, setStep] = useState<Step>("start");
  const [pin, setPin] = useState("");
  const [fullName, setFullName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const verifyPin = async () => {
    setErr(null);
    setLoading(true);
    try {
      await apiFetch(`/api/mocks/${id}/verify-pin`, { method: "POST", json: { pin } });
      setStep("name");
    } catch (e) { setErr(e instanceof Error ? e.message : "Invalid PIN"); }
    finally { setLoading(false); }
  };

  const start = async () => {
    setErr(null);
    if (!fullName.trim()) { setErr("Please enter your full name."); return; }
    setLoading(true);
    try {
      const data = await apiFetch<{ attempt: { _id: string } }>("/api/attempts", {
        method: "POST",
        json: { mockId: id, fullName: fullName.trim(), pin },
      });
      router.push(`/test/${data.attempt._id}`);
    } catch (e) { setErr(e instanceof Error ? e.message : "Could not start test"); }
    finally { setLoading(false); }
  };

  const stepConfig = {
    start: { num: 1, title: "Welcome" },
    pin: { num: 2, title: "Verification" },
    name: { num: 3, title: "Your details" },
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gradient-start to-gradient-end flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
          Back to mocks
        </Link>

        <div className="flex items-center gap-2 mb-6">
          {(["start", "pin", "name"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <div className={`h-px w-8 ${(["start","pin","name"] as Step[]).indexOf(step) >= i ? "bg-primary" : "bg-border"}`} />}
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                step === s ? "bg-primary text-primary-foreground" :
                (["start","pin","name"] as Step[]).indexOf(step) > i ? "bg-primary/20 text-primary" :
                "bg-card-elevated text-muted-foreground border border-border"
              }`}>
                {stepConfig[s].num}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          {step === "start" && (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl font-bold text-foreground">Ready to start?</h1>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">You will need the PIN provided by your test centre, then enter your name as registered.</p>
              </div>
              <button type="button" onClick={() => setStep("pin")} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary-hover active:scale-[0.98]">
                Get started
              </button>
            </div>
          )}

          {step === "pin" && (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl font-bold text-foreground">Enter PIN</h1>
                <p className="mt-2 text-sm text-muted-foreground">Enter the 6-digit code given by your administrator.</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">PIN code</label>
                <input type="password" inputMode="numeric" autoComplete="one-time-code" value={pin} onChange={(e) => setPin(e.target.value)} className={`${inputClass} font-mono tracking-widest text-center text-lg`} placeholder="------" />
              </div>
              {err && <ErrorMsg text={err} />}
              <button type="button" disabled={loading || pin.length < 4} onClick={() => void verifyPin()} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary-hover active:scale-[0.98] disabled:opacity-50">
                {loading ? "Checking..." : "Verify PIN"}
              </button>
            </div>
          )}

          {step === "name" && (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl font-bold text-foreground">Your details</h1>
                <p className="mt-2 text-sm text-muted-foreground">Enter your name exactly as it appears on your registration.</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Full name</label>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} placeholder="As on your registration" autoComplete="name" />
              </div>
              {err && <ErrorMsg text={err} />}
              <button type="button" disabled={loading} onClick={() => void start()} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary-hover active:scale-[0.98] disabled:opacity-50">
                {loading ? "Starting..." : "Begin test"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ErrorMsg({ text }: { text: string }) {
  return (
    <p className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
      {text}
    </p>
  );
}
