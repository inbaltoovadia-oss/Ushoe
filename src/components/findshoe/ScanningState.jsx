import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STEPS = [
  { icon: "🔍", text: "Analyzing image…", detail: "Loading visual data" },
  { icon: "👟", text: "Detecting sneaker…", detail: "Isolating shoe from background" },
  { icon: "🏷️", text: "Identifying brand & model…", detail: "Scanning logos, silhouette & sole" },
  { icon: "🎨", text: "Matching colorway…", detail: "Reading color blocking & materials" },
  { icon: "📊", text: "Searching catalog…", detail: "Comparing against 1000+ sneakers" },
  { icon: "✨", text: "Compiling results…", detail: "Almost done!" },
];

export default function ScanningState({ imageUrl, videoLink }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const stepTimer = setInterval(() => setStepIndex(i => i < STEPS.length - 1 ? i + 1 : i), 2500);
    const secTimer = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => { clearInterval(stepTimer); clearInterval(secTimer); };
  }, []);

  const currentStep = STEPS[stepIndex];
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  return (
    <div className="flex flex-col items-center justify-center py-12 gap-8">
      {/* Image/Video Preview */}
      {imageUrl && (
        <div className="relative w-52 h-52 rounded-3xl overflow-hidden shadow-2xl ring-2 ring-primary/20">
          <img src={imageUrl} alt="Analyzing" className="w-full h-full object-cover" />
          {/* Vertical scan line */}
          <motion.div
            className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent shadow-lg"
            style={{ boxShadow: '0 0 12px 4px hsl(var(--primary)/0.6)' }}
            initial={{ top: "0%" }}
            animate={{ top: "100%" }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
          {/* Corner brackets */}
          {[
            "top-3 left-3 border-t-2 border-l-2",
            "top-3 right-3 border-t-2 border-r-2",
            "bottom-3 left-3 border-b-2 border-l-2",
            "bottom-3 right-3 border-b-2 border-r-2",
          ].map((cls, i) => (
            <motion.div
              key={i}
              className={`absolute w-5 h-5 border-primary rounded-sm ${cls}`}
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
          {/* Dark overlay tint */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-primary/15 pointer-events-none" />
        </div>
      )}

      {videoLink && (
        <div className="w-52 h-52 rounded-3xl bg-secondary/60 border-2 border-primary/20 flex flex-col items-center justify-center gap-3 shadow-2xl">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.8, repeat: Infinity }}
            className="text-5xl"
          >
            🎵
          </motion.div>
          <p className="text-xs text-muted-foreground text-center px-4 break-all line-clamp-2 font-mono">{videoLink}</p>
          <p className="text-[10px] text-primary font-semibold">Fetching video content…</p>
        </div>
      )}

      {/* Pulsing radar rings */}
      <div className="relative flex items-center justify-center">
        {[80, 56, 40].map((size, i) => (
          <motion.div
            key={size}
            className="absolute rounded-full border border-primary/30"
            style={{ width: size, height: size }}
            animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0.1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
          />
        ))}
        <motion.div
          className="w-12 h-12 rounded-full bg-primary/15 border-2 border-primary/40 flex items-center justify-center relative z-10"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        >
          <span className="text-xl" style={{ transform: 'rotate(0deg)' }}>👟</span>
        </motion.div>
      </div>

      {/* Step text */}
      <AnimatePresence mode="wait">
        <motion.div
          key={stepIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex flex-col items-center gap-1.5 text-center"
        >
          <span className="text-3xl">{currentStep.icon}</span>
          <p className="font-heading font-bold text-lg">{currentStep.text}</p>
          <p className="text-xs text-muted-foreground">{currentStep.detail}</p>
        </motion.div>
      </AnimatePresence>

      {/* Progress bar */}
      <div className="w-64 space-y-2">
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Ushoe AI is working…</span>
          <span>{elapsed}s</span>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      </div>

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