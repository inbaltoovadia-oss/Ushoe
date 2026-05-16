/**
 * SearchingState — progressive loading UI shown while agents fetch live data.
 * Shows encouraging status messages that update every few seconds so users
 * feel the system is actively working, not frozen.
 */
import { useState, useEffect } from "react";
import { Globe, Loader2, Zap } from "lucide-react";

const STEPS = [
  "Connecting to live retailer feeds…",
  "Checking prices in your region…",
  "Comparing deals across retailers…",
  "Almost there, finalizing results…",
];

export default function SearchingState({ city, shoe }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep(s => Math.min(s + 1, STEPS.length - 1));
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4 py-2">
      {/* Status header */}
      <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-2xl border border-primary/10">
        <div className="relative flex-shrink-0">
          <Globe className="w-5 h-5 text-primary" />
          <Loader2 className="w-3 h-3 text-primary animate-spin absolute -top-1 -right-1" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">{STEPS[step]}</p>
          <p className="text-[10px] text-muted-foreground">Searching live for {shoe?.name} near {city}</p>
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

      <p className="text-[10px] text-muted-foreground text-center">
        Live web search active — this takes ~20–30 seconds once, then results are cached instantly
      </p>
    </div>
  );
}