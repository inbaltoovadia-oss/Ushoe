import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import UploadZone from "../components/findshoe/UploadZone";
import ScanningState from "../components/findshoe/ScanningState";
import IdentificationResult from "../components/findshoe/IdentificationResult";

export default function FindThisShoe() {
  const [phase, setPhase] = useState("upload"); // upload | scanning | result | error
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null);
  const [videoLink, setVideoLink] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleMediaReady = async ({ imageUrl, videoLink: link }) => {
    setUploadedImageUrl(imageUrl || null);
    setVideoLink(link || null);
    setPhase("scanning");
    setError(null);

    try {
      const { base44 } = await import("@/api/base44Client");
      const res = await base44.functions.invoke("identifyShoe", {
        imageUrl: imageUrl || null,
        videoLink: link || null,
      });
      setResult(res.data);
      setPhase("result");
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      setPhase("error");
    }
  };

  const reset = () => {
    setPhase("upload");
    setUploadedImageUrl(null);
    setVideoLink(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent pointer-events-none" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-6 text-center relative">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-bold mb-4"
          >
            <span className="text-base">🔍</span> Powered by Gemini Vision AI
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="font-heading font-black text-4xl sm:text-5xl mb-2 leading-tight"
          >
            Find This Shoe
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto"
          >
            Snap a photo, upload a screenshot, or paste a TikTok/Reel link — Ushoe AI identifies the sneaker instantly.
          </motion.p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <AnimatePresence mode="wait">
          {phase === "upload" && (
            <motion.div key="upload" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <UploadZone onMediaReady={handleMediaReady} />
            </motion.div>
          )}

          {phase === "scanning" && (
            <motion.div key="scanning" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <ScanningState imageUrl={uploadedImageUrl} videoLink={videoLink} />
            </motion.div>
          )}

          {phase === "result" && result && (
            <motion.div key="result" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <IdentificationResult result={result} imageUrl={uploadedImageUrl} onReset={reset} />
            </motion.div>
          )}

          {phase === "error" && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center py-16 space-y-4">
              <div className="text-5xl">😕</div>
              <h2 className="font-heading font-bold text-xl">Couldn't analyze that</h2>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">{error}</p>
              <button onClick={reset} className="bg-primary text-primary-foreground px-6 py-2.5 rounded-2xl font-semibold text-sm hover:opacity-90 transition-opacity">
                Try Again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}