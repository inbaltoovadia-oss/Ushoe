import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Sparkles, ChevronRight, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { invalidateProfileCache } from "../lib/userProfileStore";

const STEPS = [
  {
    id: "gender",
    question: "Who are you shopping for?",
    type: "single",
    options: [
      { label: "Men", emoji: "👨" },
      { label: "Women", emoji: "👩" },
      { label: "Unisex / Both", emoji: "🧑" },
    ],
  },
  {
    id: "main_use",
    question: "What will you mostly use them for?",
    type: "multi",
    options: [
      { label: "Running", emoji: "🏃" },
      { label: "Basketball", emoji: "🏀" },
      { label: "Casual", emoji: "👟" },
      { label: "Training", emoji: "💪" },
      { label: "Lifestyle", emoji: "✨" },
      { label: "Walking", emoji: "🚶" },
      { label: "Hiking", emoji: "🥾" },
    ],
  },
  {
    id: "style_preference",
    question: "What's your style vibe?",
    type: "multi",
    options: [
      { label: "Sporty", emoji: "⚡" },
      { label: "Streetwear", emoji: "🔥" },
      { label: "Minimal", emoji: "⬜" },
      { label: "Retro", emoji: "🕹️" },
      { label: "Luxury", emoji: "💎" },
      { label: "Outdoors", emoji: "🌲" },
    ],
  },
  {
    id: "preferred_brands",
    question: "Any favourite brands?",
    type: "multi",
    options: [
      { label: "Nike", emoji: "✔️" },
      { label: "Adidas", emoji: "3️⃣" },
      { label: "Jordan", emoji: "🏀" },
      { label: "New Balance", emoji: "🅽" },
      { label: "Puma", emoji: "🐆" },
      { label: "Reebok", emoji: "🔵" },
      { label: "Converse", emoji: "⭐" },
      { label: "Vans", emoji: "🤙" },
    ],
  },
  {
    id: "budget_max",
    question: "What's your budget per pair?",
    type: "single",
    options: [
      { label: "Under $80", emoji: "💵", value: 80 },
      { label: "$80 – $150", emoji: "💰", value: 150 },
      { label: "$150 – $250", emoji: "💳", value: 250 },
      { label: "$250+", emoji: "💎", value: 500 },
    ],
  },
];

export default function ShoeSurvey() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);

  const current = STEPS[step];

  const select = (value) => {
    if (current.type === "single") {
      setAnswers((prev) => ({ ...prev, [current.id]: value }));
      setTimeout(() => nextStep({ ...answers, [current.id]: value }), 250);
    } else {
      setAnswers((prev) => {
        const existing = prev[current.id] || [];
        const updated = existing.includes(value)
          ? existing.filter((v) => v !== value)
          : [...existing, value];
        return { ...prev, [current.id]: updated };
      });
    }
  };

  const isSelected = (value) => {
    const val = answers[current.id];
    if (current.type === "single") return val === value;
    return (val || []).includes(value);
  };

  const nextStep = async (finalAnswers = answers) => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      await save(finalAnswers);
    }
  };

  const save = async (finalAnswers) => {
    setSaving(true);
    const existing = await base44.entities.UserProfile.list("-created_date", 1);
    const data = {
      preferred_brands: finalAnswers.preferred_brands || [],
      budget_max: finalAnswers.budget_max || 250,
      main_use: finalAnswers.main_use || [],
      style_preference: finalAnswers.style_preference || [],
      gender: finalAnswers.gender === "Unisex / Both" ? "Unisex" : finalAnswers.gender || "Unisex",
      survey_completed: true,
    };
    if (existing.length > 0) {
      await base44.entities.UserProfile.update(existing[0].id, data);
    } else {
      await base44.entities.UserProfile.create(data);
    }
    invalidateProfileCache();
    navigate("/");
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-heading font-bold text-xl">
            U<span className="text-primary">shoe</span>
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-secondary rounded-full mb-8 overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-widest text-center">
              Step {step + 1} of {STEPS.length}
            </p>
            <h2 className="font-heading font-bold text-2xl sm:text-3xl text-center mb-8">
              {current.question}
            </h2>

            <div className="grid grid-cols-2 gap-3">
              {current.options.map((opt) => {
                const value = opt.value ?? opt.label;
                const selected = isSelected(value);
                return (
                  <button
                    key={opt.label}
                    onClick={() => select(value)}
                    className={`flex items-center gap-3 px-4 py-4 rounded-2xl border-2 font-medium text-sm transition-all duration-200 ${
                      selected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-secondary"
                    }`}
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <span className="flex-1 text-left">{opt.label}</span>
                    {selected && <Check className="w-4 h-4 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>

            {current.type === "multi" && (
              <button
                onClick={() => nextStep()}
                disabled={saving}
                className="w-full mt-6 bg-primary text-primary-foreground py-4 rounded-2xl font-semibold text-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? "Saving…" : step === STEPS.length - 1 ? "Finish & See My Picks 🎉" : "Continue"}
                {!saving && <ChevronRight className="w-5 h-5" />}
              </button>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}