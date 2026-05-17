import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Check, Sparkles } from "lucide-react";
import { ALL_CATEGORIES, getInterests, setInterests } from "../lib/interestStore";

const CATEGORY_ICONS = {
  Running: "🏃",
  Basketball: "🏀",
  Soccer: "⚽",
  Tennis: "🎾",
  Training: "💪",
  Lifestyle: "✨",
  Casual: "👟",
  Walking: "🚶",
  Hiking: "🥾",
  Skateboarding: "🛹",
};

export default function InterestPicker({ onClose, onSave }) {
  const [selected, setSelected] = useState(getInterests());

  const toggle = (cat) => {
    setSelected((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, []);

  const save = () => {
    setInterests(selected);
    onSave?.(selected);
    onClose?.();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md flex flex-col max-h-[90dvh]" onClick={e => e.stopPropagation()}>
        {/* Header — fixed */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-bold text-xl">Your Interests</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-secondary">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground px-6 pb-4 flex-shrink-0">
          Pick your favorite shoe categories so we can personalize your trending feed.
        </p>

        {/* Scrollable grid */}
        <div className="overflow-y-auto flex-1 px-6">
          <div className="grid grid-cols-2 gap-2 pb-4">
            {ALL_CATEGORIES.map((cat) => {
              const active = selected.includes(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggle(cat)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-medium transition-all border-2 ${
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="text-lg">{CATEGORY_ICONS[cat]}</span>
                  {cat}
                  {active && <Check className="w-3.5 h-3.5 ml-auto" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Save button — fixed at bottom */}
        <div className="px-6 py-4 flex-shrink-0 border-t border-border">
          <button
            onClick={save}
            className="w-full bg-primary text-primary-foreground py-3 rounded-2xl font-semibold hover:opacity-90 transition-opacity"
          >
            Save Interests ({selected.length} selected)
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}