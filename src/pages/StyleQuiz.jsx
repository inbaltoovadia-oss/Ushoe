import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Sparkles, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { setInterests } from "../lib/interestStore";

const QUIZ = [
  {
    q: "What do you mostly use shoes for?",
    key: "use_case",
    options: [
      { label: "Running & Cardio", emoji: "🏃", val: "Running" },
      { label: "Gym & Training", emoji: "💪", val: "Training" },
      { label: "Casual / Everyday", emoji: "👟", val: "Casual" },
      { label: "Basketball / Court", emoji: "🏀", val: "Basketball" },
      { label: "Hiking & Outdoors", emoji: "🥾", val: "Hiking" },
      { label: "Lifestyle / Fashion", emoji: "✨", val: "Lifestyle" },
    ],
  },
  {
    q: "What's your typical budget?",
    key: "budget",
    options: [
      { label: "Under $80", emoji: "💰", val: "budget_low" },
      { label: "$80 – $150", emoji: "💳", val: "budget_mid" },
      { label: "$150 – $250", emoji: "💎", val: "budget_high" },
      { label: "$250+", emoji: "👑", val: "budget_premium" },
    ],
  },
  {
    q: "Which style speaks to you?",
    key: "style",
    options: [
      { label: "Minimal & Clean", emoji: "⚪", val: "minimal" },
      { label: "Bold & Colorful", emoji: "🌈", val: "bold" },
      { label: "Retro / Vintage", emoji: "🕰️", val: "retro" },
      { label: "Tech / Performance", emoji: "🚀", val: "tech" },
    ],
  },
  {
    q: "Preferred fit width?",
    key: "width",
    options: [
      { label: "Narrow", emoji: "📏", val: "narrow" },
      { label: "Normal / Standard", emoji: "✅", val: "normal" },
      { label: "Wide", emoji: "↔️", val: "wide" },
      { label: "Not sure", emoji: "🤷", val: "unknown" },
    ],
  },
  {
    q: "Favorite brands? (pick all you like)",
    key: "brands",
    multi: true,
    options: [
      { label: "Nike", emoji: "✔", val: "Nike" },
      { label: "Adidas", emoji: "🔵", val: "Adidas" },
      { label: "New Balance", emoji: "🟡", val: "New Balance" },
      { label: "ASICS", emoji: "🔴", val: "ASICS" },
      { label: "Puma", emoji: "🐆", val: "Puma" },
      { label: "Converse", emoji: "⭐", val: "Converse" },
      { label: "Vans", emoji: "🛹", val: "Vans" },
      { label: "Jordan", emoji: "🏀", val: "Jordan" },
      { label: "On Running", emoji: "🌐", val: "On Running" },
      { label: "Any brand", emoji: "🌍", val: "any" },
    ],
  },
  {
    q: "How do you typically shop?",
    key: "shopping",
    options: [
      { label: "In-store (try before buy)", emoji: "🏪", val: "instore" },
      { label: "Online (quick & easy)", emoji: "📦", val: "online" },
      { label: "Both equally", emoji: "⚖️", val: "both" },
      { label: "Best deal wins!", emoji: "🔥", val: "deals" },
    ],
  },
];

const BUDGET_MAP = {
  budget_low: 80,
  budget_mid: 150,
  budget_high: 250,
  budget_premium: 500,
};

export default function StyleQuiz() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [multiSelected, setMultiSelected] = useState([]);

  const current = QUIZ[step];
  const isMulti = !!current.multi;

  const selectOption = (val) => {
    if (isMulti) {
      setMultiSelected((prev) =>
        prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
      );
    } else {
      const next = { ...answers, [current.key]: val };
      setAnswers(next);
      if (step < QUIZ.length - 1) {
        setStep(step + 1);
        setMultiSelected([]);
      } else {
        finishQuiz(next);
      }
    }
  };

  const confirmMulti = () => {
    const next = { ...answers, [current.key]: multiSelected };
    setAnswers(next);
    if (step < QUIZ.length - 1) {
      setStep(step + 1);
      setMultiSelected([]);
    } else {
      finishQuiz(next);
    }
  };

  const finishQuiz = (finalAnswers) => {
    // Save interests derived from quiz
    const interests = [finalAnswers.use_case].filter(Boolean);
    setInterests(interests);
    // Save quiz profile to localStorage
    localStorage.setItem(
      "ushoe_quiz",
      JSON.stringify({
        ...finalAnswers,
        maxBudget: BUDGET_MAP[finalAnswers.budget] || 300,
        completedAt: Date.now(),
      })
    );
    navigate("/");
  };

  const progress = ((step) / QUIZ.length) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Style Quiz — {step + 1} of {QUIZ.length}
          </div>
          {/* Progress bar */}
          <div className="w-full h-1.5 bg-secondary rounded-full mb-6">
            <motion.div
              className="h-full bg-primary rounded-full"
              animate={{ width: `${progress + (100 / QUIZ.length)}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
          >
            <h2 className="font-heading font-bold text-2xl sm:text-3xl text-center mb-6">
              {current.q}
            </h2>

            <div className="grid grid-cols-2 gap-3">
              {current.options.map((opt) => {
                const active = isMulti
                  ? multiSelected.includes(opt.val)
                  : answers[current.key] === opt.val;
                return (
                  <button
                    key={opt.val}
                    onClick={() => selectOption(opt.val)}
                    className={`flex items-center gap-3 px-4 py-4 rounded-2xl text-left font-medium border-2 transition-all duration-200 ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card hover:border-primary/40 hover:bg-secondary/50"
                    }`}
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <span className="text-sm leading-snug">{opt.label}</span>
                    {active && isMulti && (
                      <Check className="w-4 h-4 ml-auto flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {isMulti && (
              <button
                onClick={confirmMulti}
                disabled={multiSelected.length === 0}
                className="mt-5 w-full bg-primary text-primary-foreground py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                {step === QUIZ.length - 1 ? "Finish & Get Recommendations" : "Next"}
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </motion.div>
        </AnimatePresence>

        {step > 0 && (
          <button
            onClick={() => setStep(step - 1)}
            className="mt-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
        )}
      </div>
    </div>
  );
}