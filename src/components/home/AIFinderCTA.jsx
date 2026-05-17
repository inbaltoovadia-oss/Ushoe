import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Globe, Brain } from "lucide-react";
import { Link } from "react-router-dom";

export default function AIFinderCTA() {
  return (
    <section className="py-16 px-4 sm:px-6 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-primary/80 p-8 sm:p-12"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-8">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 bg-white/20 text-white px-3 py-1.5 rounded-full text-xs font-medium mb-4">
              <Globe className="w-3 h-3" />
              Live Web Search
            </div>
            <h2 className="font-heading font-bold text-2xl sm:text-3xl text-white">
              Not sure what you need?
            </h2>
            <p className="text-white/80 mt-3 max-w-md">
              Tell our AI what you're looking for — budget, style, and use case — and get personalized recommendations from our catalog <strong className="text-white">and the live web</strong>, shipping to you.
            </p>
            <div className="flex flex-wrap gap-3 mt-6">
              <Link
                to="/assistant"
                className="inline-flex items-center gap-2 bg-white text-primary px-6 py-3 rounded-xl font-semibold hover:bg-white/90 transition-all active:scale-95"
              >
                <Brain className="w-4 h-4" />
                Ask AI
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="flex-shrink-0">
            <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-2xl bg-white/10 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
              <Brain className="w-14 h-14 text-white/60" />
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse" />
                <span className="text-white/70 text-xs font-medium">Live web search</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}