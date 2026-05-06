import { motion } from "framer-motion";
import { Sparkles, Users, ShieldCheck, Zap } from "lucide-react";

const HIGHLIGHTS = [
  { icon: Sparkles, title: "AI-Powered Discovery", desc: "Smart recommendations tailored to your style, budget, and preferences." },
  { icon: Zap, title: "Real-Time Deals", desc: "Live price tracking and deal alerts so you never overpay." },
  { icon: Users, title: "Community-Driven", desc: "Trending picks and community insights from sneaker enthusiasts." },
  { icon: ShieldCheck, title: "Verified Catalog", desc: "Authentic products from trusted retailers, verified and curated." },
];

export default function About() {
  return (
    <div className="min-h-screen pb-20 px-4 sm:px-6 max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header */}
        <div className="py-12 text-center">
          <span className="text-4xl mb-4 block">👟</span>
          <h1 className="font-heading font-black text-4xl sm:text-5xl mb-4">
            About u<span className="text-primary">shoe</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            The smarter way to find, track, and buy sneakers.
          </p>
        </div>

        {/* Description */}
        <div className="glass-card rounded-3xl p-8 mb-8 space-y-4 text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground">uShoe</strong> is a personalized sneaker discovery platform built for people who love footwear — from everyday walkers and runners to dedicated sneaker collectors. Our mission is simple: help you find the right shoe at the right price, without the endless scrolling and guesswork.
          </p>
          <p>
            We combine a curated catalog of hundreds of shoes across every category — running, lifestyle, basketball, hiking, and more — with AI-powered recommendations that learn from your style preferences, budget, and past behavior. Whether you're looking for the latest trending release or a reliable everyday trainer, uShoe surfaces picks that actually match what you need.
          </p>
          <p>
            Beyond discovery, uShoe helps you shop smarter. Our deal scanner monitors prices across major retailers in real time, alerting you the moment a shoe on your wishlist drops in price. The nearby store finder uses your location to show which local shops have your size in stock right now.
          </p>
          <p>
            uShoe is built and maintained by a small team of sneaker enthusiasts and engineers passionate about great design and useful technology. We believe buying shoes should be fun, fast, and fair — and we're constantly adding new features to make that a reality for every user.
          </p>
        </div>

        {/* Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {HIGHLIGHTS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass-card rounded-2xl p-5 flex gap-4 items-start">
              <div className="glass-icon w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-heading font-semibold text-sm mb-1">{title}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}