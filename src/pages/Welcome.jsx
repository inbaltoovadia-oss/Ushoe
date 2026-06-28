import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, User, Ghost, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { hasOnboarded, setGuestMode, setOnboarded, setGuestInterests } from "@/lib/guestStore";

const CATEGORIES = [
  { id: "Running", emoji: "🏃" },
  { id: "Basketball", emoji: "🏀" },
  { id: "Casual", emoji: "👟" },
  { id: "Lifestyle", emoji: "✨" },
  { id: "Training", emoji: "💪" },
  { id: "Skateboarding", emoji: "🛹" },
  { id: "Hiking", emoji: "🥾" },
  { id: "Tennis", emoji: "🎾" },
];

const TOTAL_STEPS = 3;

export default function Welcome() {
  const navigate = useNavigate();
  const { navigateToLogin } = useAuth();
  const [step, setStep] = useState(0);
  const [interests, setInterests] = useState([]);

  // Redirect if already onboarded
  useEffect(() => {
    if (hasOnboarded()) navigate("/", { replace: true });
  }, []);

  const toggleInterest = (cat) => {
    setInterests(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleSignIn = () => {
    setGuestInterests(interests);
    setOnboarded();
    navigateToLogin();
  };

  const handleGuest = () => {
    setGuestInterests(interests);
    setGuestMode(true);
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-8 relative overflow-hidden bg-background">
      {/* Ambient gradient orbs */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-[-10%] left-[-8%] w-[60vw] h-[60vw] rounded-full bg-blue-500/15 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-8%] w-[50vw] h-[50vw] rounded-full bg-violet-500/12 blur-[90px]" />
        <div className="absolute top-[40%] left-[55%] w-[30vw] h-[30vw] rounded-full bg-teal-400/10 blur-[80px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step
                  ? "w-8 bg-primary"
                  : i < step
                  ? "w-2 bg-primary/60"
                  : "w-2 bg-secondary"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0.5, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                className="text-8xl mb-6"
              >
                👟
              </motion.div>
              <h1 className="font-heading font-bold text-3xl mb-3">
                Welcome to Ushoe
              </h1>
              <p className="text-muted-foreground text-base mb-8 leading-relaxed">
                Find any sneaker, anywhere. Compare prices, track drops, and discover stores near you.
              </p>
              <button
                onClick={() => setStep(1)}
                className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-primary/25"
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}

          {/* Step 1: Pick Interests */}
          {step === 1 && (
            <motion.div
              key="interests"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h1 className="font-heading font-bold text-2xl text-center">
                  What are you into?
                </h1>
              </div>
              <p className="text-muted-foreground text-center text-sm mb-6">
                Pick your favorites — we'll personalize your feed.
              </p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {CATEGORIES.map(cat => {
                  const selected = interests.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => toggleInterest(cat.id)}
                      className={`relative flex flex-col items-center justify-center gap-1.5 py-5 rounded-2xl border-2 transition-all active:scale-[0.97] ${
                        selected
                          ? "border-primary bg-primary/10 shadow-md shadow-primary/10"
                          : "border-border bg-card hover:border-primary/30"
                      }`}
                    >
                      {selected && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      )}
                      <span className="text-3xl">{cat.emoji}</span>
                      <span className="text-sm font-semibold">{cat.id}</span>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setStep(2)}
                disabled={interests.length === 0}
                className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-primary/25 disabled:opacity-40 disabled:shadow-none"
              >
                Continue
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => setStep(2)}
                className="w-full py-2.5 mt-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip for now
              </button>
            </motion.div>
          )}

          {/* Step 2: Account / Guest */}
          {step === 2 && (
            <motion.div
              key="account"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                className="text-6xl mb-4"
              >
                🚀
              </motion.div>
              <h1 className="font-heading font-bold text-2xl mb-2">You're all set!</h1>
              <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                Sign in to save your wishlist, track prices, and get alerts. Or continue browsing as a guest.
              </p>

              <button
                onClick={handleSignIn}
                className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-primary/25"
              >
                <User className="w-5 h-5" />
                Sign In
              </button>

              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground font-medium">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <button
                onClick={handleGuest}
                className="w-full py-4 rounded-2xl bg-secondary text-foreground font-semibold text-base flex items-center justify-center gap-2 hover:bg-secondary/80 active:scale-[0.98] transition-all"
              >
                <Ghost className="w-5 h-5" />
                Continue as Guest
              </button>

              <p className="text-xs text-muted-foreground text-center mt-3 flex items-center justify-center gap-1">
                <Ghost className="w-3 h-3" />
                Guest mode: browse freely, but your data won't be saved.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}