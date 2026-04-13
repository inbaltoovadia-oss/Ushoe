import { motion } from "framer-motion";
import SearchBar from "../SearchBar";
import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export default function HeroSection() {
  return (
    <section className="relative min-h-[85vh] flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1556906781-9a412961c28c?w=1920&h=1080&fit=crop"
          alt="Hero"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/40 dark:from-background dark:via-background/95 dark:to-background/60" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 w-full">
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              AI-Powered Shoe Discovery
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-heading font-bold text-4xl sm:text-5xl lg:text-6xl leading-tight"
          >
            Find Your
            <br />
            <span className="text-primary">Perfect Pair</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-muted-foreground text-lg mt-4 max-w-lg"
          >
            Discover shoes powered by AI intelligence. Compare prices, find nearby stores, and get
            personalized recommendations.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8"
          >
            <SearchBar large />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex items-center gap-6 mt-8"
          >
            <Link
              to="/discover"
              className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity"
            >
              <Sparkles className="w-4 h-4" />
              Try AI Finder
            </Link>
            <div className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">10,000+</span> shoes analyzed
            </div>
          </motion.div>
        </div>
      </div>

      {/* Floating Shoe Image */}
      <motion.div
        initial={{ opacity: 0, x: 50, rotate: -5 }}
        animate={{ opacity: 1, x: 0, rotate: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="hidden lg:block absolute right-12 top-1/2 -translate-y-1/2 z-10"
      >
        <div className="relative">
          <div className="absolute -inset-10 bg-primary/10 rounded-full blur-3xl" />
          <img
            src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&h=500&fit=crop"
            alt="Featured Shoe"
            className="relative w-80 h-80 object-cover rounded-3xl shadow-2xl"
          />
        </div>
      </motion.div>
    </section>
  );
}