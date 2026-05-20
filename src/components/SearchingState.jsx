/**
 * SearchingState — progressive loading UI shown while agents fetch live data.
 * Shows encouraging status messages that update every few seconds so users
 * feel the system is actively working, not frozen.
 */
import { useState, useEffect } from "react";
import { Globe, Loader2, Zap } from "lucide-react";

const STEPS = [
  { msg: "Connecting to live retailer feeds…", detail: "nike.com/il, footlocker.co.il, terminalx.com" },
  { msg: "Fetching real-time prices…", detail: "Reading live product pages" },
  { msg: "Checking sizes & availability…", detail: "Comparing stock across stores" },
  { msg: "Sorting best deals for you…", detail: "Ranking by price & shipping" },
  { msg: "Almost there…", detail: "Finalizing results" },
];

export default function SearchingState({ city, shoe }) {
  const [step, setStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setStep(s => Math.min(s + 1, STEPS.length - 1));
    }, 10000);
    const elapsedInterval = setInterval(() => {
      setElapsed(e => e + 1);
    }, 1000);
    return () => { clearInterval(stepInterval); clearInterval(elapsedInterval); };
  }, []);

  const progressPct = Math.min(95, (elapsed / 60) * 100);

  return (
    <div className="space-y-4 py-2">
      {/* Status header */}
      <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-2xl border border-primary/10">
        <div className="relative flex-shrink-0">
          <Globe className="w-5 h-5 text-primary" />
          <Loader2 className="w-3 h-3 text-primary animate-spin absolute -top-1 -right-1" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">{STEPS[step].msg}</p>
          <p className="text-[10px] text-muted-foreground">{STEPS[step].detail}</p>
        </div>
        <Zap className="w-4 h-4 text-amber-500 flex-shrink-0 animate-pulse" />
      </div>

      {/* Shimmer skeleton cards */}
      {[1, 2, 3].map(i => (
        <div key={i} className="rounded-2xl border border-border/40 p-4 space-y-3 overflow-hidden relative">
          <div className="flex items-center justify-between">
            <div className="h-4 w-32 bg-secondary rounded-full animate-pulse" />
            <div className="h-6 w-16 bg-secondary rounded-full animate-pulse" />
          </div>
          <div className="h-3 w-48 bg-secondary/70 rounded-full animate-pulse" />
          <div className="h-3 w-36 bg-secondary/50 rounded-full animate-pulse" />
          <div className="h-9 w-full bg-secondary/40 rounded-xl animate-pulse mt-1" />
          {/* shimmer sweep */}
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent"
            style={{ animationDelay: `${i * 300}ms` }} />
        </div>
      ))}

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-1000"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        Live web search — scanning retailers for real prices ({elapsed}s)… cached after first load
      </p>
    </div>
  );
}