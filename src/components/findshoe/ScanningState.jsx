import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STEPS = [
  { icon: "🔍", text: "Analyzing image…" },
  { icon: "👟", text: "Detecting sneaker details…" },
  { icon: "🏷️", text: "Identifying brand & model…" },
  { icon: "🎨", text: "Matching colorway…" },
  { icon: "📊", text: "Searching catalog…" },
  { icon: "✨", text: "Compiling results…" },
];

export default function ScanningState({ imageUrl, videoLink }) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((i) => (i < STEPS.length - 1 ? i + 1 : i));
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  const currentStep = STEPS[stepIndex];

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-8">
      {/* Preview thumbnail */}
      {imageUrl && (
        <div className="relative w-48 h-48 rounded-3xl overflow-hidden shadow-2xl">
          <img src={imageUrl} alt="Analyzing" className="w-full h-full object-cover" />
          {/* Scanning line animation */}
          <motion.div
            className="absolute left-0 right-0 h-1 bg-primary/70 shadow-lg shadow-primary"
            initial={{ top: "0%" }}
            animate={{ top: "100%" }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-primary/10" />
        </div>
      )}

      {videoLink && (
        <div className="w-48 h-48 rounded-3xl bg-secondary/60 border border-border flex flex-col items-center justify-center gap-3 shadow-2xl">
          <span className="text-4xl">🎵</span>
          <p className="text-xs text-muted-foreground text-center px-4 break-all line-clamp-2">{videoLink}</p>
        </div>
      )}

      {/* Pulsing ring */}
      <div className="relative flex items-center justify-center">
        <motion.div
          className="w-20 h-20 rounded-full border-2 border-primary/30"
          animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0.2, 0.6] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        />
        <motion.div
          className="absolute w-14 h-14 rounded-full border-2 border-primary/50"
          animate={{ scale: [1, 1.15, 1], opacity: [0.8, 0.4, 0.8] }}
          transition={{ duration: 1.8, repeat: Infinity, delay: 0.3 }}
        />
        <div className="absolute w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <span className="text-xl">👟</span>
        </div>
      </div>

      {/* Step text */}
      <AnimatePresence mode="wait">
        <motion.div
          key={stepIndex}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="flex flex-col items-center gap-2"
        >
          <span className="text-3xl">{currentStep.icon}</span>
          <p className="font-semibold text-base">{currentStep.text}</p>
        </motion.div>
      </AnimatePresence>

      {/* Step dots */}
      <div className="flex gap-1.5">
        {STEPS.map((_, i) => (
          <motion.div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${i <= stepIndex ? "bg-primary" : "bg-secondary"}`}
            style={{ width: i === stepIndex ? 24 : 8 }}
          />
        ))}
      </div>
    </div>
  );
}